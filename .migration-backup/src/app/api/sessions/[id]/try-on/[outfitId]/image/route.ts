import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/services/session-service";
import {
  assertTrustedYceHttpsUrl,
  isTrustedYceStorageHost,
  parseHttpsUrlNoCredentials,
} from "@/lib/youcam/live-provider";

interface Context {
  params: Promise<{ id: string; outfitId: string }>;
}

const PROXY_TIMEOUT_MS = 15_000;
const MAX_PROXY_BYTES = 10 * 1024 * 1024;

const OutfitIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

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

/**
 * Proxy a stored live try-on result image through the app.
 * Never accepts a URL from the request; only fetches the trusted YCE URL
 * already stored on the session.
 */
export async function GET(
  _req: Request,
  ctx: Context,
): Promise<NextResponse> {
  const { id, outfitId } = await ctx.params;

  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid session id." }, { status: 400 });
  }
  if (!OutfitIdSchema.safeParse(outfitId).success) {
    return NextResponse.json({ error: "Invalid outfit id." }, { status: 400 });
  }

  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const result = session.tryOnResults?.[outfitId];
  if (!result?.renderedImageUrl) {
    return NextResponse.json({ error: "Try-on image not found." }, { status: 404 });
  }

  // Mock data URLs are returned directly by toPublicSession — proxy is live-only.
  if (result.isMock || result.renderedImageUrl.startsWith("data:")) {
    return NextResponse.json({ error: "Try-on image not found." }, { status: 404 });
  }

  let upstreamUrl: string;
  try {
    upstreamUrl = assertTrustedYceHttpsUrl(result.renderedImageUrl);
  } catch {
    return NextResponse.json({ error: "Try-on image unavailable." }, { status: 502 });
  }

  // Defense in depth: re-check host before fetch (never use request input).
  const parsed = parseHttpsUrlNoCredentials(upstreamUrl);
  if (!parsed || !isTrustedYceStorageHost(parsed.hostname)) {
    return NextResponse.json({ error: "Try-on image unavailable." }, { status: 502 });
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

    if (!response.ok) {
      return NextResponse.json({ error: "Try-on image unavailable." }, { status: 502 });
    }

    const contentType = safeImageContentType(response.headers.get("content-type"));
    if (!contentType) {
      return NextResponse.json({ error: "Try-on image unavailable." }, { status: 502 });
    }

    const contentLengthHeader = response.headers.get("content-length");
    if (contentLengthHeader) {
      const declared = Number(contentLengthHeader);
      if (Number.isFinite(declared) && declared > MAX_PROXY_BYTES) {
        return NextResponse.json({ error: "Try-on image unavailable." }, { status: 502 });
      }
    }

    const buffer = await readBoundedBody(response, MAX_PROXY_BYTES);
    if (!buffer) {
      return NextResponse.json({ error: "Try-on image unavailable." }, { status: 502 });
    }

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
    return NextResponse.json({ error: "Try-on image unavailable." }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
