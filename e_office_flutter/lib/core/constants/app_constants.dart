class AppConstants {
  static const String appName = 'GSV E-Office';
  static const String appVersion = '2.5.0';
  static const String companyName = 'GSV Technologies';
  
  // Default TrueNAS Server Config
  static const String defaultServerHost = '192.168.0.177';
  static const int defaultServerPort = 8080;
  static const String defaultBaseUrl = 'http://192.168.0.177:8080';
  static const String defaultApiUrl = 'http://192.168.0.177:8080/api';
  static const String defaultSocketUrl = 'http://192.168.0.177:8080';

  // Storage Keys
  static const String keyToken = 'gsv_access_token';
  static const String keyRefreshToken = 'gsv_refresh_token';
  static const String keyUser = 'gsv_user_data';
  static const String keyServerUrl = 'gsv_server_url';
  static const String keyThemeMode = 'gsv_theme_mode';
  static const String keySoundEnabled = 'gsv_sound_enabled';
  static const String keyAutoLogin = 'gsv_auto_login';

  // Sound Assets / Frequencies
  static const double dialToneFreq = 440.0;
  static const double ringToneFreq = 480.0;
  static const double busyToneFreq = 480.0;
}
