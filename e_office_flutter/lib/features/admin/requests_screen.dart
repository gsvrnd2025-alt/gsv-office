import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_styles.dart';
import '../../core/state/theme_provider.dart';

class RequestsScreen extends StatefulWidget {
  const RequestsScreen({super.key});

  @override
  State<RequestsScreen> createState() => _RequestsScreenState();
}

class _RequestsScreenState extends State<RequestsScreen> {
  final List<Map<String, dynamic>> _requests = [
    {
      'id': 'req_1',
      'user': 'Karthik Raja',
      'type': 'Elevated Permissions',
      'detail': 'Requesting write access to TrueNAS Root Backup Volume',
      'status': 'pending',
      'time': '35 mins ago',
    },
    {
      'id': 'req_2',
      'user': 'Divya Priya',
      'type': 'Hardware Allocation',
      'detail': 'Requesting additional IP Intercom Station Headset for Station 8',
      'status': 'pending',
      'time': '2 hours ago',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('📩 System & Access Requests', style: AppStyles.heading1(isDark: isDark)),
          const SizedBox(height: 4),
          Text('Pending approvals for permission escalations, hardware assets, and workspace access', style: AppStyles.bodyMedium(isDark: isDark)),

          const SizedBox(height: 24),

          Container(
            decoration: AppStyles.cardDecoration(isDark: isDark),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _requests.length,
              separatorBuilder: (_, __) => Divider(height: 1, color: isDark ? AppColors.darkBorder.withValues(alpha: 0.4) : AppColors.lightBorder),
              itemBuilder: (context, i) {
                final r = _requests[i];
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                    child: const Icon(Icons.mark_chat_unread_rounded, color: AppColors.primary, size: 20),
                  ),
                  title: Text('${r['user']} • ${r['type']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  subtitle: Text('${r['detail']}\nSubmitted ${r['time']}', style: const TextStyle(fontSize: 11)),
                  isThreeLine: true,
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.emerald, foregroundColor: Colors.white),
                        onPressed: () {
                          setState(() => _requests.removeAt(i));
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Request Approved! ✅')));
                        },
                        child: const Text('Approve', style: TextStyle(fontSize: 11)),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(foregroundColor: AppColors.rose),
                        onPressed: () {
                          setState(() => _requests.removeAt(i));
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Request Rejected.')));
                        },
                        child: const Text('Reject', style: TextStyle(fontSize: 11)),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
