import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../../../core/config/env.dart';
import '../../../core/errors/app_error.dart';
import '../../../core/supabase/supabase_client.dart';
import '../models/ncr_models.dart';

const _uuid = Uuid();

class AttachmentRepository {
  final SupabaseClient _client = SupabaseService.client;

  /// Uploads a file to `ncr-attachments` and returns the attachment metadata.
  /// Path: attachments/{ncrId}/{timestamp}-{filename}
  Future<NcrAttachment> upload({
    required String ncrId,
    required File file,
    required String fileName,
  }) async {
    try {
      final ts = DateTime.now().millisecondsSinceEpoch;
      final safeName = fileName.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
      final path = 'attachments/$ncrId/$ts-$safeName';

      await _client.storage.from(Env.attachmentsBucket).upload(
            path,
            file,
            fileOptions: const FileOptions(upsert: true),
          );

      String? url;
      try {
        url = _client.storage.from(Env.attachmentsBucket).getPublicUrl(path);
      } catch (_) {
        // Bucket may be private; URL stays null and is created on demand.
        url = null;
      }

      return NcrAttachment(
        id: _uuid.v4(),
        fileName: fileName,
        storagePath: path,
        downloadURL: url,
        uploadedAt: DateTime.now().toUtc().toIso8601String(),
      );
    } catch (e) {
      throw AppError.from(e);
    }
  }

  /// Creates a signed URL for a private attachment (valid for 1 hour).
  Future<String?> signedUrl(String storagePath) async {
    try {
      return await _client.storage
          .from(Env.attachmentsBucket)
          .createSignedUrl(storagePath, 3600);
    } catch (_) {
      return null;
    }
  }
}
