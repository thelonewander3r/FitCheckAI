/**
 * Live YouCam / Perfect Corp provider.
 *
 * Uses global fetch + Buffer only. Never logs API keys, Authorization headers,
 * signed URLs, file IDs, or image payloads.
 */

import { COSMETIC_DISCLAIMER } from "../safety/skin-safety";
import type { SkinAnalysisResult, SkinObservation } from "../../types/interview";
import type {
  ApparelTryOnInput,
  ApparelTryOnResult,
  SkinAnalysisInput,
  YouCamConfig,
  YouCamProvider,
} from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_POLL_INTERVAL_MS = 1_500;
const DEFAULT_SKIN_ACTIONS = ["texture", "pore", "redness", "radiance"] as const;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_ERROR_MESSAGE_LEN = 200;
const MAX_IMAGE_LONG_SIDE = 4096;
const MIN_SKIN_SD_SHORT_SIDE = 480;
const MIN_SKIN_HD_SHORT_SIDE = 1080;
const MIN_APPAREL_LONG_SIDE = 128;

/** Perfect Corp YCE storage hosts: yce-<region>.s3-accelerate.amazonaws.com */
const YCE_STORAGE_HOST_RE =
  /^yce-[a-z0-9-]+\.s3-accelerate\.amazonaws\.com$/i;

const IN_PROGRESS_TASK_STATUSES = new Set([
  "running",
  "pending",
  "queued",
  "processing",
]);

const KNOWN_FAILURE_TASK_STATUSES = new Set([
  "error",
  "failed",
  "cancelled",
  "expired",
]);

/** Known SD skin-analysis actions (Perfect Corp AI Skin Analysis). */
const SD_SKIN_ACTIONS = new Set([
  "acne",
  "age_spot",
  "blackhead",
  "dark_circle",
  "droopy_lower_eyelid",
  "droopy_upper_eyelid",
  "eye_bag",
  "firmness",
  "moisture",
  "mole",
  "oiliness",
  "pore",
  "radiance",
  "redness",
  "sensitivity",
  "texture",
  "wrinkle",
  "crows_feet",
  "forehead_wrinkle",
  "glabella_wrinkle",
  "nasolabial_fold",
  "tear_trough",
  "all",
  "skin_age",
]);

const HD_SKIN_ACTIONS = new Set(
  [...SD_SKIN_ACTIONS]
    .filter((a) => a !== "all" && a !== "skin_age")
    .map((a) => `hd_${a}`),
);

const FIXED_PREPARATION_SUGGESTIONS = [
  "Use a gentle cleanser the morning of your interview.",
  "Apply a lightweight moisturizer about 20–30 minutes before any grooming products.",
  "If using concealer, choose a shade close to your natural tone for a camera-friendly finish.",
  "Blotting papers can help manage shine during a long interview day.",
  "For video interviews, a light powder or setting spray can reduce visible shine under bright lights.",
];

const FIXED_LIGHTING_NOTES = [
  "Warm-toned lighting (around 3000–4000 K) is generally flattering on camera.",
  "Avoid cool fluorescent light directly overhead — it can create harsh shadows.",
  "A soft light source at eye level helps create an even, camera-ready look.",
];

const DISPLAY_LABELS: Record<string, string> = {
  texture: "Skin texture",
  pore: "Pore visibility",
  redness: "Evenness",
  radiance: "Radiance",
  oiliness: "Surface shine",
  moisture: "Hydration appearance",
  wrinkle: "Fine lines",
  acne: "Blemish visibility",
  age_spot: "Tone variation",
  blackhead: "Congested areas",
  dark_circle: "Under-eye appearance",
  eye_bag: "Under-eye fullness",
  firmness: "Skin firmness appearance",
  sensitivity: "Skin calmness",
  mole: "Spot visibility",
  crows_feet: "Outer eye lines",
  forehead_wrinkle: "Forehead lines",
  glabella_wrinkle: "Between-brow lines",
  nasolabial_fold: "Smile-line appearance",
  tear_trough: "Under-eye hollow appearance",
  droopy_upper_eyelid: "Upper eyelid appearance",
  droopy_lower_eyelid: "Lower eyelid appearance",
};

