import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../company/providers/company_provider.dart';
import '../data/settings_repository.dart';
import '../models/system_settings.dart';

final settingsRepositoryProvider = Provider<SettingsRepository>((ref) {
  return SettingsRepository();
});

/// Global settings row (defect catalog, units, etc.).
final globalSettingsProvider = FutureProvider<SystemSettings>((ref) async {
  return ref.watch(settingsRepositoryProvider).loadGlobalSettings();
});

/// Departments from the departments table (fallback to settings).
final departmentsProvider = FutureProvider<List<RefItem>>((ref) async {
  final repo = ref.watch(settingsRepositoryProvider);
  final fromTable = await repo.loadDepartments();
  if (fromTable.isNotEmpty) return fromTable;
  final settings = await ref.watch(globalSettingsProvider.future);
  return settings.departments;
});

final productsProvider = FutureProvider<List<RefItem>>((ref) async {
  final companyId = ref.watch(selectedCompanyIdProvider);
  final repo = ref.watch(settingsRepositoryProvider);
  final fromTable = await repo.loadProducts(companyId);
  if (fromTable.isNotEmpty) return fromTable;
  final settings = await ref.watch(globalSettingsProvider.future);
  return settings.products;
});

final productionLinesProvider = FutureProvider<List<RefItem>>((ref) async {
  final companyId = ref.watch(selectedCompanyIdProvider);
  final repo = ref.watch(settingsRepositoryProvider);
  final fromTable = await repo.loadProductionLines(companyId);
  if (fromTable.isNotEmpty) return fromTable;
  final settings = await ref.watch(globalSettingsProvider.future);
  return settings.lines;
});

final materialReceivingProvider = FutureProvider<List<RefItem>>((ref) async {
  final companyId = ref.watch(selectedCompanyIdProvider);
  return ref.watch(settingsRepositoryProvider).loadMaterialReceiving(companyId);
});

final usersProvider = FutureProvider<List<RefItem>>((ref) async {
  final repo = ref.watch(settingsRepositoryProvider);
  final fromTable = await repo.loadUsers();
  if (fromTable.isNotEmpty) return fromTable;
  final settings = await ref.watch(globalSettingsProvider.future);
  return settings.users;
});

final referenceDocumentsProvider =
    FutureProvider<List<ReferenceDocument>>((ref) async {
  final companyId = ref.watch(selectedCompanyIdProvider);
  return ref
      .watch(settingsRepositoryProvider)
      .loadReferenceDocuments(companyId);
});

final defectCatalogProvider = FutureProvider<List<DefectCatalogItem>>((ref) async {
  final settings = await ref.watch(globalSettingsProvider.future);
  return settings.defectCatalog;
});

final unitsProvider = FutureProvider<List<String>>((ref) async {
  final settings = await ref.watch(globalSettingsProvider.future);
  return settings.units;
});
