import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

const workersStub = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "src/lib/storage/cloudflare-workers-stub.ts",
);

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      "cloudflare:workers": workersStub,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      FITCHECK_STORAGE: "memory",
    },
    setupFiles: ["./src/test/setup-storage.ts"],
  },
});
