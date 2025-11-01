/**
 * Error Handling Middleware
 * Centralized error handling with secure error messages and logging
 */

/**
 * Error codes
 */
export enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE = 'UNSUPPORTED_MEDIA_TYPE',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Server errors (5xx)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  BAD_GATEWAY = 'BAD_GATEWAY',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',

  // Custom application errors
  INVALID_FILE = 'INVALID_FILE',
  MALWARE_DETECTED = 'MALWARE_DETECTED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    statusCode: number = 500,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown (if available)
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: string;
  code: ErrorCode;
  statusCode: number;
  details?: any;
  timestamp?: string;
  requestId?: string;
  path?: string;
}

/**
 * Get safe error message for production
 */
function getSafeErrorMessage(error: Error, isDevelopment: boolean): string {
  if (isDevelopment) {
    return error.message;
  }

  // In production, return generic messages for non-operational errors
  if (error instanceof AppError && error.isOperational) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Get error details for response
 */
function getErrorDetails(error: Error, isDevelopment: boolean): any | undefined {
  if (!isDevelopment) {
    return undefined;
  }

  if (error instanceof AppError) {
    return error.details;
  }

  // Include stack trace in development
  return {
    stack: error.stack?.split('\n').slice(0, 5), // First 5 lines of stack trace
  };
}

/**
 * Map error to HTTP status code
 */
function getStatusCode(error: Error): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  // Default to 500 for unknown errors
  return 500;
}

/**
 * Map error to error code
 */
function getErrorCode(error: Error): ErrorCode {
  if (error instanceof AppError) {
    return error.code;
  }

  // Try to infer from error type
  if (error.name === 'SyntaxError') {
    return ErrorCode.BAD_REQUEST;
  }

  if (error.name === 'TypeError') {
    return ErrorCode.UNPROCESSABLE_ENTITY;
  }

  return ErrorCode.INTERNAL_SERVER_ERROR;
}

/**
 * Log error securely
 */
function logError(error: Error, context?: {
  requestId?: string;
  path?: string;
  method?: string;
  userId?: string;
  ip?: string;
}) {
  const errorInfo = {
    name: error.name,
    message: error.message,
    code: error instanceof AppError ? error.code : 'UNKNOWN',
    statusCode: getStatusCode(error),
    stack: error.stack,
    isOperational: error instanceof AppError ? error.isOperational : false,
    ...context,
    timestamp: new Date().toISOString(),
  };

  // In production, you'd send this to a logging service
  // For now, we'll use console
  if (errorInfo.statusCode >= 500) {
    console.error('Server Error:', JSON.stringify(errorInfo, null, 2));
  } else {
    console.warn('Client Error:', JSON.stringify(errorInfo, null, 2));
  }

  // TODO: Send to external logging service (e.g., Sentry, LogRocket, etc.)
  // await sendToLoggingService(errorInfo);
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create error response
 */
function createErrorResponse(
  error: Error,
  options: {
    isDevelopment: boolean;
    requestId?: string;
    path?: string;
  }
): Response {
  const statusCode = getStatusCode(error);
  const errorCode = getErrorCode(error);

  const errorResponse: ErrorResponse = {
    error: getSafeErrorMessage(error, options.isDevelopment),
    code: errorCode,
    statusCode,
    timestamp: new Date().toISOString(),
    requestId: options.requestId,
    path: options.path,
  };

  // Add details in development
  const details = getErrorDetails(error, options.isDevelopment);
  if (details) {
    errorResponse.details = details;
  }

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': options.requestId || '',
    },
  });
}

/**
 * Error handler middleware wrapper
 * Wraps async handlers to catch errors
 */
export function catchErrors<T>(
  handler: (request: Request, ...args: any[]) => Promise<T>,
  isDevelopment: boolean = false
): (request: Request, ...args: any[]) => Promise<Response | T> {
  return async (request: Request, ...args: any[]): Promise<Response | T> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      const requestId = generateRequestId();
      const url = new URL(request.url);

      // Log error
      logError(
        error instanceof Error ? error : new Error(String(error)),
        {
          requestId,
          path: url.pathname,
          method: request.method,
          ip: request.headers.get('CF-Connecting-IP') || undefined,
        }
      );

      // Return error response
      return createErrorResponse(
        error instanceof Error ? error : new Error(String(error)),
        {
          isDevelopment,
          requestId,
          path: url.pathname,
        }
      );
    }
  };
}

