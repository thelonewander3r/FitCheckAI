# Privacy & Safety Policy

InterviewReady AI is a **cosmetic appearance guidance tool**. It does not diagnose medical conditions, predict hiring outcomes, or make inferences about a person's identity.

---

## Image Handling

### Temporary use only

Uploaded candidate photos are:

- Used **only** during the active session to generate Skin AI and Apparel VTO results
- **Not written to disk** in the default configuration — the session service uses a 1×1 placeholder image internally when no upload is provided
- **Not associated** with any user account, name, or persistent identifier beyond the ephemeral session ID

### No permanent storage by default

Session data (including any image payload) lives in `.data/sessions.json` for the duration of the browser session. The file-store is ephemeral and should not be committed to source control (it is listed in `.gitignore`).

In a production deployment with a real database, implementers must:

1. Define a retention window (e.g. 24 hours from session creation)
2. Run a scheduled cleanup job to delete expired rows
3. Ensure uploaded images are stored in a private bucket with an equivalent TTL

---

## Skin AI: Cosmetic-Only Rules

All output from YouCam's Skin AI — whether from the live API or the mock provider — **must** pass through the safety layer (`src/lib/safety/skin-safety.ts`) before being presented to the user.

### What the safety layer blocks

The safety layer maintains a list of ~30 prohibited term fragments. Any observation, preparation suggestion, or lighting note containing these terms is **silently dropped** before storage or rendering.

**Prohibited categories:**

| Category | Example terms blocked |
|---|---|
| Diagnostic / disease language | `diagnos`, `disease`, `disorder`, `condition`, `symptom`, `medical`, `clinical`, `treatment`, `cure`, `therapy`, `prescription`, `medication`, `dermatitis`, `rosacea`, `psoriasis`, `eczema`, `acne vulgaris`, `seborrheic`, `malignant`, `benign`, `lesion`, `patholog` |
| Attractiveness / hiring language | `attractive`, `unattractive`, `beautiful`, `ugly`, `hire`, `hiring`, `hired`, `employable`, `employed`, `employer preference`, `candidate appearance` |
| Demographic inference | `race`, `ethnicity`, `ethnic`, `skin color`, `complexion type`, `fitzpatrick`, `dark skin`, `light skin`, `melanin`, `albinism` |

### What the safety layer allows

Output that describes **cosmetic appearance factors** using neutral, actionable language is permitted. Examples:

- "Staying well-hydrated in the days before your interview can help skin appear more even and refreshed."
- "A light, mattifying primer can help create a smooth, camera-friendly surface if desired."
- "Warm-toned lighting (3000–4000 K) is generally flattering for most people on camera."

### Disclaimer

Every `SkinAnalysisResult` returned to the UI includes the following disclaimer, regardless of whether any observations were filtered:

> **"This is cosmetic appearance guidance and not medical advice. Consult a qualified medical professional for skin concerns."**

This text is exported as `COSMETIC_DISCLAIMER` from `src/lib/safety/skin-safety.ts` and rendered by the `<DisclaimerBanner>` component on the analysis page.

---

## Disallowed Outputs

The following outputs are **never** permitted from any component of InterviewReady AI:

1. **Medical diagnoses or treatment recommendations** of any kind
2. **Statements about a candidate's likelihood of being hired** based on appearance
3. **Ratings of physical attractiveness** — in absolute terms or relative to other candidates
4. **Inferences about race, ethnicity, or skin tone** from image analysis
5. **Predictions about employer preferences** based on appearance
6. **Statements that imply appearance determines interview outcome**

If a live API integration produces any of the above, the safety layer will drop the offending item. Implementers should also audit live API responses manually before shipping to production.

---

## Disclaimer Text

The following disclaimer must appear on every page that displays Skin AI output and must not be removed or suppressed:

> *"This is cosmetic appearance guidance and not medical advice. Consult a qualified medical professional for skin concerns."*

Additional footer disclaimer (rendered in the app footer):

> *"InterviewReady AI — outfit guidance only, not professional styling or medical advice."*

---

## No Hiring Predictions

InterviewReady AI explicitly does **not**:

- Predict interview success or failure based on appearance
- Score candidates against employer "preferences"
- Compare candidates to each other
- Claim that any outfit will improve hiring chances

The dress-code inference engine provides guidance based on broad industry and format patterns. Actual hiring decisions are made by humans and depend on qualifications, experience, and fit — not appearance scores from this tool.

---

## Responsible Use

Recruiters, hiring managers, or any party involved in hiring decisions must not use InterviewReady AI output as part of a hiring evaluation. This tool is intended solely for use by the **candidate themselves** to prepare for their own interview.
