/**
 * Tests for Garmin file parser
 * Tests GPX (XML) and ADM (binary) format parsing
 */

import { parseGarminFile } from '../garmin';

describe('Garmin File Parser', () => {
  describe('GPX Format Parsing', () => {
    it('should parse valid GPX file with waypoints', async () => {
      const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Garmin">
  <wpt lat="37.7749" lon="-122.4194">
    <name>Test Waypoint</name>
    <desc>A test description</desc>
    <sym>Flag, Blue</sym>
  </wpt>
</gpx>`;

      const file = new File([gpxContent], 'test.gpx', { type: 'application/gpx+xml' });
      const result = await parseGarminFile(file);

      expect(result.success).toBe(true);
      expect(result.waypoints).toHaveLength(1);
      expect(result.waypoints[0].name).toBe('Test Waypoint');
      expect(result.waypoints[0].latitude).toBe(37.7749);
      expect(result.waypoints[0].longitude).toBe(-122.4194);
      expect(result.waypoints[0].device).toBe('garmin');
      expect(result.waypoints[0].notes).toBe('A test description');
    });

    it('should parse GPX file with multiple waypoints', async () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1">
  <wpt lat="37.7749" lon="-122.4194"><name>Point 1</name></wpt>
  <wpt lat="37.7849" lon="-122.4094"><name>Point 2</name></wpt>
  <wpt lat="37.7949" lon="-122.3994"><name>Point 3</name></wpt>
</gpx>`;

      const file = new File([gpxContent], 'test.gpx');
      const result = await parseGarminFile(file);

      expect(result.success).toBe(true);
      expect(result.waypoints).toHaveLength(3);
      expect(result.waypoints.map(w => w.name)).toEqual(['Point 1', 'Point 2', 'Point 3']);
    });

    it('should parse GPX track with track points', async () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <name>Test Track</name>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <ele>10.5</ele>
        <time>2023-12-01T10:00:00Z</time>
      </trkpt>
      <trkpt lat="37.7750" lon="-122.4195">
        <ele>11.2</ele>
        <time>2023-12-01T10:01:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const file = new File([gpxContent], 'track.gpx');
      const result = await parseGarminFile(file);

      expect(result.success).toBe(true);
      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0].name).toBe('Test Track');
      expect(result.tracks[0].points).toHaveLength(2);
      expect(result.tracks[0].points[0].latitude).toBe(37.7749);
      expect(result.tracks[0].points[0].longitude).toBe(-122.4194);
    });

    it('should parse GPX route with route points', async () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1">
  <rte>
    <name>Test Route</name>
    <rtept lat="37.7749" lon="-122.4194"><name>Start</name></rtept>
    <rtept lat="37.7849" lon="-122.4094"><name>Middle</name></rtept>
    <rtept lat="37.7949" lon="-122.3994"><name>End</name></rtept>
  </rte>
</gpx>`;

      const file = new File([gpxContent], 'route.gpx');
      const result = await parseGarminFile(file);

      expect(result.success).toBe(true);
      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].name).toBe('Test Route');
      expect(result.routes[0].waypoints).toHaveLength(3);
      expect(result.routes[0].waypoints.map(w => w.name)).toEqual(['Start', 'Middle', 'End']);
    });

    it('should parse waypoint with depth extension', async () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3">
  <wpt lat="37.7749" lon="-122.4194">
    <name>Deep Spot</name>
    <extensions>
      <gpxx:WaypointExtension>
        <gpxx:Depth>25.5</gpxx:Depth>
        <gpxx:Temperature>18.2</gpxx:Temperature>
      </gpxx:WaypointExtension>
    </extensions>
  </wpt>
</gpx>`;

      const file = new File([gpxContent], 'depth.gpx');
      const result = await parseGarminFile(file);

      expect(result.success).toBe(true);
      expect(result.waypoints[0].depth).toBe(25.5);
      expect(result.waypoints[0].temperature).toBe(18.2);
      expect(result.depthReadings).toHaveLength(1);
      expect(result.depthReadings[0].depth).toBe(25.5);
    });

    it('should handle empty GPX file', async () => {
      const gpxContent = `<?xml version="1.0"?><gpx version="1.1"></gpx>`;

      const file = new File([gpxContent], 'empty.gpx');
      const result = await parseGarminFile(file);

      expect(result.success).toBe(false);
      expect(result.waypoints).toHaveLength(0);
      expect(result.error).toBe('No data found in GPX file');
    });

    it('should handle malformed GPX XML', async () => {
      const invalidContent = `<?xml version="1.0"?><gpx><wpt lat="invalid">`;

      const file = new File([invalidContent], 'invalid.gpx');
      const result = await parseGarminFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle waypoints with missing coordinates', async () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1">
  <wpt lat="37.7749" lon="-122.4194"><name>Valid</name></wpt>
  <wpt lat="invalid" lon="invalid"><name>Invalid</name></wpt>
  <wpt lat="37.7949" lon="-122.3994"><name>Valid 2</name></wpt>
</gpx>`;

      const file = new File([gpxContent], 'test.gpx');
      const result = await parseGarminFile(file);

      expect(result.success).toBe(true);
      expect(result.waypoints).toHaveLength(2); // Invalid waypoint skipped
      expect(result.waypoints.map(w => w.name)).toEqual(['Valid', 'Valid 2']);
    });

    it('should parse GPX metadata', async () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1">
  <metadata>
    <time>2023-12-01T10:00:00Z</time>
  </metadata>
  <wpt lat="37.7749" lon="-122.4194"><name>Test</name></wpt>
</gpx>`;

      const file = new File([gpxContent], 'test.gpx');
      const result = await parseGarminFile(file);

      expect(result.success).toBe(true);
      expect(result.fileMetadata.createdDate).toEqual(new Date('2023-12-01T10:00:00Z'));
    });
  });

  describe('ADM Format Parsing', () => {
    it('should detect invalid ADM header', async () => {
      const buffer = new Uint8Array(100);
      // Fill with invalid header
      buffer[0] = 'I'.charCodeAt(0);
      buffer[1] = 'N'.charCodeAt(0);

      const file = new File([buffer], 'test.adm');
      const result = await parseGarminFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid ADM file header');
    });

    it('should parse ADM header correctly', async () => {
      const buffer = new Uint8Array(100);
      // Valid ADM header: 'GARMIN'
      'GARMIN'.split('').forEach((char, i) => {
        buffer[i] = char.charCodeAt(0);
      });
      buffer[6] = 1; // Major version
      buffer[7] = 0; // Minor version
      buffer[8] = 14; // Data offset (little-endian low byte)
      buffer[9] = 0;  // Data offset high byte

      const file = new File([buffer], 'test.adm');
      const result = await parseGarminFile(file);

      expect(result.fileMetadata.device).toBe('garmin');
      expect(result.fileMetadata.fileType).toBe('Garmin ADM (ActiveCaptain)');
    });

    it('should handle empty ADM file', async () => {
      const buffer = new Uint8Array(14);
      'GARMIN'.split('').forEach((char, i) => {
        buffer[i] = char.charCodeAt(0);
      });
      buffer[6] = 1;
      buffer[7] = 0;
      buffer[8] = 14;
      buffer[9] = 0;

      const file = new File([buffer], 'empty.adm');
      const result = await parseGarminFile(file);

      expect(result.success).toBe(false);
      expect(result.waypoints).toHaveLength(0);
    });
  });

  describe('Auto-detection', () => {
    it('should auto-detect GPX from content when no extension', async () => {
      const gpxContent = `<?xml version="1.0"?><gpx version="1.1">
        <wpt lat="37.7749" lon="-122.4194"><name>Test</name></wpt>
      </gpx>`;

      const file = new File([gpxContent], 'unknown');
      const result = await parseGarminFile(file);

      expect(result.success).toBe(true);
      expect(result.waypoints).toHaveLength(1);
    });

    it('should fallback to ADM for binary content', async () => {
      const buffer = new Uint8Array(20);
      buffer[0] = 0xFF; // Non-XML content

      const file = new File([buffer], 'unknown');
      const result = await parseGarminFile(file);

      expect(result.success).toBe(false);
      // Should attempt ADM parsing
      expect(result.error).toBeDefined();
    });
  });

  describe('File metadata', () => {
    it('should set correct file metadata for GPX', async () => {
      const gpxContent = `<?xml version="1.0"?>
<gpx version="1.1">
  <wpt lat="37.7749" lon="-122.4194"><name>Test</name></wpt>
</gpx>`;

      const file = new File([gpxContent], 'waypoints.gpx', {
        type: 'application/gpx+xml',
      });
      const result = await parseGarminFile(file);

      expect(result.fileMetadata.fileName).toBe('waypoints.gpx');
      expect(result.fileMetadata.fileType).toBe('GPX (GPS Exchange Format)');
      expect(result.fileMetadata.device).toBe('garmin');
      expect(result.fileMetadata.fileSize).toBe(gpxContent.length);
    });
  });
});
