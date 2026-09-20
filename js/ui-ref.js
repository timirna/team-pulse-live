(function () {
  if (window.APP_CONFIG && window.APP_CONFIG.svg) {
    window.APP_CONFIG.svg.displayViewBox = '0 0 1673.05 940.56';
  }

  function fillStage() {
    var stage = document.getElementById('stage');
    if (!stage) return;
    stage.style.aspectRatio = 'auto';
    stage.style.width = '100vw';
    stage.style.height = '100vh';
    stage.style.maxWidth = 'none';
  }

  function pinChrome() {
    fillStage();
    var qr = document.getElementById('qr-stand');
    var guide = document.getElementById('score-color-guide');
    if (qr) { qr.style.left = ''; qr.style.width = ''; qr.style.bottom = ''; }
    if (guide) { guide.style.right = ''; guide.style.width = ''; }
    document.querySelectorAll('.grid-col-kicker').forEach(function (el) { el.remove(); });
    document.querySelectorAll('.grid-col-label').forEach(function (el) {
      el.style.width = '';
      el.style.maxWidth = '18%';
      el.style.whiteSpace = 'normal';
    });
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

  function start() { fillStage(); buildFocusPanel(); pinChrome(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  [200, 800, 1600, 2800].forEach(function (ms) { setTimeout(start, ms); });
  window.addEventListener('resize', function () { fillStage(); pinChrome(); });
})();
