/* Kalibrier-Hilfe: mehrere Einstellungen nebeneinander, parallel gerechnet.
   node sim/calib.js <n> <hallen|all> name:key=val,key=val ... */
'use strict';
const { fork } = require('child_process'), path = require('path');
if (process.argv[2] === '--child') {
  const sim = require('./sim.js'), job = JSON.parse(process.argv[3]);
  const HK = sim.loadEngine(path.join(__dirname, '..', job.src ? 'src/engine.js' : 'dist/index.html'));
  if (job.halls) HK.DATA.halls = HK.DATA.halls.filter(h => job.halls.indexOf(h.id) !== -1);
  process.send({ name: job.name, res: sim.run(HK, { n: job.n, seed: job.seed, cfg: job.cfg, legacy: job.legacy }) });
  process.exit(0);
}
const n = +process.argv[2], hallArg = process.argv[3], halls = hallArg === 'all' ? null : hallArg.split(',');
const jobs = process.argv.slice(4).map(a => {
  const i = a.indexOf(':'), name = i === -1 ? a : a.slice(0, i), cfg = {};
  if (i !== -1 && a.slice(i + 1)) a.slice(i + 1).split(',').forEach(kv => { const p = kv.split('='), k = p[0].split('.'); if (k.length === 2) { cfg[k[0]] = cfg[k[0]] || {}; cfg[k[0]][k[1]] = +p[1]; } else cfg[p[0]] = +p[1]; });
  return { name, cfg, n, halls, seed: 1, src: true, legacy: name === 'legacy' };
});
const f = (v, d) => v.toFixed(d === undefined ? 2 : d), pc = v => (100 * v).toFixed(1);
let done = 0; const results = {};
console.log('name            hall    Tore  Du:Halle   Foul 2min  Pen  Kont   SO%   Sieg%  Zuf%  dKader dZug d-8 | Ang  PP   Kon  Frei Pen');
jobs.forEach(job => {
  const c = fork(__filename, ['--child', JSON.stringify(job)]);
  c.on('message', m => {
    results[m.name] = m.res;
    if (++done === jobs.length) jobs.forEach(j => Object.keys(results[j.name]).forEach(h => {
      const r = results[j.name][h], v = r.vernuenftig, N = v.n;
      console.log(j.name.padEnd(15), h.padEnd(7), f((v.gf + v.ga) / N), f(v.gf / N) + ':' + f(v.ga / N), ' ', f(v.fouls / N), f(v.twomin / N), f(v.matchPen / N), f(v.counters / N), ' ', pc(v.so / N).padStart(4), ' ', pc(v.win / N).padStart(4), ' ', pc(r.zufaellig.win / N).padStart(4), ' ', f(100 * (v.win - r.schwach6.win) / N, 1).padStart(5), f(100 * (v.win - r.zufallszug.win) / N, 1).padStart(5), f(100 * (v.win - r.minus8.win) / N, 1).padStart(5), '|', f(v.src.attack / N), f(v.src.pp / N), f(v.src.counter / N), f(v.src.free / N), f(v.src.pen / N));
    }));
  });
});
