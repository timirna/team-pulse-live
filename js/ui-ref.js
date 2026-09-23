(function () {
  if (window.APP_CONFIG && window.APP_CONFIG.roseWindow) {
    window.APP_CONFIG.roseWindow.fixedWord = '';
    window.APP_CONFIG.roseWindow.maxWords = 1;
    window.APP_CONFIG.roseWindow.minFontPx = 20;
    window.APP_CONFIG.roseWindow.maxFontPx = 34;
  }

  var SHORT = {
    'Customer Service & HR': 'CS & HR',
    'Field Services': 'Field',
    'Sales & Marketing': 'Sales'
  };
  var ICONS = {
    q2: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20 2H4l-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>',
    q3: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 13h8V3H3zm10 8h8V3h-8zM3 21h8v-6H3z"/></svg>',
    q4: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2zm0-4h-2v-4h2z"/></svg>',
    q5: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3zM8 11c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-1 .1 1.2.9 2 2 2 3.4V19h7v-2.5c0-2.3-4.7-3.5-8-3.5z"/></svg>',
    q6: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 5h18v2H3zm0 6h18v2H3zm0 6h12v2H3z"/></svg>',
    q7: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>',
    q9: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.22 2.53C11.09 5.01 12.76 4 14.5 4 17 4 19 6 19 8.5c0 3.78-3.4 6.86-8.55 11.54z"/></svg>'
  };

  var ART_W = 1726;
  var ART_H = 911;
  var BASE = 'assets/layers/';
  var PARTS = [
    'house', 'ivy',
    'window_left_1', 'window_left_2',
    'window_right_1', 'window_right_2', 'window_right_3',
    'roof_left_large', 'roof_left_small', 'roof_right_large', 'roof_right_small',
    'rose', 'door',
    'porch_left', 'porch_right',
    'path_far_left', 'path_far_right', 'path_inner_left', 'path_inner_right'
  ];
  var WIN_FILES = ['window_left_1', 'window_left_2', 'window_right_1', 'window_right_2', 'window_right_3'];

  var layerBuilt = false;
  var raf = 0;

  function sizeFrame() {
    var el = document.getElementById('layer-stack');
    if (!el) return;
    var scale = Math.min(window.innerWidth / ART_W, window.innerHeight / ART_H);
    var w = Math.round(ART_W * scale);
    var h = Math.round(ART_H * scale);
    el.style.cssText = 'position:absolute;left:50%;top:50%;width:' + w + 'px;height:' + h + 'px;margin-left:-' + (w / 2) + 'px;margin-top:-' + (h / 2) + 'px;z-index:1;pointer-events:none;overflow:hidden;';
  }

  function showLevel(v) {
    var lit = document.getElementById('chapel-lit');
    if (!lit) return;
    lit.style.filter = 'brightness(' + (0.38 + 0.62 * (v / 100)) + ')';
  }

  function scoreColor(score) {
    if (window.ColorUtils && window.APP_CONFIG && ColorUtils.scoreToColor) {
      try { return ColorUtils.scoreToColor(score, window.APP_CONFIG); } catch (e) {}
    }
    var stops = [[1,'#E8342A'],[2,'#F2801C'],[3,'#F5D033'],[4,'#29B6E8'],[5,'#1E4FD6']];
    var s = Math.max(1, Math.min(5, Number(score) || 3));
    return stops[Math.round(s) - 1][1];
  }

  function teamScores() {
    var raw = window.LAST_PROCESSED || window.processedResult || window.__processed || null;
    var teams = (window.APP_CONFIG && window.APP_CONFIG.teams) || [];
    var out = teams.map(function () { return 3; });
    if (!raw) return out;
    teams.forEach(function (t, i) {
      var block = raw.teams && (raw.teams[t.id] || raw.teams[t.name] || raw.teams[i]);
      var avg = block && (block.average || block.avg || block.score);
      if (typeof avg === 'number') out[i] = avg;
    });
    return out;
  }

  function tintWindows() {
    var scores = teamScores();
    WIN_FILES.forEach(function (file, i) {
      var el = document.getElementById('tint-' + file);
      if (!el) return;
      el.style.background = scoreColor(scores[i]);
      el.style.webkitMaskImage = 'url(' + BASE + file + '_light.png)';
      el.style.maskImage = 'url(' + BASE + file + '_light.png)';
      el.style.webkitMaskSize = '100% 100%';
      el.style.maskSize = '100% 100%';
    });
  }

  function buildLayers() {
    if (layerBuilt) { sizeFrame(); return; }
    var stage = document.getElementById('stage');
    if (!stage) return;
    var probe = new Image();
    probe.onload = function () {
      document.body.classList.add('painted-bg');
      var wrap = document.getElementById('layer-stack');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'layer-stack';
        stage.insertBefore(wrap, stage.firstChild);
      }
      wrap.innerHTML = '';
      var bg = document.createElement('img');
      bg.src = BASE + '00_bg.png?v=preview2';
      bg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:fill;';
      wrap.appendChild(bg);
      var lit = document.createElement('div');
      lit.id = 'chapel-lit';
      lit.style.cssText = 'position:absolute;inset:0;filter:brightness(0.38);';
      PARTS.forEach(function (part) {
        var img = document.createElement('img');
        img.src = BASE + part + '_light.png?v=preview2';
        img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:fill;';
        lit.appendChild(img);
      });
      wrap.appendChild(lit);
      WIN_FILES.forEach(function (file) {
        var tint = document.createElement('div');
        tint.id = 'tint-' + file;
        tint.className = 'win-tint';
        wrap.appendChild(tint);
      });
      if (!document.getElementById('gold-glow')) {
        var glow = document.createElement('div');
        glow.id = 'gold-glow';
        stage.appendChild(glow);
      }
      var mount = document.getElementById('svg-mount');
      if (mount) mount.style.setProperty('display', 'none', 'important');
      layerBuilt = true;
      sizeFrame();
      pinPaintedOverlays();
      tintWindows();
    };
    probe.src = BASE + '00_bg.png?v=preview2';
  }

  function setLit(on) {
    cancelAnimationFrame(raf);
    if (!on) { showLevel(0); return; }
    tintWindows();
    var start = performance.now();
    function tick(now) {
      var t = Math.min(1, (now - start) / 8000);
      showLevel(100 * t * t * (3 - 2 * t));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
  }

  function pinPaintedOverlays() {
    var frame = document.getElementById('layer-stack');
    var wrap = document.getElementById('overlay-wrap');
    if (frame && wrap) {
      wrap.style.cssText = 'position:absolute;left:' + frame.style.left + ';top:' + frame.style.top + ';width:' + frame.style.width + ';height:' + frame.style.height + ';margin-left:' + frame.style.marginLeft + ';margin-top:' + frame.style.marginTop + ';z-index:20;pointer-events:none;';
    }
    var rose = document.getElementById('rose-words-wrap');
    if (rose) rose.style.cssText = 'position:absolute;left:50.1%;top:33.5%;transform:translate(-50%,-50%);width:16%;text-align:center;z-index:21;';
    var door = document.getElementById('door-result');
    if (door) door.style.cssText = 'position:absolute;left:50%;top:63.5%;transform:translate(-50%,-50%);z-index:21;text-align:center;';
    var xs = [29.2, 36.4, 61.0, 67.2, 73.4];
    document.querySelectorAll('.grid-col-label').forEach(function (el, i) {
      if (xs[i] == null) return;
      el.style.setProperty('left', xs[i] + '%', 'important');
      el.style.setProperty('top', '58%', 'important');
      el.style.setProperty('transform', 'translate(-50%,-100%)', 'important');
    });
  }

  function fillStage() {
    var stage = document.getElementById('stage');
    if (!stage) return;
    stage.style.width = '100vw';
    stage.style.height = '100vh';
    stage.style.background = '#061020';
  }

  function pinLabels() {
    document.querySelectorAll('.grid-col-label').forEach(function (el) {
      if (!el.querySelector('.grid-col-kicker')) {
        var k = document.createElement('span');
        k.className = 'grid-col-kicker';
        k.textContent = 'Team';
        el.insertBefore(k, el.firstChild);
      }
    });
    document.querySelectorAll('.grid-col-name').forEach(function (el) {
      var raw = (el.textContent || '').trim();
      if (SHORT[raw]) el.textContent = SHORT[raw];
    });
    pinPaintedOverlays();
  }

  function pinChrome() {
    fillStage();
    pinLabels();
    buildLayers();
    sizeFrame();
    pinPaintedOverlays();
    tintWindows();
  }

  function bindRevealChrome() {
    var stage = document.getElementById('stage');
    var play = document.getElementById('btn-play');
    var replay = document.getElementById('btn-replay');
    if (!stage) return;
    if (play && !play._taylerBound) {
      play.addEventListener('click', function () {
        stage.classList.add('revealing');
        setLit(true);
      });
      play._taylerBound = true;
    }
    if (replay && !replay._taylerBound) {
      replay.addEventListener('click', function () {
        stage.classList.remove('revealing');
        setLit(false);
        setTimeout(function () {
          stage.classList.add('revealing');
          setLit(true);
        }, 200);
      });
      replay._taylerBound = true;
    }
    if (play) play.disabled = false;
    if (replay) replay.disabled = false;
  }

  function buildFocusPanel() {
    var el = document.getElementById('focus-panel');
    var cfg = window.APP_CONFIG;
    if (!el || !cfg) return;
    el.innerHTML = '';
    (cfg.scoredQuestionOrder || []).forEach(function (qKey) {
      var colDef = (cfg.columns || {})[qKey] || {};
      var btn = document.createElement('div');
      btn.className = 'focus-item';
      btn.innerHTML = '<span class="focus-icon">' + (ICONS[qKey] || '') + '</span><span>' + (colDef.shortLabel || qKey) + '</span>';
      el.appendChild(btn);
    });
  }

  function start() {
    fillStage();
    buildFocusPanel();
    pinChrome();
    bindRevealChrome();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  [400, 1200, 2500, 5000].forEach(function (ms) {
    setTimeout(function () { pinChrome(); bindRevealChrome(); tintWindows(); }, ms);
  });
  var wrap = document.getElementById('grid-labels');
  if (wrap && window.MutationObserver) new MutationObserver(pinLabels).observe(wrap, { childList: true, subtree: true });
  window.addEventListener('resize', pinChrome);
})();
