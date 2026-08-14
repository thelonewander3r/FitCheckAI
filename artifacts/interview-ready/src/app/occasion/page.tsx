import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { OCCASION_TYPES, type OccasionType } from "@/types/occasion";

interface FormState {
  eventType: OccasionType;
  venueName: string;
  location: string;
  theme: string;
  eventDate: string;
  presentation: "" | "feminine" | "masculine" | "neutral";
  skinTone: "" | "fair" | "light" | "medium" | "tan" | "deep";
}

const EMPTY_FORM: FormState = {
  eventType: "dinner",
  venueName: "",
  location: "",
  theme: "",
  eventDate: "",
  presentation: "",
  skinTone: "",
};

function labelize(value: string): string {
  return value.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

export default function OccasionIntakePage() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
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
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        eventType: form.eventType,
        venueName: form.venueName.trim(),
        location: form.location.trim() || undefined,
        theme: form.theme.trim() || undefined,
        eventDate: form.eventDate || undefined,
        presentation: (form.presentation || undefined) as "feminine" | "masculine" | "neutral" | undefined,
        ...(form.skinTone ? { skinTone: form.skinTone as "fair" | "light" | "medium" | "tan" | "deep" } : {}),
      };
      const res = await fetch("/api/occasions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { occasionId?: string; error?: string };
      if (!res.ok || !data.occasionId) {
        setSubmitError(data.error ?? "Something went wrong — please try again.");
        return;
      }
      setLocation(`/occasion/${data.occasionId}`);
    } catch {
      setSubmitError("Network error — please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-16">
      <header className="border-b border-[#e2e8f0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="font-serif text-base font-semibold text-[#0f2744] hover:text-[#2a6f7f] transition-colors">
            InterviewReady AI
          </Link>
          <Link href="/wardrobe" className="text-sm text-[#718096] hover:text-[#0f2744] transition-colors">
            My wardrobe
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 pt-8">
        <div className="space-y-2 mb-8">
          <h1 className="font-serif text-2xl font-semibold text-[#0f2744]">Plan an occasion</h1>
          <p className="text-sm text-[#718096]">Get outfit suggestions from your wardrobe for any event.</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="rounded-xl border border-[#e2e8f0] bg-white p-6 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="eventType">Event type</Label>
            <Select name="eventType" value={form.eventType} onChange={handleChange}>
              {OCCASION_TYPES.map((t) => (
                <option key={t} value={t}>{labelize(t)}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="venueName">Venue name *</Label>
            <Input
              id="venueName"
              name="venueName"
              value={form.venueName}
              onChange={handleChange}
              placeholder="e.g. The Rooftop Bar, Central Park"
            />
            {errors.venueName && <p className="text-xs text-red-500">{errors.venueName}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="location">City / area (optional)</Label>
              <Input id="location" name="location" value={form.location} onChange={handleChange} placeholder="e.g. New York" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eventDate">Date (optional)</Label>
              <Input id="eventDate" name="eventDate" type="date" value={form.eventDate} onChange={handleChange} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="theme">Theme or dress code (optional)</Label>
            <Input id="theme" name="theme" value={form.theme} onChange={handleChange} placeholder="e.g. Black tie, garden party" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="presentation">Style presentation (optional)</Label>
              <Select name="presentation" value={form.presentation} onChange={handleChange}>
                <option value="">Any</option>
                <option value="feminine">Feminine</option>
                <option value="masculine">Masculine</option>
                <option value="neutral">Neutral</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="skinTone">Skin tone (optional)</Label>
              <Select name="skinTone" value={form.skinTone} onChange={handleChange}>
                <option value="">Not specified</option>
                {(["fair", "light", "medium", "tan", "deep"] as const).map((t) => (
                  <option key={t} value={t}>{labelize(t)}</option>
                ))}
              </Select>
            </div>
          </div>

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}

          <Button type="submit" disabled={submitting} className="w-full bg-[#0f2744] text-white hover:bg-[#0a1d35]">
            {submitting ? "Finding outfits…" : "Find outfits"}
          </Button>
        </form>
      </div>
    </div>
  );
}
