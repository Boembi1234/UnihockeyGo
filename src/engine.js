/* Hallenkampf Engine
   Reine Funktionen: Zustand rein, Ergebnis raus. Kein DOM, kein Math.random.
   Der Zufall kommt aus einem Generator mit Seed (makeRng), der sich austauschen lässt.
   Die Simulation lädt genau diesen Block aus der HTML-Datei.

   Für die echte App wandern auf den Server (Supabase), weil sie über Sieg und Niederlage entscheiden:
   - makeRng und jeder Aufruf von rng(): der Zufall
   - newMatch, act und alles darunter: beginDuel, resolveDuel, shoot, counter, freeHit,
     resolveMatchPenalty, resolveShootout, endDuel, finish
   - aiAttacker, aiDefender, aiStance: die Wahl der Halle, heute im Zustand unter cur.move und cur.corner verdeckt
   - friendMoveWeights, friendTactics: entfallen, dort spielt ein Mensch. Seine verdeckten Wahlen gehen an den Server.
   - später aus der Oberfläche: Hallenstand und Schaden, Stationierung, Elo, Vereinswechsel, verdeckte Wahlen gegen Freunde
   Auf dem Gerät bleiben nur Anzeige und Vorschau: stage1, stage2, stage3, foulRisk, tendency. */
