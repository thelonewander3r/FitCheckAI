/**
 * Real Workers bindings. vinext/workerd resolves `cloudflare:workers` natively.
 * Next.js and Vitest alias this specifier to `cloudflare-workers-stub.ts`.
 */
import { env } from "cloudflare:workers";

export function getWorkersEnv(): CloudflareEnv {
  return env;
}
