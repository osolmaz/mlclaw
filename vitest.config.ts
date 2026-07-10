import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/mlclaw-space-runtime/operator-brokers.ts"],
      reporter: ["text", "json-summary", "json"],
      thresholds: {
        lines: 85,
        functions: 85,
        statements: 85,
        branches: 85,
      },
      exclude: ["assets/**", "dist/**", "src/vendor/**", "test/**"],
    },
  },
});
