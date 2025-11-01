/**
 * Humminbird fish finder file parser
 * Supports .dat (track files) and .son (sonar files - metadata only)
 *
 * Binary format specifications:
 * - Little-endian byte order
 * - DAT files contain waypoints and track data
 * - SON files contain sonar imagery (we only extract metadata)
 */

import type { Waypoint } from '@fmap/shared-types';
import { generateId } from '@fmap/shared-utils';
import type {
  ParseResult,
  Track,
  TrackPoint,
  DepthReading,
  FileMetadata,
  SonarMetadata,
} from './types';

// Humminbird record types
const RECORD_TYPES = {
  WAYPOINT: 0x01,
  TRACK_HEADER: 0x02,
  TRACK_POINT: 0x03,
  SONAR_CONFIG: 0x04,
  DEPTH_READING: 0x05,
} as const;

interface HumminbirdHeader {
  version: number;
  recordCount: number;
  createdDate: Date;
}

/**
 * Parse Humminbird fish finder files (.dat, .son)
 */
export async function parseHumminbirdFile(
  file: File | Blob
): Promise<ParseResult> {
  try {
    const fileName = (file as File).name || 'unknown';
    const ext = fileName.toLowerCase().split('.').pop();

    // Route to appropriate parser
    if (ext === 'son') {
      return parseSONFile(file, fileName);
    } else {
      return parseDATFile(file, fileName);
    }
  } catch (error) {
    const fileMetadata: FileMetadata = {
      fileName: (file as File).name || 'unknown',
      fileType: 'Humminbird',
      fileSize: file.size,
      device: 'humminbird',
    };
    return createErrorResult(
      fileMetadata,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Parse Humminbird DAT (track) file
 */
async function parseDATFile(
  file: File | Blob,
  fileName: string
): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);

    const fileMetadata: FileMetadata = {
      fileName,
      fileType: 'Humminbird Track (.dat)',
      fileSize: arrayBuffer.byteLength,
      device: 'humminbird',
    };

    // Parse header
    const header = parseHeader(dataView);
    if (!header) {
      return createErrorResult(fileMetadata, 'Invalid Humminbird DAT file header');
    }

    fileMetadata.createdDate = header.createdDate;

    const waypoints: Waypoint[] = [];
    const tracks: Track[] = [];
    const depthReadings: DepthReading[] = [];
    let sonarMetadata: SonarMetadata | undefined;

    // Track building state
    let currentTrack: TrackPoint[] = [];
    let currentTrackName = 'Track 1';
    let trackCount = 0;

    // Parse records
    let offset = 16; // After header

    while (offset < dataView.byteLength - 8) {
      try {
        const recordType = dataView.getUint8(offset);
        const recordSize = dataView.getUint16(offset + 1, true);

        switch (recordType) {
          case RECORD_TYPES.WAYPOINT:
            const waypoint = parseWaypoint(dataView, offset + 3);
            if (waypoint) waypoints.push(waypoint);
            break;

          case RECORD_TYPES.TRACK_HEADER:
            // Save previous track if exists
            if (currentTrack.length > 0) {
              tracks.push({
                id: generateId(),
                name: currentTrackName,
                points: currentTrack,
                timestamp: currentTrack[0]?.timestamp,
              });
            }

            // Start new track
            currentTrackName = parseTrackName(dataView, offset + 3);
            currentTrack = [];
            trackCount++;
            break;

          case RECORD_TYPES.TRACK_POINT:
            const trackPoint = parseTrackPoint(dataView, offset + 3);
            if (trackPoint) currentTrack.push(trackPoint);
            break;

          case RECORD_TYPES.SONAR_CONFIG:
            if (!sonarMetadata) {
              const metadata = parseSonarConfig(dataView, offset + 3);
              if (metadata) sonarMetadata = metadata;
            }
            break;

          case RECORD_TYPES.DEPTH_READING:
            const depthReading = parseDepthReading(dataView, offset + 3);
            if (depthReading) depthReadings.push(depthReading);
            break;
        }

        offset += 3 + recordSize;
      } catch (error) {
        console.warn(`Skipping corrupted record at offset ${offset}:`, error);
        offset += 64;
      }
    }

    // Save final track
    if (currentTrack.length > 0) {
      tracks.push({
        id: generateId(),
        name: currentTrackName,
        points: currentTrack,
        timestamp: currentTrack[0]?.timestamp,
      });
    }

    return {
      success: waypoints.length > 0 || tracks.length > 0 || depthReadings.length > 0,
      waypoints,
      tracks,
      routes: [],
      depthReadings,
      sonarMetadata,
      fileMetadata,
      error: waypoints.length === 0 && tracks.length === 0 && depthReadings.length === 0
        ? 'No data found in file'
        : undefined,
    };
  } catch (error) {
    const fileMetadata: FileMetadata = {
      fileName,
      fileType: 'Humminbird DAT',
      fileSize: file.size,
      device: 'humminbird',
    };
    return createErrorResult(
      fileMetadata,
      error instanceof Error ? error.message : 'Failed to parse DAT file'
    );
  }
}

