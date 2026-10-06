import { defineConfig } from 'vite';

// The game is a static site. `base: './'` keeps every asset URL relative so the
// build works from any sub-path (GitHub Pages serves it under /<repo>/).
export default defineConfig({
  base: './',
  server: {
    // Story scripts and Longfellow sources live in /docs and are imported at
    // build time with import.meta.glob(..., { query: '?raw' }).
    fs: { allow: ['.'] },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
    // Phaser alone is ~1.2 MB minified; keep the warning for anything bigger.
    chunkSizeWarningLimit: 2048,
  },
});
