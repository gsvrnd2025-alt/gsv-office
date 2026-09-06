import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../core/state/theme_provider.dart';
import '../core/state/auth_provider.dart';
import '../core/state/chat_provider.dart';

class TopHeader extends StatelessWidget {
  final VoidCallback? onOpenMenu;
  final bool showMenuButton;
  final ValueChanged<String>? onNavigate;

  const TopHeader({
    super.key,
    this.onOpenMenu,
    this.showMenuButton = false,
    this.onNavigate,
  });

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>();
    final isDark = theme.isDark;
    final auth = context.watch<AuthProvider>();
    final chat = context.watch<ChatProvider>();
    final user = auth.user;

    final headerBg = isDark ? const Color(0xFF0F1423) : const Color(0xFFFFFFFF);
    final borderColor = isDark ? AppColors.darkBorder.withValues(alpha: 0.5) : AppColors.lightBorder;

    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: headerBg,
        border: Border(bottom: BorderSide(color: borderColor, width: 1)),
      ),
      child: Row(
        children: [
          if (showMenuButton)
            IconButton(
              icon: const Icon(Icons.menu_rounded),
              onPressed: onOpenMenu,
              splashRadius: 20,
            ),
          
          // Greeting
          Expanded(
            flex: 2,
            child: Row(
              children: [
                Text(
                  'Good morning, ',
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  ),
                ),
                Text(
                  '${user?.name.split(' ').first ?? 'System'} 👋',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                  ),
                ),
              ],
            ),
          ),

          // Search Field (Ctrl + K)
          Expanded(
            flex: 3,
            child: Container(
              height: 38,
              constraints: const BoxConstraints(maxWidth: 420),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkCard.withValues(alpha: 0.7) : AppColors.lightCardHover,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: borderColor),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.search_rounded,
                    size: 18,
                    color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Search anything... (Ctrl+K)',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.black.withValues(alpha: 0.3) : Colors.white,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: borderColor),
                    ),
                    child: Text(
                      '⌘K',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(width: 16),

          // Actions: Dark Mode, Sound Toggle, Notifications, Profile
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Theme Toggle
              IconButton(
                icon: Icon(
                  isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                  size: 20,
                  color: isDark ? Colors.amber : AppColors.lightTextSecondary,
                ),
                onPressed: () => theme.toggleTheme(),
                tooltip: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
                splashRadius: 20,
              ),

              // Sound Toggle
              IconButton(
                icon: Icon(
                  theme.isSoundEnabled ? Icons.volume_up_rounded : Icons.volume_off_rounded,
                  size: 20,
                  color: theme.isSoundEnabled ? AppColors.emerald : AppColors.darkTextTertiary,
                ),
                onPressed: () => theme.toggleSound(),
                tooltip: theme.isSoundEnabled ? 'Sound Enabled' : 'Sound Muted',
                splashRadius: 20,
              ),

              // Notifications / Missed Calls Bell
              Stack(
                alignment: Alignment.topRight,
                children: [
                  IconButton(
                    icon: const Icon(Icons.notifications_none_rounded, size: 20),
                    onPressed: () {
                      if (onNavigate != null) onNavigate!('chat');
                    },
                    tooltip: 'Notifications',
                    splashRadius: 20,
                  ),
                  if (chat.missedCalls.isNotEmpty)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: AppColors.rose,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                ],
              ),

              const SizedBox(width: 8),

              // Profile Avatar
              InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: () {
                  if (onNavigate != null) onNavigate!('profile');
                },
                child: Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'U',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
