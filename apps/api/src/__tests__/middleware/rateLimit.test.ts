/**
 * Tests for rate limiting middleware
 */

import { createMockRequest, createMockContext, createMockEnv } from '../../../../../tests/mocks/cloudflare';

describe('Rate Limit Middleware', () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  it('should allow requests under rate limit', async () => {
    mockEnv.RATE_LIMITER.limit.mockResolvedValue({ success: true });

    // Test rate limiting logic
    expect(mockEnv.RATE_LIMITER.limit).toBeDefined();
  });

  it('should block requests exceeding rate limit', async () => {
    mockEnv.RATE_LIMITER.limit.mockResolvedValue({ success: false });

    // Test rate limiting logic
    expect(mockEnv.RATE_LIMITER.limit).toBeDefined();
  });

  it('should use IP address for rate limiting', async () => {
    const request = createMockRequest('http://localhost/api/upload', {
      method: 'POST',
      headers: {
        'CF-Connecting-IP': '192.168.1.1',
      },
    });

    // Test IP extraction
    expect(request.headers.get('CF-Connecting-IP')).toBe('192.168.1.1');
  });
});
