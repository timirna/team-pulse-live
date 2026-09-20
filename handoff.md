# HANDOFF — Stained-Glass House Survey Reveal

Agent-to-agent handoff. Read this **before** touching anything. `README.md` is a
chronological changelog of ~9 client feedback rounds; this file is the
current-state summary.

---

## 1. What this is

A single-page, no-build, vanilla HTML/CSS/JS presentation piece for a client
(Tayler Friar). An illustrated house loads dark; clicking **Play Reveal** lights
it up in stages and reveals live survey results:

- **5 stained-glass windows** = 5 teams/departments
- **7 horizontal bands inside each window** = 7 scored questions (35 data cells)
- **Door** = headline Q8 percentage
- **Rose window** = (word display currently REMOVED — see §7)

Data comes from a Google Form → Google Sheet → Apps Script endpoint, with
automatic fallback to mock data.

**Audience:** shown live on a projector by the client. Legibility at presentation
distance matters more than subtlety.

---

## 2. Run it

Must be served over HTTP (uses `fetch()` for the SVG and data) — `file://` will not work.

```bash
python -m http.server 8765 --directory "H:\Claude Work_Output\taylerfriar-house"
```

Then open `http://localhost:8765`.

### Dev-only URL flags
| Flag | Effect |
|---|---|
| `?debug=1` | Stamps `team/question` labels on all 35 panes to verify mapping |
| `?motion=reduced` | Forces the calm/compressed reveal (see §6 — **not** the default any more) |
| `?cb=anything` | Cache-buster; this environment caches aggressively |

---

## 3. File map

| File | Role | Safe to edit? |
|---|---|---|
| `index.html` | DOM skeleton + all script/style tags with `?v=N` cache-busters | Yes — **must bump `?v=N` on every change** |
| `js/config.js` | **Central config.** URLs, column headings, team names, palette, timings, lighting values | Yes — most tuning happens here |
| `js/main.js` | Boot/orchestration, score guide + on-house grid labels | Yes |
| `js/animation.js` | The 10-step reveal sequence, door count-up, Replay | Yes, carefully |
| `js/paneMapping.js` | Builds the 5×7 pane map from live SVG geometry | Rarely |
| `js/colorUtils.js` | score → color, faceted shade variants | Rarely |
| `js/cinematicLighting.js` | Glow overlays (windows/door/haze/rose halo/lamps/moon), vignette | Yes |
| `js/finaleEffects.js` | Flash, glow pulse, sunburst rays, particle burst, QR fade | Yes |
| `js/dataSource.js` | Fetch + mock fallback | Rarely |
| `js/dataProcessing.js` | Row normalisation, averages, Q8 %, Q10 ranking | Rarely |
| `js/svgLoader.js` | Inline-injects the SVG, applies display crop | Rarely |
| `js/qrDisplay.js` | Renders QR from `config.qrCode.url` | Rarely |
| `js/audio.js` | Sound cues; silently no-ops when files missing | Rarely |
| `js/mockData.js` | Deterministic fallback dataset | Rarely |
| `js/vendor/qrcode.js` | Vendored qrcode-generator (MIT) | **No** |
| `assets/svg/vect-animation-ready.svg` | The house artwork | **NEVER EDIT** |
| `apps-script/Code.gs` | Reference copy of the deployed endpoint | Only if redeploying the script |
| `css/styles.css` | All styling | Yes |

---

## 4. Architecture — the non-obvious parts

**Read these before making changes; several were learned the hard way.**

### 4.1 The SVG is loaded inline, never as `<img>`
`svgLoader.js` fetches the file and injects it into the DOM so JS/CSS can reach
internal groups by ID. The source file is **never modified** — all coloring is
done with same-geometry overlay clones layered above each glass fragment.

### 4.2 Everything is positioned from real geometry
Overlays (labels, glows, door text, QR, rays) are positioned by measuring the
live SVG with `getBBox()` + `getCTM()` and converting to percentages of the
SVG's rendered box. This keeps them aligned at any viewport or crop. This helper
pattern is **duplicated locally in each module** rather than shared — that is
the established convention here, not an accident.

