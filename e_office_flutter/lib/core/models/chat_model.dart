import 'user_model.dart';

enum MessageType { text, image, file, audio, system, call }
enum CallType { audio, video, intercom }
enum CallStatus { idle, dialing, incoming, active, ended, missed, rejected, busy }

class ChatMessage {
  final String id;
  final String conversationId;
  final String senderId;
  final String? content;
  final MessageType type;
  final String? fileUrl;
  final String? fileName;
  final int? fileSize;
  final DateTime createdAt;
  final UserModel? sender;
  final Map<String, dynamic>? metadata;

  ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    this.content,
    this.type = MessageType.text,
    this.fileUrl,
    this.fileName,
    this.fileSize,
    required this.createdAt,
    this.sender,
    this.metadata,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    MessageType parseType(String? t) {
      switch (t?.toLowerCase()) {
        case 'image': return MessageType.image;
        case 'file': return MessageType.file;
        case 'audio': return MessageType.audio;
        case 'call': return MessageType.call;
        case 'system': return MessageType.system;
        default: return MessageType.text;
      }
    }

    return ChatMessage(
      id: json['id']?.toString() ?? '',
      conversationId: json['conversationId']?.toString() ?? '',
      senderId: json['senderId']?.toString() ?? '',
      content: json['content'] ?? '',
      type: parseType(json['type']),
      fileUrl: json['fileUrl'] ?? json['attachmentUrl'],
      fileName: json['fileName'] ?? json['attachmentName'],
      fileSize: json['fileSize'],
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt']) ?? DateTime.now()
          : DateTime.now(),
      sender: json['sender'] != null ? UserModel.fromJson(json['sender']) : null,
      metadata: json['metadata'],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'conversationId': conversationId,
    'senderId': senderId,
    'content': content,
    'type': type.name,
    'fileUrl': fileUrl,
    'fileName': fileName,
    'fileSize': fileSize,
    'createdAt': createdAt.toIso8601String(),
    'sender': sender?.toJson(),
    'metadata': metadata,
  };
}

class ChatConversation {
  final String id;
  final String? name;
  final bool isGroup;
  final List<UserModel> participants;
  final ChatMessage? lastMessage;
  final int unreadCount;
  final DateTime? updatedAt;

  ChatConversation({
    required this.id,
    this.name,
    this.isGroup = false,
    this.participants = const [],
    this.lastMessage,
    this.unreadCount = 0,
    this.updatedAt,
  });

  factory ChatConversation.fromJson(Map<String, dynamic> json, String currentUserId) {
    var rawParts = json['participants'] as List? ?? [];
    List<UserModel> parts = rawParts.map((p) => UserModel.fromJson(p)).toList();

    return ChatConversation(
      id: json['id']?.toString() ?? '',
      name: json['name'],
      isGroup: json['isGroup'] == true || json['type'] == 'group',
      participants: parts,
      lastMessage: json['lastMessage'] != null ? ChatMessage.fromJson(json['lastMessage']) : null,
      unreadCount: json['unreadCount'] ?? 0,
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt']) : null,
    );
  }

  String getDisplayName(String currentUserId) {
    if (isGroup && name != null && name!.isNotEmpty) return name!;
    final other = participants.firstWhere(
      (p) => p.id != currentUserId,
      orElse: () => participants.isNotEmpty ? participants.first : UserModel(id: '', name: 'Workspace Contact', email: ''),
    );
    return other.name;
  }

  bool isUserOnline(String currentUserId) {
    if (isGroup) return false;
    final other = participants.firstWhere(
      (p) => p.id != currentUserId,
      orElse: () => UserModel(id: '', name: '', email: ''),
    );
    return other.isOnline;
  }
}

class MissedCall {
  final String id;
  final String callerId;
  final String callerName;
  final String? callerAvatar;
  final CallType callType;
  final DateTime timestamp;

  MissedCall({
    required this.id,
    required this.callerId,
    required this.callerName,
    this.callerAvatar,
    required this.callType,
    required this.timestamp,
  });
}
