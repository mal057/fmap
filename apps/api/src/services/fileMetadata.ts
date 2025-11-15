/**
 * File Metadata Service
 * Handles insertion of file records into the Supabase database
 */

import { createSupabaseClient } from '../lib/supabaseClient';
import type { SupabaseClient, SupabaseResponse } from '../lib/supabaseClient';

/**
 * File metadata to be inserted into the database
 */
export interface FileMetadata {
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_extension: string;
  r2_key: string;
  display_name: string;
  description?: string;
  location?: string;
  brand: 'lowrance' | 'garmin' | 'humminbird' | 'raymarine' | 'simrad' | 'furuno' | 'other';
  user_id: string;
}

/**
 * Database record returned after insertion
 */
export interface FileRecord {
  id: string;
  created_at: string;
}

/**
 * Insert file metadata into the database
 *
 * @param supabaseClient - Supabase client instance (with service key)
 * @param metadata - File metadata to insert
 * @returns Promise with inserted record (id and created_at) or error
 *
 * @example
 * ```typescript
 * const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
 * const { data, error } = await insertFileMetadata(supabase, {
 *   filename: 'waypoint_123.gpx',
 *   original_filename: 'my waypoint.gpx',
 *   file_size: 2048,
 *   mime_type: 'application/gpx+xml',
 *   file_extension: '.gpx',
 *   r2_key: 'uploads/user123/1234567890-waypoint_123.gpx',
 *   display_name: 'My Waypoint',
 *   description: 'Fishing spot near the reef',
 *   location: 'Gulf of Mexico',
 *   brand: 'garmin',
 *   user_id: 'uuid-user-123'
 * });
 *
 * if (error) {
 *   console.error('Failed to insert file metadata:', error);
 * } else {
 *   console.log('File inserted with ID:', data.id);
 * }
 * ```
 */
export async function insertFileMetadata(
  supabaseClient: SupabaseClient,
  metadata: FileMetadata
): Promise<SupabaseResponse<FileRecord>> {
  try {
    // Validate required fields
    if (!metadata.filename || metadata.filename.trim().length === 0) {
      return {
        data: null,
        error: {
          message: 'Filename is required',
          code: 'VALIDATION_ERROR',
        },
      };
    }

    if (!metadata.r2_key || metadata.r2_key.trim().length === 0) {
      return {
        data: null,
        error: {
          message: 'R2 key is required',
          code: 'VALIDATION_ERROR',
        },
      };
    }

    if (!metadata.user_id || metadata.user_id.trim().length === 0) {
      return {
        data: null,
        error: {
          message: 'User ID is required',
          code: 'VALIDATION_ERROR',
        },
      };
    }

    if (!metadata.display_name || metadata.display_name.trim().length === 0) {
      return {
        data: null,
        error: {
          message: 'Display name is required',
          code: 'VALIDATION_ERROR',
        },
      };
    }

    // Validate file_size is positive
    if (metadata.file_size <= 0) {
      return {
        data: null,
        error: {
          message: 'File size must be greater than 0',
          code: 'VALIDATION_ERROR',
        },
      };
    }

    // Prepare the record for insertion
    const fileRecord = {
      filename: metadata.filename.trim(),
      original_filename: metadata.original_filename,
      file_size: metadata.file_size,
      mime_type: metadata.mime_type || 'application/octet-stream',
      file_extension: metadata.file_extension,
      r2_key: metadata.r2_key.trim(),
      r2_bucket: 'fmap-waypoints', // Default bucket name
      display_name: metadata.display_name.trim(),
      description: metadata.description?.trim() || null,
      location: metadata.location?.trim() || null,
      brand: metadata.brand,
      user_id: metadata.user_id.trim(),
      is_public: true, // Default to public
      is_deleted: false, // Not deleted
      download_count: 0,
      view_count: 0,
    };

    // Insert into the files table
    const result = await supabaseClient
      .from('files')
      .insert(fileRecord)
      .select('id, created_at')
      .single();

    // Check for errors
    if (result.error) {
      console.error('[fileMetadata] Database insert failed:', result.error);
      return {
        data: null,
        error: result.error,
      };
    }

    // Ensure we have the expected data structure
    if (!result.data || !result.data.id || !result.data.created_at) {
      console.error('[fileMetadata] Unexpected response format:', result.data);
      return {
        data: null,
        error: {
          message: 'Database insert succeeded but returned unexpected format',
          code: 'UNEXPECTED_RESPONSE',
        },
      };
    }

    // Return success
    return {
      data: {
        id: result.data.id,
        created_at: result.data.created_at,
      },
      error: null,
    };
  } catch (error) {
    // Handle unexpected errors
    console.error('[fileMetadata] Unexpected error during insert:', error);
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error during database insert',
        details: error instanceof Error ? error.stack : undefined,
      },
    };
  }
}
