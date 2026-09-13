import { TEMP_BLOB_PREFIX } from "./keys";
import { getBlobBackend, resolveStorageMode } from "./runtime";

/** Keep temp blobs small so Free R2 Class A ops and Worker memory stay cheap. */
export const MAX_TEMP_IMAGE_BYTES = 2 * 1024 * 1024;

function asHandle(key: string): string {
  return `r2:${key}`;
}

export function tempBlobKeyFromHandle(handle: string): string | null {
  if (handle.startsWith("r2:")) return handle.slice(3);
  if (handle.startsWith(TEMP_BLOB_PREFIX)) return handle;
  return null;
}

export async function putTempBlob(
  name: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  if (bytes.byteLength > MAX_TEMP_IMAGE_BYTES) {
    throw new Error("Temporary image exceeds the 2MB size limit.");
  }
  const key = name.startsWith(TEMP_BLOB_PREFIX)
    ? name
    : `${TEMP_BLOB_PREFIX}${name}`;
  const backend = await getBlobBackend();
  await backend.put(key, bytes, contentType);
  if (resolveStorageMode() === "fs") {
    const { join } = await import("node:path");
    const dir =
      process.env["UPLOAD_TEMP_DIR"] ??
      join(process.cwd(), "uploads", "tmp");
    return join(dir, key.slice(TEMP_BLOB_PREFIX.length));
  }
  return asHandle(key);
}

export async function getTempBlob(
  handle: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const key = tempBlobKeyFromHandle(handle);
  if (!key) return null;
  const backend = await getBlobBackend();
  return backend.get(key);
}

export async function deleteTempBlob(handle: string): Promise<void> {
  const key = tempBlobKeyFromHandle(handle);
  if (!key) return;
  const backend = await getBlobBackend();
  await backend.delete(key);
}
