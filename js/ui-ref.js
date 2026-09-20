(function () {
  if (window.APP_CONFIG && window.APP_CONFIG.svg) {
    window.APP_CONFIG.svg.displayViewBox = '20 10 1633 920';
  }

  function pinChrome() {
    var qr = document.getElementById('qr-stand');
    var guide = document.getElementById('score-color-guide');
    if (qr) { qr.style.left = ''; qr.style.width = ''; qr.style.bottom = ''; }
    if (guide) { guide.style.right = ''; guide.style.width = ''; }
    document.querySelectorAll('.grid-col-kicker').forEach(function (el) { el.remove(); });
    var board = document.querySelector('.qr-stand-board');
    if (board && !board.querySelector('.qr-stand-tagline')) {
      var t = document.createElement('div');
      t.className = 'qr-stand-tagline';
      t.textContent = 'Your feedback builds a stronger tomorrow.';
      board.appendChild(t);
    }
  }

  function buildFocusPanel() {
    var el = document.getElementById('focus-panel');
    var cfg = window.APP_CONFIG;
    if (!el || !cfg) return;
    var order = cfg.scoredQuestionOrder || [];
    var cols = cfg.columns || {};
    el.innerHTML = '';
    order.forEach(function (qKey) {
      var colDef = cols[qKey] || {};
      var btn = document.createElement('div');
      btn.className = 'focus-item';
      btn.textContent = colDef.shortLabel || qKey;
      el.appendChild(btn);
    });
    pinChrome();
  }

  function start() { buildFocusPanel(); pinChrome(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  [400, 1200, 2500].forEach(function (ms) { setTimeout(start, ms); });
  window.addEventListener('resize', pinChrome);
})();
