// Real PNG exports: the same renderer as the preview, drawn fresh at the
// exact post size — never a CSS screenshot, never an upscaled preview
// bitmap, and never with selection handles in the frame.

import { RATIOS } from './state.js';
import { renderCoverToCanvas } from './renderer.js';

/** Renders the scene at a ratio's exact size and returns the PNG blob. */
export function exportPngBlob(scene, assets, ratioId) {
  const ratio = RATIOS[ratioId];
  if (!ratio) throw new Error(`Unknown size “${ratioId}”.`);
  const canvas = renderCoverToCanvas(scene, ratio.width, ratio.height, assets, { forExport: true });
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('The browser could not encode the PNG.'));
      else resolve({ blob, width: ratio.width, height: ratio.height });
    }, 'image/png');
  });
}

/** Renders, downloads the PNG and resolves with its real dimensions. */
export async function exportPng(scene, assets, ratioId) {
  const { blob, width, height } = await exportPngBlob(scene, assets, ratioId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `coastline-stories-${width}x${height}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return { width, height, bytes: blob.size };
}
