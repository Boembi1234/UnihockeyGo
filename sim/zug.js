/* Nur die Frage Spielzugwahl: vernünftig gegen zufälliger Spielzug, mit vielen Matches. node sim/zug.js <n> name:cfg ... */
'use strict';
const { fork } = require('child_process'), path = require('path');
if (process.argv[2] === '--child') {
  const sim = require('./sim.js'), job = JSON.parse(process.argv[3]);
  const HK = sim.loadEngine(path.join(__dirname, '..', 'src/engine.js'));
  HK.DATA.halls = HK.DATA.halls.filter(h => h.id === 'koeniz');
  process.send({ name: job.name, res: sim.run(HK, { n: job.n, seed: 3, cfg: job.cfg, styles: ['vernuenftig', 'zufallszug', 'zufaellig'] }) });
  process.exit(0);
}
const n = +process.argv[2];
process.argv.slice(3).forEach(a => {
  const i = a.indexOf(':'), name = a.slice(0, i), cfg = {};
  a.slice(i + 1).split(',').filter(Boolean).forEach(kv => { const p = kv.split('='), k = p[0].split('.'); if (k.length === 2) { cfg[k[0]] = cfg[k[0]] || {}; cfg[k[0]][k[1]] = +p[1]; } else cfg[p[0]] = +p[1]; });
  fork(__filename, ['--child', JSON.stringify({ name, cfg, n })]).on('message', m => {
    const r = m.res.koeniz, v = r.vernuenftig, z = r.zufallszug, q = r.zufaellig;
    console.log(m.name.padEnd(10), 'Tore', ((v.gf + v.ga) / n).toFixed(2), (v.gf / n).toFixed(2) + ':' + (v.ga / n).toFixed(2), ' Sieg', (100 * v.win / n).toFixed(1), ' Zufallszug', (100 * z.win / n).toFixed(1), (z.gf / n).toFixed(2) + ':' + (z.ga / n).toFixed(2), ' dZug', (100 * (v.win - z.win) / n).toFixed(1), ' zufällig', (100 * q.win / n).toFixed(1), ' SO', (100 * v.so / n).toFixed(1));
  });
});
