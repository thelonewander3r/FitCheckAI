"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StepNav } from "@/components/step-nav";
import { OutfitCard } from "@/components/outfit-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StoredSession } from "@/lib/session-store";
import type { RankedOutfit } from "@/types/interview";
import type { ApparelTryOnResult } from "@/lib/youcam/types";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default function TryOnPage({ params }: Props) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string>("");
  const [session, setSession] = useState<StoredSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadingTryOn, setLoadingTryOn] = useState<string | null>(null);
  const [continuingToplan, setContinuingToPlan] = useState(false);

  // Resolve async params
  useEffect(() => {
    params.then(({ sessionId: id }) => setSessionId(id));
  }, [params]);

  // Load session
  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((data: StoredSession & { error?: string }) => {
        if (data.error) {
          setLoadError(data.error);
        } else {
          setSession(data);
        }
      })
      .catch(() => setLoadError("Failed to load session."));
  }, [sessionId]);

  async function handleTryOn(outfitId: string) {
    if (!sessionId) return;
    setLoadingTryOn(outfitId);
    setActionError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/try-on`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outfitId }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setActionError(body.error ?? "Try-on failed. Please try again.");
        return;
      }
      const updated = (await res.json()) as StoredSession;
      setSession(updated);
    } catch {
      setActionError("Try-on failed. Please try again.");
    } finally {
      setLoadingTryOn(null);
    }
  }

  async function handleSelect(outfitId: string) {
    if (!sessionId) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outfitId }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setActionError(body.error ?? "Selection failed. Please try again.");
        return;
      }
      const updated = (await res.json()) as StoredSession;
      setSession(updated);
    } catch {
      setActionError("Selection failed. Please try again.");
    }
  }

  async function handleContinue() {
    if (!sessionId) return;
    setContinuingToPlan(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/plan`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setActionError(body.error ?? "Plan generation failed. Please try again.");
        return;
      }
      router.push(`/interview/${sessionId}/plan`);
    } catch {
      setActionError("Plan generation failed. Please try again.");
    } finally {
      setContinuingToPlan(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8]">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center max-w-sm">
          <p className="text-sm text-red-600 font-medium">{loadError}</p>
          <button
            onClick={() => router.push("/interview")}
            className="mt-4 text-sm text-[#2a6f7f] hover:underline"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  if (!session || !session.outfits) {
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
        <p className="text-sm text-[#718096]">Loading outfit recommendations…</p>
      </div>
    );
  }

  const outfits = session.outfits as RankedOutfit[];
  const tryOnResults = (session.tryOnResults ?? {}) as Record<
    string,
    ApparelTryOnResult
  >;
  const selectedId = session.selectedOutfitId;

  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-16">
      <header className="border-b border-[#e2e8f0] bg-white px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <Link
            href="/"
            className="font-serif text-base font-semibold text-[#0f2744] hover:text-[#2a6f7f] transition-colors"
          >
            InterviewReady AI
          </Link>
          {session.isMockMode && (
            <Badge variant="outline" className="text-xs">
              Mock mode
            </Badge>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 pt-8 space-y-8">
        <StepNav currentStep={3} />

        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#0f2744]">
            Virtual Try-On
          </h1>
          <p className="mt-1 text-sm text-[#718096]">
            Top 3 outfit recommendations ranked by role fit, format suitability,
            and budget. Try on each one to preview, then select your favourite.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {outfits.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              vtoResult={tryOnResults[outfit.id]}
              isMockMode={session.isMockMode}
              isSelected={selectedId === outfit.id}
              isLoading={loadingTryOn === outfit.id}
              onTryOn={() => handleTryOn(outfit.id)}
              onSelect={() => handleSelect(outfit.id)}
            />
          ))}
        </div>

        {actionError && (
          <p className="text-sm text-red-600 font-medium" role="alert">
            {actionError}
          </p>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-[#e2e8f0]">
          <button
            onClick={() =>
              router.push(`/interview/${sessionId}/analysis`)
            }
            className="flex items-center gap-1.5 text-sm text-[#718096] hover:text-[#0f2744] transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to analysis
          </button>

          <Button
            variant="primary"
            size="lg"
            data-testid="continue-to-plan"
            onClick={handleContinue}
            disabled={continuingToplan}
          >
            {continuingToplan ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
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
                Building your plan…
              </>
            ) : (
              <>
                Continue to Final Plan
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
