/* Shop, Packs und Team im Browser: Pack kaufen, aufreissen (tippen und wischen), Karten einzeln aufdecken, Übersicht, Linie
   setzen, Kartenblatt. Prüft Konsole und Überlauf, macht Bilder. Vorher bauen: node build.js. node test/store.js */
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'shots', 'store'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); let fail = 0;
  for (const run of [{ width: 375, height: 760 }, { width: 460, height: 900 }, { width: 375, height: 667, reduce: true }]) {
    const ctx = await b.newContext({ viewport: { width: run.width, height: run.height }, deviceScaleFactor: 2, reducedMotion: run.reduce ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage(), errors = [], tag = run.width + (run.reduce ? 'r' : '');
    p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await p.goto('file://' + path.resolve(__dirname, '..', 'dist', 'lab', 'match', 'index.html'), { waitUntil: 'load' });
    await p.evaluate(() => Promise.all(['500', '600', '700', '800'].map(w => document.fonts.load(w + ' 16px "Saira Condensed"', 'ÜBERZAHL'))));
    const snap = (name, full) => p.screenshot({ path: path.join(OUT, tag + '-' + name + '.png'), fullPage: !!full });
    const over = async w => { const x = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (x > 0) errors.push('Überlauf ' + w + ' +' + x); };
    const state = () => p.evaluate(() => window.HKStore.state());
    const phase = () => p.evaluate(() => (document.getElementById('packov').classList.contains('done') ? 'done' : document.getElementById('po-say').textContent));
    await p.evaluate(() => window.HKStore.earn(4000, false));   // genug Münzen für ein Star-Pack
    await snap('00-intro', true); await over('intro');
    await p.click('#screen-intro [data-go="store"]'); await p.waitForTimeout(400); await snap('01-shop', true); await over('shop');
    const s0 = await state();
    // 1. Premium: tippen
    await p.click('[data-pack="premium"]');
    if (!run.reduce) {
      await p.waitForTimeout(900); await snap('02-pack'); await over('pack');
      await p.click('#po-pack', { force: true }); await p.waitForTimeout(330); await snap('03-reissen'); await p.waitForTimeout(450); await snap('04-heraus');
      await p.waitForFunction(() => /Aufdecken/.test(document.getElementById('po-say').textContent), null, { timeout: 8000 });
      await snap('05-stapel');
      for (let i = 0; i < 8; i++) {
        if (await phase() === 'done') break;
        await p.click('#po-stage', { position: { x: 60, y: 60 } });
        if (i === 0) { await p.waitForTimeout(260); await snap('06-drehen'); await p.waitForTimeout(900); await snap('07-karte'); await over('karte'); }
        if (i === 1) { await p.waitForTimeout(250); await snap('08-ablage'); }
        await p.waitForTimeout(750);
        await p.waitForFunction(() => document.getElementById('packov').classList.contains('done') || /Tippen/.test(document.getElementById('po-say').textContent), null, { timeout: 12000 });
      }
    }
    await p.waitForSelector('#po-done:not([hidden])', { timeout: 15000 }); await p.waitForTimeout(900);
    await snap('09-uebersicht', true); await over('übersicht');
    const s1 = await state(); if (s1.owned.length < s0.owned.length + 1 || s1.coins > s0.coins - 1200 + 2400 || s1.coins < s0.coins - 1200) errors.push('Pack falsch verbucht');
    // Karte aus der Übersicht gross ansehen
    await p.click('#po-tray .po-slot >> nth=-1'); await p.waitForTimeout(700); await snap('10-blatt'); await over('blatt');
    await p.click('#sheet-x');
    if (await p.isVisible('#po-take')) await p.click('#po-take');
    // 2. Star: wischen, dann überspringen bzw. Gold-Auftritt
    await p.click('#po-close'); await p.waitForTimeout(200);
    await p.click('[data-pack="star"]');
    if (!run.reduce) {
      await p.waitForTimeout(800);
      const box = await p.locator('#po-pack').boundingBox();
      await p.mouse.move(box.x + 12, box.y + 20); await p.mouse.down(); await p.mouse.move(box.x + box.width * 0.45, box.y + 22, { steps: 6 }); await p.waitForTimeout(80); await snap('11-wischen');
      await p.mouse.move(box.x + box.width * 0.8, box.y + 24, { steps: 6 }); await p.mouse.up();
      await p.waitForFunction(() => /Aufdecken/.test(document.getElementById('po-say').textContent), null, { timeout: 8000 });
      for (let i = 0; i < 4; i++) { await p.click('#po-stage', { position: { x: 60, y: 60 } }); await p.waitForTimeout(750); await p.waitForFunction(() => /Tippen/.test(document.getElementById('po-say').textContent), null, { timeout: 12000 }); }
      await p.click('#po-stage', { position: { x: 60, y: 60 } });   // letzte Karte: Gold mit Ankündigung
      await p.waitForTimeout(1500); await snap('12-ankuendigung'); await p.waitForTimeout(2100); await snap('13-gold-dreht');
      await p.waitForFunction(() => /Abschluss/.test(document.getElementById('po-say').textContent), null, { timeout: 12000 }); await p.waitForTimeout(500); await snap('14-gold'); await over('gold');
      await p.click('#po-stage', { position: { x: 60, y: 60 } });
    }
    await p.waitForSelector('#po-done:not([hidden])', { timeout: 15000 }); await p.waitForTimeout(900); await snap('15-star-uebersicht', true);
    const golds = await p.evaluate(() => window.HKStore.state().owned.filter(id => window.HKClub.rarity(window.HKClub.get(id)) === 'gold').length); if (golds < 1) errors.push('Star-Pack ohne Gold');
    if (await p.isVisible('#po-take')) await p.click('#po-take');
    await p.click('#po-team'); await p.waitForTimeout(500); await snap('16-team', true); await over('team');
    // Platz wählen und tauschen, dann Kartenblatt aus der Sammlung
    await p.click('#team-line .tslot >> nth=0'); await p.waitForTimeout(150); await snap('17-platz');
    const other = await p.$('#team-all .pick-card:not(.inline)'); if (other) await other.click();
    const s3 = await state(); if (s3.lineup.length !== 5) errors.push('Linie kaputt');
    await p.click('#team-all .pick-card >> nth=0'); await p.waitForTimeout(600); await snap('18-blatt-team'); await p.click('#sheet-x');
    await p.click('#screen-team [data-go="back"]'); await p.waitForTimeout(100);
    await p.reload({ waitUntil: 'load' });
    const s4 = await state(); if (s4.owned.length !== s3.owned.length || s4.coins !== s3.coins) errors.push('nicht gespeichert');
    await p.waitForTimeout(300); await snap('19-intro-danach', true);
    console.log(tag, errors.length ? 'FEHLER ' + errors.join(' | ') : 'ok', 'Münzen', s0.coins, '→', s4.coins, 'Karten', s4.owned.length, 'Gold', golds);
    if (errors.length) fail = 1;
    await ctx.close();
  }
  await b.close(); process.exit(fail);
})();
