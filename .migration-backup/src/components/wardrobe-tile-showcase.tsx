"use client";

import { useEffect, useState } from "react";
import { getShowcaseVariants, type ShowcasePiece } from "@/lib/wardrobe/showcase";

function PiecePhoto({ piece }: { piece: ShowcasePiece }) {
  return (
    <figure className="overflow-hidden rounded-xl bg-[#f8f3eb]">
      {/* Local copies are documented in public/demo-assets/wardrobe/ATTRIBUTIONS.json. */}
      <img src={piece.imageSrc} alt={piece.imageAlt} className="h-28 w-full object-cover sm:h-36" loading="lazy" />
      <figcaption className="px-2 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#6b7180]">{piece.name}</figcaption>
    </figure>
  );
}

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
    const timer = window.setInterval(() => setLookIndex((current) => (current + 1) % variants.length), 4200);
    return () => window.clearInterval(timer);
  }, [reducedMotion, variants.length]);

  return (
    <section className="w-full max-w-[40rem] rounded-[2rem] border border-[#eadfce] bg-[#eee3d4] p-3 shadow-[0_24px_70px_rgba(68,54,42,0.16)] sm:p-5" data-testid="wardrobe-tile-showcase" aria-label="Real clothing outfit combinations">
      <div className="rounded-[1.35rem] border border-white/80 bg-[#f9f5ee]/90 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#53616d]">Real clothing study · demo imagery only</p><h2 className="mt-1 font-serif text-xl text-[#263d5b]">{look.name}</h2></div>
          <span className="rounded-full bg-[#263d5b] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white">{look.occasion}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PiecePhoto piece={look.top} /><PiecePhoto piece={look.blazer} /><PiecePhoto piece={look.bottom} /><PiecePhoto piece={look.accessory} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-[#6b7180]">Five base recipes · {variants.length} recombined variants</p>
          <button type="button" className="rounded-full border border-[#263d5b]/30 px-3 py-1.5 text-xs font-semibold text-[#263d5b] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a6f7f]" onClick={() => setLookIndex((current) => (current + 1) % variants.length)} aria-label="Show next outfit combination">Next look</button>
        </div>
      </div>
    </section>
  );
}
