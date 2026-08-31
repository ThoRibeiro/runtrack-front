import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Le schéma est généré : le tester reviendrait à tester `openapi-typescript`.
      exclude: ['src/**/*.test.ts', 'src/**/index.ts', 'src/generated/**', 'src/testing/**'],
      reporter: ['text', 'lcov'],
      thresholds: { lines: 90, branches: 85, functions: 90, statements: 90 },
    },
  },
});
