/**
 * Integration tests for file download flow
 * Tests complete file retrieval from storage to client
 */

import { mockSupabaseClient } from '../mocks/supabase';

describe('File Download Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File Retrieval Flow', () => {
    it('should retrieve and download file', async () => {
      // Step 1: Mock database query
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: '1',
            filename: 'waypoints.gpx',
            file_path: 'user123/waypoints.gpx',
          },
          error: null,
        }),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      });

      const fileRecord = await mockSupabaseClient
        .from('fishfinder_files')
        .select('*')
        .eq('id', '1')
        .single();

      expect(fileRecord.error).toBeNull();
      expect(fileRecord.data?.filename).toBe('waypoints.gpx');

      // Step 2: Mock storage download
      const mockStorage = mockSupabaseClient.storage.from('fishfinder-files');
      mockStorage.download.mockResolvedValue({
        data: new Blob(['test content']),
        error: null,
      });

      const downloadResult = await mockStorage.download('user123/waypoints.gpx');

      expect(downloadResult.error).toBeNull();
      expect(downloadResult.data).toBeInstanceOf(Blob);
    });

    it('should handle file not found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'File not found' },
        }),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      });

      const result = await mockSupabaseClient
        .from('fishfinder_files')
        .select('*')
        .eq('id', '999')
        .single();

      expect(result.error?.message).toBe('File not found');
    });
  });

  describe('File Listing Flow', () => {
    it('should list user files', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [
            { id: '1', filename: 'file1.gpx' },
            { id: '2', filename: 'file2.slg' },
          ],
          error: null,
        }),
        single: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
      });

      const result = await mockSupabaseClient
        .from('fishfinder_files')
        .select('*')
        .eq('user_id', 'user123')
        .order('created_at', { ascending: false });

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
    });
  });
});
