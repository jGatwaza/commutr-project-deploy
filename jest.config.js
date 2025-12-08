export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: "node",
  testMatch: [
    // Only run our new comprehensive test suite
    "**/__tests__/unit/playlist.api.test.ts",
    "**/__tests__/unit/agent.test.ts",
    "**/__tests__/unit/analytics.test.ts",
    "**/__tests__/unit/achievements.service.test.ts",
    "**/__tests__/unit/history.service.test.ts",
    "**/__tests__/integration/api.integration.test.ts",
    "**/__tests__/integration/e2e.integration.test.ts"
  ],
  testTimeout: 10000,
  forceExit: true,
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^groq-sdk/shims/node$': '<rootDir>/jest.setup.js', // Map to empty module
    '^groq-sdk/index\\.mjs$': '<rootDir>/__mocks__/groq-sdk.ts',
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
