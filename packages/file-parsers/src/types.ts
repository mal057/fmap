import type { Waypoint } from '@fmap/shared-types';

/**
 * Geographic coordinate
 */
export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Track point with position and metadata
 */
export interface TrackPoint extends Coordinate {
  timestamp?: Date;
  depth?: number;
  temperature?: number;
  speed?: number;
  heading?: number;
}

/**
 * Track (path) data
 */
export interface Track {
  id: string;
  name: string;
  points: TrackPoint[];
  color?: string;
  timestamp?: Date;
}

/**
 * Route data (planned path)
 */
export interface Route {
  id: string;
  name: string;
  waypoints: Waypoint[];
  timestamp?: Date;
}

/**
 * Depth reading with sonar data
 */
export interface DepthReading {
  latitude: number;
  longitude: number;
  depth: number;
  timestamp: Date;
  frequency?: number; // Sonar frequency in kHz
  temperature?: number;
}

/**
 * Sonar data metadata
 */
export interface SonarMetadata {
  frequency: number; // kHz (e.g., 83, 200, 455, 800, 1200)
  range: number; // meters
  gain: number;
  chartSpeed: number;
  colorPalette?: string;
}

/**
 * File metadata
 */
export interface FileMetadata {
  fileName: string;
  fileType: string;
  fileSize: number;
  device: 'lowrance' | 'garmin' | 'humminbird' | 'raymarine';
  softwareVersion?: string;
  createdDate?: Date;
  modifiedDate?: Date;
}

/**
 * Complete parser result with all extracted data
 */
export interface ParseResult {
  success: boolean;
  waypoints: Waypoint[];
  tracks: Track[];
  routes: Route[];
  depthReadings: DepthReading[];
  sonarMetadata?: SonarMetadata;
  fileMetadata: FileMetadata;
  error?: string;
}

/**
 * Simplified parser result (legacy compatibility)
 */
export interface ParserResult {
  success: boolean;
  waypoints: Waypoint[];
  error?: string;
}

/**
 * File format detection result
 */
export interface FileFormat {
  extension: string;
  device: 'lowrance' | 'garmin' | 'humminbird' | 'raymarine';
  type: 'binary' | 'xml' | 'text';
  description: string;
}

/**
 * Binary format header
 */
export interface BinaryHeader {
  signature: string;
  version: number;
  recordCount: number;
  dataOffset: number;
}
