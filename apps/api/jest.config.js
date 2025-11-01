/** @type {import('jest').Config} */
module.exports = {
  displayName: '@fmap/api',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/index.ts',
  ],
  moduleNameMapper: {
    '^@fmap/shared-types$': '<rootDir>/../../packages/shared-types/src/index.ts',
    '^@fmap/shared-utils$': '<rootDir>/../../packages/shared-utils/src/index.ts',
    '^@fmap/file-parsers$': '<rootDir>/../../packages/file-parsers/src/index.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
  globals: {
    'ts-jest': {
      tsconfig: {
        types: ['@cloudflare/workers-types', 'jest'],
      },
    },
  },
};
