import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { downscaleToBase64 } from "@/lib/client/image-utils";
import {
  WARDROBE_CATEGORIES,
  WARDROBE_COLORS,
  WARDROBE_FORMALITY,
  WARDROBE_SEASONS,
  type WardrobeCategory,
  type WardrobeColor,
  type WardrobeFormality,
  type WardrobeItem,
} from "@/types/wardrobe";
import type { StyleProfile, WornOutfitRecord } from "@/types/worn";
import { formalityLevelToLabel } from "@/lib/wardrobe/formality";

type Season = (typeof WARDROBE_SEASONS)[number];

interface FormState {
  name: string;
  category: WardrobeCategory;
  color: WardrobeColor;
  formality: WardrobeFormality;
  seasons: Season[];
  imageBase64: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  category: "tops",
  color: "navy",
  formality: "business-casual",
  seasons: ["any"],
  imageBase64: "",
};

function labelize(value: string): string {
  return value.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

export default function WardrobePage() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [wornRecords, setWornRecords] = useState<WornOutfitRecord[]>([]);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);

  async function fetchItems() {
    try {
      const res = await fetch("/api/wardrobe");
      const data = (await res.json()) as { items?: WardrobeItem[]; error?: string };
      if (!res.ok) { setLoadError(data.error ?? "Failed to load wardrobe."); return; }
      setItems(data.items ?? []);
      setLoadError(null);
    } catch {
      setLoadError("Failed to load wardrobe.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchWorn() {
    try {
      const res = await fetch("/api/worn");
      if (!res.ok) return;
      const data = (await res.json()) as { records?: WornOutfitRecord[]; profile?: StyleProfile };
      setWornRecords(data.records ?? []);
      setStyleProfile(data.profile ?? null);
    } catch { /* ignore */ }
  }

  useEffect(() => { void Promise.all([fetchItems(), fetchWorn()]); }, []);

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    try {
      const base64 = await downscaleToBase64(file);
      setForm((prev) => ({ ...prev, imageBase64: base64 }));
      setPreviewUrl(`data:image/jpeg;base64,${base64}`);
    } catch {
      setForm((prev) => ({ ...prev, imageBase64: "" }));
      setPreviewUrl(null);
      setImageError("Could not process this image. Please upload a JPEG, PNG, or WebP.");
    }
  }

  function toggleSeason(season: Season) {
    setForm((prev) => {
      const has = prev.seasons.includes(season);
      if (has && prev.seasons.length === 1) return prev;
      const next = has ? prev.seasons.filter((s) => s !== season) : [...prev.seasons.filter((s) => s !== "any"), season];
      return { ...prev, seasons: next.length === 0 ? ["any"] : next };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.imageBase64) { setSubmitError("Please upload an image of the item."); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/wardrobe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as WardrobeItem & { error?: string };
      if (!res.ok) { setSubmitError(data.error ?? "Failed to add item."); return; }
      setItems((prev) => [data, ...prev]);
      setForm(EMPTY_FORM);
      setPreviewUrl(null);
      setShowForm(false);
    } catch {
      setSubmitError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/wardrobe/${id}`, { method: "DELETE" });
      if (res.ok) setItems((prev) => prev.filter((item) => item.id !== id));
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-16">
      <header className="border-b border-[#e2e8f0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="font-serif text-base font-semibold text-[#0f2744] hover:text-[#2a6f7f] transition-colors">
            InterviewReady AI
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/occasion" className="text-sm text-[#718096] hover:text-[#0f2744] transition-colors">
              Plan an occasion
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 pt-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-[#0f2744]">My wardrobe</h1>
            <p className="mt-1 text-sm text-[#718096]">{items.length} item{items.length === 1 ? "" : "s"}</p>
          </div>
          <Button onClick={() => setShowForm((v) => !v)} className="bg-[#0f2744] text-white hover:bg-[#0a1d35]">
            {showForm ? "Cancel" : "Add item"}
          </Button>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={(e) => void handleSubmit(e)} className="rounded-xl border border-[#e2e8f0] bg-white p-6 space-y-5">
            <h2 className="font-serif text-base font-semibold text-[#0f2744]">Add a wardrobe item</h2>

            {/* Image upload */}
            <div className="space-y-1.5">
              <Label>Photo *</Label>
              <div className="flex items-start gap-4">
                {previewUrl && (
                  <img src={previewUrl} alt="Preview" className="h-20 w-20 rounded-lg object-cover border border-[#e2e8f0]" />
                )}
                <div className="flex-1">
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void handleImageChange(e)}
                    className="block w-full text-sm text-[#718096] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#f4f6f8] file:text-[#0f2744] hover:file:bg-[#e2e8f0]" />
                  {imageError && <p className="mt-1 text-xs text-red-500">{imageError}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Name (optional)</Label>
              <Input id="name" name="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Navy slim-fit blazer" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as WardrobeCategory }))}>
                  {WARDROBE_CATEGORIES.map((c) => <option key={c} value={c}>{labelize(c)}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <Select value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value as WardrobeColor }))}>
                  {WARDROBE_COLORS.map((c) => <option key={c} value={c}>{labelize(c)}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Formality</Label>
                <Select value={form.formality} onChange={(e) => setForm((p) => ({ ...p, formality: e.target.value as WardrobeFormality }))}>
                  {WARDROBE_FORMALITY.map((f) => <option key={f} value={f}>{labelize(f)}</option>)}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Seasons</Label>
              <div className="flex flex-wrap gap-2">
                {WARDROBE_SEASONS.map((s) => (
                  <button key={s} type="button" onClick={() => toggleSeason(s)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      form.seasons.includes(s)
                        ? "border-[#2a6f7f] bg-[#e8f4f6] text-[#2a6f7f]"
                        : "border-[#e2e8f0] bg-white text-[#718096] hover:border-[#b0bec5]"
                    }`}>
                    {labelize(s)}
                  </button>
                ))}
              </div>
            </div>

            {submitError && <p className="text-sm text-red-500">{submitError}</p>}

            <Button type="submit" disabled={submitting} className="w-full bg-[#0f2744] text-white hover:bg-[#0a1d35]">
              {submitting ? "Adding…" : "Add to wardrobe"}
            </Button>
          </form>
        )}

        {/* Items grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-[#2a6f7f]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-red-200 bg-white p-6 text-center">
            <p className="text-sm text-red-600">{loadError}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-8 text-center space-y-3">
            <p className="text-sm text-[#718096]">Your wardrobe is empty. Add your first item above.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-[#e2e8f0] bg-white overflow-hidden">
                {item.imageBase64 && (
                  <div className="aspect-square bg-[#f4f6f8]">
                    <img src={`data:image/jpeg;base64,${item.imageBase64}`} alt={item.name ?? item.category}
                      className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <p className="text-sm font-medium text-[#0f2744] truncate">{item.name || labelize(item.category)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs">{labelize(item.color)}</Badge>
                    <Badge variant="secondary" className="text-xs">{labelize(item.formality)}</Badge>
                    {item.favorite && <Badge variant="accent" className="text-xs">Favourite</Badge>}
                  </div>
                  <button onClick={() => void handleDelete(item.id)}
                    className="text-xs text-[#718096] hover:text-red-500 transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Style profile */}
        {styleProfile && styleProfile.totalWorn > 0 && (
          <section className="rounded-xl border border-[#e2e8f0] bg-white p-6 space-y-4">
            <h2 className="font-serif text-base font-semibold text-[#0f2744]">Your style profile</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#718096]">Top colors</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {styleProfile.colors.length === 0 ? (
                    <span className="text-sm text-[#718096]">—</span>
                  ) : (
                    styleProfile.colors.map(({ color, count }) => (
                      <Badge key={color} variant="outline">{labelize(color)} ({count})</Badge>
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#718096]">Top categories</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {styleProfile.categories.length === 0 ? (
                    <span className="text-sm text-[#718096]">—</span>
                  ) : (
                    styleProfile.categories.map(({ category, count }) => (
                      <Badge key={category} variant="secondary">{labelize(category)} ({count})</Badge>
                    ))
                  )}
                </div>
              </div>
              <p className="text-sm text-[#4a5568]">
                Typical formality: <span className="font-medium text-[#0f2744]">{labelize(formalityLevelToLabel(styleProfile.formality))}</span>
              </p>
              <p className="text-sm text-[#718096]">{styleProfile.totalWorn} outfit{styleProfile.totalWorn === 1 ? "" : "s"} worn</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
