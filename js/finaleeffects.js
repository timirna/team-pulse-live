/**
 * FINALE EFFECTS (the "100%" capstone pop)
 * ---------------------------------------------------------------------------
 * Purely presentational: flash, warm glow, sunburst rays, and a small
 * particle burst at the door, all synchronized to the final brightness pop.
 * None of this reads or touches survey data, scoring, or the pane/team
 * mapping - it only adds/removes CSS classes and short-lived decorative DOM
 * nodes, and every trigger has a matching reset so Replay starts clean.
 */
window.FinaleEffects = (function () {
  'use strict';

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // --- Flash (4) -------------------------------------------------------

  function triggerFlash(flashEl, durationMs, peakOpacity) {
    if (!flashEl) return;
    flashEl.style.setProperty('--finale-flash-ms', durationMs + 'ms');
    flashEl.style.setProperty('--finale-flash-peak', String(peakOpacity));
    flashEl.classList.remove('flash');
    void flashEl.offsetWidth; // force reflow so the animation can retrigger
    flashEl.classList.add('flash');
    setTimeout(function () { flashEl.classList.remove('flash'); }, durationMs + 50);
  }

  function resetFlash(flashEl) {
    if (!flashEl) return;
    flashEl.classList.remove('flash');
  }

  // --- Warm glow on windows/door (2) ------------------------------------

  function triggerGlow(glowTargets, durationMs, settleOpacity) {
    glowTargets.forEach(function (el) {
      if (!el) return;
      el.style.setProperty('--finale-glow-ms', durationMs + 'ms');
      el.style.setProperty('--finale-glow-settle', String(settleOpacity));
      el.classList.remove('finale-glow-pulse');
      void el.offsetWidth;
      el.classList.add('finale-glow-pulse');
    });
  }

  function resetGlow(glowTargets) {
    glowTargets.forEach(function (el) {
      if (!el) return;
      el.classList.remove('finale-glow-pulse');
    });
  }

  // --- Sunburst rays (3) -------------------------------------------------

  function triggerRays(raysEl, durationMs) {
    if (!raysEl) return;
    raysEl.style.setProperty('--finale-rays-ms', durationMs + 'ms');
    raysEl.classList.remove('pulse');
    void raysEl.offsetWidth;
    raysEl.classList.add('pulse');
    setTimeout(function () { raysEl.classList.remove('pulse'); }, durationMs + 50);
  }

  function resetRays(raysEl) {
    if (!raysEl) return;
    raysEl.classList.remove('pulse');
  }

  function positionRays(raysEl, centerPct) {
    if (!raysEl || !centerPct) return;
    raysEl.style.left = centerPct.left + '%';
    raysEl.style.top = centerPct.top + '%';
  }

  // --- Particle burst at the door (5) ------------------------------------

  function triggerParticles(containerEl, centerPct, opts, seed) {
    if (!containerEl || !centerPct) return;
    var rng = mulberry32(seed);
    var count = opts.count || 10;
    var durationMs = opts.durationMs || 1000;
    var color = opts.color || '#FFD98A';

    for (var i = 0; i < count; i++) {
      var p = document.createElement('div');
      p.className = 'finale-particle';
      p.style.left = centerPct.left + '%';
      p.style.top = centerPct.top + '%';
      p.style.setProperty('--finale-particle-color', color);

      var angle = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.6;
      var distance = 70 + rng() * 210; // px; presentation-scale burst around the house
      var dx = Math.cos(angle) * distance;
      var dy = Math.sin(angle) * distance * 0.55 - 45; // concentrate around roof/facade
      p.style.setProperty('--dx', dx.toFixed(1) + 'px');
      p.style.setProperty('--dy', dy.toFixed(1) + 'px');

      var dur = durationMs * (0.85 + rng() * 0.3);
      p.style.setProperty('--dur', dur.toFixed(0) + 'ms');
      p.style.animationDelay = (rng() * 120).toFixed(0) + 'ms';

      containerEl.appendChild(p);
      p.classList.add('burst');
    }

    // Clean up after the longest possible particle animation finishes.
    setTimeout(function () {
      clearParticles(containerEl);
    }, durationMs * 1.3 + 200);
  }

  function clearParticles(containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = '';
  }

  // --- QR fade (6) ---------------------------------------------------

  function fadeOutQr(qrEl, fadeMs) {
    if (!qrEl) return;
    qrEl.style.setProperty('--finale-qr-fade-ms', fadeMs + 'ms');
    qrEl.classList.add('qr-hidden');
  }

  function restoreQr(qrEl) {
    if (!qrEl) return;
    qrEl.classList.remove('qr-hidden');
  }

  // --- Full reset (used by Replay / initial state) ------------------------

  function resetAll(dom) {
    resetFlash(dom.flashOverlay);
    resetGlow(dom.finaleGlowTargets || []);
    resetRays(dom.sunburstRays);
    clearParticles(dom.particleContainer);
    restoreQr(dom.qrContainer);
  }

  return {
    triggerFlash: triggerFlash,
    resetFlash: resetFlash,
    triggerGlow: triggerGlow,
    resetGlow: resetGlow,
    triggerRays: triggerRays,
    resetRays: resetRays,
    positionRays: positionRays,
    triggerParticles: triggerParticles,
    clearParticles: clearParticles,
    fadeOutQr: fadeOutQr,
    restoreQr: restoreQr,
    resetAll: resetAll
  };
})();
