import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'app.dart';
import 'features/supabase/supabase_init.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Arabic locale data for intl formatting.
  await initializeDateFormatting('ar', null);

  // Initialize Supabase (tolerant of missing config).
  await SupabaseInit.ensureInitialized();

  runApp(const ProviderScope(child: QmsNcrApp()));
}
