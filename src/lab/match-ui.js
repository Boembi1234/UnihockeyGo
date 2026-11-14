/* Match mit Schlüsselszenen: Oberfläche. Rechnet nichts selbst aus, sondern zeigt, was HKMatch zurückgibt. */
(function () {
  'use strict';
  const E = window.HK, W = window.HKWorld, M = window.HKMatch, C = window.HKClub, S = window.HKStore;
  const $ = id => document.getElementById(id), NS = 'http://www.w3.org/2000/svg';
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const rng = E.makeRng((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0);
  const OPPS = C.OPPS.map(o => o.id);

  let G = null, phase = 'idle', fast = false, wake = null, opp = 'wasa', HOME = '';
  let disp = { you: 0, home: 0 }, penDisp = { you: 0, home: 0 }, ticker = [];
  const els = {}, pos = {};

  // --- Symbole ---
  const ICON = {
    shoot: '<svg viewBox="0 0 40 40"><circle class="f" cx="20" cy="33" r="4.2"/><path d="M20 27 V7 M12.5 14 L20 6.5 L27.5 14"/></svg>',
    pass: '<svg viewBox="0 0 40 40"><circle class="f" cx="8" cy="31" r="3.6"/><circle class="f" cx="32" cy="22" r="3.6"/><path d="M11.5 29.5 L27 23.5"/></svg>',
    drib: '<svg viewBox="0 0 40 40"><circle class="f" cx="13" cy="33" r="4.2"/><path d="M15 28 C 33 23, 7 16, 25 7.5 M25 7.5 L18.8 8 M25 7.5 L22.4 13"/></svg>',
    press: '<svg viewBox="0 0 40 40"><path d="M4 20 H16 M11 14.5 L16.5 20 L11 25.5 M36 20 H24 M29 14.5 L23.5 20 L29 25.5"/></svg>',
    block: '<svg viewBox="0 0 40 40"><path d="M7 12 H33 V30 H7 Z M7 21 H33 M15 12 V21 M25 12 V21 M20 21 V30"/></svg>',
    lane: '<svg viewBox="0 0 40 40"><path d="M5 31 L35 9" stroke-dasharray="3.5 4.5"/><path d="M13.5 13.5 L26.5 26.5 M26.5 13.5 L13.5 26.5"/></svg>',
    goal: z => `<svg viewBox="0 0 30 22"><path d="M3 20 V3 H27 V20"/><circle class="f" cx="${{ l: 9, m: 15, r: 21 }[z[1]]}" cy="${z[0] === 't' ? 8 : 15}" r="3.2"/></svg>`
  };
  const ic = (k, a) => `<span class="ic">${typeof ICON[k] === 'function' ? ICON[k](a) : ICON[k]}</span>`;
  const ZNAME = { tl: 'oben links', tm: 'oben Mitte', tr: 'oben rechts', bl: 'unten links', bm: 'unten Mitte', br: 'unten rechts' };
  const ROLE = { LD: 'Vert. links', RD: 'Vert. rechts', LW: 'Flügel links', C: 'Center', RW: 'Flügel rechts' };

  // --- Zeit wie im Testduell: Bewegung springt beim Vorspulen ans Ende, Haltezeiten nur beim Vorspulen ---
  const T = t => (reduce || fast ? 0 : t);
  function sleep(d) { return new Promise(res => { if (!d) { res(); return; } const id = setTimeout(() => { wake = null; res(); }, d); wake = () => { clearTimeout(id); wake = null; res(); }; }); }
  const wait = t => sleep(T(t)), hold = t => sleep(fast ? 0 : t);
  function anim(el, frames, o) { const a = el.animate(frames, Object.assign({ fill: 'forwards', easing: 'cubic-bezier(.2,.7,.2,1)' }, o, { duration: Math.max(1, T((o && o.duration) || 300)) })); return a.finished.catch(() => {}); }
  const fresh = el => el.getAnimations().forEach(a => a.cancel());
  function skip() { fast = true; document.getAnimations().forEach(a => { try { if (a.effect && a.effect.getTiming().iterations !== Infinity) a.finish(); } catch (e) { /* läuft nicht */ } }); if (wake) wake(); }
  const card = (side, id) => M.card(G, side, id);
  const sideOf = id => (card('you', id) ? 'you' : 'home');

  // --- Spielfeld ---
  const TEAM = { you: { fill: '#1a57ff', ring: '#ffffff', text: '#ffffff' }, home: { fill: '#1b2033', ring: '#f7d774', text: '#f7d774' } };
  const svg = (tag, a, parent) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (parent) parent.appendChild(n); return n; };
  function buildPlayers() {
    const g = $('pls'); g.innerHTML = '';
    ['home', 'you'].forEach(side => G.teams[side].cards.forEach(c => {
      const t = TEAM[side], el = svg('g', { class: 'pl', 'data-id': c.id }, g);
      svg('circle', { r: 21, fill: 'none', stroke: '#f7d774', 'stroke-width': 3, class: 'carrier-ring', visibility: 'hidden' }, el);
      svg('ellipse', { cx: 2, cy: 6, rx: 15, ry: 8, fill: '#000', opacity: 0.25 }, el);
      svg('circle', { r: 15, fill: t.fill, stroke: t.ring, 'stroke-width': 2.5, class: 'body' }, el);
      const n = svg('text', { y: 5.5, 'text-anchor': 'middle', class: 'num', fill: t.text }, el); n.textContent = c.no === null || c.no === undefined ? c.last.slice(0, 2).toUpperCase() : c.no;
      const l = svg('text', { y: 29, 'text-anchor': 'middle', class: 'lab' }, el); l.textContent = c.last;
      if (M.trait(c)) svg('path', { d: 'M12 -18 L16 -13 L12 -8 L8 -13 Z', fill: '#f7d774', stroke: '#050818', 'stroke-width': 1.2 }, el);   // Raute: Spezialfähigkeit
      els[c.id] = el; pos[c.id] = [180, 380];
    }));
  }
  function place(id, p) { pos[id] = p; els[id].setAttribute('transform', `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`); }
  /* Ganzes Feld 360 x 800: Du spielst nach oben aufs Tor bei (180, 40), der Gegner nach unten aufs Tor bei (180, 760).
     Die Engine rechnet jede Szene in einer Hälfte, in der nach oben angegriffen wird; hier wird sie aufs ganze Feld gelegt.
     Die Kamera zeigt einen Ausschnitt von 420 Einheiten Höhe und fährt dem Ball nach. */
  const toRink = (p, side) => (side === 'you' ? [p[0], p[1]] : [360 - p[0], 800 - p[1]]);
  const goalOf = side => (side === 'you' ? [180, 40] : [180, 760]);
  const ep = (sc, id) => toRink(sc.pos[id], M.atkSide(sc));
  // Im offenen Spiel folgt die Kamera dem Ball, in einer Szene zeigt sie fest auf das Tor, auf das gespielt wird.
  let cam = 0, camMode = 'follow';
  const camTarget = () => (camMode === 'follow' ? Math.max(0, Math.min(380, ballP[1] - 230)) : (G && G.cur && G.cur.type === 'def' ? 380 : 0));
  function camSet(y) { cam = y; $('pitch').setAttribute('viewBox', `0 ${cam.toFixed(1)} 360 420`); }
  let ballP = [180, 380];
  function ballAt(p) { ballP = p; $('mball').setAttribute('cx', p[0].toFixed(1)); $('mball').setAttribute('cy', p[1].toFixed(1)); }
  const camFollow = k => camSet(cam + (camTarget() - cam) * k);
  const atFoot = id => [pos[id][0] + 10, pos[id][1] - 12];
  function setCarrier(id) {
    Object.keys(els).forEach(k => els[k].querySelector('.carrier-ring').setAttribute('visibility', k === id ? 'visible' : 'hidden'));
    if (id) ballAt(atFoot(id));
  }
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const bez = (a, c, b, t) => { const u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; };
  const io = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  /* Bewegt Spieler und Ball. moves: [{ id, to, via }] (id 'ball' für den Ball). slow: Zeitlupe gegen Ende mit dunklem Rand. */
  function tween(moves, ms, slow) {
    const from = moves.map(m => (m.id === 'ball' ? ballP : pos[m.id]).slice());
    const apply = t => moves.forEach((m, i) => { const p = m.via ? bez(from[i], m.via, m.to, t) : lerp(from[i], m.to, t); if (m.id === 'ball') ballAt(p); else place(m.id, p); });
    if (!T(ms)) { apply(1); camSet(camTarget()); return Promise.resolve(); }
    return new Promise(res => {
      const vig = $('vignette'); let t = 0, last = performance.now();
      (function tick(now) {
        const dt = Math.min(64, now - last); last = now;
        const rate = slow && t > 0.55 && t < 0.9 ? 0.3 : 1;
        t = fast ? 1 : Math.min(1, t + dt / ms * rate);
        if (slow) vig.style.opacity = (0.7 * Math.sin(Math.PI * Math.max(0, Math.min(1, (t - 0.45) / 0.55)))).toFixed(2);
        apply(io(t)); camFollow(t < 1 ? Math.min(1, dt / 140) : 1);
        if (t < 1) requestAnimationFrame(tick); else { vig.style.opacity = 0; res(); }
      })(last);
    });
  }
  // Alle Spieler an die Positionen der aktuellen Szene
  function syncPositions(ms) {
    const sc = G.cur; if (!sc) return Promise.resolve();
    const moves = Object.keys(sc.pos).map(id => ({ id, to: ep(sc, id) }));
    moves.push({ id: 'ball', to: (p => [p[0] + 10, p[1] - 12])(ep(sc, sc.carrier)) });
    return tween(moves, ms).then(() => setCarrier(sc.carrier));
  }
  function drawLanes() {
    const g = $('lanes'); g.innerHTML = '';
    const sc = G.cur; if (!sc || phase !== 'decide') return;
    const as = M.atkSide(sc), last = sc.step >= sc.max - 1;
    if (last) return;
    G.teams[as].cards.forEach(c => {
      if (c.id === sc.carrier) return;
      const a = pos[sc.carrier], b = pos[c.id], pi = M.passInfo(G, sc, sc.carrier, c.id);
      const col = as === 'you' ? (pi.risk < 0.25 ? '#34d399' : pi.risk < 0.5 ? '#f7d774' : '#ef4444') : '#ffffff';
      svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: col, 'stroke-width': as === 'you' ? 3 : 2, 'stroke-dasharray': '6 6', opacity: as === 'you' ? 0.85 : 0.4, 'stroke-linecap': 'round' }, g);
    });
  }
  function setKeeperColor() { /* feste Seiten: oben der Goalie des Gegners, unten deiner */ }

  // --- Anzeige ---
  const show = S.show;
  function setTag(text, tone) { $('tag').textContent = text; $('tag').className = 'tag ' + tone; }
  const say = t => { $('say').textContent = t; };
  function stamp(main, sub, tone, where) {
    const el = $('stamp'); el.className = 'stamp ' + tone + (where ? ' ' + where : '');
    el.querySelector('b').textContent = main; el.querySelector('span').textContent = sub || ''; el.hidden = false; fresh(el);
    const base = where === 'low' ? 'translate(-50%,0)' : 'translate(-50%,-50%)';
    anim(el, [{ transform: base + ' scale(1.7) rotate(-4deg)', opacity: 0 }, { transform: base + ' scale(1) rotate(-4deg)', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.2,1.6,.4,1)' });
    $('live').textContent = main + '. ' + (sub || '');
  }
  function hideStamp() { const el = $('stamp'); fresh(el); el.hidden = true; }
  function showHint(text, ms) {
    $('hint').hidden = false; $('hint-text').textContent = text;
    const bar = $('hint-bar'); fresh(bar); bar.parentNode.hidden = !ms;
    if (ms) bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: ms, fill: 'forwards' });
  }
  function renderScore() {
    $('sc-you').textContent = disp.you; $('sc-home').textContent = disp.home; $('sc-club').textContent = HOME;
    if (G.pen) { $('sc-period').textContent = 'Penaltys'; $('sc-time').textContent = penDisp.you + ' : ' + penDisp.home; }
    else { $('sc-period').textContent = Math.min(3, Math.floor(G.scene / G.cfg.perPeriod) + 1) + '. Drittel'; $('sc-time').textContent = G.minute + '. Minute'; }
    let h = '';
    for (let i = 0; i < G.cfg.scenes; i++) {
      const r = G.results[i], t = G.plan[i];
      h += `<span class="dot ${r ? (r.goal ? 'g-' + r.goal : 'done') : (i === G.scene && !G.pen ? 'now' : (t === 'att' ? 'you' : 'home'))}"></span>`;
    }
    $('dots').innerHTML = h;
  }
  function addTick(text, goal) {
    ticker.unshift({ m: G.pen ? 'Pen' : G.minute + "'", text, goal });
    const html = ticker.slice(0, 5).map(t => `<li${t.goal ? ' class="goal"' : ''}><b>${t.m}</b><span>${esc(t.text)}</span></li>`).join('');
    $('ticker').innerHTML = html;
  }
  function scored(side, ctx) {
    if (ctx === 'so') { penDisp[side]++; renderScore(); return; }
    disp[side]++;
    const el = $(side === 'you' ? 'sc-you' : 'sc-home'); el.textContent = disp[side]; fresh(el);
    anim(el, [{ transform: 'scale(1.7)', color: side === 'you' ? '#10b981' : '#ef4444' }, { transform: 'scale(1)', color: '#e3ecff' }], { duration: 600 });
  }

  // --- Entscheidung ---
  // Jede Aktion zeigt ihr grünes Feld, so breit und an der Stelle wie nachher auf dem Timing-Balken. Dazu das Rating-Duell.
  const TR = id => { const c = card(sideOf(id), id), t = c && M.trait(c); return t ? M.TRAITS[t] : null; };
  const trChip = (id, want, bad) => { const c = card(sideOf(id), id), t = c && M.trait(c); return t === want ? `<i class="tr${bad ? ' bad' : ''}">${M.TRAITS[t].name}</i>` : ''; };
  const r0 = v => Math.round(v);
  const fieldPct = c => Math.round(c.w * 100);
  const mini = c => (c.free ? '' : `<span class="mini" aria-hidden="true"><u style="left:${((c.pos - c.w / 2) * 100).toFixed(1)}%;width:${(c.w * 100).toFixed(1)}%"></u></span>`);
  const lage = q => Math.round(q * 100);
  function renderDecision() {
    const sc = G.cur, att = sc.type === 'att', X = card(att ? 'you' : 'home', sc.carrier), panel = $('panel');
    $('hint').hidden = true; panel.hidden = false;
    Object.keys(els).forEach(k => els[k].classList.remove('pick'));
    if (!att) { renderDefence(); return; }
    phase = 'decide';
    const last = sc.step >= sc.max - 1, xt = TR(X.id);
    setTag(sc.counter ? 'Konter' : 'Angriff', 'you');
    say(`${X.last} hat den Ball.` + (last ? ' Letzte Aktion: Abschluss.' : ' Je breiter das grüne Feld, desto leichter das Timing.'));
    const sh = M.shotInfo(G, sc, X.id), cs = M.contest(G, { type: 'shoot' }), cd = M.contest(G, { type: 'dribble' }), mk = card('home', cd.by), bl = card('home', sh.by);
    let h = `<div class="actions2">
<button type="button" class="act${M.trait(X) === 'kanone' ? ' fit' : ''}" data-a="shoot"><b>${ic('shoot')}Schuss</b><span class="pct">${cs.free ? 'frei' : fieldPct(cs)}</span>${mini(cs)}<small>Lage ${lage(sh.q)} · ${r0(M.shotVal(X))} gegen Goalie ${G.teams.home.goalie.val}${cs.free ? '' : `, Block ${esc(bl.last)} ${r0(M.stanceVal(bl, 'block'))}`}${trChip(X.id, 'kanone')}${cs.free ? '' : trChip(bl.id, 'wand', true)}</small></button>
<button type="button" class="act${M.trait(X) === 'dribbler' ? ' fit' : ''}" data-a="dribble"${last ? ' disabled' : ''}><b>${ic('drib')}Dribbling</b><span class="pct">${fieldPct(cd)}</span>${mini(cd)}<small>${r0(M.dribVal(X))} gegen ${esc(mk.last)} ${r0(M.stanceVal(mk, 'zwei'))}${trChip(X.id, 'dribbler')}${trChip(mk.id, 'kampf', true)}</small></button></div>`;
    if (!last) {
      h += '<p class="passes-head">Pass, tippe auch direkt auf dem Feld</p><div class="passes">' + G.teams.you.cards.filter(c => c.id !== X.id).map(c => {
        const cp = M.contest(G, { type: 'pass', to: c.id }), q = M.shotInfo(G, sc, c.id), by = card('home', cp.by);
        els[c.id].classList.add('pick');
        return `<button type="button" class="pass" data-to="${c.id}"><span>${esc(c.last)}<small>${r0(M.passVal(X))} gegen ${esc(by.last)} ${r0(M.stanceVal(by, 'pass'))} · dort Lage ${lage(q.q)}</small>${mini(cp)}</span><em class="pct">${fieldPct(cp)}</em></button>`;
      }).join('') + '</div>';
    }
    panel.innerHTML = h;
    $('hist').innerHTML = xt && xt.off ? `<em>${esc(X.last)} ist <b class="tr">${xt.name}</b>: breiteres Feld beim ${xt.what}.</em>` : '<em>Die Zahl ist die Breite des Felds in Prozent.</em>';
    drawLanes();
  }
  // Abwehr: Der Plan des Gegners ist sichtbar, der passende Verteidiger reagiert von selbst. Der User trifft das Timing.
  const DEFTXT = {
    shoot: (X, D) => [`${X.last} zieht ab`, `${D.last} wirft sich in den Schuss`, 'Block', 'Schuss'],
    pass: (X, D, T) => [`${X.last} passt zu ${T.last}`, `${D.last} geht in den Passweg`, 'Antizipation', 'Vorlage'],
    dribble: (X, D) => [`${X.last} geht ins Dribbling`, `${D.last} stellt ihn`, 'Zweikampf', 'Dribbling']
  };
  function renderDefence() {
    const sc = G.cur, X = card('home', sc.carrier), d = M.defInfo(G, sc), T = d.to ? card('home', d.to) : null, tx = DEFTXT[d.kind](X, d.D, T);
    setTag('Abwehr', 'home');
    say(`${tx[0]}. ${tx[1]}: triff das Timing.`);
    $('hist').innerHTML = '<em>Im Feld: Gegner gestört, dein Goalie bekommt mehr Zeit. Genau in der Mitte: Ball gewonnen und Konter.</em>';
    const g = $('lanes'), a = pos[sc.carrier], b = d.kind === 'pass' ? pos[d.to] : d.kind === 'shoot' ? goalOf('home') : null; g.innerHTML = '';
    if (b) svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: '#ff8a8a', 'stroke-width': 3, 'stroke-dasharray': '6 6', opacity: 0.85, 'stroke-linecap': 'round' }, g);
    openBar({ type: 'defend' }, { title: `${tx[2]} ${esc(d.D.last)} ${r0(d.dv)}${d.trait ? `<i class="tr">${M.TRAITS[d.trait].name}</i>` : ''}`, sub: `gegen ${tx[3]} ${esc(X.last)} ${r0(d.atkV)}`, back: false });
  }
  function choose(a) {
    const sc = G.cur, X = card('you', sc.carrier), c = M.contest(G, a), by = card('home', c.by);
    Object.keys(els).forEach(k => els[k].classList.remove('pick'));
    if (c.free) { run(a); return; }
    if (a.type === 'shoot') { say(`${X.last} zieht ab, ${by.last} will blocken. Triff das Timing.`); openBar(a, { title: `Schuss ${esc(X.last)} ${r0(M.shotVal(X))}${trChip(X.id, 'kanone')}`, sub: `gegen Block ${esc(by.last)} ${r0(M.stanceVal(by, 'block'))}`, back: true }); }
    else if (a.type === 'pass') { const T = card('you', a.to); say(`${X.last} passt zu ${T.last}. Triff das Timing.`); openBar(a, { title: `Pass zu ${esc(T.last)} · ${r0(M.passVal(X))}${trChip(X.id, 'passer')}`, sub: `gegen Antizipation ${esc(by.last)} ${r0(M.stanceVal(by, 'pass'))}`, back: true }); }
    else { say(`${X.last} geht ins Dribbling gegen ${by.last}. Triff das Timing.`); openBar(a, { title: `Dribbling ${esc(X.last)} ${r0(M.dribVal(X))}${trChip(X.id, 'dribbler')}`, sub: `gegen Zweikampf ${esc(by.last)} ${r0(M.stanceVal(by, 'zwei'))}`, back: true }); }
  }

  /* --- Timing-Balken ---
     Ein Strich läuft gleichmässig hin und her. Der User tippt auf den Balken oder aufs Feld; gemessen wird die Stelle des
     Strichs im Moment der Berührung. Kein Zeitlimit. Die Engine bewertet die Stelle, hier wird sie nur gezeigt. */
  const GRADE = { perfect: 'Perfekt', good: 'Im Feld', near: 'Knapp daneben', bad: 'Daneben', gross: 'Weit daneben' };
  let bar = null;
  const barX = now => { const u = ((((now - bar.t0) / (G.cfg.barSweep * 2) + bar.c.start) % 1) + 1) % 1; return u < 0.5 ? u * 2 : 2 - u * 2; };
  function openBar(action, o) {
    const c = M.contest(G, action), panel = $('panel'), box = $('tbov');
    phase = 'bar'; panel.hidden = false; $('hint').hidden = true;
    // Der Balken liegt über dem Feld (im Angriff unten, in der Abwehr oben), getippt wird irgendwo: so verdeckt kein Finger den Strich
    box.className = 'tbov ' + (G.cur.type === 'att' ? 'bot' : 'top'); box.hidden = false;
    box.innerHTML = `<p class="tb-t"><b>${o.title}</b><span>${o.sub}</span></p>
<div class="tb-bar" id="tbb"><i class="tb-z" style="left:${((c.pos - c.w / 2) * 100).toFixed(2)}%;width:${(c.w * 100).toFixed(2)}%"><u style="width:${(G.cfg.barCore * 100).toFixed(0)}%"></u></i><em class="tb-m" id="tb-m"></em></div>`;
    panel.innerHTML = `<div class="tb"><button type="button" class="tb-pad" id="tb">Tippen<small id="tb-h">wenn der Strich im grünen Feld ist</small></button>${o.back ? '<button type="button" class="link" id="tb-back">Andere Aktion</button>' : ''}</div>`;
    const now = performance.now(), m = $('tb-m');
    bar = { action, c, t0: now, armed: now + 280, raf: 0, done: false };
    (function loop(t) { if (!bar || bar.done) return; m.style.left = (barX(t) * 100).toFixed(2) + '%'; bar.raf = requestAnimationFrame(loop); })(now);
    $('tb').focus({ preventScroll: true });
  }
  function closeBar() { if (bar) { bar.done = true; cancelAnimationFrame(bar.raf); bar = null; } $('tbov').hidden = true; }
  function tapBar(ts) {
    if (phase !== 'bar' || !bar || bar.done) return;
    const now = performance.now(), t = ts && ts <= now && now - ts < 250 ? ts : now;
    if (t < bar.armed) return;
    const b = bar, x = barX(t), g = M.grade(G.cfg, x, b.c.pos, b.c.w);
    b.done = true; cancelAnimationFrame(b.raf);
    $('tb-m').style.left = (x * 100).toFixed(2) + '%'; $('tbb').classList.add('g-' + g); $('tb').classList.add('g-' + g); $('tb').firstChild.textContent = GRADE[g]; $('tb-h').textContent = '';
    phase = 'barhold';
    setTimeout(() => { bar = null; $('tbov').hidden = true; phase = 'decide'; run(Object.assign({ hit: x }, b.action)); }, reduce ? 160 : 360);
  }
  async function run(action) {
    if (phase !== 'decide' && phase !== 'aim') return;
    const r = M.act(G, action, rng);
    if (!r.ok) return;
    const before = G;
    phase = 'play'; fast = false;
    $('panel').hidden = true; $('lanes').innerHTML = ''; Object.keys(els).forEach(k => els[k].classList.remove('pick'));
    showHint('Tippe aufs Feld, um vorzuspulen');
    G = r.state;
    await playEvents(r.events, before);
    await after();
  }

  // --- Abläufe auf dem Feld ---
  async function playEvents(evs, before) {
    for (let i = 0; i < evs.length; i++) {
      const e = evs[i], nx = evs[i + 1];
      if (e.t === 'shootStart') {
        say(`${card(sideOf(e.x), e.x).last} zieht ab.`);
        if (nx && nx.t === 'blocked') {
          const b = ep(before.cur, nx.by);
          await tween([{ id: nx.by, to: lerp(b, pos[e.x], 0.45) }, { id: 'ball', to: lerp(b, pos[e.x], 0.45) }], 520, true);
          stamp('Geblockt', `${card(sideOf(nx.by), nx.by).last} wirft sich in den Schuss.`, 'bad');
          addTick(`${card(sideOf(e.x), e.x).last} schiesst, ${card(sideOf(nx.by), nx.by).last} blockt.`);
          await hold(1100); hideStamp(); i++;
        } else if (e.grade === 'perfect') { stamp('Perfekt', 'Sauber abgezogen: der Schuss streut weniger.', 'good', 'low'); await hold(750); hideStamp(); }
        else if (e.grade === 'near') { stamp('Gestört', 'Der Schuss kommt durch, streut aber stärker.', 'warn', 'low'); await hold(850); hideStamp(); }
      } else if (e.t === 'pass') {
        const side = sideOf(e.from), to = e.ok && G.cur && G.cur.pos[e.to] ? ep(G.cur, e.to) : pos[e.to], T = card(side, e.to);
        say(`${card(side, e.from).last} passt zu ${T.last}.`);
        if (e.ok) {
          const m = before.cur.mark[e.to], moves = [{ id: 'ball', to: [to[0] + 10, to[1] - 12] }, { id: e.to, to }];
          if (m && G.cur && G.cur.pos[m]) moves.push({ id: m, to: ep(G.cur, m) });
          await tween(moves, 520, e.grade === 'near');
          setCarrier(e.to);
          if (e.grade === 'perfect') { stamp('Perfekt', `${T.last} steht frei.`, 'good', 'low'); await hold(750); hideStamp(); }
          else if (e.grade === 'near') { stamp('Knapp', `Der Pass kommt an, aber ${card(sideOf(e.by), e.by).last} ist dran.`, 'warn', 'low'); await hold(850); hideStamp(); }
        } else {
          const cut = lerp(pos[e.from], pos[e.to], 0.5);
          await tween([{ id: 'ball', to: cut }, { id: e.by, to: cut }], 560, true);
          stamp('Abgefangen', `${card(sideOf(e.by), e.by).last} liest den Pass.`, 'bad');
          addTick(`Pass von ${card(side, e.from).last} abgefangen.`);
          setCarrier(e.by); await hold(1100); hideStamp();
        }
      } else if (e.t === 'dribble') {
        const side = sideOf(e.x), X = card(side, e.x), mk = card(sideOf(e.by), e.by);
        say(`${X.last} geht ins Dribbling gegen ${mk.last}.`);
        if (e.ok && e.grade !== 'near') {
          const to = ep(G.cur, e.x), via = [pos[e.by][0] + (pos[e.x][0] < 180 ? 34 : -34), pos[e.by][1]];
          await tween([{ id: e.x, to, via }, { id: 'ball', to: [to[0] + 10, to[1] - 12], via }, { id: e.by, to: ep(G.cur, e.by) }], 700, true);
          setCarrier(e.x);
          stamp(e.grade === 'perfect' ? 'Perfekt' : 'Vorbei', `${X.last} lässt ${mk.last} stehen.`, 'good', 'low');
          await hold(800); hideStamp();
        } else if (e.ok) {
          const meet = lerp(pos[e.x], pos[e.by], 0.35);
          await tween([{ id: e.x, to: meet }, { id: 'ball', to: [meet[0] + 10, meet[1] - 12] }], 360);
          stamp('Knapp', `${X.last} behält den Ball, kommt aber nicht vorbei.`, 'warn', 'low');
          await hold(850); hideStamp();
        } else {
          const meet = lerp(pos[e.x], pos[e.by], 0.6);
          await tween([{ id: e.x, to: meet }, { id: 'ball', to: lerp(meet, pos[e.by], 0.5) }, { id: e.by, to: lerp(pos[e.by], meet, 0.4) }], 680, true);
          setCarrier(e.by);
          stamp('Ball verloren', `${mk.last} nimmt ${X.last} den Ball ab.`, 'bad');
          addTick(`${X.last} verliert den Ball an ${mk.last}.`);
          await hold(1100); hideStamp();
        }
      } else if (e.t === 'defend') {
        const X = card('home', e.x), Dc = card('you', e.by), c = pos[e.x], it = e.intent;
        const spot = e.action === 'press' ? lerp(pos[e.by], c, 0.7) : e.action === 'block' ? lerp(c, goalOf('home'), 0.3) : lerp(c, pos[e.target], 0.5);
        const moves = [{ id: e.by, to: spot }];
        if (e.stopped) {
          moves.push({ id: 'ball', to: [spot[0] + 8, spot[1] - 10] });
          await tween(moves, 640, true);
          setCarrier(e.by);
          stamp('Ball gewonnen', `${Dc.last} nimmt ${X.last} den Ball ab.`, 'good');
          addTick(`${Dc.last} gewinnt den Ball gegen ${X.last}.`);
          await hold(1100); hideStamp();
        } else {
          await tween(moves, 480);
          const w = e.grade === 'good' ? ['Gestört', `${Dc.last} stört ${X.last}: mehr Zeit für deinen Goalie.`, 'good'] : e.grade === 'near' ? ['Knapp dran', `${Dc.last} stört ein wenig.`, 'warn'] : e.grade === 'gross' ? ['Weit daneben', `${X.last} hat freie Bahn, dein Goalie hat weniger Zeit.`, 'bad'] : ['Zu spät', `${X.last} kommt glatt durch.`, 'bad'];
          stamp(w[0], w[1], w[2], 'low');
          if (it.kind === 'pass') {
            const to = G.cur.pos[it.to] ? ep(G.cur, it.to) : pos[it.to];
            await tween([{ id: 'ball', to: [to[0] + 10, to[1] - 12] }, { id: it.to, to }], 480);
            setCarrier(it.to);
          } else if (it.kind === 'dribble') {
            const to = ep(G.cur, e.x);
            await tween([{ id: e.x, to }, { id: 'ball', to: [to[0] + 10, to[1] - 12] }, { id: e.by, to: ep(G.cur, e.by) }], 560);
            setCarrier(e.x);
          }
          await hold(900); hideStamp();
        }
      } else if (e.t === 'counter') {
        const mine = e.side === 'you', X = card(e.side, e.x);
        stamp('Konter', mine ? `${X.last} startet durch.` : `Grober Fehler: ${X.last} läuft allein auf dein Tor.`, mine ? 'good' : 'bad');
        addTick(mine ? `Konter für dich über ${X.last}.` : `Konter ${HOME} über ${X.last}.`);
        await hold(1000); hideStamp();
        if (mine) { setKeeperColor(); await syncPositions(650); }
      } else if (e.t === 'shot') await shotSeq(e);
    }
  }
  async function after() {
    if (G.phase === 'aim') { await toGoal(); return; }
    if (G.phase === 'decide') { leaveGoal(); await syncPositions(650); renderScore(); renderDecision(); return; }
    if (G.phase === 'done') {
      phase = 'pause'; fast = false;
      const lastScene = !G.pen && G.scene + 1 >= G.cfg.scenes;
      showHint(G.pen ? (M.penOver(G.pen) ? 'Tippe für das Resultat' : 'Tippe für den nächsten Penalty') : lastScene ? (G.score.you === G.score.home ? 'Tippe für das Penaltyschiessen' : 'Tippe für das Resultat') : 'Tippe für die nächste Szene', 1500);
      renderScore();
      await hold(1500);
      next();
    }
  }
  async function next() {
    const r = M.act(G, { type: 'next' }, rng);
    if (!r.ok) return;
    G = r.state; hideStamp();
    if (G.phase === 'end') { finish(); return; }
    if (G.pen) {
      if (!G.pen.results.length) { leaveGoal(); stamp('Penaltys', 'Unentschieden. Je drei Schüsse, dann sudden death.', 'warn'); addTick('Unentschieden, es gibt Penaltys.'); phase = 'play'; await hold(1500); }
      await toGoal(); return;
    }
    startScene();
  }
  async function startScene() {
    phase = 'play'; fast = false;
    leaveGoal(); renderScore(); setKeeperColor();
    const sc = G.cur, att = sc.type === 'att', X = card(att ? 'you' : 'home', sc.carrier);
    setTag('Spiel läuft', 'warn'); $('panel').hidden = true;
    showHint('Tippe aufs Feld, um vorzuspulen');
    $('sc-time').textContent = lastMinute + '. Minute';
    camMode = 'follow';
    await leadIn();
    camMode = 'scene';
    await tween([], 450);
    addTick(att ? `Angriff: ${X.last} am Ball.` : `${HOME} greift an, ${X.last} am Ball.`);
    renderDecision();
  }

  /* Offenes Spiel vor der Szene, ohne Eingriff: Die Engine liefert die Folge (Pässe, Ballverluste, Distanzschüsse),
     hier wird sie gezeigt. Das angreifende Team spielt immer nach oben; wechselt der Ball, dreht die Ansicht mit.
     Am Ende stehen alle genau so, wie die Engine die Szene aufgestellt hat. */
  let lastMinute = 0, view = 'you';
  const KIND = { intercept: 'fängt den Pass ab', tackle: 'gewinnt den Zweikampf' };
  function formation(side, depth) {
    const wp = {}, atk = G.teams[side].cards;
    atk.forEach(c => { const b = M.FORM[c.role]; wp[c.id] = [Math.max(30, Math.min(330, b[0] + (Math.random() - 0.5) * 50)), Math.min(385, b[1] + depth * 160 + (Math.random() - 0.5) * 30)]; });
    const opp = G.teams[side === 'you' ? 'home' : 'you'].cards, byRole = {}; opp.forEach(c => { byRole[c.role] = c; });
    atk.forEach(c => { const d = byRole[M.MARKS[c.role]], a = wp[c.id], mp = lerp(a, [180, 40], 0.27), sd = a[0] < 170 ? 1 : -1; wp[d.id] = [mp[0] + sd * 20, mp[1] - 6]; });
    Object.keys(wp).forEach(id => { wp[id] = toRink(wp[id], side); });
    return wp;
  }
  function turnView(side) { view = side; }   // nur noch: wer hat den Ball; das Feld dreht nicht mehr
  async function leadIn() {
    const sc = G.cur, ev = sc.open || [], m0 = lastMinute, m1 = G.minute, nm = id => card(sideOf(id), id).last, tm = side => (side === 'you' ? 'Du' : HOME);
    let holder = ev.length ? ev[0].from : sc.carrier;
    turnView(ev.length ? ev[0].side : M.atkSide(sc));
    await tween(Object.entries(formation(view, 0.95)).map(([id, to]) => ({ id, to })).concat([{ id: 'ball', to: null }]).filter(m => m.to), 700);
    setCarrier(holder);
    say(`${tm(view)} ${view === 'you' ? 'hast' : 'hat'} den Ball, ${nm(holder)} baut auf.`);
    for (let k = 0; k < ev.length; k++) {
      const e = ev[k], last = k === ev.length - 1;
      $('sc-time').textContent = Math.round(m0 + (m1 - m0) * (k + 1) / ev.length) + '. Minute';
      if (e.kind === 'pass' || e.kind === 'hold') {
        const wp = e.final ? Object.fromEntries(Object.keys(sc.pos).map(id => [id, ep(sc, id)])) : formation(e.side, e.depth), to = e.kind === 'hold' ? e.from : e.to;
        if (e.kind === 'pass') say(`${nm(e.from)} spielt zu ${nm(to)}.`);
        await tween(Object.keys(wp).map(id => ({ id, to: wp[id] })).concat([{ id: 'ball', to: [wp[to][0] + 10, wp[to][1] - 12] }]), last ? 750 : 820);
        setCarrier(to); holder = to;
      } else if (e.kind === 'intercept' || e.kind === 'tackle') {
        const fwd = e.side === 'you' ? -70 : 70, cut = e.kind === 'tackle' ? pos[e.from] : lerp(pos[e.from], [pos[e.from][0] + (Math.random() - 0.5) * 120, pos[e.from][1] + fwd], 0.6);
        say(`${nm(e.by)} ${KIND[e.kind]}. Ballwechsel.`);
        await tween([{ id: e.by, to: cut }, { id: 'ball', to: cut }], 600);
        setCarrier(e.by); addTick(`${nm(e.by)} ${KIND[e.kind]} gegen ${nm(e.from)}.`);
        await wait(250);
        turnView(e.side === 'you' ? 'home' : 'you');
        const wp = formation(view, 0.85); wp[e.by] = wp[e.by] || pos[e.by];
        await tween(Object.keys(wp).map(id => ({ id, to: wp[id] })).concat([{ id: 'ball', to: [wp[e.by][0] + 10, wp[e.by][1] - 12] }]), 800);
        setCarrier(e.by); holder = e.by;
      } else {
        const g = goalOf(e.side), dir = e.side === 'you' ? 1 : -1, tgt = e.kind === 'save' ? [180 + (Math.random() - 0.5) * 16, g[1] + dir * 10] : [180 + (Math.random() < 0.5 ? -40 : 40), g[1] - dir * 18];
        say(`${nm(e.from)} versucht es aus der Distanz.`);
        await tween([{ id: 'ball', to: tgt }], 520);
        addTick(`Distanzschuss ${nm(e.from)}: ${e.kind === 'save' ? 'gehalten' : 'daneben'}.`);
        say(e.kind === 'save' ? 'Der Goalie hält und leitet aus.' : 'Daneben. Abstoss.');
        await wait(350);
        turnView(e.side === 'you' ? 'home' : 'you');
        const wp = formation(view, 0.95), nb = (G.cur.open[k + 1] || {}).from;
        await tween(Object.keys(wp).map(id => ({ id, to: wp[id] })).concat(nb ? [{ id: 'ball', to: [wp[nb][0] + 10, wp[nb][1] - 12] }] : []), 850);
        if (nb) { setCarrier(nb); holder = nb; }
      }
    }
    turnView(M.atkSide(sc)); setCarrier(sc.carrier);
    lastMinute = G.minute;
  }

  // --- Tor von vorne: wie im Testduell ---
  const START = [180, 290];
  const POSE = { tl: [-56, -44, -40, 1], tr: [56, -44, 40, 1], bl: [-64, -4, -66, 1], br: [64, -4, 66, 1], tm: [0, -34, 0, 1.04], bm: [0, 4, 0, 1.14] };
  const toScene = g => [180 + g[0] * 102, 236 - g[1] * 148];
  const toGoalXY = p => [(p[0] - 180) / 102, (236 - p[1]) / 148];
  const K = () => $('goalview').clientWidth / 360;
  const ballTf = (p, s) => { const k = K(); return `translate(${((p[0] - 12) * k).toFixed(1)}px,${((p[1] - 12) * k).toFixed(1)}px) scale(${s})`; };
  const poseTf = (p, sq) => { const k = K(); return `translate(${(p[0] * k).toFixed(1)}px,${(p[1] * k).toFixed(1)}px) rotate(${p[2]}deg) scale(${p[3] * (sq || 1)})`; };
  function placeAt(el, p, sizePct) { const k = K(), w = 360 * sizePct / 100, tr = `translate(${((p[0] - w / 2) * k).toFixed(1)}px,${((p[1] - w / 2) * k).toFixed(1)}px)`; el.style.transform = tr; return tr; }
  function burst(id, p, size, from, to, ms) { const el = $(id), tr = placeAt(el, p, size); fresh(el); el.hidden = false; anim(el, [{ transform: tr + ` scale(${from})`, opacity: 1 }, { transform: tr + ` scale(${to})`, opacity: 0 }], { duration: ms, easing: 'ease-out' }); }
  function keeperSvg(team) {
    const you = team === 'you', body = you ? '#1a57ff' : '#e0ad35', trim = you ? '#ffffff' : '#1a1203', pad = you ? '#e3ecff' : '#fff6dc', helm = you ? '#dfe7fb' : '#2a2f42', cage = you ? '#0e1b47' : '#f7d774';
    return `<svg viewBox="0 0 120 92" aria-hidden="true"><g stroke="#050818" stroke-width="2" stroke-linejoin="round">
<path d="M8 72 Q6 86 20 89 L56 89 Q60 81 53 73 Z" fill="${pad}"/><path d="M112 72 Q114 86 100 89 L64 89 Q60 81 67 73 Z" fill="${pad}"/>
<path d="M41 33 Q60 27 79 33 L86 74 Q60 82 34 74 Z" fill="${body}"/>
<path d="M42 36 L17 49 L21 57 L46 46 Z" fill="${body}"/><path d="M78 36 L103 49 L99 57 L74 46 Z" fill="${body}"/>
<circle cx="15" cy="55" r="8" fill="${pad}"/><circle cx="105" cy="55" r="8" fill="${pad}"/>
<circle cx="60" cy="20" r="14" fill="${helm}"/></g>
<path d="M50 20 H70 M50 25.5 H70 M54.5 14 V31 M60 13 V33 M65.5 14 V31" stroke="${cage}" stroke-width="1.6" stroke-linecap="round"/>
<path d="M36 64 Q60 70 84 64" fill="none" stroke="${trim}" stroke-width="3"/>
<text x="60" y="57" text-anchor="middle" font-family="'Saira Condensed','Arial Narrow',sans-serif" font-weight="800" font-size="17" fill="${trim}">1</text></svg>`;
  }
  function leaveGoal() {
    const gv = $('goalview'); if (gv.hidden) return;
    [gv, $('keeper'), $('ball')].forEach(fresh);
    gv.hidden = true; $('pitch').style.visibility = ''; $('stage').classList.remove('goalmode');
    $('shooter').hidden = true; $('tell').hidden = true; $('power').hidden = true; $('zones').className = 'zones off'; $('aim').toggleAttribute('hidden', true);
    stopSway(); clearTimeout(rx.timer); hideFree(); $('mark').hidden = true; drag = null;
  }
  const shotLabel = v => (v >= 95 ? 'sehr stark' : v >= 88 ? 'stark' : v >= 80 ? 'mittel' : 'schwach');
  /* Torsicht. Das Tor ist je nach Lage des Schützen gross (nah) oder klein und weiter oben (fern). Alles am Tor (Goalie,
     freie Felder, Zonen, Landepunkt) liegt in einer Ebene, die mitskaliert. Ball und Zielkreis liegen darüber.
     Ebene: Koordinaten wie toScene sie liefert. Sicht: was auf dem Bildschirm steht. */
  const gz = { s: 1, yb: 236 };
  const toView = L => [180 + (L[0] - 180) * gz.s, gz.yb + (L[1] - 236) * gz.s];
  const toLayer = V => [180 + (V[0] - 180) / gz.s, 236 + (V[1] - gz.yb) / gz.s];
  function setZoom(q) {
    gz.s = 0.72 + 0.5 * q; gz.yb = 150 + 86 * Math.min(1.12, gz.s);
    const k = K();
    $('gscale').style.transform = `translate(${((180 - 180 * gz.s) * k).toFixed(1)}px,${((gz.yb - 236 * gz.s) * k).toFixed(1)}px) scale(${gz.s.toFixed(3)})`;
    $('ggoal').setAttribute('transform', `translate(180 ${gz.yb.toFixed(1)}) scale(${gz.s.toFixed(3)}) translate(-180 -236)`);
  }
  /* Dein Schuss: Der Goalie pendelt genau so, wie die Engine rechnet (keeperX). Grün ist, wo er nicht hinkommt: unten und,
     etwas breiter, oben. Das Feld wächst auf der Seite, von der er wegpendelt. Gemessen wird der Moment des Loslassens. */
  let sway = { raf: 0, t0: 0, kx: 0 }, drag = null;
  const rx = { timer: 0, t0: 0, flight: null, end: null };
  const FREE = ['free-l', 'free-lt', 'free-r', 'free-rt'];
  function hideFree() { FREE.forEach(id => { $(id).hidden = true; }); }
  function stopSway() { cancelAnimationFrame(sway.raf); sway.raf = 0; }
  function startSway() {
    const sh = G.shot, kp = $('keeper'), R = [M.reach(G, sh, false), M.reach(G, sh, true)], pc = g => (180 + g * 102) / 3.6;
    const F = FREE.map((id, i) => ({ el: $(id), R: R[i % 2], left: i < 2 }));
    stopSway(); sway.t0 = performance.now();
    (function loop(now) {
      if (phase !== 'aim' || G.shot !== sh) return;
      const kx = M.keeperX(sh.keeper, now - sway.t0); sway.kx = kx;
      kp.style.transform = poseTf([kx * 102, 0, 0, 1]);
      F.forEach(f => { const a = f.left ? -1 : kx + f.R, b = f.left ? kx - f.R : 1, on = b > a + 0.01; f.el.hidden = !on; if (on) { f.el.style.left = pc(a).toFixed(2) + '%'; f.el.style.width = (pc(b) - pc(a)).toFixed(2) + '%'; } });
      sway.raf = requestAnimationFrame(loop);
    })(sway.t0);
  }
  async function toGoal() {
    const sh = G.shot, mine = sh.side === 'you', X = card(sh.side, sh.x), gv = $('goalview');
    hideStamp(); $('panel').hidden = true; closeBar();
    if (gv.hidden) {
      $('pitch').style.visibility = 'hidden'; $('stage').classList.add('goalmode'); gv.hidden = false; fresh(gv);
      anim(gv, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(1.1)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { duration: 280 });
    }
    setZoom(sh.q);
    const kp = $('keeper'), ball = $('ball');
    [kp, ball].forEach(fresh);
    kp.innerHTML = keeperSvg(mine ? 'home' : 'you'); kp.style.transform = '';
    ball.hidden = false; ball.style.opacity = '1'; ball.style.transform = ballTf(START, 2.1);
    $('ripple').hidden = true; $('spark').hidden = true; $('mark').hidden = true; hideFree(); $('tell').hidden = true;
    const sco = Math.round(M.shotVal(X)), far = sh.q < 0.4 ? 'aus der Distanz' : sh.q < 0.75 ? 'aus mittlerer Distanz' : 'aus der Nähe';
    $('shooter').innerHTML = `<b>${sco}</b><span>${esc(X.last)}<i>Schuss ${shotLabel(sco)}, ${far}</i></span>`; $('shooter').hidden = false;
    setTag(sh.ctx === 'so' ? 'Penalty' : sh.ctx === 'counter' ? 'Konter' : (mine ? 'Schuss' : 'Dein Goalie'), mine ? 'you' : 'home');
    $('aim').toggleAttribute('hidden', true); $('power').hidden = true; $('hint').hidden = true;
    const z = $('zones'); [...z.children].forEach(b => { b.classList.remove('sel'); b.setAttribute('aria-label', (mine ? 'Schuss nach ' : 'Parade ') + ZNAME[b.getAttribute('data-z')]); });
    z.className = 'zones off';
    if (mine) {
      say('Finger aufs Tor, Zielkreis ins grüne Feld schieben, loslassen.');
      $('hist').innerHTML = `<em>Der Ball landet irgendwo im Kreis, nie ausserhalb. Je besser der Schütze, desto kleiner der Kreis; je näher am Tor, desto mehr Grün.${sh.perfect ? ' Perfekt abgezogen: kleinerer Kreis.' : sh.rushed ? ' Gestört: grösserer Kreis.' : ''}</em>`;
      phase = 'aim'; startSway();
      return;
    }
    // Schuss des Gegners: erst ein kurzer, unterschiedlich langer Anlauf, dann fliegt der Ball. Die Flugzeit ist dein Zeitfenster.
    say(`${X.last} holt aus. Tippe die Ecke an, in die der Ball fliegt, bevor er im Tor ist.`);
    $('hist').innerHTML = `<em>${sh.press > 0 ? 'Der Schütze wurde gestört: du hast mehr Zeit.' : sh.press < 0 ? 'Freie Bahn für den Schützen: du hast weniger Zeit.' : 'Der goldene Ring zeigt, wo der Ball hinfliegt.'}</em>`;
    phase = 'wait';
    const pulse = ball.animate([{ transform: ballTf(START, 2.1) }, { transform: ballTf([START[0], START[1] + 5], 2.3) }], { duration: 300, iterations: Infinity, direction: 'alternate' });
    clearTimeout(rx.timer);
    rx.timer = setTimeout(() => { pulse.cancel(); if (G.shot === sh && phase === 'wait') react(sh); }, 650 + Math.random() * 900);
  }
  // Endpunkt des Balls in der Ebene: bei Pfosten und Latte am Gestänge
  const postPt = (g, L) => (Math.abs(g[0]) >= 1 ? [g[0] > 0 ? 282 : 78, Math.max(92, Math.min(232, L[1]))] : [Math.max(82, Math.min(278, L[0])), 88]);
  function react(sh) {
    const ball = $('ball'), mk = $('mark'), L = toScene(sh.land), endL = sh.miss === 'post' ? postPt(sh.land, L) : L, end = toView(endL);
    rx.end = end; phase = 'react'; rx.t0 = performance.now();
    $('zones').className = 'zones armed';
    placeAt(mk, endL, 11); mk.hidden = false; fresh(mk);
    mk.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 160, iterations: Infinity, direction: 'alternate' });
    say('Jetzt! Tippe die Ecke.');
    // Die Flugzeit ist das Zeitfenster: echte Dauer, auch bei reduzierter Bewegung
    const mid = [(START[0] + end[0]) / 2, (START[1] + end[1]) / 2 - 24];
    rx.flight = ball.animate([{ transform: ballTf(START, 2.1) }, { transform: ballTf(mid, 1.5), offset: 0.5 }, { transform: ballTf(end, 0.95 * gz.s) }], { duration: sh.window, easing: 'linear', fill: 'forwards' }).finished.catch(() => {});
    clearTimeout(rx.timer);
    rx.timer = setTimeout(() => { if (phase === 'react' && G.shot === sh) aimAt({ zone: null, rt: sh.window + 500 }); }, sh.window + 30);
  }
  function saveAt(z, ts) {
    if (phase !== 'react') return;
    const now = performance.now(), t = ts && ts <= now && now - ts < 250 ? ts : now;
    clearTimeout(rx.timer);
    anim($('keeper'), [{ transform: 'none' }, { transform: poseTf(POSE[z]) }], { duration: 170, easing: 'cubic-bezier(.2,.8,.3,1)' });
    aimAt({ zone: z, rt: Math.max(0, t - rx.t0) });
  }
  // Sprung des gegnerischen Goalies: von seiner Stelle zum Ball. Reicht er nicht hin, bleibt er deutlich davor.
  function dive(e) {
    const dir = Math.sign(e.land[0] - e.kx) || 1, gap = Math.abs(e.land[0] - e.kx), top = e.land[1] > 0.55;
    const to = e.result === 'goal' ? e.kx + dir * Math.max(0, gap - 0.8) : e.land[0], move = to - e.kx;   // bei einem Tor bleibt er sichtbar vor dem Ball
    return poseTf([to * 102, top ? -40 : Math.abs(move) < 0.12 ? 4 : -4, Math.max(-66, Math.min(66, move * (top ? 70 : 110))), Math.abs(move) < 0.12 && !top ? 1.12 : 1]);
  }
  async function shotSeq(e) {
    const mine = e.side === 'you', ball = $('ball'), kp = $('keeper'), L = toScene(e.land), X = card(e.side, e.x), bs = 0.95 * gz.s;
    let endL = L, outL = null, fadeOut = false;
    if (e.result === 'save') outL = [endL[0] + (endL[0] < 180 ? -95 : 95), Math.max(30, endL[1] - 110)];
    else if (e.result === 'miss' && e.miss === 'post') { endL = postPt(e.land, L); outL = [endL[0] + (endL[0] < 180 ? -60 : 60), 252]; }
    else if (e.result === 'miss') { outL = [L[0] + (L[0] - 180) * 0.35, L[1] - 30]; fadeOut = true; }
    const end = toView(endL), out = outL && toView(outL);
    $('shooter').hidden = true; hideFree();
    if (mine) {
      say(`${X.last} schiesst.`);
      const pre = [START[0], START[1] + 6], mid = [(START[0] + end[0]) / 2, (START[1] + end[1]) / 2 - 24], from = poseTf([e.kx * 102, 0, 0, 1]);
      kp.style.transform = from;
      await anim(ball, [{ transform: ballTf(START, 2.1) }, { transform: ballTf(pre, 2.25) }], { duration: 130, easing: 'ease-out' });
      const fly = anim(ball, [{ transform: ballTf(pre, 2.25) }, { transform: ballTf(mid, (2.25 + bs) / 2), offset: 0.5 }, { transform: ballTf(end, bs) }], { duration: 400, easing: 'cubic-bezier(.3,.6,.4,1)' });
      await wait(60);
      anim(kp, [{ transform: from }, { transform: dive(e) }], { duration: 300, easing: 'cubic-bezier(.2,.8,.3,1)' });
      await fly;
    } else {
      say(e.guess ? `Du springst ${ZNAME[e.guess]}.` : 'Keine Reaktion.');
      await rx.flight; rx.flight = null; fresh($('mark')); $('mark').hidden = true;
    }
    if (e.result === 'goal') { anim(ball, [{ transform: ballTf(end, bs) }, { transform: ballTf([end[0], end[1] + 6 * gz.s], bs * 0.82) }], { duration: 160 }); burst('ripple', endL, 22, 0.3, 1.25, 520); scored(e.side, e.ctx); }
    else if (e.result !== 'catch') {
      if (e.miss === 'post') burst('spark', endL, 12, 0.4, 1.4, 380);
      anim(ball, [{ transform: ballTf(end, bs), opacity: 1 }, { transform: ballTf(out, fadeOut ? 0.6 * gz.s : 1.1 * gz.s), opacity: fadeOut ? 0 : 1 }], { duration: 420, easing: 'cubic-bezier(.2,.7,.3,1)' });
    }
    const goal = e.result === 'goal', saved = e.result === 'save' || e.result === 'catch';
    let main, sub;
    if (mine) {
      const edge = Math.abs(Math.abs(e.land[0] - e.kx) - e.reach) < 0.08;
      if (goal) { main = 'Tor'; sub = edge ? 'Knapp an den Fingerspitzen vorbei.' : 'Ins freie Feld.'; }
      else if (saved) { main = e.result === 'catch' ? 'Gefangen' : 'Parade'; sub = edge ? 'Er kommt gerade noch hin.' : 'Der Ball landete in seiner Reichweite.'; }
      else { main = { wide: 'Daneben', post: 'Pfosten', high: 'Drüber' }[e.miss]; sub = 'Der Zielkreis ragte über das Tor hinaus.'; }
    } else if (goal) { main = 'Tor'; sub = !e.guess ? 'Zu spät: der Ball war schon drin.' : !e.inTime ? `Zu spät um ${Math.max(1, Math.round((e.rt - e.window) / 10) * 10)} ms.` : 'Falsche Ecke.'; }
    else if (saved) { main = e.result === 'catch' ? 'Gefangen' : 'Parade'; sub = `Reagiert in ${e.rt} ms, Zeit waren ${e.window} ms.`; }
    else { main = { wide: 'Daneben', post: 'Pfosten', high: 'Drüber' }[e.miss]; sub = 'Der Schuss ging nicht aufs Tor.'; }
    stamp(main, sub, mine === goal ? 'good' : 'bad', 'top');
    if (e.ctx !== 'so') addTick(goal ? (mine ? `Tor! ${X.last} trifft zum ${disp.you}:${disp.home}.` : `Tor ${HOME}: ${X.last}, ${disp.you}:${disp.home}.`) : `${X.last} schiesst: ${main}.`, goal);
    else addTick(`Penalty ${X.last}: ${goal ? 'Tor' : main}.`, goal);
    await hold(1400);
  }

  /* --- Eingaben in der Torsicht ---
     Eigener Schuss: Finger aufs Tor, der Zielkreis erscheint. Schieben verschiebt ihn, loslassen schiesst. Wer hält oder
     schiebt, sieht den Kreis etwas über dem Finger, damit er nicht verdeckt ist; ein kurzes Antippen schiesst genau dorthin.
     Parade: die Ecke antippen. */
  const scenePt = ev => { const r = $('goalview').getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * 360, (ev.clientY - r.top) / r.height * 260]; };
  const zoneAt = g => M.zoneOf(Math.max(-0.99, Math.min(0.99, g[0])), Math.max(0, Math.min(0.99, g[1])));
  function aimPreview() {
    const d = drag, p = [Math.max(14, Math.min(346, d.x)), Math.max(14, Math.min(252, d.y - d.lift))];
    d.p = p;
    $('aim').toggleAttribute('hidden', false);
    $('aim-line').setAttribute('x2', p[0].toFixed(1)); $('aim-line').setAttribute('y2', p[1].toFixed(1));
    $('aim-dot').setAttribute('cx', p[0].toFixed(1)); $('aim-dot').setAttribute('cy', p[1].toFixed(1));
    const sp = $('aim-spread'); sp.setAttribute('cx', p[0].toFixed(1)); sp.setAttribute('cy', p[1].toFixed(1)); sp.setAttribute('r', (M.rad(G, G.shot) * 102 * gz.s).toFixed(1));
  }
  function aimAt(input) {
    if (phase !== 'aim' && phase !== 'react') return;
    const z = $('zones'), sz = input.zone || null;
    z.className = 'zones off'; if (sz) z.querySelector(`[data-z="${sz}"]`).classList.add('sel');
    $('aim').toggleAttribute('hidden', true); $('hist').innerHTML = '';
    stopSway(); drag = null; phase = 'aim';
    run(Object.assign({ type: 'aim' }, input));
  }
  const stage = $('stage');
  stage.addEventListener('pointerdown', ev => {
    if (phase === 'react') { if (ev.target.closest('#goalview')) { ev.preventDefault(); saveAt(zoneAt(toGoalXY(toLayer(scenePt(ev)))), ev.timeStamp); } return; }
    if (phase !== 'aim') return;
    ev.preventDefault();
    const p = scenePt(ev), touch = ev.pointerType === 'touch', d = drag = { x: p[0], y: p[1], x0: ev.clientX, y0: ev.clientY, lift: 0, touch };
    try { stage.setPointerCapture(ev.pointerId); } catch (e) { /* ohne Capture geht es auch */ }
    aimPreview();
    if (touch) d.timer = setTimeout(() => { if (drag === d) { d.lift = 44 / K(); aimPreview(); } }, 170);   // halten: Kreis über den Finger heben
  });
  stage.addEventListener('pointermove', ev => {
    if (!drag || phase !== 'aim') return;
    const p = scenePt(ev); drag.x = p[0]; drag.y = p[1];
    if (drag.touch && !drag.lift && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) > 8) drag.lift = 44 / K();
    aimPreview();
  });
  stage.addEventListener('pointerup', () => {
    if (!drag || phase !== 'aim') return;
    const d = drag; clearTimeout(d.timer);
    aimAt({ target: toGoalXY(toLayer(d.p)), t: performance.now() - sway.t0 });
  });
  stage.addEventListener('pointercancel', () => { if (drag) clearTimeout(drag.timer); drag = null; $('aim').toggleAttribute('hidden', true); });
  // Tastatur: die Zonen sind Knöpfe
  $('zones').addEventListener('click', e => {
    const b = e.target.closest('.zone'); if (!b || e.detail !== 0) return;
    const z = b.getAttribute('data-z');
    if (phase === 'react') saveAt(z, 0); else if (phase === 'aim') aimAt({ target: M.ZC[z], t: performance.now() - sway.t0 });
  });

  // --- Start und Resultat ---
  // Deine Linie kommt aus dem Team (Shop und Packs); beim Gegner fehlt, wer bei dir spielt
  const squad = () => S.line();
  const oppCards = id => C.oppCards(id, S.state().lineup);
  function renderIntro() {
    const sq = squad(), m = M.newMatch({ you: { goalie: { val: 88 }, cards: sq }, home: { goalie: { val: 88 }, cards: oppCards(opp) } }, E.makeRng(1));
    $('intro-ovr').textContent = '· ' + C.teamOvr(S.state().lineup);
    $('lineup').innerHTML = m.teams.you.cards.slice().sort((a, b) => ['LW', 'C', 'RW', 'LD', 'RD'].indexOf(a.role) - ['LW', 'C', 'RW', 'LD', 'RD'].indexOf(b.role))
      .map(c => `<li>${S.cardHtml(c.id, { eager: 1 })}<i>${ROLE[c.role]}</i></li>`).join('');
    $('opps').innerHTML = OPPS.map(id => {
      const mm = M.newMatch({ you: { goalie: { val: 88 }, cards: sq }, home: { goalie: { val: 88 }, cards: oppCards(id) } }, E.makeRng(1));
      const str = Math.round(M.strength(mm.teams.home.cards)), atts = Math.round(mm.attShare * 12), o = C.OPPS.find(x => x.id === id);
      return `<button type="button" class="opp${id === opp ? ' on' : ''}" data-opp="${id}" aria-pressed="${id === opp}"><b>${esc(W.club(id).name)}</b><span>Etwa ${atts} von 12 Szenen greifst du an. Sieg: ${S.fmt(o.win)} Münzen.</span><i>${str}</i></button>`;
    }).join('');
  }
  function start() {
    HOME = W.club(opp).short;
    G = M.newMatch({ homeName: HOME, you: { goalie: { val: 88 }, cards: squad() }, home: { goalie: { val: 88 }, cards: oppCards(opp) } }, rng);
    disp = { you: 0, home: 0 }; penDisp = { you: 0, home: 0 }; ticker = []; $('ticker').innerHTML = ''; lastMinute = 0;
    buildPlayers(); show('match');
    Object.keys(G.cur.pos).forEach(id => place(id, [G.cur.pos[id][0], 400])); ballAt([180, 400]); camSet(190);
    startScene();
  }
  function finish() {
    phase = 'end'; leaveGoal();
    const won = G.outcome === 'win' || G.outcome === 'penwin', st = G.stats, y = G.score.you, o = G.score.home;
    $('res-title').textContent = (won ? 'Sieg' : 'Niederlage') + (G.pen ? ' nach Penaltys' : '');
    $('res-title').className = 'res-title ' + (won ? 'win' : 'loss');
    $('res-score').textContent = G.pen ? (y + (won ? 1 : 0)) + ':' + (o + (won ? 0 : 1)) : y + ':' + o;
    $('res-sub').textContent = 'Du gegen ' + HOME + (G.pen ? ', Penaltys ' + G.pen.you + ':' + G.pen.home : '');
    $('stats').innerHTML = [
      [`${st.att} von 12`, 'Szenen im Angriff'],
      [`${st.goals} von ${st.shots}`, 'eigene Schüsse im Tor'],
      [`${st.passOk} von ${st.passes}`, 'Pässe angekommen'],
      [`${st.hits} von ${st.bars}`, `Timing getroffen, ${st.perfects} perfekt`],
      [`${st.saved} von ${st.onGoal}`, 'Schüsse aufs Tor gehalten']
    ].map(r => `<li><b>${r[0]}</b><span>${r[1]}</span></li>`).join('');
    $('ticker-end').innerHTML = $('ticker').innerHTML;
    const coins = C.reward(opp, won, y); S.earn(coins, won);
    $('reward').innerHTML = `${S.COIN}+${S.fmt(coins)} <span>Münzen</span>`;
    show('end');
  }

  // --- Verdrahtung ---
  $('opps').addEventListener('click', e => { const b = e.target.closest('[data-opp]'); if (b) { opp = b.getAttribute('data-opp'); renderIntro(); } });
  $('btn-start').addEventListener('click', start);
  $('btn-again').addEventListener('click', start);
  $('btn-other').addEventListener('click', () => { renderIntro(); show('intro'); });
  $('panel').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.id === 'tb-back') { if (phase === 'bar') { closeBar(); renderDecision(); } return; }
    if (phase !== 'decide') return;
    if (b.dataset.a) choose({ type: b.dataset.a }); else if (b.dataset.to) choose({ type: 'pass', to: b.dataset.to });
  });
  // Timing-Balken: getippt wird irgendwo auf dem Bildschirm (ausser auf «Andere Aktion»), auch mit Leertaste oder Enter
  document.addEventListener('pointerdown', e => { if (phase === 'bar' && !e.target.closest('#tb-back')) { e.preventDefault(); tapBar(e.timeStamp); } });
  document.addEventListener('keydown', e => { if (phase === 'bar' && (e.key === ' ' || e.key === 'Enter') && e.target.id !== 'tb-back') { e.preventDefault(); tapBar(e.timeStamp); } });
  $('pls').addEventListener('click', e => {
    const g = e.target.closest('.pl'); if (!g || phase !== 'decide' || !g.classList.contains('pick')) return;
    choose({ type: 'pass', to: g.getAttribute('data-id') });
  });
  stage.addEventListener('click', e => {
    if (phase === 'aim' || phase === 'react' || phase === 'wait' || phase === 'bar' || phase === 'barhold' || e.target.closest('.zone') || e.target.closest('.pl.pick')) return;
    if (phase === 'play') skip(); else if (phase === 'pause' && wake) wake();
  });
  $('hint').addEventListener('click', () => { if (phase === 'play') skip(); else if (phase === 'pause' && wake) wake(); });
  S.onChange(() => { if (!$('screen-intro').hidden || phase === 'end' || phase === 'idle') renderIntro(); });
  renderIntro();
})();
