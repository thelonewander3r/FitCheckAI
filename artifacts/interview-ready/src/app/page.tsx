import { Link } from "wouter";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.8 }}
      className="flex flex-col min-h-screen bg-background selection:bg-[#0f2744] selection:text-white"
    >
      {/* Nav */}
      <header className="fixed top-0 w-full z-50 mix-blend-difference text-white px-6 py-6 transition-all duration-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span className="font-serif text-xl font-normal tracking-wide">
            Vogue × Career
          </span>
          <div className="flex gap-6 items-center">
            <Link href="/demo" className="text-sm font-medium tracking-widest uppercase hover:opacity-70 transition-opacity">
              Demo
            </Link>
            <Link href="/interview" className="text-sm font-medium tracking-widest uppercase hover:opacity-70 transition-opacity">
              Start
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-[100dvh] flex flex-col justify-end pb-24 px-6 md:px-12 bg-[#0f2744] overflow-hidden">
        {/* Background Image - Cinematic Bleed */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/attached_assets/hero-editorial.jpg" 
            alt="Editorial fashion professional" 
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1017] via-transparent to-transparent opacity-90" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-white/70 text-[10px] uppercase tracking-[0.3em] font-medium mb-6">
              InterviewReady AI
            </p>
            <h1 className="font-serif text-6xl md:text-8xl lg:text-9xl text-white leading-[0.85] tracking-tight mb-8">
              Dress for <br />
              <span className="italic font-light text-[#f9f6f0]">the role.</span>
            </h1>
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center max-w-2xl">
              <p className="text-white/80 text-lg md:text-xl font-serif font-light leading-relaxed">
                Your personal style advisor for the boardroom. We translate job descriptions into outfit intelligence.
              </p>
              <Link
                href="/interview"
                className="shrink-0 bg-white text-[#0f2744] px-8 py-4 text-xs font-medium uppercase tracking-widest hover:bg-[#f9f6f0] transition-colors"
              >
                Start Preparation
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Editorial Content Block 1 */}
      <section className="py-32 px-6 md:px-12 bg-background">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-24 items-center">
          <div className="md:col-span-5 md:col-start-2 order-2 md:order-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="font-serif text-4xl md:text-5xl text-[#0f2744] leading-tight mb-6">
                The intersection of <br/><span className="italic">style and strategy.</span>
              </h2>
              <p className="text-[#0f2744]/70 text-base leading-relaxed mb-8">
                Enter your interview details. Our AI analyzes the role, company culture, and format to infer the precise dress code. It then curates bespoke outfits tailored to your budget and personal presentation.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#0f2744] hover:text-[#2a6f7f] transition-colors border-b border-[#0f2744]/20 pb-1 hover:border-[#2a6f7f]"
                >
                  Load Demo Scenario
                </Link>
              </div>
            </motion.div>
          </div>
          <div className="md:col-span-6 md:col-start-7 order-1 md:order-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1 }}
              className="aspect-[3/4] overflow-hidden bg-[#e8e6e1]"
            >
              <img 
                src="/attached_assets/feature-tryon.jpg" 
                alt="Virtual Try On" 
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* The Features / Grid */}
      <section className="py-32 px-6 md:px-12 bg-[#0f2744] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
            <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-none">
              A masterclass <br/><span className="italic text-[#f9f6f0]/80">in preparation.</span>
            </h2>
            <p className="max-w-md text-white/60 font-serif text-lg md:text-xl italic">
              From the first impression to the final handshake, every detail is considered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-16">
            {[
              {
                num: "01",
                title: "Inference",
                desc: "We analyze the subtext of the job description to decode the true dress code, bypassing generic advice."
              },
              {
                num: "02",
                title: "Curation",
                desc: "Receive beautifully composed looks pulled from real logic, considering color psychology and format."
              },
              {
                num: "03",
                title: "Execution",
                desc: "A meticulous day-by-day countdown ensures everything is pressed, polished, and ready."
              }
            ].map((feature, i) => (
              <motion.div 
                key={feature.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group cursor-default"
              >
                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-4 border-b border-white/10 pb-4 transition-colors group-hover:border-white/40 group-hover:text-white/80">
                  Step {feature.num}
                </div>
                <h3 className="font-serif text-3xl mb-3">{feature.title}</h3>
                <p className="text-white/60 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Editorial Content Block 2 */}
      <section className="py-32 px-6 md:px-12 bg-background">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-24 items-center">
          <div className="md:col-span-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1 }}
              className="aspect-[4/5] overflow-hidden bg-[#e8e6e1]"
            >
              <img 
                src="/attached_assets/feature-wardrobe.jpg" 
                alt="Digital Wardrobe" 
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
          <div className="md:col-span-5 md:col-start-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="font-serif text-4xl md:text-5xl text-[#0f2744] leading-tight mb-6">
                Your digital <br/><span className="italic">wardrobe.</span>
              </h2>
              <p className="text-[#0f2744]/70 text-base leading-relaxed mb-8">
                Beyond interviews, manage your entire professional and occasion wardrobe. Catalogue your pieces and let our AI assemble looks for galas, dinners, and conferences.
              </p>
              <Link
                href="/occasion"
                className="inline-block border border-[#0f2744] px-8 py-4 text-xs font-medium uppercase tracking-widest text-[#0f2744] hover:bg-[#0f2744] hover:text-white transition-colors"
              >
                Plan an Occasion
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#f9f6f0] border-t border-[#0f2744]/10 py-12 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="font-serif text-2xl text-[#0f2744]">Vogue × Career</span>
          <p className="text-[10px] uppercase tracking-widest text-[#0f2744]/50 text-center md:text-left">
            InterviewReady AI — Outfit guidance only, not professional styling.
          </p>
        </div>
      </footer>
    </motion.div>
  );
}
