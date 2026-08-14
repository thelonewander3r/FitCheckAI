/**
 * Data retention for per-user storage.
 *
 * session-file-store automatically prunes expired session files from
 * .data/sessions/ after the 7-day TTL. This module runs alongside it to
 * also remove the corresponding per-user data directories (.data/<userId>/)
 * once no live session references them, preventing indefinite PII storage.
 *
 * Runs once at startup and then every 6 hours.
 */
import fs from "fs/promises";
import path from "path";

const BASE_DATA_DIR = path.join(process.cwd(), ".data");
const SESSIONS_DIR = path.join(BASE_DATA_DIR, "sessions");
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Read all userIds that appear in live (unexpired) session files.
 * session-file-store JSON files have shape: { "cookie": {...}, "userId": "..." }
 */
async function getLiveUserIds(): Promise<Set<string>> {
  const liveIds = new Set<string>();
  let entries: string[] = [];
  try {
    entries = await fs.readdir(SESSIONS_DIR);
  } catch {
    // No sessions directory yet — nothing to protect
    return liveIds;
  }

  await Promise.all(
    entries.map(async (file) => {
      if (!file.endsWith(".json")) return;
      const filePath = path.join(SESSIONS_DIR, file);
      try {
        const raw = await fs.readFile(filePath, "utf-8");
        const parsed = JSON.parse(raw) as { userId?: string; cookie?: { expires?: string } };

        // Honour the cookie expiry date stored in the session file
        if (parsed.cookie?.expires) {
          const expiresAt = new Date(parsed.cookie.expires).getTime();
          if (Date.now() > expiresAt) return; // session expired — not live
        }

        if (typeof parsed.userId === "string" && parsed.userId.length > 0) {
          liveIds.add(parsed.userId);
        }
      } catch {
        // Corrupted or partially-written file — skip it
      }
    }),
  );

  return liveIds;
}

/**
 * Remove a directory and all its contents.
 */
async function removeDir(dirPath: string): Promise<void> {
  await fs.rm(dirPath, { recursive: true, force: true });
}

/**
 * Run one cleanup pass:
 *   1. Collect userIds with a live session.
 *   2. Scan .data/ for userId directories not in that set.
 *   3. Delete directories whose mtime is older than SESSION_TTL_MS
 *      (giving a grace window so brand-new users who haven't finished
 *      their first request aren't immediately swept).
 */
async function runCleanup(): Promise<void> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(BASE_DATA_DIR);
  } catch {
    return; // .data doesn't exist yet
  }

  const liveUserIds = await getLiveUserIds();
  const cutoff = Date.now() - SESSION_TTL_MS;

  await Promise.all(
    entries.map(async (entry) => {
      // Skip the session store directory itself
      if (entry === "sessions") return;

      const entryPath = path.join(BASE_DATA_DIR, entry);
      try {
        const stat = await fs.stat(entryPath);
        if (!stat.isDirectory()) return;

        // If this userId is referenced by a live session, keep it
        if (liveUserIds.has(entry)) return;

        // Only delete if the directory is genuinely stale (past TTL)
        if (stat.mtimeMs > cutoff) return;

        await removeDir(entryPath);
      } catch {
        // Ignore errors for individual entries (may be deleted concurrently)
      }
    }),
  );
}

/**
 * Start the periodic cleanup task. Returns a handle that can be used to
 * stop it (e.g. in tests). Safe to call multiple times — each call creates
 * an independent interval.
 */
export function startRetentionCleanup(): NodeJS.Timeout {
  // Run once at startup (deferred slightly so the server is fully up)
  setTimeout(() => {
    runCleanup().catch((err: unknown) => {
      console.error("[data-retention] startup cleanup failed:", err instanceof Error ? err.message : err);
    });
  }, 10_000);

  // Then every 6 hours
  return setInterval(() => {
    runCleanup().catch((err: unknown) => {
      console.error("[data-retention] periodic cleanup failed:", err instanceof Error ? err.message : err);
    });
  }, CLEANUP_INTERVAL_MS);
}
