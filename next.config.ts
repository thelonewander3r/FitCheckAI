import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workersStub = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "src/lib/storage/cloudflare-workers-stub.ts",
);

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "cloudflare:workers": "./src/lib/storage/cloudflare-workers-stub.ts",
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "cloudflare:workers": workersStub,
    };
    return config;
  },
};

export default nextConfig;
