/// Environment configuration.
///
/// Values are injected at build/run time via `--dart-define`:
///   flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
///   flutter build apk --release --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
///
/// IMPORTANT: Never hardcode the service_role key. Only the anon key is used,
/// and all access goes through the authenticated user's session + RLS.
class Env {
  Env._();

  /// Supabase project URL.
  /// Defaults to the development project URL (public information, not a secret).
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://znbjgihtxpoznqmrealq.supabase.co',
  );

  /// Supabase anon (public) key. MUST be provided via --dart-define in real builds.
  /// The anon key is safe to ship in a client app, but we never log it.
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '',
  );

  /// Storage bucket for NCR attachments.
  static const String attachmentsBucket = 'ncr-attachments';

  static bool get isConfigured =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
