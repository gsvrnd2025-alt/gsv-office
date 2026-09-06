class Endpoints {
  // Auth
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String me = '/auth/me';
  static const String refresh = '/auth/refresh';

  // Users & Administration
  static const String users = '/users';
  static const String roles = '/roles';
  static const String permissions = '/roles/permissions';
  static const String requests = '/requests';

  // Chat & Communication
  static const String conversations = '/chat/conversations';
  static const String messages = '/chat/messages';

  // Files & Storage
  static const String files = '/files';
  static const String storageStats = '/files/stats';
  static const String upload = '/files/upload';

  // Helpdesk Tickets
  static const String tickets = '/tickets';

  // Email
  static const String emails = '/email/messages';
  static const String sendEmail = '/email/send';

  // System & Dashboard
  static const String dashboardStats = '/system/dashboard';
  static const String serverHealth = '/health';
}
