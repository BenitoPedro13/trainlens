import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    // Strip .js extension from imports when running under ts-jest
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};

export default config;
