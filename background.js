// Badge shows a "~" prefix whenever the number is the local estimate rather than
// a real reading, so you're never misled into thinking it's precise.
// Notifications: low-estimate heads-up, plus an immediate one when the real
// limit-reached banner is detected (that one is not an estimate).

var THRESHOLDS = [20, 10];
var lastNotifiedAt = null;
var lastBannerNotified = false;

function setBadge(pct, isEstimate) {
  if (typeof pct !== 'number' || isNaN(pct)) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  chrome.action.setBadgeText({ text: (isEstimate ? '~' : '') + pct + '%' });
  var color = pct > 60 ? '#3B9E75' : pct > 30 ? '#D9A82A' : pct > 0 ? '#D85A30' : '#888';
  chrome.action.setBadgeBackgroundColor({ color: color });
}

function maybeNotifyLow(pct) {
  chrome.storage.local.get(['notifyEnabled'], function (data) {
    if (data.notifyEnabled === false) return;
    for (var i = 0; i < THRESHOLDS.length; i++) {
      var t = THRESHOLDS[i];
      if (pct <= t && lastNotifiedAt !== t) {
        lastNotifiedAt = t;
        chrome.notifications.create('sparkit-low-' + t, {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Sparkit is getting sleepy',
          message: 'Estimated usage is running low (~' + pct + '% left, based on message count).'
        });
        break;
      }
    }
    if (pct > 30) lastNotifiedAt = null;
  });
}

chrome.storage.onChanged.addListener(function (changes) {
  if (changes.pct || changes.estimate) {
    chrome.storage.local.get(['pct', 'estimate', 'bannerActive'], function (data) {
      setBadge(data.pct, !!data.estimate);
      if (typeof data.pct === 'number' && data.estimate) maybeNotifyLow(data.pct);
    });
  }
  if (changes.bannerActive) {
    if (changes.bannerActive.newValue && !lastBannerNotified) {
      lastBannerNotified = true;
      chrome.storage.local.get(['resetText'], function (data) {
        chrome.notifications.create('sparkit-limit-hit', {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Claude usage limit reached',
          message: data.resetText || 'Sparkit will wake back up once your limit resets.'
        });
      });
    } else if (!changes.bannerActive.newValue) {
      lastBannerNotified = false;
    }
  }
});

chrome.storage.local.get(['pct', 'estimate'], function (data) {
  if (typeof data.pct === 'number') setBadge(data.pct, !!data.estimate);
});

chrome.alarms.create('sparkit-poll', { periodInMinutes: 2 });
chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name !== 'sparkit-poll') return;
  chrome.tabs.query({ url: 'https://claude.ai/*' }, function (tabs) {
    tabs.forEach(function (tab) {
      chrome.tabs.sendMessage(tab.id, { type: 'sparkit-refresh' }).catch(function () {});
    });
  });
});
