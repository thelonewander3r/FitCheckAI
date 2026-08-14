import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export default function DemoPage() {
  const [, setLocation] = useLocation();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    fetch("/api/demo", { method: "POST" })
      .then((r) => r.json())
      .then((data: { sessionId?: string; error?: string }) => {
        if (data.sessionId) {
          // Add a deliberate aesthetic delay
          setTimeout(() => {
            setLocation(`/interview/${data.sessionId}/analysis`);
          }, 1500);
        } else {
          setLocation("/interview");
        }
      })
      .catch(() => setLocation("/interview"));
  }, [setLocation]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="flex min-h-screen flex-col items-center justify-center bg-[#0f2744] selection:bg-white selection:text-[#0f2744]"
    >
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#0a1017] via-transparent to-[#0a1017] opacity-60" />
      
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="mb-12 relative flex items-center justify-center"
        >
          {/* Minimalist loader ring */}
          <svg className="w-16 h-16 text-white/10" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="300" strokeDashoffset="240" className="text-white/60" />
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="space-y-4"
        >
          <p className="text-[10px] uppercase tracking-[0.3em] font-medium text-white/40">
            Setting the Scene
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-white leading-tight">
            Preparing <br />
            <span className="italic font-light text-[#f9f6f0]/80">the Portfolio</span>
          </h1>
        </motion.div>
      </div>
    </motion.div>
  );
}