const GUIDANCE_BY_TYPE: Record<string, string> = {
  texture:
    "A lightweight moisturizer and a soft-focus primer can help skin look smoother on camera.",
  pore:
    "A mattifying primer or light powder can minimize the appearance of pores under bright light.",
  redness:
    "A color-correcting tint or light foundation can help even out temporary flush for photos and video.",
  radiance:
    "Gentle exfoliation the night before and a hydrating serum can support a fresher-looking finish.",
  oiliness:
    "Blotting papers and a light setting powder help keep shine under control during long sessions.",
  moisture:
    "Apply moisturizer earlier so it settles before makeup or camera time.",
  wrinkle:
    "Hydrating products and soft, front-facing light can soften the look of fine lines on camera.",
  acne:
    "Spot-concealing and avoiding heavy product layers can keep the focus on a clean camera look.",
  age_spot:
    "A light, even base product can help tone look more uniform under interview lighting.",
  blackhead:
    "A gentle cleansing routine and mattifying finish can create a smoother camera-ready surface.",
  dark_circle:
    "Adequate rest and a brightening concealer can soften under-eye shadows on camera.",
  eye_bag:
    "Cool compresses and soft upward lighting can reduce the look of under-eye fullness.",
  firmness:
    "Hydration and good posture under soft light support a refreshed camera appearance.",
  sensitivity:
    "Stick to familiar, fragrance-light products before interview day to keep skin looking calm.",
  mole: "Even lighting and a natural base help keep attention on your overall presentation.",
  crows_feet:
    "Hydrating eye cream and soft side lighting can soften the look of outer eye lines.",
  forehead_wrinkle:
    "A light moisturizer and relaxed expression help forehead lines read softer on camera.",
  glabella_wrinkle:
    "Soft front light and a hydrating primer can minimize the look of between-brow lines.",
  nasolabial_fold:
    "A sheer base and balanced lighting can soften the appearance of smile lines.",
  tear_trough:
    "A peach-toned corrector and eye-level light can brighten the under-eye area.",
  droopy_upper_eyelid:
    "Curl lashes lightly and use soft upward light to open the eye area on camera.",
  droopy_lower_eyelid:
    "Hydrating eye care and front-facing light can create a fresher under-eye look.",
};

const DEFAULT_GUIDANCE =
  "Simple grooming and soft, even lighting can support a polished camera-ready appearance.";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class YouCamConfigurationError extends Error {
  constructor(message: string) {
    super(`YouCamConfigurationError: ${message}`);
    this.name = "YouCamConfigurationError";
  }
}

export class YouCamApiError extends Error {
  readonly status?: number;
  readonly errorCode?: string | undefined;
  readonly taskId?: string | undefined;
  readonly taskStatus?: string | undefined;

  constructor(
    message: string,
    options?: {
      status?: number;
      errorCode?: string;
      taskId?: string;
      taskStatus?: string;
    },
  ) {
    super(`YouCamApiError: ${message}`);
    this.name = "YouCamApiError";
    if (options?.status !== undefined) this.status = options.status;
    if (options?.errorCode !== undefined) this.errorCode = options.errorCode;
    if (options?.taskId !== undefined) this.taskId = options.taskId;
    if (options?.taskStatus !== undefined) this.taskStatus = options.taskStatus;
  }
}

// ---------------------------------------------------------------------------
// URL / transport helpers (exported for proxy + tests)
// ---------------------------------------------------------------------------

/**
 * Parse and validate an https URL with no embedded credentials.
 * Returns the parsed URL or null when invalid (never echoes the input).
 */
export function parseHttpsUrlNoCredentials(raw: string): URL | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  return parsed;
}

/** True when host matches Perfect Corp YCE S3 accelerate storage pattern. */
export function isTrustedYceStorageHost(hostname: string): boolean {
  return YCE_STORAGE_HOST_RE.test(hostname);
}

/**
 * Validate a YCE storage https URL (upload or result). Throws a generic
 * YouCamApiError on failure — never includes the URL in the message.
 */
