import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
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
        className={`${sizeClass} shrink-0 object-cover`}
      />
    );
  }
  return <div className={`${sizeClass} shrink-0 bg-[#0f2744]/5 flex items-center justify-center`} aria-hidden>
    <span className="text-[10px] uppercase tracking-widest text-[#0f2744]/30">{labelize(item.category)}</span>
  </div>;
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
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="border border-red-900/10 bg-red-50/50 p-8 text-center max-w-md w-full">
          <p className="text-sm font-serif italic text-red-900 mb-6">{loadError}</p>
          <Link href="/occasion" className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744] border-b border-[#0f2744]/20 pb-1 hover:border-[#0f2744]">
            Back to Occasions
          </Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
        <svg className="animate-spin h-8 w-8 text-[#0f2744]/30" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="font-serif text-sm italic text-[#0f2744]/60 tracking-wide">Curating the collection…</p>
      </div>
    );
  }

  const { outfits = [], gaps = [], venueContext, intake, isMockMode } = session;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background pb-32"
    >
      <header className="border-b border-[#0f2744]/10 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-serif text-lg text-[#0f2744] hover:opacity-70 transition-opacity">
            FitCheckAI
          </Link>
          {isMockMode && <span className="text-[10px] uppercase tracking-widest text-[#0f2744]/40 border border-[#0f2744]/10 px-2 py-1">Mock Mode</span>}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 pt-12 md:pt-20">
        
        {/* Title Area */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16 lg:mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <p className="text-[10px] uppercase tracking-widest text-[#0f2744]/50 mb-4 border-b border-[#0f2744]/10 pb-2 inline-block">Occasion Plan</p>
            <h1 className="font-serif text-5xl md:text-6xl text-[#0f2744] leading-tight mb-4">
              {labelize(intake.eventType)}
            </h1>
            <p className="text-xl font-serif italic text-[#0f2744]/80 leading-relaxed">
              at {intake.venueName}{intake.location ? `, ${intake.location}` : ""}
            </p>
            {intake.theme && (
              <p className="mt-4 text-sm font-serif italic text-[#0f2744]/50">
                Theme: <span className="not-italic text-[#0f2744]/70">{intake.theme}</span>
              </p>
            )}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-right"
          >
            {venueContext && (
              <div className="bg-white border border-[#0f2744]/10 p-6 shadow-sm inline-block text-left min-w-[280px]">
                <p className="text-[10px] uppercase tracking-widest text-[#0f2744]/50 mb-2">Venue Context</p>
                <p className="font-serif text-2xl text-[#0f2744] mb-4 border-b border-[#0f2744]/10 pb-4">
                  {DRESS_CODE_LABELS[venueContext.dressCode] ?? labelize(venueContext.dressCode)}
                </p>
                {venueContext.cultureHints && venueContext.cultureHints.length > 0 && (
                  <ul className="space-y-2">
                    {venueContext.cultureHints.map((hint: string, i: number) => (
                      <li key={i} className="flex gap-2 text-xs font-serif leading-relaxed text-[#0f2744]/70">
                        <span className="text-[#2a6f7f] mt-0.5 shrink-0 italic">/</span>
                        {hint}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* No wardrobe message */}
        {wardrobeCount === 0 && (
          <div className="border border-[#0f2744]/10 bg-white p-12 text-center max-w-2xl mx-auto space-y-6">
            <p className="text-sm font-serif italic text-[#0f2744]/70">Your digital wardrobe is currently empty.</p>
            <Link href="/wardrobe" className="inline-block px-8 py-3 bg-[#0f2744] text-white text-xs font-medium uppercase tracking-widest transition-colors hover:bg-[#0a1d35]">
              Add Wardrobe Pieces
            </Link>
          </div>
        )}

        {/* Outfit suggestions Grid */}
        {outfits.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-12"
          >
            <div className="flex items-center justify-between border-b border-[#0f2744]/10 pb-4">
              <h2 className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744]">Curated Looks</h2>
            </div>
            
            <div className="grid gap-12 lg:gap-16 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {outfits.map((outfit) => {
                const displayName = outfitDisplayName(outfit);
                const formality = outfitFormality(outfit);
                
                return (
                  <div key={outfit.id} className="group relative bg-white border border-[#0f2744]/10 p-6 md:p-8 flex flex-col h-full hover:shadow-lg hover:border-[#0f2744]/30 transition-all duration-500">
                    
                    <div className="flex flex-col mb-8">
                      <p className="text-[10px] uppercase tracking-widest text-[#0f2744]/50 mb-3">{labelize(formality)}</p>
                      <h3 className="font-serif text-2xl text-[#0f2744] leading-tight mb-4">{displayName}</h3>
                      {outfit.why && outfit.why.length > 0 && (
                        <p className="text-sm font-serif italic text-[#0f2744]/70 leading-relaxed">{outfit.why[0]}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-8 mt-auto">
                      {outfit.items.map((item) => (
                        <div key={item.id} className="flex flex-col gap-2 group/item cursor-pointer">
                          <div className="aspect-[3/4] overflow-hidden">
                            <ItemThumbnail item={item} imageById={imageById} sizeClass="h-full w-full opacity-90 group-hover/item:opacity-100 group-hover/item:scale-105 transition-all duration-700 ease-out" />
                          </div>
                          <span className="text-[10px] uppercase tracking-widest text-[#0f2744]/60 text-center">{labelize(item.category)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-[#0f2744]/10 flex justify-between items-center">
                      <div className="flex flex-col">
                        {markedWorn[outfit.id] ? (
                          <span className="text-[10px] uppercase tracking-widest font-medium text-[#2a6f7f]">Status: Worn</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={!!markingWorn[outfit.id]}
                              onClick={() => void handleMarkWorn(outfit)}
                              className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744] hover:text-[#2a6f7f] disabled:opacity-50 transition-colors text-left"
                            >
                              {markingWorn[outfit.id] ? "Recording…" : "Mark As Worn"}
                            </button>
                            {wornErrors[outfit.id] && (
                              <p className="text-[10px] uppercase tracking-widest text-red-500 mt-1">{wornErrors[outfit.id]}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {gaps.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mt-24 border border-[#0f2744]/10 bg-white p-12 lg:p-16 max-w-4xl mx-auto"
          >
            <h2 className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744] border-b border-[#0f2744]/10 pb-4 mb-8">Wardrobe Gaps</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <ul className="space-y-4">
                {gaps.map((gap, i) => (
                  <li key={i} className="flex gap-4 items-start group">
                    <span className="text-[#2a6f7f] mt-1 italic text-xs">/</span>
                    <span className="text-base font-serif leading-relaxed text-[#0f2744]/80 group-hover:text-[#0f2744] transition-colors">
                      {gap}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.section>
        )}

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-16 mt-24 border-t border-[#0f2744]/10"
        >
          <Link href="/occasion" className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744]/60 hover:text-[#0f2744] transition-colors">
            Plan Another Occasion
          </Link>
          <Link href="/wardrobe" className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744] border-b border-[#0f2744] pb-1 hover:text-[#2a6f7f] hover:border-[#2a6f7f] transition-colors">
            Manage Collection
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
