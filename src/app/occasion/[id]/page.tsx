"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import type { OccasionSession } from "@/types/occasion";
import type { WardrobeItem } from "@/types/wardrobe";
import type { ComposedOutfit } from "@/lib/wardrobe/composer";

interface Props {
  params: Promise<{ id: string }>;
}

const DRESS_CODE_LABELS: Record<string, string> = {
  casual: "Casual",
  "smart-casual": "Smart Casual",
  "business-casual": "Business Casual",
  "business-professional": "Business Professional",
  formal: "Formal",
};

function labelize(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ItemThumbnail({
  item,
  imageById,
  sizeClass,
}: {
  item: { id: string; name?: string; category: string };
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
        className={`${sizeClass} shrink-0 rounded-md object-cover border border-[#e2e8f0]`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} shrink-0 rounded-md border border-[#e2e8f0] bg-[#e8edf2]`}
      aria-hidden
    />
  );
}

function MarkAsWorn({
  outfit,
  marked,
  pending,
  error,
  onMark,
}: {
  outfit: ComposedOutfit;
  marked: boolean;
  pending?: boolean;
  error: string | null;
  onMark: (outfit: ComposedOutfit) => void;
}) {
  if (marked) {
    return (
      <span className="text-xs font-medium text-[#2a6f7f]">Worn ✓</span>
    );
  }
  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => onMark(outfit)}
        className="text-xs font-medium text-[#2a6f7f] hover:underline disabled:cursor-wait disabled:text-[#a0b4c0]"
      >
        {pending ? "Marking…" : "Mark as worn"}
      </button>
      {error && <p className="text-xs text-[#718096]">{error}</p>}
    </div>
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
      fetch(`/api/occasions/${id}`).then((r) => r.json()),
      fetch("/api/wardrobe").then((r) => r.json()),
    ])
      .then(
        ([
          occasionData,
          wardrobeData,
        ]: [
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
          setImageById(
            new Map(items.map((item) => [item.id, item.imageBase64])),
          );
        },
      )
      .catch(() => setLoadError("Failed to load occasion."));
  }, [id]);

  async function handleMarkWorn(outfit: ComposedOutfit) {
    if (!session) return;
    if (markedWorn[outfit.id] || markingWorn[outfit.id]) return;
    setMarkingWorn((prev) => ({ ...prev, [outfit.id]: true }));
    setWornErrors((prev) => {
      const next = { ...prev };
      delete next[outfit.id];
      return next;
    });
    try {
      const res = await fetch("/api/worn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasionId: session.id,
          eventType: session.intake.eventType,
          items: outfit.items.map(
            ({ id, name, category, color, formality }) => ({
              id,
              name,
              category,
              color,
              formality,
            }),
          ),
        }),
      });
      if (!res.ok) {
        setWornErrors((prev) => ({
          ...prev,
          [outfit.id]: "Could not mark as worn.",
        }));
        return;
      }
      setMarkedWorn((prev) => ({ ...prev, [outfit.id]: true }));
    } catch {
      setWornErrors((prev) => ({
        ...prev,
        [outfit.id]: "Could not mark as worn.",
      }));
    } finally {
      setMarkingWorn((prev) => {
        const next = { ...prev };
        delete next[outfit.id];
        return next;
      });
    }
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8]">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center max-w-sm">
          <p className="text-sm text-red-600 font-medium">{loadError}</p>
          <button
            onClick={() => router.push("/occasion")}
            className="mt-4 text-sm text-[#2a6f7f] hover:underline"
          >
            Check another outfit
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f6f8]">
        <svg
          className="animate-spin h-8 w-8 text-[#2a6f7f]"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p className="font-serif text-base font-medium text-[#0f2744]">
          Loading occasion…
        </p>
      </div>
    );
  }

  const { intake, venueContext, outfits, gaps, isMockMode } = session;
  const topOutfit = outfits[0];
  const alternatives = outfits.slice(1, 3);
  const emptyWardrobe = outfits.length === 0 && wardrobeCount === 0;

  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-16">
      <header className="border-b border-[#e2e8f0] bg-white px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <Link
            href="/"
            className="font-serif text-base font-semibold text-[#0f2744] hover:text-[#2a6f7f] transition-colors"
          >
            FitCheck AI
          </Link>
          {isMockMode && (
            <Badge variant="outline" className="text-xs">
              Mock mode
            </Badge>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 pt-8 space-y-8">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#0f2744]">
            Check your whole outfit
          </h1>
          <p className="mt-1 text-sm text-[#718096]">
            {labelize(intake.eventType)}
            {intake.theme ? ` · ${intake.theme}` : ""}
            {intake.location ? ` · ${intake.location}` : ""}
          </p>
        </div>

        {venueContext && (
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-lg font-semibold text-[#0f2744]">
                  Event context
                </h2>
                <p className="text-sm text-[#718096] mt-0.5">
                  {intake.venueName} · {labelize(intake.eventType)}
                </p>
              </div>
              <Badge variant="accent" className="text-sm px-3 py-1 shrink-0">
                {DRESS_CODE_LABELS[venueContext.dressCode] ??
                  venueContext.dressCode}
              </Badge>
            </div>

            {venueContext.cultureHints.length > 0 && (
              <ul className="space-y-2">
                {venueContext.cultureHints.map((hint) => (
                  <li key={hint} className="flex gap-3 items-start">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#2a6f7f]" />
                    <span className="text-sm text-[#4a5568] leading-relaxed">
                      {hint}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-xs text-[#718096]">
              Event context confidence:{" "}
              {Math.round(venueContext.confidence * 100)}%
            </p>
            <p className="text-xs text-[#718096]">
              {venueContext.isMock
                ? "Mock event inference"
                : `Source: ${venueContext.source}`}
            </p>
            {venueContext.research && venueContext.research.sources.length > 0 && (
              <div className="border-t border-[#edf1f3] pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  Research sources
                </p>
                <ul className="mt-2 space-y-1">
                  {venueContext.research.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#2a6f7f] hover:underline"
                      >
                        {source.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {emptyWardrobe ? (
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-8 text-center space-y-3">
            <h2 className="font-serif text-lg font-semibold text-[#0f2744]">
              Add your pieces first
            </h2>
            <p className="text-sm text-[#718096] max-w-md mx-auto">
              Your wardrobe doesn&apos;t have enough pieces yet to compose an
              outfit for this occasion. Add a few tops, bottoms, and shoes to
              get started.
            </p>
            <Link
              href="/wardrobe"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0f2744] px-5 text-sm font-semibold text-white hover:bg-[#0a1d35] transition-colors"
            >
              Add your pieces first
            </Link>
          </div>
        ) : (
          <>
            {outfits.length === 0 && wardrobeCount > 0 && (
              <p className="text-sm text-[#718096]">
                You have pieces, but none that fit this occasion&apos;s
                formality — see missing pieces below.
              </p>
            )}

            {topOutfit && (
              <section className="space-y-3">
                <h2 className="font-serif text-xl font-semibold text-[#0f2744]">
                  Best outfit from your wardrobe
                </h2>
                <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[#0f2744]">
                      {topOutfit.items
                        .map((i) => i.name)
                        .filter(Boolean)
                        .join(" · ") ||
                        `Outfit ${topOutfit.id.replace("combo-", "")}`}
                    </p>
                    <Badge variant="secondary" className="shrink-0">
                      {topOutfit.score}
                    </Badge>
                  </div>
                  <div className="flex gap-2 overflow-x-auto">
                    {topOutfit.items.map((item) => (
                      <ItemThumbnail
                        key={item.id}
                        item={item}
                        imageById={imageById}
                        sizeClass="h-20 w-20"
                      />
                    ))}
                  </div>
                  {topOutfit.why.length > 0 && (
                    <ul className="space-y-1.5">
                      {topOutfit.why.map((reason) => (
                        <li
                          key={reason}
                          className="flex gap-2 text-sm text-[#4a5568]"
                        >
                          <span className="text-[#2a6f7f] mt-0.5">•</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  )}
                  <MarkAsWorn
                    outfit={topOutfit}
                    marked={!!markedWorn[topOutfit.id]}
                    pending={!!markingWorn[topOutfit.id]}
                    error={wornErrors[topOutfit.id] ?? null}
                    onMark={handleMarkWorn}
                  />
                </div>
              </section>
            )}

            {alternatives.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-serif text-lg font-semibold text-[#0f2744]">
                  Alternatives
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {alternatives.map((outfit) => {
                    const name =
                      outfit.items
                        .map((i) => i.name)
                        .filter(Boolean)
                        .join(" · ") ||
                      `Outfit ${outfit.id.replace("combo-", "")}`;
                    return (
                      <div
                        key={outfit.id}
                        className="rounded-xl border border-[#e2e8f0] bg-white p-4 space-y-3"
                      >
                        <div className="flex gap-2 overflow-x-auto">
                          {outfit.items.map((item) => (
                            <ItemThumbnail
                              key={item.id}
                              item={item}
                              imageById={imageById}
                              sizeClass="h-14 w-14"
                            />
                          ))}
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-[#0f2744]">
                            {name}
                          </p>
                          <Badge variant="secondary" className="shrink-0">
                            {outfit.score}
                          </Badge>
                        </div>
                        {outfit.why.length > 0 && (
                          <ul className="space-y-1">
                            {outfit.why.map((reason) => (
                              <li
                                key={reason}
                                className="text-xs text-[#718096] leading-snug"
                              >
                                {reason}
                              </li>
                            ))}
                          </ul>
                        )}
                        <MarkAsWorn
                          outfit={outfit}
                          marked={!!markedWorn[outfit.id]}
                          pending={!!markingWorn[outfit.id]}
                          error={wornErrors[outfit.id] ?? null}
                          onMark={handleMarkWorn}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {gaps.length > 0 && (
              <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 space-y-3">
                <h2 className="font-serif text-base font-semibold text-[#0f2744]">
                  What is missing from your wardrobe
                </h2>
                <ul className="space-y-1.5">
                  {gaps.map((gap) => (
                    <li
                      key={gap}
                      className="flex gap-2 text-sm text-[#4a5568]"
                    >
                      <span className="text-[#2a6f7f] mt-0.5">•</span>
                      {gap}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[#e2e8f0]">
          <Link
            href="/occasion"
            className="text-sm text-[#718096] hover:text-[#0f2744] transition-colors"
          >
            Check another outfit
          </Link>
          <Link
            href="/wardrobe"
            className="text-sm text-[#2a6f7f] hover:underline"
          >
            Manage wardrobe
          </Link>
        </div>
      </div>
    </div>
  );
}
