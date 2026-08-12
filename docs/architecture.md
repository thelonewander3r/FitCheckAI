# Architecture

## Overview

InterviewReady AI is a Next.js 16 (App Router) application. The server handles session creation and analysis; the client renders results and drives the try-on / plan flow.

---

## System Diagram

```mermaid
graph TD
    subgraph Browser["Browser (Client)"]
        UI[Next.js Pages\napp/interview/…]
    end

    subgraph Server["Next.js Server (API Routes)"]
        SessionsAPI["POST /api/sessions\nPOST /api/demo"]
        AnalyzeAPI["POST /api/sessions/:id/analyze"]
        TryOnAPI["POST /api/sessions/:id/try-on"]
        SelectAPI["POST /api/sessions/:id/select"]
        PlanAPI["POST /api/sessions/:id/plan"]
    end

    subgraph Lib["Business Logic (src/lib)"]
        ContextEngine["Interview Context Engine\ninterviewcontext-engine.ts\n─ keyword detection\n─ formality resolution\n─ dress-code + colours"]
        OutfitRanking["Outfit Ranking Engine\noutfits/ranking.ts\n─ scoreBudgetFit\n─ scoreRoleAppropriateness\n─ scoreFormatSuitability\n─ selectTopOutfits"]
        SafetyLayer["Safety Layer\nsafety/skin-safety.ts\n─ prohibited-term filter\n─ applySkinSafety\n─ COSMETIC_DISCLAIMER"]
        YouCamProvider["YouCam Provider\nyoucam/\n─ MockYouCamProvider\n─ LiveYouCamProvider (stub)\n─ Skin AI\n─ Apparel VTO"]
        PlanGen["Preparation Plan Generator\nprep/plan-generator.ts\n─ 5-day checklist\n─ night-before / 1-hr-before"]
    end

    subgraph Persistence["Persistence"]
        FileStore["File Session Store\n.data/sessions.json\n(MVP)"]
        PrismaSchema["Prisma Schema (ready)\nprisma/schema.prisma\nSQLite migrations"]
    end

    UI -->|"intake form"| SessionsAPI
    UI -->|"fetch session"| AnalyzeAPI
    UI -->|"try-on request"| TryOnAPI
    UI -->|"outfit selection"| SelectAPI
    UI -->|"generate plan"| PlanAPI

    SessionsAPI --> ContextEngine
    SessionsAPI --> OutfitRanking
    SessionsAPI --> YouCamProvider
    AnalyzeAPI --> ContextEngine
    AnalyzeAPI --> YouCamProvider
    TryOnAPI --> YouCamProvider
    PlanAPI --> PlanGen

    ContextEngine --> SafetyLayer
    YouCamProvider --> SafetyLayer

    SessionsAPI --> FileStore
    AnalyzeAPI --> FileStore
    TryOnAPI --> FileStore
    SelectAPI --> FileStore
    PlanAPI --> FileStore

    PrismaSchema -.->|"future migration"| FileStore
```

---

## Request / Response Flow

### 1. Intake → Analysis

```
POST /api/sessions
  body: IntakePayload (validated by IntakeSchema / Zod)
        │
        ├─► inferInterviewContext()
        │     ├── detect formality from industry keywords
        │     ├── adjust for interviewFormat (video / onsite / executive / …)
        │     ├── adjust for interviewStage (final bumps formality)
        │     └── returns InterviewContext { dressCode, recommendedColors, avoidPatterns, … }
        │
        ├─► selectTopOutfits()
        │     ├── score each OutfitTemplate against context + budget + format
        │     └── return top 3 RankedOutfit[]
        │
        └─► YouCam Skin AI (mock or live)
              ├── analyzeSkin(imageBase64)
              ├── safety filter → applySkinSafety()
              └── attach to session
```

### 2. Virtual Try-On

```
POST /api/sessions/:id/try-on   { outfitId }
        │
        └─► YouCam Apparel VTO
              ├── generateApparelTryOn({ userImageBase64, garmentAssetId })
              └── returns ApparelTryOnResult { renderedImageUrl, isMock }
```

### 3. Preparation Plan

```
POST /api/sessions/:id/plan
        │
        └─► generatePreparationPlan({ selected, alternative, context, interviewFormat, interviewDate })
              └── returns PreparationPlan {
                    fiveDayChecklist, nightBeforeChecklist,
                    oneHourBeforeChecklist, lightingAndCameraSuggestions,
                    summaryText, whySelected, estimatedTotalPrice
                  }
```

---

## Prisma Models

The `prisma/schema.prisma` defines the following models (SQLite, migrations applied):

| Model | Purpose |
|---|---|
| `InterviewSession` | Root session record — links all other models |
| `UploadedImage` | Optional candidate photo |
| `InterviewContextRecord` | Persisted inference result |
| `SkinAnalysis` | Raw + filtered Skin AI output |
| `Outfit` | Ranked outfit snapshot per session |
| `OutfitEvaluation` | Per-dimension scores for an outfit |
| `VirtualTryOnResult` | VTO rendered image URL |
| `PreparationPlan` | Generated checklist + summary |

### MVP persistence note

Prisma 7 requires a **driver adapter** for SQLite (e.g. `@prisma/adapter-better-sqlite3`). For the hackathon MVP the app uses a lightweight **file-based session store** (`src/lib/session-store.ts`) that reads/writes `.data/sessions.json`. Switching to the Prisma client is a one-file change in `src/lib/db.ts` once an adapter is added.

---

## YouCam Provider Abstraction

```
YouCamProvider (interface)
  ├── MockYouCamProvider   ← default; deterministic, no credentials needed
  └── LiveYouCamProvider   ← stub; throws until official schema is confirmed
```

The active provider is selected at runtime:

```ts
// src/lib/youcam/index.ts
const provider =
  process.env.YOUCAM_MODE === 'live'
    ? new LiveYouCamProvider(config)
    : new MockYouCamProvider()
```

---

## Safety Layer

Every piece of text that originates from a YouCam API response passes through `applySkinSafety()` before being stored or rendered:

1. `sanitizeSkinAnalysisText(text)` — checks for ~30 prohibited terms (diagnostic, attractiveness, hiring, demographic)
2. Observations / suggestions containing prohibited terms are **silently dropped** (not redacted)
3. `COSMETIC_DISCLAIMER` is **always** appended to the disclaimer field

---

## Directory Structure

```
src/
  app/              ← Next.js App Router pages + API routes
  components/       ← UI components (shadcn-style)
  lib/
    interview/      ← context-engine, demo-scenario
    outfits/        ← templates, ranking
    prep/           ← plan-generator
    safety/         ← skin-safety
    services/       ← session-service (orchestrator)
    validation/     ← Zod schemas
    youcam/         ← provider interface + mock + live stub
  types/            ← shared TypeScript domain types
prisma/             ← schema.prisma + migrations
docs/               ← this documentation
```
