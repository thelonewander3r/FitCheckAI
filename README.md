# FitCheck AI

**Know what to wear, using what you own.**

FitCheck AI checks a complete outfit against a real event. The user describes
what they are attending in one sentence, the app infers a broad dress context, and
its wardrobe composer recommends coherent looks from pieces already owned. The
interview flow remains available as a focused mode, while shopping and garment
purchasing are intentionally deferred to a later phase.

---

## Hackathon Context

Built for the **[YouCam API Skin AI & Apparel VTO Hackathon](https://youcam.com)**.  
This project demonstrates how YouCam's cosmetic and fashion AI APIs can support a practical, wardrobe-first outfit check: FitCheck AI gathers event context and composes from the closet, while YouCam adds optional Skin AI guidance and visual try-on when valid image inputs are available.

---

## Screenshots

| Landing page | Analysis | Virtual Try-On | Preparation Plan |
|---|---|---|---|
| ![Landing](docs/screenshots/landing.png) | ![Analysis](docs/screenshots/analysis.png) | ![Virtual Try-On](docs/screenshots/try-on.png) | ![Preparation Plan](docs/screenshots/plan.png) |

---

## Architecture Overview

```
Describe the event in one sentence
       │
       ▼
Next.js App Router  ─────────────────────────────────────────┐
  /api/occasions (POST)                                       │
       │                                                      │
       ├─► Event Inference + Detail Assessment               │
       │     ├── Plain-language event classification        │
       │     ├── Ask for restaurant / venue / company when │
       │     │   the request is sparse                     │
       │     └── Optional color + manual skin-tone palette │
       │                                                      │
       ├─► Event Context Provider                            │
       │     ├── Curated mock context today                 │
       │     └── Bounded web research adapter later         │
       │                                                      │
       ├─► Wardrobe Composer                                 │
       │     ├── Existing pieces + worn-style history        │
       │     ├── Formality / palette compatibility            │
       │     └── Complete looks + wardrobe gaps               │
       │                                                      │
       ├─► YouCam Provider (mock or live)                     │
       │     ├── Skin AI  → cosmetic prep notes               │
       │     └── AI Clothes VTO → renders a chosen wardrobe   │
       │           piece onto the user's photo, using that     │
       │           piece's own saved wardrobe image            │
       │                                                      │
       ├─► Safety layer                                       │
       │     └── Strips medical/hiring language from output   │
       │                                                      │
       └─► JSON document stores (fs locally, KV on Workers)     │
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
| Session store (MVP) | JSON documents: `.data/*.json` locally, Cloudflare KV on Workers |
| Temp images | Local `uploads/tmp` or Cloudflare R2 (`FITCHECK_R2`) |
| Unit tests | Vitest 4 |
| E2E tests | Playwright |
| AI / APIs | YouCam Skin AI + Apparel VTO |
| Workers runtime | vinext (Vite Next.js on Cloudflare Workers) |

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
| `VENUE_MODE` | No | Set to `openai` to enable optional OpenAI web research for concrete venue/location anchors; omit for deterministic mock context |
| `OPENAI_API_KEY` | OpenAI research only | Server-side OpenAI API key; never expose it to the browser |
| `OPENAI_WEB_SEARCH_MODEL` | No | OpenAI model used with the Responses web-search tool; defaults to `gpt-4o-mini` |
| `YOUCAM_MODE` | No | Set to `live` to enable live YouCam calls; omit (or use any other value) for mock mode |
| `YOUCAM_API_KEY` | Live only | Your YouCam API key |
| `YOUCAM_BASE_URL` | No | Live API base URL; defaults to the official Perfect Corp host when omitted |
| `DATABASE_URL` | No | SQLite path (e.g. `file:./dev.db`); unused in MVP store mode |
| `FITCHECK_STORAGE` | No | `fs` (local files), `cloudflare` (KV/R2), or `memory` (tests). Omit to auto-detect: `next dev` → fs, Workers → KV/R2 |
| `UPLOAD_TEMP_DIR` | No | Local temp directory for ephemeral images when using the fs adapter |

---

## Mock Mode (default and verified demo path)

By default the app runs in **mock mode** — no YouCam API keys are required. This is the verified submission/demo path.

```bash
npm run dev
```

Skin AI, AI Clothes VTO, and event context lookup use deterministic mock data by default. If `VENUE_MODE=openai` is configured, concrete venue/location anchors can use a bounded OpenAI web-search request and store only structured style context plus up to three source URLs. Sparse event prompts reveal follow-up questions for location, dress code, and optional color guidance. The mock badge appears in the top-right of each page. Image upload is implemented for the optional interview selfie and wardrobe pieces; uploads are downscaled before use.

Start at [`http://localhost:3000`](http://localhost:3000). Use **Start with an occasion** to jump to the open-ended event prompt, then submit a natural-language request. If you want to see a deterministic example, click **See an event example** to open the rooftop dinner event flow.

---

## Live YouCam Integration

> **Status:** `LiveYouCamProvider` is implemented with authenticated upload/task polling, and both APIs are wired into the wardrobe flow. A credentialed local smoke test verified the full live Skin AI path. Live Apparel VTO is wired end-to-end and covered by an integration test that drives the real provider against a stubbed Perfect Corp API; it has not yet been run against the live API with credentials.

1. Obtain credentials from the YouCam developer portal.
2. Set environment variables in `.env.local`:
   ```
   YOUCAM_MODE=live
   YOUCAM_API_KEY=your_key_here
   # Optional; defaults to https://yce-api-01.makeupar.com
   YOUCAM_BASE_URL=https://yce-api-01.makeupar.com
   ```
3. Add wardrobe pieces with photos. Apparel VTO uses the photo already saved for
   the chosen piece as the garment reference, so a real closet is the input — no
   catalog assets required. Skin AI needs a selfie with a short side of at least
   480px; the client downscales uploads before they are sent.

Both APIs are reachable from the occasion plan at `/occasion/[id]`: **See it on you** renders a selected wardrobe piece with AI Clothes, and **Optional cosmetic prep** runs Skin AI. See [`docs/youcam-integration.md`](docs/youcam-integration.md) for the request flow and verification status.

---

## Safety Constraints

- **No medical advice.** All skin output is cosmetic only. A disclaimer is always appended.
- **No hiring predictions.** Language about attractiveness, hirability, or employer preferences is stripped automatically by the safety layer.
- **No demographic inference.** Terms like race, ethnicity, Fitzpatrick scale, and melanin are blocked from appearing in user-facing output.
- **Image handling.** Interview and wardrobe uploads are processed in the app and stored in the JSON document stores as needed for the demo. On Workers, those documents live in KV; ephemeral temp blobs use R2.

See [`docs/privacy-and-safety.md`](docs/privacy-and-safety.md) for the full policy.

---

## Known Limitations

- **Mock mode is the default so the app runs without credentials.** Live Skin AI has been credentialed-tested locally. Live Apparel VTO is wired end-to-end from the occasion plan and verified against a stubbed Perfect Corp API, but has not yet been exercised against the live API with a real key.
- **Apparel VTO renders one piece at a time.** AI Clothes takes a single garment per task, so the app nominates the piece that defines the look (dress → outer layer → top → bottom) and lets the user switch pieces. It does not composite a whole multi-piece outfit in one render.
- **Try-on needs a saved wardrobe photo.** Pieces without an image cannot be rendered in live mode; the guided demo closet has no photos, so live try-on there returns a clear "add a photo" state rather than a render.
- **Event context research is optional.** Set `VENUE_MODE=openai` with a server-side `OPENAI_API_KEY` to research concrete venue/location anchors through the Responses web-search tool; the default mock provider remains the reliable demo path. The app stores structured context and source URLs rather than raw web pages.
- **YouCam is downstream of styling.** FitCheck composes outfits from wardrobe items; YouCam can analyze or render valid user/garment images, but it does not discover a wardrobe or select a multi-piece outfit.
- **Video capture is deferred.** Video interview guidance exists, but the app does not capture or upload video.
- **Prisma persistence is deferred.** The MVP uses JSON document stores (local `.data/*.json` or Cloudflare KV). Prisma schema/migrations are retained for a later adapter-backed migration.
- **Outfit templates are static.** The six templates are hand-curated; wardrobe composition becomes more useful as users add pieces and worn history.

---

## Demo Flows

### Event demo from the landing page

1. Open [`http://localhost:3000`](http://localhost:3000)
2. Click **See a finished plan** (or navigate to `/occasion/demo`)
3. Review the rooftop dinner event context, the inferred dress code, and the lead outfit
4. In **See it on you**, pick a piece and upload a full-length photo to get a YouCam AI Clothes render
5. In **Optional cosmetic prep**, upload a selfie to run YouCam Skin AI
6. Add your own pieces from **My wardrobe** to compose from a real closet

### Legacy YouCam walkthrough

The original interview-focused YouCam walkthrough remains available directly at
`/demo` for hackathon testing:

1. Navigate to `/demo`
2. The app pre-fills the Alex / Data Analytics / Meridian Financial Group scenario and runs analysis
3. **Analysis page** — see inferred dress code (Business Professional), recommended colours, and cosmetic prep notes
4. **Virtual Try-On page** — browse three ranked outfits and click **Try on** to generate a VTO preview
5. **Select** your preferred outfit and click **Continue to Final Plan**
6. **Plan page** — review the 5-day countdown checklist, night-before checklist, and 1-hour-before checklist

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

## Deploy to Cloudflare

This app targets **Cloudflare Workers** via **vinext** (Cloudflare’s current Next.js 16 path). OpenNext is not used; `npx vinext check` reported ~88% compatibility (the only hard issue was adding `"type": "module"`, which `vinext init` applied). `next/font/google` loads from the CDN instead of being self-hosted.

Mock YouCam remains the default. The app demos without live API keys.

### Bindings

| Binding | Type | Purpose |
|---|---|---|
| `FITCHECK_KV` | KV namespace | JSON documents: `doc:sessions`, `doc:occasions`, `doc:wardrobe`, `doc:worn` |
| `FITCHECK_R2` | R2 bucket `fitcheck-temp` | Ephemeral temp images only (`tmp/…`); delete after use |
| `ASSETS` | Workers static assets | vinext client build |
| `CF_VERSION_METADATA` | version metadata | vinext Workers Cache CDN adapter |

Local `npm run dev` does **not** need these bindings. It uses the filesystem adapter (`.data/` + `uploads/tmp`) unless `FITCHECK_STORAGE=cloudflare`. Vitest uses `FITCHECK_STORAGE=memory`.

### One-time Cloudflare setup (Emanuel)

1. `npx wrangler login`
2. `npx wrangler kv namespace create FITCHECK_KV` — paste the returned id into `wrangler.jsonc` (`kv_namespaces[0].id`). The committed value `00000000000000000000000000000000` is a placeholder and will fail a real deploy.
3. `npx wrangler r2 bucket create fitcheck-temp`
4. Optional live / venue keys (omit for mock demo):

```bash
npx wrangler secret put YOUCAM_API_KEY
# npx wrangler secret put OPENAI_API_KEY
```

Vars in `wrangler.jsonc` (safe to commit): `YOUCAM_MODE=mock`. Override locally in `.dev.vars` (see `.dev.vars.example`). Optional vars: `YOUCAM_BASE_URL`, `VENUE_MODE`, `OPENAI_WEB_SEARCH_MODEL`.

### Scripts

```bash
npm run dev              # Next.js on :3000 (filesystem stores)
npm run dev:vinext      # vinext + local Workers runtime on :3001 (Miniflare KV/R2)
npm run build:vinext    # production Worker + assets
npm run preview:cf      # build then wrangler dev
npm run deploy:vinext   # vinext-cloudflare deploy (needs wrangler login + real KV id)
```

This cloud agent cannot `wrangler deploy` without your Cloudflare auth. After the steps above, `npm run deploy:vinext` from a logged-in machine should be enough.

Naïve `next start` on Workers would fail because the original stores used `fs` (`process.cwd()`, `.data/*.json`, `uploads/tmp`). Those APIs now go through `src/lib/storage/`.

---

## Free tier

Designed for **Workers Free** first. Do not assume Workers Paid.

| Resource | Free limit | How this app stays inside it |
|---|---|---|
| Worker CPU | **10 ms / request** | Mock YouCam by default; one KV document per store; no Durable Objects; no Next data-cache KV adapter (those writes would compete with app data). SSR still often needs 10–20 ms — see below. |
| Worker requests | 100k / day | Fine for demo traffic. Static assets do not use CPU the same way as SSR. |
| KV writes | **1,000 / day** | Four coarse keys only. Mutations coalesce in-request (`runStorageBatch`). Reads do not write. |
| KV reads | 100k / day | One get per document per request (plus in-request cache). |
| KV storage | 1 GB | Keep wardrobe photos tiny (client already downscales). Do not treat KV as a photo library. |
| R2 | 10 GB, 1M Class A / 10M Class B / month | Temp blobs only, 2 MB cap, delete after use. Wardrobe photos stay in the KV JSON, not R2. |

### Typical demo KV writes

A mock **occasion** walkthrough (landing → demo plan → optional try-on + skin prep, no extra wardrobe edits):

| Action | KV writes |
|---|---|
| Create demo / occasion | 1 (`doc:occasions`) |
| Try-on one look | 1 |
| Skin prep | 1 |
| Add one wardrobe piece | 1 (`doc:wardrobe`) |
| Log a worn outfit | 1 (`doc:worn`) |

Expect **about 3–8 writes** for a short demo, ~15 if you add several closet photos. Interview intake (`POST /api/sessions`) is create + analyzing + ready ≈ **3 writes** on `doc:sessions`. Thousands of closet-photo uploads in a day would burn the write budget and the 1 GB cap — don’t do that on Free.

### What will likely fail on Free

Cloudflare documents that SSR / large JSON parse often uses **10–20 ms CPU**. A full App Router render of FitCheck (React RSC, Zod, wardrobe JSON with base64 images) is likely to hit **Error 1102** (`Worker exceeded resource limits`) on Free even with vinext. Mock API routes that only read a small KV document may fit; HTML pages and live YouCam (CPU + 50 subrequest cap) are the risk.

If CPU kills the deploy, the honest fallback is not more KV trickery:

1. **Upgrade path (one line):** Cloudflare Dashboard → **Workers & Pages** → **Workers plans** → **Workers Paid ($5/mo)** — CPU becomes 30s default (up to 5 min), then redeploy.
2. **Stay on Free (heavier cut):** static-export the marketing/demo pages and keep only a few `/api/*` routes on the Worker. Not implemented in this PR; try the full vinext Worker first and check Workers Logs CPU time.

This project does **not** use Durable Objects, Prisma/SQLite, or Cloudflare Images (Images bindings can require extra product setup).

---

## Database / ORM Commands

```bash
npm run db:generate   # prisma generate
npm run db:migrate    # prisma migrate dev
```

---

## License

MIT
