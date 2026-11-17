/* Raum und Tiefe in der Match-Engine: Chancen, die hinten beginnen (Auslösung, Umschalten), langer Pass, Vorstoss,
   kein Dribbling direkt vor dem Tor. Regeln und Abläufe, ohne Browser. node test/field.test.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console, Math, JSON, Date, localStorage: { getItem: () => null, setItem: () => {} } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
['src/engine.js', 'src/world.js', 'src/lab/match.js', 'src/lab/pool.js', 'src/lab/club.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f }));
const M = ctx.HKMatch, C = ctx.HKClub, E = ctx.HK, pool = C.POOL, CFG = M.CFG;
let fails = 0; const ok = (c, t) => { console.log((c ? 'ok   ' : 'FEHLT') + ' ' + t); if (!c) fails++; };
const pc = v => Math.round(v * 100) + ' %', copy = s => { const t = JSON.parse(JSON.stringify(s)); t.cfg = s.cfg; return t; };
const fwd = pool.filter(c => c.pos !== 'DEF' && c.ovr >= 80 && c.ovr <= 88 && !M.trait(c)), def = pool.filter(c => c.pos === 'DEF' && c.ovr >= 80 && c.ovr <= 88 && !M.trait(c));
const setup = cfg => ({ cfg: cfg ? Object.assign({}, CFG, cfg) : undefined, homeName: 'Test', tactic: 'bal', you: { goalie: { val: 88 }, cards: fwd.slice(0, 3).concat(def.slice(0, 2)) }, home: { goalie: { val: 88 }, cards: fwd.slice(10, 13).concat(def.slice(6, 8)) } });
const goalDist = p => M.dist(p, M.GOAL);

/* Ein Match beginnt mit dem Bully. first: die erste Szene, wie sie nach einem Zeitsprung beginnt (eine Seite hat den Ball,
   die Art des Angriffs ist ausgelost). cfg: abweichende Werte, etwa seqGo [1, 1, 1] (das Spiel geht immer weiter). */
function first(seed, cfg) { const r = E.makeRng(seed), s = M.newMatch(setup(cfg), r), side = r() < 0.5 ? 'you' : 'home'; M.startChance(s, r, side, M.pickKind(s, r, side)); return s; }
/* Sucht eine Szene: beginnt Matches mit fester Folge von Zufallszahlen, bis die erste Szene passt.
   want(sc): Bedingung an die Szene. Gibt den Zustand zurück (Phase decide). */
function find(want, from, cfg) {
  for (let seed = from || 1; seed < (from || 1) + 4000; seed++) { const s = first(seed, cfg); if (s.cur && s.phase === 'decide' && want(s.cur, s)) return s; }
  throw new Error('keine passende Szene gefunden');
}
const isBuild = t => sc => sc.type === t && !!sc.deep && sc.deep.kind === 'build', isTurn = (t, k) => sc => sc.type === t && !!sc.deep && sc.deep.kind === 'turn' && (!k || sc.kind === k);
/* Stelle des Strichs für eine gewünschte Note auf dem Balken ct (Feld bei pos, Breite w) */
function hitFor(ct, g) {
  const c = CFG, off = g === 'perfect' ? 0 : g === 'good' ? ct.w * 0.4 : g === 'near' ? ct.w / 2 + c.barNear * 0.5 : g === 'bad' ? ct.w / 2 + c.barNear + (c.barGross - c.barNear) * 0.5 : ct.w / 2 + c.barGross + 0.04;
  const h = ct.pos + off <= 0.995 ? ct.pos + off : ct.pos - off;
  if (h < 0 || h > 1 || M.grade(c, h, ct.pos, ct.w) !== g) throw new Error('Note ' + g + ' ist auf diesem Balken nicht zu treffen');
  return h;
}
const passTo = (s, to, g, seed) => M.act(s, { type: 'pass', to, hit: hitFor(M.contest(s, { type: 'pass', to }), g) }, E.makeRng(seed || 5));
const carry = (s, g, seed) => { const ct = M.contest(s, { type: 'dribble' }); return M.act(s, ct.free ? { type: 'dribble' } : { type: 'dribble', hit: hitFor(ct, g) }, E.makeRng(seed || 5)); };
const ev = (x, t) => x.events.find(e => e.t === t);
// Ball weg ohne Konter: Der Gegner hat ihn und greift an, oder das Spiel kommt zur Ruhe
const gone = x => { const t = ev(x, 'turn'), e = ev(x, 'end'); return (!!t && t.side === 'home') || (!!e && e.calm && e.ball === 'home' && x.state.phase === 'done'); };
const shortMate = s => s.teams.you.cards.filter(c => c.id !== s.cur.carrier && c.id !== s.cur.deep.run).map(c => ({ id: c.id, p: M.contest(s, { type: 'pass', to: c.id }).p })).sort((a, b) => b.p - a.p)[0].id;

// --- Wo Chancen beginnen ---
{
  const n = { set: 0, build: 0, rush: 0, turn: 0, solo: 0 }; let spread = 0, deepN = 0;
  for (let seed = 1; seed <= 1500; seed++) {
    const s = first(seed), sc = s.cur; if (!sc) continue;
    if (sc.kind === 'solo') n.solo++; else if (sc.kind === 'set') n[sc.deep ? 'build' : 'set']++; else n[sc.deep ? 'turn' : 'rush']++;
    if (sc.deep) { deepN++; const ys = Object.keys(sc.pos).map(id => sc.pos[id][1]); if (ys.some(y => y < 400) && ys.some(y => y > 400)) spread++; }
  }
  const b = n.build / (n.build + n.set), t = n.turn / (n.turn + n.rush);
  ok(b > 0.35 && b < 0.6, `ein Teil der Positionsangriffe beginnt als Auslösung in der eigenen Hälfte: ${pc(b)}`);
  ok(t > 0.6 && t < 0.8, `die meisten Konter beginnen mit dem Umschalten hinten: ${pc(t)}`);
  ok(spread === deepN && deepN > 300, `im Aufbau stehen die Spieler über beide Hälften verteilt (${spread} von ${deepN} Szenen)`);
}

// --- Auslösung: Aufstellung ---
{
  const s = find(isBuild('att')), sc = s.cur, dp = sc.deep, X = M.card(s, 'you', sc.carrier), p = sc.pos[X.id], hi = sc.pos[dp.run], mk = sc.pos[sc.mark[X.id]];
  ok((X.role === 'LD' || X.role === 'RD') && p[1] > 600, `Auslösung: Ein Verteidiger hat den Ball tief in der eigenen Hälfte (${X.role}, y ${Math.round(p[1])})`);
  ok(hi[1] < 330 && goalDist(hi) < 300 && ['LW', 'RW'].indexOf(M.card(s, 'you', dp.run).role) >= 0, `ein Flügel läuft in die Tiefe, weit in der Hälfte des Gegners (y ${Math.round(hi[1])})`);
  ok(Math.abs(M.dist(p, mk) - CFG.pressGap.D) < 8 && mk[1] < p[1], 'der Gegner stört früh: Ein Gegenspieler steht vor dem Ballführenden');
  ok(!M.act(s, { type: 'shoot' }, E.makeRng(1)).ok && M.canDrib(s, sc), 'im Aufbau wird nicht geschossen; der Vorstoss mit dem Ball ist möglich');
  const pi = M.passInfo(s, sc, X.id, dp.run), partner = s.teams.you.cards.find(c => c.id !== X.id && (c.role === 'LD' || c.role === 'RD')), pp = M.passInfo(s, sc, X.id, partner.id);
  ok(pi.long && pi.len > 300 && !pp.long && pp.risk < 0.1 && pi.risk > 0.3 && pi.risk < 0.6, `der lange Pass ist riskant (${pc(1 - pi.risk)}), der Querpass zum Partner sicher (${pc(1 - pp.risk)})`);
  // Hoher Ball: Ein Gegner nah beim Passgeber fängt ihn nicht ab, einer beim Empfänger schon
  const other = s.teams.home.cards.find(c => c.id !== sc.mark[X.id] && c.id !== sc.mark[dp.run]), s1 = copy(s), s2 = copy(s), lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  s1.cur.pos[other.id] = lerp(p, hi, 0.25); s2.cur.pos[other.id] = lerp(p, hi, 0.85);
  const far0 = copy(s); far0.cur.pos[other.id] = [20, 780];
  const r0 = M.passInfo(far0, far0.cur, X.id, dp.run).risk, r1 = M.passInfo(s1, s1.cur, X.id, dp.run).risk, r2 = M.passInfo(s2, s2.cur, X.id, dp.run).risk;
  ok(Math.abs(r1 - r0) < 1e-9 && r2 > r0 + 0.15, `der lange Ball fliegt über Gegner beim Passgeber hinweg (${pc(r1)} wie ${pc(r0)}), beim Empfänger wird er abgefangen (${pc(r2)})`);
}

// --- Auslösung: was die Aktionen bringen ---
{
  const s = find(isBuild('att')), run = s.cur.deep.run;
  let x = passTo(s, run, 'perfect'), a = ev(x, 'arrive');
  ok(x.ok && a && a.how === 'through' && x.state.cur.kind === 'solo' && !x.state.cur.deep && x.state.phase === 'decide' && x.state.cur.carrier === run && goalDist(x.state.cur.pos[run]) < 160, 'langer Pass perfekt: Der Flügel ist allein durch, die Szene geht vor dem Tor weiter');
  ok(!M.canDrib(x.state, x.state.cur) && !M.act(x.state, { type: 'dribble', hit: 0.5 }, E.makeRng(1)).ok && M.act(x.state, { type: 'shoot' }, E.makeRng(1)).ok, 'allein vor dem Goalie gibt es kein Dribbling, nur Schuss oder Querpass');
  { const sc = x.state.cur, p = sc.pos[run]; ok(!s.teams.home.cards.some(c => { const q = sc.pos[c.id]; return q[1] < p[1] - 4; }), 'kein Gegner steht mehr zwischen ihm und dem Tor'); }
  x = passTo(s, run, 'good'); a = ev(x, 'arrive');
  ok(a && a.how === 'rush21' && !a.tight && x.state.cur.kind === 'rush21' && x.state.cur.max === CFG.counterSteps + 1 && x.state.cur.step === 0, 'langer Pass im Feld: 2 gegen 1, mit einer Aktion mehr als im Konter');
  x = passTo(s, run, 'near'); a = ev(x, 'arrive');
  ok(a && a.how === 'rush21' && a.tight && M.oneTimer(x.state.cur, run) === 0, 'langer Pass knapp: Er kommt an, aber der Verteidiger ist dran');
  x = passTo(s, run, 'bad');
  ok(x.ok && !ev(x, 'arrive') && !ev(x, 'counter') && gone(x) && ev(x, 'pass').long && !ev(x, 'pass').ok, 'langer Pass daneben: abgefangen, der Gegner hat den Ball (kein Konter)');
  x = passTo(s, run, 'gross'); let c = ev(x, 'counter');
  ok(c && c.side === 'home' && !c.near && x.state.cur.type === 'def', 'langer Pass grob daneben: Konter für den Gegner, von hinten heraus');
  // kurzer Pass: Der Ball läuft, alle stellen sich neu auf; nach zwei Aktionen steht die Abwehr
  const m1 = shortMate(s); x = passTo(s, m1, 'good');
  ok(x.ok && !ev(x, 'arrive') && x.state.cur.deep && x.state.cur.deep.n === 1 && x.state.cur.carrier === m1 && x.state.phase === 'decide', 'kurzer Pass: Der Aufbau geht weiter, mit dem Empfänger');
  const s2 = x.state, m2 = shortMate(s2); x = passTo(s2, m2, 'good'); a = ev(x, 'arrive');
  ok(a && a.how === 'set' && x.state.cur.kind === 'set' && !x.state.cur.deep && x.state.cur.max === CFG.settleSteps && Object.keys(x.state.cur.pos).every(id => x.state.cur.pos[id][1] < 400), 'nach zwei kurzen Pässen steht die Abwehr: Positionsangriff, alle in der Hälfte des Gegners');
  x = passTo(s2, s2.cur.deep.run, 'good');
  ok(ev(x, 'arrive') && ev(x, 'arrive').how === 'rush21', 'nach einem kurzen Pass geht der lange Ball immer noch');
  // Vorstoss
  x = carry(s, 'good'); a = ev(x, 'arrive');
  ok(!M.contest(s, { type: 'dribble' }).free && a && a.how === 'rush32' && x.state.cur.carrier === s.cur.carrier && x.state.cur.kind === 'rush32', 'Vorstoss am Gegner vorbei: 3 gegen 2, der Verteidiger führt den Ball selbst nach vorn');
  x = carry(s, 'near');
  ok(x.ok && !ev(x, 'arrive') && x.state.cur.deep && x.state.cur.deep.n === 1 && x.state.phase === 'decide', 'Vorstoss knapp: kein Raumgewinn, der Aufbau geht weiter');
  x = carry(s, 'gross'); c = ev(x, 'counter');
  ok(c && c.side === 'home' && c.near && x.state.cur.type === 'def' && !x.state.cur.deep, 'grober Fehler in der eigenen Hälfte: Der Gegner steht sofort vor deinem Tor');
  x = carry(s, 'bad');
  ok(x.ok && !ev(x, 'counter') && ev(x, 'turn') && ev(x, 'turn').near && x.state.cur.type === 'def' && x.state.cur.kind === 'set' && !x.state.cur.deep, 'Vorstoss daneben: Ball in der eigenen Hälfte verloren, der Gegner greift an (kein Konter in Überzahl)');
}