export function assertTrustedYceHttpsUrl(raw: string): string {
  const parsed = parseHttpsUrlNoCredentials(raw);
  if (!parsed || !isTrustedYceStorageHost(parsed.hostname)) {
    throw new YouCamApiError("Untrusted or invalid image URL.");
  }
  return parsed.toString();
}

/**
 * Validate live API base URL: https, no credentials.
 * Throws YouCamConfigurationError for invalid values.
 */
export function assertLiveApiBaseUrl(raw: string): string {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new YouCamConfigurationError(
      "YOUCAM_BASE_URL is missing or empty. Consult the YouCam API documentation for the correct base URL.",
    );
  }
  const parsed = parseHttpsUrlNoCredentials(raw.trim());
  if (!parsed) {
    throw new YouCamConfigurationError(
      "YOUCAM_BASE_URL must be an https URL with no embedded credentials.",
    );
  }
  return raw.trim().replace(/\/+$/, "");
}

function isAllowedSignedUploadHeader(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower === "content-type" || lower === "content-length") return true;
  if (lower.startsWith("x-amz-")) return true;
  return false;
}

function buildSignedUploadHeaders(
  raw: Record<string, unknown> | undefined,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!raw) return headers;
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "string") continue;
    if (!isAllowedSignedUploadHeader(key)) continue;
    headers[key] = value;
  }
  return headers;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeErrorDetail(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_ERROR_MESSAGE_LEN) return undefined;
  if (/bearer\s+/i.test(trimmed) || /authorization\s*[:=]/i.test(trimmed)) {
    return undefined;
  }
  if (/https?:\/\//i.test(trimmed)) return undefined;
  if (/\b(file|task)[_-]?id\b/i.test(trimmed)) return undefined;
  // Long token-like runs (API keys, signed query fragments, etc.)
  if (/[A-Za-z0-9_\-+/=]{40,}/.test(trimmed)) return undefined;
  return trimmed;
}

function safeErrorCode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(trimmed)
    ? trimmed
    : undefined;
}

function remainingMs(deadline: number): number {
  const left = deadline - Date.now();
  if (left <= 0) {
    throw new YouCamApiError("Request timed out.");
  }
  return left;
}

function extractBase64Payload(imageBase64: string): string {
  const trimmed = imageBase64.trim();
  if (!trimmed) {
    throw new YouCamConfigurationError("Image data is empty.");
  }
  const dataUrlMatch = /^data:[^;]+;base64,(.+)$/i.exec(trimmed);
  return dataUrlMatch?.[1] ?? trimmed;
}

function isValidBase64(value: string): boolean {
  if (!value || value.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

type ImageFormat = { contentType: string; extension: string };

function sniffImageFormat(base64: string): ImageFormat {
  if (base64.startsWith("/9j/")) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (base64.startsWith("iVBOR")) {
    return { contentType: "image/png", extension: "png" };
  }
  if (base64.startsWith("UklGR")) {
    return { contentType: "image/webp", extension: "webp" };
  }
  throw new YouCamConfigurationError(
    "Unsupported image format. Provide a JPEG, PNG, or WebP image.",
  );
}

type ImageDimensions = { width: number; height: number };

/**
 * Parse JPEG dimensions from SOF markers in decoded bytes.
 * Returns null when the buffer is truncated/malformed or has no SOF yet.
 */
function sniffJpegDimensions(bytes: Buffer): ImageDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= bytes.length) return null;

    const marker = bytes[offset]!;
    offset += 1;

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      continue;
    }

    if (offset + 1 >= bytes.length) return null;
    const segmentLength = (bytes[offset]! << 8) | bytes[offset + 1]!;
    if (segmentLength < 2) return null;

    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;

    if (isSof) {
      if (offset + 6 >= bytes.length) return null;
      const height = (bytes[offset + 3]! << 8) | bytes[offset + 4]!;
      const width = (bytes[offset + 5]! << 8) | bytes[offset + 6]!;
      if (width < 1 || height < 1) return null;
      return { width, height };
    }

    offset += segmentLength;
  }

  return null;
}

/**
 * Parse PNG dimensions from the IHDR chunk in decoded bytes.
 * Returns null when the buffer is truncated/malformed or IHDR is missing.
 */
