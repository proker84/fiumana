import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _userIdKey = 'user_id';
  static const _userRoleKey = 'user_role';
  static const _userEmailKey = 'user_email';
  static const _userNameKey = 'user_name';

  // Token methods
  static Future<void> saveAccessToken(String token) async {
    await _storage.write(key: _accessTokenKey, value: token);
  }

  static Future<String?> getAccessToken() async {
    return _storage.read(key: _accessTokenKey);
  }

  static Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: _refreshTokenKey, value: token);
  }

  static Future<String?> getRefreshToken() async {
    return _storage.read(key: _refreshTokenKey);
  }

  // User info methods
  static Future<void> saveUserId(String id) async {
    await _storage.write(key: _userIdKey, value: id);
  }

  static Future<String?> getUserId() async {
    return _storage.read(key: _userIdKey);
  }

  static Future<void> saveUserRole(String role) async {
    await _storage.write(key: _userRoleKey, value: role);
  }

  static Future<String?> getUserRole() async {
    return _storage.read(key: _userRoleKey);
  }

  static Future<void> saveUserEmail(String email) async {
    await _storage.write(key: _userEmailKey, value: email);
  }

  static Future<String?> getUserEmail() async {
    return _storage.read(key: _userEmailKey);
  }

  static Future<void> saveUserName(String name) async {
    await _storage.write(key: _userNameKey, value: name);
  }

  static Future<String?> getUserName() async {
    return _storage.read(key: _userNameKey);
  }

  // Auth session methods
  static Future<void> saveAuthSession({
    required String accessToken,
    required String refreshToken,
    required String userId,
    required String role,
    required String email,
    String? name,
  }) async {
    await Future.wait([
      saveAccessToken(accessToken),
      saveRefreshToken(refreshToken),
      saveUserId(userId),
      saveUserRole(role),
      saveUserEmail(email),
      if (name != null) saveUserName(name),
    ]);
  }

  static Future<void> clearAll() async {
    await _storage.deleteAll();
  }

  static Future<bool> hasValidSession() async {
    final token = await getAccessToken();
    final role = await getUserRole();
    return token != null && role != null;
  }
}
