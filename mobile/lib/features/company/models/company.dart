import '../../../core/utils/json_utils.dart';

class Company {
  Company({
    required this.id,
    required this.name,
    this.logoUrl,
    this.isActive = true,
  });

  final String id;
  final String name;
  final String? logoUrl;
  final bool isActive;

  factory Company.fromMap(Map<String, dynamic> map) {
    return Company(
      id: JsonUtils.asString(map['id']),
      name: JsonUtils.asString(
        map['name'] ?? map['company_name'] ?? map['title'],
        'شركة',
      ),
      logoUrl: JsonUtils.asStringOrNull(map['logo_url'] ?? map['logo']),
      isActive: JsonUtils.asBool(map['is_active'], true),
    );
  }
}
