import 'package:intl/intl.dart';

/// Arabic-aware formatting helpers for dates and numbers.
class ArabicFormatters {
  ArabicFormatters._();

  static final DateFormat _dateFmt = DateFormat('yyyy/MM/dd', 'ar');
  static final DateFormat _dateTimeFmt = DateFormat('yyyy/MM/dd  hh:mm a', 'ar');
  static final NumberFormat _numberFmt = NumberFormat.decimalPattern('ar');

  static String date(DateTime? value) {
    if (value == null) return '—';
    return _dateFmt.format(value.toLocal());
  }

  static String dateTime(DateTime? value) {
    if (value == null) return '—';
    return _dateTimeFmt.format(value.toLocal());
  }

  /// Parses an ISO-ish string or returns null safely.
  static DateTime? tryParseDate(Object? value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    final s = value.toString();
    if (s.isEmpty) return null;
    return DateTime.tryParse(s);
  }

  static String number(num? value) {
    if (value == null) return '—';
    return _numberFmt.format(value);
  }

  /// Formats a date to an ISO date (yyyy-MM-dd) string.
  static String isoDate(DateTime value) =>
      DateFormat('yyyy-MM-dd').format(value);
}
