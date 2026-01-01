import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'server/**/*.test.ts',
      'server/**/__tests__/**/*.test.ts',
      'tools/**/*.test.ts',
      'client/**/*.test.ts',
      'client/**/*.test.tsx',
    ],
    exclude: ['node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['server/**/*.ts', 'tools/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/__tests__/**',
        '**/node_modules/**',
        'server/index.ts',
        'server/vite.ts',
      ],
      // Coverage thresholds - currently disabled as codebase needs more tests
      // Goal thresholds per LEAN_PLAN.md: lines: 70, functions: 70, branches: 60, statements: 70
      // Enable once coverage improves: thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 }
    },
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-results.xml',
    },
  },
  resolve: {
    alias: {
      '@server': path.resolve(__dirname, './server'),
      '@shared': path.resolve(__dirname, './shared'),
      '@tools': path.resolve(__dirname, './tools'),
      '@': path.resolve(__dirname, './client/src'),
    },
  },
});
