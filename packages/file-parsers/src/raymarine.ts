/**
 * Raymarine fish finder file parser
 * Supports ARCHIVE.FSH files
 *
 * Binary format specifications:
 * - Little-endian byte order
 * - FSH files contain waypoints, routes, and tracks
 * - File structure: header + multiple data blocks
 */

import type { Waypoint } from '@fmap/shared-types';
import { generateId } from '@fmap/shared-utils';
import type {
  ParseResult,
  Track,
  TrackPoint,
  Route,
  DepthReading,
  FileMetadata,
} from './types';

// Raymarine block types
const BLOCK_TYPES = {
  WAYPOINT: 0x03,
  ROUTE: 0x04,
  TRACK: 0x05,
  MARK: 0x06, // Fish marks
} as const;

interface RaymarineHeader {
  version: number;
  blockCount: number;
  createdDate: Date;
}

/**
 * Parse Raymarine FSH file
 */
export async function parseRaymarineFile(
  file: File | Blob
): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);

    const fileName = (file as File).name || 'ARCHIVE.FSH';

    const fileMetadata: FileMetadata = {
      fileName,
      fileType: 'Raymarine Archive (.fsh)',
      fileSize: arrayBuffer.byteLength,
      device: 'raymarine',
    };

    // Parse header
    const header = parseHeader(dataView);
    if (!header) {
      return createErrorResult(fileMetadata, 'Invalid Raymarine FSH file header');
    }

    fileMetadata.createdDate = header.createdDate;

    const waypoints: Waypoint[] = [];
    const tracks: Track[] = [];
    const routes: Route[] = [];
    const depthReadings: DepthReading[] = [];

    // Parse data blocks
    let offset = 32; // After header

    while (offset < dataView.byteLength - 16) {
      try {
        const blockType = dataView.getUint16(offset, true);
        const blockSize = dataView.getUint32(offset + 2, true);

        switch (blockType) {
          case BLOCK_TYPES.WAYPOINT:
          case BLOCK_TYPES.MARK:
            const waypoint = parseWaypoint(dataView, offset + 6);
            if (waypoint) {
              waypoints.push(waypoint);

              // Add to depth readings if depth is present
              if (waypoint.depth) {
                depthReadings.push({
                  latitude: waypoint.latitude,
                  longitude: waypoint.longitude,
                  depth: waypoint.depth,
                  timestamp: waypoint.timestamp,
                  temperature: waypoint.temperature,
                });
              }
            }
            break;

          case BLOCK_TYPES.ROUTE:
            const route = parseRoute(dataView, offset + 6, blockSize);
            if (route) routes.push(route);
            break;

          case BLOCK_TYPES.TRACK:
            const track = parseTrack(dataView, offset + 6, blockSize);
            if (track) {
              tracks.push(track);

              // Extract depth readings from track
              for (const point of track.points) {
                if (point.depth) {
                  depthReadings.push({
                    latitude: point.latitude,
                    longitude: point.longitude,
                    depth: point.depth,
                    timestamp: point.timestamp || new Date(),
                    temperature: point.temperature,
                  });
                }
              }
            }
            break;
        }

        offset += 6 + blockSize;
      } catch (error) {
        console.warn(`Skipping corrupted block at offset ${offset}:`, error);
        offset += 64;
      }
    }

    return {
      success: waypoints.length > 0 || tracks.length > 0 || routes.length > 0,
      waypoints,
      tracks,
      routes,
      depthReadings,
      fileMetadata,
      error: waypoints.length === 0 && tracks.length === 0 && routes.length === 0
        ? 'No data found in FSH file'
        : undefined,
    };
  } catch (error) {
    const fileMetadata: FileMetadata = {
      fileName: (file as File).name || 'ARCHIVE.FSH',
      fileType: 'Raymarine FSH',
      fileSize: file.size,
      device: 'raymarine',
    };
    return createErrorResult(
      fileMetadata,
      error instanceof Error ? error.message : 'Failed to parse FSH file'
    );
  }
}

/**
 * Parse FSH file header
 */
