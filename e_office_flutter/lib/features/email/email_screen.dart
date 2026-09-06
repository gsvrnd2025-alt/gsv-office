import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_styles.dart';
import '../../core/models/email_model.dart';
import '../../core/state/theme_provider.dart';

class EmailScreen extends StatefulWidget {
  const EmailScreen({super.key});

  @override
  State<EmailScreen> createState() => _EmailScreenState();
}

class _EmailScreenState extends State<EmailScreen> {
  String _selectedFolder = 'inbox';
  EmailMessage? _selectedEmail;

  final List<EmailMessage> _sampleEmails = [
    EmailMessage(
      id: 'e1',
      from: 'noreply@gsv.local',
      fromName: 'GSV Security Notice',
      to: ['admin@gsv.local'],
      subject: 'Weekly TrueNAS Scale Backup Health Report - Pass',
      body: 'Hello Administrator,\n\nThe scheduled snapshot backup of pool "GSVR_Movies" completed with 0 errors. Total protected datasets: 8.\n\nRegards,\nGSV System Services',
      date: DateTime.now().subtract(const Duration(hours: 2)),
      hasAttachments: true,
      attachments: ['backup_report_sep.pdf'],
    ),
    EmailMessage(
      id: 'e2',
      from: 'hr@gsv.local',
      fromName: 'HR Department',
      to: ['all@gsv.local'],
      subject: 'Holiday Schedule & Q3 Enterprise Planning Notice',
      body: 'Dear Team,\n\nPlease review the upcoming company holidays and sprint retrospectives scheduled for this quarter in the attached roadmap.\n\nWarm regards,\nHR Team',
      date: DateTime.now().subtract(const Duration(days: 1)),
    ),
    EmailMessage(
      id: 'e3',
      from: 'accounts@gsv.local',
      fromName: 'Accounts & Finance',
      to: ['admin@gsv.local'],
      subject: 'GST Input Tax Credit Reconciliation Completed',
      body: 'Hi System,\n\nThe GST ITC entries for the previous month have been verified and exported to the Tally ledger.\n\nThank you,\nFinance Head',
      date: DateTime.now().subtract(const Duration(days: 2)),
    ),
  ];

  void _showComposeDialog() {
    final toCtrl = TextEditingController();
    final subCtrl = TextEditingController();
    final bodyCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Compose Enterprise Email'),
        content: SizedBox(
          width: 480,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: toCtrl,
                decoration: const InputDecoration(labelText: 'To:', hintText: 'colleague@gsv.local', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: subCtrl,
                decoration: const InputDecoration(labelText: 'Subject:', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: bodyCtrl,
                maxLines: 5,
                decoration: const InputDecoration(labelText: 'Message Body:', border: OutlineInputBorder()),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Discard')),
          ElevatedButton.icon(
            icon: const Icon(Icons.send_rounded, size: 16),
            label: const Text('Send Email'),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Email dispatched via GSV Mail Server (Port 587)! ✉️')),
              );
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 800;

        return Row(
          children: [
            // Left Folder List
            Container(
              width: 180,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF0D121F) : const Color(0xFFFAFAFA),
                border: Border(right: BorderSide(color: isDark ? AppColors.darkBorder.withValues(alpha: 0.5) : AppColors.lightBorder)),
              ),
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.edit_rounded, size: 16),
                      label: const Text('Compose'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 40),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: _showComposeDialog,
                    ),
                  ),
                  _buildFolderTile('inbox', 'Inbox', Icons.inbox_rounded, '3', isDark),
                  _buildFolderTile('sent', 'Sent', Icons.send_rounded, null, isDark),
                  _buildFolderTile('drafts', 'Drafts', Icons.drafts_rounded, null, isDark),
                  _buildFolderTile('trash', 'Trash', Icons.delete_outline_rounded, null, isDark),
                ],
              ),
            ),

            // Middle Email List
            Expanded(
              flex: 2,
              child: ListView.separated(
                itemCount: _sampleEmails.length,
                separatorBuilder: (_, __) => Divider(height: 1, color: isDark ? AppColors.darkBorder.withValues(alpha: 0.4) : AppColors.lightBorder),
                itemBuilder: (context, i) {
                  final email = _sampleEmails[i];
                  final isSelected = _selectedEmail?.id == email.id;

                  return ListTile(
                    selected: isSelected,
                    selectedTileColor: AppColors.primary.withValues(alpha: 0.1),
                    onTap: () => setState(() => _selectedEmail = email),
                    title: Text(email.fromName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    subtitle: Text(email.subject, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
                    trailing: Text(DateFormat('hh:mm a').format(email.date), style: const TextStyle(fontSize: 10, color: Colors.grey)),
                  );
                },
              ),
            ),

            // Right Email Viewer (Desktop)
            if (!isMobile)
              Expanded(
                flex: 3,
                child: Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkCard : Colors.white,
                    border: Border(left: BorderSide(color: isDark ? AppColors.darkBorder.withValues(alpha: 0.5) : AppColors.lightBorder)),
                  ),
                  child: _selectedEmail == null
                      ? const Center(child: Text('Select an email to read', style: TextStyle(color: Colors.grey)))
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_selectedEmail!.subject, style: AppStyles.heading2(isDark: isDark)),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                CircleAvatar(child: Text(_selectedEmail!.fromName[0])),
                                const SizedBox(width: 10),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(_selectedEmail!.fromName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                    Text(_selectedEmail!.from, style: const TextStyle(color: Colors.grey, fontSize: 11)),
                                  ],
                                ),
                              ],
                            ),
                            const Divider(height: 32),
                            Expanded(
                              child: SingleChildScrollView(
                                child: Text(_selectedEmail!.body, style: TextStyle(fontSize: 14, height: 1.6, color: isDark ? Colors.white70 : Colors.black87)),
                              ),
                            ),
                          ],
                        ),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildFolderTile(String id, String label, IconData icon, String? badge, bool isDark) {
    final isSelected = _selectedFolder == id;
    return ListTile(
      dense: true,
      selected: isSelected,
      leading: Icon(icon, size: 18, color: isSelected ? AppColors.primary : Colors.grey),
      title: Text(label, style: TextStyle(fontSize: 12, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
      trailing: badge != null
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(10)),
              child: Text(badge, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
            )
          : null,
      onTap: () => setState(() => _selectedFolder = id),
    );
  }
}
