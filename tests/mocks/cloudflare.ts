/**
 * Mock Cloudflare Workers environment for testing
 */

export interface MockEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  VIRUSTOTAL_API_KEY: string;
  R2_BUCKET: any;
  RATE_LIMITER: any;
}

export const createMockEnv = (): MockEnv => ({
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  VIRUSTOTAL_API_KEY: 'test-virustotal-key',
  R2_BUCKET: createMockR2Bucket(),
  RATE_LIMITER: createMockRateLimiter(),
});

export const createMockR2Bucket = () => ({
  put: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue({
    body: new ReadableStream(),
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
  }),
  delete: jest.fn().mockResolvedValue(undefined),
  head: jest.fn().mockResolvedValue({ size: 1024 }),
  list: jest.fn().mockResolvedValue({
    objects: [],
    truncated: false,
  }),
});

export const createMockRateLimiter = () => ({
  limit: jest.fn().mockResolvedValue({ success: true }),
});

export const createMockRequest = (
  url: string = 'http://localhost',
  options: RequestInit = {}
): Request => {
  return new Request(url, options);
};

export const createMockContext = () => ({
  waitUntil: jest.fn(),
  passThroughOnException: jest.fn(),
});
