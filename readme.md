# Team Pulse Survey — Stained-Glass House Reveal

An animated, data-driven webpage built around a stained-glass house
illustration. The house loads dark and unlit; clicking **Play Reveal** lights
it up in stages and ends by showing the survey's Q8 percentage on the door
and the top Q10 words in the rose window. The 35 stained-glass panes (5 teams
× 7 scored questions) light up with colors reflecting each team's real
average scores.

**Status: connected to live data.** The page pulls from a real Google Sheet
via a privacy-preserving Apps Script endpoint (aggregated results only — see
"Privacy design" below) and falls back to realistic mock data automatically
if that endpoint is ever unreachable.

## Quick start (run it locally)

Vanilla HTML/CSS/JS, no build step — but it uses `fetch()` to load the SVG
and data, so it must be served over HTTP, not opened as a `file://` URL:

```bash
python -m http.server 8765 --directory "H:\Claude Work_Output\taylerfriar-house"
```

Then open **http://localhost:8765**. Any static file server works
(`npx serve .`, VS Code's Live Server, etc.).

## Publishing to a public URL

The project is 100% static files (no server-side code of its own — the only
backend is the Google Apps Script endpoint it calls, which is already live).
That makes it deployable to any static host. Recommended path:

### Option A — Netlify Drop (fastest, no account required to try it)

1. Go to **[app.netlify.com/drop](https://app.netlify.com/drop)**.
2. Drag the entire `taylerfriar-house` folder onto the page.
3. Netlify uploads it and gives you a live URL immediately
   (something like `https://random-name-123.netlify.app`).
4. To keep the link permanently (Netlify Drop links without an account can
   expire) and get a nicer name: click **"Sign up to save this site"**,
   create a free account, then under **Site settings → Change site name**
   pick something like `taylerfriar-house-reveal` for a URL like
   `https://taylerfriar-house-reveal.netlify.app`.
5. Done — that URL is what you share for the presentation. Every file
   (`index.html`, `css/`, `js/`, `assets/`) needs to go up together, so drag
   the whole project folder, not just `index.html`.

**To redeploy after a change (same site, not a new one):** drag the
`taylerfriar-house` folder onto [app.netlify.com/drop](https://app.netlify.com/drop)
again while signed into the account that owns your existing site, OR go to
your site in the Netlify dashboard → **Deploys** tab → drag the folder onto
the drop zone there. Either way this updates the existing site in place —
same URL, same site — it does **not** create a new Netlify project. Only
"New site from..." flows in the dashboard create a new project; plain
drag-and-drop onto an already-claimed site's Deploys tab (or re-dropping
while logged into that account) always targets the existing one.

### Option B — GitHub Pages (if you already use GitHub / want version control)

1. Create a new GitHub repository, push this folder's contents to it.
2. Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch:
   `main` / `(root)` → Save.
3. GitHub gives you a URL like `https://<username>.github.io/<repo-name>/`
   within a minute or two.

### Things that just work regardless of host

- All file references in `index.html` are relative paths — no hardcoded
  `localhost` anywhere, so it works unmodified on any domain.
- The Apps Script endpoint already sends `Access-Control-Allow-Origin: *`,
  so it'll respond to requests from whatever domain you deploy to — no CORS
  configuration needed on your end.
- HTTPS: both Netlify and GitHub Pages provide it automatically, which
  avoids mixed-content issues since the Apps Script endpoint is HTTPS too.

### One thing to double-check after publishing

Open the published URL and confirm the status strip shows **"Live Google
Sheet data"** (not "Mock data") within a few seconds — this confirms the
public deployment can reach the Apps Script endpoint just as well as
localhost could.

## Project structure

```
taylerfriar-house/
  index.html                    Page shell + all DOM hooks
  css/styles.css                 Visual styling, lighting states, responsive rules
  js/config.js                    CENTRAL CONFIG — almost everything editable lives here
  js/mockData.js                  Deterministic mock survey rows (automatic fallback)
  js/dataSource.js                Fetches/parses the live endpoint, falls back to mock
  js/dataProcessing.js            Normalizes rows, computes averages / Q8% / Q10 ranking
  js/svgLoader.js                 Loads the SVG inline, validates every required/optional ID
  js/paneMapping.js               Builds the 5×7=35 pane mapping from real SVG geometry
  js/colorUtils.js                1-5 score -> palette color (interpolated)
  js/audio.js                     Optional sound cues, muted fallback if files are missing
  js/qrDisplay.js                 Renders the QR code (responder URL only)
  js/animation.js                 The full 10-step reveal sequence + Replay
  js/finaleEffects.js             The 100% capstone: flash/glow/rays/particles/QR-fade
  js/cinematicLighting.js         Environmental window/door glow spill, haze, vignette
  js/main.js                      Boots everything, wires the UI
  js/vendor/qrcode.js             Vendored qrcode-generator lib (MIT, no external CDN)
  assets/svg/vect-animation-ready.svg   The house illustration, unmodified
  assets/audio/                   Empty — drop mp3s here (see "Audio" below)
  apps-script/Code.gs              The deployed aggregation endpoint's source (reference copy)
```

## Configuration reference (`js/config.js`)

Everything below lives in this one file:

| What | Where | Current value |
|---|---|---|
| Live data URL | `dataSource.liveDataUrl` | Deployed Apps Script `/exec` endpoint |
| Column headings | `columns` | Real headings from the response Sheet |
| Team names | `teams[*].name` | The 5 real team names, confirmed by the client |
| Q8 scoring rule | `q8PositiveThreshold` | `4` — a Q8 answer of 4 or 5 (of 1-5) counts as positive |
| Color palette | `scorePalette` | 5-point red→orange→yellow→turquoise→blue, plus `#EBFC34` accent |
| Rose window words | `roseWindow` | Top 6 words, stop-word list, font size range |
| Reveal timing | `animation` | All step delays, stagger timing, cluster count |
| Audio | `audio.files` | Paths only — no files included yet |

If a question's wording ever changes in the Form, update the matching
`heading` string in `columns` — nothing else needs to change for the CSV
path. The Apps Script path reads by column position (A–K), not heading text,
so it's unaffected by wording changes.

## How the 35 panes work

The artwork's stained-glass windows are hand-illustrated mosaics — not
pre-divided into 7 labeled cells. `js/paneMapping.js` figures this out live,
every time the page loads, using the browser's own geometry APIs
(`getBBox()`/`getCTM()`): each window is sliced into 7 horizontal bands, and
every colored glass shape (lead lines excluded by color) is assigned to
whichever band its center falls in. Coloring never touches an original path
— a transparent same-geometry overlay is layered on top and only the
overlay's opacity/fill is animated, so the original artwork is unmodified.

## Composition, palette, and legend — client feedback round, 2026-09-15

**Tighter framing.** The house now reads much larger/closer, matching the
reference mockups (`G:\taylerfriar\The House Fully Lit.png` /
`Moonlit Stained-Glass Mansion.png`). This is a **display-only crop** — set
via `js/config.js` → `svg.displayViewBox` and applied to the loaded SVG's
`viewBox` attribute at runtime in `js/svgLoader.js`. The source `.svg` file
on disk is completely untouched; every shape inside it is unmodified. The
crop bounds were derived from real measured geometry (chimney top to porch
steps, ~8% padding, centered on the house's true horizontal center) rather
than eyeballed, and deliberately preserve the original ~1.78 (16:9-ish)
aspect ratio so the stage still fills a 1920×1080 screen with no letterboxing
— `js/main.js` sets the stage's CSS `aspect-ratio` from this same config
value at boot, so the two can never drift out of sync.

One accepted trade-off: the two outermost of the four path lights
(closest to the left/right edges of the original wide driveway) fall
outside this tighter frame. The two inner ones (nearest the steps) remain
fully visible. All four still function identically in the data/reveal
logic either way — this only affects whether the outer two are visible on
screen, not whether they "turn on."

Because every overlay position (door %, rose words, pane tints, sunburst
rays, particles) is computed live via `getBBox()`/`getCTM()` against
whatever viewBox is active, nothing needed to change in any of that code
for the crop to work — confirmed by testing, not just assumed.

**Palette (updated again, round 2, 2026-09-15).** Client feedback was that
the house read as dominated by only yellow/green/blue. `js/config.js` →
`scorePalette.stops` is now a genuine 7-hue spectrum — red, orange, yellow,
**green**, teal/cyan, blue, **purple** (green and purple are new; the
previous round only had 5 points and no true green or purple) — evenly
spread across the 1-5 score range and interpolated smoothly between
consecutive stops via `js/colorUtils.js` → `scoreToColor()`. No reference
mockup found actually showed the red/orange/purple ends of this spectrum in
use (every one only depicted mid-to-high scores), so the exact hues are
built from the client's written spec/examples rather than copied pixel
values — flagged here rather than glossed over. Verified programmatically
that `scoreToColor(1)` renders true red and `scoreToColor(5)` renders true
purple.

**Faceted pane shading (new, round 2).** The client's reference screenshots
showed each pane as several distinct tonal facets (e.g. "blue pane → dark
blue + medium blue + cyan facets"), not one flat wash — which is what the
previous `mix-blend-mode: hue` technique produced. `js/paneMapping.js` now
tags each pane's individual glass fragments dark/medium/light
(`data-shade-tier`, terciles by that fragment's own original luminance
within its pane, so every pane gets a genuine mix of all three regardless of
its own absolute brightness) and `js/animation.js` → `lightPane()` maps each
tier to a shade of the pane's resolved score color via `ColorUtils.
shadeVariants()`. The overlay blend mode changed from `hue` to `normal` at
high opacity (0.92) — `hue` blending discards the overlay's own lightness in
favor of the backdrop's, which was flattening out any tiered shading;
`normal` is what makes the facets actually read as distinct. The original
black lead-line paths are never covered by an overlay at all, so they stay
fully visible regardless. Set `js/config.js` → `facetedPaneShading: false`
to revert to one flat color per pane.

**Legend (updated, round 2).** `#score-legend` is now a gradient bar (not
discrete swatches) spanning all 7 stops, generated in `js/main.js` →
`renderScoreLegend()` directly from `scorePalette.stops` — a gradient reads
more honestly as "continuous score" than 5-7 discrete chips would, and it
can never fall out of sync with the actual pane colors since it's built
from the same config.

**Facet cohesion + luminosity (round 3).** Client feedback: facets read as
"unrelated colors randomly placed" rather than one family, and the darker
red/orange/blue/purple shades didn't look "illuminated" at 100%. Both fixed
entirely inside `js/colorUtils.js` → `shadeVariants()` - nothing upstream
(the spectrum, tiering, pane mapping) changed:
- Tighter lightness/saturation deltas between dark/medium/light (was ±16-18
  L / 6-10 S, now ±11-13 L / 4-6 S) so the three tiers read as clearly the
  same hue family.
- A perceptual-luminance floor (`liftToLuminance()`, using the same
  relative-luminance formula already used for lead-line detection) lifts a
  pane's medium tone - and separately its dark tone - toward comparable
  "litness" across hues. This is *why* it specifically brightens red and
  purple (perceptually dark at the same HSL lightness as yellow/green) while
  leaving already-bright hues alone, rather than a flat brightness add that
  would either barely help the dark hues or wash out the bright ones.
- Verified numerically (not just by eye): red's medium tone lifted from
  luminance 0.35 to 0.42, purple 0.35 to 0.42, while yellow/green/teal (already
  above the floor) were untouched; saturation stayed in the 63-87% range
  across all three tiers of every hue (confirmed not washing out toward
  pastel), and all 7 hue families were confirmed present in a full-range
  test render (red/orange/green/teal/blue/purple all >8 panes each).

**Richer luminosity (round 4).** Client feedback: still too muted/pastel
vs. the reference, using the rose window's own lit-state filter
(`#ROSE_GLASS.lit-strong` → `brightness(1.4) saturate(1.35)`) as the target.
Root cause found in round 3's "light" facet: it *reduced* saturation while
raising lightness - lighter + less saturated is literally the pastel
formula. Fixed in `js/colorUtils.js` → `shadeVariants()`/`vividLift()`: every
tier now gets both a saturation floor (66-70%) and a luminance target
(0.27/0.47/0.63 for dark/medium/light, up from 0.22-0.40), so "brighter"
means "more saturated gem catching light," not "washed toward white."
Tier-to-tier deltas stay tight (still one coherent family per pane, not
neon extremes). Same 7-stop spectrum, same tiering, same everything else -
confirmed via a full-range synthetic render and re-verified Play/Replay on
real data afterward.

## The finale (the "100%" capstone pop) — client feedback round, 2026-09-15

The last beat of the reveal was reworked per client feedback, in `js/animation.js`
(the sequencing) and the new `js/finaleEffects.js` (the effects themselves).
Everything before this point in the sequence — teams, panes, Q8/Q10
calculations, the SVG itself — is completely unchanged.

**Pacing.** The house now holds at ~90% brightness (`.scene-nearly-lit`,
using the same slow transition as the rest of the build) once the rose
window finishes revealing, then does one deliberately fast/snappy jump to
100% (`.scene-lit`, its own short transition — `finale.popTransitionMs`,
260ms by default). That's the "builds slowly, then pops" pacing.

**Synchronized at the pop:**
- A short white camera-flash overlay (`finale.flashDurationMs`, 160ms —
  within the 100-200ms asked for; default fill-mode means the screen is
  never left white, it always reverts to fully transparent on its own).
- A warm golden glow pulse on the door and all 5 team windows
  (`finale.glowPulseMs`/`glowSettleOpacity`) — layered on top of their
  existing lit-state filter via a CSS keyframe, so it expands quickly and
  settles to a softer persistent warmth rather than staying blazing.
- Sunburst rays behind the roofline (`#sunburst-rays`, sized/positioned at
  runtime from the rose window's real geometry) that pulse open and fade to
  nothing (`finale.raysPulseMs`).
- A small gold particle burst at the doorway (`finale.particleCount`,
  `particleBurstMs`, `particleColor`) — deterministic (seeded), synchronized
  with a replay of the existing "swell" sound cue as the finale flourish (no
  new audio files added).
- The QR code fades out (`finale.qrFadeOutBeforePopMs`/`qrFadeMs`) shortly
  before the pop so it doesn't visually compete with it, and is fully
  restored (class removed, not just faded back in) every time Play/Replay
  resets — see `FinaleEffects.resetAll()`.

All of it is tunable from `js/config.js` → `finale` without touching any
other logic. `prefers-reduced-motion` is respected throughout: the flash,
glow pulse, rays, and particles are all suppressed for users with that OS
setting (verified during testing that this browser environment itself
reports reduced-motion — confirming the suppression works correctly), while
the QR-restore and pacing logic still function normally either way.

## Atmospheric polish toward client's mood reference, 2026-09-15 round 8

Client sent an AI-generated mood/reference image (painterly art style, warm
glowing walkway lamps, luminous moon halo, a spotlit QR sign with a
tagline) and asked to move the visual look in that direction. Set clear
expectations first: the actual house/trees/moon are a fixed hand-illustrated
vector SVG that every data hookup (pane colors, window/door geometry,
team/question mapping) depends on exactly as-is - repainting it into a
different, more painterly art style isn't something achievable via CSS/JS
and wasn't attempted. What WAS achievable and implemented, all additive to
the existing artwork:

- **Path/porch light glows** (new): a small warm glow on each of the 3
  porch lights and 4 path lights, added to `js/cinematicLighting.js` ->
  `setup()`/`buildSmallLightGlow()`, fading in at the exact same moment
  each light's existing staggered `.lit` class is applied in `js/
  animation.js` (no new timing - same trigger, an added visual only).
- **Moon halo** (new): a soft always-on glow around the moon - found
  geometrically (the largest `<ellipse>` inside `#A3_01_SKY_STARS_MOON`;
  every other shape there is a tiny few-px star, the moon is ~30x larger,
  so this is robust without needing a dedicated hook id). Unlike every
  other glow in this module, it is NOT tied to the reveal sequence - it's
  part of the static night sky, present from the very first frame like the
  moon itself, and `resetAll()` explicitly excludes it so Replay never
  touches it.
- **QR sign spotlight + tagline** (new): a soft radial "lamp" glow above
  the sign board (`.qr-stand-spotlight`), and a short italic tagline under
  the QR ("Your voice shapes what comes next.") matching the reference's
  layout - generic, non-data copy, nothing about survey content invented.

Verified: no console errors, glow element count stable at exactly 16 (5
windows + door + haze + rose halo + 7 small lights + moon) across 3+
Play/Replay cycles with no duplicates, moon glow confirmed present and
unaffected by Replay/reset (stays at its opacity through a reset, unlike
every other glow which correctly clears to 0), 375x812 mobile has no
horizontal overflow. Score Color Guide/Teams/Questions positions, pane
colors, mapping, API/Sheet logic, privacy logic, and reveal sequencing are
all unchanged.

## QR stays visible through 100%, 2026-09-15 round 7

Client saw a screenshot of the settled 100% state and asked whether the QR
was missing - it wasn't (the sign board was rendering correctly, just the
QR itself was faded per the round-4 request to hide it during the pop).
Asked directly and the client chose to reverse that earlier decision: the
QR should now stay visible all the way through the settled 100% state too,
on the reasoning that the audience is most likely to want to scan exactly
when the result is shown, not only before the reveal starts.

`js/animation.js`: removed the `FinaleEffects.fadeOutQr(...)` call at the
finale trigger. The pre-pop `scaledSleep(fin.qrFadeOutBeforePopMs)` pause
was deliberately kept as-is so overall reveal pacing doesn't shift - only
the QR's own fade action was removed. `FinaleEffects.restoreQr()` (used in
`resetAll()`) is untouched and still harmless/idempotent.

Verified: QR opacity is `1` at both the "Reveal complete." settled state
and immediately after a Replay reset - stays visible throughout the entire
sequence now, no console errors.

## Settled-state cinematic lighting boost, 2026-09-15 round 6

Client feedback: the transient flash/rays/particles technically worked,
but once they faded the settled 100% state read as merely "colored," not
"dramatically illuminated" - wanted a persistently glowing resting state
without repeating round 1's overexposure mistake. This round only touches
`cinematicLighting` values/module and one new CSS class - reveal
sequencing/timing, layout, QR, Score Color Guide, Teams/Questions,
house artwork, and pane colors are all untouched.

- **Window glow**: `windowGlowOpacity` 0.38→0.5, `windowGlowSizeFactor`
  1.6→1.9 (round 1 had gone as high as 0.65/2.6 before overexposing -
  this stays well under that).
- **Door glow** (kept the strongest/largest by a clear margin over the
  windows, as before): `doorGlowOpacity` 0.55→0.7, `doorGlowSizeFactor`
  2.4→2.8, and its downward offset toward the steps
  (`doorGlowStepsOffsetPct`, new named constant, was a hardcoded `+6`)
  increased to 8 for more visible spill onto the entrance/steps
  specifically.
- **New: a subtle residual halo behind the roof/rose-window area**
  (`roseHaloColor/Opacity/SizeFactor/BuildMs`, new `js/
  cinematicLighting.js` -> `setup()`/`buildHaze()` additions, anchored to
  `#ROSE_FRAME`). Fades in at the same existing "rose window" reveal
  trigger as the haze (no new timing), and is included in the finale
  `pulseAndSettle()` so it settles to its resting opacity right as the
  transient sunburst rays (anchored to the same area) finish fading -
  keeping that part of the house from going visually "dead" once the rays
  are gone. Deliberately low opacity (0.16 settled) and sized as ambient
  backdrop rather than a bright spot, so it doesn't compete with the
  already-toned-down rose window word text from an earlier round.
- **Vignette** 0.6→0.68 for stronger edge/background contrast against the
  now-brighter glows.
- **Finale pulse multiplier** 1.7→1.55 - trimmed slightly since the
  settled base itself is higher this round, keeping the momentary peak
  during the pop from clipping/overexposing.
- The `.env-glow` gradient falloff in css/styles.css (the actual fix for
  round 1's overexposure) was deliberately left untouched - only the
  per-instance opacity/size values changed, not the shape of the falloff
  that keeps light localized to its source.

Verified at true 1920x1080: doorway reads as the clear strongest light
source with visible warm spill onto the steps, soft persistent glow around
all 5 windows, a subtle warm halo visible behind the rose window/roofline,
cream facade/columns still read as cream (not white/washed), stained-glass
facets stay vivid with crisp black lead lines, background trees/edges stay
dark for contrast. Ran a full Replay - glow element count stayed exactly 8
(5 windows + door + haze + rose halo, no duplicates), fully deterministic.
No console errors, 375x812 mobile confirmed no horizontal overflow.

## Final refinements, 2026-09-15 round 5

**1. Score Color Guide overlap fixed.** Confirmed via direct geometry
measurement (not eyeballing) that the guide's left edge sat at ~79% of
stage width while the rightmost window's own right edge measured ~88.6% -
a real ~9.6-percentage-point overlap onto the glass. Moved the card
further right (`right: 0.5%`) and narrowed it (`width: 10%`, `min-width`
62px, `max-width` unchanged at 165px) so its left edge now clears the
window at every viewport tested (816px test width: +0.9pt clearance;
1920px: +2.2pt clearance).

Also found and fixed a real CSS bug while narrowing this card: its
padding was `8% 9%` - percentages that resolve against the STAGE's width
(not the card's own width, per the CSS spec), which was fine when the
card itself was 18% of the stage, but once narrowed the padding alone
(~130-147px on a ~1900px stage) exceeded the card's intended width
entirely, and the box rendered far wider than specified as a result.
Switched to fixed pixel padding (`10px 12px`), which fixed it and is more
predictable regardless of the card's own width going forward.

**2. Status text simplified.** `js/main.js` -> the idle-state message is
now exactly `Click "Play Reveal" to begin.` (redundant "Ready." removed).

Re-verified after both fixes: QR still visible/scannable in the idle
state and fades/restores correctly with Play/Replay, all debug-text
elements still `display:none`, house framing/pane colors/Teams-Questions
key/mapping/API/privacy logic all unchanged, no console errors.

**Finale checklist, verified against the client's list:**
- Radiating golden glow at 100%, snappy (not gradual) pop, QR fade, and
  vivid multidimensional pane colors are all directly visible in the
  settled-100% screenshot below.
- White flash, sunburst rays, and the particle burst are transient by
  design (all fade back to 0 within ~1-1.1s of the pop, per `js/
  finaleEffects.js`) - they're intentionally NOT present in a "settled"
  screenshot, so a static image of the settled state can't show them.
  Verified they still fire correctly a different way: their CSS keyframe
  definitions (`finaleFlashPop`, `sunburstPulse`, `finaleParticleBurst`,
  `finaleGlowPulse`) are all still intact with their full interpolation
  steps, and a live replay confirmed 10 real `.finale-particle` elements
  get created during the pop window (matching `finale.particleCount`).
  None of this code was touched by any of today's fixes (only door/rose
  text, the score guide's CSS, and the debug-text visibility were
  changed), so nothing about it should have regressed - but flagging the
  screenshot-vs-transient-effect distinction explicitly rather than
  glossing over it.

## Production visibility fixes, 2026-09-15 round 4

Two concrete bugs, found by actually looking at a screenshot rather than
trusting DOM checks alone - house/windows/colors/score guide/keys/cinematic
reveal/mapping/API/privacy/framing all untouched.

**1. QR was real but effectively invisible at wide/projector widths.**
`.qr-stand`'s `max-width: 190px` was the bug: at the stage's actual
1900-2100px range the sign should have been ~13% (~250-270px) but the cap
silently held it to 190px regardless, and the QR inside it (after the
sign's own padding) rendered small enough that a downscaled screenshot
made it look blank. Raised the cap to 300px (width share also nudged
13%→15%) - confirmed at true 1920x1080 the QR is now unmistakably large
and legible, not just present in the DOM. It's an SVG (vector, via the
vendored qrcode-generator), so this size increase stays perfectly crisp,
no blur. Same corner position, same fade-before-the-pop /restore-on-
Replay behavior, same destination URL - only how large it renders changed.

**2. All debug/technical text now hidden from the visible page, not just
conditionally.** `#data-source-status` ("Live Google Sheet data..." /
"Mock data..."), `#mock-warning` (the "...Configure js/config.js ->
dataSource.liveDataUrl... README.md" text), `#mapping-warning`, and
`#error-message` are now `display: none !important` unconditionally in
css/styles.css - not the `.hidden` class js/main.js was toggling before
(which only hid them in some states, e.g. `#mock-warning` was fully
visible whenever the mock fallback was active). The underlying detection/
fallback logic in js/main.js is completely unchanged - it still sets all
the same text into these elements - every one of those call sites now
also `console.info`/`console.warn`/`console.error`s the same message, so
a developer checking before a live show still has full visibility via
devtools, while an audience sees nothing. `#status-line` (the normal
presentational "Ready...", "Reveal complete." progress text) was
deliberately left alone - it isn't debug information.

Verified: at true 1920x1080, confirmed via computed `display` that all
four elements are `none` while their `textContent` is still being
populated (fallback logic intact) and the same messages now appear in the
console. Played a full reveal + Replay - QR fades/restores correctly, no
new console errors, no visible debug text anywhere on the page at any
point. Also re-checked 375x812 mobile with no horizontal overflow from
the larger QR sign.

## Final correction pass, 2026-09-15 round 3

Composition approved; this round fixes five specific remaining issues
without touching house size/framing, QR/score-guide/key positions, pane
colors, or any survey/data functionality.

**1. Rose word no longer reads as "READY".** Root cause found: `.rose-word`
had `font-variant: small-caps`, which renders the real word "ready" (the
actual Q10 response - confirmed via grep, never a hardcoded placeholder)
as "READY" - visually identical to a generic app status message. Removed
small-caps entirely, switched to a lighter italic serif with a muted cream
color and a near-flat shadow (no glow halo), and removed the
per-word score-palette coloring in `js/animation.js` -> `renderRoseWords()`
(vivid data colors on the word text read as a data readout). The actual
word(s) shown are unchanged - this was a styling-only fix.

**2. No percentage anywhere on the house.** `js/animation.js`'s `countUp()`
(which animated and displayed `{n}% YES`) is replaced with
`revealDoorResult()`, which shows only the word "Yes" - and only when the
real data genuinely supports it (`q8Total > 0 && q8Percentage >= 50`) -
never a number. The underlying `q8Percentage` computation is completely
unchanged (still used for the screen-reader-only announcement, for
accessibility) - only what's visually shown on the house changed. Verified
both branches: mock data's real 30% correctly shows nothing (below
threshold), and a simulated 100%-equivalent state correctly shows "Yes"
with no number attached.

**3. QR code confirmed rendering correctly.** The "empty box" reported was
the QR mid-way through its existing fade-out-before-the-pop behavior in a
100%-state screenshot, not a bug - confirmed by capturing the idle/settled
state instead, where the QR renders as a real, dense, scannable code (a
2026-05-15 status: `qrPathD_length` ~22,000 characters of real path data,
not a placeholder). Destination URL reconfirmed unchanged.

**4/5. Score Color Guide and Teams/Questions key enlarged in place.**
Same corner positions, same overall card proportions - only text/swatch/
badge sizes and padding increased. Score guide: title
clamp(9-14px, was 7-11px), rows clamp(9-14px, was 7-11px), swatches 13px
(was 10px) - roughly +25%. Info panel (Teams/Questions): title 12px (was
10px), rows 13px (was 11px), badges 14px (was 12px) - roughly +18%,
deliberately smaller than the score guide's increase so it stays visually
subordinate per the "without making the card dominate the house"
instruction.

Re-verified after all of the above: faceted shading, cinematic
finale (flash/glow/rays/particles), Play/Replay, and 375x812 mobile (no
overflow) all still work exactly as before - none of that logic was
touched this round.

## Composition rework — house as hero, 2026-09-15 round 2

Client feedback after seeing round 1 of the final-reference work: the
information architecture was right but the composition wasn't - "the house
must be the hero," not shrunk to make room for three equal-sized dashboard
cards underneath it. This round is a layout/visual pass only; no data
logic, scoring, mapping, privacy threshold, or the underlying QR
URL/behavior changed.

- **House enlarged substantially.** `.stage` went from sharing a flex row
  with an equal-height QR panel (`min(96vw, 1720px)` split two ways) to
  `width: min(99vw, 2100px)` on its own - the house is now the only
  full-width element on the page.
- **QR restored to an actual working sign, not an empty card.** It's now a
  small prop drawn INSIDE the scene (bottom-left, `position: absolute`
  inside `.stage`, sized as a % of stage width so it scales with the
  house), styled with a wood-tone gradient board + a short "post" bar
  underneath so it reads as a freestanding sign like the client's
  reference, not a flat UI panel. `js/qrDisplay.js` and the QR's
  destination URL are completely untouched - only its container/position
  changed. (The "empty box" the client saw in round 1 was the QR faded out
  by the finale's existing fade-before-pop behavior, viewed after a full
  reveal - confirmed the QR renders correctly on load/reset and only fades
  during the pop, same as before.)
- **On-house floating numbered circles removed.** Category/question
  identification is now purely positional: the 5 windows read left-to-right
  in the same order `js/main.js` -> `renderInfoPanel()`'s TEAMS column
  lists them, and every window's 7 rows read top-to-bottom in the same
  order the QUESTIONS column lists them - no on-house markers needed.
  `js/paneMapping.js` -> `computeTeamWindowRects()` (only used for those
  badges) was removed as dead code along with it.
- **Score Color Guide + Teams + Question Key kept, made compact and
  subordinate.** The score guide is now a small card drawn IN the scene
  (bottom-right, matching the client's own mockup placement), sized as a %
  of the stage. Teams and Questions were merged into one small two-column
  `#info-panel` below the house (`renderInfoPanel()`, replacing the
  separate `renderTeamKey()`/`renderQuestionKey()`/on-house-badge
  functions) instead of two more equal-sized cards. All three still read
  straight from `js/config.js`, so they can't drift out of sync with the
  actual pane colors or question mapping.
- **Debug-looking text toned down, not deleted.** The client's own
  reference doc explicitly wants the door to show "the key Yes/No
  statistic" (mockup: "76% YES") and this round's instruction said to
  remove specifically the "giant"/status-label LOOK - so the underlying
  data still displays (core score data, not appropriate to just delete),
  but drastically smaller and restyled: door text font-size cut from
  clamp(22-42px) to clamp(11-17px), the loud multi-layer neon glow replaced
  with a single soft shadow in a warm gold tone, no more pill background.
  `js/config.js` -> `roseWindow.minFontPx`/`maxFontPx` cut from 12/30 to
  7/16 so even a single word no longer dominates the whole rose window.
- **Faceted shading and the cinematic reveal (100% pop, flash, glow spill,
  rays, particles) are unchanged** - re-verified working after this
  layout pass, not re-implemented.
- Verified at true 1920x1080 (not just the ~650-800px default preview
  width, which was previously hiding the intended side-by-side/overlay
  layout behind a mobile breakpoint): house dominant, QR sign renders a
  real scannable QR and fades/restores correctly with Play/Replay, score
  guide and info panel both compact and legible, no console errors. Also
  re-checked at 375x812 mobile with no horizontal overflow.

## Final client feedback reference, 2026-09-15

`Taylor_Friar_Final_Feedback_Reference.docx` (supplied by the client) is
the authoritative, most current spec, superseding several earlier informal
"approved, don't touch" notes below where they conflict. Changes made
against its checklist:

**1. Score palette corrected to the client's exact table.** The doc gives
an exact Score / Color family / Meaning table - 1 Red-orange (Low
confidence), 2 Orange, 3 Yellow, 4 Cyan/light blue, 5 Deep blue (High
confidence) - which is NOT the round-2 7-hue spectrum (red/orange/yellow/
**green**/teal/blue/**purple**) this project had been using. That round-2
palette predates this final reference and is superseded. `js/config.js` ->
`scorePalette.stops` is now exactly 5 stops, one per whole score (1-5), so
an exact integer average always renders the literal reference color and
only fractional averages blend between two adjacent named colors. Nothing
else about the color system changed - `js/colorUtils.js` (interpolation,
faceted shading) and the "SCORE COLOR GUIDE" panel (round-1 interpretability
work below) both read from this same config, so both updated automatically
with no other code changes. Re-verified: faceted panes still keep every
tier within one hue family (sampled several panes' overlay fills directly -
all tiers of a given pane are the same hue, just different
lightness/saturation).

**2. QR code moved onto its own stand, left of the house.** Previously an
absolutely-positioned overlay in the house image's bottom-right corner;
now a separate `.qr-stand` panel (heading "SCAN TO TAKE THE SURVEY" + the
QR) in a new `.stage-row` flex layout, sign first (left) then the house.
`js/qrDisplay.js` and the QR's underlying URL/behavior are completely
unchanged - only where its container sits changed. The existing
fade-out-before-the-pop / restore-on-Replay behavior (`js/
finaleEffects.js`) still works exactly as before since it only ever
toggles the container's opacity, which doesn't care where the container is
positioned. On screens under 900px there's no room for a side-by-side row,
so `.stage-row` stacks to a column (sign above the house, since it's first
in DOM order).

**3. Placeholder-looking text removed/restyled.** The doorway used to show
a bare `100%` in a floating pill/chip - looked like a debug value. It's
empty until the count-up has a real number, then shows `{value}% YES`
(matching the client's own mockup wording) with the pill background
removed entirely in favor of a layered glow/shadow (same "lit from within"
technique used elsewhere), so it reads as part of the door rather than a
UI label. The rose-window word(s) were never a hardcoded debug string -
confirmed by grepping the codebase - they're the real Q10 survey word(s),
but rendered in the page's plain system-UI sans-serif, which read exactly
like app chrome. Restyled `.rose-word` to a serif small-caps treatment
(system font stack only - Georgia/Times New Roman - deliberately no
external font file load, to avoid any network dependency risk right before
a live show) so it reads as lettering integrated into the glass design.
The underlying data (which word(s) show, from where) is completely
unchanged.

**4/6. Interpretability + multidimensional color**: see "Data
interpretability pass" and the faceted-shading rounds below - both were
already addressed in prior rounds and are unaffected by this round's palette
swap (re-verified above).

**5. Cinematic reveal**: re-verified this round (no code changes) - the
restrained build to ~90%, snappy pop, white flash, window/door glow spill,
sunburst rays, and doorway particle burst are all present and unchanged;
see "The finale" and "Cinematic environmental lighting" sections below for
what they are and how they were verified.

Also re-ran the full "Final QA Before Client Delivery" checklist from the
doc after all of the above: dark state clean, mid-reveal restrained, 100%
pop includes flash/glow/rays/particles, legend readable, each data section
identifiable (numbered badges + TEAMS/QUESTION KEY panels), facets stay in
one score family, QR sign is on the left outside the house artwork, no
"100%"/"ready"-style placeholder text, settled state controlled (not
washed out, per the round-2/round-3 cinematic-lighting work), desktop and
mobile (375x812, including a fresh reveal at that width, not just a resize
after the fact - the fit-to-window word scaling depends on the viewport
size active AT reveal time) both checked. No console errors beyond the
pre-existing not-yet-provided audio files.

## Data interpretability pass — client feedback round, 2026-09-15

Client's own words: **"Data needs to be interpretable, not just decorative:
this is the most important piece... I need to be able to stand in front of a
live audience and explain what the visualization means in real time."**
Referenced their original mockup, which has a discrete "SCORE COLOR GUIDE"
panel and clearly labeled categories - the previous continuous gradient bar
and unlabeled windows didn't meet that bar. This round is purely additive
UI (new labels/panels); no data logic, mapping, privacy threshold, QR
behavior, reveal sequence, finale effects, or Play/Replay was touched.

**1. Discrete "SCORE COLOR GUIDE"** (`js/main.js` ->
`renderScoreColorGuide()`, replacing the old gradient-bar
`renderScoreLegend()`): 5 swatches, styled to match the client's own
mockup panel (dark rounded card, swatch + "N — description" rows, "Low
confidence" / "High confidence" endpoint captions from
`config.scoreGuideLabels`). Each swatch's color is `ColorUtils.
scoreToColor(1..5, config)` - the exact same function that colors every
pane - so the guide can never show a different color than what's actually
on the house. Verified programmatically: guide swatch RGB values match
`scoreToColor(1..5)` output exactly.

**2. On-house window numbers + a "TEAMS" key** (`js/main.js` ->
`renderTeamLabels()`/`renderTeamKey()`, `js/paneMapping.js` ->
`computeTeamWindowRects()`, new geometry helper): tried a full team-name
label directly above each window first: the 5 real windows measure only
~7-10% of the stage width apart, nowhere near enough room for a name like
"Operations, Administration, Permitting and Compliance" next to its
neighbor without overlapping - confirmed this visually before changing
course. Settled on a small numbered badge (1-5, positioned at each
window's true top-center via the same getBBox()/getCTM() geometry used
throughout this project) matched to a readable "TEAMS" panel below the
house, using the new display-only `teams[].shortName` in `js/config.js`
(the real `name` used for Sheet matching is completely untouched).

**3. "QUESTION KEY" panel** (`js/main.js` -> `renderQuestionKey()`): the 7
scored questions are full sentences - far too long for a 1/7th-height pane
band, and the client explicitly warned against unreadable tiny in-fragment
text. Since all 5 windows already share the identical top-to-bottom
question order (`config.scoredQuestionOrder`), one shared numbered key
(new display-only `columns[q].shortLabel` in `js/config.js`, e.g. q2 ->
"Customer Communication") explains what every row means in every window,
without repeating labels 5 times or touching the real `heading` values
used for Sheet-column matching.

**4. Faceted shading re-confirmed, not changed**: dark/medium/light
facets within a pane are still tint-variants of that pane's one resolved
score color (`js/colorUtils.js` -> `shadeVariants()`, untouched this
round) - decorative depth never crosses into a different score's color
family, so it can't make a pane's score ambiguous.

**5. Presentation test, done at desktop size**: confirmed a viewer can
point at any window (numbered badge), find its team in the TEAMS panel,
read any row's meaning in the QUESTION KEY, and decode its color in the
SCORE COLOR GUIDE - without needing the code or the Sheet. Verified at
100% (both live 1-response data and the 6-item mock set), through 3+
Play/Replay cycles (badge count and TEAMS/QUESTION KEY row counts stayed
exactly 5/5/7 every time - no duplicates), and at 375x812 mobile with no
horizontal overflow. No console errors beyond the pre-existing
not-yet-provided audio files.

## Cinematic environmental lighting — client feedback round, 2026-09-15

A separate pass from the palette/facet work above — this round adds
**environmental illumination**, not any pane color change. New file
`js/cinematicLighting.js` plus a `cinematicLighting` block in `js/config.js`.
`js/colorUtils.js` and every pane color are completely untouched.

**What it does**, all positioned from real SVG geometry (`getBBox()`/
`getCTM()`, same pattern used everywhere else in the project, not
hand-placed pixels):
- **Window glow spill** — a soft warm radial glow (`windowGlowColor`,
  `rgba(255,205,130,…)`) centered on each of the 5 lower stained-glass
  windows, sized relative to that window's own on-screen diameter
  (`windowGlowSizeFactor`), fading in as each team's pane lights up.
- **Door glow spill** — a stronger golden glow anchored to the doorway,
  offset downward so it reaches over the entrance, columns, and top steps
  (`doorGlowColor`, `doorGlowSizeFactor`, `doorGlowOpacity` — deliberately
  higher than the window glow per the "stronger golden spill from the
  doorway" ask), fading in when the door lights.
- **Atmospheric haze** — a very subtle, wide, low-opacity golden wash
  (`hazeOpacity: 0.09`) anchored to the house's overall footprint, using
  `mix-blend-mode: soft-light` so it reads as ambient air rather than
  another glow layer; fades in with the rose window (the last interior
  beat before the finale).
- **Vignette** — a permanent `#vignette` element (radial gradient, darkens
  toward the edges, `cinematicLighting.vignetteOpacity`) present from the
  very first frame, not just at 100%, so the house reads as the focal point
  of a night scene throughout, not only at the end.
- **Finale pulse** — at the 100% pop, `pulseAndSettle()` briefly pushes all
  window glows, the door glow, and the haze to
  `pulsePeakMultiplier × their base opacity` over `pulseMs`, then eases back
  down to their normal settled opacity over `settleMs`, synchronized
  alongside the existing flash/rays/particles from `finaleEffects.js`
  (unchanged) rather than replacing them.

**Why `mix-blend-mode: screen` plus a widened gradient, not just opacity.**
The glow blobs use `screen` (additive light) so they brighten the wall/frame
around each window without darkening or discoloring anything, and never
sit on top of the crisp black lead-lines as a flat color wash. First-pass
values (opacity 0.4 window / 0.6 door, gradient concentrated near the
blob's center) were visually confirmed too subtle — `screen` blending has a
diminishing effect against a backdrop that's already bright (the lit window
itself), so the glow wasn't projecting far enough into the darker
surrounding wall to read as "light spill." Fixed by both raising
`windowGlowOpacity`/`doorGlowOpacity` (0.4→0.65, 0.6→0.85) and
`windowGlowSizeFactor`/`doorGlowSizeFactor` (2.0→2.6, 2.6→3.2), and widening
the CSS radial-gradient stops in `.env-glow` so intensity carries further
outward instead of falling off almost entirely by mid-radius. Re-verified
visually afterward — the spill onto the surrounding frame, columns, and
steps is now clearly visible at 100%, while the glass and lead-lines
themselves stay crisp (the glow sits in a layer beneath the door
result/rose word text and above the SVG, never re-coloring the artwork).

**Why the vignette needed explicit z-index work.** `#vignette` sits between
the SVG (`#svg-mount`) and the text/UI overlay layer (`#overlay-wrap`), so
`css/styles.css` gained explicit `z-index` values on `#door-result`,
`#rose-words-wrap`, `#qr-container`, and `.finale-particle` to guarantee
they stay above the vignette regardless of DOM order.

All values are tunable from `js/config.js` → `cinematicLighting` without
touching `cinematicLighting.js` itself.

**Verified:** dark (0%) state shows the vignette framing the house from the
first frame with no glow yet (nothing lit = nothing spilling light, as
expected). Played a full reveal to 100% — window and door glow spill onto
the surrounding walls/columns/steps is clearly visible, haze reads as a
subtle warm ambient wash (not a visible second glow), and the finale pulse
is synchronized with the existing flash/rays/particles. Confirmed no new
console errors (the only console errors present are the pre-existing,
unrelated missing-audio-file 404s — see "Audio" below). Ran 3 consecutive
Play → Replay cycles with no duplicate/stale glow elements and correct
full reset via `CinematicLighting.resetAll()`. Re-checked at 375×812
(mobile) — glow, vignette, and door result all scale correctly with no
horizontal overflow. Pane colors and facet shading confirmed pixel-for-pixel
unchanged from the previous approved round.

**Round 2 — reduced overexposure, 2026-09-15.** Client feedback: the settled
100% state read as overexposed, washing the cream facade/columns/plants/
steps toward white/yellow, and asked for the doorway to clearly remain the
strongest source with smaller/more localized window glow, trees/edges to
stay dark, and the brief 100%-pop flash to still be allowed to read as very
bright for an instant while the state it *settles into* afterward gets
darker and richer. All changes are in `js/config.js` →
`cinematicLighting`, the `.env-glow` gradient in `css/styles.css`, and the
haze size constant in `js/cinematicLighting.js` — nothing in `colorUtils.js`
or the pane colors changed:
- `windowGlowOpacity` 0.65→0.38 and `windowGlowSizeFactor` 2.6→1.6 (smaller,
  more localized per-window glow).
- `doorGlowOpacity` 0.85→0.55 and `doorGlowSizeFactor` 3.2→2.4 (reduced, but
  still clearly the largest/strongest of the three sources — ~1.4x the
  window opacity and 1.5x its size factor).
- `hazeOpacity` 0.09→0.05, and the haze's size multiplier in
  `cinematicLighting.js` 1.5→1.3, so the atmospheric wash sits closer to the
  house and doesn't lighten the dark background trees.
- `vignetteOpacity` 0.55→0.6, nudged up slightly to help keep the outer
  edges/trees dark now that the glow itself reaches less far.
- The `.env-glow` radial-gradient stops in `css/styles.css` were tightened
  (falloff now reaches ~0 by 72% of the blob's radius instead of still
  being 35% strong at 60%), so each glow reads as a contained light source
  rather than a broad wash — this is what fixed the facade/column/step
  overexposure, independent of the opacity/size numbers above.
- `pulsePeakMultiplier` 1.55→1.7 — a touch more momentary punch at the exact
  pop moment (working together with the existing, unchanged white
  `#flash-overlay`), since it now pulses up from a lower settled base and
  always eases back down to that same lower base afterward — this is what
  produces "still bright for an instant, then settles darker and richer"
  rather than just being uniformly dimmer throughout.
- Verified visually at desktop size after the change: door reads as the
  clear strongest warm source reaching the columns/steps, window glow is
  now visibly smaller and localized right around each window, the cream
  facade/columns/plants/steps retain their original contrast (no white/
  yellow wash), the background trees at the scene's edges stay dark, and
  the stained-glass pane colors are unchanged and still read vivid/
  saturated. Confirmed no new console errors and a clean Play → Replay
  cycle.

**Round 3 — rose window de-emphasized, 2026-09-15.** Client feedback: keep
this exact settled lighting level (do not brighten the house again), but
the rose window's own glow was still competing with the doorway for focus,
and asked the remaining work to focus on making the *transition* into the
settled state feel cinematic (restrained build to 90%, sharp flash/pop,
brief rays/sparkles, smooth settle). Two things followed from that:
- **Rose window trimmed** — the only brightness change this round, entirely
  in `css/styles.css`: `#ROSE_GLASS.lit-strong` filter reduced (brightness
  1.4→1.22, saturate 1.35→1.18, drop-shadow blur 22px→12px),
  `#ROSE_FRAME.lit` drop-shadow reduced (10px/0.4→6px/0.28), and `.rose-word`
  gained `filter: brightness(0.88)` scoped to just the word text (not the
  shared `--accent` CSS variable, which the door-percentage text and legend
  also use and which must stay exactly as bright as before). Net effect:
  the rose window is still clearly lit and legible, but the doorway now
  reads as the scene's strongest focal point.
- **Transition sequence reviewed, not changed** — the restrained ~90% hold
  (`finale.buildupPauseMs`), the sharp 260ms pop
  (`finale.popTransitionMs`), the 160ms white flash, the sunburst rays, the
  particle burst, and the cinematic-lighting pulse-and-settle
  (`cinematicLighting.pulseMs`/`settleMs`, which eases back down to the
  exact round-2 settled opacities, not a new lower/higher value) were all
  already doing exactly what was asked for; re-tested end-to-end and found
  no numeric changes needed there - the sequence already builds slowly,
  pops sharply, and settles smoothly into the approved round-2 lighting
  level. No `cinematicLighting` config values, `finale` config values,
  scorePalette, colorUtils.js, pane mapping, QR behavior, framing, or data
  logic were touched this round.
- Verified: played a full reveal and 3 Play → Replay cycles at desktop
  size - the settled 100% state is visually identical to round 2 everywhere
  except the rose window (now visibly more subdued than the door), no new
  console errors, no duplicate/stale DOM elements across replays.

## Privacy design

The live endpoint (`apps-script/Code.gs`, deployed as a Google Apps Script
Web App) runs entirely inside the client's Google account and returns
**only**: per-team averages for the 7 scored questions, the overall Q8
percentage, and a ranked Q10 word list with counts. It never returns
individual rows, timestamps, or raw free-text answers. A team's averages are
withheld (`null`) until it has at least `MIN_RESPONSES_PER_TEAM` (currently
**3**) responses, so a single person's answers in a small team can never be
singled out from the aggregate. Responses are cached (`CacheService`, 60s
TTL) so repeat page loads don't hammer the Sheet or wait on cold-start
latency every time.

To update the deployed script (e.g. to change the response threshold):
Extensions → Apps Script on the response Sheet → paste the new
`apps-script/Code.gs` → Deploy → Manage deployments → pencil/edit icon on
the existing deployment → Version: **New version** → Deploy. This updates
the same `/exec` URL in place — no config change needed afterward.

## Audio

Drop mp3 files at the paths in `js/config.js` → `audio.files`
(`assets/audio/ambient-night.mp3`, `chime.mp3`, `rose-swell.mp3`) — no code
changes needed. Missing files log a console warning and play silently; the
reveal is never blocked by audio. Playback only ever starts from inside the
Play Reveal click, per browser autoplay rules.

## Developer-only URL flags

Not part of the client-facing UI — hidden unless someone deliberately adds
these to the URL:
- `?debug=1` — stamps a small `team/question` label on all 35 panes to
  visually verify the mapping.
- `?motion=full` / `?motion=reduced` — overrides the detected
  `prefers-reduced-motion` setting.

## Final production QA pass, 2026-09-15

End-to-end pass through the exact flow Tayler will use before going live:
page load → QR → live Google Form → live Sheet/Apps Script → Play Reveal →
100% cinematic finale → Replay. One real bug was found and fixed; no other
code changes were made (per the "no cosmetic changes unless there's an
actual issue" scope for this pass).

**Bug found and fixed: rose-window word overflow at high word counts.**
`sizeRoseWordsToWindow()` only ever constrained the word box's WIDTH
(`ROSE_TEXT_MIN_WIDTH_PX`); nothing constrained its height. With today's
single real response ("ready") this never showed, but forcing the 6-word
mock dataset (`roseWindow.maxWords: 6`, realistic once more people answer
Q10 with different words) revealed the stacked word list spilling well
outside the rose window's glass circle - into the roofline above and the
door lantern below. Fixed in `js/animation.js` with a new
`fitRoseWordsWithinWindow()`, called right after `renderRoseWords()`: it
measures the real rendered word block against the window's true diameter
and, only if it doesn't already fit, uniformly scales the whole block down
(`transform: scale()` on `#rose-words`, reset on every Replay). A single
word or short result set (today's real data, and the general common case)
measures well under the budget and is completely unaffected - verified via
DOM measurement (not just eyeballing) that the single real word "Ready"
still renders at `transform: none` (untouched) while the 6-word mock case
now sits fully inside the circle with a comfortable ~7-8px margin on both
sides, at both desktop and 375×812 mobile widths. `css/styles.css` gained
one `transform-origin: center` rule to support this; no other CSS/behavior
changed.

**Everything else: PASS, no changes made.**
- **QR code**: navigated directly to the exact URL in `js/config.js` ->
  `qrCode.url` and confirmed it's the live, public, anonymous `/viewform`
  (not a sign-in-gated or `/edit` link) - title "Let's Build the House",
  and every question's wording and every team name in the real form matches
  `js/config.js` -> `columns`/`teams` character-for-character. Confirmed
  the on-page QR SVG is generated from that same `config.qrCode.url` value.
- **Live data pipeline**: confirmed the deployed Apps Script endpoint is
  live and correctly returning privacy-aggregated JSON matching the
  documented shape. Confirmed the known, pre-existing cold-start
  characteristic first-hand during this pass - repeated fetches
  intermittently returned a client-side timeout, and once a transient
  Google-side 404, before succeeding on retry/reload; this is the same
  "roughly 1 in 4-5 calls" behavior already documented under "Quick start"
  and the app's mock-data fallback handled every failure gracefully with no
  console errors. **Operational note for the live show**: if the page shows
  "Mock data" when it first loads, a single reload almost always recovers
  live data - worth knowing before presenting live.
- **Privacy suppression, verified at the DOM level (not assumed)**: with
  only 1 real response so far (below the 3-response `MIN_RESPONSES_PER_TEAM`
  threshold for every team), inspected all 78 pane-fragment overlays
  directly and confirmed every single one renders at the suppressed
  `opacity: 0.15`, not the real `0.92` - the house still looks fully lit and
  colorful (from the artwork's own base stained-glass design + the general
  lighting filters, unrelated to score data), but no per-question score is
  actually exposed for a lone respondent.
- **Stained-glass spectrum / faceted shading**: unchanged since the last
  approved round: confirmed visually still vivid/saturated, all 7 hues
  present, facets intact - `colorUtils.js` was not touched this pass.
- **QR fade / restore**: confirmed via computed opacity that the QR
  reaches exactly `0` (and gets the `qr-hidden` class) shortly before the
  100% pop, and is fully restored (class removed, opacity rising) within
  ~150ms of the next Play/Replay click.
- **Finale flash/glow/rays/particles**: confirmed the flash overlay's
  opacity returns to exactly `0` after firing, `scene-lit`/door
  100%/rose-visible all land correctly, and cinematic-lighting's
  window/door glow settles back to the exact approved round-3 levels.
- **Replay/reset**: ran 3+ consecutive Play → Replay cycles; `.env-glow`
  element count stayed at exactly 7 (5 windows + door + haze) and
  `#vignette` at exactly 1 every time - no duplicate/stale DOM nodes.
  Door %, rose word(s), QR state, and scene classes all reset and
  re-reveal identically every time (seeded PRNG).
- **Desktop + mobile (375×812)**: both re-checked this pass, including
  after the rose-word fix; `document.body.scrollWidth === window.innerWidth`
  on mobile (no horizontal overflow).
- **Console**: no uncaught errors/exceptions at any point in this pass, on
  either viewport. Only pre-existing, expected 404s for the three
  not-yet-provided audio files (see "Audio" below) - everything else is a
  clean 200/304.
- Real live-submission test through the Google Form was intentionally
  **not** performed by Claude during this pass, since that would write a
  real row into the client's production response Sheet - flagged
  separately rather than done unilaterally.

## Verification summary

- Faceted shading / 7-hue palette (2026-09-15, round 2): confirmed
  `scoreToColor(1)`/`scoreToColor(5)` render true red/purple. Played the
  reveal against the mock 6-team dataset (real data currently has only 1
  response, below the 3-response privacy threshold, so its panes stay
  correctly dimmed regardless of palette) and inspected the actual rendered
  overlay fill colors: 56 distinct colors across 35 panes (vs.1 flat color
  per pane before), confirming each pane genuinely renders multiple tonal
  facets, not a single wash. Confirmed visually and via `data-shade-tier`
  inspection that dark/medium/light facets are distributed per-pane based on
  the original artwork's own shading. Confirmed black lead lines remain
  fully visible (they were never covered by an overlay to begin with).
  Re-verified the full dark state and 100% state at both desktop and mobile
  widths, both with real data (1 row) and mock data. One thing worth noting
  honestly: mid-testing, the Browser pane itself went hidden for a stretch,
  which paused `requestAnimationFrame` (standard browser behavior for
  non-rendering pages) and made the door-percentage count-up appear to hang;
  confirmed this was an environment/tooling artifact, not a code defect, by
  reproducing it in isolation (a bare rAF loop also stalled while the pane
  was hidden) and by watching the same sequence complete correctly the
  moment the pane rendered again.
- Composition/palette/legend (2026-09-15): confirmed the cropped `viewBox`
  applies correctly (`234 155 1203 676`) and the stage's `aspect-ratio` is
  derived from it with no letterboxing. Ran the full reveal after cropping
  and confirmed door %, rose words, pane tints, QR fade/restore, and Replay
  all still land correctly - both at 1920x1080 scale and 375x812 (mobile),
  with no horizontal overflow on mobile (`document.body.scrollWidth ===
  window.innerWidth`). Confirmed `ColorUtils.scoreToColor(1, config)`
  returns true red and that mock data with a 1.75 average renders a visible
  red-orange blend, proving the low end of the spectrum actually renders,
  not just exists in config. Confirmed the legend's 5 swatches match
  `scorePalette` exactly (generated from it, not hand-typed).
- SVG loads inline (fetched + injected, not `<img>`), all 14 required groups
  and 21 optional hooks found, proportions preserved exactly.
- All 5 teams and all 35 panes mapped correctly (verified with `?debug=1`).
- End-to-end tested against one real submitted response: team matched
  correctly, Q8 percentage and Q10 word both computed correctly, small-team
  privacy suppression confirmed working (averages correctly withheld below
  the 3-response threshold).
- Mock-data fallback verified to trigger automatically and correctly on live
  endpoint failures (observed naturally during testing — the endpoint has
  occasional cold-start timeouts, roughly 1 in 4-5 calls, which the app
  handles gracefully every time).
- Play and Replay both reproduce identical results (seeded PRNG); rose
  window always reveals last.
- QR code encodes the public `/viewform` URL, not `/edit` (verified by a
  byte-for-byte diff of the rendered QR's path data against an independently
  generated reference from the same URL, not just by eye).
- Desktop and mobile layouts both checked; no uncaught JS errors.
- Rose-window word position: fixed 2026-09-15 — the word was landing outside
  the rose window whenever `prefers-reduced-motion` was active, because a
  blanket "disable transform" rule for reduced motion was accidentally also
  stripping the word box's *positioning* transform (not just decorative
  motion). Fixed in `css/styles.css`, and the box is now sized from the rose
  window's actual on-screen diameter (`js/animation.js` ->
  `sizeRoseWordsToWindow`) with a 112px floor so short words never wrap
  awkwardly on small screens. Re-verified centered (sub-pixel accurate) at
  1920x1080, 1280x720, and 375x812 (mobile), with both a single real word
  and the 6-word mock set.
- Finale effects (2026-09-15): verified via computed-style inspection
  mid-animation (not just eyeballing) that the glow pulse's `filter`,
  the rays' `opacity`/`transform`, and the particles' `animation-name`/
  duration are all actively interpolating during the pop, not just jumping
  straight to their end state. Confirmed the glow settles to the exact
  configured `glowSettleOpacity` value. Confirmed door %, rose words, scene
  brightness class, and QR opacity are all correct and fully reset across 3
  consecutive Play → Replay → Replay cycles at both 1920x1080-scale and
  375x812 (mobile) - the QR's `qr-hidden` class is removed (not just faded)
  on every reset, confirmed via direct classList inspection. Confirmed the
  flash overlay's computed opacity returns to exactly 0 after firing (never
  left white). Confirmed `prefers-reduced-motion` correctly suppresses the
  flash/glow/rays/particles (this browser environment itself has that OS
  setting on, which is what surfaced it) while pacing and QR-fade still work.
  One easing curve (particle burst) was corrected after testing revealed it
  front-loaded almost all visible motion into the first ~15% of the burst,
  reading as an abrupt blink rather than a graceful sparkle - switched to a
  standard `ease-out`.
