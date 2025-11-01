/**
 * FishMap API - Cloudflare Workers
 * Handles waypoint uploads, storage, and retrieval with comprehensive security
 */

import { validateFile, sanitizeFilename } from './middleware/fileValidation';
import { rateLimitMiddleware, getRateLimitStatus } from './middleware/rateLimit';
import { sanitizationMiddleware } from './middleware/sanitization';
import {
  applySecurityHeaders,
  DEVELOPMENT_SECURITY_CONFIG,
  PRODUCTION_SECURITY_CONFIG,
} from './middleware/security';
import { authMiddleware, getUserFromRequest } from './middleware/auth';
import { errorHandler, Errors, catchErrors } from './middleware/errorHandler';
import { scanFile, quarantineFile } from './services/malwareScan';

/**
 * Environment interface
 */
interface Env {
  // R2 Storage
  WAYPOINTS_BUCKET: R2Bucket;

  // KV Namespace for rate limiting
  RATE_LIMIT_KV: KVNamespace;

  // Environment variables
  ENVIRONMENT: string;
  SUPABASE_JWT_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  VIRUSTOTAL_API_KEY?: string;

  // Rate limit configuration
  RATE_LIMIT_UPLOADS_PER_HOUR?: string;
  RATE_LIMIT_DOWNLOADS_PER_HOUR?: string;
  RATE_LIMIT_API_REQUESTS_PER_HOUR?: string;

  // Security configuration
  MALWARE_SCAN_ENABLED?: string;
  ALLOWED_ORIGINS?: string;
}

/**
 * Get security configuration based on environment
 */
function getSecurityConfig(env: Env) {
  const isProduction = env.ENVIRONMENT === 'production';

  const config = isProduction
    ? { ...PRODUCTION_SECURITY_CONFIG }
    : { ...DEVELOPMENT_SECURITY_CONFIG };

  // Override CORS allowed origins if specified
  if (env.ALLOWED_ORIGINS && config.cors) {
    config.cors.allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  }

  return config;
}

/**
 * Get rate limit configuration
 */
function getRateLimitConfig(env: Env) {
  return {
    uploadsPerHour: parseInt(env.RATE_LIMIT_UPLOADS_PER_HOUR || '10'),
    downloadsPerHour: parseInt(env.RATE_LIMIT_DOWNLOADS_PER_HOUR || '100'),
    apiRequestsPerHour: parseInt(env.RATE_LIMIT_API_REQUESTS_PER_HOUR || '1000'),
  };
}

/**
 * Main request handler
 */
