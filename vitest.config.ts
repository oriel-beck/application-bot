import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Keep in sync with tsconfig.json `paths` and .swcrc `paths`.
      '@lib': fileURLToPath(new URL('./src/lib', import.meta.url))
    }
  },
  test: {
    include: ['src/**/*.test.ts']
  }
});
