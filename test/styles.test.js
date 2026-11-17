/* Schussarten in der Match-Engine: Regeln und Balance, ohne Browser. node test/styles.test.js
   Die Balance wird gerechnet, nicht gewürfelt: ein gedachter Spieler mit 80 ms Streuung am Balken (so ist die Engine
   geeicht), der auf die beste Stelle im Tor zielt und beim ersten Durchgang des Strichs tippt. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console, Math, JSON, Date, localStorage: { getItem: () => null, setItem: () => {} } };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
['src/engine.js', 'src/world.js', 'src/lab/match.js', 'src/lab/pool.js', 'src/lab/club.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f }));
const M = ctx.HKMatch, C = ctx.HKClub, E = ctx.HK, pool = C.POOL, SIG = 80;
let fails = 0; const ok = (c, t) => { console.log((c ? 'ok   ' : 'FEHLT') + ' ' + t); if (!c) fails++; };
const pc = v => Math.round(v * 100) + ' %';

// --- Torchance einer Schussart in einer Lage ---
const QS = []; for (let i = 0; i < 41; i++) { const z = -3 + 6 * i / 40; QS.push([z, Math.exp(-z * z / 2)]); } const qsum = QS.reduce((a, q) => a + q[1], 0); QS.forEach(q => { q[1] /= qsum; });
const TG = []; for (let x = -1; x <= 1.001; x += 0.1) for (let y = 0.1; y <= 1.001; y += 0.1) TG.push([+x.toFixed(2), +y.toFixed(2)]);
const QS2 = QS.filter((q, i) => i % 2 === 0).map(q => [q[0], q[1] * 2]), TGc = TG.filter(tg => Math.round(tg[0] * 10) % 2 === 0 && Math.round(tg[1] * 10) % 2 === 1);
function chance(s, coarse) {
  const sh = s.shot, b = M.shotBar(s), pre = { b, R: M.reach(s, sh) }, ts = (coarse ? [0.25, 0.75] : [0.15, 0.4, 0.65, 0.9]).map(u => 300 + u * b.sweep); let best = null;
  (coarse ? TGc : TG).forEach(tg => {
    let g = 0, bl = 0;
    ts.forEach(t => (coarse ? QS2 : QS).forEach(q => { const v = M.evalShot(s, tg, Math.max(0, Math.min(1, 0.5 + q[0] * SIG / b.sweep)), t, pre), w = q[1] / ts.length; if (v.blocked) bl += w; else if (v.result === 'goal') g += w; }));
    if (!best || g > best.g) best = { g, bl, tg };
  });
  return best;
}
const fwd = pool.filter(c => c.pos !== 'DEF'), def = pool.filter(c => c.pos === 'DEF');
const shooter = fwd.filter(c => M.favStyle(c) === 'slap' && !M.trait(c)).sort((a, b) => Math.abs(a.sco - 88) - Math.abs(b.sco - 88))[0];
function matchWith(X) {
  const mates = fwd.filter(c => c.id !== X.id).slice(30, 35);
  // Das Match beginnt mit dem Bully; für die gestellten Lagen folgt gleich ein eigener Positionsangriff
  const r = E.makeRng(7), s = M.newMatch({ homeName: 'Test', you: { goalie: { val: 88 }, cards: [X].concat(mates.slice(0, 2), def.slice(10, 12)) }, home: { goalie: { val: 88 }, cards: mates.slice(2, 5).concat(def.slice(12, 14)) } }, r);
  M.startChance(s, r, 'you', 'set', X.id, true, false); return s;
}
/* Stellt eine Lage auf dem Feld: der Schütze bei at, Gegner bei defs (die übrigen weit hinten, wo sie nichts decken),
   Mitspieler bei mates. o.one: Querbewegung des letzten Passes (Direktschuss). Gibt für jede Schussart die Torchance. */
