import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

/**
 * Temporary local image storage for the prototype.
 * Images are not retained permanently by default — callers should delete after use.
 * Designed so a later object-storage provider can replace this module.
 */

function tempDir(): string {
  return process.env["UPLOAD_TEMP_DIR"] ?? path.join(process.cwd(), "uploads", "tmp");
}

export async function saveTempImage(
  sessionId: string,
  base64: string,
  mimeType = "image/jpeg",
): Promise<string> {
  const dir = tempDir();
  await mkdir(dir, { recursive: true });
  const ext = mimeType.includes("png") ? "png" : "jpg";
  const filePath = path.join(dir, `${sessionId}-${Date.now()}.${ext}`);
  await writeFile(filePath, Buffer.from(base64, "base64"));
  return filePath;
}

export async function deleteTempImage(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    // Best-effort cleanup — ignore missing files
  }
}
