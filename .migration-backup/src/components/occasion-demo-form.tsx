"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const STARTER_PROMPTS = [
  "What should I wear to a rooftop dinner?",
  "Help me dress for a summer wedding by the water.",
  "I need a polished look for a gallery opening.",
  "What works for brunch with friends?",
  "I have a conference in Chicago — what should I wear?",
  "Help me make my favorite blazer feel less predictable.",
];

export function OccasionDemoForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
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
    }, 2800);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  function applyPrompt(prompt: string) {
    setValue(prompt);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const eventText = value.trim();
    if (!eventText) {
      setError("Tell us where you are headed so we can start the look.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/occasions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueName: eventText }),
      });
      const data = (await response.json()) as {
        occasionId?: string;
        error?: string;
      };
      if (!response.ok || !data.occasionId) {
        setError(data.error ?? "We could not create that outfit check.");
        return;
      }
      router.push(`/occasion/${data.occasionId}`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const visiblePrompts = [0, 1, 2].map(
    (offset) => STARTER_PROMPTS[(promptIndex + offset) % STARTER_PROMPTS.length]!,
  );

  return (
    <div className="mx-auto w-full max-w-3xl" data-testid="occasion-demo-form">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:relative">
        <label htmlFor="landing-occasion" className="sr-only">
          Where are you heading, or what&apos;s the occasion?
        </label>
        <textarea
          id="landing-occasion"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          placeholder="e.g. A rooftop dinner in Brooklyn, a summer wedding, or brunch with friends"
          rows={3}
          className="w-full resize-none rounded-[1.35rem] border border-[#d9cdbd] bg-white px-5 py-4 text-base leading-7 text-[#263d5b] shadow-[0_16px_32px_rgba(68,54,42,0.08)] outline-none transition focus:border-[#2a6f7f] focus:ring-4 focus:ring-[#2a6f7f]/10 sm:pr-32"
          data-testid="landing-occasion-input"
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#0f2744] px-4 text-sm font-semibold text-white transition hover:bg-[#0a1d35] disabled:cursor-wait disabled:opacity-60 sm:absolute sm:bottom-3 sm:right-3 sm:w-auto"
        >
          {submitting ? "Checking…" : "Build my look"}
        </button>
      </form>

      <div className="mt-5 text-left">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7b7167]">
            Questions to get you started
          </p>
          <span className="text-[0.68rem] text-[#9b9188]">
            {reducedMotion ? "Pick a prompt" : "Shuffling ideas"}
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3" aria-live="polite">
          {visiblePrompts.map((prompt, index) => (
            <button
              key={`${prompt}-${index}`}
              type="button"
              onClick={() => applyPrompt(prompt)}
              className="prompt-card rounded-xl border border-[#e1d7cb] bg-white/75 px-3 py-3 text-left text-xs leading-5 text-[#53616d] transition hover:-translate-y-0.5 hover:border-[#2a6f7f] hover:bg-white hover:text-[#263d5b]"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      <p className="mt-4 text-xs leading-5 text-[#7b7167]">
        Start with your event. We&apos;ll use the details you share, your wardrobe,
        and optional context research when it adds useful signal.
      </p>
    </div>
  );
}
