/**
 * CENTRAL CONFIGURATION
 * ---------------------------------------------------------------------------
 * Every value a non-developer might need to tweak lives in this file:
 * the live-data URL, column-heading mappings, the five-point color palette,
 * stop words, animation timings, and feature toggles.
 *
 * Edit this file only — the rest of the app reads from window.APP_CONFIG.
 */
window.APP_CONFIG = {

  // ===========================================================================
  // 1. DATA SOURCE  (the ONLY place the live-data URL should ever appear)
  // ===========================================================================
  dataSource: {
    // Live, connected, and cached (see apps-script/Code.gs). Leave as '' to
    // force mock data; set forceMock below to force it even with a URL set.
    // To point this at a different Sheet/script in the future: deploy
    // apps-script/Code.gs as a Web App (Deploy > Manage deployments > New
    // version keeps the same URL) and paste the /exec URL here — see
    // README.md "Live data source" for full setup steps.
    liveDataUrl: 'https://script.google.com/macros/s/AKfycbyPa6coinoVQIun2qRaebGuVmcuYv4SV6N5OJBpMrcS-UX9AIi3C-H2uZks4OQBWYRn/exec',

    // 'csv' | 'json' | 'auto' (auto = sniff based on response content-type/body)
    format: 'auto',

    // Network timeout before falling back to mock data (ms). Apps Script web
    // apps have real cold-start latency even with server-side caching
    // (occasional 10-30s calls, roughly 1 in 4-5, observed even with
    // CacheService enabled) - kept generous so a slow-but-working request
    // isn't abandoned in favor of mock data.
    timeoutMs: 25000,

    // Reference info only — not fetched directly by the app, just kept here
    // for anyone reading this config to find the source Sheet.
    referenceEditUrl: 'https://docs.google.com/spreadsheets/d/16QNKXiwnIQ2D3-8kZL0XPZt0_42DBEKH-sElAiVeYZw/edit?resourcekey=&gid=763640286#gid=763640286',
    responseTabGid: '763640286'
  },

  // ===========================================================================
  // 2. QR CODE — always the public responder link, never the /edit link
  // ===========================================================================
  qrCode: {
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSdATD2rVVuZtwYL4bk2rqomW3t_oqgvx006OEI7eakOKlNfpQ/viewform',
    visible: true,          // configurable on/off
    size: 240,               // px — larger modules remain scannable from the back of a room
    position: 'bottom-right' // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  },

  // ===========================================================================
  // 3. COLUMN MAPPING  (confirmed 2026-09-14 against the real response Sheet,
  // "Let's Build the House (Responses)", gid 763640286 — the sheet has 0
  // submitted rows so far, but the header row is real and live-fetched)
  // ---------------------------------------------------------------------------
  // Matching is done on a NORMALIZED heading (trimmed, lowercased, collapsed
  // whitespace), so small punctuation differences in the real sheet are OK,
  // but the core wording should match.
  // ===========================================================================
  // `shortLabel` (on the 7 scored questions only) is a DISPLAY-ONLY label
  // for the on-house "question key" panel (client feedback, 2026-09-15:
  // "readable categories... what is being measured"). The full `heading`
  // text is a complete sentence and is what actually matches Sheet columns
  // (js/dataProcessing.js) - shortLabel is never used for matching, so
  // adding it changes no mapping/data behavior.
  columns: {
    q1_team:      { key: 'q1', heading: 'Which team are you primarily part of?' },
    q2:           { key: 'q2', heading: 'When something unexpected happens on a job, I know exactly what to say to the customer in that moment.', shortLabel: 'Comms' },
    q3:           { key: 'q3', heading: "If I don't have all the information yet, I still feel confident giving an honest update anyway.", shortLabel: 'Confidence' },
    q4:           { key: 'q4', heading: 'When something goes wrong, I know exactly who to escalate to, and how fast.', shortLabel: 'Escalation' },
    q5:           { key: 'q5', heading: 'My team follows through with consistent updates until an issue is fully resolved.', shortLabel: 'Follow-Up' },
    q6:           { key: 'q6', heading: 'When someone on my team makes a mistake, we can talk about it openly, without blame, to get better.', shortLabel: 'Feedback' },
    q7:           { key: 'q7', heading: "If a crisis hit my part of the business tomorrow, I'd feel prepared.", shortLabel: 'Readiness' },
    q8_binary:    { key: 'q8', heading: 'If a crisis hit my team, I would trust what came directly from my team — or would I wait to hear it from someone else first?' },
    q9:           { key: 'q9', heading: "I know what our company's core values actually mean, day to day, when things go wrong.", shortLabel: 'Values' },
    q10_word:     { key: 'q10', heading: 'In one word, how do you feel in the moment a crisis first hits?' },
    timestamp:    { key: 'timestamp', heading: 'Timestamp' }
  },

  // Ordered list of the 7 scored questions (Q2-Q7 + Q9) that fill the 35 panes.
  // Order here = pane order (top-to-bottom) within each team's window.
  scoredQuestionOrder: ['q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q9'],

  // Q8 is a 1-5 linear scale (1 = Not very, 5 = Very much), confirmed
  // 2026-09-15. A response of 4 or 5 counts as "positive" for the door
  // percentage; 1-3 counts as negative; blank/malformed is excluded from the
  // percentage entirely. Keep this in sync with Q8_POSITIVE_THRESHOLD in
  // apps-script/Code.gs if you use that path.
  q8PositiveThreshold: 4,

  // ===========================================================================
  // 4. FIVE TEAMS <-> FIVE WINDOW HOOKS  (real names confirmed 2026-09-15)
  // ---------------------------------------------------------------------------
  // Matching against the Sheet's Q1 answers is normalized (trim + lowercase),
  // so small formatting differences are fine, but the wording must match.
  // Do NOT change `id` or `svgGroup` — those are wired to the SVG hooks.
  // ===========================================================================
  // `shortName` is a DISPLAY-ONLY label for the on-house team header (client
  // feedback, 2026-09-15: "organize the data into readable categories" -
  // the real `name` values are full sentence-length department names that
  // don't fit as a presentation-sized header). It is never used for Sheet
  // matching - only `name` is (see js/dataProcessing.js) - so this is purely
  // additive and changes no mapping behavior.
  teams: [
    { id: 'team1', name: 'Sales and Marketing',                                svgGroup: 'LEFT_WINDOW_01', shortName: 'Sales & Marketing' },
    { id: 'team2', name: 'Operations, Administration, Permitting and Compliance', svgGroup: 'LEFT_WINDOW_02', shortName: 'Operations' },
    { id: 'team3', name: 'Installation and Field Services',                    svgGroup: 'RIGHT_WINDOW_01', shortName: 'Field Services' },
    { id: 'team4', name: 'Leadership & Corporate',                             svgGroup: 'RIGHT_WINDOW_02', shortName: 'Leadership' },
    { id: 'team5', name: 'Customer Service, Human Resources and Recruiting',   svgGroup: 'RIGHT_WINDOW_03', shortName: 'Customer Service & HR' }
  ],

  // ===========================================================================
  // 5. STAINED-GLASS COLOR SYSTEM (editable)
  // ---------------------------------------------------------------------------
  // SUPERSEDED, 2026-09-15: "Taylor_Friar_Final_Feedback_Reference.docx" is
  // the client's final, authoritative spec and gives an exact Score /
  // Color family / Meaning table: 1 Red-orange (Low confidence), 2 Orange,
  // 3 Yellow, 4 Cyan/light blue, 5 Deep blue (High confidence). This
  // replaces the round-2 7-hue spectrum (which had added green and purple)
  // - that round predates this final reference and no longer applies. Every
  // stop now sits on a whole score (1-5) so an exact integer score always
  // renders the literal reference color from the table, and only
  // fractional averages blend between two adjacent named colors. `stops` is
  // an ordered list of {at, color}; colors interpolate smoothly between
  // consecutive stops (or snap to nearest with colorMode:'nearest'). Feeds
  // both the on-pane colors AND the on-page "SCORE COLOR GUIDE" (js/main.js
  // -> renderScoreColorGuide(), via ColorUtils.scoreToColor()) - edit stops
  // here and both update with no other changes needed, so they can never
  // show a different color for the same score.
  // ===========================================================================
  scorePalette: {
    stops: [
      { at: 1, color: '#E8342A' }, // red / red-orange - low confidence
      { at: 2, color: '#F2801C' }, // orange
      { at: 3, color: '#F5D033' }, // yellow
      { at: 4, color: '#29B6E8' }, // cyan / light blue
      { at: 5, color: '#1E4FD6' }  // deep blue - high confidence
    ],
    accent: '#EBFC34' // door glow / final illumination / rose-window highlight
  },

  // Client feedback, 2026-09-15 ("data needs to be interpretable, not just
  // decorative" - the client's own original mockup had a discrete "SCORE
  // COLOR GUIDE" panel with 5 swatches, not a continuous gradient bar).
  // Text only - the swatch colors themselves are computed at render time via
  // ColorUtils.scoreToColor(1..5, config), i.e. the EXACT same function that
  // colors every pane, so the legend and the panes can never drift apart.
  scoreGuideLabels: {
    1: 'Low confidence',
    2: '',
    3: '',
    4: '',
    5: 'High confidence'
  },

  // Each pane is now faceted (client feedback: "not one flat solid color") -
  // its individual glass fragments are tinted with dark/medium/light
  // variants of the pane's resolved base color (see js/colorUtils.js ->
  // shadeVariants) instead of one uniform hue-blend. Set false to go back to
  // a single flat tone per pane.
  facetedPaneShading: true,

  // Averages are continuous (e.g. 3.4). This controls how they map to a color:
  // 'interpolate' = blend smoothly between the two nearest score colors.
  // 'nearest'     = snap to the closest whole-score color.
  colorMode: 'interpolate',

  // ===========================================================================
  // 6. ROSE WINDOW / Q10 WORD CLOUD
  // ===========================================================================
  roseWindow: {
    // Client feedback, 2026-09-15 round 4: the rose window always shows this
    // fixed word, regardless of live Q10 data. Set to '' / null to go back
    // to showing the live most-common Q10 word instead.
    fixedWord: 'Resilient',
    // Only ONE word should show in the rose window (the most common live
    // Q10 answer when fixedWord is not set), not a ranked list.
    maxWords: 1,
    stopWords: ['the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'it', 'is', 'this', 'that', 'n/a', 'na', 'none', 'test', 'testing', ''],
    // Client feedback, 2026-09-15 round 2: "remove the giant 'READY'
    // treatment" - even a single short word at the old 30px max filled
    // most of the rose window and read as a big status callout. Cut
    // roughly in half so any result (one word or six) sits as a quiet
    // detail within the glass rather than dominating it.
    // Client feedback, 2026-09-15 round 5: make the word bigger and darker
    // for visibility against the pale glass.
    minFontPx: 20,
    maxFontPx: 34
    // Round 3, 2026-09-15: word color is no longer per-score - see
    // css/styles.css -> .rose-word for the current muted, uniform color.
  },

  // ===========================================================================
  // 7. SVG / PANE MAPPING
  // ===========================================================================
  svg: {
    path: 'assets/svg/vect-animation-ready.svg',
    // The TRUE, full source illustration's viewBox - never changes, used
    // only to sanity-check the loaded file. Do not edit.
    viewBox: '0 0 1673.05 940.56',
    // Client feedback, 2026-09-15: crop the DISPLAYED view (not the source
    // file) so the house reads larger/closer, similar to the reference
    // mockup. Derived from real measured geometry: keeps the full roofline
    // (chimney top y=202.4) down through the porch steps (y=784) with ~8%
    // padding, centered on the house's true horizontal center (x=835.5),
    // width chosen to preserve the original 1673.05:940.56 (~1.779) aspect
    // ratio so the stage still fills a 16:9-ish screen with no letterboxing.
    // Set to '' to show the full, uncropped illustration again.
    displayViewBox: '234 155 1203 676',
    panesPerWindow: 7,
    // Fill colors treated as structural lead-lines/frames and therefore never
    // tinted (matched against computed fill; near-black / very low luminance).
    leadLineLuminanceThreshold: 0.12,
    debugLabels: false // presentation view MUST keep this false
  },

  requiredGroupIds: [
    'A3_01_SKY_STARS_MOON', 'A3_02_TREES_BACKGROUND', 'A3_03_HOUSE_STATIC',
    'A3_04_UPPER_WINDOWS', 'A3_05_DATA_WINDOWS_LEFT', 'A3_06_DATA_WINDOWS_RIGHT',
    'A3_07_DOOR', 'A3_08_ROSE_WINDOW', 'A3_09_PORCH_LIGHTS', 'A3_10_PLANTS_BUSHES',
    'A3_10_PLANTS_FRONT_BUSHES', 'A3_11_STEPS', 'A3_12_GROUND', 'A3_13_PATH_LIGHTS'
  ],

  optionalHookIds: [
    'LEFT_WINDOW_01', 'LEFT_WINDOW_02', 'RIGHT_WINDOW_01', 'RIGHT_WINDOW_02', 'RIGHT_WINDOW_03',
    'DOOR_FRAME', 'DOOR_GLASS', 'DOOR_STAT',
    'UPPER_WINDOW_LEFT', 'UPPER_WINDOW_LEFT_CENTER', 'UPPER_WINDOW_RIGHT', 'UPPER_WINDOW_RIGHT_CENTER',
    'ROSE_FRAME', 'ROSE_GLASS',
    'PATH_LIGHT_01', 'PATH_LIGHT_02', 'PATH_LIGHT_03', 'PATH_LIGHT_04',
    'PORCH_LIGHT_01', 'PORCH_LIGHT_02', 'PORCH_LIGHT_03'
  ],

  // ===========================================================================
  // 8. ANIMATION SEQUENCE TIMING (ms, all editable)
  // ===========================================================================
  animation: {
    // deterministic seed so "organic but reliable" replay is identical every run
    randomSeed: 20260914,
    stepDelayAfter: {
      atmosphere: 600,
      upperWindows: 900,
      porchLights: 700,
      pathLights: 900,
      dataPanes: 1400,
      doorGlow: 1000,
      pauseBeforeRose: 900,
      roseWindow: 1600
    },
    pathLightStagger: 220,       // ms between each of the 4 path lights
    porchLightStagger: 260,      // ms between each of the 3 porch lights
    paneClusterCount: 10,        // 8-12 clusters for the 35 panes, per spec
    paneClusterSpread: 260,      // ms of jitter inside each cluster
    paneClusterGap: 180,         // ms between clusters starting
    doorCountUpMs: 1400,
    roseWordStagger: 140
  },

  // ===========================================================================
  // 9. FINALE (the "100%" capstone pop) — client feedback round, 2026-09-15
  // ---------------------------------------------------------------------------
  // Everything before "buildupMs" is the existing slow, staged illumination
  // (unchanged). This section only controls the last beat: a brief pause at
  // ~90% brightness, then a fast/snappy pop to full brightness with a
  // synchronized flash, warm glow, sunburst rays, and a small particle burst
  // at the door. Purely presentational - no effect here touches data,
  // scoring, or the pane/team mapping.
  // ===========================================================================
  finale: {
    audioLeadInMs: 250,     // aligns the supplied SFX impact with the visual pop
    buildupPauseMs: 650,      // brief hold at ~90% brightness before the pop, "builds more slowly"
    popTransitionMs: 260,     // the fast/snappy final brightness jump to 100%
    flashDurationMs: 420,     // brief white flash at the audio/visual impact
    flashPeakOpacity: 0.72,
    glowPulseMs: 1350,         // quick expand of the window/door glow
    glowSettleOpacity: 0.42,  // how bright the glow stays afterward (settled, not blazing)
    raysPulseMs: 1800,        // sunburst rays: expand+pulse then fade to 0
    particleCount: 38,
    particleBurstMs: 1450,
    particleColor: '#FFD98A', // warm gold
    qrFadeOutBeforePopMs: 450, // QR fades out this long before the finale pop starts
    qrFadeMs: 400
  },

  // ===========================================================================
  // 9b. CINEMATIC LIGHTING (environmental illumination) — client feedback
  // round, 2026-09-15. Separate from the FINALE section above and from
  // scorePalette: this never touches pane colors or colorUtils.js. Purely
  // additive light-source effects (window/door glow spill onto walls, a
  // vignette, a soft atmospheric haze) layered via js/cinematicLighting.js,
  // synchronized to the SAME existing reveal moments (data panes starting,
  // door lighting, the finale pop) without changing their timing/order.
  // ===========================================================================
  cinematicLighting: {
    // Client feedback round 2, 2026-09-15: the first pass read as
    // "overexposed" at the settled 100% state - washing the cream facade/
    // columns/plants/steps toward white/yellow instead of reading as
    // localized light sources. Fixed by cutting opacity/size ~40%, keeping
    // the window glow smaller/more localized than the door glow, and
    // tightening the .env-glow gradient falloff in css/styles.css so light
    // stays close to its source.
    // Client feedback round 6, 2026-09-15: after the transient flash/rays/
    // particles finish, the round-2 settled state read as merely "colored"
    // rather than "dramatically illuminated" - client wants a persistent,
    // visibly-glowing resting state (soft glow on windows, doorway
    // strongest with visible spill onto the entrance/steps, a residual
    // halo behind the roof/rose window, stronger edge vignette), WITHOUT
    // repeating round 1's overexposure mistake. Raised opacity/size a
    // moderate amount from round 2's values (well short of round 1's) and
    // kept the same tight gradient falloff / small-window-vs-strong-door
    // hierarchy that actually fixed the overexposure - only the magnitude
    // changed, not the approach. None of this touches scorePalette/
    // colorUtils.js - the glass itself is unaffected; only the additive
    // spill onto the surrounding facade changed.

    // Soft, localized light spill from each of the 5 team windows onto
    // their immediate frames. Fades in when the data panes start lighting.
    windowGlowColor: '255, 205, 130',
    windowGlowOpacity: 0.5,      // was 0.38 (round 1 was 0.65)
    windowGlowSizeFactor: 1.9,   // was 1.6 (round 1 was 2.6) - relative to the window's own diameter; kept smaller than the door so it reads as localized, not a wash
    windowGlowBuildMs: 1400,

    // Golden spill from the doorway onto the entrance/columns/steps - stays
    // the strongest, largest-reaching light source in the scene. Fades in
    // when the door glass lights.
    doorGlowColor: '255, 214, 130',
    doorGlowOpacity: 0.7,        // was 0.55 (round 1 was 0.85)
    doorGlowSizeFactor: 2.8,     // was 2.4 (round 1 was 3.2)
    doorGlowBuildMs: 1200,
    // Downward offset (% of the door's own diameter) so the spill visibly
    // reaches the steps, not just the door frame itself. Nudged up this
    // round for more visible spill onto the entrance/steps specifically.
    doorGlowStepsOffsetPct: 8,   // was 6

    // Very subtle warm haze near the whole house, fades in alongside the
    // existing ~90% ambient brightness ramp (ties to the same moment as
    // .scene-nearly-lit, no new timing introduced).
    hazeColor: '255, 200, 120',
    hazeOpacity: 0.07,           // was 0.05 (round 1 was 0.09)
    hazeBuildMs: 1500,

    // NEW, round 6: a very subtle residual glow behind the central roof/
    // rose-window area, so that area doesn't go visually "dead" once the
    // transient sunburst rays finish fading. Anchored to the rose window's
    // own geometry but sized/positioned to sit as ambient backdrop glow
    // (js/cinematicLighting.js -> setup()), not another bright spot
    // competing with the already-toned-down rose window text. Fades in at
    // the same existing "rose window" reveal step as the haze above (no
    // new timing), then gets included in the finale pulse-and-settle so it
    // settles to its resting value right as the rays finish fading out.
    roseHaloColor: '255, 228, 170',
    roseHaloOpacity: 0.16,
    roseHaloSizeFactor: 2.3,
    roseHaloBuildMs: 1500,

    // NEW, round 8 (client sent a mood-reference image with glowing
    // walkway lamps and a luminous moon halo): small warm glow blobs on
    // the 3 porch lights and 4 path lights, matching how they're already
    // individually staggered on in js/animation.js (no new timing - each
    // glow just fades in at the exact same moment its light gets the
    // `.lit` class). Kept deliberately small/subtle - these are accent
    // lights along the walkway, not another major light source.
    smallLightGlowColor: '255, 220, 150',
    smallLightGlowOpacity: 0.55,
    smallLightGlowSizeFactor: 3.5,
    smallLightGlowBuildMs: 500,

    // NEW, round 8: a soft, always-on halo around the moon (part of the
    // static night sky, not something that "reveals" - unlike every other
    // glow above, this one doesn't fade in with the reveal sequence, it's
    // simply present from the very first frame like the moon itself).
    moonGlowColor: '255, 250, 225',
    moonGlowOpacity: 0.4,
    moonGlowSizeFactor: 2.4,

    // Permanent vignette (dark outer edges) so the illuminated house reads
    // as the focal point, and the surrounding trees/background stay dark
    // for contrast, in both the dark and lit states. Nudged up again this
    // round for stronger contrast against the brighter glows above.
    vignetteOpacity: 0.68,       // was 0.6 (round 1 was 0.55)

    // At the finale pop: all of the above briefly jump to a brighter peak
    // (in sync with the existing white flash/rays/particles - that flash is
    // deliberately still allowed to read as very bright for an instant),
    // then ease down to the settled levels above, which is where the
    // "dramatically illuminated, not overexposed" resting state comes from.
    pulsePeakMultiplier: 1.55,   // was 1.7 - trimmed slightly since the settled base itself is higher this round; keeps the momentary peak from clipping/overexposing
    pulseMs: 700,
    settleMs: 900
  },

  // ===========================================================================
  // 10. AUDIO (optional; muted fallback if files are missing)
  // ===========================================================================
  audio: {
    enabled: true,
    files: {
      background: 'assets/audio/dkfilms-magical-action-background-music-383329.mp3',
      finalReveal: 'assets/audio/breakzstudios-sci-fi-intro-logo-reveal-6-227274(1).mp3',
      sparkle: 'assets/audio/koiroylers-sparkle-355937.mp3'
    },
    volumes: {
      background: 0.05,
      finalReveal: 0.80,
      sparkle: 0.48
    },
    duckVolume: 0.025,
    // Measured main-SFX energy peak is ~1.35 s after its start. The existing
    // visual timeline is NOT changed; animation.js schedules this cue from
    // the existing rose/finale events so that peak lands on the 100% impact.
    finalSfxPeakLeadMs: 1350,
    backgroundFadeMs: 1800
  },

  // ===========================================================================
  // 11. MISC
  // ===========================================================================
  mockData: {
    forceMock: false // set true to always use mock data even if a live URL is configured
  }
};
