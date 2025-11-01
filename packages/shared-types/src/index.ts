/**
 * Shared TypeScript types for FishMap
 */

// Waypoint types
export interface Waypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  depth?: number;
  temperature?: number;
  timestamp: Date;
  device: DeviceType;
  notes?: string;
  icon?: string;
}

export type DeviceType = 'lowrance' | 'garmin' | 'humminbird' | 'raymarine';

// File format types
export interface WaypointFile {
  name: string;
  type: string;
  size: number;
  device: DeviceType;
  waypoints: Waypoint[];
}

// API types
export interface UploadResponse {
  success: boolean;
  fileKey: string;
  fileName: string;
  size: number;
}

export interface WaypointListResponse {
  waypoints: Array<{
    key: string;
    uploaded: Date;
    size: number;
  }>;
}

export interface ErrorResponse {
  error: string;
  message?: string;
}

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
}

// Map types
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapCenter {
  latitude: number;
  longitude: number;
  zoom: number;
}