// --- Umschalten ---
{
  const s = find(isTurn('att', 'rush32')), sc = s.cur, run = sc.deep.run, X = sc.carrier, p = sc.pos[X];
  ok(p[1] > 480 && sc.pos[run][1] < 340 && s.teams.home.cards.filter(c => sc.pos[c.id][1] > p[1]).length === 3, 'Umschalten: Ball in der eigenen Hälfte gewonnen, ein Mitspieler läuft in die Tiefe, drei Gegner sind noch hinter dem Ball');
  const ct = M.contest(s, { type: 'dribble' });
  let x = carry(s), a = ev(x, 'arrive');
  ok(ct.free && x.ok && ev(x, 'carry') && a && a.how === 'rush32' && x.state.cur.max === CFG.counterSteps && x.state.cur.carrier === X && goalDist(x.state.cur.pos[X]) < 200, 'freie Bahn: Der Vorstoss braucht keinen Zweikampf, der Konter läuft 3 gegen 2 vors Tor');
  x = passTo(s, run, 'perfect'); a = ev(x, 'arrive');
  ok(a && a.how === 'through' && !a.tight, 'Steilpass perfekt: allein durch, kein Verfolger in der Nähe');
  const free = x.state;
  x = passTo(s, run, 'good'); a = ev(x, 'arrive');
  ok(a && a.how === 'through' && a.tight && goalDist(x.state.cur.pos[run]) > goalDist(free.cur.pos[run]) + 15, 'Steilpass im Feld: allein durch, aber mit einem Verfolger im Rücken und von weiter weg');
  x = passTo(s, run, 'near'); a = ev(x, 'arrive');
  ok(a && a.how === 'rush32' && a.tight, 'Steilpass knapp: Der Konter läuft weiter, der Verteidiger ist dran');
  x = passTo(s, run, 'bad');
  ok(gone(x) && !ev(x, 'arrive') && !ev(x, 'counter'), 'Steilpass daneben: Ball weg, der Gegner hat ihn');
  const back = s.teams.you.cards.find(c => c.id !== X && sc.pos[c.id][1] > p[1] + 20); x = passTo(s, back.id, 'good'); a = ev(x, 'arrive');
  ok(a && a.how === 'set', 'Rückpass im Konter: Der Konter ist abgebrochen, es geht als Positionsangriff weiter');
}

// --- Kein Dribbling direkt vor dem Tor ---
{
  const s = find(sc => sc.type === 'att' && sc.kind === 'set' && !sc.deep), sc = s.cur, at = d => { const t = copy(s); t.cur.pos[t.cur.carrier] = [180, 40 + d]; return t; };
  const near = at(CFG.dribNear - 10), far = at(CFG.dribNear + 40);
  ok(!M.canDrib(near, near.cur) && !M.act(near, { type: 'dribble', hit: near.cur.bar.pos }, E.makeRng(1)).ok && M.act(near, { type: 'shoot' }, E.makeRng(1)).ok, `${Math.round((CFG.dribNear - 10) / 18 * 10) / 10} Meter vor dem Tor: kein Dribbling, der Schuss geht`);
  ok(M.canDrib(far, far.cur) && M.act(far, { type: 'dribble', hit: far.cur.bar.pos }, E.makeRng(1)).ok, 'weiter weg wird wie bisher gedribbelt');
  // Der Gegner dribbelt vor dem Tor auch nicht
  let bad = 0, drib = 0;
  for (let seed = 1; seed <= 600; seed++) {
    let g = first(seed); const r = E.makeRng(seed + 7);
    for (let k = 0; k < 12 && g.cur && g.cur.type === 'def' && g.phase === 'decide'; k++) {
      const c = g.cur; if (c.intent.kind === 'dribble' && !c.deep) { drib++; if (goalDist(c.pos[c.carrier]) <= CFG.dribNear) bad++; }
      g = M.act(g, { type: 'defend', hit: (c.bar.pos + 0.5) % 1 }, r).state;
    }
  }
  ok(drib > 30 && bad === 0, `der Gegner dribbelt nie direkt vor dem Tor (${drib} Dribblings geprüft)`);
}

// --- Abwehr im Aufbau des Gegners ---
{
  const long = (sc, s) => !!sc.deep && sc.type === 'def' && !!sc.intent.long, s = find(long), d = M.defInfo(s, s.cur), X = s.cur.carrier;
  const hit = g => M.act(s, { type: 'defend', hit: hitFor({ pos: s.cur.bar.pos, w: d.w }, g) }, E.makeRng(3));
  let x = hit('good'), e = ev(x, 'defend'), c = ev(x, 'counter');
  ok(e.long && e.stopped && c && c.side === 'you' && x.state.cur.type === 'att' && x.state.cur.carrier === d.D.id, 'langer Pass des Gegners: Schon «Im Feld» fängt ihn ab, daraus wird dein Konter');
  ok(d.D.id === s.cur.mark[s.cur.intent.to], 'gegen den langen Pass verteidigt der Gegenspieler des Empfängers');
  x = hit('near'); let a = ev(x, 'arrive');
  ok(!ev(x, 'defend').stopped && a && a.side === 'home' && a.tight && a.how !== 'through', 'knapp gestört: Der Pass kommt an, aber dein Verteidiger ist dran');
  x = hit('gross'); a = ev(x, 'arrive');
  ok(a && a.how === 'through' && x.state.phase === 'aim' && x.state.shot.side === 'home' && x.state.shot.ctx === 'counter', 'grob daneben: Der Gegner ist allein durch und schiesst sofort');
  // kurzer Pass in der Auslösung: Im Feld gewinnt den Ball nicht, danach steht deine Abwehr
  const s2 = find((sc, st) => isBuild('def')(sc) && sc.intent.kind === 'pass' && !sc.intent.long), d2 = M.defInfo(s2, s2.cur);
  x = M.act(s2, { type: 'defend', hit: hitFor({ pos: s2.cur.bar.pos, w: d2.w }, 'good') }, E.makeRng(3)); a = ev(x, 'arrive');
  ok(!ev(x, 'defend').stopped && a && a.how === 'set' && x.state.cur.type === 'def' && x.state.cur.max === CFG.defSteps && x.state.cur.press > 0, 'kurzer Pass des Gegners: Im Feld stört nur; danach steht deine Abwehr, die Störung zählt weiter');
  x = M.act(s2, { type: 'defend', hit: s2.cur.bar.pos }, E.makeRng(3)); c = ev(x, 'counter');
  ok(ev(x, 'defend').stopped && c && c.near && x.state.cur.type === 'att' && (!x.state.cur.deep) && (x.state.phase === 'aim' || goalDist(x.state.cur.pos[x.state.cur.carrier]) < 260), 'perfekt im Aufbau des Gegners: Ball weit vorne gewonnen, die Chance beginnt direkt vor seinem Tor');
}

// --- Sequenzen: Der Ball bleibt im Spiel ---
const GO = { seqGo: [1, 1, 1, 1, 1, 1], outBlock: 0, outSave: 0 }, CALM = { seqGo: [0, 0, 0], outBlock: 0, outSave: 0 };      // ohne Ball im Aus (siehe Standards)
const zoneAtt = (sc, s) => sc.type === 'att' && sc.kind === 'set' && !sc.deep;
/* Stellt eine klare Lage vor dem Tor: der Ballführende im Slot mit freier Schussbahn, ein Mitspieler rechts vor dem Tor,
   ein Gegner links daneben (nicht in der Bahn), alle anderen weit weg. */
