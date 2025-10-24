import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  // Only mark rrweb and idb as external - bundle jszip and buffer
  external: ['rrweb', 'idb'],
  noExternal: ['jszip', 'buffer'], // Force bundle jszip and buffer
  treeshake: true,
  outDir: 'dist',
  tsconfig: './tsconfig.json',
  platform: 'browser',
  // Ensure browser-compatible builds
  esbuildOptions(options) {
    options.platform = 'browser';
    // Define global and Buffer for browser
    options.define = {
      global: 'globalThis',
      Buffer: 'globalThis.Buffer',
    };
    // Inject buffer polyfill
    options.inject = ['./buffer-shim.js'];
  },
});
