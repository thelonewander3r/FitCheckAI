import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { OccasionDemoForm } from "@/components/occasion-demo-form";
import DecisionDemo, { type DecisionRequest } from "@/components/decision-demo";

const signals = [
  ["01", "Context in", "Occasion, place, weather, and the one constraint that matters."],
  ["02", "Closet first", "One complete answer from owned pieces before any shopping suggestion."],
  ["03", "Confidence out", "A reason to trust the look and a practical move before you leave."],
];

export default function HomePage() {
  const [request, setRequest] = useState<DecisionRequest | null>(null);

  function handleDecide(next: DecisionRequest) {
    setRequest(next);
    requestAnimationFrame(() => {
      document.getElementById("decision")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="min-h-screen bg-[#f7f4ef] text-[#172b3a]">
      <header className="border-b border-[#ded7cf] bg-[#f7f4ef]/95 px-5 py-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="font-serif text-xl font-semibold tracking-tight">FitCheck<span className="text-[#a15e35]">AI</span></Link>
          <nav className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.13em]" aria-label="Primary navigation"><a href="#decision" className="hidden text-[#6c716f] hover:text-[#172b3a] sm:inline">Today’s call</a><a href="#decision" className="hidden text-[#6c716f] hover:text-[#172b3a] sm:inline">My wardrobe</a><a href="#occasion-form" className="bg-[#172b3a] px-4 py-3 text-white hover:bg-[#25445a]">Make a plan</a></nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#172b3a] px-5 py-16 text-white sm:px-8 sm:py-24"><div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#b77b52]/25 blur-3xl" /><div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#d9aa84]">FitCheck AI · the decision layer for your closet</p><h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[0.94] tracking-tight sm:text-7xl">What should I wear <span className="italic text-[#d9aa84]">right now?</span></h1><p className="mt-7 max-w-xl text-lg leading-8 text-[#dce6e5]">Skip the grid. Tell us where you’re going and get one answer from what you already own — with enough reasoning to trust it.</p><div className="mt-8 flex flex-wrap gap-3"><a href="#decision" className="bg-[#d9aa84] px-5 py-3 text-sm font-bold text-[#172b3a] hover:bg-[#f0c4a0]">See today’s answer ↓</a><a href="#occasion-form" className="border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">Use a real occasion</a></div></div><div className="border-l border-white/20 pl-6 lg:mb-2"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a8c1bd]">Designed for the morning rush</p><p className="mt-4 font-serif text-3xl leading-tight">Less browsing. More leaving.</p><p className="mt-4 text-sm leading-6 text-[#b8c8c9]">A premium closet companion for men 25–45 who want the decision made, not another endless outfit feed.</p></div></div></section>

      <DecisionDemo request={request} />

      <section id="occasion-form" className="border-b border-[#d9d1c7] bg-[#ebe5de] px-5 py-14 sm:px-8"><div className="mx-auto max-w-6xl"><div className="max-w-xl"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a15e35]">Start with your actual moment</p><h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">Give the closet a little context.</h2><p className="mt-4 text-sm leading-6 text-[#59656b]">“Dinner near the office, 68 degrees, I need to look sharp but I’m walking home.” That is enough.</p></div><div className="mt-8 max-w-3xl border border-[#cfc4b8] bg-[#faf8f5] p-5 sm:p-8"><OccasionDemoForm onDecide={handleDecide} /></div></div></section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8" id="how-it-works"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a15e35]">The product promise</p><h2 className="mt-3 max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">Your closet is the inventory. FitCheck is the point of view.</h2><div className="mt-10 grid gap-4 md:grid-cols-3">{signals.map(([number, title, copy]) => <article key={number} className="border-t-2 border-[#b77b52] pt-5"><p className="font-serif text-3xl text-[#b8a79a]">{number}</p><h3 className="mt-6 font-serif text-2xl">{title}</h3><p className="mt-3 text-sm leading-6 text-[#6c716f]">{copy}</p></article>)}</div></section>

      <footer className="border-t border-[#ded7cf] bg-[#f7f4ef] px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-6xl flex-col gap-3 text-xs text-[#7b746d] sm:flex-row sm:items-center sm:justify-between"><span className="font-serif text-lg font-semibold text-[#172b3a]">FitCheck<span className="text-[#a15e35]">AI</span></span><span>Decision support for the wardrobe you already own.</span></div></footer>
    </motion.main>
  );
}
