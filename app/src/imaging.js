// Photo decoding and the original poster pixel pipeline.
// The pipeline is a plain Canvas 2D treatment, not a generative redraw:
// light smoothing -> contrast/saturation -> split tone -> gentle
// quantization -> optional soft Sobel ink -> thin deterministic grain.

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const cache = new Map();

export function clearStylizeCache() {
  cache.clear();
}

/** Loads an image element from a URL (same-origin sample or object URL). */
export function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode that image file.'));
    img.src = url;
  });
}

/**
 * Validates and decodes a user file. Rejects with a human-readable message
 * for unsupported types, oversize files and corrupt data — never a hang.
 */
export async function decodeLocalPhoto(file) {
  if (!file) throw new Error('No file was chosen.');
  if (!ACCEPTED_TYPES.includes(file.type)) {
    if (file.type === 'image/heic' || file.type === 'image/heif' || /\.heic$/i.test(file.name)) {
      throw new Error('HEIC photos are not supported in this browser. Convert the photo to JPEG or PNG first, then try again.');
    }
    throw new Error(`“${file.name}” is a ${file.type || 'unknown'} file. Use a JPEG, PNG or WebP photo.`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`“${file.name}” is ${(file.size / 1048576).toFixed(1)} MB — the limit is 25 MB.`);
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImageElement(url);
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('That file did not decode into a photo.');
    return { image, width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Integer hash for deterministic grain: same pixel, same noise, every run.
function grainNoise(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 974634) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) % 1000) / 1000 - 0.5;
}

function clampByte(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/**
 * Runs the poster treatment over a photo. `grade` comes from the active
 * preset; `ink` is the Poster Ink strength (0..1); `treatment` is the
 * overall treatment strength (0 skips quantize + ink for a plain look).
 * Returns a canvas at most 640 px wide — the working resolution; the
 * renderer scales it up for export, drawing from the same pixels.
 */
export function stylizePhoto(image, grade, ink, treatment) {
  const srcW = image.naturalWidth || image.width;
  const srcH = image.naturalHeight || image.height;
  const scale = Math.min(1, 640 / srcW);
  const w = Math.max(2, Math.round(srcW * scale));
  const h = Math.max(2, Math.round(srcH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  // Cover-fit the photo into the working canvas.
  const fit = Math.max(w / srcW, h / srcH);
  const dw = srcW * fit;
  const dh = srcH * fit;
  ctx.drawImage(image, (w - dw) / 2, (h - dh) / 2, dw, dh);
  if (treatment <= 0) return canvas;

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const lum = new Float32Array(w * h);

  // Pass 1: light edge-preserving-ish smoothing (3x3 weighted kernel) and
  // luminance. A strong blur would melt faces; this one only takes the
  // edge off sensor noise.
  const smooth = new Uint8ClampedArray(d);
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let r = 0; let g = 0; let b = 0; let kSum = 0;
      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          const sx = Math.min(w - 1, Math.max(0, x + kx));
          const sy = Math.min(h - 1, Math.max(0, y + ky));
          const k = kernel[(ky + 1) * 3 + (kx + 1)];
          const si = (sy * w + sx) * 4;
          r += d[si] * k; g += d[si + 1] * k; b += d[si + 2] * k; kSum += k;
        }
      }
      const i = (y * w + x) * 4;
      smooth[i] = r / kSum; smooth[i + 1] = g / kSum; smooth[i + 2] = b / kSum;
      lum[y * w + x] = 0.2126 * smooth[i] + 0.7152 * smooth[i + 1] + 0.0722 * smooth[i + 2];
    }
  }

  // Pass 2: Sobel edge strength from luminance, for the optional ink.
  const edge = new Float32Array(w * h);
  const inkStrength = ink * treatment;
  if (inkStrength > 0.01) {
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const gx = -lum[(y - 1) * w + x - 1] - 2 * lum[y * w + x - 1] - lum[(y + 1) * w + x - 1]
          + lum[(y - 1) * w + x + 1] + 2 * lum[y * w + x + 1] + lum[(y + 1) * w + x + 1];
        const gy = -lum[(y - 1) * w + x - 1] - 2 * lum[(y - 1) * w + x] - lum[(y - 1) * w + x + 1]
          + lum[(y + 1) * w + x - 1] + 2 * lum[(y + 1) * w + x] + lum[(y + 1) * w + x + 1];
        edge[y * w + x] = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 320);
      }
    }
  }

  // Pass 3: grade every pixel.
  const levels = Math.max(8, grade.quantize || 24);
  const step = 255 / levels;
  const contrast = grade.contrast || 1;
  const saturation = grade.saturation || 1;
  const [sr, sg, sb] = grade.shadowTint || [30, 20, 60];
  const [hr, hg, hb] = grade.highlightTint || [255, 170, 90];
  const seed = Math.round((grade.contrast * 100 + grade.saturation * 10) % 97);
  for (let i = 0; i < w * h; i += 1) {
    const p = i * 4;
    let r = smooth[p];
    let g = smooth[p + 1];
    let b = smooth[p + 2];
    const l = lum[i] / 255;
    // Contrast around mid-grey, then saturation around luminance.
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;
    const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = grey + (r - grey) * saturation;
    g = grey + (g - grey) * saturation;
    b = grey + (b - grey) * saturation;
    // Split tone: shadows lean to the preset shadow tint, highlights to
    // the warm highlight tint. Skin keeps its detail because the shift
    // is proportional to how dark or bright the pixel already is.
    const shadowW = (1 - l) * (1 - l) * 0.32;
    const highW = l * l * 0.28;
    r += (sr - 128) * shadowW + (hr - 200) * highW;
    g += (sg - 128) * shadowW + (hg - 170) * highW;
    b += (sb - 128) * shadowW + (hb - 110) * highW;
    // Gentle quantization, blended so faces never band into flat blobs.
    const q = 0.35 * treatment;
    r = r * (1 - q) + Math.round(r / step) * step * q;
    g = g * (1 - q) + Math.round(g / step) * step * q;
    b = b * (1 - q) + Math.round(b / step) * step * q;
    // Soft Sobel ink: darken strong edges, never every pore.
    if (inkStrength > 0.01) {
      const e = edge[i];
      const inkAmt = Math.max(0, e - 0.22) * inkStrength * 0.85;
      r *= 1 - inkAmt; g *= 1 - inkAmt; b *= 1 - inkAmt;
    }
    // Thin deterministic grain.
    const x = i % w;
    const y = (i / w) | 0;
    const noise = grainNoise(x, y, seed) * 11 * treatment;
    d[p] = clampByte(r + noise);
    d[p + 1] = clampByte(g + noise);
    d[p + 2] = clampByte(b + noise);
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Cached stylize: same source + grade + ink + treatment reuses its pixels. */
export function stylizePhotoCached(sourceId, image, grade, ink, treatment) {
  const key = `${sourceId}|${grade.contrast}|${grade.saturation}|${grade.quantize}|${ink.toFixed(2)}|${treatment}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out = stylizePhoto(image, grade, ink, treatment);
  if (cache.size > 24) cache.clear();
  cache.set(key, out);
  return out;
}
