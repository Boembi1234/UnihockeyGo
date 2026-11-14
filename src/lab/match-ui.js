/* Match mit Schlüsselszenen: Oberfläche. Rechnet nichts selbst aus, sondern zeigt, was HKMatch zurückgibt. */
(function () {
  'use strict';
  const E = window.HK, W = window.HKWorld, M = window.HKMatch;
  const $ = id => document.getElementById(id), NS = 'http://www.w3.org/2000/svg';
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const rng = E.makeRng((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0);
  const OPPS = ['koeniz', 'wiler', 'gc'];

  let G = null, phase = 'idle', fast = false, wake = null, opp = 'koeniz', HOME = '';
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
  const SIDE = { l: 'nach links', m: 'in die Mitte', r: 'nach rechts' };
  const ROLE = { LD: 'Vert. links', RD: 'Vert. rechts', LW: 'Flügel links', C: 'Center', RW: 'Flügel rechts' };
  const chanceWord = q => (q > 0.7 ? ['gross', 't-good'] : q > 0.45 ? ['mittel', 't-mid'] : ['klein', 't-bad']);
  const riskWord = r => (r < 0.25 ? ['sicher', 'r-low'] : r < 0.5 ? ['riskant', 'r-mid'] : ['sehr riskant', 'r-high']);
  const dribWord = p => (p > 0.6 ? ['gut', 't-good'] : p > 0.4 ? ['offen', 't-mid'] : ['schwer', 't-bad']);

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
      els[c.id] = el; pos[c.id] = [180, 380];
    }));
  }
  function place(id, p) { pos[id] = p; els[id].setAttribute('transform', `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`); }
  let ballP = [180, 380];
  function ballAt(p) { ballP = p; $('mball').setAttribute('cx', p[0].toFixed(1)); $('mball').setAttribute('cy', p[1].toFixed(1)); }
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
    if (!T(ms)) { apply(1); return Promise.resolve(); }
    return new Promise(res => {
      const vig = $('vignette'); let t = 0, last = performance.now();
      (function tick(now) {
        const dt = Math.min(64, now - last); last = now;
        const rate = slow && t > 0.55 && t < 0.9 ? 0.3 : 1;
        t = fast ? 1 : Math.min(1, t + dt / ms * rate);
        if (slow) vig.style.opacity = (0.7 * Math.sin(Math.PI * Math.max(0, Math.min(1, (t - 0.45) / 0.55)))).toFixed(2);
        apply(io(t));
        if (t < 1) requestAnimationFrame(tick); else { vig.style.opacity = 0; res(); }
      })(last);
    });
  }
  // Alle Spieler an die Positionen der aktuellen Szene
  function syncPositions(ms) {
    const sc = G.cur; if (!sc) return Promise.resolve();
    const moves = Object.keys(sc.pos).map(id => ({ id, to: sc.pos[id] }));
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
  function setKeeperColor() {
    const top = G.cur && G.cur.type === 'def' ? 'you' : 'home';
    $('gk').setAttribute('fill', TEAM[top].fill); $('gk').setAttribute('stroke', TEAM[top].ring);
  }

  // --- Anzeige ---
  function show(name) { ['intro', 'match', 'end'].forEach(n => { $('screen-' + n).hidden = n !== name; }); window.scrollTo(0, 0); }
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
  function renderDecision() {
    phase = 'decide';
    const sc = G.cur, att = sc.type === 'att', X = card(att ? 'you' : 'home', sc.carrier), panel = $('panel');
    $('hint').hidden = true; panel.hidden = false;
    Object.keys(els).forEach(k => els[k].classList.remove('pick'));
    const last = sc.step >= sc.max - 1;
    if (att) {
      setTag(sc.counter ? 'Konter' : 'Angriff', 'you');
      say(`${X.last} hat den Ball.` + (last ? ' Letzte Aktion: Abschluss.' : ' Schiessen, passen oder dribbeln?'));
      const sh = M.shotInfo(G, sc, X.id), cw = chanceWord(sh.q), di = M.dribInfo(G, sc, X.id), mk = card('home', di.by), dw = dribWord(di.p);
      const arrows = di.edge >= 6 ? '▲▲' : di.edge >= 2 ? '▲' : di.edge > -2 ? '=' : di.edge > -6 ? '▼' : '▼▼';
      let h = `<div class="actions2">
<button type="button" class="act" data-a="shoot">${'<b>' + ic('shoot') + 'Schuss</b>'}<small>Chance <em class="${cw[1]}">${cw[0]}</em>${sh.block > 0.25 ? ', ein Gegner steht nah: Block-Gefahr' : ''}</small></button>
<button type="button" class="act" data-a="dribble"${last ? ' disabled' : ''}><b>${ic('drib')}Dribbling</b><small>gegen ${esc(mk.last)} ${arrows}: <em class="${dw[1]}">${dw[0]}</em></small></button></div>`;
      if (!last) {
        h += '<p class="passes-head">Pass, tippe auch direkt auf dem Feld</p><div class="passes">' + G.teams.you.cards.filter(c => c.id !== X.id).map(c => {
          const pi = M.passInfo(G, sc, X.id, c.id), rw = riskWord(pi.risk), q = chanceWord(M.shotInfo(G, sc, c.id).q);
          els[c.id].classList.add('pick');
          return `<button type="button" class="pass" data-to="${c.id}"><i class="${rw[1]}"></i><span>${esc(c.last)}<small>${rw[0]}, Chance dort ${q[0]}</small></span></button>`;
        }).join('') + '</div>';
      }
      panel.innerHTML = h;
      $('hist').innerHTML = `<em>${esc(X.last)}: Abschluss ${Math.round(M.shotVal(X))}, Vorlagen ${Math.round(M.passVal(X))}, Dribbling ${Math.round(M.dribVal(X))}.</em>`;
    } else {
      setTag('Abwehr', 'home');
      say(`${X.last} hat den Ball. Was hat er vor?`);
      const sh = M.shotInfo(G, sc, X.id), cw = chanceWord(sh.q);
      let h = `<div class="actions2">
<button type="button" class="act" data-d="press"><b>${ic('press')}Druck</b><small>auf ${esc(X.last)}, stoppt ein Dribbling</small></button>
<button type="button" class="act" data-d="block"><b>${ic('block')}Block</b><small>stoppt einen Schuss. Seine Chance: <em class="${cw[1]}">${cw[0]}</em></small></button></div>`;
      h += '<p class="passes-head">Passweg zustellen, tippe auch direkt auf dem Feld</p><div class="passes">' + G.teams.home.cards.filter(c => c.id !== X.id).map(c => {
        const v = (1 - M.passInfo(G, sc, X.id, c.id).risk) * M.shotInfo(G, sc, c.id).q, w = v > 0.45 ? ['gefährlich', 'r-high'] : v > 0.25 ? ['mittel', 'r-mid'] : ['harmlos', 'r-low'];
        els[c.id].classList.add('pick');
        return `<button type="button" class="pass" data-lane="${c.id}"><i class="${w[1]}"></i><span>${esc(c.last)}<small>${w[0]}</small></span></button>`;
      }).join('') + '</div>';
      panel.innerHTML = h;
      $('hist').innerHTML = `<em>${esc(X.last)}: Abschluss ${Math.round(M.shotVal(X))}, Vorlagen ${Math.round(M.passVal(X))}, Dribbling ${Math.round(M.dribVal(X))}. Seine Schusschance hier: ${cw[0]}.</em>`;
    }
    drawLanes();
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
  const INTENT = { shoot: 'schiessen', pass: 'passen', dribble: 'dribbeln' };
  async function playEvents(evs, before) {
    for (let i = 0; i < evs.length; i++) {
      const e = evs[i], nx = evs[i + 1];
      if (e.t === 'shootStart') {
        say(`${card(sideOf(e.x), e.x).last} zieht ab.`);
        if (nx && nx.t === 'blocked') {
          const b = before.cur.pos[nx.by];
          await tween([{ id: nx.by, to: lerp(b, pos[e.x], 0.45) }, { id: 'ball', to: lerp(b, pos[e.x], 0.45) }], 520, true);
          stamp('Geblockt', `${card(sideOf(nx.by), nx.by).last} wirft sich in den Schuss.`, sideOf(e.x) === 'you' ? 'bad' : 'good');
          addTick(`${card(sideOf(e.x), e.x).last} schiesst, ${card(sideOf(nx.by), nx.by).last} blockt.`);
          await hold(1100); hideStamp(); i++;
        }
      } else if (e.t === 'pass') {
        const side = sideOf(e.from), to = e.ok ? (G.cur && G.cur.pos[e.to]) || pos[e.to] : pos[e.to];
        say(`${card(side, e.from).last} passt zu ${card(side, e.to).last}.`);
        if (e.ok) {
          const m = before.cur.mark[e.to], moves = [{ id: 'ball', to: [to[0] + 10, to[1] - 12] }, { id: e.to, to }];
          if (m && G.cur && G.cur.pos[m]) moves.push({ id: m, to: G.cur.pos[m] });
          await tween(moves, 520, e.risk > 0.35);
          setCarrier(e.to);
        } else {
          const cut = lerp(pos[e.from], pos[e.to], 0.5);
          await tween([{ id: 'ball', to: cut }, { id: e.by, to: cut }], 560, true);
          stamp('Abgefangen', `${card(sideOf(e.by), e.by).last} liest den Pass.`, side === 'you' ? 'bad' : 'good');
          addTick(`Pass von ${card(side, e.from).last} abgefangen.`);
          setCarrier(e.by); await hold(1100); hideStamp();
        }
      } else if (e.t === 'dribble') {
        const side = sideOf(e.x), X = card(side, e.x), mk = card(sideOf(e.by), e.by);
        say(`${X.last} geht ins Dribbling gegen ${mk.last}.`);
        if (e.ok) {
          const to = G.cur.pos[e.x], via = [pos[e.by][0] + (pos[e.x][0] < 180 ? 34 : -34), pos[e.by][1]];
          await tween([{ id: e.x, to, via }, { id: 'ball', to: [to[0] + 10, to[1] - 12], via }, { id: e.by, to: G.cur.pos[e.by] }], 700, true);
          setCarrier(e.x);
          stamp('Vorbei', `${X.last} lässt ${mk.last} stehen.`, side === 'you' ? 'good' : 'bad', 'low');
          await hold(800); hideStamp();
        } else {
          const meet = lerp(pos[e.x], pos[e.by], 0.6);
          await tween([{ id: e.x, to: meet }, { id: 'ball', to: lerp(meet, pos[e.by], 0.5) }, { id: e.by, to: lerp(pos[e.by], meet, 0.4) }], 680, true);
          setCarrier(e.by);
          stamp('Ball verloren', `${mk.last} nimmt ${X.last} den Ball ab.`, side === 'you' ? 'bad' : 'good');
          addTick(`${X.last} verliert den Ball an ${mk.last}.`);
          await hold(1100); hideStamp();
        }
      } else if (e.t === 'defend') {
        const X = card('home', e.x), Dc = card('you', e.by), c = pos[e.x];
        const spot = e.action === 'press' ? lerp(pos[e.by], c, 0.7) : e.action === 'block' ? lerp(c, [180, 40], 0.3) : lerp(c, pos[e.target], 0.5);
        say(`${Dc.last} ${e.action === 'press' ? 'geht auf ' + X.last : e.action === 'block' ? 'stellt sich in die Schusslinie' : 'stellt den Pass zu ' + card('home', e.target).last + ' zu'}.`);
        const it = e.intent, moves = [{ id: e.by, to: spot }];
        if (e.stopped) {
          moves.push({ id: 'ball', to: [spot[0] + 8, spot[1] - 10] });
          await tween(moves, 640, true);
          setCarrier(e.by);
          stamp(e.right ? 'Gelesen' : 'Ballgewinn', e.right ? `${X.last} wollte ${INTENT[it.kind]}. ${Dc.last} holt den Ball.` : `${Dc.last} kommt trotzdem an den Ball.`, 'good');
          addTick(`${Dc.last} gewinnt den Ball gegen ${X.last}.`);
          await hold(1200); hideStamp();
        } else {
          await tween(moves, 520);
          stamp(e.right ? 'Knapp' : 'Falsch gelesen', e.right ? `Richtig gelesen, aber ${X.last} setzt sich durch.` : `${X.last} wollte ${INTENT[it.kind]}.`, 'bad', 'low');
          if (it.kind === 'pass') {
            const to = G.cur.pos[it.to] || pos[it.to];
            await tween([{ id: 'ball', to: [to[0] + 10, to[1] - 12] }, { id: it.to, to }], 480);
            setCarrier(it.to);
          } else if (it.kind === 'dribble') {
            const to = G.cur.pos[e.x];
            await tween([{ id: e.x, to }, { id: 'ball', to: [to[0] + 10, to[1] - 12] }, { id: e.by, to: G.cur.pos[e.by] }], 560);
            setCarrier(e.x);
          }
          await hold(1000); hideStamp();
        }
      } else if (e.t === 'counter') {
        const mine = e.side === 'you', X = card(e.side, e.x);
        stamp('Konter', mine ? `${X.last} startet durch.` : `${X.last} läuft allein auf dein Tor.`, mine ? 'good' : 'bad');
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
    await leadIn();
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
    return wp;
  }
  function turnView(side) {
    view = side; const top = side === 'you' ? 'home' : 'you';
    $('gk').setAttribute('fill', TEAM[top].fill); $('gk').setAttribute('stroke', TEAM[top].ring);
  }
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
        const wp = e.final ? Object.assign({}, sc.pos) : formation(e.side, e.depth), to = e.kind === 'hold' ? e.from : e.to;
        if (e.kind === 'pass') say(`${nm(e.from)} spielt zu ${nm(to)}.`);
        await tween(Object.keys(wp).map(id => ({ id, to: wp[id] })).concat([{ id: 'ball', to: [wp[to][0] + 10, wp[to][1] - 12] }]), last ? 750 : 820);
        setCarrier(to); holder = to;
      } else if (e.kind === 'intercept' || e.kind === 'tackle') {
        const cut = e.kind === 'tackle' ? pos[e.from] : lerp(pos[e.from], [pos[e.from][0] + (Math.random() - 0.5) * 120, pos[e.from][1] - 70], 0.6);
        say(`${nm(e.by)} ${KIND[e.kind]}. Ballwechsel.`);
        await tween([{ id: e.by, to: cut }, { id: 'ball', to: cut }], 600);
        setCarrier(e.by); addTick(`${nm(e.by)} ${KIND[e.kind]} gegen ${nm(e.from)}.`);
        await wait(250);
        turnView(e.side === 'you' ? 'home' : 'you');
        const wp = formation(view, 0.85); wp[e.by] = wp[e.by] || pos[e.by];
        await tween(Object.keys(wp).map(id => ({ id, to: wp[id] })).concat([{ id: 'ball', to: [wp[e.by][0] + 10, wp[e.by][1] - 12] }]), 800);
        setCarrier(e.by); holder = e.by;
      } else {
        const tgt = e.kind === 'save' ? [180 + (Math.random() - 0.5) * 16, 50] : [180 + (Math.random() < 0.5 ? -40 : 40), 22];
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
  }
  function chips(list, name) { const l = list.slice(-4); return l.map((z, i) => `<span class="chip${i === l.length - 1 ? ' last' : ''}">${ic('goal', z)}${name(z)}</span>`).join(''); }
  const shotLabel = v => (v >= 95 ? 'sehr stark' : v >= 88 ? 'stark' : v >= 80 ? 'mittel' : 'schwach');
  async function toGoal() {
    const sh = G.shot, mine = sh.side === 'you', X = card(sh.side, sh.x), gv = $('goalview');
    hideStamp(); $('panel').hidden = true;
    if (gv.hidden) {
      $('pitch').style.visibility = 'hidden'; $('stage').classList.add('goalmode'); gv.hidden = false; fresh(gv);
      anim(gv, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(1.1)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { duration: 280 });
    }
    const kp = $('keeper'), ball = $('ball');
    [kp, ball].forEach(fresh);
    kp.innerHTML = keeperSvg(mine ? 'home' : 'you'); kp.style.transform = '';
    ball.hidden = false; ball.style.opacity = '1'; ball.style.transform = ballTf(START, 2.1);
    $('ripple').hidden = true; $('spark').hidden = true;
    const sco = Math.round(M.shotVal(X)), q = chanceWord(sh.q);
    $('shooter').innerHTML = `<b>${sco}</b><span>${esc(X.last)}<i>Schuss ${shotLabel(sco)}, Chance ${q[0]}</i></span>`; $('shooter').hidden = false;
    setTag(sh.ctx === 'so' ? 'Penalty' : sh.ctx === 'counter' ? 'Konter' : (mine ? 'Schuss' : 'Dein Goalie'), mine ? 'you' : 'home');
    say(mine ? `Wische vom Ball dorthin, wo ${X.last} hinschiessen soll. Schnell wischen heisst hart.` : `${X.last} zieht ab. Wische in die Ecke, in die du springst.`);
    const l = mine ? G.hist.aims : (G.hist.homeShots[X.id] || []);
    $('hist').innerHTML = mine ? '<span>Deine Schüsse</span>' + (l.length ? chips(l, z => ZNAME[z]) + '<em>Der Goalie merkt sich deine Zonen.</em>' : '<em>Der Goalie kennt dich noch nicht.</em>')
      : `<span>${esc(X.last)} zuletzt</span>` + (l.length ? chips(l, z => ZNAME[z]) : '<em>schiesst zum ersten Mal.</em>');
    const tell = $('tell'); tell.hidden = mine; if (!mine) tell.textContent = `${X.last} schaut ${SIDE[sh.tell]}`;
    $('aim').toggleAttribute('hidden', true); $('power').hidden = true;
    const z = $('zones'); [...z.children].forEach(b => { b.classList.remove('sel'); b.setAttribute('aria-label', (mine ? 'Schuss nach ' : 'Sprung nach ') + ZNAME[b.getAttribute('data-z')]); });
    z.className = 'zones armed'; $('hint').hidden = true;
    phase = 'aim';
  }
  async function shotSeq(e) {
    const mine = e.side === 'you', ball = $('ball'), kp = $('keeper'), land = toScene(e.land), gz = toScene(M.ZC[e.guess]), X = card(e.side, e.x);
    let end = land, out = null, fadeOut = false;
    if (e.result === 'save' || e.result === 'catch') { end = e.right ? land : [(land[0] + gz[0]) / 2, (land[1] + gz[1]) / 2]; if (e.result === 'save') out = [end[0] + (end[0] < 180 ? -95 : 95), Math.max(30, end[1] - 110)]; }
    else if (e.result === 'miss' && e.miss === 'post') { end = Math.abs(e.land[0]) >= 1 ? [e.land[0] > 0 ? 282 : 78, Math.max(92, Math.min(232, land[1]))] : [Math.max(82, Math.min(278, land[0])), 88]; out = [end[0] + (end[0] < 180 ? -60 : 60), 252]; }
    else if (e.result === 'miss') { out = [land[0] + (land[0] - 180) * 0.35, land[1] - 30]; fadeOut = true; }
    $('shooter').hidden = true;
    say(mine ? `${X.last} schiesst${e.power > 0.7 ? ' hart' : e.power < 0.35 ? ' platziert' : ''}.` : `Du springst ${ZNAME[e.guess]}.`);
    const pre = [START[0], START[1] + 6], mid = [(START[0] + end[0]) / 2, (START[1] + end[1]) / 2 - 24];
    await anim(ball, [{ transform: ballTf(START, 2.1) }, { transform: ballTf(pre, 2.25) }], { duration: 130, easing: 'ease-out' });
    const fly = anim(ball, [{ transform: ballTf(pre, 2.25) }, { transform: ballTf(mid, 1.45), offset: 0.5 }, { transform: ballTf(end, 0.95) }], { duration: Math.round(520 - 200 * e.power), easing: 'cubic-bezier(.3,.6,.4,1)' });
    await wait(60);
    anim(kp, [{ transform: 'none' }, { transform: poseTf(POSE[e.guess]) }], { duration: 300, easing: 'cubic-bezier(.2,.8,.3,1)' });
    await fly;
    if (e.result === 'goal') { anim(ball, [{ transform: ballTf(end, 0.95) }, { transform: ballTf([end[0], end[1] + 6], 0.78) }], { duration: 160 }); burst('ripple', end, 22, 0.3, 1.25, 520); scored(e.side, e.ctx); }
    else if (e.result !== 'catch') {
      if (e.miss === 'post') burst('spark', end, 12, 0.4, 1.4, 380);
      anim(ball, [{ transform: ballTf(end, 0.95), opacity: 1 }, { transform: ballTf(out, fadeOut ? 0.6 : 1.1), opacity: fadeOut ? 0 : 1 }], { duration: 420, easing: 'cubic-bezier(.2,.7,.3,1)' });
    }
    const goal = e.result === 'goal', body = Math.abs(e.land[0]) < 0.3 && e.land[1] < 0.6;
    let main, sub;
    if (goal) { main = 'Tor'; sub = mine ? (e.right ? 'Der Goalie war dort, aber der Schuss war zu hart.' : e.near ? 'Knapp am Goalie vorbei.' : 'Goalie in der falschen Ecke.') : (e.right ? `Richtig gesprungen, aber ${X.last} schiesst zu hart.` : 'Du bist in die falsche Ecke gesprungen.'); }
    else if (e.result === 'save' || e.result === 'catch') { main = e.result === 'catch' ? 'Gefangen' : 'Parade'; sub = mine ? (e.right ? 'Der Goalie ahnte die Zone.' : body ? 'Direkt auf den Goalie.' : 'Der Goalie kommt noch hin.') : (e.right ? 'Richtig gesprungen.' : 'Gestreckt und noch hingekommen.'); }
    else { main = { wide: 'Daneben', post: 'Pfosten', high: 'Drüber' }[e.miss]; sub = mine ? (e.q < 0.45 ? 'Aus der Distanz streut der Schuss stark.' : 'Der Schuss streute zu stark.') : 'Glück gehabt.'; }
    stamp(main, sub, mine === goal ? 'good' : 'bad', 'top');
    if (e.ctx !== 'so') addTick(goal ? (mine ? `Tor! ${X.last} trifft zum ${disp.you}:${disp.home}.` : `Tor ${HOME}: ${X.last}, ${disp.you}:${disp.home}.`) : `${X.last} schiesst: ${main}.`, goal);
    else addTick(`Penalty ${X.last}: ${goal ? 'Tor' : main}.`, goal);
    await hold(1400);
  }

  // --- Wischen: Richtung = Ziel, Tempo = Härte, Antippen einer Zone geht auch ---
  let drag = null, lastSwipe = 0;
  const scenePt = ev => { const r = $('goalview').getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * 360, (ev.clientY - r.top) / r.height * 260]; };
  const speedToPower = v => Math.max(0, Math.min(1, (v - 0.25) / 1.2));
  const zoneAt = g => M.zoneOf(Math.max(-0.99, Math.min(0.99, g[0])), Math.max(0, Math.min(0.99, g[1])));
  function aimPreview(p, power) {
    const sh = G.shot, mine = sh.side === 'you', X = card(sh.side, sh.x), from = mine ? [180, 270] : [180, 192];
    $('aim').toggleAttribute('hidden', false);
    $('aim-line').setAttribute('x1', from[0]); $('aim-line').setAttribute('y1', from[1]);
    $('aim-line').setAttribute('x2', p[0].toFixed(1)); $('aim-line').setAttribute('y2', p[1].toFixed(1));
    $('aim-dot').setAttribute('cx', p[0].toFixed(1)); $('aim-dot').setAttribute('cy', p[1].toFixed(1));
    const sp = $('aim-spread'); sp.setAttribute('cx', p[0].toFixed(1)); sp.setAttribute('cy', p[1].toFixed(1));
    sp.setAttribute('r', mine ? (M.spread(G, X, power, sh.q) * 102 * 1.4).toFixed(1) : 0);
    $('power').hidden = !mine; $('tell').hidden = true;
    if (mine) $('power-bar').style.width = Math.round(power * 100) + '%';
  }
  function aimAt(input) {
    if (phase !== 'aim') return;
    const z = $('zones'), sz = input.zone || zoneAt(input.target);
    z.className = 'zones off'; z.querySelector(`[data-z="${sz}"]`).classList.add('sel');
    $('tell').hidden = true; $('aim').toggleAttribute('hidden', true); $('power').hidden = true; $('hist').innerHTML = '';
    run(Object.assign({ type: 'aim' }, input));
  }
  const stage = $('stage');
  stage.addEventListener('pointerdown', ev => {
    if (phase !== 'aim') return;
    ev.preventDefault();
    const p = scenePt(ev); drag = { x0: ev.clientX, y0: ev.clientY, t0: performance.now(), lx: ev.clientX, ly: ev.clientY, lt: performance.now(), v: 0 };
    try { stage.setPointerCapture(ev.pointerId); } catch (e) { /* ohne Capture geht es auch */ }
    aimPreview(p, 0);
  });
  stage.addEventListener('pointermove', ev => {
    if (!drag || phase !== 'aim') return;
    const now = performance.now(), v = Math.hypot(ev.clientX - drag.lx, ev.clientY - drag.ly) / Math.max(1, now - drag.lt);
    drag.v = 0.7 * drag.v + 0.3 * v; drag.lx = ev.clientX; drag.ly = ev.clientY; drag.lt = now;
    aimPreview(scenePt(ev), speedToPower(drag.v));
  });
  stage.addEventListener('pointerup', ev => {
    if (!drag || phase !== 'aim') return;
    const d = drag; drag = null; lastSwipe = Date.now();
    const p = scenePt(ev), dist = Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0), avg = dist / Math.max(1, performance.now() - d.t0);
    const mine = G.shot.side === 'you', g = toGoalXY(p);
    if (dist < 14) { const z = zoneAt(g); aimAt(mine ? { target: M.ZC[z], power: 0.5 } : { zone: z }); return; }
    aimAt(mine ? { target: g, power: speedToPower(Math.max(avg, d.v)) } : { zone: zoneAt(g) });
  });
  stage.addEventListener('pointercancel', () => { drag = null; $('aim').toggleAttribute('hidden', true); $('power').hidden = true; });
  $('zones').addEventListener('click', e => {
    const b = e.target.closest('.zone'); if (!b || phase !== 'aim' || Date.now() - lastSwipe < 500) return;
    const z = b.getAttribute('data-z');
    aimAt(G.shot.side === 'you' ? { target: M.ZC[z], power: 0.5 } : { zone: z });
  });

  // --- Start und Resultat ---
  const top = (pos_, n) => E.DATA.collection.filter(c => c.pos === pos_).sort((a, b) => b.ovr - a.ovr).slice(0, n);
  const SQUAD = top('ATT', 3).concat(top('DEF', 2));
  function renderIntro() {
    const m = M.newMatch({ you: { goalie: { val: 88 }, cards: SQUAD }, home: { goalie: { val: 88 }, cards: W.guard(W.create(), opp) } }, E.makeRng(1));
    $('lineup').innerHTML = m.teams.you.cards.slice().sort((a, b) => ['LW', 'C', 'RW', 'LD', 'RD'].indexOf(a.role) - ['LW', 'C', 'RW', 'LD', 'RD'].indexOf(b.role))
      .map(c => `<li><b>${c.ovr}</b><span>${esc(c.last)}</span><i>${ROLE[c.role]}</i></li>`).join('');
    $('opps').innerHTML = OPPS.map(id => {
      const mm = M.newMatch({ you: { goalie: { val: 88 }, cards: SQUAD }, home: { goalie: { val: 88 }, cards: W.guard(W.create(), id) } }, E.makeRng(1));
      const str = Math.round(M.strength(mm.teams.home.cards)), atts = Math.round(mm.attShare * 12);
      return `<button type="button" class="opp${id === opp ? ' on' : ''}" data-opp="${id}" aria-pressed="${id === opp}"><b>${esc(W.club(id).name)}</b><span>Etwa ${atts} von 12 Szenen greifst du an.</span><i>${str}</i></button>`;
    }).join('');
  }
  function start() {
    HOME = W.club(opp).short;
    G = M.newMatch({ homeName: HOME, you: { goalie: { val: 88 }, cards: SQUAD }, home: { goalie: { val: 88 }, cards: W.guard(W.create(), opp) } }, rng);
    disp = { you: 0, home: 0 }; penDisp = { you: 0, home: 0 }; ticker = []; $('ticker').innerHTML = ''; lastMinute = 0;
    buildPlayers(); show('match');
    Object.keys(G.cur.pos).forEach(id => place(id, [G.cur.pos[id][0], 400]));
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
      [`${st.stops} von ${st.def}`, 'Abwehrszenen mit Ballgewinn']
    ].map(r => `<li><b>${r[0]}</b><span>${r[1]}</span></li>`).join('');
    $('ticker-end').innerHTML = $('ticker').innerHTML;
    show('end');
  }

  // --- Verdrahtung ---
  $('opps').addEventListener('click', e => { const b = e.target.closest('[data-opp]'); if (b) { opp = b.getAttribute('data-opp'); renderIntro(); } });
  $('btn-start').addEventListener('click', start);
  $('btn-again').addEventListener('click', start);
  $('btn-other').addEventListener('click', () => { renderIntro(); show('intro'); });
  $('panel').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled || phase !== 'decide') return;
    if (b.dataset.a) run({ type: b.dataset.a });
    else if (b.dataset.to) run({ type: 'pass', to: b.dataset.to });
    else if (b.dataset.d) run({ type: 'defend', action: b.dataset.d });
    else if (b.dataset.lane) run({ type: 'defend', action: 'lane', target: b.dataset.lane });
  });
  $('pls').addEventListener('click', e => {
    const g = e.target.closest('.pl'); if (!g || phase !== 'decide' || !g.classList.contains('pick')) return;
    const id = g.getAttribute('data-id');
    if (G.cur.type === 'att') run({ type: 'pass', to: id }); else run({ type: 'defend', action: 'lane', target: id });
  });
  stage.addEventListener('click', e => {
    if (phase === 'aim' || e.target.closest('.zone') || e.target.closest('.pl.pick')) return;
    if (phase === 'play') skip(); else if (phase === 'pause' && wake) wake();
  });
  $('hint').addEventListener('click', () => { if (phase === 'play') skip(); else if (phase === 'pause' && wake) wake(); });
  renderIntro();
})();
