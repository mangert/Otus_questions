// Configures the backend Vitest test environment and coverage scope.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    restoreMocks: true,
  },
});
