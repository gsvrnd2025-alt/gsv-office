import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Force portrait + landscape
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);
  // Dark status bar to match app theme
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF0d1117),
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  runApp(const GSVOfficeApp());
}

class GSVOfficeApp extends StatelessWidget {
  const GSVOfficeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GSV E-Office',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF00a884),
          background: Color(0xFF0d1117),
        ),
        scaffoldBackgroundColor: const Color(0xFF0d1117),
        useMaterial3: true,
      ),
      home: const SplashScreen(),
    );
  }
}

// ── Splash Screen ──────────────────────────────────────────────────────────────
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _fadeAnim;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));
    _fadeAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _ctrl, curve: const Interval(0, 0.6, curve: Curves.easeOut)));
    _scaleAnim = Tween<double>(begin: 0.7, end: 1).animate(
      CurvedAnimation(parent: _ctrl, curve: const Interval(0, 0.7, curve: Curves.easeOutBack)));
    _ctrl.forward();

    // Navigate to main app after 2s
    Future.delayed(const Duration(milliseconds: 2000), () {
      if (mounted) {
        Navigator.of(context).pushReplacement(
          PageRouteBuilder(
            pageBuilder: (_, __, ___) => const MainWebViewPage(),
            transitionDuration: const Duration(milliseconds: 500),
            transitionsBuilder: (_, anim, __, child) =>
                FadeTransition(opacity: anim, child: child),
          ),
        );
      }
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0d1117),
      body: Center(
        child: AnimatedBuilder(
          animation: _ctrl,
          builder: (_, __) => FadeTransition(
            opacity: _fadeAnim,
            child: ScaleTransition(
              scale: _scaleAnim,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // GSV Logo placeholder (circular gradient icon)
                  Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(
                        colors: [Color(0xFF00a884), Color(0xFF005c4b)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF00a884).withOpacity(0.5),
                          blurRadius: 32,
                          spreadRadius: 4,
                        )
                      ],
                    ),
                    child: const Icon(Icons.business_center_rounded,
                        color: Colors.white, size: 52),
                  ),
                  const SizedBox(height: 20),
                  const Text('GSV E-Office',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1,
                      )),
                  const SizedBox(height: 6),
                  Text('Enterprise Workspace',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.5),
                        fontSize: 13,
                        letterSpacing: 0.5,
                      )),
                  const SizedBox(height: 40),
                  SizedBox(
                    width: 36,
                    height: 36,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: const Color(0xFF00a884).withOpacity(0.8),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Main WebView Page ──────────────────────────────────────────────────────────
class MainWebViewPage extends StatefulWidget {
  const MainWebViewPage({super.key});

  @override
  State<MainWebViewPage> createState() => _MainWebViewPageState();
}

class _MainWebViewPageState extends State<MainWebViewPage> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMsg = '';
  StreamSubscription? _connectivitySub;
  bool _isOnline = true;

  static const String _serverUrl = 'http://192.168.0.177:8080';

  @override
  void initState() {
    super.initState();
    _checkConnectivity();
    _setupWebView();
  }

  Future<void> _checkConnectivity() async {
    final conn = await Connectivity().checkConnectivity();
    setState(() {
      _isOnline = conn != ConnectivityResult.none;
    });
    _connectivitySub = Connectivity().onConnectivityChanged.listen((result) {
      final online = result != ConnectivityResult.none;
      if (online && !_isOnline) {
        // Came back online — reload
        _controller.reload();
      }
      setState(() => _isOnline = online);
    });
  }

  void _setupWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0d1117))
      ..setNavigationDelegate(NavigationDelegate(
        onPageStarted: (_) => setState(() { _isLoading = true; _hasError = false; }),
        onPageFinished: (_) => setState(() => _isLoading = false),
        onWebResourceError: (error) {
          if (error.isForMainFrame ?? true) {
            setState(() {
              _hasError = true;
              _isLoading = false;
              _errorMsg = 'Cannot connect to GSV server.\nMake sure you are on the office network (192.168.0.x)';
            });
          }
        },
        onNavigationRequest: (request) {
          // Allow all navigation within the server
          return NavigationDecision.navigate;
        },
      ))
      ..setUserAgent(
        'Mozilla/5.0 (Linux; Android 13; GSV-App) AppleWebKit/537.36 '
        '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 GSVOffice/1.0'
      )
      // Enable media (microphone/camera) for WebRTC calls
      // Android handles mic/camera via AndroidManifest.xml permissions
      ..loadRequest(Uri.parse(_serverUrl));
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    super.dispose();
  }

  Future<bool> _onWillPop() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvoked: (didPop) async {
        if (didPop) return;
        final canGoBack = await _controller.canGoBack();
        if (canGoBack) {
          await _controller.goBack();
        } else {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF0d1117),
        body: SafeArea(
          child: Stack(
            children: [
              // Offline banner
              if (!_isOnline)
                Positioned(
                  top: 0, left: 0, right: 0,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    color: const Color(0xFFef4444),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.wifi_off_rounded, color: Colors.white, size: 14),
                        SizedBox(width: 6),
                        Text('No network connection',
                            style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ),

              // Error screen
              if (_hasError)
                _buildErrorScreen()
              else
                WebViewWidget(controller: _controller),

              // Loading indicator
              if (_isLoading && !_hasError)
                const Positioned.fill(
                  child: ColoredBox(
                    color: Color(0xFF0d1117),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircularProgressIndicator(
                            color: Color(0xFF00a884),
                            strokeWidth: 3,
                          ),
                          SizedBox(height: 16),
                          Text('Connecting to GSV Office...',
                              style: TextStyle(color: Colors.white54, fontSize: 13)),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildErrorScreen() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFef4444).withOpacity(0.15),
              ),
              child: const Icon(Icons.wifi_off_rounded,
                  color: Color(0xFFef4444), size: 36),
            ),
            const SizedBox(height: 20),
            const Text('Server Unreachable',
                style: TextStyle(color: Colors.white,
                    fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            Text(_errorMsg,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white54, fontSize: 13, height: 1.5)),
            const SizedBox(height: 8),
            Text('Server: $_serverUrl',
                style: const TextStyle(color: Color(0xFF00a884),
                    fontSize: 12, fontFamily: 'monospace')),
            const SizedBox(height: 28),
            ElevatedButton.icon(
              onPressed: () {
                setState(() { _hasError = false; _isLoading = true; });
                _controller.reload();
              },
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Retry Connection'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00a884),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
