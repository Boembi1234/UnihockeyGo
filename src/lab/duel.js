/* Duell, Testversion (Mockup unter /lab/). Damit lässt sich das neue Duell anfühlen, bevor das ganze Match umgebaut wird.
   Ein Duell in drei Schritten, alle vom User gesteuert:
   1. Karte und Spielzug wählen (in der Abwehr: Karte und Abwehr). Beide Wahlen werden gleichzeitig aufgedeckt.
   2. Gelesen oder vorbei: Liest der Verteidiger den Zug, stoppt er ihn meistens. Ein Ballgewinn kann zum Konter führen.
   3. Schuss: Der Schütze wählt die Ecke, der Goalie rät. In der Abwehr springt der User mit seinem Goalie.
   Weggelassen gegenüber dem Prototyp: Fouls, Strafen, Taktiken, Momentum, Captain. Unentschieden heisst Penaltyschiessen.
   Reine Funktionen: Zustand rein, Ergebnis raus, Zufall nur aus rng. Karten und Grundwerte kommen aus HK. */
(function (root) {
  'use strict';
  const E = root.HK, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), other = s => (s === 'you' ? 'home' : 'you');
  const CORNERS = ['l', 'm', 'r'];
  const ZONES = ['tl', 'tm', 'tr', 'bl', 'bm', 'br'];

  const CFG = {
    duels: 8, goalie: 88,
    // Stufe 1 hängt vom Matchup ab: Wert des Angreifers im gewählten Zug gegen den Wert des Verteidigers in der Abwehr, die diesen Zug stoppt.
    open: 0.88, openSlope: 0.02, openMin: 0.60, openMax: 0.98,      // nicht gelesen: kommt meist vorbei, gegen einen Spezialisten seltener
    read: 0.28, readSlope: 0.03, readMin: 0.08, readMax: 0.60,      // gelesen: kommt selten vorbei, mit klarem Vorteil öfter
    /* Schuss: Zielpunkt im Tor (x -1 bis 1 zwischen den Pfosten, y 0 bis 1 vom Boden zur Latte) und Härte 0 bis 1.
       Der Schuss streut, je schwächer der Abschluss und je härter geschossen wird. Der Goalie springt in eine von sechs Zonen. */
    sdBase: 0.05, sdSkill: 0.17, sdPow: 0.11,                       // Streuung: Grundwert, schwacher Abschluss, Härte
    post: 0.07,                                                      // so knapp neben dem Pfosten oder über der Latte gilt als Pfosten
    saveSame: 0.92, saveAdj: 0.50, savePow: 0.35, saveSco: 0.012, saveEdge: 0.15, saveBody: 0.45,   // Goalie in der richtigen oder Nachbarzone
    tellTrue: 0.65,                                                  // so oft verrät der Blick des Schützen die richtige Seite
    counter: { block: 0.15, pass: 0.40, zwei: 0.65 }, counterBonus: 0.10,
    cost: 30, costSolo: 36, costDef: 26, counterCost: 6, recover: 8, minStam: 20,
    aiCard: 0.6, aiHabit: 0.8, aiFloor: 0.15, aiOwn: 0.015,   // so liest die Halle deinen Zug: Stärke deiner Karte, deine letzten vier Züge, ihre Lieblingsabwehr
    keeperMemory: 6                              // so viele deiner Schüsse merkt sich der Goalie der Halle
  };

  const byId = (list, id) => { for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; };
  const card = (s, side, id) => byId(s.teams[side].cards, id);
  function usable(s, side) { const c = s.teams[side].cards, p = c.filter(x => x.stam >= s.cfg.minStam); return p.length ? p : c.slice(); }
  function sample(w, rng) {
    const k = Object.keys(w); let r = rng() * k.reduce((a, x) => a + w[x], 0);
    for (let i = 0; i < k.length; i++) { r -= w[k[i]]; if (r <= 0) return k[i]; }
    return k[k.length - 1];
  }
  function best(list, fn) { let top = null, sc = -Infinity; list.forEach(c => { const v = fn(c); if (v > sc) { sc = v; top = c; } }); return top; }
  const copy = s => JSON.parse(JSON.stringify(s));

  // --- Matchup ---
  const STOPPER = { direkt: 'block', kombi: 'pass', solo: 'zwei' };
  // Abwehrwert pro Abwehr: Block aus Erfahrung und Clutch, Passweg aus Spielverständnis (Vorlagen) und Erfahrung, Zweikampf aus Form und Fairness.
  function stanceVal(c, st) {
    const v = st === 'block' ? 0.6 * c.exp + 0.4 * c.clu : st === 'pass' ? 0.6 * c.ply + 0.4 * c.exp : 0.7 * c.frm + 0.3 * c.fai;
    return v + (c.pos === 'DEF' ? 5 : 0);
  }
  // Positiv: Vorteil für den Angreifer in diesem Zug gegen diesen Verteidiger.
  const matchup = (A, mvId, D) => E.eff(E.move(mvId).val(A), A) - E.eff(stanceVal(D, STOPPER[mvId]), D);

  // --- Wahrscheinlichkeiten ---
  function through(s, A, mv, D, read) {
    const c = s.cfg, diff = matchup(A, mv.id, D);
    return read ? clamp(c.read + diff * c.readSlope, c.readMin, c.readMax) : clamp(c.open + diff * c.openSlope, c.openMin, c.openMax);
  }
  const zoneOf = (x, y) => (y >= 0.5 ? 't' : 'b') + (x < -0.34 ? 'l' : x > 0.34 ? 'r' : 'm');
  const ZC = { tl: [-0.62, 0.72], tm: [0, 0.75], tr: [0.62, 0.72], bl: [-0.62, 0.25], bm: [0, 0.2], br: [0.62, 0.25] };
  const COL = { l: 0, m: 1, r: 2 };
  function adjacent(a, b) { const dc = Math.abs(COL[a[1]] - COL[b[1]]); return (a[1] === b[1] && a[0] !== b[0]) || (a[0] === b[0] && dc === 1); }
  function gauss(rng) { let u = 0; while (!u) u = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); }
  // Streuung in Torbreiten: Abschluss 99 und weich geschossen trifft fast genau, Abschluss 72 und hart streut weit.
  function spread(s, X, power) { const c = s.cfg; return c.sdBase + c.sdSkill * clamp((99 - E.eff(X.sco, X)) / 27, 0, 1) + c.sdPow * power; }
  // Wahrscheinlichkeit, dass der Goalie einen Ball hält, der in der Zone lz ankommt, wenn er in gz gesprungen ist.
  function saveChance(s, side, X, land, lz, gz, power, ctx) {
    const c = s.cfg, d = E.eff(X.sco, X) - s.teams[other(side)].goalie.val, edge = Math.abs(land[0]) > 0.8 || land[1] > 0.85 ? c.saveEdge : 0;
    let p = lz === gz ? c.saveSame - power * c.savePow - d * c.saveSco - edge : adjacent(lz, gz) ? c.saveAdj - power * 0.3 - d * 0.01 - edge : 0;
    // Mitten auf den Körper: Der Goalie hält oft, auch wenn er in eine andere Zone wollte
    if (Math.abs(land[0]) < 0.3 && land[1] < 0.6) p = Math.max(p, c.saveBody - power * 0.2 - d * 0.01);
    if (ctx === 'counter') p -= c.counterBonus;
    return clamp(p, 0, 0.95);
  }
  function resolveShot(s, rng, side, X, target, power, guess, ctx) {
    const c = s.cfg, sd = spread(s, X, power);
    const land = [target[0] + gauss(rng) * sd, Math.max(0.03, target[1] + gauss(rng) * sd * 0.8)];
    const ax = Math.abs(land[0]), lz = zoneOf(Math.max(-0.99, Math.min(0.99, land[0])), Math.min(0.99, land[1]));
    const base = { land, zone: lz, guess, right: lz === guess, near: adjacent(lz, guess), power, sd };
    if (ax >= 1 || land[1] >= 1) {
      const post = (ax >= 1 && ax < 1 + c.post && land[1] < 1 + c.post) || (land[1] >= 1 && land[1] < 1 + c.post && ax < 1 + c.post);
      return Object.assign(base, { result: 'miss', miss: post ? 'post' : land[1] >= 1 ? 'high' : 'wide', p: 0 });
    }
    const ps = saveChance(s, side, X, land, lz, guess, power, ctx);
    if (rng() < ps) return Object.assign(base, { result: power < 0.5 && lz === guess ? 'catch' : 'save', p: 1 - ps });
    return Object.assign(base, { result: 'goal', p: 1 - ps });
  }

  // --- KI der Halle ---
  // Liest deinen Zug: was deine Karte gut kann und was du zuletzt oft gespielt hast.
  function readWeights(s, A, D) {
    const c = s.cfg, t = E.tendency(A), last = s.hist.moves.slice(-4), n = last.length || 1, w = {};
    E.MOVES.forEach(m => { w[m.id] = c.aiCard * t[m.id] + c.aiHabit * last.filter(x => x === m.id).length / n + c.aiFloor + c.aiOwn * Math.max(0, stanceVal(D, STOPPER[m.id]) - 80); });
    return w;
  }
  // Goalie der Halle: springt eher in die Zonen, in die du zuletzt gezielt hast. Unten und seitlich ist er ohnehin oft.
  function keeperWeights(s) {
    const last = s.hist.aims.slice(-s.cfg.keeperMemory), n = last.length || 1, w = { tl: 0.9, tm: 0.5, tr: 0.9, bl: 1, bm: 0.7, br: 1 };
    ZONES.forEach(z => { w[z] += 2 * last.filter(x => x === z).length / n; });
    return w;
  }
  // Jeder Schütze der Halle hat eine Lieblingszone, die er in knapp der Hälfte der Schüsse wählt.
  function favZone(id) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return ['tl', 'br', 'tr', 'bl', 'bm'][h % 5]; }
  function shotWeights(id) { const w = {}; ZONES.forEach(z => { w[z] = 0.11; }); w[favZone(id)] = 0.45; return w; }
  const aiAttacker = (s, rng) => best(usable(s, 'home'), c => 0.5 * E.eff(E.bestMove(c).val(c), c) + 0.5 * E.eff(c.sco, c) + rng() * 6 - 3);
  const aiDefender = (s, rng) => best(usable(s, 'home'), c => E.eff((stanceVal(c, 'block') + stanceVal(c, 'pass') + stanceVal(c, 'zwei')) / 3, c) + rng() * 6 - 3);

  // --- Ablauf ---
  /* setup: { homeName, cfg, you: { goalie, cards }, home: { goalie, cards } }. Karten werden kopiert und starten mit 100 Ausdauer. */
  function newMatch(setup, rng) {
    const team = t => ({ goalie: Object.assign({}, t.goalie), cards: t.cards.map(c => Object.assign({}, c, { stam: 100, box: 0 })) });
    const s = {
      cfg: setup.cfg || CFG, homeName: setup.homeName || '', teams: { you: team(setup.you), home: team(setup.home) },
      duel: 0, score: { you: 0, home: 0 }, results: [], log: [], cur: null, phase: 'pick', pen: null, outcome: null,
      hist: { moves: [], stances: [], aims: [], homeMoves: {}, homeShots: {} },
      stats: { att: 0, readYou: 0, def: 0, readThem: 0, shots: 0, goals: 0, faced: 0, saved: 0, diveRight: 0, counters: 0 }
    };
    beginDuel(s, rng);
    return s;
  }
  // Du greifst im ersten Duell an, danach wechseln die Seiten.
  function beginDuel(s, rng) {
    const side = s.duel % 2 === 0 ? 'you' : 'home';
    if (side === 'you') s.cur = { side, defender: aiDefender(s, rng).id };
    else { const a = aiAttacker(s, rng); s.cur = { side, attacker: a.id, move: sample(E.tendency(a), rng) }; }
    s.phase = 'pick';
  }
  // Die verdeckte Wahl der KI steht fest, bevor du tippst: Ecke ihres Schützen oder Ahnung ihres Goalies.
  /* Die verdeckte Wahl der KI steht fest, bevor du wischst. Schiesst die Halle, verrät ihr Schütze mit seinem Blick die Seite,
     aber nur in tellTrue der Fälle richtig. */
  function setShot(s, rng, side, x, ctx) {
    const sh = { side, x, ctx };
    if (side === 'home') {
      const z = sample(shotWeights(x), rng), c = ZC[z];
      sh.ai = { target: [c[0] + (rng() - 0.5) * 0.24, c[1] + (rng() - 0.5) * 0.2], power: 0.45 + rng() * 0.5 };
      const truth = z[1], others = ['l', 'm', 'r'].filter(k => k !== truth);
      sh.tell = rng() < s.cfg.tellTrue ? truth : others[Math.floor(rng() * 2)];
    } else sh.ai = { guess: sample(keeperWeights(s), rng) };
    s.cur.shot = sh;
    s.phase = 'aim';
  }
  function play(s, rng, ev, cardId, opt) {
    const cur = s.cur, side = cur.side, st0 = s.stats;
    let A, D, mv, st;
    if (side === 'you') {
      A = card(s, 'you', cardId); mv = E.move(opt); D = card(s, 'home', cur.defender);
      if (!A || !mv || usable(s, 'you').indexOf(A) === -1) return false;
      const guess = sample(readWeights(s, A, D), rng);
      st = E.STANCES.filter(x => x.stops === guess)[0];
      s.hist.moves.push(mv.id); s.hist.stances.push(st.id);
    } else {
      A = card(s, 'home', cur.attacker); D = card(s, 'you', cardId); st = E.stance(opt); mv = E.move(cur.move);
      if (!D || !st || usable(s, 'you').indexOf(D) === -1) return false;
      (s.hist.homeMoves[A.id] = s.hist.homeMoves[A.id] || []).push(mv.id);
    }
    const read = st.stops === mv.id, p = through(s, A, mv, D, read), ok = rng() < p;
    if (side === 'you') { st0.att++; if (read) st0.readYou++; } else { st0.def++; if (read) st0.readThem++; }
    Object.assign(cur, { attacker: A.id, defender: D.id, move: mv.id, stance: st.id, read, through: ok });
    ev.push({ t: 'reveal', side, a: A.id, d: D.id, move: mv.id, stance: st.id, read });
    ev.push({ t: 's1', side, a: A.id, d: D.id, move: mv.id, stance: st.id, read, p, ok });
    if (ok) { setShot(s, rng, side, A.id, 'attack'); return true; }
    const pc = s.cfg.counter[st.id];
    if (rng() < pc) { cur.counter = true; st0.counters++; ev.push({ t: 'counter', side: other(side), x: D.id, p: pc }); setShot(s, rng, other(side), D.id, 'counter'); return true; }
    endDuel(s);
    return true;
  }
  // Eigener Schuss: a.target [x, y] und a.power. Fremder Schuss: a.zone, in die dein Goalie springt.
  function shoot(s, rng, ev, a) {
    const sh = s.cur.shot, side = sh.side, X = card(s, side, sh.x), st = s.stats;
    let target, power, guess;
    if (side === 'you') {
      if (!a.target || !isFinite(a.target[0]) || !isFinite(a.target[1])) return false;
      target = [clamp(+a.target[0], -1.5, 1.5), clamp(+a.target[1], 0, 1.5)]; power = clamp(+a.power || 0, 0, 1); guess = sh.ai.guess;
      s.hist.aims.push(zoneOf(clamp(target[0], -0.99, 0.99), clamp(target[1], 0, 0.99)));
    } else {
      if (ZONES.indexOf(a.zone) === -1) return false;
      target = sh.ai.target; power = sh.ai.power; guess = a.zone;
    }
    const r = resolveShot(s, rng, side, X, target, power, guess, sh.ctx), goal = r.result === 'goal';
    if (side !== 'you') (s.hist.homeShots[X.id] = s.hist.homeShots[X.id] || []).push(r.zone);
    if (side === 'you') { st.shots++; if (goal) st.goals++; } else { st.faced++; if (!goal) st.saved++; if (r.right) st.diveRight++; }
    ev.push(Object.assign({ t: 'shot', side, x: X.id, ctx: sh.ctx, target, tell: sh.tell || null }, r));
    s.cur.shot = null;
    if (sh.ctx === 'so') {
      const P = s.pen; if (goal) P[side]++; P.shots[side]++; P.results.push({ side, goal });
      s.log.push({ so: true, side, x: X.id, zone: r.zone, guess, result: r.result });
      s.phase = 'done';
      return true;
    }
    if (goal) { s.score[side]++; s.cur.goal = side; }
    s.cur.shotResult = r.result;
    endDuel(s);
    return true;
  }
  function endDuel(s) {
    const c = s.cfg, cur = s.cur, side = cur.side, A = card(s, side, cur.attacker), D = card(s, other(side), cur.defender);
    A.stam = Math.max(0, A.stam - (cur.move === 'solo' ? c.costSolo : c.cost));
    D.stam = Math.max(0, D.stam - c.costDef - (cur.counter ? c.counterCost : 0));
    s.teams.you.cards.concat(s.teams.home.cards).forEach(x => { if (x !== A && x !== D) x.stam = Math.min(100, x.stam + c.recover); });
    s.results[s.duel] = { side, goal: cur.goal || null };
    s.log.push({ duel: s.duel, side, a: cur.attacker, d: cur.defender, move: cur.move, stance: cur.stance, read: cur.read, through: cur.through, counter: !!cur.counter, goal: cur.goal || null, shot: cur.shotResult || null });
    s.phase = 'done';
  }
  // --- Penaltyschiessen: je drei Schüsse, danach sudden death. Du beginnst. Schützen nach Abschluss und Clutch. ---
  function startPen(s, rng) {
    const order = side => s.teams[side].cards.slice().sort((a, b) => (b.sco + b.clu) - (a.sco + a.clu)).map(c => c.id);
    s.pen = { you: 0, home: 0, shots: { you: 0, home: 0 }, order: { you: order('you'), home: order('home') }, results: [] };
    penShot(s, rng);
  }
  function penShot(s, rng) {
    const P = s.pen, side = P.shots.you <= P.shots.home ? 'you' : 'home', o = P.order[side];
    s.cur = { side, pen: true };
    setShot(s, rng, side, o[P.shots[side] % o.length], 'so');
  }
  function penOver(P) {
    const a = P.shots.you, b = P.shots.home;
    if (a <= 3 && b <= 3) return P.you > P.home + (3 - b) || P.home > P.you + (3 - a);
    return a === b && P.you !== P.home;
  }
  function finish(s) {
    s.outcome = s.pen ? (s.pen.you > s.pen.home ? 'penwin' : 'penloss') : (s.score.you > s.score.home ? 'win' : 'loss');
    s.cur = null; s.phase = 'end';
  }
  function next(s, rng) {
    if (s.pen) { if (penOver(s.pen)) finish(s); else penShot(s, rng); return; }
    s.duel++;
    if (s.duel >= s.cfg.duels) { if (s.score.you === s.score.home) startPen(s, rng); else finish(s); return; }
    beginDuel(s, rng);
  }

  /* Einziger Einstieg für Eingaben. Gibt einen neuen Zustand und die Ereignisse zurück, der alte bleibt unverändert.
     { type: 'play', card, option }   Karte und Spielzug oder Abwehr
     { type: 'aim', target, power }   eigener Schuss: Zielpunkt [x, y] im Tor und Härte 0 bis 1
     { type: 'aim', zone }            fremder Schuss: Zone 'tl', 'tm', 'tr', 'bl', 'bm' oder 'br', in die dein Goalie springt
     { type: 'next' }                 nächstes Duell, nächster Penalty oder Schluss */
  function act(state, a, rng) {
    const s = copy(state), ev = [];
    let ok = false;
    if (a.type === 'play' && s.phase === 'pick') ok = play(s, rng, ev, a.card, a.option);
    else if (a.type === 'aim' && s.phase === 'aim') ok = shoot(s, rng, ev, a);
    else if (a.type === 'next' && s.phase === 'done') { next(s, rng); ok = true; }
    return ok ? { state: s, events: ev, ok: true } : { state, events: [], ok: false };
  }

  root.HKDuel = { STOPPER, stanceVal, matchup, CFG, CORNERS, ZONES, ZC, zoneOf, adjacent, spread, saveChance, newMatch, act, card, usable, through, readWeights, keeperWeights, shotWeights, favZone, penOver, other };
})(typeof window !== 'undefined' ? window : globalThis);
