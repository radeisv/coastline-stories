// Wires the Coastline Stories editor: samples, uploads, panel editing,
// presets, captions and exports. The preview canvas and the PNG exports
// are drawn by the same renderer (renderer.js).

import { createScene, createPanelState, applyOnePhotoToAll, presetOf, ratioOf, PRESET_ORDER, PRESETS, PANEL_ROLES, RATIOS } from './state.js';
import { getLayout, hitPanel } from './layouts.js';
import { loadImageElement, decodeLocalPhoto, clearStylizeCache } from './imaging.js';
import { renderCover, clampCrop } from './renderer.js';
import { exportPng } from './export.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const statusEl = $('status');
const scene = createScene();
let selectedPanel = 0;
let assets = new Map();
let nextUploadId = 1;
let renderQueued = false;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

/** Preview canvas size for the current ratio (same aspect as the export). */
function previewSize() {
  const ratio = ratioOf(scene);
  const scale = 880 / ratio.width;
  return { width: Math.round(ratio.width * scale), height: Math.round(ratio.height * scale) };
}

function render() {
  const { width, height } = previewSize();
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  renderCover(canvas.getContext('2d'), scene, width, height, assets, { selectedPanel });
  updatePanelList();
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function panelLabel(i) {
  const panel = scene.panels[i];
  const source = assets.get(panel.sourceId);
  const name = source ? source.label : panel.sourceId;
  return `${i + 1}. ${PANEL_ROLES[i]} — ${name}`;
}

function updatePanelList() {
  const list = $('panel-list');
  if (!list) return;
  list.querySelectorAll('button').forEach((button, i) => {
    button.textContent = panelLabel(i);
    button.classList.toggle('active', i === selectedPanel);
    button.setAttribute('aria-pressed', i === selectedPanel ? 'true' : 'false');
  });
  const panel = scene.panels[selectedPanel];
  $('zoom').value = String(panel.zoom);
  $('zoom-value').textContent = `${panel.zoom.toFixed(1)}×`;
  $('flip').setAttribute('aria-pressed', panel.flip ? 'true' : 'false');
  $('selected-panel').textContent = panelLabel(selectedPanel);
}

function selectPanel(i) {
  selectedPanel = Math.max(0, Math.min(scene.panels.length - 1, i));
  queueRender();
}

async function loadFont(name, file) {
  try {
    const face = new FontFace(name, `url(./fonts/${file})`);
    await face.load();
    document.fonts.add(face);
  } catch {
    // The CSS @font-face is the fallback; rendering continues.
  }
}

async function loadSample(sourceId, file, label) {
  try {
    const image = await loadImageElement(`./samples/${file}`);
    assets.set(sourceId, { kind: 'photo', image, label });
  } catch {
    assets.set(sourceId, { kind: 'paint', label: `${label} (painted)` });
  }
}

async function init() {
  assets.set('paint-sunset', { kind: 'paint', label: 'Painted sunset' });
  await Promise.all([
    loadFont('Anton', 'Anton-Regular.ttf'),
    loadFont('Pacifico', 'Pacifico-Regular.ttf'),
    loadSample('boulevard', 'boulevard.jpg', 'Boulevard photo'),
    loadSample('pier', 'pier.jpg', 'Pier photo'),
  ]);
  try {
    await document.fonts.ready;
  } catch {
    // Fonts may already be ready; rendering continues either way.
  }
  buildPresetButtons();
  buildPanelList();
  render();
  setStatus('Ready — pick a preset, drop in your photos, export a PNG.');
}

function buildPresetButtons() {
  const wrap = $('presets');
  PRESET_ORDER.forEach((id) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = PRESETS[id].label;
    button.dataset.preset = id;
    button.addEventListener('click', () => {
      scene.presetId = id;
      clearStylizeCache();
      wrap.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.preset === id));
      queueRender();
      setStatus(`${PRESETS[id].label} — ${presetOf(scene).label} mood applied.`);
    });
    if (id === scene.presetId) button.classList.add('active');
    wrap.appendChild(button);
  });
}

