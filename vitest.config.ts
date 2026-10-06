import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Pure-logic tests run in Node (no DOM, no Phaser). Text fixtures are loaded
// through Vite (`?raw` imports or import.meta.glob), never through node:fs.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      globals: false,
    },
  }),
);
