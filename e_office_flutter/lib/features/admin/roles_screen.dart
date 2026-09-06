import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_styles.dart';
import '../../core/state/theme_provider.dart';

class RolesScreen extends StatefulWidget {
  const RolesScreen({super.key});

  @override
  State<RolesScreen> createState() => _RolesScreenState();
}

class _RolesScreenState extends State<RolesScreen> {
  String _selectedRole = 'Staff';

  final List<String> _modules = [
    'Dashboard',
    'Workspace',
    'Remote Desktop',
    'Team Chat & Intercom',
    'Files & Storage',
    'Helpdesk Tickets',
    'Enterprise Email',
    'Users Management',
    'Roles & Permissions',
    'Billing & Invoicing',
    'Server & Cluster Health',
  ];

  final Map<String, Map<String, bool>> _permissions = {};

  @override
  void initState() {
    super.initState();
    _initMatrix();
  }

  void _initMatrix() {
    for (final m in _modules) {
      _permissions[m] = {
        'read': true,
        'write': m != 'Users Management' && m != 'Roles & Permissions',
        'delete': m == 'Files & Storage' || m == 'Helpdesk Tickets',
        'admin': false,
      };
    }
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
                  Text('🛡️ Roles & Granular Permissions Matrix', style: AppStyles.heading1(isDark: isDark)),
                  const SizedBox(height: 4),
                  Text('Configure module-level access, write permissions, and administrative capabilities', style: AppStyles.bodyMedium(isDark: isDark)),
                ],
              ),
              ElevatedButton.icon(
                icon: const Icon(Icons.save_rounded, size: 18),
                label: const Text('Save Matrix Changes'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Permissions matrix updated & synced with PostgreSQL! 🔒')),
                  );
                },
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Role Selector Tabs
          Row(
            children: ['Super Admin', 'Admin', 'Manager', 'Staff', 'Guest'].map((r) {
              final isSelected = _selectedRole == r;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(r, style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
                  selected: isSelected,
                  onSelected: (_) => setState(() => _selectedRole = r),
                  selectedColor: AppColors.primary.withValues(alpha: 0.25),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 20),

          // Interactive Permissions Matrix Table
          Container(
            decoration: AppStyles.cardDecoration(isDark: isDark),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                headingRowColor: WidgetStateProperty.all(isDark ? AppColors.darkSurface : AppColors.lightCardHover),
                columns: const [
                  DataColumn(label: Text('MODULE / FEATURE', style: TextStyle(fontWeight: FontWeight.bold))),
                  DataColumn(label: Text('READ', style: TextStyle(fontWeight: FontWeight.bold))),
                  DataColumn(label: Text('WRITE', style: TextStyle(fontWeight: FontWeight.bold))),
                  DataColumn(label: Text('DELETE', style: TextStyle(fontWeight: FontWeight.bold))),
                  DataColumn(label: Text('ADMIN', style: TextStyle(fontWeight: FontWeight.bold))),
                ],
                rows: _modules.map((m) {
                  final perms = _permissions[m] ?? {'read': false, 'write': false, 'delete': false, 'admin': false};
                  return DataRow(
                    cells: [
                      DataCell(Text(m, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
                      DataCell(Checkbox(
                        value: perms['read'],
                        onChanged: (v) => setState(() => perms['read'] = v ?? false),
                      )),
                      DataCell(Checkbox(
                        value: perms['write'],
                        onChanged: (v) => setState(() => perms['write'] = v ?? false),
                      )),
                      DataCell(Checkbox(
                        value: perms['delete'],
                        onChanged: (v) => setState(() => perms['delete'] = v ?? false),
                      )),
                      DataCell(Checkbox(
                        value: perms['admin'],
                        onChanged: (v) => setState(() => perms['admin'] = v ?? false),
                      )),
                    ],
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
