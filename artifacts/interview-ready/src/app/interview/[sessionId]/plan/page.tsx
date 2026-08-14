import { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { StepNav } from "@/components/step-nav";
import { Checklist } from "@/components/checklist";
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

  if (!session?.plan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
        <svg className="animate-spin h-8 w-8 text-[#0f2744]/30" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="font-serif text-sm italic text-[#0f2744]/60 tracking-wide">Drafting your itinerary…</p>
      </div>
    );
  }

  const { plan, intake, outfits, selectedOutfitId, isMockMode } = session;
  const selectedOutfit = outfits?.find((o) => o.id === selectedOutfitId) ?? outfits?.[0];

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
        <StepNav currentStep={4} className="mb-16 md:mb-24" />

        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[10px] uppercase tracking-widest text-[#0f2744]/50 mb-4 border-b border-[#0f2744]/10 pb-2 inline-block">The Execution</p>
            <h1 className="font-serif text-5xl md:text-6xl text-[#0f2744] leading-tight">
              Your Itinerary
            </h1>
            <p className="mt-4 text-lg font-serif italic text-[#0f2744]/70">
              {intake.jobTitle} at {intake.companyName}
              <span className="mx-2 not-italic text-[#0f2744]/30">|</span>
              {intake.interviewDate}
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            {plan.summaryText && (
              <button
                onClick={() => void handleCopySummary()}
                className="group relative px-6 py-3 border border-[#0f2744] bg-transparent text-[#0f2744] text-[10px] font-medium uppercase tracking-widest transition-colors hover:bg-[#0f2744]/5"
              >
                {copied ? "Copied to Clipboard" : "Export Summary"}
              </button>
            )}
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
          <div className="lg:col-span-8 space-y-16">
            
            {/* 5-day checklist */}
            {plan.fiveDayChecklist && plan.fiveDayChecklist.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="bg-white p-8 md:p-12 border border-[#0f2744]/10 shadow-sm"
              >
                <Checklist title="T-Minus 5 Days" items={plan.fiveDayChecklist} />
              </motion.div>
            )}

            {/* Night before */}
            {plan.nightBeforeChecklist && plan.nightBeforeChecklist.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="bg-[#0f2744] text-white p-8 md:p-12 shadow-sm"
              >
                <div className="space-y-4">
                  <h3 className="text-xs uppercase tracking-widest font-medium text-white/80 pb-2 border-b border-white/20">
                    The Eve of the Encounter
                  </h3>
                  <ul className="space-y-3">
                    {plan.nightBeforeChecklist.map((item, index) => (
                      <li key={index} className="flex gap-4 items-start">
                        <span className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center border border-white/30"></span>
                        <span className="text-sm text-white/90 leading-relaxed font-serif">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 1-hour before */}
              {plan.oneHourBeforeChecklist && plan.oneHourBeforeChecklist.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="bg-white p-8 border border-[#0f2744]/10 shadow-sm"
                >
                  <Checklist title="T-Minus 1 Hour" items={plan.oneHourBeforeChecklist} />
                </motion.div>
              )}

              {/* Lighting & camera */}
              {plan.lightingAndCameraSuggestions && plan.lightingAndCameraSuggestions.length > 0 && intake.interviewFormat === "video" && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="bg-white p-8 border border-[#0f2744]/10 shadow-sm"
                >
                  <h3 className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744] pb-2 border-b border-[#0f2744]/10 mb-4">
                    Camera & Set Design
                  </h3>
                  <ul className="space-y-3">
                    {plan.lightingAndCameraSuggestions.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm font-serif italic text-[#0f2744]/80 leading-relaxed">
                        <span className="text-[#2a6f7f] text-xs mt-1 not-italic">/</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4">
            {/* Selected outfit feature */}
            {selectedOutfit && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white border border-[#0f2744]/10 p-8 shadow-sm lg:sticky lg:top-32"
              >
                <p className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744]/50 mb-6 pb-2 border-b border-[#0f2744]/10">
                  The Chosen Look
                </p>
                <h2 className="font-serif text-2xl text-[#0f2744] mb-3 leading-tight">{selectedOutfit.name}</h2>
                <p className="text-sm font-serif italic text-[#0f2744]/70 leading-relaxed mb-8">{plan.whySelected}</p>
                
                <div className="pt-6 border-t border-[#0f2744]/10">
                  <p className="text-[10px] uppercase tracking-widest text-[#0f2744]/50 mb-1">Estimated Investment</p>
                  {typeof plan.estimatedTotalPrice === "number" && (
                    <p className="font-serif text-2xl text-[#0f2744]">
                      ${plan.estimatedTotalPrice.toFixed(0)}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-16 mt-16 border-t border-[#0f2744]/10"
        >
          <Link href={`/interview/${sessionId}/try-on`} className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744]/60 hover:text-[#0f2744] transition-colors flex items-center gap-2">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Review Collection
          </Link>
          <Link href="/interview" className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744] border-b border-[#0f2744] pb-1 hover:text-[#2a6f7f] hover:border-[#2a6f7f] transition-colors">
            Start A New Consultation
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
