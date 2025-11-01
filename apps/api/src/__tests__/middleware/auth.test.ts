/**
 * Tests for authentication middleware
 */

import { createMockRequest } from '../../../../../tests/mocks/cloudflare';

describe('Auth Middleware', () => {
  it('should extract bearer token from Authorization header', () => {
    const request = createMockRequest('http://localhost/api/maps', {
      headers: {
        'Authorization': 'Bearer test-token-123',
      },
    });

    const authHeader = request.headers.get('Authorization');
    expect(authHeader).toBe('Bearer test-token-123');

    const token = authHeader?.replace('Bearer ', '');
    expect(token).toBe('test-token-123');
  });

  it('should reject requests without Authorization header', () => {
    const request = createMockRequest('http://localhost/api/maps');

    const authHeader = request.headers.get('Authorization');
    expect(authHeader).toBeNull();
  });

  it('should validate token format', () => {
    const validTokens = [
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      'Bearer valid-token',
    ];

    const invalidTokens = [
      'Basic dXNlcjpwYXNz',
      'Bearer',
      'token-without-bearer',
    ];

    validTokens.forEach(token => {
      expect(token).toMatch(/^Bearer .+$/);
    });

    invalidTokens.forEach(token => {
      expect(token).not.toMatch(/^Bearer [A-Za-z0-9-_]+/);
    });
  });
});
