/* Diagnose: woher kommen die Tore, je Seite. node sim/diag.js <n> <hall> key=val,key=val */
'use strict';
const path = require('path'), sim = require('./sim.js');
const HK = sim.loadEngine(path.join(__dirname, '..', 'src/engine.js'));
const n = +process.argv[2] || 2000, hallId = process.argv[3] || 'koeniz', cfgArg = process.argv[4] || '';
const o = {}; cfgArg.split(',').filter(Boolean).forEach(kv => { const p = kv.split('='), k = p[0].split('.'); if (k.length === 2) { o[k[0]] = o[k[0]] || {}; o[k[0]][k[1]] = +p[1]; } else o[p[0]] = +p[1]; });
const cfg = Object.assign({}, HK.CFG, o); ['counter', 'twoMin'].forEach(k => { cfg[k] = Object.assign({}, HK.CFG[k], o[k] || {}); });
const P = sim.makePolicies(HK, sim.makeEV(HK)), sq = sim.squads(HK), hall = HK.DATA.halls.filter(h => h.id === hallId)[0];
const rng = HK.makeRng(42), pol = P.reasonable({});
const mk = () => ({ att: 0, read: 0, foul: 0, s1u: [0, 0], s1r: [0, 0], s2: [0, 0], s3: [0, 0], goals: { attack: 0, counter: 0, free: 0, pen: 0 }, counters: 0, cs2: [0, 0], cs3: [0, 0], free: 0, fs2: [0, 0], fs3: [0, 0], stance: { block: 0, pass: 0, zwei: 0 }, move: { direkt: 0, kombi: 0, solo: 0 }, defs: {}, atts: {} });
const T = { you: mk(), home: mk() };
for (let i = 0; i < n; i++) {
  const s = sim.playMatch(HK, HK.act, pol, hall, sq.standard, 'steiner', rng, cfg);
  s.log.forEach(e => {
    if (e.so) return;
    const t = T[e.side]; t.att++; if (e.read) t.read++; t.stance[e.stance]++; t.move[e.move]++;
    t.defs[e.d] = (t.defs[e.d] || 0) + 1; t.atts[e.a] = (t.atts[e.a] || 0) + 1;
    e.steps.forEach(st => {
      const u = T[st.side];
      if (st.t === 'foul') t.foul++;
      else if (st.t === 's1') { const a = st.read ? t.s1r : t.s1u; a[0]++; if (st.ok) a[1]++; }
      else if (st.t === 'counter') u.counters++;
      else if (st.t === 'free') u.free++;
      else if (st.t === 's2') { const a = st.ctx === 'attack' ? u.s2 : st.ctx === 'counter' ? u.cs2 : u.fs2; a[0]++; if (st.ok) a[1]++; }
      else if (st.t === 's3') { const a = st.ctx === 'attack' ? u.s3 : st.ctx === 'counter' ? u.cs3 : u.fs3; a[0]++; if (st.ok) { a[1]++; u.goals[st.ctx]++; } }
      else if (st.t === 'pen' && st.ok) u.goals.pen++;
    });
  });
}
const r = a => a[0] ? (100 * a[1] / a[0]).toFixed(0) + '%' : '-', f = v => (v / n).toFixed(2);
['you', 'home'].forEach(k => {
  const t = T[k];
  console.log('\n' + (k === 'you' ? 'DU greifst an' : hall.short + ' greift an') + ': gelesen ' + (100 * t.read / t.att).toFixed(0) + '%, Foul am Angreifer ' + f(t.foul) + '/Match');
  console.log('  Stufe 1 offen ' + r(t.s1u) + ' (' + f(t.s1u[0]) + '), gelesen ' + r(t.s1r) + ' (' + f(t.s1r[0]) + ') | Stufe 2 ' + r(t.s2) + ' | Stufe 3 ' + r(t.s3));
  console.log('  Tore/Match: Angriff ' + f(t.goals.attack) + ', Konter ' + f(t.goals.counter) + ' (' + f(t.counters) + ' Konter, S2 ' + r(t.cs2) + ', S3 ' + r(t.cs3) + '), Freischlag ' + f(t.goals.free) + ' (' + f(t.free) + ', S2 ' + r(t.fs2) + ', S3 ' + r(t.fs3) + '), Penalty ' + f(t.goals.pen));
  console.log('  Züge ' + JSON.stringify(t.move) + ' Abwehr dagegen ' + JSON.stringify(t.stance));
  console.log('  Angreifer ' + JSON.stringify(t.atts) + '\n  Verteidiger ' + JSON.stringify(t.defs));
});