async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const isDevelopment = env.ENVIRONMENT !== 'production';
  const securityConfig = getSecurityConfig(env);
  const rateLimitConfig = getRateLimitConfig(env);

  // Sanitization middleware
  const sanitizationResult = await sanitizationMiddleware(request);
  if (sanitizationResult) return sanitizationResult;

  // Authentication middleware
  const authResult = await authMiddleware(request, {
    jwtSecret: env.SUPABASE_JWT_SECRET,
    supabaseUrl: env.SUPABASE_URL,
  });

  const user = authResult instanceof Response ? undefined : authResult.user;

  // Rate limiting middleware
  if (env.RATE_LIMIT_KV) {
    const rateLimitResult = await rateLimitMiddleware(
      request,
      env.RATE_LIMIT_KV,
      user?.id,
      rateLimitConfig
    );

    if (rateLimitResult) return rateLimitResult;
  }

  // Route handling
  let response: Response;

  if (path === '/' && request.method === 'GET') {
    // Health check / API info
    response = new Response(
      JSON.stringify({
        name: 'FishMap API',
        version: '1.0.0',
        status: 'running',
        environment: env.ENVIRONMENT,
        security: {
          authentication: !!env.SUPABASE_JWT_SECRET,
          rateLimit: !!env.RATE_LIMIT_KV,
          malwareScan: env.MALWARE_SCAN_ENABLED === 'true',
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } else if (path === '/api/rate-limit-status' && request.method === 'GET') {
    // Rate limit status endpoint
    if (!env.RATE_LIMIT_KV) {
      throw Errors.notImplemented('Rate limiting is not configured');
    }

    if (!user) {
      throw Errors.unauthorized('Authentication required to check rate limit status');
    }

    const status = await getRateLimitStatus(
      env.RATE_LIMIT_KV,
      `user:${user.id}`,
      rateLimitConfig
    );

    response = new Response(JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' },
    });
  } else if (path === '/api/waypoints/upload' && request.method === 'POST') {
    // Upload waypoint file
    if (!user && !isDevelopment) {
      throw Errors.unauthorized('Authentication required for uploads');
    }

    const formData = await request.formData();
    const fileEntry = formData.get('file');

    if (!fileEntry || typeof fileEntry === 'string') {
      throw Errors.badRequest('No file provided');
    }

    const file = fileEntry as File;

    // Validate file
    const validation = await validateFile(file);
    if (!validation.valid) {
      throw Errors.invalidFile(validation.error || 'File validation failed');
    }

    // Malware scan
    if (env.MALWARE_SCAN_ENABLED === 'true') {
      const scanResult = await scanFile(file, {
        virusTotalApiKey: env.VIRUSTOTAL_API_KEY,
        checkKnownHashes: true,
        performHeuristics: true,
      });

      if (!scanResult.safe) {
        throw Errors.malwareDetected(
          scanResult.reason || 'File failed security scan',
          {
            sha256: scanResult.sha256,
          }
        );
      }
    }

    // Store file in R2
    const sanitizedFilename = validation.sanitizedFilename || sanitizeFilename(file.name);
    const userId = user?.id || 'anonymous';
    const fileKey = `uploads/${userId}/${Date.now()}-${sanitizedFilename}`;

    await env.WAYPOINTS_BUCKET.put(fileKey, file.stream(), {
      customMetadata: {
        originalName: file.name,
        sanitizedName: sanitizedFilename,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        size: file.size.toString(),
        type: file.type,
      },
    });

    response = new Response(
      JSON.stringify({
        success: true,
        fileKey,
        fileName: sanitizedFilename,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } else if (path === '/api/waypoints' && request.method === 'GET') {
    // Get waypoints list
    const userId = user?.id;
    const prefix = userId ? `uploads/${userId}/` : 'uploads/';

    const list = await env.WAYPOINTS_BUCKET.list({ prefix });

    const waypoints = list.objects.map((obj) => ({
      key: obj.key,
      uploaded: obj.uploaded,
      size: obj.size,
      metadata: obj.customMetadata,
    }));

    response = new Response(
      JSON.stringify({
        waypoints,
        count: waypoints.length,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } else if (path.startsWith('/api/waypoints/download/') && request.method === 'GET') {
    // Download waypoint file
    const fileKey = decodeURIComponent(path.replace('/api/waypoints/download/', ''));

    // Basic path validation
    if (!fileKey || fileKey.includes('..')) {
      throw Errors.badRequest('Invalid file key');
    }

    const object = await env.WAYPOINTS_BUCKET.get(fileKey);

    if (!object) {
      throw Errors.notFound('File not found');
    }

    // Check if file belongs to user (if authenticated)
    if (user) {
      const expectedPrefix = `uploads/${user.id}/`;
      if (!fileKey.startsWith(expectedPrefix)) {
        throw Errors.forbidden('Access denied to this file');
      }
    }

    const filename = object.customMetadata?.sanitizedName ||
                     fileKey.split('/').pop() ||
                     'download';

    response = new Response(object.body, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': object.size.toString(),
      },
    });
  } else if (path.startsWith('/api/waypoints/delete/') && request.method === 'DELETE') {
    // Delete waypoint file
    if (!user) {
      throw Errors.unauthorized('Authentication required to delete files');
    }

    const fileKey = decodeURIComponent(path.replace('/api/waypoints/delete/', ''));

    // Validate that file belongs to user
    const expectedPrefix = `uploads/${user.id}/`;
    if (!fileKey.startsWith(expectedPrefix)) {
      throw Errors.forbidden('Access denied to this file');
    }

    // Check if file exists
    const object = await env.WAYPOINTS_BUCKET.get(fileKey);
    if (!object) {
      throw Errors.notFound('File not found');
    }

    // Delete file
    await env.WAYPOINTS_BUCKET.delete(fileKey);

    response = new Response(
      JSON.stringify({
        success: true,
        message: 'File deleted successfully',
        fileKey,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } else {
    // 404 for unknown routes
    throw Errors.notFound('Endpoint not found');
  }

  // Apply security headers
  return applySecurityHeaders(response, request, securityConfig);
}

/**
 * Worker export
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const isDevelopment = env.ENVIRONMENT !== 'production';

    // Wrap the handler with error catching
    const wrappedHandler = catchErrors(handleRequest, isDevelopment);

    try {
      const result = await wrappedHandler(request, env, ctx);
      return result as Response;
    } catch (error) {
      // Final error handler (should rarely reach here due to catchErrors)
      return errorHandler(
        error instanceof Error ? error : new Error(String(error)),
        request,
        isDevelopment
      );
    }
  },
};
