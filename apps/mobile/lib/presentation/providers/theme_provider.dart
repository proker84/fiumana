import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _themeModeKey = 'theme_mode';
const _storage = FlutterSecureStorage();

class ThemeNotifier extends Notifier<ThemeMode> {
  @override
  ThemeMode build() {
    _loadTheme();
    return ThemeMode.dark;
  }

  Future<void> _loadTheme() async {
    final savedTheme = await _storage.read(key: _themeModeKey);
    if (savedTheme != null) {
      state = savedTheme == 'light' ? ThemeMode.light : ThemeMode.dark;
    }
  }

  Future<void> toggleTheme() async {
    state = state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    await _storage.write(
      key: _themeModeKey,
      value: state == ThemeMode.light ? 'light' : 'dark',
    );
  }

  Future<void> setTheme(ThemeMode mode) async {
    state = mode;
    await _storage.write(
      key: _themeModeKey,
      value: mode == ThemeMode.light ? 'light' : 'dark',
    );
  }
}

final themeProvider = NotifierProvider<ThemeNotifier, ThemeMode>(ThemeNotifier.new);

final isDarkModeProvider = Provider<bool>((ref) {
  return ref.watch(themeProvider) == ThemeMode.dark;
});
