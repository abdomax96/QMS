import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/company_repository.dart';
import '../models/company.dart';

const _kSelectedCompanyKey = 'selected_company_id';

final companyRepositoryProvider = Provider<CompanyRepository>((ref) {
  return CompanyRepository();
});

/// List of companies available to the user.
final companiesProvider = FutureProvider<List<Company>>((ref) async {
  return ref.watch(companyRepositoryProvider).fetchCompanies();
});

/// Holds the currently selected company id (persisted as non-sensitive data).
class SelectedCompanyController extends StateNotifier<String?> {
  SelectedCompanyController() : super(null) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    state = prefs.getString(_kSelectedCompanyKey);
  }

  Future<void> select(String companyId) async {
    state = companyId;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kSelectedCompanyKey, companyId);
  }

  Future<void> clear() async {
    state = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kSelectedCompanyKey);
  }
}

final selectedCompanyIdProvider =
    StateNotifierProvider<SelectedCompanyController, String?>((ref) {
  return SelectedCompanyController();
});

/// Returns the selected Company object (resolved from the list), if any.
final selectedCompanyProvider = Provider<Company?>((ref) {
  final id = ref.watch(selectedCompanyIdProvider);
  if (id == null) return null;
  final companies = ref.watch(companiesProvider).asData?.value;
  if (companies == null) return null;
  for (final c in companies) {
    if (c.id == id) return c;
  }
  return null;
});
