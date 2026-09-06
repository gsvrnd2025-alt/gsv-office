import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_styles.dart';
import '../../core/models/user_model.dart';
import '../../core/state/theme_provider.dart';

class UsersScreen extends StatefulWidget {
  const UsersScreen({super.key});

  @override
  State<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends State<UsersScreen> {
  final List<UserModel> _users = [
    UserModel(id: '1', name: 'System Administrator', email: 'admin@gsv.local', department: 'IT', designation: 'Super Admin', isOnline: true, isSuperAdmin: true),
    UserModel(id: '2', name: 'Karthik Raja', email: 'karthik@gsv.local', department: 'Engineering', designation: 'Lead Systems Architect', isOnline: true),
    UserModel(id: '3', name: 'Divya Priya', email: 'divya@gsv.local', department: 'Human Resources', designation: 'HR Operations Lead', isOnline: false),
    UserModel(id: '4', name: 'Rajesh Kumar', email: 'rajesh@gsv.local', department: 'Finance & Accounts', designation: 'Senior Accountant', isOnline: true),
    UserModel(id: '5', name: 'Senthil Nathan', email: 'senthil@gsv.local', department: 'Operations', designation: 'Infrastructure Engineer', isOnline: false),
  ];

  void _showAddUserDialog() {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final deptCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Workspace User'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Full Name', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: emailCtrl, decoration: const InputDecoration(labelText: 'Email Address', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: deptCtrl, decoration: const InputDecoration(labelText: 'Department', border: OutlineInputBorder())),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (nameCtrl.text.isNotEmpty && emailCtrl.text.isNotEmpty) {
                setState(() {
                  _users.add(UserModel(
                    id: DateTime.now().millisecondsSinceEpoch.toString(),
                    name: nameCtrl.text,
                    email: emailCtrl.text,
                    department: deptCtrl.text.isNotEmpty ? deptCtrl.text : 'General',
                    designation: 'Staff',
                  ));
                });
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('User registered successfully!')));
              }
            },
            child: const Text('Save User'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('👥 Staff & User Management', style: AppStyles.heading1(isDark: isDark)),
                  const SizedBox(height: 4),
                  Text('Manage workstation user accounts, active roles, and departmental access', style: AppStyles.bodyMedium(isDark: isDark)),
                ],
              ),
              ElevatedButton.icon(
                icon: const Icon(Icons.person_add_rounded, size: 18),
                label: const Text('Add User'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                onPressed: _showAddUserDialog,
              ),
            ],
          ),

          const SizedBox(height: 24),

          Container(
            decoration: AppStyles.cardDecoration(isDark: isDark),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _users.length,
              separatorBuilder: (_, __) => Divider(height: 1, color: isDark ? AppColors.darkBorder.withValues(alpha: 0.4) : AppColors.lightBorder),
              itemBuilder: (context, i) {
                final u = _users[i];
                return ListTile(
                  leading: Stack(
                    children: [
                      CircleAvatar(
                        backgroundColor: AppColors.primary,
                        child: Text(u.name[0].toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                      if (u.isOnline)
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            width: 10,
                            height: 10,
                            decoration: const BoxDecoration(color: AppColors.emerald, shape: BoxShape.circle),
                          ),
                        ),
                    ],
                  ),
                  title: Row(
                    children: [
                      Text(u.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      if (u.isSuperAdmin) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(6)),
                          child: const Text('SUPER ADMIN', style: TextStyle(color: AppColors.primaryLight, fontSize: 9, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ],
                  ),
                  subtitle: Text('${u.email} • ${u.department ?? 'General'} • ${u.designation ?? 'Staff'}', style: const TextStyle(fontSize: 11)),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: (u.isActive ? AppColors.emerald : Colors.grey).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          u.isActive ? 'ACTIVE' : 'SUSPENDED',
                          style: TextStyle(color: u.isActive ? AppColors.emerald : Colors.grey, fontWeight: FontWeight.w800, fontSize: 10),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(icon: const Icon(Icons.edit_outlined, size: 18), onPressed: () {}),
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
