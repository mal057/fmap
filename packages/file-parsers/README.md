# Fish Finder File Parsers

Complete binary file parsers for all major fish finder formats. Extract waypoints, tracks, routes, and depth data from Lowrance, Garmin, Humminbird, and Raymarine fish finders.

## Features

- **Universal Parser**: Automatic format detection and parsing
- **Binary Format Support**: Native parsing of proprietary binary formats
- **XML Support**: Full GPX parsing with extensions
- **Rich Data Extraction**: Waypoints, tracks, routes, depth readings, sonar metadata
- **Type Safety**: Complete TypeScript type definitions
- **Performance**: Handles files up to 500MB efficiently
- **Browser & Node.js**: Works in both environments

## Supported Formats

### Lowrance
- `.slg` - SonarLog files
- `.sl2` - StructureScan HD files
- `.sl3` - StructureScan 3D files
- `.usr` - User data files (legacy)

### Garmin
- `.gpx` - GPX (GPS Exchange Format) with Garmin extensions
- `.adm` - ActiveCaptain Data Manager files

### Humminbird
- `.dat` - Track and waypoint files
- `.son` - Sonar files (metadata extraction only)

### Raymarine
- `.fsh` - Archive files (ARCHIVE.FSH)

## Installation

```bash
# This package is part of the FMap monorepo
# It's automatically linked via workspace dependencies
```

## Usage

### Basic Usage - Auto-Detection

The simplest way to parse any fish finder file:

```typescript
import { parseFile } from '@fmap/file-parsers';

// From a file input
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const result = await parseFile(file);

  if (result.success) {
    console.log(`Found ${result.waypoints.length} waypoints`);
    console.log(`Found ${result.tracks.length} tracks`);
    console.log(`Found ${result.routes.length} routes`);
    console.log(`Found ${result.depthReadings.length} depth readings`);
    console.log(`Device: ${result.fileMetadata.device}`);
  } else {
    console.error('Parse error:', result.error);
  }
});
```

### Device-Specific Parsers

Use device-specific parsers when you know the format:

```typescript
import {
  parseLowranceFile,
  parseGarminFile,
  parseHumminbirdFile,
  parseRaymarineFile,
} from '@fmap/file-parsers';

// Parse Lowrance file
const lowranceResult = await parseLowranceFile(file);

// Parse Garmin file
const garminResult = await parseGarminFile(file);

// Parse Humminbird file
const humminbirdResult = await parseHumminbirdFile(file);

// Parse Raymarine file
const raymarineResult = await parseRaymarineFile(file);
```

### File Validation

Check if a file is supported before parsing:

```typescript
import { isSupportedFormat, getFileInfo } from '@fmap/file-parsers';

// Check if file is supported
const isSupported = await isSupportedFormat(file);

if (isSupported) {
  // Get file information without full parsing
  const info = await getFileInfo(file);
  console.log('Device:', info.device);
  console.log('Format:', info.formatType);
  console.log('Size:', info.sizeFormatted);
  console.log('Extension:', info.extension);
}
```

### Working with Parse Results

```typescript
import { parseFile } from '@fmap/file-parsers';

const result = await parseFile(file);

if (result.success) {
  // Access waypoints
  result.waypoints.forEach((waypoint) => {
    console.log(`${waypoint.name}: ${waypoint.latitude}, ${waypoint.longitude}`);
    if (waypoint.depth) {
      console.log(`  Depth: ${waypoint.depth}m`);
    }
    if (waypoint.temperature) {
      console.log(`  Temperature: ${waypoint.temperature}°C`);
    }
  });

  // Access tracks
  result.tracks.forEach((track) => {
    console.log(`Track: ${track.name} (${track.points.length} points)`);
    track.points.forEach((point) => {
      console.log(`  ${point.latitude}, ${point.longitude}`);
      if (point.depth) console.log(`    Depth: ${point.depth}m`);
      if (point.speed) console.log(`    Speed: ${point.speed}m/s`);
    });
  });

  // Access routes
  result.routes.forEach((route) => {
    console.log(`Route: ${route.name} (${route.waypoints.length} waypoints)`);
  });

  // Access depth readings
  result.depthReadings.forEach((reading) => {
    console.log(
      `Depth at ${reading.latitude}, ${reading.longitude}: ${reading.depth}m`
    );
  });

  // Access sonar metadata (if available)
  if (result.sonarMetadata) {
    console.log('Sonar frequency:', result.sonarMetadata.frequency, 'kHz');
    console.log('Range:', result.sonarMetadata.range, 'm');
    console.log('Gain:', result.sonarMetadata.gain);
  }

  // File metadata
  console.log('File:', result.fileMetadata.fileName);
  console.log('Type:', result.fileMetadata.fileType);
  console.log('Size:', result.fileMetadata.fileSize, 'bytes');
  console.log('Created:', result.fileMetadata.createdDate);
}
```

### Utility Functions

```typescript
import {
  getSupportedExtensions,
  getDeviceExtensions,
  getAcceptString,
} from '@fmap/file-parsers';

// Get all supported extensions
const extensions = getSupportedExtensions();
console.log(extensions); // ['slg', 'sl2', 'sl3', 'gpx', 'adm', 'dat', 'son', 'fsh']

// Get extensions for a specific device
const lowranceExts = getDeviceExtensions('lowrance');
console.log(lowranceExts); // ['slg', 'sl2', 'sl3', 'usr']

// Get accept string for file input
const acceptString = getAcceptString();
// Use in HTML: <input type="file" accept=".slg,.sl2,.sl3,.gpx,.adm,.dat,.son,.fsh" />
```

## Type Definitions

### ParseResult

