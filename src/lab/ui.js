/* Testduell: Oberfläche. Rechnet nichts selbst aus, sondern zeigt, was HKDuel zurückgibt.
   Bewegung: Web Animations. Antippen des Felds spult die laufende Sequenz vor, reduzierte Bewegung zeigt nur Start- und Endbild. */
(function () {
  'use strict';
  const E = window.HK, W = window.HKWorld, D = window.HKDuel;
  const $ = id => document.getElementById(id);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const rng = E.makeRng((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0);
  const HALL = 'koeniz', HOME = W.club(HALL).short, other = D.other;

  let G = null, phase = 'idle', pick = null, fast = false, wake = null, uid = 0;
  let disp = { you: 0, home: 0 }, penDisp = { you: 0, home: 0 };

  // --- Symbole ---
  const ICON = {
    direkt: '<svg viewBox="0 0 40 40"><circle class="f" cx="20" cy="33" r="4.2"/><path d="M20 27 V7 M12.5 14 L20 6.5 L27.5 14"/></svg>',
    kombi: '<svg viewBox="0 0 40 40"><circle class="f" cx="8" cy="31" r="3.6"/><circle class="f" cx="32" cy="22" r="3.6"/><path d="M11.5 29.5 L27 23.5 M28.5 19 L15 9 M15 9 L16.5 15 M15 9 L21 8.2"/></svg>',
    solo: '<svg viewBox="0 0 40 40"><circle class="f" cx="13" cy="33" r="4.2"/><path d="M15 28 C 33 23, 7 16, 25 7.5 M25 7.5 L18.8 8 M25 7.5 L22.4 13"/></svg>',
    block: '<svg viewBox="0 0 40 40"><path d="M7 12 H33 V30 H7 Z M7 21 H33 M15 12 V21 M25 12 V21 M20 21 V30"/></svg>',
    pass: '<svg viewBox="0 0 40 40"><path d="M5 31 L35 9" stroke-dasharray="3.5 4.5"/><path d="M13.5 13.5 L26.5 26.5 M26.5 13.5 L13.5 26.5"/></svg>',
    zwei: '<svg viewBox="0 0 40 40"><path d="M4 20 H16 M11 14.5 L16.5 20 L11 25.5 M36 20 H24 M29 14.5 L23.5 20 L29 25.5 M20 9 V13 M20 27 V31"/></svg>',
    shield: '<svg viewBox="0 0 40 40"><path d="M20 5 L33 10 V19 C33 27 27 32 20 35 C13 32 7 27 7 19 V10 Z"/></svg>',
    goal: c => `<svg viewBox="0 0 30 22"><path d="M3 20 V3 H27 V20"/><circle class="f" cx="${{ l: 9, m: 15, r: 21 }[c]}" cy="11" r="3.4"/></svg>`
  };
  const ic = (k, arg) => `<span class="ic">${typeof ICON[k] === 'function' ? ICON[k](arg) : ICON[k]}</span>`;
  const MOVE = { direkt: 'Direkt', kombi: 'Kombi', solo: 'Solo' };
  const MOVE_ART = { direkt: 'den Direktschuss', kombi: 'die Kombination', solo: 'das Solo' };
  const STOP = { direkt: 'Geblockt', kombi: 'Abgefangen', solo: 'Gestohlen' };
  const STANCE = { block: 'Block', pass: 'Passweg', zwei: 'Zweikampf' };
  const CORNER = { l: 'Links', m: 'Mitte', r: 'Rechts' };

  // --- Zeit: Bewegung (T) springt beim Vorspulen und bei reduzierter Bewegung ans Ende, Haltezeiten (hold) nur beim Vorspulen ---
  const T = t => (reduce || fast ? 0 : t);
  function sleep(d) {
    return new Promise(res => {
      if (!d) { res(); return; }
      const id = setTimeout(() => { wake = null; res(); }, d);
      wake = () => { clearTimeout(id); wake = null; res(); };
    });
  }
  const wait = t => sleep(T(t));
  const hold = t => sleep(fast ? 0 : t);
  function anim(el, frames, o) {
    const a = el.animate(frames, Object.assign({ fill: 'forwards', easing: 'cubic-bezier(.2,.7,.2,1)' }, o, { duration: Math.max(1, T((o && o.duration) || 300)) }));
    return a.finished.catch(() => {});
  }
  const fresh = el => el.getAnimations().forEach(a => a.cancel());
  function skip() {
    fast = true;
    document.getAnimations().forEach(a => { try { if (a.effect && a.effect.getTiming().iterations !== Infinity) a.finish(); } catch (e) { /* läuft nicht */ } });
    if (wake) wake();
  }

  // --- Karte wie im Prototyp ---
  function jersey(c, homeSide) {
    const id = 'j' + (++uid), body = 'M112 16 Q150 40 188 16 L232 30 Q250 36 262 52 L296 104 L258 128 L234 98 L232 244 Q150 256 68 244 L66 98 L42 128 L4 104 L38 52 Q50 36 68 30 Z';
    const c1 = homeSide ? '#3b4257' : '#5a8dff', c2 = homeSide ? '#1b2033' : '#1a57ff', c3 = homeSide ? '#080a14' : '#0a2a8f';
    const trim = homeSide ? '#f7d774' : '#ffffff', font = "'Saira Condensed','Arial Narrow',sans-serif", long = c.last.length > 9;
    const num = c.no === null ? '' : `<text x="154" y="212" text-anchor="middle" font-family="${font}" font-weight="800" font-size="136" fill="#000" opacity="0.28">${c.no}</text><text x="150" y="208" text-anchor="middle" font-family="${font}" font-weight="800" font-size="136" fill="#fff">${c.no}</text>`;
    return `<svg class="jersey" viewBox="0 0 300 260" aria-hidden="true"><defs>
<linearGradient id="jb-${id}" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="0.5" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient>
<linearGradient id="js-${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.45"/><stop offset="0.32" stop-color="#000" stop-opacity="0"/><stop offset="0.68" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></linearGradient>
<clipPath id="jc-${id}"><path d="${body}"/></clipPath></defs>
<path d="${body}" fill="url(#jb-${id})"/>
<g clip-path="url(#jc-${id})"><path d="M-20 168 L320 78 L320 100 L-20 190 Z" fill="#fff" opacity="0.09"/>
<path d="M0 98 L46 134 L52 124 L8 90 Z" fill="${trim}"/><path d="M300 98 L254 134 L248 124 L292 90 Z" fill="${trim}"/>
<path d="M60 236 Q150 248 240 236 L240 244 Q150 256 60 244 Z" fill="${trim}" opacity="0.9"/>
<rect width="300" height="260" fill="url(#js-${id})"/></g>
<path d="M112 16 Q150 40 188 16 Q150 24 112 16 Z" fill="#000" opacity="0.45"/>
<path d="M110 15 Q150 42 190 15" fill="none" stroke="${trim}" stroke-width="8" stroke-linecap="round"/>
<text x="150" y="${c.no === null ? 150 : 86}" text-anchor="middle" font-family="${font}" font-weight="700" font-size="${long ? 24 : 30}" letter-spacing="2" fill="#fff">${esc(c.last.toUpperCase())}</text>${num}</svg>`;
  }
  function bigCard(c, homeSide, attacking) {
    const rows = attacking ? [['Abschluss', c.sco], ['Vorlagen', c.ply], ['Clutch', c.clu]] : [['Erfahrung', c.exp], ['Fairness', c.fai], ['Form', c.frm]];
    return `<div class="slot"><div class="card${homeSide ? ' home' : ''}"><div class="card-in">
<div class="c-rate"><b>${c.ovr}</b><span>${c.pos}</span></div>${jersey(c, homeSide)}
${c.home ? '<div class="c-tag">Heimvorteil</div>' : ''}
<div class="c-name"><span class="f"><span>${esc(c.first)}</span><span>${esc(c.short)}</span></span><span class="l${c.last.length > 9 ? ' long' : ''}">${esc(c.last)}</span></div>
<div class="c-stats">${rows.map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}</div>
</div></div></div>`;
  }
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

  // --- Anzeige ---
  const card = (side, id) => D.card(G, side, id);
  function show(name) { ['intro', 'match', 'end'].forEach(n => { $('screen-' + n).hidden = n !== name; }); window.scrollTo(0, 0); }
  function setTag(text, tone) { $('tag').textContent = text; $('tag').className = 'tag ' + tone; }
  function say(text) { $('say').textContent = text; }
  function live(text) { $('live').textContent = text; }
  function renderScore() {
    $('sc-you').textContent = disp.you; $('sc-home').textContent = disp.home; $('sc-club').textContent = HOME;
    $('sc-period').textContent = G.pen ? 'Penaltys ' + penDisp.you + ':' + penDisp.home : 'Duell ' + (Math.min(G.duel, G.cfg.duels - 1) + 1) + ' von ' + G.cfg.duels;
    let h = '';
    if (G.pen) G.pen.results.forEach(r => { h += `<span class="dot ${r.goal ? 'g-' + r.side : 'done'}"></span>`; });
    else for (let i = 0; i < G.cfg.duels; i++) {
      const r = G.results[i];
      h += `<span class="dot ${r ? (r.goal ? 'g-' + r.goal : 'done') : (i === G.duel ? 'now' : (i % 2 === 0 ? 'you' : 'home'))}"></span>`;
    }
    $('dots').innerHTML = h;
  }
  function setFighter(side, c, role, attacking) {
    const r = $('r-' + side); r.textContent = role; r.className = 'role' + (attacking ? ' atk' : '');
    $('c-' + side).innerHTML = c ? bigCard(c, side === 'home', attacking) : '<div class="empty"><b>?</b><span>Wähle unten</span></div>';
  }
  function setPick(side, kind, id) {
    const el = $('p-' + side);
    if (kind === 'blank') { el.className = 'pick blank'; el.innerHTML = ''; }
    else if (kind === 'back') { el.className = 'pick back'; el.innerHTML = '?'; }
    else { el.className = 'pick face'; el.innerHTML = ic(id) + '<span>' + (kind === 'move' ? MOVE[id] : STANCE[id]) + '</span>'; }
  }
  function stamp(main, sub, tone, pos) {
    const el = $('stamp');
    el.className = 'stamp ' + tone + (pos ? ' ' + pos : '');
    el.querySelector('b').textContent = main; el.querySelector('span').textContent = sub || '';
    el.hidden = false; fresh(el);
    const base = pos === 'low' ? 'translate(-50%,0)' : 'translate(-50%,-50%)';
    anim(el, [{ transform: base + ' scale(1.7) rotate(-4deg)', opacity: 0 }, { transform: base + ' scale(1) rotate(-4deg)', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.2,1.6,.4,1)' });
    live(main + '. ' + (sub || ''));
  }
  function hideStamp() { const el = $('stamp'); fresh(el); el.hidden = true; }
  function shake(el, px) { anim(el, [{ transform: 'none' }, { transform: `translateX(-${px || 5}px)` }, { transform: `translateX(${px || 5}px)` }, { transform: 'none' }], { duration: 240, fill: 'none' }); }
  function showHint(text, ms) {
    $('hint').hidden = false; $('hint-text').textContent = text;
    const bar = $('hint-bar'); fresh(bar); bar.parentNode.hidden = !ms;
    if (ms) bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: ms, fill: 'forwards' });
  }

  // --- Hand und Wahl ---
  function renderHand() {
    const att = G.cur.side === 'you', ok = D.usable(G, 'you');
    $('hand').innerHTML = G.teams.you.cards.map(c => {
      const can = ok.indexOf(c) !== -1, m = E.bestMove(c), def = Math.round(E.eff(E.defVal(c), c));
      const info = !can ? '<span class="m-info tired">Müde, setzt aus</span>' : att ? `<span class="m-info">${ic(m.id)}${MOVE[m.id]}</span>` : `<span class="m-info">${ic('shield')}Abwehr ${def}</span>`;
      const label = `${c.first} ${c.last}, ${c.pos}, Gesamtwert ${c.ovr}, ${can ? (att ? 'stark im ' + m.name : 'Abwehr ' + def) : 'müde'}, Ausdauer ${Math.round(c.stam)}`;
      return `<button type="button" class="mini" data-id="${c.id}" aria-label="${esc(label)}"${can ? '' : ' disabled'}><span class="mini-in"><span class="m-top"><b>${c.ovr}</b><em>${c.pos}</em></span><span class="m-name${c.last.length > 9 ? ' long' : ''}">${esc(c.last)}</span>${info}<span class="stam${c.stam < 40 ? ' low' : ''}"><i style="width:${Math.round(c.stam)}%"></i></span></span></button>`;
    }).join('');
  }
  // Während einer Sequenz bleibt die Hand sichtbar, aber gedimmt, mit der Ausdauer nach dem Duell.
  function idleHand() { renderHand(); $('hand').hidden = false; $('hand').classList.add('idle'); }
  function meter(n) { return '<span class="meter" aria-hidden="true">' + [1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('') + '</span>'; }
  function renderOptions(c) {
    if (G.cur.side === 'you') {
      $('opts').innerHTML = E.MOVES.map(m => {
        const st = E.STANCES.filter(x => x.stops === m.id)[0], v = E.eff(m.val(c), c), n = Math.max(1, Math.min(5, Math.round((v - 70) / 6)));
        return `<button type="button" class="opt" data-opt="${m.id}" aria-label="${m.name}, Stärke ${n} von 5, ${st.name} stoppt es">${ic(m.id)}<b>${MOVE[m.id]}</b>${meter(n)}<small>${ic(st.id)}${STANCE[st.id]} stoppt es</small></button>`;
      }).join('');
    } else {
      const cnt = { block: 1, pass: 3, zwei: 4 };
      $('opts').innerHTML = E.STANCES.map(s => `<button type="button" class="opt" data-opt="${s.id}" aria-label="${s.name}, stoppt ${E.move(s.stops).name}, Konterchance ${cnt[s.id]} von 5">${ic(s.id)}<b>${STANCE[s.id]}</b><small>stoppt ${ic(s.stops)}${MOVE[s.stops]}</small>${meter(cnt[s.id])}<small>Konterchance</small></button>`).join('');
    }
  }
  // Verlauf statt Prozente: was der Gegner zuletzt tat, damit du Muster lesen kannst
  function chips(list, html, name) { const l = list.slice(-4); return l.map((x, i) => `<span class="chip${i === l.length - 1 ? ' last' : ''}">${html(x)}${name(x)}</span>`).join(''); }
  function stanceHistory() {
    const l = G.hist.stances;
    return `<span>${HOME} stand zuletzt</span>` + (l.length ? chips(l, x => ic(x), x => STANCE[x]) : '<em>noch nichts gesehen.</em>') + `<em>${HOME} rechnet mit dem, was du oft spielst.</em>`;
  }
  function moveHistory(A) {
    const l = G.hist.homeMoves[A.id] || [];
    return `<span>${esc(A.last)} zuletzt</span>` + (l.length ? chips(l, x => ic(x), x => MOVE[x]) : '<em>noch nie gesehen.</em>') + `<em>Stark im ${E.bestMove(A).name}.</em>`;
  }
  function aimHistory() {
    const l = G.hist.aims;
    return '<span>Deine Schüsse</span>' + (l.length ? chips(l, x => ic('goal', x), x => CORNER[x]) + '<em>Der Goalie merkt sich deine Ecken.</em>' : '<em>Der Goalie kennt dich noch nicht.</em>');
  }
  function shotHistory(X) {
    const l = G.hist.homeShots[X.id] || [];
    return `<span>${esc(X.last)} zuletzt</span>` + (l.length ? chips(l, x => ic('goal', x), x => CORNER[x]) : '<em>schiesst zum ersten Mal.</em>');
  }

  // --- Ablauf eines Duells ---
  function start() {
    const col = E.DATA.collection, top = (pos, n) => col.filter(c => c.pos === pos).sort((a, b) => b.ovr - a.ovr).slice(0, n);
    G = D.newMatch({ homeName: HOME, you: { goalie: { val: D.CFG.goalie }, cards: top('ATT', 4).concat(top('DEF', 2)) },
      home: { goalie: { val: D.CFG.goalie }, cards: W.guard(W.create(), HALL) } }, rng);
    disp = { you: 0, home: 0 }; penDisp = { you: 0, home: 0 };
    show('match'); beginDuel();
  }
  function toArena() {
    const ar = $('arena'), gv = $('goalview');
    [ar, gv, $('keeper'), $('ball')].forEach(fresh);
    ar.hidden = false; gv.hidden = true; $('stage').classList.remove('goalmode'); $('shooter').hidden = true;
    $('zones').className = 'zones off'; $('ball').hidden = true;
  }
  function beginDuel() {
    fast = false; pick = null; phase = 'card';
    toArena(); hideStamp(); $('hint').hidden = true;
    const cur = G.cur, att = cur.side === 'you', opp = card('home', att ? cur.defender : cur.attacker);
    ['f-you', 'f-home', 'p-home', 'p-you'].forEach(id => fresh($(id)));
    $('arena').className = 'arena';
    setFighter('home', opp, att ? 'Verteidigt' : 'Greift an', !att);
    setFighter('you', null, att ? 'Dein Angreifer' : 'Dein Verteidiger', att);
    setPick('you', 'blank'); setPick('home', 'back');
    setTag(att ? 'Dein Angriff' : 'Deine Abwehr', att ? 'you' : 'home');
    say(att ? `${HOME} verteidigt mit ${opp.last}. Wer greift an?` : `${opp.first} ${opp.last} greift an. Wer verteidigt?`);
    $('hist').innerHTML = att ? '' : moveHistory(opp);
    renderScore(); renderHand(); $('hand').hidden = false; $('hand').classList.remove('idle'); $('choices').hidden = true;
    anim($('f-home'), [{ opacity: 0, transform: 'translateX(26px)' }, { opacity: 1, transform: 'none' }], { duration: 280 });
  }
  function chooseCard(id) {
    if (phase !== 'card') return;
    const c = card('you', id); if (!c || D.usable(G, 'you').indexOf(c) === -1) return;
    const att = G.cur.side === 'you';
    pick = id; phase = 'option';
    setFighter('you', c, att ? 'Greift an' : 'Verteidigt', att);
    fresh($('f-you'));
    anim($('f-you'), [{ opacity: 0, transform: 'translateY(30px) scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,1.25,.4,1)' });
    say(att ? `Wie spielt ${c.last}?` : `Wie verteidigt ${c.last}?`);
    $('hist').innerHTML = att ? stanceHistory() : moveHistory(card('home', G.cur.attacker));
    renderOptions(c); $('hand').hidden = true; $('choices').hidden = false;
  }
  function recard() {
    if (phase !== 'option') return;
    const att = G.cur.side === 'you';
    pick = null; phase = 'card';
    setFighter('you', null, att ? 'Dein Angreifer' : 'Dein Verteidiger', att);
    say(att ? `${HOME} verteidigt mit ${card('home', G.cur.defender).last}. Wer greift an?` : `${card('home', G.cur.attacker).last} greift an. Wer verteidigt?`);
    $('hist').innerHTML = att ? '' : moveHistory(card('home', G.cur.attacker));
    $('hand').hidden = false; $('choices').hidden = true;
  }
  async function chooseOption(opt) {
    if (phase !== 'option') return;
    const r = D.act(G, { type: 'play', card: pick, option: opt }, rng);
    if (!r.ok) return;
    phase = 'play'; fast = false;
    $('choices').hidden = true; idleHand(); $('hist').innerHTML = '';
    showHint('Tippe aufs Feld, um vorzuspulen');
    await playEvents(r.events);
    G = r.state;
    await after();
  }
  async function aimAt(corner) {
    if (phase !== 'aim') return;
    const r = D.act(G, { type: 'aim', corner }, rng);
    if (!r.ok) return;
    phase = 'play'; fast = false;
    const z = $('zones'); z.className = 'zones off'; z.querySelector(`[data-c="${corner}"]`).classList.add('sel');
    $('hist').innerHTML = ''; showHint('Tippe aufs Feld, um vorzuspulen');
    await playEvents(r.events);
    G = r.state;
    await after();
  }
  async function after() {
    if (G.phase === 'aim') { await toGoal(); return; }
    if (G.phase !== 'done') return;
    phase = 'pause'; fast = false;
    const lastDuel = !G.pen && G.duel + 1 >= G.cfg.duels;
    const text = G.pen ? (D.penOver(G.pen) ? 'Tippe für das Resultat' : 'Tippe für den nächsten Penalty')
      : lastDuel ? (G.score.you === G.score.home ? 'Tippe für das Penaltyschiessen' : 'Tippe für das Resultat') : 'Tippe für das nächste Duell';
    showHint(text, 1300);
    await hold(1300);
    next();
  }
  function next() {
    if (phase !== 'pause') return;
    const r = D.act(G, { type: 'next' }, rng);
    if (!r.ok) return;
    G = r.state;
    if (G.phase === 'end') finish();
    else if (G.pen) penaltyTurn();
    else beginDuel();
  }
  async function penaltyTurn() {
    phase = 'play'; fast = false; $('hint').hidden = true;
    if (!G.pen.results.length) {
      toArena(); $('arena').className = 'arena'; renderScore();
      stamp('Penaltys', 'Unentschieden. Je drei Schüsse, dann sudden death.', 'warn');
      setTag('Penaltyschiessen', 'warn'); say('');
      await hold(1500);
    }
    renderScore();
    await toGoal();
  }

  // --- Feld: Aufdecken und Stufe 1 ---
  async function playEvents(evs) {
    for (let i = 0; i < evs.length; i++) {
      const e = evs[i];
      if (e.t === 'reveal') await revealSeq(e);
      else if (e.t === 's1') await s1Seq(e);
      else if (e.t === 'counter') await counterSeq(e);
      else if (e.t === 'shot') await shotSeq(e);
    }
  }
  async function revealSeq(e) {
    const att = e.side === 'you', me = card('you', att ? e.a : e.d), them = card('home', att ? e.d : e.a);
    setPick('you', att ? 'move' : 'stance', att ? e.move : e.stance);
    say(`${me.last} gegen ${them.last}`);
    const fy = $('f-you'), fh = $('f-home'), ph = $('p-home');
    [fy, fh, ph].forEach(fresh);
    anim(fy, [{ transform: 'none' }, { transform: 'translateX(12px) scale(1.04)', offset: 0.45 }, { transform: 'none' }], { duration: 440 });
    anim(fh, [{ transform: 'none' }, { transform: 'translateX(-12px) scale(1.04)', offset: 0.45 }, { transform: 'none' }], { duration: 440 });
    await wait(180);
    await anim(ph, [{ transform: 'perspective(400px) rotateY(0deg)' }, { transform: 'perspective(400px) rotateY(90deg)' }], { duration: 140, easing: 'ease-in' });
    setPick('home', att ? 'stance' : 'move', att ? e.stance : e.move);
    await anim(ph, [{ transform: 'perspective(400px) rotateY(-90deg)' }, { transform: 'perspective(400px) rotateY(0deg)' }], { duration: 170, easing: 'ease-out' });
    $('arena').className = 'arena ' + ((att ? !e.read : e.read) ? 'glow-good' : 'glow-bad');
    await hold(300);
  }
  async function s1Seq(e) {
    const att = e.side === 'you', A = card(e.side, e.a), Dc = card(other(e.side), e.d), good = att ? e.ok : !e.ok;
    let main, sub;
    if (e.ok && !e.read) { main = 'Vorbei'; sub = `${Dc.last} rechnete mit ${E.stance(e.stance).expects}.`; }
    else if (e.ok) { main = 'Durch'; sub = `${Dc.last} las ${MOVE_ART[e.move]}, ${A.last} kommt trotzdem durch.`; }
    else if (e.read) { main = STOP[e.move]; sub = `${Dc.last} las ${MOVE_ART[e.move]}.`; }
    else { main = 'Gestoppt'; sub = `${Dc.last} war stärker als ${A.last}.`; }
    stamp(main, sub, good ? 'good' : 'bad');
    if (!good) shake($('stage'));
    if (!e.ok) anim($(att ? 'f-you' : 'f-home'), [{ filter: 'none' }, { filter: 'grayscale(.75) brightness(.65)' }], { duration: 320 });
    await hold(e.ok ? 1100 : 1300);
  }
  async function counterSeq(e) {
    const X = card(e.side, e.x), mine = e.side === 'you';
    stamp('Konter', mine ? `${X.last} läuft allein aufs Tor.` : `${X.last} läuft allein auf dein Tor.`, 'warn');
    anim($(mine ? 'f-you' : 'f-home'), [{ transform: 'none', filter: 'none' }, { transform: 'scale(1.06)', filter: 'none', offset: 0.5 }, { transform: 'none', filter: 'none' }], { duration: 420 });
    await hold(1000);
  }

  // --- Tor von vorne: Schütze wählt die Ecke, Goalie rät ---
  // Punkte in Koordinaten der Grafik (360 x 260). Das Tor reicht von x 78 bis 282 und von y 88 bis 236.
  const START = [180, 290];
  const POSE = { l: [-62, -22, -34, 1], r: [62, -22, 34, 1], m: [0, -6, 0, 1.12] };
  const SAVE = { l: [108, 184], r: [252, 184], m: [180, 182] };
  const AWAY = { l: [34, 70], r: [326, 70], m: [212, 40] };
  const K = () => $('goalview').clientWidth / 360;
  const ballTf = (p, s) => { const k = K(); return `translate(${((p[0] - 12) * k).toFixed(1)}px,${((p[1] - 12) * k).toFixed(1)}px) scale(${s})`; };
  const poseTf = (p, squash) => { const k = K(); return `translate(${(p[0] * k).toFixed(1)}px,${(p[1] * k).toFixed(1)}px) rotate(${p[2]}deg) scale(${p[3] * (squash || 1)})`; };
  function placeAt(el, p, sizePct) { const k = K(), w = 360 * sizePct / 100, tr = `translate(${((p[0] - w / 2) * k).toFixed(1)}px,${((p[1] - w / 2) * k).toFixed(1)}px)`; el.style.transform = tr; return tr; }

  async function toGoal() {
    const sh = G.cur.shot, mine = sh.side === 'you', X = card(sh.side, sh.x), gv = $('goalview');
    hideStamp();
    if (gv.hidden) {
      const ar = $('arena'); fresh(ar);
      await anim(ar, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.95)' }], { duration: 180 });
      ar.hidden = true; $('stage').classList.add('goalmode'); gv.hidden = false;
      fresh(gv);
      anim(gv, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(1.1)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { duration: 280 });
    }
    const kp = $('keeper'), ball = $('ball');
    [kp, ball].forEach(fresh);
    kp.innerHTML = keeperSvg(mine ? 'home' : 'you'); kp.style.transform = '';
    ball.hidden = false; ball.style.opacity = '1'; ball.style.transform = ballTf(START, 2.1);
    $('ripple').hidden = true; $('spark').hidden = true;
    $('shooter').innerHTML = `<b>${X.ovr}</b><span>${esc(X.last)}<i>${mine ? 'dein Schütze' : HOME + ' schiesst'}</i></span>`;
    $('shooter').hidden = false;
    setTag(sh.ctx === 'so' ? 'Penalty' : sh.ctx === 'counter' ? 'Konter' : (mine ? 'Dein Schuss' : 'Dein Goalie'), mine ? 'you' : 'home');
    say(mine ? `Wohin schiesst ${X.last}? Tippe auf eine Ecke.` : `${X.last} zieht ab. Wohin springst du?`);
    $('hist').innerHTML = mine ? aimHistory() : shotHistory(X);
    const z = $('zones'); [...z.children].forEach(b => { b.classList.remove('sel'); b.setAttribute('aria-label', (mine ? 'Schuss nach ' : 'Sprung nach ') + b.textContent); });
    z.className = 'zones armed'; $('hint').hidden = true; idleHand();
    phase = 'aim';
  }
  async function shotSeq(e) {
    const mine = e.side === 'you', ball = $('ball'), kp = $('keeper'), hi = Math.random() < 0.6;
    const corner = { l: hi ? [102, 114] : [104, 214], r: hi ? [258, 114] : [256, 214], m: hi ? [180, 116] : [180, 222] };
    let end, out = null, fadeOut = false;
    if (e.result === 'goal') end = e.right ? { l: [96, 102], r: [264, 102], m: [180, 102] }[e.target] : corner[e.target];
    else if (e.result === 'save') { end = SAVE[e.guess]; out = AWAY[e.guess]; }
    else if (e.result === 'catch') end = SAVE[e.guess];
    else if (e.miss === 'wide') { end = e.target === 'l' ? [52, 166] : [308, 166]; out = e.target === 'l' ? [14, 176] : [346, 176]; fadeOut = true; }
    else if (e.miss === 'post') { end = e.target === 'l' ? [80, 150] : [280, 150]; out = e.target === 'l' ? [34, 252] : [326, 252]; }
    else { end = [e.target === 'l' ? 138 : 222, 70]; out = [end[0], 34]; fadeOut = true; }
    $('shooter').hidden = true;
    const where = { l: 'nach links', m: 'in die Mitte', r: 'nach rechts' };
    say(mine ? `${card(e.side, e.x).last} schiesst ${where[e.target]}.` : `Du springst ${where[e.guess]}.`);
    // Ausholen, Flug mit leichtem Bogen, der Goalie springt kurz nach dem Schuss
    const pre = [START[0], START[1] + 6], mid = [(START[0] + end[0]) / 2, (START[1] + end[1]) / 2 - 24];
    await anim(ball, [{ transform: ballTf(START, 2.1) }, { transform: ballTf(pre, 2.25) }], { duration: 130, easing: 'ease-out' });
    const fly = anim(ball, [{ transform: ballTf(pre, 2.25) }, { transform: ballTf(mid, 1.45), offset: 0.5 }, { transform: ballTf(end, 0.95) }], { duration: 440, easing: 'cubic-bezier(.3,.6,.4,1)' });
    await wait(70);
    anim(kp, [{ transform: 'none' }, { transform: poseTf(POSE[e.guess]) }], { duration: 300, easing: 'cubic-bezier(.2,.8,.3,1)' });
    await fly;
    if (e.result === 'goal') {
      anim(ball, [{ transform: ballTf(end, 0.95) }, { transform: ballTf([end[0], end[1] + 6], 0.78) }], { duration: 160 });
      ripple(end); shake($('goalview').querySelector('svg'), 3); scored(e.side, e.ctx);
    } else if (e.result === 'catch') {
      anim(kp, [{ transform: poseTf(POSE[e.guess]) }, { transform: poseTf(POSE[e.guess], 0.93) }, { transform: poseTf(POSE[e.guess]) }], { duration: 220 });
    } else {
      if (e.miss === 'post') { spark(end); shake($('goalview').querySelector('svg'), 2); }
      anim(ball, [{ transform: ballTf(end, 0.95), opacity: 1 }, { transform: ballTf(out, fadeOut ? 0.6 : 1.1), opacity: fadeOut ? 0 : 1 }], { duration: 420, easing: 'cubic-bezier(.2,.7,.3,1)' });
    }
    shotStamp(e);
    await hold(1300);
  }
  function burst(id, p, size, from, to, ms) {
    const el = $(id), tr = placeAt(el, p, size); fresh(el); el.hidden = false;
    anim(el, [{ transform: tr + ` scale(${from})`, opacity: 1 }, { transform: tr + ` scale(${to})`, opacity: 0 }], { duration: ms, easing: 'ease-out' });
  }
  const ripple = p => burst('ripple', p, 22, 0.3, 1.25, 520);
  const spark = p => burst('spark', p, 12, 0.4, 1.4, 380);
  function scored(side, ctx) {
    if (ctx === 'so') { penDisp[side]++; $('sc-period').textContent = 'Penaltys ' + penDisp.you + ':' + penDisp.home; return; }
    disp[side]++;
    const el = $(side === 'you' ? 'sc-you' : 'sc-home'); el.textContent = disp[side]; fresh(el);
    anim(el, [{ transform: 'scale(1.7)', color: side === 'you' ? '#10b981' : '#ef4444' }, { transform: 'scale(1)', color: '#e3ecff' }], { duration: 600 });
  }
  function shotStamp(e) {
    const mine = e.side === 'you', goal = e.result === 'goal', X = card(e.side, e.x);
    let main, sub;
    if (goal) { main = 'Tor'; sub = mine ? (e.right ? 'Der Goalie ahnte die Ecke, aber der Schuss sitzt.' : 'Goalie in der falschen Ecke.') : (e.right ? `Richtig gesprungen, aber ${X.last} trifft trotzdem.` : 'Du bist in die falsche Ecke gesprungen.'); }
    else if (e.result === 'save') { main = 'Parade'; sub = mine ? 'Der Goalie ahnte die Ecke.' : 'Richtig gesprungen.'; }
    else if (e.result === 'catch') { main = 'Gefangen'; sub = mine ? 'Der Goalie ahnte die Ecke.' : 'Richtig gesprungen.'; }
    else {
      main = { wide: 'Daneben', post: 'Pfosten', high: 'Drüber' }[e.miss];
      sub = mine ? (e.right ? 'Der Goalie stand ohnehin richtig.' : 'Der Goalie war geschlagen, knapp vorbei.') : (e.right ? 'Und du warst in der richtigen Ecke.' : 'Glück gehabt, du warst in der falschen Ecke.');
    }
    stamp(main, sub, mine === goal ? 'good' : 'bad', 'top');
  }

  // --- Resultat ---
  function finish() {
    phase = 'end';
    const won = G.outcome === 'win' || G.outcome === 'penwin', st = G.stats, y = G.score.you, o = G.score.home;
    $('res-title').textContent = (won ? 'Sieg' : 'Niederlage') + (G.pen ? ' nach Penaltys' : '');
    $('res-title').className = 'res-title ' + (won ? 'win' : 'loss');
    $('res-score').textContent = G.pen ? (y + (won ? 1 : 0)) + ':' + (o + (won ? 0 : 1)) : y + ':' + o;
    $('res-sub').textContent = 'Du gegen ' + HOME + (G.pen ? ', Penaltys ' + G.pen.you + ':' + G.pen.home : '');
    const rows = [
      [`${st.att - st.readYou} von ${st.att}`, `Angriffe, bei denen ${HOME} dich nicht gelesen hat`],
      [`${st.readThem} von ${st.def}`, `Angriffe von ${HOME}, die du gelesen hast`],
      [`${st.goals} von ${st.shots}`, 'eigene Schüsse im Tor'],
      [`${st.saved} von ${st.faced}`, `Schüsse von ${HOME}, die nicht reingingen`]
    ];
    $('stats').innerHTML = rows.map(r => `<li><b>${r[0]}</b><span>${r[1]}</span></li>`).join('');
    show('end');
  }

  // --- Verdrahtung ---
  $('steps').innerHTML = [
    ['kombi', 'Karte und Zug', 'Wähle eine Karte, dann Direktschuss, Kombination oder Solo. In der Abwehr: Block, Passweg oder Zweikampf.'],
    ['zwei', 'Gelesen oder vorbei', 'Beide Wahlen werden gleichzeitig aufgedeckt. Liest der Verteidiger deinen Zug, ist der Angriff meist vorbei.'],
    ['goal', 'Schuss', 'Du wählst die Ecke, der Goalie rät. In der Abwehr springst du selbst mit deinem Goalie.']
  ].map(s => `<li>${ic(s[0], 'r')}<div><b>${s[1]}</b><p>${s[2]}</p></div></li>`).join('');
  $('btn-start').addEventListener('click', start);
  $('btn-again').addEventListener('click', start);
  $('hand').addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b && !b.disabled) chooseCard(b.getAttribute('data-id')); });
  $('opts').addEventListener('click', e => { const b = e.target.closest('button[data-opt]'); if (b) chooseOption(b.getAttribute('data-opt')); });
  $('btn-recard').addEventListener('click', recard);
  $('stage').addEventListener('click', e => {
    const z = e.target.closest('.zone');
    if (z) { if (phase === 'aim') aimAt(z.getAttribute('data-c')); return; }
    if (phase === 'play') skip(); else if (phase === 'pause' && wake) wake();
  });
  $('hint').addEventListener('click', () => { if (phase === 'play') skip(); else if (phase === 'pause' && wake) wake(); });
})();
