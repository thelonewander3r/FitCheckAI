import { useMemo, useState } from "react";
import { getShowcaseVariants, type ShowcasePiece } from "@/lib/wardrobe/showcase";

type ShowcaseVariant = ReturnType<typeof getShowcaseVariants>[number];

type Feedback = "Wear it" | "Not for me" | "Too formal" | "Already wore it";

const feedbackCopy: Record<Feedback, string> = {
  "Wear it": "Saved as your go-to for this kind of moment.",
  "Not for me": "Got it — we’ll move away from this shape next time.",
  "Too formal": "Noted — future picks will loosen the dress code.",
  "Already wore it": "Logged — we’ll keep this look fresh for the next event.",
};

const pieceLabel: Record<ShowcasePiece["category"], string> = {
  top: "Top",
  trousers: "Trousers",
  skirt: "Skirt",
  blazer: "Layer",
  accessory: "Accessory",
};

function PieceTile({ piece }: { piece: ShowcasePiece }) {
  return (
    <div className="group overflow-hidden border border-[#d9d1c7] bg-white">
      <div className="aspect-[4/3] overflow-hidden bg-[#e9e1d7]">
        <img src={piece.imageSrc} alt={piece.imageAlt} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
      </div>
      <div className="px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a8076]">{pieceLabel[piece.category]}</p>
        <p className="mt-1 text-sm font-semibold text-[#172b3a]">{piece.name}</p>
        <p className="mt-1 text-[11px] text-[#7b746d]">Owned piece · demo wardrobe</p>
      </div>
    </div>
  );
}

function WhyThisWorks({ look }: { look: ShowcaseVariant }) {
  return (
    <div className="border-l-2 border-[#b77b52] pl-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a15e35]">Why this works</p>
      <p className="mt-2 text-sm leading-6 text-[#42515a]">
        The {look.top.name.toLowerCase()} keeps the look approachable, while the {look.blazer.name.toLowerCase()} gives enough structure for a polished arrival. The {look.bottom.name.toLowerCase()} keeps movement easy from commute to conversation.
      </p>
    </div>
  );
}

