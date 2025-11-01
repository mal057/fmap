# FishMap Testing Guide

Comprehensive testing documentation for the FishMap application.

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Test Types](#test-types)
5. [Writing Tests](#writing-tests)
6. [Code Coverage](#code-coverage)
7. [CI/CD Integration](#cicd-integration)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Overview

FishMap uses a comprehensive testing strategy with multiple layers:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test interactions between modules and services
- **E2E Tests**: Test complete user workflows from browser to backend

### Testing Stack

- **Jest**: Unit and integration testing framework
- **React Testing Library**: React component testing
- **Playwright**: End-to-end browser testing
- **ts-jest**: TypeScript support for Jest

### Coverage Requirements

Minimum coverage thresholds (80%):
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

## Test Structure

```
FishMap/
├── jest.config.js                 # Root Jest configuration
├── jest.setup.ts                  # Global test setup
├── playwright.config.ts           # Playwright E2E configuration
│
├── packages/
│   ├── file-parsers/
│   │   ├── jest.config.js
│   │   └── src/__tests__/
│   │       ├── index.test.ts
│   │       ├── garmin.test.ts
│   │       ├── lowrance.test.ts
│   │       ├── humminbird.test.ts
│   │       └── raymarine.test.ts
│   │
│   └── shared-utils/
│       ├── jest.config.js
│       └── src/__tests__/
│           ├── index.test.ts
│           └── auth/
│               └── useAuth.test.tsx
│
├── apps/
│   ├── api/
│   │   ├── jest.config.js
│   │   └── src/__tests__/
│   │       ├── middleware/
│   │       │   ├── fileValidation.test.ts
│   │       │   ├── rateLimit.test.ts
│   │       │   ├── auth.test.ts
│   │       │   └── sanitization.test.ts
│   │       └── services/
│   │           └── malwareScan.test.ts
│   │
│   └── web/
│       ├── jest.config.js
│       └── src/__tests__/
│           ├── App.test.tsx
│           ├── pages/
│           │   ├── Login.test.tsx
│           │   ├── Register.test.tsx
│           │   ├── Upload.test.tsx
│           │   └── Maps.test.tsx
│           └── components/
│               └── ProtectedRoute.test.tsx
│
└── tests/
    ├── fixtures/
    │   └── sample-gpx.xml
    ├── mocks/
    │   ├── supabase.ts
    │   └── cloudflare.ts
    ├── integration/
    │   ├── auth-flow.test.ts
    │   ├── upload-flow.test.ts
    │   └── download-flow.test.ts
    └── e2e/
        ├── user-registration.spec.ts
        ├── file-upload.spec.ts
        └── file-download.spec.ts
```

## Running Tests

### All Tests

Run all tests (unit, integration, E2E):
```bash
pnpm test:all
```

### Unit Tests Only

Run all unit tests across packages and apps:
```bash
pnpm test
```

Run tests in watch mode:
```bash
pnpm test:watch
```

Run tests with coverage:
```bash
pnpm test:coverage
```

### Package-Specific Tests

Test individual packages:
```bash
# File parsers
pnpm --filter @fmap/file-parsers test

# Shared utils
pnpm --filter @fmap/shared-utils test

# Web app
pnpm --filter @fmap/web test

# API
pnpm --filter @fmap/api test
```

### Integration Tests

Run integration tests:
```bash
pnpm test:integration
```

### E2E Tests

Run end-to-end tests:
```bash
pnpm test:e2e
```

Run E2E tests in headed mode (see browser):
```bash
npx playwright test --headed
```

Run E2E tests for specific browser:
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Debug Mode

Run tests in debug mode:
```bash
# Jest debug
node --inspect-brk node_modules/.bin/jest --runInBand

# Playwright debug
npx playwright test --debug
```

## Test Types

### Unit Tests

Test individual functions, components, and modules in isolation.

**Location**: `src/__tests__/*.test.{ts,tsx}`

**Example**:
```typescript
// packages/shared-utils/src/__tests__/index.test.ts
import { calculateDistance } from '../index';

describe('calculateDistance', () => {
  it('should calculate distance between two points', () => {
    const point1 = { latitude: 37.7749, longitude: -122.4194 };
    const point2 = { latitude: 37.7849, longitude: -122.4094 };

    const distance = calculateDistance(point1, point2);

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(2);
  });
});
```

### Integration Tests

Test interactions between modules, API calls, and data flow.

**Location**: `tests/integration/*.test.ts`

**Example**:
```typescript
// tests/integration/upload-flow.test.ts
describe('File Upload Flow', () => {
  it('should validate, scan, and store file', async () => {
    const file = new File(['<?xml?>'], 'test.gpx');
    const validation = await validateFile(file);
    expect(validation.valid).toBe(true);

    // Upload to storage
    const upload = await storage.upload(file);
    expect(upload.error).toBeNull();

    // Save to database
    const record = await db.insert({ filename: file.name });
    expect(record.error).toBeNull();
  });
});
```

### E2E Tests

Test complete user workflows in a real browser environment.

**Location**: `tests/e2e/*.spec.ts`

**Example**:
```typescript
// tests/e2e/file-upload.spec.ts
import { test, expect } from '@playwright/test';

test('should upload GPX file', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[type="email"]', 'test@example.com');
  await page.fill('[type="password"]', 'password123');
  await page.click('button[type="submit"]');

  await page.goto('/upload');
  await page.setInputFiles('input[type="file"]', 'sample.gpx');
  await page.click('button[type="submit"]');

  await expect(page.locator('text=/uploaded/i')).toBeVisible();
});
```

## Writing Tests

### Testing Philosophy

Follow these principles when writing tests:

1. **Test Behavior, Not Implementation**: Test what the code does, not how it does it
2. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
3. **One Assertion Per Test**: Each test should verify one specific behavior
4. **Descriptive Names**: Test names should clearly describe what they test
5. **Independent Tests**: Tests should not depend on other tests

### File Parser Tests

```typescript
import { parseGarminFile } from '../garmin';

describe('Garmin File Parser', () => {
  it('should parse valid GPX file with waypoints', async () => {
    const gpxContent = `<?xml version="1.0"?>
      <gpx><wpt lat="37.7749" lon="-122.4194">
        <name>Test Point</name>
      </wpt></gpx>`;

    const file = new File([gpxContent], 'test.gpx');
    const result = await parseGarminFile(file);

    expect(result.success).toBe(true);
    expect(result.waypoints).toHaveLength(1);
    expect(result.waypoints[0].name).toBe('Test Point');
  });

  it('should handle invalid GPX gracefully', async () => {
    const invalid = '<invalid>xml</invalid>';
    const file = new File([invalid], 'bad.gpx');
    const result = await parseGarminFile(file);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

### React Component Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../../pages/Login';

describe('Login Page', () => {
  it('should render login form', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('should validate empty fields', async () => {
    render(<BrowserRouter><Login /></BrowserRouter>);

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText(/fill in all fields/i)).toBeInTheDocument();
  });
});
```

### API Middleware Tests

```typescript
import { validateFile } from '../../middleware/fileValidation';

describe('File Validation', () => {
  it('should accept valid GPX file', async () => {
    const file = new File(['<?xml?>'], 'test.gpx', {
      type: 'application/gpx+xml'
    });

    const result = await validateFile(file);

    expect(result.valid).toBe(true);
    expect(result.sanitizedFilename).toBe('test.gpx');
  });

  it('should reject unsupported file types', async () => {
    const file = new File(['test'], 'doc.txt');
    const result = await validateFile(file);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('not allowed');
  });
});
```

### Mocking Dependencies

#### Supabase Mock

```typescript
import { mockSupabaseClient } from '../mocks/supabase';

jest.mock('@fmap/shared-utils', () => ({
  supabase: mockSupabaseClient,
}));

test('should sign in user', async () => {
  mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
    data: { user: { id: '123' }, session: {} },
    error: null,
  });

  const result = await signIn('test@example.com', 'password');
  expect(result.error).toBeNull();
});
```

#### Cloudflare Workers Mock

```typescript
import { createMockEnv, createMockRequest } from '../mocks/cloudflare';

test('should validate in Workers environment', async () => {
  const env = createMockEnv();
  const request = createMockRequest('http://localhost/upload');

  // Test your middleware
});
```

## Code Coverage

### Viewing Coverage Reports

After running tests with coverage:
```bash
pnpm test:coverage
```

View HTML report:
```bash
# Open coverage/lcov-report/index.html in browser
```

### Coverage Thresholds

Configured in `jest.config.js`:
```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

### Ignoring Files from Coverage

Add to Jest config:
```javascript
collectCoverageFrom: [
  'src/**/*.{ts,tsx}',
  '!src/**/*.d.ts',
  '!src/__tests__/**',
  '!src/main.tsx',
]
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Run linter
        run: pnpm lint

      - name: Run type check
        run: pnpm type-check

      - name: Run unit tests
        run: pnpm test:unit

      - name: Run integration tests
        run: pnpm test:integration

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Best Practices

### DO:
- ✅ Write tests for all new features
- ✅ Test edge cases and error handling
- ✅ Use descriptive test names
- ✅ Keep tests simple and focused
- ✅ Mock external dependencies
- ✅ Test user-facing behavior
- ✅ Run tests before committing
- ✅ Maintain high code coverage

### DON'T:
- ❌ Test implementation details
- ❌ Write tests that depend on other tests
- ❌ Skip error cases
- ❌ Ignore failing tests
- ❌ Test third-party libraries
- ❌ Make tests too complex
- ❌ Commit without running tests

### Testing Checklist

Before submitting code:
- [ ] All tests pass locally
- [ ] New tests added for new features
- [ ] Edge cases covered
- [ ] Error handling tested
- [ ] Code coverage meets threshold
- [ ] E2E tests updated if UI changed
- [ ] Integration tests updated if API changed
- [ ] Tests are independent and isolated

## Troubleshooting

### Common Issues

#### Tests Failing Intermittently

**Problem**: Tests pass sometimes but fail randomly

**Solution**:
- Check for race conditions
- Use `waitFor` for async operations
- Avoid hardcoded timeouts
- Ensure tests are independent

#### Module Not Found Errors

**Problem**: Jest can't find modules

**Solution**:
- Check `moduleNameMapper` in jest.config.js
- Verify workspace dependencies
- Run `pnpm install`

#### Playwright Tests Timing Out

**Problem**: E2E tests timeout

**Solution**:
- Increase timeout: `test.setTimeout(60000)`
- Check if server is running
- Use proper selectors
- Wait for network idle

#### Coverage Below Threshold

**Problem**: Coverage doesn't meet 80% requirement

**Solution**:
- Add missing test cases
- Test error paths
- Remove dead code
- Test edge cases

### Debug Commands

```bash
# Run specific test file
pnpm test path/to/test.ts

# Run tests matching pattern
pnpm test --testNamePattern="should upload"

# Run with verbose output
pnpm test --verbose

# Update snapshots
pnpm test -u

# Clear Jest cache
pnpm test --clearCache
```

### Getting Help

- Check test output for error messages
- Review stack traces
- Run tests with `--verbose` flag
- Check Jest documentation: https://jestjs.io
- Check Playwright docs: https://playwright.dev
- Review Testing Library docs: https://testing-library.com

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://testingjavascript.com/)
- [Test-Driven Development](https://www.agilealliance.org/glossary/tdd/)

---

**Last Updated**: 2024-01-31

For questions or issues, please open a GitHub issue or contact the development team.
