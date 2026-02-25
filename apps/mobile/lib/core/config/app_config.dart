class AppConfig {
  static const String appName = 'Fiumana Immobiliare';
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  static const Duration tokenRefreshThreshold = Duration(minutes: 5);
  static const Duration httpTimeout = Duration(seconds: 30);
  static const int maxRetries = 3;

  // iCal sync interval
  static const Duration icalSyncInterval = Duration(minutes: 30);

  // Stock minimum threshold default
  static const int defaultMinStockQuantity = 5;
}
