import 'dart:async';
import 'dart:collection';
import 'dart:ffi';
import 'dart:io';
import 'package:ffi/ffi.dart';
import 'package:win32/win32.dart';
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

  void _sendMouseInput(double fractionX, double fractionY, String action) {
    if (!Platform.isWindows) return;
    try {
      final input = calloc<INPUT>();
      input.ref.type = INPUT_KEYBOARD; // Will set to mouse right below

      int dx = (fractionX * 65535).round();
      int dy = (fractionY * 65535).round();
      int flags = MOUSEEVENTF_ABSOLUTE;

      if (action == 'move') {
        flags |= MOUSEEVENTF_MOVE;
      } else if (action == 'leftdown') {
        flags |= MOUSEEVENTF_LEFTDOWN;
      } else if (action == 'leftup') {
        flags |= MOUSEEVENTF_LEFTUP;
      } else if (action == 'rightdown') {
        flags |= MOUSEEVENTF_RIGHTDOWN;
      } else if (action == 'rightup') {
        flags |= MOUSEEVENTF_RIGHTUP;
      }

      input.ref.type = INPUT_MOUSE;
      input.ref.mi.dx = dx;
      input.ref.mi.dy = dy;
      input.ref.mi.mouseData = 0;
      input.ref.mi.dwFlags = flags;
      input.ref.mi.time = 0;
      input.ref.mi.dwExtraInfo = 0;

      SendInput(1, input, sizeOf<INPUT>());
      free(input);
    } catch (e) {
      debugPrint('Error sending mouse input: $e');
    }
  }

  void _sendKeyboardInput(String key) {
    if (!Platform.isWindows) return;
    try {
      if (key.length == 1) {
        final int codeUnit = key.codeUnitAt(0);
        // Key down
        final inputDown = calloc<INPUT>();
        inputDown.ref.type = INPUT_KEYBOARD;
        inputDown.ref.ki.wVk = 0;
        inputDown.ref.ki.wScan = codeUnit;
        inputDown.ref.ki.dwFlags = KEYEVENTF_UNICODE;
        SendInput(1, inputDown, sizeOf<INPUT>());
        free(inputDown);

        // Key up
        final inputUp = calloc<INPUT>();
        inputUp.ref.type = INPUT_KEYBOARD;
        inputUp.ref.ki.wVk = 0;
        inputUp.ref.ki.wScan = codeUnit;
        inputUp.ref.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;
        SendInput(1, inputUp, sizeOf<INPUT>());
        free(inputUp);
      } else {
        int vk = 0;
        switch (key) {
          case 'Enter':
            vk = VK_RETURN;
            break;
          case 'Backspace':
            vk = VK_BACK;
            break;
          case 'Tab':
            vk = VK_TAB;
            break;
          case 'Escape':
            vk = VK_ESCAPE;
            break;
          case 'Delete':
            vk = VK_DELETE;
            break;
          case 'ArrowUp':
            vk = VK_UP;
            break;
          case 'ArrowDown':
            vk = VK_DOWN;
            break;
          case 'ArrowLeft':
            vk = VK_LEFT;
            break;
          case 'ArrowRight':
            vk = VK_RIGHT;
            break;
        }

        if (vk != 0) {
          // Key down
          final inputDown = calloc<INPUT>();
          inputDown.ref.type = INPUT_KEYBOARD;
          inputDown.ref.ki.wVk = vk;
          inputDown.ref.ki.wScan = 0;
          inputDown.ref.ki.dwFlags = 0;
          SendInput(1, inputDown, sizeOf<INPUT>());
          free(inputDown);

          // Key up
          final inputUp = calloc<INPUT>();
          inputUp.ref.type = INPUT_KEYBOARD;
          inputUp.ref.ki.wVk = vk;
          inputUp.ref.ki.wScan = 0;
          inputUp.ref.ki.dwFlags = KEYEVENTF_KEYUP;
          SendInput(1, inputUp, sizeOf<INPUT>());
          free(inputUp);
        }
      }
    } catch (e) {
      debugPrint('Error sending keyboard input: $e');
    }
  }

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

  bool _shouldOpenInternally(String url) {
    final lowercaseUrl = url.toLowerCase();
    return lowercaseUrl.contains('docs.google.com') ||
        lowercaseUrl.contains('drive.google.com') ||
        lowercaseUrl.contains('script.google.com') ||
        lowercaseUrl.endsWith('.pdf') ||
        lowercaseUrl.contains('.pdf?') ||
        lowercaseUrl.contains('format=pdf');
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
                  iframeAllow: "camera; microphone; display-capture",
                  iframeAllowFullscreen: true,
                  javaScriptEnabled: true,
                  domStorageEnabled: true,
                  databaseEnabled: true,
                  useOnDownloadStart: true,
                  applicationNameForUserAgent: 'GSVOfficeApp',
                  supportMultipleWindows: true,
                ),
                initialUserScripts: UnmodifiableListView<UserScript>([
                  UserScript(
                    source: """
                      window.gsvDesktop = {
                        isFlutterWrapper: true,
                        remoteInput: function(data) {
                          window.flutter_inappwebview.callHandler('remoteInput', data);
                        },
                        copyFileToClipboard: function(data) {
                          return window.flutter_inappwebview.callHandler('copyFileToClipboard', data);
                        },
                        copyFolderToClipboard: function(data) {
                          return window.flutter_inappwebview.callHandler('copyFolderToClipboard', data);
                        }
                      };
                    """,
                    injectionTime: UserScriptInjectionTime.AT_DOCUMENT_START,
                  ),
                ]),
                onWebViewCreated: (controller) {
                  _webViewController = controller;
                  
                  controller.addJavaScriptHandler(
                    handlerName: 'remoteInput',
                    callback: (args) {
                      if (args.isEmpty) return;
                      final data = args[0] as Map<String, dynamic>;
                      if (data['type'] == 'mouse') {
                        final String action = data['action'];
                        final double fracX = data['fractionX'] is int ? (data['fractionX'] as int).toDouble() : data['fractionX'];
                        final double fracY = data['fractionY'] is int ? (data['fractionY'] as int).toDouble() : data['fractionY'];
                        _sendMouseInput(fracX, fracY, action);
                      } else if (data['type'] == 'key') {
                        final String key = data['key'] as String;
                        _sendKeyboardInput(key);
                      }
                    }
                  );

                  controller.addJavaScriptHandler(
                    handlerName: 'copyFileToClipboard',
                    callback: (args) async {
                      if (args.isEmpty) return {'success': false, 'reason': 'No arguments'};
                      try {
                        final data = args[0] as Map<String, dynamic>;
                        final fileUrl = data['fileUrl'] as String;
                        final fileName = data['fileName'] as String;
                        final token = data['token'] as String?;

                        final tempDir = Directory('${Directory.systemTemp.path}\\GSVOfficeClipboard');
                        if (!await tempDir.exists()) {
                          await tempDir.create(recursive: true);
                        }

                        final destPath = '${tempDir.path}\\$fileName';
                        
                        // Download file
                        final client = HttpClient();
                        client.badCertificateCallback = (cert, host, port) => true;
                        
                        final request = await client.getUrl(Uri.parse(fileUrl));
                        if (token != null && token.isNotEmpty) {
                          request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
                        }
                        
                        final response = await request.close();
                        if (response.statusCode != 200) {
                          return {'success': false, 'reason': 'Server status code ${response.statusCode}'};
                        }
                        
                        final file = File(destPath);
                        final fileStream = file.openWrite();
                        await response.pipe(fileStream);

                        if (Platform.isWindows) {
                          final escapedPath = destPath.replaceAll("'", "''");
                          final result = await Process.run('powershell', [
                            '-NoProfile',
                            '-Command',
                            'Set-Clipboard -Path \'$escapedPath\''
                          ]);
                          if (result.exitCode != 0) {
                            return {'success': false, 'reason': 'PowerShell failed: ${result.stderr}'};
                          }
                        }

                        return {'success': true, 'path': destPath};
                      } catch (err) {
                        return {'success': false, 'reason': err.toString()};
                      }
                    }
                  );

                  controller.addJavaScriptHandler(
                    handlerName: 'copyFolderToClipboard',
                    callback: (args) async {
                      if (args.isEmpty) return {'success': false, 'reason': 'No arguments'};
                      try {
                        final data = args[0] as Map<String, dynamic>;
                        final folderId = data['folderId'] as String;
                        final folderName = data['folderName'] as String;
                        final serverUrl = data['serverUrl'] as String;
                        final token = data['token'] as String?;

                        final tempDir = Directory('${Directory.systemTemp.path}\\GSVOfficeClipboard');
                        if (!await tempDir.exists()) {
                          await tempDir.create(recursive: true);
                        }

                        final destPath = '${tempDir.path}\\$folderName';
                        final destDir = Directory(destPath);
                        if (await destDir.exists()) {
                          await destDir.delete(recursive: true);
                        }

                        final zipPath = '${tempDir.path}\\gsv_folder_$folderId.zip';
                        final zipFile = File(zipPath);
                        if (await zipFile.exists()) {
                          await zipFile.delete();
                        }

                        // Download zip
                        final client = HttpClient();
                        client.badCertificateCallback = (cert, host, port) => true;
                        
                        final url = '$serverUrl/api/files/folders/$folderId/download';
                        final request = await client.getUrl(Uri.parse(url));
                        if (token != null && token.isNotEmpty) {
                          request.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
                        }
                        
                        final response = await request.close();
                        if (response.statusCode != 200) {
                          return {'success': false, 'reason': 'Server status code ${response.statusCode}'};
                        }
                        
                        final fileStream = zipFile.openWrite();
                        await response.pipe(fileStream);

                        if (Platform.isWindows) {
                          final escapedZipPath = zipPath.replaceAll("'", "''");
                          final escapedTempDir = tempDir.path.replaceAll("'", "''");
                          final unzipResult = await Process.run('powershell', [
                            '-NoProfile',
                            '-Command',
                            'Expand-Archive -Path \'$escapedZipPath\' -DestinationPath \'$escapedTempDir\' -Force'
                          ]);

                          try {
                            await zipFile.delete();
                          } catch (e) {}

                          if (unzipResult.exitCode != 0) {
                            return {'success': false, 'reason': 'PowerShell unzip failed: ${unzipResult.stderr}'};
                          }

                          final escapedDestPath = destPath.replaceAll("'", "''");
                          final result = await Process.run('powershell', [
                            '-NoProfile',
                            '-Command',
                            'Set-Clipboard -Path \'$escapedDestPath\''
                          ]);
                          if (result.exitCode != 0) {
                            return {'success': false, 'reason': 'PowerShell Set-Clipboard failed: ${result.stderr}'};
                          }
                        }

                        return {'success': true, 'path': destPath};
                      } catch (err) {
                        return {'success': false, 'reason': err.toString()};
                      }
                    }
                  );
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
                  if (_shouldOpenInternally(url)) {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => InternalWebViewScreen(url: url),
                      ),
                    );
                  } else {
                    if (await canLaunchUrl(Uri.parse(url))) {
                      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Cannot download from $url')),
                      );
                    }
                  }
                },
                shouldOverrideUrlLoading: (controller, navigationAction) async {
                  final url = navigationAction.request.url.toString();
                  // Check if it should be opened internally
                  if (_shouldOpenInternally(url)) {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => InternalWebViewScreen(url: url),
                      ),
                    );
                    return NavigationActionPolicy.CANCEL;
                  }

                  // Let the webview handle local domain requests, but open external links in system browser
                  if (!url.contains(_serverUrl.replaceAll('http://', '').replaceAll('https://', '').split(':')[0])) {
                    if (await canLaunchUrl(Uri.parse(url))) {
                      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                      return NavigationActionPolicy.CANCEL;
                    }
                  }
                  return NavigationActionPolicy.ALLOW;
                },
                onCreateWindow: (controller, createWindowAction) async {
                  final requestUrl = createWindowAction.request.url;
                  if (requestUrl != null) {
                    final urlStr = requestUrl.toString();
                    if (_shouldOpenInternally(urlStr)) {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => InternalWebViewScreen(url: urlStr),
                        ),
                      );
                    } else {
                      if (await canLaunchUrl(requestUrl)) {
                        await launchUrl(requestUrl, mode: LaunchMode.externalApplication);
                      }
                    }
                    return true;
                  }
                  return false;
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

