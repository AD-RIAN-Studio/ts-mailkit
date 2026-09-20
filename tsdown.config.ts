import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  clean: true,
  sourcemap: true,
  minify: false,
  // Preserve tsup-era output names: ESM -> .js, CJS -> .cjs (matches package.json entry points).
  outExtensions: ({ format }) => ({
    js: format === 'cjs' ? '.cjs' : '.js',
  }),
});
