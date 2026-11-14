/* Shop und Team: Pool, Packs, Startteam und Siegchancen je nach Teamstärke. node sim/club.js [n] */
'use strict';
const { box, policy, PROFILES } = require('./match.js');
const reasonable = policy(PROFILES.mittel);   // durchschnittlicher Spieler
const E = box.HK, M = box.HKMatch, C = box.HKClub;
const n = +process.argv[2] || 400;
const B = C.BUCKET; console.log('Pool', C.POOL.length, 'Gold', B.gold.length, 'Silber', B.silver.length, 'Bronze', B.bronze.length);
console.log('Gold:', B.gold.map(c => c.last + ' ' + c.ovr + (M.trait(c) ? '*' : '')).join(', '));
console.log('Fähigkeiten im Pool:', C.POOL.filter(c => M.trait(c)).length);
const st = C.fresh(1); console.log('Start', C.lineCards(st).map(c => c.last + ' ' + c.pos + ' ' + c.ovr).join(', '), 'Team', C.teamOvr(st.lineup));
C.OPPS.forEach(o => { const cs = C.oppCards(o.id, []); console.log(o.id.padEnd(7), cs.map(c => c.last + ' ' + c.ovr).join(', '), 'Stärke', M.strength(cs).toFixed(1)); });
// Packs: Erwartung pro Pack
C.PACKS.forEach(p => { let s = Object.assign({}, st, { coins: 1e9, owned: [] }), g = 0, sv = 0; const r = E.makeRng(5); for (let i = 0; i < 2000; i++) { const x = C.open(s, p.id, r); x.cards.forEach(c => { if (c.rarity === 'gold') g++; if (c.rarity === 'silver') sv++; }); } console.log(p.name.padEnd(8), 'Gold/Pack', (g / 2000).toFixed(2), 'Silber/Pack', (sv / 2000).toFixed(2)); });
// Siegchance: Linie aus Karten einer Zielstärke gegen jeden Gegner
const near = (pos, ovr, k) => C.POOL.filter(c => c.pos === pos).sort((a, b) => Math.abs(a.ovr - ovr) - Math.abs(b.ovr - ovr)).slice(0, k);
[['Start', C.lineCards(st)], ['~80', near('ATT', 80, 3).concat(near('DEF', 80, 2))], ['~86', near('ATT', 86, 3).concat(near('DEF', 86, 2))], ['~91', near('ATT', 91, 3).concat(near('DEF', 91, 2))], ['Top', C.POOL.filter(c => c.pos === 'ATT').sort((a, b) => b.ovr - a.ovr).slice(0, 3).concat(C.POOL.filter(c => c.pos === 'DEF').sort((a, b) => b.ovr - a.ovr).slice(0, 2))]].forEach(([name, sq]) => {
  const line = [];
  C.OPPS.forEach((o, i) => {
    const r = E.makeRng(100 + i); let w = 0, coins = 0;
    for (let k = 0; k < n; k++) {
      let s = M.newMatch({ you: { goalie: { val: 88 }, cards: sq }, home: { goalie: { val: 88 }, cards: C.oppCards(o.id, sq.map(c => c.id)) } }, r);
      while (s.phase !== 'end') s = M.act(s, reasonable(s, r), r).state;
      const won = s.outcome === 'win' || s.outcome === 'penwin'; if (won) w++; coins += C.reward(o.id, won, s.score.you);
    }
    line.push(o.id + ' ' + (100 * w / n).toFixed(0) + '% ' + Math.round(coins / n) + 'M');
  });
  console.log(name.padEnd(6), Math.round(sq.reduce((a, c) => a + c.ovr, 0) / 5), line.join('  '));
});
