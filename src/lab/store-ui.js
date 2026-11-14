/* Shop, Packs und Team: Oberfläche. Rechnet nichts selbst aus, sondern zeigt, was HKClub zurückgibt.
   Stellt window.HKStore bereit, damit das Match die Linie lesen und Münzen gutschreiben kann.
   Ablauf beim Pack: Beutel erscheint → Kante aufreissen (wischen oder tippen) → Karten steigen heraus → jede Karte einzeln
   aufdecken (die beste zuletzt, Silber und Gold mit Ankündigung) → Übersicht. */
(function () {
  'use strict';
  const E = window.HK, M = window.HKMatch, C = window.HKClub;
  const $ = id => document.getElementById(id);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const rng = E.makeRng((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0);
  let store = null; try { store = window.localStorage; } catch (e) { store = null; }
  const mem = { getItem: () => null, setItem: () => {} };
  let st = C.load(store || mem, Math.floor(Math.random() * 1e9));
  let filter = 'all', slot = null, back = 'intro';
  const listeners = [];
  const set = s => { st = s; C.save(store || mem, st); badges(); listeners.forEach(f => f(st)); };

  // --- Bildschirme ---
  function show(name) { document.querySelectorAll('#app > section.screen').forEach(s => { s.hidden = s.id !== 'screen-' + name; }); window.scrollTo(0, 0); }
  const COIN = '<svg class="coin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#f7d774" stroke="#9c6a14" stroke-width="1.5"/><circle cx="10" cy="10" r="5.6" fill="none" stroke="#9c6a14" stroke-width="1.3"/></svg>';
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '’');
  function badges() { document.querySelectorAll('[data-coins]').forEach(el => { el.innerHTML = COIN + '<b>' + fmt(st.coins) + '</b>'; }); }
  const lock = on => document.body.classList.toggle('lock', on);

  // --- Bewegung ---
  const EASE = 'cubic-bezier(.2,.8,.2,1)', SPRING = 'cubic-bezier(.3,1.45,.5,1)';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function anim(el, frames, o) { if (!el) return Promise.resolve(); return el.animate(frames, Object.assign({ fill: 'forwards', easing: EASE, duration: 300 }, o)).finished.catch(() => {}); }
  const still = el => el.getAnimations().forEach(a => a.cancel());
  function buzz(p) { if (reduce || !navigator.vibrate) return; try { navigator.vibrate(p); } catch (e) { /* nicht erlaubt */ } }

  // --- Karte ---
  // Die sechs Werte sind genau die, mit denen das Match rechnet: links Angriff, rechts Abwehr. Anzeige höchstens 99.
  const ICON = {
    shoot: '<svg viewBox="0 0 40 40"><circle class="f" cx="20" cy="33" r="4.2"/><path d="M20 27 V7 M12.5 14 L20 6.5 L27.5 14"/></svg>',
    pass: '<svg viewBox="0 0 40 40"><circle class="f" cx="8" cy="31" r="3.6"/><circle class="f" cx="32" cy="22" r="3.6"/><path d="M11.5 29.5 L27 23.5"/></svg>',
    drib: '<svg viewBox="0 0 40 40"><circle class="f" cx="13" cy="33" r="4.2"/><path d="M15 28 C 33 23, 7 16, 25 7.5 M25 7.5 L18.8 8 M25 7.5 L22.4 13"/></svg>',
    press: '<svg viewBox="0 0 40 40"><path d="M4 20 H16 M11 14.5 L16.5 20 L11 25.5 M36 20 H24 M29 14.5 L23.5 20 L29 25.5"/></svg>',
    block: '<svg viewBox="0 0 40 40"><path d="M7 12 H33 V30 H7 Z M7 21 H33 M15 12 V21 M25 12 V21 M20 21 V30"/></svg>',
    lane: '<svg viewBox="0 0 40 40"><path d="M5 31 L35 9" stroke-dasharray="3.5 4.5"/><path d="M13.5 13.5 L26.5 26.5 M26.5 13.5 L13.5 26.5"/></svg>'
  };
  const STATS = [
    { k: 'SCH', name: 'Schuss', val: c => M.shotVal(c), trait: 'kanone', icon: 'shoot', does: 'schiesst härter und genauer' },
    { k: 'ZWK', name: 'Zweikampf', val: c => M.stanceVal(c, 'zwei'), trait: 'kampf', icon: 'press', does: 'gewinnt mehr Zweikämpfe, wenn er Druck macht' },
    { k: 'PAS', name: 'Pass', val: c => M.passVal(c), trait: 'passer', icon: 'pass', does: 'bringt Pässe sicherer an' },
    { k: 'BLO', name: 'Block', val: c => M.stanceVal(c, 'block'), trait: 'wand', icon: 'block', does: 'blockt mehr Schüsse' },
    { k: 'DRI', name: 'Dribbling', val: c => M.dribVal(c), trait: 'dribbler', icon: 'drib', does: 'kommt im Dribbling öfter vorbei' },
    { k: 'ANT', name: 'Antizipation', val: c => M.stanceVal(c, 'pass'), trait: 'anti', icon: 'lane', does: 'fängt mehr Pässe ab' }
  ];
  const NAT = { SUI: 'Schweiz', SWE: 'Schweden', FIN: 'Finnland', LAT: 'Lettland', CZE: 'Tschechien', SVK: 'Slowakei', GER: 'Deutschland' };
  const shown = v => Math.min(99, Math.round(v));
  const stats = c => STATS.map(s => Object.assign({}, s, { v: shown(s.val(c)) }));
  const serial = c => String(c.serial).padStart(3, '0');
  const posName = c => (c.pos === 'DEF' ? 'Verteidiger' : 'Stürmer');
  function cardHtml(id, o) {
    const c = C.get(id); if (!c) return '';
    const r = C.rarity(c), t = M.trait(c), opt = o || {}, ts = t && STATS.find(s => s.trait === t);
    const img = c.photo ? `<div class="hc-photo s-${c.photo.src}"><img src="${esc(c.photo.url)}" alt="" decoding="async" referrerpolicy="no-referrer"${opt.eager ? '' : ' loading="lazy"'} onerror="this.closest('.hc').classList.add('nophoto')"></div>` : '';
    return `<div class="hc ${r}${c.photo ? '' : ' nophoto'}" data-card="${c.id}"><div class="hc-body"><div class="hc-face">
      <div class="hc-dots"></div><div class="hc-under"></div><div class="hc-mono">${esc(c.first[0] + c.last.replace(/^(von|van|de) /i, '')[0])}</div>${img}
      <div class="hc-tab"><div class="hc-id"><div class="hc-idin"><b>${c.ovr}</b><span>${c.pos === 'DEF' ? 'VER' : 'STU'}</span><i class="fl ${esc(c.nat)}"></i>${ts ? `<em class="hc-ab">${ICON[ts.icon]}</em>` : ''}</div></div></div>
      <div class="hc-panel"></div>
      <div class="hc-ln" style="--len:${c.label.length}">${esc(c.label)}</div>
      <div class="hc-club">${esc(c.short)}${c.no ? ' · ' + c.no : ''}</div>
      <div class="hc-stats">${stats(c).map(s => `<span class="hc-s${s.trait === t ? ' on' : ''}"><b>${s.v}</b><i>${s.k}</i></span>`).join('')}</div>
      <div class="hc-foot">Nº ${serial(c)} · L-UPL 26/27</div>
      <div class="hc-key"></div><div class="hc-holo"></div><div class="hc-glare"></div>
    </div></div></div>`;
  }
  const backHtml = () => '<div class="hc back"><div class="hc-body"><div class="hc-face"><div class="hb-rink"></div><div class="hc-dots"></div><div class="hb-mark"><span>Playmakerz</span></div><div class="hc-key"></div></div></div></div>';

  /* Kippen: Die Karte folgt dem Finger oder der Maus, der Glanz wandert mit. Ohne Berührung pendelt sie langsam.
     box hat die Perspektive, darin dreht sich .tilt-in. Gibt eine Funktion zum Beenden zurück. */
  function tilt(box) {
    const inner = box.querySelector('.tilt-in'), hc = box.querySelector('.hc:not(.back)'); if (!inner || !hc) return () => {};
    const cur = { rx: 0, ry: 0, gx: 30, gy: 20, sh: 0 }, aim = { rx: 0, ry: 0, gx: 30, gy: 20, sh: 0 };
    let live = false, on = true, raf = 0; const t0 = performance.now();
    const put = () => {
      inner.style.transform = `rotateX(${cur.rx.toFixed(2)}deg) rotateY(${cur.ry.toFixed(2)}deg)`;
      hc.style.setProperty('--gx', cur.gx.toFixed(1) + '%'); hc.style.setProperty('--gy', cur.gy.toFixed(1) + '%');
      hc.style.setProperty('--hx', (15 + cur.gx * 0.7).toFixed(1) + '%'); hc.style.setProperty('--hy', (15 + cur.gy * 0.7).toFixed(1) + '%');
      hc.style.setProperty('--sheen', cur.sh.toFixed(2));
    };
    const move = e => { const r = box.getBoundingClientRect(), x = clamp((e.clientX - r.left) / r.width, 0, 1), y = clamp((e.clientY - r.top) / r.height, 0, 1); live = true; aim.rx = (0.5 - y) * 26; aim.ry = (x - 0.5) * 30; aim.gx = x * 100; aim.gy = y * 100; aim.sh = 1; };
    const leave = () => { live = false; };
    const up = e => { if (e.pointerType !== 'mouse') leave(); };
    box.addEventListener('pointermove', move); box.addEventListener('pointerdown', move); box.addEventListener('pointerleave', leave); box.addEventListener('pointerup', up); box.addEventListener('pointercancel', leave);
    function loop(now) {
      if (!on || !box.isConnected) return;
      if (!live) { const t = (now - t0) / 1000; aim.rx = Math.sin(t * 1.15) * 4; aim.ry = Math.sin(t * 0.75) * 11; aim.gx = 50 + Math.sin(t * 0.75) * 44; aim.gy = 36 + Math.cos(t * 1.15) * 22; aim.sh = 0.8; }
      for (const k in cur) cur[k] += (aim[k] - cur[k]) * 0.14;
      put(); raf = requestAnimationFrame(loop);
    }
    if (reduce) { cur.sh = 0.4; put(); } else raf = requestAnimationFrame(loop);
    return () => { on = false; cancelAnimationFrame(raf); box.removeEventListener('pointermove', move); box.removeEventListener('pointerdown', move); box.removeEventListener('pointerleave', leave); box.removeEventListener('pointerup', up); box.removeEventListener('pointercancel', leave); inner.style.transform = ''; };
  }

  // --- Pack als Bild ---
  const PK = { basis: { cls: 'pk-basis', sub: 'Einsteiger' }, premium: { cls: 'pk-premium', sub: 'Silber sicher' }, star: { cls: 'pk-star', sub: 'Gold sicher' } };
  function packHtml(p, live) {
    const strip = cls => `<div class="pk-strip${cls}"><i class="pk-hole"></i><span class="pk-tear">Hier aufreissen</span></div>`;
    return `<div class="pk ${PK[p.id].cls}"><div class="pk-bag"><div class="pk-dots"></div><span class="pk-brand">Playmakerz</span>
      <div class="pk-em"><i></i><i></i><i></i><b>${p.n}</b><span>Karten</span></div>
      <div class="pk-name">${esc(p.name)}</div><div class="pk-sub">${PK[p.id].sub}</div><div class="pk-season">L-UPL 26/27</div>${live ? '<div class="pk-shine"></div>' : ''}</div>
      ${live ? '<div class="pk-leak"></div>' + strip(' on') + strip(' off') : strip('')}</div>`;
  }

  // --- Shop ---
  const pct = x => Math.round(x * 100) + ' %';
  function renderStore() {
    $('packs').innerHTML = C.PACKS.map(p => `<button type="button" class="shelf-it" data-pack="${p.id}"${st.coins < p.price ? ' disabled' : ''} aria-label="${esc(p.name)}-Pack für ${p.price} Münzen aufreissen">${packHtml(p)}
      <span class="shelf-o"><b>${p.n} Karten</b>Gold ${pct(p.odds.gold)}<br>Silber ${pct(p.odds.silver)}</span><span class="price">${COIN}${fmt(p.price)}</span></button>`).join('');
    const short = C.PACKS[0].price - st.coins;
    $('store-own').textContent = `${st.owned.length} von ${C.POOL.length} Spielern gesammelt, ${st.opened || 0} Packs geöffnet.` + (short > 0 ? ` Dir fehlen ${fmt(short)} Münzen fürs nächste Pack: spiel ein Match.` : '');
    badges();
  }

  // --- Team ---
  const lineSorted = () => C.lineCards(st).sort((a, b) => (a.pos === b.pos ? b.ovr - a.ovr : a.pos === 'ATT' ? -1 : 1));
  const sum = ids => ids.map(C.get).filter(Boolean).reduce((a, c) => a + c.ovr, 0);
  const canImprove = () => sum(C.best(st.owned)) > sum(st.lineup);
  function renderTeam() {
    $('team-ovr').textContent = C.teamOvr(st.lineup);
    $('team-line').innerHTML = lineSorted().map(c => `<button type="button" class="tslot${slot === c.id ? ' on' : ''}" data-slot="${c.id}" aria-pressed="${slot === c.id}" aria-label="${esc(c.first + ' ' + c.last)}, ${posName(c)}, ${c.ovr}">${cardHtml(c.id, { eager: 1 })}</button>`).join('');
    $('team-hint').textContent = slot ? `Wähle unten eine Karte für den Platz von ${C.get(slot).last}.` : 'Tippe auf einen Platz, um ihn neu zu besetzen. Tippe auf eine Karte der Sammlung, um sie gross zu sehen.';
    $('btn-best').disabled = !canImprove();
    const pos = slot ? C.get(slot).pos : null;
    const list = st.owned.map(C.get).filter(c => c && (filter === 'all' || c.pos === filter) && (!pos || c.pos === pos)).sort((a, b) => b.ovr - a.ovr);
    document.querySelectorAll('#team-filter [data-f]').forEach(b => { b.classList.toggle('on', b.dataset.f === filter); b.setAttribute('aria-pressed', b.dataset.f === filter); });
    $('team-count').textContent = `${st.owned.length} von ${C.POOL.length}`;
    $('team-all').innerHTML = list.map(c => {
      const inLine = st.lineup.indexOf(c.id) >= 0;
      return `<button type="button" class="pick-card${inLine ? ' inline' : ''}" data-pick="${c.id}" aria-label="${esc(c.first + ' ' + c.last)}, ${posName(c)}, ${c.ovr}${inLine ? ', in der Linie' : ''}">${cardHtml(c.id)}${inLine ? '<em>In der Linie</em>' : ''}</button>`;
    }).join('') || '<p class="note">Keine Karten.</p>';
    badges();
  }

  // --- Kartenblatt ---
  let sheetId = null, sheetStop = null;
  function openSheet(id) {
    const c = C.get(id); if (!c) return;
    const t = M.trait(c), inLine = st.lineup.indexOf(id) >= 0, own = st.owned.indexOf(id) >= 0, ts = t && STATS.find(s => s.trait === t);
    sheetId = id;
    $('sheet-card').innerHTML = `<div class="tilt-in">${cardHtml(id, { eager: 1 })}</div>`;
    $('sheet-name').textContent = c.first + ' ' + c.last;
    $('sheet-meta').textContent = [C.CLUB[c.team], c.no ? 'Nr. ' + c.no : '', NAT[c.nat] || c.nat, c.yob ? 'Jahrgang ' + c.yob : '', C.RNAME[C.rarity(c)]].filter(Boolean).join(' · ');
    const row = s => `<li class="${s.trait === t ? 'on' : ''}"><span>${s.name}</span><b>${s.v}</b><i><u style="width:${clamp((s.v - 50) * 2, 6, 100)}%"></u></i></li>`;
    $('sheet-bars').innerHTML = '<li class="bars-h">Angriff</li><li class="bars-h">Abwehr</li>' + stats(c).map(row).join('');
    $('sheet-trait').hidden = !ts;
    if (ts) $('sheet-trait').innerHTML = `${ICON[ts.icon]}<span><b>${esc(M.TRAITS[t].name)}</b><br>${esc(c.last)} ${ts.does}.</span>`;
    const btn = $('sheet-do'); btn.hidden = !own; btn.disabled = inLine;
    btn.textContent = inLine ? 'Spielt in deiner Linie' : 'In die Linie stellen';
    $('sheet').hidden = false; lock(true);
    if (sheetStop) sheetStop(); sheetStop = tilt($('sheet-card'));
  }
  function closeSheet() { if (sheetStop) { sheetStop(); sheetStop = null; } $('sheet').hidden = true; $('sheet-card').innerHTML = ''; sheetId = null; lock(!$('packov').hidden); }

  // --- Pack öffnen ---
  const ov = $('packov'), stage = $('po-stage');
  let P = null, seq = 0;
  const alive = tok => !!P && P.tok === tok;
  const say = t => { $('po-say').textContent = t; };
  const cap = h => { $('po-cap').innerHTML = h; };
  const tag = c => (c.dupe ? `<span class="tagc dupe">${COIN}Doppelt +${c.coins}</span>` : '<span class="tagc new">Neu</span>');
  const pcEl = i => $('po-deck').querySelector(`.pc[data-i="${i}"]`);
  const count = () => { $('po-count').textContent = P.i < 0 ? P.res.pack.name + '-Pack' : `Karte ${Math.min(P.i + 1, P.n)} von ${P.n}`; };
  const rest = i => `translate(${i * 3}px,${-i * 3}px) rotate(${((i % 2 ? 1 : -1) * i * 0.7).toFixed(2)}deg)`;

  function openPack(id) {
    const res = C.open(st, id, rng); if (!res.ok) return;
    set(res.state);
    if (P && P.stop) P.stop();
    P = { tok: ++seq, res, n: res.cards.length, i: -1, phase: 'pack', top: res.cards[res.cards.length - 1].rarity, tear: 0, busy: false, stop: null, float: null };
    ov.className = 'packov ' + P.top; ov.hidden = false; lock(true); ov.scrollTop = 0;
    $('po-done').hidden = true; cap(''); say(''); count();
    ['po-hints', 'po-deck', 'po-holder'].forEach(k => { $(k).innerHTML = ''; });
    ['po-light', 'po-rays'].forEach(k => { still($(k)); $(k).style.opacity = 0; });
    const tray = $('po-tray'); tray.className = 'po-tray'; tray.innerHTML = res.cards.map(() => '<div class="po-slot"><div class="po-ph"></div></div>').join('');
    if (reduce) { summary(); return; }
    $('po-holder').innerHTML = `<button type="button" class="po-pack" id="po-pack" aria-label="${esc(res.pack.name)}-Pack aufreissen">${packHtml(res.pack, true)}</button><div class="po-hand" id="po-hand"><i></i></div>`;
    wirePack();
    say('Wische über die Kante oder tippe aufs Pack');
    const pk = $('po-pack'), tok = P.tok; pk.focus({ preventScroll: true });
    anim(pk, [{ transform: 'translateY(46px) scale(.8) rotate(-5deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: SPRING }).then(() => {
      if (!alive(tok) || P.phase !== 'pack' || P.tear > 0) return;
      still(pk); P.float = pk.animate([{ transform: 'translateY(0) rotate(-.7deg)' }, { transform: 'translateY(-7px) rotate(.7deg)' }], { duration: 2300, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    });
  }
  function stopFloat() { const pk = $('po-pack'); if (P && P.float) { P.float.cancel(); P.float = null; } if (pk) still(pk); }
  function wirePack() {
    const pk = $('po-pack'); let d = null;
    pk.addEventListener('pointerdown', e => { if (!P || P.phase !== 'pack') return; d = { x: e.clientX, w: pk.offsetWidth, moved: false }; try { pk.setPointerCapture(e.pointerId); } catch (x) { /* ohne Fang */ } });
    pk.addEventListener('pointermove', e => {
      if (!d || !P || P.phase !== 'pack') return;
      const dx = Math.abs(e.clientX - d.x); if (dx > 6 && !d.moved) { d.moved = true; stopFloat(); }
      if (d.moved) setTear(Math.min(1, dx / (d.w * 0.8)));
    });
    const up = () => { if (!d) return; const moved = d.moved; d = null; if (!P || P.phase !== 'pack') return; if (!moved || P.tear > 0.45) finishTear(); else tweenTear(0, 240); };
    pk.addEventListener('pointerup', up); pk.addEventListener('pointercancel', up);
    pk.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && P && P.phase === 'pack') { e.preventDefault(); finishTear(); } });
  }
  // Reisskante: der abgerissene Teil klappt am Riss nach oben, darunter dringt Licht in der Farbe der besten Karte heraus
  function setTear(p) {
    const pk = $('po-pack'); if (!pk || !P) return; P.tear = p;
    const on = pk.querySelector('.pk-strip.on'), off = pk.querySelector('.pk-strip.off'), leak = pk.querySelector('.pk-leak'), x = (p * 100).toFixed(1);
    on.style.clipPath = `inset(0 0 0 ${x}%)`;
    off.style.clipPath = `inset(-80% ${(100 - p * 100).toFixed(1)}% -30% -20%)`;
    off.style.transformOrigin = `${x}% 100%`;
    off.style.transform = `rotate(${(-p * 15).toFixed(2)}deg)`;
    leak.style.width = x + '%'; leak.style.opacity = Math.min(1, p * 2.2).toFixed(2);
    const hand = $('po-hand'); if (hand && p > 0) hand.remove();
  }
  function tweenTear(to, ms) {
    const from = P.tear, t0 = performance.now(), tok = P.tok;
    return new Promise(res => { (function step(now) { if (!alive(tok)) { res(); return; } const k = clamp((now - t0) / ms, 0, 1), e = 1 - Math.pow(1 - k, 3); setTear(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); else res(); })(t0); });
  }
  async function finishTear() {
    const tok = P.tok; P.phase = 'tearing'; stopFloat(); say('');
    await tweenTear(1, 110 + (1 - P.tear) * 380); if (!alive(tok)) return;
    buzz(18);
    const pk = $('po-pack'), off = pk.querySelector('.pk-strip.off');
    anim(off, [{ transform: 'rotate(-15deg)', opacity: 1 }, { transform: 'translate(70px,-170px) rotate(-58deg)', opacity: 0 }], { duration: 560, easing: 'cubic-bezier(.3,.5,.5,1)' });
    anim($('po-light'), [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 0.95, transform: 'scale(.92)', offset: 0.32 }, { opacity: 0.3, transform: 'scale(1)' }], { duration: 950, easing: 'ease-out' });
    $('po-deck').innerHTML = P.res.cards.map((c, i) => `<div class="pc" data-i="${i}" style="z-index:${P.n - i}"><div class="pc-in tilt-in"><div class="pc-back">${backHtml()}</div><div class="pc-front">${cardHtml(c.id, { eager: 1 })}</div></div></div>`).join('');
    // Karten steigen aus dem Beutel, der Beutel fällt weg
    const pcs = [...$('po-deck').children], hw = $('po-deck').offsetWidth, hid = `translateY(${(hw * 0.07).toFixed(1)}px) scale(.84)`;
    pcs.forEach(el => { el.style.transform = hid; });
    P.phase = 'emerge';
    const up = pcs.map((el, i) => anim(el, [{ transform: hid }, { transform: `translateY(${(-hw * 0.62 - i * 7).toFixed(1)}px) scale(.84) rotate(${((i - (P.n - 1) / 2) * 2.6).toFixed(2)}deg)`, offset: 0.52, easing: 'cubic-bezier(.4,0,.2,1)' }, { transform: rest(i) }], { duration: 1000, delay: 120 + i * 50, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' }));
    anim(pk, [{ transform: 'none', opacity: 1 }, { transform: `translateY(${(hw * 1.25).toFixed(1)}px) rotate(5deg)`, opacity: 0 }], { duration: 600, delay: 380, easing: 'cubic-bezier(.5,0,.85,.45)' });
    await Promise.all(up); if (!alive(tok)) return;
    pcs.forEach((el, i) => { still(el); el.style.transform = rest(i); });
    $('po-holder').innerHTML = '';
    anim($('po-light'), [{ opacity: 0.3 }, { opacity: 0.12 }], { duration: 400 });
    P.phase = 'ready'; P.i = 0; count(); say('Tippen zum Aufdecken'); stage.focus({ preventScroll: true });
  }
  function flipCard(pc, c, spins) {
    const inn = pc.querySelector('.pc-in'), ms = spins ? 1150 + spins * 150 : 560, from = pc.style.transform || 'none';
    if (c.rarity !== 'bronze') anim($('po-light'), [{ opacity: 0.12 }, { opacity: spins ? 1 : 0.7, offset: spins ? 0.8 : 0.5 }, { opacity: 0.34 }], { duration: ms + 250, easing: 'ease-out' });
    anim(pc, [{ transform: from }, { transform: 'translateY(-12px) scale(1.06)', offset: 0.45 }, { transform: 'none' }], { duration: ms, easing: EASE }).then(() => { if (pc.isConnected) { still(pc); pc.style.transform = ''; } });
    return anim(inn, [{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${180 + 360 * spins}deg)` }], { duration: ms, easing: spins ? 'cubic-bezier(.1,.7,.15,1)' : 'cubic-bezier(.3,.1,.2,1)' });
  }
  // Ankündigung für die beste Karte ab Silber: erst die Position, bei Gold auch der Verein, dann dreht sie sich
  async function walkout(pc, c, card, tok) {
    const gold = c.rarity === 'gold';
    ov.classList.add('dim'); pc.classList.add('glow'); say(gold ? 'Gold' : 'Silber');
    anim($('po-rays'), [{ opacity: 0, transform: 'scale(.55)' }, { opacity: gold ? 0.6 : 0.3, transform: 'scale(1)' }], { duration: 700 });
    for (const h of gold ? [posName(card), C.CLUB[card.team]] : [posName(card)]) {
      await sleep(520); if (!alive(tok)) return;
      const el = document.createElement('span'); el.className = 'po-hint'; el.textContent = h; $('po-hints').appendChild(el);
      anim(el, [{ transform: 'translateY(10px) scale(.8)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 340, easing: SPRING }); buzz(8);
    }
    await sleep(680); if (!alive(tok)) return;
    pc.classList.remove('glow');
    await flipCard(pc, c, gold ? 2 : 1);
    buzz(gold ? [30, 50, 70] : 22);
  }
  async function reveal(i, tok) {
    const c = P.res.cards[i], card = C.get(c.id), pc = pcEl(i);
    say(''); cap(''); count();
    if (i === P.n - 1 && c.rarity !== 'bronze') await walkout(pc, c, card, tok); else await flipCard(pc, c, 0);
    if (!alive(tok)) return;
    still(pc.querySelector('.pc-in')); pc.classList.add('open');
    P.stop = tilt(pc);
    cap(`<b>${esc(card.first + ' ' + card.last)}</b>${tag(c)}`);
    anim($('po-cap'), [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260 });
    P.phase = 'shown'; say(i < P.n - 1 ? 'Tippen für die nächste Karte' : 'Tippen zum Abschluss');
  }
  // Die aufgedeckte Karte fliegt auf ihren Platz in der Ablage
  async function collect(i, tok) {
    const pc = pcEl(i), slotEl = $('po-tray').children[i], c = P.res.cards[i];
    if (P.stop) { P.stop(); P.stop = null; }
    cap(''); $('po-hints').innerHTML = ''; ov.classList.remove('dim');
    anim($('po-rays'), [{ opacity: 0 }], { duration: 300 });
    const a = pc.getBoundingClientRect(), b = slotEl.getBoundingClientRect();
    await anim(pc, [{ transform: 'none' }, { transform: `translate(${(b.left + b.width / 2 - a.left - a.width / 2).toFixed(1)}px,${(b.top + b.width * 0.7 - a.top - a.height / 2).toFixed(1)}px) scale(${(b.width / a.width).toFixed(3)})` }], { duration: 430, easing: 'cubic-bezier(.5,0,.2,1)' });
    if (!alive(tok)) return;
    slotEl.innerHTML = cardHtml(c.id, { eager: 1 }) + tag(c); pc.remove();
    anim(slotEl.firstElementChild, [{ transform: 'scale(1.14)' }, { transform: 'none' }], { duration: 240 });
  }
  async function advance() {
    if (!P || P.busy) return; const tok = P.tok;
    if (P.phase === 'ready') { P.busy = true; await reveal(P.i, tok); if (alive(tok)) P.busy = false; return; }
    if (P.phase !== 'shown') return;
    P.busy = true; P.phase = 'moving';
    await collect(P.i, tok); if (!alive(tok)) return;
    if (P.i < P.n - 1) { P.i++; await reveal(P.i, tok); if (alive(tok)) P.busy = false; } else summary();
  }
  // Übersicht: die Ablage wird zum Raster, dazu die Knöpfe
  async function summary() {
    if (!P) return; const tok = P.tok = ++seq; P.phase = 'summary'; P.busy = false;
    if (P.stop) { P.stop(); P.stop = null; }
    const tray = $('po-tray'), slots = [...tray.children];
    P.res.cards.forEach((c, i) => { if (!slots[i].querySelector('.hc')) slots[i].innerHTML = cardHtml(c.id, { eager: 1 }) + tag(c); slots[i].dataset.card = c.id; });
    const a = slots.map(s => s.getBoundingClientRect());
    ['po-deck', 'po-holder', 'po-hints'].forEach(k => { $(k).innerHTML = ''; });
    ov.classList.remove('dim'); ov.classList.add('done'); tray.classList.add('sum', 'n' + P.n); ov.scrollTop = 0;
    const fresh = P.res.cards.filter(c => !c.dupe).length, dup = P.res.cards.filter(c => c.dupe), back_ = dup.reduce((x, c) => x + c.coins, 0);
    $('po-title').textContent = P.res.pack.name + '-Pack';
    $('po-sum').textContent = (fresh === 1 ? '1 neue Karte' : fresh + ' neue Karten') + (dup.length ? ` · ${dup.length} doppelt, +${fmt(back_)} Münzen` : '');
    const now = C.teamOvr(st.lineup), bestIds = C.best(st.owned), gain = canImprove();
    $('po-take').hidden = !gain; $('po-take').innerHTML = `Neue Karten in die Linie<small>Team ${now} → ${C.teamOvr(bestIds)}</small>`;
    $('po-again').hidden = st.coins < P.res.pack.price; $('po-again').innerHTML = `Noch ein ${esc(P.res.pack.name)}-Pack ${COIN}${fmt(P.res.pack.price)}`;
    $('po-done').hidden = false;
    if (reduce) return;
    anim($('po-done'), [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 380, fill: 'both' });
    await Promise.all(slots.map((s, i) => { const b = s.getBoundingClientRect(); return anim(s, [{ transform: `translate(${(a[i].left + a[i].width / 2 - b.left - b.width / 2).toFixed(1)}px,${(a[i].top - b.top).toFixed(1)}px) scale(${(a[i].width / b.width).toFixed(3)})`, transformOrigin: '50% 0' }, { transform: 'none', transformOrigin: '50% 0' }], { duration: 520, delay: i * 45, easing: EASE, fill: 'backwards' }); }));
    if (alive(tok)) slots.forEach(still);
  }
  function closePack() { if (P && P.stop) P.stop(); P = null; seq++; ov.hidden = true; ['po-deck', 'po-holder', 'po-tray'].forEach(k => { $(k).innerHTML = ''; }); lock(false); renderStore(); }

  // --- Verdrahtung ---
  function go(name, from) { if (from) back = from; if (name === 'store') renderStore(); if (name === 'team') { slot = null; renderTeam(); } show(name); }
  document.addEventListener('click', e => {
    const n = e.target.closest('[data-go]'); if (!n) return;
    const t = n.dataset.go; if (t === 'back') { show(back); listeners.forEach(f => f(st)); } else go(t, n.dataset.from);
  });
  $('packs').addEventListener('click', e => { const b = e.target.closest('[data-pack]'); if (b && !b.disabled) openPack(b.dataset.pack); });
  let down = null;
  stage.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  stage.addEventListener('pointerup', e => { if (!down) return; const tap = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12 && performance.now() - down.t < 700; down = null; if (tap) advance(); });
  stage.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === stage) { e.preventDefault(); advance(); } });
  $('po-skip').addEventListener('click', () => { if (P && P.phase !== 'summary') summary(); });
  $('po-take').addEventListener('click', () => { set(C.setLine(st, C.best(st.owned))); $('po-take').hidden = true; $('po-sum').textContent = 'Neue Linie gesetzt: Team ' + C.teamOvr(st.lineup) + '.'; });
  $('po-again').addEventListener('click', () => { if (P) openPack(P.res.pack.id); });
  $('po-close').addEventListener('click', closePack);
  $('po-team').addEventListener('click', () => { closePack(); go('team'); });
  $('po-tray').addEventListener('click', e => { const s = e.target.closest('.po-slot[data-card]'); if (s && P && P.phase === 'summary') openSheet(s.dataset.card); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('sheet').hidden) closeSheet(); else if (P && P.phase !== 'summary') summary(); else if (P) closePack();
  });
  $('team-line').addEventListener('click', e => { const b = e.target.closest('[data-slot]'); if (!b) return; slot = slot === b.dataset.slot ? null : b.dataset.slot; renderTeam(); });
  $('team-all').addEventListener('click', e => {
    const b = e.target.closest('[data-pick]'); if (!b) return;
    if (slot && st.lineup.indexOf(b.dataset.pick) < 0) { set(C.swapIn(st, b.dataset.pick, slot)); slot = null; renderTeam(); } else openSheet(b.dataset.pick);
  });
  $('team-filter').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { filter = b.dataset.f; renderTeam(); } });
  $('btn-best').addEventListener('click', () => { set(C.setLine(st, C.best(st.owned))); slot = null; renderTeam(); });
  $('sheet-x').addEventListener('click', closeSheet);
  $('sheet').addEventListener('click', e => { if (e.target === $('sheet')) closeSheet(); });
  $('sheet-do').addEventListener('click', () => { if (!sheetId) return; set(C.swapIn(st, sheetId, slot)); slot = null; closeSheet(); if (!$('screen-team').hidden) renderTeam(); if (P && P.phase === 'summary') { $('po-take').hidden = !canImprove(); } });
  // Nur für die Testversion: Münzen schenken, damit sich Packs ausprobieren lassen
  $('btn-coins').addEventListener('click', () => { set(Object.assign({}, st, { coins: st.coins + 10000 })); renderStore(); });
  let resetArm = 0;
  $('btn-reset').addEventListener('click', () => {
    if (Date.now() - resetArm > 3000) { resetArm = Date.now(); $('btn-reset').textContent = 'Wirklich? Nochmals tippen'; return; }
    set(C.fresh(Math.floor(Math.random() * 1e9))); $('btn-reset').textContent = 'Neu beginnen'; renderStore();
  });
  badges();

  window.HKStore = {
    state: () => st,
    line: () => C.lineCards(st),
    earn: (coins, won) => set(C.earn(st, coins, won)),
    onChange: f => listeners.push(f),
    show, cardHtml, backHtml, packHtml, openSheet, COIN, fmt, ICON, stats
  };
})();
