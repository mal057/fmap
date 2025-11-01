/**
 * Lowrance fish finder file parser
 * Supports .slg (SonarLog), .sl2 (StructureScan HD), .sl3 (StructureScan 3D)
 *
 * Binary format specifications:
 * - Little-endian byte order
 * - 8-byte header followed by data blocks
 * - Each block contains frame type, size, and data
 */

import type { Waypoint } from '@fmap/shared-types';
import { generateId } from '@fmap/shared-utils';
import type { ParseResult, Track, TrackPoint, DepthReading, FileMetadata, SonarMetadata } from './types';

// Lowrance frame types
const FRAME_TYPES = {
  WAYPOINT: 0x01,
  TRACK_POINT: 0x02,
  DEPTH_DATA: 0x03,
  SONAR_PRIMARY: 0x04,
  SONAR_SECONDARY: 0x05,
  SONAR_DOWNSCAN: 0x06,
  SONAR_SIDESCAN: 0x07,
  GPS_DATA: 0x08,
  TEMPERATURE: 0x09,
} as const;

interface LowranceHeader {
  signature: string; // 'slg', 'sl2', or 'sl3'
  version: number;
  blockCount: number;
  createdDate: Date;
}

interface LowranceBlock {
  frameType: number;
  size: number;
  offset: number;
}

/**
 * Parse Lowrance fish finder files (.slg, .sl2, .sl3)
 */
