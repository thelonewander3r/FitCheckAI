import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { TEMP_BLOB_PREFIX } from "./keys";
import type { BlobBackend, JsonBackend } from "./types";

function dataDir(): string {
  return path.join(process.cwd(), ".data");
}

function tempDir(): string {
  return process.env["UPLOAD_TEMP_DIR"] ?? path.join(process.cwd(), "uploads", "tmp");
}

function jsonFileForKey(key: string): string {
  const name = key.replace(/^doc:/, "");
  return path.join(dataDir(), `${name}.json`);
}

function blobPathForKey(key: string): string {
  const relative = key.startsWith(TEMP_BLOB_PREFIX)
    ? key.slice(TEMP_BLOB_PREFIX.length)
    : key;
  return path.join(tempDir(), relative);
}

export const fsJsonBackend: JsonBackend = {
  async get(key) {
    try {
      return await readFile(jsonFileForKey(key), "utf-8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  },
  async put(key, value) {
    const filePath = jsonFileForKey(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    const tmpPath = `${filePath}.${process.pid}.tmp`;
    await writeFile(tmpPath, value, "utf-8");
    await rename(tmpPath, filePath);
  },
};

export const fsBlobBackend: BlobBackend = {
  async put(key, bytes) {
    const filePath = blobPathForKey(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes);
  },
  async get(key) {
    try {
      const buf = await readFile(blobPathForKey(key));
      return { bytes: new Uint8Array(buf), contentType: "application/octet-stream" };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  },
  async delete(key) {
    try {
      await unlink(blobPathForKey(key));
    } catch {
      // Best-effort cleanup
    }
  },
};
