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
  return M.newMatch({ homeName: 'Test', you: { goalie: { val: 88 }, cards: [X].concat(mates.slice(0, 2), def.slice(10, 12)) }, home: { goalie: { val: 88 }, cards: mates.slice(2, 5).concat(def.slice(12, 14)) } }, E.makeRng(7));
}
function lay(o, X) {
  const s = matchWith(X || shooter), out = {};
  M.STYLES.forEach(st => { const sh = { side: 'you', x: (X || shooter).id, q: o.q, ctx: 'attack', by: s.teams.home.cards[3].id, start: 0, oneT: o.oneT || 0, kr: 0, lane: o.lane || 0, tight: o.tight || 0, bk: 0.65, pull: 1 }; M.setStyle(s.cfg, sh, st); s.shot = sh; out[st] = chance(s); });
  out.pick = M.pickStyle(s.cfg, X || shooter, Object.assign({ bk: 0.65 }, o));
  out.best = M.STYLES.reduce((a, k) => (out[k].g > out[a].g ? k : a), 'slap');
  out.txt = M.STYLES.map(k => `${M.STYLE[k].short} ${pc(out[k].g)}`).join(', ');
  return out;
}
const second = (r, st) => Math.max.apply(null, M.STYLES.filter(k => k !== st).map(k => r[k].g));

// --- Jede Schussart hat ihre Lage ---
let r = lay({ q: 0.25 });
ok(r.best === 'slap' && r.slap.g - second(r, 'slap') >= 0.05 && r.pick.style === 'slap' && r.pick.why === 'far', 'aus der Distanz und frei ist der Schlagschuss klar am besten: ' + r.txt);
r = lay({ q: 0.65, oneT: 0.8 });
ok(r.best === 'slap' && r.slap.g - second(r, 'slap') >= 0.08 && r.pick.style === 'slap' && r.pick.why === 'direct', 'Direktschuss nach Querpass: Schlagschuss klar am besten: ' + r.txt);
r = lay({ q: 0.9 });
ok(r.best === 'wrist' && r.wrist.g - second(r, 'wrist') >= 0.02 && r.pick.style === 'wrist' && r.pick.why === 'near', 'aus der Nähe und frei ist das Handgelenk am besten: ' + r.txt);
r = lay({ q: 0.85, tight: 0.7, lane: 0.3 });
ok(r.best === 'wrist' && r.wrist.g - second(r, 'wrist') >= 0.08 && r.pick.style === 'wrist' && r.pick.why === 'tight', 'Gegner am Mann: Handgelenk klar am besten: ' + r.txt);
r = lay({ q: 0.6, lane: 1 });
ok(r.best === 'drag' && r.drag.g - second(r, 'drag') >= 0.08 && r.pick.style === 'drag' && r.pick.why === 'lane', 'Gegner in der Schussbahn: Zugschuss klar am besten: ' + r.txt);
ok(r.slap.bl >= 0.5 && r.drag.bl <= 0.05 && r.wrist.bl > r.drag.bl, `in der Schussbahn wird der Schlagschuss meist geblockt (${pc(r.slap.bl)}), der Zug fast nie (${pc(r.drag.bl)})`);
r = lay({ q: 0.85, lane: 0.9 });
ok(r.best === 'drag' && r.pick.style === 'drag', 'auch aus der Nähe: Gegner in der Bahn heisst Zugschuss: ' + r.txt);
r = lay({ q: 0.62 });
ok(Math.max(r.slap.g, r.wrist.g, r.drag.g) - Math.min(r.slap.g, r.wrist.g, r.drag.g) <= 0.08 && r.pick.why === 'fav' && r.pick.style === M.favStyle(shooter), 'aus mittlerer Distanz und frei liegen alle nah beisammen, der Lieblingsschuss entscheidet: ' + r.txt);
// Lieblingsschuss: breiteres Feld
{
  const s = matchWith(shooter), mk = st => { const sh = { side: 'you', x: shooter.id, q: 0.62, ctx: 'attack', start: 0, oneT: 0, kr: 0, lane: 0, tight: 0, bk: 0, pull: 1 }; M.setStyle(s.cfg, sh, st); s.shot = sh; return M.shotBar(s); };
  const a = mk('slap'), b = mk('wrist'), c = s.cfg;
  ok(a.fav && !b.fav && Math.abs(a.w / c.styles.slap.w - b.w / c.styles.wrist.w * c.favW) < 1e-9, 'im Lieblingsschuss ist das Feld um ' + pc(c.favW - 1) + ' breiter');
  ok(a.sweep < b.sweep, 'beim Schlagschuss läuft der Strich schneller als beim Handgelenk');
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
    else if (s.phase === 'decide' && s.cur.type === 'def') act({ type: 'defend', hit: hit(M.contest(s, {})) });
    else if (s.phase === 'decide') {
      const sc = s.cur, X = sc.carrier, pv = M.shotPreview(s, X); let to = null, bv = pv.q * (1 - pv.block) + 0.15 * sc.step + (Math.abs(pv.oneT) >= 0.25 ? 0.3 : 0);
      if (sc.step < sc.max - 1) s.teams.you.cards.forEach(c => { if (c.id === X) return; const cp = M.contest(s, { type: 'pass', to: c.id }), v = M.shotPreview(s, c.id, X), val = cp.p * (v.q + (Math.abs(v.oneT) >= 0.4 ? 0.3 : 0)) * 0.95; if (val > bv) { bv = val; to = c.id; } });
      if (to) act({ type: 'pass', to, hit: hit(M.contest(s, { type: 'pass', to })) }); else act({ type: 'shoot' });
    } else if (s.shot.side === 'you') {
      if (on && on.shot) on.shot(s);
      const st = policy === 'auto' ? s.shot.auto : policy === 'rand' ? M.STYLES[Math.floor(hr() * 3)] : policy;
      if (st !== s.shot.style) act({ type: 'style', value: st });
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
    ok(M.STYLES.every(k => homeShots[k] / tot >= 0.2), 'der Gegner nutzt alle drei Schussarten: ' + M.STYLES.map(k => `${M.STYLE[k].short} ${pc(homeShots[k] / tot)}`).join(', '));
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
  while (!(s.phase === 'decide' && s.cur.type === 'att')) {
    if (++n > 500) throw new Error('kein eigener Angriff gefunden');
    s = M.act(s, s.phase === 'decide' ? { type: 'defend', hit: 0.9 } : s.phase !== 'aim' ? { type: 'next' } : s.shot.side === 'you' ? { type: 'aim', target: [0, 0.3], hit: 0.5, t: 300 } : { type: 'aim', zone: 'tm', rt: 9999 }, rng).state;
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
