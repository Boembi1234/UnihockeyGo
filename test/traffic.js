/* Verkehr vor dem Tor im Browser, in 3D: gestellte Lagen statt Zufall.
   A: Schuss von hinten mit einem Blocker in der Schussbahn und dem Center als Sichtschutz, dann ein Schuss in den Block.
   B: Parade ohne Festhalten, ein Mitspieler kommt an den Abpraller und schiesst nach.
   C: Dein Goalie hält spät, der Gegner schiesst nach.
   Vorher bauen: node build.js. node test/traffic.js */
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'shots', 'match'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 375, height: 900 }, deviceScaleFactor: 1 }), errors = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if ((m.type() === 'error' && !/Failed to load resource/.test(m.text())) || /3D-Szene ausgefallen/.test(m.text())) errors.push(m.text()); });
  const ok = (c, t) => { console.log((c ? 'ok   ' : 'FEHLT') + ' ' + t); if (!c) errors.push(t); };
  await p.goto('file://' + path.resolve(__dirname, '..', 'dist', 'lab', 'match', 'index.html'), { waitUntil: 'load' });
  await p.waitForFunction(() => !!window.THREE && !!window.HKScene3D && window.HKScene3D.ok(), null, { timeout: 20000 });
  await p.click('#tabs [data-tab="play"]'); await p.click('#btn-start');
  const until = (f, arg, ms) => p.waitForFunction(f, arg, { timeout: ms || 60000, polling: 50 });
  // warten, bis das Match auf eine Eingabe wartet (Entscheidung, Balken oder eigener Schuss: dann läuft kein Ablauf mehr); dabei aufs Feld tippen, das spult vor
  const idle = async () => { for (let i = 0; i < 900; i++) { if (await p.evaluate(() => ['decide', 'bar'].indexOf(window.HKMatchTest.phase()) >= 0 || (window.HKMatchTest.phase() === 'aim' && document.getElementById('stage').dataset.aim === '1'))) return; await p.evaluate(() => document.getElementById('stage').click()); await p.waitForTimeout(150); } throw new Error('das Match wartet nie auf eine Eingabe'); };
  await idle();
  const snap = n => p.screenshot({ path: path.join(OUT, 'verkehr-' + n + '.png') });
  // Stellt eine eigene Angriffsszene: wer wo steht. at: { Rolle: [x, y] } für dich und den Gegner (nach Rolle des Gegenspielers)
  const stage = (carrier, you, home) => p.evaluate(([carrier, you, home]) => {
    const M = window.HKMatch, T = window.HKMatchTest, s = JSON.parse(JSON.stringify(T.state())); s.cfg = T.state().cfg;
    const Y = s.teams.you.cards, H = s.teams.home.cards, by = (l, r) => l.find(c => c.role === r);
    s.cur = { type: 'att', kind: 'set', step: 1, max: 4, counter: false, pos: {}, mark: {}, carrier: by(Y, carrier).id, intent: null, press: 0, dribs: {}, last: null, reb: false, bar: { pos: 0.5, start: 0.2 } };
    Object.keys(you).forEach(r => { s.cur.pos[by(Y, r).id] = you[r]; }); Object.keys(home).forEach(r => { s.cur.pos[by(H, r).id] = home[r]; });
    M.ROLES.forEach(r => { s.cur.mark[by(Y, r).id] = by(H, M.MARKS[r]).id; });
    s.shot = null; s.phase = 'decide'; s.pen = null;
    const r = M.act(s, { type: 'shoot' }, window.HK.makeRng(5)); if (!r.ok) return 'Schuss abgelehnt';
    T.load(r.state); const sh = r.state.shot; return { style: sh.style, why: sh.why, shade: sh.shade, scr: sh.scr, reach: M.reach(r.state, sh), kx: sh.keeper.x, kY: r.state.cfg.kY };
  }, [carrier, you, home]);
  const aimReady = () => until(() => document.getElementById('stage').dataset.aim === '1' && window.HKScene3D.mode() === 'aim' && window.HKMatchTest.phase() === 'aim');
  // Ins Tor tippen und den Strich genau in der Mitte stoppen
  const shoot = async g => {
    const at = await p.evaluate(g => window.HKScene3D.goalAt(g), g); await p.mouse.click(at[0], at[1]);
    await until(() => window.HKMatchTest.phase() === 'bar' && !!document.getElementById('tbb'));
    await p.evaluate(() => new Promise(done => { const tb = document.getElementById('tbb'), sw = +tb.dataset.sweep, st = +tb.dataset.start, t0 = +tb.dataset.t0, X = now => { const u = ((((now - t0) / (sw * 2) + st) % 1) + 1) % 1; return u < 0.5 ? u * 2 : 2 - u * 2; }; (function poll() { const now = performance.now(); if (now - t0 > 300 && Math.abs(X(now) - 0.5) <= 0.004) { tb.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); done(); } else setTimeout(poll, 1); })(); }));
  };
  const stampIs = t => until(t => { const s = document.getElementById('stamp'); return !s.hidden && s.querySelector('b').textContent === t; }, t, 30000).then(() => true).catch(() => false);

  const want = k => !process.env.ONLY || process.env.ONLY.indexOf(k) >= 0;      // ONLY=C node test/traffic.js: nur diese Lage
  if (want('A')) {
  // --- A: Schuss von hinten durch den Verkehr ---
  let A = await stage('LD', { LD: [104, 300], RD: [256, 290], C: [164, 94], LW: [62, 150], RW: [290, 160] }, { RW: [56, 290], LW: [300, 250], C: [146, 156], RD: [40, 170], LD: [322, 150] });
  await aimReady(); await p.waitForTimeout(900);
  const pickA = [A.style, A.why]; await p.click('#panel [data-sty="slap"]'); await p.waitForTimeout(400);
  A = await p.evaluate(() => { const s = window.HKMatchTest.state().shot; return { shade: s.shade, scr: s.scr }; });
  const dom = await p.evaluate(() => [document.querySelectorAll('#panel [data-sty]').length, document.getElementById('kblock').childElementCount, document.getElementById('hist').textContent, document.getElementById('say').textContent]);
  ok(A.shade && A.shade.length === 1 && Math.abs(A.shade[0].x) < 0.3 && A.shade[0].w < 0.9 && A.scr.length === 1, 'A: ein Blocker in der Mitte der Schussbahn und der Center als Sichtschutz (Tipp der Engine: ' + pickA.join(', ') + '): ' + JSON.stringify(A.shade));
  ok(dom[0] === 3 && dom[1] === 1 && /Rot schraffiert/.test(dom[2]) && /Sichtschutz/.test(dom[2]) && /am Block vorbei/.test(dom[3]), 'A: Schatten im Tor, Hinweise auf Block und Sichtschutz: ' + dom[3]);
  await snap('a-block-sichtschutz');
  // Zugschuss: Der Schatten wandert
  await p.click('#panel [data-sty="drag"]'); await p.waitForTimeout(500);
  const moved = await p.evaluate(() => window.HKMatchTest.state().shot.shade[0].x);
  ok(Math.abs(moved - A.shade[0].x) > 0.05, `A: beim Zugschuss wandert der Schatten (${A.shade[0].x.toFixed(2)} nach ${moved.toFixed(2)})`); await snap('a-zugschuss');
  await p.click('#panel [data-sty="slap"]'); await p.waitForTimeout(300);
  const sd = await p.evaluate(() => window.HKMatchTest.state().shot.shade[0]);
  await shoot([sd.x, 0.4]);
  ok(await stampIs('In den Block'), 'A: Schlagschuss mitten in den Schatten: «In den Block»'); await p.waitForTimeout(700); await snap('a-in-den-block');
  await until(() => ['pause', 'decide', 'bar', 'duel'].indexOf(window.HKMatchTest.phase()) >= 0 && window.HKMatchTest.state().phase !== 'aim', null, 30000);
  // Der Ball bleibt im Spiel: Nach dem Block folgen weitere Meldungen (freier Ball, Ballwechsel), die Meldung zum Block steht darunter
  const tick = await p.evaluate(() => [...document.querySelectorAll('#ticker li span')].map(e => e.textContent)); ok(tick.some(t => /in den Block/.test(t)), 'A: Ticker: ' + tick.find(t => /Block/.test(t)));
  await idle();
  }
  if (want('B')) {
  // --- B: Abpraller für dich ---
  const B = await stage('C', { C: [180, 150], LW: [150, 100], RW: [300, 170], LD: [100, 300], RD: [260, 300] }, { C: [60, 330], LD: [330, 320], RD: [30, 300], LW: [320, 380], RW: [40, 380] });
  await aimReady(); await p.click('#panel [data-sty="wrist"]').catch(() => {}); await p.waitForTimeout(600);
  // genau über den Goalie zielen: in seiner Reichweite, aber nicht nah genug zum Fangen; so ändert sein Rücken zur Seite nichts, egal wie lange der Test bis zum Tippen braucht
  const g = await p.evaluate(() => { const M = window.HKMatch, G = window.HKMatchTest.state(), R = M.reach(G, G.shot); return [G.shot.keeper.x, G.cfg.kY + R * 0.7 / G.cfg.kYs]; });
  await shoot(g);
  const gotReb = await until(() => { const s = window.HKMatchTest.state(); return window.HKMatchTest.phase() === 'aim' && !!s.shot && !!s.shot.reb && document.getElementById('stage').dataset.aim === '1' && window.HKScene3D.mode() === 'aim'; }, null, 40000).then(() => true).catch(() => false);
  const tk = await p.evaluate(() => [...document.querySelectorAll('#ticker li span')].slice(0, 3).map(e => e.textContent).join(' / '));
  ok(gotReb && /Abpraller/.test(tk), 'B: Parade ohne Festhalten, ein Mitspieler kommt an den Abpraller: ' + tk + ' (Ziel ' + g.map(v => v.toFixed(2)).join(', ') + ')');
  if (!gotReb) throw new Error('kein Abpraller, Rest von B und C übersprungen');
  await p.waitForTimeout(700);
  const reb = await p.evaluate(() => [document.getElementById('tag').textContent, !!document.querySelector('#panel .sty-note.reb'), document.querySelectorAll('#panel [data-sty]').length, document.getElementById('stage').dataset.style, document.getElementById('say').textContent, window.HKMatchTest.state().shot.keeper.x]);
  ok(reb[0] === 'Abpraller' && reb[1] && reb[2] === 0 && reb[3] === 'wrist' && Math.abs(reb[5] - g[0] * 0.55) <= 0.06, 'B: Nachschuss: nur das Handgelenk, der Goalie liegt dort, wo er gehalten hat: ' + reb[4]); await snap('b-abpraller');
  await shoot([g[0] > 0 ? -0.8 : 0.8, 0.8]);
  await until(() => window.HKMatchTest.state().phase !== 'aim', null, 30000);
  const last = await p.evaluate(() => [window.HKMatchTest.state().phase, window.HKMatchTest.state().score.you, document.querySelector('#ticker li span').textContent]);
  ok(last[0] === 'done', 'B: nach dem Nachschuss ist die Chance zu Ende: ' + last[2]); await p.waitForTimeout(600); await snap('b-nachschuss');
  await idle();
  }
  if (want('C')) {
  // --- C: Abpraller für den Gegner. Hier zählt die Zeit des Tippens: Die 3D-Halle läuft dafür mit winzigem Bild, sonst stockt sie ohne Grafikkarte. ---
  await p.evaluate(() => window.HKScene3D.quality(3));
  const stageC = () => p.evaluate(() => {
    const M = window.HKMatch, T = window.HKMatchTest, s0 = JSON.parse(JSON.stringify(T.state())); s0.cfg = T.state().cfg;
    const Y = s0.teams.you.cards, H = s0.teams.home.cards, rng = window.HK.makeRng(11 + Math.floor(performance.now()) % 50);
    s0.cur = { type: 'def', kind: 'set', step: 1, max: 2, counter: false, pos: {}, mark: {}, carrier: H[2].id, intent: { kind: 'shoot' }, press: 0, dribs: {}, last: null, reb: false, bar: { pos: 0.5, start: 0.2 } };
    H.forEach((c, i) => { s0.cur.pos[c.id] = i === 2 ? [180, 160] : i === 3 ? [180, 96] : [40 + i * 70, 300]; s0.cur.mark[c.id] = Y[i].id; }); Y.forEach((c, i) => { s0.cur.pos[c.id] = [50 + i * 65, 340]; });
    s0.shot = null; s0.pen = null; s0.fx.you.empty = false;
    for (let k = 0; k < 80; k++) { const s = JSON.parse(JSON.stringify(s0)); s.cfg = s0.cfg; M.setShot(s, rng, 'home', H[2].id, 0.7, 'attack', {}); if (!s.shot.miss && !s.shot.feint && s.shot.window >= 560) { T.load(s); return { window: s.shot.window, style: s.shot.style }; } }
    return null;
  });
  // Parade: tippen, wenn frac des Zeitfensters um ist (gemessen ab dem Augenblick, in dem der Ball fliegt)
  const save = frac => p.evaluate(frac => new Promise((done, fail) => { const st = document.getElementById('stage'), T0 = performance.now(); (function poll() { if (st.dataset.react === '1') { const t0 = performance.now(), w = window.HKMatchTest.state().shot.window, l = st.dataset.land.split(',').map(Number), at = window.HKScene3D.goalAt([Math.max(-0.9, Math.min(0.9, l[0])), Math.max(0.1, Math.min(0.9, l[1]))]); setTimeout(() => { st.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: at[0], clientY: at[1] })); done([w, Math.round(performance.now() - t0)]); }, w * frac); } else if (performance.now() - T0 > 25000) fail(new Error('der Ball fliegt nie')); else setTimeout(poll, 4); })(); }), frac);
  // Ob der Goalie spät hält (Abpraller) oder zu spät kommt, hängt an Millisekunden: bis zu vier Versuche
  let rebC = false, note = '';
  for (let k = 0; k < 4 && !rebC; k++) {
    const C = await stageC(); if (!C) { note = 'kein Schuss gestellt'; break; }
    const s1 = await save(0.62);
    await until(() => { const s = window.HKMatchTest.state(); return !s.shot || !!s.shot.reb; }, null, 30000).catch(() => {});
    rebC = await p.evaluate(() => { const s = window.HKMatchTest.state(); return !!s.shot && s.shot.side === 'home' && !!s.shot.reb; });
    note = `Versuch ${k + 1}: getippt nach ${s1[1]} von ${s1[0]} ms`;
    if (!rebC) await idle();
  }
  if (rebC) await until(() => !document.getElementById('tell').hidden && window.HKMatchTest.phase() !== 'play', null, 30000).catch(() => {});
  const cs = await p.evaluate(() => [document.getElementById('tell').textContent, document.getElementById('tag').textContent, document.getElementById('say').textContent, [...document.querySelectorAll('#ticker li span')].slice(0, 2).map(e => e.textContent).join(' / ')]);
  ok(rebC && cs[0] === 'Abpraller' && cs[1] === 'Abpraller', `C: dein Goalie hält spät, der Gegner schiesst nach (${note}): ${cs[2]} / ${cs[3]}`);
  if (rebC) {
    await snap('c-abpraller-gegner'); await save(0.15);
    await until(() => window.HKMatchTest.state().phase !== 'aim', null, 30000).catch(() => {});
    ok(await p.evaluate(() => ['done', 'throw', 'duel', 'decide'].indexOf(window.HKMatchTest.state().phase) >= 0), 'C: nach dem Nachschuss gibt es keinen zweiten, das Spiel geht weiter oder kommt zur Ruhe (' + await p.evaluate(() => window.HKMatchTest.state().phase + ': ' + document.querySelector('#ticker li span').textContent) + ')');
  }
  }
  console.log(errors.length ? '\nFEHLER: ' + errors.join(' | ') : '\nAlle Prüfungen bestanden');
  await b.close(); process.exit(errors.length ? 1 : 0);
})().catch(e => { console.log('ABBRUCH', e.message.split('\n')[0]); process.exit(1); });
