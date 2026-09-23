/**
 * PSD-ALIGNED LIVE STAINED GLASS
 * ---------------------------------------------------------------------------
 * The visible artwork remains the approved painted chapel PNG. Coordinates
 * below were measured from Timir's separated 1726x911 PSD so live survey
 * colors land precisely on the five lower stained-glass windows.
 *
 * Each score colors one group of the painted window's existing facets. The
 * transparent tint changes hue while the painting supplies all shade and detail.
 */
(function () {
  'use strict';

  var ART_W = 1726;
  var ART_H = 911;

  // Main lower-glass interiors measured from the PSD, left -> right.
  var WINDOW_BOXES = [
    { teamId: 'team1', x: 434,  y: 493, w: 96, h: 179 }, // Sales & Marketing
    { teamId: 'team2', x: 573,  y: 493, w: 93, h: 179 }, // Operations
    { teamId: 'team3', x: 1073, y: 493, w: 72, h: 179 }, // Field Services
    { teamId: 'team4', x: 1160, y: 493, w: 74, h: 179 }, // Leadership
    { teamId: 'team5', x: 1248, y: 493, w: 74, h: 179 }  // Customer Service & HR
  ];

  // Coordinates are fractions of the glass interior. Edges follow the painted
  // pointed arch, central diamonds and lower diagonal lead seams. Each path is
  // inset from the frame; no tint rectangle crosses a lead line.
  var FACETS = [
    'M .50 .015 Q .25 .075 .025 .18 L .025 .35 L .26 .28 L .50 .15 Z',
    'M .50 .015 Q .75 .075 .975 .18 L .975 .35 L .74 .28 L .50 .15 Z',
    'M .025 .36 L .26 .29 L .49 .44 L .25 .57 L .025 .48 Z',
    'M .50 .16 L .73 .29 L .76 .49 L .50 .66 L .24 .49 L .27 .29 Z',
    'M .975 .36 L .74 .29 L .51 .44 L .75 .57 L .975 .48 Z',
    'M .025 .49 L .25 .58 L .49 .67 L .49 .985 L .025 .985 Z',
    'M .975 .49 L .75 .58 L .51 .67 L .51 .985 L .975 .985 Z'
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

  function makePane(box, qKey, facetIndex) {
    var g = ns('g');
    g.setAttribute('class', 'painted-data-pane');
    g.setAttribute('data-team', box.teamId);
    g.setAttribute('data-question', qKey);
    g.style.opacity = '0';

    var path = ns('path');
    path.setAttribute('d', FACETS[facetIndex]);
    path.setAttribute('transform', 'translate(' + box.x + ' ' + box.y + ') scale(' + box.w + ' ' + box.h + ')');
    path.setAttribute('class', 'painted-pane-facet');
    g.appendChild(path);

    paneRefs[box.teamId + ':' + qKey] = { group: g, path: path };
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

    var order = questionOrder();
    WINDOW_BOXES.forEach(function (box) {
      var teamGroup = ns('g');
      teamGroup.setAttribute('class', 'painted-team-overlay');
      teamGroup.setAttribute('data-team', box.teamId);
      order.forEach(function (qKey, i) {
        teamGroup.appendChild(makePane(box, qKey, i));
      });
      overlaySvg.appendChild(teamGroup);
    });

    // Put score tint above the bright painting (z=1) but below all HTML UI (z=8).
    stage.insertBefore(overlaySvg, document.getElementById('vignette'));
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
    ref.path.setAttribute('fill', base);
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

