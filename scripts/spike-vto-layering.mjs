/**
 * Layering spike: measure whether YouCam cloth-v4 can be CHAINED to render a
 * multi-garment outfit (top -> bottoms -> shoes) on one person image, and what
 * that costs in wall-clock latency.
 *
 * It replicates the exact live flow in src/lib/youcam/live-provider.ts
 * (file meta POST -> signed PUT -> cloth-v4 create -> poll) but instruments
 * every phase so we can see where the time actually goes.
 *
 * Each hop feeds the PREVIOUS hop's rendered output back in as the source
 * image. That is the only way to stack garments with a single-garment API.
 *
 * Usage:
 *   node scripts/spike-vto-layering.mjs \
 *     --source ./me.jpg \
 *     --layer upper_body=./top.jpg \
 *     --layer lower_body=./pants.jpg \
 *     --layer shoes=./shoes.jpg
 *
 *   node scripts/spike-vto-layering.mjs ... --dry-run   # validate, no API calls
 *
 * Outputs timings + every intermediate render to --out (default:
 * ./spike-out/) so the quality degradation across hops can be eyeballed.
 *
 * Reads YOUCAM_API_KEY / YOUCAM_BASE_URL from .env. Never prints the key.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_LONG_SIDE = 4096;
const MIN_APPAREL_LONG_SIDE = 128;
const DEFAULT_BASE_URL = "https://yce-api-01.makeupar.com";
const IN_PROGRESS = new Set(["running", "pending", "queued", "processing", "in_progress"]);

const VALID_CATEGORIES = new Set([
  "full_body",
  "lower_body",
  "upper_body",
  "shoes",
  "auto",
  "outer",
]);

// ---------------------------------------------------------------------------
// Tiny .env loader (no dependency on the app's TS module graph)
// ---------------------------------------------------------------------------

function loadEnv(file = ".env") {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

// ---------------------------------------------------------------------------
// Image dimension parsing (mirrors live-provider fail-closed checks)
// ---------------------------------------------------------------------------

function jpegSize(b) {
  let o = 2;
  while (o < b.length) {
    if (b[o] !== 0xff) {
      o++;
      continue;
    }
    const m = b[o + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { width: (b[o + 7] << 8) | b[o + 8], height: (b[o + 5] << 8) | b[o + 6] };
    }
    const len = (b[o + 2] << 8) | b[o + 3];
    if (len <= 0) return null;
    o += 2 + len;
  }
  return null;
}

function pngSize(b) {
  if (b.length < 24) return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function webpSize(b) {
  if (b.length < 30) return null;
  const fourcc = b.toString("ascii", 12, 16);
  if (fourcc === "VP8X") {
    return {
      width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
      height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
    };
  }
  if (fourcc === "VP8 ") {
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }
  if (fourcc === "VP8L") {
    const b1 = b[22], b2 = b[23], b3 = b[24], b4 = b[25];
    return {
      width: 1 + (b1 | ((b2 & 0x3f) << 8)),
      height: 1 + (((b2 & 0xc0) >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10)),
    };
  }
  return null;
}

function sniff(bytes) {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return { ext: "jpg", contentType: "image/jpeg", dims: jpegSize(bytes) };
  }
  if (bytes.length > 8 && bytes.toString("ascii", 1, 4) === "PNG") {
    return { ext: "png", contentType: "image/png", dims: pngSize(bytes) };
  }
  if (bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF") {
    return { ext: "webp", contentType: "image/webp", dims: webpSize(bytes) };
  }
  return null;
}

function describeImage(bytes, label) {
  const info = sniff(bytes);
  if (!info) throw new Error(`${label}: unsupported image format (need JPEG/PNG/WebP)`);
  if (!info.dims) throw new Error(`${label}: could not read dimensions`);
  const long = Math.max(info.dims.width, info.dims.height);
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error(`${label}: exceeds 10MB`);
  if (long < MIN_APPAREL_LONG_SIDE || long > MAX_IMAGE_LONG_SIDE) {
    throw new Error(
      `${label}: long side ${long}px outside allowed ${MIN_APPAREL_LONG_SIDE}-${MAX_IMAGE_LONG_SIDE}px`,
    );
  }
  return { ...info, bytes: bytes.length, width: info.dims.width, height: info.dims.height, long };
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Api {
  constructor(apiKey, baseUrl, timeoutMs) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.timeoutMs = timeoutMs;
  }

  async json(method, p, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${p}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
      const text = await res.text();
      let parsed = {};
      try {
        parsed = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`${method} ${p}: non-JSON response (HTTP ${res.status})`);
      }
      if (!res.ok) {
        const detail =
          parsed?.error?.message ?? parsed?.message ?? parsed?.error ?? `HTTP ${res.status}`;
        throw new Error(`${method} ${p}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
      }
      return parsed;
    } finally {
      clearTimeout(timer);
    }
  }

  /** file meta -> signed PUT. Returns { fileId, metaMs, putMs }. */
  async upload(bytes, name) {
    const info = sniff(bytes);
    const t0 = Date.now();
    const meta = await this.json("POST", "/s2s/v2.0/file", {
      files: [
        {
          content_type: info.contentType,
          file_name: `${name}.${info.ext}`,
          file_size: bytes.length,
        },
      ],
    });
    const metaMs = Date.now() - t0;

    const first = meta?.data?.files?.[0];
    const fileId = first?.file_id;
    const req = first?.requests?.[0];
    if (!fileId || !req?.url) throw new Error("file API response missing file_id / upload URL");

    const headers = {};
    for (const [k, v] of Object.entries(req.headers ?? {})) {
      if (typeof v === "string") headers[k] = v;
    }

    const t1 = Date.now();
    const put = await fetch(req.url, { method: "PUT", headers, body: bytes });
    if (!put.ok) throw new Error(`signed upload failed: HTTP ${put.status}`);
    const putMs = Date.now() - t1;

    return { fileId, metaMs, putMs };
  }

  /** cloth-v4 create + poll. Returns { url, createMs, pollMs, polls, status }. */
  async clothV4(srcFileId, refFileId, category, pollIntervalMs) {
    const t0 = Date.now();
    const created = await this.json("POST", "/s2s/v2.0/task/cloth-v4", {
      src_file_id: srcFileId,
      ref_file_id: refFileId,
      garment_category: category,
    });
    const createMs = Date.now() - t0;

    const taskId = created?.data?.task_id ?? created?.task_id;
    if (!taskId) throw new Error("task create response missing task_id");

    const t1 = Date.now();
    let polls = 0;
    for (;;) {
      const body = await this.json("GET", `/s2s/v2.0/task/cloth-v4/${encodeURIComponent(taskId)}`);
      polls++;
      const data = body?.data ?? body;
      const status = String(data?.task_status ?? body?.task_status ?? "").toLowerCase();

      if (status === "success") {
        const url = data?.results?.url ?? body?.results?.url ?? data?.url ?? body?.url;
        if (!url) throw new Error("success response missing result URL");
        return { url, createMs, pollMs: Date.now() - t1, polls, status, taskId };
      }
      if (!IN_PROGRESS.has(status)) {
        const detail =
          data?.error ?? data?.message ?? data?.results?.error ?? data?.error_code ?? status;
        const err = new Error(
          `task failed (status=${status}): ${typeof detail === "string" ? detail : JSON.stringify(detail)}`,
        );
        err.taskStatus = status;
        err.createMs = createMs;
        err.pollMs = Date.now() - t1;
        err.polls = polls;
        throw err;
      }
      if (Date.now() - t1 > this.timeoutMs) throw new Error("poll timed out");
      await sleep(pollIntervalMs);
    }
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { layers: [], out: "spike-out", dryRun: false, timeout: 120000, poll: 1500 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--source") out.source = argv[++i];
    else if (a === "--layer") out.layers.push(argv[++i]);
    else if (a === "--out") out.out = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--timeout") out.timeout = Number(argv[++i]);
    else if (a === "--poll") out.poll = Number(argv[++i]);
    else if (a === "--help" || a === "-h") out.help = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  return out;
}

const HELP = `
Layering spike — chain cloth-v4 calls to stack garments on one person.

  --source <path>            person / base image (required)
  --layer <category>=<path>  garment to stack; repeatable, applied in order
  --out <dir>                where to write renders + report (default spike-out)
  --dry-run                  validate images and print the plan, no API calls
  --timeout <ms>             per-request timeout (default 120000)
  --poll <ms>                poll interval (default 1500)

categories: ${[...VALID_CATEGORIES].join(", ")}
`;

function fmt(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }
  loadEnv();

  if (!args.source) throw new Error("--source is required (see --help)");
  if (args.layers.length === 0) throw new Error("at least one --layer is required");

  // Parse + validate layers
  const layers = args.layers.map((spec) => {
    const eq = spec.indexOf("=");
    if (eq < 1) throw new Error(`bad --layer "${spec}", expected category=path`);
    const category = spec.slice(0, eq);
    const file = spec.slice(eq + 1);
    if (!VALID_CATEGORIES.has(category)) {
      throw new Error(`bad category "${category}" — must be one of ${[...VALID_CATEGORIES].join(", ")}`);
    }
    if (!fs.existsSync(file)) throw new Error(`layer image not found: ${file}`);
    return { category, file };
  });

  if (!fs.existsSync(args.source)) throw new Error(`source image not found: ${args.source}`);

  // Validate every image up front — fail before spending any credits
  let sourceBytes = fs.readFileSync(args.source);
  const sourceInfo = describeImage(sourceBytes, "source");
  console.log(`source  ${args.source}`);
  console.log(`        ${sourceInfo.width}x${sourceInfo.height} ${sourceInfo.ext} ${(sourceInfo.bytes / 1024).toFixed(0)}KB`);

  for (const l of layers) {
    const info = describeImage(fs.readFileSync(l.file), `layer ${l.category}`);
    l.info = info;
    console.log(`layer   ${l.category.padEnd(11)} ${l.file}`);
    console.log(`        ${info.width}x${info.height} ${info.ext} ${(info.bytes / 1024).toFixed(0)}KB`);
  }

  console.log(`\nplan: ${layers.length} chained cloth-v4 hop(s); each hop's output becomes the next hop's source`);

  if (args.dryRun) {
    console.log("\n--dry-run: all images valid, no API calls made.");
    return;
  }

  const apiKey = process.env.YOUCAM_API_KEY;
  if (!apiKey) throw new Error("YOUCAM_API_KEY is not set in .env");
  const baseUrl = process.env.YOUCAM_BASE_URL || DEFAULT_BASE_URL;

  fs.mkdirSync(args.out, { recursive: true });
  const api = new Api(apiKey, baseUrl, args.timeout);

  const report = { baseUrl, startedAt: new Date().toISOString(), hops: [] };
  const runStart = Date.now();

  // Save the starting image for side-by-side comparison
  fs.writeFileSync(path.join(args.out, `hop0-source.${sourceInfo.ext}`), sourceBytes);

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const hopNum = i + 1;
    const hop = { hop: hopNum, category: layer.category, garment: layer.file };
    const hopStart = Date.now();

    console.log(`\n--- hop ${hopNum}/${layers.length}: ${layer.category} ---`);

    try {
      const srcUp = await api.upload(sourceBytes, `hop${hopNum}-source`);
      console.log(`  upload source   meta ${fmt(srcUp.metaMs)}  put ${fmt(srcUp.putMs)}`);

      const refUp = await api.upload(fs.readFileSync(layer.file), `hop${hopNum}-garment`);
      console.log(`  upload garment  meta ${fmt(refUp.metaMs)}  put ${fmt(refUp.putMs)}`);

      const task = await api.clothV4(srcUp.fileId, refUp.fileId, layer.category, args.poll);
      console.log(`  create task     ${fmt(task.createMs)}`);
      console.log(`  poll to success ${fmt(task.pollMs)} (${task.polls} polls)`);

      const dlStart = Date.now();
      const res = await fetch(task.url);
      if (!res.ok) throw new Error(`result download failed: HTTP ${res.status}`);
      const outBytes = Buffer.from(await res.arrayBuffer());
      const dlMs = Date.now() - dlStart;
      console.log(`  download result ${fmt(dlMs)}`);

      const outInfo = describeImage(outBytes, `hop ${hopNum} result`);
      const outPath = path.join(args.out, `hop${hopNum}-${layer.category}.${outInfo.ext}`);
      fs.writeFileSync(outPath, outBytes);

      Object.assign(hop, {
        ok: true,
        uploadSourceMs: srcUp.metaMs + srcUp.putMs,
        uploadGarmentMs: refUp.metaMs + refUp.putMs,
        createMs: task.createMs,
        pollMs: task.pollMs,
        polls: task.polls,
        downloadMs: dlMs,
        totalMs: Date.now() - hopStart,
        result: {
          path: outPath,
          width: outInfo.width,
          height: outInfo.height,
          bytes: outInfo.bytes,
          format: outInfo.ext,
        },
      });

      console.log(
        `  => ${outInfo.width}x${outInfo.height} ${(outInfo.bytes / 1024).toFixed(0)}KB  hop total ${fmt(hop.totalMs)}`,
      );
      console.log(`  saved ${outPath}`);

      // Chain: this render becomes the next hop's source
      sourceBytes = outBytes;
    } catch (err) {
      Object.assign(hop, {
        ok: false,
        error: err.message,
        taskStatus: err.taskStatus,
        totalMs: Date.now() - hopStart,
      });
      report.hops.push(hop);
      console.error(`  FAILED after ${fmt(hop.totalMs)}: ${err.message}`);
      break;
    }

    report.hops.push(hop);
  }

  report.totalMs = Date.now() - runStart;
  report.finishedAt = new Date().toISOString();

  const okHops = report.hops.filter((h) => h.ok);
  console.log(`\n===== SUMMARY =====`);
  console.log(`hops attempted : ${report.hops.length}`);
  console.log(`hops succeeded : ${okHops.length}`);
  if (okHops.length) {
    const avg = Math.round(okHops.reduce((s, h) => s + h.totalMs, 0) / okHops.length);
    console.log(`avg hop        : ${fmt(avg)}`);
    console.log(`slowest hop    : ${fmt(Math.max(...okHops.map((h) => h.totalMs)))}`);
    console.log(`resolution     : ${okHops.map((h) => `${h.result.width}x${h.result.height}`).join(" -> ")}`);
  }
  console.log(`wall clock     : ${fmt(report.totalMs)}`);

  const reportPath = path.join(args.out, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nreport  ${reportPath}`);
  if (okHops.length) console.log(`renders ${args.out}/ — compare hop1..hopN to judge degradation`);
}

main().catch((err) => {
  console.error(`\nspike failed: ${err.message}`);
  process.exit(1);
});
