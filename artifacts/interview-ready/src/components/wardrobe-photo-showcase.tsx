import { useEffect, useState } from "react";
import { getShowcaseVariants } from "@/lib/wardrobe/showcase";

export default function WardrobePhotoShowcase() {
  const variants = getShowcaseVariants();
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const look = variants[index]!;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % variants.length), 5200);
    return () => window.clearInterval(timer);
  }, [reducedMotion, variants.length]);

  return (
    <section className="w-full rounded-[2rem] border border-[#eadfce] bg-[#eee3d4] p-3 shadow-[0_24px_70px_rgba(68,54,42,0.16)] sm:p-5" aria-label="Example FitCheck outfit plan" data-testid="wardrobe-tile-showcase">
      <div className="rounded-[1.35rem] border border-white/80 bg-[#f9f5ee]/90 p-4 sm:p-5">
        <div className="grid gap-5 sm:grid-cols-[0.95fr_1.05fr] sm:items-stretch">
          <div className="overflow-hidden rounded-2xl bg-[#f8f3eb]"><img src={look.top.imageSrc} alt={`${look.name} editorial clothing reference`} className="h-full min-h-64 w-full object-cover" loading="eager" /><p className="border-t border-[#eadfce] px-3 py-2 text-[0.62rem] leading-4 text-[#7a7068]">Editorial reference imagery only. Your saved wardrobe remains the source of truth.</p></div>
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3"><div><p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#53616d]">Example answer</p><h2 className="mt-1 font-serif text-2xl text-[#263d5b]">{look.name}</h2></div><span className="rounded-full bg-[#263d5b] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white">{look.occasion}</span></div>
              <p className="mt-4 text-sm leading-6 text-[#53616d]">A complete look from a real closet, with a clear next move instead of another moodboard.</p>
              <ul className="mt-5 space-y-2 text-sm text-[#263d5b]">{[look.top.name, look.bottom.name, look.blazer.name, look.accessory.name].map((piece) => <li key={piece} className="flex gap-2"><span className="text-[#2a6f7f]">•</span>{piece}</li>)}</ul>
            </div>
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#eadfce] pt-4"><p className="text-xs text-[#6b7180]">Five base plans · {variants.length} combinations</p><button type="button" className="rounded-full border border-[#263d5b]/30 px-3 py-1.5 text-xs font-semibold text-[#263d5b] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a6f7f]" onClick={() => setIndex((current) => (current + 1) % variants.length)} aria-label="Show another example outfit plan">Another plan</button></div>
          </div>
        </div>
      </div>
    </section>
  );
}