function clearLane(s0) {
  const s = copy(s0), sc = s.cur, you = s.teams.you.cards.filter(c => c.id !== sc.carrier), home = s.teams.home.cards;
  sc.pos[sc.carrier] = [180, 140]; sc.pos[you[0].id] = [236, 100]; [[60, 300], [300, 300], [180, 340]].forEach((p, i) => { sc.pos[you[i + 1].id] = p; });
  sc.pos[home[0].id] = [150, 118]; [[40, 250], [320, 250], [70, 330], [290, 330]].forEach((p, i) => { if (home[i + 1]) sc.pos[home[i + 1].id] = p; });      // in Unterzahl sind es nur vier
  sc.last = null; sc.reb = false; sc.waves = 0; return s;
}
// Schuss aus der laufenden Szene mit einem bestimmten Ausgang: perfekt gestoppt, das Ziel entscheidet
function shotAt(s, what, seed) {
  let x = M.act(s, { type: 'shoot' }, E.makeRng(seed || 3)); const g = x.state, sh = g.shot, R = M.reach(g, sh), k = sh.keeper.x;
  const tg = what === 'catch' ? [k, CFG.kY] : what === 'wide' ? [1.18, 0.5] : what === 'post' ? [1.03, 0.5] : what === 'goal' ? [k < 0 ? 0.95 : -0.95, 0.95] : null;
  if (tg) return M.act(g, { type: 'aim', target: tg, hit: 0.5, t: 0 }, E.makeRng(seed || 3));
  // Parade ohne Festhalten: ein Ziel suchen, das der Goalie gerade noch erreicht
  for (let dx = 0.3; dx < 1.6; dx += 0.02) for (const sg of [1, -1]) { const t = [k + sg * dx, CFG.kY], v = M.evalShot(g, t, 0.5, 0); if (!v.blocked && v.result === 'save') return M.act(g, { type: 'aim', target: t, hit: 0.5, t: 0 }, E.makeRng(seed || 3)); }
  throw new Error('keine Parade gefunden');
}
{
  // Anpfiff: Bully
  const s = M.newMatch(setup(), E.makeRng(4)), d = s.duel, cY = s.teams.you.cards.find(c => c.role === 'C'), cH = s.teams.home.cards.find(c => c.role === 'C');
  ok(s.phase === 'duel' && !s.cur && d && d.kind === 'faceoff' && d.you === cY.id && d.home === cH.id && s.clock === 0 && s.seq.n === 1, 'das Match beginnt mit dem Bully der beiden Center');
  ok(d.window >= CFG.foMin && d.window <= CFG.foMax && d.delay >= CFG.foDelay[0] && d.delay <= CFG.foDelay[1], `Bully: Zeitfenster ${d.window} ms, der Ball fällt nach ${d.delay} ms`);
  const strong = setup(), weak = setup(); strong.you.cards = strong.you.cards.map(c => Object.assign({}, c, { frm: 99, exp: 99 })); weak.you.cards = weak.you.cards.map(c => Object.assign({}, c, { frm: 60, exp: 60 }));
  const wS = M.newMatch(strong, E.makeRng(4)).duel.window, wW = M.newMatch(weak, E.makeRng(4)).duel.window;
  ok(wS > d.window && d.window > wW, `ein starker Center hat mehr Zeit (${wS} ms), ein schwacher weniger (${wW} ms)`);
  let x = M.act(s, { type: 'duel', rt: d.window - 5 }, E.makeRng(2)), e = ev(x, 'duel');
  ok(x.ok && e.won === 'you' && !e.clean && x.state.cur.type === 'att' && x.state.cur.kind === 'set' && x.state.phase === 'decide' && ['LD', 'RD'].indexOf(M.card(x.state, 'you', x.state.cur.carrier).role) >= 0, 'Bully rechtzeitig getippt: Du hast den Ball, ein Verteidiger baut den Angriff auf');
  x = M.act(s, { type: 'duel', rt: d.window * CFG.foClean - 5 }, E.makeRng(2)); e = ev(x, 'duel');
  ok(e.won === 'you' && e.clean && x.state.cur.type === 'att' && x.state.cur.kind === 'rush32' && !x.state.cur.deep, 'sehr schnell getippt: sauber gewonnen, der Ball geht sofort nach vorn (3 gegen 2)');
  x = M.act(s, { type: 'duel', rt: d.window + 5 }, E.makeRng(2)); e = ev(x, 'duel');
  ok(e.won === 'home' && x.state.cur.type === 'def' && x.state.cur.kind === 'set', 'zu spät getippt: Der Gegner hat den Ball und greift an');
  x = M.act(s, { type: 'duel', early: true }, E.makeRng(2)); e = ev(x, 'duel');
  ok(e.won === 'home' && e.early && x.state.cur.type === 'def' && x.state.cur.kind === 'rush32', 'zu früh getippt: Der Ball geht an den Gegner, der sofort in Überzahl kommt');
  ok(M.act(s, { type: 'duel' }, E.makeRng(2)).state.cur.type === 'def' && !M.act(s, { type: 'shoot' }, E.makeRng(2)).ok, 'gar nicht getippt gilt als zu spät; andere Eingaben sind beim Bully nicht möglich');
  ok(Math.abs(M.act(s, { type: 'duel', rt: 100 }, E.makeRng(2)).state.clock - CFG.sec.duel / 60) < 1e-9, 'die Uhr läuft mit jeder Eingabe ein paar Sekunden weiter');
}
{
  // Nach dem Schuss geht es weiter: Festhalten, Parade, daneben, Pfosten
  const s = clearLane(find(zoneAtt, 1, GO));
  let x = shotAt(s, 'catch'), sh = ev(x, 'shot'), th = ev(x, 'throw');
  ok(sh.result === 'catch' && th && th.side === 'home' && !ev(x, 'end') && x.state.cur.type === 'def' && x.state.phase === 'decide' && !!x.state.cur.deep === (x.state.cur.kind === 'set' || th.quick), 'der Goalie des Gegners hält fest und wirft aus: Sein Team greift an, ohne Unterbruch');
  x = shotAt(s, 'wide'); let t = ev(x, 'turn');
  ok(ev(x, 'shot').result === 'miss' && t && t.side === 'home' && t.how === 'behind' && x.state.cur.type === 'def' && x.state.cur.deep && x.state.cur.deep.kind === 'build', 'Schuss daneben: Der Verteidiger holt den Ball hinter dem Tor, der Gegner baut hinten auf');
  x = shotAt(s, 'post'); let l = ev(x, 'loose');
  ok(ev(x, 'shot').miss === 'post' && l && l.side === 'you' && goalDist(l.at) < 130, 'Pfostenschuss: Der Ball springt zurück ins Feld und liegt frei');
  x = shotAt(s, 'save'); l = ev(x, 'loose'); const rb = ev(x, 'rebound');
  ok(ev(x, 'shot').result === 'save' && (rb || l), 'Parade ohne Festhalten: Nachschuss, wenn ein Angreifer klar zuerst da ist, sonst liegt der Ball frei');
  x = shotAt(s, 'goal'); const en = ev(x, 'end');
  ok(en && en.goal === 'you' && x.state.phase === 'done' && x.state.score.you === 1, 'Tor: Das Spiel ist unterbrochen');
  const n1 = M.act(x.state, { type: 'next' }, E.makeRng(9));
  ok(n1.state.phase === 'duel' && n1.state.duel.kind === 'faceoff' && !ev(n1, 'seq') && n1.state.seq.n === s.seq.n, 'nach einem frühen Tor geht dieselbe Sequenz mit dem Bully weiter');
  // Ruhe: Die Sequenz endet, die Uhr springt
  const c0 = clearLane(find(zoneAtt, 1, CALM)); x = shotAt(c0, 'wide'); const ce = ev(x, 'end');
  ok(ce && ce.calm && ce.ball === 'home' && x.state.phase === 'done' && !ev(x, 'turn'), 'kommt das Spiel zur Ruhe, endet die Sequenz');
  const n2 = M.act(x.state, { type: 'next' }, E.makeRng(9)), sq = ev(n2, 'seq');
  ok(sq && sq.n === 2 && n2.state.clock >= CFG.seqLate[0] && n2.state.clock <= CFG.periodMin - 0.5 && n2.state.clock > x.state.clock + 1 && n2.state.cur && n2.state.cur.fresh, `danach springt die Uhr zur nächsten Sequenz in der Schlussphase des Drittels (${n2.state.clock.toFixed(1)}. Minute)`);
  const n3 = M.act(Object.assign(copy(n2.state), { phase: 'done' }), { type: 'next' }, E.makeRng(9));
  ok(ev(n3, 'period') && n3.state.phase === 'break' && n3.state.clock === CFG.periodMin, `nach ${CFG.seqPer} Sequenzen ist das Drittel vorbei`);
  const n4 = M.act(n3.state, { type: 'next' }, E.makeRng(9));
  ok(n4.state.period === 1 && n4.state.phase === 'duel' && n4.state.duel.kind === 'faceoff' && n4.state.clock === CFG.periodMin && n4.state.seq.n === 1, 'das nächste Drittel beginnt wieder mit dem Bully');
}
{
  // Freier Ball: Wer ihn holt, spielt weiter
  let s = null, x = null;
  for (let seed = 1; seed < 400 && !s; seed++) { const c = clearLane(find(zoneAtt, seed, GO)); try { const y = shotAt(c, 'post', seed); if (y.state.phase === 'duel') { s = c; x = y; } } catch (e) { /* nächste Lage */ } }
  const d = x.state.duel, sc = x.state.cur;
  ok(d.kind === 'loose' && d.att === 'you' && M.card(x.state, 'you', d.you) && M.card(x.state, 'home', d.home) && d.window >= CFG.foMin && d.window <= CFG.foMax, `freier Ball: dein nächster Spieler gegen den nächsten Gegner, ${d.window} ms Zeit`);
  let y = M.act(x.state, { type: 'duel', rt: 50 }, E.makeRng(5)), w = ev(y, 'wave');
  ok(ev(y, 'duel').won === 'you' && w && w.x === d.you && y.state.cur.carrier === d.you && y.state.cur.type === 'att' && y.state.cur.step === 0 && y.state.cur.max === CFG.waveSteps && y.state.phase === 'decide' && M.dist(y.state.cur.pos[d.you], d.at) < 1, 'du holst ihn: zweite Welle, dein Spieler hat den Ball dort, wo er lag, alle anderen bleiben stehen');
  ok(Object.keys(sc.pos).filter(id => id !== d.you).every(id => M.dist(sc.pos[id], y.state.cur.pos[id]) < 1e-9), 'in der zweiten Welle steht niemand neu');
  y = M.act(x.state, { type: 'duel', rt: 5000 }, E.makeRng(5)); let t = ev(y, 'turn');
  ok(ev(y, 'duel').won === 'home' && t && t.side === 'home' && t.how === 'loose' && t.x === d.home && y.state.cur.type === 'def', 'der Gegner holt ihn: Er greift selbst an');
  // Im Angriff hat der Verteidiger einen Vorsprung, in der Abwehr du
  const flip = copy(x.state); flip.cur.type = 'def';
  ok(CFG.looseDef > 0, 'beim freien Ball hat der Verteidiger einen Vorsprung');
  // Zu viele zweite Wellen gibt es nicht: Danach hat der Verteidiger den Ball
  const full = copy(y.state = M.act(x.state, { type: 'duel', rt: 50 }, E.makeRng(5)).state); full.cur.waves = CFG.waveMax;
  const z = shotAt(full, 'post', 8), lz = ev(z, 'loose');
  ok(lz && lz.auto && lz.won === 'home' && ev(z, 'turn') && z.state.cur.type === 'def', `nach ${CFG.waveMax} zweiten Wellen klärt der Verteidiger`);
}
{
  // Ballverlust: Der Gegner hat den Ball. Vorne verloren heisst Gegenpressing.
  let s = null, to = null;
  for (let seed = 1; seed < 300 && !s; seed++) { const c = find(zoneAtt, seed, GO), m = c.teams.you.cards.find(k => k.id !== c.cur.carrier); try { hitFor(M.contest(c, { type: 'pass', to: m.id }), 'bad'); s = c; to = m.id; } catch (e) { /* Balken zu breit */ } }
  let x = passTo(s, to, 'bad', 11), t = ev(x, 'turn');
  ok(!ev(x, 'pass').ok && t && t.side === 'home' && t.how === 'won' && !ev(x, 'counter') && x.state.cur.type === 'def', 'Fehlpass vor dem Tor: Der Gegner hat den Ball, das Spiel läuft weiter');
  // einen Fall suchen, in dem er hinten aufbaut (kein Konter)
  let b = null; for (let k = 1; k < 60 && !b; k++) { const y = passTo(s, to, 'bad', k); if (y.state.cur.deep && y.state.cur.deep.kind === 'build') b = y.state; }
  ok(b && b.cur.gegen === true, 'baut er danach hinten auf, stehen deine Spieler noch vorne: Gegenpressing');
  let nb = null; for (let k = 1; k < 200 && !nb; k++) { const y = copy(b); y.cur.intent = { kind: 'pass', to: y.teams.home.cards.find(c => c.id !== y.cur.carrier && c.id !== y.cur.deep.run).id }; nb = y; }
  const d = M.defInfo(nb, nb.cur); x = M.act(nb, { type: 'defend', hit: hitFor({ pos: nb.cur.bar.pos, w: d.w }, 'good') }, E.makeRng(3)); t = ev(x, 'turn');
  ok(ev(x, 'defend').stopped && t && t.side === 'you' && t.how === 'press' && x.state.cur.type === 'att' && x.state.cur.kind === 'set' && !x.state.cur.deep && !ev(x, 'counter'), 'Gegenpressing: Schon «Im Feld» holt den Ball zurück, dein Angriff geht vor dem Tor weiter');
  const plain = copy(nb); plain.cur.gegen = false; x = M.act(plain, { type: 'defend', hit: hitFor({ pos: plain.cur.bar.pos, w: d.w }, 'good') }, E.makeRng(3));
  ok(!ev(x, 'defend').stopped, 'ohne Gegenpressing stört «Im Feld» nur');
  // Ballverlust in der eigenen Hälfte: Der Gegner greift sofort vor dem Tor an
  const bu = find(isBuild('att'), 1, CALM), sm = shortMate(bu); let lost = null;
  try { lost = passTo(bu, sm, 'bad', 4); } catch (e) { lost = null; }
  if (lost) { t = ev(lost, 'turn'); ok(t && t.near && t.side === 'home' && lost.state.cur.type === 'def' && !lost.state.cur.deep && lost.state.cur.kind === 'set', 'Ball in der eigenen Hälfte verloren: Der Gegner steht sofort vor deinem Tor, auch wenn das Spiel sonst zur Ruhe käme'); }
}
{
  // Abwehr: Block, Festhalten, Auswurf
  const shootNow = (sc, s) => sc.type === 'def' && !sc.deep && sc.intent.kind === 'shoot';
  let s = null; for (let seed = 1; seed < 3000 && !s; seed++) { let g = first(seed, GO); for (let k = 0; k < 4 && g.phase === 'decide' && g.cur.type === 'def' && !shootNow(g.cur); k++) g = M.act(g, { type: 'defend', hit: (g.cur.bar.pos + 0.5) % 1 }, E.makeRng(seed)).state; if (g.phase === 'decide' && g.cur.type === 'def' && shootNow(g.cur)) s = g; }
  const d = M.defInfo(s, s.cur); let x = M.act(s, { type: 'defend', hit: hitFor({ pos: s.cur.bar.pos, w: d.w }, 'good') }, E.makeRng(3)), e = ev(x, 'defend'), l = ev(x, 'loose');
  ok(e.blocked && !e.stopped && l && l.side === 'home' && !x.state.shot, 'gegen den Schuss blockt schon «Im Feld»: Der Ball springt weg und liegt frei');
  x = M.act(s, { type: 'defend', hit: hitFor({ pos: s.cur.bar.pos, w: d.w }, 'near') }, E.makeRng(3));
  ok(!ev(x, 'defend').blocked && x.state.phase === 'aim' && x.state.shot.side === 'home', 'knapp daneben: Der Schuss kommt');
  // Dein Goalie hält fest: Auswurf
  const g0 = x.state, sh = g0.shot; let c = M.act(g0, { type: 'aim', zone: sh.zone, rt: 1 }, E.makeRng(6)), th = ev(c, 'throw');
  if (ev(c, 'shot').result === 'catch') {
    ok(th && th.ask && c.state.phase === 'throw' && c.state.throw && M.card(c.state, 'you', c.state.throw.to), 'früh reagiert: Dein Goalie hält fest, du wählst den Auswurf');
    let y = M.act(c.state, { type: 'throw', quick: false }, E.makeRng(6));
    ok(y.ok && y.state.cur.type === 'att' && y.state.cur.deep && y.state.cur.deep.kind === 'build', 'ruhig aufbauen: Auslösung hinten');
    const T = c.state.throw, q = g => M.act(c.state, { type: 'throw', quick: true, hit: hitFor(T, g) }, E.makeRng(6));
    y = q('perfect'); ok(y.state.cur.type === 'att' && y.state.cur.kind === 'rush21' && !y.state.cur.deep && y.state.cur.carrier === T.to, 'schnell ausgeworfen, perfekt: Konter 2 gegen 1 über den angespielten Flügel');
    y = q('good'); ok(y.state.cur.type === 'att' && y.state.cur.kind === 'rush32', 'im Feld: Konter 3 gegen 2');
    y = q('near'); ok(y.state.cur.type === 'att' && y.state.cur.kind === 'set' && !y.state.cur.deep, 'knapp: Der Ball kommt an, aber die Abwehr steht');
    y = q('bad'); ok(y.state.cur.type === 'def' && ev(y, 'turn') && ev(y, 'turn').near, 'daneben: Der Gegner fängt den Auswurf ab und greift an');
    y = q('gross'); ok(y.state.cur.type === 'def' && ev(y, 'counter') && ev(y, 'counter').side === 'home', 'grob daneben: Konter für den Gegner');
    ok(!M.act(c.state, { type: 'throw', quick: true }, E.makeRng(6)).ok && !M.act(c.state, { type: 'shoot' }, E.makeRng(6)).ok, 'der schnelle Auswurf braucht den Balken; andere Eingaben gehen nicht');
  } else ok(false, 'kein Festhalten gestellt: ' + ev(c, 'shot').result);
}

