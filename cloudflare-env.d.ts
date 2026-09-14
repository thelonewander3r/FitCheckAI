/**
 * Cloudflare Worker bindings used by FitCheck.
 * Run `npm run cf-typegen` after changing wrangler.jsonc to refresh this file.
 */

interface KVNamespace {
  get(key: string, options?: { type?: "text" | "json" | "arrayBuffer" | "stream" }): Promise<string | null>;
  put(key: string, value: string | ArrayBuffer | ArrayBufferView): Promise<void>;
}

interface R2HTTPMetadata {
  contentType?: string;
}

interface R2ObjectBody {
  arrayBuffer(): Promise<ArrayBuffer>;
  httpMetadata?: R2HTTPMetadata;
}

interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | string,
    options?: {
      httpMetadata?: R2HTTPMetadata;
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
}

interface CloudflareEnv {
  FITCHECK_KV: KVNamespace;
  FITCHECK_R2: R2Bucket;
  ASSETS?: unknown;
  CF_VERSION_METADATA?: unknown;
  YOUCAM_MODE?: string;
  YOUCAM_API_KEY?: string;
  YOUCAM_BASE_URL?: string;
  VENUE_MODE?: string;
  OPENAI_API_KEY?: string;
  OPENAI_WEB_SEARCH_MODEL?: string;
}

declare module "cloudflare:workers" {
  export const env: CloudflareEnv;
}