function sniffPngDimensions(bytes: Buffer): ImageDimensions | null {
  if (bytes.length < 24) return null;
  if (
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47 ||
    bytes[4] !== 0x0d ||
    bytes[5] !== 0x0a ||
    bytes[6] !== 0x1a ||
    bytes[7] !== 0x0a
  ) {
    return null;
  }
  if (bytes.toString("ascii", 12, 16) !== "IHDR") return null;

  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width < 1 || height < 1) return null;
  return { width, height };
}

/**
 * Parse WebP RIFF dimensions from VP8 / VP8L / VP8X chunks.
 */
function sniffWebpDimensions(bytes: Buffer): ImageDimensions | null {
  if (bytes.length < 16) return null;
  if (bytes.toString("ascii", 0, 4) !== "RIFF") return null;
  if (bytes.toString("ascii", 8, 12) !== "WEBP") return null;

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const fourcc = bytes.toString("ascii", offset, offset + 4);
    const chunkSize = bytes.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkSize;
    if (dataEnd > bytes.length) return null;

    if (fourcc === "VP8X" && chunkSize >= 10) {
      const w =
        1 +
        (bytes[dataStart + 4]! |
          (bytes[dataStart + 5]! << 8) |
          (bytes[dataStart + 6]! << 16));
      const h =
        1 +
        (bytes[dataStart + 7]! |
          (bytes[dataStart + 8]! << 8) |
          (bytes[dataStart + 9]! << 16));
      if (w < 1 || h < 1) return null;
      return { width: w, height: h };
    }

    if (fourcc === "VP8 " && chunkSize >= 10) {
      // Lossy bitstream: skip 3-byte frame tag; expect 0x9d 0x01 0x2a sync.
      if (
        bytes[dataStart + 3] === 0x9d &&
        bytes[dataStart + 4] === 0x01 &&
        bytes[dataStart + 5] === 0x2a
      ) {
        const rawW = bytes[dataStart + 6]! | (bytes[dataStart + 7]! << 8);
        const rawH = bytes[dataStart + 8]! | (bytes[dataStart + 9]! << 8);
        const width = rawW & 0x3fff;
        const height = rawH & 0x3fff;
        if (width < 1 || height < 1) return null;
        return { width, height };
      }
    }

    if (fourcc === "VP8L" && chunkSize >= 5) {
      // Signature 0x2f, then 14-bit width-1 / height-1 packed in next 4 bytes.
      if (bytes[dataStart] === 0x2f) {
        const b1 = bytes[dataStart + 1]!;
        const b2 = bytes[dataStart + 2]!;
        const b3 = bytes[dataStart + 3]!;
        const b4 = bytes[dataStart + 4]!;
        const width = 1 + (b1 | ((b2 & 0x3f) << 8));
        const height = 1 + (((b2 & 0xc0) >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10));
        if (width < 1 || height < 1) return null;
        return { width, height };
      }
    }

    // Chunk data is padded to even size.
    offset = dataEnd + (chunkSize % 2);
  }

  return null;
}

function parseImageDimensions(
  bytes: Buffer,
  contentType: string,
): ImageDimensions {
  let dims: ImageDimensions | null = null;
  if (contentType === "image/jpeg") dims = sniffJpegDimensions(bytes);
  else if (contentType === "image/png") dims = sniffPngDimensions(bytes);
  else if (contentType === "image/webp") dims = sniffWebpDimensions(bytes);

  if (!dims) {
    throw new YouCamConfigurationError(
      "Unable to read image dimensions. Provide a valid JPEG, PNG, or WebP image. No upload was attempted.",
    );
  }
  return dims;
}

function shortSide(dims: ImageDimensions): number {
  return Math.min(dims.width, dims.height);
}

function longSide(dims: ImageDimensions): number {
  return Math.max(dims.width, dims.height);
}

/**
 * Decode a supported image for fail-closed dimension checks.
 * Throws YouCamConfigurationError before any network I/O on failure.
 */