function parseHeader(dataView: DataView): RaymarineHeader | null {
  try {
    // Signature: 'FSH' (3 bytes) + version byte
    const sig = String.fromCharCode(
      dataView.getUint8(0),
      dataView.getUint8(1),
      dataView.getUint8(2)
    );

    if (sig !== 'FSH') return null;

    const version = dataView.getUint8(3);

    // Block count (4 bytes, little-endian)
    const blockCount = dataView.getUint32(8, true);

    // Creation timestamp (4 bytes, Unix timestamp)
    const timestamp = dataView.getUint32(12, true);
    const createdDate = new Date(timestamp * 1000);

    return {
      version,
      blockCount,
      createdDate,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse waypoint or mark block
 */
function parseWaypoint(dataView: DataView, offset: number): Waypoint | null {
  try {
    // Raymarine uses mercator coordinates, need conversion
    // Latitude (4 bytes, signed int, mercator units)
    const latMercator = dataView.getInt32(offset, true);
    const latitude = mercatorToLatitude(latMercator);

    // Longitude (4 bytes, signed int, mercator units)
    const lonMercator = dataView.getInt32(offset + 4, true);
    const longitude = mercatorToLongitude(lonMercator);

    // Timestamp (4 bytes, Unix timestamp)
    const timestamp = new Date(dataView.getUint32(offset + 8, true) * 1000);

    // Name length (1 byte)
    const nameLength = dataView.getUint8(offset + 12);

    // Name (variable length, max 40 bytes)
    let name = '';
    for (let i = 0; i < nameLength && i < 40; i++) {
      const charCode = dataView.getUint8(offset + 13 + i);
      if (charCode === 0) break;
      name += String.fromCharCode(charCode);
    }

    // Depth (4 bytes, float, meters)
    const depth = dataView.getFloat32(offset + 53, true);

    // Temperature (4 bytes, float, Celsius)
    const temperature = dataView.getFloat32(offset + 57, true);

    // Symbol/icon (2 bytes)
    const symbolId = dataView.getUint16(offset + 61, true);
    const icon = getWaypointIcon(symbolId);

    return {
      id: generateId(),
      name: name || 'Unnamed Waypoint',
      latitude,
      longitude,
      depth: depth > 0 ? depth : undefined,
      temperature: temperature > -50 && temperature < 50 ? temperature : undefined,
      timestamp,
      device: 'raymarine',
      icon,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse route block
 */
function parseRoute(dataView: DataView, offset: number, blockSize: number): Route | null {
  try {
    // Route name (40 bytes, null-terminated)
    let name = '';
    for (let i = 0; i < 40; i++) {
      const charCode = dataView.getUint8(offset + i);
      if (charCode === 0) break;
      name += String.fromCharCode(charCode);
    }

    // Waypoint count (2 bytes)
    const waypointCount = dataView.getUint16(offset + 40, true);

    const waypoints: Waypoint[] = [];
    let wpOffset = offset + 42;

    for (let i = 0; i < waypointCount; i++) {
      // Each route waypoint is a simplified structure
      const latMercator = dataView.getInt32(wpOffset, true);
      const latitude = mercatorToLatitude(latMercator);

      const lonMercator = dataView.getInt32(wpOffset + 4, true);
      const longitude = mercatorToLongitude(lonMercator);

      // Name (16 bytes)
      let wpName = '';
      for (let j = 0; j < 16; j++) {
        const charCode = dataView.getUint8(wpOffset + 8 + j);
        if (charCode === 0) break;
        wpName += String.fromCharCode(charCode);
      }

      waypoints.push({
        id: generateId(),
        name: wpName || `Waypoint ${i + 1}`,
        latitude,
        longitude,
        timestamp: new Date(),
        device: 'raymarine',
      });

      wpOffset += 24; // Size of route waypoint structure
    }

    return {
      id: generateId(),
      name: name || 'Unnamed Route',
      waypoints,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse track block
 */
function parseTrack(dataView: DataView, offset: number, blockSize: number): Track | null {
  try {
    // Track name (40 bytes, null-terminated)
    let name = '';
    for (let i = 0; i < 40; i++) {
      const charCode = dataView.getUint8(offset + i);
      if (charCode === 0) break;
      name += String.fromCharCode(charCode);
    }

    // Point count (4 bytes)
    const pointCount = dataView.getUint32(offset + 40, true);

    // Color (4 bytes, RGBA)
    const colorValue = dataView.getUint32(offset + 44, true);
    const color = `#${colorValue.toString(16).padStart(6, '0')}`;

    const points: TrackPoint[] = [];
    let ptOffset = offset + 48;

    for (let i = 0; i < pointCount; i++) {
      const latMercator = dataView.getInt32(ptOffset, true);
      const latitude = mercatorToLatitude(latMercator);

      const lonMercator = dataView.getInt32(ptOffset + 4, true);
      const longitude = mercatorToLongitude(lonMercator);

      const timestamp = new Date(dataView.getUint32(ptOffset + 8, true) * 1000);

      const depth = dataView.getFloat32(ptOffset + 12, true);
      const speed = dataView.getFloat32(ptOffset + 16, true);
      const temperature = dataView.getFloat32(ptOffset + 20, true);

      points.push({
        latitude,
        longitude,
        timestamp,
        depth: depth > 0 ? depth : undefined,
        speed: speed >= 0 ? speed : undefined,
        temperature: temperature > -50 && temperature < 50 ? temperature : undefined,
      });

      ptOffset += 24; // Size of track point structure
    }

    return {
      id: generateId(),
      name: name || 'Unnamed Track',
      points,
      color,
      timestamp: points[0]?.timestamp,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Convert Raymarine mercator units to latitude
 */
function mercatorToLatitude(mercatorY: number): number {
  // Raymarine uses mercator projection with scale factor
  const MERCATOR_SCALE = 2147483648 / 180; // 2^31 / 180
  return mercatorY / MERCATOR_SCALE;
}

/**
 * Convert Raymarine mercator units to longitude
 */
function mercatorToLongitude(mercatorX: number): number {
  const MERCATOR_SCALE = 2147483648 / 180; // 2^31 / 180
  return mercatorX / MERCATOR_SCALE;
}

/**
 * Get waypoint icon name from symbol ID
 */
function getWaypointIcon(symbolId: number): string | undefined {
  const icons: Record<number, string> = {
    1: 'anchor',
    2: 'fish',
    3: 'wreck',
    4: 'dive',
    5: 'mark',
    6: 'buoy',
    7: 'danger',
    8: 'marina',
    9: 'fuel',
    10: 'home',
  };

  return icons[symbolId];
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
