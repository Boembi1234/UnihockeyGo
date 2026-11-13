/* Match mit Schlüsselszenen (Testversion unter /lab/match/).
   Ein Match hat 12 Szenen in 3 Dritteln. Jede Szene ist ein Angriff von dir oder vom Gegner. Wer mehr Angriffe bekommt,
   hängt von der Teamstärke ab: Ein starkes Team hat mehr Angriffs-, ein schwaches mehr Abwehrszenen.
   Angriff: Der Ballführende kann schiessen, passen oder dribbeln, bis zu vier Aktionen pro Szene.
   Abwehr: Der Gegner hat einen verdeckten Plan (Schuss, Pass oder Dribbling). Du wählst Druck, Schuss blocken oder
   den Passweg zu einem Gegner. Liegst du richtig, gewinnst du den Ball oft, und daraus kann ein Konter werden.
   Schüsse laufen über die Wischgeste: Ziel und Härte vom User, Streuung nach Abschluss, Härte und Distanz.
   Spielfeld: Koordinaten 0 bis 360 (Breite) und 0 bis 400 (Länge). Angegriffen wird immer das Tor oben bei (180, 40).
   Reine Funktionen: Zustand rein, Ergebnis raus, Zufall nur aus rng. Karten und Grundwerte kommen aus HK. */
