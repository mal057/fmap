/**
 * Tests for Raymarine file parser
 * Tests FSH format
 */

import { parseRaymarineFile } from '../raymarine';

describe('Raymarine File Parser', () => {
  describe('FSH Format Parsing', () => {
    it('should parse valid FSH file', async () => {
      const buffer = new Uint8Array(100);
      const file = new File([buffer], 'waypoints.fsh');
      const result = await parseRaymarineFile(file);

      expect(result).toBeDefined();
      expect(result.fileMetadata.device).toBe('raymarine');
    });

    it('should handle invalid FSH file', async () => {
      const buffer = new Uint8Array(5);
      const file = new File([buffer], 'invalid.fsh');
      const result = await parseRaymarineFile(file);

      expect(result.success).toBe(false);
    });
  });

  describe('File metadata', () => {
    it('should set correct metadata', async () => {
      const buffer = new Uint8Array(100);
      const file = new File([buffer], 'test.fsh');
      const result = await parseRaymarineFile(file);

      expect(result.fileMetadata.fileName).toBe('test.fsh');
      expect(result.fileMetadata.device).toBe('raymarine');
    });
  });
});
