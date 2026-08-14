"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function OccasionIntakePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
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
        presentation: (form.presentation || undefined) as
          | "feminine"
          | "masculine"
          | "neutral"
          | undefined,
        ...(form.skinTone
          ? {
              skinTone: form.skinTone as
                | "fair"
                | "light"
                | "medium"
                | "tan"
                | "deep",
            }
          : {}),
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

  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-16">
      <header className="border-b border-[#e2e8f0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link
            href="/"
            className="font-serif text-base font-semibold text-[#0f2744] hover:text-[#2a6f7f] transition-colors"
          >
            InterviewReady AI
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
            Plan an occasion
          </h1>
          <p className="text-sm text-[#718096] mb-8">
            Describe the event and venue — we&apos;ll infer dress context and
            compose outfits from your wardrobe.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="eventType">Event type</Label>
              <Select
                id="eventType"
                name="eventType"
                value={form.eventType}
                onChange={handleChange}
                options={OCCASION_TYPES.map((t) => ({
                  value: t,
                  label: labelize(t),
                }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="venueName">Venue / company name *</Label>
              <Input
                id="venueName"
                name="venueName"
                value={form.venueName}
                onChange={handleChange}
                placeholder="e.g. Skyline Rooftop Bar"
                className={errors.venueName ? "border-red-400" : ""}
              />
              {errors.venueName && (
                <p className="text-xs text-red-500">{errors.venueName}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Downtown"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eventDate">Event date (optional)</Label>
                <Input
                  id="eventDate"
                  name="eventDate"
                  type="date"
                  value={form.eventDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="theme">Theme (optional)</Label>
              <Input
                id="theme"
                name="theme"
                value={form.theme}
                onChange={handleChange}
                placeholder="e.g. team celebration"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="presentation">Presentation</Label>
              <Select
                id="presentation"
                name="presentation"
                value={form.presentation}
                onChange={handleChange}
                options={[
                  { value: "", label: "Prefer not to say" },
                  { value: "feminine", label: "Feminine" },
                  { value: "masculine", label: "Masculine" },
                  { value: "neutral", label: "Neutral" },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="skinTone">Skin tone (optional)</Label>
              <Select
                id="skinTone"
                name="skinTone"
                value={form.skinTone}
                onChange={handleChange}
                options={[
                  { value: "", label: "Not set" },
                  { value: "fair", label: "Fair" },
                  { value: "light", label: "Light" },
                  { value: "medium", label: "Medium" },
                  { value: "tan", label: "Tan" },
                  { value: "deep", label: "Deep" },
                ]}
              />
            </div>

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
              {submitting ? "Planning…" : "Compose outfits"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
