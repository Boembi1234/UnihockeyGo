/* Match im Browser: spielt Matches durch, prüft Konsole und Überlauf, macht Bilder.
   Der Testspieler wählt zufällig, trifft die Balken mal genau und mal blind, setzt beim Schuss ein Ziel und reagiert bei Paraden.
   Vorher bauen: node build.js. node test/match.js [matches] */
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'shots', 'match'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  // Wo es WebGL gibt, läuft das ganze Match in der 3D-Halle. Der letzte Lauf erzwingt WebGL (in Software gerechnet) und
  // verlangt, dass das Match in 3D läuft; der Lauf mit reduzierter Bewegung bleibt in der Sicht von oben.
  const b = await chromium.launch(), bgl = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }), N = +process.argv[2] || 1; let fail = 0;
  const RUNS = [{ width: 375, shots: true }, { width: 460, shots: true }, { width: 375, reduce: true }, { width: 375, shots: true, gl: true }].filter(r => !process.env.ONLY || (process.env.ONLY === 'gl') === !!r.gl);
  const window_styles = ['slap', 'wrist', 'drag'];
  for (const run of RUNS) {
    const ctx = await (run.gl ? bgl : b).newContext({ viewport: { width: run.width, height: 900 }, deviceScaleFactor: 1, reducedMotion: run.reduce ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage(), errors = [], taken = {}, res = [], seen = {}; let n = 0;
    p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if ((m.type() === 'error' && !/Failed to load resource/.test(m.text())) || /3D-Szene ausgefallen/.test(m.text())) errors.push(m.text()); });
    await p.goto('file://' + path.resolve(__dirname, '..', 'dist', 'lab', 'match', 'index.html'), { waitUntil: 'load' });
    await p.evaluate(() => Promise.all(['600', '700', '800'].map(w => document.fonts.load(w + ' 16px "Saira Condensed"', 'ÜBERZAHL'))));
    const snap = async (name, full) => { if (!run.shots || taken[name]) return; taken[name] = 1; await p.screenshot({ path: path.join(OUT, run.width + (run.gl ? '-3d' : '') + '-' + name + '.png'), fullPage: !!full }); };
    if (run.gl) { await p.waitForFunction(() => !!window.THREE, null, { timeout: 15000 }).catch(() => {}); if (!(await p.evaluate(() => !!window.HKScene3D && window.HKScene3D.ok()))) errors.push('3D-Darstellung nicht verfügbar'); }
    // Ohne Grafikkarte rechnet die 3D-Halle langsam, und der Testspieler träfe nichts mehr. In den Läufen, die den Ablauf prüfen, läuft sie darum mit winzigem Bild; nur der letzte Lauf zeigt sie in voller Güte.
    if (!run.gl && !run.reduce) await p.evaluate(() => { if (window.HKScene3D) window.HKScene3D.quality(3); });
    const over = async w => { const x = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (x > 0) errors.push('Überlauf ' + w + ' +' + x); };
    await snap('00-team', true); await over('team');
    await p.click('#tabs [data-tab="store"]'); await p.waitForTimeout(150); await snap('00-shop', true); await over('shop');
    await p.click('#tabs [data-tab="play"]'); await p.waitForTimeout(150); await snap('00-spielen', true); await over('spielen');
    if (await p.isVisible('#screen-team') || !(await p.isVisible('#btn-start'))) errors.push('Tab Spielen zeigt nicht den Spielen-Bildschirm');
    for (let m = 0; m < N; m++) {
      if (m > 0) { if (!(await p.isVisible('#btn-other'))) { errors.push('Match ' + m + ' kam nicht ans Ende: ' + await p.evaluate(() => [document.getElementById('tag').textContent, document.getElementById('sc-period').textContent, document.getElementById('sc-time').textContent, document.getElementById('say').textContent].join(' / '))); break; } await p.click('#btn-other'); }
      await p.evaluate(() => { const o = [...document.querySelectorAll('#opps [data-opp]')]; o[Math.floor(Math.random() * o.length)].click(); });
      await p.evaluate(() => { const o = [...document.querySelectorAll('#tac-intro [data-tac]')]; o[Math.floor(Math.random() * o.length)].click(); });
      await p.click('#btn-start');
      for (let g = 0; g < 6000; g++) {
        const st = await p.evaluate(() => {
          const v = e => !!e && !e.hidden && e.offsetParent !== null;
          if (v(document.getElementById('screen-end'))) return 'end';
          const s3 = window.HKScene3D, l3 = document.getElementById('stage').classList.contains('live3d'), sd = document.getElementById('stage').dataset;
          if (l3 && s3.mode() === 'cut') return '3d';
          if (document.getElementById('stage').classList.contains('livemode')) return 'live';
          if (v(document.getElementById('dribview'))) return document.getElementById('drib-msg').hidden ? 'drib' : 'wait';
          const tb = document.getElementById('tbb'); if (v(tb)) return /g-/.test(tb.className) ? 'wait' : document.getElementById('tag').textContent === 'Abwehr' ? 'bar-def' : 'bar-att';
          if (sd.aim === '1' && (l3 ? s3.mode() === 'aim' : !document.getElementById('goalview').hidden)) return 'aim';
          if (l3 ? sd.react === '1' : document.getElementById('zones').classList.contains('armed')) return 'react';
          const pnl = document.getElementById('panel'); if (v(pnl) && pnl.querySelector('[data-a]:not(:disabled)')) return 'att';
          return 'wait';
        });
        seen[st] = (seen[st] || 0) + 1;
        if (!seen.live3 && g % 20 === 0 && await p.evaluate(() => document.getElementById('stage').classList.contains('live3d'))) seen.live3 = 1;
        if (process.env.DEBUG && (g % 400 === 0 || st !== seen._last)) { seen._last = st; console.log(g, st, await p.evaluate(() => [document.getElementById('tag').textContent, document.getElementById('sc-time').textContent, document.getElementById('say').textContent.slice(0, 60), document.getElementById('hint').hidden ? '' : document.getElementById('hint-text').textContent].join(' / '))); }
        if (st === 'end') { await snap('09-resultat', true); res.push(await p.textContent('#res-title') + ' ' + await p.textContent('#res-score') + ' ' + await p.textContent('#reward')); if (!/\+\d/.test(await p.textContent('#reward'))) errors.push('keine Münzen'); break; }
        if (st === 'att') {
          await snap('01-angriff'); await over('angriff'); n++;
          const live3 = await p.evaluate(() => document.getElementById('stage').classList.contains('live3d'));
          if (live3) { seen.live3 = 1; await p.waitForTimeout(taken['01-angriff-3d'] ? 0 : 700); await snap('01-angriff-3d'); }
          if (Math.random() < 0.25) {
            // direkt auf dem Feld: in 3D dorthin tippen, wo die Figur steht
            const at = live3 ? await p.evaluate(() => { const l = [...document.querySelectorAll('#pls .pl.pick')]; if (!l.length) return null; return window.HKScene3D.screen(l[Math.floor(Math.random() * l.length)].getAttribute('data-id')); }) : null;
            if (at) { await p.mouse.click(at[0], at[1]); await p.waitForTimeout(60); if (await p.evaluate(() => !!document.querySelector('#panel [data-a]:not(:disabled)'))) seen.missTap = (seen.missTap || 0) + 1; else seen.tap3 = 1; }
            else await p.evaluate(() => { const l = [...document.querySelectorAll('#pls .pl.pick')]; if (l.length) l[Math.floor(Math.random() * l.length)].dispatchEvent(new MouseEvent('click', { bubbles: true })); });
          }
          else await p.evaluate(() => { const l = [...document.querySelectorAll('#panel [data-a]:not(:disabled), #panel [data-to]')]; l[Math.floor(Math.random() * l.length)].click(); });
          await p.waitForTimeout(40); continue;
        }
        if (st === 'live') {
          // Live-Szene: Linien zeichnen. Mal zu einem Mitspieler (lieber zu einem freien), mal ins Tor, mal in den freien Raum; mal kurz halten (Zeitlupe).
          await snap('01-live'); await over('live'); n++;
          const r = await p.locator('#stage').boundingBox();
          for (let k = 0; k < 14; k++) {
            if (!(await p.evaluate(() => document.getElementById('stage').classList.contains('livemode')))) break;
            const m = await p.evaluate(() => [...document.querySelectorAll('#pls .pl[data-side="you"]')].filter(e => e.querySelector('.carrier-ring').getAttribute('visibility') !== 'visible').map(e => { const b = e.querySelector('.body').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }));
            const x = Math.random(), to = x < 0.45 && m.length ? m[Math.floor(Math.random() * m.length)] : x < 0.75 ? [r.x + r.width * 0.5, r.y + r.height * 0.07] : [r.x + r.width * (0.15 + Math.random() * 0.7), r.y + r.height * (0.25 + Math.random() * 0.45)];
            await p.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.7); await p.mouse.down(); await p.mouse.move(to[0], to[1], { steps: 3 });
            if (Math.random() < 0.4) { await p.waitForTimeout(260); await snap('01-live-zeitlupe'); }
            await p.mouse.up(); await p.waitForTimeout(250 + Math.random() * 500);
          }
          continue;
        }
        if (st === 'drib') {
          // Dribbling-Parcours: wischen. Erst nach vorne, dann schräg zur einen Seite, dann zur anderen, danach weiter nach vorne.
          await snap('02-dribbling'); await over('dribbling'); n++;
          const r = await p.locator('#stage').boundingBox(), cx = r.x + r.width / 2, cy = r.y + r.height * 0.78, side = Math.random() < 0.5 ? -1 : 1;
          const over_ = () => p.evaluate(() => document.getElementById('dribview').hidden || !document.getElementById('drib-msg').hidden);
          if (Math.random() < 0.1) { await p.click('#drib-back'); await p.waitForTimeout(60); continue; }      // «Andere Aktion»
          await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx, cy - 70, { steps: 3 }); await p.waitForTimeout(150 + Math.random() * 250);
          await p.mouse.move(cx + side * 70, cy - 110, { steps: 3 }); await p.waitForTimeout(250 + Math.random() * 300); await snap('02-dribbling-lauf');
          await p.mouse.move(cx - side * 40, cy - 190, { steps: 4 }); await p.waitForTimeout(350 + Math.random() * 300); await p.mouse.up();
          for (let k = 0; k < 30 && !(await over_()); k++) { await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx + (Math.random() - 0.5) * 70, cy - 70, { steps: 2 }); await p.waitForTimeout(220); await p.mouse.up(); }
          await snap('02-dribbling-ende'); await p.waitForTimeout(120); continue;
        }
        if (st === 'bar-att' || st === 'bar-def') {
          await p.waitForTimeout(320); await snap(st === 'bar-att' ? '02-balken-angriff' : '03-balken-abwehr'); await over(st); n++;
          const shotBar = st === 'bar-att' && await p.evaluate(() => document.getElementById('tbov').classList.contains('shot'));
          if (shotBar) await snap('06-schuss-balken');
          if (st === 'bar-att' && !shotBar && Math.random() < 0.08) { await p.click('#tb-back'); continue; }   // «Andere Aktion»
          if (shotBar && Math.random() < 0.3) { await p.waitForTimeout(2300); await snap('06-schuss-goalie-rueckt'); }   // trödeln: der Goalie rückt in die Ecke
          // Hälfte genau: warten, bis der Strich im Feld ist. Hälfte blind.
          const aimed = Math.random() < 0.55;
          // Wo der Strich steht, wird aus seinem Lauf gerechnet (nicht aus dem Bild): so trifft der Testspieler auch, wenn die Bilder stocken
          await p.evaluate(aimed => new Promise(done => {
            const tb = document.getElementById('tbb'), z = tb.querySelector('.tb-z'), t0 = performance.now(), wait = aimed ? 0 : Math.random() * 900;
            const sw = +tb.dataset.sweep, st = +tb.dataset.start, tb0 = +tb.dataset.t0, B = tb.getBoundingClientRect(), a = z.getBoundingClientRect(), mid = (a.left + a.width / 2 - B.left) / B.width, tol = Math.max(0.006, a.width / B.width * 0.35);
            const X = now => { const u = ((((now - tb0) / (sw * 2) + st) % 1) + 1) % 1; return u < 0.5 ? u * 2 : 2 - u * 2; };
            (function poll() {
              const now = performance.now();
              if ((aimed && now - tb0 > 300 && Math.abs(X(now) - mid) <= tol) || (!aimed && now - t0 > wait) || now - t0 > 4000) { tb.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); done(); } else setTimeout(poll, 1);
            })();
          }), aimed);
          if (!run.reduce) { await p.waitForTimeout(200); await snap(shotBar ? '07-schuss-gestoppt' : st === 'bar-att' ? '04-balken-treffer' : '05-balken-abwehr-treffer'); if (shotBar) { await p.waitForTimeout(1000); await snap('07-schuss-ende'); } }
          await p.waitForTimeout(260); continue;
        }
        if (st === 'aim') {
          await p.waitForTimeout(200 + Math.random() * 300); await over('schuss'); n++; await snap('06-schuss');
          // Schussart: drei Knöpfe, genau einer gewählt und genau einer als Tipp. Mal eine andere wählen: Knopf und Bühne müssen sie zeigen.
          const sty0 = await p.evaluate(() => [document.querySelectorAll('#panel [data-sty]').length, document.querySelectorAll('#panel .sty.on').length, document.querySelectorAll('#panel .sty .tags .tr:not(.fav)').length, window.HKMatch.STYLES.indexOf(document.getElementById('stage').dataset.style) >= 0]);
          if (sty0[0] !== 3 || sty0[1] !== 1 || sty0[2] !== 1 || !sty0[3]) { if (!taken.sty0) { taken.sty0 = 1; errors.push('Schussarten beim Zielen stimmen nicht (Knöpfe, gewählt, Tipp, Bühne): ' + JSON.stringify(sty0)); } }
          else if (Math.random() < 0.6) {
            const pick = await p.evaluate(() => { const l = [...document.querySelectorAll('#panel [data-sty]')], b = l[Math.floor(Math.random() * 3)]; b.click(); return b.dataset.sty; });
            await p.waitForTimeout(run.gl ? 450 : 120);
            const got = await p.evaluate(() => { const on = document.querySelectorAll('#panel .sty.on'); return [on.length === 1 && on[0].dataset.sty, document.getElementById('stage').dataset.style, document.getElementById('hist').textContent.slice(0, 40)]; });
            if (got[0] !== pick || got[1] !== pick) errors.push('Schussart nicht umgestellt: gewählt ' + pick + ', gezeigt ' + JSON.stringify(got));
            seen['sty-' + pick] = 1; await snap('06-schussart-' + pick); await over('schussart');
          }
          // Ziel setzen: meist in eine Ecke, mal irgendwohin; mal tippen, mal schieben. Danach läuft der Schuss-Balken.
          const r = Math.random();
          if (await p.evaluate(() => document.getElementById('stage').classList.contains('live3d'))) {
            await p.waitForTimeout(500); await snap('06-schuss-3d');
            const g3 = r < 0.7 ? [Math.random() < 0.5 ? -0.8 : 0.8, Math.random() < 0.7 ? 0.86 : 0.15] : [(Math.random() - 0.5) * 2.6, Math.random() * 1.3], to3 = await p.evaluate(g => window.HKScene3D.goalAt(g), g3), c3 = await p.evaluate(() => window.HKScene3D.goalAt([0, 0.3]));
            const back = await p.evaluate(a => { const b = document.getElementById('stage').getBoundingClientRect(), g = window.HKScene3D.pickGoal(a[0], a[1]); return [g, a[0] >= b.left && a[0] <= b.right && a[1] >= b.top && a[1] <= b.bottom]; }, to3);
            if (r < 0.7 && !back[1]) errors.push('Tor liegt beim Zielen nicht ganz im Bild: ' + JSON.stringify(g3));
            if (Math.hypot(back[0][0] - g3[0], back[0][1] - g3[1]) > 0.06) errors.push('Tippen ins Tor trifft nicht: ' + JSON.stringify([g3, back[0]]));
            if (r > 0.5) await p.mouse.click(to3[0], to3[1]); else { await p.mouse.move(c3[0], c3[1]); await p.mouse.down(); await p.mouse.move(to3[0], to3[1], { steps: 5 }); await p.waitForTimeout(60); await snap('06-schuss-3d-ziel'); await p.mouse.up(); }
            await p.waitForTimeout(60); continue;
          }
          const bb = await p.locator('#goalview').boundingBox(), k = bb.width / 360;
          const g = await p.evaluate(() => { const b = document.getElementById('posts').getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; });
          const to = r < 0.7 ? [g[0] + g[2] * (Math.random() < 0.5 ? 0.1 : 0.9), g[1] + g[3] * (Math.random() < 0.7 ? 0.14 : 0.85)] : [bb.x + (100 + Math.random() * 160) * k, bb.y + (95 + Math.random() * 130) * k];
          if (r > 0.5) await p.mouse.click(to[0], to[1]);
          else { await p.mouse.move(bb.x + 180 * k, bb.y + 200 * k); await p.mouse.down(); await p.mouse.move(to[0], to[1], { steps: 5 }); await p.waitForTimeout(60); await p.mouse.up(); }
          await p.waitForTimeout(60); continue;
        }
        if (st === 'react') {
          n++;
          // Die Schussart des Gegners ist angesagt; beim Zugschuss gibt es eine Finte. In einem Zug gelesen: Die Parade kann jeden Augenblick vorbei sein.
          const tell = await p.evaluate(() => { const e = document.getElementById('tell'), s = document.getElementById('stage'), sd = s.dataset, on = s.classList.contains('live3d') ? sd.react === '1' : document.getElementById('zones').classList.contains('armed'); return [on, !e.hidden && e.textContent, sd.style, sd.feint]; });
          if (tell[0] && (!tell[1] || window_styles.indexOf(tell[2]) < 0)) { if (!taken.tell) { taken.tell = 1; errors.push('Ansage der Schussart fehlt bei der Parade: ' + JSON.stringify(tell)); } }
          else if (tell[0]) { seen['opp-' + tell[2]] = 1; if ((tell[2] === 'drag') !== !!tell[3]) errors.push('Finte passt nicht zur Schussart: ' + JSON.stringify(tell)); }
          await snap('08-parade'); if (tell[0] && tell[3]) await snap('08-parade-finte');
          // Mal dorthin, wo der Ring ist, mal zufällig, mal gar nicht
          const r = Math.random();
          if (await p.evaluate(() => document.getElementById('stage').classList.contains('live3d'))) {
            await snap('08-parade-3d');
            // Tippen ins Tor muss die richtige Zone treffen, auch wenn das Tor des Gegners gespiegelt steht
            const zbad = await p.evaluate(() => { const M = window.HKMatch, S3 = window.HKScene3D; return M.ZONES.filter(z => { const at = S3.goalAt(M.ZC[z]), g = S3.pickGoal(at[0], at[1]); return M.zoneOf(Math.max(-0.99, Math.min(0.99, g[0])), Math.max(0, Math.min(0.99, g[1]))) !== z; }); });
            if (zbad.length && !taken.zbad) { taken.zbad = 1; errors.push('Parade in 3D: Tippen trifft die Zone nicht: ' + zbad.join(', ')); }
            // Mal dorthin, wo der Ring ist, mal zufällig, mal gar nicht
            if (r < 0.85) { const at = await p.evaluate(hit => { const l = document.getElementById('stage').dataset.land.split(',').map(Number), g = hit ? [Math.max(-0.9, Math.min(0.9, l[0])), Math.max(0.1, Math.min(0.9, l[1]))] : [[-0.62, 0, 0.62][Math.floor(Math.random() * 3)], Math.random() < 0.5 ? 0.25 : 0.72]; return window.HKScene3D.goalAt(g); }, r < 0.6); await p.mouse.move(at[0], at[1]); await p.mouse.down(); await p.mouse.up(); }
            await p.waitForTimeout(300); continue;
          }
          if (r < 0.6) await p.evaluate(() => { const mk = document.getElementById('mark').getBoundingClientRect(); document.getElementById('goalview').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: mk.left + mk.width / 2, clientY: mk.top + mk.height / 2 })); });
          else if (r < 0.85) await p.evaluate(() => { const gv = document.getElementById('goalview').getBoundingClientRect(); document.getElementById('goalview').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: gv.left + gv.width * (0.3 + Math.random() * 0.4), clientY: gv.top + gv.height * (0.45 + Math.random() * 0.4) })); });
          if (!run.reduce) { await p.waitForTimeout(650); await snap('08-parade-ende'); }
          await p.waitForTimeout(300); continue;
        }
        if (st === '3d') {
          // 3D-Szene: mal laufen lassen und ein Bild machen, mal vorspulen
          const what = await p.evaluate(() => { const l = document.getElementById('led'), s = document.getElementById('stamp'), c = document.querySelector('#view3d canvas'); return [!l.hidden ? 'tor' : !s.hidden ? s.querySelector('b').textContent.toLowerCase().replace(/[^a-zäöü]+/g, '-') : 'szene', c ? c.width : 0]; });
          if (!what[1]) errors.push('3D-Sicht ohne Bild');
          if (!taken['12-' + what[0]] || Math.random() < 0.3) { await p.waitForTimeout(what[0] === 'tor' ? 1500 : 450); await snap('12-' + what[0]); }
          if (await p.evaluate(() => { const c = document.querySelector('#view3d canvas'), s = document.getElementById('stage'); return !!c && !document.getElementById('view3d').hidden && (Math.abs(c.clientWidth - s.clientWidth) > 2 || Math.abs(c.clientHeight - s.clientHeight) > 2); })) errors.push('3D-Sicht füllt die Bühne nicht');
        }
        if (Math.random() < 0.02) await p.evaluate(() => { const o = [...document.querySelectorAll('#tac [data-tac]')]; o[Math.floor(Math.random() * o.length)].click(); });
        // Trainer: ab und zu die Linie wechseln oder eine Taktikkarte ansehen und einsetzen
        if (Math.random() < 0.012) { await p.evaluate(() => { const o = [...document.querySelectorAll('#lines [data-line]')]; o[Math.floor(Math.random() * o.length)].click(); }); seen.line = 1; }
        if (Math.random() < 0.012) {
          const had = await p.evaluate(() => { const o = [...document.querySelectorAll('#tcards [data-card]:not(:disabled)')]; if (!o.length) return false; o[Math.floor(Math.random() * o.length)].click(); return true; });
          if (had) { await p.waitForTimeout(60); await snap('10-taktikkarte'); await over('taktikkarte'); await p.evaluate(() => { const b = document.querySelector('#tcinfo [data-use]:not([data-use=""])'); if (b) b.click(); }); seen.card = 1; }
        }
        await p.evaluate(() => document.getElementById('stage').click());
        await p.waitForTimeout(25);
      }
    }
    const missing = ['att', 'drib', 'bar-att', 'bar-def', 'aim', 'react', 'end', 'line', 'card', 'sty-slap', 'sty-wrist', 'sty-drag', 'opp-slap', 'opp-wrist', 'opp-drag'].concat(run.gl ? ['3d'] : []).filter(k => !seen[k]); if (run.gl && !seen['3d']) errors.push('keine 3D-Szene gesehen'); if (run.gl && !seen.live3) errors.push('das Match lief nicht in 3D');
    if (run.reduce && seen.live3) errors.push('bei reduzierter Bewegung lief das Match in 3D'); if ((seen.missTap || 0) > 2 && !seen.tap3) errors.push('Tippen auf eine Figur wählt den Pass nicht: ' + seen.missTap + ' Versuche'); if (missing.length && N >= 2) errors.push('nie gesehen: ' + missing.join(', '));
    console.log(run.width + ' px' + (run.reduce ? ', reduziert' : '') + (run.gl ? ', 3D' : '') + ': ' + res.join(' | ') + ', ' + n + ' Eingaben' + (errors.length ? '\n  FEHLER: ' + errors.slice(0, 6).join(' | ') : ', keine Fehler'));
    if (errors.length || res.length < N) fail = 1;
    await ctx.close();
  }
  await b.close(); await bgl.close(); process.exit(fail);
})();
