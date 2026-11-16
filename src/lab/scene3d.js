/* 3D-Szenen für das Match: eine Halle mit Tor, Netz und Tribüne und Knetfiguren, die das Ergebnis einer Aktion zeigen
   (Pass, Dribbling, Schuss). Reines Zuschauen: Die Szene bekommt, was passiert ist, und spielt es ab.
   Braucht three.js (window.THREE). Fehlt es oder gibt es kein WebGL, meldet ok() false, und das Match zeigt die Aktion
   wie bisher von oben.
   Stil: Knete statt Realismus. Grosser Kopf, Kulleraugen, breites Lachen, kurze dicke Arme und Beine, Fäustlinge, grosse
   runde Schuhe, alles leicht unrund und mit Fingerabdrücken in der Oberfläche. Die Figuren federn, strecken und stauchen sich.
   Orte: Die Szene rechnet in Metern. Aus dem Feld des Matchs (360 breit, Tor bei x 180, y 40) wird x = (x - 180) * S,
   z = (y - 40) * S: Das Tor steht bei z = 0, das Feld liegt bei positivem z, die Kamera schaut meist Richtung Tor.
   Figuren: Jede Haltung ist ein Satz Zahlen (Becken, Füsse, Stock, Hände, Gesicht). Arme und Beine folgen über zwei Glieder
   mit Gelenk (Schulter-Ellbogen, Hüfte-Knie), damit die Hände am Stock und die Füsse am Boden bleiben. */
