/**
 * Shared utility functions for FishMap
 */

import type { Waypoint, MapBounds } from '@fmap/shared-types';

// Export authentication modules
export { supabase } from './supabase';
export type { User, Session, AuthError } from './supabase';
export { AuthProvider, AuthContext } from './auth/AuthContext';
export type { AuthContextType } from './auth/AuthContext';
export { useAuth } from './auth/useAuth';

/**
 * Format coordinates to a standard display format
 */
export function formatCoordinate(
  latitude: number,
  longitude: number
): string {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';

  const latDeg = Math.abs(latitude);
  const lonDeg = Math.abs(longitude);

  return `${latDeg.toFixed(6)}° ${latDir}, ${lonDeg.toFixed(6)}° ${lonDir}`;
}

/**
 * Calculate distance between two waypoints in kilometers
 */
export function calculateDistance(
  point1: Pick<Waypoint, 'latitude' | 'longitude'>,
  point2: Pick<Waypoint, 'latitude' | 'longitude'>
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(point2.latitude - point1.latitude);
  const dLon = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) *
      Math.cos(toRadians(point2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate map bounds from an array of waypoints
 */
export function calculateBounds(waypoints: Waypoint[]): MapBounds | null {
  if (waypoints.length === 0) return null;

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  waypoints.forEach(waypoint => {
    north = Math.max(north, waypoint.latitude);
    south = Math.min(south, waypoint.latitude);
    east = Math.max(east, waypoint.longitude);
    west = Math.min(west, waypoint.longitude);
  });

  return { north, south, east, west };
}

/**
 * Validate waypoint data
 */
export function isValidWaypoint(waypoint: Partial<Waypoint>): boolean {
  return (
    typeof waypoint.latitude === 'number' &&
    waypoint.latitude >= -90 &&
    waypoint.latitude <= 90 &&
    typeof waypoint.longitude === 'number' &&
    waypoint.longitude >= -180 &&
    waypoint.longitude <= 180 &&
    typeof waypoint.name === 'string' &&
    waypoint.name.length > 0
  );
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
