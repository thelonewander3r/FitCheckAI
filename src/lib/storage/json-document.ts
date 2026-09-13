import { AsyncLocalStorage } from "node:async_hooks";
import { getJsonBackend } from "./runtime";

type Batch = {
  cache: Map<string, string>;
  dirty: Map<string, string>;
};

const als = new AsyncLocalStorage<Batch>();

let queue: Promise<unknown> = Promise.resolve();

function withIsolateLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function flush(batch: Batch): Promise<void> {
  if (batch.dirty.size === 0) return;
  const backend = await getJsonBackend();
  const writes = [...batch.dirty.entries()].map(([key, value]) =>
    backend.put(key, value),
  );
  await Promise.all(writes);
  batch.dirty.clear();
}

/**
 * Coalesce JSON-document writes in the current request.
 *
 * Do not wrap live YouCam (or other long I/O) inside a batch: the isolate
 * lock is held until flush, and delayed puts would hide new records from
 * concurrent requests.
 */
export async function runStorageBatch<T>(fn: () => Promise<T>): Promise<T> {
  if (als.getStore()) return fn();
  return withIsolateLock(async () => {
    const batch: Batch = { cache: new Map(), dirty: new Map() };
    return als.run(batch, async () => {
      try {
        return await fn();
      } finally {
        await flush(batch);
      }
    });
  });
}

/** Run a store mutation, coalescing with an outer `runStorageBatch` if present. */
export async function withDocumentMutation<T>(
  fn: () => Promise<T>,
): Promise<T> {
  return runStorageBatch(fn);
}

export async function readJsonDocument<T>(
  key: string,
  fallback: T,
): Promise<T> {
  const batch = als.getStore();
  if (batch?.cache.has(key)) {
    return JSON.parse(batch.cache.get(key)!) as T;
  }
  const backend = await getJsonBackend();
  const raw = await backend.get(key);
  if (raw == null) {
    const empty = JSON.stringify(fallback);
    if (batch) batch.cache.set(key, empty);
    return fallback;
  }
  if (batch) batch.cache.set(key, raw);
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonDocument<T>(
  key: string,
  value: T,
): Promise<void> {
  const text = JSON.stringify(value);
  const batch = als.getStore();
  if (batch) {
    batch.cache.set(key, text);
    batch.dirty.set(key, text);
    return;
  }
  const backend = await getJsonBackend();
  await backend.put(key, text);
}

/** Test helper: the raw document string currently stored on the active backend. */
export async function peekJsonDocument(key: string): Promise<string | null> {
  const batch = als.getStore();
  if (batch?.cache.has(key)) return batch.cache.get(key)!;
  const backend = await getJsonBackend();
  return backend.get(key);
}
