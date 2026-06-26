import '../../../core/utils/arabic_formatters.dart';
import '../../../core/utils/json_utils.dart';

class NcrComment {
  NcrComment({
    required this.id,
    required this.content,
    required this.ncrId,
    this.authorId,
    this.authorName,
    this.authorAvatar,
    this.createdAt,
    this.edited = false,
  });

  final String id;
  final String content;
  final String ncrId;
  final String? authorId;
  final String? authorName;
  final String? authorAvatar;
  final DateTime? createdAt;
  final bool edited;

  factory NcrComment.fromMap(Map<String, dynamic> map) {
    return NcrComment(
      id: JsonUtils.asString(map['id']),
      content: JsonUtils.asString(map['content']),
      ncrId: JsonUtils.asString(map['ncr_id'] ?? map['entity_id']),
      authorId: JsonUtils.asStringOrNull(map['author_id']),
      authorName: JsonUtils.asStringOrNull(map['author_name']),
      authorAvatar: JsonUtils.asStringOrNull(map['author_avatar']),
      createdAt: ArabicFormatters.tryParseDate(map['created_at']),
      edited: JsonUtils.asBool(map['edited']),
    );
  }
}

class NcrHoldLog {
  NcrHoldLog({
    required this.id,
    required this.ncrId,
    required this.companyId,
    this.sortedQty = 0,
    this.destroyedQty = 0,
    this.sortedAt,
    this.sortedBy,
    this.notes,
    this.createdAt,
  });

  final String id;
  final String ncrId;
  final String companyId;
  final num sortedQty;
  final num destroyedQty;
  final DateTime? sortedAt;
  final String? sortedBy;
  final String? notes;
  final DateTime? createdAt;

  factory NcrHoldLog.fromMap(Map<String, dynamic> map) {
    return NcrHoldLog(
      id: JsonUtils.asString(map['id']),
      ncrId: JsonUtils.asString(map['ncr_id']),
      companyId: JsonUtils.asString(map['company_id']),
      sortedQty: JsonUtils.asNum(map['sorted_qty']) ?? 0,
      destroyedQty: JsonUtils.asNum(map['destroyed_qty']) ?? 0,
      sortedAt: ArabicFormatters.tryParseDate(map['sorted_at']),
      sortedBy: JsonUtils.asStringOrNull(map['sorted_by']),
      notes: JsonUtils.asStringOrNull(map['notes']),
      createdAt: ArabicFormatters.tryParseDate(map['created_at']),
    );
  }
}
