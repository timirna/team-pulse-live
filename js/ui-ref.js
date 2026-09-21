(function () {
  if (window.APP_CONFIG && window.APP_CONFIG.roseWindow) {
    window.APP_CONFIG.roseWindow.fixedWord = '';
    window.APP_CONFIG.roseWindow.maxWords = 1;
    window.APP_CONFIG.roseWindow.minFontPx = 16;
    window.APP_CONFIG.roseWindow.maxFontPx = 22;
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

  var IMG_CSS = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;pointer-events:none;';

  function ensureImg(id, z) {
    var stage = document.getElementById('stage');
    var el = document.getElementById(id);
    if (!el && stage) {
      el = document.createElement('img');
      el.id = id;
      el.alt = '';
      stage.insertBefore(el, stage.firstChild);
    }
    if (el) el.style.cssText = IMG_CSS + 'z-index:' + z + ';transition:opacity 1.6s ease;';
    return el;
  }

  function applyPainted(brightUrl) {
    document.body.classList.add('painted-bg');
    var darkUrl = new URL('assets/painted-house-dark.png', location.href).href;
    var dark = ensureImg('painted-house-dark', 0);
    var bright = ensureImg('painted-house-img', 1);
    if (dark) { dark.src = darkUrl + '?v=dark1'; dark.style.opacity = '1'; }
    if (bright) {
      bright.src = brightUrl;
      bright.style.opacity = document.querySelector('#stage.revealing') ? '1' : '0';
    }
    var mount = document.getElementById('svg-mount');
    if (mount) mount.style.setProperty('display', 'none', 'important');
    var vig = document.getElementById('vignette');
    if (vig) vig.style.setProperty('display', 'none', 'important');
    pinPaintedOverlays();
    var play = document.getElementById('btn-play');
    if (play) play.disabled = false;
  }

  function pinPaintedOverlays() {
    if (!document.body.classList.contains('painted-bg')) return;
    var hero = document.querySelector('.scorecard-hero');
    if (hero) { hero.style.top = '0.4%'; hero.style.width = '70%'; }
    var wrap = document.getElementById('overlay-wrap');
    if (wrap) wrap.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:8;pointer-events:none;';
    var rose = document.getElementById('rose-words-wrap');
    if (rose) rose.style.cssText = 'position:absolute;left:50%;top:32%;transform:translate(-50%,-50%);width:14%;text-align:center;z-index:9;';
    var door = document.getElementById('door-result');
    if (door) door.style.cssText = 'position:absolute;left:50%;top:64%;transform:translate(-50%,-50%);z-index:9;text-align:center;color:#fff;font-weight:800;font-size:28px;text-shadow:0 2px 8px #000;';
    var xs = [29.2, 36.4, 61.0, 67.2, 73.4];
    document.querySelectorAll('.grid-col-label').forEach(function (el, i) {
      if (xs[i] == null) return;
      el.style.setProperty('left', xs[i] + '%', 'important');
      el.style.setProperty('top', '58%', 'important');
      el.style.setProperty('transform', 'translate(-50%,-100%)', 'important');
      el.style.setProperty('width', '70px', 'important');
    });
  }

  function setLit(on) {
    var bright = document.getElementById('painted-house-img');
    if (bright) bright.style.opacity = on ? '1' : '0';
  }

  function enablePaintedIfPresent() {
    if (/[?&]painted=0\b/.test(location.search)) return;
    var abs = new URL('assets/painted-house.png', location.href).href;
    var img = new Image();
    img.onload = function () { applyPainted(abs); };
    img.src = abs + '?v=paint22';
  }

  function fillStage() {
    var stage = document.getElementById('stage');
    if (!stage) return;
    stage.style.width = '100vw';
    stage.style.height = '100vh';
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
    enablePaintedIfPresent();
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
        setTimeout(function () { stage.classList.add('revealing'); setLit(true); }, 200);
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
  [400, 1200, 2500].forEach(function (ms) {
    setTimeout(function () { pinChrome(); bindRevealChrome(); }, ms);
  });
  var wrap = document.getElementById('grid-labels');
  if (wrap && window.MutationObserver) new MutationObserver(pinLabels).observe(wrap, { childList: true, subtree: true });
  window.addEventListener('resize', pinChrome);
})();
