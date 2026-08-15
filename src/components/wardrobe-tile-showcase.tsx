"use client";

import { useEffect, useState } from "react";
import { getShowcaseVariants } from "@/lib/wardrobe/showcase";

export function WardrobeTileShowcase() {
  const variants = getShowcaseVariants();
  const [lookIndex, setLookIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const look = variants[lookIndex]!;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(
      () => setLookIndex((current) => (current + 1) % variants.length),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [reducedMotion, variants.length]);

  const pieces = [look.top.name, look.bottom.name, look.blazer.name, look.accessory.name];

  return (
    <section
      className="w-full max-w-[42rem] rounded-[2rem] border border-[#eadfce] bg-[#eee3d4] p-3 shadow-[0_24px_70px_rgba(68,54,42,0.16)] sm:p-5"
      data-testid="wardrobe-tile-showcase"
      aria-label="Example FitCheck outfit plan"
    >
      <div className="overflow-hidden rounded-[1.35rem] border border-white/80 bg-[#f9f5ee]/95">
        <div className="grid sm:grid-cols-[1.05fr_0.95fr]">
          <div className="min-h-[19rem] bg-[#e4d5c3]">
            {/* Local editorial references are documented in ATTRIBUTIONS.json. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={look.top.imageSrc}
              alt={`${look.name} editorial clothing reference`}
              className="h-full min-h-[19rem] w-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-between p-5 sm:p-6">
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#53616d]">Example answer</p>
                <span className="rounded-full bg-[#263d5b] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white">{look.occasion}</span>
              </div>
              <h2 className="mt-3 font-serif text-2xl leading-tight text-[#263d5b]">{look.name}</h2>
              <p className="mt-3 text-sm leading-6 text-[#53616d]">A complete look from a real closet, with a clear next move instead of another moodboard.</p>
              <ul className="mt-5 space-y-2">
                {pieces.map((piece) => (
                  <li key={piece} className="flex gap-2 text-sm text-[#263d5b]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2a6f7f]" />
                    {piece}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#e5d9cb] pt-4">
              <p className="text-xs leading-5 text-[#6b7180]">Five base plans · ten combinations</p>
              <button
                type="button"
                className="rounded-full border border-[#263d5b]/30 px-3 py-1.5 text-xs font-semibold text-[#263d5b] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a6f7f]"
                onClick={() => setLookIndex((current) => (current + 1) % variants.length)}
                aria-label="Show another example outfit plan"
              >
                Another plan
              </button>
            </div>
          </div>
        </div>
        <p className="border-t border-[#e5d9cb] px-5 py-3 text-[0.68rem] leading-5 text-[#7b7167]">
          Editorial reference imagery only. FitCheck&apos;s recommendation comes from the event and the pieces in your wardrobe.
        </p>
      </div>
    </section>
  );
}
