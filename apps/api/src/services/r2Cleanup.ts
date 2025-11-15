/**
 * R2 Cleanup Service
 * Handles rollback operations for R2 storage
 */

/// <reference types="@cloudflare/workers-types" />

/**
 * Delete a file from R2 storage
 *
 * Used for rollback operations when database operations fail after
 * a successful R2 upload. Ensures atomic operations by cleaning up
 * orphaned files.
 *
 * @param bucket - R2 bucket instance
 * @param fileKey - The key/path of the file to delete
 * @returns Promise<void> - Always resolves (errors are logged but not thrown)
 *
 * @example
 * ```typescript
 * try {
 *   // Upload to R2
 *   await env.WAYPOINTS_BUCKET.put(fileKey, fileStream);
 *
 *   // Try database insert
 *   const { error } = await insertFileMetadata(...);
 *   if (error) {
 *     // Rollback R2 upload
 *     await deleteFromR2(env.WAYPOINTS_BUCKET, fileKey);
 *     throw new Error('Database insert failed');
 *   }
 * } catch (err) {
 *   // Handle error
 * }
 * ```
 */
export async function deleteFromR2(bucket: R2Bucket, fileKey: string): Promise<void> {
  try {
    console.log(`[r2Cleanup] Attempting to delete file from R2: ${fileKey}`);

    // Delete the file from R2
    await bucket.delete(fileKey);

    console.log(`[r2Cleanup] Successfully deleted file from R2: ${fileKey}`);
  } catch (error) {
    // Log the error but don't throw - we don't want cleanup failures to mask the original error
    console.error(`[r2Cleanup] Failed to delete file from R2: ${fileKey}`, error);
    console.error(
      '[r2Cleanup] This may result in an orphaned file in R2. Manual cleanup may be required.'
    );

    // Continue execution - the original error that triggered the rollback is more important
  }
}
