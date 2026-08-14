import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { OCCASION_TYPES, type OccasionType } from "@/types/occasion";
import { cn } from "@/lib/utils";

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
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
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
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background pb-24"
    >
      <header className="border-b border-[#0f2744]/10 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-serif text-lg text-[#0f2744] hover:opacity-70 transition-opacity">
            Vogue × Career
          </Link>
          <Link href="/wardrobe" className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744]/60 hover:text-[#0f2744] transition-colors">
            My Wardrobe
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 pt-12 md:pt-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-12"
        >
          <div className="text-center space-y-4 mb-16">
            <p className="text-[10px] uppercase tracking-[0.3em] font-medium text-[#0f2744]/60">Event Curation</p>
            <h1 className="font-serif text-4xl md:text-5xl text-[#0f2744] leading-tight">
              Plan An Occasion
            </h1>
            <p className="text-sm font-serif italic text-[#0f2744]/60 max-w-md mx-auto">
              Our AI curates looks directly from your digital wardrobe, perfectly tuned to the venue and event culture.
            </p>
          </div>

          {submitError && (
            <div className="border border-red-900/10 bg-red-50/50 p-4 text-sm font-serif italic text-red-900 text-center">
              {submitError}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-12" noValidate>
            
            <div className="space-y-8">
              <div className="space-y-2">
                <Label htmlFor="eventType" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Event Category</Label>
                <Select 
                  name="eventType" 
                  value={form.eventType} 
                  onChange={handleChange}
                  className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors"
                >
                  {OCCASION_TYPES.map((t) => (
                    <option key={t} value={t}>{labelize(t)}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venueName" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Venue Name *</Label>
                <Input
                  id="venueName"
                  name="venueName"
                  value={form.venueName}
                  onChange={handleChange}
                  placeholder="e.g. The Rooftop Bar, Central Park"
                  className={cn(
                    "border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors",
                    errors.venueName && "border-red-500"
                  )}
                />
                {errors.venueName && <p className="text-[10px] uppercase tracking-widest text-red-500 mt-1">{errors.venueName}</p>}
              </div>

              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-xs uppercase tracking-widest text-[#0f2744]/70">City / Locale (Optional)</Label>
                  <Input 
                    id="location" 
                    name="location" 
                    value={form.location} 
                    onChange={handleChange} 
                    placeholder="e.g. New York, Paris" 
                    className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventDate" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Date (Optional)</Label>
                  <Input 
                    id="eventDate" 
                    name="eventDate" 
                    type="date" 
                    value={form.eventDate} 
                    onChange={handleChange} 
                    className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors appearance-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Theme / Dress Code (Optional)</Label>
                <Input 
                  id="theme" 
                  name="theme" 
                  value={form.theme} 
                  onChange={handleChange} 
                  placeholder="e.g. Black Tie, Summer Garden Party" 
                  className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors"
                />
              </div>

              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="presentation" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Presentation</Label>
                  <Select 
                    name="presentation" 
                    value={form.presentation} 
                    onChange={handleChange}
                    className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors"
                  >
                    <option value="">Any</option>
                    <option value="feminine">Feminine</option>
                    <option value="masculine">Masculine</option>
                    <option value="neutral">Neutral</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skinTone" className="text-xs uppercase tracking-widest text-[#0f2744]/70">Complexion</Label>
                  <Select 
                    name="skinTone" 
                    value={form.skinTone} 
                    onChange={handleChange}
                    className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors"
                  >
                    <option value="">Skip</option>
                    {(["fair", "light", "medium", "tan", "deep"] as const).map((t) => (
                      <option key={t} value={t}>{labelize(t)}</option>
                    ))}
                  </Select>
                </div>
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
                    Curating Looks
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-3">
                    Find Outfits
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
