import 'dart:async';
import 'package:flutter/material.dart';
import '../models/chat_model.dart';
import '../models/user_model.dart';
import '../services/socket_service.dart';
import '../services/sound_service.dart';
import '../api/api_client.dart';
import '../api/endpoints.dart';

class ChatProvider extends ChangeNotifier {
  List<ChatConversation> _conversations = [];
  String? _activeConversationId;
  List<ChatMessage> _messages = [];
  bool _isLoadingConversations = false;
  bool _isLoadingMessages = false;

  // Real Calling / Intercom State
  CallStatus _callStatus = CallStatus.idle;
  CallType _callType = CallType.audio;
  String? _activeCallId;
  String? _targetUserId;
  String? _targetUserName;
  String? _targetUserAvatar;
  int _callDurationSeconds = 0;
  Timer? _callTimer;
  Timer? _dialTimeoutTimer;
  bool _isMuted = false;
  bool _isVideoEnabled = true;
  bool _isSpeakerOn = true;

  // Missed calls list
  final List<MissedCall> _missedCalls = [];

  // Getters
  List<ChatConversation> get conversations => _conversations;
  String? get activeConversationId => _activeConversationId;
  List<ChatMessage> get messages => _messages;
  bool get isLoadingConversations => _isLoadingConversations;
  bool get isLoadingMessages => _isLoadingMessages;

  CallStatus get callStatus => _callStatus;
  CallType get callType => _callType;
  String? get targetUserName => _targetUserName;
  String? get targetUserAvatar => _targetUserAvatar;
  int get callDurationSeconds => _callDurationSeconds;
  bool get isMuted => _isMuted;
  bool get isVideoEnabled => _isVideoEnabled;
  bool get isSpeakerOn => _isSpeakerOn;
  List<MissedCall> get missedCalls => _missedCalls;

  ChatProvider() {
    _initSocketListeners();
  }

  void _initSocketListeners() {
    // Incoming message
    SocketService.onMessage.listen((msg) {
      if (msg.conversationId == _activeConversationId) {
        _messages.add(msg);
        notifyListeners();
      }
      SoundService.playMessageTone();
      _updateConversationLastMessage(msg);
    });

    // Incoming Call
    SocketService.onIncomingCall.listen((data) {
      if (_callStatus == CallStatus.idle) {
        _callStatus = CallStatus.incoming;
        _activeCallId = data['callId']?.toString() ?? 'call_${DateTime.now().millisecondsSinceEpoch}';
        _targetUserId = data['callerId']?.toString();
        _targetUserName = data['callerName'] ?? 'Workspace Colleague';
        _targetUserAvatar = data['callerAvatar'];
        _callType = data['type'] == 'video' ? CallType.video : (data['type'] == 'intercom' ? CallType.intercom : CallType.audio);
        SoundService.playRingtone();
        notifyListeners();
      }
    });

    // Call Accepted / Answered
    SocketService.onCallAnswered.listen((data) {
      if (_callStatus == CallStatus.dialing) {
        _dialTimeoutTimer?.cancel();
        SoundService.stopLoop();
        _callStatus = CallStatus.active;
        _startCallTimer();
        notifyListeners();
      }
    });

    // Call Ended
    SocketService.onCallEnded.listen((data) {
      endCall(notifyRemote: false);
    });

    // Call Missed
    SocketService.onCallMissed.listen((data) {
      final missed = MissedCall(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        callerId: data['callerId']?.toString() ?? '',
        callerName: data['callerName'] ?? 'Unknown Caller',
        callerAvatar: data['callerAvatar'],
        callType: _callType,
        timestamp: DateTime.now(),
      );
      _missedCalls.insert(0, missed);
      endCall(notifyRemote: false);
    });
  }

