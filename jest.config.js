export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: "node",
  testMatch: [
    "**/__tests__/**/*.test.{js,ts}",
    "**/tests/**/*.test.{js,ts}",
    "**/test/**/*.test.{js,ts}"
  ],
  testTimeout: 10000,
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^groq-sdk$': '<rootDir>/__mocks__/groq-sdk.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }],
    '^.+\\.js$': ['babel-jest'],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@reduxjs|react-redux)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    'client/**/*.{js,jsx}',
    '!src/**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80,
    },
  },
};
