/* Simulation für das Testduell unter /lab/. node sim/lab.js [n] [key=value ...] */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const box = {}; vm.createContext(box);
['src/engine.js', 'src/world.js', 'src/lab/duel.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), box));
const E = box.HK, W = box.HKWorld, D = box.HKDuel;
const n = +process.argv[2] || 3000, cfg = JSON.parse(JSON.stringify(D.CFG));
process.argv.slice(3).forEach(kv => { const [k, v] = kv.split('='), p = k.split('.'); if (p.length === 2) cfg[p[0]][p[1]] = +v; else cfg[k] = +v; });
const col = E.DATA.collection, pick = (l, r) => l[Math.floor(r() * l.length)];
const top = (pos, k) => col.filter(c => c.pos === pos).sort((a, b) => b.ovr - a.ovr).slice(0, k);
const SQ = { standard: top('ATT', 4).concat(top('DEF', 2)), weak: col.slice().sort((a, b) => a.ovr - b.ovr).slice(0, 6) };
const shift = (sq, d) => sq.map(c => { const x = Object.assign({}, c); ['sco', 'ply', 'clu', 'fai', 'frm', 'exp'].forEach(k => { x[k] = Math.max(40, Math.min(99, x[k] + d)); }); return x; });
function maxKey(w, r) { const m = Math.max(...Object.values(w)), k = Object.keys(w).filter(x => w[x] === m); return pick(k, r); }
function minKey(w, r) { const m = Math.min(...Object.values(w)), k = Object.keys(w).filter(x => w[x] === m); return pick(k, r); }
// vernünftig: wählt nach dem, was die Oberfläche zeigt (Verlauf, Stärke), nicht nach verdeckten Wahlen
const reasonable = (s, r) => {
  const cur = s.cur;
  if (s.phase === 'pick' && cur.side === 'you') {
    const Dc = D.card(s, 'home', cur.defender); let bestV = -1, out = null;
    const atts = D.usable(s, 'you').filter(c => c.pos === 'ATT'), cand = atts.length ? atts : D.usable(s, 'you');
    cand.forEach(A => { const w = D.readWeights(s, A), tot = w.direkt + w.kombi + w.solo;
      E.MOVES.forEach(m => { const pr = w[m.id] / tot, th = (1 - pr) * D.through(s, A, m, Dc, false) + pr * D.through(s, A, m, Dc, true); if (th > bestV) { bestV = th; out = { type: 'play', card: A.id, option: m.id }; } }); });
    return out;
  }
  if (s.phase === 'pick') {
    const A = D.card(s, 'home', cur.attacker), seen = s.hist.homeMoves[A.id] || [], w = E.tendency(A);
    seen.forEach(m => { w[m] += 0.25; });
    const mv = maxKey(w, r), defs = D.usable(s, 'you').filter(c => c.pos === 'DEF'), cand = defs.length ? defs : D.usable(s, 'you');
    const Dc = cand.slice().sort((a, b) => E.eff(E.defVal(b), b) - E.eff(E.defVal(a), a))[0];
    return { type: 'play', card: Dc.id, option: E.STANCES.filter(x => x.stops === mv)[0].id };
  }
  if (s.phase === 'aim' && cur.shot.side === 'you') return { type: 'aim', corner: minKey(D.keeperWeights(s), r) };
  if (s.phase === 'aim') { const seen = s.hist.homeShots[cur.shot.x] || []; if (!seen.length) return { type: 'aim', corner: pick(['l', 'r'], r) }; const c = { l: 0, m: 0, r: 0 }; seen.forEach(x => c[x]++); return { type: 'aim', corner: maxKey(c, r) }; }
  return { type: 'next' };
};
const random = (s, r) => {
  if (s.phase === 'pick') return { type: 'play', card: pick(D.usable(s, 'you'), r).id, option: pick(s.cur.side === 'you' ? E.MOVES : E.STANCES, r).id };
  if (s.phase === 'aim') return { type: 'aim', corner: pick(['l', 'm', 'r'], r) };
  return { type: 'next' };
};
const randomMove = (s, r) => { const a = reasonable(s, r); if (a.type === 'play' && s.cur.side === 'you') a.option = pick(E.MOVES, r).id; if (a.type === 'aim' && s.cur.shot.side === 'you') a.corner = pick(['l', 'm', 'r'], r); return a; };
function run(name, pol, squad, seed) {
  const r = E.makeRng(seed), m = { win: 0, gf: 0, ga: 0, so: 0, readYou: 0, att: 0, readThem: 0, def: 0, shots: 0, goals: 0, faced: 0, saved: 0, counters: 0, taps: 0 };
  for (let i = 0; i < n; i++) {
    let s = D.newMatch({ homeName: 'Köniz', cfg, you: { goalie: { val: cfg.goalie }, cards: squad }, home: { goalie: { val: cfg.goalie }, cards: W.guard(W.create(), 'koeniz') } }, r), g = 0;
    while (s.phase !== 'end') { const a = pol(s, r); if (a.type !== 'next') m.taps++; const x = D.act(s, a, r); if (!x.ok) throw new Error('ungültig ' + JSON.stringify(a) + ' ' + s.phase); s = x.state; if (++g > 400) throw new Error('endlos'); }
    if (s.outcome === 'win' || s.outcome === 'penwin') m.win++; if (s.pen) m.so++;
    m.gf += s.score.you; m.ga += s.score.home; ['readYou', 'att', 'readThem', 'def', 'shots', 'goals', 'faced', 'saved', 'counters'].forEach(k => { m[k] += s.stats[k]; });
  }
  const p = v => (100 * v).toFixed(1).padStart(5) + '%', f = v => v.toFixed(2);
  console.log(name.padEnd(22), 'Sieg', p(m.win / n), ' Tore', f((m.gf + m.ga) / n), f(m.gf / n) + ':' + f(m.ga / n), ' Penaltys', p(m.so / n),
    ' gelesen wirst du', p(m.readYou / m.att), ' du liest', p(m.readThem / m.def), ' deine Schüsse', p(m.goals / m.shots), ' Paraden', p(m.saved / m.faced), ' Konter/M', f(m.counters / n), ' Taps/M', f(m.taps / n));
}
console.log('Testduell gegen Köniz, ' + n + ' Matches je Zeile, ' + cfg.duels + ' Duelle');
run('vernünftig', reasonable, SQ.standard, 11);
run('vernünftig, schwach', reasonable, SQ.weak, 12);
run('vernünftig, Werte -8', reasonable, shift(SQ.standard, -8), 15);
run('zufälliger Zug+Ecke', randomMove, SQ.standard, 13);
run('ganz zufällig', random, SQ.standard, 14);
