/* Spielt Matches automatisch im Browser durch, prüft die Konsole und macht Bilder.
   Vorher bauen: node build.js. Braucht Playwright mit Chromium.
   node test/play.js [dist/index.html] */
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const FILE = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist', 'index.html'));
const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });

async function session(browser, o) {
  const ctx = await browser.newContext({ viewport: { width: o.width, height: 900 }, deviceScaleFactor: 1, reducedMotion: o.reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(), errors = [];
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + FILE, { waitUntil: 'load' });
  await page.evaluate(() => Promise.all(['500', '600', '700', '800'].map(w => document.fonts.load(w + ' 16px "Saira Condensed"', 'ÜBERZAHL')).concat([document.fonts.load('500 15px Inter')])));
  await page.evaluate(() => {
    window.__seen = {}; window.__texts = [];
    const mark = t => { ['Konter', '2 Minuten', 'Freischlag', 'Penalty für', 'läuft zum Penalty an', 'leere Tor', 'Tor in Überzahl', 'Pfosten', 'fängt den Schuss', 'trotzdem'].forEach(k => { if (t.indexOf(k) !== -1) window.__seen[k] = (window.__seen[k] || 0) + 1; }); };
    new MutationObserver(() => { const t = document.getElementById('say-sr').textContent; window.__texts.push(t); mark(t); }).observe(document.getElementById('say-sr'), { childList: true, characterData: true, subtree: true });
  });
  const shots = {}, stat = { matches: 0, wins: 0, shootouts: 0, steps: 0, overflow: [], results: [] };
  const snap = async name => { if (shots[name] || !o.shots) return; shots[name] = true; await page.screenshot({ path: path.join(SHOTS, o.width + '-' + name + '.png'), fullPage: true }); };
  const info = () => page.evaluate(() => {
    const $ = id => document.getElementById(id), vis = el => !!el && !el.hidden && el.offsetParent !== null;
    const screen = ['map', 'squad', 'match', 'result'].filter(n => !$('screen-' + n).hidden)[0];
    return { screen, next: vis($('btn-next')), opts: [...document.querySelectorAll('#opts .opt')].filter(vis).length, row: $('opts').className.indexOf('row') !== -1,
      cards: [...document.querySelectorAll('#hand .mini:not(:disabled)')].filter(vis).length, tacs: [...document.querySelectorAll('#tactics .tac:not(:disabled)')].filter(vis).length,
      period: $('sc-period').textContent, pp: $('sc-pp').textContent, hint: $('hand-hint').textContent, say: $('say-sr').textContent, reward: vis($('reward')),
      overflow: document.documentElement.scrollWidth - window.innerWidth, title: $('res-title').textContent, score: $('res-score').textContent, logItems: document.querySelectorAll('#log li').length };
  });
  const click = sel => page.evaluate(s => { const l = [...document.querySelectorAll(s)].filter(el => !el.hidden && el.offsetParent !== null && !el.disabled); if (l.length) l[Math.floor(Math.random() * l.length)].click(); return l.length; }, sel);
  let idle = 0;
  while (stat.matches < o.matches || (o.until && !(await page.evaluate(k => k.every(x => window.__seen[x]), o.until)) && stat.matches < o.max) || (o.needShootout && !stat.shootouts && stat.matches < o.max)) {
    const s = await info(); stat.steps++;
    if (s.overflow > 0 && !stat.overflow.some(x => x.indexOf(s.screen + ' ' + s.period) === 0)) stat.overflow.push(s.screen + ' ' + s.period + ' +' + s.overflow);
    if (s.screen === 'map') {
      await snap('01-karte');
      if (stat.matches % 2 === 0) await click('#btn-reset');
      const n = await click('#halls button[data-hall]:not(:disabled)'); if (!n) await click('#btn-reset');
    } else if (s.screen === 'squad') { await snap('02-kader'); await click('#btn-kickoff'); }
    else if (s.screen === 'match') {
      if (s.pp) await snap('07-ueberzahl');
      if (s.next) { if (/Penalty|Tor für|Parade|Gehalten|Konter/.test(s.say)) await snap('06-nach-sequenz'); await click('#btn-next'); idle = 0; }
      else if (s.opts) {
        if (s.row && s.period === 'Penaltys') await snap('09-penaltyschiessen'); else if (s.row) await snap('08-penalty-im-match');
        else await snap(/verteidigt/.test(s.say) ? '04-abwehr-wahl' : '05-spielzug-wahl');
        await click('#opts .opt'); idle = 0;
      } else if (s.cards) {
        if (s.tacs && Math.random() < 0.3) await click('#tactics .tac:not(:disabled)');
        else { if (s.period !== 'Penaltys') await snap('03-match-kartenwahl'); await click('#hand .mini:not(:disabled)'); }
        idle = 0;
      } else { idle++; if (!o.reduce && Math.random() < o.skip) await page.click('#rink', { position: { x: 40, y: 40 } }); await page.waitForTimeout(o.reduce ? 15 : 120); if (idle > 2000) throw new Error('hängt: ' + JSON.stringify(s)); }
      if (s.period === 'Penaltys' && !stat._so) { stat._so = true; stat.shootouts++; }
    } else if (s.screen === 'result') {
      stat.matches++; stat._so = false; if (/Sieg/.test(s.title)) stat.wins++;
      stat.results.push(s.title + ' ' + s.score + ' (' + s.logItems + ' Zeilen)');
      if (s.logItems < 12) errors.push('Protokoll zu kurz: ' + s.logItems);
      await snap(/Penaltys/.test(s.title) ? '11-resultat-penaltys' : '10-resultat');
      if (s.reward) await click('#reward .opt');
      await click(Math.random() < 0.5 ? '#btn-map' : '#btn-again:not([hidden])') || await click('#btn-map');
    }
  }
  stat.seen = await page.evaluate(() => window.__seen);
  stat.errors = errors; delete stat._so;
  await ctx.close();
  return stat;
}

(async () => {
  const browser = await chromium.launch();
  const runs = [
    { name: '375 px, reduzierte Bewegung', width: 375, reduce: true, matches: 12, max: 80, needShootout: true, until: ['läuft zum Penalty an', 'Penalty für', '2 Minuten', 'Konter', 'Tor in Überzahl', 'leere Tor'], shots: true },
    { name: '460 px, reduzierte Bewegung', width: 460, reduce: true, matches: 6, max: 60, needShootout: true, until: ['2 Minuten', 'Konter'], shots: true },
    { name: '375 px, mit Bewegung, teils übersprungen', width: 375, reduce: false, matches: 2, max: 2, skip: 0.5 },
    { name: '460 px, mit Bewegung, ohne Überspringen', width: 460, reduce: false, matches: 1, max: 1, skip: 0 }
  ];
  let bad = 0;
  for (const r of runs) {
    const t0 = Date.now(), st = await session(browser, r);
    console.log('\n' + r.name + ': ' + st.matches + ' Matches, ' + st.wins + ' Siege, ' + st.shootouts + ' Penaltyschiessen, ' + st.steps + ' Schritte, ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
    console.log('  gesehen: ' + JSON.stringify(st.seen));
    console.log('  Resultate: ' + st.results.slice(0, 8).join(' | '));
    console.log('  Überlauf quer: ' + (st.overflow.length ? st.overflow.join(', ') : 'keiner'));
    console.log('  Konsole: ' + (st.errors.length ? st.errors.length + ' FEHLER\n   ' + st.errors.slice(0, 8).join('\n   ') : 'keine Fehler'));
    bad += st.errors.length + st.overflow.length;
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
