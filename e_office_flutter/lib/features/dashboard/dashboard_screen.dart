import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_styles.dart';
import '../../core/state/theme_provider.dart';

class DashboardScreen extends StatelessWidget {
  final ValueChanged<String> onNavigate;

  const DashboardScreen({super.key, required this.onNavigate});

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Banner
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Enterprise Workspace Overview',
                    style: AppStyles.heading1(isDark: isDark),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Real-time operations, communications, and server health',
                    style: AppStyles.bodyMedium(isDark: isDark),
                  ),
                ],
              ),
              ElevatedButton.icon(
                icon: const Icon(Icons.headset_mic_rounded, size: 16),
                label: const Text('Open Intercom'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () => onNavigate('chat'),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // 4 Metric Cards Grid
          LayoutBuilder(
            builder: (context, constraints) {
              final isWide = constraints.maxWidth > 700;
              return GridView.count(
                crossAxisCount: isWide ? 4 : 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: isWide ? 1.6 : 1.3,
                children: [
                  _buildMetricCard(
                    title: 'Active Employees',
                    value: '18 / 24 Online',
                    subtitle: 'All departments connected',
                    icon: Icons.people_outline_rounded,
                    color: AppColors.primary,
                    isDark: isDark,
                  ),
                  _buildMetricCard(
                    title: 'Storage Used',
                    value: '14.2 GB / 500 GB',
                    subtitle: 'TrueNAS ZFS Storage Pool',
                    icon: Icons.cloud_done_outlined,
                    color: AppColors.emerald,
                    isDark: isDark,
                  ),
                  _buildMetricCard(
                    title: 'Open Tickets',
                    value: '3 Pending',
                    subtitle: '1 Urgent priority',
                    icon: Icons.confirmation_number_outlined,
                    color: AppColors.amber,
                    isDark: isDark,
                  ),
                  _buildMetricCard(
                    title: 'Intercom Lines',
                    value: 'Ready & Live',
                    subtitle: 'WebRTC Low Latency',
                    icon: Icons.podcasts_rounded,
                    color: AppColors.accent,
                    isDark: isDark,
                  ),
                ],
              );
            },
          ),

          const SizedBox(height: 24),

          // Quick Actions Row
          Text('Quick Actions', style: AppStyles.heading3(isDark: isDark)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _buildQuickActionBtn(
                title: 'Start Call',
                icon: Icons.phone_forwarded_rounded,
                color: AppColors.emerald,
                onTap: () => onNavigate('chat'),
                isDark: isDark,
              ),
              _buildQuickActionBtn(
                title: 'Upload File',
                icon: Icons.upload_file_rounded,
                color: AppColors.primary,
                onTap: () => onNavigate('files'),
                isDark: isDark,
              ),
              _buildQuickActionBtn(
                title: 'Create Ticket',
                icon: Icons.add_circle_outline_rounded,
                color: AppColors.amber,
                onTap: () => onNavigate('tickets'),
                isDark: isDark,
              ),
              _buildQuickActionBtn(
                title: 'Compose Email',
                icon: Icons.edit_note_rounded,
                color: AppColors.cyan,
                onTap: () => onNavigate('email'),
                isDark: isDark,
              ),
              _buildQuickActionBtn(
                title: 'Client Downloads',
                icon: Icons.download_rounded,
                color: AppColors.secondary,
                onTap: () => onNavigate('downloads'),
                isDark: isDark,
              ),
            ],
          ),

          const SizedBox(height: 28),

          // Server Health & Activity Grid
          LayoutBuilder(
            builder: (context, constraints) {
              final isDesktop = constraints.maxWidth > 800;
              return Flex(
                direction: isDesktop ? Axis.horizontal : Axis.vertical,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Server Cluster Health
                  Expanded(
                    flex: isDesktop ? 3 : 0,
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: AppStyles.cardDecoration(isDark: isDark),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('TrueNAS Cluster Services', style: AppStyles.heading3(isDark: isDark)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppColors.emerald.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Text(
                                  'ALL SYSTEMS NORMAL',
                                  style: TextStyle(color: AppColors.emerald, fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          _buildServiceRow('PostgreSQL 16 Database', 'Operational (5.2ms)', AppColors.emerald, isDark),
                          const Divider(height: 20),
                          _buildServiceRow('Redis 7 Cache & Queue', 'Active (0.8ms)', AppColors.emerald, isDark),
                          const Divider(height: 20),
                          _buildServiceRow('MinIO S3 Object Storage', 'Healthy (14.2 GB stored)', AppColors.emerald, isDark),
                          const Divider(height: 20),
                          _buildServiceRow('CoTURN WebRTC STUN/TURN', 'Running (Port 3478)', AppColors.emerald, isDark),
                          const Divider(height: 20),
                          _buildServiceRow('GSV Mail Server (SMTP/IMAP)', 'Listening on port 587/993', AppColors.emerald, isDark),
                        ],
                      ),
                    ),
                  ),

                  if (isDesktop) const SizedBox(width: 20) else const SizedBox(height: 20),

                  // Recent Activity Timeline
                  Expanded(
                    flex: isDesktop ? 2 : 0,
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: AppStyles.cardDecoration(isDark: isDark),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Recent Activity', style: AppStyles.heading3(isDark: isDark)),
                          const SizedBox(height: 16),
                          _buildActivityItem('Karthik Raja', 'shared a design document in Engineering', '10m ago', isDark),
                          _buildActivityItem('System', 'GSVOffice-Android.apk release updated to v2.5', '25m ago', isDark),
                          _buildActivityItem('Divya Priya', 'opened Helpdesk ticket TCK-7940', '1h ago', isDark),
                          _buildActivityItem('Admin', 'verified backup snapshot on TrueNAS ZFS pool', '2h ago', isDark),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color color,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: AppStyles.cardDecoration(isDark: isDark),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: AppStyles.bodySmall(isDark: isDark)),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 18),
              ),
            ],
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: isDark ? Colors.white : AppColors.lightTextPrimary,
            ),
          ),
          Text(subtitle, style: AppStyles.bodySmall(isDark: isDark)),
        ],
      ),
    );
  }

  Widget _buildQuickActionBtn({
    required String title,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: color.withValues(alpha: isDark ? 0.12 : 0.08),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: color.withValues(alpha: 0.3)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: color, size: 16),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildServiceRow(String name, String status, Color statusColor, bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Container(width: 8, height: 8, decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle)),
            const SizedBox(width: 10),
            Text(name, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isDark ? Colors.white : AppColors.lightTextPrimary)),
          ],
        ),
        Text(status, style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary)),
      ],
    );
  }

  Widget _buildActivityItem(String actor, String action, String time, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 6,
            height: 6,
            margin: const EdgeInsets.only(top: 6, right: 10),
            decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
          ),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                children: [
                  TextSpan(text: '$actor ', style: const TextStyle(fontWeight: FontWeight.bold)),
                  TextSpan(text: action),
                ],
              ),
            ),
          ),
          Text(time, style: TextStyle(fontSize: 10, color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary)),
        ],
      ),
    );
  }
}
