import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Leave `cloudflare:workers` unresolved here so vinext/workerd can use the
  // native module. Next.js never loads `cf-bindings.ts` in fs/memory mode.
  serverExternalPackages: ["cloudflare:workers"],
};

export default nextConfig;
