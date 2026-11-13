/* Prüft auf 375 und 460 px, ob eine Ansicht quer überläuft. Vorher bauen: node build.js. Braucht Playwright mit Chromium. */
'use strict';
const path = require('path'); const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let bad = 0;
  for (const w of [375, 460]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' }), p = await ctx.newPage();
    await p.goto('file://' + path.resolve(__dirname, '..', 'dist', 'index.html'), { waitUntil: 'load' });
    await p.evaluate(() => Promise.all(['500', '600', '700', '800'].map(x => document.fonts.load(x + ' 16px "Saira Condensed"', 'ÜBERZAHL')).concat([document.fonts.load('500 15px Inter')])));
    const wide = async name => { const sw = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); console.log(w + ' px', name, sw > 0 ? 'ÜBERLAUF +' + sw : 'ok'); if (sw > 0) bad++; };
    await wide('Vereinswahl');
    await p.click('#club-list button[data-club="koeniz"]'); await wide('Karte');
    await p.click('#halls button[data-view="koeniz"]'); await wide('Halle, eigene');
    await p.click('#hv-cards .mini:not(:disabled)'); await wide('Halle, stationiert');
    await p.click('#btn-hall-back'); await p.click('#btn-table'); await wide('Vereinstabelle');
    await p.click('#btn-table-back'); await p.click('#halls button[data-view="gc"]'); await wide('Halle, fremde');
    await p.click('#btn-hall-attack'); await wide('Kader');
    await p.click('#btn-kickoff'); await wide('Match');
    await p.click('#hand .mini:not(:disabled)'); await wide('Wahl');
    await ctx.close();
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
