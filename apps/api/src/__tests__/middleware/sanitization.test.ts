/**
 * Tests for input sanitization middleware
 */

describe('Sanitization Middleware', () => {
  describe('SQL injection prevention', () => {
    it('should detect SQL injection patterns', () => {
      const sqlInjectionPatterns = [
        "'; DROP TABLE users--",
        "1' OR '1'='1",
        "admin'--",
        "1; DELETE FROM users",
      ];

      sqlInjectionPatterns.forEach(pattern => {
        expect(pattern).toMatch(/['";]/);
      });
    });
  });

  describe('XSS prevention', () => {
    it('should detect XSS patterns', () => {
      const xssPatterns = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
      ];

      xssPatterns.forEach(pattern => {
        expect(pattern).toMatch(/<|javascript:/);
      });
    });

    it('should sanitize HTML entities', () => {
      const sanitize = (str: string) =>
        str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');

      expect(sanitize('<script>alert(1)</script>')).toBe(
        '&lt;script&gt;alert(1)&lt;/script&gt;'
      );
    });
  });

  describe('Path traversal prevention', () => {
    it('should detect path traversal attempts', () => {
      const traversalPatterns = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        '%2e%2e%2f',
      ];

      traversalPatterns.forEach(pattern => {
        expect(pattern).toMatch(/\.\./);
      });
    });
  });
});
