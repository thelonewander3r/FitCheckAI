import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
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
import { cn } from "@/lib/utils";

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
    if (!form.imageBase64) {
      setSubmitError("Please upload an image of the piece.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/wardrobe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as WardrobeItem & { error?: string };
      if (!res.ok) { setSubmitError(data.error ?? "Failed to add piece."); return; }
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
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background pb-32"
    >
      <header className="border-b border-[#0f2744]/10 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-serif text-lg text-[#0f2744] hover:opacity-70 transition-opacity">
            FitCheckAI
          </Link>
          <Link href="/occasion" className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744]/60 hover:text-[#0f2744] transition-colors">
            Plan Occasion
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 pt-12 md:pt-20">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16 lg:mb-24 border-b border-[#0f2744]/10 pb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[10px] uppercase tracking-widest text-[#0f2744]/50 mb-4">Digital Closet</p>
            <h1 className="font-serif text-5xl md:text-6xl text-[#0f2744] leading-tight mb-2">
              The Collection
            </h1>
            <p className="text-sm font-serif italic text-[#0f2744]/70">
              {items.length} curated {items.length === 1 ? "piece" : "pieces"}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            <button 
              onClick={() => setShowForm((v) => !v)} 
              className={cn(
                "px-8 py-3 text-[10px] font-medium uppercase tracking-widest transition-all duration-300",
                showForm 
                  ? "bg-transparent text-[#0f2744] border border-[#0f2744] hover:bg-[#0f2744]/5" 
                  : "bg-[#0f2744] text-white hover:bg-[#0a1d35]"
              )}
            >
              {showForm ? "Cancel Entry" : "Acquire Piece"}
            </button>
          </motion.div>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden mb-24"
            >
              <form onSubmit={(e) => void handleSubmit(e)} className="bg-white border border-[#0f2744]/10 p-8 md:p-12 space-y-12">
                <div className="flex justify-between items-end border-b border-[#0f2744]/10 pb-4">
                  <h2 className="font-serif text-3xl text-[#0f2744]">Catalog New Piece</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
                  
                  {/* Image Column */}
                  <div className="lg:col-span-5 space-y-4">
                    <Label className="text-[10px] uppercase tracking-widest text-[#0f2744]/70">Portrait *</Label>
                    <div className="aspect-[3/4] w-full border border-[#0f2744]/10 bg-[#f9f6f0] flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer" onClick={() => document.getElementById('wardrobe-img-upload')?.click()}>
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="flex flex-col items-center gap-4 text-[#0f2744]/30">
                          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="text-sm font-serif italic">Upload Image</span>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-[#0f2744]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="text-white text-[10px] uppercase tracking-widest">Change Photo</span>
                      </div>
                    </div>
                    
                    <input id="wardrobe-img-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void handleImageChange(e)} className="hidden" />
                    {imageError && <p className="text-[10px] uppercase tracking-widest text-red-500">{imageError}</p>}
                  </div>
                  
                  {/* Details Column */}
                  <div className="lg:col-span-7 space-y-8">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-[10px] uppercase tracking-widest text-[#0f2744]/70">Piece Name (Optional)</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        value={form.name} 
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} 
                        placeholder="e.g. Navy Silk Blouse" 
                        className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-xl font-serif transition-colors"
                      />
                    </div>

                    <div className="grid gap-8 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-[#0f2744]/70">Category</Label>
                        <Select 
                          value={form.category} 
                          onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as WardrobeCategory }))}
                          className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors"
                        >
                          {WARDROBE_CATEGORIES.map((c) => <option key={c} value={c}>{labelize(c)}</option>)}
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-[#0f2744]/70">Color Story</Label>
                        <Select 
                          value={form.color} 
                          onChange={(e) => setForm((p) => ({ ...p, color: e.target.value as WardrobeColor }))}
                          className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors"
                        >
                          {WARDROBE_COLORS.map((c) => <option key={c} value={c}>{labelize(c)}</option>)}
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-[#0f2744]/70">Formality</Label>
                      <Select 
                        value={form.formality} 
                        onChange={(e) => setForm((p) => ({ ...p, formality: e.target.value as WardrobeFormality }))}
                        className="border-0 border-b border-[#0f2744]/20 bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-[#0f2744] rounded-none shadow-none text-base font-serif transition-colors"
                      >
                        {WARDROBE_FORMALITY.map((f) => <option key={f} value={f}>{labelize(f)}</option>)}
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[10px] uppercase tracking-widest text-[#0f2744]/70">Seasonality</Label>
                      <div className="flex flex-wrap gap-3">
                        {WARDROBE_SEASONS.map((s) => (
                          <button 
                            key={s} 
                            type="button" 
                            onClick={() => toggleSeason(s)}
                            className={cn(
                              "px-4 py-2 text-[10px] uppercase tracking-widest font-medium transition-colors border",
                              form.seasons.includes(s)
                                ? "bg-[#0f2744] text-white border-[#0f2744]"
                                : "bg-transparent text-[#0f2744]/60 border-[#0f2744]/20 hover:border-[#0f2744]/50"
                            )}
                          >
                            {labelize(s)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {submitError && <div className="border border-red-900/10 bg-red-50/50 p-4 text-sm font-serif italic text-red-900 text-center">{submitError}</div>}

                    <div className="pt-8">
                      <button 
                        type="submit" 
                        disabled={submitting} 
                        className="group relative px-12 py-4 bg-[#0f2744] text-white text-[10px] font-medium uppercase tracking-widest overflow-hidden transition-all hover:bg-[#0a1d35] disabled:opacity-50 w-full"
                      >
                        {submitting ? "Archiving..." : "Add To Collection"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Style Profile Feature */}
        {styleProfile && styleProfile.totalWorn > 0 && !showForm && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-24 grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-[#0f2744] text-white p-8 md:p-12 shadow-sm"
          >
            <div className="md:col-span-5">
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Insights</p>
              <h2 className="font-serif text-3xl leading-tight mb-2">Style Profile</h2>
              <p className="text-sm font-serif italic text-white/70">Based on {styleProfile.totalWorn} catalogued wears.</p>
            </div>
            
            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-8 border-t md:border-t-0 md:border-l border-white/10 pt-8 md:pt-0 md:pl-12">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Palette</p>
                {styleProfile.colors.length > 0 ? (
                  <ul className="space-y-1">
                    {styleProfile.colors.slice(0, 3).map(({ color, count }) => (
                      <li key={color} className="font-serif text-sm">
                        {labelize(color)} <span className="text-white/40 italic ml-1">({count})</span>
                      </li>
                    ))}
                  </ul>
                ) : <span className="text-sm text-white/30">—</span>}
              </div>
              
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Focus</p>
                {styleProfile.categories.length > 0 ? (
                  <ul className="space-y-1">
                    {styleProfile.categories.slice(0, 3).map(({ category, count }) => (
                      <li key={category} className="font-serif text-sm">
                        {labelize(category)} <span className="text-white/40 italic ml-1">({count})</span>
                      </li>
                    ))}
                  </ul>
                ) : <span className="text-sm text-white/30">—</span>}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Signature</p>
                <p className="font-serif text-lg leading-tight">
                  {labelize(formalityLevelToLabel(styleProfile.formality))}
                </p>
              </div>
            </div>
          </motion.section>
        )}

        {/* Collection Grid */}
        {loading ? (
          <div className="flex justify-center py-24">
            <svg className="animate-spin h-8 w-8 text-[#0f2744]/30" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : loadError ? (
          <div className="border border-red-900/10 bg-red-50/50 p-8 text-center max-w-2xl mx-auto">
            <p className="text-sm font-serif italic text-red-900">{loadError}</p>
          </div>
        ) : items.length === 0 && !showForm ? (
          <div className="border border-[#0f2744]/10 bg-white p-24 text-center max-w-3xl mx-auto space-y-6">
            <p className="text-xl font-serif italic text-[#0f2744]/70">The collection is unwritten.</p>
            <button onClick={() => setShowForm(true)} className="text-[10px] uppercase tracking-widest font-medium text-[#0f2744] border-b border-[#0f2744] pb-1 hover:text-[#2a6f7f] hover:border-[#2a6f7f] transition-colors">
              Begin Curating
            </button>
          </div>
        ) : (
          <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                key={item.id} 
                className="group relative bg-white border border-[#0f2744]/10 overflow-hidden flex flex-col hover:border-[#0f2744]/30 transition-colors"
              >
                {item.imageBase64 ? (
                  <div className="aspect-[3/4] bg-[#f9f6f0] overflow-hidden">
                    <img 
                      src={`data:image/jpeg;base64,${item.imageBase64}`} 
                      alt={item.name ?? item.category}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/4] bg-[#f9f6f0] flex items-center justify-center">
                    <span className="text-xs uppercase tracking-widest text-[#0f2744]/30">No Image</span>
                  </div>
                )}
                
                <div className="p-6 flex flex-col flex-1">
                  <div className="mb-4">
                    <h3 className="font-serif text-xl text-[#0f2744] mb-1 line-clamp-1">{item.name || labelize(item.category)}</h3>
                    <p className="text-[10px] uppercase tracking-widest text-[#0f2744]/60">{labelize(item.color)}</p>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-[#0f2744]/10 flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-widest text-[#0f2744]">{labelize(item.formality)}</span>
                    <button 
                      onClick={() => void handleDelete(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-[10px] uppercase tracking-widest text-red-700 hover:underline transition-opacity"
                    >
                      Archive
                    </button>
                  </div>
                </div>
                
                {item.favorite && (
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-2 py-1 text-[9px] uppercase tracking-widest text-[#0f2744]">
                    Iconic
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