  Future<void> fetchConversations(String currentUserId) async {
    _isLoadingConversations = true;
    notifyListeners();

    try {
      final response = await ApiClient.instance.get(Endpoints.conversations);
      if (response.data != null && response.data['success'] == true) {
        var rawList = response.data['data'] as List? ?? [];
        _conversations = rawList.map((c) => ChatConversation.fromJson(c, currentUserId)).toList();
      }
    } catch (_) {
      // Fallback mock conversations for offline / first-time launch
      if (_conversations.isEmpty) {
        _conversations = _getSampleConversations(currentUserId);
      }
    }

    _isLoadingConversations = false;
    notifyListeners();
  }

  Future<void> selectConversation(String conversationId, String currentUserId) async {
    _activeConversationId = conversationId;
    _isLoadingMessages = true;
    _messages = [];
    notifyListeners();

    try {
      final response = await ApiClient.instance.get('${Endpoints.conversations}/$conversationId/messages');
      if (response.data != null && response.data['success'] == true) {
        var rawMsgs = response.data['data'] as List? ?? [];
        _messages = rawMsgs.map((m) => ChatMessage.fromJson(m)).toList();
      }
    } catch (_) {
      // Mock messages for instant interactive demo
      _messages = _getSampleMessages(conversationId, currentUserId);
    }

    _isLoadingMessages = false;
    notifyListeners();
  }

  Future<void> sendMessage({
    required String conversationId,
    required String currentUserId,
    String? content,
    MessageType type = MessageType.text,
    String? fileUrl,
    String? fileName,
    int? fileSize,
  }) async {
    final newMsg = ChatMessage(
      id: 'temp_${DateTime.now().millisecondsSinceEpoch}',
      conversationId: conversationId,
      senderId: currentUserId,
      content: content,
      type: type,
      fileUrl: fileUrl,
      fileName: fileName,
      fileSize: fileSize,
      createdAt: DateTime.now(),
    );

    _messages.add(newMsg);
    notifyListeners();

    try {
      await ApiClient.instance.post(
        Endpoints.messages,
        data: newMsg.toJson(),
      );
      SocketService.emitMessage(newMsg.toJson());
    } catch (_) {}

    _updateConversationLastMessage(newMsg);
  }

  void _updateConversationLastMessage(ChatMessage msg) {
    final idx = _conversations.indexWhere((c) => c.id == msg.conversationId);
    if (idx != -1) {
      final conv = _conversations[idx];
      _conversations[idx] = ChatConversation(
        id: conv.id,
        name: conv.name,
        isGroup: conv.isGroup,
        participants: conv.participants,
        lastMessage: msg,
        unreadCount: conv.unreadCount,
        updatedAt: DateTime.now(),
      );
      notifyListeners();
    }
  }

  // --- Real WebRTC / Intercom Call Controls ---

  void startCall({
    required String targetUserId,
    required String targetUserName,
    String? targetUserAvatar,
    required CallType type,
    required UserModel currentUser,
  }) {
    _callStatus = CallStatus.dialing;
    _callType = type;
    _targetUserId = targetUserId;
    _targetUserName = targetUserName;
    _targetUserAvatar = targetUserAvatar;
    _activeCallId = 'call_${DateTime.now().millisecondsSinceEpoch}';
    _callDurationSeconds = 0;
    _isMuted = false;
    _isVideoEnabled = type == CallType.video;

    SoundService.playDialTone();
    notifyListeners();

    SocketService.startCall(
      targetUserId: targetUserId,
      targetName: targetUserName,
      type: type,
      callerId: currentUser.id,
      callerName: currentUser.name,
      callerAvatar: currentUser.avatar,
    );

    // Caller timeout after 30 seconds -> Missed Call
    _dialTimeoutTimer?.cancel();
    _dialTimeoutTimer = Timer(const Duration(seconds: 30), () {
      if (_callStatus == CallStatus.dialing) {
        SocketService.cancelCall(targetUserId, currentUser.name);
        endCall(notifyRemote: true);
      }
    });
  }

