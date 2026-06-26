import 'dart:convert';

/// Safe parsing helpers for JSONB / dynamic fields coming from Supabase.
/// These tolerate legacy data shapes (null, string-encoded JSON, wrong types).
class JsonUtils {
  JsonUtils._();

  /// Returns a `Map<String, dynamic>` from a dynamic value or null.
  static Map<String, dynamic>? asMap(Object? value) {
    if (value == null) return null;
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      return value.map((k, v) => MapEntry(k.toString(), v));
    }
    if (value is String && value.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(value);
        if (decoded is Map) {
          return decoded.map((k, v) => MapEntry(k.toString(), v));
        }
      } catch (_) {}
    }
    return null;
  }

  /// Returns a `List<dynamic>` from a dynamic value, never null.
  static List<dynamic> asList(Object? value) {
    if (value == null) return const [];
    if (value is List) return value;
    if (value is String && value.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(value);
        if (decoded is List) return decoded;
      } catch (_) {}
    }
    return const [];
  }

  /// Returns a list of maps from a dynamic JSONB array.
  static List<Map<String, dynamic>> asMapList(Object? value) {
    return asList(value)
        .map((e) => asMap(e))
        .whereType<Map<String, dynamic>>()
        .toList();
  }

  static String asString(Object? value, [String fallback = '']) {
    if (value == null) return fallback;
    return value.toString();
  }

  static String? asStringOrNull(Object? value) {
    if (value == null) return null;
    final s = value.toString();
    return s.isEmpty ? null : s;
  }

  static num? asNum(Object? value) {
    if (value == null) return null;
    if (value is num) return value;
    return num.tryParse(value.toString());
  }

  static int asInt(Object? value, [int fallback = 0]) {
    final n = asNum(value);
    return n?.toInt() ?? fallback;
  }

  static double asDouble(Object? value, [double fallback = 0]) {
    final n = asNum(value);
    return n?.toDouble() ?? fallback;
  }

  static bool asBool(Object? value, [bool fallback = false]) {
    if (value == null) return fallback;
    if (value is bool) return value;
    final s = value.toString().toLowerCase();
    if (s == 'true' || s == '1' || s == 'yes') return true;
    if (s == 'false' || s == '0' || s == 'no') return false;
    return fallback;
  }
}
