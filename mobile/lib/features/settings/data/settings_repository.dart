import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/errors/app_error.dart';
import '../../../core/supabase/supabase_client.dart';
import '../models/system_settings.dart';

/// A reference document (SOP/WI) for linking to an NCR.
class ReferenceDocument {
  ReferenceDocument({
    required this.id,
    required this.title,
    this.documentNumber,
    this.type,
  });

  final String id;
  final String title;
  final String? documentNumber;
  final String? type;

  String get displayLabel =>
      documentNumber != null && documentNumber!.isNotEmpty
      ? '$documentNumber - $title'
      : title;
}

class SettingsRepository {
  final SupabaseClient _client = SupabaseService.client;

  /// Loads the global settings row (settings where id = 'global').
  Future<SystemSettings> loadGlobalSettings() async {
    try {
      final row = await _client
          .from('settings')
          .select()
          .eq('id', 'global')
          .maybeSingle();
      if (row == null) return SystemSettings();
      return SystemSettings.fromGlobalRow(Map<String, dynamic>.from(row));
    } catch (e) {
      throw AppError.from(e);
    }
  }

  /// Loads active departments from the `departments` table.
  Future<List<RefItem>> loadDepartments() async {
    try {
      final rows = await _client.from('departments').select();
      return (rows as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .where((m) => m['is_active'] == null || m['is_active'] == true)
          .map((m) => RefItem.fromDynamic(m))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  /// Loads active products.
  Future<List<RefItem>> loadProducts(String? companyId) async {
    try {
      var query = _client.from('products').select();
      final rows = await query;
      return (rows as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .where((m) => m['is_active'] == null || m['is_active'] == true)
          .where(
            (m) =>
                companyId == null ||
                m['company_id'] == null ||
                m['company_id'] == companyId,
          )
          .map((m) => RefItem.fromDynamic(m))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  /// Loads active production lines.
  Future<List<RefItem>> loadProductionLines(String? companyId) async {
    try {
      final rows = await _client.from('production_lines').select();
      return (rows as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .where((m) => m['is_active'] == null || m['is_active'] == true)
          .where(
            (m) =>
                companyId == null ||
                m['company_id'] == null ||
                m['company_id'] == companyId,
          )
          .map((m) => RefItem.fromDynamic(m))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  /// Loads last 100 material receiving records.
  Future<List<RefItem>> loadMaterialReceiving(String? companyId) async {
    try {
      var builder = _client.from('material_receiving').select();
      final rows = await builder.limit(100);
      return (rows as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .where(
            (m) =>
                companyId == null ||
                m['company_id'] == null ||
                m['company_id'] == companyId,
          )
          .map((m) {
            final id = (m['id'] ?? '').toString();
            final name =
                (m['material_name'] ?? m['name'] ?? m['batch_number'] ?? id)
                    .toString();
            return RefItem(id: id, name: name, extra: m);
          })
          .toList();
    } catch (_) {
      return const [];
    }
  }

  /// Loads people from the HR employee directory.
  ///
  /// Falls back to the legacy `users` table when HR rows are not available.
  Future<List<RefItem>> loadUsers() async {
    try {
      final employees = await _client
          .from('company_employees')
          .select('''
            id,
            employee_code,
            name,
            email,
            department_id,
            notes,
            account_user_id,
            is_active,
            departments(name, name_ar)
          ''')
          .order('name')
          .limit(500);

      final employeeRows = (employees as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();

      if (employeeRows.isNotEmpty) {
        final profiles = await _client
            .from('hr_employee_profiles')
            .select('''
              id,
              employee_id,
              worker_type,
              internal_employee_code,
              original_employee_code,
              primary_department_id,
              job_title_text,
              employment_status
            ''')
            .inFilter(
              'employee_id',
              employeeRows.map((employee) => employee['id']).toList(),
            );

        final profileByEmployeeId = <String, Map<String, dynamic>>{};
        for (final raw in profiles as List) {
          final profile = Map<String, dynamic>.from(raw as Map);
          final employeeId = profile['employee_id']?.toString();
          if (employeeId != null && employeeId.isNotEmpty) {
            profileByEmployeeId[employeeId] = profile;
          }
        }

        return employeeRows
            .map((employee) {
              final id = (employee['id'] ?? '').toString();
              final profile = profileByEmployeeId[id];
              final departments = employee['departments'] is Map
                  ? Map<String, dynamic>.from(employee['departments'] as Map)
                  : const <String, dynamic>{};
              final departmentName =
                  (departments['name_ar'] ?? departments['name'])?.toString();
              final status =
                  profile?['employment_status']?.toString() ??
                  (employee['is_active'] == true ? 'active' : 'inactive');

              return RefItem(
                id: id,
                name: (employee['name'] ?? employee['email'] ?? id).toString(),
                extra: {
                  ...employee,
                  'department_id':
                      profile?['primary_department_id'] ??
                      employee['department_id'],
                  'department': departmentName,
                  'job_title_text': profile?['job_title_text'],
                  'employment_status': status,
                },
              );
            })
            .where((item) {
              return item.extra?['employment_status']?.toString() != 'archived';
            })
            .toList();
      }

      final rows = await _client
          .from('users')
          .select('id, name, display_name, email, department, department_id');
      return (rows as List).map((e) {
        final m = Map<String, dynamic>.from(e as Map);
        final id = (m['id'] ?? '').toString();
        final name = (m['display_name'] ?? m['name'] ?? m['email'] ?? id)
            .toString();
        return RefItem(id: id, name: name, extra: m);
      }).toList();
    } catch (_) {
      return const [];
    }
  }

  /// Loads approved SOP / Work Instruction documents for the company.
  Future<List<ReferenceDocument>> loadReferenceDocuments(
    String? companyId,
  ) async {
    try {
      var builder = _client.from('documents').select();
      final rows = await builder;
      return (rows as List)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .where((m) {
            final status = (m['status'] ?? '').toString();
            final type = (m['type'] ?? '').toString();
            final matchCompany =
                companyId == null ||
                m['company_id'] == null ||
                m['company_id'] == companyId;
            return status == 'approved' &&
                (type == 'sop' || type == 'work_instruction') &&
                matchCompany;
          })
          .map(
            (m) => ReferenceDocument(
              id: (m['id'] ?? '').toString(),
              title: (m['title'] ?? '').toString(),
              documentNumber: (m['document_number'] ?? '').toString(),
              type: (m['type'] ?? '').toString(),
            ),
          )
          .toList();
    } catch (_) {
      return const [];
    }
  }
}
