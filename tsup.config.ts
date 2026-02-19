import { defineConfig } from "tsup";
import path from "node:path";

export default defineConfig({
  entry: ["src/index.ts", "src/styles/index.css"],
  format: ["esm", "cjs"],
  dts: {
    compilerOptions: {
      jsx: "preserve"
    }
  },
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  minify: false,
  external: ["react", "react-dom"],
  outDir: "dist",
  esbuildOptions(options) {
    options.tsconfig = undefined;
    options.jsx = "transform";
    options.jsxFactory = "React.createElement";
    options.jsxFragment = "React.Fragment";
    options.tsconfigRaw = {
      compilerOptions: {
        jsx: "react",
        jsxFactory: "React.createElement",
        jsxFragmentFactory: "React.Fragment"
      }
    };
    options.inject = [...(options.inject ?? []), path.resolve(__dirname, "src/core/react-jsx-inject.ts")];
  }
});