function decodeImageForDimensions(imageBase64: string): {
  bytes: Buffer;
  contentType: string;
} {
  const payload = extractBase64Payload(imageBase64);
  if (!isValidBase64(payload)) {
    throw new YouCamConfigurationError("Image data is not valid base64.");
  }
  const format = sniffImageFormat(payload);
  const bytes = Buffer.from(payload, "base64");
  if (bytes.length === 0) {
    throw new YouCamConfigurationError("Image data is empty after decoding.");
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new YouCamConfigurationError(
      "Image exceeds the 10MB size limit for YouCam uploads.",
    );
  }
  return { bytes, contentType: format.contentType };
}

function assertSkinImageDimensions(
  imageBase64: string,
  skinActions: string[],
): void {
  const decoded = decodeImageForDimensions(imageBase64);
  const dims = parseImageDimensions(decoded.bytes, decoded.contentType);

  const hdOnly = skinActions.every((action) => HD_SKIN_ACTIONS.has(action));
  const minShort = hdOnly ? MIN_SKIN_HD_SHORT_SIDE : MIN_SKIN_SD_SHORT_SIDE;
  const short = shortSide(dims);
  const long = longSide(dims);

  if (short < minShort || long > MAX_IMAGE_LONG_SIDE) {
    throw new YouCamConfigurationError(
      `Skin analysis image is ${dims.width}x${dims.height}px; required short side >= ${minShort}px and long side <= ${MAX_IMAGE_LONG_SIDE}px for the configured skin actions. No upload was attempted.`,
    );
  }
}

function assertApparelImageDimensions(
  imageBase64: string,
  role: "source" | "garment",
): void {
  const decoded = decodeImageForDimensions(imageBase64);
  const dims = parseImageDimensions(decoded.bytes, decoded.contentType);

  const long = longSide(dims);
  if (long < MIN_APPAREL_LONG_SIDE || long > MAX_IMAGE_LONG_SIDE) {
    throw new YouCamConfigurationError(
      `AI Clothes ${role} image is ${dims.width}x${dims.height}px; required long side >= ${MIN_APPAREL_LONG_SIDE}px and <= ${MAX_IMAGE_LONG_SIDE}px. No upload was attempted.`,
    );
  }
}

function normalizeSkinActions(actions: string[]): string[] {
  if (actions.length === 0) {
    throw new YouCamConfigurationError("skinActions must not be empty.");
  }

  const normalized = actions.map((a) => a.trim()).filter((a) => a.length > 0);
  if (normalized.length === 0) {
    throw new YouCamConfigurationError("skinActions must not be empty.");
  }

  let hasSd = false;
  let hasHd = false;

  for (const action of normalized) {
    const isHd = HD_SKIN_ACTIONS.has(action);
    const isSd = SD_SKIN_ACTIONS.has(action);

    if (!isHd && !isSd) {
      throw new YouCamConfigurationError(
        `Unknown skin analysis action: ${action}`,
      );
    }
    if (isHd) hasHd = true;
    if (isSd) hasSd = true;
  }

  if (hasHd && hasSd) {
    throw new YouCamConfigurationError(
      "skinActions must not mix HD (hd_*) and SD actions.",
    );
  }

  return normalized;
}

function scoreToSeverity(score: number): SkinObservation["severity"] {
  if (score >= 70) return "low";
  if (score >= 40) return "moderate";
  return "notable";
}