function buildPanelList() {
  const list = $('panel-list');
  scene.panels.forEach((_, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.addEventListener('click', () => selectPanel(i));
    list.appendChild(button);
  });
}

/** Assigns files to panels, fixing the targets BEFORE any async decode. */
async function handleFiles(files) {
  const list = [...files];
  if (!list.length) return;
  const targets = [];
  for (let i = 0; i < Math.min(list.length, scene.panels.length); i += 1) {
    targets.push((selectedPanel + i) % scene.panels.length);
  }
  if (list.length > scene.panels.length) {
    setStatus(`Only the first ${scene.panels.length} photos were used — this cover has ${scene.panels.length} panels.`, true);
  }
  for (let i = 0; i < targets.length; i += 1) {
    const file = list[i];
    const target = targets[i];
    try {
      const decoded = await decodeLocalPhoto(file);
      const sourceId = `upload-${nextUploadId}`;
      nextUploadId += 1;
      assets.set(sourceId, { kind: 'photo', image: decoded.image, label: file.name });
      scene.panels[target] = { ...scene.panels[target], sourceId };
      clearStylizeCache();
      selectPanel(target);
      setStatus(`“${file.name}” is in panel ${target + 1}.`);
    } catch (err) {
      setStatus(err.message, true);
    }
  }
  queueRender();
}

function resetCrop() {
  const panel = scene.panels[selectedPanel];
  scene.panels[selectedPanel] = createPanelState(panel.sourceId);
  queueRender();
  setStatus(`Panel ${selectedPanel + 1} crop reset.`);
}

function clampSelected() {
  const panel = scene.panels[selectedPanel];
  const source = assets.get(panel.sourceId);
  const img = source && source.image;
  if (!img) return;
  const ratio = ratioOf(scene);
  const layout = getLayout(scene.ratio, presetOf(scene).heroSide);
  const rect = layout.panels[selectedPanel];
  clampCrop(panel, img.naturalWidth, img.naturalHeight, rect.w * ratio.width, rect.h * ratio.height);
}

// ---- Canvas interaction: click to select, drag to pan, wheel to zoom. ----

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const nx = (event.clientX - rect.left) / rect.width;
  const ny = (event.clientY - rect.top) / rect.height;
  return { nx, ny, scaleX: canvas.width / rect.width, scaleY: canvas.height / rect.height };
}

let dragging = null;
canvas.addEventListener('pointerdown', (event) => {
  const { nx, ny } = canvasPoint(event);
  const layout = getLayout(scene.ratio, presetOf(scene).heroSide);
  const hit = hitPanel(layout, nx, ny);
  if (hit === -1) return;
  selectPanel(hit);
  dragging = { x: event.clientX, y: event.clientY, panel: scene.panels[hit] };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const { scaleX, scaleY } = canvasPoint(event);
  dragging.panel.panX += (event.clientX - dragging.x) * scaleX;
  dragging.panel.panY += (event.clientY - dragging.y) * scaleY;
  dragging.x = event.clientX;
  dragging.y = event.clientY;
  clampSelected();
  queueRender();
});
canvas.addEventListener('pointerup', () => {
  dragging = null;
});
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const panel = scene.panels[selectedPanel];
  panel.zoom = Math.min(4, Math.max(1, panel.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12)));
  clampSelected();
  queueRender();
}, { passive: false });

document.addEventListener('keydown', (event) => {
  if (event.target.matches('input, textarea, select')) return;
  const panel = scene.panels[selectedPanel];
  const step = event.shiftKey ? 40 : 12;
  if (event.key === 'ArrowLeft') { panel.panX += step; clampSelected(); queueRender(); }
  else if (event.key === 'ArrowRight') { panel.panX -= step; clampSelected(); queueRender(); }
  else if (event.key === 'ArrowUp') { panel.panY += step; clampSelected(); queueRender(); }
  else if (event.key === 'ArrowDown') { panel.panY -= step; clampSelected(); queueRender(); }
  else if (event.key === '+' || event.key === '=') { panel.zoom = Math.min(4, panel.zoom * 1.15); clampSelected(); queueRender(); }
  else if (event.key === '-') { panel.zoom = Math.max(1, panel.zoom / 1.15); clampSelected(); queueRender(); }
  else if (event.key.toLowerCase() === 'f') { panel.flip = !panel.flip; queueRender(); }
  else if (event.key.toLowerCase() === 'r') { resetCrop(); }
});

