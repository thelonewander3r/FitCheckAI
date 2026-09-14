import type { BlobBackend } from "./types";

export function r2BlobBackend(bucket: R2Bucket): BlobBackend {
  return {
    async put(key, bytes, contentType) {
      await bucket.put(key, bytes, {
        httpMetadata: { contentType },
        customMetadata: {
          purpose: "temp",
          createdAt: new Date().toISOString(),
        },
      });
    },
    async get(key) {
      const object = await bucket.get(key);
      if (!object) return null;
      const bytes = new Uint8Array(await object.arrayBuffer());
      const contentType =
        object.httpMetadata?.contentType ?? "application/octet-stream";
      return { bytes, contentType };
    },
    async delete(key) {
      await bucket.delete(key);
    },
  };
}
