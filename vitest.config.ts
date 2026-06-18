import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    projects: [
      {
        // Node project — backend: lib/**, app/api/**
        plugins: [tsconfigPaths()],
        test: {
          name: "node",
          include: ["lib/**/*.{test,spec}.{ts,tsx}", "app/api/**/*.{test,spec}.{ts,tsx}"],
          exclude: ["e2e/**", "node_modules/**"],
          environment: "node",
        },
      },
      {
        // jsdom project — frontend: app/components/**, app/** UI files
        plugins: [react(), tsconfigPaths()],
        test: {
          name: "jsdom",
          include: [
            "app/components/**/*.{test,spec}.{ts,tsx}",
            "app/**/*.{test,spec}.{ts,tsx}",
          ],
          exclude: ["app/api/**", "e2e/**", "node_modules/**"],
          environment: "jsdom",
          globals: true,
          setupFiles: ["./test/setup-jsdom.ts"],
        },
      },
    ],
  },
});
