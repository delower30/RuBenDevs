// backend/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false, // Run test files sequentially to ensure SQLite database isolation
    testTimeout: 10000,
  },
});
