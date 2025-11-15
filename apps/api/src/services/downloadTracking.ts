/**
 * Download Tracking Service
 * Tracks file downloads in the database for analytics
 */

import type { SupabaseClient } from '../lib/supabaseClient';

/**
 * Download tracking parameters
 */
export interface DownloadTrackingParams {
  file_id: string;
  user_id?: string;
  ip_address: string;
  user_agent: string;
}

/**
 * Track a file download asynchronously
 *
 * This function records download events in the database for analytics.
 * It's designed to be fire-and-forget - failures should not block downloads.
 *
 * Note: The database has a trigger that automatically increments the
 * download_count in the files table when a download record is inserted.
 *
 * @param supabaseClient - Supabase client instance (with service key)
 * @param params - Download tracking parameters
 * @returns Promise<void> - Resolves when tracking completes (or fails silently)
 *
 * @example
 * ```typescript
 * // Fire-and-forget tracking (don't await)
 * trackDownload(supabase, {
 *   file_id: 'uuid-file-123',
 *   user_id: 'uuid-user-456', // or undefined for anonymous
 *   ip_address: '192.168.1.1',
 *   user_agent: 'Mozilla/5.0...'
 * }).catch(err => console.error('Download tracking failed:', err));
 * ```
 */
export async function trackDownload(
  supabaseClient: SupabaseClient,
  params: DownloadTrackingParams
): Promise<void> {
  try {
    // Prepare download record
    const downloadRecord = {
      file_id: params.file_id,
      user_id: params.user_id || null, // null for anonymous downloads
      ip_address: params.ip_address,
      user_agent: params.user_agent,
      downloaded_at: new Date().toISOString(),
    };

    // Insert download record into database
    const result = await supabaseClient
      .from('downloads')
      .insert(downloadRecord);

    // Check for errors (log but don't throw)
    if (result.error) {
      console.error('[downloadTracking] Failed to track download:', result.error);
      console.error('[downloadTracking] File ID:', params.file_id);
      return;
    }

    // Success - the database trigger will increment download_count automatically
    console.log(`[downloadTracking] Successfully tracked download for file: ${params.file_id}`);
  } catch (error) {
    // Catch any unexpected errors and log them
    // Don't throw - tracking failures should never block downloads
    console.error('[downloadTracking] Unexpected error:', error);
    console.error('[downloadTracking] Params:', params);
  }
}
