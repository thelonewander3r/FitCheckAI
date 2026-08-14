import Link from "next/link";
import { OccasionDemoForm } from "@/components/occasion-demo-form";
import { WardrobeTileShowcase } from "@/components/wardrobe-tile-showcase";

const HOW_IT_WORKS = [
  {
    number: "01",
    title: "Name the moment",
    body: "Tell FitCheck where you are headed in your own words — a wedding, dinner, conference, gallery opening, or whatever is next.",
  },
  {
    number: "02",
    title: "Start with your closet",
    body: "Your existing pieces come first. Add new pieces later when you want to expand the combinations you can make.",
  },
  {
    number: "03",
    title: "See the whole look",
    body: "Get complete outfit combinations, event context, and clear guidance on what works together.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f6f8]">
      <header className="border-b border-[#e2e8f0] bg-white/95 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/"
            className="font-serif text-lg font-semibold tracking-tight text-[#0f2744]"
          >
            FitCheck AI
          </Link>
          <nav className="flex items-center gap-4" aria-label="Primary navigation">
            <Link
              href="/wardrobe"
              className="hidden text-sm font-medium text-[#2a6f7f] hover:underline sm:inline"
            >
              My wardrobe
            </Link>
            <Link
              href="#occasion-demo"
              className="rounded-lg bg-[#0f2744] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0a1d35]"
            >
              Start with an occasion
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative border-b border-[#e4d8ca] bg-[#f7f1e9] px-6 py-12 sm:py-16">
        <div className="pointer-events-none absolute -left-28 top-10 h-72 w-72 rounded-full bg-[#e2c9b9]/35 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-[#c6d9d2]/45 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d9c8b8] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#63716f]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2a6f7f]" />
              Your closet, recombined
            </div>
            <p className="mt-7 font-serif text-sm font-semibold uppercase tracking-[0.22em] text-[#2a6f7f]">
              FitCheck AI
            </p>
            <h1 className="mt-3 font-serif text-5xl font-semibold leading-[1.02] tracking-tight text-[#0f2744] sm:text-6xl">
              Outfit ideas for the life you&apos;re actually living.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-[#53616d] sm:text-lg">
              Describe the moment, see the pieces move into new combinations,
              and start with the clothes already in your wardrobe.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="#occasion-demo"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0f2744] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,39,68,0.16)] transition hover:-translate-y-0.5 hover:bg-[#0a1d35]"
              >
                Find my next look
                <span aria-hidden="true">↘</span>
              </Link>
              <Link
                href="/wardrobe"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[#d9c8b8] bg-white/70 px-5 text-sm font-semibold text-[#0f2744] transition hover:bg-white"
              >
                Add wardrobe pieces
              </Link>
            </div>
            <p className="mt-5 text-xs leading-5 text-[#7b7167]">
              Wedding guest, date night, work event, brunch, gallery opening,
              or something entirely your own.
            </p>
          </div>

          <WardrobeTileShowcase />
        </div>
      </section>

      <section
        id="occasion-demo"
        className="scroll-mt-8 border-b border-[#e2e8f0] bg-white px-6 py-20 sm:py-24"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2a6f7f]">
              Start here
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold leading-tight text-[#0f2744] sm:text-5xl">
              Where are you heading,
              <br />
              <span className="text-[#2a6f7f]">or what&apos;s the occasion?</span>
            </h2>
            <p className="mt-5 text-base leading-7 text-[#53616d]">
              Give us the unfiltered version. FitCheck can use the venue, city,
              dress code, and vibe when those details help — no questionnaire
              required.
            </p>
          </div>

          <div className="mt-10">
            <OccasionDemoForm />
          </div>
        </div>
      </section>

      <section className="border-b border-[#e2e8f0] bg-[#f4f6f8] px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-10 max-w-xl text-center">
            <h2 className="font-serif text-3xl font-semibold text-[#0f2744]">
              More combinations. Less guesswork.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#53616d]">
              The first pass stays simple. Your event and your wardrobe give us
              enough to begin.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {HOW_IT_WORKS.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm"
              >
                <span className="font-serif text-4xl font-bold text-[#d8e1e5]">
                  {step.number}
                </span>
                <h3 className="mt-4 font-serif text-lg font-semibold text-[#0f2744]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#53616d]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#d8e1e5] bg-white px-6 py-5 text-center sm:flex-row sm:text-left">
            <div>
              <p className="font-serif text-lg font-semibold text-[#0f2744]">
                Your wardrobe is the starting point, not the limit.
              </p>
              <p className="mt-1 text-sm text-[#53616d]">
                Later: fill wardrobe gaps, discover pieces that suit you, and
                coordinate makeup with the finished outfit.
              </p>
            </div>
            <Link
              href="/occasion/demo"
              className="shrink-0 text-sm font-semibold text-[#2a6f7f] hover:underline"
            >
              See an event example →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
