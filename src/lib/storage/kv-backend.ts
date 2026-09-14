import type { JsonBackend } from "./types";

export function kvJsonBackend(kv: KVNamespace): JsonBackend {
  return {
    async get(key) {
      return kv.get(key, { type: "text" });
    },
    async put(key, value) {
      await kv.put(key, value);
    },
  };
}
