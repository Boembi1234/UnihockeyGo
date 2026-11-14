/* Simulation für das Match mit Schlüsselszenen. node sim/match.js [n] [key=value ...]
   Weil das Match vom Können abhängt, spielt hier ein Modell-Spieler mit einem Profil:
   s    Streuung beim Tippen auf einem Balken in ms (Timing-Balken und Schuss-Balken)
   aim  Zielfehler beim Setzen des Ziels im Tor, in halben Torbreiten (Tor von -1 bis 1)
   rt   Reaktionszeit bei der Parade in ms, rtSd ihre Streuung, zerr Anteil falsch angetippter Zonen
   Die Zahlen sind Annahmen und müssen mit echten Spielern überprüft werden. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const box = {}; box.window = box; vm.createContext(box);
['src/engine.js', 'src/world.js', 'src/lab/match.js', 'src/lab/pool.js', 'src/lab/club.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), box));
const E = box.HK, W = box.HKWorld, M = box.HKMatch;
const PROFILES = {
  stark: { s: 45, aim: 0.03, rt: 480, rtSd: 70, zerr: 0.03 },       // etwa die besten 10 %
  mittel: { s: 70, aim: 0.05, rt: 560, rtSd: 85, zerr: 0.06 },
  schwach: { s: 105, aim: 0.08, rt: 650, rtSd: 100, zerr: 0.1 }     // etwa die schwächsten 10 %
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), pick = (l, r) => l[Math.floor(r() * l.length)];
function gauss(r) { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
const pHit = (pf, w, sweep) => erf(w * sweep / (2 * Math.SQRT2 * pf.s));
const shift = (sq, d) => sq.map(c => { const x = Object.assign({}, c); ['sco', 'ply', 'clu', 'fai', 'frm', 'exp', 'ovr'].forEach(k => { x[k] = Math.max(40, Math.min(99, x[k] + d)); }); return x; });
/* Eigener Schuss wie ein vernünftiger Spieler: Ziel in die Mitte des freien Felds neben dem Goalie, hoch, weil dort etwas
   mehr frei ist. Dann den Schuss-Balken mit der eigenen Streuung stoppen. */
function shotPlan(s) {
  const sh = s.shot, F = M.freeW(s, sh, true), side = sh.keeper.x > 0 ? -1 : 1;
  return { target: [side * (1 - F / 2), 0.8], free: F };
}
// Grobe Torchance für einen Schuss von Spieler id aus seiner Lage: Wie oft stoppt dieser Spieler den Strich nah genug an der Mitte?
function chance(pf, s, sc, id) {
  const c = s.cfg, pv = M.shotPreview(s, id), core = pv.w * c.barCore / 2, tol = core + Math.max(0.05, 1 - 2 * pf.aim / pv.free) * (pv.w / 2 - core);
  return clamp(erf(tol * pv.sweep / (Math.SQRT2 * pf.s)), 0.03, 0.95);
}
/* Spielt vernünftig: wählt die Aktion mit dem besten Erwartungswert für das eigene Können, tippt mit seiner Streuung,
   zielt ins freie Feld und reagiert bei der Parade mit seiner Reaktionszeit. */
