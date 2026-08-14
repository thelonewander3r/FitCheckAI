import { Link } from "wouter";

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="border-b border-[#e2e8f0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="font-serif text-lg font-semibold text-[#0f2744]">
            InterviewReady AI
          </span>
          <Link
            href="/interview"
            className="rounded-lg bg-[#0f2744] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a1d35] transition-colors"
          >
            Start now
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center bg-white">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e8f4f6] bg-[#e8f4f6] px-3 py-1 text-xs font-medium text-[#2a6f7f]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2a6f7f]" />
            Powered by AI analysis
          </div>

          <p className="font-serif text-sm font-semibold tracking-wide text-[#2a6f7f] uppercase">
            InterviewReady AI
          </p>

          <h1 className="font-serif text-4xl font-semibold leading-tight text-[#0f2744] sm:text-5xl">
            Walk into your interview
            <br />
            <span className="text-[#2a6f7f]">dressed for the role.</span>
          </h1>

          <p className="text-base text-[#4a5568] leading-relaxed max-w-xl mx-auto">
            InterviewReady AI analyses your job description, infers the dress
            code, and recommends tailored outfits — complete with virtual
            try-ons and a day-by-day preparation plan.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/interview"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0f2744] px-6 text-sm font-semibold text-white hover:bg-[#0a1d35] transition-colors"
            >
              Start preparation
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/occasion"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-6 text-sm font-semibold text-[#0f2744] hover:bg-[#f4f6f8] transition-colors"
            >
              Plan an occasion
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-6 text-sm font-semibold text-[#0f2744] hover:bg-[#f4f6f8] transition-colors"
            >
              Load demo scenario
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[#e2e8f0] bg-[#f4f6f8] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center font-serif text-2xl font-semibold text-[#0f2744] mb-10">
            How it works
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Tell us about your interview",
                body: "Enter your job title, company, interview format, and a brief description. Takes about two minutes.",
              },
              {
                step: "02",
                title: "Get personalised outfit picks",
                body: "Our AI infers the dress code, analyses your style, and recommends outfits that fit your budget.",
              },
              {
                step: "03",
                title: "See yourself in the outfits",
                body: "Virtual try-on shows you each look, then we build a day-by-day preparation checklist.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="rounded-xl bg-white border border-[#e2e8f0] p-6 space-y-3">
                <span className="font-mono text-xs font-bold text-[#2a6f7f]">{step}</span>
                <h3 className="font-serif text-base font-semibold text-[#0f2744]">{title}</h3>
                <p className="text-sm text-[#4a5568] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e2e8f0] bg-white px-6 py-6 text-center text-xs text-[#718096]">
        InterviewReady AI — outfit guidance only, not professional styling or medical advice.
      </footer>
    </main>
  );
}