function lay(at, defs, o) {
  o = o || {}; const X = o.X || shooter, s = matchWith(X), sc = s.cur, you = s.teams.you.cards, home = s.teams.home.cards, out = { s, sh: {} };
  sc.type = 'att'; sc.kind = 'set'; sc.counter = false; sc.deep = null; sc.step = 1; sc.max = 4; sc.carrier = X.id; sc.reb = false; s.phase = 'decide'; s.shot = null;
  you.forEach((c, i) => { sc.pos[c.id] = c.id === X.id ? at : (o.mates && o.mates[i - 1]) || [40 + i * 60, 370]; });
  home.forEach((c, i) => { sc.pos[c.id] = (defs && defs[i]) || [40 + i * 60, 385]; sc.mark[you[i].id] = c.id; });
  sc.last = o.one ? { type: 'pass', to: X.id, lat: o.one } : null;
  M.STYLES.forEach(st => { const pv = M.shotPreview(s, X.id, null, st); out.sh[st] = pv.sh; out[st] = chance(Object.assign({}, s, { shot: pv.sh })); out.pick = { style: pv.auto, why: pv.why, ch: pv.ch }; });
  out.best = M.STYLES.reduce((a, k) => (out[k].g > out[a].g ? k : a), 'slap'); out.home = home; out.you = you;
  out.txt = M.STYLES.map(k => `${M.STYLE[k].short} ${pc(out[k].g)}`).join(', ');
  return out;
}
const second = (r, st) => Math.max.apply(null, M.STYLES.filter(k => k !== st).map(k => r[k].g));

// --- Jede Schussart hat ihre Lage ---
let r = lay([180, 300]);
ok(r.best === 'slap' && r.slap.g - second(r, 'slap') >= 0.05 && r.pick.style === 'slap' && r.pick.why === 'far', 'aus der Distanz und frei ist der Schlagschuss klar am besten: ' + r.txt);
r = lay([180, 150], null, { one: 0.8 });
ok(r.best === 'slap' && r.slap.g - second(r, 'slap') >= 0.08 && r.pick.style === 'slap' && r.pick.why === 'direct', 'Direktschuss nach Querpass: Schlagschuss klar am besten: ' + r.txt);
r = lay([180, 80]);
ok(r.best === 'wrist' && r.wrist.g - second(r, 'wrist') >= 0.02 && r.pick.style === 'wrist' && r.pick.why === 'near', 'aus der Nähe und frei ist das Handgelenk am besten: ' + r.txt);
r = lay([180, 90], [[194, 96]]);
ok(r.best === 'wrist' && r.wrist.g - second(r, 'wrist') >= 0.08 && r.pick.style === 'wrist' && r.pick.why === 'tight', 'Gegner am Mann (neben dem Schützen): Handgelenk klar am besten: ' + r.txt);
r = lay([180, 160]);
ok(Math.max(r.slap.g, r.wrist.g, r.drag.g) - Math.min(r.slap.g, r.wrist.g, r.drag.g) <= 0.1 && r.pick.style === M.favStyle(shooter) && r.pick.why === 'fav', 'aus mittlerer Distanz und frei liegen alle nah beisammen, der Lieblingsschuss entscheidet: ' + r.txt);
// Lieblingsschuss: breiteres Feld
{
  const s = r.s, bar = st => M.shotBar(Object.assign({}, s, { shot: r.sh[st] })), a = bar('slap'), b = bar('wrist'), c = s.cfg;
  ok(a.fav && !b.fav && Math.abs(a.w / c.styles.slap.w - b.w / c.styles.wrist.w * c.favW) < 1e-9, 'im Lieblingsschuss ist das Feld um ' + pc(c.favW - 1) + ' breiter');
  ok(a.sweep < b.sweep, 'beim Schlagschuss läuft der Strich schneller als beim Handgelenk');
}

