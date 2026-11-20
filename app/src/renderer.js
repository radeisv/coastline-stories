// The cover renderer: backdrop, panels, lettering and ornaments.
// Preview and export run the exact same renderCover, at different sizes.

import { getLayout, toPixels } from './layouts.js';
import { presetOf } from './state.js';
import { stylizePhotoCached } from './imaging.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Paints a tropical sunset backdrop: sky, sun, skyline, sea, palms. */
export function drawSunsetBackdrop(ctx, w, h, palette, seed = 7) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, palette.skyTop);
  sky.addColorStop(0.55, palette.skyMid);
  sky.addColorStop(0.78, palette.skyLow);
  sky.addColorStop(1, palette.sea);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Sun with a soft glow.
  const sunX = w * 0.7;
  const sunY = h * 0.34;
  const sunR = h * 0.11;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 3.2);
  glow.addColorStop(0, palette.sun);
  glow.addColorStop(0.35, palette.skyLow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.fillStyle = palette.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // Distant skyline silhouette along the horizon.
  const rand = mulberry32(seed);
  const horizon = h * 0.66;
  ctx.fillStyle = palette.ground;
  let bx = 0;
  while (bx < w) {
    const bw = w * (0.04 + rand() * 0.09);
    const bh = h * (0.05 + rand() * 0.16);
    ctx.fillRect(bx, horizon - bh, bw, bh + h);
    bx += bw + w * 0.008;
  }

  // Sea: darker band with a few shimmer strokes catching the sun.
  const sea = ctx.createLinearGradient(0, horizon, 0, h);
  sea.addColorStop(0, palette.skyLow);
  sea.addColorStop(0.25, palette.sea);
  sea.addColorStop(1, palette.ground);
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon, w, h - horizon);
  ctx.strokeStyle = palette.sun;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = Math.max(1, h * 0.004);
  for (let i = 0; i < 7; i += 1) {
    const y = horizon + h * (0.05 + i * 0.045);
    const x0 = w * (0.55 + rand() * 0.1);
    const len = w * (0.05 + rand() * 0.16);
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + len, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Two palm silhouettes framing the scene. They sit well inside the
  // frame because panels cover-fit the painting and crop its edges.
  drawPalm(ctx, w * 0.2, h * 0.98, h * 0.42, palette.ground, -0.08);
  drawPalm(ctx, w * 0.8, h * 0.98, h * 0.34, palette.ground, 0.08);
}

function drawPalm(ctx, x, y, size, colour, lean) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = Math.max(2, size * 0.03);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + size * lean, y - size * 0.55, x + size * lean * 1.6, y - size * 0.95);
  ctx.stroke();
  const topX = x + size * lean * 1.6;
  const topY = y - size * 0.95;
  for (let i = 0; i < 6; i += 1) {
    const a = -Math.PI * (0.08 + i * 0.16) + lean * 0.4;
    const len = size * (0.34 + (i % 2) * 0.08);
    ctx.lineWidth = Math.max(1.5, size * 0.018);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * len * 0.6, topY + Math.sin(a) * len * 0.4 + size * 0.08,
      topX + Math.cos(a) * len, topY + Math.sin(a) * len + size * 0.16,
    );
    ctx.stroke();
  }
}

const backdropCache = new Map();

/** A painted backdrop as a canvas, cached per palette + size bucket. */
export function paintedBackdropCanvas(palette, w, h) {
  const key = `${palette.skyTop}|${palette.skyLow}|${w}x${h}`;
  const hit = backdropCache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawSunsetBackdrop(canvas.getContext('2d'), w, h, palette, 7);
  if (backdropCache.size > 8) backdropCache.clear();
  backdropCache.set(key, canvas);
  return canvas;
}

/**
 * Cover-fit crop transform for a panel. Returns drawImage source/dest
 * geometry; the image always covers the panel (no blank wedges).
 * panX/panY are in displayed-image pixels; focalX/focalY centre the crop.
 */
export function computeCropTransform(panel, imgW, imgH, rectW, rectH) {
  const scale = Math.max(rectW / imgW, rectH / imgH) * Math.max(1, panel.zoom || 1);
  const dw = imgW * scale;
  const dh = imgH * scale;
  let ox = rectW / 2 - (panel.focalX ?? 0.5) * dw + (panel.panX || 0);
  let oy = rectH / 2 - (panel.focalY ?? 0.38) * dh + (panel.panY || 0);
  ox = Math.min(0, Math.max(rectW - dw, ox));
  oy = Math.min(0, Math.max(rectH - dh, oy));
  return { dw, dh, ox, oy };
}

