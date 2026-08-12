"use client";

import { useState, useRef, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StepNav } from "@/components/step-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import type { IntakeInput } from "@/lib/validation/schemas";
import { downscaleToBase64 } from "@/lib/client/image-utils";

type FormState = Omit<
  IntakeInput,
  "budget" | "weightLbs" | "skinTone" | "companyCulture" | "presentation"
> & {
  budget: string;
  weightLbs: string;
  skinTone: string;
  companyCulture: string;
  presentation: "" | "feminine" | "masculine" | "neutral";
};

const EMPTY_FORM: FormState = {
  jobTitle: "",
  companyName: "",
  industry: "",
  jobDescription: "",
  interviewStage: "first-round",
  interviewFormat: "onsite",
  interviewDate: "",
  budget: "",
  stylePreference: "classic",
  candidateName: "",
  fitSize: "",
  weightLbs: "",
  skinTone: "",
  presentation: "",
  companyCulture: "",
};

type DetectedSkinTone = "fair" | "light" | "medium" | "tan" | "deep";

function rgbToLightness(r: number, g: number, b: number): number {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  return ((max + min) / 2) * 100;
}

function classifySkinToneFromCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): DetectedSkinTone | null {
  const boxW = Math.max(1, Math.round(width * 0.2));
  const boxH = Math.max(1, Math.round(height * 0.2));
  const sx = Math.round((width - boxW) / 2);
  const sy = Math.round((height - boxH) / 2);
  const { data } = ctx.getImageData(sx, sy, boxW, boxH);

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    rSum += data[i]!;
    gSum += data[i + 1]!;
    bSum += data[i + 2]!;
  }
  const r = rSum / pixels;
  const g = gSum / pixels;
  const b = bSum / pixels;
  const lightness = rgbToLightness(r, g, b);

  if (lightness < 18 || lightness > 92) return null;
  if (lightness < 25) return "deep";
  if (lightness < 35) return "tan";
  if (lightness < 50) return "medium";
  if (lightness < 60) return "light";
  return "fair";
}

async function sampleSkinToneFromBase64(
  base64: string,
): Promise<DetectedSkinTone | null> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("decode failed"));
    el.src = `data:image/jpeg;base64,${base64}`;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  return classifySkinToneFromCanvas(ctx, img.width, img.height);
}

