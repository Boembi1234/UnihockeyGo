/* Testduell im Browser: spielt Matches durch, prüft Konsole und Überlauf, macht Bilder mitten in den Szenen.
   Vorher bauen: node build.js. node test/lab.js [matches] */
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'shots', 'lab'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(), N = +process.argv[2] || 2;
  for (const run of [{ width: 375, shots: true }, { width: 460, shots: true }, { width: 375, reduce: true }]) {
    const ctx = await b.newContext({ viewport: { width: run.width, height: 860 }, deviceScaleFactor: 1, reducedMotion: run.reduce ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage(), errors = [], taken = {}, res = [];
    p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await p.goto('file://' + path.resolve(__dirname, '..', 'dist', 'lab', 'index.html'), { waitUntil: 'load' });
    await p.evaluate(() => Promise.all(['600', '700', '800'].map(w => document.fonts.load(w + ' 16px "Saira Condensed"', 'ÜBERZAHL')).concat([document.fonts.load('600 15px Inter')])));
    const snap = async (name, full) => { if (!run.shots || taken[name]) return; taken[name] = 1; await p.screenshot({ path: path.join(OUT, run.width + '-' + name + '.png'), fullPage: !!full }); };
    const vis = sel => p.evaluate(s => { const e = document.querySelector(s); return !!e && !e.hidden && e.offsetParent !== null; }, sel);
    const click = sel => p.evaluate(s => { const l = [...document.querySelectorAll(s)].filter(e => !e.hidden && e.offsetParent !== null && !e.disabled); if (l.length) l[Math.floor(Math.random() * l.length)].click(); return l.length; }, sel);
    const over = async n => { const w = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (w > 0) errors.push('Überlauf ' + n + ' +' + w); };
    await snap('01-intro', true); await over('Intro');
    for (let m = 0; m < N; m++) {
      await click('#btn-start, #btn-again');
      for (let guard = 0; guard < 600; guard++) {
        if (await vis('#screen-end')) { await snap('09-resultat', true); await over('Resultat'); res.push(await p.textContent('#res-title') + ' ' + await p.textContent('#res-score')); break; }
        if (await p.evaluate(() => !document.querySelector('#zones').classList.contains('off'))) {
          const mine = await p.evaluate(() => /Dein Schuss|Konter|Penalty/.test(document.getElementById('tag').textContent) && /schiesst/.test(document.getElementById('say').textContent));
          await snap(mine ? '06-schuss-wahl' : '06-goalie-wahl'); await over('Tor');
          await click('#zones .zone');
          if (!run.reduce) { await p.waitForTimeout(330); await snap(mine ? '07-schuss-flug' : '07-goalie-flug'); await p.waitForTimeout(420); await snap('08-schuss-ende-' + (mine ? 'du' : 'halle')); }
          continue;
        }
        if (await vis('#choices')) {
          const att = await p.evaluate(() => document.getElementById('tag').textContent === 'Dein Angriff');
          await snap(att ? '03-zug-wahl' : '03-abwehr-wahl'); await over('Wahl');
          await click('#opts .opt');
          if (!run.reduce) { await p.waitForTimeout(260); await snap('04-aufdecken'); await p.waitForTimeout(500); await snap('05-stempel-' + (att ? 'angriff' : 'abwehr')); }
          continue;
        }
        if (await vis('#hand') && await p.evaluate(() => document.querySelectorAll('#hand:not(.idle) .mini:not(:disabled)').length)) {
          await snap('02-karten-wahl'); await click('#hand:not(.idle) .mini:not(:disabled)'); continue;
        }
        if (await vis('#hint')) { if (Math.random() < 0.5) await click('#stage'); await p.waitForTimeout(120); continue; }
        await p.waitForTimeout(60);
      }
    }
    console.log(run.width + ' px' + (run.reduce ? ', reduzierte Bewegung' : '') + ': ' + res.join(' | ') + (errors.length ? '\n  FEHLER: ' + errors.slice(0, 6).join(' | ') : ', keine Fehler'));
    await ctx.close();
  }
  await b.close();
})();
