import '../../../core/utils/json_utils.dart';

/// A defect catalog entry from settings.defect_catalog.
class DefectCatalogItem {
  DefectCatalogItem({
    required this.id,
    required this.name,
    this.category,
    this.defectType,
    this.severity,
    this.description,
    this.isActive = true,
  });

  final String id;
  final String name;
  final String? category;
  final String? defectType;
  final String? severity;
  final String? description;
  final bool isActive;

  factory DefectCatalogItem.fromMap(Map<String, dynamic> map) {
    return DefectCatalogItem(
      id: JsonUtils.asString(map['id']),
      name: JsonUtils.asString(map['name']),
      category: JsonUtils.asStringOrNull(map['category']),
      defectType: JsonUtils.asStringOrNull(map['defectType']),
      severity: JsonUtils.asStringOrNull(map['severity']),
      description: JsonUtils.asStringOrNull(map['description']),
      isActive: JsonUtils.asBool(map['isActive'], true),
    );
  }
}

/// Generic reference item (id + name) for departments, products, lines, units.
class RefItem {
  RefItem({required this.id, required this.name, this.extra});

  final String id;
  final String name;
  final Map<String, dynamic>? extra;

  factory RefItem.fromDynamic(Object? value) {
    if (value is String) {
      return RefItem(id: value, name: value);
    }
    final map = JsonUtils.asMap(value) ?? {};
    final id = JsonUtils.asString(
      map['id'] ?? map['code'] ?? map['value'] ?? map['name'],
    );
    final name = JsonUtils.asString(
      map['name'] ?? map['title'] ?? map['label'] ?? map['id'],
      id,
    );
    return RefItem(id: id, name: name, extra: map);
  }
}

/// Aggregated reference data used across the app.
class SystemSettings {
  SystemSettings({
    this.departments = const [],
    this.users = const [],
    this.defectCatalog = const [],
    this.products = const [],
    this.lines = const [],
    this.units = const [],
    this.qualityDepartments = const [],
    this.ncrDocumentMeta,
  });

  final List<RefItem> departments;
  final List<RefItem> users;
  final List<DefectCatalogItem> defectCatalog;
  final List<RefItem> products;
  final List<RefItem> lines;
  final List<String> units;
  final List<RefItem> qualityDepartments;
  final Map<String, dynamic>? ncrDocumentMeta;

  factory SystemSettings.fromGlobalRow(Map<String, dynamic> row) {
    List<RefItem> refList(Object? v) =>
        JsonUtils.asList(v).map(RefItem.fromDynamic).toList();

    final defects = JsonUtils.asMapList(row['defect_catalog'])
        .map(DefectCatalogItem.fromMap)
        .where((d) => d.isActive)
        .toList();

    final units = JsonUtils.asList(row['units'])
        .map((e) {
          if (e is String) return e;
          final m = JsonUtils.asMap(e);
          return JsonUtils.asString(m?['name'] ?? m?['symbol'] ?? e);
        })
        .where((e) => e.isNotEmpty)
        .toList();

    return SystemSettings(
      departments: refList(row['departments']),
      users: refList(row['users']),
      defectCatalog: defects,
      products: refList(row['products']),
      lines: refList(row['lines']),
      units: units,
      qualityDepartments: refList(row['quality_departments']),
      ncrDocumentMeta: JsonUtils.asMap(row['ncr_document_meta']),
    );
  }
}
