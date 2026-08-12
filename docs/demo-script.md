# Demo Script

**Target time:** 90–150 seconds  
**Audience:** Hackathon judges / live demo  
**Scenario:** Alex, Data Analytics Specialist, Meridian Financial Group, financial services, onsite final round, $200 budget

---

## Script

### [0:00 – 0:15] Hook — the problem

> "When you're preparing for a high-stakes interview, 'dress professionally' isn't enough.
> Is it a suit or a blazer? What colours work on video? What does the company actually expect?
> InterviewReady AI answers all of that in under two minutes."

---

### [0:15 – 0:35] Load the demo scenario

1. Open [`http://localhost:3000`](http://localhost:3000)  
2. Click **"Load demo scenario"** (or visit `/demo`)

> "I'll use our pre-built scenario — Alex, a Data Analytics Specialist interviewing at Meridian Financial Group, a financial-services firm. It's a final-round onsite interview with a $200 wardrobe budget."

_The app posts to `/api/demo`, creates a session, runs full analysis, and redirects to the Analysis page._

---

### [0:35 – 0:55] Analysis page — inferred dress context

Point to the **Recommended dress code** card.

> "Within seconds the context engine has read the job description, identified the financial-services industry, and resolved the format and stage. It recommends **Business Professional** with 80% confidence."

Point to the colour palette.

> "It also surfaces a recommended colour palette — navy, charcoal, white — and warns against loud prints, neon colours, and overly busy patterns."

Point to the **Skin & appearance notes** section.

> "Below, the YouCam Skin AI layer has generated cosmetic prep notes — hydration reminders, under-eye guidance, lighting suggestions. Notice the disclaimer: this is *cosmetic* advice only, not medical guidance."

---

### [0:55 – 1:15] Virtual Try-On — outfit options

Click **"Continue to Virtual Try-On"**.

> "Now we see three ranked outfit options. The ranking engine scored each against role appropriateness, interview format, budget fit, versatility, and camera readiness."

Point to the score bars on each card.

> "Top of the list is Structured Jacket and Tailored Trousers at 90, then Charcoal Blazer and Black Trousers at 88, then Navy Blazer and Charcoal Trousers at 86 — all scored against role fit, format, budget, versatility, and camera readiness."

Click **"Try On"** on the top-ranked outfit.

> "The YouCam Apparel VTO API generates a virtual preview — in mock mode this is a placeholder, but in live mode it renders the garment on a candidate photo using YouCam's try-on engine."

Click **"Select"** on the recommended outfit.

---

### [1:15 – 1:35] Final plan — 5-day countdown

Click **"Continue to Final Plan"**.

> "InterviewReady AI generates a day-by-day preparation plan. Day 1 is for sourcing the outfit. Day 5 is for hanging the complete look so nothing gets forgotten. The night-before checklist covers pressing the jacket and laying everything out. The one-hour checklist covers dressing, a final mirror check, and arriving early — camera setup only appears for video interviews, and this demo is onsite."

Point to the **Copy summary** button.

> "One click copies the full summary to clipboard so Alex can paste it straight into their calendar or notes app."

---

### [1:35 – 1:45] Wrap — YouCam APIs used

> "Everything you just saw is powered by two YouCam APIs:
> - **Skin AI** — analyses a candidate photo for cosmetic appearance factors and surfaces actionable prep notes
> - **Apparel VTO** — virtually overlays garment assets onto a user photo for realistic try-on previews
>
> Both run through a safety layer that ensures output is cosmetic-only — no medical claims, no hiring predictions, no demographic inferences."

---

## Key Numbers to Mention

| Metric | Value |
|---|---|
| Time from input to analysis | < 1 second (mock) |
| Outfit templates ranked | 6 → top 3 shown |
| Safety terms blocked | 43 prohibited patterns |
| Plan checklist items | 18 onsite (19 for video) |

---

## Troubleshooting During Live Demo

| Problem | Fix |
|---|---|
| `/demo` redirects to `/interview` | Check dev server is running with `npm run dev` |
| Outfit images show empty | Expected in mock mode — VTO previews are placeholder SVGs |
| "Mock mode" badge appears | Normal in mock mode; set `YOUCAM_MODE=live` for live credentials |
| Session not found error | Delete `.data/sessions.json` and reload |
