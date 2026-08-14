import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

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
          setLocation(`/interview/${data.sessionId}/analysis`);
        } else {
          setLocation("/interview");
        }
      })
      .catch(() => setLocation("/interview"));
  }, [setLocation]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f6f8]">
      <div className="flex h-10 w-10 items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-[#2a6f7f]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
      <p className="font-serif text-base font-medium text-[#0f2744]">Preparing demo…</p>
      <p className="text-sm text-[#718096]">Setting up a realistic interview scenario for you.</p>
    </div>
  );
}
