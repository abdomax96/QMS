import 'package:flutter/foundation.dart';

import '../../core/config/env.dart';
import '../../core/supabase/supabase_client.dart';

/// Bootstraps Supabase. Tracks whether initialization succeeded so the UI
/// can show a configuration error instead of crashing.
class SupabaseInit {
  SupabaseInit._();

  static bool initialized = false;
  static String? error;

  static Future<void> ensureInitialized() async {
    if (initialized) return;
    if (!Env.isConfigured) {
      error =
          'إعدادات الاتصال غير مكتملة. يجب توفير SUPABASE_URL و SUPABASE_ANON_KEY عبر --dart-define.';
      if (kDebugMode) {
        debugPrint('[SupabaseInit] Missing SUPABASE_ANON_KEY (or URL).');
      }
      return;
    }
    try {
      await SupabaseService.init();
      initialized = true;
    } catch (e) {
      error = 'تعذر تهيئة الاتصال بالخادم.';
      if (kDebugMode) {
        debugPrint('[SupabaseInit] init failed: $e');
      }
    }
  }
}
