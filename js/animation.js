/**
 * ANIMATION SEQUENCE
 * ---------------------------------------------------------------------------
 * Orchestrates the approved 10-step reveal using CSS class/style toggles
 * (transitions do the actual easing) driven by a deterministic seeded
 * scheduler, so Replay reproduces the same "organic" pane-cluster timing
 * every time. No animation library is used.
 */
window.RevealAnimation = (function () {
  'use strict';

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function shuffleDeterministic(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /**
   * Returns {left, top} as a percentage of the SVG's own rendered box for
   * `el`'s center. Uses getCTM() (which composes ALL ancestor transforms,
   * including any on individual rotated/translated leaf shapes) and then
   * divides out the root's own viewBox->CSS-pixel scale, rather than
   * assuming el's coordinates are already in viewBox units - getCTM()
   * actually returns CSS-pixel space relative to the nearest viewport, which
   * is only numerically equal to viewBox units by coincidence.
   */
  function elCenterAsPercent(el, svgRoot) {
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
    return {
      left: (p.x / rootRect.width) * 100,
      top: (p.y / rootRect.height) * 100
    };
  }

  /**
   * @param {object} opts
   *   svgRoot, teamPanes, processed, config, dom: {..overlay elements..},
   *   prefersReducedMotion: boolean, onStatus: fn(stepName)
   */
  function create(opts) {
    var config = opts.config;
    var svgRoot = opts.svgRoot;
    var teamPanes = opts.teamPanes;
    var processed = opts.processed;
    var dom = opts.dom;
    var cinematic = opts.cinematic || null;
    var reduced = opts.prefersReducedMotion;
    var timeScale = reduced ? 0.15 : 1;
    var onStatus = opts.onStatus || function () {};

    var hook = {};
    config.optionalHookIds.forEach(function (id) {
      hook[id] = svgRoot.querySelector('#' + CSS.escape(id));
    });

    var running = false;
    var currentToken = 0;

    function q(id) { return hook[id]; }

    function setLit(el, on, opts2) {
      if (!el) return;
      el.classList.toggle('lit', !!on);
      if (opts2 && opts2.extra) el.classList.toggle(opts2.extra, !!on);
    }

    function finaleGlowTargets() {
      var targets = [q('DOOR_GLASS')];
      config.teams.forEach(function (team) {
        var el = svgRoot.querySelector('#' + CSS.escape(team.svgGroup));
        if (el) targets.push(el);
      });
      return targets;
    }

    function resetVisualState() {
      svgRoot.classList.add('scene-dark');
      svgRoot.classList.remove('scene-lit', 'scene-nearly-lit', 'finale-impact');
      if (dom.mount) dom.mount.classList.remove('finale-impact');
      // Do not stop audio here. resetVisualState() runs immediately after the
      // Play/Replay click; stopping audio here killed the background bed that
      // startFromGesture() had just started. Audio is reset by the click-side
      // AudioManager.startFromGesture() instead.
      ['UPPER_WINDOW_LEFT', 'UPPER_WINDOW_LEFT_CENTER', 'UPPER_WINDOW_RIGHT', 'UPPER_WINDOW_RIGHT_CENTER',
       'PORCH_LIGHT_01', 'PORCH_LIGHT_02', 'PORCH_LIGHT_03',
       'PATH_LIGHT_01', 'PATH_LIGHT_02', 'PATH_LIGHT_03', 'PATH_LIGHT_04',
       'DOOR_GLASS', 'ROSE_GLASS'].forEach(function (id) { setLit(q(id), false); });

      Object.keys(teamPanes).forEach(function (teamId) {
        teamPanes[teamId].forEach(function (pane) {
          pane.overlays.forEach(function (ov) {
            ov.style.opacity = '0';
            ov.style.fill = 'transparent';
          });
          pane.elements.forEach(function (el) { el.classList.remove('pane-lit'); });
        });
      });

      if (dom.doorResultText) {
        dom.doorResultText.textContent = '';
        dom.doorResultText.classList.remove('revealed');
      }
      if (dom.doorResultSr) dom.doorResultSr.textContent = '';
      if (dom.roseWords) {
        dom.roseWords.innerHTML = '';
        dom.roseWords.style.transform = 'none';
      }
      if (dom.roseWordsWrap) dom.roseWordsWrap.classList.remove('visible');

      // Finale effects (flash / glow / rays / particles / QR visibility) -
      // full reset so Replay always starts from a clean slate.
      if (window.FinaleEffects) {
        window.FinaleEffects.resetAll({
          flashOverlay: dom.flashOverlay,
          finaleGlowTargets: finaleGlowTargets(),
          sunburstRays: dom.sunburstRays,
          particleContainer: dom.particleContainer,
          qrContainer: dom.qrContainer
        });
      }

      // Cinematic lighting (window/door glow spill, haze) - full reset so
      // Replay always starts from a clean, dark slate.
      if (window.CinematicLighting && cinematic) {
        window.CinematicLighting.resetAll(cinematic);
      }
    }

    function positionOverlay(el, hookEl, wrapEl) {
      if (!hookEl || !el || !wrapEl) return;
      var pct = elCenterAsPercent(hookEl, svgRoot);
      el.style.left = pct.left + '%';
      el.style.top = pct.top + '%';
    }

    // Measures hookEl's own rendered diameter as a percentage of the SVG's
    // rendered width (same getBBox/getCTM approach as elCenterAsPercent, but
    // for size instead of position), so overlay boxes can be sized relative
    // to real artwork geometry - responsive at any viewport, not a guessed
    // vw value that could overflow a small circular window with a long word.
    function elDiameterAsPercent(el, svgRootEl) {
      var svg = el.ownerSVGElement || svgRootEl;
      var bbox = el.getBBox();
      var ctm = el.getCTM();
      if (!ctm) return null;
      var cx = bbox.x + bbox.width / 2, cy = bbox.y + bbox.height / 2;
      var centerPt = svg.createSVGPoint(); centerPt.x = cx; centerPt.y = cy;
      var edgePt = svg.createSVGPoint(); edgePt.x = cx + bbox.width / 2; edgePt.y = cy;
      var p1 = centerPt.matrixTransform(ctm);
      var p2 = edgePt.matrixTransform(ctm);
      var radiusPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      var rootRect = svgRootEl.getBoundingClientRect();
      if (!rootRect.width) return null;
      return (radiusPx * 2 / rootRect.width) * 100;
    }

    // Client feedback, 2026-09-15 round 3: "remove 100% completely... do
    // not display the percentage anywhere on the house... never prepend
    // 100%. If YES is genuine survey data, keep only the actual response
    // and style it elegantly." No number is shown visually at all now -
    // only the qualitative "Yes" when the real data genuinely supports it
    // (majority positive). The underlying percentage is still computed
    // exactly as before (js/dataProcessing.js -> q8Percentage) and still
    // announced to screen readers for accessibility - only the ON-HOUSE
    // VISUAL text changed. No count-up animation any more since there's no
    // longer a number to animate; the word fades in instead (js/
    // styles.css -> #door-result-value.revealed), holding for the same
    // duration (config.animation.doorCountUpMs) so the reveal pacing is
    // unchanged.
    // Client feedback, 2026-09-15 round 9: "the door must show a number, not
    // a word" - the qualitative "Yes" from the previous round is replaced by
    // the actual percentage again, counting up to it so the number itself is
    // part of the reveal. The restrained styling from earlier rounds (small,
    // warm gold, engraved - not a big neon callout) is kept.
    function revealDoorResult(el, srEl, q8Percentage, q8Total, ms) {
      return new Promise(function (resolve) {
        if (!el) return resolve();
        if (!(q8Total > 0)) { el.textContent = ''; return resolve(); }

        var to = Math.round(q8Percentage);
        el.classList.add('revealed');
        var start = performance.now();
        function tick(now) {
          var t = Math.min(1, (now - start) / ms);
          var eased = 1 - Math.pow(1 - t, 3);
          el.textContent = Math.round(to * eased) + '%';
          if (t < 1) { requestAnimationFrame(tick); return; }
          el.textContent = to + '%';
          if (srEl) srEl.textContent = to + '% of respondents gave a positive answer.';
          resolve();
        }
        requestAnimationFrame(tick);
      });
    }

    function clearRoseWords() {
      if (dom.roseWords) dom.roseWords.innerHTML = '';
      if (dom.roseWordsWrap) dom.roseWordsWrap.classList.remove('visible');
    }

    // Render only Q10 values supplied by the live aggregation (or mock
    // fallback). No literal status or placeholder is ever inserted here.
    function renderRoseWords(words) {
      clearRoseWords();
      if (!dom.roseWords || !dom.roseWordsWrap || !words || !words.length) return;
      positionOverlay(dom.roseWordsWrap, q('ROSE_GLASS') || q('ROSE_FRAME'), dom.overlayWrap);
      var diameter = elDiameterAsPercent(q('ROSE_GLASS') || q('ROSE_FRAME'), svgRoot);
      if (diameter) dom.roseWordsWrap.style.width = Math.max(7, diameter * 0.88).toFixed(2) + '%';
      words.forEach(function (item, i) {
        if (!item || !item.word) return;
        var word = document.createElement('span');
        word.className = 'rose-word';
        word.style.fontSize = Math.max(config.roseWindow.minFontPx, config.roseWindow.maxFontPx - i * 1.5) + 'px';
        word.style.transitionDelay = (i * config.animation.roseWordStagger) + 'ms';
        word.textContent = item.word;
        dom.roseWords.appendChild(word);
      });
      if (dom.roseWords.childElementCount) dom.roseWordsWrap.classList.add('visible');
    }

    async function runSequence(token) {
      var t = config.animation.stepDelayAfter;
      var scaledSleep = function (ms) { return sleep(ms * timeScale); };

      // 1-2: dark house + subtle atmosphere
      onStatus('Setting the night scene…');
      resetVisualState();
      svgRoot.classList.add('twinkle');
      await scaledSleep(t.atmosphere);
      if (token !== currentToken) return;

      // 3: upper windows
      onStatus('Lighting the upper windows…');
      ['UPPER_WINDOW_LEFT', 'UPPER_WINDOW_LEFT_CENTER', 'UPPER_WINDOW_RIGHT', 'UPPER_WINDOW_RIGHT_CENTER'].forEach(function (id, i) {
        setTimeout(function () { setLit(q(id), true); }, reduced ? 0 : i * 150);
      });
      await scaledSleep(t.upperWindows);
      if (token !== currentToken) return;

      // 4: porch lights
      onStatus('Turning on the porch lights…');
      ['PORCH_LIGHT_01', 'PORCH_LIGHT_02', 'PORCH_LIGHT_03'].forEach(function (id, i) {
        setTimeout(function () {
          setLit(q(id), true);
          if (window.CinematicLighting && cinematic) {
            window.CinematicLighting.buildSmallLightGlow(cinematic, id, config);
          }
        }, reduced ? 0 : i * config.animation.porchLightStagger);
      });
      await scaledSleep(t.porchLights);
      if (token !== currentToken) return;

      // 5: path lights, staggered
      onStatus('Lighting the path…');
      ['PATH_LIGHT_01', 'PATH_LIGHT_02', 'PATH_LIGHT_03', 'PATH_LIGHT_04'].forEach(function (id, i) {
        setTimeout(function () {
          setLit(q(id), true);
          if (window.CinematicLighting && cinematic) {
            window.CinematicLighting.buildSmallLightGlow(cinematic, id, config);
          }
        }, reduced ? 0 : i * config.animation.pathLightStagger);
      });
      await scaledSleep(t.pathLights);
      if (token !== currentToken) return;

      // 6: 35 data panes in organic clusters
      onStatus('Illuminating team results…');
      if (window.CinematicLighting && cinematic) {
        window.CinematicLighting.buildWindowGlows(cinematic, config);
      }
      var rng = mulberry32(config.animation.randomSeed);
      var flatPanes = [];
      Object.keys(teamPanes).forEach(function (teamId) {
        teamPanes[teamId].forEach(function (pane) { flatPanes.push({ teamId: teamId, pane: pane }); });
      });
      var shuffled = shuffleDeterministic(flatPanes, rng);
      var clusterCount = Math.max(1, config.animation.paneClusterCount);
      var clusters = [];
      for (var i = 0; i < clusterCount; i++) clusters.push([]);
      shuffled.forEach(function (item, idx) { clusters[idx % clusterCount].push(item); });

      var maxFinish = 0;
      clusters.forEach(function (cluster, ci) {
        var clusterStart = reduced ? 0 : ci * config.animation.paneClusterGap;
        cluster.forEach(function (item) {
          var jitter = reduced ? 0 : rng() * config.animation.paneClusterSpread;
          var delay = clusterStart + jitter;
          maxFinish = Math.max(maxFinish, delay);
          setTimeout(function () { lightPane(item.teamId, item.pane); }, delay);
        });
      });
      await scaledSleep(maxFinish + t.dataPanes);
      if (token !== currentToken) return;

      // 7: door glow + percentage count-up
      onStatus('Revealing the door result…');
      setLit(q('DOOR_GLASS'), true);
      if (window.CinematicLighting && cinematic) {
        window.CinematicLighting.buildDoorGlow(cinematic, config);
      }
      positionOverlay(dom.doorResultText && dom.doorResultText.parentElement, q('DOOR_STAT') || q('DOOR_GLASS'), dom.overlayWrap);
      await revealDoorResult(dom.doorResultText, dom.doorResultSr, processed.q8Percentage, processed.q8Total, reduced ? 200 : config.animation.doorCountUpMs);
      await scaledSleep(t.doorGlow);
      if (token !== currentToken) return;

      // 8: pause
      await scaledSleep(t.pauseBeforeRose);
      if (token !== currentToken) return;

      // 9: rose window capstone - also marks the top of the slow build,
      // bringing the house to ~90% brightness (client feedback: "builds
      // more slowly up to roughly 90%"). The snappy jump to 100% is its own
      // distinct beat, below.
      onStatus('Illuminating the rose window…');
      setLit(q('ROSE_FRAME'), true);
      setLit(q('ROSE_GLASS'), true, { extra: 'lit-strong' });
      // Rose window word: client feedback, 2026-09-15 round 4 - show a
      // fixed word (config.roseWindow.fixedWord) instead of the live Q10
      // ranking. Falls back to genuine Q10 responses if fixedWord is unset.
      renderRoseWords(
        config.roseWindow.fixedWord
          ? [{ word: config.roseWindow.fixedWord, count: 0 }]
          : processed.q10Ranked
      );
      svgRoot.classList.remove('scene-dark');
      svgRoot.classList.add('scene-nearly-lit');
      if (window.CinematicLighting && cinematic) {
        window.CinematicLighting.buildHaze(cinematic, config);
      }

      // AUDIO ONLY: schedule the main reveal SFX so its measured strongest
      // payoff (~1.35 s after start) lands on the existing 100% visual impact.
      // This timer runs inside the existing rose/finale timing and therefore
      // does not add or remove a single millisecond from the visual reveal.
      var msUntilImpactFromRoseStart = (t.roseWindow || 0) +
        (config.finale.qrFadeOutBeforePopMs || 0) +
        (config.finale.audioLeadInMs || 0);
      var finalSfxDelay = Math.max(0, msUntilImpactFromRoseStart -
        ((config.audio && config.audio.finalSfxPeakLeadMs) || 1350));
      setTimeout(function () {
        if (token === currentToken && window.AudioManager) window.AudioManager.playFinalReveal();
      }, reduced ? 0 : finalSfxDelay);

      await scaledSleep(t.roseWindow);
      if (token !== currentToken) return;

      // 10: FINALE - fast/snappy pop from ~90% to 100%, with a synchronized
      // flash, warm glow on the windows/door, sunburst rays, and a small
      // particle burst at the doorway. The QR code fades out just before
      // this so it doesn't compete visually with the pop.
      var fin = config.finale;
      onStatus('The house comes alive…');
      // Client feedback, 2026-09-15 round 7: keep the QR visible straight
      // through the settled 100% state (not just before the reveal) - the
      // audience is most likely to want to scan right when the result is
      // shown. `fadeOutQr()` is no longer called here; the pre-pop pause
      // below is kept as-is so the overall reveal pacing doesn't shift.
      await scaledSleep(fin.qrFadeOutBeforePopMs);
      if (token !== currentToken) return;

      // Preserve the existing pre-impact wait exactly. The main SFX was
      // scheduled above from the rose-window event; no visual timing changes.
      await scaledSleep(fin.audioLeadInMs || 0);
      if (token !== currentToken) return;

      svgRoot.style.setProperty('--finale-pop-ms', (reduced ? 120 : fin.popTransitionMs) + 'ms');
      svgRoot.classList.remove('scene-nearly-lit');
      svgRoot.classList.add('scene-lit');
      if (dom.mount) dom.mount.classList.add('finale-impact');
      svgRoot.classList.add('finale-impact');

      // AUDIO ONLY: one short accent at the exact existing 100% impact.
      if (window.AudioManager) window.AudioManager.playSparkle();

      var settleMs = fin.popTransitionMs;
      if (window.FinaleEffects) {
        window.FinaleEffects.triggerFlash(dom.flashOverlay, fin.flashDurationMs, fin.flashPeakOpacity);
        window.FinaleEffects.triggerGlow(finaleGlowTargets(), fin.glowPulseMs, fin.glowSettleOpacity);

        var raysAnchor = q('ROSE_GLASS') || q('DOOR_FRAME');
        if (raysAnchor && dom.sunburstRays) {
          window.FinaleEffects.positionRays(dom.sunburstRays, elCenterAsPercent(raysAnchor, svgRoot));
          window.FinaleEffects.triggerRays(dom.sunburstRays, fin.raysPulseMs);
        }

        var doorAnchor = q('DOOR_STAT') || q('DOOR_GLASS') || q('DOOR_FRAME');
        if (doorAnchor && dom.particleContainer) {
          window.FinaleEffects.triggerParticles(
            dom.particleContainer,
            elCenterAsPercent(doorAnchor, svgRoot),
            { count: fin.particleCount, durationMs: fin.particleBurstMs, color: fin.particleColor },
            config.animation.randomSeed + 1
          );
        }
        settleMs = Math.max(fin.popTransitionMs, fin.glowPulseMs, fin.raysPulseMs, fin.particleBurstMs * 1.2);
      }

      if (window.CinematicLighting && cinematic) {
        window.CinematicLighting.pulseAndSettle(cinematic, config);
        settleMs = Math.max(settleMs, config.cinematicLighting.pulseMs + config.cinematicLighting.settleMs);
      }

      await scaledSleep(reduced ? 150 : settleMs);
      if (dom.mount) dom.mount.classList.remove('finale-impact');
      svgRoot.classList.remove('finale-impact');
      if (token !== currentToken) return;
      ensureSettledFinalState();
      onStatus('Reveal complete.');
      // AUDIO: keep the background bed running after the reveal completes.
      // Restore its normal level after the finale duck; the background track
      // itself loops continuously until muted, replayed, or the page closes.
      if (window.AudioManager) {
        window.AudioManager.restoreBackgroundLevel(0);
      }
    }

    // Reliability guard: explicitly re-assert the approved settled 100% state
    // after every completed run. This prevents a Replay/finale from being left
    // in an intermediate state if transient effect timers/classes finish in a
    // different order on a presentation browser.
    function ensureSettledFinalState() {
      svgRoot.classList.remove('scene-dark', 'scene-nearly-lit', 'finale-impact');
      svgRoot.classList.add('scene-lit');
      if (dom.mount) dom.mount.classList.remove('finale-impact');

      ['UPPER_WINDOW_LEFT', 'UPPER_WINDOW_LEFT_CENTER', 'UPPER_WINDOW_RIGHT', 'UPPER_WINDOW_RIGHT_CENTER',
       'PORCH_LIGHT_01', 'PORCH_LIGHT_02', 'PORCH_LIGHT_03',
       'PATH_LIGHT_01', 'PATH_LIGHT_02', 'PATH_LIGHT_03', 'PATH_LIGHT_04',
       'DOOR_GLASS'].forEach(function (id) { setLit(q(id), true); });

      setLit(q('ROSE_FRAME'), true);
      setLit(q('ROSE_GLASS'), true, { extra: 'lit-strong' });

      Object.keys(teamPanes).forEach(function (teamId) {
        teamPanes[teamId].forEach(function (pane) { lightPane(teamId, pane); });
      });

      if (dom.doorResultText) {
        dom.doorResultText.textContent = Math.round(processed.q8Percentage || 0) + '%';
        dom.doorResultText.classList.add('revealed');
      }
      if (dom.qrContainer && window.FinaleEffects) {
        window.FinaleEffects.restoreQr(dom.qrContainer);
      }
    }

    function lightPane(teamId, pane) {
      var avg = processed.teamAverages[teamId] ? processed.teamAverages[teamId][pane.questionKey] : null;
      var baseColor = window.ColorUtils.scoreToColor(avg === null ? 3 : avg, config);
      var shades = config.facetedPaneShading ? window.ColorUtils.shadeVariants(baseColor) : null;
      var targetOpacity = avg === null ? '0.15' : '0.92';

      pane.overlays.forEach(function (ov) {
        var fillColor = baseColor;
        if (shades) {
          var tier = ov.getAttribute('data-shade-tier');
          fillColor = tier === '0' ? shades.dark : (tier === '2' ? shades.light : shades.medium);
        }
        ov.style.fill = fillColor;
        ov.style.opacity = targetOpacity;
      });
      pane.elements.forEach(function (el) { el.classList.add('pane-lit'); });
    }

    function play() {
      if (running) return;
      running = true;
      currentToken++;
      var token = currentToken;
      // Called synchronously from the existing Play/Replay click handler.
      if (window.AudioManager) window.AudioManager.startReveal();
      return runSequence(token).finally(function () { running = false; });
    }

    function replay() {
      currentToken++; // invalidate any in-flight sequence
      running = false;
      resetVisualState();
      return play();
    }

    function isRunning() { return running; }

    return { play: play, replay: replay, isRunning: isRunning, resetVisualState: resetVisualState };
  }

  return { create: create };
})();
