# InterviewReady AI

**Walk into your interview dressed for the role.**

InterviewReady AI analyses your job description, infers the expected dress code, recommends tailored outfits with virtual try-ons, and generates a day-by-day preparation plan — all powered by YouCam's Skin AI and Apparel VTO APIs.

---

## Hackathon Context

Built for the **[YouCam API Skin AI & Apparel VTO Hackathon](https://youcam.com)**.  
This project demonstrates how YouCam's cosmetic and fashion AI APIs can reduce interview anxiety by giving candidates clear, actionable appearance guidance before a high-stakes interview.

---

## Screenshots

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
             └── Prisma schema/migrations exist; runtime use is deferred ─┘
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
| `YOUCAM_MODE` | No | Set to `live` to enable live YouCam calls; omit (or use any other value) for mock mode |
| `YOUCAM_API_KEY` | Live only | Your YouCam API key |
| `YOUCAM_BASE_URL` | No | Live API base URL; defaults to the official Perfect Corp host when omitted |
| `DATABASE_URL` | No | SQLite path (e.g. `file:./dev.db`); unused in MVP file-store mode |

---

## Mock Mode (default and verified demo path)

By default the app runs in **mock mode** — no YouCam API keys are required. This is the verified submission/demo path.

```bash
npm run dev
```

Skin AI, Apparel VTO, and venue lookup use deterministic mock data. The mock badge appears in the top-right of each page. Image upload is implemented for the interview selfie and wardrobe pieces; uploads are downscaled before use.

Visit [`http://localhost:3000`](http://localhost:3000) and click **Load demo scenario** to see the full flow instantly.

---

## Live YouCam Integration

> **Status:** `LiveYouCamProvider` is implemented with authenticated upload/task polling, but it has not had a credentialed smoke test. Keep mock mode as the verified demo path.

1. Obtain credentials from the YouCam developer portal.
2. Set environment variables in `.env.local`:
   ```
   YOUCAM_MODE=live
   YOUCAM_API_KEY=your_key_here
   # Optional; defaults to https://yce-api-01.makeupar.com
   YOUCAM_BASE_URL=https://yce-api-01.makeupar.com
   ```
3. Provide a valid candidate image for Skin AI. Live Apparel VTO also requires a candidate image **and a garment reference image**; the current built-in outfit templates and try-on route do not ingest garment assets.

The live provider uses the current Perfect Corp task endpoints and maps responses into the app's domain types. See [`docs/youcam-integration.md`](docs/youcam-integration.md) for requirements and current verification status.

---

## Safety Constraints

- **No medical advice.** All skin output is cosmetic only. A disclaimer is always appended.
- **No hiring predictions.** Language about attractiveness, hirability, or employer preferences is stripped automatically by the safety layer.
- **No demographic inference.** Terms like race, ethnicity, Fitzpatrick scale, and melanin are blocked from appearing in user-facing output.
- **Image handling.** Interview and wardrobe uploads are processed in the app and stored by the MVP's file-based stores as needed for the demo; no external image storage is configured.

See [`docs/privacy-and-safety.md`](docs/privacy-and-safety.md) for the full policy.

---

## Known Limitations

- **Mock mode is the verified/default demo path.** Live YouCam provider code is implemented, but no credentialed smoke test has been completed.
- **Live Apparel VTO needs garment reference images.** The current built-in outfit templates and try-on route do not ingest or submit those assets.
- **Live venue lookup is deferred.** The app uses the mock venue provider; the live provider intentionally fails closed until a real venue API is configured.
- **Video capture is deferred.** Video interview guidance exists, but the app does not capture or upload video.
- **Prisma persistence is deferred.** The MVP uses `.data/sessions.json` and related file stores; Prisma schema/migrations are retained for a later adapter-backed migration.
- **Outfit templates are static.** The six templates are hand-curated rather than pulled from a live garment catalogue.

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

# E2E tests (Playwright) — starts or reuses the dev server automatically
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