### 4.3 The display crop is runtime-only
`config.svg.displayViewBox` (`'234 155 1203 676'`) is applied to the loaded SVG's
`viewBox` attribute at runtime. `config.svg.viewBox` is the true source value and
must not change. `main.js` derives the stage's CSS `aspect-ratio` from the same
config value — if they drift, every percentage-based overlay misaligns.

### 4.4 The grid is TRANSPOSED vs. the client's mockup
The mockup shows departments as rows and questions as columns in one table.
**This house is the opposite:** each window is a team (a column), each of the 7
bands inside it is a question (a row). So on-house labels are:
- **Team names** → column headers above each window (`.grid-col-label`)
- **Question names** → row headers down the left edge (`.grid-row-label`)

Built by `main.js → renderGridLabels()`. Question labels appear once (not per
window) because every window shares the identical band order.

### 4.5 Privacy suppression is real and will confuse you
`apps-script/Code.gs` withholds a team's averages until it has ≥3 responses.
With today's single real response, **all 35 panes render at `opacity: 0.15`** —
the house still looks colourful (that's the artwork's own base colors plus the
lit filters), but no real per-question score is being exposed. This is correct
behaviour, not a bug.

---

## 5. Current state — verified passing

- Team column headers on each window ✅
- Question row headers down the left edge ✅
- Door counts up to a **number** (e.g. `100%`) ✅
- Rose-window word display **removed** ✅
- QR on its own sign, bottom-left in the garden, clears row labels by 2.1% and the
  left window by 3.6% at 1920×1080; QR renders ~108px ✅
- Score Color Guide: discrete 1–5, "Low/High confidence" labels ✅
- Faceted stained glass (multiple shades per pane, one hue family) ✅
- No debug/mock/API text visible anywhere ✅
- Finale effects fire (flash, glow pulse, rays, particles) ✅
- Play → 100% → Replay deterministic; glow element count stable at 16 ✅
- No console errors, desktop or mobile; no horizontal overflow at 375px ✅

---

## 6. ⚠️ CRITICAL GOTCHAS

### 6.1 `prefers-reduced-motion` used to silently kill the entire finale
This was the single biggest bug in the project. The CSS had
`animation: none !important` on `#flash-overlay`, `#sunburst-rays`,
`.finale-particle` and `.finale-glow-pulse` inside a
`@media (prefers-reduced-motion: reduce)` block, **and** `main.js` compressed the
whole reveal to 15% speed for the same setting.

The client's machine has that OS setting on. So for months the reveal looked like
a fast, effect-less colour change on their machine while verifying as "working"
elsewhere. **Both suppressions are now removed** — the finale always plays.
`?motion=reduced` still forces the calm version deliberately.

**Do not re-add reduced-motion gating to the finale.**

### 6.2 NEVER edit files with PowerShell string replacement
Doing so **double-encoded the UTF-8** in `config.js`, mangling every em-dash —
including the one inside the Q8 column heading, which is used to match a Google
Sheet column. Use the Edit/Write tools, or Python with explicit
`encoding='utf-8'`. If you see `â€"` anywhere, the file is corrupted.

Repair recipe:
```python
raw = open(p,'rb').read()
fixed = raw.decode('utf-8-sig').encode('cp1252').decode('utf-8')
open(p,'wb').write(fixed.encode('utf-8'))
```

### 6.3 Cache-bust or your change will not appear
This environment serves stale CSS/JS even on hard reloads. **Every** edit to a
JS/CSS file requires bumping its `?v=N` in `index.html`. Symptom: your change is
in the file and in `document.styleSheets`, but the rendered layout ignores it.

### 6.4 Percentage padding resolves against the CONTAINING BLOCK
`padding: 8% 9%` on a card is 8–9% of the **stage width**, not the card's own
width. Shrinking a card's `width` while leaving `%` padding caused the padding to
exceed the card's width and the box model broke. **Use fixed px padding on small
cards.**

### 6.5 Bounding boxes lie — verify overlaps visually
`#LEFT_WINDOW_01`'s `getBoundingClientRect()` extends past the visible glass.
A bbox overlap check reported a QR/house collision that a screenshot showed
clearly wasn't there. Always cross-check geometry numbers against a screenshot.

