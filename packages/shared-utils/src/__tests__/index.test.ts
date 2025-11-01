/**
 * Tests for shared utility functions
 */

import {
  formatCoordinate,
  calculateDistance,
  calculateBounds,
  isValidWaypoint,
  generateId,
} from '../index';
import type { Waypoint } from '@fmap/shared-types';

describe('Shared Utils', () => {
  describe('formatCoordinate', () => {
    it('should format positive coordinates correctly', () => {
      expect(formatCoordinate(37.7749, -122.4194)).toBe('37.774900° N, 122.419400° W');
    });

    it('should format negative coordinates correctly', () => {
      expect(formatCoordinate(-33.8688, 151.2093)).toBe('33.868800° S, 151.209300° E');
    });

    it('should format zero coordinates', () => {
      expect(formatCoordinate(0, 0)).toBe('0.000000° N, 0.000000° E');
    });

    it('should handle edge cases', () => {
      expect(formatCoordinate(90, 180)).toBe('90.000000° N, 180.000000° E');
      expect(formatCoordinate(-90, -180)).toBe('90.000000° S, 180.000000° W');
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const point1 = { latitude: 37.7749, longitude: -122.4194 };
      const point2 = { latitude: 37.7849, longitude: -122.4094 };

      const distance = calculateDistance(point1, point2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(2); // Should be ~1.3 km
    });

    it('should return 0 for identical points', () => {
      const point = { latitude: 37.7749, longitude: -122.4194 };
      const distance = calculateDistance(point, point);

      expect(distance).toBeCloseTo(0, 5);
    });

    it('should calculate longer distances', () => {
      // San Francisco to New York (~4,139 km)
      const sf = { latitude: 37.7749, longitude: -122.4194 };
      const ny = { latitude: 40.7128, longitude: -74.0060 };

      const distance = calculateDistance(sf, ny);

      expect(distance).toBeGreaterThan(4000);
      expect(distance).toBeLessThan(4500);
    });

    it('should handle antipodal points', () => {
      const point1 = { latitude: 0, longitude: 0 };
      const point2 = { latitude: 0, longitude: 180 };

      const distance = calculateDistance(point1, point2);

      expect(distance).toBeGreaterThan(19000); // ~20,000 km (half Earth circumference)
    });
  });

  describe('calculateBounds', () => {
    it('should calculate bounds from waypoints', () => {
      const waypoints: Waypoint[] = [
        {
          id: '1',
          name: 'Point 1',
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: new Date(),
        },
        {
          id: '2',
          name: 'Point 2',
          latitude: 37.7849,
          longitude: -122.4094,
          timestamp: new Date(),
        },
        {
          id: '3',
          name: 'Point 3',
          latitude: 37.7649,
          longitude: -122.4294,
          timestamp: new Date(),
        },
      ];

      const bounds = calculateBounds(waypoints);

      expect(bounds).not.toBeNull();
      expect(bounds?.north).toBe(37.7849);
      expect(bounds?.south).toBe(37.7649);
      expect(bounds?.east).toBe(-122.4094);
      expect(bounds?.west).toBe(-122.4294);
    });

    it('should return null for empty waypoint array', () => {
      const bounds = calculateBounds([]);
      expect(bounds).toBeNull();
    });

    it('should handle single waypoint', () => {
      const waypoints: Waypoint[] = [
        {
          id: '1',
          name: 'Point 1',
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: new Date(),
        },
      ];

      const bounds = calculateBounds(waypoints);

      expect(bounds).not.toBeNull();
      expect(bounds?.north).toBe(37.7749);
      expect(bounds?.south).toBe(37.7749);
      expect(bounds?.east).toBe(-122.4194);
      expect(bounds?.west).toBe(-122.4194);
    });

    it('should handle worldwide bounds', () => {
      const waypoints: Waypoint[] = [
        {
          id: '1',
          name: 'North',
          latitude: 80,
          longitude: 0,
          timestamp: new Date(),
        },
        {
          id: '2',
          name: 'South',
          latitude: -80,
          longitude: 0,
          timestamp: new Date(),
        },
        {
          id: '3',
          name: 'East',
          latitude: 0,
          longitude: 170,
          timestamp: new Date(),
        },
        {
          id: '4',
          name: 'West',
          latitude: 0,
          longitude: -170,
          timestamp: new Date(),
        },
      ];

      const bounds = calculateBounds(waypoints);

      expect(bounds?.north).toBe(80);
      expect(bounds?.south).toBe(-80);
      expect(bounds?.east).toBe(170);
      expect(bounds?.west).toBe(-170);
    });
  });

  describe('isValidWaypoint', () => {
    it('should validate correct waypoint', () => {
      const waypoint: Partial<Waypoint> = {
        name: 'Test Point',
        latitude: 37.7749,
        longitude: -122.4194,
      };

      expect(isValidWaypoint(waypoint)).toBe(true);
    });

    it('should reject waypoint with invalid latitude', () => {
      const waypoint: Partial<Waypoint> = {
        name: 'Test Point',
        latitude: 91, // Invalid
        longitude: -122.4194,
      };

      expect(isValidWaypoint(waypoint)).toBe(false);
    });

    it('should reject waypoint with invalid longitude', () => {
      const waypoint: Partial<Waypoint> = {
        name: 'Test Point',
        latitude: 37.7749,
        longitude: -181, // Invalid
      };

      expect(isValidWaypoint(waypoint)).toBe(false);
    });

    it('should reject waypoint without name', () => {
      const waypoint: Partial<Waypoint> = {
        name: '',
        latitude: 37.7749,
        longitude: -122.4194,
      };

      expect(isValidWaypoint(waypoint)).toBe(false);
    });

    it('should reject waypoint with missing coordinates', () => {
      const waypoint: Partial<Waypoint> = {
        name: 'Test Point',
        latitude: 37.7749,
        // longitude missing
      };

      expect(isValidWaypoint(waypoint)).toBe(false);
    });

    it('should validate edge case coordinates', () => {
      const waypoint: Partial<Waypoint> = {
        name: 'Test Point',
        latitude: 90,
        longitude: 180,
      };

      expect(isValidWaypoint(waypoint)).toBe(true);
    });

    it('should handle NaN coordinates', () => {
      const waypoint: Partial<Waypoint> = {
        name: 'Test Point',
        latitude: NaN,
        longitude: -122.4194,
      };

      expect(isValidWaypoint(waypoint)).toBe(false);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });

    it('should generate non-empty IDs', () => {
      const id = generateId();
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate IDs with timestamp and random parts', () => {
      const id = generateId();
      expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it('should generate many unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateId());
      }

      expect(ids.size).toBe(1000); // All unique
    });
  });
});
