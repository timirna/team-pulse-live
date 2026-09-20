/**
 * DATA PROCESSING
 * ---------------------------------------------------------------------------
 * Normalizes raw Sheet rows (object per row, keyed by column heading) into
 * the shape the animation/rendering layer needs:
 *   - per-team average for each of the 7 scored questions (35 numbers)
 *   - overall Q8 positive percentage
 *   - ranked Q10 words for the rose window
 *
 * Pure functions only; no DOM access.
 */
window.DataProcessing = (function () {
  'use strict';

  function normalizeHeading(h) {
    return String(h || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function normalizeValue(v) {
    return String(v === undefined || v === null ? '' : v).trim();
  }

  /**
   * Builds a lookup from normalized-configured-heading -> actual heading found
   * in the raw rows, so small differences in whitespace/case don't break
   * matching. Falls back to exact key match if no header match is found.
   */
  function buildHeadingResolver(rows, columnsCfg) {
    var actualHeadings = new Set();
    rows.forEach(function (r) { Object.keys(r).forEach(function (k) { actualHeadings.add(k); }); });
    var normalizedToActual = {};
    actualHeadings.forEach(function (h) { normalizedToActual[normalizeHeading(h)] = h; });

    var resolved = {};
    Object.keys(columnsCfg).forEach(function (colId) {
      var wanted = normalizeHeading(columnsCfg[colId].heading);
      resolved[colId] = normalizedToActual[wanted] || null;
    });
    return resolved;
  }

  function toScore1to5(raw) {
    var v = normalizeValue(raw);
    if (v === '') return null;
    var n = Number(v);
    if (!isFinite(n)) return null;
    n = Math.round(n);
    if (n < 1 || n > 5) return null; // out-of-range / malformed -> ignored
    return n;
  }

  function isRowBlank(row) {
    return Object.keys(row).length === 0 || Object.values(row).every(function (v) { return normalizeValue(v) === ''; });
  }

  // Q8 is a 1-5 linear scale (1 = Not very, 5 = Very much). A response counts
  // as "positive" if it's a valid whole number >= config.q8PositiveThreshold.
  // Malformed/out-of-range/blank values are excluded from the percentage
  // entirely (not counted as negative), same treatment as the scored panes.
  function isPositiveQ8(raw, positiveThreshold) {
    var n = toScore1to5(raw);
    if (n === null) return null;
    return n >= positiveThreshold;
  }

  /**
   * @param {object[]} rawRows
   * @param {object} config window.APP_CONFIG
   * @returns {{
   *   teamAverages: Record<teamId, Record<qKey, number|null>>,
   *   teamResponseCounts: Record<teamId, number>,
   *   q8Percentage: number,
   *   q8Total: number,
   *   q10Ranked: {word: string, count: number}[],
   *   totalRows: number,
   *   usedRows: number,
   *   unmatchedTeamNames: string[],
   *   missingColumns: string[]
   * }}
   */
  function process(rawRows, config) {
    var columnsCfg = config.columns;
    var teams = config.teams;
    var scoredOrder = config.scoredQuestionOrder;

    var headingMap = buildHeadingResolver(rawRows, columnsCfg);
    var missingColumns = Object.keys(columnsCfg).filter(function (c) { return !headingMap[c]; });

    var teamByNormalizedName = {};
    teams.forEach(function (t) { teamByNormalizedName[normalizeHeading(t.name)] = t; });

    // sums[teamId][qKey] = { sum, count }
    var sums = {};
    teams.forEach(function (t) {
      sums[t.id] = {};
      scoredOrder.forEach(function (q) { sums[t.id][q] = { sum: 0, count: 0 }; });
    });

    var q8Yes = 0, q8Total = 0;
    var wordCounts = {};
    var usedRows = 0;
    var unmatchedTeamNamesSet = new Set();

    rawRows.forEach(function (row) {
      if (!row || isRowBlank(row)) return;

      var teamNameRaw = headingMap.q1_team ? row[headingMap.q1_team] : '';
      var teamName = normalizeValue(teamNameRaw);
      if (teamName === '') return; // no team identified -> can't attribute this row

      var team = teamByNormalizedName[normalizeHeading(teamName)];
      if (!team) { unmatchedTeamNamesSet.add(teamName); return; }

      usedRows++;

      scoredOrder.forEach(function (qKey) {
        var colId = qKey === 'q9' ? 'q9' : qKey;
        var heading = headingMap[colId];
        if (!heading) return;
        var score = toScore1to5(row[heading]);
        if (score !== null) {
          sums[team.id][qKey].sum += score;
          sums[team.id][qKey].count += 1;
        }
      });

      if (headingMap.q8_binary) {
        var positive = isPositiveQ8(row[headingMap.q8_binary], config.q8PositiveThreshold);
        if (positive !== null) {
          q8Total++;
          if (positive) q8Yes++;
        }
      }

      if (headingMap.q10_word) {
        var word = normalizeValue(row[headingMap.q10_word])
          .toLowerCase()
          .replace(/[^a-z0-9' -]/g, ''); // strip stray punctuation like "Growth!!"
        if (word && config.roseWindow.stopWords.indexOf(word) === -1) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      }
    });

    var teamAverages = {};
    teams.forEach(function (t) {
      teamAverages[t.id] = {};
      scoredOrder.forEach(function (q) {
        var s = sums[t.id][q];
        teamAverages[t.id][q] = s.count > 0 ? (s.sum / s.count) : null;
      });
    });

    var teamResponseCounts = {};
    teams.forEach(function (t) {
      var counts = scoredOrder.map(function (q) { return sums[t.id][q].count; });
      teamResponseCounts[t.id] = Math.max.apply(null, counts.concat([0]));
    });

    var q10Ranked = Object.keys(wordCounts)
      .map(function (w) { return { word: w, count: wordCounts[w] }; })
      .sort(function (a, b) { return b.count - a.count || a.word.localeCompare(b.word); })
      .slice(0, config.roseWindow.maxWords);

    return {
      teamAverages: teamAverages,
      teamResponseCounts: teamResponseCounts,
      q8Percentage: q8Total > 0 ? Math.round((q8Yes / q8Total) * 100) : 0,
      q8Total: q8Total,
      q10Ranked: q10Ranked,
      totalRows: rawRows.length,
      usedRows: usedRows,
      unmatchedTeamNames: Array.from(unmatchedTeamNamesSet),
      missingColumns: missingColumns
    };
  }

  /**
   * Converts the pre-aggregated JSON shape returned by the privacy-preserving
   * Apps Script endpoint (team-level rollups only, no individual responses)
   * into the exact same shape process() produces, so the animation layer
   * doesn't need to know or care which path the data came from.
   *
   * Expected server shape:
   * {
   *   aggregated: true, generatedAt, totalRows, usedRows,
   *   q8Percentage, q8Total, q10Ranked: [{word,count}],
   *   teams: [{ name, responseCount, averages: {q2..q7,q9} }],
   *   missingColumns?: string[]
   * }
   */
  function fromAggregated(json, config) {
    var teams = config.teams;
    var scoredOrder = config.scoredQuestionOrder;
    var teamByNormalizedName = {};
    teams.forEach(function (t) { teamByNormalizedName[normalizeHeading(t.name)] = t; });

    var teamAverages = {};
    var teamResponseCounts = {};
    teams.forEach(function (t) {
      teamAverages[t.id] = {};
      scoredOrder.forEach(function (q) { teamAverages[t.id][q] = null; });
      teamResponseCounts[t.id] = 0;
    });

    var unmatchedTeamNamesSet = new Set();
    (json.teams || []).forEach(function (entry) {
      var team = teamByNormalizedName[normalizeHeading(entry.name)];
      if (!team) { unmatchedTeamNamesSet.add(normalizeValue(entry.name)); return; }
      scoredOrder.forEach(function (q) {
        var v = entry.averages ? entry.averages[q] : null;
        teamAverages[team.id][q] = (typeof v === 'number' && isFinite(v)) ? v : null;
      });
      teamResponseCounts[team.id] = entry.responseCount || 0;
    });

    var q10Ranked = (json.q10Ranked || [])
      .filter(function (item) { return item && item.word && config.roseWindow.stopWords.indexOf(item.word.toLowerCase()) === -1; })
      .slice(0, config.roseWindow.maxWords);

    return {
      teamAverages: teamAverages,
      teamResponseCounts: teamResponseCounts,
      q8Percentage: typeof json.q8Percentage === 'number' ? json.q8Percentage : 0,
      q8Total: json.q8Total || 0,
      q10Ranked: q10Ranked,
      totalRows: json.totalRows || 0,
      usedRows: json.usedRows || 0,
      unmatchedTeamNames: Array.from(unmatchedTeamNamesSet),
      missingColumns: json.missingColumns || []
    };
  }

  return {
    process: process,
    fromAggregated: fromAggregated,
    _internal: { normalizeHeading: normalizeHeading, toScore1to5: toScore1to5, isRowBlank: isRowBlank }
  };
})();
