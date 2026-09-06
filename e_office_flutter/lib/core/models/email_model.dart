class EmailMessage {
  final String id;
  final String from;
  final String fromName;
  final List<String> to;
  final String subject;
  final String body;
  final String? folder;
  final bool isRead;
  final bool isStarred;
  final bool hasAttachments;
  final List<String> attachments;
  final DateTime date;

  EmailMessage({
    required this.id,
    required this.from,
    required this.fromName,
    required this.to,
    required this.subject,
    required this.body,
    this.folder = 'inbox',
    this.isRead = false,
    this.isStarred = false,
    this.hasAttachments = false,
    this.attachments = const [],
    required this.date,
  });

  factory EmailMessage.fromJson(Map<String, dynamic> json) {
    var rawTo = json['to'] as List? ?? [json['to']?.toString() ?? ''];
    List<String> toList = rawTo.map((e) => e.toString()).toList();
    var rawAtt = json['attachments'] as List? ?? [];
    List<String> attList = rawAtt.map((a) => a.toString()).toList();

    return EmailMessage(
      id: json['id']?.toString() ?? '',
      from: json['from'] ?? '',
      fromName: json['fromName'] ?? json['from']?.toString().split('@').first ?? 'Sender',
      to: toList,
      subject: json['subject'] ?? '(No Subject)',
      body: json['body'] ?? json['text'] ?? json['html'] ?? '',
      folder: json['folder'] ?? 'inbox',
      isRead: json['isRead'] == true || json['read'] == true,
      isStarred: json['isStarred'] == true,
      hasAttachments: json['hasAttachments'] == true || attList.isNotEmpty,
      attachments: attList,
      date: json['date'] != null ? DateTime.tryParse(json['date']) ?? DateTime.now() : DateTime.now(),
    );
  }
}
