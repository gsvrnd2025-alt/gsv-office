import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_styles.dart';
import '../core/state/auth_provider.dart';
import '../core/state/theme_provider.dart';

class PermissionGuard extends StatelessWidget {
  final String module;
  final String action;
  final Widget child;

  const PermissionGuard({
    super.key,
    required this.module,
    required this.action,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isDark = context.watch<ThemeProvider>().isDark;
    final permitted = auth.hasPermission(module, action);

    if (!permitted) {
      return Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 480),
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('🔒', style: TextStyle(fontSize: 64)),
              const SizedBox(height: 16),
              Text(
                'Access Locked',
                style: AppStyles.heading2(isDark: isDark),
              ),
              const SizedBox(height: 12),
              Text(
                'Your user profile does not have permission to access the "$module" module. Please coordinate with your administrator or department manager.',
                textAlign: TextAlign.center,
                style: AppStyles.bodyMedium(isDark: isDark),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.rose.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.rose.withValues(alpha: 0.3)),
                ),
                child: Text(
                  'STATUS: LOCKED',
                  style: TextStyle(
                    color: AppColors.rose,
                    fontWeight: FontWeight.w800,
                    fontSize: 11,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return child;
  }
}
