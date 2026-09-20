/**
 * DATA SOURCE LOADING
 * ---------------------------------------------------------------------------
 * Fetches survey rows from window.APP_CONFIG.dataSource.liveDataUrl (CSV or
 * JSON). Production mode never substitutes mock values for failed live data.
 * No credentials or API keys are ever used here — both supported endpoint
 * types are designed to be safely public/read-only.
 */
window.DataSource = (function () {
  'use strict';

  function withTimeout(promise, ms) {
    var timeoutId;
    var timeout = new Promise(function (_, reject) {
      timeoutId = setTimeout(function () { reject(new Error('Request timed out')); }, ms);
    });
    return Promise.race([promise, timeout]).finally(function () { clearTimeout(timeoutId); });
  }

  function parseCsv(text) {
    // Minimal RFC4180-ish CSV parser: handles quoted fields, commas, and
    // escaped quotes ("") within quotes. Good enough for Sheets CSV export.
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else {
          field += c;
        }
      } else {
        if (c === '"') { inQuotes = true; }
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\r') { /* skip */ }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else { field += c; }
      }
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

    var nonEmptyRows = rows.filter(function (r) { return r.some(function (v) { return v !== ''; }); });
    if (nonEmptyRows.length === 0) return [];
    var headers = nonEmptyRows[0];
    return nonEmptyRows.slice(1).map(function (r) {
      var obj = {};
      headers.forEach(function (h, idx) { obj[h] = r[idx] !== undefined ? r[idx] : ''; });
      return obj;
    });
  }

  function sniffFormat(text) {
    var trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
    return 'csv';
  }

  function extractRowsFromJson(json) {
    // Accepts either a bare array of row-objects, or { rows: [...] }.
    if (Array.isArray(json)) return json;
    if (json && Array.isArray(json.rows)) return json.rows;
    throw new Error('Unrecognized JSON shape from data endpoint');
  }

  /**
   * @returns {Promise<{rows: object[]|null, aggregated: object|null, source: 'live'|'mock', error: string|null}>}
   */
  function load() {
    var cfg = window.APP_CONFIG.dataSource;
    var forceMock = window.APP_CONFIG.mockData && window.APP_CONFIG.mockData.forceMock;

    if (forceMock || !cfg.liveDataUrl) {
      return Promise.resolve({
        rows: window.MOCK_SURVEY_ROWS || [],
        aggregated: null,
        source: 'mock',
        error: forceMock ? null : 'No live data URL configured (js/config.js -> dataSource.liveDataUrl).'
      });
    }

    // Always request a fresh Apps Script payload during the live event. The server
    // understands ?nocache=1; _ts also defeats intermediary/browser caches.
    var sep = cfg.liveDataUrl.indexOf('?') === -1 ? '?' : '&';
    var liveUrl = cfg.liveDataUrl + sep + 'nocache=1&_ts=' + Date.now();

    var fetchPromise = fetch(liveUrl, { method: 'GET', credentials: 'omit', cache: 'no-store' })
      .then(function (resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status + ' from data endpoint');
        return resp.text();
      })
      .then(function (text) {
        var fmt = cfg.format === 'auto' ? sniffFormat(text) : cfg.format;
        if (fmt === 'json') {
          var json = JSON.parse(text);
          // A privacy-preserving Apps Script endpoint returns pre-aggregated
          // team stats instead of individual rows (see README "Apps Script").
          if (json && json.aggregated === true) {
            return { rows: null, aggregated: json, source: 'live', error: null };
          }
          var rows = extractRowsFromJson(json);
          if (!rows || rows.length === 0) throw new Error('Live data endpoint returned zero rows');
          return { rows: rows, aggregated: null, source: 'live', error: null };
        }
        var csvRows = parseCsv(text);
        if (!csvRows || csvRows.length === 0) throw new Error('Live data endpoint returned zero rows');
        return { rows: csvRows, aggregated: null, source: 'live', error: null };
      });

    return withTimeout(fetchPromise, cfg.timeoutMs).catch(function (err) {
      // Never show believable fake survey results in the production event build.
      // Surface the failure so the presenter knows live data is unavailable.
      throw new Error('Live survey data unavailable: ' + err.message);
    });
  }

  return { load: load, parseCsv: parseCsv };
})();
