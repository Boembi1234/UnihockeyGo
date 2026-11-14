/* Dein Team: Karten aus Packs, Münzen aus Matches, deine Linie. Reine Logik ohne DOM; gespeichert wird im Browser (localStorage).
   Karten: die 28 Karten aus engine.js und world.js behalten ihre Werte, alle anderen Feldspieler der L-UPL werden aus dem
   Fantasy-Preis abgeleitet (Preis 4 etwa 70, Preis 20.5 etwa 97) mit festen, vom Namen abhängigen Einzelwerten. */
(function (root) {
  'use strict';
  const E = root.HK, W = root.HKWorld;
  const TEAMS = { Z: 'Zug', K: 'Köniz', U: 'Uster', W: 'Wiler', R: 'Rychenberg', T: 'Thurgau', M: 'Malans', L: 'Tigers', G: 'GC', C: 'Chur', J: 'Kloten', S: 'WASA' };
  const RAR = [{ id: 'gold', name: 'Gold', min: 92 }, { id: 'silver', name: 'Silber', min: 85 }, { id: 'bronze', name: 'Bronze', min: 0 }];
  const rarity = c => RAR.find(r => c.ovr >= r.min).id;
  const RNAME = { gold: 'Gold', silver: 'Silber', bronze: 'Bronze' };
  const DUPE = { bronze: 60, silver: 200, gold: 600 };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const plain = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // --- Kartenpool ---
  const known = {};
  E.DATA.collection.concat(...E.DATA.halls.map(h => h.guard)).forEach(c => { known[plain(c.first + ' ' + c.last)] = c; });
  function split(name) {
    const p = name.split(' '); let i = p.length - 1;
    while (i > 1 && /^[a-z]/.test(p[i - 1])) i--;   // «von Pritzbuer»
    return { first: p.slice(0, i).join(' '), last: p.slice(i).join(' ') };
  }
  function build(line) {
    const [name, tp, price] = line.split('|'), team = TEAMS[tp[0]], pos = tp[1] === 'D' ? 'DEF' : 'ATT', k = known[plain(name)];
    if (k) return Object.assign({}, k, { short: team, team: tp[0], price: +price, base: k.id });
    const r = E.makeRng(hash(name)), { first, last } = split(name);
    const ovr = Math.round(clamp(70 + 27 * Math.pow((+price - 4) / 16.5, 0.6) + (r() * 4 - 2), 64, 97));
    const bias = pos === 'DEF' ? [-5, 0, 0, 3, 0, 5] : [3, 1, 0, -2, 1, -3];
    const st = bias.map(b => Math.round(clamp(ovr + b + (r() + r() + r() - 1.5) * 8, 55, 99)));
    const id = 'x' + plain(name).replace(/[^a-z]/g, '');
    return { id, first, last, short: team, team: tp[0], pos, no: null, ovr, sco: st[0], ply: st[1], clu: st[2], fai: st[3], frm: st[4], exp: st[5], stam: 100, box: 0, home: false, cap: false, price: +price };
  }
  const POOL = String(root.HKPool || '').trim().split('\n').map(build);
  const byId = {}; POOL.forEach(c => { byId[c.id] = c; });
  const get = id => byId[id] || null;
  const BUCKET = { gold: [], silver: [], bronze: [] }; POOL.forEach(c => BUCKET[rarity(c)].push(c));

  // --- Packs: Seltenheit pro Karte ziehen, dann eine Karte daraus ---
  const PACKS = [
    { id: 'basis', name: 'Basis', price: 500, n: 3, odds: { gold: 0.03, silver: 0.22 }, sure: null, note: '3 Karten' },
    { id: 'premium', name: 'Premium', price: 1200, n: 4, odds: { gold: 0.1, silver: 0.4 }, sure: 'silver', note: '4 Karten, mind. 1 Silber' },
    { id: 'star', name: 'Star', price: 3000, n: 5, odds: { gold: 0.18, silver: 0.5 }, sure: 'gold', note: '5 Karten, 1 Gold sicher' }
  ];
  const RANK = { bronze: 0, silver: 1, gold: 2 };
  function open(st, packId, rng) {
    const p = PACKS.find(x => x.id === packId);
    if (!p || st.coins < p.price) return { ok: false, state: st };
    const s = JSON.parse(JSON.stringify(st)); s.coins -= p.price; s.opened = (s.opened || 0) + 1;
    const rars = [];
    for (let i = 0; i < p.n; i++) { const x = rng(); rars.push(x < p.odds.gold ? 'gold' : x < p.odds.gold + p.odds.silver ? 'silver' : 'bronze'); }
    if (p.sure && !rars.some(r => RANK[r] >= RANK[p.sure])) rars[0] = p.sure;
    const cards = [], seen = {};
    rars.forEach(r => {
      const b = BUCKET[r].filter(c => !seen[c.id]); const c = b[Math.floor(rng() * b.length)]; seen[c.id] = 1;
      const dupe = s.owned.indexOf(c.id) >= 0;
      if (dupe) s.coins += DUPE[r]; else s.owned.push(c.id);
      cards.push({ id: c.id, rarity: r, dupe, coins: dupe ? DUPE[r] : 0 });
    });
    cards.sort((a, b) => get(a.id).ovr - get(b.id).ovr);   // beste Karte zuletzt
    return { ok: true, state: s, cards, pack: p };
  }

  // --- Linie ---
  const lineCards = st => st.lineup.map(get).filter(Boolean);
  function best(owned) {
    const l = owned.map(get).filter(Boolean).sort((a, b) => b.ovr - a.ovr);
    const att = l.filter(c => c.pos === 'ATT').slice(0, 3), def = l.filter(c => c.pos === 'DEF').slice(0, 2);
    return att.concat(def).map(c => c.id);
  }
  function okLine(ids) { const cs = ids.map(get); return !cs.some(c => !c) && cs.filter(c => c.pos === 'ATT').length === 3 && cs.filter(c => c.pos === 'DEF').length === 2 && new Set(ids).size === 5; }
  function setLine(st, ids) { return okLine(ids) ? Object.assign({}, st, { lineup: ids.slice() }) : st; }
  // Tauscht eine Karte in die Linie: an den gewählten Platz oder für die schwächste Karte derselben Position
  function swapIn(st, id, slotId) {
    const c = get(id); if (!c || st.owned.indexOf(id) < 0 || st.lineup.indexOf(id) >= 0) return st;
    let out = slotId && get(slotId) && get(slotId).pos === c.pos ? slotId : null;
    if (!out) out = lineCards(st).filter(x => x.pos === c.pos).sort((a, b) => a.ovr - b.ovr)[0].id;
    return setLine(st, st.lineup.map(x => (x === out ? id : x)));
  }
  const teamOvr = ids => { const l = ids.map(get).filter(Boolean); return l.length ? Math.round(l.reduce((a, c) => a + c.ovr, 0) / l.length) : 0; };

  // --- Startteam: fünf Bronze-Karten um 74 ---
  function fresh(seed) {
    const r = E.makeRng(seed >>> 0), pick = (pos, n) => {
      const l = POOL.filter(c => c.pos === pos && c.ovr >= 72 && c.ovr <= 77 && !c.base), out = [];
      while (out.length < n) { const c = l[Math.floor(r() * l.length)]; if (out.indexOf(c.id) < 0) out.push(c.id); }
      return out;
    };
    const owned = pick('ATT', 4).concat(pick('DEF', 3));
    return { v: 1, coins: 1500, owned, lineup: best(owned), opened: 0, played: 0, won: 0 };
  }

  // --- Gegner: von schwach bis stark. Köniz, Wiler und GC mit ihrer Hallenwache, WASA und Chur aus dem Pool ---
  const OPPS = [
    { id: 'wasa', code: 'S', win: 400 },
    { id: 'chur', code: 'C', win: 500 },
    { id: 'koeniz', code: 'K', win: 700, guard: true },
    { id: 'wiler', code: 'W', win: 800, guard: true },
    { id: 'gc', code: 'G', win: 900, guard: true }
  ];
  const fill = c => Object.assign({}, c, { stam: 100, box: 0, cap: false, home: false });
  /* Karten des Gegners ohne deine Spieler (wer bei dir spielt, fehlt beim Gegner). Fehlt eine Position, rückt der nächstbeste
     Spieler des Vereins aus dem Pool nach. */
  function oppCards(oppId, mineIds) {
    const o = OPPS.find(x => x.id === oppId), mine = {}; (mineIds || []).map(get).filter(Boolean).forEach(c => { mine[plain(c.first + ' ' + c.last)] = 1; });
    const free = c => !mine[plain(c.first + ' ' + c.last)];
    const team = POOL.filter(c => c.team === o.code && free(c)).sort((a, b) => b.ovr - a.ovr);
    let out = o.guard ? W.guard(W.create(), oppId).filter(free) : [];
    const need = (pos, n) => { while (out.filter(c => c.pos === pos).length < n) { const c = team.find(x => x.pos === pos && !out.some(y => plain(y.last) === plain(x.last) && plain(y.first) === plain(x.first))); if (!c) break; out.push(c); } };
    need('ATT', 3); need('DEF', 2);
    return out.map(fill);
  }
  // Münzen nach dem Match: Sieg je nach Gegner, Niederlage 120, dazu 30 pro eigenes Tor
  const LOSS = 120, GOAL = 30;
  function reward(oppId, won, goals) { const o = OPPS.find(x => x.id === oppId); return (won ? o.win : LOSS) + GOAL * goals; }
  function earn(st, coins, won) { return Object.assign({}, st, { coins: st.coins + coins, played: (st.played || 0) + 1, won: (st.won || 0) + (won ? 1 : 0) }); }

  // --- Speichern ---
  const KEY = 'hk-club-v1';
  function valid(st) { return st && st.v === 1 && Array.isArray(st.owned) && Array.isArray(st.lineup) && typeof st.coins === 'number' && okLine(st.lineup) && st.lineup.every(id => st.owned.indexOf(id) >= 0); }
  function load(store, seed) {
    try { const st = JSON.parse(store.getItem(KEY)); if (valid(st)) { st.owned = st.owned.filter(get); return st; } } catch (e) { /* kein Speicher */ }
    return fresh(seed);
  }
  function save(store, st) { try { store.setItem(KEY, JSON.stringify(st)); } catch (e) { /* kein Speicher: gilt nur bis zum Neuladen */ } }

  root.HKClub = { POOL, get, rarity, RNAME, DUPE, PACKS, BUCKET, open, best, setLine, swapIn, teamOvr, lineCards, fresh, OPPS, oppCards, reward, earn, load, save, KEY };
})(typeof window !== 'undefined' ? window : globalThis);
