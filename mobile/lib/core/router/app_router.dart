import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/company/providers/company_provider.dart';
import '../../features/company/screens/company_selector_screen.dart';
import '../../features/ncr/screens/holds_screen.dart';
import '../../features/ncr/screens/ncr_create_screen.dart';
import '../../features/ncr/screens/ncr_dashboard_screen.dart';
import '../../features/ncr/screens/ncr_details_screen.dart';
import '../../features/ncr/screens/ncr_drafts_screen.dart';
import '../../features/ncr/screens/ncr_list_screen.dart';
import '../../features/supabase/supabase_init.dart';
import '../supabase/supabase_client.dart';

/// Listenable that notifies GoRouter when auth state changes.
class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh(Ref ref) {
    ref.listen(authControllerProvider, (_, __) => notifyListeners());
    SupabaseService.auth.onAuthStateChange.listen((_) => notifyListeners());
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _AuthRefresh(ref);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final loggedIn = ref.read(authControllerProvider).isAuthenticated;
      final hasSession = SupabaseService.hasSession;
      final companyId = ref.read(selectedCompanyIdProvider);
      final loc = state.matchedLocation;

      // Splash decides where to go after bootstrap.
      if (loc == '/splash') return null;

      // Not authenticated (profile not loaded) -> login.
      if (!loggedIn) {
        // If a session exists but profile not loaded yet, splash will load it.
        if (hasSession && loc == '/login') return null;
        return loc == '/login' ? null : '/login';
      }

      // Authenticated but no company selected -> company selector.
      if (companyId == null) {
        return loc == '/companies' ? null : '/companies';
      }

      // Authenticated + company selected, but on auth pages -> dashboard.
      if (loc == '/login' || loc == '/companies') {
        return '/dashboard';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const _SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/companies',
        builder: (context, state) => const CompanySelectorScreen(),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const NcrDashboardScreen(),
      ),
      GoRoute(
        path: '/ncr',
        builder: (context, state) => const NcrListScreen(),
      ),
      GoRoute(
        path: '/ncr/create',
        builder: (context, state) => const NcrCreateScreen(),
      ),
      GoRoute(
        path: '/ncr/details/:id',
        builder: (context, state) =>
            NcrDetailsScreen(ncrId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/holds',
        builder: (context, state) => const HoldsScreen(),
      ),
      GoRoute(
        path: '/drafts',
        builder: (context, state) => const NcrDraftsScreen(),
      ),
    ],
  );
});

/// Splash that bootstraps auth (loads profile if a session exists).
class _SplashScreen extends ConsumerStatefulWidget {
  const _SplashScreen();

  @override
  ConsumerState<_SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<_SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  Future<void> _bootstrap() async {
    if (!SupabaseInit.initialized) {
      // Misconfigured environment.
      if (mounted) context.go('/login');
      return;
    }
    if (SupabaseService.hasSession) {
      await ref.read(authControllerProvider.notifier).loadProfile();
    }
    if (!mounted) return;
    final loggedIn = ref.read(authControllerProvider).isAuthenticated;
    if (loggedIn) {
      final companyId = ref.read(selectedCompanyIdProvider);
      context.go(companyId == null ? '/companies' : '/dashboard');
    } else {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