class InternalWebViewScreen extends StatefulWidget {
  final String url;
  const InternalWebViewScreen({Key? key, required this.url}) : super(key: key);

  @override
  State<InternalWebViewScreen> createState() => _InternalWebViewScreenState();
}

class _InternalWebViewScreenState extends State<InternalWebViewScreen> {
  InAppWebViewController? _webViewController;
  bool _isLoading = true;
  double _loadProgress = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.url,
          style: const TextStyle(fontSize: 13, overflow: TextOverflow.ellipsis),
        ),
        backgroundColor: const Color(0xFF1E293B),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => _webViewController?.reload(),
          ),
          IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () async {
              if (await _webViewController?.canGoBack() ?? false) {
                _webViewController?.goBack();
              }
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          InAppWebView(
            initialUrlRequest: URLRequest(url: WebUri(widget.url)),
            initialSettings: InAppWebViewSettings(
              useShouldOverrideUrlLoading: true,
              mediaPlaybackRequiresUserGesture: false,
              allowsInlineMediaPlayback: true,
              javaScriptEnabled: true,
              domStorageEnabled: true,
              databaseEnabled: true,
              useOnDownloadStart: true,
              supportMultipleWindows: true,
            ),
            onWebViewCreated: (controller) {
              _webViewController = controller;
            },
            onLoadStart: (controller, url) {
              setState(() {
                _isLoading = true;
              });
            },
            onLoadStop: (controller, url) {
              setState(() {
                _isLoading = false;
              });
            },
            onProgressChanged: (controller, progress) {
              setState(() {
                _loadProgress = progress / 100;
                if (progress >= 100) {
                  _isLoading = false;
                }
              });
            },
            onDownloadStartRequest: (controller, downloadStartRequest) async {
              final url = downloadStartRequest.url.toString();
              if (await canLaunchUrl(Uri.parse(url))) {
                await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
              }
            },
            shouldOverrideUrlLoading: (controller, navigationAction) async {
              final url = navigationAction.request.url.toString();
              final lowercaseUrl = url.toLowerCase();
              final isGoogleOrPdf = lowercaseUrl.contains('docs.google.com') ||
                  lowercaseUrl.contains('drive.google.com') ||
                  lowercaseUrl.contains('script.google.com') ||
                  lowercaseUrl.endsWith('.pdf') ||
                  lowercaseUrl.contains('.pdf?') ||
                  lowercaseUrl.contains('format=pdf');
              if (!isGoogleOrPdf) {
                if (await canLaunchUrl(Uri.parse(url))) {
                  await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                  return NavigationActionPolicy.CANCEL;
                }
              }
              return NavigationActionPolicy.ALLOW;
            },
            onCreateWindow: (controller, createWindowAction) async {
              final requestUrl = createWindowAction.request.url;
              if (requestUrl != null) {
                controller.loadUrl(urlRequest: URLRequest(url: requestUrl));
                return true;
              }
              return false;
            },
          ),
          if (_isLoading)
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
        ],
      ),
    );
  }
}