// ---- Controls ----

$('title').addEventListener('input', (event) => { scene.title = event.target.value; queueRender(); });
$('subtitle').addEventListener('input', (event) => { scene.subtitle = event.target.value; queueRender(); });
$('location').addEventListener('input', (event) => { scene.location = event.target.value; queueRender(); });
$('ink').addEventListener('input', (event) => {
  scene.ink = Number(event.target.value);
  $('ink-value').textContent = `${Math.round(scene.ink * 100)}%`;
  queueRender();
});
$('treatment').addEventListener('input', (event) => {
  scene.treatment = Number(event.target.value);
  $('treatment-value').textContent = `${Math.round(scene.treatment * 100)}%`;
  clearStylizeCache();
  queueRender();
});
$('zoom').addEventListener('input', (event) => {
  const panel = scene.panels[selectedPanel];
  panel.zoom = Number(event.target.value);
  clampSelected();
  queueRender();
});
$('flip').addEventListener('click', () => {
  const panel = scene.panels[selectedPanel];
  panel.flip = !panel.flip;
  queueRender();
});
$('reset-crop').addEventListener('click', resetCrop);
$('use-all').addEventListener('click', () => {
  applyOnePhotoToAll(scene, scene.panels[selectedPanel].sourceId);
  queueRender();
  setStatus('One photo now fills every panel — each panel keeps its own crop.');
});
$('replace-photo').addEventListener('click', () => $('panel-file').click());
$('panel-file').addEventListener('change', async (event) => {
  await handleFiles(event.target.files);
  event.target.value = '';
});
$('upload').addEventListener('change', async (event) => {
  await handleFiles(event.target.files);
  event.target.value = '';
});
$('dropzone').addEventListener('click', () => $('upload').click());
['dragover', 'dragenter'].forEach((name) => $('dropzone').addEventListener(name, (event) => {
  event.preventDefault();
  $('dropzone').classList.add('over');
}));
['dragleave', 'drop'].forEach((name) => $('dropzone').addEventListener(name, (event) => {
  event.preventDefault();
  $('dropzone').classList.remove('over');
}));
$('dropzone').addEventListener('drop', async (event) => {
  await handleFiles(event.dataTransfer.files);
});

document.querySelectorAll('[data-ratio]').forEach((button) => {
  button.addEventListener('click', () => {
    scene.ratio = button.dataset.ratio;
    document.querySelectorAll('[data-ratio]').forEach((b) => b.classList.toggle('active', b === button));
    queueRender();
    setStatus(`Size: ${RATIOS[scene.ratio].label} ${RATIOS[scene.ratio].width}×${RATIOS[scene.ratio].height}.`);
  });
});

document.querySelectorAll('[data-export]').forEach((button) => {
  button.addEventListener('click', async () => {
    const ratioId = button.dataset.export;
    button.disabled = true;
    setStatus(`Exporting ${RATIOS[ratioId].width}×${RATIOS[ratioId].height}…`);
    try {
      const result = await exportPng(scene, assets, ratioId);
      setStatus(`Saved coastline-stories-${result.width}x${result.height}.png (${(result.bytes / 1024).toFixed(0)} KB).`);
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      button.disabled = false;
    }
  });
});

// Test hook for the browser QA run: real state, real render, real exports.
window.__coastline = {
  scene,
  get assets() { return assets; },
  render,
  selectPanel,
  exportPng: (ratioId) => exportPng(scene, assets, ratioId),
  handleFiles,
};

init();
