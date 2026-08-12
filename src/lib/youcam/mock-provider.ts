import { COSMETIC_DISCLAIMER } from "@/lib/safety/skin-safety";
import type { SkinAnalysisResult } from "@/types/interview";
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

function makePlaceholderSvgDataUrl(label: string): string {
  const safeLabel = escapeXml(label);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
  <rect width="400" height="600" fill="#e8eef2"/>
  <rect x="100" y="80" width="200" height="440" rx="12" fill="#c5d0d8"/>
  <text x="200" y="340" font-family="DM Sans, sans-serif" font-size="16" fill="#4a5568" text-anchor="middle">${safeLabel}</text>
  <text x="200" y="365" font-family="DM Sans, sans-serif" font-size="12" fill="#718096" text-anchor="middle">Mock VTO Preview</text>
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
      ),
      isMock: true,
      processingTimeMs: 0,
    };
  }
}
