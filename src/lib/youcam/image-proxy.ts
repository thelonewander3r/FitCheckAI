/**
 * Shared proxy for live YouCam (YCE) result images.
 *
 * Live try-on results are temporary signed URLs on Perfect Corp storage. They
 * are kept server-side and served through an app-owned path so the signed URL
 * never reaches the browser and never appears in an error body.
 */

import { NextResponse } from "next/server";
import {
  assertTrustedYceHttpsUrl,
  isTrustedYceStorageHost,
  parseHttpsUrlNoCredentials,
} from "@/lib/youcam/live-provider";

const PROXY_TIMEOUT_MS = 15_000;
const MAX_PROXY_BYTES = 10 * 1024 * 1024;

function safeImageContentType(raw: string | null): string | null {
  if (!raw) return null;
  const base = raw.split(";")[0]?.trim().toLowerCase() ?? "";
  if (
    base === "image/jpeg" ||
    base === "image/jpg" ||
    base === "image/png" ||
    base === "image/webp" ||
    base === "image/gif"
  ) {
    return base === "image/jpg" ? "image/jpeg" : base;
  }
  return null;
}

async function readBoundedBody(
  response: Response,
  maxBytes: number,
): Promise<Buffer | null> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(Buffer.from(value));
    }
    return total > 0 ? Buffer.concat(chunks, total) : null;
  } finally {
    reader.releaseLock();
  }
}

function notFound(): NextResponse {
  return NextResponse.json({ error: "Try-on image not found." }, { status: 404 });
}

function unavailable(): NextResponse {
  return NextResponse.json({ error: "Try-on image unavailable." }, { status: 502 });
}

/**
 * Fetch and return a stored live try-on image.
 *
 * `stored` must come from server-side storage — a URL is never accepted from
 * request input. Mock results are data URLs already delivered inline, so they
 * are reported as not found here.
 */
export async function proxyStoredTryOnImage(
  stored: { renderedImageUrl?: string; isMock?: boolean } | undefined,
): Promise<NextResponse> {
  if (!stored?.renderedImageUrl) return notFound();
  if (stored.isMock || stored.renderedImageUrl.startsWith("data:")) {
    return notFound();
  }

  let upstreamUrl: string;
  try {
    upstreamUrl = assertTrustedYceHttpsUrl(stored.renderedImageUrl);
  } catch {
    return unavailable();
  }

  // Defense in depth: re-check host before fetch (never use request input).
  const parsed = parseHttpsUrlNoCredentials(upstreamUrl);
  if (!parsed || !isTrustedYceStorageHost(parsed.hostname)) {
    return unavailable();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  try {
    const response = await fetch(upstreamUrl, {
      method: "GET",
      signal: controller.signal,
      redirect: "error",
      headers: { Accept: "image/*" },
    });

    if (!response.ok) return unavailable();

    const contentType = safeImageContentType(response.headers.get("content-type"));
    if (!contentType) return unavailable();

    const contentLengthHeader = response.headers.get("content-length");
    if (contentLengthHeader) {
      const declared = Number(contentLengthHeader);
      if (Number.isFinite(declared) && declared > MAX_PROXY_BYTES) {
        return unavailable();
      }
    }

    const buffer = await readBoundedBody(response, MAX_PROXY_BYTES);
    if (!buffer) return unavailable();

    return new NextResponse(Uint8Array.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return unavailable();
  } finally {
    clearTimeout(timer);
  }
}