/**
 * Parse Humminbird SON (sonar) file - metadata only
 */
async function parseSONFile(
  file: File | Blob,
  fileName: string
): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);

    const fileMetadata: FileMetadata = {
      fileName,
      fileType: 'Humminbird Sonar (.son)',
      fileSize: arrayBuffer.byteLength,
      device: 'humminbird',
    };

    // SON file header contains sonar configuration
    const metadata = parseSONHeader(dataView);

    return {
      success: true,
      waypoints: [],
      tracks: [],
      routes: [],
      depthReadings: [],
      sonarMetadata: metadata || undefined,
      fileMetadata,
      error: undefined,
    };
  } catch (error) {
    const fileMetadata: FileMetadata = {
      fileName,
      fileType: 'Humminbird SON',
      fileSize: file.size,
      device: 'humminbird',
    };
    return createErrorResult(
      fileMetadata,
      error instanceof Error ? error.message : 'Failed to parse SON file'
    );
  }
}

/**
 * Parse DAT file header
 */
function parseHeader(dataView: DataView): HumminbirdHeader | null {
  try {
    // Signature: 'HMB' (3 bytes)
    const sig = String.fromCharCode(
      dataView.getUint8(0),
      dataView.getUint8(1),
      dataView.getUint8(2)
    );

    if (sig !== 'HMB') return null;

    const version = dataView.getUint16(4, true);
    const recordCount = dataView.getUint32(8, true);
    const timestamp = dataView.getUint32(12, true);
    const createdDate = new Date(timestamp * 1000);

    return {
      version,
      recordCount,
      createdDate,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse waypoint record
 */
function parseWaypoint(dataView: DataView, offset: number): Waypoint | null {
  try {
    // Latitude (4 bytes, float, degrees)
    const latitude = dataView.getFloat32(offset, true);

    // Longitude (4 bytes, float, degrees)
    const longitude = dataView.getFloat32(offset + 4, true);

    // Timestamp (4 bytes, Unix timestamp)
    const timestamp = new Date(dataView.getUint32(offset + 8, true) * 1000);

    // Name length (1 byte)
    const nameLength = dataView.getUint8(offset + 12);

    // Name (variable length, max 32 bytes)
    let name = '';
    for (let i = 0; i < nameLength && i < 32; i++) {
      const charCode = dataView.getUint8(offset + 13 + i);
      if (charCode === 0) break;
      name += String.fromCharCode(charCode);
    }

    // Depth (4 bytes, float, feet - convert to meters)
    const depthFeet = dataView.getFloat32(offset + 45, true);
    const depth = depthFeet * 0.3048; // Convert feet to meters

    // Temperature (4 bytes, float, Fahrenheit - convert to Celsius)
    const tempF = dataView.getFloat32(offset + 49, true);
    const temperature = (tempF - 32) * (5 / 9);

    return {
      id: generateId(),
      name: name || 'Unnamed Waypoint',
      latitude,
      longitude,
      depth: depth > 0 ? depth : undefined,
      temperature: tempF > 0 ? temperature : undefined,
      timestamp,
      device: 'humminbird',
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse track name from header
 */
function parseTrackName(dataView: DataView, offset: number): string {
  try {
    const nameLength = dataView.getUint8(offset);
    let name = '';

    for (let i = 0; i < nameLength && i < 32; i++) {
      const charCode = dataView.getUint8(offset + 1 + i);
      if (charCode === 0) break;
      name += String.fromCharCode(charCode);
    }

    return name || 'Unnamed Track';
  } catch (error) {
    return 'Unnamed Track';
  }
}

/**
 * Parse track point record
 */
function parseTrackPoint(dataView: DataView, offset: number): TrackPoint | null {
  try {
    const latitude = dataView.getFloat32(offset, true);
    const longitude = dataView.getFloat32(offset + 4, true);
    const timestamp = new Date(dataView.getUint32(offset + 8, true) * 1000);

    // Depth in feet, convert to meters
    const depthFeet = dataView.getFloat32(offset + 12, true);
    const depth = depthFeet * 0.3048;

    // Speed in mph, convert to m/s
    const speedMph = dataView.getFloat32(offset + 16, true);
    const speed = speedMph * 0.44704;

    // Temperature in Fahrenheit, convert to Celsius
    const tempF = dataView.getFloat32(offset + 20, true);
    const temperature = (tempF - 32) * (5 / 9);

    return {
      latitude,
      longitude,
      timestamp,
      depth: depth > 0 ? depth : undefined,
      speed: speed > 0 ? speed : undefined,
      temperature: tempF > 0 ? temperature : undefined,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse depth reading record
 */
function parseDepthReading(dataView: DataView, offset: number): DepthReading | null {
  try {
    const latitude = dataView.getFloat32(offset, true);
    const longitude = dataView.getFloat32(offset + 4, true);

    // Depth in feet, convert to meters
    const depthFeet = dataView.getFloat32(offset + 8, true);
    const depth = depthFeet * 0.3048;

    const timestamp = new Date(dataView.getUint32(offset + 12, true) * 1000);

    // Frequency in kHz
    const frequency = dataView.getUint16(offset + 16, true);

    // Temperature in Fahrenheit, convert to Celsius
    const tempF = dataView.getFloat32(offset + 18, true);
    const temperature = (tempF - 32) * (5 / 9);

    return {
      latitude,
      longitude,
      depth,
      timestamp,
      frequency: frequency > 0 ? frequency : undefined,
      temperature: tempF > 0 ? temperature : undefined,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse sonar configuration record
 */
function parseSonarConfig(dataView: DataView, offset: number): SonarMetadata | null {
  try {
    const frequency = dataView.getUint16(offset, true); // kHz

    // Range in feet, convert to meters
    const rangeFeet = dataView.getFloat32(offset + 2, true);
    const range = rangeFeet * 0.3048;

    const gain = dataView.getFloat32(offset + 6, true);
    const chartSpeed = dataView.getFloat32(offset + 10, true);

    // Color palette ID
    const paletteId = dataView.getUint8(offset + 14);
    const colorPalette = paletteId === 1 ? 'High Contrast' : 'Standard';

    return {
      frequency,
      range,
      gain,
      chartSpeed,
      colorPalette,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse SON file header for sonar metadata
 */
function parseSONHeader(dataView: DataView): SonarMetadata | null {
  try {
    // SON header structure
    // Offset 0-3: Signature 'SON'
    const sig = String.fromCharCode(
      dataView.getUint8(0),
      dataView.getUint8(1),
      dataView.getUint8(2)
    );

    if (sig !== 'SON') return null;

    // Offset 8: Sonar type (0=primary, 1=secondary, 2=downscan, 3=sidescan)
    const sonarType = dataView.getUint8(8);

    // Offset 12: Frequency in kHz
    const frequency = dataView.getUint16(12, true);

    // Offset 16: Range in cm, convert to meters
    const rangeCm = dataView.getUint32(16, true);
    const range = rangeCm / 100;

    // Offset 24: Upper/lower limit (gain equivalent)
    const gain = dataView.getFloat32(24, true);

    // Chart speed
    const chartSpeed = dataView.getFloat32(28, true);

    const colorPalette = sonarType === 2 ? 'DownScan' :
                         sonarType === 3 ? 'SideScan' : 'Standard';

    return {
      frequency,
      range,
      gain,
      chartSpeed,
      colorPalette,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Create error result
 */
function createErrorResult(fileMetadata: FileMetadata, error: string): ParseResult {
  return {
    success: false,
    waypoints: [],
    tracks: [],
    routes: [],
    depthReadings: [],
    fileMetadata,
    error,
  };
}
