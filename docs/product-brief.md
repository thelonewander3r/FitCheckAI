# FitCheck product brief

## Competitive thesis

FitCheck is not a fashion moodboard, a shopping feed, or a generic chatbot that says “it depends.” It is a **last-mile wardrobe copilot** for the moment someone is standing in front of a closet and needs to leave with confidence.

> **One event in. One outfit you can actually leave in.**

The product starts with what the person already owns, interprets the real-world situation in plain language, and returns a decision rather than more content.

## The customer loop

1. **Name the moment.** “Rooftop dinner in Brooklyn, polished but comfortable” is enough to start. No fashion vocabulary, demographic form, or shopping intake is required.
2. **Read the situation.** FitCheck translates the event into a useful dress direction and a short context explanation. Venue research can be added later; mock context keeps the public demo reliable.
3. **Work the closet.** Existing pieces are ranked into complete combinations before any shopping suggestion. A recommendation is only useful if the person can wear it now.
4. **Make one decision.** The result leads with “Wear this,” explains why it works, offers two backups, and calls out one practical move before leaving.
5. **Close the loop.** The user can save the plan as worn, so future recommendations learn from real behavior instead of aspiration.
6. **Optional finishing check.** A permitted photo can be sent through the server-side YouCam Skin AI path for a separate pre-event skin observation check. FitCheck never infers skin tone or skin needs from wardrobe images.

## What makes the demo judgeable

The guided demo is deterministic and does not depend on a user's local `.data` wardrobe. It uses a small sample closet, shows editorial clothing imagery as clearly labeled reference material, and demonstrates the exact output shape a real user gets. It does not claim those reference images are Apparel VTO inputs or generated try-on results.

The live YouCam story is deliberately narrow and honest:

- **Working integration:** server-side Skin AI upload → task → poll → mapped observations.
- **Public default:** mock-first, so judges can complete the wardrobe decision without credentials.
- **Apparel VTO boundary:** provider-ready code may exist, but no live VTO claim is made until a selected outfit maps to a valid isolated garment reference and passes a real smoke test.

## Product success signals

The first version should be measured by decision quality, not image novelty:

- time from event prompt to a saved lead plan;
- percentage of results with a complete, wearable combination;
- lead-plan save/mark-as-worn rate;
- backup selection rate;
- user response to “I know what to wear” after the result;
- return rate when the next event arrives.

## Deliberate non-goals

- Do not require a long style quiz before the first useful answer.
- Do not push shopping recommendations before using the closet.
- Do not imply that a flat-lay or rack image is an AI try-on result.
- Do not infer skin tone, identity, or medical conditions from an uploaded image.
- Do not expose YouCam credentials in the browser or public repository.
