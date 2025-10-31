/**
 * Lowrance fish finder file parser
 * Supports .usr and .gpx formats
 */

import type { Waypoint } from '@fmap/shared-types';
import { generateId } from '@fmap/shared-utils';
import type { ParserResult } from './types';

export async function parseLowranceFile(
  file: File | Blob
): Promise<ParserResult> {
  try {
    const text = await file.text();
    const waypoints: Waypoint[] = [];

    // Check if it's GPX format
    if (text.includes('<?xml') && text.includes('<gpx')) {
      return parseGPX(text, 'lowrance');
    }

    // Parse USR format (binary format - placeholder implementation)
    // TODO: Implement actual USR binary format parser
    console.warn('USR format parser not yet implemented');

    return {
      success: waypoints.length > 0,
      waypoints,
      error: waypoints.length === 0 ? 'No waypoints found' : undefined,
    };
  } catch (error) {
    return {
      success: false,
      waypoints: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function parseGPX(text: string, device: 'lowrance' | 'garmin'): ParserResult {
  const waypoints: Waypoint[] = [];

  // Simple GPX parser (for production, use a proper XML parser)
  const wptRegex = /<wpt lat="([^"]+)" lon="([^"]+)">([\s\S]*?)<\/wpt>/g;
  let match;

  while ((match = wptRegex.exec(text)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    const content = match[3];

    const nameMatch = content.match(/<name>([^<]+)<\/name>/);
    const name = nameMatch ? nameMatch[1] : 'Unnamed';

    waypoints.push({
      id: generateId(),
      name,
      latitude: lat,
      longitude: lon,
      device,
      timestamp: new Date(),
    });
  }

  return {
    success: waypoints.length > 0,
    waypoints,
    error: waypoints.length === 0 ? 'No waypoints found' : undefined,
  };
}
