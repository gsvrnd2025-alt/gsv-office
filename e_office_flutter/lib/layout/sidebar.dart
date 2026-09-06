import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_styles.dart';
import '../core/state/theme_provider.dart';
import '../core/state/auth_provider.dart';

class NavItem {
  final String id;
  final String title;
  final IconData icon;
  final String? badge;
  final String? module;
  final String? action;

  const NavItem({
    required this.id,
    required this.title,
    required this.icon,
    this.badge,
    this.module,
    this.action,
  });
}

class Sidebar extends StatelessWidget {
  final String currentRoute;
  final ValueChanged<String> onSelectRoute;
  final bool isCollapsed;
  final VoidCallback onToggleCollapse;

  const Sidebar({
    super.key,
    required this.currentRoute,
    required this.onSelectRoute,
    this.isCollapsed = false,
    required this.onToggleCollapse,
  });

  static const List<NavItem> workspaceItems = [
    NavItem(id: 'dashboard', title: 'Dashboard', icon: Icons.dashboard_rounded, module: 'dashboard', action: 'read'),
    NavItem(id: 'workspace', title: 'Workspace', icon: Icons.grid_view_rounded, module: 'workspace', action: 'read'),
    NavItem(id: 'remote_desktop', title: 'Remote Desktop', icon: Icons.desktop_windows_rounded, module: 'remote_desktop', action: 'read'),
    NavItem(id: 'chat', title: 'Team Chat', icon: Icons.forum_rounded, module: 'chat', action: 'read'),
    NavItem(id: 'files', title: 'Files', icon: Icons.folder_rounded, module: 'files', action: 'read'),
    NavItem(id: 'tickets', title: 'Helpdesk', icon: Icons.confirmation_number_rounded, module: 'tickets', action: 'read'),
    NavItem(id: 'email', title: 'Email', icon: Icons.mark_email_unread_rounded, module: 'email', action: 'read'),
    NavItem(id: 'downloads', title: 'Downloads & App', icon: Icons.download_for_offline_rounded),
  ];

  static const List<NavItem> adminItems = [
    NavItem(id: 'users', title: 'Users', icon: Icons.people_alt_rounded, module: 'users', action: 'read'),
    NavItem(id: 'roles', title: 'Roles & Access', icon: Icons.shield_rounded, module: 'roles', action: 'read'),
    NavItem(id: 'requests', title: 'Requests', icon: Icons.mark_chat_unread_rounded, badge: '1', module: 'requests', action: 'read'),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    final sidebarBg = isDark ? const Color(0xFF0F1423) : const Color(0xFFFFFFFF);
    final borderColor = isDark ? AppColors.darkBorder.withValues(alpha: 0.5) : AppColors.lightBorder;

    return Container(
      width: isCollapsed ? 76 : 240,
      decoration: BoxDecoration(
        color: sidebarBg,
        border: Border(right: BorderSide(color: borderColor, width: 1)),
      ),
      child: Column(
        children: [
          // GSV Office Brand Header
          Container(
            height: 64,
            padding: EdgeInsets.symmetric(horizontal: isCollapsed ? 12 : 16),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: borderColor, width: 1)),
            ),
            child: Row(
              mainAxisAlignment: isCollapsed ? MainAxisAlignment.center : MainAxisAlignment.spaceBetween,
              children: [
                if (!isCollapsed)
                  Row(
                    children: [
                      Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.4),
                              blurRadius: 8,
                            )
                          ],
                        ),
                        child: const Center(
                          child: Text('GSV', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 11)),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'GSV Office',
                        style: AppStyles.heading3(isDark: isDark, color: isDark ? Colors.white : AppColors.lightTextPrimary),
                      ),
                    ],
                  )
                else
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Center(
                      child: Text('GSV', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 11)),
                    ),
                  ),
                IconButton(
                  icon: Icon(
                    isCollapsed ? Icons.chevron_right_rounded : Icons.chevron_left_rounded,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                    size: 20,
                  ),
                  onPressed: onToggleCollapse,
                  splashRadius: 18,
                ),
              ],
            ),
          ),

          // Menu items list
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
              children: [
                if (!isCollapsed)
                  _buildSectionHeader('WORKSPACE', isDark),
                ...workspaceItems.map((item) => _buildNavItem(context, item, isDark, auth)),

                const SizedBox(height: 16),
                if (!isCollapsed)
                  _buildSectionHeader('ADMINISTRATION', isDark),
                ...adminItems.map((item) => _buildNavItem(context, item, isDark, auth)),
              ],
            ),
          ),

          // Bottom User Profile Card
          if (user != null)
            Container(
              padding: EdgeInsets.all(isCollapsed ? 8 : 12),
              margin: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkCard.withValues(alpha: 0.5) : AppColors.lightCardHover,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: borderColor),
              ),
              child: isCollapsed
                  ? Center(
                      child: CircleAvatar(
                        radius: 16,
                        backgroundColor: AppColors.primary,
                        child: Text(
                          user.name.isNotEmpty ? user.name[0].toUpperCase() : 'U',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    )
                  : Row(
                      children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: AppColors.primary,
                          child: Text(
                            user.name.isNotEmpty ? user.name[0].toUpperCase() : 'U',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                user.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12,
                                  color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                                ),
                              ),
                              Text(
                                user.role?.name ?? 'Employee',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 10,
                                  color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: Icon(Icons.logout_rounded, size: 16, color: AppColors.rose.withValues(alpha: 0.8)),
                          onPressed: () => auth.logout(),
                          splashRadius: 16,
                          tooltip: 'Logout',
                        ),
                      ],
                    ),
            ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(left: 12, top: 12, bottom: 6),
      child: Text(
        title,
        style: TextStyle(
          color: isDark ? AppColors.darkTextTertiary : AppColors.lightTextTertiary,
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.8,
        ),
      ),
    );
  }

  Widget _buildNavItem(BuildContext context, NavItem item, bool isDark, AuthProvider auth) {
    final isSelected = currentRoute == item.id;
    final isPermitted = item.module == null || auth.hasPermission(item.module!, item.action ?? 'read');

    final activeBg = AppColors.primary.withValues(alpha: isDark ? 0.2 : 0.12);
    final activeText = isDark ? Colors.white : AppColors.primaryDark;
    final inactiveText = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: () => onSelectRoute(item.id),
          child: Container(
            height: 42,
            padding: EdgeInsets.symmetric(horizontal: isCollapsed ? 0 : 12),
            decoration: BoxDecoration(
              color: isSelected ? activeBg : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              border: isSelected
                  ? Border.all(color: AppColors.primary.withValues(alpha: 0.4), width: 1)
                  : null,
            ),
            child: Row(
              mainAxisAlignment: isCollapsed ? MainAxisAlignment.center : MainAxisAlignment.start,
              children: [
                Icon(
                  item.icon,
                  size: 19,
                  color: isSelected ? AppColors.primaryLight : (isPermitted ? inactiveText : AppColors.darkTextTertiary),
                ),
                if (!isCollapsed) ...[
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      item.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected ? activeText : inactiveText,
                      ),
                    ),
                  ),
                  if (item.badge != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.rose,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        item.badge!,
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    )
                  else if (!isPermitted)
                    const Icon(Icons.lock_outline_rounded, size: 13, color: Colors.grey),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