// --- Verkehr vor dem Tor: Blocker werfen Schatten ins Tor ---
{
  // Der Gegenspieler steht 34 Einheiten vor dem Schützen in der Schussbahn: Das Tor ist zu, nur der Zug öffnet ein Fenster
  r = lay([180, 290], [[180, 256]]);
  const sdS = r.sh.slap.shade, sdD = r.sh.drag.shade;
  ok(sdS.length === 1 && sdS[0].x - sdS[0].w <= -1 && sdS[0].x + sdS[0].w >= 1 && sdS[0].top >= 1, 'Gegner direkt vor dem Schützen: Sein Schatten deckt das ganze Tor');
  ok(r.slap.g === 0 && r.wrist.g === 0 && r.drag.g >= 0.05 && r.pick.style === 'drag' && r.pick.why === 'lane', 'Schlag und Handgelenk gehen in den Block, der Zugschuss öffnet ein Fenster: ' + r.txt);
  const pull = r.sh.drag.pull, edge = pull > 0 ? sdD[0].x + sdD[0].w : sdD[0].x - sdD[0].w;
  ok(pull * edge < 0.9 && pull * edge > -1, `das Fenster liegt auf der Seite, zu der gezogen wird (Schatten endet bei ${edge.toFixed(2)}, Zug nach ${pull > 0 ? 'rechts' : 'links'})`);
  const sB = Object.assign({}, r.s, { shot: r.sh.slap }), v = M.evalShot(sB, [0.7, 0.8], 0.5, 300);
  ok(v.blocked && v.how === 'lane' && v.blockBy === r.home[0].id, 'ein perfekt getimter Schlagschuss in den Schatten ist geblockt, vom Gegner in der Schussbahn');
  const act = M.act(Object.assign(JSON.parse(JSON.stringify(r.s)), { shot: JSON.parse(JSON.stringify(r.sh.slap)), phase: 'aim' }), { type: 'aim', target: [0.7, 0.8], hit: 0.5, t: 300 }, E.makeRng(1)), e = act.events.find(x => x.t === 'shot');
  ok(act.ok && e && e.result === 'blocked' && e.how === 'lane' && e.by === r.home[0].id && act.events.some(x => x.t === 'loose') && !act.state.shot, 'als Eingabe: Schuss in den Block, der Ball springt weg und liegt frei');
  // Gegner im Slot, weit weg vom Schützen: nur ein Streifen in der Mitte
  r = lay([180, 300], [[180, 110]]);
  const sl = r.sh.slap.shade[0], wr = r.sh.wrist.shade[0];
  ok(sl && wr && sl.w < 0.8 && sl.w > wr.w * 1.5 && Math.abs(sl.x) < 0.05, `Gegner vor dem Goalie: ein Streifen in der Mitte, beim Schlagschuss breiter (${sl.w.toFixed(2)}) als beim Handgelenk (${wr.w.toFixed(2)})`);
  const s1 = Object.assign({}, r.s, { shot: r.sh.slap });
  ok(M.evalShot(s1, [0, 0.5], 0.5, 300).blocked && !M.evalShot(s1, [0.9, 0.85], 0.5, 300).blocked, 'in die Mitte: geblockt; in die Ecke: am Block vorbei');
  ok(r.slap.g > 0.08 && r.pick.style === 'slap', 'aus der Distanz bleibt der Schlagschuss an einem Blocker vorbei möglich: ' + r.txt);
  const near = lay([180, 300], [[180, 250]]).sh.wrist.shade[0], far = lay([180, 300], [[180, 80]]).sh.wrist.shade[0];
  ok(near.w > far.w * 3 && far.top < 1 && near.top >= 1, `je näher am Schützen, desto grösser der Schatten (${near.w.toFixed(2)} gegen ${far.w.toFixed(2)}); wer am Tor steht, lässt die Latte frei`);
  // Sichtschutz: ein Mitspieler auf der Schussbahn vor dem Goalie
  const free = lay([180, 300]), scr = lay([180, 300], null, { mates: [[180, 96]] }), c = free.s.cfg;
  ok(scr.sh.slap.scr.length === 1 && Math.abs(M.reach(free.s, free.sh.slap) - M.reach(scr.s, scr.sh.slap) - c.screenReach) < 1e-9 && scr.slap.g > free.slap.g, `Sichtschutz: Der Goalie reicht weniger weit, die Torchance steigt (${pc(free.slap.g)} auf ${pc(scr.slap.g)})`);
  // Der Center läuft in die Sicht, wenn ein Verteidiger hinten den Ball hat
  let seen = 0, n = 0; for (let i = 1; i <= 90; i++) { const s = M.newMatch({ homeName: 'T', you: { goalie: { val: 88 }, cards: fwd.slice(20, 23).concat(def.slice(5, 7)) }, home: { goalie: { val: 88 }, cards: fwd.slice(40, 43).concat(def.slice(20, 22)) } }, E.makeRng(i)); M.startChance(s, E.makeRng(i + 500), i % 2 ? 'you' : 'home', 'set', null, true, false); const sc = s.cur; if (!sc) continue; const car = M.card(s, M.atkSide(sc), sc.carrier); if (sc.kind !== 'set' || sc.deep || ['LD', 'RD'].indexOf(car.role) < 0) continue; n++; const C_ = s.teams[M.atkSide(sc)].cards.find(x => x.role === 'C'), p = sc.pos[C_.id], a = sc.pos[car.id], dx = 180 - a[0], dy = 40 - a[1], d = Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / Math.hypot(dx, dy); if (d < 18 && M.dist(p, M.GOAL) < 105) seen++; }
  ok(n >= 5 && seen >= n * 0.8, `hat ein Verteidiger hinten den Ball, steht der Center dem Goalie in der Sicht (${seen} von ${n} Szenen)`);
}

