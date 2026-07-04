function render() {
  chrome.storage.local.get(
    ['pct', 'estimate', 'manual', 'bannerActive', 'resetText', 'cap', 'notifyEnabled'],
    function (data) {
      var pctVal = document.getElementById('pct-val');
      var badge = document.getElementById('badge');
      var bannerNote = document.getElementById('banner-note');

      pctVal.textContent = typeof data.pct === 'number' ? data.pct + '%' : '—';

      if (data.bannerActive) {
        badge.textContent = 'real — limit reached';
        badge.className = 'badge real';
        bannerNote.style.display = 'block';
        bannerNote.textContent = data.resetText
          ? 'Claude says: ' + data.resetText
          : "Claude says you've hit your limit.";
      } else if (data.manual) {
        badge.textContent = 'manual override';
        badge.className = 'badge estimate';
        bannerNote.style.display = 'none';
      } else {
        badge.textContent = 'estimate';
        badge.className = 'badge estimate';
        bannerNote.style.display = 'none';
      }

      document.getElementById('notify-toggle').checked = data.notifyEnabled !== false;
      document.getElementById('cap-input').value = data.cap || 20;

      var slider = document.getElementById('manual-slider');
      if (typeof data.pct === 'number') slider.value = data.pct;
    }
  );
}

document.getElementById('manual-slider').addEventListener('input', function (e) {
  var v = parseInt(e.target.value, 10);
  chrome.storage.local.set({ pct: v, manual: true, estimate: false, bannerActive: false, ts: Date.now() });
});

document.getElementById('auto-btn').addEventListener('click', function () {
  chrome.storage.local.set({ manual: false, bannerActive: false });
});

document.getElementById('notify-toggle').addEventListener('change', function (e) {
  chrome.storage.local.set({ notifyEnabled: e.target.checked });
});

document.getElementById('cap-input').addEventListener('change', function (e) {
  var v = Math.max(1, parseInt(e.target.value, 10) || 20);
  chrome.storage.local.set({ cap: v });
});

render();
