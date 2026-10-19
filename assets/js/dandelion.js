/* ==========================================================
   the dandelion sea
   ----------------------------------------------------------
   seeds drift over a paper sea in an ambient breeze.
   the cursor is a gust: move it to push them around;
   click / tap releases a puff of new seeds.
   vanilla js, no deps, theme-aware, reduced-motion friendly.
   ========================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('dandelion-sea');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 1, H = 1, dpr = 1;
  var seeds = [];
  var MAX = 0;
  var raf = 0;
  var running = false;
  var lastTs = 0;
  var onScreen = true;

  var LAYERS = [
    { f: 0.62, size: [2.0, 3.4], alpha: [0.10, 0.22], wind: 0.5, arms: 5, glow: false },
    { f: 0.26, size: [4.2, 6.6], alpha: [0.16, 0.32], wind: 0.85, arms: 7, glow: false },
    { f: 0.12, size: [7.5, 12.0], alpha: [0.26, 0.46], wind: 1.3, arms: 8, glow: true }
  ];

  var pointer = { x: -9999, y: -9999, px: 0, py: 0, vx: 0, vy: 0, t: 0, inside: false };
  var WIND_R = 150;

  // ---- palette -------------------------------------------------------------

  var pal = { ink: '#3b3833', glow: '#0d9488' };

  function readPalette() {
    var cs = getComputedStyle(root);
    var ink = cs.getPropertyValue('--sea-ink').trim();
    var glow = cs.getPropertyValue('--sea-glow').trim();
    if (ink) pal.ink = ink;
    if (glow) pal.glow = glow;
  }

  function hexToRgba(hex, a) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  var glowSprite = document.createElement('canvas');
  var SPRITE = 64;

  function buildGlowSprite() {
    glowSprite.width = SPRITE;
    glowSprite.height = SPRITE;
    var g = glowSprite.getContext('2d');
    var grad = g.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
    grad.addColorStop(0, hexToRgba(pal.glow, 0.5));
    grad.addColorStop(0.45, hexToRgba(pal.glow, 0.16));
    grad.addColorStop(1, hexToRgba(pal.glow, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, SPRITE, SPRITE);
  }

  // ---- seeds ---------------------------------------------------------------

  function rand(a, b) { return a + Math.random() * (b - a); }

  function makeSeed(layer, x, y, burst) {
    var L = LAYERS[layer];
    return {
      x: x === undefined ? rand(-30, W + 30) : x,
      y: y === undefined ? rand(0, H) : y,
      vx: 0, vy: 0,
      size: rand(L.size[0], L.size[1]),
      alpha: rand(L.alpha[0], L.alpha[1]),
      wind: L.wind * rand(0.85, 1.18),
      arms: L.arms,
      glow: L.glow,
      layer: layer,
      side: Math.random() < 0.5 ? -1 : 1,
      phase: rand(0, Math.PI * 2),
      spin: rand(0.05, 0.3) * (Math.random() < 0.5 ? -1 : 1),
      rot: rand(0, Math.PI * 2),
      burst: !!burst,
      dying: false,
      fade: burst ? 0 : 1
    };
  }

  function seedCount() {
    return Math.max(30, Math.min(115, Math.round((W * H) / 5200)));
  }

  function populate() {
    seeds.length = 0;
    MAX = seedCount();
    for (var i = 0; i < MAX; i++) {
      var r = Math.random();
      var li = r < LAYERS[0].f ? 0 : (r < LAYERS[0].f + LAYERS[1].f ? 1 : 2);
      seeds.push(makeSeed(li));
    }
  }

  // ---- physics -------------------------------------------------------------

  function step(dt, t) {
    var decay = Math.exp(-dt * 5);
    pointer.vx *= decay;
    pointer.vy *= decay;

    for (var i = 0; i < seeds.length; i++) {
      var s = seeds[i];

      // ambient breeze: gentle rightward drift, vertical wobble
      var awx = (9 + 5 * Math.sin(t * 0.23 + s.phase)) * s.wind;
      var awy = 2.4 * Math.sin(t * 0.37 + s.phase * 1.7) * s.wind;
      var k = 1 - Math.exp(-dt * 0.9);
      s.vx += (awx - s.vx) * k;
      s.vy += (awy - s.vy) * k;

      // the cursor gust
      if (pointer.inside) {
        var dx = s.x - pointer.x, dy = s.y - pointer.y;
        var d2 = dx * dx + dy * dy;
        var R = WIND_R * (0.7 + s.wind * 0.5);
        if (d2 < R * R) {
          var d = Math.sqrt(d2) || 0.001;
          var f = 1 - d / R;
          f *= f;
          s.vx += pointer.vx * f * 2.2 * s.wind * dt;
          s.vy += pointer.vy * f * 2.2 * s.wind * dt;
          var ux = dx / d, uy = dy / d; // swirl around the cursor
          s.vx += -uy * f * 46 * s.side * s.wind * dt;
          s.vy += ux * f * 46 * s.side * s.wind * dt;
        }
      }

      var sp = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
      if (sp > 750) { s.vx *= 750 / sp; s.vy *= 750 / sp; }

      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += (s.spin + sp * 0.0004 * s.side) * dt;

      var m = 36;
      if (s.x > W + m) s.x = -m;
      else if (s.x < -m) s.x = W + m;
      if (s.y > H + m) s.y = -m;
      else if (s.y < -m) s.y = H + m;

      if (s.burst && s.fade < 1 && !s.dying) s.fade = Math.min(1, s.fade + dt * 2.5);
      if (s.dying) s.fade -= dt * 1.4;
    }

    // keep burst puffs within a budget
    var budget = Math.round(MAX * 1.35);
    var over = seeds.length - budget;
    if (over > 0) {
      var marked = 0;
      for (var j = 0; j < seeds.length && marked < over; j++) {
        if (seeds[j].burst && !seeds[j].dying) { seeds[j].dying = true; marked++; }
      }
    }

    for (var q = seeds.length - 1; q >= 0; q--) {
      if (seeds[q].fade <= 0) seeds.splice(q, 1);
    }
  }

  // ---- drawing -------------------------------------------------------------

  function drawSeed(s) {
    var speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
    var a = s.alpha * s.fade;

    if (s.glow) {
      var gs = s.size * 7;
      ctx.globalAlpha = a * 0.5;
      ctx.drawImage(glowSprite, s.x - gs / 2, s.y - gs / 2, gs, gs);
    }

    // fluorescence: motion streak on gusts
    if (speed > 150) {
      ctx.globalAlpha = Math.min(0.55, ((speed - 150) / 800) * 0.55) * s.fade;
      ctx.strokeStyle = pal.glow;
      ctx.lineWidth = Math.max(0.6, s.size * 0.14);
      ctx.beginPath();
      ctx.moveTo(s.x - s.vx * 0.05, s.y - s.vy * 0.05);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
    }

    // pappus: a fan of filaments + a stem with the seed pod
    ctx.globalAlpha = a;
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = Math.max(0.6, s.size * 0.1);
    ctx.beginPath();
    for (var i = 0; i < s.arms; i++) {
      var spread = (i / (s.arms - 1) - 0.5) * 3.5;
      var ang = s.rot + spread;
      var len = s.size;
      ctx.moveTo(s.x, s.y);
      ctx.quadraticCurveTo(
        s.x + Math.cos(ang - 0.16 * s.side) * len * 0.55,
        s.y + Math.sin(ang - 0.16 * s.side) * len * 0.55,
        s.x + Math.cos(ang) * len,
        s.y + Math.sin(ang) * len
      );
    }
    var down = s.rot + Math.PI;
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + Math.cos(down) * s.size * 1.5, s.y + Math.sin(down) * s.size * 1.5);
    ctx.stroke();

    ctx.globalAlpha = Math.min(1, a * 1.7);
    ctx.fillStyle = pal.ink;
    ctx.beginPath();
    ctx.arc(
      s.x + Math.cos(down) * s.size * 1.5,
      s.y + Math.sin(down) * s.size * 1.5,
      Math.max(0.5, s.size * 0.15),
      0, Math.PI * 2
    );
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (var L = 0; L < LAYERS.length; L++) {
      for (var i = 0; i < seeds.length; i++) {
        if (seeds[i].layer === L) drawSeed(seeds[i]);
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---- loop ----------------------------------------------------------------

  function frame(ts) {
    if (!running) return;
    if (!lastTs) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000) || 0.016;
    lastTs = ts;
    step(dt, ts / 1000);
    draw();
    raf = window.requestAnimationFrame(frame);
  }

  function start() {
    if (reduced || running) return;
    running = true;
    lastTs = 0;
    raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  }

  function sync() {
    if (reduced) return;
    if (onScreen && !document.hidden) start(); else stop();
  }

  // ---- interaction ---------------------------------------------------------

  var hint = canvas.parentNode ? canvas.parentNode.querySelector('.sea-hint') : null;
  var hintOff = false;

  if (hint && window.matchMedia('(pointer: coarse)').matches) {
    hint.textContent = 'drag to stir the wind · tap to scatter seeds';
  }

  function hideHint() {
    if (hintOff || !hint) return;
    hintOff = true;
    hint.classList.add('sea-hint--off');
  }

  function onPointerMove(e) {
    var r = canvas.getBoundingClientRect();
    var x = e.clientX - r.left;
    var y = e.clientY - r.top;
    var now = performance.now();
    var dtp = (now - pointer.t) / 1000;
    if (pointer.t && dtp > 0 && dtp < 0.12) {
      var nvx = (x - pointer.px) / dtp;
      var nvy = (y - pointer.py) / dtp;
      var m = Math.sqrt(nvx * nvx + nvy * nvy);
      if (m > 2600) { nvx *= 2600 / m; nvy *= 2600 / m; }
      pointer.vx = pointer.vx * 0.55 + nvx * 0.45;
      pointer.vy = pointer.vy * 0.55 + nvy * 0.45;
    }
    pointer.px = x;
    pointer.py = y;
    pointer.t = now;
    pointer.inside = x > -90 && x < W + 90 && y > -50 && y < H + 50;
    if (pointer.inside) hideHint();
  }

  function puff(x, y) {
    var n = 12 + ((Math.random() * 7) | 0);
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * Math.PI * 2 + rand(-0.25, 0.25);
      var sp = rand(60, 330);
      var s = makeSeed(Math.random() < 0.4 ? 1 : 2, x, y, true);
      s.vx = Math.cos(ang) * sp + pointer.vx * 0.25;
      s.vy = Math.sin(ang) * sp + pointer.vy * 0.25 - 24;
      s.alpha = Math.min(0.6, s.alpha * 1.15);
      seeds.push(s);
    }
  }

  // ---- lifecycle -----------------------------------------------------------

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var nw = Math.max(1, Math.round(rect.width));
    var nh = Math.max(1, Math.round(rect.height));
    var oldW = W, oldH = H;
    W = nw;
    H = nh;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (oldW > 1 && oldH > 1) {
      for (var i = 0; i < seeds.length; i++) {
        seeds[i].x = (seeds[i].x / oldW) * W;
        seeds[i].y = (seeds[i].y / oldH) * H;
      }
    }
  }

  readPalette();
  resize();
  populate();
  buildGlowSprite();

  if (reduced) {
    draw();
    return;
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerdown', function (e) {
    var r = canvas.getBoundingClientRect();
    puff(e.clientX - r.left, e.clientY - r.top);
    hideHint();
  });

  var rtimer = 0;
  window.addEventListener('resize', function () {
    window.clearTimeout(rtimer);
    rtimer = window.setTimeout(function () {
      resize();
      populate();
      if (!running && onScreen && !document.hidden) start();
    }, 150);
  });

  document.addEventListener('theme-change', function () {
    readPalette();
    buildGlowSprite();
  });

  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      sync();
    }, { threshold: 0 });
    io.observe(canvas);
  }

  document.addEventListener('visibilitychange', sync);

  start();
})();