export async function parseLowranceFile(
  file: File | Blob
): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);

    // Determine file type
    const fileName = (file as File).name || 'unknown';
    const fileType = getFileType(fileName);

    // Create file metadata
    const fileMetadata: FileMetadata = {
      fileName,
      fileType,
      fileSize: arrayBuffer.byteLength,
      device: 'lowrance',
    };

    // Parse header
    const header = parseHeader(dataView);
    if (!header) {
      return createErrorResult(fileMetadata, 'Invalid Lowrance file header');
    }

    fileMetadata.createdDate = header.createdDate;

    // Initialize result arrays
    const waypoints: Waypoint[] = [];
    const tracks: Track[] = [];
    const depthReadings: DepthReading[] = [];
    let sonarMetadata: SonarMetadata | undefined;

    // Current track being built
    let currentTrack: TrackPoint[] = [];
    let trackId = 0;

    // Parse data blocks
    let offset = 16; // After header
    let blockIndex = 0;

    while (offset < dataView.byteLength - 8 && blockIndex < header.blockCount) {
      try {
        const block = parseBlockHeader(dataView, offset);

        // Parse block data based on frame type
        switch (block.frameType) {
          case FRAME_TYPES.WAYPOINT:
            const waypoint = parseWaypoint(dataView, block.offset);
            if (waypoint) waypoints.push(waypoint);
            break;

          case FRAME_TYPES.TRACK_POINT:
          case FRAME_TYPES.GPS_DATA:
            const trackPoint = parseTrackPoint(dataView, block.offset);
            if (trackPoint) currentTrack.push(trackPoint);
            break;

          case FRAME_TYPES.DEPTH_DATA:
            const depthReading = parseDepthReading(dataView, block.offset);
            if (depthReading) depthReadings.push(depthReading);
            break;

          case FRAME_TYPES.SONAR_PRIMARY:
          case FRAME_TYPES.SONAR_DOWNSCAN:
          case FRAME_TYPES.SONAR_SIDESCAN:
            if (!sonarMetadata) {
              const metadata = parseSonarMetadata(dataView, block.offset, block.frameType);
              if (metadata) sonarMetadata = metadata;
            }
            break;
        }

        // Move to next block
        offset = block.offset + block.size;
        blockIndex++;

      } catch (error) {
        // Skip corrupted blocks
        console.warn(`Skipping corrupted block at offset ${offset}:`, error);
        offset += 64; // Skip ahead
      }
    }

    // Finalize current track if it has points
    if (currentTrack.length > 0) {
      tracks.push({
        id: generateId(),
        name: `Track ${trackId + 1}`,
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
      fileName: (file as File).name || 'unknown',
      fileType: 'unknown',
      fileSize: file.size,
      device: 'lowrance',
    };
    return createErrorResult(
      fileMetadata,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Parse Lowrance file header
 */
function parseHeader(dataView: DataView): LowranceHeader | null {
  try {
    // Read signature (4 bytes)
    const sig = String.fromCharCode(
      dataView.getUint8(0),
      dataView.getUint8(1),
      dataView.getUint8(2)
    );

    // Validate signature
    if (sig !== 'slg' && sig !== 'sl2' && sig !== 'sl3') {
      return null;
    }

    // Read version (2 bytes, little-endian)
    const version = dataView.getUint16(4, true);

    // Read block count (4 bytes, little-endian)
    const blockCount = dataView.getUint32(8, true);

    // Read creation timestamp (4 bytes, Unix timestamp)
    const timestamp = dataView.getUint32(12, true);
    const createdDate = new Date(timestamp * 1000);

    return {
      signature: sig,
      version,
      blockCount,
      createdDate,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse block header
 */
function parseBlockHeader(dataView: DataView, offset: number): LowranceBlock {
  const frameType = dataView.getUint8(offset);
  const size = dataView.getUint32(offset + 1, true);

  return {
    frameType,
    size,
    offset: offset + 5, // Data starts after 5-byte header
  };
}

/**
 * Parse waypoint data
 */
function parseWaypoint(dataView: DataView, offset: number): Waypoint | null {
  try {
    // Latitude (8 bytes, double, little-endian)
    const latitude = dataView.getFloat64(offset, true);

    // Longitude (8 bytes, double, little-endian)
    const longitude = dataView.getFloat64(offset + 8, true);

    // Timestamp (4 bytes, Unix timestamp)
    const timestamp = new Date(dataView.getUint32(offset + 16, true) * 1000);

    // Name length (1 byte)
    const nameLength = dataView.getUint8(offset + 20);

    // Name (variable length)
    let name = '';
    for (let i = 0; i < nameLength && i < 32; i++) {
      const charCode = dataView.getUint8(offset + 21 + i);
      if (charCode === 0) break;
      name += String.fromCharCode(charCode);
    }

    // Depth (4 bytes, float, in meters)
    const depth = dataView.getFloat32(offset + 53, true);

    // Temperature (4 bytes, float, in Celsius)
    const temperature = dataView.getFloat32(offset + 57, true);

    return {
      id: generateId(),
      name: name || 'Unnamed Waypoint',
      latitude,
      longitude,
      depth: depth > 0 ? depth : undefined,
      temperature: temperature > -50 && temperature < 50 ? temperature : undefined,
      timestamp,
      device: 'lowrance',
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse track point data
 */
function parseTrackPoint(dataView: DataView, offset: number): TrackPoint | null {
  try {
    const latitude = dataView.getFloat64(offset, true);
    const longitude = dataView.getFloat64(offset + 8, true);
    const timestamp = new Date(dataView.getUint32(offset + 16, true) * 1000);

    // Optional fields
    const depth = dataView.getFloat32(offset + 20, true);
    const speed = dataView.getFloat32(offset + 24, true);
    const heading = dataView.getFloat32(offset + 28, true);
    const temperature = dataView.getFloat32(offset + 32, true);

    return {
      latitude,
      longitude,
      timestamp,
      depth: depth > 0 ? depth : undefined,
      speed: speed >= 0 ? speed : undefined,
      heading: heading >= 0 && heading < 360 ? heading : undefined,
      temperature: temperature > -50 && temperature < 50 ? temperature : undefined,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse depth reading data
 */
function parseDepthReading(dataView: DataView, offset: number): DepthReading | null {
  try {
    const latitude = dataView.getFloat64(offset, true);
    const longitude = dataView.getFloat64(offset + 8, true);
    const depth = dataView.getFloat32(offset + 16, true);
    const timestamp = new Date(dataView.getUint32(offset + 20, true) * 1000);
    const frequency = dataView.getUint16(offset + 24, true); // kHz
    const temperature = dataView.getFloat32(offset + 26, true);

    return {
      latitude,
      longitude,
      depth,
      timestamp,
      frequency: frequency > 0 ? frequency : undefined,
      temperature: temperature > -50 && temperature < 50 ? temperature : undefined,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse sonar metadata
 */
function parseSonarMetadata(
  dataView: DataView,
  offset: number,
  frameType: number
): SonarMetadata | null {
  try {
    const frequency = dataView.getUint16(offset, true); // kHz
    const range = dataView.getFloat32(offset + 2, true); // meters
    const gain = dataView.getFloat32(offset + 6, true);
    const chartSpeed = dataView.getFloat32(offset + 10, true);

    return {
      frequency,
      range,
      gain,
      chartSpeed,
      colorPalette: frameType === FRAME_TYPES.SONAR_DOWNSCAN ? 'DownScan' : 'Standard',
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get file type from filename
 */
function getFileType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'slg':
      return 'Lowrance SonarLog';
    case 'sl2':
      return 'Lowrance StructureScan HD';
    case 'sl3':
      return 'Lowrance StructureScan 3D';
    default:
      return 'Lowrance Unknown';
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
