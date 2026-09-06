import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../models/user_model.dart';
import '../services/storage_service.dart';
import '../services/socket_service.dart';
import '../api/api_client.dart';
import '../api/endpoints.dart';

class AuthProvider extends ChangeNotifier {
  UserModel? _user;
  bool _isLoading = false;
  String? _errorMessage;
  bool _isAuthenticated = false;

  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _isAuthenticated;

  AuthProvider() {
    _initAuth();
  }

  void _initAuth() {
    final token = StorageService.getToken();
    final savedUser = StorageService.getUser();
    if (token != null && token.isNotEmpty && savedUser != null) {
      _user = savedUser;
      _isAuthenticated = true;
      SocketService.connect(savedUser);
      notifyListeners();
      fetchProfile(); // Refresh profile in background
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiClient.instance.post(
        Endpoints.login,
        data: {'email': email.trim(), 'password': password},
      );

      if (response.data != null && response.data['success'] == true) {
        final data = response.data['data'];
        final token = data['accessToken'] ?? data['token'];
        final userJson = data['user'] ?? data;

        final userObj = UserModel.fromJson(userJson);
        await StorageService.setToken(token);
        await StorageService.setUser(userObj);

        _user = userObj;
        _isAuthenticated = true;
        _isLoading = false;
        SocketService.connect(userObj);
        notifyListeners();
        return true;
      } else {
        _errorMessage = response.data?['message'] ?? 'Login failed. Invalid credentials.';
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data?['message'] ?? 'Connection error. Please check server IP or network.';
    } catch (e) {
      _errorMessage = 'An unexpected error occurred: $e';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> register({
    required String name,
    required String email,
    required String password,
    String? phone,
    String? department,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiClient.instance.post(
        Endpoints.register,
        data: {
          'name': name.trim(),
          'email': email.trim(),
          'password': password,
          'phone': phone,
          'department': department,
        },
      );

      if (response.data != null && response.data['success'] == true) {
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = response.data?['message'] ?? 'Registration failed.';
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data?['message'] ?? 'Registration failed. Network error.';
    } catch (e) {
      _errorMessage = e.toString();
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<void> fetchProfile() async {
    try {
      final response = await ApiClient.instance.get(Endpoints.me);
      if (response.data != null && response.data['success'] == true) {
        final userObj = UserModel.fromJson(response.data['data']);
        _user = userObj;
        await StorageService.setUser(userObj);
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> logout() async {
    SocketService.disconnect();
    await StorageService.clearAll();
    _user = null;
    _isAuthenticated = false;
    notifyListeners();
  }

  bool hasPermission(String module, String action) {
    if (_user == null) return false;
    return _user!.hasPermission(module, action);
  }
}
