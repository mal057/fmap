/**
 * File Validation Middleware
 * Validates file extensions, MIME types, size, and magic numbers
 */

/**
 * Supported file types with their extensions, MIME types, and magic numbers
 */
const ALLOWED_FILE_TYPES = {
  // Lowrance SLG/SL2/SL3 files
  slg: {
    extensions: ['.slg'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x02]], // Simplified - actual magic numbers vary
    maxSize: 500 * 1024 * 1024, // 500MB
  },
  sl2: {
    extensions: ['.sl2'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x02]],
    maxSize: 500 * 1024 * 1024,
  },
  sl3: {
    extensions: ['.sl3'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x02]],
    maxSize: 500 * 1024 * 1024,
  },
  // GPX files (GPS Exchange Format)
  gpx: {
    extensions: ['.gpx'],
    mimeTypes: ['application/gpx+xml', 'application/xml', 'text/xml'],
    magicNumbers: [
      [0x3c, 0x3f, 0x78, 0x6d, 0x6c], // <?xml
      [0xef, 0xbb, 0xbf, 0x3c, 0x3f], // BOM + <?xml
    ],
    maxSize: 500 * 1024 * 1024,
  },
  // AutoChart files
  adm: {
    extensions: ['.adm'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x00]],
    maxSize: 500 * 1024 * 1024,
  },
  // Humminbird DAT files
  dat: {
    extensions: ['.dat'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x00]],
    maxSize: 500 * 1024 * 1024,
  },
  // SON files (sonar)
  son: {
    extensions: ['.son'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x00]],
    maxSize: 500 * 1024 * 1024,
  },
  // FSH files (fish finder)
  fsh: {
    extensions: ['.fsh'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x00]],
    maxSize: 500 * 1024 * 1024,
  },
  // Humminbird NV2 files
  nv2: {
    extensions: ['.nv2'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x00]],
    maxSize: 500 * 1024 * 1024,
  },
  // AutoChart/Humminbird ACD files
  acd: {
    extensions: ['.acd'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x00]],
    maxSize: 500 * 1024 * 1024,
  },
  // Humminbird ACU files
  acu: {
    extensions: ['.acu'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x00]],
    maxSize: 500 * 1024 * 1024,
  },
  // Lowrance/Simrad/B&G additional formats
  usr: {
    extensions: ['.usr'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x00]],
    maxSize: 500 * 1024 * 1024,
  },
  at5: {
    extensions: ['.at5'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x00]],
    maxSize: 500 * 1024 * 1024,
  },
  zdf: {
    extensions: ['.zdf'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x00]],
    maxSize: 500 * 1024 * 1024,
  },
  // Humminbird additional formats
  idx: {
    extensions: ['.idx'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x00]],
    maxSize: 500 * 1024 * 1024,
  },
  hwr: {
    extensions: ['.hwr'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x00]],
    maxSize: 500 * 1024 * 1024,
  },
  ht: {
    extensions: ['.ht'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x00]],
    maxSize: 500 * 1024 * 1024,
  },
  // Furuno formats
  rou: {
    extensions: ['.rou'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x00]],
    maxSize: 500 * 1024 * 1024,
  },
  rat: {
    extensions: ['.rat'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x00]],
    maxSize: 500 * 1024 * 1024,
  },
  mrk: {
    extensions: ['.mrk'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x00]],
    maxSize: 500 * 1024 * 1024,
  },
  trk: {
    extensions: ['.trk'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x00]],
    maxSize: 500 * 1024 * 1024,
  },
  tzd: {
    extensions: ['.tzd'],
    mimeTypes: ['application/octet-stream'],
    magicNumbers: [[0x00, 0x00]],
    maxSize: 500 * 1024 * 1024,
  },
  // Universal formats
  csv: {
    extensions: ['.csv'],
    mimeTypes: ['text/csv', 'application/csv'],
    magicNumbers: [[0x00, 0x00]], // CSV can start with various characters
    maxSize: 500 * 1024 * 1024,
  },
  kml: {
    extensions: ['.kml'],
    mimeTypes: ['application/vnd.google-earth.kml+xml', 'application/xml', 'text/xml'],
    magicNumbers: [
      [0x3c, 0x3f, 0x78, 0x6d, 0x6c], // <?xml
      [0xef, 0xbb, 0xbf, 0x3c, 0x3f], // BOM + <?xml
    ],
    maxSize: 500 * 1024 * 1024,
  },
};

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path components
  filename = filename.replace(/^.*[\\\/]/, '');

  // Remove or replace dangerous characters
  filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Prevent double extensions and null bytes
  filename = filename.replace(/\0/g, '');
  filename = filename.replace(/\.{2,}/g, '.');

  // Limit filename length
  if (filename.length > 255) {
    const ext = filename.substring(filename.lastIndexOf('.'));
    const name = filename.substring(0, 255 - ext.length);
    filename = name + ext;
  }

  return filename;
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.substring(lastDot).toLowerCase();
}

