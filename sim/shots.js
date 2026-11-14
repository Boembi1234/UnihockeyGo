/* Torquote eines Schusses nach Abschlusswert und Lage, für die drei Modell-Spieler. node sim/shots.js [n] [key=value ...]
   Zeigt, ob Distanz und Schütze spürbar sind: ein guter Schütze aus der Nähe muss klar öfter treffen als ein schwacher
   aus der Distanz. Lage 1 ist direkt vor dem Tor, 0.25 weit weg. */
'use strict';
const { box, PROFILES, shotPlan, gauss } = require('./match.js');
const E = box.HK, W = box.HKWorld, M = box.HKMatch, n = +process.argv[2] || 3000;
const col = E.DATA.collection, top = (pos, k) => col.filter(c => c.pos === pos).sort((a, b) => b.ovr - a.ovr).slice(0, k);
const base = M.newMatch({ you: { goalie: { val: 88 }, cards: top('ATT', 3).concat(top('DEF', 2)) }, home: { goalie: { val: 88 }, cards: W.guard(W.create(), 'koeniz') } }, E.makeRng(1));
process.argv.slice(3).forEach(kv => { const [k, v] = kv.split('='); base.cfg[k] = +v; });
const QS = [0.25, 0.5, 0.75, 1], VALS = [70, 80, 90, 97];
console.log('Dauer eines Durchlaufs des Schuss-Balkens in ms und freies Feld neben dem Goalie (hoch), in halben Torbreiten:');
const shooter = (s, v, en) => { const X = s.teams.you.cards[0]; X.sco = v; X.clu = 80; X.frm = 80; X.en = en === undefined ? 100 : en; return X; };
VALS.forEach(v => { const s = JSON.parse(JSON.stringify(base)), X = shooter(s, v); M.setShot(s, E.makeRng(1), 'you', X.id, 1, 'attack'); console.log('Abschluss ' + v + ': Durchlauf ' + M.shotBar(s).sweep + ' ms, müde (Energie 30) ' + (X.en = 30, M.shotBar(s).sweep) + ' ms | frei ' + QS.map(q => 'Lage ' + q + ' ' + M.freeW(s, { x: X.id, q, ctx: 'attack' }, true).toFixed(2)).join(', ')); });
const rate = (pf, r, v, q, en) => {
  let g = 0;
  for (let i = 0; i < n; i++) {
    const s = JSON.parse(JSON.stringify(base)), X = shooter(s, v, en);
    M.setShot(s, r, 'you', X.id, q, 'attack');
    const pl = shotPlan(s), b = M.shotBar(s), x = M.act(s, { type: 'aim', hit: Math.max(0, Math.min(1, b.pos + gauss(r) * pf.s / b.sweep)), target: [pl.target[0] + gauss(r) * pf.aim, pl.target[1] + gauss(r) * pf.aim * 0.7] }, r);
    if (x.events[0].result === 'goal') g++;
  }
  return (100 * g / n).toFixed(0).padStart(8) + '%';
};
Object.keys(PROFILES).forEach(name => {
  const pf = PROFILES[name], r = E.makeRng(7);
  console.log('\nTorquote, Spieler ' + name + ':   ' + QS.map(q => ('Lage ' + q).padStart(9)).join('') + '     müde (Energie 30), Lage 0.75');
  VALS.forEach(v => console.log(('Abschluss ' + v).padEnd(26) + QS.map(q => rate(pf, r, v, q)).join('') + '   ' + rate(pf, r, v, 0.75, 30)));
});
