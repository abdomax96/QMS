import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/errors/app_error.dart';
import '../data/auth_repository.dart';
import '../models/auth_profile.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository();
});

/// Emits Supabase auth state changes so the router can react.
final authStateStreamProvider = StreamProvider<AuthState>((ref) {
  return ref.watch(authRepositoryProvider).authStateChanges;
});

/// Holds the loaded user profile (from `users` table).
class AuthState2 {
  const AuthState2({this.profile, this.isLoading = false, this.error});

  final AuthProfile? profile;
  final bool isLoading;
  final AppError? error;

  bool get isAuthenticated => profile != null;

  AuthState2 copyWith({
    AuthProfile? profile,
    bool? isLoading,
    AppError? error,
    bool clearProfile = false,
    bool clearError = false,
  }) {
    return AuthState2(
      profile: clearProfile ? null : (profile ?? this.profile),
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class AuthController extends StateNotifier<AuthState2> {
  AuthController(this._ref) : super(const AuthState2());

  final Ref _ref;
  AuthRepository get _repo => _ref.read(authRepositoryProvider);

  Future<void> signIn(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final response = await _repo.signIn(email: email, password: password);
      final user = response.user ?? response.session?.user;
      if (user == null) {
        throw AppError('تعذر إنشاء جلسة دخول. حاول مرة أخرى.', code: 'auth');
      }
      final profile = await _repo.loadProfile(user: user);
      state = AuthState2(profile: profile, isLoading: false);
    } on AppError catch (e) {
      // If account disabled, ensure session cleared.
      if (e.code == 'disabled') {
        await _repo.signOut();
      }
      state = state.copyWith(isLoading: false, error: e, clearProfile: true);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: AppError.from(e),
        clearProfile: true,
      );
    }
  }

  Future<void> loadProfile() async {
    try {
      final profile = await _repo.loadProfile();
      state = AuthState2(profile: profile, isLoading: false);
    } on AppError catch (e) {
      if (e.code == 'disabled') {
        await _repo.signOut();
      }
      state = state.copyWith(isLoading: false, error: e, clearProfile: true);
    }
  }

  Future<void> signOut() async {
    await _repo.signOut();
    state = const AuthState2();
  }

  void clearError() => state = state.copyWith(clearError: true);
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState2>((ref) {
      return AuthController(ref);
    });

/// Convenience: current profile or null.
final currentProfileProvider = Provider<AuthProfile?>((ref) {
  return ref.watch(authControllerProvider).profile;
});
