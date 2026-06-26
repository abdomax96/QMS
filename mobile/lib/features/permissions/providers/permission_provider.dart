import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../data/permission_repository.dart';
import '../models/permission_models.dart';

final permissionRepositoryProvider = Provider<PermissionRepository>((ref) {
  return PermissionRepository();
});

/// Loads & caches the current user's stage permissions.
/// Recomputed when the authenticated profile changes.
final userPermissionsProvider = FutureProvider<UserPermissions>((ref) async {
  // depend on auth profile so permissions reload after login.
  final profile = ref.watch(currentProfileProvider);
  if (profile == null) {
    return UserPermissions.empty();
  }
  return ref.watch(permissionRepositoryProvider).loadForCurrentUser();
});

/// Synchronous access to the loaded permissions (empty until loaded).
final permissionsValueProvider = Provider<UserPermissions>((ref) {
  return ref.watch(userPermissionsProvider).asData?.value ??
      UserPermissions.empty();
});
