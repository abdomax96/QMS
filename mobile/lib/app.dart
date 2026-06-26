import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/config/env.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/supabase/supabase_init.dart';

class QmsNcrApp extends ConsumerWidget {
  const QmsNcrApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // If Supabase failed to initialize (e.g. missing anon key), show a message.
    if (!SupabaseInit.initialized) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        locale: const Locale('ar'),
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [Locale('ar'), Locale('en')],
        builder: (context, child) =>
            Directionality(textDirection: TextDirection.rtl, child: child!),
        home: const _ConfigErrorScreen(),
      );
    }

    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'NCR - QMS',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      routerConfig: router,
      locale: const Locale('ar'),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [Locale('ar'), Locale('en')],
      builder: (context, child) => Directionality(
        textDirection: TextDirection.rtl,
        child: child!,
      ),
    );
  }
}

class _ConfigErrorScreen extends StatelessWidget {
  const _ConfigErrorScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.settings_outlined,
                  size: 64, color: AppTheme.severityMedium),
              const SizedBox(height: 16),
              Text(
                SupabaseInit.error ?? 'تعذر تهيئة التطبيق.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 16),
              if (!Env.isConfigured)
                const Text(
                  'flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...',
                  textAlign: TextAlign.center,
                  textDirection: TextDirection.ltr,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                    fontFamily: 'monospace',
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
