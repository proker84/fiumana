class AppConfig {
  static const String appName = 'Fiumana Immobiliare';
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api-production-c77b.up.railway.app/api',
  );

  static const Duration tokenRefreshThreshold = Duration(minutes: 5);
  static const Duration httpTimeout = Duration(seconds: 30);
  static const int maxRetries = 3;

  // iCal sync interval
  static const Duration icalSyncInterval = Duration(minutes: 30);

  // Stock minimum threshold default
  static const int defaultMinStockQuantity = 5;
}