(function (root) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const other = side => side === 'you' ? 'home' : 'you';

  // mulberry32. Jede Funktion, die Zahlen in [0,1) liefert, kann sie ersetzen.
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Alle Stellschrauben an einem Ort. Kalibriert in Etappe 1; in Klammern der Startwert aus den Requirements, wo er abweicht.
  const CFG = {
    duels: 12,
    goalie: 88,            // Platzhalter-Goalie, gleicher Wert für alle Teams
    goalieRef: 88,         // Bezugswert für die Penalty-Formeln
    // Stufe 1: am Verteidiger vorbei. diff = Spielzug-Wert minus Abwehrwert, beide effektiv.
    s1Open: 0.80, s1OpenSlope: 0.04, s1OpenMin: 0.40, s1OpenMax: 0.97,   // nicht gelesen (0.90 fest)
    s1Read: 0.30, s1ReadSlope: 0.04, s1ReadMin: 0.10, s1ReadMax: 0.50,   // gelesen
    ppBonus: 0.15, pressing: 0.15, pull: 0.20,
    pullCounter: 1,        // Ohne Goalie: jeder Ballgewinn der Halle wird zum Konter aufs leere Tor
    // Stufe 2: aufs Tor
    s2Base: 0.80, s2Ref: 90, s2Slope: 0.01,                              // (0.75)
    // Stufe 3: Goalie geschlagen
    s3Base: 0.64, s3Slope: 0.012, momentum: 0.04, clutchSlope: 0.006,    // (0.60)
    // Konter
    counter: { block: 0.15, pass: 0.45, zwei: 0.75 }, counterCatch: 0.10, counterBonus: 0.10, counterCost: 6,
    // Fouls: (foulBase + (100 − Fairness) × foulFactor) × Foul-Faktor der Abwehr
    foulBase: 0.17, foulFactor: 0.011, foulMax: 0.6,                     // (0 und 0.02)
    twoMin: { block: 0.40, pass: 0.30, zwei: 0.55 }, penaltyShare: 0.12, boxDuels: 4,   // (Penalty 0.10)
    wall: 0.35, shortS2: 0.15, shortS3: 0.15,                            // (0.15, 0.05, 0.05)
    penGoalie: 0.006,
    aiFinish: 0.5,         // Gewicht des Abschlusses in der Angreiferwahl der Halle. 0 wäre die alte Wahl nur nach Spielzug-Wert.
    timeout: 30, recover: 7
  };

  // Werte: Herren L-UPL 2026/27 bis 13.11.2026, Entwurfsformel (Perzentil in der Liga auf 60 bis 99).
  function mk(id, first, last, short, pos, no, ovr, sco, ply, clu, fai, frm, exp) {
    return { id, first, last, short, pos, no, ovr, sco, ply, clu, fai, frm, exp, stam: 100, box: 0, home: false, cap: false };
  }
  const DATA = {
    user: { goalie: { val: CFG.goalie } },
    collection: [
      mk('steiner', 'Simon', 'Steiner', 'Tigers', 'ATT', 11, 94, 95, 93, 99, 80, 92, 98),
      mk('sjogren', 'Albin', 'Sjögren', 'Zug', 'ATT', 22, 93, 95, 99, 87, 99, 99, 74),
      mk('wilhelmsson', 'Johannes', 'Wilhelmsson', 'Uster', 'ATT', 82, 93, 97, 98, 87, 99, 95, 67),
      mk('kainulainen', 'Justus', 'Kainulainen', 'Zug', 'ATT', null, 92, 99, 96, 87, 80, 99, 62),
      mk('kovanen', 'Joonatan', 'Kovanen', 'Malans', 'ATT', null, 92, 97, 98, 94, 80, 98, 61),
      mk('mariotti', 'Pablo', 'Mariotti', 'Thurgau', 'ATT', 13, 92, 95, 98, 85, 63, 96, 87),
      mk('kauppinen', 'Pyry', 'Kauppinen', 'Kloten', 'ATT', 16, 87, 93, 80, 95, 99, 90, 64),
      mk('schwab', 'Simon', 'Schwab', 'Malans', 'DEF', null, 87, 89, 80, 87, 99, 92, 82),
      mk('larsson', 'Johan', 'Larsson', 'Kloten', 'DEF', 5, 85, 95, 94, 93, 70, 92, 75),
      mk('mettier', 'Tino', 'Mettier', 'Chur', 'DEF', 3, 81, 78, 60, 81, 99, 70, 95)
    ],
    halls: [
      { id: 'koeniz', name: 'Sporthallen Weissenstein', place: 'Bern', club: 'Floorball Köniz Bern', short: 'Köniz', dist: '40 m', near: true, x: 150, y: 96, goalie: { val: CFG.goalie }, guard: [
        mk('zaugg', 'Jan', 'Zaugg', 'Köniz', 'ATT', 61, 96, 99, 93, 96, 80, 98, 97),
        mk('jansson', 'Michael', 'Jansson', 'Köniz', 'ATT', null, 92, 97, 92, 98, 99, 96, 60),
        mk('hutzli', 'Stefan', 'Hutzli', 'Köniz', 'ATT', null, 88, 84, 93, 81, 99, 92, 93),
        mk('buehler', 'Nino', 'Bühler', 'Köniz', 'ATT', 24, 81, 72, 99, 60, 99, 97, 76),
        mk('ruh', 'Yann', 'Ruh', 'Köniz', 'DEF', 81, 93, 91, 96, 96, 80, 92, 98),
        mk('tringaniello', 'Leon', 'Tringaniello', 'Köniz', 'DEF', 7, 85, 72, 93, 60, 99, 82, 91)
      ] },
      { id: 'wiler', name: 'Sportanlage Grossmatt', place: 'Kirchberg BE', club: 'SV Wiler-Ersigen', short: 'Wiler', dist: '20 km', near: false, x: 268, y: 46, goalie: { val: CFG.goalie }, guard: [
        mk('kaenzig', 'Deny', 'Känzig', 'Wiler', 'ATT', 77, 95, 99, 86, 98, 99, 97, 97),
        mk('martinjas', 'Jamie', 'Martinjas', 'Wiler', 'ATT', 65, 90, 91, 95, 87, 67, 98, 83),
        mk('trekse', 'Pēteris', 'Trekše', 'Wiler', 'ATT', null, 90, 97, 94, 85, 99, 92, 60),
        mk('persson', 'Ludwig', 'Persson', 'Wiler', 'ATT', null, 88, 93, 86, 96, 80, 90, 63),
        mk('wyss', 'Yannis', 'Wyss', 'Wiler', 'DEF', 16, 95, 95, 95, 87, 99, 99, 92),
        mk('hollenstein', 'Andrin', 'Hollenstein', 'Wiler', 'DEF', 73, 84, 72, 80, 60, 99, 76, 99)
      ] },
      { id: 'gc', name: 'Sporthalle Hardau', place: 'Zürich', club: 'Grasshopper Club Zürich', short: 'GC', dist: '95 km', near: false, x: 338, y: 126, goalie: { val: CFG.goalie }, guard: [
        mk('riedi', 'Paolo', 'Riedi', 'GC', 'ATT', 21, 97, 98, 98, 94, 80, 99, 99),
        mk('bolin', 'Tommy', 'Bolin', 'GC', 'ATT', 30, 93, 98, 93, 99, 80, 97, 68),
        mk('freiburghaus', 'Miro', 'Freiburghaus', 'GC', 'ATT', null, 90, 91, 93, 87, 99, 95, 72),
        mk('castelberg', 'Yanik', 'Castelberg', 'GC', 'ATT', 34, 85, 78, 90, 87, 99, 90, 84),
        mk('bier', 'Kay', 'Bier', 'GC', 'DEF', 13, 88, 89, 80, 95, 80, 82, 99),
        mk('niederberger', 'Florian', 'Niederberger', 'GC', 'DEF', null, 77, 78, 86, 60, 80, 82, 72)
      ] }
    ]
  };

  const MOVES = [
    { id: 'direkt', name: 'Direktschuss', short: 'Direkt', basis: 'Abschluss', val: c => 0.75 * c.sco + 0.25 * c.frm, extra: 0 },
    { id: 'kombi', name: 'Kombination', short: 'Kombi', basis: 'Vorlagen', val: c => 0.75 * c.ply + 0.25 * c.frm, extra: 0 },
    { id: 'solo', name: 'Solo', short: 'Solo', basis: 'Form und Clutch', val: c => 0.5 * c.frm + 0.5 * c.clu, extra: 6 }
  ];
  const STANCES = [
    { id: 'block', name: 'Block', stops: 'direkt', against: 'den Direktschuss', expects: 'einem Direktschuss', foul: 1 },
    { id: 'pass', name: 'Passweg zu', stops: 'kombi', against: 'die Kombination', expects: 'einer Kombination', foul: 0.5 },
    { id: 'zwei', name: 'Zweikampf', stops: 'solo', against: 'das Solo', expects: 'einem Solo', foul: 2 }
  ];
  const CORNERS = [{ id: 'l', name: 'Links' }, { id: 'm', name: 'Mitte' }, { id: 'r', name: 'Rechts' }];
  const MISSES = ['wide', 'high', 'post'];
  const byId = (list, id) => { for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; };
  const move = id => byId(MOVES, id), stance = id => byId(STANCES, id);

  // --- Werte ---
  const defVal = c => 0.45 * c.exp + 0.30 * c.fai + 0.25 * c.frm + (c.pos === 'DEF' ? 5 : 0);
  const eff = (v, c) => v * (0.78 + 0.22 * c.stam / 100) + (c.home ? 2 : 0) + (c.cap ? 4 : 0);
  const clutch = (c, duel, cfg) => duel >= 8 ? (c.clu - 85) * (cfg || CFG).clutchSlope : 0;
  const foulRisk = (c, st, cfg) => { cfg = cfg || CFG; return clamp((cfg.foulBase + (100 - c.fai) * cfg.foulFactor) * (st ? st.foul : 1), 0, cfg.foulMax); };
  const cost = (c, mv) => 38 - (c.exp - 60) * 0.2 + (mv ? mv.extra : 0);
  const period = d => Math.min(3, Math.floor(d / 4) + 1);
  const bestMove = c => MOVES.slice().sort((a, b) => b.val(c) - a.val(c))[0];
  function tendency(c) {
    const order = MOVES.slice().sort((a, b) => b.val(c) - a.val(c)), w = [0.5, 0.3, 0.2], out = {};
    order.forEach((m, i) => { out[m.id] = w[i]; });
    return out;
  }
  function sample(weights, rng) {
    const keys = Object.keys(weights); let r = rng() * keys.reduce((a, k) => a + weights[k], 0);
    for (let i = 0; i < keys.length; i++) { r -= weights[keys[i]]; if (r <= 0) return keys[i]; }
    return keys[keys.length - 1];
  }
  function pool(cards) {
    let p = cards.filter(c => c.box === 0 && c.stam >= 20);
    if (!p.length) p = cards.filter(c => c.box === 0);
    if (!p.length) p = cards.slice();
    return p;
  }
  function best(list, fn) { let top = null, score = -Infinity; list.forEach(c => { const v = fn(c); if (v > score) { score = v; top = c; } }); return top; }
  const card = (s, side, id) => byId(s.teams[side].cards, id);
  const usable = (s, side) => pool(s.teams[side].cards);

  // --- Strafbank und Überzahl ---
  function boxed(s, side) { let n = 0, max = 0; s.teams[side].cards.forEach(c => { if (c.box > 0) { n++; if (c.box > max) max = c.box; } }); return { n, max }; }
  // 1: side spielt in Überzahl, -1: in Unterzahl, 0: gleich viele. Zwei Strafen zählen nur einmal.
  function manAdv(s, side) { const a = boxed(s, side).n, b = boxed(s, other(side)).n; return a < b ? 1 : (a > b ? -1 : 0); }

  // --- die drei Stufen ---
  function stage1(s, side, A, mv, D, read) {
    const cfg = s.cfg, cur = s.cur, diff = eff(mv.val(A), A) - eff(defVal(D), D);
    let p = read ? clamp(cfg.s1Read + diff * cfg.s1ReadSlope, cfg.s1ReadMin, cfg.s1ReadMax)
      : clamp(cfg.s1Open + diff * cfg.s1OpenSlope, cfg.s1OpenMin, cfg.s1OpenMax);
    if (manAdv(s, side) > 0) p += cfg.ppBonus;
    if (cur && cur.side === side && !cur.so) { if (cur.pressing) p -= cfg.pressing; if (cur.pull) p += cfg.pull; }
    return clamp(p, 0.03, 0.97);
  }
  function stage2(s, X, o) {
    const cfg = s.cfg; o = o || {};
    let p = cfg.s2Base + (eff(0.5 * X.sco + 0.5 * X.frm, X) - cfg.s2Ref) * cfg.s2Slope;
    if (o.wall) p -= cfg.wall;
    if (o.short) p -= cfg.shortS2;
    return clamp(p, 0.15, 0.97);
  }
  function stage3(s, side, X, o) {
    const cfg = s.cfg; o = o || {};
    let p = cfg.s3Base + (eff(X.sco, X) - s.teams[other(side)].goalie.val) * cfg.s3Slope
      + clutch(X, s.duel, cfg) + (side === 'you' ? 1 : -1) * cfg.momentum * s.mom;
    if (o.counter) p += cfg.counterBonus;
    if (o.short) p -= cfg.shortS3;
    return clamp(p, 0.05, 0.95);
  }
  // Bestehende Formeln des Penaltyschiessens. Der Goalie-Wert verschiebt sie erst, wenn er vom Platzhalter abweicht.
  function penChance(s, side, A, right) {
    const g = (s.teams[other(side)].goalie.val - s.cfg.goalieRef) * s.cfg.penGoalie;
    return right ? clamp(0.20 + (A.clu - 85) * 0.008 - g, 0.08, 0.4) : clamp(0.82 + (A.clu - 85) * 0.006 - g, 0.6, 0.95);
  }
  const keeperWeights = k => { const tot = k.l + k.m + k.r || 1; return { l: 1 + 1.5 * k.l / tot, m: 0.7 + 1.5 * k.m / tot, r: 1 + 1.5 * k.r / tot }; };

  // --- KI der Halle ---
  // Angreifer: bisher nur nach dem besten Spielzug-Wert. Neu zählt zur Hälfte, wie gut die Karte abschliesst (Stufe 2 und 3),
  // sonst schickt die Halle Karten vor, die durchkommen, aber nicht treffen. Verteidiger, Spielzug und Abwehr wie bisher.
  const aiAttacker = (s, side, rng) => best(usable(s, side), c => { const w = s.cfg.aiFinish || 0; return (1 - w) * eff(bestMove(c).val(c), c) + w * 0.5 * (eff(0.5 * c.sco + 0.5 * c.frm, c) + eff(c.sco, c)) + clutch(c, s.duel, s.cfg) / 0.014 + (rng() * 6 - 3); });
  // Der Foul-Abzug bleibt bei (100 − Fairness) × 0.05 wie bisher, damit die Halle gleich aufstellt wie heute.
  const aiDefender = (s, side, rng) => best(usable(s, side), c => eff(defVal(c), c) - (100 - c.fai) * 0.05 + (rng() * 6 - 3));
  function stanceWeights(c, hist) {
    const t = tendency(c), tot = hist.direkt + hist.kombi + hist.solo, w = {};
    MOVES.forEach(m => { w[m.id] = 0.45 * t[m.id] + 0.30 * (hist[m.id] + 1) / (tot + 3) + 0.25 / 3; });
    return w;
  }
  const aiStance = (c, hist, rng) => { const guess = sample(stanceWeights(c, hist), rng); return STANCES.filter(x => x.stops === guess)[0]; };

  /* Freundschaftsspiel: Im Prototyp spielt eine KI den Freund. Sie folgt keiner festen Tendenz pro Karte, sondern mischt
     ihre Züge nach Stärke und weicht der Abwehr aus, die der User bisher oft gewählt hat. In der echten App sitzt hier ein Mensch. */
  function friendMoveWeights(c, shist) {
    const order = MOVES.slice().sort((a, b) => b.val(c) - a.val(c)), base = [0.45, 0.33, 0.22], tot = shist.block + shist.pass + shist.zwei, w = {};
    order.forEach((m, i) => { const st = STANCES.filter(x => x.stops === m.id)[0]; w[m.id] = base[i] * (1.25 - (shist[st.id] + 1) / (tot + 3)); });
    return w;
  }
  // Taktiken des Freundes, je einmal pro Match wie beim User.
  function friendTactics(s) {
    const cur = s.cur, used = s.tac.home, cards = s.teams.home.cards, lead = s.score.home - s.score.you;
    cur.told = [];   // was der Freund in diesem Duell ansagt
    if (!used.timeout && cards.reduce((a, c) => a + Math.min(s.cfg.timeout, 100 - c.stam), 0) >= 120) { cards.forEach(c => { c.stam = Math.min(100, c.stam + s.cfg.timeout); }); used.timeout = true; cur.told.push('timeout'); }
    if (!used.pressing && cur.side === 'you' && s.duel >= 8 && (lead <= 1 || s.duel >= 11)) { cur.pressing = true; used.pressing = true; cur.told.push('pressing'); }
    if (!used.pull && cur.side === 'home' && s.duel >= 8 && (lead <= 0 || s.duel >= 10)) { cur.pull = true; used.pull = true; cur.told.push('pull'); }
  }

  // --- Zustand ---
  function copy(s) {
    const t = Object.assign({}, s);
    t.teams = {
      you: Object.assign({}, s.teams.you, { cards: s.teams.you.cards.map(c => Object.assign({}, c)) }),
      home: Object.assign({}, s.teams.home, { cards: s.teams.home.cards.map(c => Object.assign({}, c)) })
    };
    t.score = Object.assign({}, s.score);
    t.tac = { you: Object.assign({}, s.tac.you), home: Object.assign({}, s.tac.home) };
    t.hist = Object.assign({}, s.hist);
    t.shist = Object.assign({}, s.shist);
    t.corners = Object.assign({}, s.corners);
    t.results = s.results.slice();
    t.log = s.log.slice();
    if (s.cur) {
      t.cur = Object.assign({}, s.cur);
      if (s.cur.pen) t.cur.pen = Object.assign({}, s.cur.pen);
      if (s.cur.entry) t.cur.entry = Object.assign({}, s.cur.entry, { steps: s.cur.entry.steps.slice() });
    }
    if (s.pen) t.pen = Object.assign({}, s.pen, { used: s.pen.used.slice(), results: s.pen.results.slice() });
    t.stats = Object.assign({}, s.stats, { src: Object.assign({}, s.stats.src) });
    return t;
  }

  /* setup: { mode, homeName, cfg, you: { goalie, cards }, home: { goalie, cards } }
     mode 'hall': gegen die Hallenwache. mode 'friend': Freundschaftsspiel, der Verteidiger zeigt zuerst, Taktiken auf beiden Seiten.
     Karten werden kopiert. home und cap auf den Karten bestimmen Heimvorteil und Captain. */
  function newMatch(setup, rng) {
    const team = t => ({ goalie: Object.assign({}, t.goalie), cards: t.cards.map(c => Object.assign({}, c)) });
    const s = {
      mode: setup.mode || 'hall', cfg: setup.cfg || CFG, homeName: setup.homeName || '',
      teams: { you: team(setup.you), home: team(setup.home) },
      duel: 0, score: { you: 0, home: 0 }, mom: 0,
      tac: { you: {}, home: {} },
      hist: { direkt: 0, kombi: 0, solo: 0 },   // gespielte Züge des Users, für die Abwehr der Halle
      shist: { block: 0, pass: 0, zwei: 0 },    // gewählte Abwehr des Users, nur im Freundschaftsspiel genutzt
      corners: { l: 0, m: 0, r: 0 },            // Ecken des Users, Penaltys im Match und im Penaltyschiessen zusammen
      results: [], log: [], cur: null, phase: 'pick', pen: null, outcome: null,
      stats: { fouls: 0, twomin: 0, matchPen: 0, counters: 0, stops: 0, shootout: 0, src: { attack: 0, pp: 0, counter: 0, free: 0, pen: 0 } }
    };
    beginDuel(s, rng);
    return s;
  }
  /* Halle: Sie zeigt ihren Angreifer und hat den Zug schon verdeckt gewählt. Freundschaftsspiel: Die verteidigende Seite zeigt
     zuerst ihre Karte (wait: 'defender'), dann wählt der Angreifer. Spielzug und Abwehr bleiben verdeckt bis zur Auflösung. */
  function beginDuel(s, rng) {
    const side = s.duel % 2 === 0 ? 'home' : 'you', friend = s.mode === 'friend';
    if (side === 'you') s.cur = { side, attacker: null, defender: aiDefender(s, 'home', rng).id, move: null, pressing: false, pull: false };
    else if (friend) s.cur = { side, attacker: null, defender: null, move: null, pressing: false, pull: false, wait: 'defender' };
    else { const a = aiAttacker(s, 'home', rng); s.cur = { side, attacker: a.id, defender: null, move: sample(tendency(a), rng), pressing: false, pull: false }; }
    if (friend) friendTactics(s);
    s.phase = 'pick';
  }
  // Freundschaftsspiel: Der User zeigt seinen Verteidiger, der Freund wählt darauf seinen Angreifer.
  function showDefender(s, rng, cardId) {
    const D = card(s, 'you', cardId);
    if (!D || usable(s, 'you').indexOf(D) === -1) return false;
    s.cur.defender = D.id; s.cur.attacker = aiAttacker(s, 'home', rng).id; s.cur.wait = null;
    return true;
  }
  function bump(s, good) { s.mom = good ? (s.mom < 0 ? 0 : Math.min(3, s.mom + 1)) : (s.mom > 0 ? 0 : Math.max(-3, s.mom - 1)); }

  function step(s, ev, e) { s.cur.entry.steps.push(e); ev.push(e); }

  function goal(s, ev, side, X, ctx, pp) {
    const cur = s.cur, opp = other(side);
    s.score[side]++; cur.goal = side;
    s.stats.src[ctx === 'attack' && pp ? 'pp' : ctx]++;
    if (cur.so) return;
    // Ein Tor in Überzahl beendet die Strafe mit der kürzesten Restdauer.
    const sitting = s.teams[opp].cards.filter(c => c.box > 0).sort((a, b) => a.box - b.box);
    const pending = cur.twomin && !cur.twominOff && cur.side === side;
    if (boxed(s, side).n < sitting.length + (pending ? 1 : 0)) {
      if (sitting.length) { sitting[0].box = 0; step(s, ev, { t: 'ppend', side: opp, x: sitting[0].id }); }
      else { cur.twominOff = true; step(s, ev, { t: 'ppend', side: opp, x: cur.defender }); }
    }
  }
  // Stufe 2 und 3 für Angriff, Konter und Freischlag.
  function shoot(s, rng, ev, X, side, o) {
    const cfg = s.cfg, q2 = stage2(s, X, o), on = rng() < q2;
    step(s, ev, { t: 's2', side, x: X.id, ctx: o.ctx, p: q2, ok: on, miss: on ? null : MISSES[Math.floor(rng() * 3)] });
    if (!on) return;
    if (o.empty) { step(s, ev, { t: 's3', side, x: X.id, ctx: o.ctx, p: 1, ok: true, empty: true }); goal(s, ev, side, X, o.ctx, false); return; }
    const q3 = stage3(s, side, X, o), ok = rng() < q3;
    if (ok) { step(s, ev, { t: 's3', side, x: X.id, ctx: o.ctx, p: q3, ok: true }); goal(s, ev, side, X, o.ctx, o.pp); return; }
    const caught = !!o.canCounter && rng() < cfg.counterCatch;
    step(s, ev, { t: 's3', side, x: X.id, ctx: o.ctx, p: q3, ok: false, caught });
    if (caught) counter(s, rng, ev, o.defender, other(side), 'catch', cfg.counterCatch);
  }
  function counter(s, rng, ev, X, side, src, p) {
    const cur = s.cur, empty = !!cur.pull && side !== cur.side;
    cur.counter = true; s.stats.counters++;
    step(s, ev, { t: 'counter', side, x: X.id, src, p, empty });
    shoot(s, rng, ev, X, side, { ctx: 'counter', counter: true, empty, canCounter: false });
  }
  function freeHit(s, rng, ev, A, D, side) {
    const short = A.ply > A.sco;
    step(s, ev, { t: 'free', side, x: A.id, short });
    shoot(s, rng, ev, A, side, { ctx: 'free', wall: !short, short, canCounter: !s.cur.twomin, defender: D });
  }

  function resolveDuel(s, rng, ev, cardId, optionId) {
    const cfg = s.cfg, cur = s.cur, side = cur.side, dside = other(side);
    let A, D, mv, st;
    if (cur.wait) return false;
    if (side === 'home') {
      A = card(s, 'home', cur.attacker); D = card(s, 'you', cur.defender || cardId); st = stance(optionId);
      if (!A || !D || !st || usable(s, 'you').indexOf(D) === -1) return false;
      mv = cur.move ? move(cur.move) : move(sample(friendMoveWeights(A, s.shist), rng));     // der Freund wählt verdeckt
      s.shist[st.id]++;
    } else {
      A = card(s, 'you', cardId); mv = move(optionId); D = card(s, 'home', cur.defender);
      if (!A || !mv || usable(s, 'you').indexOf(A) === -1) return false;
      st = aiStance(A, s.hist, rng); s.hist[mv.id]++;
    }
    const read = st.stops === mv.id;
    cur.attacker = A.id; cur.defender = D.id; cur.move = mv.id; cur.stance = st.id; cur.read = read;
    cur.entry = { duel: s.duel, side, a: A.id, d: D.id, move: mv.id, stance: st.id, read, steps: [] };
    ev.push({ t: 'reveal', side, a: A.id, d: D.id, move: mv.id, stance: st.id, read });

    const pf = foulRisk(D, st, cfg);
    if (rng() < pf) {
      const r = rng(), pPen = read ? 0 : cfg.penaltyShare;
      const kind = r < pPen ? 'penalty' : (r < pPen + cfg.twoMin[st.id] ? 'twomin' : 'free');
      s.stats.fouls++;
      if (kind === 'twomin') { cur.twomin = true; s.stats.twomin++; }
      step(s, ev, { t: 'foul', kind, side: dside, by: D.id, on: A.id, p: pf });
      if (kind === 'penalty') {
        s.stats.matchPen++;
        cur.pen = { shooter: A.id, corner: side === 'home' ? sample({ l: 0.4, m: 0.2, r: 0.4 }, rng) : null };
        s.phase = 'penalty';
        return true;
      }
      freeHit(s, rng, ev, A, D, side);
    } else {
      const pp = manAdv(s, side) > 0, p = stage1(s, side, A, mv, D, read), ok = rng() < p;
      step(s, ev, { t: 's1', side, a: A.id, d: D.id, move: mv.id, stance: st.id, read, p, ok, pp, pressing: !!cur.pressing, pull: !!cur.pull });
      if (ok) shoot(s, rng, ev, A, side, { ctx: 'attack', pp, canCounter: true, defender: D });
      else { s.stats.stops++; const pc = cur.pull ? cfg.pullCounter : cfg.counter[st.id]; if (rng() < pc) counter(s, rng, ev, D, dside, 'stop', pc); }
    }
    endDuel(s, ev);
    return true;
  }
  function resolveMatchPenalty(s, rng, ev, corner) {
    const cur = s.cur, side = cur.side, A = card(s, side, cur.pen.shooter);
    if (!byId(CORNERS, corner)) return false;
    let shot, guess;
    if (side === 'home') { shot = cur.pen.corner; guess = corner; }
    else { shot = corner; guess = sample(keeperWeights(s.corners), rng); s.corners[shot]++; }
    const right = guess === shot, p = penChance(s, side, A, right), ok = rng() < p;
    step(s, ev, { t: 'pen', side, x: A.id, corner: shot, guess, right, p, ok });
    if (ok) goal(s, ev, side, A, 'pen', false);
    endDuel(s, ev);
    return true;
  }
  function endDuel(s, ev) {
    const cfg = s.cfg, cur = s.cur, side = cur.side, dside = other(side);
    const A = card(s, side, cur.attacker), D = card(s, dside, cur.defender);
    A.stam = Math.max(0, A.stam - cost(A, move(cur.move)));
    D.stam = Math.max(0, D.stam - cost(D) - (cur.counter ? cfg.counterCost : 0));
    s.teams.you.cards.concat(s.teams.home.cards).forEach(x => { if (x !== A && x !== D) x.stam = Math.min(100, x.stam + cfg.recover); if (x.box > 0) x.box--; });
    if (cur.twomin && !cur.twominOff) { D.box = cfg.boxDuels; ev.push({ t: 'box', side: dside, x: D.id, n: cfg.boxDuels }); }
    const scorer = cur.goal || null;
    bump(s, scorer ? scorer === 'you' : side === 'home');
    s.results[s.duel] = { goal: scorer };
    s.log.push(cur.entry);
    cur.pen = null;
    s.phase = 'duelDone';
  }

  // --- Penaltyschiessen, Formeln wie bisher ---
  function startShootout(s, rng) {
    s.pen = { round: 0, turn: 'home', you: 0, home: 0, used: [], results: [], order: s.teams.home.cards.slice().sort((a, b) => b.clu - a.clu).map(c => c.id) };
    s.stats.shootout = 1;
    setupShot(s, rng);
  }
  function setupShot(s, rng) {
    const P = s.pen;
    if (P.turn === 'home') { s.cur = { so: true, side: 'home', attacker: P.order[P.round % P.order.length], corner: sample({ l: 0.4, m: 0.2, r: 0.4 }, rng) }; s.phase = 'so-guess'; }
    else { s.cur = { so: true, side: 'you', attacker: null }; s.phase = 'so-shoot'; }
  }
  const soBlocked = (s, id) => s.pen.used.indexOf(id) !== -1 && s.pen.used.length < s.teams.you.cards.length;
  const soOver = P => P.turn === 'home' && P.round >= 3 && P.you !== P.home;
  function resolveShootout(s, rng, ev, cardId, corner) {
    const P = s.pen, cur = s.cur, side = cur.side;
    if (!byId(CORNERS, corner)) return false;
    let A, shot, guess;
    if (side === 'home') { A = card(s, 'home', cur.attacker); shot = cur.corner; guess = corner; }
    else {
      A = card(s, 'you', cardId); if (!A || soBlocked(s, A.id)) return false;
      shot = corner; guess = sample(keeperWeights(s.corners), rng); s.corners[shot]++;
      P.used.push(A.id); if (P.used.length > s.teams.you.cards.length) P.used = [A.id];
      cur.attacker = A.id;
    }
    const right = guess === shot, p = penChance(s, side, A, right), ok = rng() < p;
    if (ok) P[side]++;
    P.results.push({ side, goal: ok });
    const e = { t: 'pen', so: true, side, x: A.id, corner: shot, guess, right, p, ok };
    ev.push(e); s.log.push({ so: true, side, a: A.id, steps: [e] });
    if (side === 'you') P.round++;
    P.turn = other(side);
    s.phase = 'so-wait';
    return true;
  }
  function finish(s) {
    if (s.pen) s.outcome = s.pen.you > s.pen.home ? 'penwin' : 'penloss';
    else s.outcome = s.score.you > s.score.home ? 'win' : 'loss';
    s.phase = 'done';
  }

  /* Einziger Einstieg für Eingaben. Gibt einen neuen Zustand und die Ereignisse der Sequenz zurück, der alte bleibt unverändert.
     action: { type: 'tactic', id }                 Time-out, Pressing, Ohne Goalie
             { type: 'card', card }                  Freundschaftsspiel: eigenen Verteidiger zuerst zeigen
             { type: 'play', card, option }          Karte und Spielzug oder Abwehr
             { type: 'corner', corner }              Ecke bei Penalty im Match oder beim Raten im Penaltyschiessen
             { type: 'shoot', card, corner }         eigener Penalty im Penaltyschiessen
             { type: 'next' }                        nächstes Duell, nächster Penalty oder Schluss */
  function act(state, action, rng) {
    const s = copy(state), ev = [], cur = s.cur;
    let ok = false;
    if (action.type === 'tactic' && s.phase === 'pick' && !s.tac.you[action.id]) {
      if (action.id === 'timeout') { s.teams.you.cards.forEach(c => { c.stam = Math.min(100, c.stam + s.cfg.timeout); }); ok = true; }
      else if (action.id === 'pressing' && cur.side === 'home') { cur.pressing = true; ok = true; }
      else if (action.id === 'pull' && cur.side === 'you' && s.duel >= 8) { cur.pull = true; ok = true; }
      if (ok) s.tac.you[action.id] = true;
    } else if (action.type === 'card' && s.phase === 'pick' && cur.wait === 'defender') ok = showDefender(s, rng, action.card);
    else if (action.type === 'play' && s.phase === 'pick') ok = resolveDuel(s, rng, ev, action.card, action.option);
    else if (action.type === 'corner' && s.phase === 'penalty') ok = resolveMatchPenalty(s, rng, ev, action.corner);
    else if (action.type === 'corner' && s.phase === 'so-guess') ok = resolveShootout(s, rng, ev, null, action.corner);
    else if (action.type === 'shoot' && s.phase === 'so-shoot') ok = resolveShootout(s, rng, ev, action.card, action.corner);
    else if (action.type === 'next' && s.phase === 'duelDone') {
      s.duel++; ok = true;
      if (s.duel >= s.cfg.duels) { if (s.score.you === s.score.home) startShootout(s, rng); else finish(s); }
      else beginDuel(s, rng);
    } else if (action.type === 'next' && s.phase === 'so-wait') { ok = true; if (soOver(s.pen)) finish(s); else setupShot(s, rng); }
    return ok ? { state: s, events: ev, ok: true } : { state, events: [], ok: false };
  }

  root.HK = {
    CFG, DATA, MOVES, STANCES, CORNERS, makeRng, newMatch, act,
    card, usable, boxed, manAdv, stage1, stage2, stage3, penChance, foulRisk, stanceWeights, keeperWeights,
    defVal, eff, clutch, cost, period, bestMove, tendency, soBlocked, soOver, move, stance, other
  };
})(typeof window !== 'undefined' ? window : globalThis);
