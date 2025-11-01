/** @type {import('jest').Config} */
module.exports = {
  displayName: '@fmap/file-parsers',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
  ],
  moduleNameMapper: {
    '^@fmap/shared-types$': '<rootDir>/../shared-types/src/index.ts',
    '^@fmap/shared-utils$': '<rootDir>/../shared-utils/src/index.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
};
