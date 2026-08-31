import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts', 'src/testing/**'],
      reporter: ['text', 'lcov'],
      // §13 : 90 % ligne et branche sur core, atteignable parce qu'il est pur.
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
