"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StepNav } from "@/components/step-nav";
import { Checklist } from "@/components/checklist";
import { Badge } from "@/components/ui/badge";
import type { StoredSession } from "@/lib/session-store";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default function PlanPage({ params }: Props) {
  const router = useRouter();
  const { sessionId } = use(params);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession(id: string) {
      try {
        const res = await fetch(`/api/sessions/${id}`);
        const data = (await res.json()) as StoredSession & { error?: string };
        if (cancelled) return;
        if (data.error) {
          setLoadError(data.error);
          return;
        }
        if (!data.plan) {
          const planRes = await fetch(`/api/sessions/${id}/plan`, {
            method: "POST",
          });
          if (!planRes.ok) {
            if (!cancelled) {
              setLoadError("Failed to generate preparation plan.");
            }
            return;
          }
          const res2 = await fetch(`/api/sessions/${id}`);
          const data2 = (await res2.json()) as StoredSession;
          if (!cancelled) setSession(data2);
        } else {
          setSession(data);
        }
      } catch {
        if (!cancelled) setLoadError("Failed to load preparation plan.");
      }
    }

    void loadSession(sessionId);
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function handleCopySummary() {
    if (!session?.plan?.summaryText) return;
    try {
      await navigator.clipboard.writeText(session.plan.summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback — ignore
    }
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8]">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center max-w-sm">
          <p className="text-sm text-red-600 font-medium">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!session?.plan) {
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
          Building your plan…
        </p>
      </div>
    );
  }

  const { plan, intake, outfits, selectedOutfitId, isMockMode } = session;
  const selectedOutfit = outfits?.find((o) => o.id === selectedOutfitId) ?? outfits?.[0];

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
        <StepNav currentStep={4} />

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-[#0f2744]">
              Your preparation plan
            </h1>
            <p className="mt-1 text-sm text-[#718096]">
              {intake.jobTitle} at {intake.companyName}
            </p>
          </div>
          <button
            onClick={handleCopySummary}
            className="flex flex-shrink-0 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-medium text-[#0f2744] hover:bg-[#f4f6f8] transition-colors"
            title="Copy summary to clipboard"
          >
            {copied ? (
              <>
                <svg
                  className="h-3.5 w-3.5 text-[#2a6f7f]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy summary
              </>
            )}
          </button>
        </div>

        {/* Summary card */}
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 space-y-4">
          <h2 className="font-serif text-base font-semibold text-[#0f2744]">
            Summary
          </h2>
          <p className="text-sm text-[#4a5568] leading-relaxed">
            {plan.summaryText}
          </p>

          {selectedOutfit && (
            <div className="rounded-lg bg-[#e8f4f6] p-4 space-y-2">
              <p className="text-xs font-semibold text-[#2a6f7f]">
                Selected outfit
              </p>
              <p className="text-sm font-semibold text-[#0f2744]">
                {selectedOutfit.name}
              </p>
              <p className="text-xs text-[#4a5568]">{plan.whySelected}</p>
              <p className="text-xs text-[#718096]">
                Estimated cost:{" "}
                <span className="font-semibold text-[#0f2744]">
                  ${plan.estimatedTotalPrice.toFixed(0)}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Checklists */}
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 space-y-8">
          <Checklist
            title="5-day countdown checklist"
            items={plan.fiveDayChecklist}
          />
          <div className="border-t border-[#f4f6f8]" />
          <Checklist
            title="Night before checklist"
            items={plan.nightBeforeChecklist}
          />
          <div className="border-t border-[#f4f6f8]" />
          <Checklist
            title="1 hour before checklist"
            items={plan.oneHourBeforeChecklist}
          />

          {plan.lightingAndCameraSuggestions.length > 0 && (
            <>
              <div className="border-t border-[#f4f6f8]" />
              <div className="space-y-3">
                <h3 className="font-serif text-sm font-semibold text-[#0f2744] flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-[#2a6f7f]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.131a1 1 0 01-1.447.899L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Lighting &amp; camera suggestions
                </h3>
                <ul className="space-y-2">
                  {plan.lightingAndCameraSuggestions.map((s, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-[#e2e8f0] bg-[#f4f6f8]">
                        <svg
                          className="h-3 w-3 text-[#2a6f7f]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                      <span className="text-sm text-[#4a5568] leading-relaxed">
                        {s}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Start over */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() =>
              router.push(`/interview/${sessionId}/try-on`)
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
            Back to try-on
          </button>
          <Link
            href="/interview"
            className="text-sm text-[#2a6f7f] hover:text-[#235f6e] hover:underline transition-colors"
          >
            Start a new session →
          </Link>
        </div>
      </div>
    </div>
  );
}
