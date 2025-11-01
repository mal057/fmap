/**
 * Security Headers Middleware
 * Adds security-related HTTP headers to responses
 */

/**
 * Security headers configuration
 */
export interface SecurityConfig {
  // Content Security Policy
  csp?: {
    directives?: {
      defaultSrc?: string[];
      scriptSrc?: string[];
      styleSrc?: string[];
      imgSrc?: string[];
      connectSrc?: string[];
      fontSrc?: string[];
      objectSrc?: string[];
      mediaSrc?: string[];
      frameSrc?: string[];
    };
  };

  // CORS configuration
  cors?: {
    allowedOrigins?: string[];
    allowedMethods?: string[];
    allowedHeaders?: string[];
    maxAge?: number;
    credentials?: boolean;
  };

  // Other security options
  hsts?: {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };

  frameOptions?: 'DENY' | 'SAMEORIGIN';
  contentTypeOptions?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: Record<string, string[]>;
}

/**
 * Default security configuration
 */
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for common UI libraries
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  cors: {
    allowedOrigins: ['*'], // Should be configured per environment
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24 hours
    credentials: false,
  },

  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  frameOptions: 'DENY',
  contentTypeOptions: true,
  referrerPolicy: 'strict-origin-when-cross-origin',

  permissionsPolicy: {
    geolocation: [],
    microphone: [],
    camera: [],
    payment: [],
    usb: [],
    magnetometer: [],
    gyroscope: [],
    accelerometer: [],
  },
};

/**
 * Build Content-Security-Policy header value
 */
function buildCspHeader(csp: SecurityConfig['csp']): string {
  if (!csp?.directives) return '';

  const directives: string[] = [];

  for (const [key, values] of Object.entries(csp.directives)) {
    if (values && values.length > 0) {
      // Convert camelCase to kebab-case
      const directiveName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      directives.push(`${directiveName} ${values.join(' ')}`);
    }
  }

  return directives.join('; ');
}

/**
 * Build Permissions-Policy header value
 */
function buildPermissionsPolicyHeader(policy: Record<string, string[]>): string {
  const policies: string[] = [];

  for (const [feature, allowList] of Object.entries(policy)) {
    const featureName = feature.replace(/([A-Z])/g, '-$1').toLowerCase();

    if (allowList.length === 0) {
      policies.push(`${featureName}=()`);
    } else {
      const origins = allowList.map((origin) => `"${origin}"`).join(' ');
      policies.push(`${featureName}=(${origins})`);
    }
  }

  return policies.join(', ');
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  if (allowedOrigins.includes('*')) return true;
  return allowedOrigins.includes(origin);
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(
  headers: Headers,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): void {
  // Content-Security-Policy
  if (config.csp) {
    const cspHeader = buildCspHeader(config.csp);
    if (cspHeader) {
      headers.set('Content-Security-Policy', cspHeader);
    }
  }

  // Strict-Transport-Security (HSTS)
  if (config.hsts) {
    const hstsDirectives = [`max-age=${config.hsts.maxAge || 31536000}`];
    if (config.hsts.includeSubDomains) {
      hstsDirectives.push('includeSubDomains');
    }
    if (config.hsts.preload) {
      hstsDirectives.push('preload');
    }
    headers.set('Strict-Transport-Security', hstsDirectives.join('; '));
  }

  // X-Frame-Options
  if (config.frameOptions) {
    headers.set('X-Frame-Options', config.frameOptions);
  }

  // X-Content-Type-Options
  if (config.contentTypeOptions) {
    headers.set('X-Content-Type-Options', 'nosniff');
  }

  // Referrer-Policy
  if (config.referrerPolicy) {
    headers.set('Referrer-Policy', config.referrerPolicy);
  }

  // Permissions-Policy
  if (config.permissionsPolicy) {
    const permissionsPolicy = buildPermissionsPolicyHeader(config.permissionsPolicy);
    if (permissionsPolicy) {
      headers.set('Permissions-Policy', permissionsPolicy);
    }
  }

  // X-XSS-Protection (legacy, but still useful for older browsers)
  headers.set('X-XSS-Protection', '1; mode=block');

  // X-DNS-Prefetch-Control
  headers.set('X-DNS-Prefetch-Control', 'off');
}

/**
 * Add CORS headers to response
 */
export function addCorsHeaders(
  headers: Headers,
  request: Request,
  config: SecurityConfig['cors'] = DEFAULT_SECURITY_CONFIG.cors
): void {
  if (!config) return;

  const origin = request.headers.get('Origin');

  // Access-Control-Allow-Origin
  if (config.allowedOrigins?.includes('*')) {
    headers.set('Access-Control-Allow-Origin', '*');
  } else if (origin && config.allowedOrigins && isOriginAllowed(origin, config.allowedOrigins)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  }

  // Access-Control-Allow-Methods
  if (config.allowedMethods && config.allowedMethods.length > 0) {
    headers.set('Access-Control-Allow-Methods', config.allowedMethods.join(', '));
  }

  // Access-Control-Allow-Headers
  if (config.allowedHeaders && config.allowedHeaders.length > 0) {
    headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
  }

  // Access-Control-Max-Age
  if (config.maxAge) {
    headers.set('Access-Control-Max-Age', config.maxAge.toString());
  }

  // Access-Control-Allow-Credentials
  if (config.credentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightthe(
  request: Request,
  config: SecurityConfig['cors'] = DEFAULT_SECURITY_CONFIG.cors
): Response | null {
  if (request.method !== 'OPTIONS') {
    return null;
  }

  const headers = new Headers();
  addCorsHeaders(headers, request, config);

  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * Security headers middleware
 */
export function securityHeadersMiddleware(
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): (request: Request) => Response | null {
  return (request: Request) => {
    // Handle CORS preflight
    return handleCorsPreflightthe(request, config.cors);
  };
}

/**
 * Apply security headers to an existing response
 */
export function applySecurityHeaders(
  response: Response,
  request: Request,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): Response {
  const headers = new Headers(response.headers);

  // Add security headers
  addSecurityHeaders(headers, config);

  // Add CORS headers
  addCorsHeaders(headers, request, config.cors);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Production security configuration (stricter)
 */
export const PRODUCTION_SECURITY_CONFIG: SecurityConfig = {
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  cors: {
    allowedOrigins: [], // Must be explicitly configured
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
    credentials: true,
  },

  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  frameOptions: 'DENY',
  contentTypeOptions: true,
  referrerPolicy: 'strict-origin-when-cross-origin',

  permissionsPolicy: {
    geolocation: [],
    microphone: [],
    camera: [],
    payment: [],
    usb: [],
    magnetometer: [],
    gyroscope: [],
    accelerometer: [],
  },
};

/**
 * Development security configuration (more permissive)
 */
export const DEVELOPMENT_SECURITY_CONFIG: SecurityConfig = {
  ...DEFAULT_SECURITY_CONFIG,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
    credentials: false,
  },
};
