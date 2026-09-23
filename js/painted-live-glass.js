/**
 * PSD-ALIGNED LIVE STAINED GLASS
 * ---------------------------------------------------------------------------
 * The visible artwork remains the approved painted chapel PNG. Coordinates
 * below were measured from Timir's separated 1726x911 PSD so live survey
 * colors land precisely on the five lower stained-glass windows.
 *
 * Each of the 35 score panes is a translucent, multi-facet color layer using
 * CSS `mix-blend-mode: color`. That replaces hue/saturation while preserving
 * the painted PNG's luminance, bevels, highlights, lead lines and texture —
 * so an orange score still has several orange shades instead of a flat fill.
 */
(function () {
  'use strict';

  var ART_W = 1726;
  var ART_H = 911;

  // Main lower-glass interiors measured from the PSD, left -> right.
  var WINDOW_BOXES = [
    { teamId: 'team1', x: 417,  y: 478, w: 113, h: 203 }, // Sales & Marketing
    { teamId: 'team2', x: 561,  y: 477, w: 113, h: 203 }, // Operations
    { teamId: 'team3', x: 1059, y: 477, w: 97,  h: 203 }, // Field Services
    { teamId: 'team4', x: 1151, y: 477, w: 92,  h: 203 }, // Leadership
    { teamId: 'team5', x: 1242, y: 477, w: 90,  h: 203 }  // Customer Service & HR
  ];

  var processed = null;
  var paneRefs = {};
  var overlaySvg = null;
  var revealToken = 0;

  function ns(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
  }

  function questionOrder() {
    return (window.APP_CONFIG && window.APP_CONFIG.scoredQuestionOrder) ||
      ['q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q9'];
  }

  function addDefs(svg) {
    var defs = ns('defs');
    var filter = ns('filter');
    filter.setAttribute('id', 'paintedPaneGlow');
    filter.setAttribute('x', '-25%');
    filter.setAttribute('y', '-30%');
    filter.setAttribute('width', '150%');
    filter.setAttribute('height', '160%');

    var blur = ns('feGaussianBlur');
    blur.setAttribute('stdDeviation', '1.7');
    blur.setAttribute('result', 'b');
    filter.appendChild(blur);

    var merge = ns('feMerge');
    var n1 = ns('feMergeNode');
    n1.setAttribute('in', 'b');
    var n2 = ns('feMergeNode');
    n2.setAttribute('in', 'SourceGraphic');
    merge.appendChild(n1);
    merge.appendChild(n2);
    filter.appendChild(merge);
    defs.appendChild(filter);
    svg.appendChild(defs);
  }

  function makePane(box, qKey, rowIndex, y, h) {
    var g = ns('g');
    g.setAttribute('class', 'painted-data-pane');
    g.setAttribute('data-team', box.teamId);
    g.setAttribute('data-question', qKey);
    g.style.opacity = '0';

    var base = ns('rect');
    base.setAttribute('x', box.x);
    base.setAttribute('y', y);
    base.setAttribute('width', box.w);
    base.setAttribute('height', h + 0.8);
    base.setAttribute('rx', '1.5');
    base.setAttribute('class', 'painted-pane-base');
    g.appendChild(base);

    // Dark diagonal facet.
    var dark = ns('polygon');
    dark.setAttribute('points', [
      box.x + ',' + y,
      (box.x + box.w * .53) + ',' + y,
      (box.x + box.w * .34) + ',' + (y + h),
      box.x + ',' + (y + h)
    ].join(' '));
    dark.setAttribute('class', 'painted-pane-facet painted-pane-dark');
    g.appendChild(dark);

    // Light diagonal facet on the opposite side.
    var light = ns('polygon');
    light.setAttribute('points', [
      (box.x + box.w * .62) + ',' + y,
      (box.x + box.w) + ',' + y,
      (box.x + box.w) + ',' + (y + h),
      (box.x + box.w * .46) + ',' + (y + h)
    ].join(' '));
    light.setAttribute('class', 'painted-pane-facet painted-pane-light');
    g.appendChild(light);

    // Small alternating specular stroke; enough to read as glass without
    // softening the artwork's black/gold lead lines.
    var hi = ns('path');
    var hy = y + h * (rowIndex % 2 ? .30 : .70);
    hi.setAttribute('d', 'M ' + (box.x + 5) + ' ' + hy + ' L ' + (box.x + box.w - 5) + ' ' + (hy - 1.5));
    hi.setAttribute('class', 'painted-pane-highlight');
    g.appendChild(hi);

    paneRefs[box.teamId + ':' + qKey] = { group: g, base: base, dark: dark, light: light };
    return g;
  }

  function ensureOverlay() {
    var stage = document.getElementById('stage');
    if (!stage) return;

    document.body.classList.add('painted-live-glass');

    overlaySvg = document.getElementById('painted-data-overlay');
    if (overlaySvg) return;

    overlaySvg = ns('svg');
    overlaySvg.id = 'painted-data-overlay';
    overlaySvg.setAttribute('viewBox', '0 0 ' + ART_W + ' ' + ART_H);
    // Matches ui-ref.js's painted image: object-fit:cover; object-position:center top.
    overlaySvg.setAttribute('preserveAspectRatio', 'xMidYMin slice');
    overlaySvg.setAttribute('aria-hidden', 'true');
    addDefs(overlaySvg);

    var order = questionOrder();
    WINDOW_BOXES.forEach(function (box) {
      var teamGroup = ns('g');
      teamGroup.setAttribute('class', 'painted-team-overlay');
      teamGroup.setAttribute('data-team', box.teamId);
      var rowH = box.h / order.length;
      order.forEach(function (qKey, i) {
        teamGroup.appendChild(makePane(box, qKey, i, box.y + i * rowH, rowH));
      });
      overlaySvg.appendChild(teamGroup);
    });

    // Put score tint above the bright painting (z=1) but below all HTML UI (z=8).
    stage.insertBefore(overlaySvg, document.getElementById('vignette'));
  }

  function shadesFor(base) {
    if (window.ColorUtils && typeof window.ColorUtils.shadeVariants === 'function') {
      return window.ColorUtils.shadeVariants(base);
    }
    return { dark: base, medium: base, light: base };
  }

  function colorFor(teamId, qKey) {
    var avg = processed && processed.teamAverages && processed.teamAverages[teamId]
      ? processed.teamAverages[teamId][qKey]
      : null;
    if (avg == null || !isFinite(Number(avg))) avg = 3;
    if (window.ColorUtils && typeof window.ColorUtils.scoreToColor === 'function') {
      return window.ColorUtils.scoreToColor(Number(avg), window.APP_CONFIG);
    }
    return '#F5D033';
  }

  function paintPane(teamId, qKey) {
    var ref = paneRefs[teamId + ':' + qKey];
    if (!ref) return;
    var base = colorFor(teamId, qKey);
    var s = shadesFor(base);
    ref.base.setAttribute('fill', s.medium || base);
    ref.dark.setAttribute('fill', s.dark || base);
    ref.light.setAttribute('fill', s.light || base);
  }

  function paintAll() {
    var order = questionOrder();
    WINDOW_BOXES.forEach(function (box) {
      order.forEach(function (qKey) { paintPane(box.teamId, qKey); });
    });
  }

  function setData(next) {
    processed = next || window.__TEAM_PULSE_PROCESSED__ || null;
    paintAll();
  }

  function resetVisiblePanes() {
    Object.keys(paneRefs).forEach(function (key) {
      paneRefs[key].group.classList.remove('is-lit');
      paneRefs[key].group.style.opacity = '0';
    });
  }

  function resetReveal() {
    revealToken++;
    resetVisiblePanes();
    var stage = document.getElementById('stage');
    if (stage) stage.classList.remove('painted-glass-active', 'painted-glass-nearly', 'painted-glass-final');
  }

  function runReveal() {
    ensureOverlay();
    paintAll();
    var stage = document.getElementById('stage');
    if (!stage) return;

    var token = ++revealToken;
    resetVisiblePanes();
    stage.classList.add('painted-glass-active');
    stage.classList.remove('painted-glass-nearly', 'painted-glass-final');

    var order = questionOrder();
    var sequence = [];
    // Interleave teams by question so color travels across the facade.
    order.forEach(function (qKey, qi) {
      WINDOW_BOXES.forEach(function (box, ti) {
        sequence.push({ key: box.teamId + ':' + qKey, qi: qi, ti: ti });
      });
    });

    sequence.forEach(function (item, i) {
      var delay = 720 + i * 112 + ((item.qi * 31 + item.ti * 47) % 90);
      setTimeout(function () {
        if (token !== revealToken) return;
        var ref = paneRefs[item.key];
        if (!ref) return;
        ref.group.classList.add('is-lit');
        ref.group.style.opacity = '.90';
      }, delay);
    });

    setTimeout(function () {
      if (token === revealToken) stage.classList.add('painted-glass-nearly');
    }, 5200);
    setTimeout(function () {
      if (token === revealToken) stage.classList.add('painted-glass-final');
    }, 7600);
  }

  // Convert a native PSD point to screen percentage using the exact same
  // object-fit:cover + center-top transform as the painted PNG.
  function artPointToStagePct(x, y) {
    var stage = document.getElementById('stage');
    if (!stage) return { left: x / ART_W * 100, top: y / ART_H * 100 };
    var sw = stage.clientWidth || window.innerWidth;
    var sh = stage.clientHeight || window.innerHeight;
    var scale = Math.max(sw / ART_W, sh / ART_H);
    var rw = ART_W * scale;
    var offsetX = (sw - rw) / 2;
    var sx = offsetX + x * scale;
    var sy = y * scale; // object-position: center top
    return { left: sx / sw * 100, top: sy / sh * 100 };
  }

  function artWidthToStagePct(px) {
    var stage = document.getElementById('stage');
    if (!stage) return px / ART_W * 100;
    var sw = stage.clientWidth || window.innerWidth;
    var sh = stage.clientHeight || window.innerHeight;
    var scale = Math.max(sw / ART_W, sh / ART_H);
    return (px * scale / sw) * 100;
  }

  function pinHtmlOverlays() {
    var rose = artPointToStagePct(868.5, 299);
    var door = artPointToStagePct(864, 585);
    var roseWrap = document.getElementById('rose-words-wrap');
    var doorWrap = document.getElementById('door-result');

    if (roseWrap) {
      roseWrap.style.setProperty('left', rose.left + '%', 'important');
      roseWrap.style.setProperty('top', rose.top + '%', 'important');
      roseWrap.style.setProperty('width', Math.max(9, artWidthToStagePct(220)) + '%', 'important');
      roseWrap.style.setProperty('transform', 'translate(-50%,-50%)', 'important');
    }
    if (doorWrap) {
      doorWrap.style.setProperty('left', door.left + '%', 'important');
      doorWrap.style.setProperty('top', door.top + '%', 'important');
      doorWrap.style.setProperty('transform', 'translate(-50%,-50%)', 'important');
    }

    var labelY = 472;
    document.querySelectorAll('.grid-col-label').forEach(function (el, i) {
      var box = WINDOW_BOXES[i];
      if (!box) return;
      var p = artPointToStagePct(box.x + box.w / 2, labelY);
      el.style.setProperty('left', p.left + '%', 'important');
      el.style.setProperty('top', p.top + '%', 'important');
      el.style.setProperty('transform', 'translate(-50%,-100%)', 'important');
      el.style.setProperty('width', '82px', 'important');
    });
  }

  function bind() {
    var play = document.getElementById('btn-play');
    var replay = document.getElementById('btn-replay');
    if (play && !play._psdGlassBound) {
      play.addEventListener('click', runReveal);
      play._psdGlassBound = true;
    }
    if (replay && !replay._psdGlassBound) {
      replay.addEventListener('click', function () {
        resetReveal();
        setTimeout(runReveal, 220);
      });
      replay._psdGlassBound = true;
    }
  }

  function start() {
    ensureOverlay();
    bind();
    pinHtmlOverlays();
    if (window.__TEAM_PULSE_PROCESSED__) setData(window.__TEAM_PULSE_PROCESSED__);

    var labels = document.getElementById('grid-labels');
    if (labels && window.MutationObserver) {
      new MutationObserver(pinHtmlOverlays).observe(labels, { childList: true, subtree: true });
    }
    [350, 900, 1700, 2800].forEach(function (ms) {
      setTimeout(function () { ensureOverlay(); bind(); pinHtmlOverlays(); }, ms);
    });
  }

  window.addEventListener('team-pulse:data', function (e) { setData(e.detail); });
  window.addEventListener('resize', pinHtmlOverlays);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.PaintedLiveGlass = {
    setData: setData,
    runReveal: runReveal,
    reset: resetReveal,
    pin: pinHtmlOverlays
  };
})();