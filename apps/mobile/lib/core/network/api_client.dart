import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../storage/secure_storage.dart';

class ApiClient {
  late final Dio _dio;

  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: AppConfig.httpTimeout,
      receiveTimeout: AppConfig.httpTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _dio.interceptors.add(AuthInterceptor(_dio));
    _dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
      error: true,
    ));
  }

  Dio get dio => _dio;

  // Auth endpoints
  Future<Response> login(String email, String password) {
    return _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
  }

  Future<Response> refreshToken(String refreshToken) {
    return _dio.post('/auth/refresh', data: {
      'refreshToken': refreshToken,
    });
  }

  // Properties endpoints
  Future<Response> getProperties({Map<String, dynamic>? filters}) {
    return _dio.get('/properties', queryParameters: filters);
  }

  Future<Response> getProperty(String id) {
    return _dio.get('/properties/$id');
  }

  // Cleanings endpoints
  Future<Response> getCleanings({Map<String, dynamic>? filters}) {
    return _dio.get('/cleanings', queryParameters: filters);
  }

  Future<Response> getCleaning(String id) {
    return _dio.get('/cleanings/$id');
  }

  Future<Response> createCleaning(Map<String, dynamic> data) {
    return _dio.post('/cleanings', data: data);
  }

  Future<Response> updateCleaning(String id, Map<String, dynamic> data) {
    return _dio.patch('/cleanings/$id', data: data);
  }

  Future<Response> updateCleaningStatus(String id, String status) {
    return _dio.patch('/cleanings/$id/status', data: {'status': status});
  }

  Future<Response> uploadCleaningPhoto(String cleaningId, String filePath, String type, String? room) async {
    final formData = FormData.fromMap({
      'photo': await MultipartFile.fromFile(filePath),
      'type': type,
      if (room != null) 'room': room,
    });
    return _dio.post('/cleanings/$cleaningId/photos', data: formData);
  }

  // Stock endpoints
  Future<Response> getStockItems({String? propertyId}) {
    return _dio.get('/stock', queryParameters: propertyId != null ? {'propertyId': propertyId} : null);
  }

  Future<Response> getStockItem(String id) {
    return _dio.get('/stock/$id');
  }

  Future<Response> createStockItem(Map<String, dynamic> data) {
    return _dio.post('/stock', data: data);
  }

  Future<Response> updateStockItem(String id, Map<String, dynamic> data) {
    return _dio.patch('/stock/$id', data: data);
  }

  Future<Response> updateStockQuantity(String id, int quantity, String reason) {
    return _dio.patch('/stock/$id/quantity', data: {
      'quantity': quantity,
      'reason': reason,
    });
  }

  Future<Response> getLowStockAlerts() {
    return _dio.get('/stock/alerts');
  }

  // FAQ endpoints
  Future<Response> getFaqs({String? propertyId, String? category}) {
    return _dio.get('/faq', queryParameters: {
      if (propertyId != null) 'propertyId': propertyId,
      if (category != null) 'category': category,
    });
  }

  Future<Response> getFaq(String id) {
    return _dio.get('/faq/$id');
  }

  Future<Response> createFaq(Map<String, dynamic> data) {
    return _dio.post('/faq', data: data);
  }

  Future<Response> updateFaq(String id, Map<String, dynamic> data) {
    return _dio.patch('/faq/$id', data: data);
  }

  Future<Response> deleteFaq(String id) {
    return _dio.delete('/faq/$id');
  }

  // Bookings endpoints
  Future<Response> getBookings({Map<String, dynamic>? filters}) {
    return _dio.get('/bookings', queryParameters: filters);
  }

  Future<Response> getBooking(String id) {
    return _dio.get('/bookings/$id');
  }

  Future<Response> syncAirbnbCalendar(String propertyId) {
    return _dio.post('/bookings/sync/$propertyId');
  }

  // Users endpoints
  Future<Response> getUsers() {
    return _dio.get('/users');
  }

  Future<Response> createUser(Map<String, dynamic> data) {
    return _dio.post('/users', data: data);
  }

  Future<Response> updateUser(String id, Map<String, dynamic> data) {
    return _dio.patch('/users/$id', data: data);
  }

  Future<Response> getProfile() {
    return _dio.get('/auth/profile');
  }

  // Payments endpoints
  Future<Response> getPayments({String? status, String? cleanerId, String? propertyId}) {
    return _dio.get('/payments', queryParameters: {
      if (status != null) 'status': status,
      if (cleanerId != null) 'cleanerId': cleanerId,
      if (propertyId != null) 'propertyId': propertyId,
    });
  }

  Future<Response> getPendingPayments() {
    return _dio.get('/payments/pending');
  }

  Future<Response> getPaidPayments() {
    return _dio.get('/payments/paid');
  }

  Future<Response> getPaymentSummary({String? startDate, String? endDate}) {
    return _dio.get('/payments/summary', queryParameters: {
      if (startDate != null) 'startDate': startDate,
      if (endDate != null) 'endDate': endDate,
    });
  }

  Future<Response> markPaymentAsPaid(String cleaningId, {String? voucherNumber, String? notes}) {
    return _dio.post('/payments/mark-paid', data: {
      'cleaningId': cleaningId,
      if (voucherNumber != null) 'voucherNumber': voucherNumber,
      if (notes != null) 'notes': notes,
    });
  }

  Future<Response> markMultiplePaymentsAsPaid(List<String> cleaningIds, {String? voucherPrefix}) {
    return _dio.post('/payments/mark-paid-multiple', data: {
      'cleaningIds': cleaningIds,
      if (voucherPrefix != null) 'voucherPrefix': voucherPrefix,
    });
  }

  Future<Response> getCleanerPayments(String cleanerId) {
    return _dio.get('/payments/cleaner/$cleanerId');
  }

  Future<Response> exportPayments({String? status, String? startDate, String? endDate}) {
    return _dio.get('/payments/export', queryParameters: {
      if (status != null) 'status': status,
      if (startDate != null) 'startDate': startDate,
      if (endDate != null) 'endDate': endDate,
    });
  }
}

class AuthInterceptor extends Interceptor {
  final Dio _dio;
  bool _isRefreshing = false;

  AuthInterceptor(this._dio);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    // Skip auth header for login and refresh endpoints
    if (options.path.contains('/auth/login') || options.path.contains('/auth/refresh')) {
      return handler.next(options);
    }

    final token = await SecureStorage.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401 && !_isRefreshing) {
      _isRefreshing = true;

      try {
        final refreshToken = await SecureStorage.getRefreshToken();
        if (refreshToken != null) {
          final response = await _dio.post('/auth/refresh', data: {
            'refreshToken': refreshToken,
          });

          if (response.statusCode == 200) {
            final newAccessToken = response.data['accessToken'];
            await SecureStorage.saveAccessToken(newAccessToken);

            // Retry the original request
            final opts = err.requestOptions;
            opts.headers['Authorization'] = 'Bearer $newAccessToken';

            _isRefreshing = false;
            final retryResponse = await _dio.fetch(opts);
            return handler.resolve(retryResponse);
          }
        }
      } catch (e) {
        // Token refresh failed, clear session
        await SecureStorage.clearAll();
      }

      _isRefreshing = false;
    }

    handler.next(err);
  }
}
