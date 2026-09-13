/**
 * Prisma client entrypoint.
 *
 * The Prisma schema and SQLite migration live under `prisma/`.
 * Prisma 7 requires a driver adapter for SQLite (e.g. `@prisma/adapter-libsql`).
 *
 * Runtime persistence for the Workers MVP is not Prisma: JSON document stores
 * go through `src/lib/storage/` (local `.data/*.json` in `next dev`, Cloudflare
 * KV on Workers). The Prisma models remain the canonical data model for a later
 * persistence swap.
 *
 * To enable Prisma:
 * 1. `npm install @prisma/adapter-libsql @libsql/client`
 * 2. Instantiate PrismaClient with a Workers-compatible adapter (not SQLite files)
 * 3. Point `session-service.ts` at Prisma instead of the JSON document store
 */

export const db = null as null;
