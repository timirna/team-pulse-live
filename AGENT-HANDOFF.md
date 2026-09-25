# HANDOFF — Team Pulse / Trust Survey Scorecard

**Client:** Tayler  
**Designer:** Timir Deb Debnath  
**Date:** 2026-09-22  
**Live:** https://timirna.github.io/team-pulse-live/index.html?v=paint23  
**Repo:** https://github.com/timirna/team-pulse-live  

## What it is

Speaking-engagement piece. Night house with stained glass. Survey data from Google Form → Sheet → Apps Script colors panes, shows door %, puts the top Q10 word in the rose.

## What is live now

- GitHub Pages, deploy from `main` / root
- Painted gothic chapel as full-screen images (not the old beige SVG house)
- `assets/painted-house-dark.png` = start (dim)
- `assets/painted-house.png` = after Play Reveal (1.6s opacity fade)
- SVG house is hidden in painted mode (`#svg-mount { display:none }`)
- HTML overlays: title, 5 team pills, focus list, QR, score guide, Play / Replay / Sound
- Reveal hides QR + sidebar + score guide
- Live word + door % still come from the Sheet as overlays
- Pane **recolor** does not show because the SVG is off
- Play is force-enabled in `js/ui-ref.js` so the fade works even if mapping errors

## Tayler’s last feedback

- Windows/rose too flat vs mockup (need faceted multi-shade glass)
- Orange needs several shades per pane
- Reveal light should be warm gold
- Most frequent Q10 word live in rose (not placeholder)
- Soft blend + glass glow if possible
- Hide QR/sidebar during reveal
- A11y icon never on a window
- Swap survey data later without rebuild

## Architecture choice

**A — Current (done):** 2 full paintings, dark→bright. Word + % + labels as HTML. Fast. Does **not** recolor each pane.

**B — Full production:** cut layers from the **same** chapel PNG in Photoshop, same canvas, transparent holes. Then stack + drive glass from live scores.

ChatGPT “layer” exports failed: new buildings, brown fills instead of holes, glass not in register, color fringe.

## Files that matter

| Path | Role |
|---|---|
| `index.html` | cache-bust `ui-ref.js?v=23` |
| `js/ui-ref.js` | painted mode, overlay pin %, dark/bright fade, enable Play |
| `css/ui-ref.css` | chrome layout |
| `js/config.js` | Apps Script URL, `roseWindow.maxWords = 1` |
| `assets/svg/vect-animation-ready.svg` | original interactive house (unused while painted) |
| `assets/painted-house.png` | bright chapel |
| `assets/painted-house-dark.png` | dark chapel |

Painted overlay pins (tweak here if labels drift):

- rose wrap: left 50%, top 32%
- door %: left 50%, top 64%
- team pills xs: `[29.2, 36.4, 61.0, 67.2, 73.4]`, top `58%`

## Do next (pick one)

1. Keep A. Nudge overlay positions. Ship.
2. Do B in Photoshop from the original bright chapel only:
   - `bg`
   - `house` (transparent holes for windows + rose)
   - `windows` (5 glasses in those holes)
   - `rose-glass`
   - `rose-frame`
   - `door-glass`
   - `lights`
   Same pixel size. No AI redraws.
3. If Tayler needs a word on every rose petal → SVG rose on top of the painting.

## Don’t

- Don’t generate a new house per layer
- Don’t bake title / QR / % / word into art
- Don’t paint glow into plates

## How Timir works

Mixed Bangla + English. Short practical steps. Visual first. One-shot instructions.

## 2026-09-26 — colonial house version
- Scene is now a 16:9 colonial brick house (assets/house-night.jpg, assets/house-lit.jpg, assets/chapel-reveal.mp4 = 12s reveal with sound; keep that filename).
- Six tall windows + door transom = the 7 scored questions (Q2-Q7, Q9), left to right; each window has 5 team bands (top to bottom) recoloured per pixel from live scores in survey.js (paintTiles/drawTints). Timing per window is in LIGHT[] and must match the video.
- Door % (Q8) fades in at 8s, rose word (Q10) at 9s, sparks at 10s. QR/sidebar hide during Play.
- Labels (questions, teams, score legend) sit on the house; positions are px in the 1792x1008 artwork (WIN/GLASS/TRANSOM in survey.js).
- Sound comes from the video; the site no longer plays its own audio (audio.js removed from index.html).
