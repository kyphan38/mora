import { defineConfig } from 'vitest/config';

// Integration tests against the local Firebase emulators (npm run test:emu).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/test/emu/*.emu.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
