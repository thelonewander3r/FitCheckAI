"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PhotoPicker } from "@/components/photo-picker";
import { TryOnProgress } from "@/components/try-on-progress";
import { eligibleGarments } from "@/lib/wardrobe/garment-reference";
import type {
  OccasionSession,
  OccasionTryOnResult,
  PersistedOutfit,
} from "@/types/occasion";

interface Props {
  occasionId: string;
  outfit: PersistedOutfit;
  initialResult?: OccasionTryOnResult;
}

/**
 * YouCam AI Clothes try-on for a composed look.
 *
 * The garment reference is the photo the user already saved for that wardrobe
 * piece, so the render comes from their own closet rather than a catalog.
 */
export function OccasionTryOn({ occasionId, outfit, initialResult }: Props) {
  const garments = eligibleGarments(outfit.items);
  const [selectedItemId, setSelectedItemId] = useState(
    initialResult?.garmentItemId ?? garments[0]?.id ?? "",
  );
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<OccasionTryOnResult | undefined>(
    initialResult,
  );
  const [pending, setPending] = useState(false);
  const [renderStartedAt, setRenderStartedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (garments.length === 0) return null;

  const selected = garments.find((g) => g.id === selectedItemId) ?? garments[0];

  async function handleRender() {
    if (!photo || pending) return;
    setPending(true);
    setRenderStartedAt(Date.now());
    setError(null);
    try {
      const response = await fetch(`/api/occasions/${occasionId}/try-on`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outfitId: outfit.id,
          userImageBase64: photo,
          itemId: selectedItemId || undefined,
        }),
      });
      const data = (await response.json()) as OccasionSession & {
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Could not render this look.");
        return;
      }
      const next = data.tryOnResults?.[outfit.id];
      if (!next) {
        setError("The render came back empty. Try another photo.");
        return;
      }
      setResult(next);
    } catch {
      setError("Could not reach the try-on service.");
    } finally {
      setPending(false);
      setRenderStartedAt(null);
    }
  }

  return (
    <section
      className="rounded-3xl border border-[#d8e1e5] bg-white p-6 shadow-sm sm:p-7"
      data-testid="occasion-try-on"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2a6f7f]">
            See it on you
          </p>
          <h2 className="mt-2 font-serif text-xl font-semibold text-[#0f2744]">
            Try the look before you commit.
          </h2>
        </div>
        <Badge variant="accent" className="shrink-0">
          YouCam AI Clothes
        </Badge>
      </div>

      <p className="mt-3 text-sm leading-6 text-[#53616d]">
        Pick a piece and add a full-length photo. FitCheck sends that piece&apos;s
        saved wardrobe photo to YouCam AI Clothes and renders it on you. Your
        photo is used for the render and is not saved.
      </p>

      {garments.length > 1 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#718096]">
            Which piece?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {garments.map((garment) => {
              const active = garment.id === selected?.id;
              return (
                <button
                  key={garment.id}
                  type="button"
                  onClick={() => setSelectedItemId(garment.id)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "border-[#0f2744] bg-[#0f2744] text-white"
                      : "border-[#d8e1e5] bg-white text-[#53616d] hover:border-[#2a6f7f]"
                  }`}
                >
                  {garment.name || garment.category}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <PhotoPicker
            label="Add a full-length photo"
            onPhoto={setPhoto}
            disabled={pending}
            intent="try-on"
          />
          <button
            type="button"
            disabled={!photo || pending}
            onClick={handleRender}
            aria-busy={pending}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#0f2744] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0a1d35] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending
              ? "Rendering with YouCam…"
              : result
                ? "Render again"
                : "See it on me"}
          </button>
          {pending && renderStartedAt !== null && (
            <TryOnProgress startedAt={renderStartedAt} />
          )}
          {error && <p className="text-xs leading-5 text-red-600">{error}</p>}
          {!photo && !error && !pending && (
            <p className="text-xs leading-5 text-[#718096]">
              A clear, full-length photo of a person. Usually about 12 seconds.
            </p>
          )}
        </div>

        <figure className="relative overflow-hidden rounded-2xl border border-[#d8e1e5] bg-[#f4f6f8]">
          {result ? (
            <>
              {/* Rendered by YouCam AI Clothes; live results stream through an app-owned proxy. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.renderedImageUrl}
                alt={`Virtual try-on of ${result.garmentItemName ?? "the selected piece"}`}
                className={`h-72 w-full object-cover ${pending ? "opacity-40" : ""}`}
              />
              <figcaption className="flex items-center justify-between gap-2 px-4 py-3 text-xs leading-5 text-[#718096]">
                <span>
                  AI Clothes render ·{" "}
                  {result.garmentItemName ?? "selected piece"}
                </span>
                <Badge variant={result.isMock ? "outline" : "secondary"}>
                  {result.isMock ? "Mock render" : "Live YouCam"}
                </Badge>
              </figcaption>
            </>
          ) : (
            <div className="flex h-72 flex-col items-center justify-center gap-2 px-6 text-center">
              <svg
                className="h-8 w-8 text-[#c3ccd6]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 1115 0v.75h-15v-.75z"
                />
              </svg>
              <p className="text-sm text-[#718096]">
                Your try-on preview appears here.
              </p>
            </div>
          )}
          {pending && renderStartedAt !== null && (
            <div className="absolute inset-0 flex items-center bg-white/80 p-6">
              <TryOnProgress startedAt={renderStartedAt} />
            </div>
          )}
        </figure>
      </div>
    </section>
  );
}
