import { useEffect, useMemo, useState } from "react";
import { getShowcaseVariants, type ShowcasePiece } from "@/lib/wardrobe/showcase";

type ShowcaseVariant = ReturnType<typeof getShowcaseVariants>[number];

type Feedback = "Wear it" | "Not for me" | "Too formal" | "Already wore it";

/** A client-side decision request produced by the landing moment form. */
export interface DecisionRequest {
  /** The user's original moment description. */
  moment: string;
  /** Context chips: event, place, time/weather, constraint. */
  context: string[];
  /** Lead "Wear this" headline. */
  headline: string;
  /** The easy-yes line under the headline. */
  note: string;
  /** Showcase variant id to lead with. */
  variantId: string;
}

const DEFAULT_CONTEXT = [
  "Client coffee",
  "Soho · 10:30 AM",
  "68° · clear",
  "Client-ready polish",
];

const DEFAULT_NOTE =
  "The easy yes: sharp enough for the room, relaxed enough to keep your day moving.";

const feedbackCopy: Record<Feedback, string> = {
  "Wear it": "Noted for this demo session.",
  "Not for me": "Got it — this demo will show the response locally.",
  "Too formal": "Noted for this demo session.",
  "Already wore it": "Logged for this demo session.",
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
        <p className="mt-1 text-[11px] text-[#7b746d]">Demo wardrobe reference</p>
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

interface DecisionDemoProps {
  /** When set, the demo leads with this request and its own context. */
  request?: DecisionRequest | null;
}

export default function DecisionDemo({ request }: DecisionDemoProps = {}) {
  const variants = useMemo(() => getShowcaseVariants(), []);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [custom, setCustom] = useState<(DecisionRequest & { index: number }) | null>(null);

  useEffect(() => {
    if (!request) return;
    const target = variants.findIndex((v) => v.id === request.variantId);
    setIndex(target >= 0 ? target : 0);
    setCustom({ ...request, index: target >= 0 ? target : 0 });
    setFeedback(null);
  }, [request, variants]);

  const look = variants[index]!;
  const alternatives = [variants[(index + 1) % variants.length]!, variants[(index + 2) % variants.length]!];
  const alternativeImageSets = alternatives.map((alternative, alternativeIndex) => [
    alternative.top.imageSrc,
    variants[(index + 3 + alternativeIndex) % variants.length]!.top.imageSrc,
  ]);

  const context = custom?.context ?? DEFAULT_CONTEXT;
  const isRequestedLook = custom !== null && index === custom.index;
  const headline = isRequestedLook ? custom!.headline : look.name;
  const note = isRequestedLook ? custom!.note : DEFAULT_NOTE;

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
          <p className="max-w-xs text-sm leading-6 text-[#6c716f]">A direct answer for the day ahead — built from clearly labeled demo wardrobe references.</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2" aria-label="Current context">
          {context.map((item) => <span key={item} className="border border-[#cfc4b8] bg-[#faf8f5] px-3 py-2 text-xs font-semibold text-[#42515a]">{item}</span>)}
        </div>
        {custom && (
          <p className="mt-3 max-w-2xl text-xs italic leading-6 text-[#6c716f]">
            From your prompt: “{custom.moment}” — demo answer assembled from labeled wardrobe references only.
          </p>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="bg-[#172b3a] p-4 text-white shadow-[0_24px_70px_rgba(23,43,58,0.2)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#d9aa84]">The call</p>
              <span className="border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#dce6e5]">{context[0]}</span>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-[0.9fr_1.1fr]">
              <div className="aspect-[4/5] overflow-hidden bg-[#d9d0c7]"><img src={look.top.imageSrc} alt={`${look.name} wardrobe reference`} className="h-full w-full object-cover" /></div>
              <div className="flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d9aa84]">Wear this</p>
                  <h3 className="mt-2 font-serif text-4xl leading-none sm:text-5xl">{headline}</h3>
                  <p className="mt-4 text-sm leading-6 text-[#dce6e5]">{note}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" onClick={() => selectFeedback("Wear it")} className="bg-[#d9aa84] px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] text-[#172b3a] hover:bg-[#f0c4a0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9aa84]">Wear it</button><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a8c1bd]">Demo session only</span></div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-white/15 bg-white/[0.04] px-3 py-3"><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#a8c1bd]">Seeded demo wardrobe</p><p className="mt-1 text-xs text-[#dce6e5]">Owned for this demo · editorial references shown below</p></div><a href="/wardrobe" className="border-b border-[#d9aa84]/60 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#d9aa84] hover:border-[#d9aa84]">Import your pieces →</a></div>
                  <div className="mt-4 border border-white/15 bg-white/[0.03] p-2"><p className="px-1 pb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#a8c1bd]">Selected owned demo wardrobe · four reference pieces</p><div className="grid grid-cols-2 gap-2">{[look.top, look.bottom, look.blazer, look.accessory].map((piece) => <div key={piece.id} className="overflow-hidden border border-white/15"><img src={piece.imageSrc} alt={`${piece.name} demo wardrobe reference`} className="aspect-[4/3] w-full object-cover" /><div className="px-2 py-2"><p className="text-[9px] uppercase tracking-[0.15em] text-[#a8c1bd]">{pieceLabel[piece.category]}</p><p className="mt-1 text-xs font-semibold text-white">{piece.name}</p></div></div>)}</div></div>
                </div>
                <p className="mt-6 border-t border-white/15 pt-4 text-xs text-[#a8c1bd]">Four owned demo pieces · no shopping claim</p>
              </div>
            </div>
          </article>

          <div className="flex flex-col gap-5">
            <div className="bg-[#faf8f5] p-6"><WhyThisWorks look={look} /></div>
            <div className="border border-[#cfc4b8] bg-[#e4eee9] p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#45766f]">Demo wardrobe insight</p>
              <h3 className="mt-2 font-serif text-2xl text-[#172b3a]">No extra shirt in this reference set.</h3>
              <p className="mt-2 text-sm leading-6 text-[#53615f]">This demo set already includes several tops; import your own pieces to get a personal wardrobe-gap read.</p>
            </div>
            <div className="border border-[#d6c1a8] bg-[#f8eee3] p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a15e35]">Feedback · this demo session</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(feedbackCopy) as Feedback[]).map((value) => <button key={value} type="button" onClick={() => selectFeedback(value)} className="border border-[#c99f7d] bg-white/70 px-3 py-2 text-xs font-semibold text-[#70442b] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a15e35]">{value}</button>)}
              </div>
              <p className="mt-4 min-h-5 text-xs font-semibold text-[#70442b]" role="status" aria-live="polite">{feedback ? `✓ ${feedbackCopy[feedback]}` : "Tell us what to change in this demo session."}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-[#d2c8be] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a8076]">Not the mood?</p><p className="mt-1 text-sm text-[#59656b]">See two lower-stakes alternatives from the same wardrobe.</p></div>
          <button type="button" onClick={() => { setIndex((current) => (current + 1) % variants.length); setFeedback(null); }} className="self-start bg-[#172b3a] px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] text-white hover:bg-[#25445a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a15e35]">Show another answer</button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">{alternatives.map((alternative, alternativeIndex) => <button type="button" key={alternative.id} onClick={() => { setIndex(variants.findIndex((item) => item.id === alternative.id)); setFeedback(null); }} className="group grid grid-cols-[7rem_1fr] gap-4 border border-[#d4cbc2] bg-[#faf8f5] p-3 text-left transition hover:border-[#a15e35]"><span className="grid h-24 w-28 grid-cols-2 gap-1 overflow-hidden">{alternativeImageSets[alternativeIndex]!.map((imageSrc, imageIndex) => <img key={`${alternative.id}-${imageIndex}`} src={imageSrc} alt="" aria-hidden="true" className="h-full w-full object-cover" />)}</span><span><span className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#8a8076]">Alternative</span><span className="mt-1 block font-serif text-xl text-[#172b3a]">{alternative.name}</span><span className="mt-1 block text-xs text-[#6c716f]">{alternative.occasion} · two demo wardrobe references</span></span></button>)}</div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <article className="border border-[#c8d8d7] bg-[#eaf3f2] p-6"><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#39716e]">YouCam Skin AI · mock-first</p><span className="bg-[#39716e] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-white">Cosmetic only</span></div><h3 className="mt-3 font-serif text-2xl text-[#172b3a]">A calm finishing pass.</h3><p className="mt-2 text-sm leading-6 text-[#53615f]">Skin AI can turn a permitted selfie into appearance guidance for camera confidence. It does not diagnose, judge, or change the outfit decision.</p><div className="mt-4 flex flex-wrap items-center gap-4"><div><p className="text-xs font-semibold text-[#39716e]">Landing demo status: no live YouCam result rendered</p><p className="mt-1 text-[11px] text-[#53615f]">Provider is not invoked on this page; use the demo route for the configured/mock flow.</p></div><a href="/demo" className="border-b border-[#39716e]/40 pb-1 text-xs font-bold uppercase tracking-[0.12em] text-[#39716e] hover:border-[#39716e]">Try Skin AI demo →</a></div></article>
          <article className="border border-[#d4cbc2] bg-[#faf8f5] p-6"><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a8076]">Apparel VTO · gated</p><span className="border border-[#b7aaa0] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-[#796f68]">Mock preview</span></div><h3 className="mt-3 font-serif text-2xl text-[#172b3a]">Try-on comes after the right reference.</h3><p className="mt-2 text-sm leading-6 text-[#6c716f]">A live render needs this selected garment’s isolated reference plus a permitted user image. These editorial wardrobe photos are demo references, not proof of a live VTO result.</p><p className="mt-4 text-xs font-semibold text-[#8a8076]">No live Apparel VTO claim in this demo</p></article>
        </div>
      </div>
    </section>
  );
}
