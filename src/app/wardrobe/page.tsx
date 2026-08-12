"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
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

const RATING_LABELS: Record<string, string> = {
  loved: "Loved",
  liked: "Liked",
  meh: "Meh",
};

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
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
      if (!res.ok) {
        setLoadError(data.error ?? "Failed to load wardrobe.");
        return;
      }
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
      const data = (await res.json()) as {
        records?: WornOutfitRecord[];
        profile?: StyleProfile;
      };
      setWornRecords(data.records ?? []);
      setStyleProfile(data.profile ?? null);
    } catch {
      // ignore — sections stay empty
    }
  }

  useEffect(() => {
    void fetchItems();
    void fetchWorn();
  }, []);

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
      setImageError(
        "Could not process this image. Please upload a JPEG, PNG, or WebP.",
      );
    }
  }

  function toggleSeason(season: Season) {
    setForm((prev) => {
      const has = prev.seasons.includes(season);
      if (has) {
        const next = prev.seasons.filter((s) => s !== season);
        return { ...prev, seasons: next.length > 0 ? next : ["any"] };
      }
      if (season === "any") {
        return { ...prev, seasons: ["any"] };
      }
      const withoutAny = prev.seasons.filter((s) => s !== "any");
      return { ...prev, seasons: [...withoutAny, season] };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.imageBase64) {
      setImageError("An image is required.");
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
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setSubmitError(data.error ?? "Failed to add item.");
        return;
      }
      setForm(EMPTY_FORM);
      setPreviewUrl(null);
      setShowForm(false);
      await fetchItems();
    } catch {
      setSubmitError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleFavorite(item: WardrobeItem) {
    try {
      const res = await fetch(`/api/wardrobe/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: !item.favorite }),
      });
      if (!res.ok) return;
      const updated = (await res.json()) as WardrobeItem;
      setItems((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i)),
      );
    } catch {
      // ignore — user can retry
    }
  }

  async function handleDelete(item: WardrobeItem) {
    const label = item.name || "this item";
    if (!window.confirm(`Delete ${label}?`)) return;
    try {
      const res = await fetch(`/api/wardrobe/${item.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) return;
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-16">
      <header className="border-b border-[#e2e8f0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/"
            className="font-serif text-base font-semibold text-[#0f2744] hover:text-[#2a6f7f] transition-colors"
          >
            InterviewReady AI
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/occasion"
              className="text-sm text-[#2a6f7f] hover:underline"
            >
              Plan an occasion
            </Link>
            <Link
              href="/interview"
              className="text-sm text-[#2a6f7f] hover:underline"
            >
              Start interview prep
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 pt-8 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-[#0f2744]">
              My Wardrobe
            </h1>
            <p className="mt-1 text-sm text-[#718096] max-w-xl">
              Capture your pieces one at a time — a photo, category, color, and
              formality — so we can build outfits from what you already own.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Cancel" : "Add item"}
          </Button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm space-y-5"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="wardrobe-image">Photo *</Label>
                <Input
                  id="wardrobe-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                />
                {imageError && (
                  <p className="text-xs text-red-500">{imageError}</p>
                )}
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="mt-2 h-40 w-40 rounded-lg object-cover border border-[#e2e8f0]"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wardrobe-name">Name (optional)</Label>
                <Input
                  id="wardrobe-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Navy blazer"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wardrobe-category">Category</Label>
                <Select
                  id="wardrobe-category"
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      category: e.target.value as WardrobeCategory,
                    }))
                  }
                  options={WARDROBE_CATEGORIES.map((c) => ({
                    value: c,
                    label: labelize(c),
                  }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wardrobe-color">Color</Label>
                <Select
                  id="wardrobe-color"
                  value={form.color}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      color: e.target.value as WardrobeColor,
                    }))
                  }
                  options={WARDROBE_COLORS.map((c) => ({
                    value: c,
                    label: labelize(c),
                  }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wardrobe-formality">Formality</Label>
                <Select
                  id="wardrobe-formality"
                  value={form.formality}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      formality: e.target.value as WardrobeFormality,
                    }))
                  }
                  options={WARDROBE_FORMALITY.map((f) => ({
                    value: f,
                    label: labelize(f),
                  }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Seasons</Label>
              <div className="flex flex-wrap gap-3">
                {WARDROBE_SEASONS.map((season) => (
                  <label
                    key={season}
                    className="flex items-center gap-1.5 text-sm text-[#0f2744]"
                  >
                    <input
                      type="checkbox"
                      checked={form.seasons.includes(season)}
                      onChange={() => toggleSeason(season)}
                      className="rounded border-[#c3ccd6]"
                    />
                    {labelize(season)}
                  </label>
                ))}
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-red-600" role="alert">
                {submitError}
              </p>
            )}

            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "Saving…" : "Save piece"}
            </Button>
          </form>
        )}

        {loading && (
          <p className="text-sm text-[#718096]">Loading your wardrobe…</p>
        )}

        {loadError && (
          <p className="text-sm text-red-600" role="alert">
            {loadError}
          </p>
        )}

        {!loading && !loadError && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#c3ccd6] bg-white px-6 py-14 text-center">
            <p className="font-serif text-lg text-[#0f2744]">
              Add your first piece — start with the items you wear most
            </p>
            <p className="mt-2 text-sm text-[#718096]">
              A few tops, bottoms, and one jacket go a long way.
            </p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/jpeg;base64,${item.imageBase64}`}
                  alt={item.name || item.category}
                  className="h-48 w-full object-cover"
                />
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-serif text-base font-semibold text-[#0f2744]">
                      {item.name || labelize(item.category)}
                    </h2>
                    <button
                      type="button"
                      onClick={() => void handleToggleFavorite(item)}
                      aria-label={
                        item.favorite ? "Remove favorite" : "Mark favorite"
                      }
                      className="text-lg leading-none text-amber-500 hover:opacity-80"
                    >
                      {item.favorite ? "★" : "☆"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{labelize(item.category)}</Badge>
                    <Badge variant="outline">{labelize(item.color)}</Badge>
                    <Badge variant="accent">{labelize(item.formality)}</Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => void handleDelete(item)}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}

        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#0f2744]">
            Recently worn
          </h2>
          {wornRecords.length === 0 ? (
            <p className="text-sm text-[#718096]">
              No worn outfits yet — mark outfits as worn from an occasion page.
            </p>
          ) : (
            <ul className="space-y-3">
              {wornRecords.slice(0, 5).map((record) => (
                <li
                  key={record.id}
                  className="flex flex-wrap items-start justify-between gap-2 border-b border-[#e2e8f0] pb-3 last:border-0 last:pb-0"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-medium text-[#0f2744]">
                      {record.wornDate}
                      {record.eventType
                        ? ` · ${labelize(record.eventType)}`
                        : ""}
                    </p>
                    <p className="text-sm text-[#4a5568]">
                      {record.items
                        .map((i) => i.name)
                        .filter(Boolean)
                        .join(", ") || "Outfit"}
                    </p>
                  </div>
                  {record.rating && (
                    <Badge variant="outline" className="shrink-0">
                      {RATING_LABELS[record.rating] ?? record.rating}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[#0f2744]">
            Your style profile
          </h2>
          {!styleProfile || styleProfile.totalWorn === 0 ? (
            <p className="text-sm text-[#718096]">
              Wear a few outfits and we&apos;ll learn your style.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#718096]">
                  Top colors
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {styleProfile.colors.length === 0 ? (
                    <span className="text-sm text-[#718096]">—</span>
                  ) : (
                    styleProfile.colors.map(({ color, count }) => (
                      <Badge key={color} variant="outline">
                        {labelize(color)} ({count})
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[#718096]">
                  Top categories
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {styleProfile.categories.length === 0 ? (
                    <span className="text-sm text-[#718096]">—</span>
                  ) : (
                    styleProfile.categories.map(({ category, count }) => (
                      <Badge key={category} variant="secondary">
                        {labelize(category)} ({count})
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <p className="text-sm text-[#4a5568]">
                Typical formality:{" "}
                <span className="font-medium text-[#0f2744]">
                  {labelize(formalityLevelToLabel(styleProfile.formality))}
                </span>
              </p>
              <p className="text-sm text-[#718096]">
                {styleProfile.totalWorn} outfit
                {styleProfile.totalWorn === 1 ? "" : "s"} worn
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
