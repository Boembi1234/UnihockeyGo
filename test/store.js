/* Shop, Packs und Team im Browser: Pack kaufen, aufreissen, Karten aufdecken, Linie setzen. Prüft Konsole und Überlauf, macht Bilder.
   Vorher bauen: node build.js. node test/store.js */
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'shots', 'store'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); let fail = 0;
  for (const run of [{ width: 375 }, { width: 460 }, { width: 375, reduce: true }]) {
    const ctx = await b.newContext({ viewport: { width: run.width, height: 820 }, deviceScaleFactor: 1, reducedMotion: run.reduce ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage(), errors = [], tag = run.width + (run.reduce ? 'r' : '');
    p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await p.goto('file://' + path.resolve(__dirname, '..', 'dist', 'lab', 'match', 'index.html'), { waitUntil: 'load' });
    await p.evaluate(() => Promise.all(['600', '700', '800'].map(w => document.fonts.load(w + ' 16px "Saira Condensed"', 'ÜBERZAHL'))));
    const snap = (name, full) => p.screenshot({ path: path.join(OUT, tag + '-' + name + '.png'), fullPage: !!full });
    const over = async w => { const x = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (x > 0) errors.push('Überlauf ' + w + ' +' + x); };
    const coins = () => p.evaluate(() => window.HKStore.state().coins);
    await snap('00-intro', true); await over('intro');
    await p.click('#screen-intro [data-go="store"]'); await snap('01-shop', true); await over('shop');
    const c0 = await coins();
    await p.click('[data-pack="premium"]');
    if (!run.reduce) {
      await p.waitForTimeout(800); await snap('02-pack');
      await p.click('#po-stage'); await p.waitForTimeout(500);
      await p.click('#po-stage'); await p.waitForTimeout(250); await snap('03-pack-glow');
      await p.waitForTimeout(300); await p.click('#po-stage'); await p.waitForTimeout(250); await snap('04-tear');
      await p.waitForTimeout(1600); await snap('05-cards');
      await p.click('.flip[data-i="0"]'); await p.waitForTimeout(250); await snap('06-flipping'); await p.waitForTimeout(600);
      await p.click('#po-all');
    }
    await p.waitForSelector('#po-done:not([hidden])', { timeout: 15000 });
    await p.waitForTimeout(400); await snap('07-revealed', true); await over('revealed');
    const c1 = await coins(); if (c1 > c0 - 1200 + 1800 || c1 < c0 - 1200) errors.push('Münzen falsch ' + c0 + ' → ' + c1);
    const owned = await p.evaluate(() => window.HKStore.state().owned.length); if (owned < 8) errors.push('zu wenige Karten ' + owned);
    if (await p.isVisible('#po-take')) await p.click('#po-take');
    await p.click('#po-team'); await p.waitForTimeout(200); await snap('08-team', true); await over('team');
    // Platz wählen, dann Karte tauschen
    await p.click('#team-line .slot >> nth=0'); await p.waitForTimeout(100); await snap('09-team-slot');
    const pick = await p.$('#team-all .pick-card:not([disabled])'); if (pick) await pick.click();
    const line = await p.evaluate(() => window.HKStore.state().lineup.length); if (line !== 5) errors.push('Linie kaputt');
    await p.click('#screen-team [data-go="back"]'); await p.waitForTimeout(100);
    // gespeichert? neu laden
    await p.reload({ waitUntil: 'load' });
    const owned2 = await p.evaluate(() => window.HKStore.state().owned.length); if (owned2 !== owned) errors.push('nicht gespeichert ' + owned + ' ' + owned2);
    await snap('10-intro-after', true);
    console.log(tag, errors.length ? 'FEHLER ' + errors.join(' | ') : 'ok', 'Münzen', c0, '→', c1, 'Karten', owned);
    if (errors.length) fail = 1;
    await ctx.close();
  }
  await b.close(); process.exit(fail);
})();
