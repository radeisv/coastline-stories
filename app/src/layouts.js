// Crop-aware composition maps. Every ratio gets its own layout: a portrait
// cover is laid out as a portrait, never a squashed landscape. All rects
// are normalised (0..1) so the same scene renders at preview and export
// sizes. The hero panel is index 0 in every layout.

const GUTTER = 0.012;
const MARGIN = 0.015;

function rect(x, y, w, h) {
  return { x, y, w, h };
}

function landscapeLayout(heroSide) {
  const artTop = MARGIN;
  const artBottom = 0.815;
  const artH = artBottom - artTop;
  const title = rect(MARGIN, 0.835, 1 - MARGIN * 2, 0.145);
  if (heroSide === 'right') {
    return {
      panels: [
        rect(0.5, artTop, 0.485, artH),
        rect(MARGIN, artTop, 0.2315, artH / 2 - GUTTER / 2),
        rect(0.2585, artTop, 0.2295, artH / 2 - GUTTER / 2),
        rect(MARGIN, artTop + artH / 2 + GUTTER / 2, 0.2315, artH / 2 - GUTTER / 2),
        rect(0.2585, artTop + artH / 2 + GUTTER / 2, 0.2295, artH / 2 - GUTTER / 2),
      ],
      title,
      seal: { x: 0.935, y: 0.9, r: 0.038 },
    };
  }
  if (heroSide === 'top') {
    const rowTop = artTop + artH * 0.62 + GUTTER;
    const rowH = artBottom - rowTop;
    const colW = (1 - MARGIN * 2 - GUTTER * 3) / 4;
    return {
      panels: [
        rect(MARGIN, artTop, 1 - MARGIN * 2, artH * 0.62),
        rect(MARGIN, rowTop, colW, rowH),
        rect(MARGIN + (colW + GUTTER), rowTop, colW, rowH),
        rect(MARGIN + (colW + GUTTER) * 2, rowTop, colW, rowH),
        rect(MARGIN + (colW + GUTTER) * 3, rowTop, colW, rowH),
      ],
      title,
      seal: { x: 0.935, y: 0.9, r: 0.038 },
    };
  }
  if (heroSide === 'grid') {
    const colW = 0.24;
    return {
      panels: [
        rect(0.5 - 0.2425, artTop, 0.485, artH),
        rect(MARGIN, artTop, colW, artH / 2 - GUTTER / 2),
        rect(0.5 + 0.2425 + GUTTER, artTop, colW, artH / 2 - GUTTER / 2),
        rect(MARGIN, artTop + artH / 2 + GUTTER / 2, colW, artH / 2 - GUTTER / 2),
        rect(0.5 + 0.2425 + GUTTER, artTop + artH / 2 + GUTTER / 2, colW, artH / 2 - GUTTER / 2),
      ],
      title,
      seal: { x: 0.935, y: 0.9, r: 0.038 },
    };
  }
  // 'left' (default)
  return {
    panels: [
      rect(MARGIN, artTop, 0.485, artH),
      rect(0.512, artTop, 0.2315, artH / 2 - GUTTER / 2),
      rect(0.7555, artTop, 0.2295, artH / 2 - GUTTER / 2),
      rect(0.512, artTop + artH / 2 + GUTTER / 2, 0.2315, artH / 2 - GUTTER / 2),
      rect(0.7555, artTop + artH / 2 + GUTTER / 2, 0.2295, artH / 2 - GUTTER / 2),
    ],
    title,
    seal: { x: 0.935, y: 0.9, r: 0.038 },
  };
}

