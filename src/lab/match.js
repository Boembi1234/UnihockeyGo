/* Match mit Spielfluss (Testversion unter /lab/match/).
   Drei Drittel zu 20 Minuten. Die Uhr läuft, und aus dem Spiel entstehen Chancen: wie viele, ist nicht fest. Jede Seite
   bekommt Chancen nach ihrem Angriffswert (die drei Stürmer) gegen den Abwehrwert des Gegners (die zwei Verteidiger) und
   nach der Taktik: offensiv bringt mehr eigene Chancen, öffnet aber hinten, defensiv das Gegenteil.
   Eine Chance ist ein Positionsangriff, ein Konter 3 gegen 2, ein Konter 2 gegen 1 oder selten ein Alleingang.
   Nichts wird gewürfelt, was der User selbst entscheiden kann. Jeder Zweikampf läuft über einen Timing-Balken: Ein Strich
   läuft hin und her, der User tippt, wenn er im grünen Feld ist. Die Karten bestimmen, wie breit das Feld ist.
   Angriff: Der Ballführende kann schiessen, passen oder dribbeln.
   Abwehr: Der Plan des Gegners ist sichtbar, der passende Verteidiger reagiert von selbst, der User trifft das Timing.
   Eigener Schuss: ins Tor tippen (Ziel), dann den Schuss-Balken stoppen. Genau in der Mitte geht der Ball genau ins Ziel;
   steht der Strich links oder rechts davon, weicht der Ball nach links oder rechts ab. Bei einem schwachen oder müden Schützen läuft der Strich
   schneller. Der Goalie hält, was in seiner Reichweite landet; aus der Nähe reicht er weniger weit.
   Energie: Jeder Spieler wird im Lauf des Matchs müde (Aktionen kosten Energie, die Pause bringt etwas zurück). Je müder,
   desto schneller läuft sein Strich auf jedem Balken.
   Schuss des Gegners: Die Flugbahn ist ehrlich zu sehen, der User muss die richtige Ecke antippen, bevor der Ball da ist.
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
    periods: 3, periodMin: 20, goalie: 88, maxSteps: 4, counterSteps: 2, defSteps: 2,
    // Chancen pro Minute und Seite bei gleichen Werten und ausgeglichener Taktik; wie stark Angriff gegen Abwehr zählt;
    // Mindestabstand zwischen zwei Chancen in Minuten; höchstens so viele Chancen pro Drittel
    chanceBase: 0.095, chanceK: 0.035, chanceGap: 1.2, maxPerPeriod: 5,
    // Timing-Balken: Durchlauf in ms, Streuung eines durchschnittlichen Spielers in ms (bei ihr trifft er so oft wie die
    // Chance aus dem Wertevergleich), kleinstes und grösstes Feld, Anteil des perfekten Kerns, «knapp daneben»
    barSweep: 900, barRef: 80, barMin: 0.045, barMax: 0.34, barCore: 0.26, barNear: 0.07, barGross: 0.2,
    blockFree: 0.08,                                                  // darunter ist der Schuss frei, ohne Balken
    defScale: 0.8, defBlock: 0.7,                                     // Feld in der Abwehr, gegen Schüsse etwas schmaler
    pressGood: 130, pressNear: 60,                                    // gestörter Gegner: so viele ms mehr Zeit für die Parade
    // Streuung der Schüsse des Gegners (Radius um sein Ziel, Tor von -1 bis 1), vor allem nach dem Abschlusswert
    sdBase: 0.1, sdSkill: 0.22, sdDist: 0.06, post: 0.07,
    /* Dein Schuss: Balken wie beim Penalty. Breite des grünen Felds nach der Lage: shotW von ganz weit, shotWq dazu direkt
       vor dem Tor; unter Druck bis shotPress schmaler. Tempo des Strichs nach dem Abschlusswert: 88 ist normal, jeder Punkt
       darunter macht ihn 3 % schneller. Am Rand des grünen Felds weicht der Ball um die halbe Breite des freien Felds ab. */
    shotW: -0.01, shotWq: 0.175, shotWMin: 0.03, shotPress: 0.5, shotTempo: 0.03, tempoMin: 0.5, tempoMax: 1.3, sweepMin: 380,
    /* Goalie des Gegners steht leicht auf einer Seite (kOff). Auf der anderen Seite bleibt ein freies Feld. Seine Breite
       (Tor von -1 bis 1) hängt vor allem von der Lage ab: free bei einem Schuss von ganz weit, freeDist dazu direkt vor dem
       Tor, freeVal pro Punkt Abschluss über dem Goalie, freeTop dazu bei hohen Bällen. */
    kOffMin: 0.3, kOffMax: 0.55,
    free: 0.05, freeDist: 0.45, freeVal: 0.003, freeTrait: 0.07, freeTop: 0.05, freeMin: 0.06, freeMax: 0.75,
    enSpread: 0.5,                                                    // müder Schütze des Gegners streut bis so viel mehr
    // Energie: Kosten pro Chance (für alle; mal enTacOff bei offensiver, mal enTacDef bei defensiver Taktik), Pass, Annahme, Dribbling, Schuss, Abwehraktion; Erholung in der Pause;
    // bei leerer Energie läuft der Strich mit diesem Anteil der normalen Dauer
    enChance: 1.5, enTacOff: 1.1, enTacDef: 0.9, enPass: 4, enRecv: 2, enDrib: 10, enShot: 7, enDef: 7, enBreak: 15, enFloor: 0.6,
    // Reaktionsparade: Zeit in ms, bis der Ball im Tor ist
    aiPowMin: 0.1, rxBase: 355, rxPow: 700, rxVal: 5, rxDist: 200, rxCounter: 90, rxTrait: 70, rxLate: 90, rxMin: 360, rxMax: 1000, rxEdge: 0.12,
    blockBase: 0.65,                                                  // Schuss geblockt, wenn ein Gegner ganz nah steht
    // Pass und Dribbling
    laneRange: 40, intercept: 0.55, passLong: 700,
    drib: 0.52, dribSlope: 0.022, dribMin: 0.12, dribMax: 0.9,
    // Abwehrszene: richtige Abwehr stoppt so oft, verschoben um den Wertevergleich
    stopRight: 0.5, stopSlope: 0.02, stopMin: 0.25, stopMax: 0.92, stopHalf: 0.15,
    traitBonus: 0.15,                                                 // Spezialfähigkeit im passenden Einsatz
    traitShot: 0.6
  };

  const byId = (l, id) => { for (let i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; };
  const card = (s, side, id) => byId(s.teams[side].cards, id);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  function distSeg(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1, t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l, 0, 1); return dist(p, [a[0] + t * dx, a[1] + t * dy]); }
  function sample(w, rng) { const k = Object.keys(w); let r = rng() * k.reduce((a, x) => a + w[x], 0); for (let i = 0; i < k.length; i++) { r -= w[k[i]]; if (r <= 0) return k[i]; } return k[k.length - 1]; }
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
  // Energie 0 bis 100. Müde Spieler haben einen schnelleren Strich: Dauer eines Durchlaufs mal diesen Faktor.
  const tired = (cfg, c) => cfg.enFloor + (1 - cfg.enFloor) * clamp(c.en === undefined ? 100 : c.en, 0, 100) / 100;
  const drain = (c, v) => { if (c) c.en = clamp((c.en === undefined ? 100 : c.en) - v, 0, 100); };
  // Angriff: was die drei Stürmer mit dem Ball können. Abwehr: was die zwei Verteidiger gegen den Ball können.
  const FWD = ['C', 'LW', 'RW'], BACK = ['LD', 'RD'];
  const avg = l => l.reduce((a, v) => a + v, 0) / Math.max(1, l.length);
  const attackVal = cards => avg(cards.filter(c => FWD.indexOf(c.role) !== -1).map(c => (shotVal(c) + passVal(c) + dribVal(c)) / 3));
  const defenceVal = cards => avg(cards.filter(c => BACK.indexOf(c.role) !== -1).map(c => (stanceVal(c, 'block') + stanceVal(c, 'pass') + stanceVal(c, 'zwei')) / 3 - (c.pos === 'DEF' ? 5 : 0)));
  /* Taktik. own: Faktor auf die eigenen Chancen. open: Faktor auf die Chancen des Gegners.
     Wer offensiv spielt, gibt dem Gegner ausserdem öfter Konter; wer defensiv spielt, kommt selbst öfter über Konter. */
  const TACTICS = {
    def: { name: 'Defensiv', own: 0.72, open: 0.68 },
    bal: { name: 'Normal', own: 1, open: 1 },
    off: { name: 'Offensiv', own: 1.35, open: 1.3 }
  };
  const KINDS = { set: 'Angriff', rush32: 'Konter 3 gegen 2', rush21: 'Konter 2 gegen 1', solo: 'Alleingang' };

  /* Spezialfähigkeiten aus den Ratings. Jede Karte hat höchstens eine: Stürmer zuerst eine Angriffs-, Verteidiger zuerst eine
     Abwehrfähigkeit, jeweils die, deren Wert die Schwelle am weitesten übertrifft. Im passenden Einsatz gibt sie einen grossen Bonus. */
  const TRAITS = {
    kanone: { name: 'Kanone', what: 'Schuss', off: true, val: c => c.sco, min: 98 },
    passer: { name: 'Passmaschine', what: 'Pass', off: true, val: c => c.ply, min: 98 },
    dribbler: { name: 'Dribbelkönig', what: 'Dribbling', off: true, val: c => (c.frm + c.clu) / 2, min: 95.5 },
    wand: { name: 'Wand', what: 'Block', off: false, val: c => 0.6 * c.exp + 0.4 * c.clu + (c.pos === 'DEF' ? 5 : 0), min: 97 },
    anti: { name: 'Antizipation', what: 'Passweg', off: false, val: c => 0.6 * c.ply + 0.4 * c.exp + (c.pos === 'DEF' ? 5 : 0), min: 97 },
    kampf: { name: 'Zweikämpfer', what: 'Druck', off: false, val: c => 0.7 * c.frm + 0.3 * c.fai + (c.pos === 'DEF' ? 5 : 0), min: 98 }
  };
  function trait(c) {
    const pick = off => { let b = null, m = 0; Object.keys(TRAITS).forEach(k => { const t = TRAITS[k]; if (t.off !== off) return; const x = t.val(c) - t.min; if (x >= 0 && x >= m) { m = x; b = k; } }); return b; };
    const first = c.pos === 'DEF' ? false : true;
    return pick(first) || pick(!first);
  }
  const has = (c, t) => !!c && trait(c) === t;

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
    const block = clamp(press * s.cfg.blockBase * clamp(1 + (stanceVal(n.c, 'block') - shotVal(X)) * 0.02, 0.5, 1.5) * (has(n.c, 'wand') ? 1.4 : 1), 0, 0.75);
    // Grobe Torchance für die Anzeige, bei einem guten Schuss in eine freie Ecke
    const est = (1 - block) * clamp(0.5 + (shotVal(X) - 88) * 0.012 + (q - 0.6) * 0.7 + (has(X, 'kanone') ? 0.1 : 0), 0.05, 0.9);
    return { q, block, by: n.c.id, est };
  }
  // Risiko, dass der Pass abgefangen wird: Gegner nahe der Passlinie, Länge des Passes, Vorlagen des Passgebers
  function passInfo(s, sc, from, to) {
    const side = atkSide(sc), a = P(sc, from), b = P(sc, to), X = card(s, side, from);
    let keep = 1, by = null, worst = 0;
    players(s, other(side)).forEach(d => {
      const r = clamp(1 - distSeg(P(sc, d.id), a, b) / s.cfg.laneRange, 0, 1) * clamp(s.cfg.intercept + (stanceVal(d, 'pass') - 88) * 0.025, 0.15, 0.95) * (has(d, 'anti') ? 1.35 : 1);
      keep *= 1 - r; if (r > worst) { worst = r; by = d.id; }
    });
    const risk = ((1 - keep) * clamp(1.4 - (passVal(X) - 70) / 60, 0.5, 1.3) + Math.max(0, dist(a, b) - 160) / s.cfg.passLong) * (has(X, 'passer') ? 0.5 : 1);
    if (!by) by = nearest(s, sc, other(side), lerp(a, b, 0.5)).c.id;   // langer Pass ohne Gegner in der Linie: der nächste läuft ihn ab
    return { risk: clamp(risk, 0.03, 0.9), by };
  }
  function dribInfo(s, sc, id) {
    const side = atkSide(sc), X = card(s, side, id), M = card(s, other(side), sc.mark[id]);
    const space = (dist(P(sc, id), P(sc, M.id)) - 40) / 200;
    const bonus = (has(X, 'dribbler') ? s.cfg.traitBonus : 0) - (has(M, 'kampf') ? s.cfg.traitBonus : 0);
    return { p: clamp(s.cfg.drib + (dribVal(X) - stanceVal(M, 'zwei')) * s.cfg.dribSlope + space + bonus, s.cfg.dribMin, s.cfg.dribMax), by: M.id, edge: dribVal(X) - stanceVal(M, 'zwei'), av: dribVal(X), dv: stanceVal(M, 'zwei') };
  }

  // Laufwege: Nach jeder gelungenen Aktion bewegen sich die anderen Angreifer, ihre Gegenspieler folgen ihnen.
  function shift(s, sc, rng) {
    const n = {}; Object.keys(sc.mark).forEach(a => { n[sc.mark[a]] = (n[sc.mark[a]] || 0) + 1; });
    players(s, atkSide(sc)).forEach(c => {
      if (c.id === sc.carrier) return;
      const t = lerp(P(sc, c.id), GOAL, 0.06);
      sc.pos[c.id] = [clamp(t[0] + (rng() - 0.5) * 40, 30, 330), clamp(t[1] + (rng() - 0.5) * 26, 90, 360)];
      const d = sc.mark[c.id]; if (n[d] > 1) return;       // im Konter deckt ein Verteidiger mehrere: er bleibt, wo er ist
      const mp = lerp(sc.pos[c.id], GOAL, 0.22 + rng() * 0.12), side = sc.pos[c.id][0] < 170 ? 1 : -1;
      sc.pos[d] = [mp[0] + side * 18, mp[1] - 6];
    });
  }

  // --- Szenen ---
  /* Stellt eine Chance auf. kind: set (Positionsangriff, alle zehn im Angriffsdrittel), rush32, rush21 (Konter: nur ein Teil
     der Spieler ist vorne dabei, der Rest läuft hinterher) oder solo (Alleingang, führt direkt zum Schuss). */
  function makeScene(s, rng, type, opt) {
    const o = opt || {}, kind = o.kind || 'set', as = type === 'att' ? 'you' : 'home', ds = other(as), c = s.cfg;
    const sc = { type, kind, step: 0, max: kind === 'set' ? (type === 'def' ? c.defSteps : c.maxSteps) : c.counterSteps, counter: kind !== 'set', pos: {}, mark: {}, carrier: null, intent: null, press: 0 };
    const byRole = side => { const m = {}; players(s, side).forEach(x => { m[x.role] = x; }); return m; };
    const A = byRole(as), D = byRole(ds);
    if (kind === 'set') {
      ROLES.forEach(r => { sc.pos[A[r].id] = jit(rng, FORM[r], 16); });
      ROLES.forEach(r => {
        const a = A[r], d = D[MARKS[r]], pa = sc.pos[a.id];
        sc.mark[a.id] = d.id;
        const mp = lerp(pa, GOAL, 0.2 + rng() * 0.14), side = pa[0] < 170 ? 1 : pa[0] > 190 ? -1 : (rng() < 0.5 ? -1 : 1);
        sc.pos[d.id] = jit(rng, [mp[0] + side * 20, mp[1] - 6], 5);   // leicht zur Mitte versetzt, damit sich die Namen nicht überdecken
      });
      sc.carrier = o.carrier && card(s, as, o.carrier) ? o.carrier : A[sample({ C: 0.3, LW: 0.2, RW: 0.2, LD: 0.15, RD: 0.15 }, rng)].id;
    } else {
      const nA = kind === 'rush32' ? 3 : kind === 'rush21' ? 2 : 1, nD = kind === 'rush32' ? 2 : kind === 'rush21' ? 1 : 0;
      const car = o.carrier && card(s, as, o.carrier) ? card(s, as, o.carrier) : A[sample({ C: 0.4, LW: 0.3, RW: 0.3 }, rng)];
      const mates = FWD.concat(BACK).map(r => A[r]).filter(x => x.id !== car.id), front = [car].concat(mates.slice(0, nA - 1)), trail = mates.slice(nA - 1);
      const backs = BACK.concat(FWD).map(r => D[r]), guard = backs.slice(0, nD), chase = backs.slice(nD), sx = rng() < 0.5 ? -1 : 1;
      const spots = kind === 'solo' ? [[180 + sx * 22, 142]] : kind === 'rush21' ? [[180 + sx * 46, 196], [180 - sx * 58, 178]] : [[180 + sx * 8, 208], [180 - sx * 86, 176], [180 + sx * 90, 182]];
      front.forEach((x, i) => { sc.pos[x.id] = jit(rng, spots[i], 9); });
      trail.forEach((x, i) => { sc.pos[x.id] = jit(rng, [84 + i * 64, 306 + (i % 2) * 26], 12); });
      (nD === 1 ? [[180 - sx * 6, 120]] : [[180 + sx * 36, 126], [180 - sx * 42, 114]]).slice(0, nD).forEach((p, i) => { sc.pos[guard[i].id] = jit(rng, p, 6); });
      chase.forEach((x, i) => { sc.pos[x.id] = jit(rng, [66 + i * 58, 250 + (i % 2) * 24], 10); });               // laufen hinterher
      // Gegenspieler: für die vorne der nächste Verteidiger, der noch hinten ist, für die Nachrückenden ein Verfolger
      players(s, as).forEach(x => {
        const pool = front.indexOf(x) !== -1 && guard.length ? guard : chase.length ? chase : guard; let b = pool[0], bd = Infinity;
        pool.forEach(d => { const v = dist(sc.pos[x.id], sc.pos[d.id]); if (v < bd) { bd = v; b = d; } });
        sc.mark[x.id] = b.id;
      });
      sc.carrier = car.id;
    }
    sc.bar = newBar(rng);
    s.cur = sc;
    if (type === 'def') aiIntent(s, rng);
    s.phase = 'decide';
  }
  // Plan des Gegners in der Abwehrszene. Er schiesst eher aus guter Position, passt eher zu freien Mitspielern.
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

  // --- Timing-Balken ---
  /* Grundlage ist die Chance p aus dem Wertevergleich (Pass gegen Antizipation, Dribbling gegen Zweikampf, Schuss gegen
     Block, in der Abwehr umgekehrt). Daraus wird die Breite des grünen Felds: Ein durchschnittlicher Spieler trifft es etwa
     so oft wie p. Wer genauer tippt, trifft öfter, und bessere Karten machen das Feld breiter. hit ist die Stelle des
     Strichs beim Tippen, 0 bis 1. Note: perfect (im Kern), good (im Feld), near (knapp daneben: halber Erfolg),
     bad (daneben), gross (grob daneben: im Angriff Konter für den Gegner). */
  function erfinv(x) { const a = 0.147, l = Math.log(1 - x * x), t = 2 / (Math.PI * a) + l / 2; return Math.sign(x) * Math.sqrt(Math.sqrt(t * t - l / a) - t); }
  const zone = (cfg, p) => clamp(2 * Math.SQRT2 * cfg.barRef / cfg.barSweep * erfinv(clamp(p, 0.03, 0.985)), cfg.barMin, cfg.barMax);
  function grade(cfg, hit, pos, w) { const d = Math.abs(hit - pos); return d <= w * cfg.barCore / 2 ? 'perfect' : d <= w / 2 ? 'good' : d <= w / 2 + cfg.barNear ? 'near' : d <= w / 2 + cfg.barGross ? 'bad' : 'gross'; }
  const newBar = rng => ({ pos: 0.18 + rng() * 0.64, start: rng() });
  const hitOk = a => typeof a.hit === 'number' && isFinite(a.hit) && a.hit >= 0 && a.hit <= 1;
  // Wer abwehrt und wie gut. Für Anzeige und Auflösung.
  function defChoice(s, sc, action, target) {
    const X = card(s, 'home', sc.carrier);
    let D, kind, stat, tr;
    if (action === 'press') { D = nearest(s, sc, 'you', P(sc, X.id)).c; kind = 'dribble'; stat = 'zwei'; tr = 'kampf'; }
    else if (action === 'block') { let b = null, bd = Infinity; players(s, 'you').forEach(c => { const d = distSeg(P(sc, c.id), P(sc, X.id), GOAL); if (d < bd) { bd = d; b = c; } }); D = b; kind = 'shoot'; stat = 'block'; tr = 'wand'; }
    else { D = card(s, 'you', sc.mark[target]) || nearest(s, sc, 'you', P(sc, target)).c; kind = 'pass'; stat = 'pass'; tr = 'anti'; }
    const atkV = kind === 'shoot' ? shotVal(X) : kind === 'pass' ? passVal(X) : dribVal(X), dv = stanceVal(D, stat), c = s.cfg;
    const bonus = (has(D, tr) ? c.traitBonus : 0) - (kind === 'shoot' && has(X, 'kanone') || kind === 'pass' && has(X, 'passer') || kind === 'dribble' && has(X, 'dribbler') ? c.traitBonus : 0);
    return { D, kind, atkV, dv, trait: has(D, tr) ? tr : null, p: clamp(c.stopRight + (dv - atkV) * c.stopSlope + bonus, c.stopMin, c.stopMax) };
  }
  // Abwehr: Der Plan des Gegners ist sichtbar, der passende Verteidiger reagiert von selbst. Offen ist nur das Timing.
  const ANSWER = { shoot: 'block', pass: 'lane', dribble: 'press' };
  function defInfo(s, sc) {
    const it = sc.intent, action = ANSWER[it.kind], ch = defChoice(s, sc, action, it.to);
    const p = ch.p * (it.kind === 'shoot' ? s.cfg.defBlock : s.cfg.defScale);
    return { action, D: ch.D, kind: it.kind, to: it.to || null, atkV: ch.atkV, dv: ch.dv, trait: ch.trait, p, w: zone(s.cfg, p) };
  }
  /* Balken für eine Aktion in der laufenden Szene: Chance p, Feldbreite w, Lage des Felds pos, Gegenspieler by.
     free: freier Schuss ohne Balken. a: { type: 'shoot' | 'pass' | 'dribble', to }, in der Abwehr egal. */
  function contest(s, a) {
    const sc = s.cur, X = sc.carrier, c = s.cfg;
    if (sc.type === 'def') { const d = defInfo(s, sc); return { p: d.p, w: d.w, pos: sc.bar.pos, start: sc.bar.start, by: d.D.id, free: false, sweep: Math.round(c.barSweep * tired(c, d.D)) }; }
    let p, by, free = false;
    if (a.type === 'shoot') { const sh = shotInfo(s, sc, X); p = 1 - sh.block; by = sh.by; free = true; }      // der Schuss hat seinen eigenen Balken
    else if (a.type === 'pass') { const pi = passInfo(s, sc, X, a.to); p = 1 - pi.risk; by = pi.by; }
    else { const di = dribInfo(s, sc, X); p = di.p; by = di.by; }
    return { p, w: free ? 1 : zone(c, p), pos: sc.bar.pos, start: sc.bar.start, by, free, sweep: Math.round(c.barSweep * tired(c, card(s, 'you', X))) };
  }

  // --- Schuss auf das Tor ---
  const zoneOf = (x, y) => (y >= 0.5 ? 't' : 'b') + (x < -0.34 ? 'l' : x > 0.34 ? 'r' : 'm');
  // Liegt der Ball in der gewählten Zone? Mit etwas Spielraum an den Grenzen: dort hält jede der beiden Zonen.
  function inZone(land, z, e) {
    const x = land[0], y = land[1], col = z[1] === 'l' ? x < -0.34 + e : z[1] === 'r' ? x > 0.34 - e : x > -0.34 - e && x < 0.34 + e;
    return col && (z[0] === 't' ? y >= 0.5 - e * 0.8 : y < 0.5 + e * 0.8);
  }
  // Streuung eines gegnerischen Schützen aus einer Lage q: Radius um sein Ziel
  function spread(s, X, q) { const c = s.cfg; return (c.sdBase + c.sdSkill * clamp((99 - shotVal(X)) / 27, 0, 1) + c.sdDist * (1 - q)) * (1 + c.enSpread * (1 - clamp(X.en === undefined ? 100 : X.en, 0, 100) / 100)); }
  // Zufälliger Punkt im Kreis, gleichmässig verteilt. Die Höhe ist gestaucht, damit der Kreis auf dem Bildschirm rund ist.
  function inDisc(rng, rad) { const r = rad * Math.sqrt(rng()), a = 2 * Math.PI * rng(); return [r * Math.cos(a), r * Math.sin(a) * 0.69]; }
  function missOf(c, land) {
    const ax = Math.abs(land[0]);
    if (ax < 1 && land[1] < 1) return null;
    const post = (ax >= 1 && ax < 1 + c.post && land[1] < 1 + c.post) || (land[1] >= 1 && land[1] < 1 + c.post && ax < 1 + c.post);
    return post ? 'post' : land[1] >= 1 ? 'high' : 'wide';
  }
  function favZone(id) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return ['tl', 'br', 'tr', 'bl', 'bm'][h % 5]; }
  // Breite des freien Felds neben dem Goalie für deinen Schuss. top: hoher Ball (über 0.62), dort ist etwas mehr frei.
  function freeW(s, sh, top) {
    const c = s.cfg, X = card(s, 'you', sh.x);
    return clamp(c.free + c.freeDist * sh.q + (shotVal(X) - s.teams.home.goalie.val) * c.freeVal + (has(X, 'kanone') ? c.freeTrait : 0) + (sh.ctx === 'counter' ? 0.05 : 0) + (top ? c.freeTop : 0), c.freeMin, c.freeMax);
  }
  // Reichweite des Goalies links und rechts von seiner Stelle: Was näher bei ihm landet, hält er.
  function reach(s, sh, top) { return 1 + Math.abs(sh.keeper.x) - freeW(s, sh, top); }
  /* Schuss-Balken für deinen laufenden Schuss. Das Feld liegt in der Mitte: breit aus der Nähe, schmal aus der Distanz und
     unter Druck (Gegner nah).
     sweep ist die Dauer eines Durchlaufs in ms: kürzer, also schneller, bei schwachem Abschluss und bei wenig Energie. */
  function shotBar(s) {
    const c = s.cfg, sh = s.shot, X = card(s, 'you', sh.x);
    const tempo = clamp(1 + (shotVal(X) - 88) * c.shotTempo, c.tempoMin, c.tempoMax) * (has(X, 'kanone') ? 1.15 : 1) * tired(c, X);
    return { w: clamp((c.shotW + c.shotWq * sh.q) * (1 - c.shotPress * clamp(sh.block / 0.75, 0, 1)), c.shotWMin, c.barMax), pos: 0.5, start: sh.start, sweep: Math.round(Math.max(c.sweepMin, c.barSweep * tempo)), pressed: sh.block >= c.blockFree, by: sh.by };
  }
  // Vorschau für einen Schuss von Spieler id aus der laufenden Szene: Lage, Druck, freies Feld (hoch) und Schuss-Balken
  function shotPreview(s, id) {
    const sc = s.cur, si = shotInfo(s, sc, id), sh = { side: 'you', x: id, q: si.q, ctx: sc.counter ? 'counter' : 'attack', block: si.block, by: si.by, start: 0 };
    const b = shotBar(Object.assign({}, s, { shot: sh }));
    return { q: si.q, block: si.block, by: si.by, free: freeW(s, sh, true), sweep: b.sweep, w: b.w, pressed: b.pressed };
  }
  /* Bereitet einen Schuss vor.
     Dein Schuss: Der Goalie steht leicht auf einer Seite (keeper.x). block und by: Druck des nächsten Gegners.
     Schuss des Gegners: Ziel, Härte und Streuung stehen sofort fest, damit die Flugbahn ehrlich gezeigt werden kann.
     window ist die Zeit in ms, bis der Ball im Tor ist. Deine Verteidiger (Block) geben dir mehr Zeit. */
  function setShot(s, rng, side, x, q, ctx, opt) {
    const c = s.cfg, X = card(s, side, x), sh = { side, x, q, ctx }, o = opt || {};
    if (side === 'home') {
      const w = {}; ZONES.forEach(z => { w[z] = 0.11; }); w[favZone(x)] = 0.45;
      const zc = ZC[sample(w, rng)], power = c.aiPowMin + rng() * (0.95 - c.aiPowMin), target = [zc[0] + (rng() - 0.5) * 0.24, zc[1] + (rng() - 0.5) * 0.2];
      const off = inDisc(rng, spread(s, X, q) * (has(X, 'kanone') ? c.traitShot : 1));
      const land = [target[0] + off[0], Math.max(0.03, target[1] + off[1])];
      drain(X, c.enShot);
      const defs = players(s, 'you').filter(d => d.role === 'LD' || d.role === 'RD'), dv = ctx === 'so' ? 93 : defs.reduce((a, d) => a + stanceVal(d, 'block'), 0) / defs.length;
      sh.power = power; sh.land = land; sh.miss = missOf(c, land); sh.zone = zoneOf(clamp(land[0], -0.99, 0.99), Math.min(0.99, land[1])); sh.dv = dv;
      sh.window = Math.round(clamp(c.rxBase - c.rxPow * (power - 0.5) - (shotVal(X) - 88) * c.rxVal + (dv - 93) * c.rxVal + c.rxDist * (1 - q)
        - (ctx === 'counter' ? c.rxCounter : 0) - (has(X, 'kanone') ? c.rxTrait : 0) + (o.press || 0), c.rxMin, c.rxMax));
      sh.press = o.press || 0;
    } else {
      sh.block = o.block || 0; sh.by = o.by || null; sh.start = rng();
      sh.keeper = { x: (rng() < 0.5 ? -1 : 1) * (c.kOffMin + rng() * (c.kOffMax - c.kOffMin)) };
    }
    s.shot = sh; s.phase = 'aim';
  }

  // --- Ablauf ---
  /* setup: { homeName, cfg, you: { goalie, cards }, home: { goalie, cards } }. Je 5 Karten, 2 Verteidiger und 3 Stürmer. */
  function lineup(cards) {
    const byOvr = (x, y) => y.ovr - x.ovr, def = cards.filter(c => c.pos === 'DEF').sort(byOvr).slice(0, 2), att = cards.filter(c => c.pos !== 'DEF').sort(byOvr).slice(0, 3);
    while (def.length < 2) def.push(att.pop());
    const r = ['LD', 'RD'], a = ['C', 'LW', 'RW'];
    return def.map((c, i) => Object.assign({}, c, { role: r[i], en: 100 })).concat(att.map((c, i) => Object.assign({}, c, { role: a[i], en: 100 })));
  }
  function newMatch(setup, rng) {
    const cfg = setup.cfg || CFG;
    const s = {
      cfg, homeName: setup.homeName || '', teams: { you: { goalie: Object.assign({}, setup.you.goalie), cards: lineup(setup.you.cards) }, home: { goalie: Object.assign({}, setup.home.goalie), cards: lineup(setup.home.cards) } },
      period: 0, clock: 0, from: 0, minute: 0, perChances: 0, tactic: { you: TACTICS[setup.tactic] ? setup.tactic : 'bal', home: 'bal' }, chances: { you: 0, home: 0 },
      score: { you: 0, home: 0 }, cur: null, fill: null, shot: null, phase: 'decide', pen: null, outcome: null, results: [],
      stats: { att: 0, def: 0, shots: 0, goals: 0, faced: 0, onGoal: 0, saved: 0, passes: 0, passOk: 0, dribbles: 0, dribOk: 0, stops: 0, counters: 0, bars: 0, hits: 0, perfects: 0, nears: 0 }
    };
    s.val = { you: { att: attackVal(s.teams.you.cards), def: defenceVal(s.teams.you.cards) }, home: { att: attackVal(s.teams.home.cards), def: defenceVal(s.teams.home.cards) } };
    advance(s, rng, null);
    return s;
  }
  // Chancen pro Minute für beide Seiten: Angriff gegen Abwehr, mal die eigene Taktik, mal wie offen der Gegner steht
  function rates(s) {
    const c = s.cfg, r = side => c.chanceBase * Math.exp(c.chanceK * (s.val[side].att - s.val[other(side)].def)) * TACTICS[s.tactic[side]].own * TACTICS[s.tactic[other(side)]].open;
    return { you: r('you'), home: r('home') };
  }
  // Der Gegner stellt um: im Rückstand offensiv (spät oder ab zwei Toren), mit Vorsprung defensiv
  function aiTactic(s) { const d = s.score.home - s.score.you, late = s.period >= s.cfg.periods - 1; return d < 0 && (late || d <= -2) ? 'off' : d >= 2 || (d > 0 && late) ? 'def' : 'bal'; }
  // Art der Chance. Gegen ein offensives Team gibt es mehr Konter, gegen ein defensives fast nur Positionsangriffe.
  function pickKind(s, rng, side) {
    const open = s.tactic[other(side)];
    const w = open === 'off' ? { set: 0.36, rush32: 0.28, rush21: 0.26, solo: 0.1 } : open === 'def' ? { set: 0.74, rush32: 0.14, rush21: 0.09, solo: 0.03 } : { set: 0.56, rush32: 0.21, rush21: 0.17, solo: 0.06 };
    if (s.tactic[side] === 'def') { w.set -= 0.12; w.rush32 += 0.06; w.rush21 += 0.06; }
    return sample(w, rng);
  }
  // Beginnt eine Chance. Ein Alleingang führt direkt zum Schuss. open: das Spiel davor (nur zum Zeigen).
  function startChance(s, rng, side, kind, carrier, quiet) {
    const type = side === 'you' ? 'att' : 'def';
    s.chances[side]++; if (type === 'att') s.stats.att++; else s.stats.def++;
    ['you', 'home'].forEach(sd => { const k = s.cfg.enChance * (s.tactic[sd] === 'off' ? s.cfg.enTacOff : s.tactic[sd] === 'def' ? s.cfg.enTacDef : 1); players(s, sd).forEach(c => drain(c, k)); });
    makeScene(s, rng, type, { kind, carrier });
    s.cur.open = quiet ? [] : openPlay(s, rng, side, s.cur.carrier);
    if (kind === 'solo') setShot(s, rng, side, s.cur.carrier, Math.max(0.8, shotInfo(s, s.cur, s.cur.carrier).q), 'counter');
  }
  /* Lässt die Uhr laufen bis zur nächsten Chance oder bis zum Drittelsende. Die Zeit bis zur nächsten Chance ist zufällig,
     im Schnitt umso kürzer, je mehr Chancen beide Seiten nach Werten und Taktik haben. */
  function advance(s, rng, ev) {
    const c = s.cfg, end = (s.period + 1) * c.periodMin, was = s.tactic.home;
    s.tactic.home = aiTactic(s); if (ev && was !== s.tactic.home) ev.push({ t: 'tactic', side: 'home', value: s.tactic.home });
    const r = rates(s), tot = r.you + r.home, t = s.clock + Math.max(c.chanceGap, -Math.log(1 - rng()) / tot);
    s.from = s.clock; s.fill = null;
    if (t >= end - 0.4 || s.perChances >= c.maxPerPeriod) {
      s.clock = end; s.minute = end; s.cur = null; s.fill = openPlay(s, rng, null, null);
      if (ev) ev.push({ t: 'period', period: s.period });
      if (s.period < c.periods - 1) { s.phase = 'break'; return; }
      if (s.score.you === s.score.home) { s.pen = { you: 0, home: 0, shots: { you: 0, home: 0 }, results: [] }; penShot(s, rng); } else finish(s);
      return;
    }
    s.clock = t; s.minute = Math.max(1, Math.ceil(t)); s.perChances++;
    const side = rng() < r.you / tot ? 'you' : 'home';
    startChance(s, rng, side, pickKind(s, rng, side));
  }
  /* Offenes Spiel vor der Szene, ohne Eingriff des Users: Pässe, Ballverluste, Distanzschüsse. Das schwächere Team verliert
     den Ball öfter. Endet, wenn das Team der Szene nah genug vor dem Tor ist, mit dem Pass zum Ballführenden der Szene.
     depth: 1 tief in der eigenen Hälfte, 0 in der Schlüsselposition. Reine Erzählung: entscheidet kein Tor. */
  function openPlay(s, rng, target, carrier) {
    const ev = [], str = side => strength(players(s, side)), pick = side => { const l = players(s, side); return l[Math.floor(rng() * l.length)].id; };
    const back = side => { const l = players(s, side).filter(c => c.role === 'LD' || c.role === 'RD'); return l[Math.floor(rng() * l.length)].id; };
    let side = rng() < 0.5 ? 'you' : 'home', holder = back(side), depth = 0.95, n = 0;
    const minN = 2 + Math.floor(rng() * 2);
    while (n < 7) {
      if (n >= minN && (target ? side === target && depth <= 0.4 : n >= minN + 1)) break;
      n++;
      const lose = clamp(0.18 + (str(other(side)) - str(side)) * 0.05, 0.06, 0.4) + (depth < 0.45 ? 0.06 : 0);
      if (rng() < lose) {
        const by = pick(other(side));
        ev.push({ kind: rng() < 0.55 ? 'intercept' : 'tackle', side, from: holder, by, depth });
        side = other(side); holder = by; depth = 0.7 + rng() * 0.25; continue;
      }
      if (depth < 0.5 && rng() < 0.2) {
        ev.push({ kind: rng() < 0.6 ? 'save' : 'wide', side, from: holder, depth });
        side = other(side); holder = back(side); depth = 0.95; continue;
      }
      const mates = players(s, side).filter(c => c.id !== holder), to = mates[Math.floor(rng() * mates.length)].id;
      depth = Math.max(0.05, depth - (0.22 + rng() * 0.22));
      ev.push({ kind: 'pass', side, from: holder, to, depth }); holder = to;
    }
    if (!target) return ev;                                 // Spiel ohne Chance: läuft bis zum Drittelsende
    if (side !== target) { const by = pick(target); ev.push({ kind: 'intercept', side, from: holder, by, depth }); side = target; holder = by; depth = 0.45; }
    if (holder !== carrier) ev.push({ kind: 'pass', side, from: holder, to: carrier, depth: 0, final: true });
    else ev.push({ kind: 'hold', side, from: holder, depth: 0, final: true });
    return ev;
  }
  const closeChance = (s, goal) => { s.results.push({ type: s.cur.type, kind: s.cur.kind, goal: goal || null, minute: s.minute }); };
  function endScene(s, ev, why) {
    const goal = s.cur.goal || null;
    closeChance(s, goal);
    ev.push({ t: 'end', why, goal });
    s.cur.done = true; s.phase = 'done';
  }
  /* Ballverlust. Nur ein grober Fehler (weit neben dem Feld) gibt dem Gegner den Konter. Der ist eine neue Chance für ihn:
     meist in Überzahl gegen deine Verteidiger, nur selten allein vor dem Tor. */
  function lost(s, rng, ev, by, counter) {
    if (!counter) return endScene(s, ev, 'lost');
    const kind = sample({ rush32: 0.42, rush21: 0.42, solo: 0.16 }, rng);
    ev.push({ t: 'counter', side: 'home', x: by, kind });
    closeChance(s, null);
    startChance(s, rng, 'home', kind, by, true);
  }
  const tally = (s, g) => { s.stats.bars++; if (g === 'perfect' || g === 'good') s.stats.hits++; if (g === 'perfect') s.stats.perfects++; if (g === 'near') s.stats.nears++; };
  /* Angriff. perfekt: Vorteil (freier Empfänger, mehr Raum, genauerer Schuss). im Feld: gelungen. knapp daneben: halb
     gelungen (Pass kommt an, aber der Gegenspieler steht eng; Dribbling ohne Raumgewinn; Schuss gestört und streut stärker).
     daneben: Ball weg. grob daneben: Ball weg und Konter für den Gegner. */
  function attAction(s, rng, ev, a) {
    const sc = s.cur, X = sc.carrier, me = card(s, 'you', X);
    if (a.type !== 'shoot' && sc.step >= sc.max - 1) return false;      // letzte Aktion der Szene: nur noch Schuss
    if (a.type === 'pass' && (!card(s, 'you', a.to) || a.to === X)) return false;
    const c = contest(s, a); if (!c.free && !hitOk(a)) return false;
    const g = c.free ? 'good' : grade(s.cfg, a.hit, c.pos, c.w), ok = g === 'perfect' || g === 'good' || g === 'near', D = card(s, 'home', c.by);
    if (!c.free) tally(s, g);
    if (a.type === 'shoot') {
      const sh = shotInfo(s, sc, X);
      ev.push({ t: 'shootStart', x: X, q: sh.q, block: sh.block, by: sh.by, av: shotVal(me), dv: stanceVal(D, 'block'), trait: has(me, 'kanone') ? 'kanone' : null, btrait: has(D, 'wand') ? 'wand' : null });
      setShot(s, rng, 'you', X, sh.q, sc.counter ? 'counter' : 'attack', { block: sh.block, by: sh.by }); return;
    }
    if (a.type === 'pass') {
      s.stats.passes++; drain(me, s.cfg.enPass); drain(card(s, 'you', a.to), s.cfg.enRecv);
      ev.push({ t: 'pass', from: X, to: a.to, ok, grade: g, w: c.w, risk: 1 - c.p, by: c.by, av: passVal(me), dv: stanceVal(D, 'pass'), trait: has(me, 'passer') ? 'passer' : null, dtrait: has(D, 'anti') ? 'anti' : null });
      if (!ok) { sc.pos[c.by] = lerp(P(sc, X), P(sc, a.to), 0.5); return lost(s, rng, ev, c.by, g === 'gross'); }
      s.stats.passOk++;
      // Der Gegenspieler des Empfängers: nach einem perfekten Pass weit weg, sonst einen Schritt zu spät, nach einem knappen Pass eng dran
      const m = sc.mark[a.to]; sc.pos[m] = lerp(P(sc, m), lerp(P(sc, a.to), GOAL, 0.15), g === 'perfect' ? -0.7 : g === 'near' ? 0.92 : 0.4);
      sc.carrier = a.to; shift(s, sc, rng); sc.step++; sc.bar = newBar(rng); return;
    }
    s.stats.dribbles++; drain(me, s.cfg.enDrib);
    ev.push({ t: 'dribble', x: X, by: c.by, ok, grade: g, w: c.w, p: c.p, av: dribVal(me), dv: stanceVal(D, 'zwei'), trait: has(me, 'dribbler') ? 'dribbler' : null, dtrait: has(D, 'kampf') ? 'kampf' : null });
    if (!ok) return lost(s, rng, ev, c.by, g === 'gross');
    if (g !== 'near') {
      s.stats.dribOk++;
      // Vorbei: ein Stück näher ans Tor, der Gegenspieler steht dahinter. Perfekt: noch näher.
      const p = P(sc, X), to = lerp(p, GOAL, clamp((g === 'perfect' ? 100 : 70) / dist(p, GOAL), 0.2, 0.62));
      sc.pos[X] = [to[0] + (p[0] < 180 ? 14 : -14), Math.max(80, to[1])];
      sc.pos[c.by] = [P(sc, c.by)[0], P(sc, c.by)[1] + (g === 'perfect' ? 70 : 46)];
    }
    shift(s, sc, rng); sc.step++; sc.bar = newBar(rng);
  }
  /* Abwehr: ein Balken pro Aktion des Gegners. Nur genau in der Mitte (perfekt) gewinnst du den Ball, daraus wird ein
     Konter. Sonst kommt der Gegner durch, aber je besser du triffst, desto stärker ist er gestört: im Feld deutlich, knapp
     daneben etwas. Die Störung summiert sich über die Szene und gibt deinem Goalie beim Schuss mehr Zeit (press, in ms).
     Grob daneben kostet Zeit. */
  function defAction(s, rng, ev, a) {
    const sc = s.cur, X = card(s, 'home', sc.carrier), it = sc.intent, c = s.cfg;
    if (!hitOk(a)) return false;
    const d = defInfo(s, sc), D = d.D, g = grade(c, a.hit, sc.bar.pos, d.w), won = g === 'perfect';
    const gain = g === 'good' ? c.pressGood : g === 'near' ? c.pressNear : g === 'gross' ? -c.rxLate : 0;
    tally(s, g); drain(D, c.enDef);
    sc.press = (sc.press || 0) + gain;
    ev.push({ t: 'defend', action: d.action, target: it.to || null, intent: it, by: D.id, x: X.id, stopped: won, grade: g, gain, w: d.w, av: d.atkV, dv: d.dv, trait: d.trait });
    if (won) {
      const kind = sample({ rush32: 0.5, rush21: 0.4, solo: 0.1 }, rng);
      s.stats.stops++; s.stats.counters++; ev.push({ t: 'counter', side: 'you', x: D.id, kind });
      closeChance(s, null); startChance(s, rng, 'you', kind, D.id, true); return;
    }
    if (it.kind === 'shoot') { setShot(s, rng, 'home', X.id, shotInfo(s, sc, X.id).q, 'attack', { press: sc.press }); return; }
    const tight = g === 'good' ? 1 : g === 'near' ? 0.5 : 0;      // gestört: Empfänger enger gedeckt, weniger Raumgewinn
    if (it.kind === 'pass') { const m = sc.mark[it.to]; sc.pos[m] = lerp(P(sc, m), P(sc, it.to), 0.3 + 0.55 * tight); sc.carrier = it.to; }
    else { const p = P(sc, X.id), to = lerp(p, GOAL, clamp((70 - 40 * tight) / dist(p, GOAL), 0.08, 0.55)); sc.pos[X.id] = [to[0], Math.max(80, to[1])]; sc.pos[D.id] = [P(sc, D.id)[0], P(sc, D.id)[1] + 40 - 30 * tight]; }
    shift(s, sc, rng);
    sc.step++; sc.bar = newBar(rng);
    aiIntent(s, rng);
  }
  /* Schuss auflösen.
     Dein Schuss { target, hit }: hit ist die Stelle des Strichs auf dem Schuss-Balken (siehe shotBar). Daraus ergibt sich,
     wie weit der Ball vom Ziel abweicht. Der Goalie hält, was innerhalb seiner Reichweite um seine Stelle landet.
     Schuss des Gegners { zone, rt }: gehalten, wenn du rechtzeitig (rt ms nach dem Abschluss) die richtige Zone antippst. */
  function shoot(s, rng, ev, a) {
    const sh = s.shot, c = s.cfg, X = card(s, sh.side, sh.x); let r;
    if (sh.side === 'you') {
      if (!a.target || !isFinite(a.target[0]) || !isFinite(a.target[1]) || !hitOk(a)) return false;
      const target = [clamp(+a.target[0], -1.2, 1.2), clamp(+a.target[1], 0.03, 1.2)], b = shotBar(s), e = a.hit - b.pos, d = Math.abs(e), g = grade(c, a.hit, b.pos, b.w);
      tally(s, g); drain(X, c.enShot);
      // Unter Druck und klar daneben: der Gegner blockt den Schuss
      if (b.pressed && (g === 'bad' || g === 'gross')) {
        ev.push({ t: 'shot', side: 'you', x: sh.x, ctx: sh.ctx, q: sh.q, result: 'blocked', grade: g, dir: e < 0 ? -1 : 1, by: sh.by, target, kx: sh.keeper.x });
        s.stats.shots++; s.shot = null; s.phase = 'decide';
        if (sh.ctx === 'so') { const P_ = s.pen; P_.shots.you++; P_.results.push({ side: 'you', goal: false }); s.phase = 'done'; return; }
        return lost(s, rng, ev, sh.by, g === 'gross');
      }
      /* Abweichung vom Ziel: keine im Kern, am Rand des grünen Felds die halbe Breite des freien Felds, ausserhalb im selben
         Mass weiter. Wer in die Mitte des freien Felds zielt und den Strich im Feld stoppt, trifft also. Der Ball weicht auf
         die Seite ab, auf der der Strich neben der Mitte stand: Strich links, Ball weiter links. Dabei folgt er der Linie von
         der Tormitte zum Ziel: nach aussen steigt ein hoher Ball, nach innen kommt er dem Goalie näher. */
      const core = b.w * c.barCore / 2, dev = d <= core ? 0 : (d - core) / (b.w / 2 - core) * freeW(s, sh, target[1] > 0.62) / 2;
      const tx = target[0], ty = (target[1] - 0.45) / 0.69, tl = Math.hypot(tx, ty) || 1, hx = Math.max(Math.abs(tx) / tl, 0.6), hy = (tx < 0 ? -1 : 1) * ty / tl, hl = Math.hypot(hx, hy);
      const sg = e < 0 ? -1 : 1, land = [tx + sg * dev * hx / hl, Math.max(0.03, target[1] + sg * dev * hy / hl * 0.69)], miss = missOf(c, land);
      const kx = sh.keeper.x, R = reach(s, sh, land[1] > 0.62), dx = Math.abs(land[0] - kx);
      r = { land, zone: zoneOf(clamp(land[0], -0.99, 0.99), Math.min(0.99, land[1])), target, power: 0.6, kx, reach: R, grade: g, dir: sg, dev, miss, result: miss ? 'miss' : dx <= R ? (dx <= R * 0.35 ? 'catch' : 'save') : 'goal' };
    } else {
      const zn = ZONES.indexOf(a.zone) !== -1 ? a.zone : null, rt = typeof a.rt === 'number' && isFinite(a.rt) ? Math.max(0, a.rt) : Infinity;
      const right = !!zn && inZone(sh.land, zn, c.rxEdge), inTime = rt <= sh.window;
      r = { land: sh.land, zone: sh.zone, guess: zn, power: sh.power, rt: isFinite(rt) ? Math.round(rt) : null, window: sh.window, right, inTime, miss: sh.miss, result: sh.miss ? 'miss' : right && inTime ? (rt <= sh.window * 0.6 ? 'catch' : 'save') : 'goal' };
    }
    const goal = r.result === 'goal';
    if (sh.side === 'you') { s.stats.shots++; if (goal) s.stats.goals++; } else { s.stats.faced++; if (r.result === 'save' || r.result === 'catch') s.stats.saved++; if (!sh.miss) s.stats.onGoal++; }
    ev.push(Object.assign({ t: 'shot', side: sh.side, x: sh.x, ctx: sh.ctx, q: sh.q }, r));
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
  function next(s, rng, ev) {
    if (s.pen) { if (penOver(s.pen)) finish(s); else penShot(s, rng); return; }
    if (s.phase === 'break') { s.period++; s.perChances = 0; ['you', 'home'].forEach(sd => players(s, sd).forEach(c => drain(c, -s.cfg.enBreak))); }
    advance(s, rng, ev);
  }
  function finish(s) { s.outcome = s.pen ? (s.pen.you > s.pen.home ? 'penwin' : 'penloss') : (s.score.you > s.score.home ? 'win' : 'loss'); s.phase = 'end'; }

  /* Einziger Einstieg für Eingaben. Gibt einen neuen Zustand und die Ereignisse zurück, der alte bleibt unverändert.
     hit ist die Stelle des Strichs auf dem Timing-Balken beim Tippen (0 bis 1), siehe contest().
     Angriff:  { type: 'shoot', hit } | { type: 'pass', to, hit } | { type: 'dribble', hit }   freier Schuss: ohne hit
     Abwehr:   { type: 'defend', hit }
     Schuss:   { type: 'aim', target: [x, y], hit } eigener Schuss: Ziel im Tor und Stelle des Strichs auf dem Schuss-Balken
               { type: 'aim', zone, rt } Parade, rt in ms seit dem Abschluss des Gegners
     Taktik:   { type: 'tactic', value: 'def' | 'bal' | 'off' } jederzeit, gilt ab der nächsten Chance
     Weiter:   { type: 'next' } nach einer Chance oder in der Drittelspause: die Uhr läuft bis zur nächsten Chance */
  function act(state, a, rng) {
    const s = copy(state), ev = [];
    let ok = true;
    if (a.type === 'tactic') { if (TACTICS[a.value] && s.phase !== 'end') s.tactic.you = a.value; else ok = false; }
    else if (s.phase === 'decide' && s.cur.type === 'att' && ['shoot', 'pass', 'dribble'].indexOf(a.type) !== -1) ok = attAction(s, rng, ev, a) !== false;
    else if (s.phase === 'decide' && s.cur.type === 'def' && a.type === 'defend') ok = defAction(s, rng, ev, a) !== false;
    else if (s.phase === 'aim' && a.type === 'aim') ok = shoot(s, rng, ev, a) !== false;
    else if ((s.phase === 'done' || s.phase === 'break') && a.type === 'next') next(s, rng, ev);
    else ok = false;
    return ok ? { state: s, events: ev, ok: true } : { state, events: [], ok: false };
  }

  root.HKMatch = { TACTICS, KINDS, rates, attackVal, defenceVal, TRAITS, trait, defChoice, defInfo, contest, zone, grade, shotBar, shotPreview, tired, reach, freeW, setShot, inZone, FORM, MARKS, CFG, GOAL, ROLES, ZONES, ZC, zoneOf, newMatch, act, card, shotInfo, passInfo, dribInfo, stanceVal, dribVal, shotVal, passVal, strength, spread, favZone, penOver, atkSide, other, nearest, dist };
})(typeof window !== 'undefined' ? window : globalThis);