// --- Abpraller ---
{
  const mk = (defNear) => { const L = lay([180, 150], defNear ? [[150, 94]] : null, { mates: [[150, 100]] }), s = JSON.parse(JSON.stringify(L.s)); s.shot = JSON.parse(JSON.stringify(L.sh.wrist)); s.phase = 'aim'; return { s, L }; };
  // Schuss auf den Goalie: gehalten, aber nicht gefangen (Abstand zwischen 40 % und 100 % der Reichweite)
  const A = mk(false), R = M.reach(A.s, A.s.shot), tg = [-Math.min(0.9, R * 0.75), A.s.cfg.kY], x = M.act(A.s, { type: 'aim', target: tg, hit: 0.5, t: 0 }, E.makeRng(2)), e0 = x.events.find(e => e.t === 'shot'), e1 = x.events.find(e => e.t === 'rebound');
  ok(x.ok && e0.result === 'save' && e1 && e1.x === A.L.you[1].id && e0.rebound === e1.x && x.state.phase === 'aim' && x.state.shot.reb && x.state.shot.x === e1.x && x.state.shot.style === 'wrist' && x.state.shot.why === 'rebound', 'Parade ohne Festhalten, ein Angreifer steht am nächsten: Abpraller, er schiesst sofort nach');
  ok(!M.act(x.state, { type: 'style', value: 'slap' }, E.makeRng(1)).ok && Math.sign(x.state.shot.keeper.x) === Math.sign(tg[0]) && M.reach(x.state, x.state.shot) < R, 'beim Abpraller gibt es nur das Handgelenk; der Goalie liegt noch auf der Seite der Parade und reicht weniger weit');
  const y = M.act(x.state, { type: 'aim', target: [x.state.shot.keeper.x, x.state.cfg.kY + 0.3], hit: 0.5, t: 0 }, E.makeRng(3)), f0 = y.events.find(e => e.t === 'shot');
  ok(y.ok && f0.ctx === 'rebound' && !y.events.some(e => e.t === 'rebound'), 'höchstens ein Nachschuss pro Szene (' + f0.result + ')');
  const B = mk(true), z = M.act(B.s, { type: 'aim', target: tg, hit: 0.5, t: 0 }, E.makeRng(2));
  ok(z.ok && z.events.find(e => e.t === 'shot').result === 'save' && !z.events.some(e => e.t === 'rebound') && z.events.some(e => e.t === 'loose' && e.side === 'you'), 'steht ein Verteidiger näher am Ball, gibt es keinen Nachschuss: Der Ball liegt frei');
  // Schuss des Gegners: spät gehalten (kein Fangen) mit einem Angreifer vor dem Tor
  const s = matchWith(shooter), sc = s.cur, rngH = E.makeRng(5); sc.type = 'def'; sc.kind = 'set'; sc.deep = null; sc.reb = false; sc.carrier = s.teams.home.cards[0].id;
  s.teams.home.cards.forEach((c, i) => { sc.pos[c.id] = i === 0 ? [180, 160] : i === 1 ? [180, 96] : [40 + i * 60, 380]; }); s.teams.you.cards.forEach((c, i) => { sc.pos[c.id] = [40 + i * 60, 390]; });
  let h = null, tries = 0; while (!h && tries++ < 40) { const s2 = JSON.parse(JSON.stringify(s)); M.setShot(s2, rngH, 'home', sc.carrier, 0.7, 'attack', {}); if (!s2.shot.miss && !s2.shot.feint) h = s2; }
  const w = M.act(h, { type: 'aim', zone: h.shot.zone, rt: Math.round(h.shot.window * 0.8) }, E.makeRng(6)), g0 = w.events.find(e => e.t === 'shot'), g1 = w.events.find(e => e.t === 'rebound');
  ok(w.ok && g0.result === 'save' && g1 && g1.side === 'home' && w.state.phase === 'aim' && w.state.shot.side === 'home' && w.state.shot.reb && w.state.shot.style === 'wrist', 'dein Goalie hält spät und lässt abprallen: Der Gegner schiesst nach');
  const w2 = M.act(h, { type: 'aim', zone: h.shot.zone, rt: Math.round(h.shot.window * 0.3) }, E.makeRng(6));
  ok(w2.events.find(e => e.t === 'shot').result === 'catch' && !w2.events.some(e => e.t === 'rebound' || e.t === 'loose') && (w2.state.phase === 'throw' || w2.state.phase === 'done'), 'wer schnell reagiert, fängt den Ball: kein Abpraller, es folgt der Auswurf oder Ruhe');
}

