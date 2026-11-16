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
const GO = { seqGo: [1, 1, 1, 1, 1, 1] }, CALM = { seqGo: [0, 0, 0] };
const zoneAtt = (sc, s) => sc.type === 'att' && sc.kind === 'set' && !sc.deep;
/* Stellt eine klare Lage vor dem Tor: der Ballführende im Slot mit freier Schussbahn, ein Mitspieler rechts vor dem Tor,
   ein Gegner links daneben (nicht in der Bahn), alle anderen weit weg. */
function clearLane(s0) {
  const s = copy(s0), sc = s.cur, you = s.teams.you.cards.filter(c => c.id !== sc.carrier), home = s.teams.home.cards;
  sc.pos[sc.carrier] = [180, 140]; sc.pos[you[0].id] = [236, 100]; [[60, 300], [300, 300], [180, 340]].forEach((p, i) => { sc.pos[you[i + 1].id] = p; });
  sc.pos[home[0].id] = [150, 118]; [[40, 250], [320, 250], [70, 330], [290, 330]].forEach((p, i) => { sc.pos[home[i + 1].id] = p; });
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

// --- Ganze Matches: jede Wahl im Aufbau, alle Wege kommen vor ---
function gauss(rn) { let u = 0; for (let i = 0; i < 6; i++) u += rn(); return (u - 3) / Math.sqrt(0.5); }
{
  const seen = {}, N = 80; let err = null, goals = { you: 0, home: 0 }, deepActs = 0, acts = 0, seqs = 0, pers = 0, inputs = 0, clk = 0;
  try {
    for (let i = 1; i <= N; i++) {
      const rng = E.makeRng(i * 7 + 1), hr = E.makeRng(i * 11 + 3), pol = ['long', 'carry', 'short', 'mix'][i % 4]; let s = M.newMatch(setup(), rng), guard = 0; seqs++; clk = 0;
      const hit = c => Math.max(0, Math.min(1, c.pos + gauss(hr) * 80 / c.sweep));
      const act = a => { const before = JSON.stringify(s), x = M.act(s, a, rng); if (!x.ok) throw new Error('abgelehnt: ' + JSON.stringify(a) + ' in Phase ' + s.phase); if (JSON.stringify(s) !== before) throw new Error('act hat den alten Zustand verändert'); s = x.state; acts++; x.events.forEach(e => { if (e.t === 'arrive') seen[e.side + ':' + e.from + '>' + e.how] = 1; if (e.t === 'counter') seen['Konter ' + e.side + (e.near ? ' nah' : '')] = 1;
          if (e.t === 'turn') seen['Ball ' + e.side + ' ' + e.how + (e.near ? ' nah' : '')] = 1; if (e.t === 'wave') seen['Welle ' + e.side] = 1; if (e.t === 'duel') seen['Duell ' + e.kind + ' ' + e.won] = 1; if (e.t === 'loose' && e.auto) seen['frei ohne Duell'] = 1; if (e.t === 'throw') seen['Auswurf ' + e.side] = 1; if (e.t === 'end' && e.calm) seen.Ruhe = 1; if (e.t === 'defend' && e.blocked) seen.Block = 1;
          if (e.t === 'seq') { seqs++; if (e.clock < clk - 1e-9) throw new Error('die Uhr läuft rückwärts'); } if (e.t === 'period') pers++; });
        if (s.clock < clk - 1e-9 && s.phase !== 'end') throw new Error('die Uhr läuft rückwärts'); clk = s.clock; if (s.clock > (s.period + 1) * CFG.periodMin + 1e-9) throw new Error('die Uhr läuft über das Drittel hinaus');
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
          else if (p === 'carry') act(cd.free ? { type: 'dribble' } : { type: 'dribble', hit: hit(cd) });
          else { const to = shortMate(s); act({ type: 'pass', to, hit: hit(M.contest(s, { type: 'pass', to })) }); }
        } else if (s.phase === 'decide') {
          const sc = s.cur, last = sc.step >= sc.max - 1, u = hr();
          if (!last && u < 0.3 && M.canDrib(s, sc)) act({ type: 'dribble', hit: hit(M.contest(s, { type: 'dribble' })) });
          else if (!last && u < 0.6) { const l = s.teams.you.cards.filter(c => c.id !== sc.carrier), to = l[Math.floor(hr() * l.length)].id; act({ type: 'pass', to, hit: hit(M.contest(s, { type: 'pass', to })) }); }
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
  ok(pers === 3 * N && seqs >= 3 * CFG.seqPer * N && seqs <= 3 * CFG.seqPer * N + N, `jedes Match hat drei Drittel zu ${CFG.seqPer} Sequenzen (${(seqs / N).toFixed(2)} pro Match)`);
  ok(inputs / N > 35 && inputs / N < 62, `Eingaben pro Match: ${(inputs / N).toFixed(1)}`);
  ok(goals.you / N > 0.6 && goals.you / N < 3.5 && goals.home / N > 0.4 && goals.home / N < 3, `Tore pro Match bleiben im Rahmen: du ${(goals.you / N).toFixed(2)}, Gegner ${(goals.home / N).toFixed(2)}`);
}

console.log(fails ? '\n' + fails + ' Prüfungen fehlgeschlagen' : '\nAlle Prüfungen bestanden');
process.exit(fails ? 1 : 0);
