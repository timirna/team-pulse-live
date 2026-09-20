/**
 * MOCK DATA
 * ---------------------------------------------------------------------------
 * Used automatically whenever the live data source is unreachable or unset.
 * Deterministically generated (seeded PRNG) so every reload looks the same.
 * A handful of deliberately malformed/blank rows are mixed in to exercise
 * the "malformed data doesn't crash the page" requirement.
 */
(function () {
  'use strict';

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var rng = mulberry32(777222);

  function randInt(min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
  function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }

  // Each team gets a bias so the demo shows visually distinct pane colors.
  // Names match js/config.js -> teams[*].name exactly (real names as of 2026-09-15).
  var teamProfiles = [
    { name: 'Sales and Marketing',                                  bias: 0.4,  responses: 14 },
    { name: 'Operations, Administration, Permitting and Compliance', bias: -0.3, responses: 18 },
    { name: 'Installation and Field Services',                      bias: 1.1,  responses: 11 },
    { name: 'Leadership & Corporate',                                bias: -1.2, responses: 16 },
    { name: 'Customer Service, Human Resources and Recruiting',      bias: 0.1,  responses: 13 }
  ];

  var wordBank = [
    'growth', 'chaotic', 'steady', 'exciting', 'exhausting', 'growth', 'collaborative',
    'steady', 'rewarding', 'stressful', 'growth', 'productive', 'uncertain', 'steady',
    'collaborative', 'growth', 'busy', 'rewarding', 'chaotic', 'productive', 'growth',
    'steady', 'hopeful', 'collaborative'
  ];

  function biasedScore(bias) {
    var base = 3 + bias + (rng() - 0.5) * 2.4;
    var v = Math.round(base);
    if (v < 1) v = 1;
    if (v > 5) v = 5;
    return v;
  }

  // Row keys come from js/config.js -> columns[*].heading (the REAL Sheet
  // headings as of 2026-09-14), so mock data always matches whatever the
  // current column mapping expects - no hardcoded heading strings to fall
  // out of sync when the real headings are corrected.
  var H = {};
  Object.keys(window.APP_CONFIG.columns).forEach(function (colId) {
    H[colId] = window.APP_CONFIG.columns[colId].heading;
  });

  function makeRow(fields) {
    var row = {};
    Object.keys(fields).forEach(function (colId) { row[H[colId]] = fields[colId]; });
    return row;
  }

  var rows = [];
  var day = 1;

  teamProfiles.forEach(function (team) {
    for (var i = 0; i < team.responses; i++) {
      rows.push(makeRow({
        timestamp: '2026-09-' + String(2 + (day++ % 12)).padStart(2, '0') + ' 0' + randInt(8, 9) + ':' + randInt(10, 59) + ':00',
        q1_team: team.name,
        q2: String(biasedScore(team.bias)),
        q3: String(biasedScore(team.bias)),
        q4: String(biasedScore(team.bias)),
        q5: String(biasedScore(team.bias * 0.6)),
        q6: String(biasedScore(team.bias)),
        q7: String(biasedScore(team.bias * 0.8)),
        q8_binary: String(biasedScore(team.bias)), // 1-5 scale; 4-5 counts as positive
        q9: String(biasedScore(team.bias)),
        q10_word: pick(wordBank)
      }));
    }
  });

  // Deliberately malformed / edge-case rows to prove the pipeline is robust.
  rows.push({}); // fully blank row
  rows.push(makeRow({
    timestamp: '2026-09-10 09:00:00',
    q1_team: '   ',
    q2: 'n/a',
    q3: '',
    q4: '7', // out of range
    q5: 'three',
    q6: '4',
    q7: '4',
    q8_binary: 'maybe',
    q9: '4',
    q10_word: '   '
  }));
  rows.push(makeRow({
    timestamp: '2026-09-11 10:00:00',
    q1_team: 'Sales and Marketing',
    q2: '5',
    q3: '5',
    q4: '5',
    q5: '5',
    q6: '5',
    q7: '5',
    q8_binary: '5',
    q9: '5',
    q10_word: 'Growth!!'
  }));

  window.MOCK_SURVEY_ROWS = rows;
})();
