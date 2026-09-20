/**
 * PRIVACY-PRESERVING AGGREGATION ENDPOINT
 * ---------------------------------------------------------------------------
 * Paste this whole file into Extensions > Apps Script on the response Sheet
 * ("Let's Build the House (Responses)"), then Deploy > New deployment > Web
 * app (Execute as: Me, Who has access: Anyone with the link).
 *
 * This script NEVER returns individual rows, timestamps, or free-text
 * answers beyond word counts. It only returns:
 *   - per-team AVERAGES of the 7 scored questions
 *   - the overall Q8 positive PERCENTAGE
 *   - a ranked list of the most common Q10 words with COUNTS
 * A team with fewer than MIN_RESPONSES_PER_TEAM responses is withheld
 * (averages come back as null) so a single person's answers in a small team
 * are never individually identifiable from the output.
 *
 * Responses are cached (CacheService) for CACHE_TTL_SECONDS so repeat
 * requests return quickly instead of recomputing from the Sheet every time.
 *
 * IMPORTANT if you're updating an already-deployed script with this version:
 * saving code here does NOT change what the live /exec URL runs. Go to
 * Deploy > Manage deployments > click the pencil/edit icon on the existing
 * deployment > Version: "New version" > Deploy. That updates the SAME URL in
 * place - no need to change dataSource.liveDataUrl in js/config.js again.
 *
 * Column layout (fixed, matches the real form as of 2026-09-14):
 *   A Timestamp | B Team (Q1) | C Q2 | D Q3 | E Q4 | F Q5 | G Q6 | H Q7
 *   | I Q8 (1-5 scale) | J Q9 | K Q10 (one word)
 */

var SHEET_GID = 763640286;
var MIN_RESPONSES_PER_TEAM = 3; // raise/lower for your privacy comfort level

var COL = { TIMESTAMP: 0, TEAM: 1, Q2: 2, Q3: 3, Q4: 4, Q5: 5, Q6: 6, Q7: 7, Q8: 8, Q9: 9, Q10: 10 };
var SCORED_COLS = ['Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q9'];

// Q8 is a 1-5 linear scale (1 = Not very, 5 = Very much), confirmed
// 2026-09-15. A response >= this threshold counts as "positive" for the door
// percentage. Keep in sync with q8PositiveThreshold in js/config.js.
var Q8_POSITIVE_THRESHOLD = 4;

var STOP_WORDS = ['the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'it', 'is', 'this', 'that', 'n/a', 'na', 'none', 'test', 'testing', ''];
var MAX_WORDS = 8;

// CACHING: Apps Script web apps have real cold-start latency (measured
// 10-30s on this deployment). CacheService.getScriptCache() stores the last
// computed payload for CACHE_TTL_SECONDS so repeat requests return near-
// instantly instead of recomputing from the Sheet every time. Lower this (or
// call the URL with ?nocache=1) if results ever feel too stale during
// active testing - 60s is a reasonable balance for a live survey dashboard.
var CACHE_KEY = 'aggregated_payload_v1';
var CACHE_TTL_SECONDS = 60;

function doGet(e) {
  var cache = CacheService.getScriptCache();
  var bypassCache = e && e.parameter && e.parameter.nocache === '1';

  if (!bypassCache) {
    var cached = cache.get(CACHE_KEY);
    if (cached) {
      return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
    }
  }

  var json = computeAggregatedPayload();
  // Cache even on error responses briefly-ish would hide a real problem, so
  // only cache successful payloads (no `error` key).
  if (json.indexOf('"error"') === -1) {
    try { cache.put(CACHE_KEY, json, CACHE_TTL_SECONDS); } catch (e2) { /* cache write is best-effort */ }
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function computeAggregatedPayload() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()
      .filter(function (s) { return s.getSheetId() === SHEET_GID; })[0];
    if (!sheet) throw new Error('Sheet with gid ' + SHEET_GID + ' not found');

    var values = sheet.getDataRange().getValues();
    var dataRows = values.slice(1); // drop header row

    var teamBuckets = {}; // teamName -> { count, sums: {Q2..}, counts: {Q2..}, q8Yes, q8Total }
    var wordCounts = {};
    var q8YesTotal = 0, q8Total = 0;
    var usedRows = 0;

    dataRows.forEach(function (row) {
      var isBlank = row.every(function (v) { return String(v).trim() === ''; });
      if (isBlank) return;

      var team = String(row[COL.TEAM] || '').trim();
      if (!team) return;
      usedRows++;

      if (!teamBuckets[team]) {
        teamBuckets[team] = { count: 0, sums: {}, counts: {} };
        SCORED_COLS.forEach(function (k) { teamBuckets[team].sums[k] = 0; teamBuckets[team].counts[k] = 0; });
      }
      teamBuckets[team].count++;

      SCORED_COLS.forEach(function (k) {
        var raw = row[COL[k]];
        var n = Math.round(Number(raw));
        if (isFinite(n) && n >= 1 && n <= 5) {
          teamBuckets[team].sums[k] += n;
          teamBuckets[team].counts[k] += 1;
        }
      });

      var q8n = Math.round(Number(row[COL.Q8]));
      if (isFinite(q8n) && q8n >= 1 && q8n <= 5) {
        q8Total++;
        if (q8n >= Q8_POSITIVE_THRESHOLD) q8YesTotal++;
      }

      var word = String(row[COL.Q10] || '').trim().toLowerCase().replace(/[^a-z0-9' -]/g, '');
      if (word && STOP_WORDS.indexOf(word) === -1) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });

    var teams = Object.keys(teamBuckets).map(function (name) {
      var b = teamBuckets[name];
      var averages = null;
      if (b.count >= MIN_RESPONSES_PER_TEAM) {
        averages = {};
        SCORED_COLS.forEach(function (k) {
          var key = k.toLowerCase();
          averages[key] = b.counts[k] > 0 ? (b.sums[k] / b.counts[k]) : null;
        });
      }
      return { name: name, responseCount: b.count, averages: averages };
    });

    var q10Ranked = Object.keys(wordCounts)
      .map(function (w) { return { word: w, count: wordCounts[w] }; })
      .sort(function (a, b) { return b.count - a.count || a.word.localeCompare(b.word); })
      .slice(0, MAX_WORDS);

    var payload = {
      aggregated: true,
      generatedAt: new Date().toISOString(),
      totalRows: dataRows.length,
      usedRows: usedRows,
      q8Percentage: q8Total > 0 ? Math.round((q8YesTotal / q8Total) * 100) : 0,
      q8Total: q8Total,
      q10Ranked: q10Ranked,
      teams: teams
    };

    return JSON.stringify(payload);
  } catch (err) {
    return JSON.stringify({ aggregated: true, error: String(err) });
  }
}
