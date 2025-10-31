import type { Waypoint } from '@fmap/shared-types';

export interface ParserResult {
  success: boolean;
  waypoints: Waypoint[];
  error?: string;
}
