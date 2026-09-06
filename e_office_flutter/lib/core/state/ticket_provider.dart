import 'package:flutter/material.dart';
import '../models/ticket_model.dart';
import '../models/user_model.dart';
import '../api/api_client.dart';
import '../api/endpoints.dart';

class TicketProvider extends ChangeNotifier {
  List<Ticket> _tickets = [];
  bool _isLoading = false;
  TicketStatus? _statusFilter;
  TicketPriority? _priorityFilter;
  String _searchQuery = '';

  List<Ticket> get tickets => _filteredTickets();
  bool get isLoading => _isLoading;
  TicketStatus? get statusFilter => _statusFilter;
  TicketPriority? get priorityFilter => _priorityFilter;
  String get searchQuery => _searchQuery;

  Future<void> fetchTickets() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await ApiClient.instance.get(Endpoints.tickets);
      if (response.data != null && response.data['success'] == true) {
        var rawList = response.data['data'] as List? ?? [];
        _tickets = rawList.map((t) => Ticket.fromJson(t)).toList();
      }
    } catch (_) {
      if (_tickets.isEmpty) {
        _tickets = _getSampleTickets();
      }
    }

    _isLoading = false;
    notifyListeners();
  }

  void setFilter({TicketStatus? status, TicketPriority? priority, String? query}) {
    _statusFilter = status;
    _priorityFilter = priority;
    if (query != null) _searchQuery = query.toLowerCase();
    notifyListeners();
  }

  Future<bool> createTicket({
    required String subject,
    required String description,
    required TicketPriority priority,
    String? department,
    required UserModel currentUser,
  }) async {
    final newTicket = Ticket(
      id: 'tck_${DateTime.now().millisecondsSinceEpoch}',
      ticketNumber: 'TCK-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      subject: subject,
      description: description,
      status: TicketStatus.open,
      priority: priority,
      department: department,
      creatorId: currentUser.id,
      creator: currentUser,
      createdAt: DateTime.now(),
    );

    _tickets.insert(0, newTicket);
    notifyListeners();

    try {
      await ApiClient.instance.post(
        Endpoints.tickets,
        data: {
          'subject': subject,
          'description': description,
          'priority': priority.name,
          'department': department,
        },
      );
    } catch (_) {}

    return true;
  }

  List<Ticket> _filteredTickets() {
    return _tickets.where((t) {
      if (_statusFilter != null && t.status != _statusFilter) return false;
      if (_priorityFilter != null && t.priority != _priorityFilter) return false;
      if (_searchQuery.isNotEmpty) {
        final matchesSubject = t.subject.toLowerCase().contains(_searchQuery);
        final matchesNum = t.ticketNumber.toLowerCase().contains(_searchQuery);
        if (!matchesSubject && !matchesNum) return false;
      }
      return true;
    }).toList();
  }

  List<Ticket> _getSampleTickets() {
    return [
      Ticket(
        id: 't1',
        ticketNumber: 'TCK-8091',
        subject: 'VPN access issue for Remote Engineering Station 4',
        description: 'Unable to establish secure tunnel to TrueNAS storage volume from subnet 192.168.0.x.',
        status: TicketStatus.open,
        priority: TicketPriority.urgent,
        department: 'Infrastructure',
        creatorId: 'u1',
        creator: UserModel(id: 'u1', name: 'Karthik Raja', email: 'karthik@gsv.local', department: 'Engineering'),
        createdAt: DateTime.now().subtract(const Duration(hours: 3)),
      ),
      Ticket(
        id: 't2',
        ticketNumber: 'TCK-7940',
        subject: 'New employee onboarding workstation setup',
        description: 'Requesting GSV Office client installation and SIP intercom extension assignment for 2 new joiners.',
        status: TicketStatus.inProgress,
        priority: TicketPriority.medium,
        department: 'Human Resources',
        creatorId: 'u2',
        creator: UserModel(id: 'u2', name: 'Divya Priya', email: 'divya@gsv.local', department: 'HR'),
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
      ),
      Ticket(
        id: 't3',
        ticketNumber: 'TCK-6821',
        subject: 'Annual GST Invoicing template customization',
        description: 'Update company tax GSTIN registration headers and footer bank transfer coordinates.',
        status: TicketStatus.resolved,
        priority: TicketPriority.low,
        department: 'Finance',
        creatorId: 'u3',
        creator: UserModel(id: 'u3', name: 'Rajesh Kumar', email: 'rajesh@gsv.local', department: 'Accounts'),
        createdAt: DateTime.now().subtract(const Duration(days: 3)),
      ),
    ];
  }
}
