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
import { createSupabaseClient } from './lib/supabaseClient';
import { insertFileMetadata } from './services/fileMetadata';
import { deleteFromR2 } from './services/r2Cleanup';
import { trackDownload } from './services/downloadTracking';

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
  SUPABASE_SERVICE_KEY?: string;
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

  // Validate critical environment variables on startup (only for database-dependent endpoints)
  const databaseEndpoints = [
    '/api/upload',
    '/api/waypoints/upload',
    '/api/files',
    '/api/download/',
  ];

  const requiresDatabase = databaseEndpoints.some(endpoint =>
    path === endpoint || path.startsWith(endpoint)
  );

  if (requiresDatabase && (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_JWT_SECRET || !env.SUPABASE_SERVICE_KEY)) {
    console.error('[config] Missing required Supabase environment variables');
    throw Errors.internalError('Database configuration is missing. Please contact support.');
  }

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
  } else if ((path === '/api/upload' || path === '/api/waypoints/upload') && request.method === 'POST') {
    // Upload waypoint file (supports both /api/upload and /api/waypoints/upload)
    if (!user && !isDevelopment) {
      throw Errors.unauthorized('Authentication required for uploads');
    }

    const formData = await request.formData();
    const fileEntry = formData.get('file');

    if (!fileEntry || typeof fileEntry === 'string') {
      throw Errors.badRequest('No file provided');
    }

    const file = fileEntry as File;

    // Validate file size is not zero
    if (file.size === 0) {
      throw Errors.badRequest('File is empty');
    }

    // Validate file size is within limits (500MB max)
    const maxFileSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxFileSize) {
      throw Errors.payloadTooLarge(`File size exceeds maximum allowed size of 500MB`);
    }

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

    // Extract metadata from formData
    const displayName = (formData.get('display_name') || formData.get('name') || sanitizedFilename) as string;
    const description = formData.get('description') as string | null;
    const location = formData.get('location') as string | null;
    const brandInput = formData.get('brand') as string | null;

    // Validate display_name is not empty
    if (!displayName || displayName.trim().length === 0) {
      throw Errors.badRequest('Display name is required (use "display_name" or "name" field)');
    }

    // Validate display_name length
    if (displayName.length > 255) {
      throw Errors.badRequest('Display name must be less than 255 characters');
    }

    // Validate description length if provided
    if (description && description.length > 1000) {
      throw Errors.badRequest('Description must be less than 1000 characters');
    }

    // Validate location length if provided
    if (location && location.length > 255) {
      throw Errors.badRequest('Location must be less than 255 characters');
    }

    // Validate brand or default to 'other'
    const validBrands = ['lowrance', 'garmin', 'humminbird', 'raymarine', 'simrad', 'furuno', 'other'];
    const brand = (brandInput && validBrands.includes(brandInput.toLowerCase()))
      ? brandInput.toLowerCase() as 'lowrance' | 'garmin' | 'humminbird' | 'raymarine' | 'simrad' | 'furuno' | 'other'
      : 'other';

    // Get file extension
    const fileExtension = sanitizedFilename.substring(sanitizedFilename.lastIndexOf('.')).toLowerCase();

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

    // Insert file metadata into database
    let fileId: string | null = null;

    try {
      console.log('[upload] Starting file upload', {
        userId,
        filename: sanitizedFilename,
        size: file.size,
        brand,
      });

      // Create Supabase client with service key (bypasses RLS)
      const supabase = createSupabaseClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_KEY!);

      // Insert file metadata
      const { data, error } = await insertFileMetadata(supabase, {
        filename: sanitizedFilename,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        file_extension: fileExtension,
        r2_key: fileKey,
        display_name: displayName,
        description: description || undefined,
        location: location || undefined,
        brand: brand,
        user_id: userId,
      });

      if (error) {
        console.error('[upload] Database insert failed:', {
          error: error.message || error,
          userId,
          fileKey,
        });

        // Check for specific database errors
        const errorMessage = error.message || String(error);

        // Handle duplicate r2_key (file already exists)
        if (errorMessage.includes('duplicate key') || errorMessage.includes('r2_key')) {
          // Rollback R2 upload
          try {
            await deleteFromR2(env.WAYPOINTS_BUCKET, fileKey);
            console.log('[upload] R2 rollback successful');
          } catch (rollbackErr) {
            console.error('[upload] R2 rollback failed:', rollbackErr);
          }
          throw Errors.conflict('A file with this key already exists');
        }

        // Handle foreign key violations (invalid user_id)
        if (errorMessage.includes('foreign key') || errorMessage.includes('user_id')) {
          // Rollback R2 upload
          try {
            await deleteFromR2(env.WAYPOINTS_BUCKET, fileKey);
            console.log('[upload] R2 rollback successful');
          } catch (rollbackErr) {
            console.error('[upload] R2 rollback failed:', rollbackErr);
          }
          throw Errors.badRequest('Invalid user reference');
        }

        // Handle check constraint violations (invalid brand, file_size, etc.)
        if (errorMessage.includes('check constraint') || errorMessage.includes('violates check')) {
          // Rollback R2 upload
          try {
            await deleteFromR2(env.WAYPOINTS_BUCKET, fileKey);
            console.log('[upload] R2 rollback successful');
          } catch (rollbackErr) {
            console.error('[upload] R2 rollback failed:', rollbackErr);
          }
          throw Errors.badRequest('File metadata validation failed: ' + errorMessage);
        }

        // Rollback R2 upload for any other database error
        try {
          await deleteFromR2(env.WAYPOINTS_BUCKET, fileKey);
          console.log('[upload] R2 rollback successful');
        } catch (rollbackErr) {
          console.error('[upload] R2 rollback failed:', rollbackErr);
        }

        throw Errors.databaseError('Failed to save file metadata to database');
      }

      fileId = data!.id;
      console.log(`[upload] File successfully uploaded and saved to database with ID: ${fileId}`);
    } catch (dbError) {
      console.error('[upload] Database operation failed:', dbError);

      // Ensure R2 rollback happens even if insertFileMetadata didn't throw properly
      if (!fileId) {
        try {
          await deleteFromR2(env.WAYPOINTS_BUCKET, fileKey);
          console.log('[upload] R2 rollback successful (catch block)');
        } catch (rollbackErr) {
          console.error('[upload] R2 rollback failed (catch block):', rollbackErr);
          // Don't throw - we want to return the original database error
        }
      }

      // Re-throw the error to be handled by the error handler
      throw dbError;
    }

    response = new Response(
      JSON.stringify({
        success: true,
        message: 'File uploaded successfully',
        fileId: fileId,
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
  } else if (path === '/api/files' && request.method === 'GET') {
    // Get files list from database with pagination, filtering, and search

    // Create Supabase client based on authentication
    // Use anon key for authenticated users (respects RLS), service key for anonymous
    const apiKey = user ? env.SUPABASE_ANON_KEY : env.SUPABASE_SERVICE_KEY;

    if (!env.SUPABASE_URL || !apiKey) {
      throw Errors.internalError('Database configuration missing');
    }

    const supabase = createSupabaseClient(env.SUPABASE_URL, apiKey);

    // Parse and validate query parameters
    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');
    const brandParam = url.searchParams.get('brand');
    const userIdParam = url.searchParams.get('user_id');
    const isPublicParam = url.searchParams.get('is_public');
    const searchParam = url.searchParams.get('search');
    const sortParam = url.searchParams.get('sort') || 'uploaded_at';
    const orderParam = url.searchParams.get('order') || 'desc';

    // Validate page is a positive integer
    const page = pageParam ? parseInt(pageParam) : 1;
    if (isNaN(page) || page < 1) {
      throw Errors.badRequest('Page must be a positive integer');
    }

    // Validate limit is a positive integer between 1 and 100
    const limit = limitParam ? parseInt(limitParam) : 20;
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw Errors.badRequest('Limit must be a positive integer between 1 and 100');
    }

    // Validate brand if provided
    const validBrands = ['lowrance', 'garmin', 'humminbird', 'raymarine', 'simrad', 'furuno', 'other'];
    if (brandParam && !validBrands.includes(brandParam.toLowerCase())) {
      throw Errors.badRequest(`Invalid brand. Must be one of: ${validBrands.join(', ')}`);
    }
    const brand = brandParam?.toLowerCase();

    // Validate user_id if provided
    const userId = userIdParam;
    if (userId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      throw Errors.badRequest('Invalid user_id format (must be a valid UUID)');
    }

    // Validate is_public if provided
    if (isPublicParam && isPublicParam !== 'true' && isPublicParam !== 'false') {
      throw Errors.badRequest('is_public must be "true" or "false"');
    }

    // Validate search length if provided
    const search = searchParam?.trim();
    if (search && search.length > 255) {
      throw Errors.badRequest('Search query must be less than 255 characters');
    }

    // Validate sort field
    const validSortFields = ['uploaded_at', 'download_count', 'file_size', 'created_at'];
    const sort = validSortFields.includes(sortParam) ? sortParam : 'uploaded_at';
    if (sortParam && !validSortFields.includes(sortParam)) {
      throw Errors.badRequest(`Invalid sort field. Must be one of: ${validSortFields.join(', ')}`);
    }

    // Validate order
    const order = orderParam.toLowerCase();
    if (order !== 'asc' && order !== 'desc') {
      throw Errors.badRequest('Order must be "asc" or "desc"');
    }

    try {
      // Build query
      let query = supabase
        .from('files')
        .select('*', { count: 'exact' })
        .eq('is_deleted', false);

      // Apply filters
      if (brand) {
        query = query.eq('brand', brand);
      }

      if (userId && user) {
        // Only allow filtering by user_id if authenticated
        query = query.eq('user_id', userId);
      }

      if (isPublicParam !== null) {
        const isPublic = isPublicParam === 'true';
        query = query.eq('is_public', isPublic);
      }

      // Apply search
      if (search && search.length > 0) {
        query = query.or(`display_name.ilike.%${search}%,description.ilike.%${search}%`);
      }

      // Apply sorting
      const ascending = order === 'asc';
      query = query.order(sort, { ascending });

      // Apply pagination
      const from = (page - 1) * limit;
      query = query.range(from, from + limit - 1);

      console.log('[files] Fetching files list', {
        page,
        limit,
        brand,
        userId,
        isPublic: isPublicParam,
        search,
        sort,
        order,
      });

      // Execute query
      const { data, error, count } = await query;

      if (error) {
        console.error('[files] Database query failed:', {
          error: error.message || error,
          filters: { brand, userId, isPublicParam, search },
        });
        throw Errors.databaseError('Failed to retrieve files from database');
      }

      response = new Response(
        JSON.stringify({
          files: data || [],
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (err) {
      console.error('[files] Error retrieving files:', err);
      throw err instanceof Error ? err : Errors.internalError('Failed to retrieve files');
    }
  } else if (path.startsWith('/api/files/') && !path.includes('download') && request.method === 'GET') {
    // Get single file by ID
    const fileId = decodeURIComponent(path.replace('/api/files/', ''));

    // Validate fileId is not empty
    if (!fileId || fileId.trim().length === 0) {
      throw Errors.badRequest('File ID is required');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fileId)) {
      throw Errors.badRequest('Invalid file ID format (must be a valid UUID)');
    }

    // Create Supabase client based on authentication
    const apiKey = user ? env.SUPABASE_ANON_KEY : env.SUPABASE_SERVICE_KEY;

    if (!env.SUPABASE_URL || !apiKey) {
      throw Errors.internalError('Database configuration missing');
    }

    const supabase = createSupabaseClient(env.SUPABASE_URL, apiKey);

    try {
      console.log('[file-detail] Fetching file details', { fileId, authenticated: !!user });

      // Query file by ID
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
        .eq('is_deleted', false)
        .single();

      if (error) {
        console.error('[file-detail] Database query failed:', {
          error: error.message || error,
          fileId,
        });

        // Check if it's a "not found" error (PGRST116)
        if (error.message?.includes('PGRST116') || error.message?.includes('no rows')) {
          throw Errors.notFound('File not found');
        }

        throw Errors.databaseError('Failed to retrieve file details');
      }

      if (!data) {
        throw Errors.notFound('File not found');
      }

      response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('[file-detail] Error retrieving file:', err);
      throw err instanceof Error ? err : Errors.internalError('Failed to retrieve file details');
    }
  } else if (path.startsWith('/api/download/') && request.method === 'GET') {
    // Download file by ID
    const fileId = decodeURIComponent(path.replace('/api/download/', ''));

    // Validate fileId is not empty
    if (!fileId || fileId.trim().length === 0) {
      throw Errors.badRequest('File ID is required');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fileId)) {
      throw Errors.badRequest('Invalid file ID format (must be a valid UUID)');
    }

    // Create Supabase client based on authentication
    const apiKey = user ? env.SUPABASE_ANON_KEY : env.SUPABASE_SERVICE_KEY;

    if (!env.SUPABASE_URL || !apiKey) {
      throw Errors.internalError('Database configuration missing');
    }

    const supabase = createSupabaseClient(env.SUPABASE_URL, apiKey);

    try {
      console.log('[download] Starting file download', { fileId, authenticated: !!user });

      // Query file by ID to get r2_key and metadata
      const { data: fileRecord, error } = await supabase
        .from('files')
        .select('id, r2_key, original_filename, file_size, mime_type, user_id')
        .eq('id', fileId)
        .eq('is_deleted', false)
        .single();

      if (error) {
        console.error('[download] Database query failed:', {
          error: error.message || error,
          fileId,
        });

        // Check if it's a "not found" error (PGRST116)
        if (error.message?.includes('PGRST116') || error.message?.includes('no rows')) {
          throw Errors.notFound('File not found');
        }

        throw Errors.databaseError('Failed to retrieve file information');
      }

      if (!fileRecord) {
        throw Errors.notFound('File not found');
      }

      // Validate fileRecord has required fields
      if (!fileRecord.r2_key || !fileRecord.original_filename) {
        console.error('[download] File record missing required fields:', fileRecord);
        throw Errors.internalError('File metadata is incomplete');
      }

      // Track download asynchronously (fire-and-forget)
      const ipAddress = request.headers.get('CF-Connecting-IP') ||
                       request.headers.get('X-Forwarded-For') ||
                       'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';

      trackDownload(supabase, {
        file_id: fileRecord.id,
        user_id: user?.id,
        ip_address: ipAddress,
        user_agent: userAgent,
      }).catch(err => console.error('[download] Download tracking failed:', err));

      // Get file from R2
      const file = await env.WAYPOINTS_BUCKET.get(fileRecord.r2_key);

      if (!file) {
        console.error('[download] File not found in R2 storage:', {
          r2_key: fileRecord.r2_key,
          fileId,
        });
        throw Errors.notFound('File not found in storage. The file may have been deleted.');
      }

      console.log('[download] File download successful', { fileId, filename: fileRecord.original_filename });

      response = new Response(file.body, {
        headers: {
          'Content-Type': fileRecord.mime_type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileRecord.original_filename}"`,
          'Content-Length': fileRecord.file_size.toString(),
        },
      });
    } catch (err) {
      console.error('[download] Error downloading file:', err);
      throw err instanceof Error ? err : Errors.internalError('Failed to download file');
    }
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
    // Download waypoint file (legacy endpoint - uses R2 key directly)
    const fileKey = decodeURIComponent(path.replace('/api/waypoints/download/', ''));

    // Validate fileKey is not empty
    if (!fileKey || fileKey.trim().length === 0) {
      throw Errors.badRequest('File key is required');
    }

    // Path traversal prevention
    if (fileKey.includes('..') || fileKey.includes('\\') || fileKey.startsWith('/')) {
      throw Errors.badRequest('Invalid file key: path traversal detected');
    }

    // Validate fileKey format (must start with 'uploads/')
    if (!fileKey.startsWith('uploads/')) {
      throw Errors.badRequest('Invalid file key format: must start with "uploads/"');
    }

    try {
      console.log('[legacy-download] Starting legacy file download', { fileKey, authenticated: !!user });

      // Get file from R2
      const object = await env.WAYPOINTS_BUCKET.get(fileKey);

      if (!object) {
        console.error('[legacy-download] File not found in R2 storage:', fileKey);
        throw Errors.notFound('File not found');
      }

      // Check if file belongs to user (if authenticated)
      if (user) {
        const expectedPrefix = `uploads/${user.id}/`;
        if (!fileKey.startsWith(expectedPrefix)) {
          console.warn('[legacy-download] Access denied - file does not belong to user:', {
            fileKey,
            userId: user.id,
          });
          throw Errors.forbidden('Access denied to this file');
        }
      }

      // Track download asynchronously (fire-and-forget)
      if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
        try {
          // Create Supabase client with service key (bypasses RLS)
          const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

          // Look up file in database by r2_key
          const { data: fileRecord, error } = await supabase
            .from('files')
            .select('id, user_id')
            .eq('r2_key', fileKey)
            .single();

          if (error) {
            console.warn('[legacy-download] File not found in database (R2-only file):', {
              fileKey,
              error: error.message,
            });
          }

          // If file found in database, track the download
          if (fileRecord) {
            // Extract request information
            const ipAddress = request.headers.get('CF-Connecting-IP') ||
                             request.headers.get('X-Forwarded-For') ||
                             'unknown';
            const userAgent = request.headers.get('User-Agent') || 'unknown';

            // Track download (don't await - fire-and-forget)
            trackDownload(supabase, {
              file_id: fileRecord.id,
              user_id: user?.id,
              ip_address: ipAddress,
              user_agent: userAgent,
            }).catch(err => console.error('[legacy-download] Download tracking failed:', err));
          }
        } catch (dbError) {
          // Log error but don't block download
          console.error('[legacy-download] Database lookup failed:', dbError);
        }
      }

      const filename = object.customMetadata?.sanitizedName ||
                       fileKey.split('/').pop() ||
                       'download';

      console.log('[legacy-download] File download successful', { fileKey, filename });

      response = new Response(object.body, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': object.size.toString(),
        },
      });
    } catch (err) {
      console.error('[legacy-download] Error downloading file:', err);
      throw err instanceof Error ? err : Errors.internalError('Failed to download file');
    }
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