// --- Standards: Einschlag und Freischlag ---
/* Stellt einen Standard: side führt aus, kind 'free' oder 'hitin', at: wo der Ball liegt. deep: in der eigenen Hälfte. */
function std(side, kind, at, cfg, deep, seed) { const r = E.makeRng(seed || 3), s = M.newMatch(setup(cfg), r); M.startChance(s, r, side, 'set', undefined, true, !!deep, { kind, at }); return s; }
const roleOf = (pc, role) => Object.keys(pc.roles).find(id => pc.roles[id] === role), canHit = (ct, g) => { try { hitFor(ct, g); return true; } catch (e) { return false; } };
{
  // Freischlag vor dem Tor: Aufstellung, Mauer, Abstand
  const s = std('you', 'free', [120, 190]), sc = s.cur, pc = sc.piece, p = pc.at, rng = E.makeRng(4);
  ok(s.phase === 'decide' && pc.first && pc.kind === 'free' && M.dist(sc.pos[sc.carrier], p) < 1 && sc.max === CFG.pieceSteps, 'Freischlag: Der Ball liegt am Ort, einer steht am Ball, drei Aktionen bleiben');
  const near = Math.min(...s.teams.home.cards.map(c => M.dist(sc.pos[c.id], p)));
  ok(near >= CFG.pieceDist - 0.5, `alle Gegner halten drei Meter Abstand (der nächste steht ${Math.round(near)} weg)`);
  ok(pc.wall.length === 2 && pc.wall.every(id => Math.abs(M.dist(sc.pos[id], p) - CFG.pieceDist) < 0.5 && !!M.card(s, 'home', id)), 'zwei Gegner bilden die Mauer, genau im Abstand');
  ok(Object.keys(pc.roles).map(id => pc.roles[id]).sort().join(',') === 'lay,post,safe,screen', 'die vier Mitspieler stehen für Ablage, zweiten Pfosten, Sichtschutz und Absicherung');
  const lay = roleOf(pc, 'lay'), post = roleOf(pc, 'post');
  ok(s.teams.you.cards.filter(c => c.id !== sc.carrier).every(c => M.shotVal(c) <= M.shotVal(M.card(s, 'you', lay))), 'für die Ablage steht der beste Schütze bereit');
  ok(pc.os === 1 && sc.pos[lay][0] > p[0] + 50 && sc.pos[post][0] > 200 && goalDist(sc.pos[post]) < 80, 'der Ball liegt links: Die Ablage steht zur Mitte hin, einer wartet am zweiten Pfosten rechts');
  const pv = M.shotPreview(s, sc.carrier), w = pv.shade.filter(o => o.wall), lo = Math.min(...w.map(o => o.x - o.w)), hi = Math.max(...w.map(o => o.x + o.w));
  ok(w.length === 2 && lo <= -1 && hi > 0 && hi < 0.6, `die Mauer deckt die nahe Ecke und lässt die ferne offen (ihr Schatten reicht von ${lo.toFixed(2)} bis ${hi.toFixed(2)})`);
  ok(!pv.shade.some(o => !o.wall && o.x + o.w > hi && o.x - o.w < 1), 'kein anderer Gegner steht für den direkten Schuss in der offenen Ecke');
  ok(pv.sh.keeper.x > 0.3 && pv.sh.kwall === 1, `der Goalie steht in der fernen Ecke (bei ${pv.sh.keeper.x.toFixed(2)})`);
  ok(pv.sh.dead && pv.ch.drag === 0 && pv.style !== 'drag', 'direkt aufs Tor: Der Zugschuss steht nicht zur Wahl');
  // Der Ball muss gespielt werden
  ok(!M.canDrib(s, sc) && !M.act(s, { type: 'dribble', hit: 0.5 }, rng).ok, 'der Ausführende darf nicht selbst loslaufen');
  const sh = M.act(s, { type: 'shoot' }, rng);
  ok(sh.ok && sh.state.phase === 'aim' && sh.state.shot.dead && sh.state.shot.kwall === 1 && ev(sh, 'shootStart').std === 'free' && !sh.state.cur.piece.first, 'direkter Freischlag: Der Schuss läuft, die Mauer steht');
  ok(!M.act(sh.state, { type: 'style', value: 'drag' }, rng).ok && M.act(sh.state, { type: 'style', value: 'slap' }, rng).ok, 'beim direkten Freischlag wird der Zugschuss abgelehnt, der Schlagschuss geht');
  const x = passTo(s, lay, 'good'), pv2 = M.shotPreview(x.state, lay);
  ok(x.ok && !x.state.cur.piece.first && x.state.cur.carrier === lay && Math.abs(M.oneTimer(x.state.cur, lay)) >= 0.25, 'Ablage: Der Ball ist gespielt, der Schütze kann direkt abziehen');
  ok(!pv2.sh.dead && !pv2.sh.kwall && !pv2.shade.some(o => o.wall) && pv2.ch.drag !== undefined, 'nach der Ablage gilt die Mauer nicht mehr, alle Schussarten sind erlaubt');
  // Nicht näher als pieceMin am Tor, in der Mitte links oder rechts offen
  const close = std('you', 'free', [170, 90]), mid = [1, 2, 3, 4, 5, 6, 7, 8].map(k => std('you', 'free', [182, 170], null, false, k).cur.piece.os);
  ok(goalDist(close.cur.piece.at) >= CFG.pieceMin - 1, `ein Freischlag liegt nie näher am Tor als ${CFG.pieceMin} (Foul bei 52, Ball bei ${Math.round(goalDist(close.cur.piece.at))})`);
  ok(mid.indexOf(1) >= 0 && mid.indexOf(-1) >= 0, 'liegt der Ball in der Mitte, deckt die Mauer mal die linke, mal die rechte Ecke');
}
{
  // Einschlag: Ecke und Seitenbande
  const s = std('you', 'hitin', [30, 60]), sc = s.cur, pc = sc.piece, rng = E.makeRng(4);
  ok(pc.at[0] === 36 && pc.at[1] === 64 && !pc.wall && pc.kind === 'hitin', 'Einschlag hinter der Torlinie: Der Ball liegt in der Ecke, ohne Mauer');
  ok(Object.keys(pc.roles).map(id => pc.roles[id]).sort().join(',') === 'back,post,safe,slot', 'die Mitspieler stehen im Slot, am zweiten Pfosten, hinten an der Bande und zur Absicherung');
  ok(Math.min(...s.teams.home.cards.map(c => M.dist(sc.pos[c.id], pc.at))) >= CFG.pieceDist - 0.5, 'auch beim Einschlag halten alle Gegner Abstand');
  ok(M.noShot(s, sc) && !M.act(s, { type: 'shoot' }, rng).ok && !M.canDrib(s, sc), 'aus der Ecke gibt es keinen Schusswinkel: weder Schuss noch Dribbling');
  const slot = roleOf(pc, 'slot'), x = passTo(s, slot, 'good');
  ok(x.ok && x.state.cur.carrier === slot && goalDist(x.state.cur.pos[slot]) < 110 && !M.noShot(x.state, x.state.cur), 'der Pass in den Slot kommt an: Von dort wird geschossen');
  const side = std('you', 'hitin', [330, 200]);
  ok(side.cur.piece.at[0] === 330 && side.cur.piece.os === -1 && !M.noShot(side, side.cur) && M.act(side, { type: 'shoot' }, rng).ok, 'Einschlag an der Seitenbande: Der direkte Schuss ist erlaubt');
  // In der eigenen Hälfte: Die Auslösung beginnt an der Bande, der erste Ball muss gespielt werden
  const own = std('you', 'hitin', [30, 60], null, true), oc = own.cur, ox = oc.pos[oc.carrier][0];
  ok(oc.deep && oc.deep.kind === 'build' && oc.piece.own && (ox < 50 || ox > 310) && oc.pos[oc.carrier][1] > 600, 'Einschlag hinten: Die Auslösung beginnt an der Bande');
  ok(!M.canDrib(own, oc) && !M.act(own, { type: 'dribble', hit: 0.5 }, rng).ok, 'beim Einschlag hinten gibt es keinen Vorstoss');
  const sm = shortMate(own), y = passTo(own, sm, 'good');
  ok(y.ok && !y.state.cur.piece.first && (!y.state.cur.deep || M.canDrib(y.state, y.state.cur)), 'nach dem ersten Pass ist der Vorstoss wieder möglich');
}
{
  // Standard des Gegners: deine Mauer
  const s = std('home', 'free', [200, 170]), sc = s.cur, pc = sc.piece, rng = E.makeRng(4);
  ok(sc.type === 'def' && sc.max === CFG.pieceStepsAi && pc.wall.every(id => !!M.card(s, 'you', id)) && !!sc.intent && sc.intent.kind !== 'dribble', 'Freischlag des Gegners: Deine Spieler stellen die Mauer, er passt oder schiesst');
  let drib = 0, shots = 0, wrong = 0, drag = 0; const plans = {};
  for (let k = 1; k <= 60; k++) {
    const t = std('home', 'free', [90 + k * 3, 150 + (k % 5) * 15], null, false, k), it = t.cur.intent; if (it.kind === 'dribble') drib++;
    plans[it.kind === 'pass' ? t.cur.piece.roles[it.to] : it.kind] = 1; t.cur.intent = { kind: 'shoot' };
    const d = M.defInfo(t, t.cur), z = M.act(t, { type: 'defend', hit: hitFor(M.contest(t, {}), 'bad') }, E.makeRng(k));
    if (!d.wall || t.cur.piece.wall.indexOf(d.D.id) === -1) wrong++;
    if (z.state.phase === 'aim') { shots++; const zs = z.state.shot; if (zs.style === 'drag') drag++; if (zs.wall !== t.cur.piece.os || zs.land[0] * t.cur.piece.os < -0.6) wrong++; }
  }
  ok(drib === 0 && Object.keys(plans).length >= 3, `der Gegner dribbelt beim Standard nie und wechselt die Variante (${Object.keys(plans).join(', ')})`);
  ok(shots > 40 && wrong === 0 && drag === 0, `direkter Freischlag des Gegners: Es blockt die Mauer, der Schuss kommt auf die ferne Seite, nie als Zugschuss (${shots} Schüsse)`);
  sc.intent = { kind: 'shoot' };
  const b = M.act(Object.assign(copy(s), { cfg: Object.assign({}, CFG, { outBlock: 0 }) }), { type: 'defend', hit: hitFor(M.contest(s, {}), 'good') }, rng), o = M.act(Object.assign(copy(s), { cfg: Object.assign({}, CFG, { outBlock: 1 }) }), { type: 'defend', hit: hitFor(M.contest(s, {}), 'good') }, rng);
  ok(ev(b, 'defend').blocked && ev(b, 'defend').wall && ev(b, 'loose') && !ev(b, 'out'), 'im Feld: Die Mauer blockt den Freischlag, der Ball liegt frei');
  const op = ev(o, 'piece');
  ok(ev(o, 'out') && ev(o, 'out').how === 'block' && op && op.kind === 'hitin' && op.side === 'home' && op.why === 'out' && (op.at[0] === 30 || op.at[0] === 330) && o.state.cur.waves === 1 && o.state.cur.piece.first && o.state.cur.type === 'def' && !!o.state.cur.intent, 'fliegt der geblockte Ball über die Bande, gibt es Einschlag für den Angreifer');
}
{
  // Foul im Zweikampf
  const FOUL = { foulP: 99 }, FAIR = { foulP: 0 }, rng = E.makeRng(4);
  const dribOk = g => (sc, s) => zoneAtt(sc, s) && M.canDrib(s, sc) && canHit(M.contest(s, { type: 'dribble' }), g);
  const s = find(dribOk('bad'), 1, FOUL), X = s.cur.carrier, x = M.act(s, { type: 'dribble', hit: hitFor(M.contest(s, { type: 'dribble' }), 'bad') }, rng), f = ev(x, 'foul'), pe = ev(x, 'piece');
  ok(f && f.side === 'home' && f.on === X && !f.deep && ev(x, 'dribble').foul && pe && pe.kind === 'free' && pe.why === 'foul' && pe.side === 'you', 'dein Dribbling bleibt hängen, der Gegner foult: Freischlag für dich');
  ok(x.state.cur.type === 'att' && x.state.cur.carrier === X && x.state.cur.piece.first && x.state.cur.piece.wall && x.state.phase === 'decide' && !ev(x, 'turn') && !ev(x, 'counter') && x.state.stats.fouled === 1 && x.state.stats.pieces === 1, 'der Gefoulte führt aus, der Ball bleibt bei dir');
  ok(goalDist(x.state.cur.piece.at) >= CFG.pieceMin - 1 && M.dist(x.state.cur.piece.at, f.at) < 80, 'der Freischlag liegt dort, wo das Foul war');
  const n = find(dribOk('near'), 1, FOUL), xn = M.act(n, { type: 'dribble', hit: hitFor(M.contest(n, { type: 'dribble' }), 'near') }, rng);
  ok(ev(xn, 'foul') && ev(xn, 'piece'), 'auch knapp daneben kann der Gegner foulen');
  const g = find(dribOk('gross'), 1, FOUL), xg = M.act(g, { type: 'dribble', hit: hitFor(M.contest(g, { type: 'dribble' }), 'gross') }, rng);
  ok(!ev(xg, 'foul') && ev(xg, 'counter'), 'grob daneben ist dein Fehler: kein Foul, Konter für den Gegner');
  const fair = find(dribOk('bad'), 1, FAIR), xf = M.act(fair, { type: 'dribble', hit: hitFor(M.contest(fair, { type: 'dribble' }), 'bad') }, rng);
  ok(!ev(xf, 'foul') && (gone(xf) || ev(xf, 'counter')), 'ohne Foul ist der Ball weg');
  // Höchstens ein Freischlag pro Szene
  const back = roleOf(x.state.cur.piece, 'safe'), p1 = passTo(x.state, back, 'good');
  if (p1.ok && M.canDrib(p1.state, p1.state.cur) && canHit(M.contest(p1.state, { type: 'dribble' }), 'bad')) { const again = M.act(p1.state, { type: 'dribble', hit: hitFor(M.contest(p1.state, { type: 'dribble' }), 'bad') }, rng); ok(!ev(again, 'foul'), 'nach einem Freischlag gibt es in derselben Szene keinen zweiten'); }
  else ok(false, 'zweites Dribbling nach dem Freischlag nicht gestellt');
  // Foul im Aufbau: Das Team rückt auf
  const bd = find((sc, s2) => isBuild('att')(sc) && !M.contest(s2, { type: 'dribble' }).free && canHit(M.contest(s2, { type: 'dribble' }), 'bad'), 1, FOUL), xb = carry(bd, 'bad'), fb = ev(xb, 'foul'), ab = ev(xb, 'arrive');
  ok(fb && fb.deep && ab && ab.how === 'set' && ab.free && !xb.state.cur.deep && xb.state.cur.kind === 'set' && xb.state.cur.type === 'att' && xb.state.phase === 'decide' && !ev(xb, 'piece'), 'Foul im Aufbau: Freischlag hinten, dein Team rückt auf, weiter als Positionsangriff');
  // Dein Foul
  const defDrib = (sc, s2) => sc.type === 'def' && !sc.deep && sc.intent.kind === 'dribble' && canHit(M.contest(s2, {}), 'gross') && canHit(M.contest(s2, {}), 'bad');
  const d = find(defDrib, 1, FAIR), hd = g2 => ({ type: 'defend', hit: hitFor(M.contest(d, {}), g2) }), A = d.cur.carrier;
  const dg = M.act(d, hd('gross'), rng), dfo = ev(dg, 'foul'), dp = ev(dg, 'piece');
  ok(dfo && dfo.side === 'you' && dfo.on === A && dp && dp.side === 'home' && dp.kind === 'free' && dg.state.cur.type === 'def' && dg.state.cur.carrier === A && !!dg.state.cur.intent && dg.state.cur.piece.wall.every(id => !!M.card(dg.state, 'you', id)) && dg.state.stats.fouls === 1, 'dein Zweikampf grob daneben: Foul, Freischlag für den Gegner, du stellst die Mauer');
  ok(!ev(M.act(d, hd('bad'), rng), 'foul') && !ev(M.act(d, hd('good'), rng), 'foul'), 'daneben ist bei einem fairen Verteidiger kein Foul, im Feld sowieso nicht');
  const dirty = find(defDrib, 1, FOUL), db = M.act(dirty, { type: 'defend', hit: hitFor(M.contest(dirty, {}), 'bad') }, rng);
  ok(ev(db, 'foul') && ev(db, 'foul').side === 'you', 'daneben kann ein Foul sein: Das hängt an der Fairness deines Verteidigers');
  const c = dirty.teams.you.cards[0], lo = M.foulP(CFG, Object.assign({}, c, { fai: 95, en: 100 })), hi = M.foulP(CFG, Object.assign({}, c, { fai: 62, en: 100 })), tired = M.foulP(CFG, Object.assign({}, c, { fai: 62, en: 20 }));
  ok(lo < hi * 0.5 && tired > hi * 1.2 && hi < 0.6, `wer unfair spielt oder müde ist, foult öfter: ${pc(lo)} bei Fairness 95, ${pc(hi)} bei 62, müde ${pc(tired)}`);
  // Im Aufbau des Gegners kein Foul: Der Vorteil läuft
  const dd = find((sc, s2) => isBuild('def')(sc) && sc.intent.kind === 'dribble' && canHit(M.contest(s2, {}), 'gross'), 1, FOUL), xd = M.act(dd, { type: 'defend', hit: hitFor(M.contest(dd, {}), 'gross') }, rng);
  ok(!ev(xd, 'foul') && !ev(xd, 'piece'), 'im Aufbau des Gegners pfeift niemand: Wer dort zu spät kommt, ist überlaufen');
}
{
  // Ball im Aus nach dem Schuss
  const OUT = { seqGo: [1, 1, 1, 1, 1, 1], outSave: 1, outBlock: 1 };
  let x = null; for (let seed = 1; seed < 300 && !x; seed++) { try { const c = clearLane(find(zoneAtt, seed, OUT)), y = shotAt(c, 'save', seed); if (ev(y, 'out')) x = y; } catch (e) { /* nächste Lage */ } }
  const o = x && ev(x, 'out'), pe = x && ev(x, 'piece');
  ok(!!x && o.how === 'save' && o.side === 'you' && pe.kind === 'hitin' && pe.why === 'corner' && pe.at[1] < 78 && x.state.cur.type === 'att' && M.noShot(x.state, x.state.cur) && x.state.cur.waves === 1, 'der Goalie lenkt den Schuss ins Aus: Einschlag für dich in der Ecke');
  // Höchstens waveMax solche Fortsetzungen pro Szene
  const s2 = copy(x.state); s2.cur.piece.first = false; const c2 = clearLane(s2); c2.cur.waves = CFG.waveMax; const y2 = shotAt(c2, 'save', 5);
  ok(!ev(y2, 'out') && (ev(y2, 'loose') || ev(y2, 'rebound')), 'nach zwei Fortsetzungen fliegt kein Ball mehr ins Aus');
  // Schuss über das Tor: über die Bande, Einschlag hinten
  const s = clearLane(find(zoneAtt, 1, OUT)), sh = M.act(s, { type: 'shoot' }, E.makeRng(3)), hi = M.act(sh.state, { type: 'aim', target: [0, 1.18], hit: 0.5, t: 0 }, E.makeRng(3)), t = ev(hi, 'turn');
  ok(ev(hi, 'shot').miss === 'high' && t && t.how === 'out' && t.side === 'home' && hi.state.cur.type === 'def' && hi.state.cur.deep && hi.state.cur.piece && hi.state.cur.piece.own && hi.state.cur.piece.kind === 'hitin' && hi.state.cur.intent.kind !== 'dribble', 'Schuss über das Tor: Der Ball ist im Aus, der Gegner beginnt hinten mit dem Einschlag');
  const cs = clearLane(find(zoneAtt, 1, CALM)), csh = M.act(cs, { type: 'shoot' }, E.makeRng(3)), ch = M.act(csh.state, { type: 'aim', target: [0, 1.18], hit: 0.5, t: 0 }, E.makeRng(3)), ce = ev(ch, 'end');
  ok(ce && ce.calm && ce.out && ch.state.phase === 'done', 'kommt das Spiel dabei zur Ruhe, endet die Sequenz mit dem Ball im Aus');
}
{
  // Nach dem Zeitsprung: Ein Positionsangriff beginnt mit einem Standard vor dem Tor
  const n = { free: 0, hitin: 0, rush: 0, corner: 0 }; let bad = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const r = E.makeRng(seed), s = M.newMatch(setup(CALM), r); let g = M.act(s, { type: 'duel', rt: 200 }, r).state, guard = 0;
    while (g.seq.n < 2 && g.phase !== 'end' && ++guard < 60) {
      if (g.phase === 'done') g = M.act(g, { type: 'next' }, r).state;
      else if (g.phase === 'duel') g = M.act(g, { type: 'duel', rt: 200 }, r).state;
      else if (g.phase === 'throw') g = M.act(g, { type: 'throw', quick: false }, r).state;
      else if (g.phase === 'aim') g = M.act(g, g.shot.side === 'you' ? { type: 'aim', target: [1.18, 0.5], hit: 0.5, t: 0 } : { type: 'aim', zone: g.shot.zone, rt: 100 }, r).state;
      else if (g.cur.type === 'def') g = M.act(g, { type: 'defend', hit: M.contest(g, {}).pos }, r).state;
      else if (g.cur.deep) { const to = shortMate(g); g = M.act(g, { type: 'pass', to, hit: M.contest(g, { type: 'pass', to }).pos }, r).state; }
      else g = M.act(g, M.noShot(g, g.cur) ? { type: 'pass', to: g.teams.you.cards.find(c => c.id !== g.cur.carrier).id, hit: 0.5 } : { type: 'shoot' }, r).state;
    }
    if (g.seq.n !== 2 || g.seq.scenes !== 1 || g.phase === 'duel') continue;
    const sc = g.cur;
    if (sc.kind === 'set' && !sc.play) { if (!sc.piece || sc.piece.own || sc.deep || !sc.piece.first) bad++; else { n[sc.piece.kind]++; if (sc.piece.kind === 'hitin' && sc.piece.at[1] < 78) n.corner++; } } else n.rush++;
  }
  const all = n.free + n.hitin;
  ok(bad === 0 && all > 100, `nach dem Zeitsprung beginnt jeder Positionsangriff mit einem Standard vor dem Tor (${all} Fälle)`);
  ok(n.hitin > n.free && n.free > all * 0.25 && n.corner > 5 && n.rush > 40, `meist ein Einschlag (${n.hitin}, davon ${n.corner} in der Ecke), sonst ein Freischlag (${n.free}); Konter beginnen wie bisher (${n.rush})`);
}