(function (root) {
  'use strict';
  const E = root.HK, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), other = s => (s === 'you' ? 'home' : 'you');
  const GOAL = [180, 40];
  const ROLES = ['LD', 'RD', 'LW', 'C', 'RW'];
  const FORM = { LD: [96, 312], RD: [264, 312], LW: [70, 168], C: [180, 222], RW: [290, 168] };
  const MARKS = { LD: 'RW', RD: 'LW', LW: 'RD', C: 'C', RW: 'LD' };   // Rolle des Angreifers → Rolle seines Gegenspielers
  const ZONES = ['tl', 'tm', 'tr', 'bl', 'bm', 'br'];
  const ZC = { tl: [-0.62, 0.72], tm: [0, 0.75], tr: [0.62, 0.72], bl: [-0.62, 0.25], bm: [0, 0.2], br: [0.62, 0.25] };

  const CFG = {
    scenes: 12, perPeriod: 4, goalie: 88, maxSteps: 4, counterSteps: 2,
    attBase: 0.5, attSlope: 0.03, attMin: 0.25, attMax: 0.75,        // Anteil deiner Angriffsszenen nach Teamstärke
    // Schuss: wie im Testduell, dazu die Distanz
    sdBase: 0.05, sdSkill: 0.17, sdPow: 0.11, sdDist: 0.2, post: 0.07,
    saveSame: 0.9, saveAdj: 0.48, savePow: 0.35, saveSco: 0.012, saveEdge: 0.15, saveBody: 0.45, saveDist: 0.45,
    blockBase: 0.65,                                                  // Schuss geblockt, wenn ein Gegner ganz nah steht
    // Pass und Dribbling
    laneRange: 40, intercept: 0.55, passLong: 700,
    drib: 0.52, dribSlope: 0.025, dribMin: 0.15, dribMax: 0.85,
    // Ballverlust und Konter
    counterLoss: 0.3, counterWin: 0.35,
    // Abwehrszene: richtige Abwehr stoppt so oft, verschoben um den Wertevergleich
    stopRight: 0.5, stopSlope: 0.02, stopMin: 0.3, stopMax: 0.9, stopHalf: 0.15,
    keeperMemory: 6, tellTrue: 0.65
  };

  const byId = (l, id) => { for (let i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; };
  const card = (s, side, id) => byId(s.teams[side].cards, id);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  function distSeg(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1, t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l, 0, 1); return dist(p, [a[0] + t * dx, a[1] + t * dy]); }
  function sample(w, rng) { const k = Object.keys(w); let r = rng() * k.reduce((a, x) => a + w[x], 0); for (let i = 0; i < k.length; i++) { r -= w[k[i]]; if (r <= 0) return k[i]; } return k[k.length - 1]; }
  function gauss(rng) { let u = 0; while (!u) u = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); }
  const copy = s => JSON.parse(JSON.stringify(s));
  const jit = (rng, p, r) => [p[0] + (rng() - 0.5) * 2 * r, p[1] + (rng() - 0.5) * 2 * r];

  // --- Werte ---
  // Abwehr wie im Testduell: Block aus Erfahrung und Clutch, Passweg aus Vorlagen und Erfahrung, Zweikampf aus Form und Fairness
  function stanceVal(c, st) {
    const v = st === 'block' ? 0.6 * c.exp + 0.4 * c.clu : st === 'pass' ? 0.6 * c.ply + 0.4 * c.exp : 0.7 * c.frm + 0.3 * c.fai;
    return E.eff(v + (c.pos === 'DEF' ? 5 : 0), c);
  }
  const dribVal = c => E.eff(0.5 * c.frm + 0.5 * c.clu, c);
  const shotVal = c => E.eff(c.sco, c);
  const passVal = c => E.eff(c.ply, c);
  const strength = cards => cards.reduce((a, c) => a + E.eff(c.ovr, c), 0) / cards.length;

  // --- Lage auf dem Feld ---
  const atkSide = sc => (sc.type === 'att' ? 'you' : 'home');
  const P = (sc, id) => sc.pos[id];
  const players = (s, side) => s.teams[side].cards;
  function nearest(s, sc, side, p) { let b = null, d = Infinity; players(s, side).forEach(c => { const x = dist(P(sc, c.id), p); if (x < d) { d = x; b = c; } }); return { c: b, d }; }
  // Schussqualität 0 bis 1 aus Distanz und Winkel; Blockgefahr aus dem nächsten Verteidiger
  function shotInfo(s, sc, id) {
    const side = atkSide(sc), X = card(s, side, id), p = P(sc, id), d = dist(p, GOAL);
    const q = clamp(1 - (d - 55) / 250, 0.12, 1) * clamp(1 - Math.abs(p[0] - 180) / 280, 0.5, 1);
    const n = nearest(s, sc, other(side), p), press = clamp(1 - n.d / 55, 0, 1);
    const block = clamp(press * s.cfg.blockBase * clamp(1 + (stanceVal(n.c, 'block') - shotVal(X)) * 0.02, 0.5, 1.5), 0, 0.7);
    return { q, block, by: n.c.id };
  }
  // Risiko, dass der Pass abgefangen wird: Gegner nahe der Passlinie, Länge des Passes, Vorlagen des Passgebers
  function passInfo(s, sc, from, to) {
    const side = atkSide(sc), a = P(sc, from), b = P(sc, to), X = card(s, side, from);
    let keep = 1, by = null, worst = 0;
    players(s, other(side)).forEach(d => {
      const r = clamp(1 - distSeg(P(sc, d.id), a, b) / s.cfg.laneRange, 0, 1) * clamp(s.cfg.intercept + (stanceVal(d, 'pass') - 88) * 0.015, 0.2, 0.95);
      keep *= 1 - r; if (r > worst) { worst = r; by = d.id; }
    });
    const risk = (1 - keep) * clamp(1.25 - (passVal(X) - 70) / 100, 0.6, 1.2) + Math.max(0, dist(a, b) - 160) / s.cfg.passLong;
    if (!by) by = nearest(s, sc, other(side), lerp(a, b, 0.5)).c.id;   // langer Pass ohne Gegner in der Linie: der nächste läuft ihn ab
    return { risk: clamp(risk, 0.03, 0.9), by };
  }
  function dribInfo(s, sc, id) {
    const side = atkSide(sc), X = card(s, side, id), M = card(s, other(side), sc.mark[id]);
    const space = (dist(P(sc, id), P(sc, M.id)) - 40) / 200;
    return { p: clamp(s.cfg.drib + (dribVal(X) - stanceVal(M, 'zwei')) * s.cfg.dribSlope + space, s.cfg.dribMin, s.cfg.dribMax), by: M.id, edge: dribVal(X) - stanceVal(M, 'zwei') };
  }

  // --- Szenen ---
  function makeScene(s, rng, type, counter) {
    const sc = { type, step: 0, max: counter ? s.cfg.counterSteps : s.cfg.maxSteps, counter: !!counter, pos: {}, mark: {}, carrier: null, intent: null };
    const as = type === 'att' ? 'you' : 'home', ds = other(as);
    const byRole = side => { const m = {}; players(s, side).forEach(c => { m[c.role] = c; }); return m; };
    const A = byRole(as), D = byRole(ds);
    ROLES.forEach(r => { sc.pos[A[r].id] = jit(rng, FORM[r], 16); });
    ROLES.forEach(r => {
      const a = A[r], d = D[MARKS[r]], pa = sc.pos[a.id];
      sc.mark[a.id] = d.id;
      const mp = lerp(pa, GOAL, 0.2 + rng() * 0.14), side = pa[0] < 170 ? 1 : pa[0] > 190 ? -1 : (rng() < 0.5 ? -1 : 1);
      sc.pos[d.id] = jit(rng, [mp[0] + side * 20, mp[1] - 6], 5);   // leicht zur Mitte versetzt, damit sich die Namen nicht überdecken
    });
    if (counter) {
      // Konter: drei Gegenspieler sind noch hinten, der Ballführende startet weiter vorne
      ROLES.slice(2).forEach(r => { const d = D[MARKS[r]]; sc.pos[d.id] = [sc.pos[d.id][0], 360 + rng() * 25]; });
      sc.carrier = counter;
      sc.pos[counter] = jit(rng, [180, 200], 30);
    } else sc.carrier = A[sample({ C: 0.3, LW: 0.2, RW: 0.2, LD: 0.15, RD: 0.15 }, rng)].id;
    s.cur = sc;
    if (type === 'def') aiIntent(s, rng);
    s.phase = 'decide';
  }
  // Plan des Gegners in der Abwehrszene, verdeckt. Er schiesst eher aus guter Position, passt eher zu freien Mitspielern.
  function aiIntent(s, rng) {
    const sc = s.cur, X = card(s, 'home', sc.carrier), sh = shotInfo(s, sc, sc.carrier), w = {};
    if (sc.step >= sc.max - 1) { sc.intent = { kind: 'shoot' }; return; }
    w.shoot = sh.q * sh.q * (shotVal(X) / 90) * 1.6 * (1 - sh.block) + sc.step * 0.15;
    let bestTo = null, bestV = 0;
    players(s, 'home').forEach(c => { if (c.id === sc.carrier) return; const v = (1 - passInfo(s, sc, sc.carrier, c.id).risk) * shotInfo(s, sc, c.id).q; if (v > bestV) { bestV = v; bestTo = c.id; } });
    w.pass = bestV * 0.9;
    w.dribble = dribInfo(s, sc, sc.carrier).p * 0.45;
    const kind = sample(w, rng);
    sc.intent = kind === 'pass' ? { kind, to: bestTo } : { kind };
  }

  // --- Schuss auf das Tor ---
  const zoneOf = (x, y) => (y >= 0.5 ? 't' : 'b') + (x < -0.34 ? 'l' : x > 0.34 ? 'r' : 'm');
  const COL = { l: 0, m: 1, r: 2 };
  const adjacent = (a, b) => (a[1] === b[1] && a[0] !== b[0]) || (a[0] === b[0] && Math.abs(COL[a[1]] - COL[b[1]]) === 1);
  function spread(s, X, power, q) { const c = s.cfg; return c.sdBase + c.sdSkill * clamp((99 - shotVal(X)) / 27, 0, 1) + c.sdPow * power + c.sdDist * (1 - q); }
  function keeperWeights(s) {
    const last = s.hist.aims.slice(-s.cfg.keeperMemory), n = last.length || 1, w = { tl: 0.9, tm: 0.5, tr: 0.9, bl: 1, bm: 0.7, br: 1 };
    ZONES.forEach(z => { w[z] += 2 * last.filter(x => x === z).length / n; });
    return w;
  }
  function favZone(id) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return ['tl', 'br', 'tr', 'bl', 'bm'][h % 5]; }
  // Bereitet einen Schuss vor. Die verdeckte Wahl der KI steht fest, bevor der User wischt.
  function setShot(s, rng, side, x, q, ctx) {
    const sh = { side, x, q, ctx };
    if (side === 'home') {
      const w = {}; ZONES.forEach(z => { w[z] = 0.11; }); w[favZone(x)] = 0.45;
      const z = sample(w, rng), c = ZC[z];
      sh.ai = { target: [c[0] + (rng() - 0.5) * 0.24, c[1] + (rng() - 0.5) * 0.2], power: 0.45 + rng() * 0.5 };
      const others = ['l', 'm', 'r'].filter(k => k !== z[1]);
      sh.tell = rng() < s.cfg.tellTrue ? z[1] : others[Math.floor(rng() * 2)];
    } else sh.ai = { guess: sample(keeperWeights(s), rng) };
    s.shot = sh; s.phase = 'aim';
  }
  function resolveShot(s, rng, sh, target, power, guess) {
    const c = s.cfg, X = card(s, sh.side, sh.x), sd = spread(s, X, power, sh.q);
    const land = [target[0] + gauss(rng) * sd, Math.max(0.03, target[1] + gauss(rng) * sd * 0.8)];
    const ax = Math.abs(land[0]), lz = zoneOf(clamp(land[0], -0.99, 0.99), Math.min(0.99, land[1]));
    const base = { land, zone: lz, guess, right: lz === guess, near: adjacent(lz, guess), power, target };
    if (ax >= 1 || land[1] >= 1) {
      const post = (ax >= 1 && ax < 1 + c.post && land[1] < 1 + c.post) || (land[1] >= 1 && land[1] < 1 + c.post && ax < 1 + c.post);
      return Object.assign(base, { result: 'miss', miss: post ? 'post' : land[1] >= 1 ? 'high' : 'wide' });
    }
    const d = shotVal(X) - s.teams[other(sh.side)].goalie.val, edge = ax > 0.8 || land[1] > 0.85 ? c.saveEdge : 0;
    let ps = lz === guess ? c.saveSame - power * c.savePow - d * c.saveSco - edge : adjacent(lz, guess) ? c.saveAdj - power * 0.3 - d * 0.01 - edge : 0;
    if (ax < 0.3 && land[1] < 0.6) ps = Math.max(ps, c.saveBody - power * 0.2 - d * 0.01);
    ps += c.saveDist * (1 - sh.q);
    if (sh.ctx === 'counter') ps -= 0.1;
    ps = clamp(ps, 0, 0.95);
    if (rng() < ps) return Object.assign(base, { result: power < 0.5 && lz === guess ? 'catch' : 'save' });
    return Object.assign(base, { result: 'goal' });
  }

  // --- Ablauf ---
  /* setup: { homeName, cfg, you: { goalie, cards }, home: { goalie, cards } }. Je 5 Karten, 2 Verteidiger und 3 Stürmer. */
  function lineup(cards) {
    const byOvr = (x, y) => y.ovr - x.ovr, def = cards.filter(c => c.pos === 'DEF').sort(byOvr).slice(0, 2), att = cards.filter(c => c.pos !== 'DEF').sort(byOvr).slice(0, 3);
    while (def.length < 2) def.push(att.pop());
    const r = ['LD', 'RD'], a = ['C', 'LW', 'RW'];
    return def.map((c, i) => Object.assign({}, c, { role: r[i] })).concat(att.map((c, i) => Object.assign({}, c, { role: a[i] })));
  }
  function newMatch(setup, rng) {
    const cfg = setup.cfg || CFG;
    const s = {
      cfg, homeName: setup.homeName || '', teams: { you: { goalie: Object.assign({}, setup.you.goalie), cards: lineup(setup.you.cards) }, home: { goalie: Object.assign({}, setup.home.goalie), cards: lineup(setup.home.cards) } },
      scene: 0, score: { you: 0, home: 0 }, plan: [], cur: null, shot: null, phase: 'decide', pen: null, outcome: null, results: [],
      hist: { aims: [], homeShots: {} },
      stats: { att: 0, def: 0, shots: 0, goals: 0, faced: 0, saved: 0, passes: 0, passOk: 0, dribbles: 0, dribOk: 0, stops: 0, counters: 0 }
    };
    // Szenenplan: Anteil deiner Angriffe nach Teamstärke, gleichmässig gemischt
    const pa = clamp(cfg.attBase + (strength(s.teams.you.cards) - strength(s.teams.home.cards)) * cfg.attSlope, cfg.attMin, cfg.attMax);
    s.attShare = pa;
    let att = Math.round(pa * cfg.scenes); const plan = [];
    for (let i = 0; i < cfg.scenes; i++) { const left = cfg.scenes - i, want = att / left; const t = rng() < want ? 'att' : 'def'; if (t === 'att') att--; plan.push(t); }
    s.plan = plan;
    startScene(s, rng);
    return s;
  }
  function startScene(s, rng) {
    const t = s.plan[s.scene];
    s.minute = Math.floor(s.scene / s.cfg.perPeriod) * 20 + 2 + (s.scene % s.cfg.perPeriod) * 5 + Math.floor(rng() * 4);
    if (t === 'att') s.stats.att++; else s.stats.def++;
    makeScene(s, rng, t);
  }
  function endScene(s, ev, why) {
    const goal = s.cur.goal || null;
    s.results[s.scene] = { type: s.plan[s.scene], goal };
    ev.push({ t: 'end', why, goal });
    s.cur.done = true; s.phase = 'done';
  }
  // Ballverlust: der Gegner kann kontern. Konter gegen dich enden in einem Schuss auf dein Tor.
  function lost(s, rng, ev, by) {
    const sc = s.cur, side = atkSide(sc), winner = other(side);
    const pc = winner === 'you' ? s.cfg.counterWin : s.cfg.counterLoss;
    if (rng() < pc) {
      s.stats.counters += winner === 'you' ? 1 : 0;
      ev.push({ t: 'counter', side: winner, x: by });
      if (winner === 'you') { makeScene(s, rng, 'att', by); return; }
      setShot(s, rng, 'home', by, 0.6, 'counter'); return;
    }
    endScene(s, ev, 'lost');
  }
  function attAction(s, rng, ev, a) {
    const sc = s.cur, X = sc.carrier;
    if (a.type === 'shoot') {
      const sh = shotInfo(s, sc, X);
      ev.push({ t: 'shootStart', x: X, q: sh.q, block: sh.block });
      if (rng() < sh.block) { ev.push({ t: 'blocked', x: X, by: sh.by }); return lost(s, rng, ev, sh.by); }
      setShot(s, rng, 'you', X, sh.q, sc.counter ? 'counter' : 'attack'); return;
    }
    if (sc.step >= sc.max - 1) return false;      // letzte Aktion der Szene: nur noch Schuss
    if (a.type === 'pass') {
      if (!card(s, 'you', a.to) || a.to === X) return false;
      const pi = passInfo(s, sc, X, a.to), ok = rng() >= pi.risk;
      s.stats.passes++;
      ev.push({ t: 'pass', from: X, to: a.to, ok, risk: pi.risk, by: pi.by });
      if (!ok) { sc.pos[pi.by] = lerp(P(sc, X), P(sc, a.to), 0.5); return lost(s, rng, ev, pi.by); }
      s.stats.passOk++;
      // Der Empfänger hat kurz Luft: sein Gegenspieler kommt einen Schritt zu spät
      const m = sc.mark[a.to]; sc.pos[m] = lerp(P(sc, m), lerp(P(sc, a.to), GOAL, 0.15), 0.4);
      sc.carrier = a.to; sc.step++; return;
    }
    if (a.type === 'dribble') {
      const di = dribInfo(s, sc, X), ok = rng() < di.p;
      s.stats.dribbles++;
      ev.push({ t: 'dribble', x: X, by: di.by, ok, p: di.p });
      if (!ok) return lost(s, rng, ev, di.by);
      s.stats.dribOk++;
      const p = P(sc, X), to = lerp(p, GOAL, clamp(70 / dist(p, GOAL), 0.2, 0.55));
      sc.pos[X] = [to[0] + (p[0] < 180 ? 14 : -14), Math.max(80, to[1])];
      sc.pos[di.by] = [P(sc, di.by)[0], P(sc, di.by)[1] + 46];   // Gegenspieler ausgespielt, steht hinter ihm
      sc.step++; return;
    }
    return false;
  }
  function defAction(s, rng, ev, a) {
    const sc = s.cur, X = card(s, 'home', sc.carrier), it = sc.intent;
    if (['press', 'block', 'lane'].indexOf(a.action) === -1) return false;
    if (a.action === 'lane' && !card(s, 'home', a.target)) return false;
    const atkV = it.kind === 'shoot' ? shotVal(X) : it.kind === 'pass' ? passVal(X) : dribVal(X);
    let D, right;
    if (a.action === 'press') { D = nearest(s, sc, 'you', P(sc, X.id)).c; right = it.kind === 'dribble'; }
    else if (a.action === 'block') { let b = null, bd = Infinity; players(s, 'you').forEach(c => { const d = distSeg(P(sc, c.id), P(sc, X.id), GOAL); if (d < bd) { bd = d; b = c; } }); D = b; right = it.kind === 'shoot'; }
    else { D = card(s, 'you', sc.mark[a.target]) || nearest(s, sc, 'you', P(sc, a.target)).c; right = it.kind === 'pass' && it.to === a.target; }
    const val = stanceVal(D, a.action === 'press' ? 'zwei' : a.action === 'block' ? 'block' : 'pass'), c = s.cfg;
    let stop;
    if (right) stop = clamp(c.stopRight + (val - atkV) * c.stopSlope, c.stopMin, c.stopMax);
    else if (it.kind === 'pass') stop = Math.max(passInfo(s, sc, X.id, it.to).risk * 0.8, a.action === 'press' ? c.stopHalf : 0.1);
    else stop = (a.action === 'press' && it.kind === 'shoot') || (a.action === 'block' && it.kind === 'dribble') ? c.stopHalf : 0.1;
    const ok = rng() < stop;
    ev.push({ t: 'defend', action: a.action, target: a.target || null, intent: it, by: D.id, x: X.id, right, stopped: ok, p: stop });
    if (ok) {
      s.stats.stops++;
      // Ballgewinn: manchmal wird daraus ein Konter für dich
      if (rng() < c.counterWin) { s.stats.counters++; ev.push({ t: 'counter', side: 'you', x: D.id }); makeScene(s, rng, 'att', D.id); return; }
      return endScene(s, ev, 'stopped');
    }
    if (it.kind === 'shoot') { setShot(s, rng, 'home', X.id, shotInfo(s, sc, X.id).q, 'attack'); return; }
    if (it.kind === 'pass') { const m = sc.mark[it.to]; sc.pos[m] = lerp(P(sc, m), P(sc, it.to), 0.3); sc.carrier = it.to; }
    else { const p = P(sc, X.id), to = lerp(p, GOAL, clamp(70 / dist(p, GOAL), 0.2, 0.55)); sc.pos[X.id] = [to[0], Math.max(80, to[1])]; sc.pos[D.id] = [P(sc, D.id)[0], P(sc, D.id)[1] + 40]; }
    sc.step++;
    aiIntent(s, rng);
  }
  function shoot(s, rng, ev, a) {
    const sh = s.shot; let target, power, guess;
    if (sh.side === 'you') {
      if (!a.target || !isFinite(a.target[0]) || !isFinite(a.target[1])) return false;
      target = [clamp(+a.target[0], -1.5, 1.5), clamp(+a.target[1], 0, 1.5)]; power = clamp(+a.power || 0, 0, 1); guess = sh.ai.guess;
      s.hist.aims.push(zoneOf(clamp(target[0], -0.99, 0.99), clamp(target[1], 0, 0.99)));
    } else {
      if (ZONES.indexOf(a.zone) === -1) return false;
      target = sh.ai.target; power = sh.ai.power; guess = a.zone;
    }
    const r = resolveShot(s, rng, sh, target, power, guess), goal = r.result === 'goal';
    if (sh.side === 'home') (s.hist.homeShots[sh.x] = s.hist.homeShots[sh.x] || []).push(r.zone);
    if (sh.side === 'you') { s.stats.shots++; if (goal) s.stats.goals++; } else { s.stats.faced++; if (!goal) s.stats.saved++; }
    ev.push(Object.assign({ t: 'shot', side: sh.side, x: sh.x, ctx: sh.ctx, q: sh.q, tell: sh.tell || null }, r));
    s.shot = null;
    if (sh.ctx === 'so') { const P_ = s.pen; if (goal) P_[sh.side]++; P_.shots[sh.side]++; P_.results.push({ side: sh.side, goal }); s.phase = 'done'; return; }
    if (goal) { s.score[sh.side]++; s.cur.goal = sh.side; }
    endScene(s, ev, goal ? 'goal' : r.result);
  }
  // Penaltyschiessen bei Unentschieden: je drei Schüsse, dann sudden death. Du beginnst.
  function penShot(s, rng) {
    const P_ = s.pen, side = P_.shots.you <= P_.shots.home ? 'you' : 'home', order = s.teams[side].cards.slice().sort((a, b) => shotVal(b) - shotVal(a));
    setShot(s, rng, side, order[P_.shots[side] % order.length].id, 0.8, 'so');
  }
  function penOver(P_) {
    const a = P_.shots.you, b = P_.shots.home;
    if (a <= 3 && b <= 3) return P_.you > P_.home + (3 - b) || P_.home > P_.you + (3 - a);
    return a === b && P_.you !== P_.home;
  }
  function next(s, rng) {
    if (s.pen) { if (penOver(s.pen)) finish(s); else penShot(s, rng); return; }
    s.scene++;
    if (s.scene >= s.cfg.scenes) {
      if (s.score.you === s.score.home) { s.pen = { you: 0, home: 0, shots: { you: 0, home: 0 }, results: [] }; s.cur = null; penShot(s, rng); }
      else finish(s);
      return;
    }
    startScene(s, rng);
  }
  function finish(s) { s.outcome = s.pen ? (s.pen.you > s.pen.home ? 'penwin' : 'penloss') : (s.score.you > s.score.home ? 'win' : 'loss'); s.phase = 'end'; }

  /* Einziger Einstieg für Eingaben. Gibt einen neuen Zustand und die Ereignisse zurück, der alte bleibt unverändert.
     Angriff:  { type: 'shoot' } | { type: 'pass', to } | { type: 'dribble' }
     Abwehr:   { type: 'defend', action: 'press' | 'block' | 'lane', target }   target: Gegner, dessen Passweg du zustellst
     Schuss:   { type: 'aim', target: [x, y], power } eigener Schuss | { type: 'aim', zone } Sprung deines Goalies
     Weiter:   { type: 'next' } */
  function act(state, a, rng) {
    const s = copy(state), ev = [];
    let ok = true;
    if (s.phase === 'decide' && s.cur.type === 'att' && ['shoot', 'pass', 'dribble'].indexOf(a.type) !== -1) ok = attAction(s, rng, ev, a) !== false;
    else if (s.phase === 'decide' && s.cur.type === 'def' && a.type === 'defend') ok = defAction(s, rng, ev, a) !== false;
    else if (s.phase === 'aim' && a.type === 'aim') ok = shoot(s, rng, ev, a) !== false;
    else if (s.phase === 'done' && a.type === 'next') next(s, rng);
    else ok = false;
    return ok ? { state: s, events: ev, ok: true } : { state, events: [], ok: false };
  }

  root.HKMatch = { CFG, GOAL, ROLES, ZONES, ZC, zoneOf, newMatch, act, card, shotInfo, passInfo, dribInfo, stanceVal, dribVal, shotVal, passVal, strength, spread, keeperWeights, favZone, penOver, atkSide, other, nearest, dist };
})(typeof window !== 'undefined' ? window : globalThis);
