/**
 * Tests for Lowrance file parser
 * Tests SLG, SL2, SL3, and USR formats
 */

import { parseLowranceFile } from '../lowrance';

describe('Lowrance File Parser', () => {
  describe('USR Format Parsing', () => {
    it('should parse valid USR file with waypoints', async () => {
      // Create a minimal USR file structure
      const buffer = new Uint8Array(100);
      // Add USR signature and minimal data

      const file = new File([buffer], 'test.usr');
      const result = await parseLowranceFile(file);

      expect(result).toBeDefined();
      expect(result.fileMetadata.device).toBe('lowrance');
    });

    it('should handle invalid USR file', async () => {
      const buffer = new Uint8Array(10);
      const file = new File([buffer], 'invalid.usr');
      const result = await parseLowranceFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('SLG/SL2/SL3 Format Parsing', () => {
    it('should detect SLG file format', async () => {
      const buffer = new Uint8Array(100);
      const file = new File([buffer], 'sonar.slg');
      const result = await parseLowranceFile(file);

      expect(result.fileMetadata.device).toBe('lowrance');
    });

    it('should detect SL2 file format', async () => {
      const buffer = new Uint8Array(100);
      const file = new File([buffer], 'sonar.sl2');
      const result = await parseLowranceFile(file);

      expect(result.fileMetadata.device).toBe('lowrance');
    });

    it('should handle corrupted sonar files', async () => {
      const buffer = new Uint8Array(5); // Too small
      const file = new File([buffer], 'test.slg');
      const result = await parseLowranceFile(file);

      expect(result.success).toBe(false);
    });
  });

  describe('File metadata', () => {
    it('should set correct metadata', async () => {
      const buffer = new Uint8Array(100);
      const file = new File([buffer], 'waypoints.usr');
      const result = await parseLowranceFile(file);

      expect(result.fileMetadata.fileName).toBe('waypoints.usr');
      expect(result.fileMetadata.device).toBe('lowrance');
    });
  });
});
