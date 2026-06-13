import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const GSVOfficeApp());
}

class GSVOfficeApp extends StatelessWidget {
  const GSVOfficeApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GSV Office',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: const Color(0xFF6366F1),
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        cardColor: const Color(0xFF1E293B),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1),
          secondary: Color(0xFF8B5CF6),
          surface: Color(0xFF1E293B),
          error: Color(0xFFEF4444),
        ),
        useMaterial3: true,
      ),
      home: const MainScreen(),
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({Key? key}) : super(key: key);

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  InAppWebViewController? _webViewController;
  String _serverUrl = 'http://192.168.0.177:8080';
  bool _isLoading = true;
  double _loadProgress = 0;
  bool _hasError = false;
  String _errorMessage = '';
  bool _isFirstLoad = true;
  Timer? _splashTimeoutTimer;
  PullToRefreshController? _pullToRefreshController;

  @override
  void initState() {
    super.initState();
    _pullToRefreshController = PullToRefreshController(
      settings: PullToRefreshSettings(
        color: const Color(0xFF6366F1),
        backgroundColor: const Color(0xFF1E293B),
      ),
      onRefresh: () async {
        if (mounted) {
          _webViewController?.reload();
        }
      },
    );
    _loadSettings();
    _startSplashTimeout();
  }

  void _startSplashTimeout() {
    _splashTimeoutTimer = Timer(const Duration(seconds: 12), () {
      if (mounted && _isFirstLoad) {
        setState(() {
          _isFirstLoad = false;
        });
      }
    });
  }

  @override
  void dispose() {
    _splashTimeoutTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _serverUrl = prefs.getString('server_url') ?? 'http://192.168.0.177:8080';
      _isLoading = true;
      _hasError = false;
    });
    if (_webViewController != null) {
      _webViewController!.loadUrl(
        urlRequest: URLRequest(url: WebUri(_serverUrl)),
      );
    }
  }

  Future<void> _saveSettings(String url) async {
    String formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'http://$formattedUrl';
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_url', formattedUrl);
    setState(() {
      _serverUrl = formattedUrl;
      _isLoading = true;
      _hasError = false;
    });
    _webViewController?.loadUrl(
      urlRequest: URLRequest(url: WebUri(formattedUrl)),
    );
  }

  void _showSettingsDialog() {
    final textController = TextEditingController(text: _serverUrl);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.settings, color: Color(0xFF6366F1)),
            SizedBox(width: 10),
            Text('Server Configuration'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Specify the GSV Office server IP and port to connect your workspace:',
              style: TextStyle(fontSize: 13, color: Colors.white70),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: textController,
              decoration: const InputDecoration(
                labelText: 'Server URL',
                hintText: 'e.g. http://192.168.0.177:8080',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.dns),
              ),
              keyboardType: TextInputType.url,
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: () {
              setState(() {
                _isLoading = true;
                _hasError = false;
              });
              _webViewController?.reload();
              Navigator.pop(context);
            },
            icon: const Icon(Icons.refresh, size: 16),
            label: const Text('Reload App'),
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFF6366F1),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (textController.text.trim().isNotEmpty) {
                _saveSettings(textController.text);
                Navigator.pop(context);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6366F1),
              foregroundColor: Colors.white,
            ),
            child: const Text('Connect'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvoked: (didPop) async {
        if (didPop) return;
        if (_webViewController != null && await _webViewController!.canGoBack()) {
          _webViewController!.goBack();
        } else {
          // Allow exit
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        body: SafeArea(
          child: Stack(
            children: [
              // WebView container
              InAppWebView(
                initialUrlRequest: URLRequest(url: WebUri(_serverUrl)),
                pullToRefreshController: _pullToRefreshController,
                initialSettings: InAppWebViewSettings(
                  useShouldOverrideUrlLoading: true,
                  mediaPlaybackRequiresUserGesture: false,
                  allowsInlineMediaPlayback: true,
                  iframeAllow: "camera; microphone",
                  iframeAllowFullscreen: true,
                  javaScriptEnabled: true,
                  domStorageEnabled: true,
                  databaseEnabled: true,
                  useOnDownloadStart: true,
                  applicationNameForUserAgent: 'GSVOfficeApp',
                ),
                onWebViewCreated: (controller) {
                  _webViewController = controller;
                },
                onLoadStart: (controller, url) {
                  setState(() {
                    _isLoading = true;
                    _hasError = false;
                  });
                },
                onLoadStop: (controller, url) async {
                  _pullToRefreshController?.endRefreshing();
                  setState(() {
                    _isLoading = false;
                    _isFirstLoad = false;
                  });
                },
                onProgressChanged: (controller, progress) {
                  setState(() {
                    _loadProgress = progress / 100;
                    if (progress >= 100) {
                      _isLoading = false;
                      _isFirstLoad = false;
                    }
                  });
                },
                onLoadError: (controller, url, code, message) {
                  _pullToRefreshController?.endRefreshing();
                  setState(() {
                    _isLoading = false;
                    _hasError = true;
                    _errorMessage = message;
                  });
                },
                onPermissionRequest: (controller, permissionRequest) async {
                  return PermissionResponse(
                    resources: permissionRequest.resources,
                    action: PermissionResponseAction.GRANT,
                  );
                },
                onDownloadStartRequest: (controller, downloadStartRequest) async {
                  final url = downloadStartRequest.url.toString();
                  if (await canLaunchUrl(Uri.parse(url))) {
                    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Cannot download from $url')),
                    );
                  }
                },
                shouldOverrideUrlLoading: (controller, navigationAction) async {
                  final url = navigationAction.request.url.toString();
                  // Let the webview handle local domain requests, but open external links in system browser
                  if (!url.contains(_serverUrl.replaceAll('http://', '').replaceAll('https://', '').split(':')[0])) {
                    if (await canLaunchUrl(Uri.parse(url))) {
                      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                      return NavigationActionPolicy.CANCEL;
                    }
                  }
                  return NavigationActionPolicy.ALLOW;
                },
              ),

              // Floating Settings Gear Button
              Positioned(
                top: 10,
                right: 10,
                child: Opacity(
                  opacity: 0.3,
                  child: Container(
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.black54,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.settings, color: Colors.white, size: 20),
                      onPressed: _showSettingsDialog,
                      tooltip: 'Configure connection',
                    ),
                  ),
                ),
              ),

              // Loading Progress Bar
              if (_isLoading && !_isFirstLoad)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  child: LinearProgressIndicator(
                    value: _loadProgress > 0 ? _loadProgress : null,
                    backgroundColor: Colors.transparent,
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF6366F1)),
                  ),
                ),

              // Connection Error Overlay
              if (_hasError)
                Container(
                  color: const Color(0xFF0F172A),
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.wifi_off, size: 64, color: Color(0xFFEF4444)),
                        const SizedBox(height: 16),
                        const Text(
                          'Unable to Connect',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Could not load workspace at $_serverUrl.\nVerify the server address or check your connection.',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 13, color: Colors.white70),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Error Details: $_errorMessage',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 11, color: Colors.white38, fontStyle: FontStyle.italic),
                        ),
                        const SizedBox(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            OutlinedButton.icon(
                              onPressed: _showSettingsDialog,
                              icon: const Icon(Icons.settings),
                              label: const Text('Change Server'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFF6366F1),
                                side: const BorderSide(color: Color(0xFF6366F1)),
                              ),
                            ),
                            const SizedBox(width: 12),
                            ElevatedButton.icon(
                              onPressed: () {
                                setState(() {
                                  _isLoading = true;
                                  _hasError = false;
                                });
                                _webViewController?.loadUrl(
                                  urlRequest: URLRequest(url: WebUri(_serverUrl)),
                                );
                              },
                              icon: const Icon(Icons.refresh),
                              label: const Text('Retry Connection'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF6366F1),
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

              // First-time Startup / Initial Loading Cover (Splash screen)
              if (_isFirstLoad)
                Container(
                  color: const Color(0xFF0F172A),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Image.asset(
                          'assets/images/gsvlogo.png',
                          width: 120,
                          height: 120,
                          fit: BoxFit.contain,
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'GSV Office Node',
                          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Establishing secure handshake...',
                          style: TextStyle(fontSize: 13, color: Colors.white38),
                        ),
                        const SizedBox(height: 32),
                        const SizedBox(
                          width: 40,
                          height: 40,
                          child: CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6366F1)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
