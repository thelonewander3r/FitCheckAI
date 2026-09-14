/**
 * One-credit occasion-path smoke: wardrobe photo → compose → try-on → proxy.
 * Requires a running Next server with YOUCAM_MODE=live.
 *
 *   node scripts/smoke-occasion-vto.mjs
 *
 * Never prints the API key, signed URLs, or image payloads.
 */

import fs from "node:fs";
import path from "node:path";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const ASSETS = "scripts/spike-assets";
const OUT_DIR = "scripts/spike-out";

function readBase64(file) {
  return fs.readFileSync(path.join(ASSETS, file)).toString("base64");
}

async function json(method, urlPath, body) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsed = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${method} ${urlPath}: non-JSON HTTP ${res.status}`);
  }
  if (!res.ok) {
    const err = parsed.error ?? `HTTP ${res.status}`;
    throw new Error(`${method} ${urlPath}: ${err}`);
  }
  return parsed;
}

async function main() {
  const person = readBase64("person-tank-leggings.jpg");
  const tee = readBase64("top-white-tee.jpg");
  const jeans = readBase64("jeans-hanger.jpg");

  console.log("1. add wardrobe pieces");
  const top = await json("POST", "/api/wardrobe", {
    name: "White crew tee",
    category: "tops",
    color: "white",
    formality: "smart-casual",
    seasons: ["any"],
    imageBase64: tee,
  });
  const bottom = await json("POST", "/api/wardrobe", {
    name: "Light-wash jeans",
    category: "bottoms",
    color: "blue",
    formality: "smart-casual",
    seasons: ["any"],
    imageBase64: jeans,
  });
  console.log(`   top=${top.id}  bottoms=${bottom.id}`);

  console.log("2. create occasion");
  const created = await json("POST", "/api/occasions", {
    eventType: "dinner",
    venueName: "Casual dinner with friends",
    theme: "relaxed",
  });
  const occasionId = created.occasionId;
  if (!occasionId) throw new Error("create occasion returned no id");
  console.log(`   occasion=${occasionId}`);

  const occasion = await json("GET", `/api/occasions/${occasionId}`);
  const outfit =
    occasion.outfits?.find((candidate) =>
      candidate.items.some((item) => item.id === top.id),
    ) ?? occasion.outfits?.[0];
  if (!outfit) throw new Error("composer returned no outfits");
  const piece =
    outfit.items.find((item) => item.id === top.id) ??
    outfit.items.find((item) => item.category === "tops") ??
    outfit.items[0];
  console.log(
    `   outfit=${outfit.id}  piece=${piece?.name ?? piece?.category} (${piece?.id})`,
  );

  console.log("3. live try-on (one hop, one credit)");
  const started = Date.now();
  const updated = await json("POST", `/api/occasions/${occasionId}/try-on`, {
    outfitId: outfit.id,
    userImageBase64: person,
    itemId: piece.id,
  });
  const elapsedMs = Date.now() - started;
  const result = updated.tryOnResults?.[outfit.id];
  if (!result) throw new Error("try-on returned no result");

  const imageUrl = result.renderedImageUrl;
  if (typeof imageUrl !== "string" || /amazonaws\.com|makeupar\.com/i.test(imageUrl)) {
    throw new Error("public result leaked a provider URL");
  }
  if (!imageUrl.startsWith(`/api/occasions/${occasionId}/try-on/`)) {
    throw new Error(`unexpected result URL shape: ${imageUrl.split("?")[0]}`);
  }

  console.log("4. fetch proxied render");
  const imgRes = await fetch(`${BASE}${imageUrl}`);
  if (!imgRes.ok) throw new Error(`proxy image HTTP ${imgRes.status}`);
  const bytes = Buffer.from(await imgRes.arrayBuffer());
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, "occasion-live-smoke.jpg");
  fs.writeFileSync(outPath, bytes);

  const report = {
    occasionId,
    outfitId: outfit.id,
    garmentItemId: result.garmentItemId,
    garmentItemName: result.garmentItemName,
    garmentCategory: result.garmentCategory,
    isMock: result.isMock,
    elapsedMs,
    imageBytes: bytes.length,
    imagePath: outPath,
    publicImagePath: imageUrl,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, "occasion-live-smoke.json"),
    JSON.stringify(report, null, 2),
  );

  console.log("\n===== OCCASION LIVE SMOKE =====");
  console.log(`isMock          : ${result.isMock}`);
  console.log(`garment         : ${result.garmentItemName} (${result.garmentCategory})`);
  console.log(`elapsed         : ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log(`render          : ${outPath} (${(bytes.length / 1024).toFixed(0)}KB)`);
  if (result.isMock) {
    console.log("WARNING: result is mock — server was not in live mode.");
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(`\nsmoke failed: ${err.message}`);
  process.exit(1);
});
