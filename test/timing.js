/* Misst, wie lange die animierten Sequenzen dauern, und macht Bilder mitten in einer Sequenz.
   Vorher bauen: node build.js. Braucht Playwright mit Chromium. node test/timing.js [matches] */
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const browser = await chromium.launch(), N = +process.argv[2] || 2, rows = [];
  for (const width of [375, 460]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 }), page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'index.html'), { waitUntil: 'load' });
    await page.evaluate(() => Promise.all(['700', '800'].map(w => document.fonts.load(w + ' 16px "Saira Condensed"', 'ÜBERZAHL'))));
    await page.evaluate(() => { window.__t = []; new MutationObserver(() => window.__t.push(document.getElementById('say-sr').textContent)).observe(document.getElementById('say-sr'), { childList: true, characterData: true, subtree: true }); });
    const vis = sel => page.evaluate(s => { const el = document.querySelector(s); return !!el && !el.hidden && el.offsetParent !== null; }, sel);
    const pick = sel => page.evaluate(s => { const l = [...document.querySelectorAll(s)].filter(el => !el.hidden && el.offsetParent !== null && !el.disabled); if (l.length) l[Math.floor(Math.random() * l.length)].click(); return l.length; }, sel);
    let shot = 0;
    for (let m = 0; m < N; m++) {
      await pick('#btn-reset'); await pick('#club-list button[data-club="tigers"]'); await pick('#halls button[data-hall]'); await pick('#btn-kickoff');
      for (;;) {
        if (await vis('#screen-result')) { await pick('#reward .opt'); await pick('#btn-map'); break; }
        if (await vis('#btn-next')) { await pick('#btn-next'); continue; }
        if (await vis('#opts .opt')) {
          const penalty = await page.evaluate(() => document.getElementById('opts').className.indexOf('row') !== -1);
          await page.evaluate(() => { window.__t.length = 0; });
          const t0 = Date.now(); await pick('#opts .opt');
          if (shot < 3 && !penalty) { await page.waitForTimeout(700 + shot * 450); await page.screenshot({ path: path.join(SHOTS, width + '-sequenz-' + (++shot) + '.png') }); }
          await page.waitForFunction(() => { const b = document.getElementById('btn-next'), o = document.getElementById('opts'); return (!b.hidden && b.offsetParent !== null) || (!o.hidden && o.className.indexOf('row') !== -1 && document.getElementById('scene').hidden === false && window.__t.some(x => /läuft zum Penalty an|Penalty für dich/.test(x))); }, null, { timeout: 20000 });
          const ms = Date.now() - t0, t = (await page.evaluate(() => window.__t)).join(' ');
          const kind = penalty ? 'Penalty' : /Penalty für/.test(t) ? 'Foul vor Penalty' : (/Konter/.test(t) && /Freischlag/.test(t)) ? 'Freischlag und Konter' : /Konter/.test(t) ? 'mit Konter' : /Freischlag/.test(t) ? 'mit Freischlag' : 'normal';
          rows.push({ kind, ms });
          continue;
        }
        if (await pick('#hand .mini:not(:disabled)')) continue;
        await page.waitForTimeout(40);
      }
    }
    if (errors.length) console.log(width, 'FEHLER', errors.join(' | '));
    await ctx.close();
  }
  await browser.close();
  const kinds = {}; rows.forEach(r => { (kinds[r.kind] = kinds[r.kind] || []).push(r.ms); });
  console.log('Art                     Anzahl   kürzeste   mittlere   längste  (Sekunden, inklusive Aufstellung)');
  Object.keys(kinds).sort().forEach(k => { const a = kinds[k].sort((x, y) => x - y), s = v => (v / 1000).toFixed(2).padStart(8); console.log(k.padEnd(24) + String(a.length).padStart(5) + '  ' + s(a[0]) + '   ' + s(a[Math.floor(a.length / 2)]) + '  ' + s(a[a.length - 1])); });
})();
