import { defineConfig } from "vite";

export default defineConfig({
  cacheDir: ".vite-cache",
  build: {
    target: "es2022",
    sourcemap: true,
  },
  server: {
    host: "127.0.0.1",
  },
});