function policy(pf) {
  return (s, r) => {
    const sc = s.cur, tap = (pos, sweep) => clamp(pos + gauss(r) * pf.s / sweep, 0, 1);
    if (s.phase === 'decide' && sc.type === 'att') {
      const X = sc.carrier, last = sc.step >= sc.max - 1;
      const val = a => { const c = M.contest(s, a); return c.free ? 1 : pHit(pf, c.w, c.sweep); };
      let best = { v: chance(pf, s, sc, X) * 1.05, a: { type: 'shoot' } };
      if (!last) {
        s.teams.you.cards.forEach(c => { if (c.id === X) return; const a = { type: 'pass', to: c.id }, v = val(a) * chance(pf, s, sc, c.id) * 0.9; if (v > best.v) best = { v, a }; });
        const vd = val({ type: 'dribble' }) * Math.min(0.95, chance(pf, s, sc, X) + 0.2) * 0.9; if (vd > best.v) best = { v: vd, a: { type: 'dribble' } };
      }
      const c = M.contest(s, best.a);
      return c.free ? best.a : Object.assign({ hit: tap(c.pos, c.sweep) }, best.a);
    }
    if (s.phase === 'decide') { const c = M.contest(s, {}); return { type: 'defend', hit: tap(c.pos, c.sweep) }; }
    if (s.phase === 'aim' && s.shot.side === 'you') {
      const pl = shotPlan(s), b = M.shotBar(s);
      return { type: 'aim', hit: tap(b.pos, b.sweep), target: [pl.target[0] + gauss(r) * pf.aim, pl.target[1] + gauss(r) * pf.aim * 0.7] };
    }
    if (s.phase === 'aim') { const sh = s.shot; return { type: 'aim', zone: r() < pf.zerr ? pick(M.ZONES.filter(z => z !== sh.zone), r) : sh.zone, rt: Math.max(160, pf.rt + gauss(r) * pf.rtSd) }; }
    return { type: 'next' };
  };
}
function play(squad, opp, pol, n, seed, cfg, tactic) {
  const r = E.makeRng(seed), m = { n, win: 0, gf: 0, ga: 0, so: 0, chY: 0, chH: 0, min: 99, max: 0, en: 0, enMin: 0 };
  ['att', 'shots', 'goals', 'faced', 'onGoal', 'saved', 'stops', 'def', 'bars', 'hits', 'perfects', 'counters'].forEach(k => { m[k] = 0; });
  for (let i = 0; i < n; i++) {
    let s = M.newMatch({ cfg, tactic, you: { goalie: { val: 88 }, cards: squad }, home: { goalie: { val: 88 }, cards: opp } }, r), g = 0;
    while (s.phase !== 'end') { const a = pol(s, r), x = M.act(s, a, r); if (!x.ok) throw new Error('ungültig ' + JSON.stringify(a) + ' ' + s.phase); s = x.state; if (++g > 700) throw new Error('endlos'); }
    if (s.outcome === 'win' || s.outcome === 'penwin') m.win++; if (s.pen) m.so++;
    m.chY += s.chances.you; m.chH += s.chances.home; const tot = s.chances.you + s.chances.home; m.min = Math.min(m.min, tot); m.max = Math.max(m.max, tot);
    const en = s.teams.you.cards.map(c => c.en); m.en += en.reduce((a, b) => a + b, 0) / en.length; m.enMin += Math.min.apply(null, en);
    m.gf += s.score.you; m.ga += s.score.home; Object.keys(s.stats).forEach(k => { if (k in m) m[k] += s.stats[k]; });
  }
  return m;
}
module.exports = { box, PROFILES, policy, play, shift, shotPlan, chance, gauss };
if (require.main === module) {
  const n = +process.argv[2] || 1500, cfg = JSON.parse(JSON.stringify(M.CFG));
  process.argv.slice(3).forEach(kv => { const [k, v] = kv.split('='); cfg[k] = +v; });
  const col = E.DATA.collection, top = (pos, k) => col.filter(c => c.pos === pos).sort((a, b) => b.ovr - a.ovr).slice(0, k);
  const SQ = top('ATT', 3).concat(top('DEF', 2)), opp = W.guard(W.create(), 'koeniz');
  const pc = v => (100 * v).toFixed(0).padStart(3) + '%', f = v => v.toFixed(2);
  console.log('Gegner Köniz (Stärke ' + M.strength(M.newMatch({ cfg, you: { goalie: { val: 88 }, cards: SQ }, home: { goalie: { val: 88 }, cards: opp } }, E.makeRng(1)).teams.home.cards).toFixed(1) + '), dein Team ' + (SQ.reduce((a, c) => a + c.ovr, 0) / 5).toFixed(1) + ' plus Verschiebung. ' + n + ' Matches je Feld.');
  console.log('Siegquote        ' + [-12, -6, 0, 6, 12].map(d => ('Karten ' + (d > 0 ? '+' : '') + d).padStart(11)).join(''));
  const rows = {};
  Object.keys(PROFILES).forEach((name, pi) => {
    rows[name] = [-12, -6, 0, 6, 12].map((d, di) => play(shift(SQ, d), opp, policy(PROFILES[name]), n, 11 + pi * 10 + di, cfg));
    console.log(name.padEnd(16) + rows[name].map(m => pc(m.win / m.n).padStart(11)).join(''));
  });
  console.log('\nBei gleichen Karten:');
  Object.keys(rows).forEach(name => {
    const m = rows[name][2];
    console.log(name.padEnd(8), 'Tore', f(m.gf / m.n) + ':' + f(m.ga / m.n), ' Balken getroffen', pc(m.hits / m.bars), 'perfekt', pc(m.perfects / m.bars), ' Schüsse', f(m.shots / m.n), 'davon Tor', pc(m.goals / Math.max(1, m.shots)),
      ' gegen dich', f(m.faced / m.n), 'gehalten', pc(m.saved / Math.max(1, m.onGoal)), ' Ballgewinne je Abwehrszene', pc(m.stops / Math.max(1, m.def)), ' Penaltys', pc(m.so / m.n), ' Energie am Ende', (m.en / m.n).toFixed(0), 'tiefste', (m.enMin / m.n).toFixed(0));
  });
}