// --- Lieblingsschuss der Karten ---
{
  const n = { slap: 0, wrist: 0, drag: 0 }; fwd.forEach(c => { n[M.favStyle(c)]++; });
  ok(M.STYLES.every(k => n[k] / fwd.length >= 0.25), 'Stürmer: jede Schussart ist für mindestens ein Viertel der Lieblingsschuss: ' + JSON.stringify(n));
  ok(pool.filter(c => M.trait(c) === 'kanone').every(c => M.favStyle(c) === 'slap') && pool.filter(c => M.trait(c) === 'dribbler').every(c => M.favStyle(c) === 'drag'), 'Kanone schlägt, Dribbelkönig zieht');
}

// --- Ganze Matches mit einem gedachten Spieler ---
function gauss(rn) { let u = 0; for (let i = 0; i < 6; i++) u += rn(); return (u - 3) / Math.sqrt(0.5); }
function setup(seed) {
  const rn = E.makeRng(seed), used = [], pick = (l, n) => { const out = []; l = l.filter(c => used.indexOf(c.id) < 0 && c.ovr >= 78 && c.ovr <= 90); while (out.length < n) { const c = l[Math.floor(rn() * l.length)]; if (out.indexOf(c) < 0) out.push(c); } out.forEach(c => used.push(c.id)); return out; };
  const team = () => { const a = pick(fwd, 6), d = pick(def, 4); return { goalie: { val: 88 }, cards: a.slice(0, 3).concat(d.slice(0, 2)), bench: a.slice(3).concat(d.slice(2)), tac: [] }; };
  return { homeName: 'Test', tactic: 'bal', you: team(), home: team() };
}
const TG2 = []; for (let x = -1; x <= 1.001; x += 0.2) for (let y = 0.1; y <= 1.001; y += 0.2) TG2.push([+x.toFixed(2), +y.toFixed(2)]);
function bestTarget(s) {
  const b = M.shotBar(s), pre = { b, R: M.reach(s, s.shot) }; let best = null;
  TG2.forEach(tg => { let g = 0; [-1.2, -0.6, 0, 0.6, 1.2].forEach(z => { const v = M.evalShot(s, tg, Math.max(0, Math.min(1, 0.5 + z * SIG / b.sweep)), 300 + b.sweep / 2, pre); if (!v.blocked && v.result === 'goal') g += Math.exp(-z * z / 2); }); if (!best || g > best.g) best = { g, tg }; });
  return best.tg;
}
/* policy: 'auto' (empfohlene Schussart), eine feste Schussart oder 'rand'. on.shot(s) sieht jede eigene Schusslage vor dem
   Abschluss, on.ev(e) jedes Ereignis. Gibt den Endstand zurück. */
