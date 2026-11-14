/* Simulation für das Match mit Schlüsselszenen. node sim/match.js [n] [key=value ...] */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const box = {}; box.window = box; vm.createContext(box);
['src/engine.js', 'src/world.js', 'src/lab/match.js', 'src/lab/pool.js', 'src/lab/club.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), box));
const E = box.HK, W = box.HKWorld, M = box.HKMatch;
const n = +process.argv[2] || 2000, cfg = JSON.parse(JSON.stringify(M.CFG));
process.argv.slice(3).forEach(kv => { const [k, v] = kv.split('='); cfg[k] = +v; });
const col = E.DATA.collection, pick = (l, r) => l[Math.floor(r() * l.length)];
const top = (pos, k) => col.filter(c => c.pos === pos).sort((a, b) => b.ovr - a.ovr).slice(0, k);
const SQ = top('ATT', 3).concat(top('DEF', 2));
const shift = (sq, d) => sq.map(c => { const x = Object.assign({}, c); ['sco', 'ply', 'clu', 'fai', 'frm', 'exp', 'ovr'].forEach(k => { x[k] = Math.max(40, Math.min(99, x[k] + d)); }); return x; });
function minKey(w, r) { const m = Math.min(...Object.values(w)), k = Object.keys(w).filter(x => w[x] === m); return pick(k, r); }
// vernünftig: schiesst bei guter Chance, passt in gute Lagen mit kleinem Risiko, dribbelt mit Vorteil; liest in der Abwehr die Lage
const reasonable = (s, r) => {
  const sc = s.cur;
  if (s.phase === 'decide' && sc.type === 'att') {
    const X = sc.carrier, sh = M.shotInfo(s, sc, X), last = sc.step >= sc.max - 1;
    const vShot = sh.q * (1 - sh.block);
    if (last) return { type: 'shoot' };
    let best = { v: vShot * 1.05, a: { type: 'shoot' } };
    s.teams.you.cards.forEach(c => { if (c.id === X) return; const pi = M.passInfo(s, sc, X, c.id), v = (1 - pi.risk) * M.shotInfo(s, sc, c.id).q * 0.95; if (v > best.v) best = { v, a: { type: 'pass', to: c.id } }; });
    const di = M.dribInfo(s, sc, X), vd = di.p * Math.min(1, sh.q + 0.25) * 0.95; if (vd > best.v) best = { v: vd, a: { type: 'dribble' } };
    return best.a;
  }
  if (s.phase === 'decide') {
    // liest die Lage: gute Schussposition → blocken, sonst den gefährlichsten Passweg zustellen oder Druck
    const X = sc.carrier, sh = M.shotInfo(s, sc, X);
    if (sh.q > 0.55) return { type: 'defend', action: 'block' };
    let bt = null, bv = 0; s.teams.home.cards.forEach(c => { if (c.id === X) return; const v = (1 - M.passInfo(s, sc, X, c.id).risk) * M.shotInfo(s, sc, c.id).q; if (v > bv) { bv = v; bt = c.id; } });
    return r() < 0.6 ? { type: 'defend', action: 'lane', target: bt } : { type: 'defend', action: 'press' };
  }
  if (s.phase === 'aim' && s.shot.side === 'you') { const X = M.card(s, 'you', s.shot.x), z = minKey(M.keeperWeights(s), r), c = M.ZC[z], weak = Math.max(0, (95 - M.shotVal(X)) / 30); return { type: 'aim', target: [c[0] * (1 - 0.35 * weak), c[1] * (1 - 0.25 * weak)], power: 0.55 }; }
  if (s.phase === 'aim') { const col = s.shot.tell; return { type: 'aim', zone: (r() < 0.5 ? 't' : 'b') + col }; }
  return { type: 'next' };
};
const random = (s, r) => {
  const sc = s.cur;
  if (s.phase === 'decide' && sc.type === 'att') { const o = sc.step >= sc.max - 1 ? ['shoot'] : ['shoot', 'pass', 'dribble'], t = pick(o, r); return t === 'pass' ? { type: 'pass', to: pick(s.teams.you.cards.filter(c => c.id !== sc.carrier), r).id } : { type: t }; }
  if (s.phase === 'decide') { const a = pick(['press', 'block', 'lane'], r); return { type: 'defend', action: a, target: a === 'lane' ? pick(s.teams.home.cards.filter(c => c.id !== sc.carrier), r).id : null }; }
  if (s.phase === 'aim') return s.shot.side === 'you' ? { type: 'aim', target: [r() * 2 - 1, r()], power: r() } : { type: 'aim', zone: pick(M.ZONES, r) };
  return { type: 'next' };
};
function run(name, pol, squad, hall, seed) {
  const r = E.makeRng(seed), m = { win: 0, gf: 0, ga: 0, so: 0, att: 0, decisions: 0, shots: 0, goals: 0, faced: 0, saved: 0, stops: 0, def: 0, share: 0 };
  for (let i = 0; i < n; i++) {
    let s = M.newMatch({ homeName: hall, cfg, you: { goalie: { val: 88 }, cards: squad }, home: { goalie: { val: 88 }, cards: W.guard(W.create(), hall) } }, r), g = 0;
    m.share += s.attShare;
    while (s.phase !== 'end') { const a = pol(s, r); if (a.type !== 'next') m.decisions++; const x = M.act(s, a, r); if (!x.ok) throw new Error('ungültig ' + JSON.stringify(a) + ' ' + s.phase + ' ' + JSON.stringify(s.cur && { t: s.cur.type, step: s.cur.step, max: s.cur.max })); s = x.state; if (++g > 600) throw new Error('endlos'); }
    if (s.outcome === 'win' || s.outcome === 'penwin') m.win++; if (s.pen) m.so++;
    m.gf += s.score.you; m.ga += s.score.home; ['att', 'def', 'shots', 'goals', 'faced', 'saved', 'stops'].forEach(k => { m[k] += s.stats[k]; });
  }
  const p = v => (100 * v).toFixed(1).padStart(5) + '%', f = v => v.toFixed(2);
  console.log(name.padEnd(24), 'Sieg', p(m.win / n), ' Tore', f((m.gf + m.ga) / n), f(m.gf / n) + ':' + f(m.ga / n), ' Penaltys', p(m.so / n), ' Angriffe', f(m.att / n), '(' + p(m.share / n) + ')', ' Schüsse', f(m.shots / n), p(m.goals / Math.max(1, m.shots)), ' gegen dich', f(m.faced / n), ' Ballgewinne/Abwehr', p(m.stops / Math.max(1, m.def)), ' Entscheide/M', f(m.decisions / n));
}
module.exports = { box, reasonable, random };
if (require.main === module) ['koeniz', 'wiler', 'gc'].forEach((h, i) => {
  console.log('--- gegen ' + h);
  run('vernünftig', reasonable, SQ, h, 11 + i);
  run('vernünftig, Werte -8', reasonable, shift(SQ, -8), h, 21 + i);
  run('zufällig', random, SQ, h, 31 + i);
});
