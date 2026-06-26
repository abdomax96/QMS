import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/errors/app_error.dart';
import '../../../core/supabase/supabase_client.dart';
import '../models/company.dart';

class CompanyRepository {
  final SupabaseClient _client = SupabaseService.client;

  /// Loads companies visible to the user according to RLS.
  Future<List<Company>> fetchCompanies() async {
    try {
      final data = await _client.from('companies').select().order('name');
      return (data as List)
          .map((e) => Company.fromMap(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      throw AppError.from(e);
    }
  }
}
