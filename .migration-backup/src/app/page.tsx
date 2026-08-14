import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-[#e2e8f0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/"
            className="font-serif text-lg font-semibold text-[#0f2744]"
          >
            FitCheck AI
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/wardrobe"
              className="hidden text-sm text-[#2a6f7f] hover:underline sm:inline"
            >
              My wardrobe
            </Link>
            <Link
              href="/occasion"
              className="rounded-lg bg-[#0f2744] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0a1d35]"
            >
              Check an outfit
            </Link>
          </div>
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e8f4f6] bg-[#e8f4f6] px-3 py-1 text-xs font-medium text-[#2a6f7f]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2a6f7f]" />
            Start with what you already own
          </div>

          <p className="font-serif text-sm font-semibold uppercase tracking-wide text-[#2a6f7f]">
            FitCheck AI
          </p>

          <h1 className="font-serif text-4xl font-semibold leading-tight text-[#0f2744] sm:text-5xl">
            Know what to wear,
            <br />
            <span className="text-[#2a6f7f]">using what you own.</span>
          </h1>

          <p className="mx-auto max-w-xl text-base leading-relaxed text-[#4a5568]">
            Tell us where you&apos;re going in one sentence. FitCheck AI infers
            the setting, checks the whole outfit against it, and recommends a
            coherent look from your wardrobe.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/occasion"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0f2744] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#0a1d35]"
            >
              Check my outfit
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
            <Link
              href="/wardrobe"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-6 text-sm font-semibold text-[#0f2744] transition-colors hover:bg-[#f4f6f8]"
            >
              Build my wardrobe
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-6 text-sm font-semibold text-[#0f2744] transition-colors hover:bg-[#f4f6f8]"
            >
              Load demo
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-[#e2e8f0] bg-[#f4f6f8] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto mb-10 max-w-xl text-center">
            <h2 className="font-serif text-2xl font-semibold text-[#0f2744]">
              Less form. More useful advice.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#4a5568]">
              No stage, format, presentation, or budget questionnaire. Give us
              the situation; your wardrobe and style history do the rest.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Describe the situation",
                body: "Write a venue, event, or one-sentence plan such as “rooftop dinner with my team.”",
              },
              {
                step: "02",
                title: "Use your wardrobe",
                body: "Add photos of pieces you already own once. FitCheck learns from your real closet and worn looks.",
              },
              {
                step: "03",
                title: "Check the whole look",
                body: "See complete combinations, why they work, what is missing, and a visual try-on when available.",
              },
            ].map((feature) => (
              <div
                key={feature.step}
                className="space-y-3 rounded-xl border border-[#e2e8f0] bg-white p-6"
              >
                <span className="font-serif text-3xl font-bold text-[#e2e8f0]">
                  {feature.step}
                </span>
                <h3 className="font-serif text-base font-semibold text-[#0f2744]">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#4a5568]">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-[#718096]">
            Interview prep is still available as a focused mode when you need
            it.
            {" "}
            <Link href="/interview" className="text-[#2a6f7f] hover:underline">
              Open interview mode
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
