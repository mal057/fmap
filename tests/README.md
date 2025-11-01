# FishMap Test Suite

This directory contains integration tests, E2E tests, test fixtures, and shared mocks for the FishMap application.

## Directory Structure

```
tests/
├── fixtures/          # Test data files (sample GPX, etc.)
├── mocks/            # Shared mock implementations
├── integration/      # Integration tests
└── e2e/             # End-to-end tests (Playwright)
```

## Running Tests

### Integration Tests
```bash
pnpm test:integration
```

### E2E Tests
```bash
pnpm test:e2e
```

### All Tests
```bash
pnpm test:all
```

## Test Fixtures

Test fixtures are sample data files used across tests:

- `sample-gpx.xml` - Sample GPX waypoint file for testing parsers

### Using Fixtures in Tests

```typescript
import path from 'path';

const fixturePath = path.join(__dirname, '../fixtures/sample-gpx.xml');
const file = await fs.readFile(fixturePath);
```

## Mocks

Shared mock implementations for external services:

### Supabase Mock

```typescript
import { mockSupabaseClient } from './mocks/supabase';

// Configure mock behavior
mockSupabaseClient.auth.signIn.mockResolvedValue({
  data: { user: { id: '123' } },
  error: null,
});
```

### Cloudflare Workers Mock

```typescript
import { createMockEnv, createMockRequest } from './mocks/cloudflare';

const env = createMockEnv();
const request = createMockRequest('http://localhost/api');
```

## Integration Tests

Integration tests verify that different parts of the application work together correctly.

### Auth Flow
Tests complete authentication workflows including registration, login, and session management.

### Upload Flow
Tests file upload from validation through storage to database.

### Download Flow
Tests file retrieval from database through storage to client.

## E2E Tests

End-to-end tests use Playwright to test complete user workflows in a real browser.

### User Registration
Tests the complete registration flow from form to account creation.

### File Upload
Tests uploading files through the UI including validation and success states.

### File Download
Tests viewing, downloading, and managing files through the UI.

## Adding New Tests

### Integration Test

1. Create test file in `integration/`:
```typescript
// integration/new-flow.test.ts
import { mockSupabaseClient } from '../mocks/supabase';

describe('New Flow', () => {
  it('should complete flow', async () => {
    // Test implementation
  });
});
```

2. Run test:
```bash
pnpm test:integration
```

### E2E Test

1. Create spec file in `e2e/`:
```typescript
// e2e/new-feature.spec.ts
import { test, expect } from '@playwright/test';

test('should use new feature', async ({ page }) => {
  await page.goto('/feature');
  // Test implementation
});
```

2. Run test:
```bash
pnpm test:e2e
```

### Test Fixture

1. Add file to `fixtures/`:
```
fixtures/sample-data.gpx
```

2. Use in tests:
```typescript
const filePath = path.join(__dirname, '../fixtures/sample-data.gpx');
```

## Best Practices

- Keep integration tests focused on testing interactions between modules
- Use E2E tests for critical user workflows only
- Share mocks and fixtures to avoid duplication
- Clean up test data after each test
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern

## Documentation

For detailed testing documentation, see [docs/testing.md](../docs/testing.md).
