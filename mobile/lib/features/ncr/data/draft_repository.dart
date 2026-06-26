import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

const _kDraftsKey = 'ncr_offline_drafts';
const _uuid = Uuid();

/// A locally-stored offline NCR draft.
/// Only NCR creation is supported offline. Workflow actions require online.
class NcrDraft {
  NcrDraft({
    required this.localId,
    required this.companyId,
    required this.data,
    required this.createdAt,
  });

  final String localId;
  final String companyId;
  final Map<String, dynamic> data;
  final DateTime createdAt;

  Map<String, dynamic> toJson() => {
        'localId': localId,
        'companyId': companyId,
        'data': data,
        'createdAt': createdAt.toIso8601String(),
      };

  factory NcrDraft.fromJson(Map<String, dynamic> json) {
    return NcrDraft(
      localId: json['localId']?.toString() ?? _uuid.v4(),
      companyId: json['companyId']?.toString() ?? '',
      data: Map<String, dynamic>.from(json['data'] ?? {}),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
    );
  }
}

/// Persists NCR drafts in non-secure local storage (no secrets involved).
class DraftRepository {
  Future<List<NcrDraft>> loadDrafts() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kDraftsKey);
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = jsonDecode(raw) as List;
      return list
          .map((e) => NcrDraft.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> _saveAll(List<NcrDraft> drafts) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = jsonEncode(drafts.map((d) => d.toJson()).toList());
    await prefs.setString(_kDraftsKey, raw);
  }

  Future<NcrDraft> addDraft({
    required String companyId,
    required Map<String, dynamic> data,
  }) async {
    final drafts = await loadDrafts();
    final draft = NcrDraft(
      localId: _uuid.v4(),
      companyId: companyId,
      data: data,
      createdAt: DateTime.now(),
    );
    drafts.add(draft);
    await _saveAll(drafts);
    return draft;
  }

  Future<void> removeDraft(String localId) async {
    final drafts = await loadDrafts();
    drafts.removeWhere((d) => d.localId == localId);
    await _saveAll(drafts);
  }
}