/**
 * Global error handler
 */
export async function errorHandler(
  error: Error,
  request: Request,
  isDevelopment: boolean = false
): Promise<Response> {
  const requestId = generateRequestId();
  const url = new URL(request.url);

  // Log error
  logError(error, {
    requestId,
    path: url.pathname,
    method: request.method,
    ip: request.headers.get('CF-Connecting-IP') || undefined,
  });

  // Create error response
  return createErrorResponse(error, {
    isDevelopment,
    requestId,
    path: url.pathname,
  });
}

/**
 * Common error constructors
 */
export const Errors = {
  badRequest: (message: string, details?: any) =>
    new AppError(message, ErrorCode.BAD_REQUEST, 400, details),

  unauthorized: (message: string = 'Authentication required') =>
    new AppError(message, ErrorCode.UNAUTHORIZED, 401),

  forbidden: (message: string = 'Insufficient permissions') =>
    new AppError(message, ErrorCode.FORBIDDEN, 403),

  notFound: (message: string = 'Resource not found') =>
    new AppError(message, ErrorCode.NOT_FOUND, 404),

  conflict: (message: string, details?: any) =>
    new AppError(message, ErrorCode.CONFLICT, 409, details),

  payloadTooLarge: (message: string = 'Request payload too large') =>
    new AppError(message, ErrorCode.PAYLOAD_TOO_LARGE, 413),

  unsupportedMediaType: (message: string = 'Unsupported media type') =>
    new AppError(message, ErrorCode.UNSUPPORTED_MEDIA_TYPE, 415),

  unprocessableEntity: (message: string, details?: any) =>
    new AppError(message, ErrorCode.UNPROCESSABLE_ENTITY, 422, details),

  tooManyRequests: (message: string, details?: any) =>
    new AppError(message, ErrorCode.TOO_MANY_REQUESTS, 429, details),

  internalError: (message: string = 'Internal server error', details?: any) =>
    new AppError(message, ErrorCode.INTERNAL_SERVER_ERROR, 500, details, false),

  notImplemented: (message: string = 'Not implemented') =>
    new AppError(message, ErrorCode.NOT_IMPLEMENTED, 501),

  serviceUnavailable: (message: string = 'Service unavailable') =>
    new AppError(message, ErrorCode.SERVICE_UNAVAILABLE, 503),

  invalidFile: (message: string, details?: any) =>
    new AppError(message, ErrorCode.INVALID_FILE, 400, details),

  malwareDetected: (message: string, details?: any) =>
    new AppError(message, ErrorCode.MALWARE_DETECTED, 403, details),

  rateLimitExceeded: (message: string, details?: any) =>
    new AppError(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, details),

  validationError: (message: string, details?: any) =>
    new AppError(message, ErrorCode.VALIDATION_ERROR, 400, details),

  databaseError: (message: string = 'Database operation failed') =>
    new AppError(message, ErrorCode.DATABASE_ERROR, 500, undefined, false),

  storageError: (message: string = 'Storage operation failed') =>
    new AppError(message, ErrorCode.STORAGE_ERROR, 500, undefined, false),
};

/**
 * Validate that a value exists (throws if not)
 */
export function assertExists<T>(
  value: T | null | undefined,
  message: string = 'Required value not found'
): asserts value is T {
  if (value === null || value === undefined) {
    throw Errors.badRequest(message);
  }
}

/**
 * Validate condition (throws if false)
 */
export function assert(
  condition: boolean,
  message: string,
  code: ErrorCode = ErrorCode.BAD_REQUEST
): asserts condition {
  if (!condition) {
    const statusCode = code.includes('SERVER') ? 500 : 400;
    throw new AppError(message, code, statusCode);
  }
}
