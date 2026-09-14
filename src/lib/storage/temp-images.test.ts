import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MAX_TEMP_IMAGE_BYTES } from "./blob-store";
import { memoryUsage, resetMemoryStorage } from "./memory-backend";
import { deleteTempImage, saveTempImage } from "./temp-images";

const TINY_JPEG =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcP//Z";

describe("temp-images", () => {
  afterEach(() => {
    resetMemoryStorage();
    process.env["FITCHECK_STORAGE"] = "memory";
    delete process.env["UPLOAD_TEMP_DIR"];
  });

  it("stores and deletes blobs in memory without touching disk", async () => {
    process.env["FITCHECK_STORAGE"] = "memory";
    const handle = await saveTempImage("session-1", TINY_JPEG, "image/jpeg");
    expect(handle.startsWith("r2:tmp/")).toBe(true);
    expect(memoryUsage.blobPuts).toBe(1);

    await deleteTempImage(handle);
    expect(memoryUsage.blobDeletes).toBe(1);
  });

  it("writes a local file when FITCHECK_STORAGE=fs", async () => {
    process.env["FITCHECK_STORAGE"] = "fs";
    const dir = await mkdtemp(path.join(os.tmpdir(), "fitcheck-tmp-"));
    process.env["UPLOAD_TEMP_DIR"] = dir;
    try {
      const filePath = await saveTempImage("session-2", TINY_JPEG);
      expect(filePath.startsWith(dir)).toBe(true);
      await deleteTempImage(filePath);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects oversized payloads", async () => {
    process.env["FITCHECK_STORAGE"] = "memory";
    const big = Buffer.alloc(MAX_TEMP_IMAGE_BYTES + 1, 1).toString("base64");
    await expect(saveTempImage("session-3", big)).rejects.toThrow(/2MB/);
  });
});
