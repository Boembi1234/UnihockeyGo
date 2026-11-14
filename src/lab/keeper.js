/* Goalie als Figur mit Gelenken (Torsicht): kniend, Gitterhelm, Trikot mit farbigen Ärmeln, schwarze Handschuhe, schwarze
   Hose mit weissem Streifen. Nicht die ganze Figur bewegt sich als ein Bild, sondern Becken, Oberkörper, Kopf, beide Arme
   (Schulter, Ellbogen, Hand) und beide Beine (Hüfte, Knie, Fuss) einzeln.
   Koordinaten wie die Torsicht: 360 breit, Boden bei y = 236, Tor von x = 78 bis 282 und y = 88 bis 236.
   Eine Haltung (pose) ist: x und y des Beckens, Neigung des Oberkörpers (lean, Grad), Kopfneigung (head), dazu die Ziele für
   Hände (lh, rh), Knie (lk, rk) und Füsse (lf, rf), jeweils [Abstand in x vom Becken, y]. Die Ellbogen ergeben sich daraus.
   HKKeeper.create(host, team) baut die Figur, .set(pose) zeigt eine Haltung, .to(pose, ms) bewegt sie dorthin.
   ready, shuffle und save liefern Haltungen: bereit, seitlich rutschen, Parade zu einem Punkt. */