function playMatch(seed, policy, on) {
  const rng = E.makeRng(seed * 7 + 3), hr = E.makeRng(seed * 13 + 5); let s = M.newMatch(setup(seed), rng), guard = 0;
  const act = a => { const before = JSON.stringify(s), x = M.act(s, a, rng); if (!x.ok) throw new Error('abgelehnt: ' + JSON.stringify(a) + ' in Phase ' + s.phase); if (JSON.stringify(s) !== before) throw new Error('act hat den alten Zustand verändert'); s = x.state; if (on && on.ev) x.events.forEach(on.ev); };
  const hit = c => Math.max(0, Math.min(1, c.pos + gauss(hr) * SIG / c.sweep));
  while (s.phase !== 'end') {
    if (++guard > 3000) throw new Error('Match endet nicht, Phase ' + s.phase);
    if (s.phase === 'done' || s.phase === 'break') act({ type: 'next' });
    else if (s.phase === 'duel') act({ type: 'duel', rt: Math.max(120, 360 + gauss(hr) * 55) });      // Bully, freier Ball
    else if (s.phase === 'throw') act(hr() < 0.5 ? { type: 'throw', quick: false } : { type: 'throw', quick: true, hit: hit(s.throw) });
    else if (s.phase === 'decide' && s.cur.type === 'def') act({ type: 'defend', hit: hit(M.contest(s, {})) });
    else if (s.phase === 'decide' && s.cur.deep) {
      // Aufbau: mal der lange Pass in die Tiefe, mal der Vorstoss, mal der sicherste kurze Pass
      const sc = s.cur, X = sc.carrier, dp = sc.deep, u = hr(), cd = M.contest(s, { type: 'dribble' });
      const short = s.teams.you.cards.filter(c => c.id !== X && c.id !== dp.run).map(c => ({ id: c.id, cp: M.contest(s, { type: 'pass', to: c.id }) })).sort((a, b) => b.cp.p - a.cp.p)[0];
      if (on && on.deep) on.deep(s);
      if (u < 0.35 && dp.run !== X) { const cp = M.contest(s, { type: 'pass', to: dp.run }); act({ type: 'pass', to: dp.run, hit: hit(cp) }); }
      else if (u < 0.7 && M.canDrib(s, sc)) act(cd.free ? { type: 'dribble' } : { type: 'dribble', hit: hit(cd) });      // beim Einschlag hinten muss der Ball gespielt werden
      else act({ type: 'pass', to: short.id, hit: hit(short.cp) });
    } else if (s.phase === 'decide') {
      const sc = s.cur, X = sc.carrier, pv = M.shotPreview(s, X); let to = null, bv = M.noShot(s, sc) ? -1 : pv.q * (1 - pv.block) + 0.15 * sc.step + (Math.abs(pv.oneT) >= 0.25 ? 0.3 : 0);      // Einschlag in der Ecke: kein direkter Schuss
      if (sc.step < sc.max - 1) s.teams.you.cards.forEach(c => { if (c.id === X) return; const cp = M.contest(s, { type: 'pass', to: c.id }), v = M.shotPreview(s, c.id, X), val = cp.p * (v.q + (Math.abs(v.oneT) >= 0.4 ? 0.3 : 0)) * 0.95; if (val > bv) { bv = val; to = c.id; } });
      if (to) act({ type: 'pass', to, hit: hit(M.contest(s, { type: 'pass', to })) }); else act({ type: 'shoot' });
    } else if (s.shot.side === 'you') {
      if (on && on.shot) on.shot(s);
      const st = policy === 'auto' ? s.shot.auto : policy === 'rand' ? M.STYLES[Math.floor(hr() * 3)] : policy;
      if (st !== s.shot.style && !s.shot.reb && !(s.shot.dead && st === 'drag')) act({ type: 'style', value: st });      // Standard direkt: kein Zugschuss
      const b = M.shotBar(s); act({ type: 'aim', target: bestTarget(s), hit: hit(b), t: 300 + hr() * b.sweep });
    } else {
      // Parade: Der Spieler wartet beim Zugschuss die Finte ab und reagiert dann wie sonst
      const sh = s.shot; if (on && on.faced) on.faced(sh);
      act({ type: 'aim', zone: hr() < 0.08 ? 'tm' : sh.zone, rt: (sh.feint ? sh.feint.ms : 0) + Math.max(150, 330 + gauss(hr) * 70) });
    }
  }
  return s;
}
{
  const N = 40, POLS = ['auto', 'slap', 'wrist', 'drag', 'rand'], goals = {}, real = [], homeShots = { slap: 0, wrist: 0, drag: 0 }; let err = null, feintOk = true, styleEv = true;
  try {
    POLS.forEach(pol => {
      goals[pol] = 0;
      for (let i = 1; i <= N; i++) {
        const s = playMatch(i, pol, pol !== 'auto' ? null : {
          shot: s0 => { if (s0.shot.ctx === 'so' || s0.shot.empty) return; const o = { auto: s0.shot.auto, g: {} }; M.STYLES.forEach(st => { const s2 = JSON.parse(JSON.stringify(s0)); M.setStyle(s2.cfg, s2.shot, st); o.g[st] = chance(s2, true).g; }); real.push(o); },
          faced: sh => { homeShots[sh.style]++; if ((sh.style === 'drag') !== !!sh.feint) feintOk = false; if (sh.feint && (Math.sign(sh.feint.land[0]) === Math.sign(sh.land[0]) && Math.abs(sh.land[0]) >= 0.34 || sh.feint.ms < M.CFG.feintMin || sh.feint.ms > M.CFG.feintMax)) feintOk = false; },
          ev: e => { if (e.t === 'shot' && M.STYLES.indexOf(e.style) < 0) styleEv = false; }
        });
        goals[pol] += s.score.you;
      }
    });
  } catch (e) { err = e; }
  ok(!err, `${POLS.length * N} ganze Matches laufen durch, mit jeder Wahl der Schussart` + (err ? ': ' + err.message : ''));
  if (!err) {
    // Dieselben Lagen, einmal mit der empfohlenen Art und einmal immer mit derselben: erwartete Torchance, ohne Würfelglück
    const exp = f => real.reduce((a, o) => a + f(o), 0) / real.length, eAuto = exp(o => o.g[o.auto]), eFix = {}; M.STYLES.forEach(k => { eFix[k] = exp(o => o.g[k]); });
    ok(M.STYLES.every(k => eAuto >= eFix[k] + 0.03), `über alle Schusslagen bringt die empfohlene Art klar mehr als immer dieselbe: empfohlen ${pc(eAuto)}, immer Schlag ${pc(eFix.slap)}, immer Handgelenk ${pc(eFix.wrist)}, immer Zug ${pc(eFix.drag)} (Tore pro Match im Lauf: ${POLS.map(k => k + ' ' + (goals[k] / N).toFixed(2)).join(', ')})`);
    const hit = real.filter(o => M.STYLES.every(k => o.g[o.auto] >= o.g[k] - 1e-9)).length / real.length, loss = real.reduce((a, o) => a + Math.max.apply(null, M.STYLES.map(k => o.g[k])) - o.g[o.auto], 0) / real.length;
    ok(real.length > 150 && hit >= 0.7 && loss <= 0.03, `in ${real.length} echten Schusslagen ist die Empfehlung in ${pc(hit)} die beste Art, im Mittel fehlen ${(loss * 100).toFixed(1)} Punkte Torchance`);
    const used = { slap: 0, wrist: 0, drag: 0 }; real.forEach(o => { used[o.auto]++; });
    ok(M.STYLES.every(k => used[k] / real.length >= 0.12), 'jede Schussart wird empfohlen: ' + M.STYLES.map(k => `${M.STYLE[k].short} ${pc(used[k] / real.length)}`).join(', '));
    const tot = homeShots.slap + homeShots.wrist + homeShots.drag;
    ok(M.STYLES.every(k => homeShots[k] / tot >= 0.15), 'der Gegner nutzt alle drei Schussarten: ' + M.STYLES.map(k => `${M.STYLE[k].short} ${pc(homeShots[k] / tot)}`).join(', '));
    ok(feintOk, 'Zugschuss des Gegners: immer mit Finte auf die andere Seite, sonst nie');
    ok(styleEv, 'jedes Schuss-Ereignis nennt die Schussart');
  }
}