function portraitLayout(heroSide) {
  const artBottom = 0.84;
  const title = rect(MARGIN, 0.858, 1 - MARGIN * 2, 0.122);
  if (heroSide === 'right') {
    // Supporting grid on top, hero band at the bottom.
    const gridH = 0.36;
    const rowH = (gridH - GUTTER) / 2;
    const colW = (1 - MARGIN * 2 - GUTTER) / 2;
    return {
      panels: [
        rect(MARGIN, MARGIN + gridH + GUTTER, 1 - MARGIN * 2, artBottom - MARGIN - gridH - GUTTER),
        rect(MARGIN, MARGIN, colW, rowH),
        rect(MARGIN + colW + GUTTER, MARGIN, colW, rowH),
        rect(MARGIN, MARGIN + rowH + GUTTER, colW, rowH),
        rect(MARGIN + colW + GUTTER, MARGIN + rowH + GUTTER, colW, rowH),
      ],
      title,
      seal: { x: 0.93, y: 0.915, r: 0.032 },
    };
  }
  if (heroSide === 'grid') {
    const colW = 0.475;
    const smallH = (artBottom - MARGIN - GUTTER * 3) / 4;
    return {
      panels: [
        rect(MARGIN, MARGIN, colW, artBottom - MARGIN),
        rect(MARGIN + colW + GUTTER, MARGIN, colW, smallH),
        rect(MARGIN + colW + GUTTER, MARGIN + (smallH + GUTTER), colW, smallH),
        rect(MARGIN + colW + GUTTER, MARGIN + (smallH + GUTTER) * 2, colW, smallH),
        rect(MARGIN + colW + GUTTER, MARGIN + (smallH + GUTTER) * 3, colW, smallH),
      ],
      title,
      seal: { x: 0.93, y: 0.915, r: 0.032 },
    };
  }
  // 'left' and 'top': hero band on top, 2x2 supporting grid below.
  const heroH = 0.46;
  const gridTop = MARGIN + heroH + GUTTER;
  const gridH = artBottom - gridTop;
  const rowH = (gridH - GUTTER) / 2;
  const colW = (1 - MARGIN * 2 - GUTTER) / 2;
  return {
    panels: [
      rect(MARGIN, MARGIN, 1 - MARGIN * 2, heroH),
      rect(MARGIN, gridTop, colW, rowH),
      rect(MARGIN + colW + GUTTER, gridTop, colW, rowH),
      rect(MARGIN, gridTop + rowH + GUTTER, colW, rowH),
      rect(MARGIN + colW + GUTTER, gridTop + rowH + GUTTER, colW, rowH),
    ],
    title,
    seal: { x: 0.93, y: 0.915, r: 0.032 },
  };
}

function squareLayout(heroSide) {
  const artBottom = 0.8;
  const title = rect(MARGIN, 0.82, 1 - MARGIN * 2, 0.155);
  if (heroSide === 'grid') {
    const rowTop = MARGIN + 0.5 + GUTTER;
    const rowH = artBottom - rowTop;
    const colW = (1 - MARGIN * 2 - GUTTER * 2) / 3;
    return {
      panels: [
        rect(MARGIN, MARGIN, 0.55, 0.5),
        rect(MARGIN + 0.55 + GUTTER, MARGIN, 1 - MARGIN - (MARGIN + 0.55 + GUTTER), 0.5),
        rect(MARGIN, rowTop, colW, rowH),
        rect(MARGIN + colW + GUTTER, rowTop, colW, rowH),
        rect(MARGIN + (colW + GUTTER) * 2, rowTop, colW, rowH),
      ],
      title,
      seal: { x: 0.93, y: 0.895, r: 0.04 },
    };
  }
  // Hero band on top, four supporting panels in a row below.
  const heroH = 0.5;
  const rowTop = MARGIN + heroH + GUTTER;
  const rowH = artBottom - rowTop;
  const colW = (1 - MARGIN * 2 - GUTTER * 3) / 4;
  return {
    panels: [
      rect(MARGIN, MARGIN, 1 - MARGIN * 2, heroH),
      rect(MARGIN, rowTop, colW, rowH),
      rect(MARGIN + (colW + GUTTER), rowTop, colW, rowH),
      rect(MARGIN + (colW + GUTTER) * 2, rowTop, colW, rowH),
      rect(MARGIN + (colW + GUTTER) * 3, rowTop, colW, rowH),
    ],
    title,
    seal: { x: 0.93, y: 0.895, r: 0.04 },
  };
}

/** Returns { panels: [5 rects], title: rect, seal } for a ratio + preset. */
export function getLayout(ratioId, heroSide) {
  if (ratioId === 'portrait') return portraitLayout(heroSide);
  if (ratioId === 'square') return squareLayout(heroSide);
  return landscapeLayout(heroSide);
}

/** Converts a normalised rect to pixels for a canvas of width w, height h. */
export function toPixels(r, w, h) {
  return { x: r.x * w, y: r.y * h, w: r.w * w, h: r.h * h };
}

/** Finds which panel (index) contains normalised point (nx, ny), or -1. */
export function hitPanel(layout, nx, ny) {
  for (let i = 0; i < layout.panels.length; i += 1) {
    const p = layout.panels[i];
    if (nx >= p.x && nx <= p.x + p.w && ny >= p.y && ny <= p.y + p.h) return i;
  }
  return -1;
}
