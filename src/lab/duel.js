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

  const CFG = {
    duels: 8, goalie: 88,
    // Stufe 1 hängt vom Matchup ab: Wert des Angreifers im gewählten Zug gegen den Wert des Verteidigers in der Abwehr, die diesen Zug stoppt.
    open: 0.88, openSlope: 0.02, openMin: 0.60, openMax: 0.98,      // nicht gelesen: kommt meist vorbei, gegen einen Spezialisten seltener
    read: 0.28, readSlope: 0.03, readMin: 0.08, readMax: 0.60,      // gelesen: kommt selten vorbei, mit klarem Vorteil öfter
    // Schuss: Der Abschluss des Schützen zählt in allen drei Fällen, gemessen am Goalie (88).
    miss: 0.22, missSlope: 0.012, missMin: 0.03, missMax: 0.30,     // Ecke verfehlt. Die Mitte geht immer aufs Tor
    wrong: 0.82, wrongSlope: 0.015, wrongMin: 0.55, wrongMax: 0.97, // Goalie in der falschen Ecke: Tor, ausser der Schuss ist zu schwach
    beat: 0.25, beatMid: 0.12, beatSlope: 0.025, beatMin: 0.05, beatMax: 0.60,   // Goalie in der richtigen Ecke, trotzdem Tor
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
  function missChance(s, X, target) { const c = s.cfg; return target === 'm' ? 0 : clamp(c.miss - (E.eff(X.sco, X) - 75) * c.missSlope, c.missMin, c.missMax); }
  function wrongChance(s, side, X, ctx) {
    const c = s.cfg, d = E.eff(X.sco, X) - s.teams[other(side)].goalie.val;
    return Math.min(0.99, clamp(c.wrong + d * c.wrongSlope, c.wrongMin, c.wrongMax) + (ctx === 'counter' ? c.counterBonus : 0));
  }
  function beatChance(s, side, X, target, ctx) {
    const c = s.cfg, d = E.eff(X.sco, X) - s.teams[other(side)].goalie.val;
    let p = clamp((target === 'm' ? c.beatMid : c.beat) + d * c.beatSlope, c.beatMin, c.beatMax);
    if (ctx === 'counter') p += c.counterBonus;
    return p;
  }
  function resolveShot(s, rng, side, X, target, guess, ctx) {
    const miss = missChance(s, X, target);
    if (rng() < miss) return { result: 'miss', miss: ['wide', 'post', 'high'][Math.floor(rng() * 3)], right: target === guess, p: 0 };
    if (target !== guess) {
      const w = wrongChance(s, side, X, ctx);
      // Goalie falsch, aber der Schuss ist zu schwach: Er kommt noch hin.
      return rng() < w ? { result: 'goal', right: false, p: (1 - miss) * w } : { result: 'save', right: false, late: true, p: (1 - miss) * w };
    }
    const beat = beatChance(s, side, X, target, ctx);
    if (rng() < beat) return { result: 'goal', right: true, p: (1 - miss) * beat };
    return { result: rng() < 0.4 ? 'catch' : 'save', right: true, p: (1 - miss) * beat };
  }

  // --- KI der Halle ---
  // Liest deinen Zug: was deine Karte gut kann und was du zuletzt oft gespielt hast.
  function readWeights(s, A, D) {
    const c = s.cfg, t = E.tendency(A), last = s.hist.moves.slice(-4), n = last.length || 1, w = {};
    E.MOVES.forEach(m => { w[m.id] = c.aiCard * t[m.id] + c.aiHabit * last.filter(x => x === m.id).length / n + c.aiFloor + c.aiOwn * Math.max(0, stanceVal(D, STOPPER[m.id]) - 80); });
    return w;
  }
  // Goalie der Halle: springt eher dorthin, wo du zuletzt hingeschossen hast.
  function keeperWeights(s) {
    const last = s.hist.aims.slice(-s.cfg.keeperMemory), n = last.length || 1, w = {};
    CORNERS.forEach(k => { w[k] = 1 + 1.5 * last.filter(x => x === k).length / n; });
    return w;
  }
  // Jeder Schütze der Halle hat eine Lieblingsecke, die er in der Hälfte der Schüsse wählt.
  function favCorner(id) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return ['l', 'r', 'l', 'r', 'm'][h % 5]; }
  function shotWeights(id) { const w = { l: 0.25, m: 0.25, r: 0.25 }; w[favCorner(id)] = 0.5; return w; }
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
  function setShot(s, rng, side, x, ctx) {
    s.cur.shot = { side, x, ctx, ai: side === 'home' ? sample(shotWeights(x), rng) : sample(keeperWeights(s), rng) };
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
  function shoot(s, rng, ev, corner) {
    if (CORNERS.indexOf(corner) === -1) return false;
    const sh = s.cur.shot, side = sh.side, X = card(s, side, sh.x), st = s.stats;
    const target = side === 'you' ? corner : sh.ai, guess = side === 'you' ? sh.ai : corner;
    if (side === 'you') s.hist.aims.push(corner); else (s.hist.homeShots[X.id] = s.hist.homeShots[X.id] || []).push(target);
    const r = resolveShot(s, rng, side, X, target, guess, sh.ctx), goal = r.result === 'goal';
    if (side === 'you') { st.shots++; if (goal) st.goals++; } else { st.faced++; if (!goal) st.saved++; if (r.right) st.diveRight++; }
    ev.push(Object.assign({ t: 'shot', side, x: X.id, ctx: sh.ctx, target, guess }, r));
    s.cur.shot = null;
    if (sh.ctx === 'so') {
      const P = s.pen; if (goal) P[side]++; P.shots[side]++; P.results.push({ side, goal });
      s.log.push({ so: true, side, x: X.id, target, guess, result: r.result });
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
     { type: 'aim', corner }          Ecke 'l', 'm' oder 'r': beim eigenen Schuss das Ziel, beim fremden der Sprung deines Goalies
     { type: 'next' }                 nächstes Duell, nächster Penalty oder Schluss */
  function act(state, a, rng) {
    const s = copy(state), ev = [];
    let ok = false;
    if (a.type === 'play' && s.phase === 'pick') ok = play(s, rng, ev, a.card, a.option);
    else if (a.type === 'aim' && s.phase === 'aim') ok = shoot(s, rng, ev, a.corner);
    else if (a.type === 'next' && s.phase === 'done') { next(s, rng); ok = true; }
    return ok ? { state: s, events: ev, ok: true } : { state, events: [], ok: false };
  }

  root.HKDuel = { STOPPER, stanceVal, matchup, CFG, CORNERS, newMatch, act, card, usable, through, missChance, wrongChance, beatChance, readWeights, keeperWeights, shotWeights, favCorner, penOver, other };
})(typeof window !== 'undefined' ? window : globalThis);
