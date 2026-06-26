import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/errors/app_error.dart';
import '../../../core/supabase/supabase_client.dart';
import '../models/auth_profile.dart';

/// Account disabled sentinel error.
class AccountDisabledError extends AppError {
  AccountDisabledError()
    : super('تم تعطيل هذا الحساب، تواصل مع مدير النظام.', code: 'disabled');
}

class AuthRepository {
  final SupabaseClient _client = SupabaseService.client;

  Session? get currentSession => _client.auth.currentSession;
  User? get currentUser => _client.auth.currentUser;

  Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    try {
      return await _client.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );
    } catch (e) {
      throw AppError.from(e);
    }
  }

  Future<void> signOut() async {
    try {
      await _client.auth.signOut();
    } catch (e) {
      throw AppError.from(e);
    }
  }

  /// Loads the user profile from the `users` table for the current session.
  /// Throws [AccountDisabledError] if `is_active` is false.
  Future<AuthProfile> loadProfile({User? user}) async {
    final authUser = user ?? currentUser ?? currentSession?.user;
    if (authUser == null) {
      throw AppError('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى.', code: '401');
    }
    try {
      final data = await _client
          .from('users')
          .select(
            'id, email, name, display_name, department, department_id, roles, title, phone, avatar_url, is_active',
          )
          .eq('id', authUser.id)
          .maybeSingle();

      if (data == null) {
        // Fall back to minimal profile from the auth user if there is no row yet.
        return AuthProfile(id: authUser.id, email: authUser.email ?? '');
      }

      final profile = AuthProfile.fromMap(data);
      if (!profile.isActive) {
        throw AccountDisabledError();
      }
      return profile;
    } on AppError {
      rethrow;
    } catch (e) {
      throw AppError.from(e);
    }
  }
}
