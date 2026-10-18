import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: false,
    clean: true,
    sourcemap: true,
    minify: false,
    outExtensions: ({ format }) => ({
      js: format === "cjs" ? ".cjs" : ".js",
    }),
  },
  test: {
    environment: "node",
    include: ["test/unit/**/*.test.ts"],
    globals: true,
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