// --- Strafen: zwei Minuten, Überzahl und Unterzahl ---
// Stellt eine Überzahl: side spielt mit fünf, beim Gegner sitzt der Spieler mit der Rolle role auf der Strafbank
function powerplay(side, role, cfg, seed) {
  const r = E.makeRng(seed || 3), s = M.newMatch(setup(cfg), r), ev = [], sh = side === 'you' ? 'home' : 'you', out = s.teams[sh].cards.find(c => c.role === (role || 'LW'));
  s.duel = null; M.penalty(s, ev, sh, out.id); M.ppAttack(s, r, ev); return { s, ev, out };
}
{
  const NOPEN = { penRush: 0, penBeat: 0, penP: 0 }, rng = E.makeRng(4);
  // Strafbank
  const { s, ev: e0, out } = powerplay('you', 'LW'), sc = s.cur, b = s.pbox;
  ok(b && b.side === 'home' && b.card.id === out.id && b.left === CFG.penSec && s.teams.home.cards.length === 4 && !s.teams.home.cards.some(c => c.id === out.id), 'zwei Minuten: Der Spieler sitzt auf der Strafbank, sein Team hat vier Feldspieler');
  ok(M.card(s, 'home', out.id) === b.card && M.all(s, 'home').some(c => c.id === out.id) && M.byRole(s, 'home').LW && M.byRole(s, 'home').LW.id !== out.id, 'er bleibt auffindbar, und seine Rolle übernimmt ein Mitspieler');
  ok(e0[0].t === 'penalty' && e0[0].side === 'home' && e0[1].t === 'pp' && e0[1].side === 'you' && e0[1].n === 1, 'angesagt werden die Strafe und der erste Angriff in Überzahl');
  // Aufstellung fünf gegen vier
  const you = s.teams.you.cards, P = id => sc.pos[id], role = r => P(you.find(c => c.role === r).id);
  ok(sc.pp && sc.type === 'att' && sc.kind === 'set' && !sc.deep && sc.max === CFG.ppSteps && Object.keys(sc.pos).length === 9, 'Überzahl: fünf gegen vier vor dem Tor, vier Aktionen');
  ok(role('LD')[1] > 230 && role('RD')[1] > 230 && role('LW')[0] < 100 && role('RW')[0] > 260 && goalDist(role('C')) < 110 && ['LD', 'RD'].indexOf(M.card(s, 'you', sc.carrier).role) >= 0, 'zwei Verteidiger hinten (einer am Ball), die Flügel tief an der Bande, der Center im Slot');
  ok(s.teams.home.cards.every(c => goalDist(P(c.id)) < 240) && s.teams.home.cards.filter(c => goalDist(P(c.id)) < 100).length >= 2, 'der Gegner verteidigt in der Box vor dem Tor');
  let free = 0; for (let k = 1; k <= 60; k++) { const t = powerplay('you', ['LD', 'RD', 'LW', 'C', 'RW'][k % 5], null, k).s; if (t.teams.you.cards.some(c => M.isFree(t, t.cur, c.id))) free++; }
  ok(free >= 40, `in Überzahl steht meist ein Mitspieler frei (${free} von 60 Aufstellungen)`);
  // Die Box schiebt mit dem Ball
  const lw = you.find(c => c.role === 'LW').id, x1 = passTo(s, lw, 'good'), avg = t => t.teams.home.cards.reduce((a, c) => a + t.cur.pos[c.id][0], 0) / 4;
  ok(x1.ok && x1.state.cur.pp && x1.state.cur.carrier === lw && avg(x1.state) < avg(s) - 10 && x1.state.pbox.left === CFG.penSec - CFG.sec.pass, 'nach dem Pass an die Bande schiebt die Box zur Ballseite, die Strafzeit läuft');
  // Schuss daneben: Die Unterzahl befreit sich, die Überzahl stellt sich neu auf
  const wide = t => { const a = M.act(t, { type: 'shoot' }, E.makeRng(3)); return M.act(a.state, { type: 'aim', target: [1.18, 0.5], hit: 0.5, t: 0 }, E.makeRng(3)); };
  const w1 = wide(Object.assign(copy(s), { cfg: Object.assign({}, CFG, { outSave: 0, outBlock: 0 }) })), cl = ev(w1, 'clear'), p2 = ev(w1, 'pp');
  ok(cl && cl.side === 'home' && cl.sec >= CFG.ppClear[0] && cl.sec <= CFG.ppClear[1] && p2 && p2.n === 2 && w1.state.cur.pp && w1.state.cur.type === 'att' && w1.state.phase === 'decide' && !ev(w1, 'turn') && !ev(w1, 'end'), `Schuss daneben: Der Gegner befreit sich (${cl && cl.sec} Sekunden), dann stellt sich die Überzahl neu auf`);
  ok(w1.state.pbox.left === CFG.penSec - CFG.sec.shoot - CFG.sec.aim - cl.sec && w1.state.clock > s.clock + 0.5, 'die Strafzeit und die Uhr laufen mit');
  let g = w1.state, n = 0, last = w1; while (g.pbox && n++ < 6) { last = wide(g); g = last.state; }
  const pe = ev(last, 'penaltyEnd'), en = ev(last, 'end');
  ok(!g.pbox && pe && pe.why === 'time' && pe.x === out.id && en && en.calm && en.why === 'pp' && g.phase === 'done' && g.teams.home.cards.length === 5 && g.teams.home.cards.findIndex(c => c.id === out.id) === b.at && n <= 3, `nach ${n + 1} Angriffen ist die Strafe abgesessen: Der Spieler ist zurück, das Spiel kommt zur Ruhe`);
  ok(M.act(g, { type: 'next' }, E.makeRng(5)).ok, 'danach geht es mit dem Zeitsprung weiter');
  // Tor in Überzahl beendet die Strafe
  const gl = shotAt(clearLane(s), 'goal'), ge = ev(gl, 'penaltyEnd');
  ok(ev(gl, 'shot').result === 'goal' && ge && ge.why === 'goal' && !gl.state.pbox && gl.state.teams.home.cards.length === 5 && gl.state.stats.ppGoals === 1 && gl.state.phase === 'done', 'ein Tor in Überzahl beendet die Strafe');
  // Unterzahl: Der Gegner hat einen Mann mehr
  const bp = powerplay('home', 'RD').s, bc = bp.cur;
  ok(bc.pp && bc.type === 'def' && bc.max === CFG.ppStepsAi && bp.teams.you.cards.length === 4 && !!bc.intent && Object.keys(bc.pos).length === 9, 'Unterzahl: Der Gegner greift mit fünf an, deine vier verteidigen');
  const st = M.act(bp, { type: 'defend', hit: M.contest(bp, {}).pos }, rng), co = ev(st, 'counter');
  ok(co && co.side === 'you' && st.state.cur.type === 'att' && st.state.pbox && st.state.teams.you.cards.length === 4 && Object.keys(st.state.cur.pos).length === 9 && st.state.teams.you.cards.every(c => !!st.state.cur.pos[c.id]), 'Ballgewinn in Unterzahl: Du konterst zu viert, die Strafe läuft weiter');
  ok(!M.act(Object.assign(copy(bp), { cfg: Object.assign({}, CFG, { foulP: 99 }) }), { type: 'defend', hit: M.contest(bp, {}).pos }, rng).events.some(e => e.t === 'penalty'), 'während einer Strafe gibt es keine zweite');
  let ints = 0, dr = 0; for (let k = 1; k <= 80; k++) { const t = powerplay('home', ['LD', 'RD', 'LW', 'C', 'RW'][k % 5], null, k).s; ints++; if (t.cur.intent.kind === 'dribble') dr++; }
  ok(dr / ints < 0.2, `in Überzahl lässt der Gegner den Ball laufen: Er dribbelt nur in ${pc(dr / ints)} der Fälle`);
  // Jede Aufstellung geht auch zu viert auf (Konter, Auslösung, Umschalten, Positionsangriff)
  let holes = 0; for (let k = 1; k <= 40; k++) for (const kind of ['set', 'rush32', 'rush21', 'solo']) for (const far of [true, false]) for (const who of ['you', 'home']) {
    const r = E.makeRng(k * 3 + 1), t = M.newMatch(setup(), r); M.penalty(t, [], k % 2 ? 'you' : 'home', t.teams[k % 2 ? 'you' : 'home'].cards[k % 5].id); M.startChance(t, r, who, kind, undefined, true, far);
    if (t.teams.you.cards.concat(t.teams.home.cards).some(c => !t.cur.pos[c.id]) || t.teams[who].cards.some(c => !t.cur.mark[c.id]) || !t.cur.pos[t.cur.carrier]) holes++;
  }
  ok(holes === 0, 'zu viert hat in jeder Aufstellung jeder Spieler seinen Platz und jeder Angreifer einen Gegenspieler');
  // Hartes Foul: dein Zweikampf grob daneben vor dem Tor
  const defDrib = (sc2, s2) => sc2.type === 'def' && !sc2.deep && sc2.intent.kind === 'dribble' && canHit(M.contest(s2, {}), 'gross') && canHit(M.contest(s2, {}), 'bad');
  const d = find(defDrib, 1, { foulP: 99 }), dg = M.act(d, { type: 'defend', hit: hitFor(M.contest(d, {}), 'gross') }, rng), fo = ev(dg, 'foul'), pn = ev(dg, 'penalty'), pp = ev(dg, 'pp'), pi = ev(dg, 'piece');
  ok(fo && fo.pen && pn && pn.side === 'you' && pn.x === fo.by && pp && pp.piece && pp.side === 'home' && pi && pi.kind === 'free' && dg.state.cur.pp && dg.state.cur.piece.first && dg.state.cur.max === CFG.ppStepsAi && dg.state.teams.you.cards.length === 4 && dg.state.stats.pens === 1, 'dein Zweikampf grob daneben: Foul, zwei Minuten, der Freischlag ist der erste Angriff des Gegners in Überzahl');
  const db = M.act(d, { type: 'defend', hit: hitFor(M.contest(d, {}), 'bad') }, rng);
  ok(ev(db, 'foul') && !ev(db, 'foul').pen && !ev(db, 'penalty') && !db.state.pbox, 'daneben ist ein gewöhnliches Foul: Freischlag ohne Strafe');
  // Angezeigte Strafe: im Aufbau des Gegners grob daneben, der Vorteil läuft
  const dd = find((sc2, s2) => (isBuild('def')(sc2) || isTurn('def')(sc2)) && sc2.intent.kind === 'dribble' && canHit(M.contest(s2, {}), 'gross'), 1), xd = M.act(dd, { type: 'defend', hit: hitFor(M.contest(dd, {}), 'gross') }, rng), ad = ev(xd, 'adv');
  ok(ad && ad.side === 'you' && !ev(xd, 'penalty') && !ev(xd, 'foul') && xd.state.cur.adv && xd.state.cur.adv.by === ad.x && !xd.state.pbox && xd.state.cur.type === 'def', 'im Aufbau des Gegners grob daneben: Der Vorteil läuft, die Strafe ist angezeigt');
  // ... sie wird ausgesprochen, sobald du den Ball hast, und entfällt, wenn der Gegner trifft
  const play = (t0, save) => { let t = t0, x = null, k = 0; while (k++ < 12 && t.cur && t.cur.adv && t.phase !== 'done') { x = t.phase === 'aim' ? M.act(t, save ? { type: 'aim', zone: t.shot.zone, rt: 50 } : { type: 'aim', zone: t.shot.zone[0] + (t.shot.zone[1] === 'l' ? 'r' : 'l'), rt: 900 }, E.makeRng(7 + k)) : t.phase === 'duel' ? M.act(t, { type: 'duel', rt: 150 }, E.makeRng(7 + k)) : M.act(t, { type: 'defend', hit: hitFor(M.contest(t, {}), canHit(M.contest(t, {}), 'bad') ? 'bad' : 'near') }, E.makeRng(7 + k)); t = x.state; } return x; };
  let called = null, off = null;
  for (let seed = 1; seed < 200 && (!called || !off); seed++) { let t; try { t = find((sc2, s2) => (isBuild('def')(sc2) || isTurn('def')(sc2)) && sc2.intent.kind === 'dribble' && canHit(M.contest(s2, {}), 'gross'), seed * 7); } catch (e) { continue; } const a0 = M.act(t, { type: 'defend', hit: hitFor(M.contest(t, {}), 'gross') }, E.makeRng(seed)); if (!a0.state.cur.adv) continue;
    try { const a = play(a0.state, true); if (!called && a && ev(a, 'penalty')) called = a; const c2 = play(a0.state, false); if (!off && c2 && ev(c2, 'advOff')) off = c2; } catch (e) { /* nächste Lage */ } }
  ok(called && ev(called, 'penalty').side === 'you' && ev(called, 'pp') && called.state.cur.pp && called.state.cur.type === 'def' && called.state.teams.you.cards.length === 4 && !ev(called, 'throw') && !ev(called, 'turn'), 'hast du den Ball, wird gepfiffen: zwei Minuten, der Gegner beginnt in Überzahl');
  ok(off && ev(off, 'shot').result === 'goal' && !ev(off, 'penalty') && !off.state.pbox && off.state.teams.you.cards.length === 5, 'trifft der Gegner vorher, entfällt die angezeigte Strafe');
  // Der Gegner foult von hinten, wenn er überspielt ist
  const dribOk2 = (sc2, s2) => zoneAtt(sc2, s2) && M.canDrib(s2, sc2) && canHit(M.contest(s2, { type: 'dribble' }), 'good');
  const bt = find(dribOk2, 1, { penBeat: 99, outSave: 0, outBlock: 0 }), xb = M.act(bt, { type: 'dribble', hit: hitFor(M.contest(bt, { type: 'dribble' }), 'good') }, rng), ab = ev(xb, 'adv');
  ok(ab && ab.side === 'home' && xb.state.cur.adv && xb.state.cur.type === 'att' && ev(xb, 'dribble').ok && !xb.state.pbox, 'du lässt ihn stehen, er hält dich fest: Strafe angezeigt, dein Angriff läuft weiter');
  const wb = wide(clearLane(xb.state)), pb = ev(wb, 'penalty');      // freie Schussbahn, damit der Schuss sicher neben das Tor geht
  ok(pb && pb.side === 'home' && pb.x === ab.x && ev(wb, 'pp') && wb.state.cur.pp && wb.state.cur.type === 'att' && wb.state.teams.home.cards.length === 4 && wb.state.stats.pensOpp === 1 && !ev(wb, 'turn'), 'geht dein Schuss daneben, wird gepfiffen: Du spielst in Überzahl');
  const fair = find(dribOk2, 1, NOPEN), xf = M.act(fair, { type: 'dribble', hit: hitFor(M.contest(fair, { type: 'dribble' }), 'good') }, rng);
  ok(!ev(xf, 'adv') && !xf.state.cur.adv, 'ohne Foul keine Strafe');
  // Kurz vor Drittelsende dauert die Strafe nur bis zur Sirene
  const late = M.newMatch(setup(), E.makeRng(3)); late.duel = null; late.clock = CFG.periodMin - 0.5; M.penalty(late, [], 'home', late.teams.home.cards[0].id);
  ok(late.pbox.left === 30, 'kurz vor Drittelsende dauert die Strafe nur bis zur Sirene');
}

