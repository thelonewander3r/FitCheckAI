import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import type { OccasionType } from "@/types/occasion";

const STARTER_PROMPTS = [
  "I’m heading to a rooftop dinner with my team after work.",
  "I’m going to a summer wedding and want something polished but comfortable.",
  "I have a gallery opening tonight and want to look creative without trying too hard.",
  "I’m meeting friends for brunch and want an easy outfit from my wardrobe.",
  "I’m attending a conference and need a confident look that travels well.",
];

function inferEventType(text: string): OccasionType {
  const normalized = text.toLowerCase();
  const matches: Array<[OccasionType, string[]]> = [
    ["wedding", ["wedding", "marriage", "bride", "groom"]],
    ["conference", ["conference", "summit", "convention"]],
    ["date", ["date night", "dinner date", "first date"]],
    ["interview", ["interview", "job interview"]],
    ["gala", ["gala", "black tie", "fundraiser"]],
    ["casual-outing", ["brunch", "weekend", "friends", "casual"]],
    ["client-meeting", ["client", "boardroom", "meeting"]],
    ["dinner", ["dinner", "restaurant", "rooftop"]],
  ];
  return matches.find(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))?.[0] ?? "other";
}

function inferVenue(text: string): string {
  const atMatch = text.match(/\bat\s+([^,.!?]+)/i)?.[1]?.trim();
  if (atMatch) return atMatch.slice(0, 200);
  if (/rooftop/i.test(text)) return "Rooftop venue";
  if (/conference|summit|convention/i.test(text)) return "Conference venue";
  return "Your event";
}

export function OccasionDemoForm() {
  const [, setLocation] = useLocation();
  const [eventText, setEventText] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => {
      setPromptIndex((current) => (current + 1) % STARTER_PROMPTS.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const description = eventText.trim();
    if (!description) {
      setError("Tell us where you’re heading or what the occasion is.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/occasions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: inferEventType(description),
          venueName: inferVenue(description),
          theme: description.slice(0, 200),
        }),
      });
      const data = (await response.json()) as { occasionId?: string; error?: string };
      if (!response.ok || !data.occasionId) {
        setError(data.error ?? "We couldn’t build that look yet.");
        return;
      }
      setLocation(`/occasion/${data.occasionId}`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const prompt = STARTER_PROMPTS[promptIndex]!;

  return (
    <div className="space-y-4" data-testid="occasion-demo-form">
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
        <label htmlFor="landing-event" className="sr-only">Where are you heading, or what’s the occasion?</label>
        <textarea
          id="landing-event"
          data-testid="landing-occasion-input"
          value={eventText}
          onChange={(event) => setEventText(event.target.value)}
          placeholder="Try: I’m going to a rooftop dinner and want something polished from my wardrobe."
          rows={4}
          className="w-full resize-none rounded-2xl border border-[#d9cdbd] bg-white px-5 py-4 text-base leading-7 text-[#263d5b] shadow-[0_16px_32px_rgba(68,54,42,0.08)] outline-none transition focus:border-[#2a6f7f] focus:ring-2 focus:ring-[#2a6f7f]/20"
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#0f2744] px-5 text-sm font-semibold text-white transition hover:bg-[#0a1d35] disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? "Building your look…" : "Build my look"}
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2 text-sm text-[#53616d]">
        <span className="font-semibold text-[#263d5b]">Questions to get you started:</span>
        <button
          type="button"
          onClick={() => setEventText(prompt)}
          className="rounded-full border border-[#d9cdbd] bg-white px-3 py-1.5 text-left transition hover:border-[#2a6f7f] hover:text-[#0f2744]"
          aria-label={`Use starter question: ${prompt}`}
        >
          {prompt}
        </button>
        {!reducedMotion && <span className="text-xs uppercase tracking-[0.14em] text-[#7a7068]">shuffles gently</span>}
      </div>

      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    </div>
  );
}
