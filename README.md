# InterviewReady AI

**Walk into your interview dressed for the role.**

InterviewReady AI analyses your job description, infers the expected dress code, recommends tailored outfits with virtual try-ons, and generates a day-by-day preparation plan — all powered by YouCam's Skin AI and Apparel VTO APIs.

---

## Hackathon Context

Built for the **[YouCam API Skin AI & Apparel VTO Hackathon](https://youcam.com)**.  
This project demonstrates how YouCam's cosmetic and fashion AI APIs can reduce interview anxiety by giving candidates clear, actionable appearance guidance before a high-stakes interview.

---

## Screenshots

> _Screenshots go here once the app is running._

| Landing page | Analysis | Virtual Try-On | Preparation Plan |
|---|---|---|---|
| ![Landing](docs/screenshots/landing.png) | ![Analysis](docs/screenshots/analysis.png) | ![Virtual Try-On](docs/screenshots/try-on.png) | ![Preparation Plan](docs/screenshots/plan.png) |

---

## Architecture Overview

```
Candidate fills intake form
       │
       ▼
Next.js App Router  ─────────────────────────────────────────┐
  /api/sessions (POST)                                        │
       │                                                      │
       ├─► Interview Context Engine                           │
       │     ├── Keyword-based industry inference             │
       │     ├── Formality level resolution                   │
       │     └── Dress-code + colour recommendations          │
       │                                                      │
       ├─► Outfit Ranking Engine                              │
       │     ├── Templates scored: role fit, format,          │
       │     │   budget, versatility, camera readiness        │
       │     └── Top 3 returned to UI                         │
       │                                                      │
       ├─► YouCam Provider (mock or live)                     │
       │     ├── Skin AI  → cosmetic prep notes               │
       │     └── Apparel VTO → rendered outfit preview        │
       │                                                      │
       ├─► Safety layer                                       │
       │     └── Strips medical/hiring language from output   │
       │                                                      │
       └─► Session Store (file-based .data/sessions.json)     │
             └── Prisma schema ready for SQLite migration ────┘
```

See [`docs/architecture.md`](docs/architecture.md) for the full Mermaid diagram.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Validation | Zod 4 |
| ORM schema | Prisma 7 (SQLite) |
| Session store (MVP) | File-based `.data/sessions.json` |
| Unit tests | Vitest 4 |
| E2E tests | Playwright |
| AI / APIs | YouCam Skin AI + Apparel VTO |

---

## Setup Instructions

### Prerequisites

- Node.js 20+
- npm 10+

### Install dependencies

```bash
npm install
```

This runs `prisma generate` automatically via the `postinstall` script.

### Environment variables

Copy the example file and fill in values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `YOUCAM_MODE` | No | Set to `live` to enable live YouCam calls; omit for mock mode |
| `YOUCAM_API_KEY` | Live only | Your YouCam API key |
| `YOUCAM_BASE_URL` | Live only | Base URL for YouCam API endpoints |
| `DATABASE_URL` | No | SQLite path (e.g. `file:./dev.db`); unused in MVP file-store mode |

---

## Mock Mode (default)

By default the app runs in **mock mode** — no YouCam API keys required.

```bash
npm run dev
```

All Skin AI and Apparel VTO calls return deterministic, safe, cosmetic-only placeholder data. The mock badge appears in the top-right of each page.

Visit [`http://localhost:3000`](http://localhost:3000) and click **Load demo scenario** to see the full flow instantly.

---

## Live YouCam Integration

> **Status:** interface defined; live provider stub in place. Requires YouCam API credentials and official schema confirmation.

1. Obtain credentials from the YouCam developer portal.
2. Set environment variables in `.env.local`:
   ```
   YOUCAM_MODE=live
   YOUCAM_API_KEY=your_key_here
   YOUCAM_BASE_URL=https://api.youcam.example.com
   ```
3. Fill in the `// TODO: replace with official schema` placeholders in [`src/lib/youcam/types.ts`](src/lib/youcam/types.ts).
4. Implement `src/lib/youcam/live-provider.ts` (currently throws `Not implemented`).

See [`docs/youcam-integration.md`](docs/youcam-integration.md) for the full provider interface and migration guide.

---

## Safety Constraints

- **No medical advice.** All skin output is cosmetic only. A disclaimer is always appended.
- **No hiring predictions.** Language about attractiveness, hirability, or employer preferences is stripped automatically by the safety layer.
- **No demographic inference.** Terms like race, ethnicity, Fitzpatrick scale, and melanin are blocked from appearing in user-facing output.
- **No permanent image storage.** Uploaded images are used only during a session and are not persisted to disk by default.

See [`docs/privacy-and-safety.md`](docs/privacy-and-safety.md) for the full policy.

---

## Known Limitations

- **Live YouCam endpoints not yet wired.** The live provider stub throws on any call. Mock mode is the only functional integration today.
- **Prisma 7 requires a driver adapter for SQLite.** The MVP uses a file-based session store (`.data/sessions.json`) while Prisma schema and migrations are ready. Swap to the Prisma client once a compatible adapter (e.g. `@prisma/adapter-better-sqlite3`) is added.
- **No image upload UI.** The intake form does not yet include a file picker; the session service uses a 1×1 placeholder image for VTO calls.
- **Outfit templates are static.** The six templates are hand-curated. A real integration would pull from the YouCam garment asset catalogue.

---

## Demo Flow

1. Open [`http://localhost:3000`](http://localhost:3000)
2. Click **Load demo scenario** (or navigate to `/demo`)
3. The app pre-fills the Alex / Data Analytics / Meridian Financial Group scenario and runs analysis
4. **Analysis page** — see inferred dress code (Business Professional), recommended colours, and cosmetic prep notes
5. **Virtual Try-On page** — browse three ranked outfits; click **Try on** to generate a VTO preview
6. **Select** your preferred outfit and click **Continue to Final Plan**
7. **Plan page** — review the 5-day countdown checklist, night-before checklist, and 1-hour-before checklist

For the full scripted walkthrough see [`docs/demo-script.md`](docs/demo-script.md).

---

## Running Tests

```bash
# Unit tests (Vitest)
npm test

# Unit tests in watch mode
npm run test:watch

# E2E tests (Playwright) — dev server must be running separately
npm run test:e2e

# Type-check without emitting
npm run typecheck
```

---

## Database / ORM Commands

```bash
npm run db:generate   # prisma generate
npm run db:migrate    # prisma migrate dev
```

---

## License

MIT
