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

/**
 * Downscale for upload. Default maxEdge=1024 keeps common 4:3 / 16:9 interview
 * selfies at short side >=480 (YouCam SD skin) while staying well under 4096.
 * Does not enlarge images smaller than maxEdge.
 */
export async function downscaleToBase64(
  file: File,
  maxEdge = 1024,
): Promise<string> {
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

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const base64 = dataUrl.split(",")[1] ?? "";
    if (!base64) throw new Error("empty result");
    return base64;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
