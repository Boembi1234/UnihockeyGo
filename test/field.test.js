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
const setup = () => ({ homeName: 'Test', tactic: 'bal', you: { goalie: { val: 88 }, cards: fwd.slice(0, 3).concat(def.slice(0, 2)) }, home: { goalie: { val: 88 }, cards: fwd.slice(10, 13).concat(def.slice(6, 8)) } });
const goalDist = p => M.dist(p, M.GOAL);

/* Sucht eine Szene: spielt Matches mit fester Folge von Zufallszahlen an, bis die erste Szene passt.
   want(sc): Bedingung an die Szene. Gibt den Zustand zurück (Phase decide). */
function find(want, from) {
  for (let seed = from || 1; seed < (from || 1) + 4000; seed++) { const s = M.newMatch(setup(), E.makeRng(seed)); if (s.cur && s.phase === 'decide' && want(s.cur, s)) return s; }
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
const shortMate = s => s.teams.you.cards.filter(c => c.id !== s.cur.carrier && c.id !== s.cur.deep.run).map(c => ({ id: c.id, p: M.contest(s, { type: 'pass', to: c.id }).p })).sort((a, b) => b.p - a.p)[0].id;

// --- Wo Chancen beginnen ---
{
  const n = { set: 0, build: 0, rush: 0, turn: 0, solo: 0 }; let spread = 0, deepN = 0;
  for (let seed = 1; seed <= 1500; seed++) {
    const s = M.newMatch(setup(), E.makeRng(seed)), sc = s.cur; if (!sc) continue;
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
  ok(x.ok && !ev(x, 'arrive') && x.state.phase === 'done' && ev(x, 'pass').long && !ev(x, 'pass').ok, 'langer Pass daneben: abgefangen, die Chance ist vorbei');
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
  ok(x.ok && !ev(x, 'counter') && x.state.phase === 'done', 'Vorstoss daneben: Ball weg, aber kein Konter');
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
  ok(x.state.phase === 'done' && !ev(x, 'arrive'), 'Steilpass daneben: Ball weg');
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
    let g = M.newMatch(setup(), E.makeRng(seed)); const r = E.makeRng(seed + 7);
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

// --- Das Spiel davor (nur zum Zeigen) ---
{
  const t = find(isTurn('att')), o = t.cur.open, last = o[o.length - 1];
  ok(last && last.final && (last.kind === 'intercept' || last.kind === 'tackle') && last.by === t.cur.carrier && last.side === 'home', 'vor dem Umschalten greift der Gegner an, dann gewinnt der Ballführende der Szene den Ball');
  const b = find(isBuild('att')), ob = b.cur.open, lb = ob[ob.length - 1];
  ok(lb && lb.final && lb.side === 'you' && (lb.to === b.cur.carrier || (lb.kind === 'hold' && lb.from === b.cur.carrier)), 'vor der Auslösung landet der Ball beim Verteidiger');
}

// --- Ganze Matches: jede Wahl im Aufbau, alle Wege kommen vor ---
function gauss(rn) { let u = 0; for (let i = 0; i < 6; i++) u += rn(); return (u - 3) / Math.sqrt(0.5); }
{
  const seen = {}, N = 80; let err = null, goals = { you: 0, home: 0 }, deepActs = 0, acts = 0;
  try {
    for (let i = 1; i <= N; i++) {
      const rng = E.makeRng(i * 7 + 1), hr = E.makeRng(i * 11 + 3), pol = ['long', 'carry', 'short', 'mix'][i % 4]; let s = M.newMatch(setup(), rng), guard = 0;
      const hit = c => Math.max(0, Math.min(1, c.pos + gauss(hr) * 80 / c.sweep));
      const act = a => { const before = JSON.stringify(s), x = M.act(s, a, rng); if (!x.ok) throw new Error('abgelehnt: ' + JSON.stringify(a) + ' in Phase ' + s.phase); if (JSON.stringify(s) !== before) throw new Error('act hat den alten Zustand verändert'); s = x.state; acts++; x.events.forEach(e => { if (e.t === 'arrive') seen[e.side + ':' + e.from + '>' + e.how] = 1; if (e.t === 'counter') seen['Konter ' + e.side + (e.near ? ' nah' : '')] = 1; }); if (s.cur && !s.cur.done && Object.keys(s.cur.pos).some(id => { const p = s.cur.pos[id]; return !(p[0] >= 0 && p[0] <= 360 && p[1] >= 40 && p[1] <= 760); })) throw new Error('Spieler steht neben dem Feld'); };
      while (s.phase !== 'end') {
        if (++guard > 4000) throw new Error('Match endet nicht, Phase ' + s.phase);
        if (s.phase === 'done' || s.phase === 'break') act({ type: 'next' });
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
  ok(goals.you / N > 0.6 && goals.you / N < 3.5 && goals.home / N > 0.4 && goals.home / N < 3, `Tore pro Match bleiben im Rahmen: du ${(goals.you / N).toFixed(2)}, Gegner ${(goals.home / N).toFixed(2)}`);
}

console.log(fails ? '\n' + fails + ' Prüfungen fehlgeschlagen' : '\nAlle Prüfungen bestanden');
process.exit(fails ? 1 : 0);
