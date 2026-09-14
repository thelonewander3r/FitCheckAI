import { unlink } from "node:fs/promises";
import { deleteTempBlob, putTempBlob } from "./blob-store";
import { resolveStorageMode } from "./runtime";

/**
 * Temporary image storage for the prototype.
 * Images are not retained permanently — callers should delete after use.
 *
 * - `next dev` (`FITCHECK_STORAGE=fs`, default off Workers): local files
 * - Cloudflare Workers: R2 (`FITCHECK_R2`), handle prefixed with `r2:`
 * - Vitest: in-memory blob map
 */

export async function saveTempImage(
  sessionId: string,
  base64: string,
  mimeType = "image/jpeg",
): Promise<string> {
  const ext = mimeType.includes("png") ? "png" : "jpg";
  const name = `${sessionId}-${Date.now()}.${ext}`;
  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  return putTempBlob(name, bytes, mimeType);
}

export async function deleteTempImage(handle: string): Promise<void> {
  if (handle.startsWith("r2:") || resolveStorageMode() !== "fs") {
    try {
      await deleteTempBlob(handle);
    } catch {
      // Best-effort cleanup
    }
    return;
  }
  try {
    await unlink(handle);
  } catch {
    // Best-effort cleanup — ignore missing files
  }
}
