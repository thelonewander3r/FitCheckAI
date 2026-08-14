/**
 * Prisma client entrypoint.
 *
 * The Prisma schema and SQLite migration live under `prisma/`.
 * Prisma 7 requires a driver adapter for SQLite (e.g. `@prisma/adapter-libsql`).
 *
 * For the hackathon MVP, session persistence uses the simpler file store in
 * `session-store.ts` (`.data/sessions.json`) so the demo works with zero
 * adapter setup. The Prisma models remain the canonical data model for a
 * later persistence swap.
 *
 * To enable Prisma:
 * 1. `npm install @prisma/adapter-libsql @libsql/client`
 * 2. Instantiate PrismaClient with the SQLite/libsql adapter
 * 3. Point `session-service.ts` at Prisma instead of the file store
 */

export const db = null as null;
