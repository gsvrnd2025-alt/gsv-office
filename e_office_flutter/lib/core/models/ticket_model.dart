import 'user_model.dart';

enum TicketStatus { open, inProgress, pending, resolved, closed }
enum TicketPriority { low, medium, high, urgent }

class TicketComment {
  final String id;
  final String ticketId;
  final String userId;
  final String content;
  final UserModel? user;
  final DateTime createdAt;

  TicketComment({
    required this.id,
    required this.ticketId,
    required this.userId,
    required this.content,
    this.user,
    required this.createdAt,
  });

  factory TicketComment.fromJson(Map<String, dynamic> json) {
    return TicketComment(
      id: json['id']?.toString() ?? '',
      ticketId: json['ticketId']?.toString() ?? '',
      userId: json['userId']?.toString() ?? '',
      content: json['content'] ?? '',
      user: json['user'] != null ? UserModel.fromJson(json['user']) : null,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt']) ?? DateTime.now() : DateTime.now(),
    );
  }
}

class Ticket {
  final String id;
  final String ticketNumber;
  final String subject;
  final String description;
  final TicketStatus status;
  final TicketPriority priority;
  final String? department;
  final String creatorId;
  final UserModel? creator;
  final String? assigneeId;
  final UserModel? assignee;
  final List<TicketComment> comments;
  final DateTime createdAt;
  final DateTime? updatedAt;

  Ticket({
    required this.id,
    required this.ticketNumber,
    required this.subject,
    required this.description,
    this.status = TicketStatus.open,
    this.priority = TicketPriority.medium,
    this.department,
    required this.creatorId,
    this.creator,
    this.assigneeId,
    this.assignee,
    this.comments = const [],
    required this.createdAt,
    this.updatedAt,
  });

  factory Ticket.fromJson(Map<String, dynamic> json) {
    TicketStatus parseStatus(String? s) {
      switch (s?.toLowerCase().replaceAll(' ', '_')) {
        case 'in_progress': case 'inprogress': return TicketStatus.inProgress;
        case 'pending': return TicketStatus.pending;
        case 'resolved': return TicketStatus.resolved;
        case 'closed': return TicketStatus.closed;
        default: return TicketStatus.open;
      }
    }

    TicketPriority parsePriority(String? p) {
      switch (p?.toLowerCase()) {
        case 'urgent': return TicketPriority.urgent;
        case 'high': return TicketPriority.high;
        case 'low': return TicketPriority.low;
        default: return TicketPriority.medium;
      }
    }

    var rawComments = json['comments'] as List? ?? [];
    List<TicketComment> comments = rawComments.map((c) => TicketComment.fromJson(c)).toList();

    return Ticket(
      id: json['id']?.toString() ?? '',
      ticketNumber: json['ticketNumber'] ?? json['id']?.toString().substring(0, 8).toUpperCase() ?? 'TCK-000',
      subject: json['subject'] ?? json['title'] ?? 'No Subject',
      description: json['description'] ?? '',
      status: parseStatus(json['status']),
      priority: parsePriority(json['priority']),
      department: json['department'],
      creatorId: json['creatorId']?.toString() ?? json['userId']?.toString() ?? '',
      creator: json['creator'] != null ? UserModel.fromJson(json['creator']) : null,
      assigneeId: json['assigneeId']?.toString(),
      assignee: json['assignee'] != null ? UserModel.fromJson(json['assignee']) : null,
      comments: comments,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt']) ?? DateTime.now() : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt']) : null,
    );
  }
}
