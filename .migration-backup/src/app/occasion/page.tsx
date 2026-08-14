"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormState {
  venueName: string;
  theme: string;
}

const EMPTY_FORM: FormState = {
  venueName: "",
  theme: "",
};

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
        venueName: form.venueName.trim(),
        theme: form.theme.trim() || undefined,
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
            Check your whole outfit
          </h1>
          <p className="text-sm text-[#718096] mb-8">
            Tell us where you&apos;re going in your own words. We&apos;ll infer the
            setting and build the best look from what you already own.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="venueName">What are you dressing for? *</Label>
              <Input
                id="venueName"
                name="venueName"
                value={form.venueName}
                onChange={handleChange}
                placeholder="e.g. rooftop dinner with my team"
                className={errors.venueName ? "border-red-400" : ""}
                data-testid="occasion-situation"
              />
              <p className="text-xs text-[#718096]">
                A venue, event, or one-sentence situation is enough.
              </p>
              {errors.venueName && (
                <p className="text-xs text-red-500">{errors.venueName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="theme">Anything else we should know? (optional)</Label>
              <Input
                id="theme"
                name="theme"
                value={form.theme}
                onChange={handleChange}
                placeholder="e.g. I want to look polished but still feel like myself"
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
              {submitting ? "Checking…" : "Check my outfit"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