/** Clamps a panel's pan so its photo still covers its rect. */
export function clampCrop(panel, imgW, imgH, rectW, rectH) {
  const t = computeCropTransform(panel, imgW, imgH, rectW, rectH);
  const wantOx = rectW / 2 - (panel.focalX ?? 0.5) * t.dw + (panel.panX || 0);
  const wantOy = rectH / 2 - (panel.focalY ?? 0.38) * t.dh + (panel.panY || 0);
  panel.panX = (panel.panX || 0) + (t.ox - wantOx);
  panel.panY = (panel.panY || 0) + (t.oy - wantOy);
  return panel;
}

/** A subtle slanted clip path for one panel rect (pixels). */
function slantPath(ctx, r) {
  const s = Math.min(r.w * 0.03, r.h * 0.06);
  ctx.beginPath();
  ctx.moveTo(r.x + s, r.y);
  ctx.lineTo(r.x + r.w, r.y);
  ctx.lineTo(r.x + r.w - s, r.y + r.h);
  ctx.lineTo(r.x, r.y + r.h);
  ctx.closePath();
}

/** Draws one panel: its photo (or painted backdrop) inside the slant. */
export function drawPanel(ctx, panel, sourceCanvas, rectPx, palette, isSelected) {
  ctx.save();
  slantPath(ctx, rectPx);
  ctx.clip();
  if (sourceCanvas) {
    const t = computeCropTransform(panel, sourceCanvas.width, sourceCanvas.height, rectPx.w, rectPx.h);
    if (panel.flip) {
      ctx.save();
      ctx.translate(rectPx.x + t.ox + t.dw, rectPx.y + t.oy);
      ctx.scale(-1, 1);
      ctx.drawImage(sourceCanvas, 0, 0, t.dw, t.dh);
      ctx.restore();
    } else {
      ctx.drawImage(sourceCanvas, rectPx.x + t.ox, rectPx.y + t.oy, t.dw, t.dh);
    }
  } else {
    drawSunsetBackdrop(ctx, rectPx.w, rectPx.h, palette, 11);
  }
  // A faint warm wash at the foot of every panel ties the grid together.
  const wash = ctx.createLinearGradient(0, rectPx.y + rectPx.h * 0.55, 0, rectPx.y + rectPx.h);
  wash.addColorStop(0, 'rgba(0,0,0,0)');
  wash.addColorStop(1, 'rgba(20,5,30,0.28)');
  ctx.fillStyle = wash;
  ctx.fillRect(rectPx.x, rectPx.y, rectPx.w, rectPx.h);
  ctx.restore();

  // Frame + (preview only) selection outline.
  ctx.save();
  slantPath(ctx, rectPx);
  ctx.strokeStyle = palette.frame;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(1, rectPx.w * 0.004);
  ctx.stroke();
  ctx.restore();
  if (isSelected) {
    ctx.save();
    slantPath(ctx, { x: rectPx.x - 3, y: rectPx.y - 3, w: rectPx.w + 6, h: rectPx.h + 6 });
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
}

/** Auto-fits a line of Anton into maxWidth, returning the font size used. */
function fitFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

/** Draws the main title, script subtitle, location plate and seal. */
export function drawPosterTitle(ctx, scene, palette, titleRect, sealPx, width) {
  const title = (scene.title || '').trim().toUpperCase() || 'COASTLINE STORIES';
  const subtitle = (scene.subtitle || '').trim();
  const preset = scene.presetId;
  const bandH = titleRect.h;

  // The location plate sits at the band's top-left, so measure it first:
  // a wide title (portrait) must shrink and shift right rather than run
  // underneath the plate.
  const plateSize = Math.max(10, bandH * 0.13);
  ctx.font = `${plateSize}px Anton, sans-serif`;
  const plateText = `  ${scene.location || 'LEONIDA • VICE COAST'}  `;
  const plateW = ctx.measureText(plateText).width;
  let titleSize = fitFont(ctx, title, titleRect.w * 0.86, bandH * 0.52, 'Anton, sans-serif');
  let titleCenterX = titleRect.x + titleRect.w / 2;
  const titleW = ctx.measureText(title).width;
  // The title stays centred unless it would run under the plate (left)
  // or the seal (right) — then it shrinks and centres in the free zone
  // between them instead.
  const zoneLeft = titleRect.x + plateW;
  const zoneRight = sealPx ? sealPx.x - sealPx.r : titleRect.x + titleRect.w;
  if (titleCenterX - titleW / 2 < zoneLeft + 16 || titleCenterX + titleW / 2 > zoneRight - 16) {
    titleSize = fitFont(ctx, title, zoneRight - zoneLeft - 32, bandH * 0.52, 'Anton, sans-serif');
    titleCenterX = (zoneLeft + zoneRight) / 2;
  }

  const titleY = titleRect.y + bandH * 0.52;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // Thin stacked faux-extrusion: dark copies stepped down-right.
  ctx.font = `${titleSize}px Anton, sans-serif`;
  ctx.fillStyle = palette.titleShadow;
  for (let s = 3; s >= 1; s -= 1) {
    ctx.fillText(title, titleCenterX + s * titleSize * 0.02, titleY + s * titleSize * 0.035);
  }
  if (preset === 'neon-night') {
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = titleSize * 0.35;
  }
  if (preset === 'classic-collage') {
    ctx.fillStyle = palette.titleFillTop;
  } else {
    const grad = ctx.createLinearGradient(0, titleY - titleSize, 0, titleY + titleSize * 0.1);
    grad.addColorStop(0, palette.titleFillTop);
    grad.addColorStop(1, palette.titleFillBottom);
    ctx.fillStyle = grad;
  }
  ctx.fillText(title, titleCenterX, titleY);
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1.5, titleSize * 0.045);
  ctx.strokeStyle = palette.titleOutline;
  ctx.lineJoin = 'round';
  ctx.strokeText(title, titleCenterX, titleY);
  ctx.restore();

  // Script subtitle under the title.
  if (subtitle) {
    const subSize = Math.max(12, bandH * 0.17);
    ctx.save();
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.fillStyle = palette.sub;
    ctx.fillText(subtitle, titleRect.x + titleRect.w / 2, titleRect.y + bandH * 0.82);
    ctx.restore();
  }

  // Location plate, top-left of the band (measured above, before the
  // title, so a wide title never runs underneath it).
  ctx.save();
  ctx.font = `${plateSize}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  // The plate chip uses the preset's shadow colour so it reads as a
  // chip against the dark gutter instead of blending into it.
  ctx.fillStyle = palette.titleShadow;
  ctx.fillRect(titleRect.x, titleRect.y + bandH * 0.06, plateW, plateSize * 1.7);
  ctx.fillStyle = palette.sub;
  ctx.fillText(plateText, titleRect.x, titleRect.y + bandH * 0.06 + plateSize * 1.28);
  ctx.restore();

  // Circular edition seal, bottom-right of the band.
  if (sealPx) {
    const { x, y, r } = sealPx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = palette.plate;
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.strokeStyle = palette.accent;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
    ctx.strokeStyle = palette.frame;
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.stroke();
    ctx.fillStyle = palette.frame;
    ctx.textAlign = 'center';
    ctx.font = `${r * 0.62}px Anton, sans-serif`;
    ctx.fillText('CS', x, y + r * 0.12);
    ctx.font = `${r * 0.22}px Anton, sans-serif`;
    ctx.fillStyle = palette.sub;
    ctx.fillText('EST. 2026', x, y + r * 0.48);
    ctx.restore();
  }

  // Billing line: tiny editorial texture along the very bottom.
  const billSize = Math.max(8, width * 0.007);
  ctx.save();
  ctx.font = `${billSize}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = palette.sub;
  ctx.globalAlpha = 0.75;
  ctx.fillText('A COASTLINE STORIES PRODUCTION  •  PHOTOS BY YOU  •  MADE OFFLINE IN YOUR BROWSER', width / 2, titleRect.y + titleRect.h - billSize * 0.4);
  ctx.restore();
}