### 6.6 `requestAnimationFrame` stalls when the tab isn't fronted
The door count-up uses rAF. In automated testing, if the browser pane isn't
rendering, the reveal hangs mid-sequence and polling scripts time out. Take a
screenshot to force a render. This is a tooling artifact, not a code bug.

### 6.7 The Apps Script endpoint is intermittently flaky
Roughly 1 in 4–5 calls times out or returns a transient 404 (cold start). The
mock fallback handles it gracefully. **If the page shows mock data, reload once.**
Tell the client this before a live show.

---

## 7. Open items / not done

1. **Final reveal sound added (2026-09-15).** The user supplied
   `assets/audio/universfield-magic-spell-278824.mp3`. Config maps it to
   `swell`, starts it 250 ms before the visual pop, and resets it on Replay or
   Sound off. Ambient/chime files are unconfigured. This updated copy is in
   the task outputs folder; the original H: project and deployed site have
   not been updated.
2. **Rose-window words restored from live Q10 data.** `q10Ranked` is rendered
   inside the rose window at the rose reveal step. No literal placeholder is
   inserted; empty Q10 data leaves the window word-free.
3. **Live site is stale.** `https://chimerical-baklava-c1916a.netlify.app/`
   serves an older build. Everything above is local-only.
4. **Mobile column headers wrap mid-word** at 375px. Functional but ugly.
   Low priority — target is a projector.
5. **QR size is a tradeoff.** At 108px it's smaller than ideal because it shares
   the left margin with the row labels. Alternatives: move row labels to the
   right side, or move the QR below the house.

---

## 8. Locked-in decisions — do not "improve" these

These were each fought over across multiple rounds. Changing them will reopen
resolved client complaints:

- **House framing/crop** — do not change `displayViewBox`.
- **Palette** — exactly 5 stops: red → orange → yellow → cyan → deep blue, from
  the client's own written spec table. Do **not** restore the old 7-hue version
  with green/purple.
- **Faceted shading** — multiple shades per pane, all within one hue family.
  Never flat single-color panes.
- **Settled lighting levels** — tuned twice (once too dim, once overexposed).
  Do not brighten the overall house.
- **No debug text in the UI** — `#data-source-status`, `#mock-warning`,
  `#mapping-warning`, `#error-message` are unconditionally `display:none`;
  diagnostics go to the console only. Keep the fallback logic itself.
- **Labels belong ON the house**, never in a key below it.

---

## 9. Data plumbing

- **Form (public):** `https://docs.google.com/forms/d/e/1FAIpQLSdATD2rVVuZtwYL4bk2rqomW3t_oqgvx006OEI7eakOKlNfpQ/viewform`
- **Endpoint:** `config.dataSource.liveDataUrl` (deployed Apps Script `/exec`)
- **Matching:** column headings and team names are matched on a normalised
  (trimmed, lowercased, whitespace-collapsed) string. `columns[*].heading` and
  `teams[*].name` **must stay byte-accurate to the Sheet.**
  `shortLabel` / `shortName` are display-only and safe to change.
- **Q8:** 1–5 scale; ≥4 counts positive. Keep `q8PositiveThreshold` in sync with
  `Q8_POSITIVE_THRESHOLD` in `Code.gs`.

---

## 10. Testing checklist

Run at **1920×1080** and **375×812**:

1. Load → dark state, QR visible/scannable, grid labels present, no debug text
2. Play Reveal → staged build, then flash + rays + particles + glow at 100%
3. Settled state → door shows a number, warm glow, facade not washed out
4. Replay → door clears, scene resets, labels persist (5 col / 7 row),
   `.env-glow` count stays exactly **16**
5. Console → no `Uncaught` / `TypeError` (audio 404s are expected and harmless)
6. `document.body.scrollWidth === window.innerWidth` on mobile

---

## 11. Deploy

Static files; no build step. Netlify, drag-and-drop:

1. Netlify dashboard → the existing site → **Deploys** tab
2. Drag the whole `taylerfriar-house` folder onto the drop zone
3. Same URL, updates in place

Before deploying: confirm `config.svg.debugLabels === false` and that every
`?v=N` in `index.html` was bumped.

After deploying: open the live URL and confirm live data loads (reload once if it
lands on mock — see §6.7).
