/* 2D-Szenen von oben. Zeigt nur, was die Engine berechnet hat: Jede Szene bekommt ein fertiges Ereignis und rechnet nichts aus.
   Der Zufall hier (Seite eines Spielzugs, Ecke eines Schusses) ist reine Darstellung und ändert kein Ergebnis.
   Koordinaten: Prozent des Feldes im Rahmen der Seite am Ball, y = 0 ist das Tor, auf das sie spielt. */
window.HKScene = (function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const other = side => side === 'you' ? 'home' : 'you';
  const rink = $('rink'), layer = $('scene'), ball = $('ball');
  const els = { ball, kt: $('keeper-home'), kb: $('keeper-you') }, pos = {};
  let fast = false, wake = null, flip = 1, speed = 1, cur = {}, aim = { sgn: 1, G: [50, 10] };

  // Dauer je Szene in ms. Normales Duell: Aufstellung 250 + 650 + 420 + 450.
  const MS = { setup: 250, s1: 650, s2: 420, s3: 450, counter: 600, foul: 600, free: 480, freeShort: 860, pen: 900, still: 260, max: 3400 };
  const A0 = [50, 68], D0 = [50, 42], OFF = [1.8, -3.2], KEEP = [50, 5.6];
  // Angriff, Foul und Freischlag sind um UP näher ans angegriffene Tor gerückt, damit das Geschehen in dessen Hälfte liegt.
  const UP = 10, sh = p => [p[0], p[1] - UP], un = p => [p[0], p[1] + UP];
  const up = f => f && (t => { const v = f(t); return [v[0], v[1] - UP, v[2], v[3]]; });
  const lift = tracks => { const o = {}; for (const k in tracks) o[k] = up(tracks[k]); return o; };

  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const bez = (a, c, b, t) => { const u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; };
  const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const io = t => t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) * (2 - 2 * t) / 2;
  const out = t => 1 - (1 - t) * (1 - t);
  // Stückweise Bahn: path([tEnde, (u, t) => Punkt], ...). u läuft im Stück von 0 bis 1, t ist die Zeit der ganzen Szene.
  const path = (...parts) => t => {
    let t0 = 0;
    for (let i = 0; i < parts.length; i++) { const p = parts[i]; if (t <= p[0] || i === parts.length - 1) return p[1](seg(t, t0, p[0]), t); t0 = p[0]; }
  };
  // Die Abbildung Rahmen ↔ Bildschirm ist ihre eigene Umkehrung.
  const map = (side, p) => side === 'you' ? [50 + (p[0] - 50) * flip, p[1]] : [50 - (p[0] - 50) * flip, 100 - p[1]];
  const keeperOf = side => side === 'you' ? 'kt' : 'kb';   // der Goalie, auf den side schiesst
  const gone = k => els[k].classList.contains('off');

  function place(name, p, o, s) {
    const el = els[name]; if (!el) return;
    pos[name] = [p[0], p[1]];
    el.style.left = p[0] + '%'; el.style.top = p[1] + '%';
    if (o !== undefined) el.style.opacity = o;
    if (s !== undefined) el.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
  }
  function fig(name, side, card, cls) {
    let el = els[name];
    if (!el) { el = document.createElement('div'); layer.appendChild(el); els[name] = el; }
    el.className = 'fig ' + side + (cls ? ' ' + cls : '');
    el.innerHTML = card ? '<b>' + (card.no === null || card.no === undefined ? esc(card.last.slice(0, 2)) : card.no) + '</b><span>' + esc(card.last) + '</span>' : '';
    el.style.opacity = ''; el.style.transform = ''; el.hidden = false;
    return el;
  }
  function hide(name) { if (els[name]) els[name].hidden = true; }
  const wait = ms => new Promise(r => { if (fast) { r(); return; } const t = setTimeout(() => { wake = null; r(); }, ms); wake = () => { clearTimeout(t); wake = null; r(); }; });

  /* Spielt eine Szene. tracks: { Akteur: t => [x, y, Deckkraft, Grösse] } im Rahmen von side. marks: [[t, fn]], je einmal ausgelöst.
     Überspringen und reduzierte Bewegung zeichnen nur das Endbild, vorher bei reduzierter Bewegung kurz das Startbild. */
  function run(ms, side, tracks, marks) {
    const fired = [];
    const draw = t => {
      for (const k in tracks) { if (!tracks[k]) continue; const v = tracks[k](t); place(k, map(side, v), v[2], v[3]); }
      (marks || []).forEach((m, i) => { if (!fired[i] && t >= m[0]) { fired[i] = true; m[1](); } });
    };
    if (fast) { draw(1); return Promise.resolve(); }
    if (reduce) { draw(0); return wait(MS.still).then(() => draw(1)); }
    return new Promise(resolve => {
      const t0 = performance.now();
      (function tick() {
        if (fast) { draw(1); resolve(); return; }
        const t = Math.min(1, (performance.now() - t0) / (ms * speed)); draw(t);
        if (t < 1) requestAnimationFrame(tick); else resolve();
      })();
    });
  }
  function reset(side) {
    layer.hidden = false; rink.classList.add('play');
    ['m', 'w1', 'w2', 'd'].forEach(hide);
    place('kt', [50, KEEP[1]], '', 1); place('kb', [50, 100 - KEEP[1]], '', 1);
    ball.hidden = false; place('ball', map(side, add(cur.start || A0, OFF)), 1, 1);
  }

  // --- Aufstellung ---
  function start(o) {
    fast = false; flip = Math.random() < 0.5 ? 1 : -1; cur = { side: o.side, foul: null, start: sh(A0) };
    reset(o.side);
    fig('a', o.side, o.a); fig('d', other(o.side), o.d);
    place('a', map(o.side, sh(A0))); place('d', map(o.side, sh(D0)));
    return wait(reduce ? 0 : MS.setup * speed);
  }
  function penSetup(side, card) {
    fast = false; flip = 1; cur = { side, pen: true, start: [50, 50] };
    reset(side);
    fig('a', side, card); place('a', map(side, [50, 50]));
  }
  function clear() {
    fast = false; if (wake) wake();
    layer.hidden = true; rink.classList.remove('play'); ball.hidden = true;
    place('kt', [50, KEEP[1]], '', 1); place('kb', [50, 100 - KEEP[1]], '', 1);
  }
  function skip() { fast = true; if (wake) wake(); }

  // --- Stufe 1: am Verteidiger vorbei. Die Bewegung des Verteidigers zeigt, ob er gelesen hat. ---
  function s1(e, cb) {
    const read = e.read, ok = e.ok;
    let A, D, B, M = null;
    if (e.move === 'direkt') {
      // Gelesen: früh in der Schusslinie. Nicht gelesen: zum Passweg oder in den Zweikampf, die Linie ist offen.
      const lane = [50, 53], wrong = e.stance === 'pass' ? [33, 50] : [60.5, 59.5], O = [51.6, 62.6], r = 0.38, hold = (u, t) => add(A(t), OFF);
      A = path([0.35, u => lerp(A0, [50, 65.6], out(u))], [1, () => [50, 65.6]]);
      if (read) D = path([0.36, u => lerp(D0, lane, out(u))], [1, () => lane]);
      else if (ok) D = path([0.5, u => lerp(D0, wrong, out(u))], [1, () => wrong]);
      else D = path([0.42, u => lerp(D0, wrong, out(u))], [0.74, u => lerp(wrong, lane, out(u))], [1, () => lane]);
      if (ok && !read) B = path([r, hold], [1, u => lerp(O, [50.5, 33], u)]);
      else if (ok) B = path([r, hold], [0.72, u => lerp(O, [50.9, 55], u)], [1, u => lerp([50.9, 55], [45.5, 33], u)]);          // Ablenker
      else B = path([r, hold], [0.76, u => lerp(O, [50.5, 55.2], u)], [1, u => lerp([50.5, 55.2], [48.3, 55.6], out(u))]);       // Abpraller, Ball beim Verteidiger
    } else if (e.move === 'kombi') {
      // Doppelpass über einen angedeuteten Mitspieler, die Karte läuft in den freien Raum und nimmt direkt ab.
      const M0 = [25, 52], A1 = [62, 37], O = add(A0, [-1.5, -3]), Ms = add(M0, [2, -1]), As = add(A1, [-2, 2.2]);
      const cut1 = lerp(O, Ms, 0.5), cut2 = lerp(Ms, As, 0.62), wrong = e.stance === 'block' ? [50, 51] : [53.5, 61];
      const go = u => bez(A0, [67, 58], A1, u);
      M = t => [M0[0], M0[1], Math.min(0.55, t * 4)];
      A = path([0.12, () => A0], [0.92, u => go(io(u))], [1, () => A1]);
      const both = path([0.08, () => O], [0.40, u => lerp(O, Ms, u)], [0.48, () => Ms], [0.90, u => lerp(Ms, As, u)], [1, (u, t) => add(A(t), [-2, 2.2])]);
      if (read && !ok) {            // läuft in den Passweg und nimmt den Ball
        const at = add(cut1, [0.8, -1.6]);
        A = path([0.12, () => A0], [0.5, u => go(io(u) * 0.3)], [1, () => go(0.3)]);
        D = path([0.22, u => lerp(D0, at, out(u))], [1, () => at]);
        B = path([0.08, () => O], [0.24, u => lerp(O, cut1, u)], [1, () => cut1]);
      } else if (read) {            // im Passweg, der Pass rutscht knapp durch
        const near = add(cut1, [2.4, -3.2]);
        D = path([0.22, u => lerp(D0, near, out(u))], [0.5, () => near], [1, u => lerp(near, [47, 49], io(u))]);
        B = both;
      } else if (ok) { D = path([0.42, u => lerp(D0, wrong, out(u))], [1, () => wrong]); B = both; }
      else {                        // falsch gestanden, erwischt den Rückpass noch
        const at = add(cut2, [0.6, 1.8]);
        D = path([0.4, u => lerp(D0, wrong, out(u))], [0.74, u => lerp(wrong, at, out(u))], [1, () => at]);
        B = path([0.08, () => O], [0.40, u => lerp(O, Ms, u)], [0.48, () => Ms], [0.74, u => lerp(Ms, cut2, u)], [1, () => cut2]);
      }
    } else {
      // Solo: Dribbling in einer Kurve um den Verteidiger.
      const P = u => bez(A0, [78, 58], [60, 36], u), off = [-1.9, -3], wrong = e.stance === 'block' ? [50, 47] : [34, 50];
      const withA = (u, t) => add(A(t), off);
      if (read && !ok) {            // geht mit und nimmt den Ball ab
        const tc = 0.56, meet = P(io(tc)), at = add(meet, [-2.6, -2.4]);
        A = t => P(t < tc ? io(t) : io(tc) + (t - tc) * 0.12);
        D = path([tc, u => lerp(D0, at, out(u))], [1, u => lerp(at, add(meet, [-7, 1.5]), out(u))]);
        B = path([tc, withA], [1, (u, t) => add(D(t), [-1.8, 2.6])]);
      } else if (read) {            // geht mit, der Angreifer setzt sich trotzdem durch
        A = t => P(io(t));
        D = path([0.5, u => lerp(D0, [64, 50], out(u))], [1, u => lerp([64, 50], [66, 45], u)]);
        B = t => add(A(t), off);
      } else if (ok) { A = t => P(io(t)); D = path([0.45, u => lerp(D0, wrong, out(u))], [1, () => wrong]); B = t => add(A(t), off); }
      else {                        // falsch gestanden, holt ihn noch ein
        const tc = 0.88, meet = P(io(tc)), at = add(meet, [-2.8, 2]);
        A = t => P(t < tc ? io(t) : io(tc) + (t - tc) * 0.1);
        D = path([0.38, u => lerp(D0, wrong, out(u))], [tc, u => lerp(wrong, at, io(u))], [1, () => at]);
        B = path([tc, withA], [1, (u, t) => add(D(t), [-1.6, -2.6])]);
      }
    }
    if (M) fig('m', e.side, null, 'faint');
    const marks = [[0.72, cb.text]];
    if (!ok) marks.push([0.96, () => cb.label({ direkt: 'Geblockt', kombi: 'Abgefangen', solo: 'Gestohlen' }[e.move], 'save')]);
    return run(MS.s1, e.side, lift({ a: A, d: D, ball: B, m: M }), marks);
  }

  // --- Stufe 2: geht der Schuss aufs Tor? ---
  function s2(e, cb) {
    const side = e.side, k = keeperOf(side), B0 = map(side, pos.ball), K0 = map(side, pos[k]), sgn = Math.random() < 0.5 ? -1 : 1;
    let B, G;
    if (e.ok) { G = [50 + sgn * (1.8 + Math.random() * 3.2), 10.5]; B = t => lerp(B0, G, t); }
    else if (e.miss === 'wide') { G = [50 + sgn * 12.5, -4]; B = t => lerp(B0, G, t); }
    else if (e.miss === 'high') { G = [50 + sgn * 2, -5]; B = t => { const p = lerp(B0, G, t); return [p[0], p[1], 1, 1 + t * 0.9]; }; }
    else { const P = [50 + sgn * 6.9, 2.4], R = [50 + sgn * 14, 16]; G = P; B = path([0.78, u => lerp(B0, P, u)], [1, u => lerp(P, R, out(u))]); }
    aim = { sgn, G };
    const tracks = { ball: B };
    if (!gone(k)) tracks[k] = t => lerp(K0, [50 + (G[0] - 50) * (e.ok ? 0.4 : 0.25), K0[1]], out(t));
    const marks = [[0.8, cb.text]];
    if (!e.ok) marks.push([0.85, () => cb.label({ wide: 'Daneben', high: 'Drüber', post: 'Pfosten' }[e.miss], 'save')]);
    return run(MS.s2, side, tracks, marks);
  }

  // --- Stufe 3: Goalie oder Tor ---
  function s3(e, cb) {
    const side = e.side, k = keeperOf(side), B0 = map(side, pos.ball), K0 = map(side, pos[k]), sgn = aim.sgn, gx = aim.G[0];
    const tracks = {}, marks = [];
    if (e.ok) {
      const net = [gx + sgn * 1.2, 1.4];
      tracks.ball = path([0.5, u => lerp(B0, net, u)], [1, () => net]);
      if (!e.empty && !gone(k)) tracks[k] = t => lerp(K0, [gx - sgn * 3.2, K0[1] + 0.4], out(seg(t, 0.1, 0.6)));
      marks.push([0.5, () => { cb.text(); cb.goal(side); }]);
    } else {
      const at = [gx, K0[1] + 1.7];
      tracks[k] = t => lerp(K0, [gx, K0[1] + 0.6], out(seg(t, 0, 0.4)));
      if (e.caught) tracks.ball = path([0.42, u => lerp(B0, at, u)], [1, () => at]);                 // fängt den Ball
      else { const away = [gx + sgn * 21, 19]; tracks.ball = path([0.42, u => lerp(B0, at, u)], [1, u => { const p = lerp(at, away, out(u)); return [p[0], p[1], 1 - u * 0.35]; }]); }   // wehrt ab
      marks.push([0.42, () => { cb.text(); cb.label('Parade', 'save'); }]);
    }
    return run(MS.s3, side, tracks, marks);
  }

  // --- Konter: Gegenstoss zum anderen Tor. Schütze ist immer der Verteidiger des Duells. ---
  function counter(e, cb) {
    const side = e.side, Dc = map(side, pos.d), Ac = map(side, pos.a), Bc = map(side, pos.ball);
    const sgn = Ac[0] >= Dc[0] ? -1 : 1, R = [50 + sgn * 4, 25], bow = [Dc[0] + sgn * 13, (Dc[1] + R[1]) / 2 + 4];
    const D = t => bez(Dc, bow, R, io(t)), chase = [R[0] - sgn * 9, 35];
    const tracks = { d: D, a: t => lerp(Ac, chase, io(seg(t, 0.2, 1)) * 0.85) };
    tracks.ball = e.src === 'catch'
      ? path([0.4, (u, t) => lerp(Bc, add(D(0.4), OFF), u)], [1, (u, t) => add(D(t), OFF)])       // Auswurf des Goalies
      : path([0.15, (u, t) => lerp(Bc, add(D(t), OFF), u)], [1, (u, t) => add(D(t), OFF)]);
    ['m', 'w1', 'w2'].forEach(hide);
    cb.text(); cb.label('Konter', 'warn', side === 'you' ? 'unten' : 'oben');
    return run(MS.counter, side, tracks);
  }

  // --- Foul: Verteidiger hakt ein, kurzer Halt ---
  function foul(e, cb) {
    const side = other(e.side), hit = [51.5, 60.5], still = [49.3, 62], spot = [50.5, 55.5];
    const A = path([0.45, u => lerp(A0, hit, out(u))], [0.62, u => lerp(hit, still, out(u))], [1, () => still]);
    const D = path([0.45, u => lerp(D0, [54.6, 57.6], io(u))], [1, () => [54.6, 57.6]]);
    const B = path([0.45, (u, t) => add(A(t), OFF)], [0.75, u => lerp(add(hit, OFF), spot, out(u))], [1, () => spot]);
    cur.foul = e.kind;
    return run(MS.foul, side, lift({ a: A, d: D, ball: B }), [[0.5, () => { cb.text(); cb.label(e.kind === 'penalty' ? 'Penalty' : e.kind === 'twomin' ? '2 Minuten' : 'Foul', 'warn'); }]]);
  }

  // --- Freischlag: Mauer, dann direkt oder kurz gespielt. Bei 2 Minuten geht der Verteidiger auf die Strafbank. ---
  function free(e, cb) {
    const side = e.side, ds = other(side), two = cur.foul === 'twomin', F = [50, 56], Ap = [50, 60.8], W = [[46.3, 43.5], [53.7, 43.5]];
    const Ac = un(map(side, pos.a)), Dc = un(map(side, pos.d)), Bc = un(map(side, pos.ball)), T = e.short ? 0.56 : 1;
    const bench = un(map(side, ds === 'you' ? [7, 50] : [93, 50]));
    fig('w2', ds, null, 'faint'); if (two) fig('w1', ds, null, 'faint');
    const fade = (p, to) => t => [p[0], p[1], Math.min(to, seg(t, 0, T) * to * 1.6)];
    const tracks = { w2: fade(W[1], 0.6), w1: two ? fade(W[0], 0.6) : null, ball: null, a: null };
    tracks.d = two ? t => { const u = io(seg(t, 0, T)), p = lerp(Dc, bench, u); return [p[0], p[1], 1 - u * 0.45]; } : t => lerp(Dc, W[0], io(seg(t, 0, T)));
    if (e.short) {                  // kurz zum Mitspieler, Ablage, Abnahme
      const M0 = [63, 57.5], Ms = add(M0, [-2, -1.5]), L = [57.5, 50.5], A2 = [58.6, 54];
      fig('m', side, null, 'faint');
      tracks.m = fade(M0, 0.55);
      tracks.a = path([T, u => lerp(Ac, Ap, io(u))], [0.66, () => Ap], [0.98, u => lerp(Ap, A2, io(u))], [1, () => A2]);
      tracks.ball = path([T * 0.8, u => lerp(Bc, F, out(u))], [T, () => F], [0.76, u => lerp(F, Ms, u)], [0.96, u => lerp(Ms, L, u)], [1, () => L]);
    } else {
      tracks.a = t => lerp(Ac, Ap, io(t));
      tracks.ball = path([0.8, u => lerp(Bc, F, out(u))], [1, () => F]);
    }
    cb.text();
    return run(e.short ? MS.freeShort : MS.free, side, lift(tracks), two ? [[T, () => { els.d.classList.add('bench'); els.d.querySelector('span').textContent = '2 Min'; }]] : null);
  }

  // --- Penalty: Anlauf, Ecke, Schuss. Links und rechts gelten so, wie man sie auf dem Bildschirm sieht. ---
  function pen(e, cb) {
    const side = e.side, k = keeperOf(side), K0 = [50, KEEP[1]], sx = { l: 45.2, m: 50, r: 54.8 }, fx = c => map(side, [sx[c], 0])[0];
    const xc = fx(e.corner), xg = 50 + (fx(e.guess) - 50) * 0.92, from = add([50, 27], OFF), high = !e.ok && !e.right && e.corner === 'm';
    const end = e.ok ? [xc, 1.4] : e.right ? [xc, 7.2] : high ? [50, -5] : [50 + (xc - 50) * 2.5, -4];
    const A = path([0.5, u => lerp([50, 50], [50, 27], io(u))], [1, () => [50, 27]]);
    const B = path([0.5, (u, t) => add(A(t), OFF)], [0.84, u => { const p = lerp(from, end, u); return high ? [p[0], p[1], 1, 1 + u * 0.9] : p; }], [1, () => high ? [end[0], end[1], 1, 1.9] : end]);
    const tracks = { a: A, ball: B };
    tracks[k] = t => lerp(K0, [xg, K0[1] + (e.guess === 'm' ? 0 : 0.5)], out(seg(t, 0.46, 0.8)));
    return run(MS.pen, side, tracks, [[0.84, () => { cb.text(); if (e.ok) cb.goal(side); else cb.label(e.right ? 'Gehalten' : high ? 'Drüber' : 'Daneben', 'save'); }]]);
  }

  const scenes = { s1, s2, s3, counter, foul, free, pen };
  // Lange Ketten (Freischlag, Goalie fängt, Konter) laufen etwas schneller, damit keine Sequenz länger als MS.max dauert.
  function plan(events) {
    let total = 0;
    events.forEach(e => { total += e.t === 'reveal' ? MS.setup : e.t === 'free' ? (e.short ? MS.freeShort : MS.free) : (MS[e.t] || 0); });
    speed = total > MS.max ? MS.max / total : 1;
    return total * speed;
  }
  function play(e, cb) { return scenes[e.t] ? scenes[e.t](e, cb) : Promise.resolve(cb.text()); }
  const ballY = () => (pos.ball ? pos.ball[1] : 50);
  return { start, penSetup, play, plan, clear, skip, wait, ballY, MS };
})();
