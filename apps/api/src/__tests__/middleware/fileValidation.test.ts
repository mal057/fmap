/**
 * Tests for file validation middleware
 */

import { sanitizeFilename, validateFile, fileValidationMiddleware } from '../../middleware/fileValidation';

describe('File Validation Middleware', () => {
  describe('sanitizeFilename', () => {
    it('should remove path components', () => {
      expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
      expect(sanitizeFilename('/var/www/test.txt')).toBe('test.txt');
      expect(sanitizeFilename('C:\\Windows\\test.txt')).toBe('test.txt');
    });

    it('should replace dangerous characters', () => {
      expect(sanitizeFilename('test<file>.txt')).toBe('test_file_.txt');
      expect(sanitizeFilename('test;file.txt')).toBe('test_file.txt');
      expect(sanitizeFilename('test|file.txt')).toBe('test_file.txt');
    });

    it('should remove null bytes', () => {
      expect(sanitizeFilename('test\0.txt')).toBe('test.txt');
    });

    it('should prevent double dots', () => {
      expect(sanitizeFilename('test...txt')).toBe('test.txt');
      expect(sanitizeFilename('test....txt')).toBe('test.txt');
    });

    it('should limit filename length', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const sanitized = sanitizeFilename(longName);

      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized.endsWith('.txt')).toBe(true);
    });

    it('should preserve valid filenames', () => {
      expect(sanitizeFilename('valid-file_123.gpx')).toBe('valid-file_123.gpx');
      expect(sanitizeFilename('waypoint.01.gpx')).toBe('waypoint.01.gpx');
    });
  });

  describe('validateFile', () => {
    it('should accept valid GPX file', async () => {
      const gpxContent = '<?xml version="1.0"?><gpx></gpx>';
      const file = new File([gpxContent], 'waypoints.gpx', {
        type: 'application/gpx+xml',
      });

      const result = await validateFile(file);

      expect(result.valid).toBe(true);
      expect(result.sanitizedFilename).toBe('waypoints.gpx');
      expect(result.error).toBeUndefined();
    });

    it('should accept valid SLG file', async () => {
      const buffer = new Uint8Array([0x00, 0x02, 0x00, 0x00]);
      const file = new File([buffer], 'sonar.slg', {
        type: 'application/octet-stream',
      });

      const result = await validateFile(file);

      expect(result.valid).toBe(true);
      expect(result.sanitizedFilename).toBe('sonar.slg');
    });

    it('should reject unsupported file extension', async () => {
      const file = new File(['test'], 'document.txt', { type: 'text/plain' });

      const result = await validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
      expect(result.error).toContain('.txt');
    });

    it('should reject file exceeding size limit', async () => {
      // Create a file larger than 500MB (simulate)
      const file = new File(['test'], 'huge.gpx', { type: 'application/gpx+xml' });
      // Mock the size property
      Object.defineProperty(file, 'size', { value: 501 * 1024 * 1024 });

      const result = await validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should reject empty file', async () => {
      const file = new File([], 'empty.gpx', { type: 'application/gpx+xml' });

      const result = await validateFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('File is empty');
    });

    it('should validate all supported extensions', async () => {
      const extensions = ['slg', 'sl2', 'sl3', 'gpx', 'adm', 'dat', 'son', 'fsh'];

      for (const ext of extensions) {
        const file = new File(['test content'], `test.${ext}`, {
          type: 'application/octet-stream',
        });

        const result = await validateFile(file);
        expect(result.valid).toBe(true);
      }
    });

    it('should sanitize filename in result', async () => {
      const file = new File(['test'], 'bad<>name.gpx', {
        type: 'application/gpx+xml',
      });

      const result = await validateFile(file);

      expect(result.valid).toBe(true);
      expect(result.sanitizedFilename).toBe('bad__name.gpx');
    });
  });

  describe('fileValidationMiddleware', () => {
    it('should pass through non-POST requests', async () => {
      const request = new Request('http://localhost/api/upload', {
        method: 'GET',
      });

      const response = await fileValidationMiddleware(request);

      expect(response).toBeNull();
    });

    it('should pass through requests without multipart/form-data', async () => {
      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' }),
      });

      const response = await fileValidationMiddleware(request);

      expect(response).toBeNull();
    });

    it('should reject request without file', async () => {
      const formData = new FormData();
      formData.append('other', 'data');

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await fileValidationMiddleware(request);

      expect(response).not.toBeNull();
      expect(response?.status).toBe(400);

      const body = await response?.json();
      expect(body.error).toBe('No file provided');
      expect(body.code).toBe('NO_FILE');
    });

    it('should reject invalid file', async () => {
      const formData = new FormData();
      const file = new File(['test'], 'invalid.txt', { type: 'text/plain' });
      formData.append('file', file);

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await fileValidationMiddleware(request);

      expect(response).not.toBeNull();
      expect(response?.status).toBe(400);

      const body = await response?.json();
      expect(body.error).toContain('not allowed');
      expect(body.code).toBe('INVALID_FILE');
    });

    it('should pass through valid file', async () => {
      const formData = new FormData();
      const file = new File(['<?xml version="1.0"?><gpx></gpx>'], 'waypoints.gpx', {
        type: 'application/gpx+xml',
      });
      formData.append('file', file);

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await fileValidationMiddleware(request);

      expect(response).toBeNull(); // Pass through
    });

    it('should handle validation errors gracefully', async () => {
      // Create a malformed request
      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data; boundary=----test' },
        body: 'malformed body',
      });

      const response = await fileValidationMiddleware(request);

      expect(response).not.toBeNull();
      expect(response?.status).toBe(400);

      const body = await response?.json();
      expect(body.error).toBe('Failed to validate file');
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Magic number validation', () => {
    it('should validate GPX XML magic numbers', async () => {
      const gpxContent = '<?xml version="1.0"?><gpx></gpx>';
      const file = new File([gpxContent], 'test.gpx', {
        type: 'application/gpx+xml',
      });

      const result = await validateFile(file);

      expect(result.valid).toBe(true);
    });

    it('should validate GPX with BOM', async () => {
      const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
      const xml = new TextEncoder().encode('<?xml version="1.0"?><gpx></gpx>');
      const content = new Uint8Array([...bom, ...xml]);

      const file = new File([content], 'test.gpx', {
        type: 'application/gpx+xml',
      });

      const result = await validateFile(file);

      expect(result.valid).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle file with no extension', async () => {
      const file = new File(['test'], 'noextension', {
        type: 'application/octet-stream',
      });

      const result = await validateFile(file);

      expect(result.valid).toBe(false);
    });

    it('should handle file with multiple dots', async () => {
      const file = new File(['<?xml version="1.0"?><gpx></gpx>'], 'file.backup.gpx', {
        type: 'application/gpx+xml',
      });

      const result = await validateFile(file);

      expect(result.valid).toBe(true);
    });

    it('should be case-insensitive for extensions', async () => {
      const file = new File(['<?xml version="1.0"?><gpx></gpx>'], 'test.GPX', {
        type: 'application/gpx+xml',
      });

      const result = await validateFile(file);

      expect(result.valid).toBe(true);
    });
  });
});
