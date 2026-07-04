// Free accounts don't get a usage breakdown page at all, so there is nothing
// authoritative to read for most of the range. This version does two honest things:
//
// 1. HEURISTIC (labeled as an estimate, never claimed as exact): counts messages
//    you send and decays them out of a rolling window (default 5 hours, matching
//    Anthropic's documented session window), giving a directional mood.
// 2. REAL SIGNAL: watches the page for the actual "usage limit reached" message
//    Claude shows you when you truly hit the wall, and snaps Sparkit to asleep
//    using the real reset text from that banner — this part is not a guess.
//
// A manual slider is always available and always wins over both of the above.

(function () {
  var WINDOW_MS = 5 * 60 * 60 * 1000; // Anthropic's documented rolling session window
  var DEFAULT_CAP = 20; // rough guess of messages per window on free tier; adjustable in popup
  var sparkitAPI = null;
  var bannerObserver = null;

  function findComposerAnchor() {
    var editable = document.querySelector('div[contenteditable="true"]');
    if (!editable) return null;
    return editable.closest('div[class*="composer" i]') || editable.parentElement;
  }

  function injectMascot() {
    if (document.getElementById('sparkit-container')) return;
    var anchor = findComposerAnchor();
    if (!anchor || !anchor.parentElement) return;

    var container = document.createElement('div');
    container.id = 'sparkit-container';
    anchor.parentElement.insertBefore(container, anchor);
    sparkitAPI = window.Sparkit.mount(container);

    chrome.storage.local.get(['pct', 'manual'], function (data) {
      if (typeof data.pct === 'number') sparkitAPI.setUsage(data.pct);
      if (data.manual) showManualFallback(container, data.pct);
    });

    recomputeHeuristic();
  }

  function showManualFallback(container, currentPct) {
    if (document.getElementById('sparkit-fallback')) return;
    var row = document.createElement('div');
    row.id = 'sparkit-fallback';
    row.className = 'sparkit-fallback';
    var startVal = typeof currentPct === 'number' ? currentPct : 75;
    row.innerHTML =
      '<label>usage left (manual)</label>' +
      '<input type="range" min="0" max="100" value="' + startVal + '" step="1">' +
      '<span>' + startVal + '%</span>';
    container.appendChild(row);
    var input = row.querySelector('input');
    var out = row.querySelector('span');
    input.addEventListener('input', function () {
      var v = parseInt(input.value, 10);
      out.textContent = v + '%';
      sparkitAPI.setUsage(v);
      chrome.storage.local.set({ pct: v, manual: true, estimate: false, ts: Date.now() });
    });
  }

  // ---- heuristic message counting ----

  function recomputeHeuristic() {
    chrome.storage.local.get(['messageTimes', 'manual', 'cap', 'bannerActive'], function (data) {
      if (data.manual || data.bannerActive) return; // manual or real limit-hit wins
      var cap = data.cap || DEFAULT_CAP;
      var now = Date.now();
      var times = (data.messageTimes || []).filter(function (t) { return now - t < WINDOW_MS; });
      var pct = Math.max(0, Math.min(100, Math.round(100 * (1 - times.length / cap))));

      if (!sparkitAPI) return;
      sparkitAPI.setUsage(pct);
      chrome.storage.local.set({
        pct: pct,
        messageTimes: times,
        estimate: true,
        manual: false,
        ts: now
      });
    });
  }

  function recordMessageSent() {
    chrome.storage.local.get(['messageTimes', 'pct', 'bannerActive', 'cap'], function (data) {
      var wasAtZero = data.pct === 0 && !data.bannerActive;
      var now = Date.now();
      var times = (data.messageTimes || []).filter(function (t) { return now - t < WINDOW_MS; });
      times.push(now);
      chrome.storage.local.set({ messageTimes: times }, function () {
        recomputeHeuristic();
        if (wasAtZero) {
          // Sparkit thought you were out, but the message still sent with no real
          // limit banner — that's proof the guessed cap is too low. Raise it so
          // it stops falsely sleeping at this point in the future.
          setTimeout(function () {
            chrome.storage.local.get(['bannerActive', 'cap'], function (d2) {
              if (!d2.bannerActive) {
                var newCap = (d2.cap || DEFAULT_CAP) + 2;
                chrome.storage.local.set({ cap: newCap }, recomputeHeuristic);
              }
            });
          }, 4000); // wait to see whether the real limit banner shows up instead
        }
      });
    });
  }

  function attachSendListener() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        var active = document.activeElement;
        if (active && active.getAttribute && active.getAttribute('contenteditable') === 'true') {
          setTimeout(recordMessageSent, 300);
        }
      }
    }, true);

    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('button[aria-label*="Send" i]');
      if (btn) setTimeout(recordMessageSent, 300);
    }, true);
  }

  // ---- real limit-reached banner detection ----

  function scanForLimitBanner() {
    var text = document.body.innerText || '';
    var m = text.match(/usage limit[^.]{0,80}|reached your limit[^.]{0,80}|try again[^.]{0,60}/i);
    if (!m) return null;
    // Try to pull a concrete reset reference out of the same sentence, if present.
    var resetMatch = text.match(/(reset|try again)[^.]{0,40}?(in\s+[\w\s]+|at\s+[\d:apm\s]+)/i);
    return {
      raw: m[0].trim(),
      resetText: resetMatch ? resetMatch[0].trim() : null
    };
  }

  function attachBannerWatcher() {
    var lastRaw = null;
    bannerObserver = new MutationObserver(function () {
      var found = scanForLimitBanner();
      if (found && found.raw !== lastRaw) {
        lastRaw = found.raw;
        chrome.storage.local.get(['messageTimes'], function (data) {
          var now = Date.now();
          var trueCap = (data.messageTimes || []).filter(function (t) { return now - t < WINDOW_MS; }).length;
          chrome.storage.local.set({
            bannerActive: true,
            pct: 0,
            manual: false,
            estimate: false,
            resetText: found.resetText,
            cap: trueCap > 0 ? trueCap : DEFAULT_CAP, // now known exactly for this window
            ts: now
          });
        });
        if (sparkitAPI) sparkitAPI.setUsage(0);
      } else if (!found && lastRaw !== null) {
        lastRaw = null;
        chrome.storage.local.set({ bannerActive: false }, recomputeHeuristic);
      }
    });
    bannerObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // ---- cross-tab sync ----

  function attachStorageSync() {
    chrome.storage.onChanged.addListener(function (changes) {
      if (!sparkitAPI) return;
      if (changes.pct) sparkitAPI.setUsage(changes.pct.newValue);
      var container = document.getElementById('sparkit-container');
      if (!container) return;
      if (changes.manual) {
        var fb = document.getElementById('sparkit-fallback');
        if (changes.manual.newValue && !fb) {
          chrome.storage.local.get(['pct'], function (d) { showManualFallback(container, d.pct); });
        } else if (!changes.manual.newValue && fb) {
          fb.remove();
        }
      }
    });
  }

  function attachAlarmListener() {
    chrome.runtime.onMessage.addListener(function (msg) {
      if (msg && msg.type === 'sparkit-refresh') recomputeHeuristic();
    });
  }

  function boot() {
    injectMascot();
    attachSendListener();
    attachBannerWatcher();
    attachStorageSync();
    attachAlarmListener();
    setInterval(function () {
      injectMascot();
      recomputeHeuristic();
    }, 60 * 1000); // recheck decay every minute; cheap since it's just local math
  }

  var tries = 0;
  var waitForComposer = setInterval(function () {
    tries++;
    if (findComposerAnchor() || tries > 40) {
      clearInterval(waitForComposer);
      boot();
    }
  }, 500);

  var lastUrl = location.href;
  new MutationObserver(function () {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(injectMascot, 800);
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
