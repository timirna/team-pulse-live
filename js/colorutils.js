/**
 * COLOR UTILITIES
 * ---------------------------------------------------------------------------
 * Maps a 1-5 (possibly fractional, averaged) score to the configurable
 * multi-stop stained-glass spectrum in window.APP_CONFIG.scorePalette.stops,
 * and generates dark/medium/light tonal variants of a base color for the
 * faceted per-pane shading (client feedback, 2026-09-15).
 */
window.ColorUtils = (function () {
  'use strict';

  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var num = parseInt(h, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      var s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return s.length === 1 ? '0' + s : s;
    }).join('');
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
  }

  function hexToHsl(hex) {
    var rgb = hexToRgb(hex);
    return rgbToHsl(rgb.r, rgb.g, rgb.b);
  }

  function hslToHex(h, s, l) {
    var rgb = hslToRgb(((h % 360) + 360) % 360, Math.max(0, Math.min(100, s)), Math.max(0, Math.min(100, l)));
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  function clamp01to5(score) { return Math.max(1, Math.min(5, score)); }

  // Same relative-luminance formula used elsewhere in this project
  // (js/paneMapping.js's lead-line detection) - standard perceived-
  // brightness weighting, NOT a simple average of R/G/B.
  function relativeLuminanceRgb(r, g, b) {
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  /**
   * Raises a color's lightness (hue/saturation unchanged) until its
   * perceived luminance reaches targetLum, or gives up at L=95 to avoid
   * blowing out to white. HSL "lightness" does not correspond to perceived
   * brightness uniformly across hues - blue/purple/red read noticeably
   * darker than yellow/green at the identical L value. Used to make the
   * whole 7-hue spectrum feel comparably "lit" rather than brightening
   * every hue by the same fixed amount (which would either barely help the
   * dark hues or wash out the already-bright ones).
   */
  function liftToLuminance(hex, targetLum) {
    var hsl = hexToHsl(hex);
    var rgb = hexToRgb(hex);
    if (relativeLuminanceRgb(rgb.r, rgb.g, rgb.b) >= targetLum) return hex;
    var l = hsl.l;
    for (var i = 0; i < 50 && l < 95; i++) {
      l += 1.5;
      var candidate = hslToHex(hsl.h, hsl.s, l);
      var cRgb = hexToRgb(candidate);
      if (relativeLuminanceRgb(cRgb.r, cRgb.g, cRgb.b) >= targetLum) return candidate;
    }
    return hslToHex(hsl.h, hsl.s, l);
  }

  /**
   * Ensures BOTH a minimum saturation AND a minimum perceived luminance -
   * i.e. genuinely "lit and vivid" rather than just brighter. This matters
   * because "lighter + less saturated" is literally the formula for pastel:
   * raising lightness alone (as liftToLuminance does) is correct for
   * matching perceived brightness across hues, but doing that WITHOUT also
   * protecting saturation is what was reading as washed-out/muted rather
   * than "rich jewel tone." Saturation is raised first (at the original
   * lightness), then lightness is raised at that higher saturation until
   * the luminance target is met - so bright results stay saturated instead
   * of drifting toward white.
   */
  function vividLift(hex, minSat, targetLum) {
    var hsl = hexToHsl(hex);
    var s = Math.max(hsl.s, minSat);
    var l = hsl.l;
    var rgb = hexToRgb(hslToHex(hsl.h, s, l));
    if (relativeLuminanceRgb(rgb.r, rgb.g, rgb.b) < targetLum) {
      for (var i = 0; i < 60 && l < 92; i++) {
        l += 1.2;
        var candidate = hslToHex(hsl.h, s, l);
        var cRgb = hexToRgb(candidate);
        if (relativeLuminanceRgb(cRgb.r, cRgb.g, cRgb.b) >= targetLum) break;
      }
    }
    return hslToHex(hsl.h, s, l);
  }

  function getStops(config) {
    return (config.scorePalette && config.scorePalette.stops) || [];
  }

  /**
   * @param {number} score 1..5 (fractional allowed for averages)
   * @param {object} config window.APP_CONFIG
   * @returns {string} hex color, interpolated across config.scorePalette.stops
   */
  function scoreToColor(score, config) {
    if (score === null || score === undefined || isNaN(score)) return '#555555';
    var stops = getStops(config);
    if (!stops.length) return '#555555';
    var clamped = clamp01to5(score);

    if (config.colorMode === 'nearest') {
      var nearest = stops[0];
      var bestDist = Math.abs(stops[0].at - clamped);
      for (var i = 1; i < stops.length; i++) {
        var d = Math.abs(stops[i].at - clamped);
        if (d < bestDist) { bestDist = d; nearest = stops[i]; }
      }
      return nearest.color;
    }

    // 'interpolate' (default): find the two bracketing stops and blend.
    for (var j = 0; j < stops.length - 1; j++) {
      var a = stops[j], b = stops[j + 1];
      if (clamped >= a.at && clamped <= b.at) {
        var span = b.at - a.at;
        var t = span > 0 ? (clamped - a.at) / span : 0;
        var c1 = hexToRgb(a.color), c2 = hexToRgb(b.color);
        return rgbToHex(lerp(c1.r, c2.r, t), lerp(c1.g, c2.g, t), lerp(c1.b, c2.b, t));
      }
    }
    // Outside all stops (shouldn't happen given clamping, but be safe).
    return clamped <= stops[0].at ? stops[0].color : stops[stops.length - 1].color;
  }

  // Client feedback, 2026-09-15 (round 4): the round-3 shading read as
  // "too muted/pastel" compared to the reference, using the rose window's
  // own filter treatment (#ROSE_GLASS.lit-strong -> brightness(1.4)
  // saturate(1.35)) as the luminosity target. Root cause of the pastel
  // look: the round-3 "light" facet REDUCED saturation while raising
  // lightness - lighter + less saturated is literally the pastel formula.
  // Fixed by giving every tier a SATURATION FLOOR as well as a luminance
  // target (vividLift(), above) - brighter now means "more like a gem
  // catching light" (stays saturated) rather than "washed toward white."
  // Still nothing upstream changed: same 7-stop spectrum, same pane/tier
  // assignment, same scoreToColor(). Deltas between tiers are still tight
  // (dark/medium/light stay one clearly related family, not neon extremes).
  var MIN_SATURATION = 66;        // floor for medium/light - keeps colors "gem", not pastel
  var MIN_SATURATION_DARK = 70;   // shadow facets read richer when a touch more saturated
  var DARK_LUM_TARGET = 0.27;
  var MEDIUM_LUM_TARGET = 0.47;   // up from 0.40 - closer to the rose window's lit brightness
  var LIGHT_LUM_TARGET = 0.63;

  /**
   * Generates [dark, medium, light] tonal variants of a base color for the
   * faceted stained-glass look, all within the same hue family and all
   * meeting a minimum saturation so none of the three ever reads pastel.
   * @param {string} baseHex
   * @returns {{dark:string, medium:string, light:string}}
   */
  function shadeVariants(baseHex) {
    var medium = vividLift(baseHex, MIN_SATURATION, MEDIUM_LUM_TARGET);
    var mHsl = hexToHsl(medium);

    var dark = vividLift(
      hslToHex(mHsl.h, mHsl.s, Math.max(16, mHsl.l - 10)),
      MIN_SATURATION_DARK, DARK_LUM_TARGET
    );
    var light = vividLift(
      hslToHex(mHsl.h, mHsl.s, Math.min(88, mHsl.l + 14)),
      MIN_SATURATION, LIGHT_LUM_TARGET
    );

    return { dark: dark, medium: medium, light: light };
  }

  return {
    hexToRgb: hexToRgb, rgbToHex: rgbToHex,
    hexToHsl: hexToHsl, hslToHex: hslToHex,
    scoreToColor: scoreToColor, shadeVariants: shadeVariants
  };
})();
