/** @type {import('jest').Config} */
module.exports = {
  displayName: '@fmap/web',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: '.',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  moduleNameMapper: {
    '^@fmap/shared-types$': '<rootDir>/../../packages/shared-types/src/index.ts',
    '^@fmap/shared-utils$': '<rootDir>/../../packages/shared-utils/src/index.ts',
    '^@fmap/shared-ui$': '<rootDir>/../../packages/shared-ui/src/index.ts',
    '^@fmap/file-parsers$': '<rootDir>/../../packages/file-parsers/src/index.ts',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
};
