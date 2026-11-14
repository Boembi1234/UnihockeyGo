/* Shop, Packs und Team: Oberfläche. Rechnet nichts selbst aus, sondern zeigt, was HKClub zurückgibt.
   Stellt window.HKStore bereit, damit das Match die Linie lesen und Münzen gutschreiben kann. */
(function () {
  'use strict';
  const E = window.HK, M = window.HKMatch, C = window.HKClub;
  const $ = id => document.getElementById(id);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const rng = E.makeRng((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0);
  let store = null; try { store = window.localStorage; } catch (e) { store = null; }
  const mem = { getItem: () => null, setItem: () => {} };
  let st = C.load(store || mem, Math.floor(Math.random() * 1e9));
  let filter = 'all', slot = null, back = 'intro', listeners = [];
  const set = s => { st = s; C.save(store || mem, st); badges(); listeners.forEach(f => f(st)); };

  // --- Bildschirme ---
  function show(name) { document.querySelectorAll('#app > section.screen').forEach(s => { s.hidden = s.id !== 'screen-' + name; }); window.scrollTo(0, 0); }
  const COIN = '<svg class="coin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#f7d774" stroke="#9c6a14" stroke-width="1.5"/><circle cx="10" cy="10" r="5.6" fill="none" stroke="#9c6a14" stroke-width="1.3"/></svg>';
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '’');
  function badges() { document.querySelectorAll('[data-coins]').forEach(el => { el.innerHTML = COIN + '<b>' + fmt(st.coins) + '</b>'; }); }

  // --- Karte ---
  const avg = (...v) => Math.round(v.reduce((a, b) => a + b, 0) / v.length);
  function stats(c) {
    return c.pos === 'DEF' ? [['ABW', Math.round(0.6 * c.exp + 0.4 * c.clu)], ['PAS', c.ply], ['ZWK', Math.round(0.7 * c.frm + 0.3 * c.fai)]]
      : [['SCH', c.sco], ['PAS', c.ply], ['DRI', avg(c.frm, c.clu)]];
  }
  const FACE = '<svg class="hc-face" viewBox="0 0 100 80" aria-hidden="true"><circle cx="50" cy="28" r="17"/><path d="M14 80 C 16 56, 32 47, 50 47 C 68 47, 84 56, 86 80 Z"/></svg>';
  function cardHtml(id, o) {
    const c = C.get(id); if (!c) return '';
    const r = C.rarity(c), t = M.trait(c), opt = o || {};
    return `<div class="hc ${r}${opt.cls ? ' ' + opt.cls : ''}" data-card="${c.id}">
      <div class="hc-in">
        <div class="hc-top"><b>${c.ovr}</b><span>${c.pos === 'DEF' ? 'VER' : 'STU'}</span></div>
        ${FACE}
        <div class="hc-name">${esc(c.last)}</div>
        <div class="hc-team">${esc(c.short)}</div>
        <div class="hc-st">${stats(c).map(s => `<span><b>${s[1]}</b>${s[0]}</span>`).join('')}</div>
        ${t ? `<i class="hc-tr">${esc(M.TRAITS[t].name)}</i>` : ''}
      </div>${opt.badge || ''}</div>`;
  }

  // --- Shop ---
  const PACKART = { basis: 'pk-basis', premium: 'pk-premium', star: 'pk-star' };
  function packHtml(p, big) {
    return `<div class="pack ${PACKART[p.id]}${big ? ' big' : ''}"><div class="pack-top"><span>PLAYMAKERZ</span></div><div class="pack-body"><b>${esc(p.name)}</b><span>${p.n} Karten</span></div></div>`;
  }
  function renderStore() {
    $('packs').innerHTML = C.PACKS.map(p => `<div class="shop-row">${packHtml(p)}<div class="shop-info"><b>${esc(p.name)}-Pack</b><span>${esc(p.note)}</span>
      <span class="odds">Pro Karte: Gold ${Math.round(p.odds.gold * 100)} %, Silber ${Math.round(p.odds.silver * 100)} %</span>
      <button type="button" class="buy" data-pack="${p.id}"${st.coins < p.price ? ' disabled' : ''}>${COIN}<b>${fmt(p.price)}</b></button></div></div>`).join('');
    $('store-own').textContent = `${st.owned.length} von ${C.POOL.length} Spielern gesammelt, ${st.opened || 0} Packs geöffnet.`;
    badges();
  }

  // --- Team ---
  const lineSorted = () => C.lineCards(st).sort((a, b) => (a.pos === b.pos ? b.ovr - a.ovr : a.pos === 'ATT' ? -1 : 1));
  function renderTeam() {
    const line = lineSorted();
    $('team-ovr').textContent = C.teamOvr(st.lineup);
    $('team-line').innerHTML = line.map(c => `<button type="button" class="slot${slot === c.id ? ' on' : ''}" data-slot="${c.id}" aria-pressed="${slot === c.id}">${cardHtml(c.id)}</button>`).join('');
    $('team-hint').textContent = slot ? `Wähle eine Karte für ${C.get(slot).last}.` : 'Tippe auf einen Platz und dann auf eine Karte. Oder tippe direkt auf eine Karte: sie ersetzt die schwächste ihrer Position.';
    const bestIds = C.best(st.owned), better = C.teamOvr(bestIds) > C.teamOvr(st.lineup) || bestIds.some(id => st.lineup.indexOf(id) < 0) && C.lineCards(st).reduce((a, c) => a + c.ovr, 0) < bestIds.map(C.get).reduce((a, c) => a + c.ovr, 0);
    $('btn-best').disabled = !better;
    const pos = slot ? C.get(slot).pos : null;
    const list = st.owned.map(C.get).filter(c => c && (filter === 'all' || c.pos === filter) && (!pos || c.pos === pos)).sort((a, b) => b.ovr - a.ovr);
    document.querySelectorAll('#team-filter [data-f]').forEach(b => { b.classList.toggle('on', b.dataset.f === filter); b.setAttribute('aria-pressed', b.dataset.f === filter); });
    $('team-count').textContent = `${st.owned.length} Karten`;
    $('team-all').innerHTML = list.map(c => {
      const inLine = st.lineup.indexOf(c.id) >= 0;
      return `<button type="button" class="pick-card${inLine ? ' inline' : ''}" data-pick="${c.id}"${inLine ? ' disabled' : ''}>${cardHtml(c.id, { badge: inLine ? '<em class="hc-flag">In der Linie</em>' : '' })}</button>`;
    }).join('') || '<p class="note">Keine Karten.</p>';
    badges();
  }

  // --- Pack öffnen ---
  const T = t => (reduce ? 0 : t);
  const sleep = t => new Promise(r => setTimeout(r, T(t)));
  const anim = (el, frames, o) => { if (!el) return Promise.resolve(); const a = el.animate(frames, Object.assign({ fill: 'forwards', easing: 'cubic-bezier(.2,.7,.2,1)' }, o, { duration: Math.max(1, T((o && o.duration) || 300)) })); return a.finished.catch(() => {}); };
  let P = null;   // laufendes Pack: { res, taps, flipped, busy }
  async function openPack(id) {
    const before = st.lineup.slice(), res = C.open(st, id, rng);
    if (!res.ok) return;
    set(res.state);
    P = { res, taps: 0, flipped: 0, busy: false, before };
    const ov = $('packov'), top = res.cards.reduce((m, c) => (c.rarity === 'gold' ? 'gold' : c.rarity === 'silver' && m !== 'gold' ? 'silver' : m), 'bronze');
    P.top = top;
    ov.className = 'packov'; ov.hidden = false; document.body.classList.add('lock');
    $('po-stage').innerHTML = `<div class="po-glow" id="po-glow"></div>${packHtml(res.pack, true)}`;
    $('po-cards').innerHTML = ''; $('po-cards').hidden = true; $('po-done').hidden = true; $('po-all').hidden = true;
    $('po-say').textContent = 'Tippe aufs Pack, um es aufzureissen';
    const pk = $('po-stage').querySelector('.pack');
    await anim(pk, [{ transform: 'translateY(60px) scale(.6) rotate(-8deg)', opacity: 0 }, { transform: 'translateY(-10px) scale(1.04) rotate(2deg)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 650 });
    if (!reduce) pk.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }], { duration: 1800, iterations: Infinity, easing: 'ease-in-out' });
    if (reduce) { await tear(); }
  }
  async function tapPack() {
    if (!P || P.busy || P.torn) return;
    P.busy = true; P.taps++;
    const pk = $('po-stage').querySelector('.pack'), glow = $('po-glow'), k = P.taps;
    pk.getAnimations().forEach(a => a.cancel());
    if (k < 3) {
      // Schütteln, immer stärker; beim zweiten Tippen verrät das Leuchten die beste Seltenheit
      const a = 4 + k * 5;
      if (k === 2) { glow.className = 'po-glow ' + P.top; anim(glow, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 500 }); }
      pk.style.setProperty('--crack', k);
      pk.classList.add('crack' + k);
      $('po-say').textContent = k === 1 ? 'Noch einmal …' : P.top === 'gold' ? 'Da leuchtet etwas Goldenes …' : 'Noch einmal, dann ist es offen';
      await anim(pk, [0, 1, 2, 3, 4, 5, 6].map(i => ({ transform: `rotate(${i % 2 ? a : -a}deg) translateX(${i % 2 ? a : -a}px) scale(${1 + k * 0.03})` })).concat([{ transform: `scale(${1 + k * 0.03})` }]), { duration: 420, easing: 'linear' });
      P.busy = false; return;
    }
    await tear(); P.busy = false;
  }
  async function tear() {
    P.torn = true;
    const pk = $('po-stage').querySelector('.pack'), topEl = pk.querySelector('.pack-top'), body = pk.querySelector('.pack-body');
    $('po-say').textContent = '';
    $('po-flash').className = 'po-flash ' + P.top;
    anim($('po-flash'), [{ opacity: 0 }, { opacity: 0.95, offset: 0.25 }, { opacity: 0 }], { duration: 700, easing: 'ease-out' });
    anim(topEl, [{ transform: 'none' }, { transform: 'translate(70px,-180px) rotate(38deg)', opacity: 0 }], { duration: 650, easing: 'cubic-bezier(.3,.6,.4,1)' });
    await anim(body, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(240px) scale(.9)', opacity: 0 }], { duration: 600, delay: T(180), easing: 'ease-in' });
    $('po-stage').innerHTML = '';
    // Karten fliegen verdeckt heraus
    const box = $('po-cards');
    box.innerHTML = P.res.cards.map((c, i) => `<button type="button" class="flip ${c.rarity}" data-i="${i}" aria-label="Karte ${i + 1} aufdecken"><span class="flip-in"><span class="back"><b>PLAYMAKERZ</b></span><span class="front">${cardHtml(c.id, { badge: c.dupe ? `<em class="hc-flag dupe">Doppelt +${c.coins}</em>` : '<em class="hc-flag new">Neu</em>' })}</span></span></button>`).join('');
    box.className = 'po-cards n' + P.res.cards.length; box.hidden = false;
    const fl = [...box.querySelectorAll('.flip')];
    await Promise.all(fl.map((el, i) => anim(el, [{ transform: 'translateY(-160px) scale(.4) rotate(' + (i * 9 - 18) + 'deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, delay: T(i * 110), easing: 'cubic-bezier(.2,.9,.3,1.2)' })));
    $('po-say').textContent = 'Tippe die Karten an';
    $('po-all').hidden = false;
    if (reduce) { for (let i = 0; i < fl.length; i++) await flip(i); }
  }
  async function flip(i) {
    const el = $('po-cards').querySelector(`.flip[data-i="${i}"]`); if (!el || el.classList.contains('open') || el.classList.contains('busy')) return;
    const c = P.res.cards[i]; el.classList.add('busy');
    const inner = el.querySelector('.flip-in');
    if (c.rarity === 'gold') {
      // Spannung: die Karte zittert und leuchtet golden, bevor sie sich dreht
      el.classList.add('tease');
      await anim(inner, [0, 1, 2, 3, 4, 5, 6, 7, 8].map(k => ({ transform: `translateX(${k % 2 ? 3 : -3}px) scale(${1 + k * 0.012})` })), { duration: 800, easing: 'linear' });
    }
    el.classList.add('open');
    await anim(inner, [{ transform: 'rotateY(0deg) scale(' + (c.rarity === 'gold' ? 1.1 : 1) + ')' }, { transform: 'rotateY(180deg) scale(' + (c.rarity === 'gold' ? 1.18 : 1.06) + ')', offset: 0.6 }, { transform: 'rotateY(180deg) scale(1)' }], { duration: c.rarity === 'gold' ? 900 : 560 });
    if (c.rarity !== 'bronze') burst(el, c.rarity);
    el.classList.remove('busy');
    P.flipped++;
    const card = C.get(c.id);
    $('po-say').textContent = `${card.first} ${card.last}, ${card.ovr}` + (c.dupe ? ` (doppelt, +${c.coins} Münzen)` : '');
    if (P.flipped === P.res.cards.length) done();
  }
  function burst(el, r) {
    if (reduce) return;
    const b = document.createElement('span'); b.className = 'burst ' + r; el.appendChild(b);
    anim(b, [{ transform: 'scale(.3) rotate(0deg)', opacity: 1 }, { transform: 'scale(1.6) rotate(40deg)', opacity: 0 }], { duration: r === 'gold' ? 1100 : 700, easing: 'ease-out' }).then(() => b.remove());
  }
  function done() {
    $('po-all').hidden = true;
    const bestIds = C.best(st.owned), now = C.teamOvr(st.lineup), nb = C.teamOvr(bestIds);
    const gain = bestIds.some(id => st.lineup.indexOf(id) < 0) && bestIds.map(C.get).reduce((a, c) => a + c.ovr, 0) > C.lineCards(st).reduce((a, c) => a + c.ovr, 0);
    $('po-take').hidden = !gain;
    $('po-take').innerHTML = `Neue Karten in die Linie <small>Team ${now} → ${nb}</small>`;
    $('po-say').textContent = gain ? 'Deine Linie wird stärker.' : 'Deine Linie bleibt, wie sie ist.';
    $('po-again').hidden = !C.PACKS.some(p => p.id === P.res.pack.id && st.coins >= p.price);
    $('po-again').innerHTML = `Nochmals ${esc(P.res.pack.name)} ${COIN}<b>${fmt(P.res.pack.price)}</b>`;
    $('po-done').hidden = false;
  }
  function closePack() { $('packov').hidden = true; document.body.classList.remove('lock'); P = null; renderStore(); }

  // --- Verdrahtung ---
  function go(name, from) { if (from) back = from; if (name === 'store') renderStore(); if (name === 'team') { slot = null; renderTeam(); } show(name); }
  document.addEventListener('click', e => {
    const n = e.target.closest('[data-go]'); if (n) { const t = n.dataset.go; if (t === 'back') { show(back); listeners.forEach(f => f(st)); } else go(t, n.dataset.from); }
  });
  $('packs').addEventListener('click', e => { const b = e.target.closest('[data-pack]'); if (b && !b.disabled) openPack(b.dataset.pack); });
  $('po-stage').addEventListener('click', tapPack);
  $('po-cards').addEventListener('click', e => { const b = e.target.closest('.flip'); if (b) flip(+b.dataset.i); });
  $('po-all').addEventListener('click', async () => { $('po-all').hidden = true; for (let i = 0; i < P.res.cards.length; i++) { await flip(i); await sleep(160); } });
  $('po-take').addEventListener('click', () => { set(C.setLine(st, C.best(st.owned))); $('po-take').hidden = true; $('po-say').textContent = 'Neue Linie gesetzt: Team ' + C.teamOvr(st.lineup) + '.'; });
  $('po-again').addEventListener('click', () => { const id = P.res.pack.id; openPack(id); });
  $('po-close').addEventListener('click', closePack);
  $('po-team').addEventListener('click', () => { closePack(); go('team'); });
  $('team-line').addEventListener('click', e => { const b = e.target.closest('[data-slot]'); if (!b) return; slot = slot === b.dataset.slot ? null : b.dataset.slot; renderTeam(); });
  $('team-all').addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (!b || b.disabled) return; set(C.swapIn(st, b.dataset.pick, slot)); slot = null; renderTeam(); });
  $('team-filter').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { filter = b.dataset.f; renderTeam(); } });
  $('btn-best').addEventListener('click', () => { set(C.setLine(st, C.best(st.owned))); slot = null; renderTeam(); });
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
    show, cardHtml, COIN, fmt
  };
})();
