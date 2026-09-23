/**
 * APP BOOTSTRAP
 * ---------------------------------------------------------------------------
 * Wires configuration, data loading/processing, SVG loading/mapping, audio,
 * QR code, and the animation sequence together. Keeps orchestration only -
 * real logic lives in the dedicated modules loaded before this file.
 */
(function () {
  'use strict';

  var config = window.APP_CONFIG;

  // Developer-only debug toggle: add ?debug=1 to the URL. Never surfaced in
  // the presentation UI itself.
  if (/[?&]debug=1\b/.test(location.search)) {
    config.svg.debugLabels = true;
  }

  // The stage's aspect-ratio must exactly match whichever viewBox is
  // actually displayed (full or cropped) or the SVG will letterbox inside
  // it, which would throw off every percent-based position calculation
  // (door %, rose words, pane overlays, finale effects all assume the SVG
  // fills its box edge-to-edge with no empty bars). Deriving this from
  // config here means the two can never drift out of sync.
  (function applyStageAspectRatio() {
    var vb = config.svg.displayViewBox || config.svg.viewBox;
    var parts = vb.split(/\s+/).map(Number);
    var stageEl = document.getElementById('stage');
    if (stageEl && parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      stageEl.style.aspectRatio = parts[2] + ' / ' + parts[3];
    }
  })();

  var dom = {
    mount: document.getElementById('svg-mount'),
    overlayWrap: document.getElementById('overlay-wrap'),
    doorResultWrap: document.getElementById('door-result'),
    doorResultText: document.getElementById('door-result-value'),
    doorResultSr: document.getElementById('door-result-sr'),
    roseWordsWrap: document.getElementById('rose-words-wrap'),
    roseWords: document.getElementById('rose-words'),
    qrContainer: document.getElementById('qr-container'),
    flashOverlay: document.getElementById('flash-overlay'),
    sunburstRays: document.getElementById('sunburst-rays'),
    particleContainer: document.getElementById('particle-container'),
    playBtn: document.getElementById('btn-play'),
    replayBtn: document.getElementById('btn-replay'),
    muteBtn: document.getElementById('btn-mute'),
    loadingEl: document.getElementById('loading-state'),
    statusEl: document.getElementById('status-line'),
    dataSourceEl: document.getElementById('data-source-status'),
    errorEl: document.getElementById('error-message'),
    mockWarningEl: document.getElementById('mock-warning'),
    mappingWarningEl: document.getElementById('mapping-warning')
  };

  function setLoading(isLoading, message) {
    if (!dom.loadingEl) return;
    dom.loadingEl.classList.toggle('hidden', !isLoading);
    if (message) dom.loadingEl.querySelector('.loading-text').textContent = message;
  }

  // Client feedback, 2026-09-15 round 4: "absolutely none of this may
  // appear in the audience-facing UI... keep diagnostic information in the
  // browser console only... do NOT remove the fallback logic itself." All
  // of the functions below still compute/store the exact same text they
  // always did (the mock-data fallback, missing-column/team-name
  // mismatches, load errors are all still fully detected and handled
  // exactly as before) - every one now also logs to the console, and
  // css/styles.css hides their container elements (#data-source-status,
  // #mock-warning, #mapping-warning, #error-message) from the visible page
  // unconditionally, so nothing about the underlying fallback/detection
  // logic changed, only what an audience sees.
  function showError(message) {
    console.error('[main]', message);
    if (!dom.errorEl) return;
    dom.errorEl.textContent = message;
    dom.errorEl.classList.remove('hidden');
  }

  function setDataSourceStatus(sourceInfo, processed) {
    if (!dom.dataSourceEl) return;
    var label = sourceInfo.source === 'live' ? 'Live Google Sheet data' : 'Mock data';
    var detail = sourceInfo.source === 'live'
      ? processed.usedRows + ' of ' + processed.totalRows + ' rows used'
      : (sourceInfo.error || 'No live data source configured');
    console.info('[main] Data source:', label + ' — ' + detail);
    dom.dataSourceEl.textContent = label + ' — ' + detail;
    dom.dataSourceEl.classList.toggle('is-live', sourceInfo.source === 'live');
    dom.dataSourceEl.classList.toggle('is-mock', sourceInfo.source === 'mock');

    if (sourceInfo.source === 'mock') {
      var mockMsg = 'Showing mock data. ' + (sourceInfo.error || '') +
        ' Configure js/config.js -> dataSource.liveDataUrl to use real responses (see README.md).';
      console.warn('[main]', mockMsg);
      dom.mockWarningEl.classList.remove('hidden');
      dom.mockWarningEl.textContent = mockMsg;
    } else {
      dom.mockWarningEl.classList.add('hidden');
    }

    if (processed.missingColumns.length) {
      console.warn('[main] Columns not found in the data (check headings in js/config.js):', processed.missingColumns);
    }
    if (processed.unmatchedTeamNames.length) {
      console.warn('[main] Q1 team names found in data with no matching team in js/config.js:', processed.unmatchedTeamNames);
    }

    // Still computed and logged to console for a developer checking before
    // a live show; the container itself is hidden from the visible page
    // (css/styles.css), so this never reaches the audience.
    if (dom.mappingWarningEl) {
      var problems = [];
      if (processed.missingColumns.length) {
        problems.push('Column heading(s) not found in the data: ' + processed.missingColumns.join(', ') + '.');
      }
      if (processed.unmatchedTeamNames.length) {
        problems.push('Team name(s) in the data with no match in config: "' + processed.unmatchedTeamNames.join('", "') + '".');
      }
      if (problems.length) {
        var mappingMsg = '⚠ Data mapping issue — ' + problems.join(' ') + ' Check js/config.js.';
        console.warn('[main]', mappingMsg);
        dom.mappingWarningEl.textContent = mappingMsg;
        dom.mappingWarningEl.classList.remove('hidden');
      } else {
        dom.mappingWarningEl.classList.add('hidden');
      }
    }
  }

  function setStatus(text) {
    if (dom.statusEl) dom.statusEl.textContent = text;
  }

  // Client feedback, 2026-09-15 ("data needs to be interpretable, not just
  // decorative... this is the most important piece"): the continuous
  // gradient bar from the previous round read as decorative, not a legend -
  // no way to look at a pane and name its score. Replaced with a discrete
  // "SCORE COLOR GUIDE" panel matching the client's own original mockup
  // (5 swatches, "N - description" labels). Each swatch color comes from
  // ColorUtils.scoreToColor(1..5, config) - the EXACT same function that
  // colors every pane - so the guide and the panes can never show a
  // different color for the same score.
  function renderScoreColorGuide() {
    var el = document.getElementById('score-color-guide');
    if (!el || !window.ColorUtils) return;
    el.innerHTML = '';

    var title = document.createElement('div');
    title.className = 'guide-title';
    title.textContent = 'SCORE COLOR GUIDE';
    el.appendChild(title);

    var labels = config.scoreGuideLabels || {};
    for (var score = 1; score <= 5; score++) {
      var row = document.createElement('div');
      row.className = 'guide-row';

      var swatch = document.createElement('span');
      swatch.className = 'guide-swatch';
      swatch.style.background = window.ColorUtils.scoreToColor(score, config);
      row.appendChild(swatch);

      var text = document.createElement('span');
      text.className = 'guide-text';
      var desc = labels[score];
      text.textContent = desc ? (score + ' — ' + desc) : String(score);
      row.appendChild(text);

      el.appendChild(row);
    }
  }

  // Client feedback, 2026-09-15 round 9 (highest priority): the team/question
  // key CANNOT live in a panel below the house - a presenter would have to
  // look at the house, look down, then cross-reference mid-presentation.
  // The client's mockup labels them directly ON the grid: question names as
  // column headers across the top, department names as row headers down the
  // left side.
  //
  // This house is that same grid TRANSPOSED: each of the 5 windows is one
  // TEAM (so team labels are the column headers, one above each window),
  // and the 7 horizontal bands inside every window are the 7 QUESTIONS in
  // the same order (so question labels are the row headers, one per band,
  // down the left edge - they only need to appear once because every window
  // shares the identical band order).
  //
  // All positions come from the real SVG geometry (getBBox()/getCTM(), the
  // same technique used everywhere else here), so labels stay aligned to
  // the actual glass at any viewport/crop rather than being hand-placed.
  function renderGridLabels(svgRoot, config) {
    var wrap = document.getElementById('grid-labels');
    if (!wrap) return;
    wrap.innerHTML = '';

    var rootRect = svgRoot.getBoundingClientRect();
    if (!rootRect.width || !rootRect.height) return;

    function rectOf(el) {
      var bbox = el.getBBox();
      var ctm = el.getCTM();
      if (!ctm) return null;
      var p = function (x, y) {
        var pt = svgRoot.createSVGPoint();
        pt.x = x; pt.y = y;
        return pt.matrixTransform(ctm);
      };
      var tl = p(bbox.x, bbox.y);
      var br = p(bbox.x + bbox.width, bbox.y + bbox.height);
      return {
        leftPct: (tl.x / rootRect.width) * 100,
        rightPct: (br.x / rootRect.width) * 100,
        topPct: (tl.y / rootRect.height) * 100,
        bottomPct: (br.y / rootRect.height) * 100
      };
    }

    // --- Column headers: one team name above each window -----------------
    var firstRect = null;
    config.teams.forEach(function (team) {
      var winEl = svgRoot.querySelector('#' + CSS.escape(team.svgGroup));
      if (!winEl) return;
      var r = rectOf(winEl);
      if (!r) return;
      if (!firstRect) firstRect = r;

      var label = document.createElement('div');
      label.className = 'grid-col-label';
      label.style.left = ((r.leftPct + r.rightPct) / 2) + '%';
      label.style.top = r.topPct + '%';
      label.style.width = (r.rightPct - r.leftPct) + '%';
      var kicker = document.createElement('span');
      kicker.className = 'grid-col-kicker';
      kicker.textContent = 'Team';
      var name = document.createElement('span');
      name.className = 'grid-col-name';
      name.textContent = team.shortName || team.name;
      label.appendChild(kicker);
      label.appendChild(name);
      label.title = team.name;
      wrap.appendChild(label);
    });

    // --- Row headers: one question name per band, down the left edge -----
    // Bands are equal slices of the window's height, matching exactly how
    // js/paneMapping.js assigns glass fragments to question bands.
    if (!firstRect) return;
    var order = config.scoredQuestionOrder || [];
    var bandHeightPct = (firstRect.bottomPct - firstRect.topPct) / order.length;

    order.forEach(function (qKey, i) {
      var colDef = config.columns[qKey] || config.columns[qKey + '_word'];
      var text = (colDef && colDef.shortLabel) || qKey;

      var label = document.createElement('div');
      label.className = 'grid-row-label';
      label.style.right = (100 - firstRect.leftPct) + '%';
      label.style.top = (firstRect.topPct + bandHeightPct * (i + 0.5)) + '%';
      label.textContent = text;
      wrap.appendChild(label);
    });
  }

  // Place the two side references from the measured house silhouette, rather
  // than a guessed percentage. This keeps both panels wholly on the bare
  // background at every rendered size.
  function positionSidePanels(svgRoot) {
    var stage = document.getElementById('stage');
    var qrStand = document.getElementById('qr-stand');
    var guide = document.getElementById('score-color-guide');
    if (!stage || !svgRoot || !qrStand || !guide) return;

    var stageRect = stage.getBoundingClientRect();
    var ids = ['A3_03_HOUSE_STATIC', 'A3_04_UPPER_WINDOWS', 'A3_05_DATA_WINDOWS_LEFT',
      'A3_06_DATA_WINDOWS_RIGHT', 'A3_07_DOOR', 'A3_08_ROSE_WINDOW', 'A3_09_PORCH_LIGHTS',
      'A3_11_STEPS'];
    var rects = ids.map(function (id) { var el = svgRoot.querySelector('#' + CSS.escape(id)); return el && el.getBoundingClientRect(); }).filter(Boolean);
    if (!rects.length || !stageRect.width) return;

    var houseLeft = Math.min.apply(null, rects.map(function (r) { return r.left; }));
    var houseRight = Math.max.apply(null, rects.map(function (r) { return r.right; }));
    var gap = Math.max(8, stageRect.width * 0.006);
    var leftWidth = Math.max(0, houseLeft - stageRect.left - gap);
    var rightWidth = Math.max(0, stageRect.right - houseRight - gap);

    qrStand.style.left = '0px';
    qrStand.style.width = leftWidth + 'px';
    qrStand.style.bottom = Math.max(8, stageRect.height * 0.01) + 'px';
    guide.style.right = '0px';
    guide.style.width = rightWidth + 'px';
  }

  async function boot() {
    renderScoreColorGuide();
    setLoading(true, 'Loading illustration…');

    var svgResult;
    try {
      svgResult = await window.SvgLoader.loadInline(config.svg.path, dom.mount, config);
    } catch (err) {
      setLoading(false);
      showError('Could not load the house illustration (' + err.message + '). Check assets/svg/vect-animation-ready.svg exists.');
      return;
    }

    if (svgResult.missingRequired.length) {
      showError('The artwork is missing required groups: ' + svgResult.missingRequired.join(', ') +
        '. The page will still run, but some sections may be blank.');
    }

    var svgRoot = svgResult.svgEl;

    setLoading(true, 'Mapping data panes…');
    var mapping = window.PaneMapping.buildMapping(svgRoot, config);
    mapping.warnings.forEach(function (w) { console.warn('[PaneMapping]', w); });
    window.PaneMapping.createOverlays(mapping.teamPanes);
    window.PaneMapping.renderDebugLabels(svgRoot, mapping.teamPanes, config);
    renderGridLabels(svgRoot, config);
    positionSidePanels(svgRoot);
    window.addEventListener('resize', function () { positionSidePanels(svgRoot); });

    // Cinematic lighting (window/door glow spill, atmospheric haze, vignette)
    // - positioned from the same real geometry as everything else. Purely
    // additive visual layer; never touches pane colors.
    var cinematicRefs = window.CinematicLighting
      ? window.CinematicLighting.setup(svgRoot, dom.overlayWrap, config)
      : null;
    var vignetteEl = document.getElementById('vignette');
    if (vignetteEl) {
      vignetteEl.style.setProperty('--vignette-opacity', String(config.cinematicLighting.vignetteOpacity));
    }

    setLoading(true, 'Loading survey data…');
    var sourceInfo = await window.DataSource.load();
    var processed = sourceInfo.aggregated
      ? window.DataProcessing.fromAggregated(sourceInfo.aggregated, config)
      : window.DataProcessing.process(sourceInfo.rows, config);
    setDataSourceStatus(sourceInfo, processed);
    window.__TEAM_PULSE_PROCESSED__ = processed;
    window.dispatchEvent(new CustomEvent('team-pulse:data', { detail: processed }));

    // Keep the presentation synchronized with new Form submissions while it
    // remains open between class responses. RevealAnimation keeps a reference
    // to this object, so replacing its properties updates the next reveal
    // without rebuilding or reloading the page. Never replace good live data
    // with mock/fallback values.
    function refreshLiveData() {
      return window.DataSource.load().then(function (freshInfo) {
        var fresh = freshInfo.aggregated
          ? window.DataProcessing.fromAggregated(freshInfo.aggregated, config)
          : window.DataProcessing.process(freshInfo.rows, config);
        Object.keys(processed).forEach(function (k) { delete processed[k]; });
        Object.keys(fresh).forEach(function (k) { processed[k] = fresh[k]; });
        setDataSourceStatus(freshInfo, processed);
        window.__TEAM_PULSE_PROCESSED__ = processed;
        window.dispatchEvent(new CustomEvent('team-pulse:data', { detail: processed }));
        console.info('[main] Live survey data refreshed at', new Date().toISOString());
        return processed;
      }).catch(function (err) {
        // Keep the last confirmed live snapshot on transient network failure.
        console.error('[main] Live refresh failed; retaining last confirmed live data:', err);
        return processed;
      });
    }
    var liveRefreshTimer = setInterval(refreshLiveData, 10000);
    window.addEventListener('beforeunload', function () { clearInterval(liveRefreshTimer); });

    window.AudioManager.init(config);
    window.QrDisplay.render(dom.qrContainer, config);

    // Client feedback, 2026-09-15 round 9 - second half of the "no glow
    // burst / it just fades" root cause: this used to read the OS-level
    // "reduce motion" setting, which also compresses the whole reveal to
    // 15% speed (js/animation.js -> timeScale). On a machine with that
    // accessibility setting on (a common default on macOS and managed
    // laptops) the reveal silently became a fast, effect-less colour
    // change - exactly what the client kept reporting while it verified as
    // working here. This is a presentation piece whose entire purpose is a
    // deliberate, presenter-triggered ~10s reveal, so it no longer
    // downgrades itself based on that setting. Anyone who does want the
    // calmer version can still force it with ?motion=reduced.
    var prefersReducedMotion = false;
    if (/[?&]motion=reduced\b/.test(location.search)) prefersReducedMotion = true;

    var revealAnim = window.RevealAnimation.create({
      svgRoot: svgRoot,
      teamPanes: mapping.teamPanes,
      processed: processed,
      config: config,
      dom: dom,
      cinematic: cinematicRefs,
      prefersReducedMotion: prefersReducedMotion,
      onStatus: setStatus
    });
    revealAnim.resetVisualState();

    setLoading(false);

    dom.playBtn.disabled = false;
    dom.replayBtn.disabled = false;

    function setRevealControlsBusy(busy) {
      dom.playBtn.disabled = !!busy;
      dom.replayBtn.disabled = !!busy;
    }

    dom.playBtn.addEventListener('click', function () {
      if (window.AudioManager && window.AudioManager.startFromGesture) window.AudioManager.startFromGesture();
      setRevealControlsBusy(true);
      Promise.resolve(revealAnim.play()).finally(function () { setRevealControlsBusy(false); });
    });

    dom.replayBtn.addEventListener('click', function () {
      if (window.AudioManager && window.AudioManager.startFromGesture) window.AudioManager.startFromGesture();
      setRevealControlsBusy(true);
      Promise.resolve(revealAnim.replay()).finally(function () { setRevealControlsBusy(false); });
    });

    if (dom.muteBtn) {
      dom.muteBtn.addEventListener('click', function () {
        var next = !window.AudioManager.isMuted();
        window.AudioManager.setMuted(next);
        dom.muteBtn.textContent = next ? '🔇 Sound off' : '🔊 Sound on';
        dom.muteBtn.setAttribute('aria-pressed', String(next));
      });
    }

    window.addEventListener('resize', function () {
      // Overlay positions are percentage-based off the viewBox, so no
      // recompute is needed - this listener exists only in case a future
      // hook wants per-breakpoint behavior.
    });

    setStatus('Click "Play Reveal" to begin.');
  }

  boot().catch(function (err) {
    console.error('[main] Fatal boot error:', err);
    setLoading(false);
    showError('Something went wrong loading the presentation (' + err.message + '). Please reload the page.');
  });
})();
