/**
 * Garmin fish finder file parser
 * Supports .gpx and .adm formats
 */

import type { Waypoint } from '@fmap/shared-types';
import { generateId } from '@fmap/shared-utils';
import type { ParserResult } from './types';

export async function parseGarminFile(
  file: File | Blob
): Promise<ParserResult> {
  try {
    const text = await file.text();
    const waypoints: Waypoint[] = [];

    // Check if it's GPX format
    if (text.includes('<?xml') && text.includes('<gpx')) {
      return parseGPX(text);
    }

    // Parse ADM format (custom Garmin format - placeholder)
    // TODO: Implement actual ADM format parser
    console.warn('ADM format parser not yet implemented');

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

function parseGPX(text: string): ParserResult {
  const waypoints: Waypoint[] = [];

  const wptRegex = /<wpt lat="([^"]+)" lon="([^"]+)">([\s\S]*?)<\/wpt>/g;
  let match;

  while ((match = wptRegex.exec(text)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    const content = match[3];

    const nameMatch = content.match(/<name>([^<]+)<\/name>/);
    const name = nameMatch ? nameMatch[1] : 'Unnamed';

    const depthMatch = content.match(/<depth>([^<]+)<\/depth>/);
    const depth = depthMatch ? parseFloat(depthMatch[1]) : undefined;

    waypoints.push({
      id: generateId(),
      name,
      latitude: lat,
      longitude: lon,
      depth,
      device: 'garmin',
      timestamp: new Date(),
    });
  }

  return {
    success: waypoints.length > 0,
    waypoints,
    error: waypoints.length === 0 ? 'No waypoints found' : undefined,
  };
}
