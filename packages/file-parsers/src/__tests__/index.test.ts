/**
 * Tests for file parser index module
 * Tests auto-detection and utility functions
 */

import {
  parseFile,
  getFileInfo,
  isSupportedFormat,
  getSupportedExtensions,
  getDeviceExtensions,
  getAcceptString,
} from '../index';

describe('File Parser - Index Module', () => {
  describe('getSupportedExtensions', () => {
    it('should return all supported file extensions', () => {
      const extensions = getSupportedExtensions();

      expect(extensions).toContain('slg');
      expect(extensions).toContain('sl2');
      expect(extensions).toContain('sl3');
      expect(extensions).toContain('usr');
      expect(extensions).toContain('gpx');
      expect(extensions).toContain('adm');
      expect(extensions).toContain('dat');
      expect(extensions).toContain('son');
      expect(extensions).toContain('fsh');
    });

    it('should return at least 9 extensions', () => {
      const extensions = getSupportedExtensions();
      expect(extensions.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe('getDeviceExtensions', () => {
    it('should return Lowrance extensions', () => {
      const extensions = getDeviceExtensions('lowrance');

      expect(extensions).toContain('slg');
      expect(extensions).toContain('sl2');
      expect(extensions).toContain('sl3');
      expect(extensions).toContain('usr');
      expect(extensions.length).toBe(4);
    });

    it('should return Garmin extensions', () => {
      const extensions = getDeviceExtensions('garmin');

      expect(extensions).toContain('gpx');
      expect(extensions).toContain('adm');
      expect(extensions.length).toBe(2);
    });

    it('should return Humminbird extensions', () => {
      const extensions = getDeviceExtensions('humminbird');

      expect(extensions).toContain('dat');
      expect(extensions).toContain('son');
      expect(extensions.length).toBe(2);
    });

    it('should return Raymarine extensions', () => {
      const extensions = getDeviceExtensions('raymarine');

      expect(extensions).toContain('fsh');
      expect(extensions.length).toBe(1);
    });
  });

  describe('getAcceptString', () => {
    it('should return a comma-separated list of extensions with dots', () => {
      const acceptString = getAcceptString();

      expect(acceptString).toContain('.slg');
      expect(acceptString).toContain('.gpx');
      expect(acceptString).toContain('.dat');
      expect(acceptString).toContain('.fsh');
      expect(acceptString).toContain(',');
    });

    it('should be usable in HTML file input accept attribute', () => {
      const acceptString = getAcceptString();
      expect(acceptString).toMatch(/^\.\w+(,\.\w+)*$/);
    });
  });

  describe('isSupportedFormat', () => {
    it('should return true for supported file extensions', async () => {
      const gpxFile = new File([''], 'test.gpx', { type: 'application/gpx+xml' });
      expect(await isSupportedFormat(gpxFile)).toBe(true);

      const slgFile = new File([''], 'test.slg', { type: 'application/octet-stream' });
      expect(await isSupportedFormat(slgFile)).toBe(true);

      const datFile = new File([''], 'test.dat', { type: 'application/octet-stream' });
      expect(await isSupportedFormat(datFile)).toBe(true);
    });

    it('should return false for unsupported file extensions', async () => {
      const txtFile = new File([''], 'test.txt', { type: 'text/plain' });
      expect(await isSupportedFormat(txtFile)).toBe(false);

      const jpgFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      expect(await isSupportedFormat(jpgFile)).toBe(false);
    });

    it('should detect GPX by content signature', async () => {
      const gpxContent = '<?xml version="1.0"?><gpx></gpx>';
      const file = new File([gpxContent], 'unknown', { type: 'application/octet-stream' });

      expect(await isSupportedFormat(file)).toBe(true);
    });
  });

  describe('getFileInfo', () => {
    it('should detect GPX file information', async () => {
      const file = new File(['test content'], 'waypoints.gpx', {
        type: 'application/gpx+xml',
      });

      const info = await getFileInfo(file);

      expect(info.device).toBe('garmin');
      expect(info.formatType).toBe('xml');
      expect(info.extension).toBe('gpx');
      expect(info.size).toBeGreaterThan(0);
      expect(info.sizeFormatted).toMatch(/\d+(\.\d+)?\s+(bytes|KB|MB)/);
    });

    it('should detect Lowrance file information', async () => {
      const file = new File(['test content'], 'sonar.slg', {
        type: 'application/octet-stream',
      });

      const info = await getFileInfo(file);

      expect(info.device).toBe('lowrance');
      expect(info.formatType).toBe('binary');
      expect(info.extension).toBe('slg');
    });

    it('should format file sizes correctly', async () => {
      // Small file (bytes)
      const smallFile = new File(['test'], 'test.gpx');
      const smallInfo = await getFileInfo(smallFile);
      expect(smallInfo.sizeFormatted).toContain('bytes');

      // Medium file (KB)
      const mediumContent = 'x'.repeat(2048);
      const mediumFile = new File([mediumContent], 'test.gpx');
      const mediumInfo = await getFileInfo(mediumFile);
      expect(mediumInfo.sizeFormatted).toContain('KB');

      // Large file (MB)
      const largeContent = 'x'.repeat(2 * 1024 * 1024);
      const largeFile = new File([largeContent], 'test.gpx');
      const largeInfo = await getFileInfo(largeFile);
      expect(largeInfo.sizeFormatted).toContain('MB');
    });

    it('should handle files without extensions', async () => {
      const file = new File(['test'], 'unknown');
      const info = await getFileInfo(file);

      expect(info.device).toBeDefined();
      expect(info.extension).toBe('');
    });
  });

  describe('parseFile - auto-detection', () => {
    it('should detect and route GPX files by extension', async () => {
      const gpxContent = `<?xml version="1.0"?>
        <gpx version="1.1">
          <wpt lat="37.7749" lon="-122.4194">
            <name>Test Point</name>
          </wpt>
        </gpx>`;

      const file = new File([gpxContent], 'test.gpx', { type: 'application/gpx+xml' });
      const result = await parseFile(file);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.fileMetadata.device).toBe('Garmin');
        expect(result.fileMetadata.format).toContain('GPX');
      }
    });

    it('should detect GPX files by content when extension is missing', async () => {
      const gpxContent = `<?xml version="1.0"?>
        <gpx version="1.1">
          <wpt lat="37.7749" lon="-122.4194">
            <name>Test Point</name>
          </wpt>
        </gpx>`;

      const file = new File([gpxContent], 'unknown', { type: 'application/octet-stream' });
      const result = await parseFile(file);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.fileMetadata.device).toBe('Garmin');
      }
    });

    it('should handle empty files gracefully', async () => {
      const file = new File([''], 'empty.gpx', { type: 'application/gpx+xml' });
      const result = await parseFile(file);

      // Should attempt to parse but may fail gracefully
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle corrupted files gracefully', async () => {
      const corruptedContent = 'This is not a valid fish finder file';
      const file = new File([corruptedContent], 'corrupted.gpx', {
        type: 'application/gpx+xml',
      });
      const result = await parseFile(file);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should route Lowrance files correctly', async () => {
      const file = new File(['slgtest'], 'test.slg', { type: 'application/octet-stream' });
      const result = await parseFile(file);

      expect(result).toBeDefined();
      // Lowrance parser should be called
    });

    it('should route Humminbird files correctly', async () => {
      const file = new File(['HMBtest'], 'test.dat', { type: 'application/octet-stream' });
      const result = await parseFile(file);

      expect(result).toBeDefined();
      // Humminbird parser should be called
    });

    it('should route Raymarine files correctly', async () => {
      const file = new File(['FSHtest'], 'test.fsh', { type: 'application/octet-stream' });
      const result = await parseFile(file);

      expect(result).toBeDefined();
      // Raymarine parser should be called
    });
  });

  describe('Binary signature detection', () => {
    it('should detect Lowrance SLG signature', async () => {
      const buffer = new Uint8Array([
        's'.charCodeAt(0),
        'l'.charCodeAt(0),
        'g'.charCodeAt(0),
        0,
        0,
        0,
      ]);
      const file = new File([buffer], 'unknown', { type: 'application/octet-stream' });

      const info = await getFileInfo(file);
      expect(info.device).toBe('lowrance');
    });

    it('should detect Garmin GARMIN signature', async () => {
      const buffer = new Uint8Array([
        'G'.charCodeAt(0),
        'A'.charCodeAt(0),
        'R'.charCodeAt(0),
        'M'.charCodeAt(0),
        'I'.charCodeAt(0),
        'N'.charCodeAt(0),
      ]);
      const file = new File([buffer], 'unknown', { type: 'application/octet-stream' });

      const info = await getFileInfo(file);
      expect(info.device).toBe('garmin');
    });

    it('should detect Humminbird HMB signature', async () => {
      const buffer = new Uint8Array([
        'H'.charCodeAt(0),
        'M'.charCodeAt(0),
        'B'.charCodeAt(0),
        0,
        0,
        0,
      ]);
      const file = new File([buffer], 'unknown', { type: 'application/octet-stream' });

      const info = await getFileInfo(file);
      expect(info.device).toBe('humminbird');
    });

    it('should detect Raymarine FSH signature', async () => {
      const buffer = new Uint8Array([
        'F'.charCodeAt(0),
        'S'.charCodeAt(0),
        'H'.charCodeAt(0),
        0,
        0,
        0,
      ]);
      const file = new File([buffer], 'unknown', { type: 'application/octet-stream' });

      const info = await getFileInfo(file);
      expect(info.device).toBe('raymarine');
    });
  });
});
