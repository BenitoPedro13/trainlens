import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.integration\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
  testEnvironment: 'node',
  testTimeout: 90000,
  maxWorkers: 1,
  globalSetup: undefined,
  testEnvironmentOptions: {},
  moduleNameMapper: {
    '^@trainlens/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
  },
  setupFiles: ['<rootDir>/../test/setup-testcontainers.ts'],
};

export default config;
