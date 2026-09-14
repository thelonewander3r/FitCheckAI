import {
  TRY_ON_MIN_LUMA_STDDEV,
  TRY_ON_MIN_SHORT_SIDE,
  TRY_ON_PHOTO_EMPTY,
  TRY_ON_PHOTO_TOO_SMALL,
} from "@/lib/youcam/try-on-photo-messages";

export async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("empty result"));
        return;
      }
      const base64 = result.includes(",")
        ? (result.split(",")[1] ?? "")
        : result;
      if (!base64) {
        reject(new Error("empty result"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

async function rasterizeToCanvas(
  file: File,
  maxEdge: number,
): Promise<{
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = objectUrl;
    });

    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unsupported");
    ctx.drawImage(img, 0, 0, width, height);
    return { canvas, ctx, width, height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function canvasToJpegBase64(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const base64 = dataUrl.split(",")[1] ?? "";
  if (!base64) throw new Error("empty result");
  return base64;
}

/** Luminance standard deviation of RGBA pixel data (0–255). */
export function luminanceStdDev(data: Uint8ClampedArray): number {
  const pixelCount = data.length / 4;
  const step = pixelCount > 50_000 ? 4 : 1;
  let n = 0;
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < data.length; i += 4 * step) {
    const y = 0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!;
    sum += y;
    sumSq += y * y;
    n += 1;
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return Math.sqrt(Math.max(0, sumSq / n - mean * mean));
}

/**
 * Downscale for upload. Default maxEdge=1024 keeps common 4:3 / 16:9 interview
 * selfies at short side >=480 (YouCam SD skin) while staying well under 4096.
 * Does not enlarge images smaller than maxEdge.
 */
export async function downscaleToBase64(
  file: File,
  maxEdge = 1024,
): Promise<string> {
  const { canvas } = await rasterizeToCanvas(file, maxEdge);
  return canvasToJpegBase64(canvas);
}

/**
 * Downscale a try-on source photo and reject blanks or tiny frames
 * before the file is sent to the API.
 */
export async function downscaleTryOnPhoto(
  file: File,
  maxEdge = 1024,
): Promise<string> {
  const { canvas, ctx, width, height } = await rasterizeToCanvas(file, maxEdge);
  if (Math.min(width, height) < TRY_ON_MIN_SHORT_SIDE) {
    throw new Error(TRY_ON_PHOTO_TOO_SMALL);
  }
  const imageData = ctx.getImageData(0, 0, width, height);
  if (luminanceStdDev(imageData.data) < TRY_ON_MIN_LUMA_STDDEV) {
    throw new Error(TRY_ON_PHOTO_EMPTY);
  }
  return canvasToJpegBase64(canvas);
}