(function () {
  'use strict';
  const S = 0.05, GW = 0.9, GH = 1.2, GD = 0.65;                 // Massstab, halbe Torbreite, Torhöhe, Tortiefe
  const LEN = 0.86, LIE = 0.8, FLOOR = 0.055;                    // Stocklänge, Winkel der Schaufel zum Schaft, Höhe der Schaufel am Boden
  const A1 = 0.2, A2 = 0.2, T1 = 0.2, T2 = 0.2, ANK = 0.1, SHX = 0.225, SHY = 0.33, HPX = 0.12, HPY = -0.07, NECK = 0.44, KH = 0.3, KSX = 0.27;
  const wx = x => (x - 180) * S, wz = y => (y - 40) * S, RAD = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), out = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3), seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const bounce = t => { const n = 7.5625, d = 2.75; t = clamp(t, 0, 1); return t < 1 / d ? n * t * t : t < 2 / d ? n * (t -= 1.5 / d) * t + 0.75 : t < 2.5 / d ? n * (t -= 2.25 / d) * t + 0.9375 : n * (t -= 2.625 / d) * t + 0.984375; };
  const TEAM = {
    you: { jersey: 0x1c56e0, trim: 0xfafafa, shorts: 0x16277c, sock: 0x1c56e0, shoe: 0x1a2668, num: '#ffffff', shaft: 0xf4f1e8, blade: 0xffffff, fans: [0x2f6dff, 0xeef2ff, 0x123aa8], keeper: 0xf3f1ea, helmet: 0x2553d6, glove: 0xe23b30 },
    home: { jersey: 0x282a33, trim: 0xf2c94c, shorts: 0x1f2028, sock: 0xd9a93a, shoe: 0x17181d, num: '#f2c94c', shaft: 0x2a2b33, blade: 0xe0b23c, fans: [0xf7d774, 0x2a2e42, 0xc9972a], keeper: 0x3a3f5c, helmet: 0xe0b23c, glove: 0xf2c94c }
  };
  const SKIN = [0xf2bf96, 0xe8a877, 0xc98c5e, 0x9a6540, 0xf6d2b4], HAIR = [0x6b4226, 0x2a1b12, 0x16130f, 0xd9a441, 0xa8431c, 0x8a5a2b], BRIGHT = [0x3fae5a, 0xf2c230, 0xe8553d, 0xf08a2e, 0xffffff, 0xb15be0];
  const hashOf = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  let T = null, R = null, broken = false;      // THREE, alles einmal Gebaute, und ob die Darstellung ausgefallen ist

  function ok() {
    if (broken || !window.THREE) return false;
    if (R) return true;
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  }

  // --- Bausteine ---
  // Knete: matt, mit feinen Dellen und Fingerabdrücken in der Oberfläche
  const mat = (color, o) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.82, metalness: 0, bumpMap: R.bump, bumpScale: 0.0035 }, o));
  function mesh(geo, m, parent, x, y, z) { const o = new T.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; if (parent) parent.add(o); return o; }
  function deco(geo, m, parent, x, y, z) { const o = mesh(geo, m, parent, x, y, z); o.castShadow = false; return o; }      // Kleinteile ohne Schatten
  function group(parent, x, y, z) { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; }
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; }
  const FONT = '"Saira Condensed","Arial Narrow",Arial,sans-serif', texCache = {};
  const cached = (key, make) => texCache[key] || (texCache[key] = make());
  // Mehrere Geometrien zu einer (Ort, Normale, Textur-Ort, Index)
  function merge(parts) {
    let nv = 0, ni = 0; parts.forEach(g => { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new (nv > 65535 ? Uint32Array : Uint16Array)(ni); let vo = 0, io = 0;
    parts.forEach(g => {
      const n = g.attributes.position.count; pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, vo * 2);
      if (g.index) for (let i = 0; i < g.index.count; i++) idx[io++] = g.index.array[i] + vo; else for (let i = 0; i < n; i++) idx[io++] = vo + i;
      vo += n;
    });
    const o = new T.BufferGeometry(); o.setAttribute('position', new T.BufferAttribute(pos, 3)); o.setAttribute('normal', new T.BufferAttribute(nor, 3)); o.setAttribute('uv', new T.BufferAttribute(uv, 2)); o.setIndex(new T.BufferAttribute(idx, 1)); return o;
  }
  // Von Hand geformt: schiebt die Oberfläche leicht unregelmässig nach innen und aussen
  function lump(geo, amp, f, seed) {
    const p = geo.attributes.position, n = geo.attributes.normal;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = (Math.sin(x * f + seed) * Math.cos(y * f * 1.3 + seed * 2) + Math.sin(z * f * 0.9 + seed * 3 + x * f * 0.5)) * 0.5 * amp; p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d); }
    geo.computeVertexNormals(); return geo;
  }

  // Hallenboden mit Linien, wie im Match von oben: 360 breit, 720 lang
  function floorTex() {
    return canvasTex(1024, 2048, (g, w, h) => {
      const k = w / 360, gr = g.createRadialGradient(w / 2, h * 0.22, 60, w / 2, h * 0.22, h * 0.7); gr.addColorStop(0, '#2f6fe2'); gr.addColorStop(1, '#173f9e');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,10,60'},${0.012 + r() * 0.03})`; g.beginPath(); g.ellipse(r() * w, r() * h, 10 + r() * 70, 6 + r() * 30, r() * 3.14, 0, 7); g.fill(); }      // Gebrauchsspuren
      g.strokeStyle = 'rgba(255,255,255,.86)'; g.lineWidth = 9; g.lineCap = 'round'; const L = (x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x1 * k, y1 * k); g.lineTo(x2 * k, y2 * k); g.stroke(); };
      L(4, 400, 356, 400); g.beginPath(); g.arc(180 * k, 400 * k, 7 * k, 0, 7); g.fillStyle = 'rgba(255,255,255,.86)'; g.fill();
      g.strokeRect(130 * k, 22 * k, 100 * k, 80 * k); g.fillStyle = 'rgba(130,180,255,.42)'; g.fillRect(155 * k, 36 * k, 50 * k, 20 * k); g.strokeRect(155 * k, 36 * k, 50 * k, 20 * k);
      g.lineWidth = 7; [[70, 110], [290, 110], [70, 400], [290, 400]].forEach(p => { L(p[0] - 6, p[1], p[0] + 6, p[1]); L(p[0], p[1] - 6, p[0], p[1] + 6); });
    });
  }
  function netTex() { return canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.96)'; g.lineWidth = 5; for (let i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }); }
  const numTex = (no, color) => cached('n' + no + color, () => canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = color; g.font = '800 104px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(no), w / 2, h / 2 + 6); }));
  const nameTex = name => cached('l' + name, () => canvasTex(512, 112, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.font = '800 60px ' + FONT; const tw = Math.min(w - 60, g.measureText(name.toUpperCase()).width), bw = tw + 56, x0 = (w - bw) / 2;
    g.fillStyle = 'rgba(5,8,24,.82)'; g.beginPath(); g.moveTo(x0 + 26, 14); g.arcTo(x0 + bw, 14, x0 + bw, h - 14, 26); g.arcTo(x0 + bw, h - 14, x0, h - 14, 26); g.arcTo(x0, h - 14, x0, 14, 26); g.arcTo(x0, 14, x0 + bw, 14, 26); g.fill();
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name.toUpperCase(), w / 2, h / 2 + 4, w - 60);
  }));
  // Leuchtband vor der Tribüne: bunte Punkte wie eine LED-Wand
  function ledTex(words, bg) {
    const t = canvasTex(2048, 128, (g, w, h) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h); g.font = '800 92px ' + FONT; g.textBaseline = 'middle';
      let x = 30, i = 0; while (x < w - 60) { const wd = words[i % words.length]; g.fillStyle = wd[1]; g.shadowColor = wd[1]; g.shadowBlur = 16; g.fillText(wd[0], x, h / 2 + 6); x += g.measureText(wd[0]).width + 46; i++; }
      g.shadowBlur = 0; g.fillStyle = 'rgba(0,0,0,.36)'; for (let q = 0; q < w; q += 6) g.fillRect(q, 0, 2, h); for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2);
    });
    t.wrapS = T.RepeatWrapping; return t;
  }
  function glowTex() { return canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,238,205,.55)'); r.addColorStop(1, 'rgba(255,220,170,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }); }
  // Dellen und Fingerabdrücke für die Knete (als Höhenbild)
  function bumpTex() {
    const t = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); let s = 99; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = 0; i < 320; i++) { const v = r() < 0.5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},${0.04 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 26, 4 + r() * 14, r() * 3.14, 0, 7); g.fill(); }
      g.lineWidth = 1.2; for (let i = 0; i < 9; i++) { const x = r() * w, y = r() * h; for (let k = 0; k < 6; k++) { const v = k % 2 ? 255 : 0; g.strokeStyle = `rgba(${v},${v},${v},.045)`; g.beginPath(); g.ellipse(x, y, 5 + k * 2.6, 3.5 + k * 2, i, 0, 7); g.stroke(); } }
    });
    t.encoding = T.LinearEncoding; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2, 2); return t;
  }
  function ballTex() { return canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#8f98ab'; for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) { g.beginPath(); g.arc(c * 32 + (r % 2 ? 16 : 0) + 8, 28 + r * 36, 9, 0, 7); g.fill(); } }); }
  function bladeTex() { return canvasTex(128, 48, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(20,24,40,.5)'; for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) g.fillRect(14 + c * 22, 9 + r * 18, 13, 10); }); }

  /* --- Haltung als Zahlenreihe ---
     Alles im Raum der Figur: Füsse bei y 0, Blick nach +z, der Stock auf der Seite +x. Wer den Stock auf der anderen Seite
     führt, bekommt die Haltung gespiegelt. N heisst die Seite -x, P die Seite +x.
     MOUTH: -1 Mundwinkel unten, 0 Lachen, 1 offen. BROW: 1 grimmig, -1 betrübt. BRY: Brauen hoch. SQ: gestreckt (> 1) oder gestaucht. */
  const PX = 0, PY = 1, PZ = 2, HIPY = 3, LEAN = 4, TW = 5, SIDE = 6, HX = 7, HY = 8, FN = 9, PN = 12, FP = 13, PP = 16, TP = 17, BL = 20, WN = 23, HN = 24, WP = 27, HP = 28, MOUTH = 31, BROW = 32, BRY = 33, SQ = 34, NP = 35;
  const setv = (g, i, x, y, z) => { g[i] = x; g[i + 1] = y; g[i + 2] = z; };
  // Stock: oberes Ende, Richtung in Grad (0 = zur Stockseite, 90 = nach vorn), Neigung in Grad oder null für «Schaufel am Boden»
  function stick(g, tx, ty, tz, psi, eps) {
    const sinE = eps == null ? clamp((FLOOR - ty) / LEN, -1, 1) : Math.sin(eps * RAD), cosE = Math.sqrt(1 - sinE * sinE);
    setv(g, TP, tx, ty, tz); setv(g, BL, tx + LEN * cosE * Math.cos(psi * RAD), ty + LEN * sinE, tz + LEN * cosE * Math.sin(psi * RAD));
  }
  const floorEps = ty => Math.asin(clamp((FLOOR - ty) / LEN, -1, 1)) / RAD;
  // Stützstellen: us aufsteigend von 0 bis 1, dazwischen weich; es[i] formt das Stück i
  function kf(u, us, vs, es) { for (let i = 1; i < us.length; i++) if (u <= us[i] || i === us.length - 1) { const k = seg(u, us[i - 1], us[i]), e = es && es[i - 1] ? es[i - 1](k) : ease(k); return lerp(vs[i - 1], vs[i], e); } return vs[vs.length - 1]; }
  const snap = k => Math.pow(k, 1.7), SU = [0, 0.4, 0.62, 1], SE = [ease, snap, out], REL = 0.62;      // Schuss: ausholen, durchziehen (Ball weg bei REL), ausschwingen
  // Kurze Beine, schnelle Schritte: Der Körper hüpft und streckt sich bei jedem Schritt
  function runLegs(P, g, k) {
    const f = P.cycle || 0, s = Math.sin(f), c = Math.cos(f);
    g[PY] = 0.5 - 0.02 * k + Math.abs(s) * 0.05 * k; g[LEAN] = 0.24 + 0.16 * k; g[TW] = s * 0.16; g[HIPY] = -s * 0.18; g[HX] = -0.18; g[SIDE] = s * 0.05; g[SQ] = 1 + Math.cos(2 * f) * 0.045 * k;
    setv(g, FN, -0.11, ANK + Math.max(0, c) * 0.15 * k, s * 0.21 * k + 0.02); g[PN] = 0.6 * (Math.max(0, c) + Math.max(0, -s) * 0.6);
    setv(g, FP, 0.11, ANK + Math.max(0, -c) * 0.15 * k, -s * 0.21 * k + 0.02); g[PP] = 0.6 * (Math.max(0, -c) + Math.max(0, s) * 0.6);
    return s;
  }
  function poseOf(P, t, g) {
    const a = P.anim, u = clamp((t - P.t0) / (P.dur || 1), 0, 1), w = t + P.ph;
    g.fill(0); g[SQ] = 1;
    // Grundhaltung: bereit, Knie gebeugt, Schaufel am Boden
    g[PY] = 0.48; g[LEAN] = 0.34; g[SIDE] = -0.08; g[HX] = -0.24;
    setv(g, FN, -0.17, ANK, -0.02); setv(g, FP, 0.17, ANK, 0.04);
    stick(g, -0.03, 0.64, 0.24, 25, null);
    if (a === 'idle') { const b = Math.sin(w * 2.6); g[PY] += b * 0.014; g[SQ] = 1 + b * 0.02; g[TP] += Math.sin(w * 1.3) * 0.012; g[HY] = Math.sin(w * 0.9) * 0.08; }
    else if (a === 'run') {
      const k = clamp(P.speed / 4.6, 0.4, 1.1), s = runLegs(P, g, k);
      if (P.ball) { stick(g, -0.04, 0.66, 0.26, 58 + s * 9, null); g[BROW] = 0.5; } else stick(g, -0.02, 0.68, 0.24, 32, -40);
    } else if (a === 'shot') {
      g[PY] = kf(u, SU, [0.48, 0.43, 0.47, 0.54], SE); g[PZ] = kf(u, SU, [0, -0.07, 0.07, 0.14], SE); g[LEAN] = kf(u, SU, [0.36, 0.44, 0.4, 0.16], SE);
      g[TW] = kf(u, SU, [0.3, 1.05, -0.05, -0.85], SE); g[HIPY] = kf(u, SU, [0.25, 0.6, 0.05, -0.35], SE); g[HX] = -0.26; g[HY] = -g[TW] * 0.7; g[SQ] = kf(u, SU, [1, 0.9, 1.1, 1], SE);
      const fol = seg(u, REL, 1); setv(g, FN, -0.12, ANK, 0.2); setv(g, FP, 0.17 - fol * 0.03, ANK + fol * 0.05, -0.18 + fol * 0.12); g[PP] = fol * 0.6;
      const ty = kf(u, SU, [0.64, 0.62, 0.62, 0.78], SE);
      stick(g, kf(u, SU, [-0.03, 0.1, -0.08, -0.13], SE), ty, kf(u, SU, [0.24, 0.16, 0.3, 0.28], SE), kf(u, SU, [25, -55, 38, 95], SE), u < REL ? null : lerp(floorEps(0.62), 16, out(fol)));
      g[BROW] = 1 - fol; g[MOUTH] = u < REL ? 0.2 : 0.2 + fol * 0.5; g[BRY] = fol * 0.6;
    } else if (a === 'pass') {
      const PU = [0, 0.36, 0.62, 1];
      g[TW] = kf(u, PU, [0.25, 0.6, 0, -0.3], SE); g[HIPY] = g[TW] * 0.4; g[PZ] = kf(u, PU, [0, -0.04, 0.05, 0.08], SE); g[HY] = -g[TW] * 0.7; g[SQ] = kf(u, PU, [1, 0.95, 1.05, 1], SE);
      setv(g, FN, -0.13, ANK, 0.16); setv(g, FP, 0.17, ANK, -0.12);
      const fol = seg(u, REL, 1);
      stick(g, kf(u, PU, [-0.03, 0.05, -0.07, -0.09], SE), kf(u, PU, [0.64, 0.62, 0.62, 0.67], SE), kf(u, PU, [0.24, 0.18, 0.28, 0.28], SE), kf(u, PU, [25, -12, 50, 74], SE), u < REL ? null : lerp(floorEps(0.62), -30, out(fol)));
    } else if (a === 'lunge' || a === 'fall') {
      // Der Verteidiger macht einen Ausfallschritt und sticht mit dem Stock nach vorn; dir: wohin (-1 Seite N, +1 Seite P).
      // fall: Er greift ins Leere und kippt vornüber.
      const gq = a === 'fall' ? 1 : out(seg(u, 0, 0.45)) - (P.stay ? 0 : seg(u, 0.7, 1) * 0.6), d = P.dir || 0;
      g[PY] = 0.48 - 0.14 * gq; g[PZ] = 0.22 * gq; g[PX] = d * 0.1 * gq; g[LEAN] = 0.36 + 0.34 * gq; g[HX] = -0.5; g[TW] = -0.25 * gq; g[BROW] = 1; g[MOUTH] = 0.3;
      setv(g, FN, -0.16, ANK, -0.2 * gq); g[PN] = 0.4 * gq; setv(g, FP, 0.12 + d * 0.18 * gq, ANK + Math.sin(Math.PI * seg(u, 0, 0.4)) * 0.08, 0.08 + 0.42 * gq);
      stick(g, 0.02 + d * 0.12 * gq, 0.62 - 0.2 * gq, 0.24 + 0.36 * gq, 25 + (62 + d * 38) * gq, null);
      g[WP] = gq; setv(g, HP, 0.42, 0.62, -0.1);
      if (a === 'fall') { g[WN] = 1; setv(g, HN, -0.3, 0.75, 0.3); setv(g, HP, 0.3, 0.75, 0.3); g[HX] = -0.75; g[MOUTH] = 1; g[BROW] = -1; g[BRY] = 1; g[PY] = 0.5; setv(g, FN, -0.14, ANK + 0.03, -0.1 + Math.sin(w * 14) * 0.08 * (1 - u)); setv(g, FP, 0.14, ANK + 0.03, -0.1 - Math.sin(w * 14) * 0.08 * (1 - u)); }
    } else if (a === 'cheer') {
      // Jubel: hüpfen, Stock in der einen Hand hoch, die andere Faust in die Luft; im Sprung gestreckt, bei der Landung gestaucht
      const j = Math.abs(Math.sin(w * 6.2)), moving = P.speed > 0.5, y = moving ? 0 : 0.26 * j;
      if (moving) runLegs(P, g, clamp(P.speed / 4.6, 0.4, 1)); else { g[PY] = 0.53 + y; setv(g, FN, -0.16, ANK + Math.max(0, y - 0.04), 0); setv(g, FP, 0.16, ANK + Math.max(0, y - 0.04), 0); g[PN] = g[PP] = y * 2; g[SQ] = 0.86 + 0.26 * j; }
      g[LEAN] = moving ? 0.06 : -0.08; g[SIDE] = Math.sin(w * 3.1) * 0.08; g[TW] = Math.sin(w * 3.1) * 0.14; g[HX] = -0.2; g[MOUTH] = 1; g[BRY] = 1;
      const hy = g[PY] + 0.6 + Math.sin(w * 12.4) * 0.03, sx = 0.2, sy = 0.95, sz = -0.12, sl = Math.hypot(sx, sy, sz);
      setv(g, TP, 0.36 - 0.27 * sx / sl, hy - 0.27 * sy / sl, 0.05 - 0.27 * sz / sl); setv(g, BL, g[TP] + LEN * sx / sl, g[TP + 1] + LEN * sy / sl, g[TP + 2] + LEN * sz / sl);
      g[WN] = 1; setv(g, HN, -0.36, g[PY] + 0.63 + Math.sin(w * 12.4 + 2) * 0.05, 0.1);
    } else if (a === 'sad') {
      g[PY] = 0.53; g[LEAN] = 0.3; g[SIDE] = 0; g[HX] = 0.42; g[HY] = Math.sin(w * 1.1) * 0.18; g[MOUTH] = -1; g[BROW] = -1; g[SQ] = 0.95; setv(g, FN, -0.13, ANK, 0); setv(g, FP, 0.13, ANK, 0.02);
      stick(g, 0.02, 0.68, 0.2, 35, null);
    }
    if (P.hand < 0) {      // spiegeln
      [PX, FN, FP, TP, BL, HN, HP, HIPY, TW, SIDE, HY].forEach(i => { g[i] = -g[i]; });
      for (let i = 0; i < 4; i++) { let v = g[FN + i]; g[FN + i] = g[FP + i]; g[FP + i] = v; v = g[WN + i]; g[WN + i] = g[WP + i]; g[WP + i] = v; }
    }
  }

  /* Zwei Glieder mit Gelenk: joint ist frei drehbar, mid knickt um x. d ist das Ziel, gemessen vom Gelenk aus im Raum
     seines Elternteils. fwd +1: das zweite Glied knickt nach vorn (Arm), -1: nach hinten (Bein). */
  function ik(joint, mid, d, l1, l2, fwd, twist) {
    const D = clamp(d.length(), 0.05, l1 + l2 - 0.004), bend = Math.PI - Math.acos(clamp((l1 * l1 + l2 * l2 - D * D) / (2 * l1 * l2), -1, 1));
    R.q1.setFromAxisAngle(R.up, twist); R.v1.set(0, -l1 - l2 * Math.cos(bend), fwd * l2 * Math.sin(bend)).applyQuaternion(R.q1).normalize(); R.v2.copy(d).normalize();
    joint.quaternion.setFromUnitVectors(R.v1, R.v2).multiply(R.q1); mid.rotation.x = -fwd * bend;
  }

  /* Kopf aus Knete: Kugel mit Ohren und Nase, Kulleraugen mit beweglichen Pupillen, Brauen, Mund (Lachen, offen, traurig).
     Der Kopf dreht um den Hals (neck); h ist die Kopfmitte. */
  function makeHead(m, parent) {
    const G = R.geo, neck = group(parent, 0, NECK, 0), h = group(neck, 0, 0.25, 0);
    mesh(G.head, m.skin, h);
    const eyes = group(h, 0, -0.005, 0); deco(G.eyes, R.whiteMat, eyes);
    const pN = deco(G.pupil, R.pupilMat, eyes, -0.078, 0, 0.268), pP = deco(G.pupil, R.pupilMat, eyes, 0.078, 0, 0.268);
    const bN = deco(G.brow, m.hair, h, -0.084, 0.1, 0.243), bP = deco(G.brow, m.hair, h, 0.084, 0.1, 0.243);
    const smile = deco(G.smile, R.mouthMat, h, 0, -0.085, 0.236); smile.rotation.x = 0.36;
    const open = group(h, 0, -0.135, 0.222); deco(G.mouthIn, R.mouthMat, open); deco(G.teeth, R.whiteMat, open, 0, 0.028, 0.012); deco(G.tongue, R.tongueMat, open, 0, -0.022, 0.012); open.visible = false;
    return { neck, h, eyes, pN, pP, bN, bP, smile, open };
  }
  // Gesicht stellen: blinzeln, Blick (gx, gy), Brauen, Mund
  function face(H, t, ph, mouth, brow, bry, gx, gy) {
    H.eyes.scale.y = ((t * 0.37 + ph * 0.61) % 1) < 0.045 ? 0.12 : 1 + bry * 0.08;
    H.pN.position.x = -0.078 + gx; H.pP.position.x = 0.078 + gx; H.pN.position.y = H.pP.position.y = gy;
    H.bN.rotation.z = -brow * 0.4; H.bP.rotation.z = brow * 0.4; H.bN.position.y = H.bP.position.y = 0.1 + bry * 0.035 - Math.max(0, brow) * 0.014;
    const open = mouth > 0.5; H.open.visible = open; H.smile.visible = !open;
    if (open) H.open.scale.set(0.8 + mouth * 0.2, 0.5 + mouth * 0.6, 1);
    else if (mouth < -0.4) { H.smile.rotation.set(0.75, 0, Math.PI); H.smile.position.set(0, -0.2, 0.185); } else { H.smile.rotation.set(0.36, 0, 0); H.smile.position.set(0, -0.085, 0.236); }
  }

  /* Eine Feldspieler-Figur aus Knete. J hält die Gelenke. */
  function makePlayer() {
    const G = R.geo, root = new T.Group(), body = group(root), J = { root, body }; root.rotation.order = 'YXZ';
    const m = { jersey: mat(0xffffff), trim: mat(0xffffff), shorts: mat(0x222222), sock: mat(0xffffff), skin: mat(0xe0ac69, { roughness: 0.74 }), hair: mat(0x222222, { roughness: 0.9 }), shoe: mat(0x15171f, { roughness: 0.7 }), shaft: mat(0xeef1f7, { roughness: 0.6 }), tape: mat(0x23252e), blade: mat(0xffffff, { roughness: 0.6, map: R.bladeMap }), num: new T.MeshBasicMaterial({ transparent: true, depthWrite: false }) };
    J.hips = group(body); mesh(G.shorts, m.shorts, J.hips, 0, -0.1, 0);
    J.spine = group(body); J.spine.rotation.order = 'YXZ';
    mesh(G.torso, m.jersey, J.spine); deco(G.hem, m.trim, J.spine, 0, -0.03, 0); deco(G.collar, m.trim, J.spine, 0, 0.445, 0);
    const nf = new T.Mesh(G.numPlane, m.num); nf.position.set(0, 0.215, 0.168); J.spine.add(nf);
    const nb = new T.Mesh(G.numPlane, m.num); nb.position.set(0, 0.225, -0.168); nb.rotation.y = Math.PI; J.spine.add(nb);
    J.H = makeHead(m, J.spine); J.hair = mesh(G.hair[0], m.hair, J.H.h);
    [-1, 1].forEach(sd => {
      const k = sd < 0 ? 'N' : 'P', sh = group(J.spine, sd * SHX, SHY, 0); mesh(G.sleeve, m.jersey, sh); deco(G.cuff, m.trim, sh, 0, -0.14, 0); mesh(G.upper, m.skin, sh, 0, -0.13, 0);
      const el = group(sh, 0, -A1, 0); mesh(G.forearm, m.skin, el);
      J['sh' + k] = sh; J['el' + k] = el;
      const hip = group(J.hips, sd * HPX, HPY, 0); mesh(G.shortLeg, m.shorts, hip, 0, -0.05, 0); mesh(G.thigh, m.skin, hip);
      const knee = group(hip, 0, -T1, 0); mesh(G.sock, m.sock, knee);
      const foot = group(knee, 0, -T2, 0); mesh(G.shoe, m.shoe, foot);
      J['hip' + k] = hip; J['knee' + k] = knee; J['foot' + k] = foot;
    });
    // Stock: oben der Griff, unten die Schaufel im festen Winkel zum Schaft
    J.stick = group(root); mesh(G.shaft, m.shaft, J.stick, 0, -LEN / 2, 0); deco(G.tape, m.tape, J.stick, 0, -0.11, 0);
    J.blade = group(J.stick, 0, -LEN, 0); J.blade.rotation.z = -LIE; mesh(G.blade, m.blade, J.blade, 0.14, 0, 0);
    const label = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthTest: false })); label.scale.set(0.95, 0.21, 1); label.position.set(0, 1.78, 0); label.visible = false; label.renderOrder = 5; root.add(label);
    const blob = new T.Mesh(G.blob, R.blobMat); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.012; root.add(blob);
    return { root, J, m, label, blob, pos: new T.Vector3(), face: 0, faceTo: 0, anim: 'idle', t0: 0, ph: 0, speed: 0, hand: 1, cur: new Float32Array(NP), tgt: new Float32Array(NP), fresh: true, top: new T.Vector3(), dir: 0, pitch: 0, twirl: 0 };
  }
  // Farben, Frisur, Nummer und Name einer Figur setzen
  function dress(P, o) {
    const tm = TEAM[o.side], h = hashOf(o.id || 'x');
    P.m.jersey.color.setHex(tm.jersey); P.m.trim.color.setHex(tm.trim); P.m.shorts.color.setHex(tm.shorts); P.m.sock.color.setHex(tm.sock); P.m.shoe.color.setHex(tm.shoe); P.m.blade.color.setHex(tm.blade); P.m.shaft.color.setHex(tm.shaft);
    P.m.skin.color.setHex(SKIN[h % SKIN.length]); P.m.hair.color.setHex(HAIR[(h >>> 3) % HAIR.length]); P.J.hair.geometry = R.geo.hair[(h >>> 6) % R.geo.hair.length];
    P.m.num.map = numTex(o.no || (h % 89) + 2, tm.num); P.m.num.needsUpdate = true;
    P.label.material.map = nameTex(o.name || ''); P.label.material.needsUpdate = true; P.label.visible = false;
    P.hand = h % 3 === 0 ? -1 : 1; P.ph = (h % 628) / 100; P.id = o.id; P.side = o.side; P.anim = 'idle'; P.cycle = 0; P.speed = 0; P.ball = false; P.fresh = true; P.stay = false; P.dir = 0; P.pitch = 0; P.twirl = 0; P.gaze = true; P.actor = false; P.root.visible = true;
  }
  // Rechnet die Haltung für diesen Augenblick und stellt die Gelenke. dt glättet den Übergang zwischen zwei Bewegungen.
  function pose(P, t, dt) {
    const J = P.J, c = P.cur, g = P.tgt, hd = P.hand, v = R.v3, q = R.q2;
    poseOf(P, t, g);
    const k = P.fresh ? 1 : 1 - Math.exp(-dt / (P.anim === 'shot' || P.anim === 'pass' ? 0.028 : 0.075)); for (let i = 0; i < NP; i++) c[i] += (g[i] - c[i]) * k; P.fresh = false;
    let df = P.faceTo - P.face; df = Math.atan2(Math.sin(df), Math.cos(df)); P.face += df * (1 - Math.exp(-dt * 11));
    J.body.position.set(c[PX], c[PY], c[PZ]); J.hips.rotation.y = c[HIPY]; J.spine.rotation.set(c[LEAN], c[TW], c[SIDE]); J.H.neck.rotation.set(c[HX], c[HY], Math.sin(t * 5.3 + P.ph) * 0.03);
    const sq = c[SQ], sxz = 1 / Math.sqrt(sq); J.spine.scale.set(sxz, sq, sxz);
    // Gesicht: Die Pupillen folgen dem Ball
    let gx = 0, gy = 0;
    if (P.gaze) { const b = R.ball.position, lx = b.x - P.pos.x, lz = b.z - P.pos.z, cs = Math.cos(P.face), sn = Math.sin(P.face), x = lx * cs - lz * sn, z = lx * sn + lz * cs; gx = clamp((Math.atan2(x, z) - c[TW] - c[HY]) * 0.03, -0.024, 0.024); gy = clamp((b.y - c[PY] - 0.7) / Math.max(1, Math.hypot(x, z)) * 0.07, -0.02, 0.016); }
    face(J.H, t, P.ph, c[MOUTH], c[BROW], c[BRY], gx, gy);
    // Beine: Fuss ans Ziel, Sohle flach
    [-1, 1].forEach(sd => {
      const kx = sd < 0 ? 'N' : 'P', fi = sd < 0 ? FN : FP, hip = J['hip' + kx], knee = J['knee' + kx], foot = J['foot' + kx];
      q.copy(J.hips.quaternion).invert(); v.set(c[fi] - c[PX], c[fi + 1] - c[PY], c[fi + 2] - c[PZ]).applyQuaternion(q); v.x -= sd * HPX; v.y -= HPY;
      ik(hip, knee, v, T1, T2, -1, sd * 0.2);
      q.copy(J.hips.quaternion).multiply(hip.quaternion).multiply(knee.quaternion).invert(); R.e1.set(c[fi + 3], c[HIPY] * 0.6 + sd * 0.22, 0, 'YXZ'); foot.quaternion.copy(q).multiply(R.q3.setFromEuler(R.e1));
    });
    // Stock: von der Schaufel aus, damit sie am Boden bleibt
    const s = R.v4.set(c[BL] - c[TP], c[BL + 1] - c[TP + 1], c[BL + 2] - c[TP + 2]).normalize(), top = P.top.set(c[BL] - s.x * LEN, c[BL + 1] - s.y * LEN, c[BL + 2] - s.z * LEN);
    const Y = R.v5.copy(s).negate(), o = R.v6.set(s.x, 0, s.z); if (o.lengthSq() < 0.01) o.set(hd, 0, 0); o.normalize().y = 0.3;
    const X = R.v7.copy(o).addScaledVector(Y, -o.dot(Y)).normalize(), Z = R.v8.crossVectors(X, Y);
    J.stick.position.copy(top); J.stick.quaternion.setFromRotationMatrix(R.m1.makeBasis(X, Y, Z));
    // Arme: die obere Hand am Griff, die untere weiter unten am Schaft, oder frei
    q.copy(J.spine.quaternion).invert();
    [-1, 1].forEach(sd => {
      const kx = sd < 0 ? 'N' : 'P', low = sd === hd, gr = low ? 0.27 : 0.04, wi = sd < 0 ? WN : WP, w = c[wi];
      v.set(lerp(top.x + s.x * gr, c[wi + 1], w), lerp(top.y + s.y * gr, c[wi + 2], w), lerp(top.z + s.z * gr, c[wi + 3], w));
      v.x -= c[PX]; v.y -= c[PY]; v.z -= c[PZ]; v.applyQuaternion(q); v.x = v.x / sxz - sd * SHX; v.y = v.y / sq - SHY; v.z /= sxz;
      ik(J['sh' + kx], J['el' + kx], v, A1, A2, 1, -sd * 0.55);
    });
    // Umfallen: Die ganze Figur kippt um die Füsse nach vorn und federt nach
    const pt = P.anim === 'fall' ? 1.36 * bounce(clamp((t - P.t0) / (P.dur || 0.6), 0, 1)) : 0; P.pitch += (pt - P.pitch) * (P.anim === 'fall' ? 1 : 1 - Math.exp(-dt * 8));
    P.root.position.copy(P.pos); P.root.position.y = Math.sin(P.pitch) * 0.2; P.root.rotation.set(P.pitch, P.face + P.twirl, 0); P.blob.visible = P.pitch < 0.3;
  }
  // Wo der Ball an der Schaufel liegt (Welt)
  function bladePos(P, v) {
    const J = P.J; R.v1.set(0.16, 0.0, 0.11 * P.hand); J.blade.updateMatrix(); J.stick.updateMatrix();
    v.copy(R.v1).applyMatrix4(J.blade.matrix).applyMatrix4(J.stick.matrix); v.y = Math.max(0.075, v.y);
    return v.applyAxisAngle(R.up, P.face).add(P.pos);
  }

  /* Der Goalie: kniet im Tor, Helm mit Gitter (das Gesicht schaut durch), dicke Handschuhe, Knieschoner, kein Stock.
     Die Hände greifen nach dem Ball. */
  function limb(parent, m, a, b, r) { const d = new T.Vector3().subVectors(b, a), o = mesh(new T.CapsuleGeometry(r, d.length(), 4, 10), m, parent); o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); return o; }
  function makeKeeper() {
    const G = R.geo, V = (x, y, z) => new T.Vector3(x, y, z), root = new T.Group(), body = group(root), J = { root, body };
    const m = { jersey: mat(0xffffff), trim: mat(0xffffff), pants: mat(0xf1efe8), pad: mat(0xfaf8f2), helmet: mat(0xffffff, { roughness: 0.55, side: T.DoubleSide }), glove: mat(0xe23b30), cage: mat(0xf4f4f4, { roughness: 0.5 }), skin: mat(0xe8a877, { roughness: 0.74 }), hair: mat(0x3a2716), shoe: mat(0x22242c), num: new T.MeshBasicMaterial({ transparent: true, depthWrite: false }) };
    [-1, 1].forEach(sd => { limb(body, m.pants, V(sd * 0.13, KH, 0), V(sd * 0.25, 0.12, 0.24), 0.11); limb(body, m.pants, V(sd * 0.25, 0.11, 0.24), V(sd * 0.28, 0.1, -0.14), 0.1); mesh(G.kPad, m.pad, body, sd * 0.25, 0.13, 0.27); deco(G.kStripe, m.trim, body, sd * 0.25, 0.13, 0.335); mesh(G.shoe, m.shoe, body, sd * 0.29, 0.12, -0.22).rotation.x = 1.2; });
    mesh(G.kHip, m.pants, body, 0, KH - 0.02, -0.02);
    J.spine = group(body, 0, KH, 0); mesh(G.kTorso, m.jersey, J.spine); deco(G.collar, m.trim, J.spine, 0, 0.445, 0).scale.setScalar(1.1);
    const nf = new T.Mesh(G.numPlane, m.num); nf.position.set(0, 0.22, 0.212); J.spine.add(nf);
    J.H = makeHead(m, J.spine); mesh(G.helmet, m.helmet, J.H.h); deco(G.cage, m.cage, J.H.h);
    [-1, 1].forEach(sd => { const k = sd < 0 ? 'N' : 'P', sh = group(J.spine, sd * KSX, SHY, 0); mesh(G.kSleeve, m.jersey, sh); const el = group(sh, 0, -A1, 0); mesh(G.kFore, m.jersey, el); mesh(G.kGlove, m.glove, el); deco(G.kPalm, m.pad, el); J['sh' + k] = sh; J['el' + k] = el; });
    const blob = new T.Mesh(G.blob, R.blobMat); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.012; blob.scale.set(1.5, 1.2, 1); root.add(blob);
    return { root, J, m, pos: new T.Vector3(), anim: 'ready', t0: 0, dur: 0.4, tgt: new T.Vector3(), must: false, amp: 1, hN: new T.Vector3(-0.4, 0.44, 0.26), hP: new T.Vector3(0.4, 0.44, 0.26), g: 0, mood: 0 };
  }
  function dressKeeper(K, side) { const tm = TEAM[side]; K.m.jersey.color.setHex(tm.keeper); K.m.trim.color.setHex(tm.helmet); K.m.helmet.color.setHex(tm.helmet); K.m.glove.color.setHex(tm.glove); K.m.pants.color.setHex(side === 'you' ? 0xf1efe8 : 0x2b2e3d); K.m.pad.color.setHex(side === 'you' ? 0xfaf8f2 : 0x4a4f6b); K.m.num.map = numTex(1, side === 'you' ? '#2553d6' : '#f2c94c'); K.m.num.needsUpdate = true; K.side = side; K.anim = 'ready'; K.g = 0; K.mood = 0; K.amp = 1; K.hN.set(-0.4, 0.44, 0.26); K.hP.set(0.4, 0.44, 0.26); }
  /* Haltung des Goalies. ready: wippt. dive: wirft sich zum Punkt tgt (im Raum des Goalies); must heisst, die Hand kommt
     an (Parade), sonst bleibt sie kurz davor. hold: fängt den Ball und zieht ihn vor die Brust. mood: 1 freut sich, -1 geschlagen. */
  function poseKeeper(K, t, dt) {
    const J = K.J, v = R.v3, w = R.v4;
    let sx = 0, sy = 0, roll = 0, hx = -0.05, sq = 1;
    const lean = 0.14, rN = w.set(-0.4 + Math.sin(t * 2.3) * 0.02, 0.44 + Math.sin(t * 2.9) * 0.02, 0.26), tN = R.v5.copy(rN), tP = R.v6.set(-rN.x, rN.y, rN.z);
    if (K.anim === 'ready') { sy = Math.sin(t * 3.4) * 0.016; sq = 1 + Math.sin(t * 3.4) * 0.025; }
    else {
      const g = K.g = out(clamp((t - K.t0) / K.dur, 0, 1)), d = Math.sign(K.tgt.x || 1), far = Math.abs(K.tgt.x), low = 1 - clamp(K.tgt.y / 0.8, 0, 1), near = d > 0 ? tP : tN, other = d > 0 ? tN : tP;
      sx = d * clamp(far * (K.must ? 0.62 : 0.4), 0, 0.6) * g * K.amp; roll = -d * clamp(far * (0.5 + low * 0.7), 0, K.must ? 1.15 : 0.8) * g * K.amp; sy = K.must ? g * clamp((K.tgt.y - 0.8) * 0.5, 0, 0.25) : 0; sq = 1 + g * 0.08 * K.amp;
      near.lerp(K.tgt, g); other.x += d * 0.22 * g; other.y += (K.tgt.y - 0.34) * 0.3 * g; hx = -0.2 * g;
      // Schulter der nahen Hand: reicht der Arm nicht, rückt bei einer Parade der ganze Körper nach
      v.set(d * KSX, SHY, 0).applyAxisAngle(R.xAxis, lean); v.y += KH; v.applyAxisAngle(R.zAxis, roll); v.x += sx; v.y += sy;
      const gap = R.v7.subVectors(K.tgt, v), L = gap.length(), max = A1 + A2 + 0.02;
      if (K.must && L > max) { gap.multiplyScalar((1 - max / L) * g); sx += gap.x; sy += Math.max(0, gap.y); }
      else if (!K.must) near.addScaledVector(gap.normalize(), -0.26 * g);
      if (K.anim === 'hold') { const h = ease(clamp((t - K.t0 - K.dur) / 0.35, 0, 1)); sx *= 1 - h * 0.5; roll *= 1 - h * 0.6; v.set(sx, 0.56, 0.32); tN.lerp(v, h); tP.lerp(v, h); tN.x -= 0.09 * h; tP.x += 0.09 * h; }
    }
    K.hN.lerp(tN, 1 - Math.exp(-dt * 30)); K.hP.lerp(tP, 1 - Math.exp(-dt * 30));
    J.body.position.set(sx, sy, 0); J.body.rotation.z = roll; J.spine.rotation.x = lean; J.spine.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)); J.H.neck.rotation.set(hx + (K.mood < 0 ? 0.4 : 0), 0, -roll * 0.5);
    const b = R.ball.position, bx = b.x - K.pos.x - sx, bz = Math.max(0.5, b.z - K.pos.z);
    face(J.H, t, 1.7, K.mood > 0 ? 1 : K.mood < 0 ? -1 : K.anim === 'ready' ? 0 : 0.8, K.mood < 0 ? -1 : K.anim === 'ready' ? 0.4 : 0, K.anim === 'ready' ? 0 : 0.8, clamp(Math.atan2(bx, bz) * 0.03, -0.024, 0.024), clamp((b.y - 0.9) / bz * 0.07, -0.02, 0.016));
    R.q2.copy(J.spine.quaternion).invert(); R.q3.copy(J.body.quaternion).invert();
    [[-1, K.hN, 'N'], [1, K.hP, 'P']].forEach(a => { v.copy(a[1]); v.x -= sx; v.y -= sy; v.applyQuaternion(R.q3); v.y -= KH; v.applyQuaternion(R.q2); v.x -= a[0] * KSX; v.y = v.y / sq - SHY; ik(J['sh' + a[2]], J['el' + a[2]], v, A1, A2, 1, -a[0] * 0.9); });
    K.root.position.copy(K.pos);
  }
  // Hand des Goalies in der Welt (für den gefangenen Ball)
  const keeperHand = (K, v) => v.copy(K.tgt.x >= 0 ? K.hP : K.hN).add(K.pos).setZ(K.pos.z + 0.36);

  // Frisuren aus Knete, um die Kopfmitte gebaut
  function hairStyles() {
    const cap = (len, tilt, r) => new T.SphereGeometry(r || 0.29, 18, 10, 0, Math.PI * 2, 0, Math.PI * len).scale(1.06, 0.94, 0.98).rotateX(tilt);
    const cp = (r, l) => new T.CapsuleGeometry(r, l, 3, 8), sp = r => new T.SphereGeometry(r, 10, 8), list = [];
    // Wirbel: Kappe und nach vorn gerollte Strähnen
    list.push([cap(0.39, -0.62)].concat([-2, -1, 0, 1, 2].map(i => cp(0.055, 0.1).rotateZ(Math.PI / 2 + 0.3).rotateY(-i * 0.42 + 0.5).translate(Math.sin(i * 0.42) * 0.14, 0.262 - Math.abs(i) * 0.018, 0.09 * Math.cos(i * 0.42)))));
    // Stacheln
    list.push([cap(0.39, -0.62)].concat([[0, 0], [0.11, 0.02], [-0.11, 0.02], [0.05, 0.11], [-0.06, 0.1], [0.06, -0.1], [-0.05, -0.11], [0, -0.2]].map(p => new T.ConeGeometry(0.06, 0.17, 8).rotateX(p[1] * 4).rotateZ(-p[0] * 4).translate(p[0], 0.3 - (p[0] * p[0] + p[1] * p[1]) * 1.6, p[1]))));
    // Topfschnitt mit Fransen
    list.push([cap(0.4, -0.6, 0.287), new T.TorusGeometry(0.15, 0.048, 6, 14, Math.PI).rotateX(Math.PI / 2).translate(0, 0.225, 0.02)]);
    // Locken
    list.push([cap(0.39, -0.62)].concat([[0, 0.27, 0.02], [0.14, 0.23, 0.08], [-0.14, 0.23, 0.08], [0.2, 0.17, -0.06], [-0.2, 0.17, -0.06], [0.08, 0.24, -0.12], [-0.08, 0.24, -0.12], [0, 0.17, -0.22], [0.16, 0.08, -0.2], [-0.16, 0.08, -0.2], [0.07, 0.25, 0.1], [-0.07, 0.25, 0.1]].map(p => sp(0.08).translate(p[0], p[1], p[2]))));
    // Dutt
    list.push([cap(0.4, -0.62), sp(0.105).translate(0, 0.3, -0.1), sp(0.06).translate(0.2, 0.15, -0.14), sp(0.06).translate(-0.2, 0.15, -0.14)]);
    // Irokese
    list.push([-0.5, -0.15, 0.2, 0.55, 0.9, 1.25].map(a => sp(0.075).scale(0.8, 1.2, 1).translate(0, 0.275 * Math.cos(a) * 0.96, -0.275 * Math.sin(a))));
    return list.map((p, i) => lump(merge(p), 0.008, 17, i * 3.1));
  }

  // --- Halle: einmal bauen ---
  function build(host) {
    T = window.THREE;
    const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.outputEncoding = T.sRGBEncoding; renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.setClearColor(0x070a1c);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
    renderer.domElement.addEventListener('webglcontextlost', () => { broken = true; if (run) run.kill(); });
    const scene = new T.Scene(); scene.fog = new T.Fog(0x070a1c, 20, 44);
    const cam = new T.PerspectiveCamera(46, 1, 0.15, 90), V = () => new T.Vector3(), Q = () => new T.Quaternion();
    R = { renderer, scene, cam, host, players: [], look: V(), raf: 0, up: new T.Vector3(0, 1, 0), xAxis: new T.Vector3(1, 0, 0), zAxis: new T.Vector3(0, 0, 1), v1: V(), v2: V(), v3: V(), v4: V(), v5: V(), v6: V(), v7: V(), v8: V(), q1: Q(), q2: Q(), q3: Q(), e1: new T.Euler(), m1: new T.Matrix4() };
    R.bump = bumpTex(); R.bladeMap = bladeTex();
    const cap = (r, l) => new T.CapsuleGeometry(r, l, 4, 10), sph = (r, a, b) => new T.SphereGeometry(r, a || 14, b || 10), cyl = (a, b, h, n) => new T.CylinderGeometry(a, b, h, n || 14);
    const lathe = (pts, sx, sz) => new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), 20).scale(sx, 1, sz);
    R.geo = {
      // Körper: Trikot wie eine Glocke, Ärmel, Hose, kurze Beine, dicke Stulpen, grosse Schuhe
      torso: lump(lathe([[0, -0.05], [0.17, -0.05], [0.198, -0.02], [0.196, 0.1], [0.19, 0.25], [0.178, 0.36], [0.135, 0.43], [0.07, 0.46], [0, 0.465]], 1.12, 0.84), 0.005, 13, 1),
      hem: new T.TorusGeometry(0.19, 0.022, 6, 20).rotateX(Math.PI / 2).scale(1.12, 1, 0.84), collar: new T.TorusGeometry(0.086, 0.025, 6, 16).rotateX(Math.PI / 2),
      sleeve: lump(merge([sph(0.105), cyl(0.096, 0.116, 0.13).translate(0, -0.075, 0)]), 0.005, 21, 2), cuff: new T.TorusGeometry(0.108, 0.021, 6, 14).rotateX(Math.PI / 2),
      upper: cap(0.068, 0.08), forearm: lump(merge([cap(0.066, 0.1).translate(0, -0.08, 0), sph(0.092).scale(1, 0.94, 1).translate(0, -A2, 0), sph(0.042).translate(0, -A2 + 0.03, 0.08)]), 0.005, 25, 3),
      shorts: lump(sph(0.215, 16, 12).scale(1.06, 0.62, 0.86), 0.004, 12, 4), shortLeg: cyl(0.104, 0.112, 0.12),
      thigh: merge([cap(0.08, 0.1).translate(0, -0.11, 0), sph(0.082).translate(0, -T1, 0)]),
      sock: lump(merge([cap(0.088, 0.07).translate(0, -0.115, 0), new T.TorusGeometry(0.086, 0.032, 6, 14).rotateX(Math.PI / 2).translate(0, -0.05, 0)]), 0.004, 30, 5),
      shoe: lump(sph(0.1, 14, 10).scale(1, 0.82, 1.75).translate(0, -0.018, 0.065), 0.006, 16, 6),
      // Kopf: Kugel mit Ohren und Nase
      head: lump(merge([sph(0.27, 24, 18).scale(1.06, 0.94, 0.98), sph(0.06, 10, 8).scale(0.6, 1, 0.8).translate(0.278, -0.01, 0), sph(0.06, 10, 8).scale(0.6, 1, 0.8).translate(-0.278, -0.01, 0), sph(0.046, 10, 8).translate(0, -0.055, 0.258)]), 0.006, 9, 7),
      eyes: merge([sph(0.07, 14, 10).scale(1, 1.06, 0.55).translate(-0.078, 0, 0.232), sph(0.07, 14, 10).scale(1, 1.06, 0.55).translate(0.078, 0, 0.232)]), pupil: sph(0.028, 10, 8).scale(1, 1, 0.5),
      brow: cap(0.02, 0.075).rotateZ(Math.PI / 2), smile: new T.TorusGeometry(0.075, 0.014, 6, 14, Math.PI * 0.75).rotateZ(Math.PI * 1.125),
      mouthIn: sph(0.07, 14, 10).scale(1.05, 0.75, 0.35), teeth: new T.BoxGeometry(0.1, 0.024, 0.02), tongue: sph(0.035, 10, 8).scale(1.2, 0.6, 0.4),
      hair: hairStyles(),
      shaft: cyl(0.02, 0.02, LEN, 8), tape: cyl(0.025, 0.025, 0.2, 8), blade: merge([new T.BoxGeometry(0.24, 0.09, 0.036).translate(-0.02, 0, 0), cyl(0.045, 0.045, 0.036, 12).rotateX(Math.PI / 2).translate(0.1, 0, 0)]), numPlane: new T.PlaneGeometry(0.21, 0.21), blob: new T.CircleGeometry(0.36, 20),
      // Goalie
      kTorso: lump(lathe([[0, -0.05], [0.22, -0.05], [0.24, 0.05], [0.24, 0.25], [0.225, 0.36], [0.16, 0.43], [0.08, 0.46], [0, 0.465]], 1.14, 0.9), 0.007, 13, 9), kHip: sph(0.24).scale(1.1, 0.72, 0.9),
      kPad: lump(sph(0.13).scale(1, 1.05, 0.7), 0.005, 18, 10), kStripe: new T.BoxGeometry(0.2, 0.04, 0.03), kSleeve: merge([sph(0.11), cap(0.085, 0.1).translate(0, -0.1, 0)]), kFore: cap(0.08, 0.08).translate(0, -0.08, 0),
      kGlove: lump(merge([sph(0.125).scale(1, 1.1, 0.75).translate(0, -A2, 0), sph(0.055).translate(0.11, -A2 + 0.02, 0.02), sph(0.055).translate(-0.11, -A2 + 0.02, 0.02)]), 0.006, 22, 11), kPalm: sph(0.085).scale(1, 1.05, 0.4).translate(0, -A2, 0.075),
      // Helm: Schale hinten und oben, vorne offen; davor das Gitter
      helmet: merge([new T.SphereGeometry(0.305, 20, 14, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0.2, Math.PI - 0.5), new T.SphereGeometry(0.305, 20, 6, 0, Math.PI * 2, 0, 0.92), new T.TorusGeometry(0.2, 0.04, 6, 12, 1.9).rotateX(Math.PI / 2).rotateY(-0.62).translate(0, -0.225, 0.02)].map(g => g.scale(1.06, 0.96, 1))),
      cage: merge([0.1, -0.02, -0.14].map(y => new T.TorusGeometry(Math.sqrt(0.32 * 0.32 - y * y), 0.012, 5, 14, 2.0).rotateX(Math.PI / 2).rotateY(-0.57).translate(0, y, 0)).concat([-0.42, 0, 0.42].map(a => new T.TorusGeometry(0.322, 0.012, 5, 12, 1.25).rotateZ(-0.63).rotateY(-Math.PI / 2).rotateY(a)))).scale(1.06, 0.96, 1),
      ball: sph(0.075, 18, 14)
    };
    R.blobMat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false });
    R.whiteMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }); R.pupilMat = new T.MeshStandardMaterial({ color: 0x15110d, roughness: 0.15 }); R.mouthMat = new T.MeshStandardMaterial({ color: 0x7a1f1c, roughness: 0.7 }); R.tongueMat = new T.MeshStandardMaterial({ color: 0xe8726b, roughness: 0.7 });
    // Licht: warmes Hallenlicht von oben, eine Lampe mit weichen Schatten von der Feldseite, ein kühles Streiflicht von hinter dem Tor
    scene.add(new T.HemisphereLight(0xfff3e2, 0x3b4f8f, 0.6));
    const sun = new T.DirectionalLight(0xfff0d8, 0.62); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); const sc = sun.shadow.camera; sc.left = -8; sc.right = 8; sc.top = 9; sc.bottom = -9; sc.far = 40; sun.shadow.bias = -0.0012; sun.shadow.radius = 4; scene.add(sun); scene.add(sun.target); R.sun = sun;
    const rim = new T.DirectionalLight(0xa9c8ff, 0.28); rim.position.set(3, 6, -9); scene.add(rim);
    // Boden, Banden
    const floor = new T.Mesh(new T.PlaneGeometry(18, 36), new T.MeshStandardMaterial({ map: floorTex(), roughness: 0.38, metalness: 0.05 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 16); floor.receiveShadow = true; scene.add(floor);
    const around = new T.Mesh(new T.PlaneGeometry(70, 70), mat(0x10173f, { roughness: 1 })); around.rotation.x = -Math.PI / 2; around.position.set(0, -0.01, 16); scene.add(around);
    const bm = mat(0xf4f1e8, { roughness: 0.7 }), box = (w, h, d, m, x, y, z) => { const o = mesh(new T.BoxGeometry(w, h, d), m, scene, x, y, z); o.castShadow = false; return o; };
    box(0.14, 0.5, 36, bm, -9.07, 0.25, 16).receiveShadow = true; box(0.14, 0.5, 36, bm, 9.07, 0.25, 16).receiveShadow = true; box(18.3, 0.5, 0.14, bm, 0, 0.25, -2.07).receiveShadow = true;
    // Tor: dickes rotes Gestänge aus Knete und Netz
    const red = mat(0xe2352b), tube = (len, r) => lump(new T.CylinderGeometry(r || 0.05, r || 0.05, len, 10, 6), 0.004, 9, len), slope = Math.hypot(GD, GH);
    [-1, 1].forEach(sd => { mesh(tube(GH), red, scene, sd * GW, GH / 2, 0); mesh(tube(GD, 0.032), red, scene, sd * GW, 0.032, -GD / 2).rotation.x = Math.PI / 2; mesh(tube(slope, 0.032), red, scene, sd * GW, GH / 2, -GD / 2).rotation.x = Math.atan2(GD, GH); mesh(sph(0.058), red, scene, sd * GW, GH, 0); });
    mesh(tube(GW * 2), red, scene, 0, GH, 0).rotation.z = Math.PI / 2; mesh(tube(GW * 2, 0.032), red, scene, 0, 0.032, -GD).rotation.z = Math.PI / 2;
    const nt = netTex(), nmat = (rx, ry) => { const t = nt.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); return new T.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.7, side: T.DoubleSide, depthWrite: false }); };
    const netB = new T.Mesh(new T.PlaneGeometry(GW * 2, slope, 14, 10), nmat(9, 7)); netB.position.set(0, GH / 2, -GD / 2); netB.rotation.x = Math.atan2(GD, GH); scene.add(netB); R.net = netB; R.netBase = netB.geometry.attributes.position.array.slice(); R.slope = slope;
    [-1, 1].forEach(sd => { const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(GD, 0); sh.lineTo(0, GH); sh.lineTo(0, 0); const g = new T.ShapeGeometry(sh), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 5, uv.getY(i) * 5); const o = new T.Mesh(g, nmat(1, 1)); o.rotation.y = Math.PI / 2; o.position.set(sd * GW, 0, 0); scene.add(o); });
    // Leuchtband und Tribünen: hinter dem Tor und an beiden Längsseiten
    R.ledIdle = ledTex([['HALLENKAMPF', '#ffe45c'], ['●', '#57e38b'], ['UNIHOCKEY', '#6fd6ff'], ['●', '#ff7ac8']], '#0a1036'); R.ledGoal = ledTex([['TOR!', '#ffe08a'], ['★', '#ff8a5c'], ['TOR!', '#ffffff'], ['★', '#ffe08a']], '#2a0f02'); R.ledGoal.repeat.x = 1.5;
    R.led = new T.Mesh(new T.PlaneGeometry(19, 1), new T.MeshBasicMaterial({ map: R.ledIdle, fog: false })); R.led.position.set(0, 1.0, -2.55); scene.add(R.led);
    const stand = mat(0x161f52, { roughness: 1 }), wall = mat(0x0c1233, { roughness: 1 });
    box(19.4, 0.5, 0.5, stand, 0, 0.25, -2.75);
    R.fans = { list: [] }; let seed = 4711; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const block = (rows, per, at, grp) => { for (let r = 0; r < rows; r++) for (let i = 0; i < per; i++) { const a = at(r, (i - (per - 1) / 2) * 0.68 + (rnd() - 0.5) * 0.2 + (r % 2) * 0.34); R.fans.list.push({ x: a[0], y: a[1], z: a[2], ax: a[3], az: a[4], ph: rnd() * 6.28, sp: 6 + rnd() * 4, h: 0.16 + rnd() * 0.22, c: rnd(), c2: rnd(), sc: 0.9 + rnd() * 0.25, skin: SKIN[Math.floor(rnd() * SKIN.length)], hair: HAIR[Math.floor(rnd() * HAIR.length)], grp }); } };
    for (let r = 0; r < 7; r++) box(21, 0.45, 0.85, stand, 0, 1.3 + r * 0.45, -3.2 - r * 0.85);
    block(7, 30, (r, u) => [u, 1.52 + r * 0.45, -3.2 - r * 0.85, 1, 0], 0);
    [-1, 1].forEach(sd => { for (let r = 0; r < 4; r++) box(0.85, 0.45, 30, stand, sd * (10.1 + r * 0.85), 0.5 + r * 0.45, 12); block(4, 33, (r, u) => [sd * (10.1 + r * 0.85), 0.72 + r * 0.45, 10 + u, 0, 1], sd < 0 ? 1 : 2); box(0.3, 9, 34, wall, sd * 14, 4.5, 12); });
    box(30, 10, 0.3, wall, 0, 5, -9.6);
    // Fans: Knetklumpen mit Kopf, Haaren und zwei Armen
    const n = R.fans.list.length, fm = () => new T.MeshStandardMaterial({ roughness: 0.85 }), F = R.fans;
    F.fb = new T.InstancedMesh(sph(0.26, 8, 6).scale(1, 1.2, 0.85), fm(), n); F.fh = new T.InstancedMesh(sph(0.165, 8, 6), fm(), n); F.fr = new T.InstancedMesh(new T.SphereGeometry(0.175, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), fm(), n); F.fa = new T.InstancedMesh(cap(0.055, 0.3), fm(), n * 2);
    [F.fb, F.fh, F.fr, F.fa].forEach(o => { o.instanceMatrix.setUsage(T.DynamicDrawUsage); o.frustumCulled = false; scene.add(o); });
    F.m4 = new T.Matrix4(); F.q = Q(); F.e = new T.Euler(); F.s1 = new T.Vector3(1, 1, 1); F.col = new T.Color();
    // Hallenlampen an der Decke
    const lamp = new T.MeshBasicMaterial({ color: 0xfff4e0, fog: false }), gt = glowTex();
    for (let i = 0; i < 4; i++) [-1, 1].forEach(sd => { const x = sd * 4.2, z = -4 + i * 6; box(2.6, 0.08, 0.5, lamp, x, 8.6, z); const s = new T.Sprite(new T.SpriteMaterial({ map: gt, transparent: true, opacity: 0.5, depthWrite: false, blending: T.AdditiveBlending, fog: false })); s.position.set(x, 8.5, z); s.scale.set(5.5, 3.2, 1); scene.add(s); });
    // Ball mit Löchern und Leuchtspur
    R.ball = mesh(R.geo.ball, new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, map: ballTex(), emissive: 0x2a2a2a }), scene); R.trail = []; R.ballPrev = V();
    for (let i = 0; i < 8; i++) { const o = new T.Mesh(R.geo.ball, new T.MeshBasicMaterial({ color: 0xe6f0ff, transparent: true, opacity: 0.32 - i * 0.038, depthWrite: false })); o.scale.setScalar(0.9 - i * 0.08); scene.add(o); R.trail.push({ o, p: new T.Vector3() }); }
    R.ballBlob = new T.Mesh(R.geo.blob, R.blobMat); R.ballBlob.rotation.x = -Math.PI / 2; R.ballBlob.scale.setScalar(0.26); scene.add(R.ballBlob);
    for (let i = 0; i < 10; i++) { const P = makePlayer(); scene.add(P.root); R.players.push(P); }
    R.keeper = makeKeeper(); scene.add(R.keeper.root);
    host.appendChild(renderer.domElement);
  }
  function resize() { const w = R.host.clientWidth || 343, h = R.host.clientHeight || 400; R.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); R.renderer.setSize(w, h, false); R.cam.aspect = w / h; R.cam.updateProjectionMatrix(); }
  // Fans: wippen leicht, bei cheer springen die Fans der angreifenden Seite mit erhobenen Armen, bei groan sinken sie zusammen
  function fans(time, side, mood) {
    const F = R.fans, M4 = F.m4, q = F.q, e = F.e, s1 = F.s1, v = R.v1, col = F.col, other = side === 'you' ? 'home' : 'you';
    F.list.forEach((f, i) => {
      const mine = f.grp === 0 || (f.grp === 1) === (side === 'you'), up = mood === 'cheer' && mine;
      const jump = up ? Math.abs(Math.sin(time * f.sp + f.ph)) * f.h : mood === 'groan' && mine ? -0.05 : Math.sin(time * 1.6 + f.ph) * 0.012;
      q.identity(); s1.setScalar(f.sc); v.set(f.x, f.y + 0.3 + jump, f.z); M4.compose(v, q, s1); F.fb.setMatrixAt(i, M4);
      v.set(f.x, f.y + 0.3 + 0.47 * f.sc + jump, f.z); M4.compose(v, q, s1); F.fh.setMatrixAt(i, M4); F.fr.setMatrixAt(i, M4);
      [-1, 1].forEach((sd, k) => { const tilt = up ? sd * (0.35 + Math.sin(time * 9 + f.ph) * 0.25) : sd * 0.12, off = sd * (up ? 0.3 : 0.28) * f.sc; e.set(f.az * tilt, 0, -f.ax * tilt); q.setFromEuler(e); v.set(f.x + f.ax * off, f.y + (up ? 0.74 : 0.3) + jump, f.z + f.az * off); M4.compose(v, q, s1); F.fa.setMatrixAt(i * 2 + k, M4); });
      if (F.side !== side) { const pal = TEAM[mine ? side : other].fans; col.setHex(f.c2 < 0.24 ? BRIGHT[Math.floor(f.c * BRIGHT.length)] : pal[f.c < 0.62 ? 0 : f.c < 0.85 ? 1 : 2]); F.fb.setColorAt(i, col); col.setHex(f.skin); F.fh.setColorAt(i, col); F.fa.setColorAt(i * 2, col); F.fa.setColorAt(i * 2 + 1, col); col.setHex(f.hair); F.fr.setColorAt(i, col); }
    });
    if (F.side !== side) { F.side = side; [F.fb, F.fh, F.fr, F.fa].forEach(o => { o.instanceColor.needsUpdate = true; }); }
    [F.fb, F.fh, F.fr, F.fa].forEach(o => { o.instanceMatrix.needsUpdate = true; });
  }
  // Netz: beult am Einschlag aus und schwingt nach
  function net(time, hit) {
    const a = R.net.geometry.attributes.position, b = R.netBase;
    for (let i = 0; i < a.count; i++) {
      let dz = 0;
      if (hit) { const dt = time - hit.t; if (dt >= 0 && dt < 2.4) { const dx = b[i * 3] - hit.x, dy = b[i * 3 + 1] - hit.y, d2 = dx * dx + dy * dy, ex = Math.min(1, (GW - Math.abs(b[i * 3])) / 0.2) * Math.min(1, (R.slope / 2 - Math.abs(b[i * 3 + 1])) / 0.2); dz = -Math.exp(-dt / 0.55) * Math.cos(dt * 18) * (0.36 * Math.exp(-d2 / 0.16) + 0.12 * Math.exp(-d2 / 1.1) * Math.cos(dt * 18 - Math.sqrt(d2) * 4)) * Math.max(0, ex); } }
      a.setZ(i, b[i * 3 + 2] + dz);
    }
    a.needsUpdate = true;
  }
  // Ball setzen: Er rollt in Laufrichtung, dahinter die Leuchtspur
  function setBall(v) {
    if (R.trailNew) { R.trailNew = false; R.trail.forEach(s => s.p.copy(v)); R.ballPrev.copy(v); }
    const dx = v.x - R.ballPrev.x, dz = v.z - R.ballPrev.z, d = Math.hypot(dx, dz); if (d > 0.0005) R.ball.rotateOnWorldAxis(R.v1.set(dz / d, 0, -dx / d), Math.min(1.2, d / 0.075)); R.ballPrev.copy(v);
    R.ball.position.copy(v); R.ballBlob.position.set(v.x, 0.013, v.z);
    const tr = R.trail; for (let i = tr.length - 1; i > 0; i--) tr[i].p.copy(tr[i - 1].p); tr[0].p.copy(v); tr.forEach((s, i) => { s.o.position.copy(s.p); s.o.visible = i > 0 && s.p.distanceTo(v) > 0.09; });
  }
  function camAt(p, l, fov) { R.cam.position.copy(p); R.look.copy(l); R.cam.lookAt(l); if (fov && Math.abs(R.cam.fov - fov) > 0.01) { R.cam.fov = fov; R.cam.updateProjectionMatrix(); } }

  /* Spielt eine Szene ab. Gibt { impact, done } zurück: impact ist erfüllt, sobald die Entscheidung fällt (Tor, Parade,
     Ball weg), done am Ende der Szene. Fehlt die 3D-Darstellung, gibt es null.
     spec: { kind: 'shot' | 'pass' | 'dribble', atk: 'you' | 'home' (wer angreift), players: [{ id, side, x, y, name, no }],
       shot:    by (Schütze), land [x, y] im Tor (x -1 bis 1, y 0 bis 1), result 'goal' | 'save' | 'catch' | 'miss' | 'blocked',
                miss 'wide' | 'high' | 'post', kx (wo der Goalie steht, -1 bis 1), blocker (id), tight (knapp: langsamer), empty (kein Goalie),
                dive (wohin der Goalie springt, wenn er den Ball nicht hält: [x, y] oder null für «bleibt stehen»), quick (kurzer Anlauf)
       pass:    from, to (ids), ok, by (wer abfängt oder stört), near (kommt an, aber der Gegner ist dran)
       dribble: x (Dribbler), by (Gegenspieler), result 'past' | 'held' | 'lost', to [x, y] (wo der Dribbler danach steht) }
     opt: at (Standbild zu dieser Zeit, für Tests), speed (Zeitraffer), linger (läuft nach dem Ende weiter, bis hide()). */
  let run = null;
  function play(host, spec, opt) {
    if (!ok()) return null;
    try { if (!R) build(host); if (run) run.kill(); R.host.hidden = false; resize(); return start(spec, opt || {}); }
    catch (e) { broken = true; if (window.console) console.warn('3D-Szene ausgefallen: ' + (e && e.stack || e)); return null; }
  }
  function start(spec, o) {
    const def = spec.atk === 'you' ? 'home' : 'you', by = {}, V = (x, y, z) => new T.Vector3(x || 0, y || 0, z || 0);
    R.players.forEach((P, i) => { const s = spec.players[i]; P.root.visible = !!s; if (!s) return; dress(P, s); P.pos.set(wx(s.x), 0, wz(s.y)); by[s.id] = P; });
    const K = R.keeper; dressKeeper(K, def); K.pos.set(0, 0, 0.28); K.root.visible = !spec.empty;
    const ballV = V(), tmp = V(), camP = V(), camL = V(), list = Object.keys(by).map(id => by[id]);
    const look = (P, x, z, now) => { P.faceTo = Math.atan2(x - P.pos.x, z - P.pos.z); if (now) P.face = P.faceTo; };
    const anim = (P, name, t, d, extra) => { P.anim = name; P.t0 = t; P.dur = d || 1; Object.assign(P, extra || {}); };
    // Läuft Richtung Ziel und dreht sich dorthin; cycle treibt die Beine. Gibt true zurück, solange er unterwegs ist.
    const moveTo = (P, x, z, sp, dt, keep) => { const dx = x - P.pos.x, dz = z - P.pos.z, d = Math.hypot(dx, dz), st = sp * dt; if (d > 0.04) { P.faceTo = Math.atan2(dx, dz); const k = Math.min(1, st / d); P.pos.x += dx * k; P.pos.z += dz * k; if (!keep) P.anim = 'run'; P.speed = sp; P.cycle += st * 6.2; return true; } P.speed = 0; if (P.anim === 'run') P.anim = 'idle'; return false; };
    let step, dur, hit = null, mood = 'idle', tt = 0, led = 0, shakeT = -9, impactDone = false, resImpact, resDone, carrier = null;
    const impact = new Promise(r => { resImpact = r; }), done = new Promise(r => { resDone = r; });
    const fire = () => { if (!impactDone) { impactDone = true; resImpact(true); } };
    const ballAt = P => { carrier = P; }, focus = ids => ids.forEach(id => { if (by[id]) { by[id].label.visible = true; by[id].actor = true; } });

    if (spec.kind === 'shot') {
      const Sh = by[spec.by], p0 = Sh.pos.clone(), dist = Math.max(1.5, Math.hypot(p0.x, p0.z)), dir = V(-p0.x, 0, -p0.z).normalize(), res = spec.result, goal = res === 'goal', tight = !!spec.tight;
      const lx = clamp((spec.land ? spec.land[0] : 0) * GW, -GW * 1.7, GW * 1.7), ly = clamp((spec.land ? spec.land[1] : 0.4) * GH, 0.08, GH * 1.6);
      const t0 = spec.quick ? 0.05 : 0.22, sd = spec.quick ? 0.7 : 0.85, tRel = t0 + sd * REL, fly = (0.3 + dist * 0.028) * (tight ? 1.7 : 1);
      const Bl = res === 'blocked' ? by[spec.blocker] || list.filter(P => P.side !== spec.atk).sort((a, b) => a.pos.distanceTo(p0) - b.pos.distanceTo(p0))[0] || null : null;
      const end = V(lx, ly, 0.36), from = V();
      if (goal) end.set(lx, ly, -GD * (1 - ly / GH) * 0.8 - 0.03);
      else if (res === 'miss' && spec.miss === 'post') { if (Math.abs(spec.land[0]) >= 0.98) end.set(Math.sign(lx) * GW, Math.min(ly, GH), 0.06); else end.set(clamp(lx, -GW, GW), GH, 0.06); }
      else if (res === 'miss') end.set(lx * 1.25, spec.miss === 'high' ? Math.max(ly, GH + 0.35) : ly, -1.9);
      list.forEach(P => { if (P.side === spec.atk) look(P, 0, 0, true); else look(P, p0.x, p0.z, true); });
      look(Sh, 0, 0, true);
      // Der Blocker steht in der Schusslinie, knapp vor dem Schützen
      if (Bl) { Bl.pos.copy(p0).addScaledVector(dir, 1.45); look(Bl, p0.x, p0.z, true); end.copy(Bl.pos); end.y = 0.4; }
      const tEnd = tRel + (Bl ? 0.12 : fly), tCut = tEnd + 0.62; dur = tEnd + (goal ? 3.5 : 1.25);
      K.pos.x = clamp((spec.kx || 0) * GW, -GW * 0.72, GW * 0.72); Sh.ball = true; focus([spec.by]);
      const stickSide = V(Math.cos(Sh.faceTo), 0, -Math.sin(Sh.faceTo)).multiplyScalar(Sh.hand);
      const c0 = p0.clone().addScaledVector(dir, -3.0).addScaledVector(stickSide, 0.85).setY(1.5), l0 = p0.clone().addScaledVector(dir, Math.min(dist * 0.5, 3)).setY(0.7);
      const over = dist > 6.6, c1 = over ? V(lx * 0.3 + Math.sign(p0.x || 1) * 0.6, 1.45, 4.9) : c0.clone().addScaledVector(dir, 0.5).addScaledVector(stickSide, 0.4).setY(1.62), l1 = V(lx * 0.5, 0.6, 0), back = dir.clone().negate(), deflect = V(Math.sign(lx || 1) * (1.4 + Math.abs(lx)), 0, 1.7);
      const lat = P => (P.pos.x - p0.x) * back.z - (P.pos.z - p0.z) * back.x, mates = list.filter(P => P.side === spec.atk && P !== Sh).sort((a, b) => lat(a) - lat(b)), slots = [-1.25, -0.65, 0.65, 1.25];
      step = (t, dt) => {
        if (t >= t0 && Sh.anim === 'idle' && !step.shot) { step.shot = true; anim(Sh, 'shot', t0, sd); }
        carrier = null;
        if (t < tRel) ballAt(Sh);
        else if (t < tEnd) { if (!step.from) { step.from = from.copy(ballV).clone(); Sh.ball = false; } const u = (t - tRel) / (tEnd - tRel), k = tight ? ease(u) * 0.3 + u * 0.7 : u; ballV.lerpVectors(step.from, end, k); ballV.y += Math.sin(Math.PI * k) * Math.min(0.45, dist * 0.03); }
        else {
          const a = t - tEnd;
          if (!step.hit) {
            step.hit = true; fire();
            if (goal) { hit = { t, x: lx, y: (ly - GH / 2) * R.slope / GH }; mood = 'cheer'; led = t; shakeT = t; K.mood = -1; Sh.gaze = false; anim(Sh, 'cheer', t, 9); list.forEach(P => { if (P !== Sh && P.side !== spec.atk) anim(P, 'sad', t + 0.2, 9); }); }
            else { mood = res === 'blocked' ? 'idle' : 'groan'; if (res === 'miss' && spec.miss === 'post') shakeT = t; if (res === 'save' || res === 'catch') K.mood = 1; anim(Sh, 'sad', t + 0.3, 9); }
          }
          if (goal) ballV.set(end.x * (1 - Math.min(1, a * 1.4) * 0.2), Math.max(0.08, end.y - a * a * 3.4), Math.min(-0.12, end.z + a * 0.25));
          else if (res === 'catch') carrier = K;
          else if (res === 'miss' && spec.miss !== 'post') ballV.set(end.x + lx * a * 0.6, end.y - a * a * 2, end.z - a * 3);
          else { const k = out(a / 1.0); ballV.set(end.x + deflect.x * k, Math.max(0.08, end.y + Math.sin(Math.min(1, a / 0.8) * Math.PI) * 0.55 - a * a * 1.2), end.z + deflect.z * k); }
        }
        // Goalie: wirft sich zum Ball, sobald der Schuss weg ist
        if (K.root.visible && !Bl && t >= tRel + 0.03 && K.anim === 'ready' && spec.dive !== null) {
          K.anim = res === 'catch' ? 'hold' : 'dive'; K.t0 = t; K.dur = Math.max(0.16, (tEnd - t) * 0.92); K.must = res === 'save' || res === 'catch';
          if (spec.dive && !K.must) K.tgt.set(spec.dive[0] * GW - K.pos.x, spec.dive[1] * GH, 0.08); else K.tgt.set(clamp(lx, -GW - 0.15, GW + 0.15) - K.pos.x, Math.min(ly, GH + 0.15), 0.08);
          K.amp = res === 'miss' && !spec.dive ? 0.45 : 1;
        }
        if (Bl && t > t0 + 0.2 && !step.block) { step.block = true; anim(Bl, 'lunge', t, 0.7, { dir: 0, stay: true }); }
        // Jubel: Der Schütze dreht ab, läuft Richtung Kamera und dreht sich im Sprung; die Mitspieler kommen dazu
        if (goal && t > tEnd + 0.45) {
          const tx = p0.x + back.x * 1.6, tz = p0.z + back.z * 1.6;
          if (!moveTo(Sh, tx, tz, 3.6, dt, true)) { look(Sh, tx + back.x * 9, tz + back.z * 9); if (!step.spin) step.spin = t; Sh.twirl = Math.PI * 2 * ease(seg(t, step.spin + 0.5, step.spin + 1.1)); }
          mates.forEach((P, i) => { if (P.anim !== 'cheer') { P.gaze = false; anim(P, 'cheer', t, 9); } const a2 = slots[mates.length === 4 ? i : i + 1] || 0, bk = 0.3 + Math.abs(a2) * 0.2, gx = tx - back.x * bk + back.z * a2, gz = tz - back.z * bk - back.x * a2; if (!moveTo(P, gx, gz, 5.6, dt, true)) look(P, gx + back.x * 9 - back.z * a2 * 2, gz + back.z * 9 + back.x * a2 * 2); });
        }
        // Kamera: über die Schulter, fliegt dem Ball nach; nach einem Tor Schnitt auf den jubelnden Schützen, Tor und Fans im Rücken
        if (goal && t >= tCut) {
          const k = ease(seg(t, tCut, dur));
          camP.copy(p0).addScaledVector(back, 4.9 - k * 0.5).setY(0.72 + k * 0.1); camL.copy(Sh.pos).setY(0.92 + Sh.J.body.position.y * 0.16); camAt(camP, camL, 40);
        } else {
          const k = ease(seg(t, tRel - 0.08, tEnd + 0.12)), pre = ease(seg(t, 0, tRel));
          // Geblockt: von der Seite, damit man Schütze und Blocker sieht
          if (Bl) { camP.copy(p0).addScaledVector(dir, 0.75).addScaledVector(stickSide, 3.5 - pre * 0.4).setY(1.15); camL.copy(p0).addScaledVector(dir, 0.75).setY(0.65); camAt(camP, camL, 46); return; }
          camP.lerpVectors(c0, c1, k).addScaledVector(dir, pre * (over ? 0.45 : 0.2)); if (over) { const arc = Math.sin(Math.PI * k); camP.y += arc * 0.55; camP.addScaledVector(stickSide, arc * 1.5); } camL.lerpVectors(l0, l1, k);
          camAt(camP, camL, 46);
        }
      };
    } else if (spec.kind === 'pass') {
      const A = by[spec.from], B = by[spec.to], C = spec.ok ? null : by[spec.by], M = spec.ok && spec.near ? by[spec.by] : null, a0 = A.pos.clone(), b0 = B.pos.clone(), d = Math.max(0.5, a0.distanceTo(b0));
      const u0 = V().subVectors(b0, a0).normalize(), n = V(u0.z, 0, -u0.x); if (n.z < 0 || (Math.abs(n.z) < 0.2 && n.x * a0.x > 0)) n.negate();
      const t0 = 0.12, sd = 0.62, tRel = t0 + sd * REL, fly = clamp(d / 13, 0.3, 0.85), cut = C ? V().lerpVectors(a0, b0, 0.58) : null, tEnd = tRel + fly * (C ? 0.58 : 1), from = V(); dur = tEnd + (C ? 1.15 : 0.95);
      list.forEach(P => { if (P.side === spec.atk) look(P, 0, 0, true); else look(P, a0.x, a0.z, true); });
      look(A, b0.x, b0.z, true); look(B, a0.x, a0.z, true); A.ball = true; focus([spec.from, spec.to]); if (C) focus([spec.by]);
      const c0 = a0.clone().addScaledVector(u0, -2.8 - d * 0.2).addScaledVector(n, 1.5 + d * 0.1).setY(2.0 + d * 0.12), l0 = V().lerpVectors(a0, b0, 0.38).setY(0.6);
      step = (t, dt) => {
        if (t >= t0 && !step.pass) { step.pass = true; anim(A, 'pass', t0, sd); }
        carrier = null;
        if (t < tRel) ballAt(A);
        else if (t < tEnd) { if (!step.from) { step.from = from.copy(ballV).clone(); A.ball = false; } const u = (t - tRel) / fly; ballV.lerpVectors(step.from, tmp.set(b0.x, 0.08, b0.z), u); ballV.y = 0.08 + Math.sin(Math.min(1, u) * Math.PI) * 0.04; }
        else {
          if (!step.hit) { step.hit = true; fire(); if (C) { C.ball = true; anim(A, 'sad', t + 0.25, 9); mood = 'groan'; } else { B.ball = true; look(B, 0, 0); if (M) { look(M, B.pos.x, B.pos.z, true); anim(M, 'lunge', t, 0.8, { dir: 0 }); } } }
          ballAt(C || B);
        }
        if (C) { if (t > 0.1 && t < tEnd) moveTo(C, cut.x, cut.z, Math.max(2, cut.distanceTo(C.pos) / Math.max(0.05, tEnd - t)), dt); else if (t >= tEnd + 0.15) moveTo(C, cut.x + n.x * 2, cut.z + n.z * 2 + 1.5, 3, dt); }
        else if (t > tRel && t < tEnd) look(B, ballV.x, ballV.z);
        const k = ease(seg(t, 0, dur)); camP.copy(c0).addScaledVector(u0, k * (C ? 0.4 : Math.min(1.6, d * 0.25)));
        if (C) camL.copy(l0).lerp(tmp.copy(C.pos).setY(0.65), ease(seg(t, tRel, dur)) * 0.8); else camL.copy(l0).addScaledVector(u0, k * d * 0.25);
        camAt(camP, camL, 46);
      };
    } else {
      // Dribbling: Der Dribbler läuft auf seinen Gegenspieler zu, täuscht an und zieht vorbei (der Verteidiger greift ins Leere
      // und fällt hin), oder der Verteidiger sticht den Ball weg
      const A = by[spec.x], D = by[spec.by], a0 = A.pos.clone(), res = spec.result, sd = hashOf(spec.x) % 2 ? 1 : -1;
      const toD = V().subVectors(D.pos, a0).setY(0), gap = toD.length(); toD.normalize(); if (gap < 2.2) D.pos.copy(a0).addScaledVector(toD, 2.2); if (gap > 4.2) D.pos.copy(a0).addScaledVector(toD, 4.2);
      const d0 = D.pos.clone(), len = a0.distanceTo(d0), sidev = V(toD.z, 0, -toD.x);
      const meet = d0.clone().addScaledVector(toD, -0.8), fake = meet.clone().addScaledVector(sidev, -sd * 0.42), around = d0.clone().addScaledVector(sidev, sd * 0.85).addScaledVector(toD, 0.1);
      const past = spec.to ? V(wx(spec.to[0]), 0, wz(spec.to[1])) : d0.clone().addScaledVector(toD, 1.9); if (past.distanceTo(d0) < 1.4) past.copy(d0).addScaledVector(toD, 1.8).addScaledVector(sidev, sd * 0.3);
      const t1 = clamp((len - 0.8) / 4.3, 0.3, 0.95), t2 = t1 + 0.34, t3 = t2 + clamp(past.distanceTo(around) / 5, 0.3, 0.7); dur = (res === 'past' ? t3 + 0.2 : t2) + 0.9;
      list.forEach(P => { if (P.side === spec.atk) look(P, 0, 0, true); else look(P, a0.x, a0.z, true); });
      look(A, d0.x, d0.z, true); look(D, a0.x, a0.z, true); A.ball = true; focus([spec.x, spec.by]);
      step = (t, dt) => {
        if (t < t1) moveTo(A, fake.x, fake.z, 4.3, dt);                                                 // anlaufen, leicht zur falschen Seite
        else if (res === 'lost') { if (t < t2) moveTo(A, meet.x, meet.z, 2.6, dt); else if (A.anim !== 'sad') { A.speed = 0; anim(A, 'sad', t, 9); } }
        else if (res === 'held') { if (t < t2 + 0.2) moveTo(A, meet.x - toD.x * 0.5 + sidev.x * sd * 0.5, meet.z - toD.z * 0.5 + sidev.z * sd * 0.5, 2.4, dt); else { A.speed = 0; if (A.anim === 'run') A.anim = 'idle'; look(A, 0, 0); } }
        else if (t < t2) moveTo(A, around.x, around.z, 5.4, dt); else if (!moveTo(A, past.x, past.z, 5, dt)) look(A, 0, 0);
        if (t > t1 - 0.12 && !step.lunged) { step.lunged = true; look(D, A.pos.x, A.pos.z, true); anim(D, 'lunge', t, 0.85, { dir: res === 'past' ? -sd * D.hand * 0.9 : 0, stay: res === 'past' }); }
        if (res === 'past' && t > t1 + 0.3 && D.anim === 'lunge') anim(D, 'fall', t, 0.7);
        if (!step.hit && t >= t2) { step.hit = true; fire(); if (res === 'lost') { A.ball = false; D.ball = true; mood = 'groan'; } }
        if (res === 'lost' && t >= t2 + 0.25) { D.stay = false; moveTo(D, d0.x - toD.x * 1.6 + sidev.x * sd * 2.2, d0.z - toD.z * 1.6 + sidev.z * sd * 2.2, 3.6, dt); }
        ballAt(res === 'lost' && t >= t2 ? D : A);
        const k = ease(seg(t, 0, dur)), lead = res === 'past' ? ease(seg(t, t2 + 0.2, t3 + 0.55)) : 0, mid = tmp.lerpVectors(A.pos, D.pos, res === 'lost' ? 0.5 + 0.4 * ease(seg(t, t2, dur)) : 0.5);
        if (lead) mid.lerp(camP.copy(A.pos).addScaledVector(toD, 1.4), lead * 0.75);
        if (!step.cam) { step.cam = true; camL.set(mid.x, 0.65, mid.z); }
        camL.set(lerp(camL.x, mid.x, 0.2), 0.65, lerp(camL.z, mid.z, 0.2));
        camP.lerpVectors(a0, A.pos, lead * 0.75).addScaledVector(toD, -2.9 + k * (lead ? 0.3 : 1.0)).addScaledVector(sidev, -sd * (1.15 - k * 0.3)).setY(1.4 + k * 0.2); camAt(camP, camL, 46);
      };
    }
    R.trailNew = true; R.led.material.map = R.ledIdle;
    const tick = dt => {
      tt += dt; step(tt, dt);
      list.forEach(P => {
        pose(P, tt, dt);
        // wer der Kamera im Weg steht und nicht zur Szene gehört, wird ausgeblendet
        const dx = P.pos.x - R.cam.position.x, dz = P.pos.z - R.cam.position.z, d2 = dx * dx + dz * dz;
        if (P.actor) { P.label.material.opacity = clamp((Math.sqrt(d2) - 2.4) / 1.2, 0, 1); if (P.anim === 'fall') P.label.visible = false; } else P.root.visible = d2 > 4.6;
      });
      if (K.root.visible) poseKeeper(K, tt, dt);
      if (carrier === K) keeperHand(K, ballV); else if (carrier) bladePos(carrier, ballV);
      setBall(ballV);
    };
    const draw = () => {
      fans(tt, spec.atk, mood); net(tt, hit);
      if (led) { const m = R.led.material; if (m.map !== R.ledGoal) m.map = R.ledGoal; R.ledGoal.offset.x = tt * 0.35; m.color.setScalar(0.7 + 0.3 * Math.abs(Math.sin((tt - led) * 9))); } else { R.ledIdle.offset.x = tt * 0.02; R.led.material.color.setScalar(1); }
      const sh = tt - shakeT; if (sh >= 0 && sh < 0.35) { const a = (1 - sh / 0.35) * 0.05; R.cam.position.x += Math.sin(sh * 70) * a; R.cam.position.y += Math.cos(sh * 55) * a * 0.7; }
      R.sun.target.position.set(R.look.x * 0.5, 0, clamp(R.look.z, 0, 9)); R.sun.position.set(R.sun.target.position.x - 4, 12, R.sun.target.position.z + 7);
      R.renderer.render(R.scene, R.cam);
    };
    let ended = false;
    const end = () => { if (ended) return; ended = true; fire(); resDone(true); };
    // Standbild für Tests: rechnet in festen Schritten bis zur Zeit o.at und zeichnet einmal
    if (o.at != null) { do tick(1 / 60); while (tt < Math.min(o.at, dur)); draw(); end(); return { impact, done, dur }; }
    /* skip: ans Ende springen (Vorspulen). kill: sofort aufhören. Mit o.linger läuft die Szene nach ihrem Ende weiter
       (Jubel, Fans), bis sie versteckt oder ersetzt wird. */
    const me = {
      skip() { if (ended) return; try { while (tt < dur) tick(1 / 30); draw(); } catch (e) { broken = true; } end(); if (!o.linger) me.kill(); },
      kill() { cancelAnimationFrame(R.raf); if (run === me) run = null; end(); }
    };
    run = me;
    let last = performance.now() / 1000;
    const frame = () => {
      if (run !== me) return;
      try { const now = performance.now() / 1000, dt = Math.min(0.1, Math.max(0.001, now - last)) * (o.speed || 1); last = now; tick(dt); draw(); }
      catch (e) { broken = true; if (window.console) console.warn('3D-Szene ausgefallen: ' + (e && e.stack || e)); me.kill(); return; }
      if (tt >= dur) { end(); if (!o.linger || tt > dur + 20) { run = null; return; } }
      R.raf = requestAnimationFrame(frame);
    };
    frame();
    return { impact, done, dur };
  }
  // Baut die Halle im Voraus (beim Anpfiff), damit die erste Szene nicht stockt
  function warm(host) { if (!ok() || R) return; try { build(host); resize(); R.renderer.compile(R.scene, R.cam); } catch (e) { broken = true; } }
  function stop() { if (run) run.skip(); }
  function hide() { if (run) run.kill(); if (R) R.host.hidden = true; }

  window.HKScene3D = { ok, warm, play, stop, hide };
})();
