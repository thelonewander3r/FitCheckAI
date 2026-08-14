import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import type { OccasionSession } from "@/types/occasion";
import type { WardrobeItem, WardrobeFormality } from "@/types/wardrobe";
import type { ComposedOutfit } from "@/lib/wardrobe/composer";

const DRESS_CODE_LABELS: Record<string, string> = {
  casual: "Casual",
  "smart-casual": "Smart Casual",
  "business-casual": "Business Casual",
  "business-professional": "Business Professional",
  formal: "Formal",
};

function labelize(value: string): string {
  return value.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

/** Derive a display name from wardrobe items */
function outfitDisplayName(outfit: ComposedOutfit): string {
  if (outfit.items.length === 0) return "Outfit";
  return outfit.items
    .slice(0, 2)
    .map((i) => labelize(i.category))
    .join(" + ");
}

/** Derive the formality from the outfit's items (take the lowest for realism) */
function outfitFormality(outfit: ComposedOutfit): WardrobeFormality {
  const order: WardrobeFormality[] = ["casual", "smart-casual", "business-casual", "business-professional", "formal"];
  const levels = outfit.items.map((i) => order.indexOf(i.formality));
  const minLevel = Math.min(...levels.filter((l) => l >= 0));
  return order[minLevel] ?? "business-casual";
}

function ItemThumbnail({ item, imageById, sizeClass }: {
  item: WardrobeItem;
  imageById: Map<string, string>;
  sizeClass: string;
}) {
  const imageBase64 = imageById.get(item.id);
  if (imageBase64) {
    return (
      <img
        src={`data:image/jpeg;base64,${imageBase64}`}
        alt={item.name ?? item.category}
        className={`${sizeClass} shrink-0 rounded-md object-cover border border-[#e2e8f0]`}
      />
    );
  }
  return <div className={`${sizeClass} shrink-0 rounded-md border border-[#e2e8f0] bg-[#e8edf2]`} aria-hidden />;
}

export default function OccasionDetailPage() {
  const [id, setId] = useState<string>("");
  const [session, setSession] = useState<OccasionSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [imageById, setImageById] = useState<Map<string, string>>(new Map());
  const [wardrobeCount, setWardrobeCount] = useState(0);
  const [markedWorn, setMarkedWorn] = useState<Record<string, boolean>>({});
  const [markingWorn, setMarkingWorn] = useState<Record<string, boolean>>({});
  const [wornErrors, setWornErrors] = useState<Record<string, string>>({});

  // Extract id from URL path
  useEffect(() => {
    const match = window.location.pathname.match(/\/occasion\/([^/]+)/);
    if (match?.[1]) setId(match[1]);
  }, []);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/occasions/${id}`).then((r) => r.json()),
      fetch("/api/wardrobe").then((r) => r.json()),
    ])
      .then(([occasionData, wardrobeData]: [OccasionSession & { error?: string }, { items?: WardrobeItem[]; error?: string }]) => {
        if (occasionData.error) { setLoadError(occasionData.error); return; }
        setSession(occasionData);
        const items = wardrobeData.items ?? [];
        setWardrobeCount(items.length);
        setImageById(new Map(items.map((item) => [item.id, item.imageBase64])));
      })
      .catch(() => setLoadError("Failed to load occasion."));
  }, [id]);

  async function handleMarkWorn(outfit: ComposedOutfit) {
    setMarkingWorn((p) => ({ ...p, [outfit.id]: true }));
    setWornErrors((p) => ({ ...p, [outfit.id]: "" }));
    try {
      const topItem = outfit.items[0];
      if (!topItem) throw new Error("No items");
      const res = await fetch("/api/worn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: topItem.category,
          color: topItem.color,
          formality: topItem.formality,
          occasion: session?.intake.eventType,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setMarkedWorn((p) => ({ ...p, [outfit.id]: true }));
    } catch {
      setWornErrors((p) => ({ ...p, [outfit.id]: "Could not mark as worn." }));
    } finally {
      setMarkingWorn((p) => ({ ...p, [outfit.id]: false }));
    }
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8]">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center max-w-sm">
          <p className="text-sm text-red-600 font-medium">{loadError}</p>
          <Link href="/occasion" className="mt-4 inline-block text-sm text-[#2a6f7f] hover:underline">Back to occasions</Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f6f8]">
        <svg className="animate-spin h-8 w-8 text-[#2a6f7f]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="font-serif text-base font-medium text-[#0f2744]">Loading…</p>
      </div>
    );
  }

  const { outfits = [], gaps = [], venueContext, intake, isMockMode } = session;

  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-16">
      <header className="border-b border-[#e2e8f0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="font-serif text-base font-semibold text-[#0f2744] hover:text-[#2a6f7f] transition-colors">
            InterviewReady AI
          </Link>
          {isMockMode && <Badge variant="outline" className="text-xs">Mock mode</Badge>}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 pt-8 space-y-8">
        {/* Title */}
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#0f2744]">
            {labelize(intake.eventType)} at {intake.venueName}
          </h1>
          {intake.location && <p className="mt-1 text-sm text-[#718096]">{intake.location}</p>}
          {intake.theme && <p className="text-sm text-[#718096]">Theme: {intake.theme}</p>}
        </div>

        {/* Venue context */}
        {venueContext && (
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-base font-semibold text-[#0f2744]">Dress code</h2>
              <Badge variant="accent">{DRESS_CODE_LABELS[venueContext.dressCode] ?? labelize(venueContext.dressCode)}</Badge>
            </div>
            {venueContext.cultureHints && venueContext.cultureHints.length > 0 && (
              <ul className="space-y-1">
                {venueContext.cultureHints.map((hint: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-[#4a5568]">
                    <span className="text-[#2a6f7f] mt-0.5 shrink-0">•</span>
                    {hint}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* No wardrobe message */}
        {wardrobeCount === 0 && (
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-center space-y-3">
            <p className="text-sm text-[#718096]">You don't have any wardrobe items yet.</p>
            <Link href="/wardrobe" className="inline-block rounded-lg bg-[#0f2744] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a1d35] transition-colors">
              Add clothes to your wardrobe
            </Link>
          </div>
        )}

        {/* Outfit suggestions */}
        {outfits.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-serif text-base font-semibold text-[#0f2744]">Outfit suggestions from your wardrobe</h2>
            <div className="space-y-4">
              {outfits.map((outfit) => {
                const displayName = outfitDisplayName(outfit);
                const formality = outfitFormality(outfit);
                return (
                  <div key={outfit.id} className="rounded-xl border border-[#e2e8f0] bg-white p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#0f2744]">{displayName}</p>
                        <p className="text-xs text-[#718096] mt-0.5">{labelize(formality)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {markedWorn[outfit.id] ? (
                          <span className="text-xs font-medium text-[#2a6f7f]">Worn ✓</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={!!markingWorn[outfit.id]}
                              onClick={() => void handleMarkWorn(outfit)}
                              className="text-xs font-medium text-[#2a6f7f] hover:underline disabled:cursor-wait disabled:text-[#a0b4c0]"
                            >
                              {markingWorn[outfit.id] ? "Marking…" : "Mark as worn"}
                            </button>
                            {wornErrors[outfit.id] && (
                              <p className="text-xs text-[#718096]">{wornErrors[outfit.id]}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {outfit.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-1.5">
                          <ItemThumbnail item={item} imageById={imageById} sizeClass="h-12 w-12" />
                          <span className="text-xs text-[#718096]">{labelize(item.category)}</span>
                        </div>
                      ))}
                    </div>
                    {outfit.why && outfit.why.length > 0 && (
                      <p className="text-xs text-[#718096] italic">{outfit.why[0]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {gaps.length > 0 && (
          <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 space-y-3">
            <h2 className="font-serif text-base font-semibold text-[#0f2744]">Missing pieces</h2>
            <ul className="space-y-1.5">
              {gaps.map((gap, i) => (
                <li key={i} className="flex gap-2 text-sm text-[#4a5568]">
                  <span className="text-[#2a6f7f] mt-0.5">•</span>
                  {gap}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[#e2e8f0]">
          <Link href="/occasion" className="text-sm text-[#718096] hover:text-[#0f2744] transition-colors">
            Plan another occasion
          </Link>
          <Link href="/wardrobe" className="text-sm text-[#2a6f7f] hover:underline">
            Manage wardrobe
          </Link>
        </div>
      </div>
    </div>
  );
}
