# Coastline Stories — Photo Poster Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![make.fun · rank](https://make.fun/badge/gta6-cover-art-01/radeisv/coastline-stories/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun · reward](https://make.fun/badge/gta6-cover-art-01/radeisv/coastline-stories/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An entry for [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) on make.fun.

Coastline Stories turns your own photos and a caption into a tropical
crime poster: a hero portrait plus four supporting panels, bold original
lettering, and a Vice City sunset or neon grade — exported as a real PNG
to share. Everything runs offline in a desktop browser from the static
files in `app/`; your photos never leave your machine.

## How it works

1. Serve the app: `node serve.ts`, then open http://localhost:8080.
2. Pick a preset (Vice Sunset, Neon Night, Ocean Drive, Classic Collage)
   and a size (Landscape 1920×1080, Portrait 1080×1350, Square 1080×1080).
3. Drop in your photos (JPEG, PNG, WebP) or use the two sample photos.
   Click a panel to select it, drag to move its photo, scroll to zoom,
   F flips it, R resets its crop. Each panel keeps its own crop.
4. Edit the title, tagline and location plate. Tune Poster Ink and the
   photo treatment if you like.
5. Export a PNG at any of the three post sizes.

## What is inside

- `main.ts` — the entry program (Node 22, standard library only). It
  copies `app/` and `screenshots/` to the output directory and writes
  `dossier.json` with the vendored make.fun library.
- `app/` — the offline web app: `index.html`, `style.css`, and the ES
  modules under `app/src/` (`state.js`, `layouts.js`, `imaging.js`,
  `renderer.js`, `editor.js`, `export.js`).
- `app/fonts/` — Anton and Pacifico under the SIL Open Font License
  (see `app/fonts/OFL.txt` and `ASSETS.md`).
- `app/samples/` — two image-model photos made for make.fun, free to use.
- `screenshots/` — the cover the app exported and the editor at work.
- `vendor/makefun-app.ts` — the kit's library, unchanged.

## Originality

All lettering, layouts, palettes and code are original. No Rockstar Games
logo, wordmark, official artwork, character or font is used anywhere.