// --- Schuss des Gegners: gleiche Lage, gleicher Zufall, nur die Schussart ist anders (im Penalty wählt eine Zufallszahl sie) ---
{
  const s0 = matchWith(shooter), X = s0.teams.home.cards[0], seq = l => { let i = 0; return () => (i < l.length ? l[i++] : 0.5); }, c = s0.cfg;
  const shot = u => { const s = JSON.parse(JSON.stringify(s0)); M.setShot(s, seq([0.5, 0.6, 0.5, 0.5, u]), 'home', X.id, 0.8, 'so'); return s.shot; };
  const d = shot(0.1), w = shot(0.6), sl = shot(0.9);
  ok(d.style === 'drag' && w.style === 'wrist' && sl.style === 'slap', 'Penalty des Gegners: jede Schussart kommt vor');
  ok(sl.window < w.window && Math.abs(sl.window - Math.max(c.rxMin, w.window * c.styles.slap.rx)) <= 1, `Schlagschuss des Gegners: weniger Zeit für die Parade (${sl.window} statt ${w.window} ms)`);
  ok(!!d.feint && !w.feint && !sl.feint && d.window - d.feint.ms === w.window && Math.sign(d.feint.land[0]) !== Math.sign(d.land[0]), `Zugschuss des Gegners: Der Ball zieht ${d && d.feint ? d.feint.ms : '?'} ms zur falschen Seite, danach bleibt so viel Zeit wie beim Handgelenk`);
}

