import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_styles.dart';
import '../../core/state/theme_provider.dart';
import '../../core/state/auth_provider.dart';
import '../../core/services/storage_service.dart';
import '../../core/api/api_client.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _serverUrlCtrl = TextEditingController(text: StorageService.getServerUrl());

  @override
  void dispose() {
    _serverUrlCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final theme = context.watch<ThemeProvider>();
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('👤 Profile & Client Settings', style: AppStyles.heading1(isDark: isDark)),
          const SizedBox(height: 4),
          Text('Manage your personal account, workstation appearance, and network connectivity', style: AppStyles.bodyMedium(isDark: isDark)),

          const SizedBox(height: 24),

          // User Profile Card
          Container(
            padding: const EdgeInsets.all(24),
            decoration: AppStyles.cardDecoration(isDark: isDark),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 36,
                  backgroundColor: AppColors.primary,
                  child: Text(
                    user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'U',
                    style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user?.name ?? 'Employee User', style: AppStyles.heading2(isDark: isDark)),
                      const SizedBox(height: 4),
                      Text('${user?.email ?? 'admin@gsv.local'} • ${user?.department ?? 'IT'} • ${user?.designation ?? 'Staff'}', style: AppStyles.bodyMedium(isDark: isDark)),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Appearance & Sound Settings
          Container(
            padding: const EdgeInsets.all(24),
            decoration: AppStyles.cardDecoration(isDark: isDark),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('🎨 Appearance & Media Preferences', style: AppStyles.heading3(isDark: isDark)),
                const SizedBox(height: 16),
                SwitchListTile(
                  title: const Text('Dark Mode Theme'),
                  subtitle: const Text('Use sleek dark styling tailored for GSV Office'),
                  value: theme.isDark,
                  onChanged: (v) => theme.setDarkTheme(v),
                ),
                const Divider(),
                SwitchListTile(
                  title: const Text('Calling & Notification Sound Effects'),
                  subtitle: const Text('Play dial tone, incoming ringtone, and message alerts'),
                  value: theme.isSoundEnabled,
                  onChanged: (v) => theme.toggleSound(),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // TrueNAS Server Connection Settings
          Container(
            padding: const EdgeInsets.all(24),
            decoration: AppStyles.cardDecoration(isDark: isDark),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('🌐 TrueNAS Server Host Configuration', style: AppStyles.heading3(isDark: isDark)),
                const SizedBox(height: 12),
                TextField(
                  controller: _serverUrlCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Server Base URL',
                    hintText: 'http://192.168.0.177:8080',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.dns_rounded),
                  ),
                ),
                const SizedBox(height: 14),
                ElevatedButton.icon(
                  icon: const Icon(Icons.save_rounded, size: 16),
                  label: const Text('Update Server Connection'),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
                  onPressed: () async {
                    final newUrl = _serverUrlCtrl.text.trim();
                    if (newUrl.isNotEmpty) {
                      final messenger = ScaffoldMessenger.of(context);
                      await StorageService.setServerUrl(newUrl);
                      ApiClient.updateBaseUrl(newUrl);
                      messenger.showSnackBar(
                        SnackBar(content: Text('Server URL updated to $newUrl')),
                      );
                    }
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
