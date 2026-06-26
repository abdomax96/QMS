import 'package:flutter/material.dart';

/// App theme tuned for a factory / quality-control environment (Arabic RTL).
class AppTheme {
  AppTheme._();

  // Brand palette
  static const Color primary = Color(0xFF1565C0); // industrial blue
  static const Color primaryDark = Color(0xFF0D47A1);
  static const Color surface = Color(0xFFF5F7FA);

  // Severity colors
  static const Color severityLow = Color(0xFF2E7D32); // green
  static const Color severityMedium = Color(0xFFEF6C00); // orange
  static const Color severityHigh = Color(0xFFC62828); // red

  // Status colors
  static const Color statusOpen = Color(0xFF1565C0);
  static const Color statusInProgress = Color(0xFFEF6C00);
  static const Color statusPendingReview = Color(0xFF6A1B9A);
  static const Color statusClosed = Color(0xFF2E7D32);
  static const Color statusCancelled = Color(0xFF757575);

  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        primary: primary,
      ),
      scaffoldBackgroundColor: surface,
      fontFamily: 'Roboto',
    );

    return base.copyWith(
      appBarTheme: const AppBarTheme(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
      ),
      cardTheme: CardThemeData(
        elevation: 1.5,
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
        color: Colors.white,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFD0D7DE)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFD0D7DE)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primary, width: 2),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
      ),
      dialogTheme: DialogThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }

  static Color severityColor(String? severity) {
    switch (severity) {
      case 'high':
        return severityHigh;
      case 'medium':
        return severityMedium;
      case 'low':
        return severityLow;
      default:
        return statusCancelled;
    }
  }

  static Color statusColor(String? status) {
    switch (status) {
      case 'open':
        return statusOpen;
      case 'in_progress':
        return statusInProgress;
      case 'pending_review':
        return statusPendingReview;
      case 'closed':
        return statusClosed;
      case 'cancelled':
        return statusCancelled;
      default:
        return statusOpen;
    }
  }
}
