# FishMap

[![Deploy to GitHub Pages](https://github.com/mal057/fmap/actions/workflows/deploy.yml/badge.svg)](https://github.com/mal057/fmap/actions/workflows/deploy.yml)
[![CI](https://github.com/mal057/fmap/actions/workflows/ci.yml/badge.svg)](https://github.com/mal057/fmap/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A cross-platform application for managing fish finder waypoints from Lowrance, Garmin, and Humminbird devices.

**Live Demo**: [https://mal057.github.io/fmap/](https://mal057.github.io/fmap/)

## Project Structure

```
Fmap/
├── apps/
│   ├── web/          # React web application (Vite + TypeScript)
│   ├── mobile/       # React Native mobile app (Expo + TypeScript)
│   └── api/          # Cloudflare Workers API
├── packages/
│   ├── shared-types/     # Shared TypeScript types
│   ├── shared-utils/     # Shared utility functions
│   ├── shared-ui/        # Shared UI components (react-native-web)
│   └── file-parsers/     # Fish finder file format parsers
└── docs/
    └── architecture.md   # Architecture documentation
```

## Technology Stack

- **Monorepo**: pnpm workspaces
- **Web**: React + Vite + TypeScript
- **Mobile**: React Native + Expo + TypeScript
- **Backend**: Cloudflare Workers
- **Auth**: Supabase
- **Storage**: Cloudflare R2
- **Cross-platform UI**: react-native-web

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Fmap
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Supabase and Cloudflare R2 credentials.

4. **Start development**

   Web app:
   ```bash
   pnpm dev:web
   ```

   Mobile app:
   ```bash
   pnpm dev:mobile
   ```

   API:
   ```bash
   pnpm dev:api
   ```

## Development

### Running Applications

- **Web**: `pnpm dev:web` - Starts Vite dev server
- **Mobile**: `pnpm dev:mobile` - Starts Expo dev server
- **API**: `pnpm dev:api` - Starts Cloudflare Workers local dev server

### Building

- **Build all**: `pnpm build`
- **Build web**: `pnpm build:web`
- **Build mobile**: `pnpm build:mobile`
- **Build API**: `pnpm build:api`

### Deployment

#### Automatic Deployment (Recommended)

The web application automatically deploys to GitHub Pages when you push to the `main` branch:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

The GitHub Actions workflow will:
1. Run type checking and linting
2. Build the application
3. Deploy to GitHub Pages

View deployment status: [Actions Tab](https://github.com/mal057/fmap/actions)

#### Manual Deployment

- **Deploy web**: `pnpm deploy:web` - Manually deploy to GitHub Pages using gh-pages
- **Deploy API**: `pnpm deploy:api` - Deploy to Cloudflare Workers

#### Deployment Documentation

For detailed deployment instructions, troubleshooting, and configuration:
- See [docs/deployment.md](docs/deployment.md) for complete deployment guide
- Includes GitHub Pages setup, environment variables, and custom domain configuration

## Environment Variables

See `.env.example` for required environment variables:

- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID
- `CLOUDFLARE_R2_BUCKET_NAME`: R2 bucket name
- `CLOUDFLARE_R2_ACCESS_KEY_ID`: R2 access key
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`: R2 secret key

## Supported Fish Finder Formats

- Lowrance (.usr, .gpx)
- Garmin (.gpx, .adm)
- Humminbird (.dat)

## License

MIT

## Author

mal057
