import { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { StepNav } from "@/components/step-nav";
import { OutfitCard } from "@/components/outfit-card";
import type { StoredSession } from "@/types/session";
import type { RankedOutfit } from "@/types/interview";
import type { ApparelTryOnResult } from "@/lib/youcam/types";

export default function TryOnPage() {
  const { sessionId = "" } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadingTryOn, setLoadingTryOn] = useState<string | null>(null);
  const [continuingToPlan, setContinuingToPlan] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((data: StoredSession & { error?: string }) => {
        if (data.error) setLoadError(data.error);
        else setSession(data);
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
      const res = await fetch(`/api/sessions/${sessionId}/plan`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setActionError(body.error ?? "Failed to generate plan. Please try again.");
        return;
      }
      setLocation(`/interview/${sessionId}/plan`);
    } catch {
      setActionError("Network error — please try again.");
    } finally {
      setContinuingToPlan(false);
    }
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

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
        <svg className="animate-spin h-8 w-8 text-[#0f2744]/30" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="font-serif text-sm italic text-[#0f2744]/60 tracking-wide">Bringing the wardrobe to you…</p>
      </div>
    );
  }

  const outfits = (session.outfits ?? []) as RankedOutfit[];
  const tryOnResults = (session.tryOnResults ?? {}) as Record<string, ApparelTryOnResult>;
  const selectedOutfitId = session.selectedOutfitId;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background pb-32"
    >
      <header className="border-b border-[#0f2744]/10 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-serif text-lg text-[#0f2744] hover:opacity-70 transition-opacity">
            Vogue × Career
          </Link>
          {session.isMockMode && <span className="text-[10px] uppercase tracking-widest text-[#0f2744]/40 border border-[#0f2744]/10 px-2 py-1">Mock Mode</span>}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 pt-12 md:pt-20">
        <StepNav currentStep={3} className="mb-16 md:mb-24" />

        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[10px] uppercase tracking-widest text-[#0f2744]/50 mb-4 border-b border-[#0f2744]/10 pb-2 inline-block">The Collection</p>
            <h1 className="font-serif text-5xl md:text-6xl text-[#0f2744] leading-tight">
              Virtual Try-On
            </h1>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            <p className="max-w-xs text-sm font-serif italic text-[#0f2744]/60 text-right">
              Select an outfit to commit to your choice, then proceed to the final preparation plan.
            </p>
          </motion.div>
        </div>

        {actionError && (
          <div className="mb-12 border border-red-900/10 bg-red-50/50 p-6 text-sm font-serif italic text-red-900 text-center">
            {actionError}
          </div>
        )}

        {outfits.length > 0 ? (
          <div className="grid gap-12 lg:gap-24 grid-cols-1 xl:grid-cols-2 mb-24">
            {outfits.map((outfit) => (
              <OutfitCard
                key={outfit.id}
                outfit={outfit}
                tryOnResult={tryOnResults[outfit.id]}
                isSelected={selectedOutfitId === outfit.id}
                isLoadingTryOn={loadingTryOn === outfit.id}
                onTryOn={() => void handleTryOn(outfit.id)}
                onSelect={() => void handleSelect(outfit.id)}
              />
            ))}
          </div>
        ) : (
          <div className="border border-[#0f2744]/10 bg-white p-16 text-center max-w-2xl mx-auto mb-24">
            <p className="text-sm font-serif italic text-[#0f2744]/60 mb-6">The collection is currently empty.</p>
            <Link href={`/interview/${sessionId}/analysis`} className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744] border-b border-[#0f2744]/20 pb-1 hover:border-[#0f2744]">
              Return to Analysis
            </Link>
          </div>
        )}

        {/* Continue CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col-reverse sm:flex-row items-center justify-between gap-8 pt-12 border-t border-[#0f2744]/10"
        >
          <Link href={`/interview/${sessionId}/analysis`} className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744]/60 hover:text-[#0f2744] transition-colors flex items-center gap-2">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Review Analysis
          </Link>
          
          <button
            onClick={() => void handleContinue()}
            disabled={continuingToPlan || outfits.length === 0}
            className="group relative px-10 py-5 bg-[#0f2744] text-white text-xs font-medium uppercase tracking-widest overflow-hidden transition-all hover:bg-[#0a1d35] disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {continuingToPlan ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Finalizing Itinerary
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                Confirm & Proceed
                <svg className="h-4 w-4 transform transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            )}
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
