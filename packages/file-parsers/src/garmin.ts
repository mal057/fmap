/**
 * Garmin fish finder file parser
 * Supports .gpx (standard GPX format) and .adm (ActiveCaptain Data Manager binary format)
 *
 * GPX format: XML-based standard GPS Exchange Format
 * ADM format: Proprietary binary format for waypoints, routes, and tracks
 */

import * as xml2js from 'xml2js';
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

/**
 * Parse Garmin fish finder files (.gpx, .adm)
 */
export async function parseGarminFile(
  file: File | Blob
): Promise<ParseResult> {
  const fileName = (file as File).name || 'unknown';
  const ext = fileName.toLowerCase().split('.').pop();

  // Route to appropriate parser based on file extension
  if (ext === 'gpx') {
    return parseGPXFile(file, fileName);
  } else if (ext === 'adm') {
    return parseADMFile(file, fileName);
  } else {
    // Try GPX first (check content)
    const text = await file.text();
    if (text.includes('<?xml') && text.includes('<gpx')) {
      return parseGPXFile(file, fileName);
    }

    // Otherwise treat as ADM binary
    return parseADMFile(file, fileName);
  }
}

/**
 * Parse GPX XML file
 */
async function parseGPXFile(
  file: File | Blob,
  fileName: string
): Promise<ParseResult> {
  try {
    const text = await file.text();
    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      xmlns: true,
    });

    const result = await parser.parseStringPromise(text);
    const gpx = result.gpx;

    const fileMetadata: FileMetadata = {
      fileName,
      fileType: 'GPX (GPS Exchange Format)',
      fileSize: file.size,
      device: 'garmin',
      createdDate: gpx.metadata?.time ? new Date(gpx.metadata.time) : undefined,
    };

    const waypoints: Waypoint[] = [];
    const tracks: Track[] = [];
    const routes: Route[] = [];
    const depthReadings: DepthReading[] = [];

    // Parse waypoints
    if (gpx.wpt) {
      const wpts = Array.isArray(gpx.wpt) ? gpx.wpt : [gpx.wpt];
      for (const wpt of wpts) {
        const waypoint = parseGPXWaypoint(wpt);
        if (waypoint) {
          waypoints.push(waypoint);

          // If waypoint has depth, add to depth readings
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
      }
    }

    // Parse tracks
    if (gpx.trk) {
      const trks = Array.isArray(gpx.trk) ? gpx.trk : [gpx.trk];
      for (const trk of trks) {
        const track = parseGPXTrack(trk);
        if (track) {
          tracks.push(track);

          // Extract depth readings from track points
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
      }
    }

    // Parse routes
    if (gpx.rte) {
      const rtes = Array.isArray(gpx.rte) ? gpx.rte : [gpx.rte];
      for (const rte of rtes) {
        const route = parseGPXRoute(rte);
        if (route) routes.push(route);
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
        ? 'No data found in GPX file'
        : undefined,
    };
  } catch (error) {
    const fileMetadata: FileMetadata = {
      fileName,
      fileType: 'GPX',
      fileSize: file.size,
      device: 'garmin',
    };
    return createErrorResult(
      fileMetadata,
      error instanceof Error ? error.message : 'Failed to parse GPX file'
    );
  }
}

/**
 * Parse GPX waypoint element
 */
function parseGPXWaypoint(wpt: any): Waypoint | null {
  try {
    const latitude = parseFloat(wpt.lat);
    const longitude = parseFloat(wpt.lon);

    if (isNaN(latitude) || isNaN(longitude)) return null;

    const name = wpt.name || 'Unnamed Waypoint';
    const timestamp = wpt.time ? new Date(wpt.time) : new Date();

    // Parse depth from various possible extensions
    let depth: number | undefined;
    let temperature: number | undefined;

    // Standard GPX depth extension
    if (wpt.extensions) {
      const ext = wpt.extensions;

      // Garmin-specific extensions
      if (ext['gpxx:WaypointExtension']) {
        const garminExt = ext['gpxx:WaypointExtension'];
        depth = parseFloat(garminExt.Depth || garminExt.depth);
        temperature = parseFloat(garminExt.Temperature || garminExt.temperature);
      }

      // Generic depth extension
      if (ext.depth) {
        depth = parseFloat(ext.depth);
      }
    }

    return {
      id: generateId(),
      name,
      latitude,
      longitude,
      depth: !isNaN(depth!) && depth! > 0 ? depth : undefined,
      temperature: !isNaN(temperature!) ? temperature : undefined,
      timestamp,
      device: 'garmin',
      notes: wpt.desc || wpt.cmt,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse GPX track element
 */
function parseGPXTrack(trk: any): Track | null {
  try {
    const name = trk.name || 'Unnamed Track';
    const points: TrackPoint[] = [];

    // Tracks contain track segments
    if (trk.trkseg) {
      const segments = Array.isArray(trk.trkseg) ? trk.trkseg : [trk.trkseg];

      for (const seg of segments) {
        if (seg.trkpt) {
          const trkpts = Array.isArray(seg.trkpt) ? seg.trkpt : [seg.trkpt];

          for (const trkpt of trkpts) {
            const point = parseGPXTrackPoint(trkpt);
            if (point) points.push(point);
          }
        }
      }
    }

    if (points.length === 0) return null;

    return {
      id: generateId(),
      name,
      points,
      timestamp: points[0]?.timestamp,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse GPX track point element
 */
function parseGPXTrackPoint(trkpt: any): TrackPoint | null {
  try {
    const latitude = parseFloat(trkpt.lat);
    const longitude = parseFloat(trkpt.lon);

    if (isNaN(latitude) || isNaN(longitude)) return null;

    const timestamp = trkpt.time ? new Date(trkpt.time) : undefined;

    let depth: number | undefined;
    let temperature: number | undefined;
    let speed: number | undefined;

    // Parse extensions
    if (trkpt.extensions) {
      const ext = trkpt.extensions;

      if (ext['gpxx:TrackPointExtension']) {
        const garminExt = ext['gpxx:TrackPointExtension'];
        depth = parseFloat(garminExt.Depth || garminExt.depth);
        temperature = parseFloat(garminExt.Temperature || garminExt.temperature);
        speed = parseFloat(garminExt.Speed || garminExt.speed);
      }

      if (ext.depth) depth = parseFloat(ext.depth);
    }

    return {
      latitude,
      longitude,
      timestamp,
      depth: !isNaN(depth!) && depth! > 0 ? depth : undefined,
      temperature: !isNaN(temperature!) ? temperature : undefined,
      speed: !isNaN(speed!) && speed! >= 0 ? speed : undefined,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse GPX route element
 */
function parseGPXRoute(rte: any): Route | null {
  try {
    const name = rte.name || 'Unnamed Route';
    const waypoints: Waypoint[] = [];

    if (rte.rtept) {
      const rtepts = Array.isArray(rte.rtept) ? rte.rtept : [rte.rtept];

      for (const rtept of rtepts) {
        const waypoint = parseGPXWaypoint(rtept);
        if (waypoint) waypoints.push(waypoint);
      }
    }

    if (waypoints.length === 0) return null;

    return {
      id: generateId(),
      name,
      waypoints,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse ADM (ActiveCaptain Data Manager) binary file
 */
async function parseADMFile(
  file: File | Blob,
  fileName: string
): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);

    const fileMetadata: FileMetadata = {
      fileName,
      fileType: 'Garmin ADM (ActiveCaptain)',
      fileSize: arrayBuffer.byteLength,
      device: 'garmin',
    };

    // Parse ADM header
    const header = parseADMHeader(dataView);
    if (!header) {
      return createErrorResult(fileMetadata, 'Invalid ADM file header');
    }

    fileMetadata.softwareVersion = `${header.majorVersion}.${header.minorVersion}`;
    fileMetadata.createdDate = header.timestamp;

    const waypoints: Waypoint[] = [];
    const tracks: Track[] = [];
    const routes: Route[] = [];
    const depthReadings: DepthReading[] = [];

    // Parse data blocks
    let offset = header.dataOffset;

    while (offset < dataView.byteLength - 16) {
      try {
        const blockType = dataView.getUint16(offset, true);
        const blockSize = dataView.getUint32(offset + 2, true);

        switch (blockType) {
          case 0x01: // Waypoint
            const waypoint = parseADMWaypoint(dataView, offset + 6);
            if (waypoint) waypoints.push(waypoint);
            break;

          case 0x02: // Track
            const track = parseADMTrack(dataView, offset + 6, blockSize);
            if (track) tracks.push(track);
            break;

          case 0x03: // Route
            const route = parseADMRoute(dataView, offset + 6, blockSize);
            if (route) routes.push(route);
            break;
        }

        offset += 6 + blockSize;
      } catch (error) {
        console.warn(`Skipping corrupted ADM block at offset ${offset}:`, error);
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
        ? 'No data found in ADM file'
        : undefined,
    };
  } catch (error) {
    const fileMetadata: FileMetadata = {
      fileName,
      fileType: 'Garmin ADM',
      fileSize: file.size,
      device: 'garmin',
    };
    return createErrorResult(
      fileMetadata,
      error instanceof Error ? error.message : 'Failed to parse ADM file'
    );
  }
}

/**
 * Parse ADM file header
 */
function parseADMHeader(dataView: DataView): {
  majorVersion: number;
  minorVersion: number;
  dataOffset: number;
  timestamp: Date;
} | null {
  try {
    // Signature: 'GARMIN' (6 bytes)
    const sig = String.fromCharCode(
      dataView.getUint8(0),
      dataView.getUint8(1),
      dataView.getUint8(2),
      dataView.getUint8(3),
      dataView.getUint8(4),
      dataView.getUint8(5)
    );

    if (sig !== 'GARMIN') return null;

    const majorVersion = dataView.getUint8(6);
    const minorVersion = dataView.getUint8(7);
    const dataOffset = dataView.getUint16(8, true);
    const timestamp = new Date(dataView.getUint32(10, true) * 1000);

    return { majorVersion, minorVersion, dataOffset, timestamp };
  } catch (error) {
    return null;
  }
}

/**
 * Parse ADM waypoint
 */
function parseADMWaypoint(dataView: DataView, offset: number): Waypoint | null {
  try {
    const latitude = dataView.getFloat64(offset, true);
    const longitude = dataView.getFloat64(offset + 8, true);
    const timestamp = new Date(dataView.getUint32(offset + 16, true) * 1000);

    // Name (32 bytes, null-terminated)
    let name = '';
    for (let i = 0; i < 32; i++) {
      const charCode = dataView.getUint8(offset + 20 + i);
      if (charCode === 0) break;
      name += String.fromCharCode(charCode);
    }

    const depth = dataView.getFloat32(offset + 52, true);
    const temperature = dataView.getFloat32(offset + 56, true);

    return {
      id: generateId(),
      name: name || 'Unnamed Waypoint',
      latitude,
      longitude,
      depth: depth > 0 ? depth : undefined,
      temperature: temperature > -50 && temperature < 50 ? temperature : undefined,
      timestamp,
      device: 'garmin',
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse ADM track
 */
function parseADMTrack(dataView: DataView, offset: number, blockSize: number): Track | null {
  try {
    // Name (32 bytes)
    let name = '';
    for (let i = 0; i < 32; i++) {
      const charCode = dataView.getUint8(offset + i);
      if (charCode === 0) break;
      name += String.fromCharCode(charCode);
    }

    const pointCount = dataView.getUint32(offset + 32, true);
    const points: TrackPoint[] = [];

    let pointOffset = offset + 36;
    for (let i = 0; i < pointCount; i++) {
      const latitude = dataView.getFloat64(pointOffset, true);
      const longitude = dataView.getFloat64(pointOffset + 8, true);
      const timestamp = new Date(dataView.getUint32(pointOffset + 16, true) * 1000);
      const depth = dataView.getFloat32(pointOffset + 20, true);

      points.push({
        latitude,
        longitude,
        timestamp,
        depth: depth > 0 ? depth : undefined,
      });

      pointOffset += 24;
    }

    return {
      id: generateId(),
      name: name || 'Unnamed Track',
      points,
      timestamp: points[0]?.timestamp,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Parse ADM route
 */
function parseADMRoute(dataView: DataView, offset: number, blockSize: number): Route | null {
  try {
    // Name (32 bytes)
    let name = '';
    for (let i = 0; i < 32; i++) {
      const charCode = dataView.getUint8(offset + i);
      if (charCode === 0) break;
      name += String.fromCharCode(charCode);
    }

    const waypointCount = dataView.getUint32(offset + 32, true);
    const waypoints: Waypoint[] = [];

    let wpOffset = offset + 36;
    for (let i = 0; i < waypointCount; i++) {
      const waypoint = parseADMWaypoint(dataView, wpOffset);
      if (waypoint) waypoints.push(waypoint);
      wpOffset += 60; // Size of waypoint structure
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
