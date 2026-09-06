class Permission {
  final String id;
  final String name;
  final String module;
  final String action;
  final String? description;

  Permission({
    required this.id,
    required this.name,
    required this.module,
    required this.action,
    this.description,
  });

  factory Permission.fromJson(Map<String, dynamic> json) {
    return Permission(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      module: json['module'] ?? '',
      action: json['action'] ?? '',
      description: json['description'],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'module': module,
    'action': action,
    'description': description,
  };
}

class RolePermission {
  final String? id;
  final String? roleId;
  final String? permissionId;
  final bool granted;
  final Permission? permission;

  RolePermission({
    this.id,
    this.roleId,
    this.permissionId,
    required this.granted,
    this.permission,
  });

  factory RolePermission.fromJson(Map<String, dynamic> json) {
    return RolePermission(
      id: json['id']?.toString(),
      roleId: json['roleId']?.toString(),
      permissionId: json['permissionId']?.toString(),
      granted: json['granted'] == true || json['granted'] == 1,
      permission: json['permission'] != null ? Permission.fromJson(json['permission']) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'roleId': roleId,
    'permissionId': permissionId,
    'granted': granted,
    'permission': permission?.toJson(),
  };
}

class Role {
  final String id;
  final String name;
  final String? description;
  final List<RolePermission> permissions;

  Role({
    required this.id,
    required this.name,
    this.description,
    this.permissions = const [],
  });

  factory Role.fromJson(Map<String, dynamic> json) {
    var rawPerms = json['permissions'] as List? ?? [];
    List<RolePermission> perms = rawPerms.map((p) => RolePermission.fromJson(p)).toList();
    return Role(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      description: json['description'],
      permissions: perms,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'description': description,
    'permissions': permissions.map((p) => p.toJson()).toList(),
  };
}

class UserModel {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String? avatar;
  final String? department;
  final String? designation;
  final bool isActive;
  final bool isOnline;
  final bool isSuperAdmin;
  final Role? role;
  final List<RolePermission> userPermissions;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.avatar,
    this.department,
    this.designation,
    this.isActive = true,
    this.isOnline = false,
    this.isSuperAdmin = false,
    this.role,
    this.userPermissions = const [],
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    var rawUserPerms = json['userPermissions'] as List? ?? [];
    List<RolePermission> uPerms = rawUserPerms.map((p) => RolePermission.fromJson(p)).toList();

    return UserModel(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'],
      avatar: json['avatar'],
      department: json['department'],
      designation: json['designation'],
      isActive: json['isActive'] != false,
      isOnline: json['isOnline'] == true,
      isSuperAdmin: json['isSuperAdmin'] == true || json['role']?['name'] == 'Super Admin',
      role: json['role'] != null ? Role.fromJson(json['role']) : null,
      userPermissions: uPerms,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
    'phone': phone,
    'avatar': avatar,
    'department': department,
    'designation': designation,
    'isActive': isActive,
    'isOnline': isOnline,
    'isSuperAdmin': isSuperAdmin,
    'role': role?.toJson(),
    'userPermissions': userPermissions.map((p) => p.toJson()).toList(),
  };

  bool hasPermission(String module, String action) {
    if (isSuperAdmin || role?.name == 'Super Admin' || role?.name == 'Admin') {
      return true;
    }
    if (module == 'chat') return true; // Chat is available to all authenticated employees

    final effective = <String, bool>{};

    if (role != null) {
      for (final rp in role!.permissions) {
        if (rp.permission != null) {
          effective['${rp.permission!.module}:${rp.permission!.action}'] = rp.granted;
        }
      }
    }

    for (final up in userPermissions) {
      if (up.permission != null) {
        effective['${up.permission!.module}:${up.permission!.action}'] = up.granted;
      }
    }

    return effective['$module:$action'] == true;
  }
}
