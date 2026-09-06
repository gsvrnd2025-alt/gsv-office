import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/constants/app_constants.dart';
import 'core/services/storage_service.dart';
import 'core/api/api_client.dart';
import 'core/state/theme_provider.dart';
import 'core/state/auth_provider.dart';
import 'core/state/chat_provider.dart';
import 'core/state/file_provider.dart';
import 'core/state/ticket_provider.dart';
import 'layout/main_layout.dart';
import 'features/auth/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await StorageService.init();
  ApiClient.init();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ChatProvider()),
        ChangeNotifierProvider(create: (_) => FileProvider()),
        ChangeNotifierProvider(create: (_) => TicketProvider()),
      ],
      child: const GSVOfficeApp(),
    ),
  );
}

class GSVOfficeApp extends StatelessWidget {
  const GSVOfficeApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProv = context.watch<ThemeProvider>();
    final authProv = context.watch<AuthProvider>();

    return MaterialApp(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: themeProv.themeData,
      home: authProv.isAuthenticated
          ? const MainLayout()
          : LoginScreen(onLoginSuccess: () {}),
    );
  }
}
