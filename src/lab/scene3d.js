/* Das Match in 3D: eine Halle mit ganzem Feld, zwei Toren und Tribünen und Knetfiguren, die das Spiel zeigen.
   Braucht three.js (window.THREE). Fehlt es oder gibt es kein WebGL, meldet ok() false, und das Match läuft wie
   bisher in der Sicht von oben.
   Stil: Knete statt Realismus. Grosser Kopf, Kulleraugen, breites Lachen, kurze dicke Arme und Beine, Fäustlinge, grosse
   runde Schuhe, alles leicht unrund. Weiches Studiolicht, der Hintergrund ist unscharf wie bei einer Aufnahme von Miniaturen.
   Orte: Die Halle rechnet in Metern. Aus dem Feld des Matchs (360 x 800, Tore bei y 40 und y 760) wird x = (x - 180) * S,
   z = (y - 40) * S. Das obere Tor steht bei z = 0, das untere bei z = RL. Du spielst aufs obere Tor.
   Betrieb: live (die Figuren stehen dort, wo das Match sie hinstellt), cut (eine Szene läuft ab: Pass, Dribbling, Schuss),
   aim (Zielen und Parade vor dem Tor), drib (Dribbling-Parcours). Szenen rechnen immer so, als ginge es aufs obere Tor;
   greift der Gegner an, wird alles gespiegelt (flip).
   Figuren: Jede Haltung ist ein Satz Zahlen (Becken, Füsse, Stock, Hände, Gesicht). Arme und Beine folgen über zwei Glieder
   mit Gelenk (Schulter-Ellbogen, Hüfte-Knie), damit die Hände am Stock und die Füsse am Boden bleiben. */
