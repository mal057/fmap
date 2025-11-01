/**
 * Tests for Humminbird file parser
 * Tests DAT and SON formats
 */

import { parseHumminbirdFile } from '../humminbird';

describe('Humminbird File Parser', () => {
  describe('DAT Format Parsing', () => {
    it('should parse valid DAT file', async () => {
      const buffer = new Uint8Array(100);
      const file = new File([buffer], 'waypoints.dat');
      const result = await parseHumminbirdFile(file);

      expect(result).toBeDefined();
      expect(result.fileMetadata.device).toBe('humminbird');
    });

    it('should handle invalid DAT file', async () => {
      const buffer = new Uint8Array(5);
      const file = new File([buffer], 'invalid.dat');
      const result = await parseHumminbirdFile(file);

      expect(result.success).toBe(false);
    });
  });

  describe('SON Format Parsing', () => {
    it('should parse SON sonar file', async () => {
      const buffer = new Uint8Array(100);
      const file = new File([buffer], 'sonar.son');
      const result = await parseHumminbirdFile(file);

      expect(result.fileMetadata.device).toBe('humminbird');
    });
  });

  describe('File metadata', () => {
    it('should set correct metadata', async () => {
      const buffer = new Uint8Array(100);
      const file = new File([buffer], 'test.dat');
      const result = await parseHumminbirdFile(file);

      expect(result.fileMetadata.fileName).toBe('test.dat');
      expect(result.fileMetadata.device).toBe('humminbird');
    });
  });
});
