// Scene state for Coastline Stories: presets, ratios, panels and captions.
// Every panel owns its own crop state; nothing is shared between panels.

export const RATIOS = {
  landscape: { id: 'landscape', label: 'Landscape', width: 1920, height: 1080 },
  portrait: { id: 'portrait', label: 'Portrait', width: 1080, height: 1350 },
  square: { id: 'square', label: 'Square', width: 1080, height: 1080 },
};

export const PANEL_ROLES = [
  'Hero portrait',
  'Second portrait',
  'Vehicle detail',
  'Coast scene',
  'Neon night',
];

// Each preset is a genuinely different mood: different palette, grade,
// backdrop, title treatment and hero placement. The grade numbers feed the
// pixel pipeline in imaging.js; the palette feeds the renderer.
export const PRESETS = {
  'vice-sunset': {
    id: 'vice-sunset',
    label: 'Vice Sunset',
    heroSide: 'left',
    palette: {
      skyTop: '#2b1b4d', skyMid: '#c94b7a', skyLow: '#ff9a56',
      sun: '#ffd9a0', sea: '#1d2f57', ground: '#241533',
      gutter: '#14091f', frame: '#f7ead9', titleFillTop: '#fff3d6',
      titleFillBottom: '#ffb347', titleOutline: '#2a0f2e', titleShadow: '#7a1e4d',
      accent: '#2de2e6', sub: '#ffe9c9', plate: '#160a24',
    },
    grade: { contrast: 1.12, saturation: 1.25, shadowTint: [38, 20, 64], highlightTint: [255, 166, 88], quantize: 28, ink: 0 },
    titleStyle: 'gradient',
  },
  'neon-night': {
    id: 'neon-night',
    label: 'Neon Night',
    heroSide: 'right',
    palette: {
      skyTop: '#050514', skyMid: '#1b0f3c', skyLow: '#3d1157',
      sun: '#ff2a85', sea: '#0a1030', ground: '#0b0618',
      gutter: '#070312', frame: '#8ef6ff', titleFillTop: '#eafcff',
      titleFillBottom: '#2de2e6', titleOutline: '#12041f', titleShadow: '#ff2a85',
      accent: '#ff2a85', sub: '#b8f6ff', plate: '#0d0220',
    },
    grade: { contrast: 1.18, saturation: 1.35, shadowTint: [10, 8, 44], highlightTint: [255, 64, 150], quantize: 24, ink: 0.55 },
    titleStyle: 'neon',
  },
  'ocean-drive': {
    id: 'ocean-drive',
    label: 'Ocean Drive',
    heroSide: 'top',
    palette: {
      skyTop: '#0e3a5c', skyMid: '#2e8fa3', skyLow: '#ffd9a0',
      sun: '#fff6d8', sea: '#0f5e73', ground: '#123a4d',
      gutter: '#081c26', frame: '#eafcff', titleFillTop: '#ffffff',
      titleFillBottom: '#7fe3ef', titleOutline: '#06222e', titleShadow: '#0e5f7a',
      accent: '#ffb347', sub: '#dff6ff', plate: '#06222e',
    },
    grade: { contrast: 1.08, saturation: 1.18, shadowTint: [10, 48, 66], highlightTint: [255, 214, 150], quantize: 32, ink: 0 },
    titleStyle: 'gradient',
  },
  'classic-collage': {
    id: 'classic-collage',
    label: 'Classic Collage',
    heroSide: 'grid',
    palette: {
      skyTop: '#3a2a4d', skyMid: '#a8546b', skyLow: '#e8a06a',
      sun: '#ffe9b8', sea: '#33415e', ground: '#2a2133',
      gutter: '#1c1426', frame: '#f3e2c7', titleFillTop: '#fdf6e3',
      titleFillBottom: '#e8b06a', titleOutline: '#241428', titleShadow: '#5c2a3a',
      accent: '#e8b06a', sub: '#f3e2c7', plate: '#241428',
    },
    grade: { contrast: 1.05, saturation: 1.1, shadowTint: [44, 34, 52], highlightTint: [232, 176, 106], quantize: 20, ink: 0.35 },
    titleStyle: 'flat',
  },
};

export const PRESET_ORDER = ['vice-sunset', 'neon-night', 'ocean-drive', 'classic-collage'];

/** Builds one panel's independent crop state. No object is ever shared. */
export function createPanelState(sourceId, overrides = {}) {
  return {
    sourceId,
    // Focal point inside the source image, 0..1. The crop window centres
    // on it unless the user pans away.
    focalX: 0.5,
    focalY: 0.38,
    zoom: 1,
    panX: 0,
    panY: 0,
    flip: false,
    ...overrides,
  };
}

/** A fresh scene: the default demo cover. */
export function createScene() {
  return {
    presetId: 'vice-sunset',
    ratio: 'landscape',
    title: 'COASTLINE STORIES',
    subtitle: 'EVERY SUNSET HAS A STORY',
    location: 'LEONIDA • VICE COAST',
    // Poster Ink strength, 0..1. Clean poster is the default.
    ink: 0,
    // Extra treatment strength, 0..1. 0 keeps the grade but skips the
    // heavy pixel work (quantize + ink) for a plain photo look.
    treatment: 1,
    panels: [
      createPanelState('boulevard', { focalY: 0.32 }),
      createPanelState('pier', { focalY: 0.3 }),
      createPanelState('boulevard', { focalX: 0.12, focalY: 0.72, zoom: 1.8 }),
      createPanelState('pier', { focalX: 0.35, focalY: 0.28, zoom: 1.3 }),
      createPanelState('paint-sunset'),
    ],
  };
}

/** Deep-copies a panel state so one-photo-to-all never shares a crop. */
export function clonePanelState(panel) {
  return { ...panel };
}

/** Copies only the source identity into every panel, keeping each crop. */
export function applyOnePhotoToAll(scene, sourceId) {
  for (const panel of scene.panels) panel.sourceId = sourceId;
  return scene;
}

export function presetOf(scene) {
  return PRESETS[scene.presetId] ?? PRESETS['vice-sunset'];
}

export function ratioOf(scene) {
  return RATIOS[scene.ratio] ?? RATIOS.landscape;
}
