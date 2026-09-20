(function () {
  if (window.APP_CONFIG && window.APP_CONFIG.svg) {
    window.APP_CONFIG.svg.displayViewBox = '0 0 1673.05 940.56';
  }
  if (window.APP_CONFIG && window.APP_CONFIG.roseWindow) {
    window.APP_CONFIG.roseWindow.fixedWord = '';
    window.APP_CONFIG.roseWindow.maxWords = 6;
  }
  var SHORT = { 'Customer Service & HR': 'CS & HR' };
  var ICONS = {
    q2: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20 2H4l-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>',
    q3: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 13h8V3H3zm10 8h8V3h-8zM3 21h8v-6H3z"/></svg>',
    q4: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2zm0-4h-2v-4h2z"/></svg>',
    q5: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3zM8 11c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-1 .1 1.2.9 2 2 2 3.4V19h7v-2.5c0-2.3-4.7-3.5-8-3.5z"/></svg>',
    q6: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 5h18v2H3zm0 6h18v2H3zm0 6h12v2H3z"/></svg>',
    q7: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>',
    q9: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.22 2.53C11.09 5.01 12.76 4 14.5 4 17 4 19 6 19 8.5c0 3.78-3.4 6.86-8.55 11.54z"/></svg>'
  };
  function fillStage() {
    var stage = document.getElementById('stage');
    if (!stage) return;
    stage.style.aspectRatio = 'auto';
    stage.style.width = '100vw';
    stage.style.height = '100vh';
  }
  function pinChrome() {
    fillStage();
    var qr = document.getElementById('qr-stand');
    var guide = document.getElementById('score-color-guide');
    if (qr) { qr.style.left = ''; qr.style.width = ''; qr.style.bottom = ''; }
    if (guide) { guide.style.right = ''; guide.style.width = ''; }
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
    pinChrome();
  }
  function start() { fillStage(); buildFocusPanel(); pinChrome(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  [200, 900, 1800].forEach(function (ms) { setTimeout(start, ms); });
  window.addEventListener('resize', function () { fillStage(); pinChrome(); });
})();