export default function InterviewPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [imageFileName, setImageFileName] = useState<string>("");
  const [imageError, setImageError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [skinToneDetected, setSkinToneDetected] = useState(false);
  const skinToneManualRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    if (name === "skinTone") {
      skinToneManualRef.current = true;
      setSkinToneDetected(false);
    }
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_BYTES = 15 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setImageError("Image must be 15 MB or smaller.");
      setImageBase64(undefined);
      setImageFileName("");
      e.target.value = "";
      return;
    }

    setImageError(null);
    setImageFileName(file.name);

    try {
      const base64 = await downscaleToBase64(file);
      if (!base64) throw new Error("empty result");
      setImageBase64(base64);

      try {
        const detected = await sampleSkinToneFromBase64(base64);
        if (detected && !skinToneManualRef.current) {
          setForm((prev) => ({ ...prev, skinTone: detected }));
          setSkinToneDetected(true);
        }
      } catch {
        // Skin-tone sampling is best-effort; never clear a valid upload.
      }
    } catch {
      // Fail closed: never upload an unprocessed (potentially huge or
      // unsupported-format) file. The full-size original would defeat the
      // downscale and persist megabytes into the session store.
      setImageBase64(undefined);
      setImageError(
        "Could not process this image. Please upload a JPEG, PNG, or WebP under 15 MB.",
      );
    }
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.jobTitle.trim()) newErrors.jobTitle = "Required";
    if (!form.companyName.trim()) newErrors.companyName = "Required";
    if (form.jobDescription.trim().length < 20)
      newErrors.jobDescription = "At least 20 characters";
    if (!form.interviewDate) newErrors.interviewDate = "Required";
    const budget = parseFloat(form.budget);
    if (isNaN(budget) || budget <= 0) newErrors.budget = "Enter a positive number";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const weightParsed = form.weightLbs ? parseFloat(form.weightLbs) : NaN;
      const payload = {
        ...form,
        budget: parseFloat(form.budget),
        industry: form.industry || undefined,
        candidateName: form.candidateName || undefined,
        fitSize: form.fitSize || undefined,
        weightLbs:
          !isNaN(weightParsed) && weightParsed > 0 ? weightParsed : undefined,
        skinTone: (form.skinTone || undefined) as
          | DetectedSkinTone
          | undefined,
        presentation: (form.presentation || undefined) as
          | "feminine"
          | "masculine"
          | "neutral"
          | undefined,
        companyCulture: (form.companyCulture || undefined) as
          | "corporate"
          | "startup"
          | "creative"
          | "client-facing"
          | "government"
          | undefined,
        imageBase64,
      };

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { sessionId?: string; error?: string };

      if (!res.ok || !data.sessionId) {
        setSubmitError(data.error ?? "Something went wrong — please try again.");
        return;
      }

      router.push(`/interview/${data.sessionId}/analysis`);
    } catch {
      setSubmitError("Network error — please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-16">
      {/* Header */}
      <header className="border-b border-[#e2e8f0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link
            href="/"
            className="font-serif text-base font-semibold text-[#0f2744] hover:text-[#2a6f7f] transition-colors"
          >
            InterviewReady AI
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 pt-8">
        <StepNav currentStep={1} className="mb-8" />

        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 shadow-sm">
          <h1 className="font-serif text-2xl font-semibold text-[#0f2744] mb-1">
            Your interview details
          </h1>
          <p className="text-sm text-[#718096] mb-8">
            Tell us about the role and your preferences so we can tailor outfit
            recommendations for you.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Personal */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="candidateName">Your name (optional)</Label>
                <Input
                  id="candidateName"
                  name="candidateName"
                  value={form.candidateName}
                  onChange={handleChange}
                  placeholder="Alex"
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="interviewDate">Interview date *</Label>
                <Input
                  id="interviewDate"
                  name="interviewDate"
                  type="date"
                  value={form.interviewDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split("T")[0]}
                  className={errors.interviewDate ? "border-red-400" : ""}
                />
                {errors.interviewDate && (
                  <p className="text-xs text-red-500">{errors.interviewDate}</p>
                )}
              </div>
            </div>

            {/* Role */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="jobTitle">Job title *</Label>
                <Input
                  id="jobTitle"
                  name="jobTitle"
                  value={form.jobTitle}
                  onChange={handleChange}
                  placeholder="e.g. Senior Analyst"
                  className={errors.jobTitle ? "border-red-400" : ""}
                />
                {errors.jobTitle && (
                  <p className="text-xs text-red-500">{errors.jobTitle}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Company *</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  placeholder="e.g. Acme Corp"
                  className={errors.companyName ? "border-red-400" : ""}
                />
                {errors.companyName && (
                  <p className="text-xs text-red-500">{errors.companyName}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry (optional)</Label>
              <Input
                id="industry"
                name="industry"
                value={form.industry}
                onChange={handleChange}
                placeholder="e.g. Financial Services, Healthcare, Tech"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jobDescription">Job description *</Label>
              <Textarea
                id="jobDescription"
                name="jobDescription"
                value={form.jobDescription}
                onChange={handleChange}
                rows={5}
                placeholder="Paste or summarise the job description — the more detail, the better our dress code inference."
                className={errors.jobDescription ? "border-red-400" : ""}
              />
              {errors.jobDescription && (
                <p className="text-xs text-red-500">{errors.jobDescription}</p>
              )}
            </div>

            {/* Interview specifics */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="interviewFormat">Interview format</Label>
                <Select
                  id="interviewFormat"
                  name="interviewFormat"
                  value={form.interviewFormat}
                  onChange={handleChange}
                  options={[
                    { value: "video", label: "Video call" },
                    { value: "onsite", label: "On-site" },
                    { value: "recruiter", label: "Recruiter screen" },
                    { value: "hiring-manager", label: "Hiring manager" },
                    { value: "executive", label: "Executive panel" },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="interviewStage">Interview stage</Label>
                <Select
                  id="interviewStage"
                  name="interviewStage"
                  value={form.interviewStage}
                  onChange={handleChange}
                  options={[
                    { value: "phone-screen", label: "Phone screen" },
                    { value: "first-round", label: "First round" },
                    { value: "onsite", label: "On-site" },
                    { value: "final", label: "Final round" },
                    { value: "other", label: "Other" },
                  ]}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="budget">Outfit budget (USD) *</Label>
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  min="1"
                  step="10"
                  value={form.budget}
                  onChange={handleChange}
                  placeholder="e.g. 200"
                  className={errors.budget ? "border-red-400" : ""}
                />
                {errors.budget && (
                  <p className="text-xs text-red-500">{errors.budget}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stylePreference">Style preference</Label>
                <Select
                  id="stylePreference"
                  name="stylePreference"
                  value={form.stylePreference}
                  onChange={handleChange}
                  options={[
                    { value: "classic", label: "Classic" },
                    { value: "modern", label: "Modern" },
                    { value: "minimal", label: "Minimal" },
                    { value: "creative", label: "Creative" },
                  ]}
                />
              </div>
            </div>

            {/* Person profile */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fitSize">Fit size (optional)</Label>
                <Input
                  id="fitSize"
                  name="fitSize"
                  value={form.fitSize ?? ""}
                  onChange={handleChange}
                  placeholder="e.g. US 6 or M"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weightLbs">Weight (lbs, optional)</Label>
                <Input
                  id="weightLbs"
                  name="weightLbs"
                  type="number"
                  min="1"
                  step="1"
                  value={form.weightLbs}
                  onChange={handleChange}
                  placeholder="e.g. 140"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="skinTone">Skin tone (optional)</Label>
                <Select
                  id="skinTone"
                  name="skinTone"
                  value={form.skinTone}
                  onChange={handleChange}
                  options={[
                    { value: "", label: "Prefer not to say" },
                    { value: "fair", label: "Fair" },
                    { value: "light", label: "Light" },
                    { value: "medium", label: "Medium" },
                    { value: "tan", label: "Tan" },
                    { value: "deep", label: "Deep" },
                  ]}
                />
                {skinToneDetected && form.skinTone && (
                  <p className="text-xs text-[#718096]">
                    (detected from photo — you can change it)
                  </p>
                )}
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="companyCulture">Company culture (optional)</Label>
              <Select
                id="companyCulture"
                name="companyCulture"
                value={form.companyCulture}
                onChange={handleChange}
                options={[
                  { value: "", label: "Auto (from industry)" },
                  { value: "corporate", label: "Corporate" },
                  { value: "startup", label: "Startup" },
                  { value: "creative", label: "Creative" },
                  { value: "client-facing", label: "Client-facing" },
                  { value: "government", label: "Government" },
                ]}
              />
            </div>

            {/* Optional photo */}
            <div className="space-y-1.5">
              <Label>Photo (optional)</Label>
              <p className="text-xs text-[#718096]">
                Upload a selfie to enable personalised skin analysis and virtual
                try-on. Stored only for this session.
              </p>
              <div
                className="flex items-center gap-3 rounded-lg border border-dashed border-[#c3ccd6] bg-[#f4f6f8] p-4 cursor-pointer hover:border-[#2a6f7f] transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg
                  className="h-6 w-6 text-[#718096]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-sm text-[#718096]">
                  {imageFileName ? imageFileName : "Click to select image"}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleFileChange}
                aria-label="Upload selfie"
              />
              {imageError && (
                <p className="text-xs text-red-500">{imageError}</p>
              )}
            </div>

            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={submitting}
              className="w-full"
            >
              {submitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Analysing…
                </>
              ) : (
                <>
                  Analyse my interview
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
