"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { downscaleToBase64, downscaleTryOnPhoto } from "@/lib/client/image-utils";
import {
  TRY_ON_PHOTO_EMPTY,
  TRY_ON_PHOTO_TOO_SMALL,
} from "@/lib/youcam/try-on-photo-messages";

const MAX_BYTES = 15 * 1024 * 1024;

interface Props {
  label: string;
  /** Called with downscaled base64, or undefined when the photo is cleared. */
  onPhoto: (base64: string | undefined) => void;
  /**
   * Longest edge after downscaling. Skin AI needs a short side >= 480px, so
   * portrait selfies are kept larger than the default.
   */
  maxEdge?: number;
  disabled?: boolean;
  /** Try-on rejects blank or tiny frames before they reach the API. */
  intent?: "try-on";
}

export function PhotoPicker({
  label,
  onPhoto,
  maxEdge,
  disabled,
  intent,
}: Props) {
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BYTES) {
      setError("Photo must be 15 MB or smaller.");
      setFileName("");
      onPhoto(undefined);
      e.target.value = "";
      return;
    }

    setError(null);
    setFileName(file.name);

    try {
      const base64 =
        intent === "try-on"
          ? await downscaleTryOnPhoto(file, maxEdge ?? 1024)
          : maxEdge
            ? await downscaleToBase64(file, maxEdge)
            : await downscaleToBase64(file);
      if (!base64) throw new Error("empty result");
      onPhoto(base64);
    } catch (err) {
      // Fail closed: never send an unprocessed file to the API.
      onPhoto(undefined);
      setFileName("");
      const message = err instanceof Error ? err.message : "";
      setError(
        intent === "try-on" &&
          (message === TRY_ON_PHOTO_TOO_SMALL || message === TRY_ON_PHOTO_EMPTY)
          ? message
          : "Could not read that photo. Use a JPEG, PNG, or WebP.",
      );
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[#c3ccd6] bg-white/70 p-4 text-left transition-colors hover:border-[#2a6f7f] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          className="h-6 w-6 shrink-0 text-[#718096]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
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
        <span className="text-sm text-[#53616d]">{fileName || label}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleChange}
        aria-label={label}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
