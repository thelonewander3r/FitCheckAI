import { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";
import { StepNav } from "@/components/step-nav";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { Badge } from "@/components/ui/badge";
import { COSMETIC_DISCLAIMER } from "@/lib/safety/skin-safety";
import type { StoredSession } from "@/types/session";

const DRESS_CODE_LABELS: Record<string, string> = {
  casual: "Casual",
  "smart-casual": "Smart Casual",
  "business-casual": "Business Casual",
  "business-professional": "Business Professional",
};

const DRESS_CODE_COLORS: Record<string, "secondary" | "accent" | "default"> = {
  casual: "secondary",
  "smart-casual": "accent",
  "business-casual": "accent",
  "business-professional": "default",
};

function Spinner() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f6f8]">
      <svg className="animate-spin h-8 w-8 text-[#2a6f7f]" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="font-serif text-base font-medium text-[#0f2744]">Analysis in progress…</p>
    </div>
  );
}

export default function AnalysisPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          if (!cancelled) {
            if (res.status === 404) setLocation("/interview");
            else setLoadError(data.error ?? "Failed to load session.");
          }
          return;
        }
        const data = (await res.json()) as StoredSession;
        if (!cancelled) setSession(data);
      } catch {
        if (!cancelled) setLoadError("Failed to load session.");
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [sessionId, setLocation]);

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8]">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center max-w-sm">
          <p className="text-sm text-red-600 font-medium">{loadError}</p>
          <Link href="/interview" className="mt-4 inline-block text-sm text-[#2a6f7f] hover:underline">
            Start a new session
          </Link>
        </div>
      </div>
    );
  }

  if (!session || session.status === "analyzing" || !session.context) {
    return <Spinner />;
  }

  const { context, skinAnalysis, intake, isMockMode } = session;

  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-16">
      {/* Header */}
      <header className="border-b border-[#e2e8f0] bg-white px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <Link href="/" className="font-serif text-base font-semibold text-[#0f2744] hover:text-[#2a6f7f] transition-colors">
            InterviewReady AI
          </Link>
          {isMockMode && <Badge variant="outline" className="text-xs">Mock mode</Badge>}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 pt-8 space-y-8">
        <StepNav currentStep={2} />

        {/* Title */}
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#0f2744]">
            Interview analysis{intake.candidateName ? ` for ${intake.candidateName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-[#718096]">
            {intake.jobTitle} at {intake.companyName}
          </p>
        </div>

        {/* Dress code card */}
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-lg font-semibold text-[#0f2744]">Recommended dress code</h2>
              <p className="text-sm text-[#718096] mt-0.5">Industry: {context.inferredIndustry}</p>
            </div>
            <div className="text-right">
              <Badge
                variant={
                  (DRESS_CODE_COLORS[context.dressCode] ?? "default") as
                    | "default" | "secondary" | "accent" | "success" | "warning" | "outline"
                }
              >
                {DRESS_CODE_LABELS[context.dressCode] ?? context.dressCode}
              </Badge>
              <p className="mt-1 text-xs text-[#718096]">
                Confidence: {Math.round(context.confidence * 100)}%
              </p>
            </div>
          </div>

          {context.rationale && context.rationale.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#0f2744] mb-2">Why this dress code?</p>
              <ul className="space-y-1.5">
                {context.rationale.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#4a5568]">
                    <span className="text-[#2a6f7f] mt-0.5 shrink-0">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {context.recommendedColors && context.recommendedColors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#0f2744] mb-2">Recommended colours</p>
              <div className="flex flex-wrap gap-1.5">
                {context.recommendedColors.map((c) => (
                  <span key={c} className="rounded-full bg-[#e8f4f6] px-2.5 py-0.5 text-xs font-medium text-[#2a6f7f] capitalize">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {context.avoidPatterns && context.avoidPatterns.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#0f2744] mb-2">Avoid</p>
              <div className="flex flex-wrap gap-1.5">
                {context.avoidPatterns.map((p) => (
                  <span key={p} className="rounded-full bg-[#f4f6f8] px-2.5 py-0.5 text-xs text-[#718096] capitalize">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {context.jacketRecommended && (
            <p className="text-sm text-[#4a5568] flex items-center gap-1.5">
              <svg className="h-4 w-4 text-[#2a6f7f] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              A jacket or blazer is recommended for this interview.
            </p>
          )}
        </div>

        {/* Skin analysis */}
        {skinAnalysis && (
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 space-y-4">
            <h2 className="font-serif text-lg font-semibold text-[#0f2744]">Appearance preparation</h2>

            {skinAnalysis.observations && skinAnalysis.observations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#0f2744] mb-2">Observations</p>
                <ul className="space-y-1.5">
                  {skinAnalysis.observations.map((obs) => (
                    <li key={obs.id} className="text-sm text-[#4a5568]">
                      <span className="font-medium text-[#0f2744] capitalize">{obs.label}: </span>
                      {obs.guidance}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {skinAnalysis.preparationSuggestions && skinAnalysis.preparationSuggestions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#0f2744] mb-2">Preparation tips</p>
                <ul className="space-y-1.5">
                  {skinAnalysis.preparationSuggestions.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-[#4a5568]">
                      <span className="text-[#2a6f7f] mt-0.5 shrink-0">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {skinAnalysis.lightingNotes && skinAnalysis.lightingNotes.length > 0 && intake.interviewFormat === "video" && (
              <div>
                <p className="text-xs font-semibold text-[#0f2744] mb-2">Lighting notes (video interview)</p>
                <ul className="space-y-1.5">
                  {skinAnalysis.lightingNotes.map((note, i) => (
                    <li key={i} className="flex gap-2 text-xs text-[#4a5568]">
                      <span className="text-[#2a6f7f] mt-0.5">•</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <DisclaimerBanner text={COSMETIC_DISCLAIMER} />
          </div>
        )}

        {/* CTA */}
        <div className="flex justify-end">
          <Link
            href={`/interview/${sessionId}/try-on`}
            data-testid="continue-to-try-on"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#0f2744] px-6 text-sm font-semibold text-white hover:bg-[#0a1d35] transition-colors"
          >
            Continue to Virtual Try-On
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
