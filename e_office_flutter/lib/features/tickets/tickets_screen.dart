import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_styles.dart';
import '../../core/models/ticket_model.dart';
import '../../core/state/theme_provider.dart';
import '../../core/state/auth_provider.dart';
import '../../core/state/ticket_provider.dart';

class TicketsScreen extends StatefulWidget {
  const TicketsScreen({super.key});

  @override
  State<TicketsScreen> createState() => _TicketsScreenState();
}

class _TicketsScreenState extends State<TicketsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TicketProvider>().fetchTickets();
    });
  }

  void _showNewTicketDialog() {
    final subjectCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    TicketPriority priority = TicketPriority.medium;
    String department = 'IT';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Create Helpdesk Ticket'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Subject:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                const SizedBox(height: 6),
                TextField(
                  controller: subjectCtrl,
                  decoration: const InputDecoration(hintText: 'Brief summary of the issue...', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 14),
                const Text('Department:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: department,
                  items: ['IT', 'Infrastructure', 'Engineering', 'HR', 'Finance', 'Operations']
                      .map((d) => DropdownMenuItem(value: d, child: Text(d)))
                      .toList(),
                  onChanged: (v) => setDialogState(() => department = v ?? 'IT'),
                  decoration: const InputDecoration(border: OutlineInputBorder()),
                ),
                const SizedBox(height: 14),
                const Text('Priority:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                const SizedBox(height: 6),
                DropdownButtonFormField<TicketPriority>(
                  value: priority,
                  items: TicketPriority.values
                      .map((p) => DropdownMenuItem(value: p, child: Text(p.name.toUpperCase())))
                      .toList(),
                  onChanged: (v) => setDialogState(() => priority = v ?? TicketPriority.medium),
                  decoration: const InputDecoration(border: OutlineInputBorder()),
                ),
                const SizedBox(height: 14),
                const Text('Description:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                const SizedBox(height: 6),
                TextField(
                  controller: descCtrl,
                  maxLines: 4,
                  decoration: const InputDecoration(hintText: 'Detailed explanation...', border: OutlineInputBorder()),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                final user = context.read<AuthProvider>().user;
                if (subjectCtrl.text.isNotEmpty && user != null) {
                  context.read<TicketProvider>().createTicket(
                    subject: subjectCtrl.text,
                    description: descCtrl.text,
                    priority: priority,
                    department: department,
                    currentUser: user,
                  );
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Ticket created successfully! 🎫')),
                  );
                }
              },
              child: const Text('Submit Ticket'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final ticketProv = context.watch<TicketProvider>();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Helpdesk & Support Tickets', style: AppStyles.heading1(isDark: isDark)),
                  const SizedBox(height: 4),
                  Text('Track internal enterprise issues, hardware requests, and IT support', style: AppStyles.bodyMedium(isDark: isDark)),
                ],
              ),
              ElevatedButton.icon(
                icon: const Icon(Icons.add_rounded, size: 18),
                label: const Text('New Ticket'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: _showNewTicketDialog,
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Filter Pills Row
          Wrap(
            spacing: 8,
            children: [
              _buildFilterChip('All Statuses', ticketProv.statusFilter == null, () => ticketProv.setFilter(status: null), isDark),
              _buildFilterChip('Open', ticketProv.statusFilter == TicketStatus.open, () => ticketProv.setFilter(status: TicketStatus.open), isDark),
              _buildFilterChip('In Progress', ticketProv.statusFilter == TicketStatus.inProgress, () => ticketProv.setFilter(status: TicketStatus.inProgress), isDark),
              _buildFilterChip('Resolved', ticketProv.statusFilter == TicketStatus.resolved, () => ticketProv.setFilter(status: TicketStatus.resolved), isDark),
            ],
          ),

          const SizedBox(height: 16),

          // Tickets List Container
          Container(
            decoration: AppStyles.cardDecoration(isDark: isDark),
            child: ticketProv.isLoading
                ? const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()))
                : ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: ticketProv.tickets.length,
                    separatorBuilder: (_, __) => Divider(height: 1, color: isDark ? AppColors.darkBorder.withValues(alpha: 0.4) : AppColors.lightBorder),
                    itemBuilder: (context, i) {
                      final ticket = ticketProv.tickets[i];
                      return ListTile(
                        leading: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: _getPriorityColor(ticket.priority).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: _getPriorityColor(ticket.priority).withValues(alpha: 0.4)),
                          ),
                          child: Text(
                            ticket.priority.name.toUpperCase(),
                            style: TextStyle(
                              color: _getPriorityColor(ticket.priority),
                              fontWeight: FontWeight.w800,
                              fontSize: 10,
                            ),
                          ),
                        ),
                        title: Row(
                          children: [
                            Text(
                              '${ticket.ticketNumber} • ',
                              style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.primaryLight, fontSize: 13),
                            ),
                            Expanded(
                              child: Text(
                                ticket.subject,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                        subtitle: Text(
                          '${ticket.department ?? 'General'} • By ${ticket.creator?.name ?? 'Employee'} • ${DateFormat('dd MMM yyyy').format(ticket.createdAt)}',
                          style: const TextStyle(fontSize: 11),
                        ),
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: _getStatusColor(ticket.status).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            ticket.status.name.replaceAll('_', ' ').toUpperCase(),
                            style: TextStyle(
                              color: _getStatusColor(ticket.status),
                              fontWeight: FontWeight.w800,
                              fontSize: 10,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, bool isSelected, VoidCallback onTap, bool isDark) {
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
      selected: isSelected,
      onSelected: (_) => onTap(),
      selectedColor: AppColors.primary.withValues(alpha: 0.25),
    );
  }

  Color _getPriorityColor(TicketPriority p) {
    switch (p) {
      case TicketPriority.urgent: return AppColors.rose;
      case TicketPriority.high: return AppColors.amber;
      case TicketPriority.low: return AppColors.emerald;
      default: return AppColors.primary;
    }
  }

  Color _getStatusColor(TicketStatus s) {
    switch (s) {
      case TicketStatus.resolved: return AppColors.emerald;
      case TicketStatus.closed: return AppColors.darkTextTertiary;
      case TicketStatus.inProgress: return AppColors.cyan;
      default: return AppColors.amber;
    }
  }
}
