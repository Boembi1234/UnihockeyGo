/* Macht Standbilder der 2D-Szenen (Mitte und Ende jeder Stufe) und setzt sie zu Übersichten zusammen.
   Vorher bauen: node build.js. Braucht Playwright mit Chromium. node test/scenes.js */
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'shots', 'szenen'); fs.mkdirSync(OUT, { recursive: true });
const you = { no: 11, last: 'Steiner' }, home = { no: 81, last: 'Ruh' };
const S = (side, move, stance, read, ok) => ({ t: 's1', side, move, stance, read, ok });
const o = s => (s === 'you' ? 'home' : 'you');
const SETS = {
  'direkt': [
    ['Direkt, nicht gelesen, Tor', 'you', [S('you', 'direkt', 'pass', false, true), { t: 's2', side: 'you', ok: true }, { t: 's3', side: 'you', ok: true }]],
    ['Direkt, geblockt, Konter, Parade', 'you', [S('you', 'direkt', 'block', true, false), { t: 'counter', side: 'home', src: 'stop' }, { t: 's2', side: 'home', ok: true }, { t: 's3', side: 'home', ok: false }]],
    ['Direkt, gelesen, trotzdem durch, Pfosten', 'you', [S('you', 'direkt', 'block', true, true), { t: 's2', side: 'you', ok: false, miss: 'post' }]],
    ['Halle: Direkt, falsch, noch gestoppt', 'home', [S('home', 'direkt', 'zwei', false, false)]]
  ],
  'kombi-solo': [
    ['Kombination, nicht gelesen, daneben', 'you', [S('you', 'kombi', 'block', false, true), { t: 's2', side: 'you', ok: false, miss: 'wide' }]],
    ['Kombination, Pass abgefangen', 'you', [S('you', 'kombi', 'pass', true, false)]],
    ['Solo, nicht gelesen, Goalie fängt, Konter', 'you', [S('you', 'solo', 'pass', false, true), { t: 's2', side: 'you', ok: true }, { t: 's3', side: 'you', ok: false, caught: true }, { t: 'counter', side: 'home', src: 'catch' }]],
    ['Halle: Solo, Ball gestohlen, Konter, Tor', 'home', [S('home', 'solo', 'zwei', true, false), { t: 'counter', side: 'you', src: 'stop' }, { t: 's2', side: 'you', ok: true }, { t: 's3', side: 'you', ok: true }]]
  ],
  'foul-penalty': [
    ['Foul, 2 Minuten, Freischlag direkt, drüber', 'you', [{ t: 'foul', side: 'home', kind: 'twomin' }, { t: 'free', side: 'you', short: false }, { t: 's2', side: 'you', ok: false, miss: 'high' }]],
    ['Halle: Foul, Freischlag kurz, Tor', 'home', [{ t: 'foul', side: 'you', kind: 'free' }, { t: 'free', side: 'home', short: true }, { t: 's2', side: 'home', ok: true }, { t: 's3', side: 'home', ok: true }]],
    ['Penalty du: links, Goalie rechts, Tor', 'pen-you', [{ t: 'pen', side: 'you', corner: 'l', guess: 'r', right: false, ok: true }]],
    ['Penalty Halle: rechts, gehalten', 'pen-home', [{ t: 'pen', side: 'home', corner: 'r', guess: 'r', right: true, ok: false }]]
  ]
};
(async () => {
  const browser = await chromium.launch();
  for (const width of [375, 460]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 }), page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await page.goto('file://' + path.resolve(__dirname, '..', 'dist', 'index.html'), { waitUntil: 'load' });
    await page.evaluate(() => Promise.all(['700', '800'].map(w => document.fonts.load(w + ' 16px "Saira Condensed"', 'ÜBERZAHL'))));
    await page.click('#halls button[data-hall]'); await page.click('#btn-kickoff');
    await page.evaluate(() => {
      const f = document.getElementById('flash');
      window.__cb = { text() {}, label(t, c, w) { f.className = 'flash ' + c; f.textContent = t; f.style.top = ((w ? w === 'unten' : HKScene.ballY() < 50) ? 81 : 19) + '%'; f.hidden = false; }, goal(s) { this.label('Tor', s); } };
    });
    const rink = page.locator('#rink');
    for (const set of Object.keys(SETS)) {
      const frames = [];
      for (const [title, mode, events] of SETS[set]) {
        await page.evaluate(([mode, you, home]) => {
          document.getElementById('flash').hidden = true;
          if (mode === 'pen-you') return HKScene.penSetup('you', you);
          if (mode === 'pen-home') return HKScene.penSetup('home', home);
          return HKScene.start({ side: mode, a: mode === 'you' ? you : home, d: mode === 'you' ? home : you });
        }, [mode, you, home]);
        let n = 0;
        for (const e of events) {
          const ms = await page.evaluate(e => { const M = HKScene.MS; return e.t === 'free' ? (e.short ? M.freeShort : M.free) : M[e.t]; }, e);
          await page.evaluate(() => { document.getElementById('flash').hidden = true; });
          const done = page.evaluate(e => HKScene.play(e, window.__cb), e);
          for (const f of [0.45, 1]) {
            if (f < 1) await page.waitForTimeout(ms * f); else await done;
            const file = path.join(OUT, width + '-' + set + '-' + frames.length + '.png');
            await rink.screenshot({ path: file });
            frames.push({ file, cap: (n === 0 && f < 1 ? title + ' · ' : '') + e.t + (f < 1 ? ' Mitte' : ' Ende') });
          }
          n++;
        }
      }
      const html = '<body style="margin:0;background:#050818;font:12px sans-serif;color:#fff;display:grid;grid-template-columns:repeat(6,1fr);gap:6px;padding:6px">' +
        frames.map(f => '<figure style="margin:0"><img src="' + path.basename(f.file) + '" style="width:100%;display:block"><figcaption style="padding:2px 0 4px">' + f.cap + '</figcaption></figure>').join('') + '</body>';
      const sheetFile = path.join(OUT, 'uebersicht-' + width + '-' + set + '.html'); fs.writeFileSync(sheetFile, html);
      const sheet = await ctx.newPage(); await sheet.setViewportSize({ width: 1500, height: 800 }); await sheet.goto('file://' + sheetFile, { waitUntil: 'load' });
      await sheet.screenshot({ path: path.join(OUT, 'uebersicht-' + width + '-' + set + '.png'), fullPage: true }); await sheet.close();
    }
    console.log(width + ' px: ' + (errors.length ? errors.join(' | ') : 'keine Fehler'));
    await ctx.close();
  }
  await browser.close();
})();
