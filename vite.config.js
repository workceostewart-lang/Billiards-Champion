import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  cacheDir: ".vite-cache",
  build: {
    target: "es2022",
    sourcemap: false,
  },
  server: {
    host: "127.0.0.1",
  },
});
