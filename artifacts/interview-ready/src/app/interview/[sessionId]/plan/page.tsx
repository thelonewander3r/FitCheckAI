import { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";
import { StepNav } from "@/components/step-nav";
import { Checklist } from "@/components/checklist";
import { Badge } from "@/components/ui/badge";
import type { StoredSession } from "@/types/session";

export default function PlanPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function loadSession(id: string) {
      try {
        const res = await fetch(`/api/sessions/${id}`);
        const data = (await res.json()) as StoredSession & { error?: string };
        if (cancelled) return;
        if (data.error) { setLoadError(data.error); return; }

        if (!data.plan) {
          const planRes = await fetch(`/api/sessions/${id}/plan`, { method: "POST" });
          if (!planRes.ok) {
            if (!cancelled) setLoadError("Failed to generate preparation plan.");
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
    return () => { cancelled = true; };
  }, [sessionId]);

  async function handleCopySummary() {
    if (!session?.plan?.summaryText) return;
    try {
      await navigator.clipboard.writeText(session.plan.summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
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
        <svg className="animate-spin h-8 w-8 text-[#2a6f7f]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="font-serif text-base font-medium text-[#0f2744]">Building your plan…</p>
      </div>
    );
  }

  const { plan, intake, outfits, selectedOutfitId, isMockMode } = session;
  const selectedOutfit = outfits?.find((o) => o.id === selectedOutfitId) ?? outfits?.[0];

  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-16">
      <header className="border-b border-[#e2e8f0] bg-white px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <Link href="/" className="font-serif text-base font-semibold text-[#0f2744] hover:text-[#2a6f7f] transition-colors">
            InterviewReady AI
          </Link>
          {isMockMode && <Badge variant="outline" className="text-xs">Mock mode</Badge>}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 pt-8 space-y-8">
        <StepNav currentStep={4} />

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-[#0f2744]">Your preparation plan</h1>
            <p className="mt-1 text-sm text-[#718096]">
              {intake.jobTitle} at {intake.companyName} · {intake.interviewDate}
            </p>
          </div>
          {plan.summaryText && (
            <button
              onClick={() => void handleCopySummary()}
              className="shrink-0 rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-medium text-[#0f2744] hover:bg-[#f4f6f8] transition-colors"
            >
              {copied ? "Copied!" : "Copy summary"}
            </button>
          )}
        </div>

        {/* Selected outfit */}
        {selectedOutfit && (
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 space-y-3">
            <h2 className="font-serif text-base font-semibold text-[#0f2744]">Selected outfit</h2>
            <p className="text-sm font-medium text-[#0f2744]">{selectedOutfit.name}</p>
            <p className="text-sm text-[#718096]">{plan.whySelected}</p>
            {typeof plan.estimatedTotalPrice === "number" && (
              <p className="text-xs text-[#718096]">
                Estimated cost: <span className="font-semibold text-[#0f2744]">${plan.estimatedTotalPrice.toFixed(0)}</span>
              </p>
            )}
          </div>
        )}

        {/* 5-day checklist */}
        {plan.fiveDayChecklist && plan.fiveDayChecklist.length > 0 && (
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6">
            <Checklist title="5-day countdown" items={plan.fiveDayChecklist} />
          </div>
        )}

        {/* Night before */}
        {plan.nightBeforeChecklist && plan.nightBeforeChecklist.length > 0 && (
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6">
            <Checklist title="Night before" items={plan.nightBeforeChecklist} />
          </div>
        )}

        {/* 1-hour before */}
        {plan.oneHourBeforeChecklist && plan.oneHourBeforeChecklist.length > 0 && (
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6">
            <Checklist title="One hour before" items={plan.oneHourBeforeChecklist} />
          </div>
        )}

        {/* Lighting & camera */}
        {plan.lightingAndCameraSuggestions && plan.lightingAndCameraSuggestions.length > 0 && intake.interviewFormat === "video" && (
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6">
            <h2 className="font-serif text-base font-semibold text-[#0f2744] mb-4">Camera & lighting</h2>
            <ul className="space-y-2">
              {plan.lightingAndCameraSuggestions.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-[#4a5568]">
                  <span className="text-[#2a6f7f] mt-0.5 shrink-0">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Start over */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setLocation(`/interview/${sessionId}/try-on`)}
            className="flex items-center gap-1.5 text-sm text-[#718096] hover:text-[#0f2744] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to try-on
          </button>
          <Link href="/interview" className="text-sm text-[#2a6f7f] hover:text-[#235f6e] hover:underline transition-colors">
            Start a new session →
          </Link>
        </div>
      </div>
    </div>
  );
}
