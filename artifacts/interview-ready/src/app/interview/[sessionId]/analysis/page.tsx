import { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
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

function Spinner() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <svg className="animate-spin h-8 w-8 text-[#0f2744]/30" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="font-serif text-sm italic text-[#0f2744]/60 tracking-wide">Curating your looks…</p>
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
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="border border-red-900/10 bg-red-50/50 p-8 text-center max-w-md w-full">
          <p className="text-sm font-serif italic text-red-900 mb-6">{loadError}</p>
          <Link href="/interview" className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744] border-b border-[#0f2744]/20 pb-1 hover:border-[#0f2744]">
            Begin New Consultation
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
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background pb-32"
    >
      <header className="border-b border-[#0f2744]/10 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-serif text-lg text-[#0f2744] hover:opacity-70 transition-opacity">
            FitCheckAI
          </Link>
          {isMockMode && <span className="text-[10px] uppercase tracking-widest text-[#0f2744]/40 border border-[#0f2744]/10 px-2 py-1">Mock Mode</span>}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 pt-12 md:pt-20">
        <StepNav currentStep={2} className="mb-16 md:mb-24" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
          
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-16">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="font-serif text-5xl md:text-6xl text-[#0f2744] leading-tight mb-4">
                The Verdict
              </h1>
              <p className="text-lg font-serif italic text-[#0f2744]/70">
                {intake.jobTitle} at {intake.companyName}
              </p>
            </motion.div>

            {/* Editorial Dress Code Block */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="border-t border-b border-[#0f2744]/10 py-12 space-y-10"
            >
              <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-6">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#0f2744]/50 mb-3">Inferred Dress Code</p>
                  <h2 className="font-serif text-4xl text-[#0f2744]">
                    {DRESS_CODE_LABELS[context.dressCode] ?? context.dressCode}
                  </h2>
                </div>
                <div className="md:text-right">
                  <p className="text-[10px] uppercase tracking-widest text-[#0f2744]/50 mb-1">Confidence</p>
                  <p className="font-serif text-2xl text-[#0f2744]">{Math.round(context.confidence * 100)}%</p>
                </div>
              </div>

              {context.rationale && context.rationale.length > 0 && (
                <div className="max-w-2xl">
                  <p className="text-[10px] uppercase tracking-widest text-[#0f2744]/50 mb-4">The Logic</p>
                  <ul className="space-y-3">
                    {context.rationale.map((r, i) => (
                      <li key={i} className="text-sm font-serif leading-relaxed text-[#0f2744]/80">
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                {context.recommendedColors && context.recommendedColors.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#0f2744]/50 mb-4">Palette</p>
                    <div className="flex flex-wrap gap-2">
                      {context.recommendedColors.map((c) => (
                        <span key={c} className="border border-[#0f2744]/10 bg-white/50 px-3 py-1.5 text-[10px] uppercase tracking-widest text-[#0f2744]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {context.avoidPatterns && context.avoidPatterns.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#0f2744]/50 mb-4">Avoid</p>
                    <div className="flex flex-wrap gap-2">
                      {context.avoidPatterns.map((p) => (
                        <span key={p} className="bg-[#0f2744]/5 px-3 py-1.5 text-[10px] uppercase tracking-widest text-[#0f2744]/60">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {context.jacketRecommended && (
                <div className="bg-[#0f2744] text-white p-6 flex items-start gap-4">
                  <span className="text-xl font-serif italic mt-[-2px]">Note</span>
                  <p className="text-sm font-serif leading-relaxed text-white/90">
                    A tailored jacket or blazer is highly recommended to anchor this look.
                  </p>
                </div>
              )}
            </motion.div>

            {/* Skin Analysis if available */}
            {skinAnalysis && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-8"
              >
                <h3 className="font-serif text-3xl text-[#0f2744]">Grooming & Presentation</h3>
                
                <div className="grid gap-8">
                  {skinAnalysis.observations && skinAnalysis.observations.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#0f2744]/50 mb-4 border-b border-[#0f2744]/10 pb-2">Analysis</p>
                      <ul className="space-y-4">
                        {skinAnalysis.observations.map((obs) => (
                          <li key={obs.id} className="text-sm font-serif leading-relaxed text-[#0f2744]/80">
                            <span className="font-medium text-[#0f2744] capitalize not-italic">{obs.label} — </span>
                            <span className="italic">{obs.guidance}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {skinAnalysis.preparationSuggestions && skinAnalysis.preparationSuggestions.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#0f2744]/50 mb-4 border-b border-[#0f2744]/10 pb-2">Preparation Protocol</p>
                      <ul className="space-y-3">
                        {skinAnalysis.preparationSuggestions.map((s, i) => (
                          <li key={i} className="flex gap-3 text-sm font-serif leading-relaxed text-[#0f2744]/80">
                            <span className="text-[#2a6f7f] text-xs mt-1">/</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {skinAnalysis.lightingNotes && skinAnalysis.lightingNotes.length > 0 && intake.interviewFormat === "video" && (
                    <div className="bg-white p-8 border border-[#0f2744]/10">
                      <p className="text-[10px] uppercase tracking-widest text-[#0f2744] mb-4">Camera Optimization</p>
                      <ul className="space-y-3">
                        {skinAnalysis.lightingNotes.map((note, i) => (
                          <li key={i} className="text-sm font-serif leading-relaxed text-[#0f2744]/80 italic">
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <DisclaimerBanner text={COSMETIC_DISCLAIMER} />
              </motion.div>
            )}
          </div>

          {/* Sidebar / CTA Column */}
          <div className="lg:col-span-4 lg:sticky lg:top-32 self-start mt-12 lg:mt-0">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="bg-[#0f2744] text-white p-8 md:p-10 flex flex-col items-center text-center gap-6"
            >
              <h3 className="font-serif text-3xl leading-tight">
                Ready to view <br/><span className="italic font-light">the curations?</span>
              </h3>
              <p className="text-sm font-serif italic text-white/60">
                We have prepared bespoke looks based on this analysis.
              </p>
              <Link
                href={`/interview/${sessionId}/try-on`}
                data-testid="continue-to-try-on"
                className="mt-4 bg-white text-[#0f2744] px-8 py-4 text-xs font-medium uppercase tracking-widest hover:bg-[#f9f6f0] transition-colors w-full flex justify-center items-center gap-3"
              >
                Reveal Outfits
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </motion.div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
