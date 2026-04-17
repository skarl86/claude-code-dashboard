import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "server/src/index.ts",
    cli: "server/src/cli.ts",
  },
  outDir: "dist/server",
  format: ["esm"],
  target: "node18",
  platform: "node",
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
});
