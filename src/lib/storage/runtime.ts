import { fsBlobBackend, fsJsonBackend } from "./fs-backend";
import { kvJsonBackend } from "./kv-backend";
import { memoryBlobBackend, memoryJsonBackend } from "./memory-backend";
import { r2BlobBackend } from "./r2-backend";
import type { BlobBackend, JsonBackend, StorageMode } from "./types";

/**
 * Detect the Cloudflare Workers runtime without importing `cloudflare:workers`
 * (that module only exists in workerd / vinext).
 */
export function isCloudflareWorkerRuntime(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.userAgent === "string" &&
    navigator.userAgent.includes("Cloudflare-Workers")
  );
}

export function resolveStorageMode(): StorageMode {
  const explicit = process.env["FITCHECK_STORAGE"]?.trim().toLowerCase();
  if (explicit === "memory" || explicit === "fs" || explicit === "cloudflare") {
    return explicit;
  }
  if (isCloudflareWorkerRuntime()) return "cloudflare";
  return "fs";
}

async function loadWorkersEnv(): Promise<CloudflareEnv | null> {
  if (resolveStorageMode() !== "cloudflare") return null;
  try {
    const mod = await import("./cf-bindings");
    return mod.getWorkersEnv();
  } catch {
    return null;
  }
}

export async function getJsonBackend(): Promise<JsonBackend> {
  const mode = resolveStorageMode();
  if (mode === "memory") return memoryJsonBackend;
  if (mode === "cloudflare") {
    const env = await loadWorkersEnv();
    if (!env?.FITCHECK_KV) {
      throw new Error(
        "FITCHECK_KV binding is missing. Create the namespace and add it to wrangler.jsonc, or set FITCHECK_STORAGE=fs for local Next.js.",
      );
    }
    return kvJsonBackend(env.FITCHECK_KV);
  }
  return fsJsonBackend;
}

export async function getBlobBackend(): Promise<BlobBackend> {
  const mode = resolveStorageMode();
  if (mode === "memory") return memoryBlobBackend;
  if (mode === "cloudflare") {
    const env = await loadWorkersEnv();
    if (!env?.FITCHECK_R2) {
      throw new Error(
        "FITCHECK_R2 binding is missing. Create the R2 bucket and add it to wrangler.jsonc, or set FITCHECK_STORAGE=fs for local Next.js.",
      );
    }
    return r2BlobBackend(env.FITCHECK_R2);
  }
  return fsBlobBackend;
}