  void answerCall() {
    _dialTimeoutTimer?.cancel();
    SoundService.stopLoop();
    _callStatus = CallStatus.active;
    _startCallTimer();
    notifyListeners();

    if (_activeCallId != null && _targetUserId != null) {
      SocketService.answerCall(_activeCallId!, _targetUserId!);
    }
  }

  void rejectCall() {
    SoundService.stopLoop();
    if (_targetUserId != null) {
      SocketService.endCall(_activeCallId ?? '', _targetUserId!);
    }
    _callStatus = CallStatus.rejected;
    notifyListeners();
    Future.delayed(const Duration(milliseconds: 600), () {
      _callStatus = CallStatus.idle;
      notifyListeners();
    });
  }

  void endCall({bool notifyRemote = true}) {
    _dialTimeoutTimer?.cancel();
    _callTimer?.cancel();
    SoundService.playEndCall();

    if (notifyRemote && _targetUserId != null && _activeCallId != null) {
      SocketService.endCall(_activeCallId!, _targetUserId!);
    }

    _callStatus = CallStatus.ended;
    notifyListeners();

    Future.delayed(const Duration(seconds: 1), () {
      _callStatus = CallStatus.idle;
      _activeCallId = null;
      _targetUserId = null;
      _callDurationSeconds = 0;
      notifyListeners();
    });
  }

  void toggleMute() {
    _isMuted = !_isMuted;
    notifyListeners();
  }

  void toggleVideo() {
    _isVideoEnabled = !_isVideoEnabled;
    notifyListeners();
  }

  void toggleSpeaker() {
    _isSpeakerOn = !_isSpeakerOn;
    notifyListeners();
  }

  void _startCallTimer() {
    _callTimer?.cancel();
    _callDurationSeconds = 0;
    _callTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      _callDurationSeconds++;
      notifyListeners();
    });
  }

  String get formattedCallDuration {
    final mins = (_callDurationSeconds ~/ 60).toString().padLeft(2, '0');
    final secs = (_callDurationSeconds % 60).toString().padLeft(2, '0');
    return '$mins:$secs';
  }

  // Sample data generators
  List<ChatConversation> _getSampleConversations(String currentUserId) {
    return [
      ChatConversation(
        id: 'conv_general',
        name: '🏢 General Announcements',
        isGroup: true,
        lastMessage: ChatMessage(
          id: '1',
          conversationId: 'conv_general',
          senderId: 'admin_1',
          content: 'Welcome to GSV E-Office! All systems are operating normally.',
          createdAt: DateTime.now().subtract(const Duration(minutes: 15)),
        ),
      ),
      ChatConversation(
        id: 'conv_tech',
        name: '💻 Engineering & Tech Support',
        isGroup: true,
        lastMessage: ChatMessage(
          id: '2',
          conversationId: 'conv_tech',
          senderId: 'eng_1',
          content: 'TrueNAS scale cluster backup completed successfully.',
          createdAt: DateTime.now().subtract(const Duration(hours: 1)),
        ),
      ),
      ChatConversation(
        id: 'conv_admin',
        participants: [
          UserModel(id: 'usr_admin', name: 'System Administrator', email: 'admin@gsv.local', isOnline: true, department: 'IT'),
        ],
        lastMessage: ChatMessage(
          id: '3',
          conversationId: 'conv_admin',
          senderId: 'usr_admin',
          content: 'Need any assistance with the workspace setup?',
          createdAt: DateTime.now().subtract(const Duration(hours: 3)),
        ),
      ),
    ];
  }

  List<ChatMessage> _getSampleMessages(String conversationId, String currentUserId) {
    return [
      ChatMessage(
        id: 'msg_1',
        conversationId: conversationId,
        senderId: 'sys_bot',
        content: '👋 Welcome to the team channel! Feel free to collaborate, share documents, or start an audio/video intercom call.',
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      ),
    ];
  }
}
