import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Run each test file in its own isolated worker so "use server" / "server-only"
    // module restrictions don't bleed between suites.
    isolate: true,
    // Silence noisy console output from the logger during test runs.
    silent: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/app/**/_actions.ts", "src/app/api/**/*.ts", "src/lib/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    },
  },
  resolve: {
    alias: {
      // Mirror the "@/*" path alias from tsconfig.json
      "@": resolve(__dirname, "./src"),
    },
  },
});
