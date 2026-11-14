/* Torquote eines Schusses nach Abschlusswert und Lage, für die drei Modell-Spieler. node sim/shots.js [n]
   Zeigt, ob Distanz und Schütze spürbar sind: ein guter Schütze aus der Nähe muss klar öfter treffen als ein schwacher
   aus der Distanz. Lage 1 ist direkt vor dem Tor, 0.25 weit weg. */
'use strict';
const { box, PROFILES, shotPlan, gauss } = require('./match.js');
const E = box.HK, W = box.HKWorld, M = box.HKMatch, n = +process.argv[2] || 3000;
const col = E.DATA.collection, top = (pos, k) => col.filter(c => c.pos === pos).sort((a, b) => b.ovr - a.ovr).slice(0, k);
const base = M.newMatch({ you: { goalie: { val: 88 }, cards: top('ATT', 3).concat(top('DEF', 2)) }, home: { goalie: { val: 88 }, cards: W.guard(W.create(), 'koeniz') } }, E.makeRng(1));
const QS = [0.25, 0.5, 0.75, 1], VALS = [70, 80, 90, 97];
console.log('Zielkreis (Radius) und freies Feld auf der fernen Seite, in halben Torbreiten:');
VALS.forEach(v => { const s = JSON.parse(JSON.stringify(base)), X = s.teams.you.cards[0]; X.sco = v; X.clu = 80; X.frm = 80; console.log('Abschluss ' + v + ': ' + QS.map(q => { const sh = { side: 'you', x: X.id, q, ctx: 'attack' }; return 'Lage ' + q + ' Kreis ' + M.rad(s, sh).toFixed(2) + ' frei ' + (1 + s.cfg.kAmp - M.reach(s, sh, false)).toFixed(2); }).join(' | ')); });
Object.keys(PROFILES).forEach(name => {
  const pf = PROFILES[name], r = E.makeRng(7);
  console.log('\nTorquote, Spieler ' + name + ':   ' + QS.map(q => ('Lage ' + q).padStart(9)).join(''));
  VALS.forEach(v => {
    const row = QS.map(q => {
      let g = 0;
      for (let i = 0; i < n; i++) {
        const s = JSON.parse(JSON.stringify(base)), X = s.teams.you.cards[0]; X.sco = v; X.clu = 80; X.frm = 80;
        M.setShot(s, r, 'you', X.id, q, 'attack');
        const pl = shotPlan(s), x = M.act(s, { type: 'aim', t: Math.max(0, pl.t + gauss(r) * pf.rel), target: [pl.target[0] + gauss(r) * pf.aim, pl.target[1] + gauss(r) * pf.aim * 0.7] }, r);
        if (x.events[0].result === 'goal') g++;
      }
      return (100 * g / n).toFixed(0).padStart(8) + '%';
    });
    console.log(('Abschluss ' + v).padEnd(26) + row.join(''));
  });
});
