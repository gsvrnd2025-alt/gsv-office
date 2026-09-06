import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../services/storage_service.dart';

class ThemeProvider extends ChangeNotifier {
  bool _isDark = true;
  bool _isSoundEnabled = true;

  bool get isDark => _isDark;
  bool get isSoundEnabled => _isSoundEnabled;

  ThemeProvider() {
    _isDark = StorageService.isDarkTheme();
    _isSoundEnabled = StorageService.isSoundEnabled();
  }

  void toggleTheme() {
    _isDark = !_isDark;
    StorageService.setDarkTheme(_isDark);
    notifyListeners();
  }

  void setDarkTheme(bool val) {
    _isDark = val;
    StorageService.setDarkTheme(_isDark);
    notifyListeners();
  }

  void toggleSound() {
    _isSoundEnabled = !_isSoundEnabled;
    StorageService.setSoundEnabled(_isSoundEnabled);
    notifyListeners();
  }

  ThemeData get themeData {
    return ThemeData(
      useMaterial3: true,
      brightness: _isDark ? Brightness.dark : Brightness.light,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: _isDark ? AppColors.darkBg : AppColors.lightBg,
      cardColor: _isDark ? AppColors.darkCard : AppColors.lightCard,
      dividerColor: _isDark ? AppColors.darkBorder : AppColors.lightBorder,
      colorScheme: ColorScheme(
        brightness: _isDark ? Brightness.dark : Brightness.light,
        primary: AppColors.primary,
        onPrimary: Colors.white,
        secondary: AppColors.secondary,
        onSecondary: Colors.white,
        error: AppColors.rose,
        onError: Colors.white,
        surface: _isDark ? AppColors.darkSurface : AppColors.lightSurface,
        onSurface: _isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
      ),
    );
  }
}
