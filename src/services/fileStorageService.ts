/**
 * Supabase File Storage Service
 * خدمة رفع وتحميل الملفات على Supabase Storage
 */

import { supabase } from '../config/supabase';

// Bucket name for documents
const DOCUMENTS_BUCKET = 'documents';

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param folder - Folder path (e.g., 'coa', 'invoices')
 * @param customName - Optional custom file name
 * @returns The public URL of the uploaded file or null on error
 */
export async function uploadFile(
    file: File,
    folder: string = 'general',
    customName?: string
): Promise<{ url: string; path: string } | null> {
    try {
        // Generate unique file name
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const fileName = customName
            ? `${customName}.${extension}`
            : `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        const filePath = `${folder}/${fileName}`;

        // Upload file
        const { data, error } = await supabase.storage
            .from(DOCUMENTS_BUCKET)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true  // Allow overwriting existing files
            });

        if (error) {
            console.error('Error uploading file:', error);
            console.error('Upload details:', { bucket: DOCUMENTS_BUCKET, path: filePath, fileSize: file.size });
            return null;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(DOCUMENTS_BUCKET)
            .getPublicUrl(data.path);

        return {
            url: urlData.publicUrl,
            path: data.path
        };
    } catch (error) {
        console.error('Error in uploadFile:', error);
        return null;
    }
}

/**
 * Upload COA (Certificate of Analysis) file
 * @param file - The COA file to upload
 * @param receivingNumber - The receiving number for identification
 * @returns The public URL of the uploaded file or null on error
 */
export async function uploadCOA(
    file: File,
    receivingNumber: string
): Promise<string | null> {
    const result = await uploadFile(file, 'coa', `COA_${receivingNumber}`);
    return result?.url || null;
}

/**
 * Download a file from Supabase Storage
 * @param filePath - The file path in storage
 * @param fileName - The name for the downloaded file
 */
export async function downloadFile(filePath: string, fileName: string): Promise<void> {
    try {
        const { data, error } = await supabase.storage
            .from(DOCUMENTS_BUCKET)
            .download(filePath);

        if (error) {
            console.error('Error downloading file:', error);
            return;
        }

        // Create download link
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error in downloadFile:', error);
    }
}

/**
 * Download a file directly from URL
 * @param url - The public URL of the file
 * @param fileName - The name for the downloaded file
 */
export async function downloadFromUrl(url: string, fileName: string): Promise<void> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();

        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error('Error downloading from URL:', error);
        // Fallback: open in new tab
        window.open(url, '_blank');
    }
}

/**
 * Delete a file from Supabase Storage
 * @param filePath - The file path to delete
 * @returns true if deleted successfully
 */
export async function deleteFile(filePath: string): Promise<boolean> {
    try {
        const { error } = await supabase.storage
            .from(DOCUMENTS_BUCKET)
            .remove([filePath]);

        if (error) {
            console.error('Error deleting file:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in deleteFile:', error);
        return false;
    }
}

/**
 * Get signed URL for private file download
 * @param filePath - The file path in storage
 * @param expiresIn - Expiration time in seconds (default 1 hour)
 * @returns Signed URL or null on error
 */
export async function getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    try {
        const { data, error } = await supabase.storage
            .from(DOCUMENTS_BUCKET)
            .createSignedUrl(filePath, expiresIn);

        if (error) {
            console.error('Error creating signed URL:', error);
            return null;
        }

        return data.signedUrl;
    } catch (error) {
        console.error('Error in getSignedUrl:', error);
        return null;
    }
}
