import '../../../core/utils/json_utils.dart';

/// User profile loaded from the `users` table (NOT from user_metadata).
class AuthProfile {
  AuthProfile({
    required this.id,
    required this.email,
    this.name,
    this.displayName,
    this.department,
    this.departmentId,
    this.roles = const [],
    this.title,
    this.phone,
    this.avatarUrl,
    this.isActive = true,
  });

  final String id;
  final String email;
  final String? name;
  final String? displayName;
  final String? department;
  final String? departmentId;
  final List<String> roles;
  final String? title;
  final String? phone;
  final String? avatarUrl;
  final bool isActive;

  /// Best display label for the user.
  String get label =>
      (displayName?.isNotEmpty == true ? displayName : null) ??
      (name?.isNotEmpty == true ? name : null) ??
      email;

  factory AuthProfile.fromMap(Map<String, dynamic> map) {
    return AuthProfile(
      id: JsonUtils.asString(map['id']),
      email: JsonUtils.asString(map['email']),
      name: JsonUtils.asStringOrNull(map['name']),
      displayName: JsonUtils.asStringOrNull(map['display_name']),
      department: JsonUtils.asStringOrNull(map['department']),
      departmentId: JsonUtils.asStringOrNull(map['department_id']),
      roles: JsonUtils.asList(map['roles'])
          .map((e) => e.toString())
          .where((e) => e.isNotEmpty)
          .toList(),
      title: JsonUtils.asStringOrNull(map['title']),
      phone: JsonUtils.asStringOrNull(map['phone']),
      avatarUrl: JsonUtils.asStringOrNull(map['avatar_url']),
      isActive: JsonUtils.asBool(map['is_active'], true),
    );
  }
}
