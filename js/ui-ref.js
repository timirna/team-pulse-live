(function () {
  if (window.APP_CONFIG && window.APP_CONFIG.svg) {
    window.APP_CONFIG.svg.displayViewBox = '20 10 1633 920';
  }

  function buildFocusPanel() {
    var el = document.getElementById('focus-panel');
    var cfg = window.APP_CONFIG;
    if (!el || !cfg) return;
    var icons = {
      q2: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>',
      q3: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v4H4zm0 6h10v2H4zm0 4h16v2H4zm0 4h10v2H4z"/></svg>',
      q4: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2zm0-4h-2v-4h2z"/></svg>',
      q5: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
      q6: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3a9 9 0 1 0 .001 18.001A9 9 0 0 0 12 3zm1 13h-2v-2h2zm0-4h-2V7h2z"/></svg>',
      q7: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 12c2.7 0 8 1.34 8 4v3H4v-3c0-2.66 5.3-4 8-4zm0-2a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>',
      q9: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.22 2.53C11.09 5.01 12.76 4 14.5 4 17 4 19 6 19 8.5c0 3.78-3.4 6.86-8.55 11.54z"/></svg>'
    };
    var order = cfg.scoredQuestionOrder || [];
    var cols = cfg.columns || {};
    el.innerHTML = '<div class="focus-title">Explore Focus Areas</div>';
    order.forEach(function (qKey) {
      var colDef = cols[qKey] || {};
      var btn = document.createElement('div');
      btn.className = 'focus-item';
      btn.innerHTML = '<span class="focus-icon">' + (icons[qKey] || '') + '</span><span class="focus-name">' + (colDef.shortLabel || qKey) + '</span>';
      el.appendChild(btn);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildFocusPanel);
  } else {
    buildFocusPanel();
  }
  setTimeout(buildFocusPanel, 800);
})();
