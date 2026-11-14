/* Match im Browser: spielt Matches durch, prüft Konsole und Überlauf, macht Bilder.
   Der Testspieler wählt zufällig, trifft die Balken mal genau und mal blind, setzt beim Schuss ein Ziel und reagiert bei Paraden.
   Vorher bauen: node build.js. node test/match.js [matches] */
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'shots', 'match'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(), N = +process.argv[2] || 1; let fail = 0;
  for (const run of [{ width: 375, shots: true }, { width: 460, shots: true }, { width: 375, reduce: true }]) {
    const ctx = await b.newContext({ viewport: { width: run.width, height: 900 }, deviceScaleFactor: 1, reducedMotion: run.reduce ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage(), errors = [], taken = {}, res = [], seen = {}; let n = 0;
    p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await p.goto('file://' + path.resolve(__dirname, '..', 'dist', 'lab', 'match', 'index.html'), { waitUntil: 'load' });
    await p.evaluate(() => Promise.all(['600', '700', '800'].map(w => document.fonts.load(w + ' 16px "Saira Condensed"', 'ÜBERZAHL'))));
    const snap = async (name, full) => { if (!run.shots || taken[name]) return; taken[name] = 1; await p.screenshot({ path: path.join(OUT, run.width + '-' + name + '.png'), fullPage: !!full }); };
    const over = async w => { const x = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (x > 0) errors.push('Überlauf ' + w + ' +' + x); };
    await snap('00-intro', true); await over('intro');
    for (let m = 0; m < N; m++) {
      if (m > 0) { if (!(await p.isVisible('#btn-other'))) { errors.push('Match ' + m + ' kam nicht ans Ende: ' + await p.evaluate(() => [document.getElementById('tag').textContent, document.getElementById('sc-period').textContent, document.getElementById('sc-time').textContent, document.getElementById('say').textContent].join(' / '))); break; } await p.click('#btn-other'); }
      await p.evaluate(() => { const o = [...document.querySelectorAll('#opps [data-opp]')]; o[Math.floor(Math.random() * o.length)].click(); });
      await p.evaluate(() => { const o = [...document.querySelectorAll('#tac-intro [data-tac]')]; o[Math.floor(Math.random() * o.length)].click(); });
      await p.click('#btn-start');
      for (let g = 0; g < 6000; g++) {
        const st = await p.evaluate(() => {
          const v = e => !!e && !e.hidden && e.offsetParent !== null;
          if (v(document.getElementById('screen-end'))) return 'end';
          const tb = document.getElementById('tbb'); if (v(tb)) return /g-/.test(tb.className) ? 'wait' : document.getElementById('tag').textContent === 'Abwehr' ? 'bar-def' : 'bar-att';
          if (/Wohin soll der Schuss/.test(document.getElementById('say').textContent) && !document.getElementById('free-l').closest('#goalview').hidden && document.getElementById('shooter').hidden === false) return 'aim';
          if (document.getElementById('zones').classList.contains('armed')) return 'react';
          const pnl = document.getElementById('panel'); if (v(pnl) && pnl.querySelector('[data-a]:not(:disabled)')) return 'att';
          return 'wait';
        });
        seen[st] = (seen[st] || 0) + 1;
        if (process.env.DEBUG && (g % 400 === 0 || st !== seen._last)) { seen._last = st; console.log(g, st, await p.evaluate(() => [document.getElementById('tag').textContent, document.getElementById('sc-time').textContent, document.getElementById('say').textContent.slice(0, 60), document.getElementById('hint').hidden ? '' : document.getElementById('hint-text').textContent].join(' / '))); }
        if (st === 'end') { await snap('09-resultat', true); res.push(await p.textContent('#res-title') + ' ' + await p.textContent('#res-score') + ' ' + await p.textContent('#reward')); if (!/\+\d/.test(await p.textContent('#reward'))) errors.push('keine Münzen'); break; }
        if (st === 'att') {
          await snap('01-angriff'); await over('angriff'); n++;
          if (Math.random() < 0.25) await p.evaluate(() => { const l = [...document.querySelectorAll('#pls .pl.pick')]; if (l.length) l[Math.floor(Math.random() * l.length)].dispatchEvent(new MouseEvent('click', { bubbles: true })); });
          else await p.evaluate(() => { const l = [...document.querySelectorAll('#panel [data-a]:not(:disabled), #panel [data-to]')]; l[Math.floor(Math.random() * l.length)].click(); });
          await p.waitForTimeout(40); continue;
        }
        if (st === 'bar-att' || st === 'bar-def') {
          await p.waitForTimeout(320); await snap(st === 'bar-att' ? '02-balken-angriff' : '03-balken-abwehr'); await over(st); n++;
          const shotBar = st === 'bar-att' && await p.evaluate(() => document.getElementById('tbov').classList.contains('shot'));
          if (shotBar) await snap('06-schuss-balken');
          if (st === 'bar-att' && Math.random() < 0.08) { await p.click('#tb-back'); continue; }   // «Andere Aktion» oder «Ziel ändern»
          // Hälfte genau: warten, bis der Strich im Feld ist. Hälfte blind.
          const aimed = Math.random() < 0.55;
          await p.evaluate(aimed => new Promise(done => {
            const tb = document.getElementById('tbb'), z = tb.querySelector('.tb-z'), m = document.getElementById('tb-m'), t0 = performance.now(), wait = aimed ? 0 : Math.random() * 900;
            (function poll() {
              const a = z.getBoundingClientRect(), x = m.getBoundingClientRect().left + 2, inside = x >= a.left && x <= a.right, now = performance.now();
              if ((aimed && inside) || (!aimed && now - t0 > wait) || now - t0 > 4000) { tb.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); done(); } else requestAnimationFrame(poll);
            })();
          }), aimed);
          if (!run.reduce) { await p.waitForTimeout(200); await snap(shotBar ? '07-schuss-gestoppt' : st === 'bar-att' ? '04-balken-treffer' : '05-balken-abwehr-treffer'); if (shotBar) { await p.waitForTimeout(1000); await snap('07-schuss-ende'); } }
          await p.waitForTimeout(260); continue;
        }
        if (st === 'aim') {
          await p.waitForTimeout(200 + Math.random() * 300); await over('schuss'); n++; await snap('06-schuss');
          // Ziel setzen: mal ins grüne Feld, mal irgendwohin; mal tippen, mal schieben. Danach läuft der Schuss-Balken.
          const bb = await p.locator('#goalview').boundingBox(), k = bb.width / 360, r = Math.random();
          const free = await p.evaluate(() => { const f = [...document.querySelectorAll('.free')].filter(e => !e.hidden).map(e => e.getBoundingClientRect()).sort((a, b) => b.width - a.width)[0]; return f ? [f.left + f.width / 2, f.top + f.height / 2] : null; });
          const to = r < 0.7 && free ? free : [bb.x + (100 + Math.random() * 160) * k, bb.y + (95 + Math.random() * 130) * k];
          if (r > 0.5) await p.mouse.click(to[0], to[1]);
          else { await p.mouse.move(bb.x + 180 * k, bb.y + 200 * k); await p.mouse.down(); await p.mouse.move(to[0], to[1], { steps: 5 }); await p.waitForTimeout(60); await p.mouse.up(); }
          await p.waitForTimeout(60); continue;
        }
        if (st === 'react') {
          await snap('08-parade'); n++;
          // Mal dorthin, wo der Ring ist, mal zufällig, mal gar nicht
          const r = Math.random();
          if (r < 0.6) await p.evaluate(() => { const mk = document.getElementById('mark').getBoundingClientRect(); document.getElementById('goalview').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: mk.left + mk.width / 2, clientY: mk.top + mk.height / 2 })); });
          else if (r < 0.85) await p.evaluate(() => { const gv = document.getElementById('goalview').getBoundingClientRect(); document.getElementById('goalview').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: gv.left + gv.width * (0.3 + Math.random() * 0.4), clientY: gv.top + gv.height * (0.45 + Math.random() * 0.4) })); });
          if (!run.reduce) { await p.waitForTimeout(650); await snap('08-parade-ende'); }
          await p.waitForTimeout(300); continue;
        }
        if (Math.random() < 0.02) await p.evaluate(() => { const o = [...document.querySelectorAll('#tac [data-tac]')]; o[Math.floor(Math.random() * o.length)].click(); });
        await p.evaluate(() => document.getElementById('stage').click());
        await p.waitForTimeout(25);
      }
    }
    const missing = ['att', 'bar-att', 'bar-def', 'aim', 'react', 'end'].filter(k => !seen[k]); if (missing.length && N >= 2) errors.push('nie gesehen: ' + missing.join(', '));
    console.log(run.width + ' px' + (run.reduce ? ', reduziert' : '') + ': ' + res.join(' | ') + ', ' + n + ' Eingaben' + (errors.length ? '\n  FEHLER: ' + errors.slice(0, 6).join(' | ') : ', keine Fehler'));
    if (errors.length || res.length < N) fail = 1;
    await ctx.close();
  }
  await b.close(); process.exit(fail);
})();