function displayLabelForType(type: string): string {
  if (DISPLAY_LABELS[type]) return DISPLAY_LABELS[type];
  if (!/^[a-z][a-z0-9_]*$/i.test(type)) return "Appearance note";
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function guidanceForType(type: string): string {
  return GUIDANCE_BY_TYPE[type] ?? DEFAULT_GUIDANCE;
}

function pickNumericScore(entry: Record<string, unknown>): number | undefined {
  for (const key of ["ui_score", "score", "raw_score"] as const) {
    const value = entry[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function mapSkinOutputs(output: unknown[]): SkinObservation[] {
  const observations: SkinObservation[] = [];

  for (let i = 0; i < output.length; i++) {
    const item = output[i];
    if (!isRecord(item)) continue;

    const type = typeof item["type"] === "string" ? item["type"] : "";
    if (!type || type === "all" || type === "skin_age") continue;

    const baseType = type.startsWith("hd_") ? type.slice(3) : type;
    const score = pickNumericScore(item);
    if (score === undefined) continue;

    const region = typeof item["region"] === "string" ? item["region"] : undefined;
    const id = region ? `${type}-${region}` : `${type}-${i}`;

    observations.push({
      id,
      label: displayLabelForType(baseType),
      severity: scoreToSeverity(score),
      guidance: guidanceForType(baseType),
    });
  }

  return observations;
}

function extractTaskId(body: unknown): string {
  if (!isRecord(body)) {
    throw new YouCamApiError("Malformed task create response.");
  }
  const data = body["data"];
  if (isRecord(data) && typeof data["task_id"] === "string" && data["task_id"]) {
    return data["task_id"];
  }
  if (typeof body["task_id"] === "string" && body["task_id"]) {
    return body["task_id"];
  }
  throw new YouCamApiError("Task create response missing task_id.");
}

function extractTaskStatus(body: unknown): {
  status: string;
  data: Record<string, unknown>;
  root: Record<string, unknown>;
} {
  if (!isRecord(body)) {
    throw new YouCamApiError("Malformed task status response.");
  }
  const data = isRecord(body["data"]) ? body["data"] : body;
  const rawStatus =
    (typeof data["task_status"] === "string" && data["task_status"]) ||
    (typeof body["task_status"] === "string" && body["task_status"]) ||
    "";
  if (!rawStatus) {
    throw new YouCamApiError("Task status response missing task_status.");
  }
  return { status: rawStatus.toLowerCase(), data, root: body };
}

function extractClothesResultUrl(
  data: Record<string, unknown>,
  root: Record<string, unknown>,
): string {
  const fromResults = (results: unknown): string | undefined => {
    if (isRecord(results) && typeof results["url"] === "string") {
      return results["url"];
    }
    return undefined;
  };

  const url =
    fromResults(data["results"]) ??
    fromResults(root["results"]) ??
    (typeof data["url"] === "string" ? data["url"] : undefined) ??
    (typeof root["url"] === "string" ? root["url"] : undefined);

  if (!url) {
    throw new YouCamApiError("Clothes task success response missing result URL.");
  }
  return assertTrustedYceHttpsUrl(url);
}

// ---------------------------------------------------------------------------
// Live provider
// ---------------------------------------------------------------------------

export class LiveYouCamProvider implements YouCamProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly pollIntervalMs: number;
  private readonly skinActions: string[];

  constructor(config: YouCamConfig) {
    if (!config.apiKey) {
      throw new YouCamConfigurationError(
        "YOUCAM_API_KEY is missing or empty. Set it as an environment variable before using the live provider.",
      );
    }

    this.apiKey = config.apiKey;
    this.baseUrl = assertLiveApiBaseUrl(config.baseUrl);
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.skinActions = normalizeSkinActions(
      config.skinActions ?? [...DEFAULT_SKIN_ACTIONS],
    );

    if (this.timeoutMs < 1) {
      throw new YouCamConfigurationError("timeoutMs must be a positive number.");
    }
    if (this.pollIntervalMs < 1) {
      throw new YouCamConfigurationError("pollIntervalMs must be a positive number.");
    }
  }

  async analyzeSkin(input: SkinAnalysisInput): Promise<SkinAnalysisResult> {
    const deadline = Date.now() + this.timeoutMs;
    assertSkinImageDimensions(input.imageBase64, this.skinActions);

    const fileId = await this.uploadBase64Image(
      input.imageBase64,
      "skin-source",
      deadline,
    );

    const createBody = await this.requestJson(
      "POST",
      "/s2s/v2.1/task/skin-analysis",
      {
        src_file_id: fileId,
        dst_actions: this.skinActions,
        format: "json",
      },
      remainingMs(deadline),
    );
    const taskId = extractTaskId(createBody);

    const pollBody = await this.pollTask(
      "/s2s/v2.1/task/skin-analysis",
      taskId,
      deadline,
    );
    const { data } = extractTaskStatus(pollBody);

    const results = isRecord(data["results"]) ? data["results"] : undefined;
    const output = results && Array.isArray(results["output"]) ? results["output"] : [];
    const observations = mapSkinOutputs(output);

    return {
      isMock: false,
      disclaimer: COSMETIC_DISCLAIMER,
      observations,
      preparationSuggestions: [...FIXED_PREPARATION_SUGGESTIONS],
      lightingNotes: [...FIXED_LIGHTING_NOTES],
    };
  }

  async generateApparelTryOn(
    input: ApparelTryOnInput,
  ): Promise<ApparelTryOnResult> {
    const started = Date.now();
    const deadline = Date.now() + this.timeoutMs;

    if (!input.userImageBase64?.trim()) {
      throw new YouCamConfigurationError(
        "Live AI Clothes requires a user image (userImageBase64).",
      );
    }
    if (!input.garmentImageBase64?.trim()) {
      throw new YouCamConfigurationError(
        "Live AI Clothes requires a garment reference image (garmentImageBase64). garmentAssetId is an app identifier and cannot be sent as a YouCam file ID.",
      );
    }

    assertApparelImageDimensions(input.userImageBase64, "source");
    assertApparelImageDimensions(input.garmentImageBase64, "garment");

    const srcFileId = await this.uploadBase64Image(
      input.userImageBase64,
      "clothes-source",
      deadline,
    );
    const refFileId = await this.uploadBase64Image(
      input.garmentImageBase64,
      "clothes-garment",
      deadline,
    );

    const createBody = await this.requestJson(
      "POST",
      "/s2s/v2.0/task/cloth-v4",
      {
        src_file_id: srcFileId,
        ref_file_id: refFileId,
        garment_category: input.garmentCategory ?? "auto",
      },
      remainingMs(deadline),
    );
    const taskId = extractTaskId(createBody);

    const pollBody = await this.pollTask(
      "/s2s/v2.0/task/cloth-v4",
      taskId,
      deadline,
    );
    const { data, root } = extractTaskStatus(pollBody);
    const url = extractClothesResultUrl(data, root);

    return {
      renderedImageUrl: url,
      isMock: false,
      processingTimeMs: Date.now() - started,
    };
  }

  // -------------------------------------------------------------------------
  // Private HTTP helpers
  // -------------------------------------------------------------------------

  private async requestJson(
    method: string,
    path: string,
    body?: unknown,
    timeoutBudgetMs?: number,
  ): Promise<unknown> {
    const timeout = timeoutBudgetMs ?? this.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });

      const text = await response.text();
      let parsed: unknown;
      try {
        parsed = text ? JSON.parse(text) : {};
      } catch {
        throw new YouCamApiError("API returned non-JSON response.", {
          status: response.status,
        });
      }

      if (!response.ok) {
        const record = isRecord(parsed) ? parsed : {};
        const data = isRecord(record["data"]) ? record["data"] : {};
        const errorCode =
          safeErrorCode(record["error_code"]) ??
          safeErrorCode(data["error_code"]);
        const detail =
          safeErrorDetail(record["message"]) ??
          safeErrorDetail(record["error"]) ??
          safeErrorDetail(data["message"]) ??
          safeErrorDetail(data["error"]);

        throw new YouCamApiError(
          detail
            ? `HTTP ${response.status}: ${detail}`
            : `HTTP ${response.status}`,
          { status: response.status, errorCode },
        );
      }

      return parsed;
    } catch (err) {
      if (err instanceof YouCamApiError || err instanceof YouCamConfigurationError) {
        throw err;
      }
      if (err instanceof Error && err.name === "AbortError") {
        throw new YouCamApiError("Request timed out.");
      }
      throw new YouCamApiError("Network request failed.");
    } finally {
      clearTimeout(timer);
    }
  }

  private async uploadBase64Image(
    imageBase64: string,
    name: string,
    deadline: number,
  ): Promise<string> {
    const payload = extractBase64Payload(imageBase64);
    if (!isValidBase64(payload)) {
      throw new YouCamConfigurationError("Image data is not valid base64.");
    }

    const format = sniffImageFormat(payload);
    const bytes = Buffer.from(payload, "base64");
    if (bytes.length === 0) {
      throw new YouCamConfigurationError("Image data is empty after decoding.");
    }
    if (bytes.length > MAX_IMAGE_BYTES) {
      throw new YouCamConfigurationError(
        "Image exceeds the 10MB size limit for YouCam uploads.",
      );
    }

    const fileName = `${name}.${format.extension}`;
    const meta = await this.requestJson(
      "POST",
      "/s2s/v2.0/file",
      {
        files: [
          {
            content_type: format.contentType,
            file_name: fileName,
            file_size: bytes.length,
          },
        ],
      },
      remainingMs(deadline),
    );

    if (!isRecord(meta)) {
      throw new YouCamApiError("Malformed file API response.");
    }
    const data = isRecord(meta["data"]) ? meta["data"] : undefined;
    const files = data && Array.isArray(data["files"]) ? data["files"] : undefined;
    const first = files && isRecord(files[0]) ? files[0] : undefined;
    if (!first || typeof first["file_id"] !== "string" || !first["file_id"]) {
      throw new YouCamApiError("File API response missing file_id.");
    }

    const requests = Array.isArray(first["requests"]) ? first["requests"] : [];
    const uploadReq = isRecord(requests[0]) ? requests[0] : undefined;
    if (
      !uploadReq ||
      typeof uploadReq["url"] !== "string" ||
      !uploadReq["url"] ||
      typeof uploadReq["method"] !== "string"
    ) {
      throw new YouCamApiError("File API response missing signed upload request.");
    }

    if (uploadReq["method"].toUpperCase() !== "PUT") {
      throw new YouCamApiError("Signed upload method must be PUT.");
    }

    let uploadUrl: string;
    try {
      uploadUrl = assertTrustedYceHttpsUrl(uploadReq["url"]);
    } catch {
      throw new YouCamApiError("Signed upload URL is untrusted or invalid.");
    }

    const uploadHeaders = buildSignedUploadHeaders(
      isRecord(uploadReq["headers"]) ? uploadReq["headers"] : undefined,
    );

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remainingMs(deadline));
    try {
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: uploadHeaders,
        body: bytes,
        signal: controller.signal,
      });

      if (!uploadResponse.ok) {
        throw new YouCamApiError(
          `Signed upload failed with HTTP ${uploadResponse.status}`,
          { status: uploadResponse.status },
        );
      }
    } catch (err) {
      if (err instanceof YouCamApiError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new YouCamApiError("Signed upload timed out.");
      }
      throw new YouCamApiError("Signed upload network failure.");
    } finally {
      clearTimeout(timer);
    }

    return first["file_id"];
  }

  private async pollTask(
    path: string,
    taskId: string,
    deadline: number,
  ): Promise<unknown> {
    const encodedId = encodeURIComponent(taskId);
    const statusPath = `${path}/${encodedId}`;

    for (;;) {
      const body = await this.requestJson(
        "GET",
        statusPath,
        undefined,
        remainingMs(deadline),
      );
      const { status, data, root } = extractTaskStatus(body);

      if (status === "success") {
        return root;
      }

      if (IN_PROGRESS_TASK_STATUSES.has(status)) {
        const sleepMs = Math.min(
          this.pollIntervalMs,
          Math.max(1, deadline - Date.now()),
        );
        if (deadline - Date.now() <= 0) {
          throw new YouCamApiError("Task polling timed out.", { taskId });
        }
        await sleep(sleepMs);
        continue;
      }

      // Known failures and any unknown status are terminal — do not keep polling.
      const results = isRecord(data["results"]) ? data["results"] : {};
      const detail =
        KNOWN_FAILURE_TASK_STATUSES.has(status)
          ? (safeErrorDetail(data["error"]) ??
            safeErrorDetail(data["message"]) ??
            safeErrorDetail(results["error"]) ??
            safeErrorDetail(results["message"]))
          : undefined;
      const errorCode = safeErrorCode(data["error_code"]);

      throw new YouCamApiError(
        detail ? `Task failed: ${detail}` : "Task failed.",
        { taskId, taskStatus: status, errorCode },
      );
    }
  }
}
