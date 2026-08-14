import { useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { StepNav } from "@/components/step-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import type { IntakeInput } from "@/lib/validation/schemas";
import { downscaleToBase64 } from "@/lib/client/image-utils";
import { cn } from "@/lib/utils";

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

export default function InterviewPage() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [imageFileName, setImageFileName] = useState<string>("");
  const [imageError, setImageError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
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
    } catch {
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
      newErrors.jobDescription = "At least 20 characters required";
    if (!form.interviewDate) newErrors.interviewDate = "Required";
    const budget = parseFloat(form.budget);
    if (isNaN(budget) || budget <= 0) newErrors.budget = "Enter a positive number";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

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
        skinTone: (form.skinTone || undefined) as IntakeInput["skinTone"],
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

      setLocation(`/interview/${data.sessionId}/analysis`);
    } catch {
      setSubmitError("Network error — please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background pb-24"
    >
      {/* Header */}
      <header className="border-b border-[#0f2744]/10 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="font-serif text-lg text-[#0f2744] hover:opacity-70 transition-opacity"
          >
            Vogue × Career
          </Link>
          <Link href="/" className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744]/60 hover:text-[#0f2744] transition-colors">
            Cancel
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 pt-12 md:pt-20">
        <StepNav currentStep={1} className="mb-16" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-12"
        >
          <div className="text-center space-y-4 mb-16">
            <h1 className="font-serif text-4xl md:text-5xl text-[#0f2744] leading-tight">
              The Consultation
            </h1>
            <p className="text-sm font-serif italic text-[#0f2744]/60 max-w-md mx-auto">
              Please provide the details of your upcoming interview. The more context you share, the sharper our curation.
            </p>
          </div>

          {submitError && (
            <div className="border border-red-900/10 bg-red-50/50 p-4 text-sm font-serif italic text-red-900 text-center">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-12" noValidate>
            
            {/* Section 1: The Role */}
            <div className="space-y-8">
              <h2 className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744] border-b border-[#0f2744]/10 pb-2">
                01 — The Opportunity
              </h2>
              
              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Role Title *</Label>
                  <Input
                    id="jobTitle"
                    name="jobTitle"
                    value={form.jobTitle}
                    onChange={handleChange}
                    placeholder="e.g. Senior Director"
                    className={cn(
                      "border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors",
                      errors.jobTitle && "border-red-500"
                    )}
                  />
                  {errors.jobTitle && <p className="text-[10px] uppercase tracking-widest text-red-500 mt-1">{errors.jobTitle}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Company *</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={form.companyName}
                    onChange={handleChange}
                    placeholder="e.g. Acme Corp"
                    className={cn(
                      "border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors",
                      errors.companyName && "border-red-500"
                    )}
                  />
                  {errors.companyName && <p className="text-[10px] uppercase tracking-widest text-red-500 mt-1">{errors.companyName}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Industry (Optional)</Label>
                <Input
                  id="industry"
                  name="industry"
                  value={form.industry}
                  onChange={handleChange}
                  placeholder="e.g. Investment Banking, Tech, Healthcare"
                  className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobDescription" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Role Description *</Label>
                <Textarea
                  id="jobDescription"
                  name="jobDescription"
                  value={form.jobDescription}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Paste the job description. We read between the lines to infer culture and dress code."
                  className={cn(
                    "border border-[#0f2744]/10 bg-white/50 p-4 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-sm font-serif leading-relaxed transition-colors resize-none",
                    errors.jobDescription && "border-red-500"
                  )}
                />
                {errors.jobDescription && <p className="text-[10px] uppercase tracking-widest text-red-500 mt-1">{errors.jobDescription}</p>}
              </div>
            </div>

            {/* Section 2: The Interview */}
            <div className="space-y-8">
              <h2 className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744] border-b border-[#0f2744]/10 pb-2">
                02 — The Encounter
              </h2>
              
              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="interviewDate" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Date *</Label>
                  <Input
                    id="interviewDate"
                    name="interviewDate"
                    type="date"
                    value={form.interviewDate}
                    onChange={handleChange}
                    min={new Date().toISOString().split("T")[0]}
                    className={cn(
                      "border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors appearance-none",
                      errors.interviewDate && "border-red-500"
                    )}
                  />
                  {errors.interviewDate && <p className="text-[10px] uppercase tracking-widest text-red-500 mt-1">{errors.interviewDate}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyCulture" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Culture Profile</Label>
                  <Select
                    id="companyCulture"
                    name="companyCulture"
                    value={form.companyCulture}
                    onChange={handleChange}
                    className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors"
                    options={[
                      { value: "", label: "Infer automatically" },
                      { value: "corporate", label: "Traditional Corporate" },
                      { value: "startup", label: "Modern Startup" },
                      { value: "creative", label: "Creative Studio" },
                      { value: "client-facing", label: "Client Facing" },
                      { value: "government", label: "Government / NGO" },
                    ]}
                  />
                </div>
              </div>

              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="interviewFormat" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Format</Label>
                  <Select
                    id="interviewFormat"
                    name="interviewFormat"
                    value={form.interviewFormat}
                    onChange={handleChange}
                    className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors"
                    options={[
                      { value: "video", label: "Video Conference" },
                      { value: "onsite", label: "On-site" },
                      { value: "recruiter", label: "Recruiter Screen" },
                      { value: "hiring-manager", label: "Hiring Manager" },
                      { value: "executive", label: "Executive Panel" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interviewStage" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Stage</Label>
                  <Select
                    id="interviewStage"
                    name="interviewStage"
                    value={form.interviewStage}
                    onChange={handleChange}
                    className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors"
                    options={[
                      { value: "phone-screen", label: "Initial Screen" },
                      { value: "first-round", label: "First Round" },
                      { value: "onsite", label: "On-site / Superday" },
                      { value: "final", label: "Final Round" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: The Candidate */}
            <div className="space-y-8">
              <h2 className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744] border-b border-[#0f2744]/10 pb-2">
                03 — The Canvas
              </h2>

              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="candidateName" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Name</Label>
                  <Input
                    id="candidateName"
                    name="candidateName"
                    value={form.candidateName}
                    onChange={handleChange}
                    placeholder="Optional"
                    className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="presentation" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Presentation</Label>
                  <Select
                    id="presentation"
                    name="presentation"
                    value={form.presentation}
                    onChange={handleChange}
                    className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors"
                    options={[
                      { value: "", label: "Prefer not to say" },
                      { value: "feminine", label: "Feminine" },
                      { value: "masculine", label: "Masculine" },
                      { value: "neutral", label: "Neutral" },
                    ]}
                  />
                </div>
              </div>

              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="budget" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Budget (USD) *</Label>
                  <Input
                    id="budget"
                    name="budget"
                    type="number"
                    min="1"
                    step="10"
                    value={form.budget}
                    onChange={handleChange}
                    placeholder="e.g. 500"
                    className={cn(
                      "border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors",
                      errors.budget && "border-red-500"
                    )}
                  />
                  {errors.budget && <p className="text-[10px] uppercase tracking-widest text-red-500 mt-1">{errors.budget}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stylePreference" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Aesthetic</Label>
                  <Select
                    id="stylePreference"
                    name="stylePreference"
                    value={form.stylePreference}
                    onChange={handleChange}
                    className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors"
                    options={[
                      { value: "classic", label: "Classic / Timeless" },
                      { value: "modern", label: "Modern / Sharp" },
                      { value: "minimal", label: "Minimalist / Understated" },
                      { value: "creative", label: "Creative / Bold" },
                    ]}
                  />
                </div>
              </div>

              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="skinTone" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Complexion</Label>
                  <Select
                    id="skinTone"
                    name="skinTone"
                    value={form.skinTone}
                    onChange={handleChange}
                    className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors"
                    options={[
                      { value: "", label: "Skip / Infer from photo" },
                      { value: "fair", label: "Fair" },
                      { value: "light", label: "Light" },
                      { value: "medium", label: "Medium" },
                      { value: "tan", label: "Tan" },
                      { value: "deep", label: "Deep" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fitSize" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Sizing (Optional)</Label>
                  <Input
                    id="fitSize"
                    name="fitSize"
                    value={form.fitSize ?? ""}
                    onChange={handleChange}
                    placeholder="e.g. US 6, M, 40R"
                    className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <Label className="text-xs uppercase tracking-widest text-[#0f2744]/70">Portrait (Optional)</Label>
                <p className="text-sm font-serif italic text-[#0f2744]/60">
                  Upload a photo to unlock virtual try-on and bespoke color analysis.
                </p>
                <div
                  className="group relative flex flex-col items-center justify-center gap-3 border border-[#0f2744]/10 bg-white/50 p-8 cursor-pointer hover:bg-white hover:border-[#0f2744]/30 transition-all duration-300"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg
                    className="h-6 w-6 text-[#0f2744]/40 group-hover:text-[#0f2744] transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-serif text-[#0f2744]/60 group-hover:text-[#0f2744] transition-colors">
                    {imageFileName ? imageFileName : "Select a portrait"}
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleFileChange}
                  aria-label="Upload portrait"
                />
                {imageError && (
                  <p className="text-[10px] uppercase tracking-widest text-red-500 mt-1">{imageError}</p>
                )}
              </div>
            </div>

            <div className="pt-8 flex justify-center">
              <button
                type="submit"
                disabled={submitting}
                className="group relative px-12 py-5 bg-[#0f2744] text-white text-xs font-medium uppercase tracking-widest overflow-hidden transition-all hover:bg-[#0a1d35] disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing Profile
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-3">
                    Begin Analysis
                    <svg className="h-4 w-4 transform transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
}
