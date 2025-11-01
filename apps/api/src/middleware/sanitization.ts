/**
 * Input Sanitization Middleware
 * Sanitizes user inputs to prevent XSS, SQL injection, and other attacks
 */

/**
 * HTML entities to escape
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"'\/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Remove HTML tags from input
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize for SQL (prevent SQL injection)
 * Note: This is a basic implementation. Use parameterized queries with Supabase client
 */
export function sanitizeForSql(input: string): string {
  // Remove SQL special characters and keywords
  return input
    .replace(/['";\\]/g, '') // Remove quotes and backslash
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comments start
    .replace(/\*\//g, '') // Remove block comments end
    .replace(/\bOR\b/gi, '') // Remove OR keyword
    .replace(/\bAND\b/gi, '') // Remove AND keyword
    .replace(/\bUNION\b/gi, '') // Remove UNION keyword
    .replace(/\bSELECT\b/gi, '') // Remove SELECT keyword
    .replace(/\bINSERT\b/gi, '') // Remove INSERT keyword
    .replace(/\bUPDATE\b/gi, '') // Remove UPDATE keyword
    .replace(/\bDELETE\b/gi, '') // Remove DELETE keyword
    .replace(/\bDROP\b/gi, '') // Remove DROP keyword
    .replace(/\bEXEC\b/gi, '') // Remove EXEC keyword
    .replace(/\bSCRIPT\b/gi, ''); // Remove SCRIPT keyword
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate alphanumeric with specific allowed characters
 */
export function isValidAlphanumeric(input: string, allowedChars: string = '-_'): boolean {
  const regex = new RegExp(`^[a-zA-Z0-9${allowedChars}]+$`);
  return regex.test(input);
}

/**
 * Sanitize metadata fields
 */
export interface Metadata {
  name?: string;
  description?: string;
  tags?: string[];
  [key: string]: any;
}

export function sanitizeMetadata(metadata: Metadata): Metadata {
  const sanitized: Metadata = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Sanitize key
    const sanitizedKey = escapeHtml(key).substring(0, 100);

    if (typeof value === 'string') {
      // Sanitize string values
      sanitized[sanitizedKey] = escapeHtml(value).substring(0, 1000);
    } else if (Array.isArray(value)) {
      // Sanitize array values
      sanitized[sanitizedKey] = value
        .filter((item) => typeof item === 'string')
        .map((item) => escapeHtml(item).substring(0, 100))
        .slice(0, 50); // Max 50 items
    } else if (typeof value === 'number') {
      // Numbers are safe
      sanitized[sanitizedKey] = value;
    } else if (typeof value === 'boolean') {
      // Booleans are safe
      sanitized[sanitizedKey] = value;
    }
    // Skip other types (objects, functions, etc.)
  }

  return sanitized;
}

/**
 * Sanitize query parameters
 */
export function sanitizeQueryParams(url: URL): Record<string, string> {
  const params: Record<string, string> = {};

  for (const [key, value] of url.searchParams.entries()) {
    const sanitizedKey = escapeHtml(key).substring(0, 100);
    const sanitizedValue = escapeHtml(value).substring(0, 1000);
    params[sanitizedKey] = sanitizedValue;
  }

  return params;
}

/**
 * Sanitize JSON body
 */
export async function sanitizeJsonBody(request: Request): Promise<any> {
  try {
    const body = await request.json();

    if (typeof body === 'object' && body !== null) {
      return sanitizeMetadata(body as Metadata);
    }

    return body;
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
}

/**
 * Validate and sanitize path parameters
 */
export function sanitizePathParam(param: string, type: 'uuid' | 'alphanumeric' | 'filename' = 'alphanumeric'): string | null {
  // Remove leading/trailing whitespace
  param = param.trim();

  switch (type) {
    case 'uuid':
      return isValidUuid(param) ? param : null;

    case 'alphanumeric':
      return isValidAlphanumeric(param) ? param.substring(0, 255) : null;

    case 'filename':
      // For filenames, allow more characters but still sanitize
      const sanitized = param.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);
      return sanitized || null;

    default:
      return escapeHtml(param).substring(0, 255);
  }
}

/**
 * Check for common XSS patterns
 */
export function containsXssPattern(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<applet/gi,
    /eval\(/gi,
    /expression\(/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Check for common SQL injection patterns
 */
export function containsSqlInjectionPattern(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(UNION\s+SELECT)/gi,
    /('\s+OR\s+'1'\s*=\s*'1)/gi,
    /('\s+OR\s+1\s*=\s*1)/gi,
    /(;\s*DROP\s+TABLE)/gi,
    /(--)/g,
    /(\/\*|\*\/)/g,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Comprehensive input validation
 */
export interface ValidationResult {
  valid: boolean;
  sanitized?: any;
  errors: string[];
}

export function validateInput(input: any, rules: {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowHtml?: boolean;
  allowSql?: boolean;
}): ValidationResult {
  const errors: string[] = [];

  // Required check
  if (rules.required && (input === undefined || input === null || input === '')) {
    errors.push('Field is required');
    return { valid: false, errors };
  }

  // Type check
  if (rules.type && typeof input !== rules.type) {
    errors.push(`Expected type ${rules.type}, got ${typeof input}`);
    return { valid: false, errors };
  }

  // String-specific validations
  if (typeof input === 'string') {
    // Length checks
    if (rules.minLength !== undefined && input.length < rules.minLength) {
      errors.push(`Minimum length is ${rules.minLength}`);
    }

    if (rules.maxLength !== undefined && input.length > rules.maxLength) {
      errors.push(`Maximum length is ${rules.maxLength}`);
    }

    // Pattern check
    if (rules.pattern && !rules.pattern.test(input)) {
      errors.push('Input does not match required pattern');
    }

    // XSS check
    if (!rules.allowHtml && containsXssPattern(input)) {
      errors.push('Input contains potentially dangerous HTML/JavaScript');
    }

    // SQL injection check
    if (!rules.allowSql && containsSqlInjectionPattern(input)) {
      errors.push('Input contains potentially dangerous SQL patterns');
    }

    // Sanitize if valid
    if (errors.length === 0) {
      return {
        valid: true,
        sanitized: rules.allowHtml ? input : escapeHtml(input),
        errors: [],
      };
    }
  }

  return {
    valid: errors.length === 0,
    sanitized: input,
    errors,
  };
}

/**
 * Sanitization middleware
 */
export async function sanitizationMiddleware(
  request: Request
): Promise<Response | null> {
  const url = new URL(request.url);

  // Check URL for XSS/SQL injection patterns
  const fullUrl = url.toString();
  if (containsXssPattern(fullUrl) || containsSqlInjectionPattern(fullUrl)) {
    return new Response(
      JSON.stringify({
        error: 'Invalid request: URL contains potentially dangerous patterns',
        code: 'INVALID_INPUT',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Validate query parameters
  for (const [key, value] of url.searchParams.entries()) {
    if (containsXssPattern(value) || containsSqlInjectionPattern(value)) {
      return new Response(
        JSON.stringify({
          error: `Invalid query parameter '${escapeHtml(key)}': contains potentially dangerous patterns`,
          code: 'INVALID_INPUT',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // For JSON requests, validate body
  if (request.method !== 'GET' && request.headers.get('content-type')?.includes('application/json')) {
    try {
      const body = await request.clone().json();
      const bodyString = JSON.stringify(body);

      if (containsXssPattern(bodyString) || containsSqlInjectionPattern(bodyString)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid request body: contains potentially dangerous patterns',
            code: 'INVALID_INPUT',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    } catch (error) {
      // Invalid JSON will be caught by other middleware
    }
  }

  return null; // Pass through
}
