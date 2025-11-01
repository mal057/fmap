/**
 * Rate Limiting Middleware
 * Implements rate limiting using Cloudflare Workers KV
 * Uses sliding window algorithm for accurate rate limiting
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  uploadsPerHour: number;
  downloadsPerHour: number;
  apiRequestsPerHour: number;
}

/**
 * Default rate limits
 */
const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  uploadsPerHour: 10,
  downloadsPerHour: 100,
  apiRequestsPerHour: 1000,
};

/**
 * Rate limit entry stored in KV
 */
interface RateLimitEntry {
  count: number;
  windowStart: number;
  requests: number[]; // Timestamps of requests for sliding window
}

/**
 * Get identifier for rate limiting (user ID or IP)
 */
function getIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Get IP from CF-Connecting-IP header (Cloudflare provides this)
  const ip = request.headers.get('CF-Connecting-IP') ||
             request.headers.get('X-Forwarded-For')?.split(',')[0] ||
             'unknown';

  return `ip:${ip}`;
}

/**
 * Get rate limit type from request path and method
 */
function getRateLimitType(pathname: string, method: string): 'upload' | 'download' | 'api' {
  if (pathname.includes('/upload') && method === 'POST') {
    return 'upload';
  }

  if (pathname.includes('/download') && method === 'GET') {
    return 'download';
  }

  return 'api';
}

/**
 * Get limit for rate limit type
 */
function getLimit(type: 'upload' | 'download' | 'api', config: RateLimitConfig): number {
  switch (type) {
    case 'upload':
      return config.uploadsPerHour;
    case 'download':
      return config.downloadsPerHour;
    case 'api':
      return config.apiRequestsPerHour;
  }
}

/**
 * Check and update rate limit using sliding window algorithm
 */
async function checkRateLimit(
  kv: KVNamespace,
  identifier: string,
  type: 'upload' | 'download' | 'api',
  limit: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  const windowSize = 60 * 60 * 1000; // 1 hour in milliseconds
  const key = `ratelimit:${type}:${identifier}`;

  try {
    // Get existing entry
    const existingData = await kv.get(key, 'json') as RateLimitEntry | null;

    let entry: RateLimitEntry;

    if (!existingData) {
      // First request
      entry = {
        count: 1,
        windowStart: now,
        requests: [now],
      };
    } else {
      // Filter out requests outside the current window
      const validRequests = existingData.requests.filter(
        (timestamp) => now - timestamp < windowSize
      );

      // Add current request
      validRequests.push(now);

      entry = {
        count: validRequests.length,
        windowStart: validRequests[0] || now,
        requests: validRequests,
      };
    }

    // Check if limit exceeded
    const allowed = entry.count <= limit;
    const remaining = Math.max(0, limit - entry.count);
    const resetTime = entry.windowStart + windowSize;

    if (allowed) {
      // Store updated entry with expiration (2 hours to account for clock drift)
      await kv.put(key, JSON.stringify(entry), {
        expirationTtl: 2 * 60 * 60, // 2 hours
      });
    }

    return {
      allowed,
      remaining,
      resetTime,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: limit,
      resetTime: now + windowSize,
    };
  }
}

/**
 * Rate limiting middleware
 */
export async function rateLimitMiddleware(
  request: Request,
  kv: KVNamespace,
  userId?: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS
): Promise<Response | null> {
  const url = new URL(request.url);
  const identifier = getIdentifier(request, userId);
  const type = getRateLimitType(url.pathname, request.method);
  const limit = getLimit(type, config);

  const result = await checkRateLimit(kv, identifier, type, limit);

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        type,
        limit,
        retryAfter,
        resetTime: new Date(result.resetTime).toISOString(),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetTime.toString(),
        },
      }
    );
  }

  // Request allowed - could add rate limit headers to response
  // but we'll do that in the main handler
  return null;
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  headers: Headers,
  remaining: number,
  limit: number,
  resetTime: number
): void {
  headers.set('X-RateLimit-Limit', limit.toString());
  headers.set('X-RateLimit-Remaining', remaining.toString());
  headers.set('X-RateLimit-Reset', resetTime.toString());
}

/**
 * Get current rate limit status (for informational endpoints)
 */
export async function getRateLimitStatus(
  kv: KVNamespace,
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS
): Promise<{
  upload: { limit: number; remaining: number; resetTime: number };
  download: { limit: number; remaining: number; resetTime: number };
  api: { limit: number; remaining: number; resetTime: number };
}> {
  const now = Date.now();
  const windowSize = 60 * 60 * 1000;

  const types: Array<'upload' | 'download' | 'api'> = ['upload', 'download', 'api'];
  const status: any = {};

  for (const type of types) {
    const limit = getLimit(type, config);
    const key = `ratelimit:${type}:${identifier}`;

    try {
      const entry = await kv.get(key, 'json') as RateLimitEntry | null;

      if (!entry) {
        status[type] = {
          limit,
          remaining: limit,
          resetTime: now + windowSize,
        };
      } else {
        const validRequests = entry.requests.filter(
          (timestamp) => now - timestamp < windowSize
        );

        status[type] = {
          limit,
          remaining: Math.max(0, limit - validRequests.length),
          resetTime: entry.windowStart + windowSize,
        };
      }
    } catch (error) {
      console.error(`Error getting rate limit status for ${type}:`, error);
      status[type] = {
        limit,
        remaining: limit,
        resetTime: now + windowSize,
      };
    }
  }

  return status;
}
