"use client";

import { useState, useSyncExternalStore, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { assessEventDetail } from "@/lib/occasion/detail-assessment";
import { OCCASION_SKIN_TONES } from "@/lib/occasion/preferences";

interface FormState {
  venueName: string;
  theme: string;
  location: string;
  colorPreference: string;
  skinTonePreference: string;
}

const EMPTY_FORM: FormState = {
  venueName: "",
  theme: "",
  location: "",
  colorPreference: "",
  skinTonePreference: "",
};

const EVENT_EXAMPLES = [
  { label: "Wedding guest", prompt: "what should I wear to a wedding?" },
  { label: "Dinner date", prompt: "what should I wear to a dinner date?" },
  { label: "Conference", prompt: "what should I wear to a tech conference?" },
  { label: "Weekend brunch", prompt: "what should I wear to brunch with friends?" },
  { label: "Job interview", prompt: "what should I wear to a job interview?" },
];

export default function OccasionIntakePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [showDetailQuestions, setShowDetailQuestions] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function applyExample(prompt: string) {
    setForm((prev) => ({ ...prev, venueName: prompt }));
    setShowDetailQuestions(false);
    setErrors((prev) => ({ ...prev, venueName: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.venueName.trim()) newErrors.venueName = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (!showDetailQuestions && assessEventDetail(form.venueName).needsFollowUp) {
      setShowDetailQuestions(true);
      setSubmitError(null);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        venueName: form.venueName.trim(),
        theme: form.theme.trim() || undefined,
        location: form.location.trim() || undefined,
        colorPreference: form.colorPreference.trim() || undefined,
        skinTonePreference: form.skinTonePreference || undefined,
      };

      const res = await fetch("/api/occasions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        occasionId?: string;
        error?: string;
      };

      if (!res.ok || !data.occasionId) {
        setSubmitError(
          data.error ?? "Something went wrong — please try again.",
        );
        return;
      }

      router.push(`/occasion/${data.occasionId}`);
    } catch {
      setSubmitError("Network error — please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  const needsMoreDetails =
    form.venueName.trim().length > 0 &&
    !showDetailQuestions &&
    assessEventDetail(form.venueName).needsFollowUp;

  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-16">
      <header className="border-b border-[#e2e8f0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link
            href="/"
            className="font-serif text-base font-semibold text-[#0f2744] hover:text-[#2a6f7f] transition-colors"
          >
            FitCheck AI
          </Link>
          <Link
            href="/wardrobe"
            className="text-sm text-[#2a6f7f] hover:underline"
          >
            My wardrobe
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 pt-8">
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 shadow-sm">
          <h1 className="font-serif text-2xl font-semibold text-[#0f2744] mb-1">
            Plan your event
          </h1>
          <p className="text-sm text-[#718096] mb-3">
            Get a complete plan from your existing wardrobe. We&apos;ll show the lead look, the backups, and the one decision that makes it work.
          </p>
          <p className="mb-8 text-xs text-[#718096]">
            Current mode: use your wardrobe. Finding new pieces that suit you
            will come in a later phase.
          </p>

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            noValidate
            data-testid="occasion-intake-form"
            data-ready={hydrated ? "true" : "false"}
          >
            <div className="space-y-1.5">
              <Label htmlFor="event">What event are you dressing for? *</Label>
              <Input
                id="event"
                name="venueName"
                value={form.venueName}
                onChange={handleChange}
                placeholder="e.g. a wedding, dinner date, or work conference"
                className={errors.venueName ? "border-red-400" : ""}
                data-testid="occasion-event"
              />
              <p className="text-xs text-[#718096]">
                Ask naturally — include the setting, dress code, or anything
                you want the outfit to feel like.
              </p>
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium text-[#4a5568]">
                  Need a starting point?
                </p>
                <div className="flex flex-wrap gap-2">
                  {EVENT_EXAMPLES.map((example) => (
                    <button
                      key={example.label}
                      type="button"
                      onClick={() => applyExample(example.prompt)}
                      className="rounded-full border border-[#cbd5e0] px-3 py-1.5 text-xs text-[#2a6f7f] transition-colors hover:border-[#2a6f7f] hover:bg-[#e8f4f6]"
                    >
                      {example.label}
                    </button>
                  ))}
                </div>
              </div>
              {errors.venueName && (
                <p className="text-xs text-red-500">{errors.venueName}</p>
              )}
            </div>

            {showDetailQuestions && (
              <div
                className="space-y-5 rounded-xl border border-[#d7e7eb] bg-[#f7fbfc] p-5"
                data-testid="occasion-follow-up"
              >
                <div>
                  <h2 className="text-sm font-semibold text-[#0f2744]">
                    A few details will make this more useful
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-[#718096]">
                    We can use the restaurant, venue, company, or city to
                    research the event context before composing your look.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location">
                    Where is it happening? (optional)
                  </Label>
                  <Input
                    id="location"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="e.g. The Ivy in NYC, Acme HQ, or a rooftop restaurant"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="theme">Dress code or other details (optional)</Label>
                  <Input
                    id="theme"
                    name="theme"
                    value={form.theme}
                    onChange={handleChange}
                    placeholder="e.g. cocktail attire, outdoors, polished but relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="colorPreference">
                    Colors you prefer or want to avoid (optional)
                  </Label>
                  <Input
                    id="colorPreference"
                    name="colorPreference"
                    value={form.colorPreference}
                    onChange={handleChange}
                    placeholder="e.g. navy and emerald; avoid bright red"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="skinTonePreference">
                    Skin-tone preference for color guidance (optional)
                  </Label>
                  <Select
                    id="skinTonePreference"
                    name="skinTonePreference"
                    value={form.skinTonePreference}
                    onChange={handleChange}
                    placeholder="Skip — use event and wardrobe only"
                    options={OCCASION_SKIN_TONES.map((tone) => ({
                      value: tone,
                      label: tone.charAt(0).toUpperCase() + tone.slice(1),
                    }))}
                  />
                  <p className="text-xs leading-5 text-[#718096]">
                    This is a manual preference for palette guidance. FitCheck
                    AI never infers it from a photo.
                  </p>
                </div>
              </div>
            )}

            {submitError && (
              <p className="text-sm text-red-600 font-medium" role="alert">
                {submitError}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={submitting}
            >
              {submitting
                ? "Building…"
                : needsMoreDetails
                  ? "Add useful details"
                  : "Build my plan"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
