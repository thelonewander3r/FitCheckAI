import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/services/session-service";
import { StepNav } from "@/components/step-nav";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { Badge } from "@/components/ui/badge";
import { COSMETIC_DISCLAIMER } from "@/lib/safety/skin-safety";

interface Props {
  params: Promise<{ sessionId: string }>;
}

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

export default async function AnalysisPage({ params }: Props) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);

  if (!session) redirect("/interview");

  if (session.status === "analyzing" || !session.context) {
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
          Analysis in progress…
        </p>
      </div>
    );
  }

  const { context, skinAnalysis, intake, isMockMode } = session;

  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-16">
      {/* Header */}
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
        <StepNav currentStep={2} />

        {/* Title */}
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#0f2744]">
            Interview analysis
            {intake.candidateName ? ` for ${intake.candidateName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-[#718096]">
            {intake.jobTitle} at {intake.companyName}
          </p>
        </div>

        {/* Dress code card */}
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-lg font-semibold text-[#0f2744]">
                Recommended dress code
              </h2>
              <p className="text-sm text-[#718096] mt-0.5">
                Industry: {context.inferredIndustry}
              </p>
            </div>
            <div className="text-right">
              <Badge
                variant={
                  (DRESS_CODE_COLORS[context.dressCode] as
                    | "default"
                    | "secondary"
                    | "accent"
                    | "success"
                    | "warning"
                    | "outline") ?? "default"
                }
                className="text-sm px-3 py-1"
              >
                {DRESS_CODE_LABELS[context.dressCode] ?? context.dressCode}
              </Badge>
              <p className="text-xs text-[#718096] mt-1">
                {Math.round(context.confidence * 100)}% confidence
              </p>
            </div>
          </div>

          {/* Confidence bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#718096]">
              <span>Inference confidence</span>
              <span>{Math.round(context.confidence * 100)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#e2e8f0]">
              <div
                className="h-full rounded-full bg-[#2a6f7f]"
                style={{ width: `${Math.round(context.confidence * 100)}%` }}
              />
            </div>
          </div>

          {/* Recommended colours */}
          <div>
            <p className="text-xs font-semibold text-[#0f2744] mb-2">
              Recommended colours
            </p>
            <div className="flex flex-wrap gap-1.5">
              {context.recommendedColors.map((color) => (
                <Badge key={color} variant="secondary" className="capitalize">
                  {color}
                </Badge>
              ))}
            </div>
          </div>

          {/* Avoid */}
          <div>
            <p className="text-xs font-semibold text-[#0f2744] mb-2">
              Patterns to avoid
            </p>
            <div className="flex flex-wrap gap-1.5">
              {context.avoidPatterns.map((p) => (
                <Badge key={p} variant="warning">
                  {p}
                </Badge>
              ))}
            </div>
          </div>

          {context.jacketRecommended && (
            <div className="flex items-center gap-2 rounded-lg bg-[#e8f4f6] px-3 py-2">
              <svg
                className="h-4 w-4 text-[#2a6f7f] flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-xs text-[#2a6f7f] font-medium">
                A jacket is recommended for this interview context.
              </p>
            </div>
          )}
        </div>

        {/* Rationale */}
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 space-y-3">
          <h2 className="font-serif text-base font-semibold text-[#0f2744]">
            Analysis rationale
          </h2>
          <ul className="space-y-2">
            {context.rationale.map((note, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#2a6f7f]" />
                <span className="text-sm text-[#4a5568] leading-relaxed">
                  {note}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Skin analysis */}
        {skinAnalysis && (
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-base font-semibold text-[#0f2744]">
                Skin & appearance notes
              </h2>
              {skinAnalysis.isMock && (
                <Badge variant="outline" className="text-xs">
                  Mock data
                </Badge>
              )}
            </div>

            {skinAnalysis.observations.length > 0 && (
              <div className="space-y-3">
                {skinAnalysis.observations.map((obs) => (
                  <div
                    key={obs.id}
                    className="rounded-lg bg-[#f4f6f8] px-3 py-2.5"
                  >
                    <p className="text-xs font-semibold text-[#0f2744] mb-0.5">
                      {obs.label}
                    </p>
                    <p className="text-xs text-[#4a5568] leading-relaxed">
                      {obs.guidance}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {skinAnalysis.preparationSuggestions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#0f2744] mb-2">
                  Preparation suggestions
                </p>
                <ul className="space-y-1.5">
                  {skinAnalysis.preparationSuggestions.map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs text-[#4a5568]">
                      <span className="text-[#2a6f7f] mt-0.5">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {skinAnalysis.lightingNotes.length > 0 &&
              intake.interviewFormat === "video" && (
                <div>
                  <p className="text-xs font-semibold text-[#0f2744] mb-2">
                    Lighting notes (video interview)
                  </p>
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
          </Link>
        </div>
      </div>
    </div>
  );
}
