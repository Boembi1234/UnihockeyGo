/* Match im Browser: spielt Matches mit Zufallsentscheiden durch (inklusive Wischen), prüft Konsole und Überlauf, macht Bilder.
   Vorher bauen: node build.js. node test/match.js [matches] */
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'shots', 'match'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(), N = +process.argv[2] || 1;
  for (const run of [{ width: 375, shots: true }, { width: 460, shots: true }, { width: 375, reduce: true }]) {
    const ctx = await b.newContext({ viewport: { width: run.width, height: 900 }, deviceScaleFactor: 1, reducedMotion: run.reduce ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage(), errors = [], taken = {}, res = []; let n = 0;
    p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await p.goto('file://' + path.resolve(__dirname, '..', 'dist', 'lab', 'match', 'index.html'), { waitUntil: 'load' });
    await p.evaluate(() => Promise.all(['600', '700', '800'].map(w => document.fonts.load(w + ' 16px "Saira Condensed"', 'ÜBERZAHL'))));
    const snap = async (name, full) => { if (!run.shots || taken[name]) return; taken[name] = 1; await p.screenshot({ path: path.join(OUT, run.width + '-' + name + '.png'), fullPage: !!full }); };
    const over = async w => { const x = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (x > 0) errors.push('Überlauf ' + w + ' +' + x); };
    await snap('00-intro', true); await over('intro');
    for (let m = 0; m < N; m++) {
      await p.evaluate(() => { const o = [...document.querySelectorAll('#opps [data-opp]')]; o[Math.floor(Math.random() * o.length)].click(); });
      await p.click(m === 0 ? '#btn-start' : '#btn-start');
      for (let g = 0; g < 2000; g++) {
        const st = await p.evaluate(() => {
          const v = e => !!e && !e.hidden && e.offsetParent !== null;
          if (v(document.getElementById('screen-end'))) return 'end';
          if (!document.getElementById('zones').classList.contains('off')) return 'aim';
          const pnl = document.getElementById('panel'); if (v(pnl) && pnl.querySelector('button:not(:disabled)')) return document.getElementById('tag').textContent === 'Abwehr' ? 'def' : 'att';
          return 'wait';
        });
        if (st === 'end') { await snap('09-resultat', true); res.push(await p.textContent('#res-title') + ' ' + await p.textContent('#res-score')); break; }
        if (st === 'att' || st === 'def') {
          await snap(st === 'att' ? '01-angriff' : '02-abwehr'); await over(st);
          n++;
          if (Math.random() < 0.25) await p.evaluate(() => { const l = [...document.querySelectorAll('#pls .pl.pick')]; if (l.length) l[Math.floor(Math.random() * l.length)].dispatchEvent(new MouseEvent('click', { bubbles: true })); });
          else await p.evaluate(() => { const l = [...document.querySelectorAll('#panel button:not(:disabled)')]; l[Math.floor(Math.random() * l.length)].click(); });
          if (!run.reduce) { await p.waitForTimeout(420); await snap(st === 'att' ? '03-ablauf-angriff' : '04-ablauf-abwehr'); }
          continue;
        }
        if (st === 'aim') {
          const mine = await p.evaluate(() => /Wische vom Ball/.test(document.getElementById('say').textContent));
          await snap(mine ? '05-schuss' : '06-goalie');
          const bb = await p.locator('#goalview').boundingBox(), k = bb.width / 360;
          const from = mine ? [180, 262] : [180, 192], to = [100 + Math.random() * 160, 95 + Math.random() * 130], steps = Math.random() < 0.5 ? 4 : 14;
          await p.mouse.move(bb.x + from[0] * k, bb.y + from[1] * k); await p.mouse.down();
          for (let i = 1; i <= steps; i++) await p.mouse.move(bb.x + (from[0] + (to[0] - from[0]) * i / steps) * k, bb.y + (from[1] + (to[1] - from[1]) * i / steps) * k);
          await p.mouse.up();
          if (!run.reduce) { await p.waitForTimeout(700); await snap(mine ? '07-schuss-ende' : '08-goalie-ende'); }
          continue;
        }
        if (Math.random() < 0.3) await p.mouse.click(5, 5);
        await p.waitForTimeout(60);
      }
    }
    console.log(run.width + ' px' + (run.reduce ? ', reduziert' : '') + ': ' + res.join(' | ') + ', ' + n + ' Entscheide' + (errors.length ? '\n  FEHLER: ' + errors.slice(0, 6).join(' | ') : ', keine Fehler'));
    await ctx.close();
  }
  await b.close();
})();
