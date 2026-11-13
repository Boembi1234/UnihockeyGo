/* Oberfläche. Rechnet nichts selbst aus: Jede Eingabe geht an HK.act, angezeigt wird, was die Engine zurückgibt. */
(function () {
  'use strict';
  const E = window.HK, Scene = window.HKScene, World = window.HKWorld;
  const $ = id => document.getElementById(id);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const pct = p => Math.round(p * 100);
  const byId = (list, id) => list.filter(x => x.id === id)[0];

  const MOVES = E.MOVES, STANCES = E.STANCES, CORNERS = E.CORNERS;
  const COLLECTION = E.DATA.collection.map(c => Object.assign({}, c));
  const HALLS = E.DATA.halls;
  let W = World.create();   // Welt: Verein, Besitz und Stärke der Hallen, stationierte Karten
  const USER = E.DATA.user;

  // g: Zustand der Engine. pick: gewählte eigene Karte. shown: Spielstand während einer laufenden Sequenz.
  const S = { hall: null, view: null, opp: '', squad: [], capId: null, g: null, phase: 'idle', pick: null, shown: null, penView: false, skip: false, token: 0,
    rng: E.makeRng((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0) };

  function skip() { if (S.phase === 'resolving' || S.phase === 'pen-resolving') { S.skip = true; Scene.skip(); } }

  const eff = E.eff, defVal = E.defVal, bestMove = E.bestMove, tendency = E.tendency, period = E.period;
  const card = (side, id) => E.card(S.g, side, id);
  const last = (side, id) => card(side, id).last;

  // --- card rendering ---
  function jersey(c, uid, homeSide) {
    const body = 'M112 16 Q150 40 188 16 L232 30 Q250 36 262 52 L296 104 L258 128 L234 98 L232 244 Q150 256 68 244 L66 98 L42 128 L4 104 L38 52 Q50 36 68 30 Z';
    const c1 = homeSide ? '#3b4257' : '#5a8dff', c2 = homeSide ? '#1b2033' : '#1a57ff', c3 = homeSide ? '#080a14' : '#0a2a8f';
    const trim = homeSide ? '#f7d774' : '#ffffff', font = "'Saira Condensed','Arial Narrow',sans-serif", long = c.last.length > 9;
    const num = c.no === null ? '' : `<text x="154" y="212" text-anchor="middle" font-family="${font}" font-weight="800" font-size="136" fill="#000" opacity="0.28">${c.no}</text><text x="150" y="208" text-anchor="middle" font-family="${font}" font-weight="800" font-size="136" fill="#fff">${c.no}</text>`;
    return `<svg class="jersey" viewBox="0 0 300 260" aria-hidden="true"><defs>
<linearGradient id="jb-${uid}" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="0.5" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient>
<linearGradient id="js-${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.45"/><stop offset="0.32" stop-color="#000" stop-opacity="0"/><stop offset="0.68" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></linearGradient>
<clipPath id="jc-${uid}"><path d="${body}"/></clipPath></defs>
<path d="${body}" fill="url(#jb-${uid})"/>
<g clip-path="url(#jc-${uid})"><path d="M-20 168 L320 78 L320 100 L-20 190 Z" fill="#fff" opacity="0.09"/>
<path d="M0 98 L46 134 L52 124 L8 90 Z" fill="${trim}"/><path d="M300 98 L254 134 L248 124 L292 90 Z" fill="${trim}"/>
<path d="M60 236 Q150 248 240 236 L240 244 Q150 256 60 244 Z" fill="${trim}" opacity="0.9"/>
<rect width="300" height="260" fill="url(#js-${uid})"/></g>
<path d="M112 16 Q150 40 188 16 Q150 24 112 16 Z" fill="#000" opacity="0.45"/>
<path d="M110 15 Q150 42 190 15" fill="none" stroke="${trim}" stroke-width="8" stroke-linecap="round"/>
<text x="150" y="${c.no === null ? 150 : 86}" text-anchor="middle" font-family="${font}" font-weight="700" font-size="${long ? 24 : 30}" letter-spacing="2" fill="#fff">${esc(c.last.toUpperCase())}</text>${num}</svg>`;
  }
  function stamBar(c) { return `<span class="stam${c.stam < 40 ? ' low' : ''}"><i style="width:${Math.round(c.stam)}%"></i></span>`; }
  function duelCard(c, homeSide, attacking, roleText) {
    const rows = attacking ? [['Abschluss', c.sco], ['Vorlagen', c.ply], ['Clutch', c.clu]] : [['Erfahrung', c.exp], ['Fairness', c.fai], ['Form', c.frm]];
    const tagText = c.cap ? 'Captain' : (c.home ? 'Heimvorteil' : '');
    return `<div class="role ${attacking ? 'atk' : 'def'}">${roleText || (attacking ? 'Greift an' : 'Verteidigt')}</div>
<div class="card${homeSide ? ' home' : ''}"><div class="card-in">
<div class="c-rate"><b>${c.ovr}</b><span>${c.pos}</span></div>${jersey(c, c.id + (homeSide ? 'h' : 'y'), homeSide)}
${tagText ? `<div class="c-tag">${tagText}</div>` : ''}
<div class="c-name"><span class="f"><span>${esc(c.first)}</span><span>${esc(c.short)}</span></span><span class="l${c.last.length > 9 ? ' long' : ''}">${esc(c.last)}</span></div>
<div class="c-stats">${rows.map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}</div>
</div></div>
<div class="stam${c.stam < 40 ? ' low' : ''}" role="img" aria-label="Ausdauer ${Math.round(c.stam)} von 100"><i style="width:${Math.round(c.stam)}%"></i></div>`;
  }
  const emptySlot = label => `<div class="role def">&nbsp;</div><div class="empty"><b>?</b><span>${label}</span></div><div class="stam"><i style="width:0%"></i></div>`;
  const goalieSlot = label => `<div class="role def">Im Tor</div><div class="empty"><b>G</b><span>${label}</span></div><div class="stam"><i style="width:0%"></i></div>`;
  function mini(c, o) {
    const lines = (o.lines || []).map(l => `<div><span>${l[0]}</span><b>${l[1]}</b></div>`).join('');
    const label = `${c.first} ${c.last}, ${c.pos}, Gesamtwert ${c.ovr}, Ausdauer ${Math.round(c.stam)}${o.status ? ', ' + o.status : ''}${o.note ? ', ' + o.note : ''}`;
    return `<button type="button" class="mini${o.cls ? ' ' + o.cls : ''}" data-id="${c.id}" aria-label="${esc(label)}"${o.pressed === undefined ? '' : ` aria-pressed="${o.pressed}"`}${o.disabled ? ' disabled' : ''}>
<span class="mini-in"><span class="m-top"><b>${c.ovr}</b><span><em>${c.pos}</em>${esc(c.short)}</span></span>
<span class="m-name${c.last.length > 9 ? ' long' : ''}"><span class="nm">${esc(c.last)}</span>${o.badge ? `<i>${o.badge}</i>` : ''}</span>
${o.status ? `<span class="m-status">${o.status}</span>` : `<span class="m-lines">${lines}</span>`}${stamBar(c)}</span></button>`;
  }

  // --- Welt: Verein, Hallen, Stationierung. Die Regeln dazu stehen in world.js. ---
  const hallState = id => W.halls[id], ownerOf = id => World.club(W.halls[id].owner), isMine = id => !!W.club && W.halls[id].owner === W.club;
  const fullName = c => (c.first + ' ' + c.last).trim();
  const factorText = f => f.matchday ? 'Spieltag vor Ort: Ein Sieg zählt doppelt.' : f.near ? 'Vor Ort: Ein Sieg zählt voll.' : f.reclaim ? 'Zurückerobern: Ein Sieg zählt voll, auch aus der Ferne.' : 'Fernangriff: Ein Sieg zählt halb.';
  function attackLabel(h) { const f = World.factor(W, h.id); return f.matchday ? 'Einchecken, doppelter Schaden' : f.near ? 'Einchecken und angreifen' : f.reclaim ? 'Zurückerobern, voller Schaden' : 'Fernangriff, halber Schaden'; }
  function hpBlock(hp) { return `<div class="hp"><div class="hp-row"><span>Hallen-Stärke</span><b>${hp} / 100</b></div><div class="hp-track"><div class="hp-fill" style="width:${hp}%"></div></div></div>`; }
  function hallTags(h) {
    const t = [isMine(h.id) ? '<span class="tag mine">Dein Verein</span>' : (h.near ? '<span class="tag">Vor Ort</span>' : '<span class="tag far">Fernangriff</span>')];
    if (W.matchday === h.id) t.push('<span class="tag day">Spieltag</span>');
    return t.join('');
  }
  function holderText(h) {
    const o = ownerOf(h.id);
    return `Gehalten von <strong>${isMine(h.id) ? 'deinem Verein ' : ''}${esc(o.name)}</strong>${o.id !== h.id ? ', Heimhalle von ' + esc(h.short) : ''}.`;
  }

  // --- Karte ---
  function renderMap() {
    const marks = HALLS.map(h => {
      const m = isMine(h.id), fill = m ? '#1a57ff' : '#f7d774';
      return `<polygon points="${h.x - 14},${h.y - 12} ${h.x + 14},${h.y - 12} ${h.x},${h.y + 12}" fill="${fill}" stroke="#050818" stroke-width="2"></polygon>
<text x="${h.x}" y="${h.y - 20}" font-size="13" letter-spacing="1.5" fill="${m ? '#9fbcff' : '#f7d774'}">${esc(ownerOf(h.id).short.toUpperCase())} · ${h.dist.toUpperCase()}</text>`;
    }).join('');
    $('map').innerHTML = `<svg viewBox="0 0 428 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<rect width="428" height="190" fill="#0b1437"></rect>
<g stroke="#1b2a66" stroke-width="13" fill="none" stroke-linecap="round"><path d="M-10 150 L120 132 L250 150 L440 120"></path><path d="M60 -10 L86 138 L70 200"></path><path d="M150 96 L268 46 L338 126"></path><path d="M300 -10 L286 60 L330 200"></path></g>
<g stroke="#2a3d85" stroke-width="2" fill="none" stroke-dasharray="6 8"><path d="M150 96 L268 46 L338 126"></path><path d="M-10 150 L120 132 L250 150 L440 120"></path></g>
<circle cx="150" cy="96" r="76" fill="rgba(247,215,116,0.08)" stroke="#f7d774" stroke-width="1.5" stroke-dasharray="5 6"></circle>
<path d="M86 138 L150 96" stroke="#e3ecff" stroke-width="1.5" stroke-dasharray="3 5"></path>
<g font-family="'Saira Condensed','Arial Narrow',sans-serif" font-weight="700" text-anchor="middle">${marks}
<text x="86" y="166" font-size="14" letter-spacing="2" fill="#e3ecff">DU</text></g>
<circle class="pulse" cx="86" cy="138" r="9" fill="none" stroke="#5b87ff" stroke-width="2"></circle>
<circle cx="86" cy="138" r="8" fill="#1a57ff" stroke="#ffffff" stroke-width="3"></circle></svg>`;
    $('clubbar').innerHTML = `<span>Dein Verein</span><b>${esc(World.club(W.club).name)}</b>`;
    $('btn-switch').disabled = !World.canSwitch(W);
    $('btn-switch').textContent = World.canSwitch(W) ? 'Verein wechseln' : 'Wechsel aufgebraucht';
    $('halls').innerHTML = HALLS.map(h => `<div class="panel">
<div class="hr-head"><h2 class="hall-name">${esc(h.name)}</h2><span class="tags">${hallTags(h)}</span></div>
<p class="holder">${esc(h.place)}, ${h.dist} entfernt. ${holderText(h)} ${World.taken(W, h.id)} von ${World.CFG.slots} Plätzen besetzt.</p>
${hpBlock(hallState(h.id).hp)}
${isMine(h.id) ? `<button class="cta small" type="button" data-view="${h.id}">Verteidigen und stationieren</button>`
    : `<button class="cta small" type="button" data-hall="${h.id}">${attackLabel(h)}</button><button class="ghost" type="button" data-view="${h.id}">Halle ansehen</button>`}</div>`).join('');
  }

  // --- Vereinswahl ---
  function openClub() {
    const first = !W.club;
    $('club-title').textContent = first ? 'Wähle deinen Verein' : 'Verein wechseln';
    $('club-text').textContent = first ? 'Herren L-UPL 2026/27. Die Hallen deines Vereins verteidigst du, alle anderen kannst du angreifen. Wechseln kannst du einmal pro Saison.'
      : 'Du kannst den Verein einmal pro Saison wechseln. Deine stationierten Karten kehren dabei zurück.';
    $('club-list').innerHTML = World.CLUBS.map(c => `<button type="button" class="chip club${c.id === W.club ? ' on' : ''}" data-club="${c.id}"${c.id === W.club ? ' disabled' : ''}>${esc(c.name)}${c.id === W.club ? '<i>Dein Verein</i>' : (byId(HALLS, c.id) ? '<i>Halle im Prototyp</i>' : '')}</button>`).join('');
    $('btn-club-back').hidden = first;
    show('club');
  }
  function pickClub(id) {
    const r = World.chooseClub(W, id); if (!r.ok) return;
    W = r.world; S.squad = []; S.capId = null; renderMap(); show('map');
  }

  // --- Hallenansicht: Besitzer, Stärke, Plätze, Verteidiger mit Karte und User, Stationieren ---
  function openHall(id) { S.view = id; renderHall(); show('hall'); }
  function renderHall() {
    const h = byId(HALLS, S.view), st = hallState(h.id), m = isMine(h.id), f = World.factor(W, h.id);
    $('hv-name').textContent = h.name; $('hv-tags').innerHTML = hallTags(h);
    $('hv-holder').innerHTML = `${esc(h.place)}, ${h.dist} entfernt. ${holderText(h)}`;
    $('hv-hp').textContent = st.hp + ' / 100'; $('hv-hp-fill').style.width = st.hp + '%';
    $('hv-slots').textContent = World.taken(W, h.id) + ' von ' + World.CFG.slots + ' Plätzen besetzt';
    $('hv-guard').innerHTML = World.guard(W, h.id).map(c => `<li${c.kind === 'me' ? ' class="me"' : ''}><b>${c.ovr}</b><span class="nm">${esc(fullName(c))}<small>${esc(c.by)}${c.home ? ', stationiert, Heimvorteil +2' : (c.kind === 'team' ? ', füllt den freien Platz' : 'karte, Gesamtwert ' + World.CFG.fillerOvr)}</small></span><span class="ps">${c.pos}</span></li>`).join('');
    $('hv-note').textContent = m ? '' : factorText(f);
    $('btn-hall-attack').hidden = m; $('btn-hall-attack').textContent = attackLabel(h);
    $('hv-station').hidden = !m;
    if (m) {
      const slot = World.mySlot(W, h.id), why = slot ? '' : World.canStation(W, h.id), placed = World.stationed(W), open = !slot && !why;
      $('btn-withdraw').hidden = !slot;
      $('hv-station-text').textContent = slot ? byId(COLLECTION, slot.card).last + ' verteidigt hier für dich und fehlt dir in eigenen Matches. Du kannst die Karte jederzeit zurückziehen.'
        : (why || 'Wähle eine Karte. Sie verteidigt hier mit Heimvorteil und fehlt dir in eigenen Matches, bis du sie zurückziehst oder die Halle fällt.');
      $('hv-cards').hidden = !open;
      $('hv-cards').innerHTML = !open ? '' : COLLECTION.map(c => mini(c, { disabled: !!placed[c.id], cls: placed[c.id] ? 'out' : '', status: placed[c.id] ? 'Stationiert' : '',
        lines: [['Angriff', Math.round(eff(bestMove(c).val(c), c))], ['Abwehr', Math.round(eff(defVal(c), c))]] })).join('');
    }
    $('hv-news').textContent = W.news; $('hv-news').hidden = !W.news;
  }
  function stationCard(id) {
    const r = World.station(W, S.view, id); if (!r.ok) return;
    W = r.world; S.squad = S.squad.filter(x => x !== id); if (S.capId === id) S.capId = null; renderHall();
  }
  function withdrawCard() { const r = World.withdraw(W, S.view); if (r.ok) { W = r.world; renderHall(); } }
  function simAttack() { W = World.simAttack(W, S.view, S.rng).world; renderHall(); }

  // --- Vereinstabelle ---
  function openTable() {
    $('table-list').innerHTML = '<li class="head"><b>Rang</b><span class="nm">Verein</span><span class="ps">Hallen</span><i>Stärke</i></li>'
      + World.table(W).map((t, i) => `<li${t.id === W.club ? ' class="me"' : ''}><b>${t.halls ? (i + 1) + '.' : '–'}</b><span class="nm">${esc(t.name)}</span><span class="ps">${t.halls}</span><i>${t.hp}</i></li>`).join('');
    show('table');
  }

  // --- Kader ---
  function openSquad(hallId) {
    if (!World.canAttack(W, hallId)) return;
    S.hall = byId(HALLS, hallId);
    const placed = World.stationed(W), fit = c => c.ovr * (0.78 + 0.22 * c.stam / 100), free = COLLECTION.filter(c => !placed[c.id]).sort((a, b) => fit(b) - fit(a));
    S.squad = S.squad.filter(id => !placed[id]);
    if (S.squad.length !== 6) {
      const top = (pos, n) => free.filter(c => c.pos === pos).slice(0, n);
      S.squad = top('ATT', 4).concat(top('DEF', 2)).map(c => c.id);
      free.forEach(c => { if (S.squad.length < 6 && S.squad.indexOf(c.id) === -1) S.squad.push(c.id); });
    }
    if (S.squad.indexOf(S.capId) === -1) S.capId = S.squad[0];
    renderSquad(); show('squad');
  }
  function renderSquad() {
    const h = S.hall, st = hallState(h.id), placed = World.stationed(W);
    $('sq-hall').textContent = h.name; $('sq-tags').innerHTML = hallTags(h);
    $('sq-holder').innerHTML = `${esc(h.place)}. ${holderText(h)} ${factorText(World.factor(W, h.id))}`;
    $('sq-hp').textContent = st.hp + ' / 100'; $('sq-hp-fill').style.width = st.hp + '%';
    $('sq-guard').innerHTML = World.guard(W, h.id).map(c => `<li><b>${c.ovr}</b><span class="nm">${esc(fullName(c))}</span><span class="ps">${c.pos}</span><i>${bestMove(c).name}</i></li>`).join('');
    $('sq-count').textContent = S.squad.length + ' von 6 gewählt';
    $('sq-grid').innerHTML = COLLECTION.map(c => {
      const on = S.squad.indexOf(c.id) !== -1, gone = !!placed[c.id];
      return mini(c, { cls: gone ? 'out' : (on ? '' : 'off'), disabled: gone, status: gone ? 'Stationiert' : '', pressed: on, badge: on && c.id === S.capId ? 'C' : '',
        note: gone ? 'stationiert in ' + byId(HALLS, placed[c.id]).name : (on ? (c.id === S.capId ? 'im Kader, Captain' : 'im Kader') : 'nicht im Kader'),
        lines: [['Angriff', Math.round(eff(bestMove(c).val(c), c))], ['Abwehr', Math.round(eff(defVal(c), c))]] });
    }).join('');
    $('sq-cap').innerHTML = S.squad.map(id => { const c = byId(COLLECTION, id); return `<button type="button" class="chip${id === S.capId ? ' on' : ''}" data-cap="${id}" aria-pressed="${id === S.capId}"><b>${c.ovr}</b>${esc(c.last)}</button>`; }).join('');
    const ok = S.squad.length === 6;
    $('btn-kickoff').disabled = !ok;
    $('btn-kickoff').textContent = ok ? 'Match starten' : 'Wähle 6 Karten';
  }
  function toggleSquad(id) {
    if (World.stationed(W)[id]) return;
    const i = S.squad.indexOf(id);
    if (i !== -1) S.squad.splice(i, 1); else if (S.squad.length < 6) S.squad.push(id); else return;
    if (S.squad.indexOf(S.capId) === -1) S.capId = S.squad.length ? S.squad.slice().sort((a, b) => byId(COLLECTION, b).ovr - byId(COLLECTION, a).ovr)[0] : null;
    renderSquad();
  }
  function show(name) {
    ['club', 'map', 'hall', 'table', 'squad', 'match', 'result'].forEach(n => { $('screen-' + n).hidden = n !== name; });
    window.scrollTo(0, 0);
  }

  // --- match rendering ---
  function renderSlots() {
    const g = S.g, cur = g.cur; if (!cur) return;
    if (cur.so || S.penView) {
      const id = cur.so && cur.side === 'you' ? (cur.attacker || S.pick) : cur.attacker, sh = id ? card(cur.side, id) : null;
      $('slot-home').innerHTML = cur.side === 'home' ? duelCard(sh, true, true, 'Penalty') : goalieSlot('Goalie ' + S.opp);
      $('slot-you').innerHTML = cur.side === 'home' ? goalieSlot('Dein Goalie') : (sh ? duelCard(sh, false, true, 'Penalty') : emptySlot('Dein Schütze'));
      return;
    }
    const homeId = cur.side === 'home' ? cur.attacker : cur.defender, youId = (cur.side === 'home' ? cur.defender : cur.attacker) || S.pick;
    $('slot-home').innerHTML = duelCard(card('home', homeId), true, cur.side === 'home');
    $('slot-you').innerHTML = youId ? duelCard(card('you', youId), false, cur.side === 'you') : emptySlot(cur.side === 'home' ? 'Dein Verteidiger' : 'Dein Angreifer');
  }
  function renderScore() {
    const g = S.g, sc = S.shown || g.score, pp = $('sc-pp');
    $('sc-you').textContent = sc.you; $('sc-home').textContent = sc.home; $('sc-club').textContent = S.opp;
    $('keeper-you').className = 'keeper bot' + (g.cur && g.cur.pull ? ' off' : '');
    pp.className = 'sb-pp'; pp.textContent = '';
    if (g.pen) { $('sc-period').textContent = 'Penaltys'; $('sc-duel').textContent = g.pen.you + ' : ' + g.pen.home; return; }
    const d = Math.min(g.duel, 11);
    $('sc-period').textContent = period(d) + '. Drittel'; $('sc-duel').textContent = 'Duell ' + (d + 1) + ' von 12';
    const mine = E.boxed(g, 'you'), theirs = E.boxed(g, 'home'), duels = n => n + (n === 1 ? ' Duell' : ' Duelle');
    if (theirs.n > mine.n) { pp.className = 'sb-pp up'; pp.textContent = 'Überzahl · ' + duels(theirs.max); }
    else if (mine.n > theirs.n) { pp.className = 'sb-pp down'; pp.textContent = 'Unterzahl · ' + duels(mine.max); }
    else if (mine.n > 0) { pp.className = 'sb-pp even'; pp.textContent = 'Strafen beidseits'; }
  }
  function renderDots() {
    const g = S.g; let html = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) html += '<span class="gap"></span>';
      const side = i % 2 === 0 ? 'home' : 'you', r = g.results[i]; let cls = 'dot ' + side;
      if (r) cls += r.goal === 'you' ? ' g-you' : (r.goal === 'home' ? ' g-home' : ' miss'); else if (i === g.duel && !g.pen) cls += ' now';
      html += `<span class="${cls}"></span>`;
    }
    if (g.pen) { html += '<span class="gap"></span>'; g.pen.results.forEach(r => { html += `<span class="dot pen ${r.goal ? (r.side === 'you' ? 'g-you' : 'g-home') : 'miss'}"></span>`; }); }
    $('dots').innerHTML = html;
    let bar = '';
    for (let i = 3; i >= 1; i--) bar += `<i class="${g.mom <= -i ? 'h' : ''}"></i>`;
    bar += '<span class="mid"></span>';
    for (let i = 1; i <= 3; i++) bar += `<i class="${g.mom >= i ? 'y' : ''}"></i>`;
    const who = g.mom > 0 ? 'bei dir' : (g.mom < 0 ? 'bei ' + S.opp : 'ausgeglichen');
    $('mom').hidden = !!g.pen;
    $('mom').innerHTML = `<span>Momentum</span><span class="mom-bar" role="img" aria-label="Momentum ${who}">${bar}</span>`;
  }
  function renderTactics() {
    const g = S.g, cur = g.cur, used = g.tac.you, live = (S.phase === 'card' || S.phase === 'option') && g.phase === 'pick';
    $('tactics').hidden = !!g.pen;
    const t = [
      { id: 'timeout', name: 'Time-out', sub: 'Alle +30 Ausdauer', ok: live },
      { id: 'pressing', name: 'Pressing', sub: 'Gegner −15 durch', ok: live && cur.side === 'home', active: cur && cur.pressing },
      { id: 'pull', name: 'Ohne Goalie', sub: g.duel >= 8 ? 'Du +20, Tor leer' : 'Ab 3. Drittel', ok: live && cur.side === 'you' && g.duel >= 8, active: cur && cur.pull }
    ];
    $('tactics').innerHTML = t.map(x => `<button type="button" class="tac${x.active ? ' active' : ''}" data-tac="${x.id}"${x.ok && !used[x.id] ? '' : ' disabled'}><b>${x.name}</b><span>${x.active ? 'Aktiv' : (used[x.id] ? 'Gespielt' : x.sub)}</span></button>`).join('');
  }
  function renderHand() {
    const g = S.g, cur = g.cur, ph = S.phase, usable = E.usable(g, 'you');
    const showOpts = ph === 'option' || ph === 'pen-guess' || ph === 'pen-corner';
    $('hand').hidden = showOpts; $('hand-head').hidden = showOpts; $('opts').hidden = !showOpts;
    $('btn-recard').hidden = !(ph === 'option' || (ph === 'pen-corner' && cur.so));
    renderTactics();
    if (showOpts) { renderOptions(); return; }
    const picking = ph === 'card' || ph === 'pen-card';
    $('hand-hint').textContent = !picking ? '' : (ph === 'pen-card' ? 'Wähle deinen Schützen' : (cur.side === 'home' ? 'Wähle deinen Verteidiger' : 'Wähle deinen Angreifer'));
    $('hand').innerHTML = g.teams.you.cards.map(c => {
      if (cur && cur.so) {
        const used = E.soBlocked(g, c.id);
        return mini(c, { disabled: ph !== 'pen-card' || used, cls: used ? 'out' : '', status: used ? 'Hat geschossen' : '', lines: [['Clutch', c.clu], ['Abschluss', c.sco]] });
      }
      const can = usable.indexOf(c) !== -1; let status = '';
      if (c.box > 0) status = 'Strafbank, noch ' + c.box; else if (!can) status = 'Zu müde';
      let lines = [];
      if (cur && cur.side === 'home') lines = [['Abwehr', Math.round(eff(defVal(c), c))], ['Foul', pct(E.foulRisk(c, null, g.cfg)) + '%']];
      else if (cur) { const m = bestMove(c); lines = [['Angriff', Math.round(eff(m.val(c), c))], ['Stark im', m.short]]; }
      return mini(c, { disabled: !(picking && can && !status), cls: status ? 'out' : '', status, lines, badge: c.cap ? 'C' : '', note: c.cap ? 'Captain' : '' });
    }).join('');
  }
  function renderOptions() {
    const g = S.g, cur = g.cur, cfg = g.cfg, el = $('opts');
    if (S.phase === 'pen-guess' || S.phase === 'pen-corner') {
      el.className = 'opts row';
      el.innerHTML = CORNERS.map(k => `<button type="button" class="opt" data-opt="${k.id}"><b>${k.name}</b></button>`).join('');
      return;
    }
    el.className = 'opts';
    if (cur.side === 'home') {
      const A = card('home', cur.attacker), D = card('you', S.pick), t = tendency(A);
      el.innerHTML = STANCES.map(s => {
        const through = pct(E.stage1(g, 'home', A, E.move(s.stops), D, true));
        return `<button type="button" class="opt" data-opt="${s.id}"><b>${s.name}</b><span class="big">${pct(t[s.stops])}%</span>
<span class="sub">Stoppt ${s.against}: Liegst du richtig, kommt er zu ${through}% durch. Ballgewinn: ${pct(cfg.counter[s.id])}% Konter. Foul-Risiko ${pct(E.foulRisk(D, s, cfg))}%.</span><span class="sub2">Tendenz</span></button>`;
      }).join('');
    } else {
      const A = card('you', S.pick), D = card('home', cur.defender), finish = E.stage2(g, A) * E.stage3(g, 'you', A);
      el.innerHTML = MOVES.map(m => {
        const open = E.stage1(g, 'you', A, m, D, false), read = E.stage1(g, 'you', A, m, D, true), st = STANCES.filter(x => x.stops === m.id)[0];
        return `<button type="button" class="opt" data-opt="${m.id}"><b>${m.name}</b><span class="big">${pct(open * finish)}%</span>
<span class="sub">${m.basis} ${Math.round(eff(m.val(A), A))}. Kommt zu ${pct(open)}% durch, gelesen zu ${pct(read)}%. Gelesen und gestoppt: ${pct(cur.pull ? cfg.pullCounter : cfg.counter[st.id])}% Konter.${m.extra ? ' Kostet mehr Ausdauer.' : ''}</span><span class="sub2">Torchance</span></button>`;
      }).join('');
    }
  }
  function refresh() { renderScore(); renderDots(); renderSlots(); renderHand(); }

  // --- dialog ---
  function say(text) {
    const el = $('say'), token = ++S.token;
    $('say-sr').textContent = text;
    return new Promise(resolve => {
      if (reduce || S.skip) { el.textContent = text; resolve(); return; }
      let i = 0; el.textContent = '';
      (function tick() {
        if (token !== S.token) { resolve(); return; }
        i = S.skip ? text.length : Math.min(text.length, i + 2); el.textContent = text.slice(0, i);
        if (i < text.length) setTimeout(tick, 14); else resolve();
      })();
    });
  }

  // Während einer Sequenz wechselt der Text sofort, getippt wird nur bei Fragen an den User.
  function tell(text) { S.token++; $('say').textContent = text; $('say-sr').textContent = text; }

  // --- Einblendung und Spielstand ---
  // Die Einblendung steht in der Feldhälfte, in der gerade nichts passiert.
  function flash(text, cls, where) {
    const f = $('flash'), low = where ? where === 'unten' : Scene.ballY() < 50;
    f.className = 'flash ' + cls; f.textContent = text; f.style.top = (low ? 81 : 19) + '%'; f.hidden = false;
  }
  function scored(side) {
    S.shown[side]++;
    $('sc-you').textContent = S.shown.you; $('sc-home').textContent = S.shown.home;
    $('rink').className = 'rink ' + (side === 'you' ? 'hit-top-you' : 'hit-bot-home');
    flash('Tor', side);
  }
  function waitContinue(label) {
    S.phase = S.phase.indexOf('pen') === 0 ? 'pen-continue' : 'continue';
    const btn = $('btn-next'); btn.textContent = label || 'Weiter'; btn.hidden = false;
    try { btn.focus({ preventScroll: true }); } catch (e) {}
  }

  // --- Texte zu den Ereignissen der Engine ---
  const WITH = { direkt: 'einem Direktschuss', kombi: 'einer Kombination', solo: 'einem Solo' };
  const team = side => side === 'you' ? 'dich' : S.opp;
  function line(e) {
    const o = E.other;
    if (e.t === 'reveal') {
      const A = last(e.side, e.a), D = last(o(e.side), e.d);
      return e.side === 'home' ? A + ' versucht es mit ' + WITH[e.move] + '. ' + D + (e.read ? ' hat es gelesen.' : ' steht falsch.')
        : D + ' rechnet mit ' + E.stance(e.stance).expects + '. Er liegt ' + (e.read ? 'richtig.' : 'falsch.');
    }
    if (e.t === 'foul') {
      const D = last(e.side, e.by), A = last(o(e.side), e.on), to = o(e.side);
      if (e.kind === 'penalty') return D + ' foult ' + A + ' bei klarer Torchance. Penalty für ' + team(to) + '.';
      if (e.kind === 'twomin') return 'Foul von ' + D + '. 2 Minuten, ' + (to === 'you' ? 'du spielst' : S.opp + ' spielt') + ' in Überzahl.';
      return 'Foul von ' + D + ' an ' + A + '. Freischlag für ' + team(to) + '.';
    }
    if (e.t === 's1') {
      const A = last(e.side, e.a), D = last(o(e.side), e.d), m = e.move;
      if (e.ok && !e.read) return m === 'direkt' ? A + ' zieht ab, ' + D + ' kommt nicht in die Schusslinie.' : m === 'kombi' ? 'Der Pass kommt an, ' + A + ' steht frei.' : A + ' zieht an ' + D + ' vorbei.';
      if (e.ok) return m === 'direkt' ? D + ' steht in der Schusslinie, der Ball rutscht trotzdem durch.' : m === 'kombi' ? D + ' ist am Pass dran, er rutscht knapp durch.' : D + ' geht mit, ' + A + ' setzt sich trotzdem durch.';
      if (e.read) return m === 'direkt' ? D + ' blockt den Schuss.' : m === 'kombi' ? D + ' fängt den Pass ab.' : D + ' nimmt ' + A + ' den Ball ab.';
      return m === 'direkt' ? D + ' wirft sich noch in den Schuss.' : m === 'kombi' ? D + ' erwischt den Pass noch.' : D + ' holt ' + A + ' ein und nimmt ihm den Ball ab.';
    }
    if (e.t === 'counter') {
      const X = last(e.side, e.x), target = e.empty ? 'das leere Tor' : 'den Goalie';
      return (e.src === 'catch' ? 'Schneller Auswurf, Konter. ' : 'Konter. ') + X + ' läuft allein auf ' + target + ' zu.';
    }
    if (e.t === 'free') return 'Freischlag. ' + last(e.side, e.x) + (e.short ? ' spielt ihn kurz und zieht ab.' : ' schiesst direkt.');
    if (e.t === 's2') return e.ok ? 'Der Schuss kommt aufs Tor.' : (e.miss === 'wide' ? 'Der Schuss geht daneben.' : e.miss === 'high' ? 'Der Schuss geht drüber.' : 'Der Ball klatscht an den Pfosten.');
    if (e.t === 's3') {
      const X = last(e.side, e.x);
      if (e.ok) return 'Tor für ' + team(e.side) + (e.empty ? ' ins leere Tor. ' : '. ') + X + ' trifft.';
      return e.caught ? 'Der Goalie fängt den Schuss von ' + X + '.' : 'Parade. Der Goalie hält gegen ' + X + '.';
    }
    if (e.t === 'ppend') return 'Tor in Überzahl. Die Strafe gegen ' + last(e.side, e.x) + ' ist vorbei.';
    return '';
  }
  function penLine(e) {
    const name = byId(CORNERS, e.corner).name.toLowerCase(), high = !e.ok && !e.right && e.corner === 'm';
    return last(e.side, e.x) + ' schiesst ' + (e.corner === 'm' ? 'in die Mitte' : 'nach ' + name) + '. ' + (e.side === 'home' ? 'Dein Goalie' : 'Der Goalie')
      + (e.right ? ' ist in der richtigen Ecke. ' : ' springt falsch. ') + (e.ok ? 'Tor für ' + team(e.side) + '.' : e.right ? 'Gehalten.' : high ? 'Drüber.' : 'Daneben.');
  }
  // Spielt die Ereignisse als Szenen ab. Jede Szene meldet, wann ihr Satz, ihre Einblendung und ein Tor sichtbar werden.
  async function playEvents(events) {
    const beats = [];
    Scene.plan(events);
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.t === 'box') continue;
      $('flash').hidden = true;
      if (e.t === 'reveal') {
        const t = line(e); beats.push(t); tell(t);
        await Scene.start({ side: e.side, a: card(e.side, e.a), d: card(E.other(e.side), e.d) });
        continue;
      }
      const text = e.t === 'pen' ? penLine(e) : line(e);
      if (e.t === 'pen') tell(last(e.side, e.x) + ' läuft an.');
      await Scene.play(e, {
        text: () => { if (text) { beats.push(text); tell(text); } },
        label: flash,
        goal: side => { if (e.so) flash('Tor', side); else scored(side); }
      });
    }
    // Am Schluss bleiben die zwei letzten Sätze stehen, damit man nachlesen kann, was eben schnell ablief.
    const keep = beats.filter(b => b !== 'Der Schuss kommt aufs Tor.');
    if (keep.length) tell(keep.slice(-2).join(' '));
  }

  // --- match flow ---
  function startMatch() {
    COLLECTION.forEach(c => { c.box = 0; c.cap = c.id === S.capId; });
    S.opp = ownerOf(S.hall.id).short;
    S.g = E.newMatch({ mode: 'hall', homeName: S.opp,
      you: { goalie: USER.goalie, cards: S.squad.map(id => byId(COLLECTION, id)) },
      home: { goalie: S.hall.goalie, cards: World.guard(W, S.hall.id) } }, S.rng);
    S.pick = null; S.shown = null; S.penView = false; S.skip = false; S.phase = 'idle';
    $('btn-next').hidden = true;
    show('match'); announceDuel();
  }
  function announceDuel() {
    const g = S.g, cur = g.cur;
    $('flash').hidden = true; $('rink').className = 'rink'; Scene.clear();
    S.pick = null; S.penView = false; S.skip = false; S.phase = 'card'; refresh();
    const pre = g.duel === 0 ? 'Anpfiff. ' : (g.duel % 4 === 0 ? period(g.duel) + '. Drittel. ' : '');
    if (cur.side === 'home') { const a = card('home', cur.attacker); say(pre + a.first + ' ' + a.last + ' greift an. Mit wem verteidigst du?'); }
    else say(pre + S.opp + ' verteidigt mit ' + last('home', cur.defender) + '. Wen schickst du nach vorne?');
  }
  function pickCard(id) {
    const g = S.g, c = card('you', id); if (!c) return;
    if (S.phase === 'pen-card') { if (E.soBlocked(g, id)) return; S.pick = id; S.phase = 'pen-corner'; refresh(); say(c.last + ' läuft an. Wohin schiesst du?'); return; }
    if (S.phase !== 'card' || E.usable(g, 'you').indexOf(c) === -1) return;
    S.pick = id; S.phase = 'option'; refresh();
    say(g.cur.side === 'home' ? 'Wie verteidigt ' + c.last + ' gegen ' + last('home', g.cur.attacker) + '?' : 'Welchen Spielzug macht ' + c.last + '?');
  }
  function recard() {
    const cur = S.g.cur;
    if (S.phase === 'pen-corner' && cur.so) { S.pick = null; S.phase = 'pen-card'; refresh(); say('Wer schiesst den Penalty?'); return; }
    if (S.phase !== 'option') return;
    S.pick = null; S.phase = 'card'; refresh();
    say(cur.side === 'home' ? last('home', cur.attacker) + ' greift an. Mit wem verteidigst du?' : S.opp + ' verteidigt mit ' + last('home', cur.defender) + '. Wen schickst du nach vorne?');
  }
  function playTactic(id) {
    if (!(S.phase === 'card' || S.phase === 'option')) return;
    const r = E.act(S.g, { type: 'tactic', id }, S.rng);
    if (r.ok) { S.g = r.state; refresh(); }
  }
  // Schickt eine Eingabe an die Engine und spielt die Sequenz ab. Erst danach gilt der neue Zustand.
  async function run(action) {
    const r = E.act(S.g, action, S.rng);
    if (!r.ok) return;
    const cur = S.g.cur, so = !!cur.so;
    S.phase = so || S.penView ? 'pen-resolving' : 'resolving';
    S.shown = { you: S.g.score.you, home: S.g.score.home };
    if (action.type === 'play' && cur.side === 'home') S.pick = action.card;
    refresh();
    if (so) { Scene.penSetup(cur.side, card(cur.side, cur.side === 'home' ? cur.attacker : action.card)); await Scene.wait(reduce ? 0 : 220); }
    await playEvents(r.events);
    S.g = r.state; S.shown = null;
    const g = S.g;
    if (g.phase === 'penalty') {
      const A = card(g.cur.side, g.cur.pen.shooter);
      await Scene.wait(reduce ? 0 : 550);
      S.penView = true; S.skip = false; S.phase = g.cur.side === 'home' ? 'pen-guess' : 'pen-corner'; $('flash').hidden = true;
      Scene.penSetup(g.cur.side, A); refresh();
      say(g.cur.side === 'home' ? A.first + ' ' + A.last + ' läuft zum Penalty an. In welche Ecke springt dein Goalie?' : 'Penalty für dich. ' + A.last + ' läuft an. Wohin schiesst du?');
      return;
    }
    refresh();
    if (g.phase === 'so-wait') waitContinue(E.soOver(g.pen) ? 'Zum Resultat' : 'Weiter');
    else waitContinue(g.duel === 11 ? (g.score.you === g.score.home ? 'Penaltys' : 'Zum Resultat') : 'Weiter');
  }
  function pickOption(id) {
    const cur = S.g.cur;
    if (S.phase === 'option') run({ type: 'play', card: S.pick, option: id });
    else if (S.phase === 'pen-guess') run({ type: 'corner', corner: id });
    else if (S.phase === 'pen-corner') run(cur.so ? { type: 'shoot', card: S.pick, corner: id } : { type: 'corner', corner: id });
  }
  function goOn() {
    if (S.phase !== 'continue' && S.phase !== 'pen-continue') return;
    const first = !S.g.pen, r = E.act(S.g, { type: 'next' }, S.rng);
    if (!r.ok) return;
    $('btn-next').hidden = true; S.g = r.state;
    if (S.g.phase === 'pick') announceDuel();
    else if (S.g.phase === 'done') finish();
    else announceShot(first);
  }

  // --- penalty shootout ---
  function announceShot(first) {
    const g = S.g, cur = g.cur;
    $('flash').hidden = true; $('rink').className = 'rink'; Scene.clear();
    S.pick = null; S.penView = false; S.skip = false;
    if (cur.side === 'home') {
      const a = card('home', cur.attacker);
      S.phase = 'pen-guess'; refresh();
      say((first ? 'Unentschieden. Es gibt Penaltys. ' : '') + a.first + ' ' + a.last + ' läuft an. In welche Ecke springt dein Goalie?');
    } else { S.phase = 'pen-card'; refresh(); say('Dein Penalty. Wer schiesst?'); }
  }

  // --- result ---
  function setHp(hp, before) {
    $('res-hp').textContent = hp + ' / 100';
    const fill = $('res-hp-fill');
    fill.style.transition = 'none'; fill.style.width = before + '%';
    setTimeout(() => { fill.style.transition = ''; fill.style.width = hp + '%'; }, 250);
  }
  function logHtml() {
    const g = S.g, who = side => side === 'home' ? S.opp : 'Du', o = E.other;
    const corner = id => id === 'm' ? 'Mitte' : byId(CORNERS, id).name.toLowerCase();
    const res = (side, text) => `<span class="${side === 'you' ? 'gy' : 'gh'}">${text}</span>`;
    let n = 0;
    return g.log.map(l => {
      if (l.so) {
        const e = l.steps[0];
        return `<li><span>Penalty ${who(l.side)}: <b>${esc(last(l.side, l.a))}</b>, ${corner(e.corner)}, Goalie ${e.right ? 'richtig' : 'falsch'}</span><span>${pct(e.p)}% · ${e.ok ? res(l.side, 'Tor') : (e.right ? 'gehalten' : 'daneben')}</span></li>`;
      }
      n++;
      const head = `<li><span>${n}. ${who(l.side)}: <b>${esc(last(l.side, l.a))}</b> gegen <b>${esc(last(o(l.side), l.d))}</b>, ${E.move(l.move).short}${l.read ? ', gelesen' : ''}</span><span></span></li>`;
      const steps = l.steps.map(e => {
        let a = '', b = '';
        if (e.t === 'foul') { a = 'Foul von ' + esc(last(e.side, e.by)) + ': ' + (e.kind === 'penalty' ? 'Penalty' : e.kind === 'twomin' ? '2 Minuten und Freischlag' : 'Freischlag'); b = pct(e.p) + '% Risiko'; }
        else if (e.t === 's1') {
          const mods = (e.pp ? ', Überzahl' : '') + (e.pressing ? ', Pressing' : '') + (e.pull ? ', ohne Goalie' : '');
          a = 'Stufe 1' + mods + ': ' + (e.ok ? (e.read ? 'trotzdem durch' : 'vorbei') : { direkt: 'geblockt', kombi: 'Pass abgefangen', solo: 'Ball gestohlen' }[e.move]); b = pct(e.p) + '% durch';
        }
        else if (e.t === 'counter') { a = 'Konter ' + who(e.side) + ': ' + esc(last(e.side, e.x)) + (e.src === 'catch' ? ', Goalie fängt' : '') + (e.empty ? ', leeres Tor' : ''); b = pct(e.p) + '% Konter'; }
        else if (e.t === 'free') { a = 'Freischlag ' + who(e.side) + ': ' + esc(last(e.side, e.x)) + (e.short ? ', kurz gespielt' : ', direkt'); }
        else if (e.t === 's2') { a = 'Stufe 2: ' + (e.ok ? 'aufs Tor' : { wide: 'daneben', high: 'drüber', post: 'Pfosten' }[e.miss]); b = pct(e.p) + '% aufs Tor'; }
        else if (e.t === 's3') { a = 'Stufe 3: ' + (e.ok ? res(e.side, e.empty ? 'Tor ins leere Tor' : 'Tor') : 'Parade'); b = e.empty ? 'kein Goalie' : pct(e.p) + '% Tor'; }
        else if (e.t === 'pen') { a = 'Penalty ' + who(e.side) + ': ' + corner(e.corner) + ', Goalie ' + (e.right ? 'richtig' : 'falsch') + ', ' + (e.ok ? res(e.side, 'Tor') : (e.right ? 'gehalten' : 'daneben')); b = pct(e.p) + '% Tor'; }
        else if (e.t === 'ppend') { a = 'Tor in Überzahl: Strafe gegen ' + esc(last(e.side, e.x)) + ' beendet'; }
        return `<li class="sub"><span>${a}</span><span>${b}</span></li>`;
      }).join('');
      return head + steps;
    }).join('');
  }
  function finish() {
    const g = S.g, h = S.hall, y = g.score.you, o = g.score.home, outcome = g.outcome, won = outcome === 'win' || outcome === 'penwin';
    const r = World.applyResult(W, h.id, outcome, g.score), f = r.factor; W = r.world;
    const hp = hallState(h.id).hp;
    let title, cls, scoreText = y + ':' + o;
    if (g.pen) {
      title = won ? 'Sieg nach Penaltys' : 'Niederlage nach Penaltys'; cls = won ? 'win' : 'loss';
      scoreText = (y + (won ? 1 : 0)) + ':' + (o + (won ? 0 : 1));
    } else { title = won ? 'Sieg' : 'Niederlage'; cls = won ? 'win' : 'loss'; }
    COLLECTION.forEach(c => { const m = card('you', c.id); c.stam = m ? Math.min(100, m.stam + 45) : 100; c.box = 0; });
    const why = f.matchday ? ' (Spieltag vor Ort, doppelter Schaden)' : f.near ? '' : f.reclaim ? ' (Zurückerobern, voller Schaden)' : ' (Fernangriff, halber Schaden)';
    let text;
    if (r.conquered) text = 'Halle erobert. ' + World.club(W.club).name + ' hält jetzt ' + h.name + ' mit ' + hp + ' Stärke. Stationiere eine Karte, damit sie nicht gleich wieder fällt.';
    else if (won) text = 'Du nimmst der Halle ' + (-r.delta) + ' Stärke' + why + '. Es fehlen noch ' + hp + ' bis zur Eroberung.';
    else if (outcome === 'penloss') text = S.opp + ' rettet sich im Penaltyschiessen. Die Halle bleibt unverändert.';
    else text = r.delta > 0 ? S.opp + ' verteidigt die Halle. Sie erholt sich um ' + r.delta + ' Stärke.' : S.opp + ' verteidigt die Halle. Sie bleibt bei voller Stärke.';
    $('res-hall').textContent = h.name;
    $('res-title').textContent = title; $('res-title').className = 'res-title ' + cls;
    $('res-score').textContent = scoreText;
    $('res-sub').textContent = 'Du gegen ' + S.opp + (g.pen ? ', Penaltys ' + g.pen.you + ':' + g.pen.home : '');
    $('res-delta').textContent = r.conquered ? 'Halle erobert' : (r.delta === 0 ? 'Keine Veränderung' : (r.delta < 0 ? '−' + (-r.delta) + ' Stärke' : '+' + r.delta + ' Stärke'));
    $('res-text').textContent = text;
    const reward = won && !r.conquered;
    $('reward').hidden = !reward; $('res-actions').hidden = reward;
    $('rw-dmg-val').textContent = '−' + World.bonusValue(W, h.id);
    $('btn-again').textContent = isMine(h.id) ? 'Karte stationieren' : 'Nochmals angreifen';
    $('log').innerHTML = logHtml();
    S.phase = 'idle'; Scene.clear(); $('flash').hidden = true;
    setHp(hp, r.before); show('result');
  }
  function takeReward(kind) {
    const h = S.hall;
    if (kind === 'dmg') {
      const r = World.bonusDamage(W, h.id); W = r.world;
      const hp = hallState(h.id).hp;
      $('res-text').textContent = r.conquered ? 'Nachgesetzt. Halle erobert, ' + World.club(W.club).name + ' hält jetzt ' + h.name + ' mit ' + hp + ' Stärke. Stationiere eine Karte, damit sie nicht gleich wieder fällt.'
        : 'Nachgesetzt. Es fehlen noch ' + hp + ' Stärke bis zur Eroberung.';
      $('res-delta').textContent = r.conquered ? 'Halle erobert' : '−' + (-r.delta) + ' Stärke zusätzlich';
      setHp(hp, r.before);
    } else {
      COLLECTION.forEach(c => { c.stam = 100; });
      $('res-text').textContent = 'Alle deine Karten sind wieder bei voller Ausdauer.';
    }
    $('reward').hidden = true; $('res-actions').hidden = false;
    $('btn-again').textContent = isMine(h.id) ? 'Karte stationieren' : 'Nochmals angreifen';
  }

  // --- wiring ---
  $('halls').addEventListener('click', e => {
    const a = e.target.closest('button[data-hall]'), v = e.target.closest('button[data-view]');
    if (a) openSquad(a.getAttribute('data-hall')); else if (v) openHall(v.getAttribute('data-view'));
  });
  $('club-list').addEventListener('click', e => { const b = e.target.closest('button[data-club]'); if (b && !b.disabled) pickClub(b.getAttribute('data-club')); });
  $('btn-club-back').addEventListener('click', () => { renderMap(); show('map'); });
  $('btn-switch').addEventListener('click', () => { if (World.canSwitch(W)) openClub(); });
  $('btn-table').addEventListener('click', openTable);
  $('btn-table-back').addEventListener('click', () => { renderMap(); show('map'); });
  $('btn-hall-back').addEventListener('click', () => { renderMap(); show('map'); });
  $('btn-hall-attack').addEventListener('click', () => openSquad(S.view));
  $('hv-cards').addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b && !b.disabled) stationCard(b.getAttribute('data-id')); });
  $('btn-withdraw').addEventListener('click', withdrawCard);
  $('btn-sim-attack').addEventListener('click', simAttack);
  $('sq-grid').addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b) toggleSquad(b.getAttribute('data-id')); });
  $('sq-cap').addEventListener('click', e => { const b = e.target.closest('button[data-cap]'); if (b) { S.capId = b.getAttribute('data-cap'); renderSquad(); } });
  $('btn-kickoff').addEventListener('click', () => { if (S.squad.length === 6) startMatch(); });
  $('btn-back-map').addEventListener('click', () => { renderMap(); show('map'); });
  $('hand').addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b && !b.disabled) pickCard(b.getAttribute('data-id')); });
  $('opts').addEventListener('click', e => { const b = e.target.closest('button[data-opt]'); if (b) pickOption(b.getAttribute('data-opt')); });
  $('tactics').addEventListener('click', e => { const b = e.target.closest('button[data-tac]'); if (b && !b.disabled) playTactic(b.getAttribute('data-tac')); });
  $('btn-recard').addEventListener('click', recard);
  $('btn-next').addEventListener('click', goOn);
  $('rink').addEventListener('click', skip);
  $('dialog').addEventListener('click', e => { if (!e.target.closest('button')) skip(); });
  $('rw-dmg').addEventListener('click', () => takeReward('dmg'));
  $('rw-rest').addEventListener('click', () => takeReward('rest'));
  $('btn-again').addEventListener('click', () => { if (isMine(S.hall.id)) openHall(S.hall.id); else openSquad(S.hall.id); });
  $('btn-map').addEventListener('click', () => { renderMap(); show('map'); });
  $('btn-reset').addEventListener('click', () => {
    W = World.create();
    COLLECTION.forEach(c => { c.stam = 100; c.box = 0; c.cap = false; });
    S.squad = []; S.capId = null; openClub();
  });
  openClub();
})();
