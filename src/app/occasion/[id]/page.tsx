"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import type { OccasionSession, PersistedOutfit } from "@/types/occasion";
import type { WardrobeItem } from "@/types/wardrobe";

interface Props {
  params: Promise<{ id: string }>;
}

const DRESS_CODE_LABELS: Record<string, string> = {
  casual: "Casual",
  "smart-casual": "Smart casual",
  "business-casual": "Business casual",
  "business-professional": "Business professional",
  formal: "Formal",
};

function labelize(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function matchLabel(score: number): string {
  if (score >= 80) return "Strong match";
  if (score >= 70) return "Good match";
  return "Worth considering";
}

function ItemThumbnail({
  item,
  imageById,
  sizeClass,
}: {
  item: { id: string; name?: string; category: string; color?: string };
  imageById: Map<string, string>;
  sizeClass: string;
}) {
  const imageBase64 = imageById.get(item.id);
  if (imageBase64) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`data:image/jpeg;base64,${imageBase64}`}
        alt={item.name || item.category}
        className={`${sizeClass} shrink-0 rounded-xl border border-[#d8e1e5] object-cover`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} shrink-0 rounded-xl border border-[#d8e1e5] bg-gradient-to-br from-[#e8f3f1] to-[#f5eadf] p-3`}
      aria-label={`${item.name || item.category} wardrobe piece`}
    >
      <span className="block text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-[#2a6f7f]">
        {item.category}
      </span>
      <span className="mt-2 block text-xs font-semibold leading-tight text-[#0f2744]">
        {item.name || "Wardrobe piece"}
      </span>
      {item.color && (
        <span className="mt-1 block text-[0.68rem] capitalize text-[#718096]">
          {item.color}
        </span>
      )}
    </div>
  );
}

function SavePlanButton({
  outfit,
  marked,
  pending,
  error,
  onMark,
}: {
  outfit: PersistedOutfit;
  marked: boolean;
  pending?: boolean;
  error: string | null;
  onMark: (outfit: PersistedOutfit) => void;
}) {
  if (marked) {
    return <span className="text-sm font-semibold text-[#2a6f7f]">Saved to your plans ✓</span>;
  }
  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => onMark(outfit)}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0f2744] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0a1d35] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Saving plan…" : "Save this plan"}
      </button>
      {error && <p className="text-xs text-[#718096]">{error}</p>}
    </div>
  );
}

