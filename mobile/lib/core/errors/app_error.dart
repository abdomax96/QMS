import 'package:supabase_flutter/supabase_flutter.dart';

/// Application-level error with an Arabic, user-friendly message.
class AppError implements Exception {
  AppError(this.message, {this.code, this.cause});

  final String message;
  final String? code;
  final Object? cause;

  @override
  String toString() => 'AppError($code): $message';

  /// Maps a low-level error (Supabase / network / auth) to a localized message.
  factory AppError.from(Object error) {
    // Auth errors (expired session, invalid credentials, etc.)
    if (error is AuthException) {
      final status = error.statusCode;
      if (_isInvalidCredentials(error.message)) {
        return AppError(
          'بيانات الدخول غير صحيحة، تحقق من البريد وكلمة المرور.',
          code: 'auth',
          cause: error,
        );
      }
      if (status == '401') {
        return AppError(
          'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى.',
          code: '401',
          cause: error,
        );
      }
      return AppError(
        'تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.',
        code: 'auth',
        cause: error,
      );
    }

    // Postgrest / RLS errors
    if (error is PostgrestException) {
      final code = error.code;
      final msg = error.message.toLowerCase();
      if (code == '23502') {
        return AppError(
          'يوجد حقل مطلوب غير مكتمل. راجع بيانات التقرير ثم حاول مرة أخرى.',
          code: 'validation',
          cause: error,
        );
      }
      if (code == '42501' ||
          msg.contains('row-level security') ||
          msg.contains('rls') ||
          msg.contains('permission denied') ||
          msg.contains('policy')) {
        return AppError(
          'تم رفض العملية حسب صلاحيات النظام.',
          code: '403',
          cause: error,
        );
      }
      return AppError(
        'حدث خطأ في الخادم. (${error.code ?? ''})',
        code: 'db',
        cause: error,
      );
    }

    if (error is StorageException) {
      return AppError(
        'تعذر رفع الملف. (${error.statusCode ?? ''})',
        code: 'storage',
        cause: error,
      );
    }

    final text = error.toString().toLowerCase();
    if (text.contains('socketexception') ||
        text.contains('failed host lookup') ||
        text.contains('network') ||
        text.contains('connection') ||
        text.contains('timeout')) {
      return AppError(
        'تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.',
        code: 'network',
        cause: error,
      );
    }

    return AppError('حدث خطأ غير متوقع. حاول مرة أخرى.', cause: error);
  }

  static bool _isInvalidCredentials(String message) {
    final m = message.toLowerCase();
    return m.contains('invalid login') ||
        m.contains('invalid credentials') ||
        m.contains('email not confirmed');
  }

  bool get isForbidden => code == '403';
  bool get isUnauthorized => code == '401';
  bool get isNetwork => code == 'network';
}
