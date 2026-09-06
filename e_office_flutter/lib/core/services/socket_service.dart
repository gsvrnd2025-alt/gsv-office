import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../services/storage_service.dart';
import '../models/user_model.dart';
import '../models/chat_model.dart';

class SocketService {
  static io.Socket? _socket;
  static bool _isConnected = false;

  // Stream Controllers for Events
  static final _messageController = StreamController<ChatMessage>.broadcast();
  static final _incomingCallController = StreamController<Map<String, dynamic>>.broadcast();
  static final _callAnsweredController = StreamController<Map<String, dynamic>>.broadcast();
  static final _callEndedController = StreamController<Map<String, dynamic>>.broadcast();
  static final _callMissedController = StreamController<Map<String, dynamic>>.broadcast();
  static final _presenceController = StreamController<Map<String, dynamic>>.broadcast();

  static Stream<ChatMessage> get onMessage => _messageController.stream;
  static Stream<Map<String, dynamic>> get onIncomingCall => _incomingCallController.stream;
  static Stream<Map<String, dynamic>> get onCallAnswered => _callAnsweredController.stream;
  static Stream<Map<String, dynamic>> get onCallEnded => _callEndedController.stream;
  static Stream<Map<String, dynamic>> get onCallMissed => _callMissedController.stream;
  static Stream<Map<String, dynamic>> get onPresence => _presenceController.stream;

  static bool get isConnected => _isConnected;

  static void connect(UserModel currentUser) {
    if (_socket != null && _socket!.connected) return;

    final baseUrl = StorageService.getServerUrl();
    final token = StorageService.getToken();

    _socket = io.io(
      baseUrl,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(10)
          .setReconnectionDelay(2000)
          .setAuth({'token': token, 'userId': currentUser.id})
          .build(),
    );

    _socket!.onConnect((_) {
      _isConnected = true;
      _socket!.emit('presence:ping', {'userId': currentUser.id, 'status': 'online'});
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
    });

    _socket!.on('chat:message', (data) {
      if (data is Map<String, dynamic>) {
        _messageController.add(ChatMessage.fromJson(data));
      }
    });

    _socket!.on('call:incoming', (data) {
      if (data is Map<String, dynamic>) {
        _incomingCallController.add(data);
      }
    });

    _socket!.on('call:accepted', (data) {
      if (data is Map<String, dynamic>) {
        _callAnsweredController.add(data);
      }
    });

    _socket!.on('call:ended', (data) {
      if (data is Map<String, dynamic>) {
        _callEndedController.add(data);
      }
    });

    _socket!.on('call:missed', (data) {
      if (data is Map<String, dynamic>) {
        _callMissedController.add(data);
      }
    });

    _socket!.on('presence:sync', (data) {
      if (data is Map<String, dynamic>) {
        _presenceController.add(data);
      }
    });
  }

  static void emitMessage(Map<String, dynamic> messageData) {
    _socket?.emit('chat:send', messageData);
  }

  static void startCall({
    required String targetUserId,
    required String targetName,
    required CallType type,
    required String callerId,
    required String callerName,
    String? callerAvatar,
  }) {
    _socket?.emit('call:start', {
      'targetUserId': targetUserId,
      'targetName': targetName,
      'type': type.name,
      'callerId': callerId,
      'callerName': callerName,
      'callerAvatar': callerAvatar,
    });
  }

  static void answerCall(String callId, String targetUserId) {
    _socket?.emit('call:accept', {
      'callId': callId,
      'targetUserId': targetUserId,
    });
  }

  static void endCall(String callId, String targetUserId) {
    _socket?.emit('call:end', {
      'callId': callId,
      'targetUserId': targetUserId,
    });
  }

  static void cancelCall(String targetUserId, String callerName) {
    _socket?.emit('call:cancel', {
      'targetUserId': targetUserId,
      'callerName': callerName,
    });
  }

  static void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
  }
}
