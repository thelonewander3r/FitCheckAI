# Implementation Plan — InterviewReady AI

## Repository inspection (pre-change)

| Item | Finding |
|------|---------|
| **Project root** | `C:\Users\E_man\Documents\Projects\InterviewReadyAI` |
| **Existing stack** | None — empty git repository only (`.git`) |
| **Package manager** | **npm** (Node v24.15.0 / npm 11.12.1) |
| **Git branch** | `feature/mvp-foundation` (created from empty `master`) |
| **Uncommitted work** | None at inspection time |

## Status

| Phase | Status |
|-------|--------|
| Phase 1 — Foundation | Complete |
| Phase 2 — Mock working product | Complete |
| Phase 3 — Live YouCam integration | Deferred (stubs + docs ready) |
| Phase 4 — Quality / submission prep | Mostly complete (lint, typecheck, unit, e2e, build green) |

## Persistence note

Prisma schema + SQLite migration exist under `prisma/`. Prisma 7 requires a SQLite driver adapter, so the MVP uses a file session store (`.data/sessions.json`) for reliable demos. Swap to Prisma when the adapter is wired.

## Remaining Phase 3 steps

1. Obtain official YouCam Skin AI + Apparel VTO request/response schemas.
2. Fill TODOs in `src/lib/youcam/types.ts` and `live-provider.ts`.
3. Implement auth headers, polling (if async), timeouts, and rate-limit handling.
4. Keep `YOUCAM_MODE=mock` as the default for credential-free demos.
