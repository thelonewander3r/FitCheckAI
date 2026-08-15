import { Link } from "wouter";
import { motion } from "framer-motion";
import { OccasionDemoForm } from "@/components/occasion-demo-form";
import WardrobePhotoShowcase from "@/components/wardrobe-photo-showcase";

const eventTypes = ["Weddings", "Dates", "Conferences", "Brunches", "Birthdays"];

export default function HomePage() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.55 }}
      className="min-h-screen overflow-hidden bg-[#fbf8f2] text-[#0f2744]"
    >
      <header className="border-b border-[#0f2744]/10 bg-[#fbf8f2]/90 px-6 py-5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="font-serif text-xl font-semibold tracking-tight">
            FitCheck AI
          </Link>
          <nav className="flex items-center gap-5 text-xs font-semibold uppercase tracking-[0.16em]">
            <Link href="/wardrobe" className="text-[#53616d] transition hover:text-[#0f2744]">My wardrobe</Link>
            <Link href="/occasion" className="rounded-full bg-[#0f2744] px-4 py-2 text-white transition hover:bg-[#0a1d35]">Start an event check</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16 lg:pt-20">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2a6f7f]">FitCheck AI · event wardrobe intelligence</p>
          <h1 className="mt-5 font-serif text-5xl leading-[0.98] tracking-tight text-[#0f2744] sm:text-6xl lg:text-7xl">
            Dress for what’s next,
            <span className="block italic text-[#2a6f7f]">using what you own.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[#53616d]">
            Describe the event in your own words. FitCheck checks your wardrobe, reads the dress-code signal, and helps you build a look that feels like you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {eventTypes.map((event) => <span key={event} className="rounded-full border border-[#d9cdbd] bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#53616d]">{event}</span>)}
          </div>
        </div>
        <WardrobePhotoShowcase />
      </section>

      <section className="border-y border-[#e4d9ca] bg-[#f1e7da] px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2a6f7f]">Start with the occasion</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-[#0f2744] sm:text-5xl">
              Where are you heading,
              <span className="block italic">or what’s the occasion?</span>
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-[#53616d]">
              Give us the unfiltered version. Location, dress code, and vibe can be added when they help — no questionnaire required.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-[#dfd1bf] bg-[#fbf8f2]/85 p-5 shadow-[0_20px_55px_rgba(68,54,42,0.10)] sm:p-8">
            <OccasionDemoForm />
            <p className="mt-5 text-center text-xs leading-5 text-[#7a7068]">Mock event context is the default demo path. Your saved wardrobe remains the source for recommendations.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-20 sm:grid-cols-3">
        {[
          ["01", "Describe the moment", "Start with a plain-language event description instead of a long intake form."],
          ["02", "Use your wardrobe", "FitCheck ranks combinations from pieces you already own."],
          ["03", "Refine the look", "Save what works, mark pieces as worn, and keep building your style history."],
        ].map(([number, title, copy]) => (
          <div key={number} className="border-t border-[#0f2744]/20 pt-5">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#2a6f7f]">{number}</p>
            <h3 className="mt-3 font-serif text-2xl text-[#0f2744]">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-[#53616d]">{copy}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-[#0f2744]/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs text-[#7a7068] sm:flex-row sm:items-center sm:justify-between">
          <span className="font-serif text-lg font-semibold text-[#0f2744]">FitCheck AI</span>
          <span>Outfit guidance for real events, built from your wardrobe.</span>
        </div>
      </footer>
    </motion.main>
  );
}
