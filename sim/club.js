/* Shop und Team: Pool, Packs, Startteam und Siegchancen je nach Teamstärke. node sim/club.js [n] */
'use strict';
const { box, policy, PROFILES } = require('./match.js');
const reasonable = policy(PROFILES.mittel);   // durchschnittlicher Spieler
const E = box.HK, M = box.HKMatch, C = box.HKClub;
const n = +process.argv[2] || 400;
const B = C.BUCKET; console.log('Pool', C.POOL.length, 'Gold', B.gold.length, 'Silber', B.silver.length, 'Bronze', B.bronze.length);
console.log('Gold:', B.gold.map(c => c.last + ' ' + c.ovr + (M.trait(c) ? '*' : '')).join(', '));
console.log('Fähigkeiten im Pool:', C.POOL.filter(c => M.trait(c)).length);
const st = C.fresh(1); console.log('Start', C.lineCards(st).map(c => c.last + ' ' + c.pos + ' ' + c.ovr).join(', '), '| 2. Linie', C.line2Cards(st).map(c => c.last + ' ' + c.ovr).join(', '), '| Team', C.teamOvr(st.lineup), C.teamOvr(st.line2));
C.OPPS.forEach(o => { const l = C.oppLines(o.id, []); console.log(o.id.padEnd(7), l.map(cs => cs.map(c => c.last + ' ' + c.ovr).join(', ') + ' (' + M.strength(cs).toFixed(1) + ')').join(' | '), 'Karten', o.tac.join(',')); });
// Packs: Erwartung pro Pack
C.PACKS.forEach(p => { let s = Object.assign({}, st, { coins: 1e9, owned: [] }), g = 0, sv = 0; const r = E.makeRng(5); for (let i = 0; i < 2000; i++) { const x = C.open(s, p.id, r); x.cards.forEach(c => { if (c.rarity === 'gold') g++; if (c.rarity === 'silver') sv++; }); } console.log(p.name.padEnd(8), 'Gold/Pack', (g / 2000).toFixed(2), 'Silber/Pack', (sv / 2000).toFixed(2)); });
// Siegchance: zwei Linien einer Zielstärke (die zweite fünf Punkte schwächer) gegen jeden Gegner mit seinen zwei Linien und Taktikkarten
const near = (pos, ovr, k, skip) => C.POOL.filter(c => c.pos === pos && !(skip || []).some(x => x.id === c.id)).sort((a, b) => Math.abs(a.ovr - ovr) - Math.abs(b.ovr - ovr)).slice(0, k);
const two = v => { const l1 = near('ATT', v, 3).concat(near('DEF', v, 2)); return [l1, near('ATT', v - 5, 3, l1).concat(near('DEF', v - 5, 2, l1))]; };
[['Start', [C.lineCards(st), C.line2Cards(st)]], ['~80', two(80)], ['~86', two(86)], ['~91', two(91)], ['Top', two(96)]].forEach(([name, sq]) => {
  const line = [], ids = sq[0].concat(sq[1]).map(c => c.id);
  C.OPPS.forEach((o, i) => {
    const r = E.makeRng(100 + i), ol = C.oppLines(o.id, ids); let w = 0, coins = 0;
    for (let k = 0; k < n; k++) {
      let s = M.newMatch({ you: { goalie: { val: 88 }, cards: sq[0], bench: sq[1], tac: st.tac }, home: { goalie: { val: 88 }, cards: ol[0], bench: ol[1], tac: C.oppTac(o.id) } }, r);
      while (s.phase !== 'end') s = M.act(s, reasonable(s, r), r).state;
      const won = s.outcome === 'win' || s.outcome === 'penwin'; if (won) w++; coins += C.reward(o.id, won, s.score.you);
    }
    line.push(o.id + ' ' + (100 * w / n).toFixed(0) + '% ' + Math.round(coins / n) + 'M');
  });
  console.log(name.padEnd(6), Math.round(sq[0].reduce((a, c) => a + c.ovr, 0) / 5) + '/' + Math.round(sq[1].reduce((a, c) => a + c.ovr, 0) / 5), line.join('  '));
});
