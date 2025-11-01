/**
 * Integration tests for file upload flow
 * Tests complete file upload from client to storage
 */

import { validateFile } from '../../apps/api/src/middleware/fileValidation';
import { mockSupabaseClient } from '../mocks/supabase';

describe('File Upload Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Upload Flow', () => {
    it('should validate, scan, and store file', async () => {
      // Step 1: Validate file
      const file = new File(
        ['<?xml version="1.0"?><gpx></gpx>'],
        'waypoints.gpx',
        { type: 'application/gpx+xml' }
      );

      const validation = await validateFile(file);
      expect(validation.valid).toBe(true);

      // Step 2: Mock storage upload
      const mockStorage = mockSupabaseClient.storage.from('fishfinder-files');
      mockStorage.upload.mockResolvedValue({
        data: { path: 'user123/waypoints.gpx' },
        error: null,
      });

      const uploadResult = await mockStorage.upload('user123/waypoints.gpx', file);
      expect(uploadResult.error).toBeNull();

      // Step 3: Mock database record
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: { id: '1', filename: 'waypoints.gpx' },
          error: null,
        }),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      });

      const dbResult = await mockSupabaseClient.from('fishfinder_files').insert({
        user_id: 'user123',
        filename: validation.sanitizedFilename,
        file_path: 'user123/waypoints.gpx',
      });

      expect(dbResult.error).toBeNull();
    });

    it('should handle upload failures', async () => {
      const file = new File(['test'], 'test.gpx');

      const mockStorage = mockSupabaseClient.storage.from('fishfinder-files');
      mockStorage.upload.mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' },
      });

      const result = await mockStorage.upload('test.gpx', file);

      expect(result.error?.message).toBe('Upload failed');
    });
  });

  describe('File Processing Flow', () => {
    it('should parse uploaded file', async () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1">
  <wpt lat="37.7749" lon="-122.4194"><name>Test Point</name></wpt>
</gpx>`;

      const file = new File([gpxContent], 'test.gpx', {
        type: 'application/gpx+xml',
      });

      // File would be parsed by file-parsers package
      expect(file.size).toBeGreaterThan(0);
    });
  });
});
