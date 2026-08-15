import Link from "next/link";
import { OccasionDemoForm } from "@/components/occasion-demo-form";
import { WardrobeTileShowcase } from "@/components/wardrobe-tile-showcase";

const DECISION_OUTPUTS = [
  "One lead outfit you can actually wear",
  "Two backups when the first mood is wrong",
  "One last-mile move before you leave",
];

const HOW_IT_WORKS = [
  {
    number: "01",
    title: "Tell us the moment",
    body: "Write the way you would text a friend: rooftop dinner, wedding in August, first day at a new job.",
  },
  {
    number: "02",
    title: "We work your closet",
    body: "FitCheck ranks complete combinations from your saved pieces before it suggests anything new.",
  },
  {
    number: "03",
    title: "Leave with a decision",
    body: "Get the look, the reason it works, and the one thing to do before the event starts.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f6f8]">
      <header className="border-b border-[#e2e8f0] bg-white/95 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="font-serif text-lg font-semibold tracking-tight text-[#0f2744]">
            FitCheck AI
          </Link>
          <nav className="flex items-center gap-4" aria-label="Primary navigation">
            <Link href="#how-it-works" className="hidden text-sm font-medium text-[#53616d] hover:text-[#0f2744] sm:inline">
              How it works
            </Link>
            <Link href="/wardrobe" className="hidden text-sm font-medium text-[#2a6f7f] hover:underline sm:inline">
              My wardrobe
            </Link>
            <Link href="#try-it" className="rounded-lg bg-[#0f2744] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0a1d35]">
              Get my outfit plan
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative border-b border-[#e4d8ca] bg-[#f7f1e9] px-6 py-12 sm:py-20">
        <div className="pointer-events-none absolute -left-28 top-10 h-72 w-72 rounded-full bg-[#e2c9b9]/35 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-[#c6d9d2]/45 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d9c8b8] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#63716f]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2a6f7f]" />
              The last-mile wardrobe copilot
            </div>
            <h1 className="mt-7 font-serif text-5xl font-semibold leading-[1.02] tracking-tight text-[#0f2744] sm:text-6xl">
              Stop staring at your closet.
              <span className="mt-2 block text-[#2a6f7f]">Know what to wear.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-[#53616d] sm:text-lg">
              Tell FitCheck the moment. It picks one complete outfit from what you own, explains why it works, and gives you the one move that makes leaving easy.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="#try-it" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0f2744] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,39,68,0.16)] transition hover:-translate-y-0.5 hover:bg-[#0a1d35]">
                Get my outfit plan <span aria-hidden="true">↘</span>
              </Link>
              <Link href="/occasion/demo" className="inline-flex h-12 items-center justify-center rounded-xl border border-[#d9c8b8] bg-white/70 px-5 text-sm font-semibold text-[#0f2744] transition hover:bg-white">
                See a finished plan
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#63716f]">
              <span>✓ Closet first</span>
              <span>✓ No shopping rabbit hole</span>
              <span>✓ Optional cosmetic prep</span>
            </div>
          </div>

          <WardrobeTileShowcase />
        </div>
      </section>

      <section id="try-it" className="scroll-mt-8 border-b border-[#d8e1e5] bg-[#0f2744] px-6 py-16 text-white sm:py-20">
        <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9ed4d0]">Start with the real problem</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight sm:text-5xl">Give us the moment. We&apos;ll give you a plan.</h2>
            <p className="mt-5 max-w-md text-base leading-7 text-[#c8d9dc]">No style vocabulary required. The event is enough to start, and details only appear when they improve the decision.</p>
            <ul className="mt-8 space-y-4">
              {DECISION_OUTPUTS.map((output) => (
                <li key={output} className="flex gap-3 text-sm leading-6 text-[#e7f0f1]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#9ed4d0]" />
                  {output}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[1.75rem] bg-[#f9f5ee] p-5 text-[#0f2744] shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2a6f7f]">Try your next event</p>
            <h3 className="mt-3 font-serif text-2xl font-semibold">What are you dressing for?</h3>
            <p className="mt-2 text-sm leading-6 text-[#53616d]">Example: “A rooftop dinner in Brooklyn — polished, but I still want to be comfortable.”</p>
            <div className="mt-6">
              <OccasionDemoForm />
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-[#e2e8f0] bg-white px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2a6f7f]">A better answer than “it depends”</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-[#0f2744] sm:text-4xl">From closet paralysis to a plan you can trust.</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.number} className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafb] p-6">
                <span className="font-serif text-4xl font-bold text-[#d8e1e5]">{step.number}</span>
                <h3 className="mt-4 font-serif text-xl font-semibold text-[#0f2744]">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#53616d]">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#d8e1e5] bg-[#e8f3f1] px-6 py-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-serif text-lg font-semibold text-[#0f2744]">The goal is confidence, not more content.</p>
              <p className="mt-1 text-sm text-[#53616d]">Save what you wore. Come back when the next event lands on your calendar.</p>
            </div>
            <Link href="/occasion/demo" className="shrink-0 text-sm font-semibold text-[#2a6f7f] hover:underline">Watch the guided example →</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e2e8f0] bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-xs text-[#7b8790] sm:flex-row sm:items-center sm:justify-between">
          <span className="font-serif text-lg font-semibold text-[#0f2744]">FitCheck AI</span>
          <span>Event intelligence for the wardrobe you already own.</span>
        </div>
      </footer>
    </main>
  );
}
