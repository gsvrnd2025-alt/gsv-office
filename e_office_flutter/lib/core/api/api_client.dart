import 'package:dio/dio.dart';
import '../services/storage_service.dart';

class ApiClient {
  static Dio? _dio;

  static Dio get instance {
    if (_dio == null) {
      init();
    }
    return _dio!;
  }

  static void init() {
    final baseUrl = StorageService.getServerUrl();
    final fullApiUrl = baseUrl.endsWith('/api') ? baseUrl : '$baseUrl/api';

    _dio = Dio(BaseOptions(
      baseUrl: fullApiUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _dio!.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        final token = StorageService.getToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException error, handler) async {
        if (error.response?.statusCode == 401) {
          // Token expired or invalid
          await StorageService.clearAll();
        }
        return handler.next(error);
      },
    ));
  }

  static void updateBaseUrl(String newBaseUrl) {
    final fullApiUrl = newBaseUrl.endsWith('/api') ? newBaseUrl : '$newBaseUrl/api';
    _dio?.options.baseUrl = fullApiUrl;
  }
}
