import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_constants.dart';
import '../models/user_model.dart';

class StorageService {
  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static String? getToken() => _prefs?.getString(AppConstants.keyToken);
  static Future<bool> setToken(String token) async => await _prefs?.setString(AppConstants.keyToken, token) ?? false;
  static Future<bool> removeToken() async => await _prefs?.remove(AppConstants.keyToken) ?? false;

  static String getServerUrl() => _prefs?.getString(AppConstants.keyServerUrl) ?? AppConstants.defaultBaseUrl;
  static Future<bool> setServerUrl(String url) async => await _prefs?.setString(AppConstants.keyServerUrl, url) ?? false;

  static bool isAutoLogin() => _prefs?.getBool(AppConstants.keyAutoLogin) ?? true;
  static Future<bool> setAutoLogin(bool val) async => await _prefs?.setBool(AppConstants.keyAutoLogin, val) ?? false;

  static bool isDarkTheme() => _prefs?.getBool(AppConstants.keyThemeMode) ?? true;
  static Future<bool> setDarkTheme(bool val) async => await _prefs?.setBool(AppConstants.keyThemeMode, val) ?? false;

  static bool isSoundEnabled() => _prefs?.getBool(AppConstants.keySoundEnabled) ?? true;
  static Future<bool> setSoundEnabled(bool val) async => await _prefs?.setBool(AppConstants.keySoundEnabled, val) ?? false;

  static UserModel? getUser() {
    final raw = _prefs?.getString(AppConstants.keyUser);
    if (raw == null || raw.isEmpty) return null;
    try {
      return UserModel.fromJson(jsonDecode(raw));
    } catch (_) {
      return null;
    }
  }

  static Future<bool> setUser(UserModel user) async {
    return await _prefs?.setString(AppConstants.keyUser, jsonEncode(user.toJson())) ?? false;
  }

  static Future<void> clearAll() async {
    await _prefs?.remove(AppConstants.keyToken);
    await _prefs?.remove(AppConstants.keyRefreshToken);
    await _prefs?.remove(AppConstants.keyUser);
  }
}