(function () {
  'use strict';
  const S = 0.05, GW = 1.15, GH = 1.45, GD = 0.75, RL = 36, KS = 0.9;        // Massstab, halbe Torbreite, Torhöhe, Tortiefe, Abstand der Torlinien, Grösse des Goalies
  const LEN = 0.84, LIE = 0.8, FLOOR = 0.055;                    // Stocklänge, Winkel der Schaufel zum Schaft, Höhe der Schaufel am Boden
  const A1 = 0.19, A2 = 0.19, T1 = 0.17, T2 = 0.17, ANK = 0.1, SHX = 0.225, SHY = 0.35, HPX = 0.115, HPY = -0.07, NECK = 0.46, KH = 0.3, KSX = 0.27;
  const wx = x => (x - 180) * S, wz = y => (y - 40) * S, RAD = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), out = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3), seg = (t, a, b) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a), 0, 1));
  const bounce = t => { const n = 7.5625, d = 2.75; t = clamp(t, 0, 1); return t < 1 / d ? n * t * t : t < 2 / d ? n * (t -= 1.5 / d) * t + 0.75 : t < 2.5 / d ? n * (t -= 2.25 / d) * t + 0.9375 : n * (t -= 2.625 / d) * t + 0.984375; };
  const TEAM = {
    you: { jersey: 0x1846d2, trim: 0xfafafa, shorts: 0x12206a, sock: 0x1846d2, shoe: 0x161f5c, num: '#ffffff', shaft: 0xf4f1e8, blade: 0xffffff, fans: [0x2f6dff, 0xeef2ff, 0x123aa8], keeper: 0xf3f1ea, helmet: 0x2553d6, glove: 0xe23b30, pants: 0xf1efe8, pad: 0xfaf8f2, knum: '#2553d6' },
    home: { jersey: 0x2a2c36, trim: 0xf2c94c, shorts: 0x1f2028, sock: 0xd9a93a, shoe: 0x17181d, num: '#f2c94c', shaft: 0x2a2b33, blade: 0xe0b23c, fans: [0xf7d774, 0x2a2e42, 0xc9972a], keeper: 0x3a3f5c, helmet: 0xe0b23c, glove: 0xf2c94c, pants: 0x2b2e3d, pad: 0x4a4f6b, knum: '#f2c94c' }
  };
  const SKIN = [0xf2bf96, 0xe8a877, 0xc98c5e, 0x9a6540, 0xf6d2b4], HAIR = [0x6b4226, 0x2a1b12, 0x16130f, 0xd9a441, 0xa8431c, 0x8a5a2b], BRIGHT = [0x3fae5a, 0xf2c230, 0xe8553d, 0xf08a2e, 0xffffff, 0xb15be0];
  const hashOf = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  let T = null, R = null, broken = false, onFail = null;      // THREE, alles einmal Gebaute, ob die Darstellung ausgefallen ist
  // Regie: Betriebsart, Zeit, laufende Szene und was das Match zuletzt gemeldet hat
  const D = { mode: 'live', t: 0, cut: null, camY: 0, fz: 8.5, bx: 0, carrier: null, ballFree: null, ballAt: -9, blend: 0, blendT: 0.45, aim: null, drib: null, lanes: [], loop: false, raf: 0, last: 0, flip: false };

  function ok() {
    if (broken || !window.THREE) return false;
    if (R) return true;
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  }
  function fail(e) { broken = true; D.loop = false; cancelAnimationFrame(D.raf); if (window.console) console.warn('3D-Szene ausgefallen: ' + (e && e.stack || e)); if (D.cut) { const c = D.cut; D.cut = null; c.end(); } if (R) R.host.hidden = true; if (onFail) try { onFail(); } catch (x) { /* das Match läuft ohne 3D weiter */ } }

  // --- Bausteine ---
  // Knete: matt, mit feinen Dellen und Fingerabdrücken in der Oberfläche
  const mat = (color, o) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.78, metalness: 0, bumpMap: R.bump, bumpScale: 0.0035, envMapIntensity: 0.85 }, o));
  function mesh(geo, m, parent, x, y, z) { const o = new T.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; if (parent) parent.add(o); return o; }
  function deco(geo, m, parent, x, y, z) { const o = mesh(geo, m, parent, x, y, z); o.castShadow = false; return o; }      // Kleinteile ohne Schatten
  function group(parent, x, y, z) { const g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; }
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; }
  const FONT = '"Saira Condensed","Arial Narrow",Arial,sans-serif', texCache = {};
  const cached = (key, make) => texCache[key] || (texCache[key] = make());
  // Mehrere Geometrien zu einer (Ort, Normale, Textur-Ort, Index); cols: eine Farbe pro Teil
  function merge(parts, cols) {
    let nv = 0, ni = 0; parts.forEach(g => { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = cols ? new Float32Array(nv * 3) : null, idx = new (nv > 65535 ? Uint32Array : Uint16Array)(ni); let vo = 0, io = 0;
    parts.forEach((g, k) => {
      const n = g.attributes.position.count; pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, vo * 2);
      if (col) { const c = new T.Color(cols[k]); for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], (vo + i) * 3); }
      if (g.index) for (let i = 0; i < g.index.count; i++) idx[io++] = g.index.array[i] + vo; else for (let i = 0; i < n; i++) idx[io++] = vo + i;
      vo += n;
    });
    const o = new T.BufferGeometry(); o.setAttribute('position', new T.BufferAttribute(pos, 3)); o.setAttribute('normal', new T.BufferAttribute(nor, 3)); o.setAttribute('uv', new T.BufferAttribute(uv, 2)); if (col) o.setAttribute('color', new T.BufferAttribute(col, 3)); o.setIndex(new T.BufferAttribute(idx, 1)); return o;
  }
  // Von Hand geformt: schiebt die Oberfläche leicht unregelmässig nach innen und aussen
  function lump(geo, amp, f, seed) {
    const p = geo.attributes.position, n = geo.attributes.normal;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = (Math.sin(x * f + seed) * Math.cos(y * f * 1.3 + seed * 2) + Math.sin(z * f * 0.9 + seed * 3 + x * f * 0.5)) * 0.5 * amp; p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d); }
    geo.computeVertexNormals(); return geo;
  }

  // Slot vor dem oberen Tor, in Feldeinheiten (wie in der Sicht von oben)
  const SLOT = [[140, 102], [220, 102], [238, 150], [212, 196], [148, 196], [122, 150]];
  // Für dieses Bildformat (Breite zu Höhe) sind die Brennweiten der Kamera gewählt
  const REFA = 0.857;
  // Hallenboden mit Linien, wie im Match von oben: das ganze Feld, 360 x 800
  function floorTex() {
    return canvasTex(1024, 2048, (g, w, h) => {
      const kx = w / 360, ky = h / 800, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4f93dc'); gr.addColorStop(0.5, '#4588d4'); gr.addColorStop(1, '#4f93dc');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,10,60'},${0.012 + r() * 0.03})`; g.beginPath(); g.ellipse(r() * w, r() * h, 10 + r() * 70, 6 + r() * 30, r() * 3.14, 0, 7); g.fill(); }      // Gebrauchsspuren
      // Slot: die Zone vor dem Tor, aus der die meisten Tore fallen (heller, gestrichelt umrandet), an beiden Enden
      [0, 1].forEach(e => { g.beginPath(); SLOT.forEach((q, i) => { const y = e ? 800 - q[1] : q[1]; if (i) g.lineTo(q[0] * kx, y * ky); else g.moveTo(q[0] * kx, y * ky); }); g.closePath(); g.fillStyle = 'rgba(255,255,255,.085)'; g.fill(); g.setLineDash([22, 20]); g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.4)'; g.stroke(); g.setLineDash([]); });
      g.strokeStyle = 'rgba(255,255,255,.88)'; g.fillStyle = 'rgba(255,255,255,.88)'; g.lineWidth = 9; g.lineCap = 'round';
      const L = (x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x1 * kx, y1 * ky); g.lineTo(x2 * kx, y2 * ky); g.stroke(); }, rect = (x, y, bw, bh) => g.strokeRect(x * kx, y * ky, bw * kx, bh * ky);
      L(4, 400, 356, 400); g.beginPath(); g.ellipse(180 * kx, 400 * ky, 7 * kx, 7 * ky, 0, 0, 7); g.fill();
      [0, 1].forEach(e => { const Y = y => (e ? 800 - y : y), top = (a, b) => Math.min(Y(a), Y(b)); rect(130, top(22, 102), 100, 80); g.save(); g.fillStyle = 'rgba(130,180,255,.42)'; g.fillRect(155 * kx, top(36, 56) * ky, 50 * kx, 20 * ky); g.restore(); rect(155, top(36, 56), 50, 20); g.lineWidth = 7; [[70, 110], [290, 110]].forEach(p => { L(p[0] - 6, Y(p[1]), p[0] + 6, Y(p[1])); L(p[0], Y(p[1]) - 6, p[0], Y(p[1]) + 6); }); g.lineWidth = 9; });
      [[70, 400], [290, 400]].forEach(p => { L(p[0] - 6, p[1], p[0] + 6, p[1]); L(p[0], p[1] - 6, p[0], p[1] + 6); });
    });
  }
  function netTex() { return canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.96)'; g.lineWidth = 5; for (let i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }); }
  const numTex = (no, color) => cached('n' + no + color, () => canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = color; g.strokeStyle = color; g.lineWidth = 7; g.lineJoin = 'round'; g.font = '800 96px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText(String(no), w / 2, h / 2 + 6); g.fillText(String(no), w / 2, h / 2 + 6); }));
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
  // Weiches Studiolicht als Umgebung: helle warme Decke, blaue Wände, blauer Boden. Spiegelt sich matt in Knete und Hallenboden.
  function studioEnv(renderer) {
    const pm = new T.PMREMGenerator(renderer), s = new T.Scene(), bm = c => new T.MeshBasicMaterial({ color: c, side: T.DoubleSide });
    const add = (g, c, x, y, z) => { const o = new T.Mesh(g, bm(c)); o.position.set(x, y, z); s.add(o); return o; };
    add(new T.SphereGeometry(40, 16, 12), 0x24316e, 0, 0, 0);
    add(new T.PlaneGeometry(46, 46), 0xfff3e0, 0, 16, 0).rotation.x = Math.PI / 2;      // Decke: grosses warmes Licht
    add(new T.PlaneGeometry(60, 60), 0x4a86d6, 0, -6, 0).rotation.x = Math.PI / 2;      // Boden: blauer Widerschein
    add(new T.PlaneGeometry(30, 10), 0xdfeaff, 0, 8, -24);                              // kühles Licht von hinten
    add(new T.PlaneGeometry(20, 8), 0xffe2bd, -22, 9, 6).rotation.y = Math.PI / 2;
    const t = pm.fromScene(s, 0.035).texture; pm.dispose(); return t;
  }

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
    g[PY] = 0.45 - 0.02 * k + Math.abs(s) * 0.05 * k; g[LEAN] = 0.24 + 0.16 * k; g[TW] = s * 0.16; g[HIPY] = -s * 0.18; g[HX] = -0.18; g[SIDE] = s * 0.05; g[SQ] = 1 + Math.cos(2 * f) * 0.045 * k;
    setv(g, FN, -0.11, ANK + Math.max(0, c) * 0.13 * k, s * 0.18 * k + 0.02); g[PN] = 0.6 * (Math.max(0, c) + Math.max(0, -s) * 0.6);
    setv(g, FP, 0.11, ANK + Math.max(0, -c) * 0.13 * k, -s * 0.18 * k + 0.02); g[PP] = 0.6 * (Math.max(0, -c) + Math.max(0, s) * 0.6);
    return s;
  }
  function poseOf(P, t, g) {
    const a = P.anim, u = clamp((t - P.t0) / (P.dur || 1), 0, 1), w = t + P.ph;
    g.fill(0); g[SQ] = 1;
    // Grundhaltung: bereit, Knie gebeugt, Schaufel am Boden
    g[PY] = 0.43; g[LEAN] = 0.34; g[SIDE] = -0.08; g[HX] = -0.24;
    setv(g, FN, -0.17, ANK, -0.02); setv(g, FP, 0.17, ANK, 0.04);
    stick(g, -0.03, 0.6, 0.24, 25, null);
    if (a === 'idle') { const b = Math.sin(w * 2.6); g[PY] += b * 0.014; g[SQ] = 1 + b * 0.02; g[TP] += Math.sin(w * 1.3) * 0.012; g[HY] = Math.sin(w * 0.9) * 0.08; }
    else if (a === 'run') {
      const k = clamp(P.speed / 4.6, 0.4, 1.1), s = runLegs(P, g, k);
      if (P.ball) { stick(g, -0.04, 0.62, 0.26, 58 + s * 9, null); g[BROW] = 0.5; } else stick(g, -0.02, 0.64, 0.24, 32, -40);
    } else if (a === 'shot') {
      const st = P.style || 'wrist', fol = seg(u, REL, 1);
      if (st === 'slap') {
        // Schlagschuss: weit ausholen (Stock hinter dem Körper bis Hüfthöhe), auf den Ball schlagen, hoch ausschwingen
        g[PY] = kf(u, SU, [0.43, 0.41, 0.39, 0.5], SE); g[PZ] = kf(u, SU, [0, -0.1, 0.1, 0.18], SE); g[LEAN] = kf(u, SU, [0.36, 0.3, 0.48, 0.12], SE);
        g[TW] = kf(u, SU, [0.3, 1.45, -0.15, -1.1], SE); g[HIPY] = kf(u, SU, [0.25, 0.8, 0, -0.45], SE); g[HX] = -0.26; g[HY] = -g[TW] * 0.62; g[SQ] = kf(u, SU, [1, 0.86, 1.15, 1], SE);
        setv(g, FN, -0.13, ANK, 0.23); setv(g, FP, 0.18 - fol * 0.04, ANK + fol * 0.1, -0.21 + fol * 0.18); g[PP] = fol * 0.8;
        // die Schaufel trifft den Ball dort, wo er vor dem Ausholen lag (Stützstelle 2 ist die Grundhaltung)
        stick(g, kf(u, SU, [-0.03, 0.17, -0.03, -0.16], SE), kf(u, SU, [0.6, 0.7, 0.6, 0.8], SE), kf(u, SU, [0.24, 0.08, 0.24, 0.3], SE), kf(u, SU, [25, -82, 25, 108], SE),
          u < SU[1] ? lerp(floorEps(0.6), 16, ease(u / SU[1])) : u < REL ? lerp(16, floorEps(0.6), snap(seg(u, SU[1], REL))) : lerp(floorEps(0.6), 26, out(fol)));
        g[BROW] = 1 - fol * 0.5; g[MOUTH] = u < SU[1] ? 0.1 : u < REL ? 1 : 1 - fol * 0.5; g[BRY] = fol * 0.7;
      } else if (st === 'drag') {
        // Zugschuss: Der Ball liegt weit aussen an der Schaufel, wird am Körper vorbei nach innen gezogen und dann aus dem Handgelenk geschossen
        g[PX] = kf(u, SU, [0.1, -0.12, -0.13, -0.1], SE); g[PY] = kf(u, SU, [0.42, 0.39, 0.41, 0.48], SE); g[PZ] = kf(u, SU, [0, 0.02, 0.08, 0.13], SE); g[LEAN] = kf(u, SU, [0.4, 0.46, 0.42, 0.2], SE);
        g[TW] = kf(u, SU, [-0.35, 0.6, -0.05, -0.7], SE); g[HIPY] = kf(u, SU, [-0.15, 0.35, 0.05, -0.3], SE); g[SIDE] = kf(u, SU, [-0.2, 0.14, 0.04, 0], SE); g[HX] = -0.3; g[HY] = -g[TW] * 0.6; g[SQ] = kf(u, SU, [1, 0.93, 1.08, 1], SE);
        const stp = Math.sin(Math.PI * seg(u, 0.04, SU[1])); setv(g, FN, kf(u, SU, [-0.15, -0.34, -0.34, -0.3], SE), ANK + stp * 0.07, 0.12); g[PN] = stp * 0.3; setv(g, FP, 0.19 - fol * 0.05, ANK + fol * 0.05, -0.12 + fol * 0.1); g[PP] = fol * 0.5;
        stick(g, kf(u, SU, [0.12, -0.08, -0.14, -0.16], SE), kf(u, SU, [0.6, 0.58, 0.58, 0.7], SE), kf(u, SU, [0.24, 0.24, 0.34, 0.32], SE), kf(u, SU, [20, 72, 98, 114], SE), u < REL ? null : lerp(floorEps(0.58), 4, out(fol)));
        g[BROW] = 0.6 - fol * 0.6; g[MOUTH] = u < SU[1] ? 0 : 0.3 + fol * 0.4; g[BRY] = seg(u, 0, SU[1]) * 0.5 + fol * 0.3;
      } else {
        // Handgelenkschuss: kaum ausholen, die Schaufel bleibt am Boden und schnappt nach vorn
        g[PY] = kf(u, SU, [0.43, 0.395, 0.42, 0.48], SE); g[PZ] = kf(u, SU, [0, -0.04, 0.07, 0.12], SE); g[LEAN] = kf(u, SU, [0.36, 0.44, 0.4, 0.2], SE);
        g[TW] = kf(u, SU, [0.3, 0.8, -0.05, -0.7], SE); g[HIPY] = kf(u, SU, [0.25, 0.45, 0.05, -0.3], SE); g[HX] = -0.26; g[HY] = -g[TW] * 0.7; g[SQ] = kf(u, SU, [1, 0.92, 1.08, 1], SE);
        setv(g, FN, -0.12, ANK, 0.18); setv(g, FP, 0.17 - fol * 0.03, ANK + fol * 0.05, -0.16 + fol * 0.11); g[PP] = fol * 0.6;
        stick(g, kf(u, SU, [-0.03, 0.07, -0.08, -0.13], SE), kf(u, SU, [0.6, 0.58, 0.58, 0.7], SE), kf(u, SU, [0.24, 0.19, 0.3, 0.28], SE), kf(u, SU, [25, -28, 40, 92], SE), u < REL ? null : lerp(floorEps(0.58), 8, out(fol)));
        g[BROW] = 1 - fol; g[MOUTH] = u < REL ? 0.2 : 0.2 + fol * 0.5; g[BRY] = fol * 0.6;
      }
    } else if (a === 'pass') {
      const PU = [0, 0.36, 0.62, 1];
      g[TW] = kf(u, PU, [0.25, 0.6, 0, -0.3], SE); g[HIPY] = g[TW] * 0.4; g[PZ] = kf(u, PU, [0, -0.04, 0.05, 0.08], SE); g[HY] = -g[TW] * 0.7; g[SQ] = kf(u, PU, [1, 0.95, 1.05, 1], SE);
      setv(g, FN, -0.13, ANK, 0.15); setv(g, FP, 0.17, ANK, -0.11);
      const fol = seg(u, REL, 1);
      stick(g, kf(u, PU, [-0.03, 0.05, -0.07, -0.09], SE), kf(u, PU, [0.6, 0.58, 0.58, 0.63], SE), kf(u, PU, [0.24, 0.18, 0.28, 0.28], SE), kf(u, PU, [25, -12, 50, 74], SE), u < REL ? null : lerp(floorEps(0.58), -30, out(fol)));
    } else if (a === 'lunge' || a === 'fall') {
      // Der Verteidiger macht einen Ausfallschritt und sticht mit dem Stock nach vorn; dir: wohin (-1 Seite N, +1 Seite P).
      // fall: Er greift ins Leere und kippt vornüber.
      const gq = a === 'fall' ? 1 : out(seg(u, 0, 0.45)) - (P.stay ? 0 : seg(u, 0.7, 1) * 0.6), d = P.dir || 0;
      g[PY] = 0.43 - 0.12 * gq; g[PZ] = 0.2 * gq; g[PX] = d * 0.1 * gq; g[LEAN] = 0.36 + 0.34 * gq; g[HX] = -0.5; g[TW] = -0.25 * gq; g[BROW] = 1; g[MOUTH] = 0.3;
      setv(g, FN, -0.16, ANK, -0.18 * gq); g[PN] = 0.4 * gq; setv(g, FP, 0.12 + d * 0.18 * gq, ANK + Math.sin(Math.PI * seg(u, 0, 0.4)) * 0.08, 0.08 + 0.36 * gq);
      stick(g, 0.02 + d * 0.12 * gq, 0.58 - 0.18 * gq, 0.24 + 0.34 * gq, 25 + (62 + d * 38) * gq, null);
      g[WP] = gq; setv(g, HP, 0.4, 0.56, -0.1);
      if (a === 'fall') { g[WN] = 1; setv(g, HN, -0.3, 0.7, 0.3); setv(g, HP, 0.3, 0.7, 0.3); g[HX] = -0.75; g[MOUTH] = 1; g[BROW] = -1; g[BRY] = 1; g[PY] = 0.45; setv(g, FN, -0.14, ANK + 0.03, -0.1 + Math.sin(w * 14) * 0.08 * (1 - u)); setv(g, FP, 0.14, ANK + 0.03, -0.1 - Math.sin(w * 14) * 0.08 * (1 - u)); }
    } else if (a === 'cheer') {
      // Jubel: hüpfen, Stock in der einen Hand hoch, die andere Faust in die Luft; im Sprung gestreckt, bei der Landung gestaucht
      const j = Math.abs(Math.sin(w * 6.2)), moving = P.speed > 0.5, y = moving ? 0 : 0.26 * j;
      if (moving) runLegs(P, g, clamp(P.speed / 4.6, 0.4, 1)); else { g[PY] = 0.48 + y; setv(g, FN, -0.16, ANK + Math.max(0, y - 0.04), 0); setv(g, FP, 0.16, ANK + Math.max(0, y - 0.04), 0); g[PN] = g[PP] = y * 2; g[SQ] = 0.86 + 0.26 * j; }
      g[LEAN] = moving ? 0.06 : -0.08; g[SIDE] = Math.sin(w * 3.1) * 0.08; g[TW] = Math.sin(w * 3.1) * 0.14; g[HX] = -0.2; g[MOUTH] = 1; g[BRY] = 1;
      const hy = g[PY] + 0.62 + Math.sin(w * 12.4) * 0.03, sx = 0.2, sy = 0.95, sz = -0.12, sl = Math.hypot(sx, sy, sz);
      setv(g, TP, 0.34 - 0.25 * sx / sl, hy - 0.25 * sy / sl, 0.05 - 0.25 * sz / sl); setv(g, BL, g[TP] + LEN * sx / sl, g[TP + 1] + LEN * sy / sl, g[TP + 2] + LEN * sz / sl);
      g[WN] = 1; setv(g, HN, -0.34, g[PY] + 0.65 + Math.sin(w * 12.4 + 2) * 0.05, 0.1);
    } else if (a === 'sad') {
      g[PY] = 0.48; g[LEAN] = 0.3; g[SIDE] = 0; g[HX] = 0.42; g[HY] = Math.sin(w * 1.1) * 0.18; g[MOUTH] = -1; g[BROW] = -1; g[SQ] = 0.95; setv(g, FN, -0.13, ANK, 0); setv(g, FP, 0.13, ANK, 0.02);
      stick(g, 0.02, 0.64, 0.2, 35, null);
    }
    if (P.hand < 0) {      // spiegeln
      [PX, FN, FP, TP, BL, HN, HP, HIPY, TW, SIDE, HY].forEach(i => { g[i] = -g[i]; });
      for (let i = 0; i < 4; i++) { let v = g[FN + i]; g[FN + i] = g[FP + i]; g[FP + i] = v; v = g[WN + i]; g[WN + i] = g[WP + i]; g[WP + i] = v; }
    }
  }

  /* Zwei Glieder mit Gelenk: joint ist frei drehbar, mid knickt um x. d ist das Ziel, gemessen vom Gelenk aus im Raum
     seines Elternteils. fwd +1: das zweite Glied knickt nach vorn (Arm), -1: nach hinten (Bein). */
  function ik(joint, mid, d, l1, l2, fwd, twist) {
    const DD = clamp(d.length(), 0.05, l1 + l2 - 0.004), bend = Math.PI - Math.acos(clamp((l1 * l1 + l2 * l2 - DD * DD) / (2 * l1 * l2), -1, 1));
    R.q1.setFromAxisAngle(R.up, twist); R.v1.set(0, -l1 - l2 * Math.cos(bend), fwd * l2 * Math.sin(bend)).applyQuaternion(R.q1).normalize(); R.v2.copy(d).normalize();
    joint.quaternion.setFromUnitVectors(R.v1, R.v2).multiply(R.q1); mid.rotation.x = -fwd * bend;
  }

  /* Kopf aus Knete: Kugel mit Ohren und Nase, Kulleraugen mit beweglichen Pupillen und Glanzpunkt, Brauen, rote Wangen,
     Mund (Grinsen mit Zähnen oder Bogen, weit offen, traurig). Der Kopf dreht um den Hals (neck); h ist die Kopfmitte. */
  function makeHead(m, parent) {
    const G = R.geo, neck = group(parent, 0, NECK, 0), h = group(neck, 0, 0.25, 0);
    mesh(G.head, m.skin, h);
    const eyes = group(h, 0, -0.005, 0); deco(G.eyes, R.whiteMat, eyes);
    const pN = deco(G.pupil, R.pupilMat, eyes, -0.078, 0, 0.266), pP = deco(G.pupil, R.pupilMat, eyes, 0.078, 0, 0.266);
    const bN = deco(G.brow, m.hair, h, -0.086, 0.1, 0.243), bP = deco(G.brow, m.hair, h, 0.086, 0.1, 0.243);
    deco(G.cheek, R.blushMat, h, -0.155, -0.075, 0.196); deco(G.cheek, R.blushMat, h, 0.155, -0.075, 0.196);
    const smile = deco(G.smile, R.mouthMat, h, 0, -0.085, 0.236); smile.rotation.x = 0.36;
    const grin = group(h, 0, -0.088, 0.226); deco(G.grin, R.mouthMat, grin); deco(G.teeth, R.whiteMat, grin, 0, -0.014, 0.02); grin.rotation.x = 0.2;
    const open = group(h, 0, -0.135, 0.222); deco(G.mouthIn, R.mouthMat, open); deco(G.teeth, R.whiteMat, open, 0, 0.028, 0.012); deco(G.tongue, R.tongueMat, open, 0, -0.022, 0.012); open.visible = false;
    return { neck, h, eyes, pN, pP, bN, bP, smile, grin, open, grins: true };
  }
  // Gesicht stellen: blinzeln, Blick (gx, gy), Brauen, Mund
  function face(H, t, ph, mouth, brow, bry, gx, gy) {
    H.eyes.scale.y = ((t * 0.37 + ph * 0.61) % 1) < 0.045 ? 0.12 : 1 + bry * 0.08;
    H.pN.position.x = -0.078 + gx; H.pP.position.x = 0.078 + gx; H.pN.position.y = H.pP.position.y = gy;
    H.bN.rotation.z = -brow * 0.4; H.bP.rotation.z = brow * 0.4; H.bN.position.y = H.bP.position.y = 0.1 + bry * 0.035 - Math.max(0, brow) * 0.014;
    const open = mouth > 0.6, frown = mouth < -0.4, grin = !open && !frown && H.grins; H.open.visible = open; H.grin.visible = grin; H.smile.visible = !open && !grin;
    if (open) H.open.scale.set(0.8 + mouth * 0.2, 0.5 + mouth * 0.6, 1);
    else if (grin) H.grin.scale.set(0.9 + mouth * 0.25, 0.75 + mouth * 0.5, 1);
    else if (frown) { H.smile.rotation.set(0.75, 0, Math.PI); H.smile.position.set(0, -0.2, 0.185); } else { H.smile.rotation.set(0.36, 0, 0); H.smile.position.set(0, -0.085, 0.236); }
  }

  /* Eine Feldspieler-Figur aus Knete. J hält die Gelenke. */
  function makePlayer() {
    const G = R.geo, root = new T.Group(), body = group(root), J = { root, body }; root.rotation.order = 'YXZ';
    const m = { jersey: mat(0xffffff), trim: mat(0xffffff), shorts: mat(0x222222), sock: mat(0xffffff), skin: mat(0xe0ac69, { roughness: 0.7 }), hair: mat(0x222222, { roughness: 0.9 }), shoe: mat(0x15171f, { roughness: 0.66 }), shaft: mat(0xeef1f7, { roughness: 0.6 }), tape: mat(0x23252e), blade: mat(0xffffff, { roughness: 0.6, map: R.bladeMap }), num: new T.MeshBasicMaterial({ transparent: true, depthWrite: false }) };
    J.hips = group(body); mesh(G.shorts, m.shorts, J.hips, 0, -0.1, 0);
    J.spine = group(body); J.spine.rotation.order = 'YXZ';
    mesh(G.torso, m.jersey, J.spine); deco(G.hem, m.trim, J.spine, 0, -0.04, 0); deco(G.collar, m.trim, J.spine, 0, 0.465, 0);
    const nf = new T.Mesh(G.numPlane, m.num); nf.position.set(0, 0.22, 0.176); J.spine.add(nf);
    const nb = new T.Mesh(G.numPlane, m.num); nb.position.set(0, 0.23, -0.176); nb.rotation.y = Math.PI; J.spine.add(nb);
    J.H = makeHead(m, J.spine); J.hair = mesh(G.hair[0], m.hair, J.H.h);
    [-1, 1].forEach(sd => {
      const k = sd < 0 ? 'N' : 'P', sh = group(J.spine, sd * SHX, SHY, 0); mesh(G.sleeve, m.jersey, sh); deco(G.cuff, m.trim, sh, 0, -0.13, 0); mesh(G.upper, m.skin, sh, 0, -0.12, 0);
      const el = group(sh, 0, -A1, 0); mesh(G.forearm, m.skin, el);
      J['sh' + k] = sh; J['el' + k] = el;
      const hip = group(J.hips, sd * HPX, HPY, 0); mesh(G.shortLeg, m.shorts, hip, 0, -0.045, 0); mesh(G.thigh, m.skin, hip);
      const knee = group(hip, 0, -T1, 0); mesh(G.sock, m.sock, knee);
      const foot = group(knee, 0, -T2, 0); mesh(G.shoe, m.shoe, foot);
      J['hip' + k] = hip; J['knee' + k] = knee; J['foot' + k] = foot;
    });
    // Stock: oben der Griff, unten die Schaufel im festen Winkel zum Schaft
    J.stick = group(root); mesh(G.shaft, m.shaft, J.stick, 0, -LEN / 2, 0); deco(G.tape, m.tape, J.stick, 0, -0.11, 0);
    J.blade = group(J.stick, 0, -LEN, 0); J.blade.rotation.z = -LIE; mesh(G.blade, m.blade, J.blade, 0.14, 0, 0);
    const label = { visible: false };      // ob das Namensschild in einer Szene zu sehen ist (das Schild selbst ist HTML: tag)
    const blob = new T.Mesh(G.blob, R.blobMat); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.012; root.add(blob);
    root.visible = false;
    return { root, J, m, label, blob, pos: new T.Vector3(), live: new T.Vector3(), face: 0, faceTo: 0, anim: 'idle', t0: 0, ph: 0, speed: 0, vel: 0, hand: 1, cur: new Float32Array(NP), tgt: new Float32Array(NP), fresh: true, top: new T.Vector3(), dir: 0, pitch: 0, twirl: 0, used: false, id: null, side: 'you', snap: true, hide: false, tag: null, big: 1, temp: false };
  }
  // Farben, Frisur, Nummer und Name einer Figur setzen
  function dress(P, o) {
    const tm = TEAM[o.side], h = hashOf(o.id || 'x');
    P.m.jersey.color.setHex(tm.jersey); P.m.trim.color.setHex(tm.trim); P.m.shorts.color.setHex(tm.shorts); P.m.sock.color.setHex(tm.sock); P.m.shoe.color.setHex(tm.shoe); P.m.blade.color.setHex(tm.blade); P.m.shaft.color.setHex(tm.shaft);
    P.m.skin.color.setHex(SKIN[h % SKIN.length]); P.m.hair.color.setHex(HAIR[(h >>> 3) % HAIR.length]); P.J.hair.geometry = R.geo.hair[(h >>> 6) % R.geo.hair.length]; P.J.H.grins = (h >>> 9) % 3 !== 0;
    P.m.num.map = numTex(o.no || (h % 89) + 2, tm.num); P.m.num.needsUpdate = true;
    P.hand = h % 3 === 0 ? -1 : 1; P.ph = (h % 628) / 100; P.id = o.id; P.side = o.side; P.name = o.name || ''; P.cycle = 0; P.used = true; P.snap = true; P.hide = false; P.vel = 0;
    reset(P);
  }
  // Zustand einer Figur zurück auf «steht bereit»
  function reset(P) { if (P.hand0) { P.hand = P.hand0; P.hand0 = 0; } P.style = null; P.poof = 0; P.anim = 'idle'; P.speed = 0; P.ball = false; P.fresh = true; P.stay = false; P.dir = 0; P.pitch = 0; P.twirl = 0; P.gaze = true; P.actor = false; P.label.visible = false; }
  // Szenenraum → Halle: gespiegelt, wenn der Gegner angreift
  const toW = (v, o) => (D.flip ? o.set(-v.x, v.y, RL - v.z) : o.copy(v));
  // Rechnet die Haltung für diesen Augenblick und stellt die Gelenke. dt glättet den Übergang zwischen zwei Bewegungen.
  function pose(P, t, dt) {
    const J = P.J, c = P.cur, g = P.tgt, hd = P.hand, v = R.v3, q = R.q2;
    poseOf(P, t, g);
    const k = P.fresh ? 1 : 1 - Math.exp(-dt / (P.anim === 'shot' || P.anim === 'pass' ? 0.028 : 0.075)); for (let i = 0; i < NP; i++) c[i] += (g[i] - c[i]) * k;
    let df = P.faceTo - P.face; df = Math.atan2(Math.sin(df), Math.cos(df)); P.face += P.fresh ? df : df * (1 - Math.exp(-dt * 11)); P.fresh = false;
    J.body.position.set(c[PX], c[PY], c[PZ]); J.hips.rotation.y = c[HIPY]; J.spine.rotation.set(c[LEAN], c[TW], c[SIDE]); J.H.neck.rotation.set(c[HX], c[HY], Math.sin(t * 5.3 + P.ph) * 0.03);
    const sq = c[SQ], sxz = 1 / Math.sqrt(sq); J.spine.scale.set(sxz, sq, sxz);
    // Gesicht: Die Pupillen folgen dem Ball
    let gx = 0, gy = 0;
    if (P.gaze) { const b = R.ballL, lx = b.x - P.pos.x, lz = b.z - P.pos.z, cs = Math.cos(P.face), sn = Math.sin(P.face), x = lx * cs - lz * sn, z = lx * sn + lz * cs; gx = clamp((Math.atan2(x, z) - c[TW] - c[HY]) * 0.03, -0.024, 0.024); gy = clamp((b.y - c[PY] - 0.7) / Math.max(1, Math.hypot(x, z)) * 0.07, -0.02, 0.016); }
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
      const kx = sd < 0 ? 'N' : 'P', low = sd === hd, gr = low ? 0.24 : 0.04, wi = sd < 0 ? WN : WP, w = c[wi];
      v.set(lerp(top.x + s.x * gr, c[wi + 1], w), lerp(top.y + s.y * gr, c[wi + 2], w), lerp(top.z + s.z * gr, c[wi + 3], w));
      v.x -= c[PX]; v.y -= c[PY]; v.z -= c[PZ]; v.applyQuaternion(q); v.x = v.x / sxz - sd * SHX; v.y = v.y / sq - SHY; v.z /= sxz;
      ik(J['sh' + kx], J['el' + kx], v, A1, A2, 1, -sd * 0.55);
    });
    // Umfallen: Die ganze Figur kippt um die Füsse nach vorn und federt nach
    const pt = P.anim === 'fall' ? 1.36 * bounce(clamp((t - P.t0) / (P.dur || 0.6), 0, 1)) : 0; P.pitch += (pt - P.pitch) * (P.anim === 'fall' ? 1 : 1 - Math.exp(-dt * 8));
    toW(P.pos, P.root.position); P.root.position.y = Math.sin(P.pitch) * 0.2; P.root.rotation.set(P.pitch, P.face + P.twirl + (D.flip ? Math.PI : 0), 0); P.blob.visible = P.pitch < 0.3;
    // In der Übersicht des laufenden Spiels stehen die Figuren etwas grösser da, damit man sie erkennt
    P.big += ((D.mode === 'live' ? 1.32 : 1) - P.big) * (1 - Math.exp(-dt * 6)); P.root.scale.setScalar(P.big); if (P.poof) P.root.scale.set(P.big * (1 + 0.35 * P.poof), P.big * Math.max(0.02, 1 - P.poof), P.big * (1 + 0.35 * P.poof));
  }
  // Wo der Ball an der Schaufel liegt (im Szenenraum)
  function bladePos(P, v) {
    const J = P.J; R.v1.set(0.16, 0.0, 0.11 * P.hand); J.blade.updateMatrix(); J.stick.updateMatrix();
    v.copy(R.v1).applyMatrix4(J.blade.matrix).applyMatrix4(J.stick.matrix); v.y = Math.max(0.075, v.y);
    return v.applyAxisAngle(R.up, P.face).add(P.pos);
  }

  /* Der Goalie: kniet im Tor, Helm mit Gitter (das Gesicht schaut durch), dicke Handschuhe, Knieschoner, kein Stock.
     Die Hände greifen nach dem Ball. In jedem Tor steht einer; flip sagt, in welchem. */
  function limb(parent, m, a, b, r) { const d = new T.Vector3().subVectors(b, a), o = mesh(new T.CapsuleGeometry(r, d.length(), 4, 10), m, parent); o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); return o; }
  function makeKeeper(side, flip) {
    const G = R.geo, V = (x, y, z) => new T.Vector3(x, y, z), root = new T.Group(), body = group(root), J = { root, body }, tm = TEAM[side];
    const m = { jersey: mat(tm.keeper), trim: mat(tm.helmet), pants: mat(tm.pants), pad: mat(tm.pad), helmet: mat(tm.helmet, { roughness: 0.5, side: T.DoubleSide }), glove: mat(tm.glove), cage: mat(0xf4f4f4, { roughness: 0.5 }), skin: mat(side === 'you' ? 0xe8a877 : 0xc98c5e, { roughness: 0.7 }), hair: mat(0x3a2716), shoe: mat(0x22242c), num: new T.MeshBasicMaterial({ transparent: true, depthWrite: false, map: numTex(1, tm.knum) }) };
    [-1, 1].forEach(sd => { limb(body, m.pants, V(sd * 0.13, KH, 0), V(sd * 0.25, 0.12, 0.24), 0.11); limb(body, m.pants, V(sd * 0.25, 0.11, 0.24), V(sd * 0.28, 0.1, -0.14), 0.1); mesh(G.kPad, m.pad, body, sd * 0.25, 0.13, 0.27); deco(G.kStripe, m.trim, body, sd * 0.25, 0.13, 0.335); mesh(G.shoe, m.shoe, body, sd * 0.29, 0.12, -0.22).rotation.x = 1.2; });
    mesh(G.kHip, m.pants, body, 0, KH - 0.02, -0.02);
    J.spine = group(body, 0, KH, 0); mesh(G.kTorso, m.jersey, J.spine); deco(G.collar, m.trim, J.spine, 0, 0.445, 0).scale.setScalar(1.1);
    const nf = new T.Mesh(G.numPlane, m.num); nf.position.set(0, 0.22, 0.212); J.spine.add(nf);
    J.H = makeHead(m, J.spine); J.H.neck.position.y = 0.44; mesh(G.helmet, m.helmet, J.H.h); deco(G.cage, m.cage, J.H.h);
    [-1, 1].forEach(sd => { const k = sd < 0 ? 'N' : 'P', sh = group(J.spine, sd * KSX, 0.33, 0); mesh(G.kSleeve, m.jersey, sh); const el = group(sh, 0, -0.2, 0); mesh(G.kFore, m.jersey, el); mesh(G.kGlove, m.glove, el); deco(G.kPalm, m.pad, el); J['sh' + k] = sh; J['el' + k] = el; });
    const blob = new T.Mesh(G.blob, R.blobMat); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.012; blob.scale.set(1.5, 1.2, 1); root.add(blob);
    return { root, J, m, side, flip, pos: new T.Vector3(0, 0, 0.28), anim: 'ready', t0: 0, dur: 0.4, tgt: new T.Vector3(), must: false, amp: 1, hN: new T.Vector3(-0.4, 0.44, 0.26), hP: new T.Vector3(0.4, 0.44, 0.26), g: 0, mood: 0 };
  }
  function resetKeeper(K) { K.anim = 'ready'; K.g = 0; K.mood = 0; K.amp = 1; K.root.visible = true; }
  /* Haltung des Goalies. ready: wippt. dive: wirft sich zum Punkt tgt (im Raum des Goalies); must heisst, die Hand kommt
     an (Parade), sonst bleibt sie kurz davor. hold: fängt den Ball und zieht ihn vor die Brust. mood: 1 freut sich, -1 geschlagen.
     ball: wo der Ball ist, gesehen aus seinem Tor. */
  function poseKeeper(K, t, dt, ball) {
    const J = K.J, v = R.v3, w = R.v4, AL = 0.2;
    let sx = 0, sy = 0, roll = 0, hx = -0.05, sq = 1;
    const lean = 0.14, rN = w.set(-0.4 + Math.sin(t * 2.3) * 0.02, 0.44 + Math.sin(t * 2.9) * 0.02, 0.26), tN = R.v5.copy(rN), tP = R.v6.set(-rN.x, rN.y, rN.z);
    if (K.anim === 'ready') { sy = Math.sin(t * 3.4) * 0.016; sq = 1 + Math.sin(t * 3.4) * 0.025; }
    else {
      const g = K.g = out(clamp((t - K.t0) / K.dur, 0, 1)), d = Math.sign(K.tgt.x || 1), far = Math.abs(K.tgt.x), low = 1 - clamp(K.tgt.y / 0.8, 0, 1), near = d > 0 ? tP : tN, other = d > 0 ? tN : tP;
      sx = d * clamp(far * (K.must ? 0.62 : 0.4), 0, 0.6) * g * K.amp; roll = -d * clamp(far * (0.5 + low * 0.7), 0, K.must ? 1.15 : 0.8) * g * K.amp; sy = K.must ? g * clamp((K.tgt.y - 0.8) * 0.5, 0, 0.25) : 0; sq = 1 + g * 0.08 * K.amp;
      near.lerp(K.tgt, g); other.x += d * 0.22 * g; other.y += (K.tgt.y - 0.34) * 0.3 * g; hx = -0.2 * g;
      // Schulter der nahen Hand: reicht der Arm nicht, rückt bei einer Parade der ganze Körper nach
      v.set(d * KSX, 0.33, 0).applyAxisAngle(R.xAxis, lean); v.y += KH; v.applyAxisAngle(R.zAxis, roll); v.x += sx; v.y += sy;
      const gap = R.v7.subVectors(K.tgt, v), L = gap.length(), max = AL * 2 + 0.02;
      if (K.must && L > max) { gap.multiplyScalar((1 - max / L) * g); sx += gap.x; sy += Math.max(0, gap.y); }
      else if (!K.must) near.addScaledVector(gap.normalize(), -0.26 * g);
      if (K.anim === 'hold') { const h = ease(clamp((t - K.t0 - K.dur) / 0.35, 0, 1)); sx *= 1 - h * 0.5; roll *= 1 - h * 0.6; v.set(sx, 0.56, 0.32); tN.lerp(v, h); tP.lerp(v, h); tN.x -= 0.09 * h; tP.x += 0.09 * h; }
    }
    K.hN.lerp(tN, 1 - Math.exp(-dt * 30)); K.hP.lerp(tP, 1 - Math.exp(-dt * 30));
    J.body.position.set(sx, sy, 0); J.body.rotation.z = roll; J.spine.rotation.x = lean; J.spine.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)); J.H.neck.rotation.set(hx + (K.mood < 0 ? 0.4 : 0), 0, -roll * 0.5);
    const bx = (ball.x - K.pos.x) / KS - sx, bz = Math.max(0.5, ball.z - K.pos.z);
    face(J.H, t, 1.7, K.mood > 0 ? 1 : K.mood < 0 ? -1 : K.anim === 'ready' ? 0 : 0.8, K.mood < 0 ? -1 : K.anim === 'ready' ? 0.4 : 0, K.anim === 'ready' ? 0 : 0.8, clamp(Math.atan2(bx, bz) * 0.03, -0.024, 0.024), clamp((ball.y - 0.9) / bz * 0.07, -0.02, 0.016));
    R.q2.copy(J.spine.quaternion).invert(); R.q3.copy(J.body.quaternion).invert();
    [[-1, K.hN, 'N'], [1, K.hP, 'P']].forEach(a => { v.copy(a[1]); v.x -= sx; v.y -= sy; v.applyQuaternion(R.q3); v.y -= KH; v.applyQuaternion(R.q2); v.x -= a[0] * KSX; v.y = v.y / sq - 0.33; ik(J['sh' + a[2]], J['el' + a[2]], v, AL, AL, 1, -a[0] * 0.9); });
    if (K.flip) { K.root.position.set(-K.pos.x, 0, RL - K.pos.z); K.root.rotation.y = Math.PI; } else { K.root.position.copy(K.pos); K.root.rotation.y = 0; }
    K.root.scale.setScalar(KS);
  }
  // Hand des Goalies im Szenenraum (für den gefangenen Ball)
  const keeperHand = (K, v) => v.copy(K.tgt.x >= 0 ? K.hP : K.hN).multiplyScalar(KS).add(K.pos).setZ(K.pos.z + 0.34);

  // Frisuren aus Knete, um die Kopfmitte gebaut: dicke Rollen und Kugeln über einer Kappe
  function hairStyles() {
    const cap = (len, tilt, r) => new T.SphereGeometry(r || 0.29, 18, 10, 0, Math.PI * 2, 0, Math.PI * len).scale(1.06, 0.94, 0.98).rotateX(tilt);
    const sp = r => new T.SphereGeometry(r, 10, 8), list = [];
    // Punkt auf dem Schädel: a von hinten (-) über oben (0) nach vorn (+), x seitlich
    const at = (a, x, lift) => new T.Vector3(x, Math.cos(a) * 0.94, Math.sin(a) * 0.98).normalize().multiplyScalar(0.278 + (lift || 0));
    const roll = (pts, r) => merge([new T.TubeGeometry(new T.CatmullRomCurve3(pts), 10, r, 7, false), sp(r).translate(pts[0].x, pts[0].y, pts[0].z), sp(r).translate(pts[pts.length - 1].x, pts[pts.length - 1].y, pts[pts.length - 1].z)]);
    // Seitenscheitel: Rollen von hinten über den Kopf nach vorn, leicht zur Seite gekämmt
    list.push([cap(0.37, -0.62)].concat([-3, -2, -1, 0, 1, 2, 3].map(i => roll([at(-1.25, i * 0.23), at(-0.5, i * 0.26 + 0.03, 0.012), at(0.2, i * 0.25 + 0.1, 0.02), at(0.72, i * 0.2 + 0.2, 0.026), at(0.86, i * 0.17 + 0.3, 0.012)], 0.05))));
    // Stacheln
    list.push([cap(0.39, -0.62)].concat([[0, 0], [0.11, 0.02], [-0.11, 0.02], [0.05, 0.11], [-0.06, 0.1], [0.06, -0.1], [-0.05, -0.11], [0, -0.2], [0.15, -0.1], [-0.15, -0.1]].map(p => new T.ConeGeometry(0.062, 0.18, 8).rotateX(p[1] * 4).rotateZ(-p[0] * 4).translate(p[0], 0.3 - (p[0] * p[0] + p[1] * p[1]) * 1.6, p[1]))));
    // Tolle: eine dicke Rolle quer über der Stirn, dahinter Rollen nach hinten
    list.push([cap(0.38, -0.62), roll([at(0.55, -0.72, 0.02), at(0.78, -0.3, 0.045), at(0.82, 0.1, 0.05), at(0.74, 0.5, 0.04), at(0.5, 0.75, 0.02)], 0.068)].concat([-2, -1, 0, 1, 2].map(i => roll([at(0.45, i * 0.3, 0.02), at(-0.3, i * 0.32, 0.022), at(-1.2, i * 0.28)], 0.052))));
    // Locken
    list.push([cap(0.39, -0.62)].concat([[0, 0.27, 0.02], [0.14, 0.23, 0.08], [-0.14, 0.23, 0.08], [0.2, 0.17, -0.06], [-0.2, 0.17, -0.06], [0.08, 0.24, -0.12], [-0.08, 0.24, -0.12], [0, 0.17, -0.22], [0.16, 0.08, -0.2], [-0.16, 0.08, -0.2], [0.07, 0.25, 0.1], [-0.07, 0.25, 0.1], [0.24, 0.06, -0.08], [-0.24, 0.06, -0.08]].map(p => sp(0.082).translate(p[0], p[1], p[2]))));
    // Dutt
    list.push([cap(0.4, -0.62), sp(0.11).translate(0, 0.31, -0.1), sp(0.06).translate(0.2, 0.15, -0.14), sp(0.06).translate(-0.2, 0.15, -0.14)].concat([-1, 0, 1].map(i => roll([at(0.7, i * 0.42, 0.012), at(0.1, i * 0.4, 0.016), at(-0.5, i * 0.3, 0.01)], 0.05))));
    // Irokese
    list.push([-0.5, -0.15, 0.2, 0.55, 0.9, 1.25].map(a => sp(0.078).scale(0.8, 1.25, 1).translate(0, 0.275 * Math.cos(a) * 0.96, -0.275 * Math.sin(a))));
    // Zöpfe: Rollen nach hinten und zwei dicke Zöpfe hinter den Ohren
    list.push([cap(0.4, -0.62)].concat([-2, -1, 0, 1, 2].map(i => roll([at(0.72, i * 0.32, 0.014), at(0.1, i * 0.34, 0.018), at(-0.7, i * 0.3, 0.012)], 0.05)), [-1, 1].map(sd => roll([new T.Vector3(sd * 0.22, 0.1, -0.1), new T.Vector3(sd * 0.3, -0.06, -0.12), new T.Vector3(sd * 0.3, -0.24, -0.1)], 0.062))));
    return list.map((p, i) => lump(merge(p), 0.006, 17, i * 3.1));
  }

  /* Nachbearbeitung: Die Halle wird erst in ein Bild gerechnet, dann mit Tiefenunschärfe auf den Schirm gebracht: Was weit
     hinter dem scharfen Punkt liegt (Tribüne, Wand), wird weich, wie bei einer Aufnahme von Miniaturen. Dazu dunkle Ecken. */
  function makePost() {
    if (!R.renderer.capabilities.isWebGL2) return null;
    try {
      const rt = new T.WebGLRenderTarget(8, 8, { samples: 4, depthBuffer: true, depthTexture: new T.DepthTexture(8, 8) }); rt.texture.encoding = T.sRGBEncoding;
      const m = new T.ShaderMaterial({
        depthTest: false, depthWrite: false,
        uniforms: { tC: { value: rt.texture }, tD: { value: rt.depthTexture }, px: { value: new T.Vector2(1, 1) }, n: { value: 0.15 }, f: { value: 90 }, focus: { value: 8 }, nearR: { value: 6 }, farS: { value: 2 }, farR: { value: 8 }, maxR: { value: 8 }, vig: { value: 0.42 } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: [
          'precision highp float; uniform sampler2D tC; uniform sampler2D tD; uniform vec2 px; uniform float n, f, focus, nearR, farS, farR, maxR, vig; varying vec2 vUv;',
          'float vz(vec2 uv) { float z = texture2D(tD, uv).x * 2.0 - 1.0; return 2.0 * n * f / (f + n - z * (f - n)); }',
          'float coc(float z) { return max(clamp((z - focus - farS) / farR, 0.0, 1.0), clamp((focus - z) / nearR - 0.4, 0.0, 1.0) * 0.5); }',
          'void main() {',
          '  float c = coc(vz(vUv)); vec3 col = texture2D(tC, vUv).rgb;',
          '  if (c > 0.03) { vec3 acc = col; float w = 1.0; for (int i = 0; i < 14; i++) { float fi = float(i); float r = sqrt((fi + 0.5) / 14.0); float a = fi * 2.39996; vec2 o = vec2(cos(a), sin(a)) * r * c * maxR * px; float ws = 0.12 + coc(vz(vUv + o)); acc += texture2D(tC, vUv + o).rgb * ws; w += ws; } col = acc / w; }',
          '  vec2 q = vUv - 0.5; col *= 1.0 - vig * dot(q, q) * 1.5;',
          '  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 1.04);',
          '  gl_FragColor = vec4(col, 1.0);',
          '}'].join('\n')
      });
      const sc = new T.Scene(), quad = new T.Mesh(new T.PlaneGeometry(2, 2), m); quad.frustumCulled = false; sc.add(quad);
      return { rt, m, sc, cam: new T.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
    } catch (e) { return null; }
  }

  // --- Halle: einmal bauen ---
  function build(host) {
    T = window.THREE;
    const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.outputEncoding = T.sRGBEncoding; renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.setClearColor(0x0a0f2c); renderer.localClippingEnabled = true;
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
    renderer.domElement.addEventListener('webglcontextlost', () => fail('Kontext verloren'));
    const scene = new T.Scene(); scene.fog = new T.Fog(0x0a0f2c, 30, 70);
    const cam = new T.PerspectiveCamera(46, 1, 0.15, 90), V = (x, y, z) => new T.Vector3(x || 0, y || 0, z || 0), Q = () => new T.Quaternion();
    R = { renderer, scene, cam, host, figs: [], look: V(0, 0, 8), camP: V(0, 8, 20), camL: V(0, 0, 8), camFov: 50, from: { p: V(), l: V(), fov: 50 }, ballL: V(0, 0.08, 18), up: V(0, 1, 0), xAxis: V(1, 0, 0), zAxis: V(0, 0, 1), v1: V(), v2: V(), v3: V(), v4: V(), v5: V(), v6: V(), v7: V(), v8: V(), q1: Q(), q2: Q(), q3: Q(), e1: new T.Euler(), m1: new T.Matrix4(), focus: 12, dof: [3, 10, 8], w: 0, h: 0, shake: 0, shakeT: 0, q: 0, slow: 0 };
    R.bump = bumpTex(); R.bladeMap = bladeTex();
    scene.environment = studioEnv(renderer);
    const cap = (r, l) => new T.CapsuleGeometry(r, l, 4, 10), sph = (r, a, b) => new T.SphereGeometry(r, a || 14, b || 10), cyl = (a, b, h, n) => new T.CylinderGeometry(a, b, h, n || 14);
    const lathe = (pts, sx, sz) => new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), 22).scale(sx, 1, sz);
    // Schuh: vorne rund und hoch, unten flach
    const shoe = sph(0.1, 16, 12).scale(1.02, 0.84, 1.78).translate(0, -0.016, 0.066); { const p = shoe.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < -0.088) p.setY(i, -0.088); shoe.computeVertexNormals(); }
    R.geo = {
      // Körper: Trikot wie eine Glocke, Ärmel, Hose, kurze Beine, dicke Stulpen, grosse Schuhe
      torso: lump(lathe([[0, -0.06], [0.165, -0.06], [0.2, -0.03], [0.2, 0.08], [0.196, 0.24], [0.186, 0.36], [0.15, 0.43], [0.085, 0.475], [0, 0.48]], 1.14, 0.86), 0.004, 13, 1),
      hem: new T.TorusGeometry(0.193, 0.022, 6, 22).rotateX(Math.PI / 2).scale(1.14, 1, 0.86), collar: new T.TorusGeometry(0.09, 0.025, 6, 16).rotateX(Math.PI / 2),
      sleeve: lump(merge([sph(0.1), cyl(0.092, 0.112, 0.12).translate(0, -0.07, 0)]), 0.004, 21, 2), cuff: new T.TorusGeometry(0.106, 0.02, 6, 14).rotateX(Math.PI / 2),
      upper: cap(0.07, 0.07),
      forearm: lump(merge([cap(0.068, 0.08).translate(0, -0.075, 0), sph(0.09).scale(1, 0.94, 1).translate(0, -A2, 0), sph(0.04).translate(0, -A2 + 0.03, 0.08), sph(0.032, 8, 6).translate(-0.045, -A2 - 0.022, 0.066), sph(0.032, 8, 6).translate(0, -A2 - 0.036, 0.072), sph(0.032, 8, 6).translate(0.045, -A2 - 0.022, 0.066)]), 0.004, 25, 3),
      shorts: lump(sph(0.21, 16, 12).scale(1.08, 0.62, 0.88), 0.004, 12, 4), shortLeg: cyl(0.1, 0.108, 0.11),
      thigh: merge([cap(0.078, 0.07).translate(0, -0.095, 0), sph(0.08).translate(0, -T1, 0)]),
      sock: lump(merge([cap(0.086, 0.05).translate(0, -0.1, 0), new T.TorusGeometry(0.084, 0.03, 6, 14).rotateX(Math.PI / 2).translate(0, -0.045, 0)]), 0.003, 30, 5),
      shoe: lump(shoe, 0.004, 16, 6),
      // Kopf: Kugel mit Ohren und Nase
      head: lump(merge([sph(0.27, 26, 20).scale(1.06, 0.94, 0.98), sph(0.062, 10, 8).scale(0.6, 1, 0.8).translate(0.278, -0.02, 0), sph(0.062, 10, 8).scale(0.6, 1, 0.8).translate(-0.278, -0.02, 0), sph(0.047, 10, 8).translate(0, -0.055, 0.258)]), 0.005, 9, 7),
      eyes: merge([sph(0.072, 16, 12).scale(1, 1.06, 0.55).translate(-0.078, 0, 0.232), sph(0.072, 16, 12).scale(1, 1.06, 0.55).translate(0.078, 0, 0.232)]),
      pupil: merge([sph(0.035, 12, 10).scale(1, 1, 0.5), sph(0.011, 8, 6).translate(-0.012, 0.014, 0.014)], [0x15110d, 0xffffff]),
      brow: cap(0.021, 0.08).rotateZ(Math.PI / 2), cheek: sph(0.05, 10, 8).scale(1, 0.7, 0.3), smile: new T.TorusGeometry(0.075, 0.015, 6, 14, Math.PI * 0.75).rotateZ(Math.PI * 1.125),
      grin: merge([new T.SphereGeometry(0.078, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.05, 1, 0.32), new T.CircleGeometry(0.078, 16).rotateX(-Math.PI / 2).scale(1.05, 1, 0.32)]),
      mouthIn: sph(0.07, 14, 10).scale(1.05, 0.75, 0.35), teeth: new T.BoxGeometry(0.11, 0.024, 0.02), tongue: sph(0.035, 10, 8).scale(1.2, 0.6, 0.4),
      hair: hairStyles(),
      shaft: cyl(0.021, 0.021, LEN, 8), tape: cyl(0.026, 0.026, 0.2, 8), blade: merge([new T.BoxGeometry(0.24, 0.09, 0.036).translate(-0.02, 0, 0), cyl(0.045, 0.045, 0.036, 12).rotateX(Math.PI / 2).translate(0.1, 0, 0)]), numPlane: new T.PlaneGeometry(0.21, 0.21), blob: new T.CircleGeometry(0.36, 20),
      // Goalie
      kTorso: lump(lathe([[0, -0.05], [0.22, -0.05], [0.24, 0.05], [0.24, 0.25], [0.225, 0.36], [0.16, 0.43], [0.08, 0.46], [0, 0.465]], 1.14, 0.9), 0.005, 13, 9), kHip: sph(0.24).scale(1.1, 0.72, 0.9),
      kPad: lump(sph(0.13).scale(1, 1.05, 0.7), 0.004, 18, 10), kStripe: new T.BoxGeometry(0.2, 0.04, 0.03), kSleeve: merge([sph(0.11), cap(0.085, 0.1).translate(0, -0.1, 0)]), kFore: cap(0.08, 0.08).translate(0, -0.08, 0),
      kGlove: lump(merge([sph(0.125).scale(1, 1.1, 0.75).translate(0, -0.2, 0), sph(0.055).translate(0.11, -0.18, 0.02), sph(0.055).translate(-0.11, -0.18, 0.02)]), 0.005, 22, 11), kPalm: sph(0.085).scale(1, 1.05, 0.4).translate(0, -0.2, 0.075),
      // Helm: Schale hinten und oben, vorne offen; davor das Gitter
      helmet: merge([new T.SphereGeometry(0.305, 20, 14, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0.2, Math.PI - 0.5), new T.SphereGeometry(0.305, 20, 6, 0, Math.PI * 2, 0, 0.92), new T.TorusGeometry(0.2, 0.04, 6, 12, 1.9).rotateX(Math.PI / 2).rotateY(-0.62).translate(0, -0.225, 0.02)].map(g => g.scale(1.06, 0.96, 1))),
      cage: merge([0.1, -0.02, -0.14].map(y => new T.TorusGeometry(Math.sqrt(0.32 * 0.32 - y * y), 0.012, 5, 14, 2.0).rotateX(Math.PI / 2).rotateY(-0.57).translate(0, y, 0)).concat([-0.42, 0, 0.42].map(a => new T.TorusGeometry(0.322, 0.012, 5, 12, 1.25).rotateZ(-0.63).rotateY(-Math.PI / 2).rotateY(a)))).scale(1.06, 0.96, 1),
      ball: sph(0.075, 18, 14)
    };
    R.blobMat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false });
    R.whiteMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }); R.pupilMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.15 }); R.mouthMat = new T.MeshStandardMaterial({ color: 0x7a1f1c, roughness: 0.7 }); R.tongueMat = new T.MeshStandardMaterial({ color: 0xe8726b, roughness: 0.7 }); R.blushMat = new T.MeshBasicMaterial({ color: 0xff7a6b, transparent: true, opacity: 0.2, depthWrite: false });
    // Licht: Die Umgebung gibt das weiche Grundlicht; dazu eine warme Lampe mit Schatten von der Kameraseite und ein kühles Streiflicht
    scene.add(new T.HemisphereLight(0xfff3e2, 0x4a66a8, 0.3));
    const sun = new T.DirectionalLight(0xfff0d8, 0.62); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -10; sc.right = 10; sc.top = 11; sc.bottom = -11; sc.far = 44; sun.shadow.bias = -0.0012; sun.shadow.radius = 4; scene.add(sun); scene.add(sun.target); R.sun = sun;
    R.rim = new T.DirectionalLight(0xa9c8ff, 0.3); scene.add(R.rim); scene.add(R.rim.target);
    // Boden, Banden
    const floor = new T.Mesh(new T.PlaneGeometry(18, 40), new T.MeshStandardMaterial({ map: floorTex(), roughness: 0.34, metalness: 0.04, envMapIntensity: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 18); floor.receiveShadow = true; scene.add(floor);
    const around = new T.Mesh(new T.PlaneGeometry(80, 90), mat(0x10173f, { roughness: 1 })); around.rotation.x = -Math.PI / 2; around.position.set(0, -0.01, 18); scene.add(around);
    const bm = mat(0xf4f1e8, { roughness: 0.7 }), box = (w, h, d, m, x, y, z) => { const o = mesh(new T.BoxGeometry(w, h, d), m, scene, x, y, z); o.castShadow = false; return o; };
    box(0.14, 0.5, 40.2, bm, -9.07, 0.25, 18).receiveShadow = true; box(0.14, 0.5, 40.2, bm, 9.07, 0.25, 18).receiveShadow = true; box(18.3, 0.5, 0.14, bm, 0, 0.25, -2.07).receiveShadow = true; box(18.3, 0.5, 0.14, bm, 0, 0.25, 38.07).receiveShadow = true;
    // Tore: dickes rotes Gestänge aus Knete und Netz, eines an jedem Ende
    const red = mat(0xe2352b), tube = (len, r) => lump(new T.CylinderGeometry(r || 0.05, r || 0.05, len, 10, 6), 0.004, 9, len), slope = Math.hypot(GD, GH); R.slope = slope;
    const nt = netTex(), nmat = (rx, ry) => { const t = nt.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); return new T.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.7, side: T.DoubleSide, depthWrite: false }); };
    R.nets = [0, 1].map(e => {
      const g = group(scene, 0, 0, e ? RL : 0); g.rotation.y = e ? Math.PI : 0;
      [-1, 1].forEach(sd => { mesh(tube(GH), red, g, sd * GW, GH / 2, 0); mesh(tube(GD, 0.032), red, g, sd * GW, 0.032, -GD / 2).rotation.x = Math.PI / 2; mesh(tube(slope, 0.032), red, g, sd * GW, GH / 2, -GD / 2).rotation.x = Math.atan2(GD, GH); mesh(sph(0.058), red, g, sd * GW, GH, 0); });
      mesh(tube(GW * 2), red, g, 0, GH, 0).rotation.z = Math.PI / 2; mesh(tube(GW * 2, 0.032), red, g, 0, 0.032, -GD).rotation.z = Math.PI / 2;
      const nb = new T.Mesh(new T.PlaneGeometry(GW * 2, slope, 14, 10), nmat(9, 7)); nb.position.set(0, GH / 2, -GD / 2); nb.rotation.x = Math.atan2(GD, GH); g.add(nb);
      [-1, 1].forEach(sd => { const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(GD, 0); sh.lineTo(0, GH); sh.lineTo(0, 0); const sg = new T.ShapeGeometry(sh), uv = sg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 5, uv.getY(i) * 5); const o = new T.Mesh(sg, nmat(1, 1)); o.rotation.y = Math.PI / 2; o.position.set(sd * GW, 0, 0); g.add(o); });
      return { mesh: nb, base: nb.geometry.attributes.position.array.slice(), hit: null, still: true };
    });
    // Leuchtbänder und Tribünen rundum: hinter beiden Toren und an den Längsseiten
    R.ledIdle = ledTex([['HALLENKAMPF', '#ffe45c'], ['●', '#57e38b'], ['UNIHOCKEY', '#6fd6ff'], ['●', '#ff7ac8']], '#0a1036'); R.ledGoal = ledTex([['TOR!', '#ffe08a'], ['★', '#ff8a5c'], ['TOR!', '#ffffff'], ['★', '#ffe08a']], '#2a0f02'); R.ledGoal.repeat.x = 1.5;
    R.leds = [0, 1].map(e => { const o = new T.Mesh(new T.PlaneGeometry(19, 1), new T.MeshBasicMaterial({ map: R.ledIdle, fog: false })); o.position.set(0, 1.0, e ? RL + 2.55 : -2.55); o.rotation.y = e ? Math.PI : 0; scene.add(o); return o; });
    const sideLed = new T.MeshBasicMaterial({ map: R.ledIdle.clone(), fog: false }); sideLed.map.needsUpdate = true; sideLed.map.repeat.x = 2;
    [-1, 1].forEach(sd => { const o = new T.Mesh(new T.PlaneGeometry(38, 0.7), sideLed); o.position.set(sd * 9.62, 0.86, 18); o.rotation.y = -sd * Math.PI / 2; scene.add(o); });
    const stand = mat(0x161f52, { roughness: 1 }), wall = mat(0x0f1740, { roughness: 1 });
    R.fans = { list: [] }; let seed = 4711; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const block = (rows, per, at, side) => { for (let r = 0; r < rows; r++) for (let i = 0; i < per; i++) { const a = at(r, (i - (per - 1) / 2) * 0.68 + (rnd() - 0.5) * 0.2 + (r % 2) * 0.34); R.fans.list.push({ x: a[0], y: a[1], z: a[2], ax: a[3], az: a[4], ph: rnd() * 6.28, sp: 6 + rnd() * 4, h: 0.16 + rnd() * 0.22, c: rnd(), c2: rnd(), sc: 0.9 + rnd() * 0.25, skin: SKIN[Math.floor(rnd() * SKIN.length)], hair: HAIR[Math.floor(rnd() * HAIR.length)], side }); } };
    [0, 1].forEach(e => { const dz = e ? 1 : -1, z0 = e ? RL + 2 : -2; box(19.4, 0.5, 0.5, stand, 0, 0.25, z0 + dz * 0.75); for (let r = 0; r < 7; r++) box(21, 0.45, 0.85, stand, 0, 1.3 + r * 0.45, z0 + dz * (1.2 + r * 0.85)); block(7, 30, (r, u) => [u, 1.52 + r * 0.45, z0 + dz * (1.2 + r * 0.85), 1, 0], e ? 'home' : 'you'); box(30, 10, 0.3, wall, 0, 5, z0 + dz * 7.6); });
    [-1, 1].forEach(sd => { for (let r = 0; r < 4; r++) box(0.85, 0.45, 39, stand, sd * (10.1 + r * 0.85), 0.5 + r * 0.45, 18); block(4, 54, (r, u) => [sd * (10.1 + r * 0.85), 0.72 + r * 0.45, 18 + u, 0, 1], sd < 0 ? 'you' : 'home'); box(0.3, 9, 56, wall, sd * 14, 4.5, 18); });
    // Fans: Knetklumpen mit Kopf, Haaren und zwei Armen. Sie stehen still; nur wer jubelt, wird jedes Bild neu gestellt.
    const n = R.fans.list.length, fm = () => new T.MeshStandardMaterial({ roughness: 0.85, envMapIntensity: 0.6 }), F = R.fans;
    F.fb = new T.InstancedMesh(sph(0.26, 8, 6).scale(1, 1.2, 0.85), fm(), n); F.fh = new T.InstancedMesh(sph(0.165, 8, 6), fm(), n); F.fr = new T.InstancedMesh(new T.SphereGeometry(0.175, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), fm(), n); F.fa = new T.InstancedMesh(new T.CapsuleGeometry(0.055, 0.3, 2, 6), fm(), n * 2);
    [F.fb, F.fh, F.fr, F.fa].forEach(o => { o.instanceMatrix.setUsage(T.DynamicDrawUsage); o.frustumCulled = false; scene.add(o); });
    F.m4 = new T.Matrix4(); F.q = Q(); F.e = new T.Euler(); F.s1 = new T.Vector3(1, 1, 1); F.col = new T.Color(); F.mood = null; F.side = null;
    F.list.forEach((f, i) => { const pal = TEAM[f.side].fans, col = F.col; col.setHex(f.c2 < 0.24 ? BRIGHT[Math.floor(f.c * BRIGHT.length)] : pal[f.c < 0.62 ? 0 : f.c < 0.85 ? 1 : 2]); F.fb.setColorAt(i, col); col.setHex(f.skin); F.fh.setColorAt(i, col); F.fa.setColorAt(i * 2, col); F.fa.setColorAt(i * 2 + 1, col); col.setHex(f.hair); F.fr.setColorAt(i, col); });
    // Hallenlampen an der Decke
    const lamp = new T.MeshBasicMaterial({ color: 0xfff4e0, fog: false }), gt = glowTex();
    for (let i = 0; i < 7; i++) [-1, 1].forEach(sd => { const x = sd * 4.2, z = -3 + i * 7; box(2.6, 0.08, 0.5, lamp, x, 8.6, z); const s = new T.Sprite(new T.SpriteMaterial({ map: gt, transparent: true, opacity: 0.5, depthWrite: false, blending: T.AdditiveBlending, fog: false })); s.position.set(x, 8.5, z); s.scale.set(5.5, 3.2, 1); scene.add(s); });
    // Ball mit Löchern und Leuchtspur
    R.ball = mesh(R.geo.ball, new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, map: ballTex(), emissive: 0x222222 }), scene); R.trail = []; R.ballPrev = V(0, 0.08, 18); R.ball.position.set(0, 0.08, 18);
    for (let i = 0; i < 8; i++) { const o = new T.Mesh(R.geo.ball, new T.MeshBasicMaterial({ color: 0xe6f0ff, transparent: true, opacity: 0.32 - i * 0.038, depthWrite: false })); o.scale.setScalar(0.9 - i * 0.08); o.visible = false; scene.add(o); R.trail.push({ o, p: new T.Vector3(0, 0.08, 18) }); }
    R.ballBlob = new T.Mesh(R.geo.blob, R.blobMat); R.ballBlob.rotation.x = -Math.PI / 2; R.ballBlob.scale.setScalar(0.26); scene.add(R.ballBlob);
    for (let i = 0; i < 12; i++) { const P = makePlayer(); scene.add(P.root); R.figs.push(P); }
    R.keepers = [makeKeeper('home', false), makeKeeper('you', true)]; R.keepers.forEach(K => scene.add(K.root));
    buildMarks();
    R.post = makePost();
    // Namensschilder über den Köpfen (HTML, damit die Schrift scharf bleibt)
    R.tags = document.createElement('div'); R.tags.className = 's3tags';
    host.appendChild(renderer.domElement); host.appendChild(R.tags);
    fansPose(0, true);
  }
  /* Markierungen am Boden und am Tor: Ring um den Ballführenden, Passwege, Ringe um freie Mitspieler, Zielmarke, Reichweite
     des Goalies, Zonen für die Parade, Kreise und Linien des Dribbling-Parcours. */
  function buildMarks() {
    const sc = R.scene, bm = (c, o) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o == null ? 0.9 : o, depthWrite: false, fog: false }), flat = m => { m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 2; sc.add(m); return m; };
    const M = R.marks = { lanes: [], rings: [], defs: [] };
    M.carrier = flat(new T.Mesh(new T.RingGeometry(0.42, 0.5, 32), bm(0xf7d774)));
    for (let i = 0; i < 6; i++) { M.lanes.push(flat(new T.Mesh(new T.PlaneGeometry(1, 1), bm(0xffffff, 0.75)))); M.rings.push(flat(new T.Mesh(new T.RingGeometry(0.46, 0.56, 32), bm(0x34d399)))); }
    for (let i = 0; i < 4; i++) M.defs.push({ core: flat(new T.Mesh(new T.CircleGeometry(1, 28), bm(0xef4444, 0.34))), edge: flat(new T.Mesh(new T.RingGeometry(0.94, 1, 32), bm(0xff6b6b, 0.95))), brush: flat(new T.Mesh(new T.RingGeometry(0.96, 1, 40), bm(0xffffff, 0.5))) });
    M.finish = flat(new T.Mesh(new T.PlaneGeometry(1, 0.12), bm(0xf7d774))); M.sideN = flat(new T.Mesh(new T.PlaneGeometry(0.07, 1), bm(0xffffff, 0.4))); M.sideP = flat(new T.Mesh(new T.PlaneGeometry(0.07, 1), bm(0xffffff, 0.4)));
    const ar = new T.Shape(); ar.moveTo(-0.07, 0); ar.lineTo(0.07, 0); ar.lineTo(0.07, 0.62); ar.lineTo(0.2, 0.62); ar.lineTo(0, 1); ar.lineTo(-0.2, 0.62); ar.lineTo(-0.07, 0.62); ar.lineTo(-0.07, 0);
    M.arrow = flat(new T.Mesh(new T.ShapeGeometry(ar), bm(0xf7d774)));
    // Am Tor: Zielmarke, Reichweite (auf die Toröffnung beschnitten), Zonen und Landepunkt
    const clip = [new T.Plane(new T.Vector3(1, 0, 0), GW), new T.Plane(new T.Vector3(-1, 0, 0), GW), new T.Plane(new T.Vector3(0, -1, 0), GH)], goalM = (m, parent) => { m.visible = false; m.renderOrder = 3; parent.add(m); return m; };
    M.gate = group(sc);      // steht im Tor, auf das geschossen wird
    M.reach = goalM(new T.Mesh(new T.CircleGeometry(1, 44), new T.MeshBasicMaterial({ color: 0x050818, transparent: true, opacity: 0.5, depthWrite: false, clippingPlanes: clip, side: T.DoubleSide })), M.gate);
    M.reachEdge = goalM(new T.Mesh(new T.RingGeometry(0.965, 1, 56), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false, clippingPlanes: clip, side: T.DoubleSide })), M.gate);
    // Schatten der Blocker: rot schraffierte Flächen im Tor, dort fliegt der Ball in einen Gegner
    const hatch = canvasTex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(229,72,77,.5)'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,214,214,.75)'; g.lineWidth = 9; for (let i = -64; i < 128; i += 32) { g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 64, 0); g.stroke(); } });
    M.shade = []; for (let i = 0; i < 5; i++) { const tx = hatch.clone(); tx.needsUpdate = true; tx.wrapS = tx.wrapT = T.RepeatWrapping; const body = goalM(new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: tx, transparent: true, opacity: 0.85, depthWrite: false, clippingPlanes: clip, side: T.DoubleSide })), M.gate), edge = goalM(new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: 0xffb4b4, transparent: true, opacity: 0.95, depthWrite: false, clippingPlanes: clip, side: T.DoubleSide })), M.gate); M.shade.push({ body, edge, tx }); }
    M.aim = goalM(new T.Group(), M.gate); const a1 = new T.Mesh(new T.RingGeometry(0.1, 0.135, 32), new T.MeshBasicMaterial({ color: 0xf7d774, depthTest: false, transparent: true, side: T.DoubleSide })), a2 = new T.Mesh(new T.CircleGeometry(0.04, 16), new T.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, side: T.DoubleSide })); a1.renderOrder = a2.renderOrder = 6; M.aim.add(a1, a2);
    M.land = goalM(new T.Mesh(new T.RingGeometry(0.13, 0.19, 32), new T.MeshBasicMaterial({ color: 0xf7d774, depthTest: false, transparent: true, side: T.DoubleSide })), M.gate); M.land.renderOrder = 6;
    M.zones = goalM(new T.Group(), M.gate); M.zone = {};
    const zl = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, side: T.DoubleSide });
    [-GW / 3, GW / 3].forEach(x => { const o = new T.Mesh(new T.PlaneGeometry(0.025, GH), zl); o.position.set(x, GH / 2, 0); M.zones.add(o); }); { const o = new T.Mesh(new T.PlaneGeometry(GW * 2, 0.025), zl); o.position.set(0, GH / 2, 0); M.zones.add(o); }
    ['tl', 'tm', 'tr', 'bl', 'bm', 'br'].forEach((z, i) => { const o = new T.Mesh(new T.PlaneGeometry(GW * 2 / 3, GH / 2), new T.MeshBasicMaterial({ color: 0xf7d774, transparent: true, opacity: 0.45, depthWrite: false, side: T.DoubleSide })); o.position.set((i % 3 - 1) * GW * 2 / 3, i < 3 ? GH * 0.75 : GH * 0.25, 0); o.visible = false; M.zones.add(o); M.zone[z] = o; });
  }
  function resize() {
    const w = R.host.clientWidth || 343, h = R.host.clientHeight || 400; if (w === R.w && h === R.h) return;
    // Im Vollbild ist das Bild fast doppelt so gross wie früher: Die Auflösung geht mit der Fläche etwas zurück
    R.w = w; R.h = h; R.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, [2, 1.5, 1.15, 0.4][R.q]) * Math.min(1, Math.sqrt(230000 / (w * h)))); R.renderer.setSize(w, h, false); R.cam.aspect = w / h; R.proj = true; R.cam.updateProjectionMatrix();
    if (R.post) { const s = R.renderer.getDrawingBufferSize(new T.Vector2()); R.post.rt.setSize(s.x, s.y); R.post.m.uniforms.px.value.set(1 / s.x, 1 / s.y); }
  }
  // Fans stellen. mood 'cheer': Die Fans der Seite side springen mit erhobenen Armen. all: einmal alle stellen.
  function fansPose(time, all) {
    const F = R.fans, M4 = F.m4, q = F.q, e = F.e, s1 = F.s1, v = R.v1;
    F.list.forEach((f, i) => {
      const up = F.mood === 'cheer' && f.side === F.side; if (!up && !all) return;
      const jump = up ? Math.abs(Math.sin(time * f.sp + f.ph)) * f.h : 0;
      q.identity(); s1.setScalar(f.sc); v.set(f.x, f.y + 0.3 + jump, f.z); M4.compose(v, q, s1); F.fb.setMatrixAt(i, M4);
      v.set(f.x, f.y + 0.3 + 0.47 * f.sc + jump, f.z); M4.compose(v, q, s1); F.fh.setMatrixAt(i, M4); F.fr.setMatrixAt(i, M4);
      [-1, 1].forEach((sd, k) => { const tilt = up ? sd * (0.35 + Math.sin(time * 9 + f.ph) * 0.25) : sd * 0.12, off = sd * (up ? 0.3 : 0.28) * f.sc; e.set(f.az * tilt, 0, -f.ax * tilt); q.setFromEuler(e); v.set(f.x + f.ax * off, f.y + (up ? 0.74 : 0.3) + jump, f.z + f.az * off); M4.compose(v, q, s1); F.fa.setMatrixAt(i * 2 + k, M4); });
    });
    [F.fb, F.fh, F.fr, F.fa].forEach(o => { o.instanceMatrix.needsUpdate = true; });
  }
  function fans(time, side, mood) { const F = R.fans, m = mood === 'cheer' ? 'cheer' : null; if (m !== F.mood || (m && side !== F.side)) { F.mood = m; F.side = side; fansPose(time, true); } else if (m) fansPose(time, false); }
  // Netze: Das Netz, in dem der Ball einschlägt, beult aus und schwingt nach
  function nets(time) {
    R.nets.forEach(N => {
      const hit = N.hit, live = hit && time - hit.t < 2.4; if (!live && N.still) return;
      const a = N.mesh.geometry.attributes.position, b = N.base;
      for (let i = 0; i < a.count; i++) {
        let dz = 0;
        if (live) { const dt = time - hit.t; if (dt >= 0) { const dx = b[i * 3] - hit.x, dy = b[i * 3 + 1] - hit.y, d2 = dx * dx + dy * dy, ex = Math.min(1, (GW - Math.abs(b[i * 3])) / 0.2) * Math.min(1, (R.slope / 2 - Math.abs(b[i * 3 + 1])) / 0.2); dz = -(hit.amp || 1) * Math.exp(-dt / 0.55) * Math.cos(dt * 18) * (0.36 * Math.exp(-d2 / 0.16) + 0.12 * Math.exp(-d2 / 1.1) * Math.cos(dt * 18 - Math.sqrt(d2) * 4)) * Math.max(0, ex); } }
        a.setZ(i, b[i * 3 + 2] + dz);
      }
      a.needsUpdate = true; N.still = !live; if (!live) N.hit = null;
    });
  }
  // Ball setzen (Szenenraum): Er rollt in Laufrichtung, dahinter die Leuchtspur
  function setBall(v) {
    R.ballL.copy(v); const w = toW(v, R.v2);
    if (R.trailNew) { R.trailNew = false; R.trail.forEach(s => s.p.copy(w)); R.ballPrev.copy(w); }
    const dx = w.x - R.ballPrev.x, dz = w.z - R.ballPrev.z, d = Math.hypot(dx, dz); if (d > 0.0005) R.ball.rotateOnWorldAxis(R.v1.set(dz / d, 0, -dx / d), Math.min(1.2, d / 0.075)); R.ballPrev.copy(w);
    R.ball.position.copy(w); R.ballBlob.position.set(w.x, 0.013, w.z);
    const tr = R.trail; for (let i = tr.length - 1; i > 0; i--) tr[i].p.copy(tr[i - 1].p); tr[0].p.copy(w); tr.forEach((s, i) => { s.o.position.copy(s.p); s.o.visible = i > 0 && s.p.distanceTo(w) > 0.09; });
  }
  // Kamera (Szenenraum). Nach einem Wechsel der Betriebsart gleitet sie vom alten Bild ins neue (blendCam).
  function camAt(p, l, fov) { R.camP.copy(p); R.camL.copy(l); if (fov) R.camFov = fov; }
  function blendCam(sec) { R.from.p.copy(R.cam.position); R.from.l.copy(R.look); R.from.fov = R.fovD || R.cam.fov; D.blend = 1; D.blendT = sec || 0.45; }
  /* Fenster im Bild: Oben und unten liegen Anzeigen über der Halle (top und bottom in Bildpunkten). Die Kamera legt, was
     sie zeigen will, in das Fenster dazwischen; darüber und darunter läuft das Bild einfach weiter. */
  function inset(top, bottom) { if (!R) { D.in0 = [top, bottom]; return; } if (R.inTop === top && R.inBot === bottom) return; R.inTop = Math.max(0, top || 0); R.inBot = Math.max(0, bottom || 0); R.proj = true; }
  // Höhe des Fensters und sein Seitenverhältnis (danach richten sich die Brennweiten)
  const winH = () => Math.max(80, R.h - (R.inTop || 0) - (R.inBot || 0)), winAsp = () => R.w / winH();
  const figOf = id => { for (let i = 0; i < R.figs.length; i++) if (R.figs[i].used && R.figs[i].id === id) return R.figs[i]; return null; };
  // Aus dem Szenenraum zurück in die Halle: Figuren und Ball behalten ihren Ort, die Spiegelung fällt weg
  function unflip() {
    R.figs.forEach(P => { if (!P.used) return; if (P.temp) { P.temp = false; P.used = false; P.id = null; P.root.visible = false; return; } if (!P.hide) { const w = toW(P.pos, R.v2); P.pos.set(w.x, 0, w.z); P.face += D.flip ? Math.PI : 0; P.faceTo = P.face; } reset(P); P.fresh = false; P.hide = false; P.root.visible = true; });
    R.keepers.forEach(resetKeeper); const bw = toW(R.ballL, R.v2); R.ballL.copy(bw); D.flip = false; D.mode = 'live'; D.aim = null; D.drib = null; hideMarks();
  }

  /* --- Szenen: Pass, Dribbling, Schuss ---
     Gibt { impact, done } zurück: impact ist erfüllt, sobald die Entscheidung fällt (Tor, Parade, Ball weg), done am Ende.
     spec: { kind: 'shot' | 'pass' | 'dribble', atk: 'you' | 'home' (wer angreift), players: [{ id, side, x, y, name, no }],
       shot:    by (Schütze), land [x, y] im Tor (x -1 bis 1, y 0 bis 1), result 'goal' | 'save' | 'catch' | 'miss' | 'blocked',
                miss 'wide' | 'high' | 'post', kx (wo der Goalie steht, -1 bis 1), blocker (id), tight (knapp: langsamer), empty (kein Goalie),
                dive (wohin der Goalie springt, wenn er den Ball nicht hält: [x, y] oder null für «bleibt stehen»), quick (kurzer Anlauf),
                live (der Ball fliegt schon, etwa nach der Parade-Eingabe: ohne Anlauf weiter), fly (Sekunden, die der Ball noch fliegt)
       pass:    from, to (ids), ok, by (wer abfängt oder stört), near (kommt an, aber der Gegner ist dran), long (hoher langer Ball)
       dribble: x (Dribbler), by (Gegenspieler), result 'past' | 'held' | 'lost', to [x, y] (wo der Dribbler danach steht) }
     opt: linger (läuft nach dem Ende weiter, bis resume()). */
  // Stellt die Figuren einer Szene auf: wer in spec steht, an seinen Platz; alle andern verschwinden so lange
  function stage(spec) {
    D.flip = spec.atk === 'home'; const by = {};
    R.figs.forEach(P => { if (P.used) { P.hide = true; P.root.visible = false; } });
    spec.players.forEach(s => {
      let P = figOf(s.id); if (!P) { P = R.figs.find(f => !f.used); if (!P) return; dress(P, s); P.temp = true; }
      reset(P); P.hide = false; P.root.visible = true; P.pos.set(wx(s.x), 0, wz(s.y)); by[s.id] = P;
    });
    R.keepers.forEach(resetKeeper);
    const K = D.flip ? R.keepers[1] : R.keepers[0]; K.pos.set(0, 0, 0.28); K.root.visible = !spec.empty;
    R.marks.gate.position.set(0, 0, D.flip ? RL : 0); R.marks.gate.rotation.y = D.flip ? Math.PI : 0;
    return { by, K, list: Object.keys(by).map(id => by[id]) };
  }
  // Schussarten in der Szene: Dauer der Bewegung (sd), Flugzeit mal (fly), Bogen der Flugbahn mal (arc), Wucht im Netz (net)
  const STY3 = { slap: { sd: 1.08, fly: 0.7, arc: 0.45, net: 1.6 }, wrist: { sd: 0.66, fly: 1, arc: 1, net: 1 }, drag: { sd: 1.02, fly: 1.05, arc: 0.8, net: 0.9 } };
  // Zugschuss: Der Ball wird von der Stockseite weg gezogen. Passt die Stockseite nicht zur Richtung (pull im Szenenraum), wechselt die Figur für diesen Schuss die Seite.
  function handFor(P, pull, face) { const want = pull * Math.cos(face) > 0 ? -1 : 1; if (want !== P.hand) { P.hand0 = P.hand0 || P.hand; P.hand = want; P.fresh = true; } }
  function play(spec, opt) {
    if (!ok() || !R) return null;
    try { return startCut(spec, opt || {}); } catch (e) { fail(e); return null; }
  }
  function startCut(spec, o) {
    if (D.cut) D.cut.kill();
    const cont = !!spec.live && D.mode === 'aim' && !!D.aim, keepK = cont ? D.aim.K.pos.x : 0, ball0 = R.ballL.clone();
    if (D.mode !== 'live') unflip();
    const st = stage(spec), by = st.by, K = st.K, list = st.list, V = (x, y, z) => new T.Vector3(x || 0, y || 0, z || 0);
    hideMarks(); blendCam(cont ? 0.5 : 0.4); D.mode = 'cut'; D.aim = null;
    const ballV = V(), tmp = V(), camP = V(), camL = V();
    const look = (P, x, z, now) => { P.faceTo = Math.atan2(x - P.pos.x, z - P.pos.z); if (now) P.face = P.faceTo; };
    const anim = (P, name, t, d, extra) => { P.anim = name; P.t0 = t; P.dur = d || 1; Object.assign(P, extra || {}); };
    // Läuft Richtung Ziel und dreht sich dorthin; cycle treibt die Beine. Gibt true zurück, solange er unterwegs ist.
    const moveTo = (P, x, z, sp, dt, keep) => { const dx = x - P.pos.x, dz = z - P.pos.z, d = Math.hypot(dx, dz), stp = sp * dt; if (d > 0.04) { P.faceTo = Math.atan2(dx, dz); const k = Math.min(1, stp / d); P.pos.x += dx * k; P.pos.z += dz * k; if (!keep) P.anim = 'run'; P.speed = sp; P.cycle += stp * 7; return true; } P.speed = 0; if (P.anim === 'run') P.anim = 'idle'; return false; };
    let step, dur, mood = 'idle', tt = 0, led = 0, shakeT = -9, shakeAmp = 0.05, impactDone = false, resImpact, resDone, carrier = null, focus = 0;
    const impact = new Promise(r => { resImpact = r; }), done = new Promise(r => { resDone = r; });
    const fire = () => { if (!impactDone) { impactDone = true; resImpact(true); } };
    const ballAt = P => { carrier = P; }, actors = ids => ids.forEach(id => { if (by[id]) { by[id].label.visible = true; by[id].actor = true; } });

    if (spec.kind === 'shot') {
      const Sh = by[spec.by], p0 = Sh.pos.clone(), dist = Math.max(1.5, Math.hypot(p0.x, p0.z)), dir = V(-p0.x, 0, -p0.z).normalize(), res = spec.result, goal = res === 'goal', tight = !!spec.tight;
      const lx = clamp((spec.land ? spec.land[0] : 0) * GW, -GW * 1.7, GW * 1.7), ly = clamp((spec.land ? spec.land[1] : 0.4) * GH, 0.08, GH * 1.6);
      // Schussart: Der Schlagschuss holt lange aus und fliegt schnell, das Handgelenk schnappt kurz, der Zug zieht den Ball erst zur Seite
      const sty = STY3[spec.style] ? spec.style : 'wrist', SY = STY3[sty], pullW = sty === 'drag' ? (spec.pull || (p0.x > 0 ? -1 : 1)) : 0;
      const sd = SY.sd * (spec.quick ? 0.85 : 1), t0 = cont ? -sd * REL : spec.quick ? 0.05 : 0.22, tRel = t0 + sd * REL, fly = cont ? clamp(spec.fly || 0.2, 0.1, 1.2) : (0.3 + dist * 0.028) * SY.fly * (tight ? 1.7 : 1);
      Sh.style = sty; if (pullW) { handFor(Sh, pullW, Math.atan2(-p0.x, -p0.z)); if (cont) Sh.pos.x = p0.x + pullW * 0.75; }      // nach dem Anlauf (cont) steht er schon zur Seite gerückt
      const Bl = res === 'blocked' ? by[spec.blocker] || list.filter(P => P.side !== spec.atk).sort((a, b) => a.pos.distanceTo(p0) - b.pos.distanceTo(p0))[0] || null : null;
      const end = V(lx, ly, 0.36), from = V();
      if (goal) end.set(lx, ly, -GD * (1 - ly / GH) * 0.8 - 0.03);
      else if (res === 'miss' && spec.miss === 'post') { if (Math.abs(spec.land[0]) >= 0.98) end.set(Math.sign(lx) * GW, Math.min(ly, GH), 0.06); else end.set(clamp(lx, -GW, GW), GH, 0.06); }
      else if (res === 'miss') end.set(lx * 1.25, spec.miss === 'high' ? Math.max(ly, GH + 0.35) : ly, -1.9);
      list.forEach(P => { if (P.side === spec.atk) look(P, 0, 0, true); else look(P, p0.x, p0.z, true); });
      look(Sh, 0, 0, true);
      // Der Blocker steht in der Schusslinie, knapp vor dem Schützen
      // Geblockt vom Gegner am Mann: Er steht knapp vor dem Schützen. Geblockt in der Schussbahn (lane): Der Blocker bleibt, wo er steht.
      const farB = !!Bl && spec.how === 'lane' && Bl.pos.distanceTo(p0) > 2.4, bFrac = farB ? clamp(Bl.pos.distanceTo(p0) / dist, 0.12, 0.95) : 0;
      if (Bl && !farB) { Bl.pos.copy(p0).addScaledVector(dir, 1.45); look(Bl, p0.x, p0.z, true); end.copy(Bl.pos); end.y = 0.4; }
      else if (Bl) { look(Bl, p0.x, p0.z, true); end.copy(Bl.pos); end.y = 0.38; }
      const tEnd = tRel + (farB ? Math.max(0.14, fly * bFrac) : Bl ? 0.12 : fly), tCut = tEnd + 0.62; dur = tEnd + (goal ? 3.5 : spec.rebound ? 0.75 : 1.25);
      K.pos.x = cont ? keepK : clamp((spec.kx || 0) * GW, -GW * 0.72, GW * 0.72); Sh.ball = !cont; actors([spec.by]); if (Bl && spec.blocker) actors([spec.blocker]);
      if (cont) anim(Sh, 'shot', t0, sd);
      const stickSide = V(Math.cos(Sh.faceTo), 0, -Math.sin(Sh.faceTo)).multiplyScalar(Sh.hand);
      const c0 = p0.clone().addScaledVector(dir, -3.0).addScaledVector(stickSide, 0.85).setY(1.5), l0 = p0.clone().addScaledVector(dir, Math.min(dist * 0.5, 3)).setY(0.7);
      const over = dist > 6.6 && !cont, c1 = over || cont ? V(lx * 0.3 + Math.sign(p0.x || 1) * 0.6, 1.45, 4.9) : c0.clone().addScaledVector(dir, 0.5).addScaledVector(stickSide, 0.4).setY(1.62), l1 = V(lx * 0.5, 0.6, 0), back = dir.clone().negate(), deflect = V(Math.sign(lx || 1) * (1.4 + Math.abs(lx)), 0, 1.7);
      if (farB) { c1.copy(Bl.pos).addScaledVector(back, 3.4).addScaledVector(stickSide, 0.9).setY(1.5); l1.copy(Bl.pos).setY(0.6); }      // die Kamera bleibt beim Blocker, statt bis zum Tor zu fliegen
      const lat = P => (P.pos.x - p0.x) * back.z - (P.pos.z - p0.z) * back.x, mates = list.filter(P => P.side === spec.atk && P !== Sh).sort((a, b) => lat(a) - lat(b)), slots = [-1.25, -0.65, 0.65, 1.25];
      const S_ = { shot: cont, from: cont ? ball0 : null, hit: false, block: false, spin: 0, cutDone: false };
      step = (t, dt) => {
        if (t >= t0 && Sh.anim === 'idle' && !S_.shot) { S_.shot = true; anim(Sh, 'shot', t0, sd); }
        if (pullW && !cont) Sh.pos.x = p0.x + pullW * 0.75 * ease(seg(t, t0, t0 + sd * SU[1]));      // Zugschuss: Er geht mit dem Ball zur Seite
        if (sty === 'slap' && !S_.kick && t >= tRel) { S_.kick = true; shakeT = t; shakeAmp = 0.022; }      // der Schlag: ein kurzer Ruck
        carrier = null;
        // Schlagschuss: Der Ball bleibt liegen, während der Stock ausholt
        if (t < tRel && sty === 'slap' && S_.shot && !cont) { if (!S_.rest) S_.rest = bladePos(Sh, V()); ballV.copy(S_.rest); }
        else if (t < tRel) ballAt(Sh);
        else if (t < tEnd) { if (!S_.from) { S_.from = from.copy(ballV).clone(); Sh.ball = false; } const u = (t - tRel) / (tEnd - tRel), k = tight ? ease(u) * 0.3 + u * 0.7 : u; ballV.lerpVectors(S_.from, end, k); ballV.y += Math.sin(Math.PI * k) * Math.min(0.45, dist * 0.03) * (cont ? 0.3 : SY.arc); }
        else {
          const a = t - tEnd;
          if (!S_.hit) {
            S_.hit = true; fire();
            if (goal) { (D.flip ? R.nets[1] : R.nets[0]).hit = { t: D.t, x: lx, y: (ly - GH / 2) * R.slope / GH, amp: SY.net }; mood = 'cheer'; led = t; shakeT = t; shakeAmp = 0.05 * SY.net; K.mood = -1; Sh.gaze = false; anim(Sh, 'cheer', t, 9); list.forEach(P => { if (P !== Sh && P.side !== spec.atk) anim(P, 'sad', t + 0.2, 9); }); }
            else { mood = res === 'blocked' ? 'idle' : 'groan'; if (res === 'miss' && spec.miss === 'post') shakeT = t; if (res === 'save' || res === 'catch') K.mood = 1; anim(Sh, 'sad', t + 0.3, 9); }
          }
          if (goal) ballV.set(end.x * (1 - Math.min(1, a * 1.4) * 0.2), Math.max(0.08, end.y - a * a * 3.4), Math.min(-0.12, end.z + a * 0.25));
          else if (res === 'catch') carrier = K;
          else if (res === 'miss' && spec.miss !== 'post') ballV.set(end.x + lx * a * 0.6, end.y - a * a * 2, end.z - a * 3);
          else { const k = out(a / 1.0); ballV.set(end.x + deflect.x * k, Math.max(0.08, end.y + Math.sin(Math.min(1, a / 0.8) * Math.PI) * 0.55 - a * a * 1.2), end.z + deflect.z * k); }
        }
        // Goalie: wirft sich zum Ball, sobald der Schuss weg ist
        if (K.root.visible && !Bl && t >= tRel + 0.03 && K.anim === 'ready' && spec.dive !== null) {
          K.anim = res === 'catch' ? 'hold' : 'dive'; K.t0 = D.t; K.dur = Math.max(0.16, (tEnd - t) * 0.92); K.must = res === 'save' || res === 'catch';
          if (spec.dive && !K.must) K.tgt.set(spec.dive[0] * GW - K.pos.x, spec.dive[1] * GH, 0.08); else K.tgt.set(clamp(lx, -GW - 0.15, GW + 0.15) - K.pos.x, Math.min(ly, GH + 0.15), 0.08);
          K.tgt.multiplyScalar(1 / KS);      // der Goalie ist etwas kleiner gebaut: sein Raum ist entsprechend gestreckt
          K.amp = res === 'miss' && !spec.dive ? 0.45 : 1;
        }
        if (Bl && t > (farB ? tEnd - 0.3 : t0 + 0.2) && !S_.block) { S_.block = true; anim(Bl, 'lunge', t, 0.7, { dir: 0, stay: true }); }
        // Jubel: Der Schütze dreht ab, läuft Richtung Kamera und dreht sich im Sprung; die Mitspieler kommen dazu
        if (goal && t > tEnd + 0.45) {
          const tx = p0.x + back.x * 1.6, tz = p0.z + back.z * 1.6;
          if (!moveTo(Sh, tx, tz, 3.6, dt, true)) { look(Sh, tx + back.x * 9, tz + back.z * 9); if (!S_.spin) S_.spin = t; Sh.twirl = Math.PI * 2 * ease(seg(t, S_.spin + 0.5, S_.spin + 1.1)); }
          mates.forEach((P, i) => { if (P.anim !== 'cheer') { P.gaze = false; anim(P, 'cheer', t, 9); } const a2 = slots[mates.length === 4 ? i : i + 1] || 0, bk = 0.3 + Math.abs(a2) * 0.2, gx = tx - back.x * bk + back.z * a2, gz = tz - back.z * bk - back.x * a2; if (!moveTo(P, gx, gz, 5.6, dt, true)) look(P, gx + back.x * 9 - back.z * a2 * 2, gz + back.z * 9 + back.x * a2 * 2); });
        }
        // Kamera: über die Schulter, fliegt dem Ball nach; nach einem Tor Schnitt auf den jubelnden Schützen, Tor und Fans im Rücken
        if (goal && t >= tCut) {
          if (!S_.cutDone) { S_.cutDone = true; D.blend = 0; }
          const k = ease(seg(t, tCut, dur));
          camP.copy(p0).addScaledVector(back, 4.7 - k * 0.5).setY(0.72 + k * 0.1); camL.copy(Sh.pos).setY(0.9 + Sh.J.body.position.y * 0.16); camAt(camP, camL, 40); focus = camP.distanceTo(Sh.pos);
        } else {
          const k = cont ? 1 : ease(seg(t, tRel - 0.08, tEnd + 0.12)), pre = ease(seg(t, 0, tRel));
          // Geblockt: von der Seite, damit man Schütze und Blocker sieht
          if (Bl && !farB) { camP.copy(p0).addScaledVector(dir, 0.75).addScaledVector(stickSide, 3.5 - pre * 0.4).setY(1.15); camL.copy(p0).addScaledVector(dir, 0.75).setY(0.65); camAt(camP, camL, 46); focus = 3.4; return; }
          camP.lerpVectors(c0, c1, k).addScaledVector(dir, pre * (over ? 0.45 : 0.2)); if (pullW) camP.x += (Sh.pos.x - p0.x) * (1 - k); if (over) { const arc = Math.sin(Math.PI * k); camP.y += arc * 0.55; camP.addScaledVector(stickSide, arc * 1.5); } camL.lerpVectors(l0, l1, k); if (pullW) camL.x += (Sh.pos.x - p0.x) * (1 - k) * 0.6;
          camAt(camP, camL, 46); focus = lerp(camP.distanceTo(p0), camP.distanceTo(l1), k);
        }
      };
    } else if (spec.kind === 'pass') {
      const A = by[spec.from], B = by[spec.to], C = spec.ok ? null : by[spec.by], M = spec.ok && spec.near ? by[spec.by] : null, a0 = A.pos.clone(), b0 = B.pos.clone(), d = Math.max(0.5, a0.distanceTo(b0));
      const u0 = V().subVectors(b0, a0).normalize(), n = V(u0.z, 0, -u0.x); if (n.z < 0 || (Math.abs(n.z) < 0.2 && n.x * a0.x > 0)) n.negate();
      // Langer Pass (spec.long): Der Ball fliegt im Bogen und länger, abgefangen wird er erst kurz vor dem Empfänger
      const long = !!spec.long, cf = long ? 0.82 : 0.58, lob = long ? clamp(d * 0.085, 0.5, 1.9) : 0.04;
      const t0 = 0.12, sd = 0.62, tRel = t0 + sd * REL, fly = long ? clamp(d / 14, 0.6, 1.5) : clamp(d / 13, 0.3, 0.85), cut = C ? V().lerpVectors(a0, b0, cf) : null, tEnd = tRel + fly * (C ? cf : 1), from = V(); dur = tEnd + (C ? 1.15 : 0.95);
      list.forEach(P => { if (P.side === spec.atk) look(P, 0, 0, true); else look(P, a0.x, a0.z, true); });
      look(A, b0.x, b0.z, true); look(B, a0.x, a0.z, true); A.ball = true; actors([spec.from, spec.to]); if (C) actors([spec.by]);
      const c0 = a0.clone().addScaledVector(u0, -2.8 - d * 0.2).addScaledVector(n, 1.5 + d * 0.1).setY(2.0 + d * 0.12), l0 = V().lerpVectors(a0, b0, 0.38).setY(0.6), S_ = {};
      step = (t, dt) => {
        if (t >= t0 && !S_.pass) { S_.pass = true; anim(A, 'pass', t0, sd); }
        carrier = null;
        if (t < tRel) ballAt(A);
        else if (t < tEnd) { if (!S_.from) { S_.from = from.copy(ballV).clone(); A.ball = false; } const u = (t - tRel) / fly; ballV.lerpVectors(S_.from, tmp.set(b0.x, 0.08, b0.z), u); ballV.y = 0.08 + Math.sin(Math.min(1, u) * Math.PI) * lob; }
        else {
          if (!S_.hit) { S_.hit = true; fire(); if (C) { C.ball = true; anim(A, 'sad', t + 0.25, 9); mood = 'groan'; } else { B.ball = true; look(B, 0, 0); if (M) { look(M, B.pos.x, B.pos.z, true); anim(M, 'lunge', t, 0.8, { dir: 0 }); } } }
          ballAt(C || B);
        }
        if (C) { if (t > 0.1 && t < tEnd) moveTo(C, cut.x, cut.z, Math.max(2, cut.distanceTo(C.pos) / Math.max(0.05, tEnd - t)), dt); else if (t >= tEnd + 0.15) moveTo(C, cut.x + n.x * 2, cut.z + n.z * 2 + 1.5, 3, dt); }
        else if (t > tRel && t < tEnd) look(B, ballV.x, ballV.z);
        const k = ease(seg(t, 0, dur)); camP.copy(c0).addScaledVector(u0, k * (C ? 0.4 : Math.min(1.6, d * 0.25)));
        if (C) camL.copy(l0).lerp(tmp.copy(C.pos).setY(0.65), ease(seg(t, tRel, dur)) * 0.8); else camL.copy(l0).addScaledVector(u0, k * d * 0.25);
        camAt(camP, camL, 46); focus = camP.distanceTo(camL);
      };
    } else {
      // Dribbling: Der Dribbler läuft auf seinen Gegenspieler zu, täuscht an und zieht vorbei (der Verteidiger greift ins Leere
      // und fällt hin), oder der Verteidiger sticht den Ball weg
      const A = by[spec.x], Df = by[spec.by], a0 = A.pos.clone(), res = spec.result, sd = hashOf(spec.x) % 2 ? 1 : -1;
      const toD = V().subVectors(Df.pos, a0).setY(0), gap = toD.length(); toD.normalize(); if (gap < 2.2) Df.pos.copy(a0).addScaledVector(toD, 2.2); if (gap > 4.2) Df.pos.copy(a0).addScaledVector(toD, 4.2);
      const d0 = Df.pos.clone(), len = a0.distanceTo(d0), sidev = V(toD.z, 0, -toD.x);
      const meet = d0.clone().addScaledVector(toD, -0.8), fake = meet.clone().addScaledVector(sidev, -sd * 0.42), around = d0.clone().addScaledVector(sidev, sd * 0.85).addScaledVector(toD, 0.1);
      const past = spec.to ? V(wx(spec.to[0]), 0, wz(spec.to[1])) : d0.clone().addScaledVector(toD, 1.9); if (past.distanceTo(d0) < 1.4) past.copy(d0).addScaledVector(toD, 1.8).addScaledVector(sidev, sd * 0.3);
      const t1 = clamp((len - 0.8) / 4.3, 0.3, 0.95), t2 = t1 + 0.34, t3 = t2 + clamp(past.distanceTo(around) / 5, 0.3, 0.7), S_ = {}; dur = (res === 'past' ? t3 + 0.2 : t2) + 0.9;
      list.forEach(P => { if (P.side === spec.atk) look(P, 0, 0, true); else look(P, a0.x, a0.z, true); });
      look(A, d0.x, d0.z, true); look(Df, a0.x, a0.z, true); A.ball = true; actors([spec.x, spec.by]);
      step = (t, dt) => {
        if (t < t1) moveTo(A, fake.x, fake.z, 4.3, dt);                                                 // anlaufen, leicht zur falschen Seite
        else if (res === 'lost') { if (t < t2) moveTo(A, meet.x, meet.z, 2.6, dt); else if (A.anim !== 'sad') { A.speed = 0; anim(A, 'sad', t, 9); } }
        else if (res === 'held') { if (t < t2 + 0.2) moveTo(A, meet.x - toD.x * 0.5 + sidev.x * sd * 0.5, meet.z - toD.z * 0.5 + sidev.z * sd * 0.5, 2.4, dt); else { A.speed = 0; if (A.anim === 'run') A.anim = 'idle'; look(A, 0, 0); } }
        else if (t < t2) moveTo(A, around.x, around.z, 5.4, dt); else if (!moveTo(A, past.x, past.z, 5, dt)) look(A, 0, 0);
        if (t > t1 - 0.12 && !S_.lunged) { S_.lunged = true; look(Df, A.pos.x, A.pos.z, true); anim(Df, 'lunge', t, 0.85, { dir: res === 'past' ? -sd * Df.hand * 0.9 : 0, stay: res === 'past' }); }
        if (res === 'past' && t > t1 + 0.3 && Df.anim === 'lunge') anim(Df, 'fall', t, 0.7);
        if (!S_.hit && t >= t2) { S_.hit = true; fire(); if (res === 'lost') { A.ball = false; Df.ball = true; mood = 'groan'; } }
        if (res === 'lost' && t >= t2 + 0.25) { Df.stay = false; moveTo(Df, d0.x - toD.x * 1.6 + sidev.x * sd * 2.2, d0.z - toD.z * 1.6 + sidev.z * sd * 2.2, 3.6, dt); }
        ballAt(res === 'lost' && t >= t2 ? Df : A);
        const k = ease(seg(t, 0, dur)), lead = res === 'past' ? ease(seg(t, t2 + 0.2, t3 + 0.55)) : 0, mid = tmp.lerpVectors(A.pos, Df.pos, res === 'lost' ? 0.5 + 0.4 * ease(seg(t, t2, dur)) : 0.5);
        if (lead) mid.lerp(camP.copy(A.pos).addScaledVector(toD, 1.4), lead * 0.75);
        if (!S_.cam) { S_.cam = true; camL.set(mid.x, 0.65, mid.z); }
        camL.set(lerp(camL.x, mid.x, 0.2), 0.65, lerp(camL.z, mid.z, 0.2));
        camP.lerpVectors(a0, A.pos, lead * 0.75).addScaledVector(toD, -2.9 + k * (lead ? 0.3 : 1.0)).addScaledVector(sidev, -sd * (1.15 - k * 0.3)).setY(1.4 + k * 0.2); camAt(camP, camL, 46); focus = camP.distanceTo(camL);
      };
    }
    R.trailNew = !cont; if (cont) ballV.copy(ball0);
    let ended = false;
    const me = D.cut = {
      // ein Zeitschritt der Szene
      tick(dt) {
        tt += dt; step(tt, dt);
        list.forEach(P => {
          pose(P, tt, dt);
          // wer der Kamera im Weg steht und nicht zur Szene gehört, wird ausgeblendet
          const dx = P.pos.x - R.camP.x, dz = P.pos.z - R.camP.z, d2 = dx * dx + dz * dz;
          if (P.actor) { P.label.near = d2 < 7.5; if (P.anim === 'fall') P.label.visible = false; } else P.root.visible = d2 > 4.6;
        });
        if (carrier === K) keeperHand(K, ballV); else if (carrier) bladePos(carrier, ballV);
        setBall(ballV);
        R.focus = focus || 8; R.dof = [Math.max(1.6, R.focus * 0.5), R.focus * 1.1 + 5, 9];
        fans(D.t, spec.atk, mood);
        R.leds.forEach((L, i) => { const on = led && i === (D.flip ? 1 : 0), m = L.material; if (on) { if (m.map !== R.ledGoal) m.map = R.ledGoal; m.color.setScalar(0.7 + 0.3 * Math.abs(Math.sin((tt - led) * 9))); } else if (m.map !== R.ledIdle) { m.map = R.ledIdle; m.color.setScalar(1); } });
        if (led) R.ledGoal.offset.x = tt * 0.35;
        const sh = tt - shakeT; R.shake = sh >= 0 && sh < 0.35 ? (1 - sh / 0.35) * shakeAmp : 0; R.shakeT = sh;
        if (tt >= dur) { me.end(); if (!o.linger || tt > dur + 20) me.kill(); }
      },
      end() { if (ended) return; ended = true; fire(); resDone(true); },
      // ans Ende springen (Vorspulen)
      skip() { if (ended) return; try { while (tt < dur && D.cut === me) { D.t += 1 / 30; me.tick(1 / 30); } } catch (e) { fail(e); } me.end(); },
      // Szene verlassen: zurück ins laufende Spiel. Die Figuren bleiben stehen, wo sie sind, und laufen von dort an ihren Platz.
      kill() {
        if (D.cut !== me) return; D.cut = null; me.end(); unflip();
        R.leds.forEach(L => { L.material.map = R.ledIdle; L.material.color.setScalar(1); }); R.shake = 0;
        blendCam(0.55); fans(D.t, 'you', null);
      }
    };
    return { impact, done, dur };
  }
  function hideMarks() { const M = R.marks; M.carrier.visible = false; M.lanes.forEach(m => { m.visible = false; }); M.rings.forEach(m => { m.visible = false; }); M.defs.forEach(d => { d.core.visible = d.edge.visible = d.brush.visible = false; }); M.finish.visible = M.sideN.visible = M.sideP.visible = M.arrow.visible = false; M.reach.visible = M.reachEdge.visible = M.aim.visible = M.land.visible = M.zones.visible = false; M.shade.forEach(o => { o.body.visible = o.edge.visible = false; }); }

  /* --- Laufendes Spiel: Die Figuren stehen dort, wo das Match sie hinstellt --- */
  // Wer auf dem Feld steht. list: { you: [{ id, name, no }], home: [...] }. Wer bleibt, behält seinen Platz.
  function teams(list) {
    if (!R) return; const want = {};
    ['you', 'home'].forEach(side => (list[side] || []).forEach(c => { want[c.id] = { id: c.id, side, name: c.name, no: c.no }; }));
    R.figs.forEach(P => { if (P.used && !want[P.id]) { P.used = false; P.root.visible = false; P.id = null; } });
    Object.keys(want).forEach(id => { if (figOf(id)) return; const P = R.figs.find(f => !f.used); if (P) { dress(P, want[id]); P.root.visible = true; } });
    R.tags.innerHTML = '';
    R.figs.forEach(P => { if (!P.used) { P.tag = null; return; } const el = document.createElement('div'); el.className = 's3tag ' + P.side; el.innerHTML = '<b></b>' + (P.side === 'you' ? '<i><u></u></i>' : ''); el.firstChild.textContent = P.name; R.tags.appendChild(el); P.tag = el; });
  }
  function place(id, x, y, snapNow) { const P = R && figOf(id); if (!P) return; P.live.set(wx(x), 0, wz(y)); if (P.snap || snapNow) { P.snap = false; if (D.mode === 'live') { P.pos.copy(P.live); P.fresh = true; } } }
  function ball(x, y) { if (!R) return; if (!D.ballFree) D.ballFree = new T.Vector3(); D.ballFree.set(wx(x), 0.08, wz(y)); D.ballAt = D.t; }
  function setCarrier(id) { D.carrier = id || null; }
  function energy(id, pct, col) { const P = R && figOf(id); if (P && P.tag && P.side === 'you') { const u = P.tag.lastChild.firstChild; u.style.width = Math.round(pct) + '%'; u.style.background = col; } }
  // Passwege und freie Mitspieler. list: [{ a: [x, y], b: [x, y], col, w, free, id, dim }]
  function lanes(list) {
    if (!R) return; const M = R.marks; D.lanes = list || [];
    M.lanes.forEach((m, i) => { const L = D.lanes[i]; m.visible = !!L; if (!L) return; const ax = wx(L.a[0]), az = wz(L.a[1]), bx = wx(L.b[0]), bz = wz(L.b[1]), len = Math.hypot(bx - ax, bz - az); m.position.set((ax + bx) / 2, 0.022 + i * 0.001, (az + bz) / 2); m.scale.set(0.05 * (L.w || 3), Math.max(0.1, len - 0.9), 1); m.rotation.z = Math.atan2(bx - ax, bz - az) + Math.PI; m.material.color.set(L.col || '#ffffff'); m.material.opacity = L.dim ? 0.35 : 0.72; });
    R.figs.forEach(P => { if (P.tag) P.tag.classList.remove('s3free', 's3pick', 's3deep'); });
    D.lanes.forEach(L => { const P = L.id && figOf(L.id); if (P && P.tag && !L.dim) { P.tag.classList.add('s3pick'); if (L.free) P.tag.classList.add('s3free'); if (L.deep) P.tag.classList.add('s3deep'); } });
  }
  // Welcher Spieler liegt unter dem Finger? ids: wer in Frage kommt
  function pick(cx, cy, ids) {
    if (!R) return null; const r = R.host.getBoundingClientRect(); let best = null, bd = 46;
    (ids || []).forEach(id => { const P = figOf(id); if (!P) return; const s = screenOf(R.v1.set(P.root.position.x, 0.75, P.root.position.z)), d = Math.hypot(r.left + s[0] - cx, r.top + s[1] - cy); if (s[2] && d < bd) { bd = d; best = id; } });
    return best;
  }
  // Punkt der Halle → Bildschirm (in Pixeln der Bühne); [x, y, sichtbar]
  function screenOf(v) { v.project(R.cam); return [(v.x + 1) / 2 * R.w, (1 - v.y) / 2 * R.h, v.z < 1 && v.z > -1]; }
  function liveTick(dt) {
    const t = D.t, M = R.marks, tmp = R.v2;
    R.figs.forEach(P => {
      if (!P.used) return;
      const dx = P.live.x - P.pos.x, dz = P.live.z - P.pos.z, d = Math.hypot(dx, dz); let mv = 0;
      if (d > 0.003) { mv = Math.min(d * (1 - Math.exp(-dt * 16)), Math.max(11, d * 3) * dt); P.pos.x += dx / d * mv; P.pos.z += dz / d * mv; }      // wer weit weg ist (neue Szene am anderen Ende), holt schneller auf
      P.vel += (mv / Math.max(0.001, dt) - P.vel) * Math.min(1, dt * 12);
      if (P.vel > 0.45) { P.anim = 'run'; P.speed = clamp(P.vel, 1.4, 6); P.cycle += mv * 7; if (d > 0.06) P.faceTo = Math.atan2(dx, dz); }
      else { P.anim = 'idle'; P.speed = 0; if (P.id === D.carrier) P.faceTo = Math.atan2(-P.pos.x, (P.side === 'you' ? 0 : RL) - P.pos.z); else P.faceTo = Math.atan2(R.ballL.x - P.pos.x, R.ballL.z - P.pos.z); }
      P.ball = P.id === D.carrier;
      pose(P, t, dt);
    });
    // Ball: fliegt er gerade (das Match bewegt ihn), dann dorthin; sonst liegt er an der Schaufel des Ballführenden
    const C = D.carrier && figOf(D.carrier);
    if (D.ballFree && t - D.ballAt < 0.16) tmp.copy(D.ballFree);
    else if (C) { bladePos(C, tmp); tmp.lerpVectors(R.ballL, tmp, 1 - Math.exp(-dt * 22)); } else tmp.copy(R.ballL);
    setBall(tmp);
    M.carrier.visible = !!C; if (C) { M.carrier.position.set(C.pos.x, 0.02, C.pos.z); M.carrier.scale.setScalar(1 + Math.sin(t * 5) * 0.06); }
    M.rings.forEach((m, i) => { const L = D.lanes[i], P = L && (L.free || L.deep) && figOf(L.id); m.visible = !!P; if (P) { m.position.set(P.pos.x, 0.021, P.pos.z); m.scale.setScalar(1 + Math.sin(t * 6 + i) * 0.1); } });
    // Kamera: schräg von hinten über deine Hälfte, fährt dem Ausschnitt nach, den das Match vorgibt
    const fz = (D.camY + 170) * S; D.fz += (fz - D.fz) * (1 - Math.exp(-dt * 3.2)); D.bx += (R.ballL.x - D.bx) * (1 - Math.exp(-dt * 2));
    camAt(R.v3.set(D.bx * 0.22, 7.2, D.fz + 13), R.v4.set(D.bx * 0.3, 0.5, D.fz - 2), 54);
    R.focus = 15; R.dof = [10, 14, 6];
  }
  /* Wie weit die Kamera im laufenden Spiel zurück muss (als camY), damit alle Punkte des Felds im Bild sind. Nah an der
     Kamera ist das Bild schmal: Wer weit aussen steht, braucht mehr Abstand. pts: [[x, y]], ballX: wo der Ball ist. */
  function fit(pts, ballX) {
    const cx = wx(ballX === undefined ? 180 : ballX) * 0.22, half = Math.tan(27 * RAD) * REFA * 0.9; let z = -99;
    (pts || []).forEach(p => { z = Math.max(z, wz(p[1]) + Math.max(6.6, Math.abs(wx(p[0]) - cx) / half)); });
    return (z - 13) / S - 170;
  }
  // Schilder über den Köpfen nachführen
  function tagsPose() {
    const live = D.mode === 'live', cut = D.mode === 'cut'; R.tags.hidden = !live && !cut; R.tags.classList.toggle('cut', cut); if (!live && !cut) return;
    R.figs.forEach(P => { if (!P.tag) return; const show = P.used && P.root.visible && (live || (P.label.visible && !P.label.near)), s = show ? screenOf(R.v1.set(P.root.position.x, 1.62 * P.big + P.root.position.y, P.root.position.z)) : null; P.tag.hidden = !show || !s[2]; if (show) P.tag.style.transform = `translate(${s[0].toFixed(1)}px,${s[1].toFixed(1)}px) translate(-50%,-100%)`; });
  }

  /* --- Zielen und Parade vor dem Tor ---
     aim(spec): stellt die Szene wie vor einem Schuss, die Kamera schaut von hinter dem Schützen mit langer Brennweite aufs Tor.
     spec wie bei play (kind 'shot'), dazu q (0 fern bis 1 nah: so gross steht das Tor im Bild). */
  function aim(spec) {
    if (!ok() || !R) return false;
    try {
      if (D.cut) D.cut.kill(); if (D.mode !== 'live') unflip();
      const st = stage(spec), Sh = st.by[spec.by], K = st.K; hideMarks(); blendCam(0.5); D.mode = 'aim'; R.trailNew = true;
      st.list.forEach(P => { P.faceTo = P.side === spec.atk ? Math.atan2(-P.pos.x, -P.pos.z) : Math.atan2(Sh.pos.x - P.pos.x, Sh.pos.z - P.pos.z); P.face = P.faceTo; });
      Sh.ball = true; K.pos.x = clamp((spec.kx || 0) * GW, -GW * 0.72, GW * 0.72); Sh.style = STY3[spec.style] ? spec.style : 'wrist';
      st.list.forEach(P => { P.root.visible = false; });      // nur Tor und Goalie: Wer davor steht, würde es verdecken
      const p0 = Sh.pos, dist = Math.max(2.5, Math.hypot(p0.x, p0.z)), dx = p0.x / dist, dz = p0.z / dist, cd = dist + 2.8, frac = 0.5 + 0.3 * clamp(spec.q == null ? 0.5 : spec.q, 0, 1);
      const hf = 2 * Math.atan(2 * GW * Math.max(0.55, dz) / frac / (2 * cd)), vf = 2 * Math.atan(Math.tan(hf / 2) / winAsp()) / RAD;
      const off = spec.style === 'drag' && spec.pull ? spec.pull * 0.9 : 0;
      D.aim = { list: st.list, Sh, K, cam: new T.Vector3(dx * cd, 2.25, dz * cd), look: new T.Vector3(0, 0.54, 0), fov: clamp(vf, 7, 48), dist: cd, fly: null, atk: spec.atk, kx: K.pos.x, off, offTo: off, p0: Sh.pos.clone(), wind: null, camV: new T.Vector3(), lookV: new T.Vector3() };
      return true;
    } catch (e) { fail(e); return false; }
  }
  // Zielmarke im Tor (g in Torkoordinaten) oder weg
  function aimTarget(g) { const m = R && R.marks.aim; if (!m) return; m.visible = !!g; if (g) m.position.set(g[0] * GW, g[1] * GH, 0.04); }
  // Reichweite des Goalies: Ellipse um ihn (kx, ky Mitte, r waagrecht, kys Stauchung nach oben), hot: er rückt
  function aimReach(o) { const M = R && R.marks; if (!M) return; M.reach.visible = M.reachEdge.visible = !!o; if (!o) return; [M.reach, M.reachEdge].forEach(m => { m.position.set(o.kx * GW, o.ky * GH, 0.03); m.scale.set(o.r * GW, o.r / o.kys * GH, 1); }); M.reachEdge.material.color.set(o.hot ? '#f7d774' : '#ffffff'); M.reach.material.opacity = o.hot ? 0.6 : 0.5; if (D.aim) D.aim.kx = clamp(o.kx * GW, -GW * 0.8, GW * 0.8); }
  // Schatten der Blocker im Tor: list [{ x, w, top }] in Torkoordinaten (Mitte, halbe Breite, Höhe) oder leer
  function aimShade(list) {
    const M = R && R.marks; if (!M) return; const l = (list || []).slice().sort((a, b) => b.w - a.w).slice(0, M.shade.length);
    M.shade.forEach((o, i) => {
      const s = l[i]; o.body.visible = o.edge.visible = !!s; if (!s) return;
      const x0 = Math.max(-1.02, s.x - s.w), x1 = Math.min(1.02, s.x + s.w), top = Math.min(1.02, s.top), w = Math.max(0.02, (x1 - x0) * GW), h = top * GH;
      o.body.position.set((x0 + x1) / 2 * GW, h / 2, 0.02 + i * 0.002); o.body.scale.set(w, h, 1); o.tx.repeat.set(Math.max(0.5, w / 0.32), Math.max(0.5, h / 0.32));
      // heller Rand an den Seiten, die im Tor liegen
      const inL = s.x - s.w > -1, inR = s.x + s.w < 1, ex = inL && inR ? (s.w < 0.2 ? x0 : (Math.abs(x0) < Math.abs(x1) ? x0 : x1)) : inL ? x0 : inR ? x1 : null;
      o.edge.visible = ex !== null; if (ex !== null) { o.edge.position.set(ex * GW, h / 2, 0.03 + i * 0.002); o.edge.scale.set(0.03, h, 1); }
    });
  }
  // Andere Schussart beim Zielen: Beim Zugschuss rückt die Kamera mit dem Ball zur Seite (pull: -1 links, 1 rechts), sonst zurück
  function aimStyle(style, pull) { const A = D.aim; if (!A) return; A.Sh.style = STY3[style] ? style : 'wrist'; A.offTo = style === 'drag' && pull ? pull * 0.9 : 0; }
  /* Anlauf des Gegners vor seinem Schuss: Der Schütze ist von hinten zu sehen und holt in seiner Schussart aus; nach ms
     Millisekunden ist der Ball weg. Die Kamera fährt dabei von der Totale aufs Tor. So lässt sich die Schussart lesen. */
  function windup(style, ms) {
    const A = D.aim; if (!A) return; const Sh = A.Sh, d = Math.max(0.3, ms / 1000), sty = STY3[style] ? style : 'wrist', sd = Math.min(STY3[sty].sd, d / REL), pull = sty === 'drag' ? (A.p0.x > 0 ? -1 : 1) : 0;
    Sh.style = sty; Sh.root.visible = true; Sh.poof = 0; Sh.anim = 'idle'; Sh.fresh = true; Sh.pos.copy(A.p0); if (pull) handFor(Sh, pull, Sh.faceTo);
    A.wind = { t0: D.t, rel: D.t + d, sd, start: D.t + d - sd * REL, pull, gone: 0 };
  }
  // Wo im Tor liegt der Finger? Gibt Torkoordinaten zurück (x -1 bis 1 zwischen den Pfosten, y 0 Boden bis 1 Latte).
  function pickGoal(cx, cy) {
    if (!R) return [0, 0.5]; const r = R.host.getBoundingClientRect(), v = R.v1.set((cx - r.left) / r.width * 2 - 1, 1 - (cy - r.top) / r.height * 2, 0.5).unproject(R.cam), o = R.cam.position, dzr = v.z - o.z, gz = D.flip ? RL : 0;
    if (Math.abs(dzr) < 1e-6) return [0, 0.5]; const k = (gz - o.z) / dzr, x = o.x + (v.x - o.x) * k, y = o.y + (v.y - o.y) * k;
    return [(D.flip ? -x : x) / GW, y / GH];
  }
  // Parade: Der Ball fliegt in ms Millisekunden zum Punkt land (Torkoordinaten), dort blinkt ein Ring; die Zonen sind eingeblendet
  /* feint { land, ms }: Zugschuss. Der Ball fliegt zuerst Richtung land der Finte, der Ring steht dort; nach ms springt der Ring
     an den echten Landepunkt, und der Ball zieht in einem Bogen dorthin. */
  function react(land, ms, zones, feint) {
    const A = D.aim; if (!A) return; const M = R.marks, Sh = A.Sh, W = A.wind, from = W && W.rest ? W.rest.clone() : bladePos(Sh, new T.Vector3()), dur = Math.max(0.1, ms / 1000), V = (x, y) => new T.Vector3(x * GW, Math.max(0.08, y * GH), 0.1);
    Sh.ball = false; if (!W || Sh.anim !== 'shot') { Sh.anim = 'shot'; Sh.t0 = D.t - 0.7 * REL; Sh.dur = 0.7; }
    if (W) W.gone = D.t;                                                               // der Schütze macht Platz für den Blick aufs Tor
    A.fly = { from, to: V(land[0], land[1]), t0: D.t, dur };
    const at = l => M.land.position.set(clamp(l[0], -1.2, 1.2) * GW, clamp(l[1], 0.05, 1.2) * GH, 0.05);
    if (feint && feint.ms > 0 && feint.ms < ms) { const F = A.fly, f = feint.ms / ms, dec = V(feint.land[0], feint.land[1]); F.f = f; F.mid = new T.Vector3().lerpVectors(from, dec, f); F.ctl = F.mid.clone().addScaledVector(dec.clone().sub(from), (1 - f) * 0.5); F.land = land; at(feint.land); } else at(land);
    M.land.visible = zones !== false; M.zones.visible = zones !== false; Object.keys(M.zone).forEach(z => { M.zone[z].visible = false; });
  }
  function reactPick(z) { const M = R && R.marks; if (M && M.zone[z]) M.zone[z].visible = true; }
  // Wie lange der Ball in der Parade-Szene noch fliegt (Sekunden)
  function flyLeft() { const f = D.aim && D.aim.fly; return f ? Math.max(0, f.t0 + f.dur - D.t) : 0; }
  function aimTick(dt) {
    const A = D.aim, t = D.t, tmp = R.v2, W = A.wind, Sh = A.Sh;
    if (W) {
      // Anlauf: erst ruhig am Ball, dann die Bewegung, die genau beim Abschluss den Ball trifft; beim Zug geht er mit zur Seite
      if (t >= W.start && Sh.anim !== 'shot' && !W.gone) { Sh.anim = 'shot'; Sh.t0 = W.start; Sh.dur = W.sd; if (Sh.style === 'slap') W.rest = bladePos(Sh, new T.Vector3()); }
      if (W.pull) Sh.pos.x = A.p0.x + W.pull * 0.75 * ease(seg(t, W.start, W.start + W.sd * SU[1]));
      if (W.gone) { Sh.poof = clamp((t - W.gone) / 0.12, 0, 1); if (Sh.poof >= 1) { Sh.root.visible = false; Sh.poof = 0; W.gone = 0; W.done = true; } }
    }
    A.list.forEach(P => { if (P.anim !== 'shot') { P.anim = 'idle'; P.speed = 0; } pose(P, t, dt); });
    if (A.fly) {
      const F = A.fly, u = clamp((t - F.t0) / F.dur, 0, 1);
      if (F.f && u < F.f) tmp.lerpVectors(F.from, F.mid, u / F.f);
      else if (F.f) { const k = (u - F.f) / (1 - F.f), a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, c = k * k; tmp.set(a * F.mid.x + b * F.ctl.x + c * F.to.x, a * F.mid.y + b * F.ctl.y + c * F.to.y, a * F.mid.z + b * F.ctl.z + c * F.to.z); if (F.land) { R.marks.land.position.set(clamp(F.land[0], -1.2, 1.2) * GW, clamp(F.land[1], 0.05, 1.2) * GH, 0.05); F.land = null; } }
      else tmp.lerpVectors(F.from, F.to, u);
      tmp.y += Math.sin(Math.PI * u) * 0.25; R.marks.land.scale.setScalar(1 + Math.sin(t * 20) * 0.18);
    } else if (W && W.rest) tmp.copy(W.rest); else bladePos(Sh, tmp);
    setBall(tmp);
    // Goalie gleitet an seinen Platz; beim Zugschuss rückt die Kamera zur Seite
    A.K.pos.x += (A.kx - A.K.pos.x) * (1 - Math.exp(-dt / 0.05)); A.off += (A.offTo - A.off) * (1 - Math.exp(-dt / 0.12));
    A.camV.copy(A.cam); A.camV.x += A.off; A.lookV.copy(A.look); let fov = A.fov;
    if (W && !W.done) {
      // Totale schräg hinter dem Schützen: Man sieht ihn ausholen. Erst im Durchziehen fährt die Kamera aufs Tor zu.
      const k = ease(seg(t, W.rel - 0.36, W.rel - 0.04)), w = 1 - k, bx = A.p0.x - A.cam.x, bz = A.p0.z - A.cam.z, bl = Math.hypot(bx, bz) || 1, ux = bx / bl, uz = bz / bl;
      A.camV.x += (-ux * 2.2 + uz * 1.15) * w; A.camV.z += (-uz * 2.2 - ux * 1.15) * w; A.camV.y += 0.75 * w;
      A.lookV.set(lerp(A.p0.x * 0.7, A.look.x, k), lerp(0.6, A.look.y, k), lerp(A.p0.z * 0.7, A.look.z, k)); fov = lerp(clamp(A.fov * 1.5 + 22, 34, 56), A.fov, k);
    }
    camAt(A.camV, A.lookV, fov); R.focus = A.dist; R.dof = [1.4, 5, 10];
  }

  /* --- Dribbling-Parcours ---
     drib(info): { id (Dribbler), defs: [{ id, core, brush }], min, max, len, end: [x, y] (wo der Lauf auf dem Feld endet) }.
     dribUpdate(st, u): Stand des Laufs wie die Engine ihn rechnet (st.x, st.y, st.d[i], st.out) und die gewischte Richtung. */
  function drib(info) {
    if (!ok() || !R) return false;
    try {
      if (D.cut) D.cut.kill(); if (D.mode !== 'live') unflip();
      const A = figOf(info.id); if (!A) return false;
      hideMarks(); blendCam(0.45); D.mode = 'drib';
      const cx = clamp(wx(info.end[0]), -5.2, 5.2), zEnd = clamp(wz(info.end[1]), 3.2, 12), z0 = zEnd + info.len * S, M = R.marks;
      R.figs.forEach(P => { if (P.used) { P.hide = true; P.root.visible = false; } });
      const defs = info.defs.map((d, i) => { const P = figOf(d.id); if (P) { reset(P); P.hide = false; P.root.visible = true; } const m = M.defs[i]; if (m) { m.core.scale.setScalar(d.core * S); m.edge.scale.setScalar(d.core * S); m.brush.scale.setScalar(d.brush * S); m.core.visible = m.edge.visible = m.brush.visible = true; m.core.material.opacity = 0.34; } return { P, m, passed: false, fell: false }; });
      reset(A); A.hide = false; A.root.visible = true; A.ball = true;
      const w = (info.max - info.min + 44) * S; M.finish.visible = true; M.finish.position.set(cx + (info.max + info.min) / 2 * S, 0.02, zEnd); M.finish.scale.set(w, 1, 1);
      [[M.sideN, info.min - 22], [M.sideP, info.max + 22]].forEach(a => { a[0].visible = true; a[0].position.set(cx + a[1] * S, 0.02, zEnd + info.len * S / 2); a[0].scale.set(1, info.len * S + 3, 1); });
      D.drib = { A, defs, cx, z0, st: null, u: [0, 0], lost: null, px: 0, pz: 0, camOn: false };
      return true;
    } catch (e) { fail(e); return false; }
  }
  function dribUpdate(st, u) { if (D.drib) { D.drib.st = st; D.drib.u = u || [0, 0]; } }
  function dribTick(dt) {
    const d = D.drib, st = d.st, t = D.t, A = d.A, M = R.marks, tmp = R.v2;
    const follow = (P, x, z, faceX, faceZ) => { const dx = x - P.pos.x, dz = z - P.pos.z, mv = Math.hypot(dx, dz); P.pos.x = x; P.pos.z = z; P.vel += (mv / Math.max(0.001, dt) - P.vel) * Math.min(1, dt * 12); if (P.anim === 'fall' || P.anim === 'sad') return; if (P.vel > 0.5) { P.anim = 'run'; P.speed = clamp(P.vel, 1.4, 6); P.cycle += mv * 7; if (faceX == null && mv > 0.004) P.faceTo = Math.atan2(dx, dz); } else { P.anim = 'idle'; P.speed = 0; } if (faceX != null) P.faceTo = Math.atan2(faceX - P.pos.x, faceZ - P.pos.z); };
    if (st) {
      const ax = d.cx + st.x * S, az = d.z0 - st.y * S; if (A.fresh) { A.pos.set(ax, 0, az); A.faceTo = A.face = Math.PI; }
      follow(A, ax, az);
      d.defs.forEach((o, i) => {
        const q = st.d[i], P = o.P; if (!q || !P) return; const x = d.cx + q.x * S, z = d.z0 - q.y * S; if (P.fresh) P.pos.set(x, 0, z);
        if (!o.fell) follow(P, x, z, A.pos.x, A.pos.z);
        if (o.m) [o.m.core, o.m.edge, o.m.brush].forEach(m => m.position.set(P.pos.x, 0.021, P.pos.z));
        // vorbei: Er greift ins Leere und fällt hin
        if (!o.passed && st.y > q.y + 4) { o.passed = true; if (o.m) { o.m.core.visible = o.m.edge.visible = o.m.brush.visible = false; } if (!(st.out && st.out.hit === i)) { o.fell = true; P.faceTo = Math.atan2(A.pos.x - P.pos.x, A.pos.z - P.pos.z); P.anim = 'fall'; P.t0 = t; P.dur = 0.7; } }
      });
      // Ball weg: Der Verteidiger hat ihn, der Dribbler lässt den Kopf hängen
      if (st.out && !d.lost) { const o = d.defs[st.out.hit]; d.lost = o && o.P; if (o && o.m) o.m.core.material.opacity = 0.75; if (d.lost) { A.ball = false; d.lost.ball = true; A.anim = 'sad'; A.t0 = t; A.dur = 9; } }
    }
    [A].concat(d.defs.map(o => o.P)).forEach(P => { if (P) pose(P, t, dt); });
    bladePos(d.lost || A, tmp); setBall(tmp);
    // Pfeil: gewischte Richtung und Stärke
    const um = Math.hypot(d.u[0], d.u[1]); M.arrow.visible = um > 0.08 && !d.lost && !(st && st.done);
    if (M.arrow.visible) { M.arrow.position.set(A.pos.x + d.u[0] / um * 0.6, 0.024, A.pos.z - d.u[1] / um * 0.6); M.arrow.rotation.z = Math.atan2(-d.u[0], d.u[1]); M.arrow.scale.setScalar(0.9 + um * 1.3); M.arrow.material.opacity = 0.4 + 0.5 * um; }
    // Kamera läuft hinter dem Dribbler her
    if (!d.camOn) { d.camOn = true; d.px = A.pos.x; d.pz = A.pos.z; } d.px += (A.pos.x - d.px) * (1 - Math.exp(-dt * 5)); d.pz += (A.pos.z - d.pz) * (1 - Math.exp(-dt * 7));
    camAt(R.v3.set(d.cx + (d.px - d.cx) * 0.6, 3.7, d.pz + 4.5), R.v4.set(d.cx + (d.px - d.cx) * 0.75, 0.4, d.pz - 3.4), 56); R.focus = 6.5; R.dof = [8, 10, 7];
  }
  // Parcours verlassen: zurück ins laufende Spiel
  function dribEnd() { if (!R || D.mode !== 'drib') return; unflip(); blendCam(0.5); }

  // --- Ein Bild: rechnen und zeichnen ---
  function tick(dt) {
    D.t += dt;
    if (D.cut) D.cut.tick(dt); else if (D.mode === 'aim' && D.aim) aimTick(dt); else if (D.mode === 'drib' && D.drib) dribTick(dt); else liveTick(dt);
    // Goalies: jeder sieht den Ball aus seinem Tor; im laufenden Spiel rutschen sie mit dem Ball mit
    const bw = R.ball.position;
    R.keepers.forEach(K => { const b = K.flip ? R.v1.set(-bw.x, bw.y, RL - bw.z) : R.v1.copy(bw); if (D.mode === 'live') K.pos.x += (clamp(b.x * 0.22, -0.75, 0.75) - K.pos.x) * Math.min(1, dt * 4); if (K.root.visible) poseKeeper(K, D.t, dt, b); });
    if (!D.cut) { fans(D.t, 'you', null); R.shake = 0; }
    nets(D.t);
  }
  function draw() {
    resize();
    // Kamera vom Szenenraum in die Halle; nach einem Wechsel der Betriebsart gleitet sie hinüber
    const p = toW(R.camP, R.v1), l = toW(R.camL, R.v2); let fov = R.camFov;
    if (D.blend > 0) { const k = ease(1 - D.blend); p.lerpVectors(R.from.p, p, k); l.lerpVectors(R.from.l, l, k); fov = lerp(R.from.fov, fov, k); }
    if (R.shake) { p.x += Math.sin(R.shakeT * 70) * R.shake; p.y += Math.cos(R.shakeT * 55) * R.shake * 0.7; }
    /* fov gilt für das Fenster zwischen den Anzeigen. Die Brennweiten sind für ein Bild im Format REFA gewählt: Ist das
       Fenster schmaler, wird der Winkel grösser, damit links und rechts nichts fehlt (beim Zielen steht er schon passend).
       Für das ganze Bild wird er umgerechnet, und die Bildmitte rückt in die Mitte des Fensters. */
    R.fovD = fov;
    const hv = winH(), kT = D.mode === 'aim' ? 1 : Math.max(1, REFA / (R.w / hv)); R.kf = R.kf ? R.kf + (kT - R.kf) * 0.18 : kT;
    const full = 2 * Math.atan(Math.tan(fov * RAD / 2) * R.kf * R.h / hv) / RAD, off = ((R.inBot || 0) - (R.inTop || 0)) / 2;
    R.cam.position.copy(p); R.look.copy(l); R.cam.lookAt(l);
    if (R.proj || Math.abs(R.cam.fov - full) > 0.01) { R.proj = false; R.cam.fov = full; if (off) R.cam.setViewOffset(R.w, R.h, 0, off, R.w, R.h); else { R.cam.clearViewOffset(); R.cam.updateProjectionMatrix(); } }
    R.cam.updateMatrixWorld();
    // Lampe von der Kameraseite, Streiflicht von gegenüber
    const fx = l.x - p.x, fz = l.z - p.z, fl = Math.hypot(fx, fz) || 1, ux = fx / fl, uz = fz / fl;
    R.sun.target.position.set(l.x, 0, l.z); R.sun.position.set(l.x - ux * 7 + uz * 4, 12, l.z - uz * 7 - ux * 4); R.rim.target.position.copy(R.sun.target.position); R.rim.position.set(l.x + ux * 9 - uz * 3, 6, l.z + uz * 9 + ux * 3);
    tagsPose();
    if (R.post && R.q < 2) {
      const u = R.post.m.uniforms, dof = R.dof, pr = R.renderer.getPixelRatio(); u.focus.value = R.focus; u.farS.value = dof[0]; u.farR.value = dof[1]; u.maxR.value = dof[2] * pr / 2; u.nearR.value = Math.max(2, R.focus * 0.7); u.n.value = R.cam.near; u.f.value = R.cam.far;
      R.renderer.setRenderTarget(R.post.rt); R.renderer.render(R.scene, R.cam); R.renderer.setRenderTarget(null); R.renderer.render(R.post.sc, R.post.cam);
    } else R.renderer.render(R.scene, R.cam);
  }
  function frame() {
    if (!D.loop) return;
    try {
      const now = performance.now() / 1000, raw = now - D.last, dt = Math.min(0.1, Math.max(0.001, raw)); D.last = now; if (D.blend > 0) D.blend = Math.max(0, D.blend - dt / D.blendT); tick(dt); draw();
      // Kommt das Gerät nicht mit (lange unter 20 Bildern pro Sekunde), wird die Darstellung einfacher
      if (now - D.since > 2 && R.q < 2 && !D.fixed) { R.slow = raw > 0.05 ? R.slow + 1 : Math.max(0, R.slow - 2); if (R.slow > 40) { R.slow = 0; R.q++; R.w = 0; R.sun.castShadow = R.q < 2; D.since = now - 1; } }
    }
    catch (e) { fail(e); return; }
    D.raf = requestAnimationFrame(frame);
  }
  /* Halle aufbauen (einmal) und die Schleife starten. opt.manual: ohne Schleife, die Zeit läuft nur über step() (Tests). */
  function mount(host, opt) {
    if (!ok()) return false;
    try {
      if (!R) { build(host); if (D.q0 != null) quality(D.q0); if (D.in0) inset(D.in0[0], D.in0[1]); }
      R.host.hidden = false; R.w = 0; resize(); if (D.cut) D.cut.kill(); if (D.mode !== 'live') unflip(); D.blend = 0;
      if (!(opt && opt.manual) && !D.loop) { D.loop = true; D.last = D.since = performance.now() / 1000; R.slow = 0; D.raf = requestAnimationFrame(frame); }
      return true;
    } catch (e) { fail(e); return false; }
  }
  function unmount() { D.loop = false; cancelAnimationFrame(D.raf); if (!R) return; if (D.cut) D.cut.kill(); if (D.mode !== 'live') unflip(); hideMarks(); R.host.hidden = true; }
  // Für Tests: die Zeit in festen Schritten vorstellen und ein Bild zeichnen
  function step(sec) { if (!R) return; try { for (let t = 0; t < sec - 1e-6; t += 1 / 60) { if (D.blend > 0) D.blend = Math.max(0, D.blend - (1 / 60) / D.blendT); tick(1 / 60); } draw(); } catch (e) { fail(e); } }
  // Für Tests: wo eine Figur und wo ein Punkt im Tor auf dem Bildschirm liegen (Fensterkoordinaten)
  function screen(id) { const P = R && figOf(id); if (!P) return null; const r = R.host.getBoundingClientRect(), q = screenOf(R.v1.set(P.root.position.x, 0.75, P.root.position.z)); return [r.left + q[0], r.top + q[1]]; }
  function goalAt(g) { if (!R) return null; const r = R.host.getBoundingClientRect(), q = screenOf(toW(R.v1.set(g[0] * GW, g[1] * GH, 0), R.v2)); return [r.left + q[0], r.top + q[1]]; }
  // Güte von Hand: 0 voll, 1 kleinere Auflösung, 2 ohne Unschärfe und Schatten, 3 winziges Bild (für Tests, die nur den Ablauf prüfen)
  function quality(q) { D.fixed = true; if (!R) { D.q0 = q; return; } R.q = q; R.w = 0; R.sun.castShadow = q < 2; const F = R.fans; [F.fb, F.fh, F.fr, F.fa].forEach(o => { o.visible = q < 3; }); }
  function stop() { if (D.cut) D.cut.skip(); }
  // Zurück ins laufende Spiel (nach einer Szene, die nachläuft, oder nach dem Zielen)
  function resume() { if (!R) return; if (D.cut) D.cut.kill(); else if (D.mode !== 'live') { unflip(); blendCam(0.5); } }

  window.HKScene3D = { ok, mount, unmount, teams, place, ball, carrier: setCarrier, energy, lanes, pick, camY(y) { D.camY = y; }, fit, play, stop, resume, inset, aim, aimTarget, aimReach, aimShade, aimStyle, windup, pickGoal, react, reactPick, flyLeft, drib, dribUpdate, dribEnd, step, screen, goalAt, quality, mode: () => D.mode, set onFail(f) { onFail = f; } };
})();
