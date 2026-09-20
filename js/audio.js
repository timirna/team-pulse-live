/**
 * AUDIO — reveal-synchronised mix only.
 * Playback starts from the existing Play/Replay user gesture. Visual timing is
 * untouched; animation.js calls the final cues from existing reveal events.
 */
window.AudioManager = (function () {
  'use strict';

  var elements = {};
  var ready = false;
  var muted = false;
  var fadeTimer = null;
  var restoreTimer = null;
  var cfg = null;

  function trackVolume(key) {
    var volumes = (cfg && cfg.audio && cfg.audio.volumes) || {};
    if (typeof volumes[key] === 'number') return volumes[key];
    return (cfg && cfg.audio && typeof cfg.audio.volume === 'number') ? cfg.audio.volume : 0.8;
  }

  function init(config) {
    cfg = config;
    if (!config.audio.enabled) return;
    Object.keys(config.audio.files).forEach(function (key) {
      var audio = new Audio(config.audio.files[key]);
      audio.preload = 'auto';
      audio.playsInline = true;
      // Keep the background bed playing continuously after the user starts
      // the experience. SFX remain one-shot.
      audio.loop = (key === 'background');
      audio.volume = trackVolume(key);
      try { audio.load(); } catch (e) { /* browser may defer until gesture */ }
      audio.addEventListener('error', function () {
        console.warn('[AudioManager] Audio asset failed to load:', config.audio.files[key]);
      });
      elements[key] = audio;
    });
    ready = true;
  }

  function clearTimers() {
    if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
    if (restoreTimer) { clearTimeout(restoreTimer); restoreTimer = null; }
  }

  function safePlay(audio, key) {
    if (!audio || muted) return;
    try {
      var p = audio.play();
      if (p && p.catch) p.catch(function (err) {
        console.warn('[AudioManager] Playback blocked/failed for "' + key + '":', err.message);
      });
    } catch (err) {
      console.warn('[AudioManager] Playback error for "' + key + '":', err.message);
    }
  }

  function stopElement(audio) {
    if (!audio) return;
    try { audio.pause(); audio.currentTime = 0; } catch (e) { /* noop */ }
  }

  function stopAll() {
    clearTimers();
    Object.keys(elements).forEach(function (k) { stopElement(elements[k]); });
    if (elements.background) elements.background.volume = trackVolume('background');
  }

  function setMuted(v) {
    muted = !!v;
    Object.keys(elements).forEach(function (k) { elements[k].muted = muted; });
    if (muted) stopAll();
  }

  function isMuted() { return muted; }

  /* Called directly by the existing Play/Replay click before delayed SFX. */
  function unlock() {
    if (!ready || muted) return;
    ['finalReveal', 'sparkle'].forEach(function (key) {
      var audio = elements[key];
      if (!audio) return;
      try {
        audio.muted = true;
        audio.currentTime = 0;
        var p = audio.play();
        if (p && p.then) {
          p.then(function () {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = muted;
          }).catch(function () { audio.muted = muted; });
        }
      } catch (e) { audio.muted = muted; }
    });
  }

  /*
   * Start the music bed inside the actual Play/Replay click event.
   * This is intentionally separate from the async reveal sequence: Safari,
   * Chrome and embedded browsers are most reliable when Audio.play() is
   * invoked directly from the user's gesture.
   */
  function startFromGesture() {
    if (!ready || muted) return;
    clearTimers();

    var bg = elements.background;
    if (bg) {
      try {
        bg.pause();
        bg.currentTime = 0;
        bg.muted = false;
        bg.volume = trackVolume('background');
        var playPromise = bg.play();
        if (playPromise && playPromise.catch) {
          playPromise.catch(function (err) {
            console.warn('[AudioManager] Background music could not start:', err.message);
          });
        }
      } catch (err) {
        console.warn('[AudioManager] Background music error:', err.message);
      }
    }

    // Prime delayed SFX while we still have the user's gesture.
    unlock();
  }

  function startReveal() {
    if (!ready || muted) return;
    var bg = elements.background;
    if (!bg) return;

    // Normally startFromGesture() has already started the bed. Keep this as
    // a fallback for programmatic starts, but never restart a playing track.
    if (bg.paused) {
      bg.currentTime = 0;
      bg.muted = false;
      bg.volume = trackVolume('background');
      safePlay(bg, 'background');
    }
  }

  function playFinalReveal() {
    if (!ready || muted) return;
    var bg = elements.background;
    var sfx = elements.finalReveal;
    if (bg) bg.volume = (cfg.audio.duckVolume != null ? cfg.audio.duckVolume : 0.24);
    if (!sfx) return;
    stopElement(sfx);
    sfx.volume = trackVolume('finalReveal');
    safePlay(sfx, 'finalReveal');
  }

  function playSparkle() {
    if (!ready || muted) return;
    var sfx = elements.sparkle;
    if (!sfx) return;
    stopElement(sfx);
    sfx.volume = trackVolume('sparkle');
    safePlay(sfx, 'sparkle');
  }

  function restoreBackgroundLevel(delayMs) {
    if (!ready || muted || !elements.background) return;
    if (restoreTimer) clearTimeout(restoreTimer);
    restoreTimer = setTimeout(function () {
      restoreTimer = null;
      if (!muted && elements.background) elements.background.volume = trackVolume('background');
    }, Math.max(0, delayMs || 0));
  }

  function fadeOutBackground(duration) {
    if (!ready || !elements.background) return;
    if (fadeTimer) clearInterval(fadeTimer);
    var bg = elements.background;
    var startVolume = bg.volume;
    var steps = 20;
    var interval = Math.max(20, (duration || 1800) / steps);
    var step = 0;
    fadeTimer = setInterval(function () {
      step += 1;
      bg.volume = Math.max(0, startVolume * (1 - step / steps));
      if (step >= steps) {
        clearInterval(fadeTimer);
        fadeTimer = null;
        bg.pause();
        bg.currentTime = 0;
        bg.volume = trackVolume('background');
      }
    }, interval);
  }

  return {
    init: init,
    unlock: unlock,
    startFromGesture: startFromGesture,
    startReveal: startReveal,
    playFinalReveal: playFinalReveal,
    playSparkle: playSparkle,
    restoreBackgroundLevel: restoreBackgroundLevel,
    fadeOutBackground: fadeOutBackground,
    stopAll: stopAll,
    setMuted: setMuted,
    isMuted: isMuted
  };
})();
