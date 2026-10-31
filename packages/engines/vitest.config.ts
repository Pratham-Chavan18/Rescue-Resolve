import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // ≥95% line coverage required on decision tables (CONSTRAINTS §6.22)
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
      },
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
  },
});
