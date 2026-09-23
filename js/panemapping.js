/**
 * DATA-PANE MAPPING
 * ---------------------------------------------------------------------------
 * Builds the 5 teams x 7 questions = 35 pane mapping directly from the real
 * SVG geometry at runtime (no hand-authored per-path IDs, so it keeps working
 * even if the artwork is re-exported with the same group structure).
 *
 * Method: for each team's window group, every drawable child (path/rect) that
 * is NOT a structural lead-line/frame (near-black fill, detected by computed
 * luminance) is measured with getBBox()+getCTM() to find its center relative
 * to the window group. The window is then sliced into N horizontal bands
 * (N = config.svg.panesPerWindow) and each glass fragment is assigned to the
 * band its center falls into. That gives 7 independently-controllable pane
 * zones per window without altering a single original path.
 *
 * Coloring/animating a pane never touches the original path: a same-geometry
 * overlay clone is inserted directly above each fragment with
 * mix-blend-mode so the original shading/highlights show through.
 */
window.PaneMapping = (function () {
  'use strict';

  function relativeLuminance(rgbStr) {
    var m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(rgbStr || '');
    if (!m) return 1; // unknown -> treat as non-structural (don't accidentally hide glass)
    var r = parseInt(m[1], 10) / 255, g = parseInt(m[2], 10) / 255, b = parseInt(m[3], 10) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function isStructural(el, threshold) {
    var fill = window.getComputedStyle(el).fill;
    if (!fill || fill === 'none') return true;
    return relativeLuminance(fill) < threshold;
  }

  /**
   * Client feedback, 2026-09-15 (round 2): "not one flat solid color per
   * pane" - each pane's glass fragments are tagged dark/medium/light
   * (0/1/2) based on the ORIGINAL artwork's own relative luminance, ranked
   * within that pane only (terciles), so every pane - regardless of its own
   * absolute brightness - ends up with a genuine mix of all three tiers.
   * This preserves the artist's original highlight/shadow placement; the
   * animation layer (js/animation.js) maps each tier to a shade of whatever
   * the pane's resolved score color is.
   */
  function assignShadeTiers(elements) {
    var withLum = elements.map(function (el) {
      return { el: el, lum: relativeLuminance(window.getComputedStyle(el).fill) };
    });
    withLum.sort(function (a, b) { return a.lum - b.lum; });
    var n = withLum.length;
    withLum.forEach(function (item, i) {
      var tier;
      if (n <= 1) tier = 1;
      else if (n === 2) tier = i === 0 ? 0 : 2;
      else {
        var frac = i / (n - 1);
        tier = frac < 0.34 ? 0 : (frac < 0.67 ? 1 : 2);
      }
      item.el.setAttribute('data-shade-tier', String(tier));
    });
  }

  function centerRelativeTo(el, ancestorEl) {
    var bbox = el.getBBox();
    var svg = el.ownerSVGElement;
    var pt = svg.createSVGPoint();
    pt.x = bbox.x + bbox.width / 2;
    pt.y = bbox.y + bbox.height / 2;
    var elCTM = el.getCTM();
    var ancestorCTM = ancestorEl.getCTM();
    if (!elCTM || !ancestorCTM) return { x: 0, y: 0 };
    var rel = ancestorCTM.inverse().multiply(elCTM);
    var transformed = pt.matrixTransform(rel);
    return { x: transformed.x, y: transformed.y };
  }

  function boundsRelativeTo(groupEl, ancestorEl) {
    // groupEl's own getBBox() is already in groupEl's local user space; if
    // groupEl === ancestorEl this is exactly what we want. We call this with
    // groupEl === ancestorEl (the window group itself), so no extra transform.
    return groupEl.getBBox();
  }

  /**
   * @param {SVGSVGElement} svgRoot
   * @param {object} config window.APP_CONFIG
   * @returns {{
   *   teamPanes: Record<teamId, {questionKey:string, paneIndex:number, elements:SVGElement[], overlays:SVGElement[], centroid:{x:number,y:number}}[]>,
   *   warnings: string[]
   * }}
   */
  function buildMapping(svgRoot, config) {
    var warnings = [];
    var teamPanes = {};
    var N = config.svg.panesPerWindow;
    var threshold = config.svg.leadLineLuminanceThreshold;

    config.teams.forEach(function (team) {
      var winEl = svgRoot.querySelector('#' + CSS.escape(team.svgGroup));
      if (!winEl) {
        warnings.push('Team "' + team.name + '" window group #' + team.svgGroup + ' not found; its panes will be skipped.');
        teamPanes[team.id] = [];
        return;
      }

      var candidates = Array.prototype.slice.call(winEl.querySelectorAll('path, rect'))
        .filter(function (el) { return !isStructural(el, threshold); });

      if (candidates.length === 0) {
        warnings.push('Team "' + team.name + '" window #' + team.svgGroup + ' has no colored glass shapes; check leadLineLuminanceThreshold.');
        teamPanes[team.id] = [];
        return;
      }

      var winBBox = boundsRelativeTo(winEl, winEl);
      var bandHeight = winBBox.height / N;

      var bands = [];
      for (var i = 0; i < N; i++) bands.push([]);

      candidates.forEach(function (el) {
        var c = centerRelativeTo(el, winEl);
        var idx = Math.floor((c.y - winBBox.y) / bandHeight);
        // Hidden SVG groups can report a zero-height box in painted mode.
        // Keep mapping available so live data and HTML results can still boot.
        if (!isFinite(idx)) idx = 0;
        if (idx < 0) idx = 0;
        if (idx >= N) idx = N - 1;
        bands[idx].push({ el: el, center: c });
      });

      var scoredOrder = config.scoredQuestionOrder; // top-to-bottom order
      var panes = bands.map(function (bandItems, i) {
        var xs = bandItems.map(function (b) { return b.center.x; });
        var ys = bandItems.map(function (b) { return b.center.y; });
        var centroid = {
          x: xs.length ? xs.reduce(function (a, b) { return a + b; }, 0) / xs.length : winBBox.x + winBBox.width / 2,
          y: ys.length ? ys.reduce(function (a, b) { return a + b; }, 0) / ys.length : winBBox.y + bandHeight * (i + 0.5)
        };
        return {
          questionKey: scoredOrder[i] || ('extra' + i),
          paneIndex: i,
          elements: bandItems.map(function (b) { return b.el; }),
          overlays: [],
          centroid: centroid
        };
      });

      if (panes.some(function (p) { return p.elements.length === 0; })) {
        warnings.push('Team "' + team.name + '" window #' + team.svgGroup + ': one or more of the 7 pane bands matched zero glass shapes (uneven artwork geometry). That pane will simply show no tint.');
      }

      panes.forEach(function (pane) {
        pane.elements.forEach(function (el) {
          el.setAttribute('data-team', team.id);
          el.setAttribute('data-question', pane.questionKey);
          el.setAttribute('data-pane-index', String(pane.paneIndex));
        });
        assignShadeTiers(pane.elements);
      });

      teamPanes[team.id] = panes;
    });

    return { teamPanes: teamPanes, warnings: warnings };
  }

  /**
   * Inserts a non-destructive, same-geometry overlay clone directly above
   * each pane element, ready to be tinted/faded by the animation layer.
   * The original element is never modified beyond the data-* attributes set
   * in buildMapping (data-shade-tier included, carried onto the clone
   * automatically since cloneNode copies attributes).
   *
   * Blend mode is 'normal' (not 'hue'): 'hue' blending takes its LIGHTNESS
   * from the backdrop artwork, which would flatten out the dark/medium/light
   * shade tiers this pane now deliberately assigns - a flat, near-opaque
   * fill is what makes the faceted per-pane shading actually visible and
   * matches the client's reference (clean, crisp color facets). The
   * original black lead-line paths are never covered by an overlay at all
   * (only non-structural glass fragments get one), so they stay fully
   * visible regardless of overlay opacity.
   */
  function createOverlays(teamPanes) {
    Object.keys(teamPanes).forEach(function (teamId) {
      teamPanes[teamId].forEach(function (pane) {
        pane.elements.forEach(function (el) {
          var clone = el.cloneNode(false);
          clone.removeAttribute('class');
          clone.removeAttribute('id');
          clone.setAttribute('data-overlay-for-team', teamId);
          clone.setAttribute('data-overlay-for-question', pane.questionKey);
          clone.style.fill = 'transparent';
          clone.style.mixBlendMode = 'normal';
          clone.style.opacity = '0';
          clone.style.pointerEvents = 'none';
          clone.style.transition = 'opacity 900ms ease, fill 900ms ease';
          el.insertAdjacentElement('afterend', clone);
          pane.overlays.push(clone);
        });
      });
    });
  }

  function renderDebugLabels(svgRoot, teamPanes, config) {
    var existing = svgRoot.querySelector('#debug-pane-labels');
    if (existing) existing.remove();
    if (!config.svg.debugLabels) return;

    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', 'debug-pane-labels');
    g.setAttribute('pointer-events', 'none');

    Object.keys(teamPanes).forEach(function (teamId) {
      teamPanes[teamId].forEach(function (pane) {
        var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', pane.centroid.x);
        text.setAttribute('y', pane.centroid.y);
        text.setAttribute('font-size', '9');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#ff00ff');
        text.setAttribute('stroke', '#000');
        text.setAttribute('stroke-width', '0.3');
        text.setAttribute('font-family', 'monospace');
        text.textContent = teamId + '/' + pane.questionKey;
        g.appendChild(text);
      });
    });

    svgRoot.appendChild(g);
  }

  return {
    buildMapping: buildMapping,
    createOverlays: createOverlays,
    renderDebugLabels: renderDebugLabels
  };
})();