// --- Ganze Matches: jede Wahl im Aufbau, alle Wege kommen vor ---
function gauss(rn) { let u = 0; for (let i = 0; i < 6; i++) u += rn(); return (u - 3) / Math.sqrt(0.5); }
{
  const seen = {}, N = 120; let err = null, goals = { you: 0, home: 0 }, deepActs = 0, acts = 0, seqs = 0, pers = 0, inputs = 0, clk = 0, pieces = 0, pens = 0;
  try {
    for (let i = 1; i <= N; i++) {
      const rng = E.makeRng(i * 7 + 1), hr = E.makeRng(i * 11 + 3), pol = ['long', 'carry', 'short', 'mix'][i % 4]; let s = M.newMatch(setup(), rng), guard = 0; seqs++; clk = 0;
      const hit = c => Math.max(0, Math.min(1, c.pos + gauss(hr) * 80 / c.sweep));
      const act = a => { const before = JSON.stringify(s), x = M.act(s, a, rng); if (!x.ok) throw new Error('abgelehnt: ' + JSON.stringify(a) + ' in Phase ' + s.phase); if (JSON.stringify(s) !== before) throw new Error('act hat den alten Zustand verändert'); s = x.state; acts++; x.events.forEach(e => { if (e.t === 'arrive') seen[e.side + ':' + e.from + '>' + e.how] = 1; if (e.t === 'counter') seen['Konter ' + e.side + (e.near ? ' nah' : '')] = 1;
          if (e.t === 'turn') seen['Ball ' + e.side + ' ' + e.how + (e.near ? ' nah' : '')] = 1; if (e.t === 'wave') seen['Welle ' + e.side] = 1; if (e.t === 'duel') seen['Duell ' + e.kind + ' ' + e.won] = 1; if (e.t === 'loose' && e.auto) seen['frei ohne Duell'] = 1; if (e.t === 'throw') seen['Auswurf ' + e.side] = 1; if (e.t === 'end' && e.calm) seen.Ruhe = 1; if (e.t === 'defend' && e.blocked) seen.Block = 1;
          if (e.t === 'penalty') { seen['Strafe ' + e.side] = 1; pens++; } if (e.t === 'adv') seen['angezeigt ' + e.side] = 1; if (e.t === 'advOff') seen.entfällt = 1; if (e.t === 'pp') seen['Überzahl ' + e.side] = 1; if (e.t === 'clear') seen['Befreit ' + e.side] = 1; if (e.t === 'penaltyEnd') seen['Strafe vorbei ' + e.why] = 1;
          if ((e.t === 'seq' || e.t === 'period') && x.state.pbox) throw new Error('Strafe läuft über einen Zeitsprung hinaus');
          if (e.t === 'foul') seen['Foul ' + e.side + (e.deep ? ' hinten' : '')] = 1; if (e.t === 'out') seen['Aus ' + e.side + ' ' + e.how] = 1; if (e.t === 'piece') { seen['Standard ' + e.side + ' ' + e.kind + ' ' + e.why] = 1; pieces++; }
          if (e.t === 'seq' && e.n > 1 && x.state.cur && x.state.cur.piece) { seen['Neustart ' + (x.state.cur.type === 'att' ? 'you' : 'home') + ' ' + x.state.cur.piece.kind] = 1; pieces++; if (x.state.cur.piece.own) throw new Error('Neustart mit einem Standard in der eigenen Hälfte'); }
          if (e.t === 'seq' && e.n > 1 && x.state.cur && x.state.cur.kind === 'set' && !x.state.cur.play && !x.state.cur.piece) throw new Error('Positionsangriff nach dem Zeitsprung ohne Standard');
          if (e.t === 'seq') { seqs++; if (e.clock < clk - 1e-9) throw new Error('die Uhr läuft rückwärts'); } if (e.t === 'period') pers++; });
        if (s.clock < clk - 1e-9 && s.phase !== 'end') throw new Error('die Uhr läuft rückwärts'); clk = s.clock; if (s.clock > (s.period + 1) * CFG.periodMin + 1e-9) throw new Error('die Uhr läuft über das Drittel hinaus');
        ['you', 'home'].forEach(sd => { if (s.teams[sd].cards.length !== (s.pbox && s.pbox.side === sd ? 4 : 5)) throw new Error('falsche Zahl Feldspieler bei ' + sd); });
        if (s.cur && !s.cur.done && s.phase === 'decide' && s.teams.you.cards.concat(s.teams.home.cards).some(c => !s.cur.pos[c.id])) throw new Error('Spieler ohne Platz');
        if (a.type !== 'next') inputs++; if (s.cur && !s.cur.done && Object.keys(s.cur.pos).some(id => { const p = s.cur.pos[id]; return !(p[0] >= 0 && p[0] <= 360 && p[1] >= 40 && p[1] <= 760); })) throw new Error('Spieler steht neben dem Feld'); };
      while (s.phase !== 'end') {
        if (++guard > 4000) throw new Error('Match endet nicht, Phase ' + s.phase);
        if (s.phase === 'done' || s.phase === 'break') act({ type: 'next' });
        else if (s.phase === 'duel') act(hr() < 0.05 ? { type: 'duel', early: true } : { type: 'duel', rt: Math.max(120, 360 + gauss(hr) * 55) });
        else if (s.phase === 'throw') act(hr() < 0.5 ? { type: 'throw', quick: false } : { type: 'throw', quick: true, hit: hit(s.throw) });
        else if (s.phase === 'decide' && s.cur.type === 'def') act({ type: 'defend', hit: hit(M.contest(s, {})) });
        else if (s.phase === 'decide' && s.cur.deep) {
          const dp = s.cur.deep, cd = M.contest(s, { type: 'dribble' }), p = pol === 'mix' ? ['long', 'carry', 'short'][Math.floor(hr() * 3)] : pol; deepActs++;
          if (dp.n >= dp.max) throw new Error('Aufbau läuft über sein Ende hinaus');
          if (p === 'long') act({ type: 'pass', to: dp.run, hit: hit(M.contest(s, { type: 'pass', to: dp.run })) });
          else if (p === 'carry' && M.canDrib(s, s.cur)) act(cd.free ? { type: 'dribble' } : { type: 'dribble', hit: hit(cd) });      // beim Einschlag hinten muss der Ball gespielt werden
          else { const to = shortMate(s); act({ type: 'pass', to, hit: hit(M.contest(s, { type: 'pass', to })) }); }
        } else if (s.phase === 'decide') {
          const sc = s.cur, last = sc.step >= sc.max - 1, u = hr();
          if (!last && u < 0.3 && M.canDrib(s, sc)) act({ type: 'dribble', hit: hit(M.contest(s, { type: 'dribble' })) });
          else if (!last && (u < 0.6 || M.noShot(s, sc))) { const l = s.teams.you.cards.filter(c => c.id !== sc.carrier), to = l[Math.floor(hr() * l.length)].id; act({ type: 'pass', to, hit: hit(M.contest(s, { type: 'pass', to })) }); }      // Einschlag in der Ecke: kein direkter Schuss
          else act({ type: 'shoot' });
        } else if (s.shot.side === 'you') { const b = M.shotBar(s); act({ type: 'aim', target: [hr() < 0.5 ? -0.7 : 0.7, 0.8], hit: hit(b), t: 300 + hr() * b.sweep }); }
        else act({ type: 'aim', zone: hr() < 0.1 ? 'tm' : s.shot.zone, rt: (s.shot.feint ? s.shot.feint.ms : 0) + Math.max(150, 330 + gauss(hr) * 70) });
      }
      goals.you += s.score.you; goals.home += s.score.home;
    }
  } catch (e) { err = e; }
  ok(!err, `${N} ganze Matches laufen durch, mit langem Pass, Vorstoss und kurzem Pass im Aufbau (${acts} Eingaben, ${deepActs} im Aufbau)` + (err ? ': ' + err.message : ''));
  const want = ['you:build>through', 'you:build>rush21', 'you:build>rush32', 'you:build>set', 'you:turn>through', 'you:turn>rush21', 'you:turn>rush32', 'home:build>set', 'home:build>rush32', 'home:turn>rush21', 'home:turn>rush32', 'home:turn>through', 'Konter you', 'Konter you nah', 'Konter home'], miss = want.filter(k => !seen[k]);
  ok(!miss.length, 'alle Wege aus dem Aufbau kommen vor' + (miss.length ? ', es fehlen: ' + miss.join(', ') : ''));
  const want2 = ['Ball home won', 'Ball home behind', 'Ball home loose', 'Ball you loose', 'Ball you press', 'Ball home won nah', 'Welle you', 'Welle home', 'Duell faceoff you', 'Duell faceoff home', 'Duell loose you', 'Duell loose home', 'frei ohne Duell', 'Auswurf you', 'Auswurf home', 'Ruhe', 'Block'], miss2 = want2.filter(k => !seen[k]);
  ok(!miss2.length, 'alle Übergänge kommen vor: Ballwechsel, zweite Welle, Bully, freier Ball, Auswurf, Block, Ruhe' + (miss2.length ? ', es fehlen: ' + miss2.join(', ') : ''));
  const want3 = ['Foul you', 'Foul home', 'Foul home hinten', 'Standard you free foul', 'Standard home free foul', 'Standard you hitin out', 'Standard home hitin out', 'Standard you hitin corner', 'Standard home hitin corner', 'Aus you block', 'Aus home block', 'Aus you save', 'Aus home save', 'Ball home out', 'Neustart you free', 'Neustart you hitin', 'Neustart home free', 'Neustart home hitin'], miss3 = want3.filter(k => !seen[k]);
  ok(!miss3.length, 'alle Standards kommen vor: Foul und Freischlag, Ball im Aus und Einschlag, Ecke, Neustart nach dem Zeitsprung' + (miss3.length ? ', es fehlen: ' + miss3.join(', ') : ''));
  ok(!seen['Foul you hinten'], 'kein Freischlag gegen dich im Aufbau des Gegners: Dort läuft der Vorteil');
  const want4 = ['Strafe you', 'Strafe home', 'angezeigt you', 'angezeigt home', 'entfällt', 'Überzahl you', 'Überzahl home', 'Befreit you', 'Befreit home', 'Strafe vorbei time', 'Strafe vorbei goal'], miss4 = want4.filter(k => !seen[k]);
  ok(!miss4.length, 'Strafen kommen vor: ausgesprochen, angezeigt, entfallen, Überzahl und Unterzahl, Befreiung, abgesessen, durch ein Tor beendet' + (miss4.length ? ', es fehlen: ' + miss4.join(', ') : ''));
  ok(pens / N > 0.3 && pens / N < 2, `Strafen pro Match: ${(pens / N).toFixed(2)}`);
  ok(pieces / N > 1 && pieces / N < 4.5, `Standards vor einem Tor pro Match: ${(pieces / N).toFixed(2)}`);
  ok(pers === 3 * N && seqs >= 3 * CFG.seqPer * N && seqs <= 3 * CFG.seqPer * N + N, `jedes Match hat drei Drittel zu ${CFG.seqPer} Sequenzen (${(seqs / N).toFixed(2)} pro Match)`);
  ok(inputs / N > 35 && inputs / N < 70, `Eingaben pro Match: ${(inputs / N).toFixed(1)}`);      // dieser Testspieler dribbelt oft und holt darum viele Strafen heraus
  ok(goals.you / N > 0.6 && goals.you / N < 3.5 && goals.home / N > 0.4 && goals.home / N < 3, `Tore pro Match bleiben im Rahmen: du ${(goals.you / N).toFixed(2)}, Gegner ${(goals.home / N).toFixed(2)}`);
}

console.log(fails ? '\n' + fails + ' Prüfungen fehlgeschlagen' : '\nAlle Prüfungen bestanden');
process.exit(fails ? 1 : 0);
