import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_styles.dart';
import '../../core/state/theme_provider.dart';

class WorkspaceScreen extends StatefulWidget {
  final ValueChanged<String> onNavigate;

  const WorkspaceScreen({super.key, required this.onNavigate});

  @override
  State<WorkspaceScreen> createState() => _WorkspaceScreenState();
}

class _WorkspaceScreenState extends State<WorkspaceScreen> {
  final List<Map<String, dynamic>> _notes = [
    {'id': '1', 'title': 'TrueNAS Storage Snapshot', 'content': 'Ensure pool replication is configured for daily 02:00 AM offsite backups.', 'color': AppColors.amber},
    {'id': '2', 'title': 'WebRTC Intercom Extension', 'content': 'Default dial plan 101-120 mapped to engineering department cubicles.', 'color': AppColors.emerald},
    {'id': '3', 'title': 'GST Reconciliation Q3', 'content': 'Export monthly tally xml reports to TrueNAS files/finance folder.', 'color': AppColors.cyan},
  ];

  void _addNote() {
    setState(() {
      _notes.add({
        'id': DateTime.now().millisecondsSinceEpoch.toString(),
        'title': 'New Workspace Note',
        'content': 'Write task or reminder here...',
        'color': AppColors.primaryLight,
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('GSV Workspace & Apps Launcher', style: AppStyles.heading1(isDark: isDark)),
          const SizedBox(height: 4),
          Text('Integrated enterprise productivity tools and workstation utilities', style: AppStyles.bodyMedium(isDark: isDark)),

          const SizedBox(height: 24),

          // Workspace Apps Grid
          Text('Productivity Suite', style: AppStyles.heading3(isDark: isDark)),
          const SizedBox(height: 14),
          LayoutBuilder(
            builder: (context, constraints) {
              final isDesktop = constraints.maxWidth > 800;
              return GridView.count(
                crossAxisCount: isDesktop ? 4 : 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: 1.3,
                children: [
                  _buildAppTile('Team Chat & Intercom', 'Real-time channels & WebRTC', Icons.forum_rounded, AppColors.primary, () => widget.onNavigate('chat'), isDark),
                  _buildAppTile('Remote Desktop', 'Connect to LAN workstations', Icons.desktop_windows_rounded, AppColors.cyan, () => widget.onNavigate('remote_desktop'), isDark),
                  _buildAppTile('Files & Storage', 'ZFS Pools & MinIO Storage', Icons.folder_rounded, AppColors.emerald, () => widget.onNavigate('files'), isDark),
                  _buildAppTile('Helpdesk Tickets', 'Internal support & tracking', Icons.confirmation_number_rounded, AppColors.amber, () => widget.onNavigate('tickets'), isDark),
                  _buildAppTile('Enterprise Mail', 'Corporate email client', Icons.email_rounded, AppColors.secondary, () => widget.onNavigate('email'), isDark),
                  _buildAppTile('Downloads & APK', 'Desktop & Mobile clients', Icons.download_rounded, AppColors.rose, () => widget.onNavigate('downloads'), isDark),
                  _buildAppTile('User Administration', 'Staff accounts & directory', Icons.people_alt_rounded, AppColors.primaryLight, () => widget.onNavigate('users'), isDark),
                  _buildAppTile('Roles & Access Matrix', 'Granular system permissions', Icons.security_rounded, AppColors.emerald, () => widget.onNavigate('roles'), isDark),
                ],
              );
            },
          ),

          const SizedBox(height: 32),

          // Sticky Notes Board
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('📌 Sticky Notes & Reminders', style: AppStyles.heading3(isDark: isDark)),
              TextButton.icon(
                icon: const Icon(Icons.add_rounded, size: 16),
                label: const Text('Add Note'),
                onPressed: _addNote,
              ),
            ],
          ),
          const SizedBox(height: 12),
          LayoutBuilder(
            builder: (context, constraints) {
              final isDesktop = constraints.maxWidth > 700;
              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: isDesktop ? 3 : 1,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  childAspectRatio: 1.5,
                ),
                itemCount: _notes.length,
                itemBuilder: (context, i) {
                  final note = _notes[i];
                  final color = note['color'] as Color;

                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: isDark ? 0.12 : 0.08),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: color.withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              note['title'] as String,
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: color),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close_rounded, size: 14),
                              onPressed: () => setState(() => _notes.removeAt(i)),
                              splashRadius: 12,
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Expanded(
                          child: Text(
                            note['content'] as String,
                            style: TextStyle(fontSize: 12, height: 1.4, color: isDark ? Colors.white70 : Colors.black87),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildAppTile(String title, String subtitle, IconData icon, Color color, VoidCallback onTap, bool isDark) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: AppStyles.cardDecoration(isDark: isDark),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  Text(subtitle, style: const TextStyle(fontSize: 10, color: Colors.grey)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
