/**
 * CINEMATIC LIGHTING (environmental illumination)
 * ---------------------------------------------------------------------------
 * Client feedback, 2026-09-15: "visible environmental illumination, not
 * another palette adjustment." This module never touches pane colors,
 * scorePalette, or colorUtils.js - it only adds purely-additive light-source
 * effects around the artwork: warm glow spilling from the 5 team windows
 * and the doorway onto their surrounding frames/walls, a soft atmospheric
 * haze near the house, and a permanent vignette so the illuminated house
 * reads as the focal point. All positioned/sized from real SVG geometry
 * (same getBBox()/getCTM() approach used throughout this project), and
 * triggered from the EXISTING reveal moments (data panes starting, the door
 * lighting, the finale pop) rather than introducing any new timing.
 */
window.CinematicLighting = (function () {
  'use strict';

  function centerAsPercent(el, svgRoot) {
    var svg = el.ownerSVGElement || svgRoot;
    var bbox = el.getBBox();
    var pt = svg.createSVGPoint();
    pt.x = bbox.x + bbox.width / 2;
    pt.y = bbox.y + bbox.height / 2;
    var ctm = el.getCTM();
    if (!ctm) return { left: 50, top: 50 };
    var p = pt.matrixTransform(ctm);
    var rootRect = svgRoot.getBoundingClientRect();
    if (!rootRect.width || !rootRect.height) return { left: 50, top: 50 };
    return { left: (p.x / rootRect.width) * 100, top: (p.y / rootRect.height) * 100 };
  }

  function diameterAsPercentOfWidth(el, svgRoot) {
    var svg = el.ownerSVGElement || svgRoot;
    var bbox = el.getBBox();
    var ctm = el.getCTM();
    if (!ctm) return 10;
    var cx = bbox.x + bbox.width / 2, cy = bbox.y + bbox.height / 2;
    var centerPt = svg.createSVGPoint(); centerPt.x = cx; centerPt.y = cy;
    var edgePt = svg.createSVGPoint(); edgePt.x = cx + bbox.width / 2; edgePt.y = cy;
    var p1 = centerPt.matrixTransform(ctm);
    var p2 = edgePt.matrixTransform(ctm);
    var radiusPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    var rootRect = svgRoot.getBoundingClientRect();
    if (!rootRect.width) return 10;
    return (radiusPx * 2 / rootRect.width) * 100;
  }

  function makeGlowEl(colorRgb) {
    var el = document.createElement('div');
    el.className = 'env-glow';
    el.style.setProperty('--env-glow-color', colorRgb);
    el.setAttribute('aria-hidden', 'true');
    return el;
  }

  /**
   * Creates and positions the window/door/haze glow elements from real
   * geometry. Call once at boot, after the SVG is loaded. Vignette is a
   * static element already in index.html, not created here.
   * @returns {{windowGlows: HTMLElement[], doorGlow: HTMLElement|null, haze: HTMLElement|null}}
   */
  function setup(svgRoot, overlayWrapEl, config) {
    var cfg = config.cinematicLighting;
    var windowGlows = [];

    config.teams.forEach(function (team) {
      var winEl = svgRoot.querySelector('#' + CSS.escape(team.svgGroup));
      if (!winEl) return;
      var glow = makeGlowEl(cfg.windowGlowColor);
      glow.classList.add('env-glow-window');
      var pct = centerAsPercent(winEl, svgRoot);
      var diameter = diameterAsPercentOfWidth(winEl, svgRoot);
      var size = diameter * cfg.windowGlowSizeFactor;
      glow.style.left = pct.left + '%';
      glow.style.top = pct.top + '%';
      glow.style.width = size + '%';
      overlayWrapEl.appendChild(glow);
      windowGlows.push(glow);
    });

    var doorGlow = null;
    var doorAnchor = svgRoot.querySelector('#DOOR_FRAME') || svgRoot.querySelector('#DOOR_GLASS');
    if (doorAnchor) {
      doorGlow = makeGlowEl(cfg.doorGlowColor);
      doorGlow.classList.add('env-glow-door');
      var dPct = centerAsPercent(doorAnchor, svgRoot);
      var dDiameter = diameterAsPercentOfWidth(doorAnchor, svgRoot);
      var dSize = dDiameter * cfg.doorGlowSizeFactor;
      doorGlow.style.left = dPct.left + '%';
      // Anchor below the door's own center so the spill reaches the steps,
      // per "onto the entrance, columns and top steps."
      doorGlow.style.top = (dPct.top + (cfg.doorGlowStepsOffsetPct || 6)) + '%';
      doorGlow.style.width = dSize + '%';
      overlayWrapEl.appendChild(doorGlow);
    }

    var haze = null;
    var houseAnchor = svgRoot.querySelector('#A3_03_HOUSE_STATIC');
    if (houseAnchor) {
      haze = makeGlowEl(cfg.hazeColor);
      haze.classList.add('env-glow-haze');
      var hPct = centerAsPercent(houseAnchor, svgRoot);
      var hDiameter = diameterAsPercentOfWidth(houseAnchor, svgRoot);
      haze.style.left = hPct.left + '%';
      haze.style.top = (hPct.top + 10) + '%';
      // 1.3x (was 1.5x, client feedback round 2, 2026-09-15) - keeps the
      // haze close to the house so it doesn't lighten the dark background
      // trees at the scene's edges.
      haze.style.width = (hDiameter * 1.3) + '%';
      overlayWrapEl.appendChild(haze);
    }

    // NEW, round 6: subtle residual halo behind the central roof/rose-
    // window area, so that area still reads as gently illuminated once the
    // transient sunburst rays (which share this same anchor) finish
    // fading. Anchored to ROSE_FRAME (the whole rose-window structure, not
    // just the glass) and sized well beyond its own diameter so it reads
    // as soft backdrop radiance, not another bright spot on the glass
    // itself - the already-toned-down rose window text/glow from earlier
    // rounds is untouched.
    var roseHalo = null;
    var roseAnchor = svgRoot.querySelector('#ROSE_FRAME') || svgRoot.querySelector('#ROSE_GLASS');
    if (roseAnchor) {
      roseHalo = makeGlowEl(cfg.roseHaloColor);
      roseHalo.classList.add('env-glow-rose');
      var rPct = centerAsPercent(roseAnchor, svgRoot);
      var rDiameter = diameterAsPercentOfWidth(roseAnchor, svgRoot);
      roseHalo.style.left = rPct.left + '%';
      roseHalo.style.top = rPct.top + '%';
      roseHalo.style.width = (rDiameter * cfg.roseHaloSizeFactor) + '%';
      overlayWrapEl.appendChild(roseHalo);
    }

    // NEW, round 8: small warm glow on each of the 3 porch lights and 4
    // path lights, keyed by hook id so js/animation.js can fade in each
    // one at the exact moment that light's own staggered setLit(true)
    // already fires (no new timing). Stored as a lookup object rather than
    // an array so animation.js's existing id-keyed loops can find the
    // matching glow directly.
    var smallLightGlows = {};
    ['PORCH_LIGHT_01', 'PORCH_LIGHT_02', 'PORCH_LIGHT_03',
     'PATH_LIGHT_01', 'PATH_LIGHT_02', 'PATH_LIGHT_03', 'PATH_LIGHT_04'].forEach(function (id) {
      var lightEl = svgRoot.querySelector('#' + id);
      if (!lightEl) return;
      var glow = makeGlowEl(cfg.smallLightGlowColor);
      glow.classList.add('env-glow-small');
      var pct = centerAsPercent(lightEl, svgRoot);
      var diameter = diameterAsPercentOfWidth(lightEl, svgRoot);
      glow.style.left = pct.left + '%';
      glow.style.top = pct.top + '%';
      glow.style.width = Math.max(diameter * cfg.smallLightGlowSizeFactor, 3) + '%';
      overlayWrapEl.appendChild(glow);
      smallLightGlows[id] = glow;
    });

    // NEW, round 8: soft always-on halo around the moon - part of the
    // static night sky, so unlike every glow above it isn't triggered by
    // the reveal sequence, it's simply present from the first frame like
    // the moon itself. The moon has no dedicated hook id in the source
    // SVG, so it's found geometrically: the largest <ellipse> inside the
    // sky group (every other shape there is a tiny star, several px
    // across; the moon is ~30x larger) - robust to the artwork being
    // re-exported as long as that size relationship holds.
    var moonGlow = null;
    var skyGroup = svgRoot.querySelector('#A3_01_SKY_STARS_MOON');
    if (skyGroup) {
      var ellipses = Array.prototype.slice.call(skyGroup.querySelectorAll('ellipse'));
      var moonEl = ellipses.reduce(function (largest, el) {
        var r = Math.max(parseFloat(el.getAttribute('rx')) || 0, parseFloat(el.getAttribute('ry')) || 0);
        return (!largest || r > largest.r) ? { el: el, r: r } : largest;
      }, null);
      if (moonEl) {
        moonGlow = makeGlowEl(cfg.moonGlowColor);
        moonGlow.classList.add('env-glow-moon');
        var mPct = centerAsPercent(moonEl.el, svgRoot);
        var mDiameter = diameterAsPercentOfWidth(moonEl.el, svgRoot);
        moonGlow.style.left = mPct.left + '%';
        moonGlow.style.top = mPct.top + '%';
        moonGlow.style.width = (mDiameter * cfg.moonGlowSizeFactor) + '%';
        overlayWrapEl.appendChild(moonGlow);
        // Always on - not part of the reveal sequence.
        moonGlow.style.transitionDuration = '0ms';
        moonGlow.style.opacity = String(cfg.moonGlowOpacity);
      }
    }

    return {
      windowGlows: windowGlows,
      doorGlow: doorGlow,
      haze: haze,
      roseHalo: roseHalo,
      smallLightGlows: smallLightGlows,
      moonGlow: moonGlow
    };
  }

  function fadeIn(el, opacity, durationMs) {
    if (!el) return;
    el.style.transitionDuration = durationMs + 'ms';
    // Force the (possibly changed) duration to apply before the opacity
    // change, same reflow trick used elsewhere in this project.
    void el.offsetWidth;
    el.style.opacity = String(opacity);
  }

  function buildWindowGlows(refs, config) {
    var cfg = config.cinematicLighting;
    refs.windowGlows.forEach(function (el) { fadeIn(el, cfg.windowGlowOpacity, cfg.windowGlowBuildMs); });
  }

  // NEW, round 8: called from js/animation.js at the exact same moment a
  // single porch/path light gets its own `.lit` class, so the glow and the
  // light itself always turn on together with no separate timing to keep
  // in sync.
  function buildSmallLightGlow(refs, hookId, config) {
    var cfg = config.cinematicLighting;
    if (!refs.smallLightGlows) return;
    fadeIn(refs.smallLightGlows[hookId], cfg.smallLightGlowOpacity, cfg.smallLightGlowBuildMs);
  }

  function buildDoorGlow(refs, config) {
    var cfg = config.cinematicLighting;
    fadeIn(refs.doorGlow, cfg.doorGlowOpacity, cfg.doorGlowBuildMs);
  }

  function buildHaze(refs, config) {
    var cfg = config.cinematicLighting;
    fadeIn(refs.haze, cfg.hazeOpacity, cfg.hazeBuildMs);
    // Same trigger moment as the haze above (both anchored near the rose
    // window / whole-house area, both tied to the existing "rose window"
    // reveal step) - no new timing introduced.
    fadeIn(refs.roseHalo, cfg.roseHaloOpacity, cfg.roseHaloBuildMs);
  }

  /**
   * Finale moment: brief brighter pulse on everything currently lit, then
   * ease down to a "polished illuminated" resting level - mirrors the same
   * pulse-then-settle pattern already used for the per-pane finale glow.
   */
  function pulseAndSettle(refs, config) {
    var cfg = config.cinematicLighting;
    var targets = [
      { el: refs.doorGlow, base: cfg.doorGlowOpacity },
      { el: refs.haze, base: cfg.hazeOpacity },
      { el: refs.roseHalo, base: cfg.roseHaloOpacity }
    ].concat(refs.windowGlows.map(function (el) { return { el: el, base: cfg.windowGlowOpacity }; }));

    targets.forEach(function (t) {
      if (!t.el) return;
      var peak = Math.min(1, t.base * cfg.pulsePeakMultiplier);
      fadeIn(t.el, peak, cfg.pulseMs);
      setTimeout(function () {
        fadeIn(t.el, t.base, cfg.settleMs);
      }, cfg.pulseMs);
    });
  }

  function resetAll(refs) {
    if (!refs) return;
    // moonGlow is deliberately excluded - it's always-on scenery (like the
    // moon itself), not part of the reveal sequence, so Replay/reset
    // should never touch it.
    var smallGlows = refs.smallLightGlows ? Object.keys(refs.smallLightGlows).map(function (k) { return refs.smallLightGlows[k]; }) : [];
    [refs.doorGlow, refs.haze, refs.roseHalo].concat(refs.windowGlows || []).concat(smallGlows).forEach(function (el) {
      if (!el) return;
      el.style.transitionDuration = '400ms';
      void el.offsetWidth;
      el.style.opacity = '0';
    });
  }

  return {
    setup: setup,
    buildWindowGlows: buildWindowGlows,
    buildSmallLightGlow: buildSmallLightGlow,
    buildDoorGlow: buildDoorGlow,
    buildHaze: buildHaze,
    pulseAndSettle: pulseAndSettle,
    resetAll: resetAll
  };
})();
