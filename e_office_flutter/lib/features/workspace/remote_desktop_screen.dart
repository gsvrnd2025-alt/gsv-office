import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_styles.dart';
import '../../core/state/theme_provider.dart';

class RemoteDesktopScreen extends StatefulWidget {
  const RemoteDesktopScreen({super.key});

  @override
  State<RemoteDesktopScreen> createState() => _RemoteDesktopScreenState();
}

class _RemoteDesktopScreenState extends State<RemoteDesktopScreen> {
  final _hostCtrl = TextEditingController(text: '192.168.0.177:8080');
  bool _isConnected = false;

  @override
  void dispose() {
    _hostCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('🖥️ Remote Desktop & Screen Assistance', style: AppStyles.heading1(isDark: isDark)),
          const SizedBox(height: 4),
          Text('Low latency LAN remote control, screen viewing, and intercom audio session', style: AppStyles.bodyMedium(isDark: isDark)),

          const SizedBox(height: 24),

          // Connection Box
          Container(
            padding: const EdgeInsets.all(20),
            decoration: AppStyles.cardDecoration(isDark: isDark),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _hostCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Remote Host / IP Address',
                      hintText: '192.168.0.xxx:8080',
                      prefixIcon: Icon(Icons.computer_rounded),
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                ElevatedButton.icon(
                  icon: Icon(_isConnected ? Icons.link_off_rounded : Icons.cast_connected_rounded, size: 18),
                  label: Text(_isConnected ? 'Disconnect' : 'Connect Session'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _isConnected ? AppColors.rose : AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                  ),
                  onPressed: () {
                    setState(() => _isConnected = !_isConnected);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(_isConnected ? 'Connected to Remote Workstation 🚀' : 'Session disconnected.')),
                    );
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Remote Canvas / Screen Area
          Container(
            height: 440,
            width: double.infinity,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF070A12) : const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
            ),
            child: Center(
              child: _isConnected
                  ? Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.emerald.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppColors.emerald.withValues(alpha: 0.5)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.fiber_manual_record_rounded, color: AppColors.emerald, size: 14),
                              SizedBox(width: 8),
                              Text('LIVE STREAM • 60 FPS • 1080p', style: TextStyle(color: AppColors.emerald, fontWeight: FontWeight.bold, fontSize: 11)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Icon(Icons.desktop_windows_rounded, size: 80, color: Colors.white24),
                        const SizedBox(height: 12),
                        const Text(
                          'Remote Desktop Stream Active (GSV TrueNAS Subnet)',
                          style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ],
                    )
                  : Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.desktop_access_disabled_rounded, size: 64, color: Colors.white24),
                        const SizedBox(height: 12),
                        const Text('No active remote session', style: TextStyle(color: Colors.white54, fontSize: 14)),
                        const SizedBox(height: 6),
                        const Text('Enter workstation IP and click "Connect Session"', style: TextStyle(color: Colors.white30, fontSize: 11)),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
