import { COSMETIC_DISCLAIMER } from "../safety/skin-safety";
import type { SkinAnalysisResult } from "../../types/interview";
import type {
  ApparelTryOnInput,
  ApparelTryOnResult,
  SkinAnalysisInput,
  YouCamProvider,
} from "./types";

// ---------------------------------------------------------------------------
// Placeholder SVG data URLs
// ---------------------------------------------------------------------------

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Sniff MIME from base64 magic bytes; default image/jpeg. */
function sniffImageMime(base64: string): string {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("iVBOR")) return "image/png";
  if (base64.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}

/** Base64 alphabet check — prevents markup injection via user-supplied bytes. */
function isValidBase64(value: string): boolean {
  return value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

function makePlaceholderSvgDataUrl(
  label: string,
  userImageBase64?: string,
): string {
  const safeLabel = escapeXml(label);
  let body: string;
  if (userImageBase64 && isValidBase64(userImageBase64)) {
    const mime = sniffImageMime(userImageBase64);
    const href = escapeXml(`data:${mime};base64,${userImageBase64}`);
    body = `<image href="${href}" xlink:href="${href}" x="100" y="80" width="200" height="440" preserveAspectRatio="xMidYMid slice"/>
  <rect x="100" y="310" width="200" height="70" fill="rgba(0,0,0,0.45)"/>
  <text x="200" y="340" font-family="DM Sans, sans-serif" font-size="16" fill="#ffffff" text-anchor="middle">${safeLabel}</text>
  <text x="200" y="365" font-family="DM Sans, sans-serif" font-size="12" fill="#e2e8f0" text-anchor="middle">Mock VTO Preview</text>`;
  } else {
    body = `<rect x="100" y="80" width="200" height="440" rx="12" fill="#c5d0d8"/>
  <text x="200" y="340" font-family="DM Sans, sans-serif" font-size="16" fill="#4a5568" text-anchor="middle">${safeLabel}</text>
  <text x="200" y="365" font-family="DM Sans, sans-serif" font-size="12" fill="#718096" text-anchor="middle">Mock VTO Preview</text>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="400" height="600" viewBox="0 0 400 600">
  <rect width="400" height="600" fill="#e8eef2"/>
  ${body}
</svg>`;
  const encoded = Buffer.from(svg, "utf8").toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}

// ---------------------------------------------------------------------------
// Mock provider implementation
// ---------------------------------------------------------------------------

export class MockYouCamProvider implements YouCamProvider {
  async analyzeSkin(_input: SkinAnalysisInput): Promise<SkinAnalysisResult> {
    void _input;
    // Returns cosmetic-only, safe, deterministic observations — no medical language
    return {
      isMock: true,
      disclaimer: COSMETIC_DISCLAIMER,
      observations: [
        {
          id: "mock-obs-001",
          label: "Hydration level",
          severity: "low",
          guidance:
            "Staying well-hydrated in the days before your interview can help skin appear more even and refreshed.",
        },
        {
          id: "mock-obs-002",
          label: "Under-eye appearance",
          severity: "low",
          guidance:
            "Getting adequate sleep (7–9 hours) before your interview can reduce the appearance of under-eye shadows.",
        },
        {
          id: "mock-obs-003",
          label: "Visible pores",
          severity: "low",
          guidance:
            "A light, mattifying primer can help create a smooth, camera-friendly surface if desired.",
        },
      ],
      preparationSuggestions: [
        "Use a gentle, non-stripping cleanser the morning of your interview.",
        "Apply a lightweight moisturizer suited to your skin type about 20–30 minutes before any makeup or grooming products.",
        "If using concealer, choose a shade one level lighter than your foundation to brighten, not a heavy coverage product.",
        "Blotting papers are useful for keeping shine at bay during a long onsite interview day.",
        "For video interviews, a light powder or setting spray can reduce the appearance of shine under studio or overhead lighting.",
      ],
      lightingNotes: [
        "Warm-toned lighting (3000–4000 K) is generally flattering for most people on camera.",
        "Avoid cool fluorescent lighting directly overhead — it can create unflattering shadows.",
        "A softbox or ring light positioned at eye level diffuses light evenly.",
      ],
    };
  }

  async generateApparelTryOn(
    input: ApparelTryOnInput,
  ): Promise<ApparelTryOnResult> {
    return {
      renderedImageUrl: makePlaceholderSvgDataUrl(
        `Garment: ${input.garmentAssetId}`,
        input.userImageBase64,
      ),
      isMock: true,
      processingTimeMs: 0,
    };
  }
}
