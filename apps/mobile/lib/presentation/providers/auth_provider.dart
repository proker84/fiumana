import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/secure_storage.dart';
import '../../data/models/user_model.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

enum AuthStatus { initial, authenticated, unauthenticated, loading }

class AuthState {
  final AuthStatus status;
  final UserModel? user;
  final String? error;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.error,
  });

  AuthState copyWith({
    AuthStatus? status,
    UserModel? user,
    String? error,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      error: error,
    );
  }

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isLoading => status == AuthStatus.loading;
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    _checkAuthStatus();
    return const AuthState();
  }

  ApiClient get _apiClient => ref.read(apiClientProvider);

  Future<void> _checkAuthStatus() async {
    final hasSession = await SecureStorage.hasValidSession();
    if (hasSession) {
      final userId = await SecureStorage.getUserId();
      final email = await SecureStorage.getUserEmail();
      final name = await SecureStorage.getUserName();
      final roleStr = await SecureStorage.getUserRole();

      if (userId != null && email != null && roleStr != null) {
        final role = _parseRole(roleStr);
        state = AuthState(
          status: AuthStatus.authenticated,
          user: UserModel(
            id: userId,
            email: email,
            name: name ?? '',
            role: role,
          ),
        );
      } else {
        state = const AuthState(status: AuthStatus.unauthenticated);
      }
    } else {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  UserRole _parseRole(String role) {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return UserRole.admin;
      case 'CLEANER':
        return UserRole.cleaner;
      case 'GUEST':
        return UserRole.guest;
      default:
        return UserRole.guest;
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(status: AuthStatus.loading, error: null);

    try {
      final response = await _apiClient.login(email, password);
      final authResponse = AuthResponse.fromJson(response.data);

      await SecureStorage.saveAuthSession(
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        userId: authResponse.user.id,
        role: authResponse.user.role.name.toUpperCase(),
        email: authResponse.user.email,
        name: authResponse.user.name,
      );

      state = AuthState(
        status: AuthStatus.authenticated,
        user: authResponse.user,
      );

      return true;
    } catch (e) {
      state = AuthState(
        status: AuthStatus.unauthenticated,
        error: _parseError(e),
      );
      return false;
    }
  }

  Future<void> logout() async {
    await SecureStorage.clearAll();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<void> refreshProfile() async {
    try {
      final response = await _apiClient.getProfile();
      final user = UserModel.fromJson(response.data);
      state = state.copyWith(user: user);
    } catch (e) {
      // Silently fail, keep current user data
    }
  }

  String _parseError(dynamic error) {
    if (error.toString().contains('401')) {
      return 'Credenziali non valide';
    }
    if (error.toString().contains('network')) {
      return 'Errore di connessione';
    }
    return 'Si è verificato un errore';
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

// Convenience providers
final currentUserProvider = Provider<UserModel?>((ref) {
  return ref.watch(authProvider).user;
});

final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isAuthenticated;
});

final userRoleProvider = Provider<UserRole?>((ref) {
  return ref.watch(authProvider).user?.role;
});
