/**
 * SVG LOADER
 * ---------------------------------------------------------------------------
 * Loads the artwork INLINE (fetch + inject markup) so JavaScript/CSS can
 * reach into its internal groups by id. Never uses an <img> tag for this.
 * Validates every required/optional hook id and reports warnings without
 * crashing when something is missing.
 */
window.SvgLoader = (function () {
  'use strict';

  /**
   * @param {string} url
   * @param {HTMLElement} mountEl element to inject the <svg> into
   * @param {object} config window.APP_CONFIG
   * @returns {Promise<{svgEl: SVGSVGElement, warnings: string[], missingRequired: string[]}>}
   */
  function loadInline(url, mountEl, config) {
    return fetch(url, { credentials: 'omit' })
      .then(function (resp) {
        if (!resp.ok) throw new Error('Failed to fetch SVG (HTTP ' + resp.status + ')');
        return resp.text();
      })
      .then(function (svgText) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(svgText, 'image/svg+xml');
        var parserError = doc.querySelector('parsererror');
        if (parserError) throw new Error('SVG failed to parse: ' + parserError.textContent.slice(0, 200));

        var svgEl = doc.documentElement;

        // Validate against the TRUE source viewBox first - this is the real,
        // unmodified illustration and this check never changes.
        if (config.svg.viewBox && svgEl.getAttribute('viewBox') !== config.svg.viewBox) {
          console.warn('[SvgLoader] SVG viewBox differs from expected config value. Found:', svgEl.getAttribute('viewBox'));
        }

        // Optional runtime DISPLAY crop (client feedback, 2026-09-15): shows
        // the house larger/closer by presenting a cropped sub-region of the
        // same artwork. This only changes the viewBox attribute on the
        // in-memory DOM copy injected into the page - the source .svg file
        // on disk, and every original shape/path inside it, is completely
        // untouched. Every position calculation elsewhere (door %, rose
        // words, pane overlays, finale effects) reads live geometry via
        // getBBox()/getCTM() against whatever viewBox is active, so they all
        // automatically stay correctly aligned after this crop with no
        // changes needed on their end.
        if (config.svg.displayViewBox) {
          svgEl.setAttribute('viewBox', config.svg.displayViewBox);
        }
        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
        svgEl.setAttribute('id', 'house-illustration');

        mountEl.innerHTML = '';
        mountEl.appendChild(svgEl);

        var warnings = [];
        var missingRequired = [];

        config.requiredGroupIds.forEach(function (id) {
          if (!svgEl.querySelector('#' + CSS.escape(id))) {
            missingRequired.push(id);
            warnings.push('Missing REQUIRED group: #' + id);
          }
        });

        config.optionalHookIds.forEach(function (id) {
          if (!svgEl.querySelector('#' + CSS.escape(id))) {
            warnings.push('Missing optional animation hook: #' + id + ' (that effect will be skipped).');
          }
        });

        warnings.forEach(function (w) { console.warn('[SvgLoader]', w); });

        return { svgEl: svgEl, warnings: warnings, missingRequired: missingRequired };
      });
  }

  return { loadInline: loadInline };
})();
