/* Duellszene: Nahaufnahme der Angriffszone von oben. Zeigt, was die Engine für Stufe 1 entschieden hat:
   Der Angreifer startet seinen Zug, der Verteidiger legt sich im Lauf fest (man sieht, ob er richtig liest),
   im Moment des Zusammentreffens wird es langsam und die Kamera zoomt, dann fällt die Entscheidung.
   Es wird immer nach oben angegriffen; die Trikotfarben zeigen, wer wer ist. Rechnet nichts aus. */
window.HKField = (function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg', $ = id => document.getElementById(id);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const bez = (a, c, b, t) => { const u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; };
  const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const io = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const out = t => 1 - (1 - t) * (1 - t);
  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];

  // Zeit der Szene: 0 bis 1. Zwischen SLOW[0] und SLOW[1] läuft sie mit RATE (Zeitlupe), TC ist das Zusammentreffen.
  const BASE = 1350, TC = 0.66, SLOW = [0.54, 0.76], RATE = 0.3;
  const A0 = [180, 278], D0 = [180, 168], M = [92, 214], R = [236, 168];
  const P = u => bez(A0, [270, 256], [204, 118], u);          // Solo-Kurve, P(0.5) ist der Zweikampf-Punkt
  const C = { direkt: [182, 214], kombi: [164, 191], solo: P(0.5) };
  const SPOT = { block: C.direkt, pass: C.kombi, zwei: C.solo };
  const TEAM = { you: { fill: '#1a57ff', ring: '#ffffff', text: '#ffffff' }, home: { fill: '#1b2033', ring: '#f7d774', text: '#f7d774' } };
  const MOVE = { direkt: 'Direkt', kombi: 'Kombi', solo: 'Solo' }, STANCE = { block: 'Block', pass: 'Passweg', zwei: 'Zweikampf' };

  const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  function player(id, team, card, ghost) {
    const g = el('g', { id, class: 'pl' + (ghost ? ' ghost' : '') }), c = TEAM[team];
    el('ellipse', { cx: 2, cy: 8, rx: 22, ry: 11, fill: '#000', opacity: 0.28 }, g);
    const stick = el('g', { class: 'stick' }, g);
    el('line', { x1: 0, y1: 0, x2: 0, y2: -38, stroke: '#e9eefc', 'stroke-width': 4, 'stroke-linecap': 'round' }, stick);
    el('path', { d: 'M-1 -38 Q -1 -47 -11 -47', fill: 'none', stroke: '#e9eefc', 'stroke-width': 6, 'stroke-linecap': 'round' }, stick);
    el('circle', { r: 22, fill: ghost ? 'none' : c.fill, stroke: c.ring, 'stroke-width': 3, 'stroke-dasharray': ghost ? '4 4' : 'none', opacity: ghost ? 0.6 : 1 }, g);
    if (card) {
      const num = el('text', { y: 7.5, 'text-anchor': 'middle', 'font-size': 21, 'font-weight': 800, fill: c.text, 'font-family': "'Saira Condensed','Arial Narrow',sans-serif" }, g);
      num.textContent = card.no === null || card.no === undefined ? card.last.slice(0, 2).toUpperCase() : card.no;
      const lab = el('text', { y: 40, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#fff', 'letter-spacing': 1, class: 'lab', 'font-family': "'Saira Condensed','Arial Narrow',sans-serif" }, g);
      lab.textContent = card.last.toUpperCase();
    }
    return g;
  }
  function chip(id, text, tone) {
    const g = el('g', { id, class: 'chip ' + tone, opacity: 0 });
    const t = el('text', { y: 4.5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 800, 'letter-spacing': 1.2, 'font-family': "'Saira Condensed','Arial Narrow',sans-serif" });
    t.textContent = text.toUpperCase();
    const w = text.length * 7.6 + 16;
    el('rect', { x: -w / 2, y: -10, width: w, height: 19, rx: 4 }, g); g.appendChild(t);
    return g;
  }
  const at = (n, p, rot) => n.setAttribute('transform', `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})` + (rot !== undefined ? ` rotate(${rot.toFixed(0)})` : ''));

  /* Bahnen für Angreifer (A), Verteidiger (D), Ball (B) und Mitspieler (Mt) aus dem Ereignis der Engine. */
  function tracks(e) {
    const mv = e.move, c = C[mv], spot = SPOT[e.stance], stop = !e.ok;
    const commit = t => lerp(D0, spot, io(seg(t, 0.08, 0.36)));
    const D = stop
      ? t => (t < 0.42 ? commit(t) : t < TC ? lerp(spot, c, io(seg(t, 0.42, TC))) : lerp(c, add(c, [0, 40]), io(seg(t, TC + 0.1, 1))))
      : t => (t < 0.42 ? commit(t) : lerp(spot, lerp(spot, c, e.read ? 0.35 : 0.62), out(seg(t, 0.42, TC + 0.03))));
    const withD = t => add(D(t), [9, 11]);
    let A, B, Mt = null;
    if (mv === 'direkt') {
      const rel = [184, 250], hit = stop ? add(c, [0, 10]) : e.read ? add(c, [6, 4]) : add(c, [2, 0]);
      A = t => (t < 0.5 ? lerp(A0, [182, 262], io(seg(t, 0, 0.48))) : lerp([182, 262], [182, 256], seg(t, 0.5, 0.7)));
      B = t => {
        if (t < 0.5) return add(A(t), [3, -13]);
        if (t < TC) return lerp(rel, hit, seg(t, 0.5, TC));
        if (stop) return lerp(hit, withD(t), out(seg(t, TC, TC + 0.1)));
        return lerp(hit, e.read ? [214, 40] : [181, 40], seg(t, TC, 1));
      };
    } else if (mv === 'kombi') {
      const go = u => bez(A0, [262, 250], R, u), Ms = add(M, [10, -6]);
      Mt = t => [M[0], M[1], Math.min(0.85, t * 6)];
      A = t => (t < 0.8 || stop ? go(io(seg(t, 0.05, 0.8)) * (stop && t > TC ? 1 : 1)) : lerp(R, [214, 92], seg(t, 0.8, 1)));
      B = t => {
        if (t < 0.18) return add(A(t), [-6, -12]);
        if (t < 0.34) return lerp(add(A(0.18), [-6, -12]), Ms, seg(t, 0.18, 0.34));
        if (t < 0.48) return Ms;
        const to = stop ? c : e.read ? add(c, [4, -9]) : c;
        if (t < TC) return lerp(Ms, to, seg(t, 0.48, TC));
        if (stop) return lerp(to, withD(t), out(seg(t, TC, TC + 0.1)));
        if (t < 0.8) return lerp(to, add(R, [-4, -12]), seg(t, TC, 0.8));
        return add(A(t), [-4, -12]);
      };
    } else {
      const off = t => (e.read && !stop ? [16 * Math.sin(Math.PI * seg(t, 0.48, 0.86)), 0] : [0, 0]);
      A = t => {
        const u = t < TC ? 0.5 * seg(t, 0, TC) : stop ? 0.5 + 0.07 * seg(t, TC, 1) : 0.5 + 0.5 * seg(t, TC, 1);
        return add(P(u), off(t));
      };
      B = t => (stop && t >= TC ? lerp(add(A(TC), [-3, -13]), withD(t), out(seg(t, TC, TC + 0.1))) : add(A(t), [-3, -13]));
    }
    return { A, D, B, Mt, c };
  }

  let wake = null;
  function play(e, o) {
    const svg = $('field'), zoom = $('fz'), vig = $('vignette');
    const tk = tracks(e);
    zoom.innerHTML = '';
    const mt = tk.Mt ? zoom.appendChild(player('f-m', o.attSide, null, true)) : null;
    const d = zoom.appendChild(player('f-d', o.attSide === 'you' ? 'home' : 'you', o.def));
    const a = zoom.appendChild(player('f-a', o.attSide, o.att));
    const ball = el('circle', { r: 7, fill: '#fff', stroke: '#c4cde6', 'stroke-width': 1.5 }, zoom);
    const ca = zoom.appendChild(chip('f-ca', MOVE[e.move], 'att')), cd = zoom.appendChild(chip('f-cd', STANCE[e.stance], e.read ? (o.readGood ? 'good' : 'bad') : 'plain'));
    // Keeper oben im Tor, in den Farben der verteidigenden Seite
    $('fkeeper').setAttribute('fill', TEAM[o.attSide === 'you' ? 'home' : 'you'].fill);
    $('fkeeper').setAttribute('stroke', TEAM[o.attSide === 'you' ? 'home' : 'you'].ring);
    const prev = {};
    const face = (n, k, p) => { const q = prev[k] || p, dx = p[0] - q[0], dy = p[1] - q[1]; prev[k] = p; if (Math.abs(dx) + Math.abs(dy) > 0.2) n.querySelector('.stick').setAttribute('transform', `rotate(${(Math.atan2(dy, dx) * 180 / Math.PI + 90 + 35).toFixed(0)})`); };
    let shown = { ca: false, cd: false, hit: false };
    function draw(t) {
      const pa = tk.A(t), pd = tk.D(t), pb = tk.B(t);
      at(a, pa); at(d, pd); face(a, 'a', pa); face(d, 'd', pd);
      ball.setAttribute('cx', pb[0].toFixed(1)); ball.setAttribute('cy', pb[1].toFixed(1));
      if (mt) { const m = tk.Mt(t); at(mt, m); mt.setAttribute('opacity', m[2]); }
      at(ca, add(pa, [0, 58])); at(cd, add(pd, [0, -40]));
      ca.setAttribute('opacity', Math.min(1, t * 8));
      cd.setAttribute('opacity', seg(t, 0.3, 0.38));
      if (!shown.cd && t >= 0.3) { shown.cd = true; if (o.onCommit) o.onCommit(); }
      if (!shown.hit && t >= TC) { shown.hit = true; if (o.onContact) o.onContact(); }
      // Zeitlupe: Kamera zoomt auf den Treffpunkt, Ränder werden dunkler
      const z = Math.sin(Math.PI * seg(t, SLOW[0] - 0.04, SLOW[1] + 0.06)), k = 1 + 0.22 * z, f = tk.c;
      zoom.setAttribute('transform', `translate(${f[0]} ${f[1]}) scale(${k.toFixed(3)}) translate(${-f[0]} ${-f[1]})`);
      vig.style.opacity = (0.75 * z).toFixed(2);
    }
    svg.parentNode.hidden = false;
    if (o.fast()) { draw(1); return Promise.resolve(); }
    if (reduce) { draw(0); return new Promise(r => { const id = setTimeout(() => { draw(1); vig.style.opacity = 0; r(); }, 450); wake = () => { clearTimeout(id); draw(1); vig.style.opacity = 0; r(); }; }); }
    return new Promise(res => {
      let t = 0, last = performance.now();
      wake = () => { t = 1; };
      (function tick(now) {
        if (o.fast()) t = 1;
        const dt = Math.min(64, now - last); last = now;
        t = Math.min(1, t + dt / BASE * (t > SLOW[0] && t < SLOW[1] ? RATE : 1));
        draw(t);
        if (t < 1) requestAnimationFrame(tick); else { vig.style.opacity = 0; zoom.setAttribute('transform', ''); draw(1); wake = null; res(); }
      })(last);
    });
  }
  function hide() { const f = $('field'); if (f) f.parentNode.hidden = true; $('vignette').style.opacity = 0; }
  function skip() { if (wake) wake(); }
  return { play, hide, skip };
})();