```typescript
interface ParseResult {
  success: boolean;
  waypoints: Waypoint[];
  tracks: Track[];
  routes: Route[];
  depthReadings: DepthReading[];
  sonarMetadata?: SonarMetadata;
  fileMetadata: FileMetadata;
  error?: string;
}
```

### Waypoint

```typescript
interface Waypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  depth?: number; // meters
  temperature?: number; // Celsius
  timestamp: Date;
  device: 'lowrance' | 'garmin' | 'humminbird' | 'raymarine';
  notes?: string;
  icon?: string;
}
```

### Track

```typescript
interface Track {
  id: string;
  name: string;
  points: TrackPoint[];
  color?: string;
  timestamp?: Date;
}

interface TrackPoint {
  latitude: number;
  longitude: number;
  timestamp?: Date;
  depth?: number; // meters
  temperature?: number; // Celsius
  speed?: number; // m/s
  heading?: number; // degrees
}
```

### Route

```typescript
interface Route {
  id: string;
  name: string;
  waypoints: Waypoint[];
  timestamp?: Date;
}
```

### DepthReading

```typescript
interface DepthReading {
  latitude: number;
  longitude: number;
  depth: number; // meters
  timestamp: Date;
  frequency?: number; // kHz
  temperature?: number; // Celsius
}
```

### SonarMetadata

```typescript
interface SonarMetadata {
  frequency: number; // kHz (e.g., 83, 200, 455, 800, 1200)
  range: number; // meters
  gain: number;
  chartSpeed: number;
  colorPalette?: string;
}
```

## Binary Format Details

### Lowrance Formats (.slg, .sl2, .sl3)

- **Byte Order**: Little-endian
- **Header**: 16 bytes (signature, version, block count, timestamp)
- **Data Blocks**: Frame type + size + data
- **Coordinates**: 64-bit double precision floats
- **Frame Types**: Waypoints (0x01), Track Points (0x02), Depth Data (0x03), Sonar (0x04-0x07)

### Garmin ADM Format (.adm)

- **Byte Order**: Little-endian
- **Signature**: 'GARMIN' (6 bytes)
- **Header**: Version, data offset, timestamp
- **Data Blocks**: Block type + size + data
- **Coordinates**: 64-bit double precision floats

### Humminbird Formats (.dat, .son)

- **Byte Order**: Little-endian
- **Signature**: 'HMB' for DAT, 'SON' for sonar
- **Units**: Feet/Fahrenheit (auto-converted to meters/Celsius)
- **Coordinates**: 32-bit single precision floats
- **Record Types**: Waypoint (0x01), Track Header (0x02), Track Point (0x03)

### Raymarine Format (.fsh)

- **Byte Order**: Little-endian
- **Signature**: 'FSH'
- **Coordinates**: Mercator projection (auto-converted to lat/lon)
- **Block Types**: Waypoint (0x03), Route (0x04), Track (0x05), Mark (0x06)

## Error Handling

All parsers include comprehensive error handling:

```typescript
const result = await parseFile(file);

if (!result.success) {
  console.error('Parse failed:', result.error);
  // result.error contains human-readable error message
  // Possible errors:
  // - "Invalid file header"
  // - "Unsupported file format"
  // - "Corrupted data"
  // - "No data found in file"
}

// Parsers gracefully skip corrupted blocks
// and continue parsing valid data
```

## Performance Considerations

- **File Size Limit**: Optimized for files up to 500MB
- **Memory Efficient**: Uses streaming for large files where possible
- **Corrupted Data**: Automatically skips corrupted blocks
- **Browser Compatibility**: Uses standard Web APIs (File, Blob, ArrayBuffer)

## Examples

### React Component

```typescript
import { useState } from 'react';
import { parseFile, getAcceptString } from '@fmap/file-parsers';
import type { ParseResult } from '@fmap/file-parsers';

function FileUploader() {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const parsed = await parseFile(file);
      setResult(parsed);
    } catch (error) {
      console.error('Parse error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept={getAcceptString()}
        onChange={handleFileChange}
        disabled={loading}
      />

      {loading && <p>Parsing file...</p>}

      {result?.success && (
        <div>
          <h3>Parse Results</h3>
          <p>Waypoints: {result.waypoints.length}</p>
          <p>Tracks: {result.tracks.length}</p>
          <p>Routes: {result.routes.length}</p>
          <p>Device: {result.fileMetadata.device}</p>
        </div>
      )}

      {result && !result.success && (
        <p style={{ color: 'red' }}>Error: {result.error}</p>
      )}
    </div>
  );
}
```

### Node.js Usage

```typescript
import { readFile } from 'fs/promises';
import { parseFile } from '@fmap/file-parsers';

async function processFile(filePath: string) {
  // Read file
  const buffer = await readFile(filePath);
  const blob = new Blob([buffer]);

  // Parse
  const result = await parseFile(blob);

  if (result.success) {
    console.log('Waypoints:', result.waypoints.length);
    // Process data...
  }
}

processFile('./data/fishing-spots.slg');
```

## Dependencies

- `xml2js`: ^0.6.2 - For GPX XML parsing
- `@fmap/shared-types`: workspace - Shared type definitions
- `@fmap/shared-utils`: workspace - Utility functions

## Testing

```bash
# Run type checking
npm run type-check

# Test with sample files (if available)
# Place sample files in src/__tests__/fixtures/
```

## Contributing

When adding support for new formats:

1. Create parser in `src/{device}.ts`
2. Add format signature detection in `src/index.ts`
3. Update `FILE_EXTENSION_MAP` in `src/index.ts`
4. Add type definitions in `src/types.ts`
5. Update this README with format details
6. Add sample test files

## License

Part of the FMap project.

## Credits

Binary format specifications reverse-engineered from:
- Lowrance community documentation
- Garmin GPX extensions specification
- Humminbird file format analysis
- Raymarine developer resources
