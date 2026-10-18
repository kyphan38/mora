import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Vitest config
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
  },

  // Fixed port: Firebase and Storage CORS allow http://localhost:1420.
  server: {
    port: 1420,
    strictPort: true,
  },
});