function OutfitReference({
  outfit,
  isDemo,
}: {
  outfit: PersistedOutfit;
  isDemo?: boolean;
}) {
  if (!outfit.previewImageUrl) return null;
  return (
    <figure className="overflow-hidden rounded-2xl border border-[#d8e1e5] bg-[#f7f1e9]">
      {/* Editorial references are licensed demo imagery, not photos of the user's closet. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={outfit.previewImageUrl}
        alt={outfit.previewImageAlt ?? "Editorial outfit reference"}
        className="h-64 w-full object-cover sm:h-80"
      />
      <figcaption className="px-4 py-3 text-xs leading-5 text-[#718096]">
        {isDemo
          ? "Editorial reference for this demo plan — your saved pieces remain the source of truth."
          : "Reference image for styling context."}
      </figcaption>
    </figure>
  );
}

export default function OccasionDetailPage({ params }: Props) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [session, setSession] = useState<OccasionSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [imageById, setImageById] = useState<Map<string, string>>(new Map());
  const [wardrobeCount, setWardrobeCount] = useState(0);
  const [markedWorn, setMarkedWorn] = useState<Record<string, boolean>>({});
  const [markingWorn, setMarkingWorn] = useState<Record<string, boolean>>({});
  const [wornErrors, setWornErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    params.then(({ id: occasionId }) => setId(occasionId));
  }, [params]);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      fetch(`/api/occasions/${id}`).then((response) => response.json()),
      fetch("/api/wardrobe").then((response) => response.json()),
    ])
      .then(
        ([occasionData, wardrobeData]: [
          OccasionSession & { error?: string },
          { items?: WardrobeItem[]; error?: string },
        ]) => {
          if (occasionData.error) {
            setLoadError(occasionData.error);
            return;
          }
          setSession(occasionData);
          const items = wardrobeData.items ?? [];
          setWardrobeCount(items.length);
          setImageById(new Map(items.map((item) => [item.id, item.imageBase64])));
        },
      )
      .catch(() => setLoadError("Failed to load your outfit plan."));
  }, [id]);

  async function handleMarkWorn(outfit: PersistedOutfit) {
    if (!session || markedWorn[outfit.id] || markingWorn[outfit.id]) return;
    setMarkingWorn((previous) => ({ ...previous, [outfit.id]: true }));
    setWornErrors((previous) => {
      const next = { ...previous };
      delete next[outfit.id];
      return next;
    });
    try {
      const response = await fetch("/api/worn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasionId: session.id,
          eventType: session.intake.eventType,
          items: outfit.items.map(({ id: itemId, name, category, color, formality }) => ({
            id: itemId,
            name,
            category,
            color,
            formality,
          })),
        }),
      });
      if (!response.ok) {
        setWornErrors((previous) => ({ ...previous, [outfit.id]: "Could not save this plan." }));
        return;
      }
      setMarkedWorn((previous) => ({ ...previous, [outfit.id]: true }));
    } catch {
      setWornErrors((previous) => ({ ...previous, [outfit.id]: "Could not save this plan." }));
    } finally {
      setMarkingWorn((previous) => {
        const next = { ...previous };
        delete next[outfit.id];
        return next;
      });
    }
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8] px-6">
        <div className="max-w-sm rounded-2xl border border-red-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-red-600">{loadError}</p>
          <button
            onClick={() => router.push("/occasion")}
            className="mt-4 text-sm text-[#2a6f7f] hover:underline"
          >
            Start another plan
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f6f8]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#d8e1e5] border-t-[#2a6f7f]" />
        <p className="font-serif text-base font-medium text-[#0f2744]">Building your outfit plan…</p>
      </div>
    );
  }

  const { intake, venueContext, outfits, gaps, isMockMode, isDemo } = session;
  const topOutfit = outfits[0];
  const alternatives = outfits.slice(1, 3);
  const emptyWardrobe = outfits.length === 0 && wardrobeCount === 0;
  const eventLabel = labelize(intake.eventType);
  const lastMove = gaps[0]
    ? `The one gap to solve: ${gaps[0]}. Everything else is ready.`
    : venueContext?.cultureHints[0] ?? "Keep your outer layer handy so the plan works after sunset.";

  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-16">
      <header className="border-b border-[#e2e8f0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="font-serif text-base font-semibold text-[#0f2744] hover:text-[#2a6f7f]">
            FitCheck AI
          </Link>
          <div className="flex items-center gap-3">
            {isDemo && <Badge variant="accent" className="text-xs">Guided demo</Badge>}
            {!isDemo && isMockMode && <Badge variant="outline" className="text-xs">Mock context</Badge>}
            <Link href="/wardrobe" className="hidden text-sm font-medium text-[#2a6f7f] hover:underline sm:inline">
              My wardrobe
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 pt-10">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2a6f7f]">Your answer</p>
            <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-[#0f2744] sm:text-5xl">
              Your {eventLabel.toLowerCase()} outfit plan.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#53616d]">
              For <span className="font-semibold text-[#0f2744]">{intake.venueName}</span>
              {intake.theme ? ` · ${intake.theme}` : ""}
              {intake.location ? ` · ${intake.location}` : ""}
            </p>
          </div>
          <Link href="/occasion" className="text-sm font-semibold text-[#2a6f7f] hover:underline">
            Change the occasion →
          </Link>
        </section>

        {emptyWardrobe ? (
          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-[#d8e1e5] bg-white p-8 shadow-sm sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2a6f7f]">One thing left</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#0f2744]">Give FitCheck a few real pieces.</h2>
              <p className="mt-3 max-w-xl text-base leading-7 text-[#53616d]">
                The event read is ready. Add a top, a bottom, and shoes so FitCheck can make a real decision instead of handing you generic inspiration.
              </p>
              <Link href="/wardrobe" className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#0f2744] px-5 text-sm font-semibold text-white hover:bg-[#0a1d35]">
                Add my wardrobe
              </Link>
            </div>
            <div className="rounded-3xl border border-[#d8e1e5] bg-[#e8f3f1] p-8 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2a6f7f]">Event read</p>
              <h2 className="mt-3 font-serif text-2xl font-semibold text-[#0f2744]">
                {DRESS_CODE_LABELS[venueContext?.dressCode ?? ""] ?? "A clear starting point"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#53616d]">
                {venueContext?.cultureHints[0] ?? "Your event details are enough to start. Add a venue or location for a more specific read."}
              </p>
              <div className="mt-6 border-t border-[#2a6f7f]/15 pt-5 text-sm text-[#53616d]">
                <p className="font-semibold text-[#0f2744]">What happens next</p>
                <p className="mt-2">We will rank complete combinations from your saved pieces first — no shopping rabbit hole.</p>
              </div>
              <p className="mt-5 text-xs text-[#718096]">{venueContext?.isMock ? "Mock context is on — useful for the demo, replace it with venue research later." : `Source: ${venueContext?.source}`}</p>
            </div>
          </section>
        ) : topOutfit ? (
          <>
            <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]" data-testid="outfit-plan">
              <div className="rounded-3xl border border-[#d8e1e5] bg-white p-5 shadow-sm sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2a6f7f]">Wear this</p>
                    <h2 className="mt-2 font-serif text-2xl font-semibold text-[#0f2744]">
                      {topOutfit.items.map((item) => item.name).filter(Boolean).join(" · ") || "Your lead look"}
                    </h2>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{matchLabel(topOutfit.score)}</Badge>
                </div>

                <div className="mt-5">
                  <OutfitReference outfit={topOutfit} isDemo={isDemo} />
                </div>

                <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
                  {topOutfit.items.map((item) => (
                    <ItemThumbnail key={item.id} item={item} imageById={imageById} sizeClass="h-28 w-28" />
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-4 border-t border-[#edf1f3] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#0f2744]">Ready to leave the house?</p>
                    <p className="mt-1 text-xs text-[#718096]">Save the combination so your closet learns what you actually wear.</p>
                  </div>
                  <SavePlanButton
                    outfit={topOutfit}
                    marked={!!markedWorn[topOutfit.id]}
                    pending={!!markingWorn[topOutfit.id]}
                    error={wornErrors[topOutfit.id] ?? null}
                    onMark={handleMarkWorn}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <section className="rounded-3xl border border-[#d8e1e5] bg-[#0f2744] p-6 text-white sm:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9ed4d0]">Why this works</p>
                  <ul className="mt-5 space-y-4">
                    {topOutfit.why.length > 0 ? topOutfit.why.map((reason) => (
                      <li key={reason} className="flex gap-3 text-sm leading-6 text-[#e7f0f1]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#9ed4d0]" />
                        {reason}
                      </li>
                    )) : (
                      <li className="text-sm leading-6 text-[#e7f0f1]">The pieces are balanced for the event and ready to wear together.</li>
                    )}
                  </ul>
                </section>

                <section className="rounded-3xl border border-[#d8e1e5] bg-[#f7f1e9] p-6 sm:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2a6f7f]">One move before you go</p>
                  <p className="mt-4 font-serif text-xl font-semibold leading-tight text-[#0f2744]">{lastMove}</p>
                  <div className="mt-5 space-y-3 text-sm text-[#53616d]">
                    <p>□ Lay out every piece, including shoes and the finishing accessory.</p>
                    <p>□ Take the outer layer with you — it is the easiest way to stay comfortable when the setting changes.</p>
                  </div>
                </section>
              </div>
            </section>

            {alternatives.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2a6f7f]">If you want a different energy</p>
                    <h2 className="mt-2 font-serif text-2xl font-semibold text-[#0f2744]">Two strong backups.</h2>
                  </div>
                  <span className="hidden text-sm text-[#718096] sm:inline">Same event · different emphasis</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {alternatives.map((outfit) => {
                    const name = outfit.items.map((item) => item.name).filter(Boolean).join(" · ") || `Outfit ${outfit.id.replace("combo-", "")}`;
                    return (
                      <article key={outfit.id} className="rounded-2xl border border-[#d8e1e5] bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-serif text-lg font-semibold text-[#0f2744]">{name}</h3>
                          <Badge variant="secondary" className="shrink-0">{matchLabel(outfit.score)}</Badge>
                        </div>
                        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                          {outfit.items.map((item) => (
                            <ItemThumbnail key={item.id} item={item} imageById={imageById} sizeClass="h-20 w-20" />
                          ))}
                        </div>
                        {outfit.why.length > 0 && <p className="mt-4 text-sm leading-6 text-[#718096]">{outfit.why[0]}</p>}
                        <div className="mt-4">
                          <SavePlanButton
                            outfit={outfit}
                            marked={!!markedWorn[outfit.id]}
                            pending={!!markingWorn[outfit.id]}
                            error={wornErrors[outfit.id] ?? null}
                            onMark={handleMarkWorn}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-[#d8e1e5] bg-white p-6 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2a6f7f]">Event signal</p>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-xl font-semibold text-[#0f2744]">{DRESS_CODE_LABELS[venueContext?.dressCode ?? ""] ?? "Your event context"}</h2>
                    <p className="mt-1 text-sm text-[#718096]">{intake.venueName} · {eventLabel}</p>
                  </div>
                  {venueContext && <Badge variant="accent">Event signal ready</Badge>}
                </div>
                {venueContext?.cultureHints.length ? (
                  <ul className="mt-5 space-y-2">
                    {venueContext.cultureHints.map((hint) => <li key={hint} className="flex gap-3 text-sm leading-6 text-[#53616d]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2a6f7f]" />{hint}</li>)}
                  </ul>
                ) : <p className="mt-5 text-sm leading-6 text-[#53616d]">The event details are enough to start. Add a venue or dress code next time for a more specific read.</p>}
                <p className="mt-5 text-xs text-[#718096]">{venueContext?.isMock ? "Mock context is on — switch to venue research when you are ready to test a real place." : `Source: ${venueContext?.source}`}</p>
              </div>

              <div className="rounded-3xl border border-[#d8e1e5] bg-[#e8f3f1] p-6 sm:p-7" data-testid="skin-ai-next-step">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2a6f7f]">Optional cosmetic prep</p>
                <h2 className="mt-3 font-serif text-xl font-semibold text-[#0f2744]">Make the whole look feel ready.</h2>
                <p className="mt-3 text-sm leading-6 text-[#53616d]">YouCam Skin AI can analyze a permitted photo for cosmetic observations. FitCheck keeps that separate from wardrobe reasoning — no identity, attractiveness, or medical inferences.</p>
                <Link href="/interview" className="mt-5 inline-flex h-10 items-center rounded-xl border border-[#2a6f7f]/30 bg-white px-4 text-sm font-semibold text-[#0f2744] hover:bg-[#f7fffe]">Open cosmetic prep →</Link>
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-3xl border border-[#d8e1e5] bg-white p-8 shadow-sm">
            <h2 className="font-serif text-2xl font-semibold text-[#0f2744]">Your closet needs one more piece.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#53616d]">We found wardrobe items, but none can make a complete look at this event&apos;s formality. See the exact gap and add a piece before trying again.</p>
            {gaps.length > 0 && <p className="mt-4 text-sm font-semibold text-[#2a6f7f]">Missing: {gaps.join(" · ")}</p>}
            <Link href="/wardrobe" className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#0f2744] px-5 text-sm font-semibold text-white hover:bg-[#0a1d35]">Open my wardrobe</Link>
          </section>
        )}

        <div className="flex items-center justify-between border-t border-[#d8e1e5] pt-6">
          <Link href="/occasion" className="text-sm text-[#718096] hover:text-[#0f2744]">Plan another event</Link>
          <Link href="/wardrobe" className="text-sm font-semibold text-[#2a6f7f] hover:underline">Manage wardrobe</Link>
        </div>
      </main>
    </div>
  );
}
