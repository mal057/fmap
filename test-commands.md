# FishMap Test Commands Quick Reference

Quick reference for all test commands.

## Installation

```bash
# Install all dependencies
pnpm install

# Install Playwright browsers (for E2E tests)
npx playwright install --with-deps
```

## Run All Tests

```bash
# All tests (unit + integration + E2E)
pnpm test:all

# Unit tests only
pnpm test

# Unit tests with coverage
pnpm test:coverage

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e
```

## Watch Mode

```bash
# Watch all tests
pnpm test:watch

# Watch specific package
pnpm --filter @fmap/file-parsers test:watch
pnpm --filter @fmap/shared-utils test:watch
pnpm --filter @fmap/api test:watch
pnpm --filter @fmap/web test:watch
```

## Package-Specific Tests

```bash
# File parsers
pnpm --filter @fmap/file-parsers test
pnpm --filter @fmap/file-parsers test:coverage

# Shared utils
pnpm --filter @fmap/shared-utils test
pnpm --filter @fmap/shared-utils test:coverage

# API
pnpm --filter @fmap/api test
pnpm --filter @fmap/api test:coverage

# Web app
pnpm --filter @fmap/web test
pnpm --filter @fmap/web test:coverage
```

## Specific Test Files

```bash
# Run specific test file
pnpm test packages/file-parsers/src/__tests__/garmin.test.ts
pnpm test apps/web/src/__tests__/pages/Login.test.tsx

# Run tests matching pattern
pnpm test --testNamePattern="should upload"
pnpm test --testNamePattern="Login"

# Run tests in specific directory
pnpm test packages/file-parsers
pnpm test apps/web/src/__tests__/pages
```

## E2E Tests

```bash
# All E2E tests
pnpm test:e2e

# Headed mode (see browser)
npx playwright test --headed

# Specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
npx playwright test --project="Mobile Chrome"

# Specific test file
npx playwright test tests/e2e/file-upload.spec.ts

# Debug mode
npx playwright test --debug

# UI mode
npx playwright test --ui
```

## Coverage

```bash
# Generate coverage report
pnpm test:coverage

# View HTML coverage report (macOS)
open coverage/lcov-report/index.html

# View HTML coverage report (Windows)
start coverage/lcov-report/index.html

# View HTML coverage report (Linux)
xdg-open coverage/lcov-report/index.html
```

## Debug Mode

```bash
# Jest debug
node --inspect-brk node_modules/.bin/jest --runInBand

# Debug specific test
node --inspect-brk node_modules/.bin/jest --runInBand path/to/test.ts

# Playwright debug
npx playwright test --debug

# Playwright debug specific test
npx playwright test tests/e2e/file-upload.spec.ts --debug
```

## Verbose Output

```bash
# Verbose test output
pnpm test --verbose

# Show all test output
pnpm test --verbose --no-coverage
```

## Update Snapshots

```bash
# Update all snapshots
pnpm test -u

# Update snapshots for specific test
pnpm test path/to/test.ts -u
```

## Clear Cache

```bash
# Clear Jest cache
pnpm test --clearCache

# Clear all caches and reinstall
rm -rf node_modules coverage .nyc_output
pnpm install
```

## CI/CD Commands

```bash
# Lint
pnpm lint

# Type check
pnpm type-check

# Run all quality checks
pnpm lint && pnpm type-check && pnpm test:all
```

## Parallel Execution

```bash
# Run tests in parallel (default)
pnpm test

# Run tests serially
pnpm test --runInBand

# Limit workers
pnpm test --maxWorkers=2
```

## Filtering Tests

```bash
# Only run tests that changed
pnpm test --onlyChanged

# Only run tests related to specific files
pnpm test --findRelatedTests src/file.ts

# Skip tests
pnpm test --testPathIgnorePatterns=integration
```

## Bail on First Failure

```bash
# Stop on first failure
pnpm test --bail

# Stop after N failures
pnpm test --bail=3
```

## Watch Mode Options

```bash
# In watch mode, press:
# a - run all tests
# f - run only failed tests
# p - filter by filename pattern
# t - filter by test name pattern
# q - quit watch mode
# Enter - trigger a test run
```

## Common Workflows

### Before Commit
```bash
pnpm lint && pnpm type-check && pnpm test
```

### Full Test Suite
```bash
pnpm test:all
```

### Quick Unit Tests
```bash
pnpm test:unit
```

### Development (Watch Mode)
```bash
pnpm test:watch
```

### Coverage Report
```bash
pnpm test:coverage && open coverage/lcov-report/index.html
```

### Specific Feature
```bash
pnpm test --testNamePattern="file upload"
```

### E2E Debugging
```bash
npx playwright test --debug --project=chromium
```

## Environment Variables

```bash
# Set test environment
NODE_ENV=test pnpm test

# Enable verbose logging
DEBUG=* pnpm test

# Playwright headed mode
HEADLESS=false npx playwright test
```

## Troubleshooting

### Tests Won't Run
```bash
# Clear cache and reinstall
pnpm test --clearCache
rm -rf node_modules
pnpm install
```

### E2E Tests Timeout
```bash
# Increase timeout
npx playwright test --timeout=60000
```

### Coverage Issues
```bash
# Clear coverage and regenerate
rm -rf coverage
pnpm test:coverage
```

### Port Conflicts
```bash
# Kill process on port 5173
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5173 | xargs kill -9
```

## Pro Tips

- Use `test:watch` during development
- Run `test:coverage` before PRs
- Use `--testNamePattern` to run specific tests
- Use `--bail` to stop on first failure
- Use Playwright UI mode for E2E debugging
- Keep tests fast by mocking external dependencies
- Run unit tests frequently, integration/E2E less often

---

For detailed documentation, see `docs/testing.md`
