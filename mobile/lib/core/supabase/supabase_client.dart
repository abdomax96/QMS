import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/env.dart';

/// Centralized access to the Supabase client.
///
/// All read/write operations use the standard authenticated user session.
/// The service_role key is NEVER used here.
class SupabaseService {
  SupabaseService._();

  static Future<void> init() async {
    await Supabase.initialize(
      url: Env.supabaseUrl,
      publishableKey: Env.supabaseAnonKey,
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
        autoRefreshToken: true,
      ),
    );
  }

  static SupabaseClient get client => Supabase.instance.client;

  static GoTrueClient get auth => client.auth;

  static Session? get currentSession => auth.currentSession;

  static User? get currentUser => auth.currentUser;

  static bool get hasSession => currentSession != null;
}
