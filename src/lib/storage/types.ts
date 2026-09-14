export type StorageMode = "memory" | "fs" | "cloudflare";

export interface JsonBackend {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface BlobObject {
  bytes: Uint8Array;
  contentType: string;
}

export interface BlobBackend {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<BlobObject | null>;
  delete(key: string): Promise<void>;
}