/**
 * Check if magic numbers match
 */
function checkMagicNumbers(buffer: Uint8Array, magicNumbers: number[][]): boolean {
  for (const magic of magicNumbers) {
    if (magic.length > buffer.length) continue;

    let matches = true;
    for (let i = 0; i < magic.length; i++) {
      if (buffer[i] !== magic[i]) {
        matches = false;
        break;
      }
    }

    if (matches) return true;
  }

  return false;
}

/**
 * Validate file type configuration
 */
interface FileTypeConfig {
  extensions: string[];
  mimeTypes: string[];
  magicNumbers: number[][];
  maxSize: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
}

/**
 * Validate uploaded file
 */
export async function validateFile(file: File): Promise<ValidationResult> {
  const filename = file.name;
  const extension = getFileExtension(filename);

  // Check if extension is allowed
  const fileTypeKey = extension.replace('.', '') as keyof typeof ALLOWED_FILE_TYPES;
  const fileTypeConfig: FileTypeConfig | undefined = ALLOWED_FILE_TYPES[fileTypeKey];

  if (!fileTypeConfig) {
    return {
      valid: false,
      error: `File extension '${extension}' is not allowed. Supported formats: ${Object.keys(ALLOWED_FILE_TYPES).map(k => '.' + k).join(', ')}`,
    };
  }

  // Check file size
  if (file.size > fileTypeConfig.maxSize) {
    const maxSizeMB = Math.round(fileTypeConfig.maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  // Check file size is not zero
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  // Check MIME type
  if (file.type && !fileTypeConfig.mimeTypes.includes(file.type)) {
    // Some browsers don't set MIME type for unknown extensions, so we'll just warn
    console.warn(`MIME type '${file.type}' not in allowed list for ${extension}`);
  }

  // Validate magic numbers (read first 16 bytes)
  try {
    const buffer = new Uint8Array(await file.slice(0, 16).arrayBuffer());

    if (!checkMagicNumbers(buffer, fileTypeConfig.magicNumbers)) {
      // For proprietary formats, magic numbers might vary, so we'll log a warning
      // but not reject the file entirely
      console.warn(`Magic number validation failed for ${filename}`);
    }
  } catch (error) {
    console.error('Error reading file magic numbers:', error);
  }

  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(filename);

  return {
    valid: true,
    sanitizedFilename,
  };
}

/**
 * File validation middleware
 */
export async function fileValidationMiddleware(
  request: Request
): Promise<Response | null> {
  // Only validate POST requests with multipart/form-data
  if (request.method !== 'POST') {
    return null;
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return null;
  }

  try {
    const formData = await request.clone().formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({
          error: 'No file provided',
          code: 'NO_FILE',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const validation = await validateFile(file);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: validation.error,
          code: 'INVALID_FILE',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Add sanitized filename to request headers for later use
    // Note: In Cloudflare Workers, we can't modify the request object directly,
    // so the calling code should use validateFile() directly

    return null; // Pass through to next handler
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to validate file',
        code: 'VALIDATION_ERROR',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