export default function DecisionDemo() {
  const variants = useMemo(() => getShowcaseVariants(), []);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const look = variants[index]!;
  const alternatives = [variants[(index + 1) % variants.length]!, variants[(index + 2) % variants.length]!];
  const alternativeImageSets = alternatives.map((alternative, alternativeIndex) => [
    alternative.top.imageSrc,
    variants[(index + 3 + alternativeIndex) % variants.length]!.top.imageSrc,
  ]);

  function selectFeedback(value: Feedback) {
    setFeedback(value);
  }

  return (
    <section id="decision" className="border-y border-[#d9d1c7] bg-[#f1ede8] px-5 py-16 sm:px-8 lg:px-12 lg:py-24" aria-label="FitCheck decision demo">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-5 border-b border-[#d2c8be] pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#a15e35]">Today’s decision · 8:42 AM</p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl leading-[1.02] text-[#172b3a] sm:text-6xl">What should I wear right now?</h2>
          </div>
          <p className="max-w-xs text-sm leading-6 text-[#6c716f]">A direct answer for the day ahead — built from what is already in your closet.</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2" aria-label="Current context">
          {["Client coffee", "Soho · 10:30 AM", "68° · clear", "Client-ready polish"].map((item) => <span key={item} className="border border-[#cfc4b8] bg-[#faf8f5] px-3 py-2 text-xs font-semibold text-[#42515a]">{item}</span>)}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="bg-[#172b3a] p-4 text-white shadow-[0_24px_70px_rgba(23,43,58,0.2)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#d9aa84]">The call</p>
              <span className="border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#dce6e5]">{look.occasion}</span>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-[0.9fr_1.1fr]">
              <div className="aspect-[4/5] overflow-hidden bg-[#d9d0c7]"><img src={look.top.imageSrc} alt={`${look.name} wardrobe reference`} className="h-full w-full object-cover" /></div>
              <div className="flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d9aa84]">Wear this</p>
                  <h3 className="mt-2 font-serif text-4xl leading-none sm:text-5xl">Client-ready polish</h3>
                  <p className="mt-4 text-sm leading-6 text-[#dce6e5]">The easy yes: sharp enough for the room, relaxed enough to keep your day moving.</p>
                  <div className="mt-6 grid grid-cols-2 gap-2">
                    {[look.top, look.bottom, look.blazer, look.accessory].map((piece) => <div key={piece.id} className="border border-white/15 px-3 py-3"><p className="text-[9px] uppercase tracking-[0.15em] text-[#a8c1bd]">{pieceLabel[piece.category]}</p><p className="mt-1 text-xs font-semibold text-white">{piece.name}</p></div>)}
                  </div>
                </div>
                <p className="mt-6 border-t border-white/15 pt-4 text-xs text-[#a8c1bd]">All four pieces are marked owned · no shopping required</p>
              </div>
            </div>
          </article>

          <div className="flex flex-col gap-5">
            <div className="bg-[#faf8f5] p-6"><WhyThisWorks look={look} /></div>
            <div className="border border-[#cfc4b8] bg-[#e4eee9] p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#45766f]">Wardrobe gap</p>
              <h3 className="mt-2 font-serif text-2xl text-[#172b3a]">Don’t buy another shirt.</h3>
              <p className="mt-2 text-sm leading-6 text-[#53615f]">You have enough tops for this week. The missing move is a comfortable dark trouser — not another new arrival.</p>
            </div>
            <div className="border border-[#d6c1a8] bg-[#f8eee3] p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a15e35]">Feedback trains the next call</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(feedbackCopy) as Feedback[]).map((value) => <button key={value} type="button" onClick={() => selectFeedback(value)} className="border border-[#c99f7d] bg-white/70 px-3 py-2 text-xs font-semibold text-[#70442b] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a15e35]">{value}</button>)}
              </div>
              <p className="mt-4 min-h-5 text-xs font-semibold text-[#70442b]" role="status" aria-live="polite">{feedback ? `✓ ${feedbackCopy[feedback]}` : "Tell us what to change and we’ll remember."}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-[#d2c8be] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a8076]">Not the mood?</p><p className="mt-1 text-sm text-[#59656b]">See two lower-stakes alternatives from the same wardrobe.</p></div>
          <button type="button" onClick={() => { setIndex((current) => (current + 1) % variants.length); setFeedback(null); }} className="self-start bg-[#172b3a] px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] text-white hover:bg-[#25445a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a15e35]">Show another answer</button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">{alternatives.map((alternative, alternativeIndex) => <button type="button" key={alternative.id} onClick={() => { setIndex(variants.findIndex((item) => item.id === alternative.id)); setFeedback(null); }} className="group grid grid-cols-[7rem_1fr] gap-4 border border-[#d4cbc2] bg-[#faf8f5] p-3 text-left transition hover:border-[#a15e35]"><span className="grid h-24 w-28 grid-cols-2 gap-1 overflow-hidden">{alternativeImageSets[alternativeIndex]!.map((imageSrc, imageIndex) => <img key={`${alternative.id}-${imageIndex}`} src={imageSrc} alt="" aria-hidden="true" className="h-full w-full object-cover" />)}</span><span><span className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#8a8076]">Alternative</span><span className="mt-1 block font-serif text-xl text-[#172b3a]">{alternative.name}</span><span className="mt-1 block text-xs text-[#6c716f]">{alternative.occasion} · two owned-piece references</span></span></button>)}</div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <article className="border border-[#c8d8d7] bg-[#eaf3f2] p-6"><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#39716e]">Skin AI · live-ready</p><span className="bg-[#39716e] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-white">Cosmetic only</span></div><h3 className="mt-3 font-serif text-2xl text-[#172b3a]">A calm finishing pass.</h3><p className="mt-2 text-sm leading-6 text-[#53615f]">Skin AI can turn a permitted selfie into appearance guidance for camera confidence. It does not diagnose, judge, or change the outfit decision.</p><div className="mt-4 flex flex-wrap items-center gap-4"><p className="text-xs font-semibold text-[#39716e]">Mock by default · live when configured</p><a href="/interview" className="border-b border-[#39716e]/40 pb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#39716e] hover:border-[#39716e]">Open Skin AI →</a></div></article>
          <article className="border border-[#d4cbc2] bg-[#faf8f5] p-6"><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a8076]">Apparel VTO · gated</p><span className="border border-[#b7aaa0] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-[#796f68]">Mock preview</span></div><h3 className="mt-3 font-serif text-2xl text-[#172b3a]">Try-on comes after the right reference.</h3><p className="mt-2 text-sm leading-6 text-[#6c716f]">A live render needs this selected garment’s isolated reference plus a permitted user image. These editorial wardrobe photos are demo references, not proof of a live VTO result.</p><p className="mt-4 text-xs font-semibold text-[#8a8076]">No live Apparel VTO claim in this demo</p></article>
        </div>
      </div>
    </section>
  );
}
