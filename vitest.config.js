import path from "node:path";

import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Vite deliberately skips .env.local in test mode. The browser smoke tests run
// against the local stack, so load it back in explicitly.
const localEnv = loadEnv("development", process.cwd(), "VITE_");

// Deliberately separate from vite.config.js: the Base44 plugin injects the HMR
// notifier, analytics tracker and visual edit agent, none of which belong in a
// test process.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  define: Object.fromEntries(
    Object.entries(localEnv).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  ),
  test: {
    environment: "jsdom",
    include: [
      "src/**/*.test.{js,jsx,ts,tsx}",
      "supabase/**/*.test.{js,jsx,ts,tsx}",
      "base44/shared/**/*.test.{js,ts}",
    ],
    setupFiles: ["./src/test/setup.js"],
  },
});
