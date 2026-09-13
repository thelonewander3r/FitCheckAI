import { afterEach, describe, expect, it } from "vitest";
import { JSON_DOC_KEYS } from "./keys";
import {
  peekJsonDocument,
  readJsonDocument,
  runStorageBatch,
  writeJsonDocument,
} from "./json-document";
import { memoryUsage, resetMemoryStorage } from "./memory-backend";

describe("json-document coalescing", () => {
  afterEach(() => {
    resetMemoryStorage();
  });

  it("issues one put when several writes share a batch", async () => {
    await runStorageBatch(async () => {
      await writeJsonDocument(JSON_DOC_KEYS.sessions, { a: 1 });
      await writeJsonDocument(JSON_DOC_KEYS.sessions, { a: 2 });
      await writeJsonDocument(JSON_DOC_KEYS.occasions, [{ id: "1" }]);
    });

    expect(memoryUsage.jsonPuts).toBe(2);
    expect(await peekJsonDocument(JSON_DOC_KEYS.sessions)).toBe(
      JSON.stringify({ a: 2 }),
    );
    expect(await peekJsonDocument(JSON_DOC_KEYS.occasions)).toBe(
      JSON.stringify([{ id: "1" }]),
    );
  });

  it("does not write on a cache miss read", async () => {
    const value = await readJsonDocument(JSON_DOC_KEYS.worn, []);
    expect(value).toEqual([]);
    expect(memoryUsage.jsonPuts).toBe(0);
    expect(memoryUsage.jsonGets).toBe(1);
  });

  it("puts once per mutation when no batch is open", async () => {
    await writeJsonDocument(JSON_DOC_KEYS.wardrobe, [{ id: "w1" }]);
    await writeJsonDocument(JSON_DOC_KEYS.wardrobe, [{ id: "w2" }]);
    expect(memoryUsage.jsonPuts).toBe(2);
  });
});
