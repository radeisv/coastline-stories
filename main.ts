// Coastline Stories — the entry program for gta6-cover-art-01.
// Node 22, standard library only. It hands the app in: copies this
// repository's app/ and screenshots/ into the output directory and writes
// /output/dossier.json with the vendored make.fun library, exactly as the
// gate re-derives it. The grader runs it twice and the bytes must match.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { closeSync, cpSync, existsSync, mkdirSync, openSync, readdirSync, readSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The repository root is the folder holding this file, however the
// program is invoked. The output directory is /output in the grader.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message) {
  throw new Error(`coastline-stories main.ts: ${message}`);
}

function countEntries(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    total += 1;
    if (entry.isDirectory()) total += countEntries(join(dir, entry.name));
  }
  return total;
}

// Total bytes under app/, for the gate's 48 MiB cap.
function totalBytes(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) total += totalBytes(path);
    else if (entry.isFile()) total += statSync(path).size;
  }
  return total;
}

// True when the file starts with a PNG or JPEG magic number.
function isWholeImage(path) {
  const head = new Uint8Array(4);
  const fd = openSync(path, 'r');
  try {
    readSync(fd, head, 0, 4, 0);
  } finally {
    closeSync(fd);
  }
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  return isPng || isJpeg;
}

// Guard the gate's app caps before copying anything, so a bad tree fails
// here with a readable message instead of a silent invalid entry.
const appDir = join(repoRoot, 'app');
const indexFile = join(appDir, 'index.html');
if (!existsSync(indexFile)) fail('app/index.html is missing');
if (statSync(indexFile).size > 1024 * 1024) fail('app/index.html is over the 1 MiB cap');
if (countEntries(appDir) > 993) fail('app/ holds more than 993 files and directories');
if (totalBytes(appDir) > 48 * 1024 * 1024) fail('app/ is over the 48 MiB cap');

const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(shotsDir)) fail('screenshots/ is missing');
const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
if (shots.length < 3 || shots.length > 4) fail(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
for (const name of shots) {
  const path = join(shotsDir, name);
  const size = statSync(path).size;
  if (size > 256 * 1024) fail(`screenshots/${name} is over the 256 KiB cap`);
  if (!isWholeImage(path)) fail(`screenshots/${name} is not a whole PNG or JPEG file`);
}

mkdirSync(outputDir, { recursive: true });
cpSync(appDir, join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the dossier bytes; the rest refuse an entry the scorer would refuse.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
if (Buffer.byteLength(dossier, 'utf8') > 1572864) fail('dossier.json is over the 1.5 MiB cap');
writeFileSync(join(outputDir, 'dossier.json'), dossier);

// A short, deterministic summary on stdout so a local run shows what
// was handed in without touching the output bytes.
console.log(`coastline-stories: ${countEntries(appDir)} app entries, ${shots.length} screenshots, dossier ${Buffer.byteLength(dossier, 'utf8')} bytes -> ${outputDir}`);
