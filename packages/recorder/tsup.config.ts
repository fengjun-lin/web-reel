import { defineConfig } from 'tsup'

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
  // Mark as external - let user's project handle these
  external: ['rrweb', 'jszip', 'idb'],
  treeshake: true,
  outDir: 'dist',
  tsconfig: './tsconfig.json',
})

