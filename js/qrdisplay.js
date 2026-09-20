/**
 * QR CODE DISPLAY
 * ---------------------------------------------------------------------------
 * Renders a QR code for the PUBLIC responder URL only (never the /edit link).
 * Uses the small vendored qrcode-generator library (js/vendor/qrcode.js,
 * MIT licensed, no external dependency at runtime).
 */
window.QrDisplay = (function () {
  'use strict';

  function render(containerEl, config) {
    var cfg = config.qrCode;
    containerEl.classList.toggle('hidden', !cfg.visible);
    if (!cfg.visible) return;

    if (typeof window.qrcode !== 'function') {
      containerEl.innerHTML = '<div class="qr-fallback">QR library unavailable.<br>Link: ' + cfg.url + '</div>';
      console.warn('[QrDisplay] vendored qrcode-generator not found; showing text fallback.');
      return;
    }

    try {
      // High correction tolerates glare, screen photography, and partial occlusion.
      var qr = window.qrcode(0, 'H');
      qr.addData(cfg.url);
      qr.make();
      var cellSize = Math.max(2, Math.floor(cfg.size / qr.getModuleCount()));
      containerEl.innerHTML = qr.createSvgTag({ cellSize: cellSize, margin: 4, scalable: true, title: 'Survey QR code', alt: 'Scan to take the survey' });
      var svg = containerEl.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', String(cfg.size));
        svg.setAttribute('height', String(cfg.size));
      }
    } catch (err) {
      console.warn('[QrDisplay] QR generation failed:', err.message);
      containerEl.innerHTML = '<div class="qr-fallback">Scan not available.<br>Link: ' + cfg.url + '</div>';
    }

    containerEl.classList.remove('pos-bottom-left', 'pos-top-right', 'pos-top-left', 'pos-bottom-right');
    containerEl.classList.add('pos-' + cfg.position);
    function openSurvey() { window.open(cfg.url, '_blank', 'noopener'); }
    containerEl.onclick = openSurvey;
    containerEl.onkeydown = function (event) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openSurvey(); }
    };
  }

  function setVisible(containerEl, visible) {
    containerEl.classList.toggle('hidden', !visible);
  }

  return { render: render, setVisible: setVisible };
})();