/**
 * Renders the whole cover. `assets` maps sourceId -> { kind, image }.
 * The same function draws the preview and every export size.
 */
export function renderCover(ctx, scene, width, height, assets, options = {}) {
  const preset = presetOf(scene);
  const palette = preset.palette;
  ctx.save();
  ctx.fillStyle = palette.gutter;
  ctx.fillRect(0, 0, width, height);

  const layout = getLayout(scene.ratio, preset.heroSide);
  const grade = preset.grade;
  const ink = Math.max(grade.ink, scene.ink || 0);

  scene.panels.forEach((panel, i) => {
    const rectPx = toPixels(layout.panels[i], width, height);
    const source = assets.get(panel.sourceId);
    let sourceCanvas = null;
    if (source && source.kind === 'paint') {
      sourceCanvas = paintedBackdropCanvas(palette, 640, 420);
    } else if (source && source.image) {
      sourceCanvas = stylizePhotoCached(panel.sourceId, source.image, grade, ink, scene.treatment ?? 1);
    }
    drawPanel(ctx, panel, sourceCanvas, rectPx, palette, !options.forExport && options.selectedPanel === i);
  });

  const titleRect = toPixels(layout.title, width, height);
  const sealPx = layout.seal
    ? { x: layout.seal.x * width, y: layout.seal.y * height, r: layout.seal.r * Math.min(width, height) }
    : null;
  drawPosterTitle(ctx, scene, palette, titleRect, sealPx, width);
  ctx.restore();
}

/** Renders the scene onto a fresh canvas of the given size. */
export function renderCoverToCanvas(scene, width, height, assets, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  renderCover(canvas.getContext('2d'), scene, width, height, assets, options);
  return canvas;
}
