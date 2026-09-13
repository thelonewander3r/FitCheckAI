import type { BlobBackend, BlobObject, JsonBackend } from "./types";

const jsonDocs = new Map<string, string>();
const blobs = new Map<string, BlobObject>();

export const memoryUsage = {
  jsonGets: 0,
  jsonPuts: 0,
  blobPuts: 0,
  blobGets: 0,
  blobDeletes: 0,
};

export function resetMemoryStorage(): void {
  jsonDocs.clear();
  blobs.clear();
  memoryUsage.jsonGets = 0;
  memoryUsage.jsonPuts = 0;
  memoryUsage.blobPuts = 0;
  memoryUsage.blobGets = 0;
  memoryUsage.blobDeletes = 0;
}

export const memoryJsonBackend: JsonBackend = {
  async get(key) {
    memoryUsage.jsonGets += 1;
    return jsonDocs.get(key) ?? null;
  },
  async put(key, value) {
    memoryUsage.jsonPuts += 1;
    jsonDocs.set(key, value);
  },
};

export const memoryBlobBackend: BlobBackend = {
  async put(key, bytes, contentType) {
    memoryUsage.blobPuts += 1;
    blobs.set(key, { bytes, contentType });
  },
  async get(key) {
    memoryUsage.blobGets += 1;
    return blobs.get(key) ?? null;
  },
  async delete(key) {
    memoryUsage.blobDeletes += 1;
    blobs.delete(key);
  },
};
