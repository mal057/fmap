# FishMap Architecture

## Overview

FishMap is a cross-platform application for managing fish finder waypoints from Lowrance, Garmin, and Humminbird devices. The project uses a monorepo structure with shared code across web, mobile, and API platforms.

## Technology Stack

### Monorepo Management
- **pnpm workspaces**: Efficient package management and dependency sharing
- **TypeScript**: Type-safe code across all platforms

### Frontend
- **Web**: React + Vite + TypeScript
  - Vite for fast development and optimized builds
  - React Router for navigation
  - Configured for GitHub Pages deployment

- **Mobile**: React Native + Expo + TypeScript
  - Expo for simplified mobile development
  - React Navigation for mobile routing
  - Support for iOS and Android

### Backend
- **Cloudflare Workers**: Serverless API
  - Fast edge computing
  - Global distribution
  - Low latency

### Services
- **Authentication**: Supabase Auth
  - Email/password authentication
  - Social login support
  - Session management

- **Storage**: Cloudflare R2
  - S3-compatible object storage
  - Waypoint file storage
  - Low-cost, high-performance

### Cross-Platform UI
- **react-native-web**: Shared UI components
  - Write once, run on web and mobile
  - Consistent user experience
  - Reduced code duplication

## Project Structure

```
Fmap/
├── apps/                    # Application packages
│   ├── web/                 # React web application
│   ├── mobile/              # React Native mobile app
│   └── api/                 # Cloudflare Workers API
├── packages/                # Shared packages
│   ├── shared-types/        # TypeScript type definitions
│   ├── shared-utils/        # Utility functions
│   ├── shared-ui/           # Cross-platform UI components
│   └── file-parsers/        # Fish finder file format parsers
└── docs/                    # Documentation
```

## Data Flow

### Waypoint Upload Flow
1. User selects waypoint file (web/mobile)
2. File type is detected (Lowrance/Garmin/Humminbird)
3. Appropriate parser extracts waypoint data
4. File is uploaded to Cloudflare R2 via Workers API
5. Waypoint metadata is stored in Supabase
6. User can view/manage waypoints

### Authentication Flow
1. User signs up/logs in via Supabase Auth
2. Session token is stored locally
3. API requests include authentication token
4. Cloudflare Workers validate token with Supabase
5. Authorized requests access user-specific data

## Shared Packages

### shared-types
TypeScript type definitions used across all platforms:
- Waypoint types
- API request/response types
- User types
- Map types

### shared-utils
Utility functions for common operations:
- Coordinate formatting
- Distance calculations
- Map bounds calculation
- Data validation

### shared-ui
Cross-platform UI components using react-native-web:
- Button component
- WaypointCard component
- Form components
- Layout components

### file-parsers
Parsers for different fish finder file formats:
- Lowrance (.usr, .gpx)
- Garmin (.gpx, .adm)
- Humminbird (.dat)

## API Endpoints

### Waypoints
- `POST /api/waypoints/upload` - Upload waypoint file
- `GET /api/waypoints` - List user's waypoints
- `GET /api/waypoints/:id` - Get waypoint details
- `GET /api/waypoints/download/:key` - Download waypoint file
- `DELETE /api/waypoints/:id` - Delete waypoint

## Deployment

### Web Application
- Hosted on GitHub Pages
- Built with Vite
- Static file serving
- Deploy command: `pnpm deploy:web`

### Mobile Application
- Built with Expo
- Distributed via Expo Go (development)
- Production builds via EAS Build
- Deploy to App Store/Play Store

### API
- Deployed to Cloudflare Workers
- Global edge network
- Automatic scaling
- Deploy command: `pnpm deploy:api`

## Development Workflow

### Setup
1. Clone repository
2. Install dependencies: `pnpm install`
3. Configure environment variables
4. Start development servers

### Development
- Web: `pnpm dev:web`
- Mobile: `pnpm dev:mobile`
- API: `pnpm dev:api`

### Building
- Build all: `pnpm build`
- Build specific app: `pnpm build:web`, `pnpm build:mobile`, `pnpm build:api`

### Type Checking
- Check all: `pnpm type-check`
- Individual packages have their own `type-check` scripts

## Security Considerations

### Authentication
- Supabase handles authentication securely
- Tokens are short-lived and refreshed automatically
- Row-level security in Supabase database

### File Upload
- File size limits enforced
- File type validation
- Virus scanning (future consideration)

### API Security
- CORS configured for allowed origins
- Rate limiting (future consideration)
- Input validation

## Future Enhancements

### Features
- Map visualization with Mapbox/Google Maps
- Waypoint sharing between users
- Export to different formats
- Offline support for mobile
- Real-time sync across devices

### Technical
- Add testing (Jest, React Testing Library)
- CI/CD pipeline
- Performance monitoring
- Error tracking (Sentry)
- Analytics

## File Format Support

### Lowrance
- **.usr**: Binary format containing waypoints, routes, trails
- **.gpx**: Standard GPS Exchange Format

### Garmin
- **.gpx**: Standard GPS Exchange Format
- **.adm**: Garmin's proprietary format

### Humminbird
- **.dat**: Binary format for waypoints and tracks

## Contributing

1. Create feature branch
2. Make changes
3. Run type checking: `pnpm type-check`
4. Test changes locally
5. Submit pull request

## License

MIT

## Contact

Author: mal057