(function (root) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg', OUT = '#0b1020', PANTS = '#1c1d22', STRIPE = '#eef1f7', GLOVE = '#15161a', GROUND = 236;
  const TEAM = {
    you: { helm: '#2449dc', helm2: '#6283f5', sleeve: '#2449dc', body: '#f4f6fb', fold: '#c7cfe0', num: '#2449dc' },
    home: { helm: '#e6b034', helm2: '#f8dc8a', sleeve: '#e6b034', body: '#262c42', fold: '#151a2b', num: '#f3c659' }
  };
  const LEN = { torso: 54, sh: 27, hip: 11, upper: 26, fore: 25 };
  const READY = { y: 197, lean: 0, head: 0, lh: [-53, 185], rh: [53, 185], lk: [-28, 230], rk: [28, 230], lf: [-58, 228], rf: [58, 228] };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const el = (tag, a, parent) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (parent) parent.appendChild(n); return n; };
  const copy = p => ({ x: p.x, y: p.y, lean: p.lean, head: p.head, lh: p.lh.slice(), rh: p.rh.slice(), lk: p.lk.slice(), rk: p.rk.slice(), lf: p.lf.slice(), rf: p.rf.slice() });
  const KEYS = ['lh', 'rh', 'lk', 'rk', 'lf', 'rf'];
  function mix(a, b, t) { const m = v => a[v] + (b[v] - a[v]) * t, p = { x: m('x'), y: m('y'), lean: m('lean'), head: m('head') }; KEYS.forEach(k => { p[k] = [a[k][0] + (b[k][0] - a[k][0]) * t, a[k][1] + (b[k][1] - a[k][1]) * t]; }); return p; }

  // --- Haltungen ---
  const ready = x => Object.assign(copy(Object.assign({ x }, READY)));
  /* Seitlich rutschen: Das Bein in Laufrichtung setzt vor, das andere stösst nach, die Hände pendeln gegengleich, der
     Oberkörper neigt sich leicht in die Richtung. dir: -1 links, 1 rechts, 0 steht. phase läuft mit dem Weg. */
  function shuffle(x, dir, phase) {
    const p = ready(x), s = Math.sin(phase), lead = Math.max(0, s), push = Math.max(0, -s), L = dir < 0 ? 'l' : 'r', T = dir < 0 ? 'r' : 'l', sg = dir < 0 ? -1 : 1;
    if (!dir) return p;
    p.lean = sg * 5; p.head = -sg * 2; p.y = 197 + 1.6 * Math.cos(phase * 2);
    p[L + 'k'][0] += sg * 9 * lead; p[L + 'f'][0] += sg * 7 * lead; p[L + 'k'][1] -= 3 * lead;
    p[T + 'f'][0] -= sg * 10 * push; p[T + 'k'][0] -= sg * 4 * push;
    p.lh[1] += 4 * s * sg; p.rh[1] -= 4 * s * sg; p[L + 'h'][0] += sg * 5;
    return p;
  }
  /* Parade zum Punkt T (Torsicht). Je nach Höhe und Abstand:
     nah am Körper: beide Hände an den Ball. Flach: das Bein auf der Seite fährt aus, die Hand geht darüber.
     Sonst: die Hand auf der Seite greift, der Oberkörper neigt sich; reicht das nicht, rutscht und kippt die ganze Figur
     und das andere Bein stösst ab. opt.short: so viele Einheiten bleibt die Hand oder der Fuss vor dem Ball (kein Halten). */
  function save(x0, T, opt) {
    const o = opt || {}, sg = T[0] < x0 ? -1 : 1, adx = Math.abs(T[0] - x0), N = sg < 0 ? 'l' : 'r', F = sg < 0 ? 'r' : 'l', short = o.short || 0;
    const ty = clamp(T[1], 92, 233), p = ready(x0), low = ty >= 200;
    if (adx < 24 && !low) {                                   // auf den Körper: beide Hände
      p.x = x0 + (T[0] - x0) * 0.7; const dx = T[0] - p.x;
      p.lh = [dx - 7, ty + 1]; p.rh = [dx + 7, ty + 1]; p.head = ty < 150 ? -4 * sg : 0; p.y = ty < 135 ? 193 : 197;
      return p;
    }
    if (low) {                                                // flach: Beinparade
      const reach = 82, shift = Math.max(0, adx - short - reach); p.x = x0 + sg * shift;
      const fx = sg * Math.max(34, Math.min(reach, adx - shift - short)), far = Math.abs(fx) / reach;
      p[N + 'f'] = [fx, Math.min(229, ty + 1)]; p[N + 'k'] = [fx * 0.52, 231 - 2 * far];
      p[F + 'k'] = [-sg * (27 - 6 * far), 230]; p[F + 'f'] = [-sg * (54 - 8 * far), 228];
      p.y = 199 + 3 * far; p.lean = sg * (8 + 14 * far + shift * 0.25); p.head = sg * 4;
      p[N + 'h'] = [fx - sg * 12, ty - 22]; p[F + 'h'] = [-sg * 46, 166];
      return p;
    }
    // Handparade, bei grossem Abstand als Hechtsprung
    const span = 92 + (ty < 150 ? 6 : 0), shift = Math.max(0, adx - short - span), dive = clamp(shift / 46, 0, 1);
    p.x = x0 + sg * shift; p.lean = sg * (clamp((adx - shift) * 0.33, 0, 28) + 30 * dive); p.head = sg * (4 + 8 * dive);
    const hx = sg * Math.max(14, adx - shift - short);
    p[N + 'h'] = [hx, ty]; p[F + 'h'] = dive > 0.3 ? [hx - sg * 22, ty + 15] : [-sg * 40, ty < 150 ? 170 : 190];
    p.y = 197 - 5 * dive - (ty < 140 ? 3 : 0);
    p[N + 'k'] = [sg * (28 - 6 * dive), 230]; p[N + 'f'] = [sg * (56 - 14 * dive), 228];
    p[F + 'k'] = [-sg * (28 + 9 * dive), 230 - 2 * dive]; p[F + 'f'] = [-sg * (58 + 20 * dive), 228 - 3 * dive];   // das andere Bein stösst ab
    return p;
  }

  // --- Figur ---
  // Ellbogen aus Schulter und Hand (zwei Glieder). Von den zwei Lösungen die, die nach aussen und unten zeigt.
  function elbow(S, H, side) {
    let dx = H[0] - S[0], dy = H[1] - S[1], d = Math.hypot(dx, dy) || 0.001; const m = LEN.upper + LEN.fore - 0.6;
    if (d > m) { dx *= m / d; dy *= m / d; d = m; }
    const a = (LEN.upper * LEN.upper - LEN.fore * LEN.fore + d * d) / (2 * d), h = Math.sqrt(Math.max(0, LEN.upper * LEN.upper - a * a)), ux = dx / d, uy = dy / d;
    const A = [S[0] + ux * a - uy * h, S[1] + uy * a + ux * h], B = [S[0] + ux * a + uy * h, S[1] + uy * a - ux * h];
    const score = E => side * (E[0] - S[0]) + 0.55 * (E[1] - S[1]);
    return { E: score(A) >= score(B) ? A : B, H: [S[0] + dx, S[1] + dy] };
  }
  function create(host, team) {
    const c = TEAM[team] || TEAM.you;
    host.innerHTML = '';
    const svg = el('svg', { viewBox: '0 0 360 260', 'aria-hidden': 'true' }, host);
    svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible';
    const line = (g, col, w) => el('line', { stroke: col, 'stroke-width': w, 'stroke-linecap': 'round' }, g);
    const put = (l, a, b) => { l.setAttribute('x1', a[0].toFixed(1)); l.setAttribute('y1', a[1].toFixed(1)); l.setAttribute('x2', b[0].toFixed(1)); l.setAttribute('y2', b[1].toFixed(1)); };
    // Kette aus zwei Gliedern: erst beide Umrisse, dann beide Füllungen, damit am Gelenk keine Linie quer durchgeht
    const chain = (g, col, w1, w2) => { const o1 = line(g, OUT, w1 + 4.6), o2 = line(g, OUT, w2 + 4.6); return [o1, o2, line(g, col, w1), line(g, col, w2)]; };
    const sole = () => { const g = el('g', {}, svg); el('ellipse', { rx: 13.5, ry: 7.6, fill: PANTS, stroke: OUT, 'stroke-width': 2.4 }, g); el('path', { d: 'M-11 4 Q0 8.8 11 4', fill: 'none', stroke: STRIPE, 'stroke-width': 2.2, 'stroke-linecap': 'round' }, g); return g; };
    const shoeL = sole(), shoeR = sole();
    const gLeg = el('g', {}, svg), legL = chain(gLeg, PANTS, 25, 18), legR = chain(gLeg, PANTS, 25, 18);
    const stripes = [0, 1, 2, 3].map(() => line(gLeg, STRIPE, 2.6));
    const hips = el('ellipse', { rx: 26, ry: 14, fill: PANTS, stroke: OUT, 'stroke-width': 2.3 }, svg);
    // Oberkörper: Trikot mit Falten und Nummer, dreht sich um das Becken
    const torso = el('g', {}, svg), T = LEN.torso;
    el('path', { d: `M-31 ${-T + 6} L-11 ${-T - 3} Q0 ${-T + 3} 11 ${-T - 3} L31 ${-T + 6} L30 ${-T + 26} L25 4 Q0 14 -25 4 L-30 ${-T + 26} Z`, fill: c.body, stroke: OUT, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, torso);
    el('path', { d: `M-17 -7 Q-5 -13 8 -26 M-21 -21 Q-12 -25 -5 -35 M11 -5 Q18 -10 22 -19`, fill: 'none', stroke: c.fold, 'stroke-width': 2.6, 'stroke-linecap': 'round' }, torso);
    const num = el('text', { x: 0, y: -T * 0.42, 'text-anchor': 'middle', 'font-family': "'Saira Condensed','Arial Narrow',sans-serif", 'font-weight': 800, 'font-size': 24, fill: c.num }, torso); num.textContent = '1';
    el('ellipse', { cx: 0, cy: -T - 1, rx: 11, ry: 6.5, fill: '#101116', stroke: OUT, 'stroke-width': 2 }, torso);
    // Arme: Ärmel in der Vereinsfarbe, weisse Manschette, schwarzer Handschuh mit gespreizten Fingern
    const gArm = el('g', {}, svg), armL = chain(gArm, c.sleeve, 18.5, 15.5), armR = chain(gArm, c.sleeve, 18.5, 15.5);
    const cuffL = line(gArm, STRIPE, 15.5), cuffR = line(gArm, STRIPE, 15.5);
    const glove = () => { const g = el('g', {}, svg); el('path', { d: 'M-4.6 -8 L-6.8 -16 M-1.4 -9 L-1.9 -18.5 M2 -9 L3 -18 M5 -7.5 L8 -15 M-6 -1 L-12.5 -5', fill: 'none', stroke: OUT, 'stroke-width': 6.4, 'stroke-linecap': 'round' }, g); el('ellipse', { cx: 0, cy: -3.5, rx: 7.6, ry: 8, fill: GLOVE, stroke: OUT, 'stroke-width': 2.2 }, g); el('path', { d: 'M-4.6 -8 L-6.8 -16 M-1.4 -9 L-1.9 -18.5 M2 -9 L3 -18 M5 -7.5 L8 -15 M-6 -1 L-12.5 -5', fill: 'none', stroke: GLOVE, 'stroke-width': 3.4, 'stroke-linecap': 'round' }, g); return g; };
    const handL = glove(), handR = glove();
    // Kopf: Helm mit Gitter
    const head = el('g', {}, svg);
    el('path', { d: 'M-17 -17 C-19 -38 -8 -44 0 -44 C9 -44 19 -38 17 -17 C17 -8 12 -2 7 1 L-7 1 C-12 -2 -17 -8 -17 -17 Z', fill: c.helm, stroke: OUT, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, head);
    el('path', { d: 'M-9 -40 C-3 -43 4 -43 9 -40 M-13 -34 C-14 -30 -14.5 -26 -14.5 -22', fill: 'none', stroke: c.helm2, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, head);
    el('rect', { x: -11.5, y: -28, width: 23, height: 20, rx: 4.5, fill: '#090a0e', stroke: OUT, 'stroke-width': 1.6 }, head);
    el('path', { d: 'M-11.5 -21.5 H11.5 M-11.5 -14.5 H11.5 M-5.8 -28 V-8 M0 -28 V-8 M5.8 -28 V-8', fill: 'none', stroke: '#e9edf5', 'stroke-width': 1.25 }, head);
    el('rect', { x: -11.5, y: -28, width: 23, height: 20, rx: 4.5, fill: 'none', stroke: '#e9edf5', 'stroke-width': 1.5 }, head);

    function draw(p) {
      const x = p.x, y = p.y, a = p.lean * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), at = (dx, dy) => [x + dx * ca - dy * sa, y + dx * sa + dy * ca];
      const neck = at(0, -T), SL = at(-LEN.sh, -T + 7), SR = at(LEN.sh, -T + 7), HL0 = [x - LEN.hip, y + 2], HR0 = [x + LEN.hip, y + 2];
      const KL = [x + p.lk[0], p.lk[1]], KR = [x + p.rk[0], p.rk[1]], FL = [x + p.lf[0], p.lf[1]], FR = [x + p.rf[0], p.rf[1]];
      // Beine
      [[legL, HL0, KL, FL, shoeL, -1, 0], [legR, HR0, KR, FR, shoeR, 1, 2]].forEach(L => {
        put(L[0][0], L[1], L[2]); put(L[0][2], L[1], L[2]); put(L[0][1], L[2], L[3]); put(L[0][3], L[2], L[3]);
        const ang = Math.atan2(L[3][1] - L[2][1], L[3][0] - L[2][0]) * 180 / Math.PI;
        L[4].setAttribute('transform', `translate(${L[3][0].toFixed(1)} ${L[3][1].toFixed(1)}) rotate(${(L[5] < 0 ? ang - 180 : ang).toFixed(1)})`);
        // weisser Streifen aussen an Oberschenkel und Unterschenkel
        [[L[1], L[2], 8.6], [L[2], L[3], 5.6]].forEach((sgm, i) => { const dx = sgm[1][0] - sgm[0][0], dy = sgm[1][1] - sgm[0][1], d = Math.hypot(dx, dy) || 1; let nx = -dy / d, ny = dx / d; if (nx * L[5] < 0 || (Math.abs(nx) < 0.2 && ny > 0)) { nx = -nx; ny = -ny; } put(stripes[L[6] + i], [sgm[0][0] + nx * sgm[2] + dx * 0.12, sgm[0][1] + ny * sgm[2] + dy * 0.12], [sgm[1][0] + nx * sgm[2] - dx * 0.08, sgm[1][1] + ny * sgm[2] - dy * 0.08]); });
      });
      hips.setAttribute('cx', x.toFixed(1)); hips.setAttribute('cy', (y + 3).toFixed(1));
      torso.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${p.lean.toFixed(1)})`);
      // Arme
      [[armL, SL, p.lh, -1, cuffL, handL], [armR, SR, p.rh, 1, cuffR, handR]].forEach(A => {
        const k = elbow(A[1], [x + A[2][0], A[2][1]], A[3]), E = k.E, H = k.H;
        put(A[0][0], A[1], E); put(A[0][2], A[1], E); put(A[0][1], E, H); put(A[0][3], E, H);
        const dx = H[0] - E[0], dy = H[1] - E[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
        A[4].setAttribute('stroke-linecap', 'butt'); put(A[4], [H[0] - ux * 5.5, H[1] - uy * 5.5], [H[0] - ux * 1.5, H[1] - uy * 1.5]);
        A[5].setAttribute('transform', `translate(${(H[0] + ux * 3).toFixed(1)} ${(H[1] + uy * 3).toFixed(1)}) rotate(${(Math.atan2(uy, ux) * 180 / Math.PI + 90).toFixed(1)}) scale(${A[3] < 0 ? 1.25 : -1.25} 1.25)`);
      });
      head.setAttribute('transform', `translate(${neck[0].toFixed(1)} ${neck[1].toFixed(1)}) rotate(${(p.lean * 0.55 + p.head).toFixed(1)}) scale(1.16)`);
    }
    let cur = ready(180), raf = 0;
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const api = {
      pose: () => cur,
      set(p) { stop(); cur = copy(p); draw(cur); },
      // weich zur neuen Haltung: schnell los, sanft ankommen
      to(p, ms, done) {
        stop(); const a = copy(cur), b = copy(p), t0 = performance.now(), dur = Math.max(1, ms);
        (function step(now) { const k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3); cur = mix(a, b, e); draw(cur); if (k < 1) raf = requestAnimationFrame(step); else if (done) done(); })(t0);
      },
      // bereit stehen und leicht federn, bis die nächste Haltung kommt
      idle() {
        stop(); const base = copy(cur), t0 = performance.now();
        (function step(now) { const t = (now - t0) / 1000, p = copy(base), s = Math.sin(t * 5.2); p.y += 1.4 * s; p.lh[1] += 2.4 * s; p.rh[1] += 2.4 * s; p.lh[0] -= 1.5 * s; p.rh[0] += 1.5 * s; cur = p; draw(p); raf = requestAnimationFrame(step); })(t0);
      },
      stop
    };
    draw(cur);
    return api;
  }
  root.HKKeeper = { create, ready, shuffle, save, GROUND };
})(typeof window !== 'undefined' ? window : globalThis);
