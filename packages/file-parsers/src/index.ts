/**
 * Fish finder file format parsers
 *
 * Universal parser with automatic format detection
 * Supports: Lowrance, Garmin, Humminbird, Raymarine
 */

import { parseLowranceFile } from './lowrance';
import { parseGarminFile } from './garmin';
import { parseHumminbirdFile } from './humminbird';
import { parseRaymarineFile } from './raymarine';

export { parseLowranceFile } from './lowrance';
export { parseGarminFile } from './garmin';
export { parseHumminbirdFile } from './humminbird';
export { parseRaymarineFile } from './raymarine';

export type {
  ParseResult,
  ParserResult,
  Track,
  TrackPoint,
  Route,
  DepthReading,
  SonarMetadata,
  FileMetadata,
  FileFormat,
  Coordinate,
} from './types';

/**
 * Supported file extensions mapped to their parsers
 */
const FILE_EXTENSION_MAP: Record<string, 'lowrance' | 'garmin' | 'humminbird' | 'raymarine'> = {
  // Lowrance
  slg: 'lowrance',
  sl2: 'lowrance',
  sl3: 'lowrance',
  usr: 'lowrance',

  // Garmin
  gpx: 'garmin',
  adm: 'garmin',

  // Humminbird
  dat: 'humminbird',
  son: 'humminbird',

  // Raymarine
  fsh: 'raymarine',
};

/**
 * Auto-detect file format and parse accordingly
 *
 * This is the recommended entry point for parsing fish finder files.
 * It automatically detects the file format based on extension and content,
 * then routes to the appropriate parser.
 *
 * @param file - File or Blob to parse
 * @returns ParseResult with waypoints, tracks, routes, and depth data
 *
 * @example
 * ```typescript
 * const result = await parseFile(file);
 * if (result.success) {
 *   console.log(`Found ${result.waypoints.length} waypoints`);
 *   console.log(`Found ${result.tracks.length} tracks`);
 *   console.log(`Device: ${result.fileMetadata.device}`);
 * }
 * ```
 */
export async function parseFile(file: File | Blob) {
  const fileName = (file as File).name || 'unknown';
  const ext = fileName.toLowerCase().split('.').pop() || '';

  // Try extension-based detection first
  const deviceType = FILE_EXTENSION_MAP[ext];

  if (deviceType) {
    return routeToParser(file, deviceType);
  }

  // Fall back to content-based detection
  const detectedDevice = await detectFileFormat(file);

  if (detectedDevice) {
    return routeToParser(file, detectedDevice);
  }

  // Default: try Garmin (most likely to be XML/GPX)
  return parseGarminFile(file);
}

/**
 * Route file to the appropriate parser
 */
async function routeToParser(
  file: File | Blob,
  device: 'lowrance' | 'garmin' | 'humminbird' | 'raymarine'
) {
  switch (device) {
    case 'lowrance':
      return parseLowranceFile(file);
    case 'garmin':
      return parseGarminFile(file);
    case 'humminbird':
      return parseHumminbirdFile(file);
    case 'raymarine':
      return parseRaymarineFile(file);
  }
}

/**
 * Detect file format by examining file content
 *
 * Reads the first few bytes to identify the file signature
 */
async function detectFileFormat(
  file: File | Blob
): Promise<'lowrance' | 'garmin' | 'humminbird' | 'raymarine' | null> {
  try {
    // Read first 16 bytes for signature detection
    const blob = file.slice(0, 16);
    const arrayBuffer = await blob.arrayBuffer();
    const dataView = new DataView(arrayBuffer);

    // Check for text-based formats first
    const text = new TextDecoder().decode(arrayBuffer);

    // GPX files (Garmin) - XML format
    if (text.includes('<?xml') || text.includes('<gpx')) {
      return 'garmin';
    }

    // Binary format detection
    const sig3 = String.fromCharCode(
      dataView.getUint8(0),
      dataView.getUint8(1),
      dataView.getUint8(2)
    );

    // Lowrance signatures
    if (sig3 === 'slg' || sig3 === 'sl2' || sig3 === 'sl3') {
      return 'lowrance';
    }

    // Humminbird signatures
    if (sig3 === 'HMB' || sig3 === 'SON') {
      return 'humminbird';
    }

    // Raymarine signature
    if (sig3 === 'FSH') {
      return 'raymarine';
    }

    // Garmin ADM signature (6 bytes)
    const sig6 = String.fromCharCode(
      dataView.getUint8(0),
      dataView.getUint8(1),
      dataView.getUint8(2),
      dataView.getUint8(3),
      dataView.getUint8(4),
      dataView.getUint8(5)
    );

    if (sig6 === 'GARMIN') {
      return 'garmin';
    }

    return null;
  } catch (error) {
    console.warn('Error detecting file format:', error);
    return null;
  }
}

/**
 * Get information about a file format without parsing the entire file
 *
 * @param file - File to inspect
 * @returns File format information
 */
export async function getFileInfo(file: File | Blob): Promise<{
  device: 'lowrance' | 'garmin' | 'humminbird' | 'raymarine' | 'unknown';
  formatType: 'binary' | 'xml' | 'unknown';
  extension: string;
  size: number;
  sizeFormatted: string;
}> {
  const fileName = (file as File).name || 'unknown';
  const ext = fileName.toLowerCase().split('.').pop() || '';

  const detectedDevice = FILE_EXTENSION_MAP[ext] || (await detectFileFormat(file)) || 'unknown';

  // Determine format type
  let formatType: 'binary' | 'xml' | 'unknown' = 'unknown';
  if (ext === 'gpx') {
    formatType = 'xml';
  } else if (['slg', 'sl2', 'sl3', 'adm', 'dat', 'son', 'fsh', 'usr'].includes(ext)) {
    formatType = 'binary';
  }

  // Format file size
  const sizeKB = file.size / 1024;
  const sizeMB = sizeKB / 1024;
  const sizeFormatted =
    sizeMB >= 1
      ? `${sizeMB.toFixed(2)} MB`
      : sizeKB >= 1
      ? `${sizeKB.toFixed(2)} KB`
      : `${file.size} bytes`;

  return {
    device: detectedDevice,
    formatType,
    extension: ext,
    size: file.size,
    sizeFormatted,
  };
}

/**
 * Validate if a file is a supported fish finder format
 *
 * @param file - File to validate
 * @returns true if file is supported
 */
export async function isSupportedFormat(file: File | Blob): Promise<boolean> {
  const fileName = (file as File).name || '';
  const ext = fileName.toLowerCase().split('.').pop() || '';

  // Check extension
  if (FILE_EXTENSION_MAP[ext]) {
    return true;
  }

  // Check content
  const detectedDevice = await detectFileFormat(file);
  return detectedDevice !== null;
}

/**
 * Get list of all supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return Object.keys(FILE_EXTENSION_MAP);
}

/**
 * Get list of supported extensions for a specific device
 */
export function getDeviceExtensions(
  device: 'lowrance' | 'garmin' | 'humminbird' | 'raymarine'
): string[] {
  return Object.entries(FILE_EXTENSION_MAP)
    .filter(([, dev]) => dev === device)
    .map(([ext]) => ext);
}

/**
 * Create a file input accept attribute string for all supported formats
 *
 * @example
 * ```typescript
 * <input type="file" accept={getAcceptString()} />
 * ```
 */
export function getAcceptString(): string {
  return getSupportedExtensions()
    .map((ext) => `.${ext}`)
    .join(',');
}
