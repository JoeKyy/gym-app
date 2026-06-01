#!/usr/bin/env node
/**
 * scripts/sync-exercises.mjs
 * ----------------------------------------------------------------------------
 * Baixa o dataset free-exercise-db para public/data/
 *
 * Uso:
 *   node scripts/sync-exercises.mjs               → JSON apenas
 *   node scripts/sync-exercises.mjs --with-images  → JSON + GIFs (~180MB)
 * ----------------------------------------------------------------------------
 */

import { createWriteStream, mkdirSync, existsSync, writeFileSync } from "fs";
import { pipeline } from "stream/promises";
import { join } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const JSON_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

const PUBLIC_DATA = join(process.cwd(), "public", "data");
const IMG_DIR = join(PUBLIC_DATA, "exercises-img");
const JSON_OUT = join(PUBLIC_DATA, "free-exercise-db.json");

const withImages = process.argv.includes("--with-images");

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res;
}

async function downloadJson() {
  console.log("⬇  Baixando exercises.json…");
  mkdirSync(PUBLIC_DATA, { recursive: true });
  const res = await fetchBuffer(JSON_URL);
  const data = await res.json();
  writeFileSync(JSON_OUT, JSON.stringify(data, null, 2), "utf8");
  console.log(`✅ ${data.length} exercícios → ${JSON_OUT}`);
  return data;
}

async function downloadImage(imagePath) {
  const localPath = join(IMG_DIR, imagePath);
  const dir = localPath.replace(/\/[^/]+$/, "");
  if (existsSync(localPath)) return; // idempotent
  mkdirSync(dir, { recursive: true });
  const res = await fetchBuffer(IMAGE_BASE + imagePath);
  await pipeline(res.body, createWriteStream(localPath));
}

(async () => {
  const data = await downloadJson();

  if (!withImages) {
    console.log("ℹ  Imagens não baixadas (use --with-images para incluir ~180MB de GIFs).");
    return;
  }

  const images = data.flatMap((ex) => ex.images ?? []);
  const unique = [...new Set(images)];
  console.log(`⬇  Baixando ${unique.length} imagens…`);

  let done = 0;
  const CONCURRENCY = 8;
  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const batch = unique.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((img) => downloadImage(img).catch((e) => console.warn(`⚠ ${img}: ${e.message}`))));
    done += batch.length;
    if (done % 100 === 0) process.stdout.write(`  ${done}/${unique.length}\r`);
  }
  console.log(`✅ Imagens → ${IMG_DIR}`);
})();