// --- Schussart wechseln ---
{
  let s = matchWith(shooter), n = 0; const rng = E.makeRng(3);
  // bis zum ersten eigenen Angriff vorspulen
  while (!(s.phase === 'decide' && s.cur.type === 'att' && !s.cur.deep)) {
    if (++n > 500) throw new Error('kein eigener Angriff gefunden');
    s = M.act(s, s.phase === 'duel' ? { type: 'duel', rt: 200 } : s.phase === 'throw' ? { type: 'throw', quick: false } : s.phase === 'decide' && s.cur.type === 'att' ? { type: 'pass', to: s.teams.you.cards.find(c => c.id !== s.cur.carrier && c.id !== s.cur.deep.run).id, hit: s.cur.bar.pos } : s.phase === 'decide' ? { type: 'defend', hit: 0.9 } : s.phase !== 'aim' ? { type: 'next' } : s.shot.side === 'you' ? { type: 'aim', target: [0, 0.3], hit: 0.5, t: 300 } : { type: 'aim', zone: 'tm', rt: 9999 }, rng).state;
  }
  const x1 = M.act(s, { type: 'style', value: 'drag' }, rng); ok(!x1.ok, 'ohne Schuss lässt sich keine Schussart wählen');
  s = M.act(s, { type: 'shoot' }, rng).state;
  ok(s.phase === 'aim' && M.STYLES.indexOf(s.shot.style) >= 0 && s.shot.style === s.shot.auto && !!s.shot.why, 'beim Schuss ist die empfohlene Art eingestellt: ' + s.shot.style + ' (' + s.shot.why + ')');
  const a = M.act(s, { type: 'style', value: 'drag' }, rng), b = M.act(s, { type: 'style', value: 'slap' }, rng), c = s.cfg;
  ok(a.ok && a.state.shot.style === 'drag' && a.events.length === 0 && s.shot.style === s.shot.auto, 'Schussart wechseln: neuer Zustand, kein Ereignis, der alte bleibt');
  ok(Math.abs(a.state.shot.keeper.x + a.state.shot.pull * c.pull) <= 0.051 && Math.abs(b.state.shot.keeper.x) <= c.kOff + 1e-9 || !!s.shot.oneT, 'Zugschuss: Der Goalie steht noch auf der alten Seite, beim Schlagschuss in der Mitte');
  const tgt = [a.state.shot.pull * 0.8, 0.8], k0 = M.keeperAt(a.state, a.state.shot, tgt, 0), k1 = M.keeperAt(a.state, a.state.shot, tgt, c.pullDelay + 600);
  ok(k0 === a.state.shot.keeper.x && (k1 - k0) * a.state.shot.pull > 0.2, 'nach dem Zug rutscht der Goalie schnell zurück: wer wartet, verliert den Vorteil');
  ok(M.reach(b.state, b.state.shot) < M.reach(a.state, a.state.shot), 'der Schlagschuss ist härter: Der Goalie reicht weniger weit als beim Zug');
  ok(!M.act(s, { type: 'style', value: 'lob' }, rng).ok, 'unbekannte Schussart wird abgelehnt');
  const sh = M.act(a.state, { type: 'aim', target: tgt, hit: 0.5, t: 300 }, rng);
  ok(sh.ok && sh.events.some(e => e.t === 'shot' && e.style === 'drag'), 'der Schuss fällt in der gewählten Art');
}

console.log(fails ? '\n' + fails + ' Prüfungen fehlgeschlagen' : '\nAlle Prüfungen bestanden');
process.exit(fails ? 1 : 0);
