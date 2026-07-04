// Sparkit mascot: small SVG creature whose mood reflects a usage percentage (0-100).
// No dependencies. Exposes window.Sparkit.mount(container) -> { setUsage(pct) }

(function () {
  var QUIPS = {
    active: ["plenty of room, let's go!", "feeling bright today", "ask away, i'm ready", "zoom zoom!", "so much energy right now"],
    calm: ["cruising steady", "halfway there, no worries", "taking it easy", "still got plenty left"],
    drowsy: ["getting a lil sleepy...", "running low, be gentle", "yaaawn...", "might nap soon"],
    asleep: ["zzz... all out for now", "shh, resting up", "come back after a recharge", "totally tuckered out"]
  };

  function stateFor(v) {
    if (v <= 0) return 'asleep';
    if (v < 30) return 'drowsy';
    if (v <= 60) return 'calm';
    return 'active';
  }

  function svgEl(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function mount(container) {
    container.innerHTML = '';
    container.className = 'sparkit-wrap';

    var sparksLayer = document.createElement('div');
    sparksLayer.className = 'sparkit-sparks';
    container.appendChild(sparksLayer);

    var svg = svgEl('svg', { width: 44, height: 44, viewBox: '0 0 72 72', class: 'sparkit-svg' });

    var shadow = svgEl('ellipse', { cx: 36, cy: 66, rx: 18, ry: 3, fill: 'currentColor', opacity: 0.12 });
    svg.appendChild(shadow);

    var bodyWrap = svgEl('g', { class: 'sparkit-bodywrap' });
    var body = svgEl('circle', { cx: 36, cy: 38, r: 26, fill: '#8FBFE0' });
    var cheekL = svgEl('ellipse', { cx: 18, cy: 42, rx: 5, ry: 4, fill: '#F4A3B8', opacity: 0.7 });
    var cheekR = svgEl('ellipse', { cx: 54, cy: 42, rx: 5, ry: 4, fill: '#F4A3B8', opacity: 0.7 });
    var eyeL = svgEl('circle', { cx: 27, cy: 34, r: 4.2, fill: '#20303A' });
    var eyeR = svgEl('circle', { cx: 45, cy: 34, r: 4.2, fill: '#20303A' });
    var glintL = svgEl('circle', { cx: 25.6, cy: 32.5, r: 1.3, fill: '#fff' });
    var glintR = svgEl('circle', { cx: 43.6, cy: 32.5, r: 1.3, fill: '#fff' });
    var mouth = svgEl('path', { d: 'M29 44 Q36 49 43 44', fill: 'none', stroke: '#20303A', 'stroke-width': 2.4, 'stroke-linecap': 'round' });
    var earL = svgEl('path', { d: 'M20 18 Q16 8 24 10 Q22 16 20 18 Z', fill: '#8FBFE0' });
    var earR = svgEl('path', { d: 'M52 18 Q56 8 48 10 Q50 16 52 18 Z', fill: '#8FBFE0' });

    bodyWrap.appendChild(body);
    bodyWrap.appendChild(cheekL);
    bodyWrap.appendChild(cheekR);
    bodyWrap.appendChild(eyeL);
    bodyWrap.appendChild(eyeR);
    bodyWrap.appendChild(glintL);
    bodyWrap.appendChild(glintR);
    bodyWrap.appendChild(mouth);
    bodyWrap.appendChild(earL);
    bodyWrap.appendChild(earR);
    svg.appendChild(bodyWrap);

    var legs = svgEl('g', {});
    legs.appendChild(svgEl('ellipse', { cx: 26, cy: 62, rx: 5, ry: 3.5, fill: '#6FA0C2' }));
    legs.appendChild(svgEl('ellipse', { cx: 46, cy: 62, rx: 5, ry: 3.5, fill: '#6FA0C2' }));
    svg.appendChild(legs);

    container.appendChild(svg);

    var bubble = document.createElement('div');
    bubble.className = 'sparkit-bubble';
    container.appendChild(bubble);

    var bobTimer = null;
    var sparkTimer = null;
    var bubbleTimer = null;

    function clearTimers() {
      if (bobTimer) { clearInterval(bobTimer); bobTimer = null; }
      if (sparkTimer) { clearInterval(sparkTimer); sparkTimer = null; }
    }

    function spawnSpark() {
      var s = document.createElement('div');
      s.className = 'sparkit-spark';
      s.textContent = '+';
      s.style.left = (10 + Math.random() * 26) + 'px';
      s.style.top = (2 + Math.random() * 22) + 'px';
      sparksLayer.appendChild(s);
      requestAnimationFrame(function () {
        s.style.transform = 'translateY(-16px) scale(1.3)';
        s.style.opacity = '0';
      });
      setTimeout(function () { s.remove(); }, 850);
    }

    function applyState(state) {
      clearTimers();
      bodyWrap.style.transform = 'none';
      svg.style.transform = 'none';
      glintL.style.opacity = 1; glintR.style.opacity = 1;
      eyeL.setAttribute('cy', 34); eyeR.setAttribute('cy', 34);

      if (state === 'active') {
        eyeL.setAttribute('r', 4.2); eyeR.setAttribute('r', 4.2);
        mouth.setAttribute('d', 'M28 43 Q36 51 44 43');
        body.setAttribute('fill', '#79B6DE');
        cheekL.style.opacity = 0.9; cheekR.style.opacity = 0.9;
        bobTimer = setInterval(function () {
          var t = Date.now() / 170;
          bodyWrap.style.transform = 'translateY(' + Math.sin(t) * 2 + 'px)';
        }, 40);
        sparkTimer = setInterval(spawnSpark, 450);
      } else if (state === 'calm') {
        eyeL.setAttribute('r', 4.2); eyeR.setAttribute('r', 4.2);
        mouth.setAttribute('d', 'M29 44 Q36 48 43 44');
        body.setAttribute('fill', '#8FBFE0');
        cheekL.style.opacity = 0.7; cheekR.style.opacity = 0.7;
        bobTimer = setInterval(function () {
          var t = Date.now() / 500;
          bodyWrap.style.transform = 'translateY(' + Math.sin(t) * 1 + 'px)';
        }, 60);
      } else if (state === 'drowsy') {
        eyeL.setAttribute('r', 2.4); eyeR.setAttribute('r', 2.4);
        eyeL.setAttribute('cy', 35); eyeR.setAttribute('cy', 35);
        mouth.setAttribute('d', 'M30 45 Q36 46 42 45');
        body.setAttribute('fill', '#9FC8E2');
        cheekL.style.opacity = 0.4; cheekR.style.opacity = 0.4;
        glintL.style.opacity = 0.5; glintR.style.opacity = 0.5;
      } else {
        eyeL.setAttribute('r', 1.6); eyeR.setAttribute('r', 1.6);
        mouth.setAttribute('d', 'M31 45 Q36 44 41 45');
        body.setAttribute('fill', '#AACDE4');
        cheekL.style.opacity = 0.25; cheekR.style.opacity = 0.25;
        glintL.style.opacity = 0; glintR.style.opacity = 0;
        svg.style.transform = 'rotate(6deg)';
      }
    }

    var currentState = 'calm';

    function setUsage(pct) {
      var v = Math.max(0, Math.min(100, Math.round(pct)));
      var state = stateFor(v);
      if (state !== currentState) {
        currentState = state;
        applyState(state);
      }
      container.title = 'Sparkit: ' + state + ' (' + v + '% usage left)';
    }

    svg.addEventListener('click', function () {
      var list = QUIPS[currentState];
      var msg = list[Math.floor(Math.random() * list.length)];
      bubble.textContent = msg;
      bubble.classList.add('show');
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(function () { bubble.classList.remove('show'); }, 2600);
      svg.style.transform = (svg.style.transform || '') + ' scale(1.1)';
      setTimeout(function () { svg.style.transform = svg.style.transform.replace(' scale(1.1)', ''); }, 180);
    });

    applyState('calm');
    return { setUsage: setUsage };
  }

  window.Sparkit = { mount: mount };
})();
