import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../core/state/theme_provider.dart';
import 'sidebar.dart';
import 'top_header.dart';
import 'permission_guard.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/workspace/workspace_screen.dart';
import '../features/workspace/remote_desktop_screen.dart';
import '../features/chat/chat_screen.dart';
import '../features/files/files_screen.dart';
import '../features/tickets/tickets_screen.dart';
import '../features/email/email_screen.dart';
import '../features/downloads/downloads_screen.dart';
import '../features/admin/users_screen.dart';
import '../features/admin/roles_screen.dart';
import '../features/admin/requests_screen.dart';
import '../features/settings/profile_screen.dart';
import '../features/chat/widgets/call_hud_dialog.dart';
import '../features/chat/widgets/incoming_call_dialog.dart';

class MainLayout extends StatefulWidget {
  const MainLayout({super.key});

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  String _currentRoute = 'dashboard';
  bool _isSidebarCollapsed = false;

  void _navigateTo(String route) {
    setState(() => _currentRoute = route);
  }

  Widget _buildContent(String route) {
    switch (route) {
      case 'dashboard':
        return PermissionGuard(
          module: 'dashboard',
          action: 'read',
          child: DashboardScreen(onNavigate: _navigateTo),
        );
      case 'workspace':
        return PermissionGuard(
          module: 'workspace',
          action: 'read',
          child: WorkspaceScreen(onNavigate: _navigateTo),
        );
      case 'remote_desktop':
        return PermissionGuard(
          module: 'remote_desktop',
          action: 'read',
          child: const RemoteDesktopScreen(),
        );
      case 'chat':
        return const ChatScreen();
      case 'files':
        return PermissionGuard(
          module: 'files',
          action: 'read',
          child: const FilesScreen(),
        );
      case 'tickets':
        return PermissionGuard(
          module: 'tickets',
          action: 'read',
          child: const TicketsScreen(),
        );
      case 'email':
        return PermissionGuard(
          module: 'email',
          action: 'read',
          child: const EmailScreen(),
        );
      case 'downloads':
        return const DownloadsScreen();
      case 'users':
        return PermissionGuard(
          module: 'users',
          action: 'read',
          child: const UsersScreen(),
        );
      case 'roles':
        return PermissionGuard(
          module: 'roles',
          action: 'read',
          child: const RolesScreen(),
        );
      case 'requests':
        return PermissionGuard(
          module: 'requests',
          action: 'read',
          child: const RequestsScreen(),
        );
      case 'profile':
        return const ProfileScreen();
      default:
        return DashboardScreen(onNavigate: _navigateTo);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;

    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isMobile = constraints.maxWidth < 768;

          return Stack(
            children: [
              Row(
                children: [
                  // Desktop Sidebar
                  if (!isMobile)
                    Sidebar(
                      currentRoute: _currentRoute,
                      onSelectRoute: _navigateTo,
                      isCollapsed: _isSidebarCollapsed,
                      onToggleCollapse: () => setState(() => _isSidebarCollapsed = !_isSidebarCollapsed),
                    ),

                  // Main Content Viewport
                  Expanded(
                    child: Column(
                      children: [
                        TopHeader(
                          showMenuButton: isMobile,
                          onOpenMenu: () {
                            showModalBottomSheet(
                              context: context,
                              backgroundColor: Colors.transparent,
                              builder: (ctx) => Container(
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.darkCard : Colors.white,
                                  borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                                ),
                                child: Sidebar(
                                  currentRoute: _currentRoute,
                                  onSelectRoute: (r) {
                                    Navigator.pop(ctx);
                                    _navigateTo(r);
                                  },
                                  isCollapsed: false,
                                  onToggleCollapse: () {},
                                ),
                              ),
                            );
                          },
                          onNavigate: _navigateTo,
                        ),
                        Expanded(
                          child: _buildContent(_currentRoute),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              // Active Call HUD (Floating Overlay in Bottom Right)
              const CallHudOverlay(),

              // Incoming Call Overlay (Modal Popup)
              const IncomingCallOverlay(),
            ],
          );
        },
      ),
    );
  }
}
