"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PhotoPicker } from "@/components/photo-picker";
import type { SkinAnalysisResult } from "@/types/interview";
import type { OccasionSession } from "@/types/occasion";

interface Props {
  occasionId: string;
  initialResult?: SkinAnalysisResult;
}

const SEVERITY_LABELS: Record<string, string> = {
  low: "Looking good",
  moderate: "Worth a light touch",
  notable: "Focus here first",
};

/**
 * YouCam Skin AI as the pre-event finishing check.
 *
 * Deliberately separate from wardrobe reasoning: the result never feeds outfit
 * composition, and the photo is not stored.
 */
export function OccasionSkinPrep({ occasionId, initialResult }: Props) {
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<SkinAnalysisResult | undefined>(
    initialResult,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    if (!photo || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/occasions/${occasionId}/skin-prep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: photo }),
      });
      const data = (await response.json()) as OccasionSession & {
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Skin AI could not analyze this photo.");
        return;
      }
      if (!data.skinPrep) {
        setError("No observations came back for this photo.");
        return;
      }
      setResult(data.skinPrep);
    } catch {
      setError("Could not reach the Skin AI service.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="rounded-3xl border border-[#d8e1e5] bg-[#e8f3f1] p-6 sm:p-7"
      data-testid="skin-ai-next-step"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2a6f7f]">
            Optional cosmetic prep
          </p>
          <h2 className="mt-2 font-serif text-xl font-semibold text-[#0f2744]">
            Make the whole look feel ready.
          </h2>
        </div>
        <Badge variant="accent" className="shrink-0">
          YouCam Skin AI
        </Badge>
      </div>

      <p className="mt-3 text-sm leading-6 text-[#53616d]">
        Add a permitted selfie for cosmetic observations before the event.
        FitCheck keeps this separate from wardrobe reasoning — no identity,
        attractiveness, or medical inferences, and the photo is not saved.
      </p>

      {!result && (
        <div className="mt-5 space-y-3">
          {/* Skin AI needs a short side >= 480px, so keep more resolution than the default. */}
          <PhotoPicker
            label="Add a selfie"
            onPhoto={setPhoto}
            maxEdge={1280}
            disabled={pending}
          />
          <button
            type="button"
            disabled={!photo || pending}
            onClick={handleRun}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0f2744] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0a1d35] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Analyzing with YouCam…" : "Run the skin check"}
          </button>
          {error && <p className="text-xs leading-5 text-red-600">{error}</p>}
        </div>
      )}

      {result && (
        <div className="mt-5 space-y-5">
          <div className="flex items-center gap-2">
            <Badge variant={result.isMock ? "outline" : "secondary"}>
              {result.isMock ? "Mock observations" : "Live YouCam"}
            </Badge>
            <button
              type="button"
              onClick={() => {
                setResult(undefined);
                setPhoto(undefined);
                setError(null);
              }}
              className="text-xs font-semibold text-[#2a6f7f] hover:underline"
            >
              Use a different photo
            </button>
          </div>

          {result.observations.length > 0 && (
            <ul className="space-y-3">
              {result.observations.map((observation) => (
                <li
                  key={observation.id}
                  className="rounded-2xl border border-[#2a6f7f]/15 bg-white/70 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#0f2744]">
                      {observation.label}
                    </p>
                    <span className="shrink-0 text-xs text-[#718096]">
                      {SEVERITY_LABELS[observation.severity] ??
                        observation.severity}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-6 text-[#53616d]">
                    {observation.guidance}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {result.preparationSuggestions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2a6f7f]">
                Before you go
              </p>
              <ul className="mt-2 space-y-2">
                {result.preparationSuggestions.slice(0, 3).map((suggestion) => (
                  <li
                    key={suggestion}
                    className="flex gap-2.5 text-sm leading-6 text-[#53616d]"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2a6f7f]" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="border-t border-[#2a6f7f]/15 pt-4 text-xs leading-5 text-[#718096]">
            {result.disclaimer}
          </p>
        </div>
      )}
    </section>
  );
}
