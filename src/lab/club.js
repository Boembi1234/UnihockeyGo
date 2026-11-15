/* Dein Team: Karten aus Packs, Münzen aus Matches, deine zwei Linien und deine Taktikkarten. Reine Logik ohne DOM; gespeichert wird im Browser (localStorage).
   Karten: die 28 Karten aus engine.js und world.js behalten ihre Werte, alle anderen Feldspieler der L-UPL werden aus dem
   Fantasy-Preis abgeleitet (Preis 4 etwa 70, Preis 20.5 etwa 97) mit festen, vom Namen abhängigen Einzelwerten. */
(function (root) {
  'use strict';
  const E = root.HK, W = root.HKWorld;
  const TEAMS = { Z: 'Zug', K: 'Köniz', U: 'Uster', W: 'Wiler', R: 'Rychenberg', T: 'Thurgau', M: 'Malans', L: 'Tigers', G: 'GC', C: 'Chur', J: 'Kloten', S: 'WASA' };
  const CLUB = { Z: 'Zug United', K: 'Floorball Köniz Bern', U: 'UHC Uster', W: 'SV Wiler-Ersigen', R: 'HC Rychenberg Winterthur', T: 'Floorball Thurgau', M: 'UHC Alligator Malans', L: 'Tigers Langnau', G: 'Grasshopper Club Zürich', C: 'Floorball Chur United', J: 'Kloten-Dietlikon Jets', S: 'WASA St. Gallen' };
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
  // Porträt: Adresse und Quelle. Die Quelle steuert den Bildausschnitt auf der Karte.
  function photo(spec) {
    if (!spec) return null;
    if (/^[a-z0-9]{20}$/.test(spec)) return { src: 'c', url: 'https://res.cloudinary.com/swiss-unihockey/image/upload/t_player_portrait_01/' + spec + '.jpg' };
    if (spec.indexOf('g:') === 0) return { src: 'g', url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:' + spec.slice(2) };
    if (spec.indexOf('r:') === 0) return { src: 'r', url: 'https://www.hcrychenberg.ch/fileadmin/_processed_/' + spec.slice(2) };
    return /^https:\/\//.test(spec) ? { src: 'x', url: spec } : null;
  }
  function build(line, i) {
    const [name, tp, price, nat, no, yob, img] = line.split('|'), team = TEAMS[tp[0]], pos = tp[1] === 'D' ? 'DEF' : 'ATT', k = known[plain(name)];
    const extra = { short: team, team: tp[0], price: +price, nat: nat || 'SUI', yob: yob ? +yob : null, photo: photo(img), serial: i + 1 };
    if (k) return Object.assign({}, k, extra, { base: k.id, no: k.no || (no ? +no : null) });
    const r = E.makeRng(hash(name)), { first, last } = split(name);
    const ovr = Math.round(clamp(70 + 27 * Math.pow((+price - 4) / 16.5, 0.6) + (r() * 4 - 2), 64, 97));
    const bias = pos === 'DEF' ? [-5, 0, 0, 3, 0, 5] : [3, 1, 0, -2, 1, -3];
    const st = bias.map(b => Math.round(clamp(ovr + b + (r() + r() + r() - 1.5) * 8, 55, 99)));
    const id = 'x' + plain(name).replace(/[^a-z]/g, '');
    return Object.assign({ id, first, last, pos, no: no ? +no : null, ovr, sco: st[0], ply: st[1], clu: st[2], fai: st[3], frm: st[4], exp: st[5], stam: 100, box: 0, home: false, cap: false }, extra);
  }
  const POOL = String(root.HKPool || '').trim().split('\n').map(build);
  // Gleiche Nachnamen (Graf, Fitzi, Hocevar ...) bekommen auf der Karte die Initiale dazu
  const lastCount = {}; POOL.forEach(c => { lastCount[c.last] = (lastCount[c.last] || 0) + 1; });
  POOL.forEach(c => { c.label = (lastCount[c.last] > 1 ? c.first[0] + '. ' : '') + c.last; });
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

  // --- Linien: zwei zu je drei Stürmern und zwei Verteidigern. lineup ist die erste Linie, line2 die zweite. ---
  const lineCards = st => st.lineup.map(get).filter(Boolean);
  const line2Cards = st => (st.line2 || []).map(get).filter(Boolean);
  function best(owned) {
    const l = owned.map(get).filter(Boolean).sort((a, b) => b.ovr - a.ovr);
    const att = l.filter(c => c.pos === 'ATT').slice(0, 3), def = l.filter(c => c.pos === 'DEF').slice(0, 2);
    return att.concat(def).map(c => c.id);
  }
  // Beste Aufstellung: die stärksten fünf in die erste Linie, die nächsten fünf in die zweite
  function bestLines(owned) { const l1 = best(owned); return { lineup: l1, line2: best(owned.filter(id => l1.indexOf(id) < 0)) }; }
  function okLine(ids) { const cs = ids.map(get); return !cs.some(c => !c) && cs.filter(c => c.pos === 'ATT').length === 3 && cs.filter(c => c.pos === 'DEF').length === 2 && new Set(ids).size === 5; }
  const okLines = (l1, l2) => Array.isArray(l1) && Array.isArray(l2) && okLine(l1) && okLine(l2) && new Set(l1.concat(l2)).size === 10;
  function setLines(st, l1, l2) { return okLines(l1, l2) ? Object.assign({}, st, { lineup: l1.slice(), line2: l2.slice() }) : st; }
  const setBest = st => { const b = bestLines(st.owned); return setLines(st, b.lineup, b.line2); };
  /* Stellt eine Karte auf: an den gewählten Platz oder für die schwächste Karte derselben Position. Steht die Karte schon in
     einer Linie, tauschen die beiden die Plätze. */
  function swapIn(st, id, slotId) {
    const c = get(id); if (!c || st.owned.indexOf(id) < 0) return st;
    const lined = st.lineup.concat(st.line2), here = lined.indexOf(id) >= 0;
    let out = slotId && get(slotId) && get(slotId).pos === c.pos && lined.indexOf(slotId) >= 0 ? slotId : null;
    if (!out) { if (here) return st; out = lined.map(get).filter(x => x.pos === c.pos).sort((a, b) => a.ovr - b.ovr)[0].id; }
    if (out === id) return st;
    const put = l => l.map(x => (x === out ? id : x === id ? out : x));
    return setLines(st, put(st.lineup), put(st.line2));
  }
  const teamOvr = ids => { const l = ids.map(get).filter(Boolean); return l.length ? Math.round(l.reduce((a, c) => a + c.ovr, 0) / l.length) : 0; };

  // --- Taktikkarten: drei zum Start, die anderen gibt es im Shop. Bis zu drei kommen mit ins Match. ---
  const TAC = [{ id: 'timeout', price: 0 }, { id: 'press', price: 0 }, { id: 'play', price: 0 }, { id: 'calm', price: 900 }, { id: 'wall', price: 1400 }, { id: 'empty', price: 2000 }];
  const START_TAC = TAC.filter(t => !t.price).map(t => t.id);
  function buyTac(st, id) {
    const t = TAC.find(x => x.id === id); if (!t || st.tacOwned.indexOf(id) >= 0 || st.coins < t.price) return st;
    const tac = st.tac.length < 3 ? st.tac.concat(id) : st.tac;
    return Object.assign({}, st, { coins: st.coins - t.price, tacOwned: st.tacOwned.concat(id), tac });
  }
  // Wählt eine Karte fürs Match an oder ab. Sind schon drei gewählt, fällt die zuerst gewählte heraus.
  function toggleTac(st, id) {
    if (st.tacOwned.indexOf(id) < 0) return st;
    const cur = st.tac.slice(), i = cur.indexOf(id);
    if (i >= 0) cur.splice(i, 1); else { if (cur.length >= 3) cur.shift(); cur.push(id); }
    return Object.assign({}, st, { tac: cur });
  }

  // --- Startteam: erste Linie um 77, zweite Linie um 72, alles Bronze ---
  function starters(r, pos, n, lo, hi, skip) {
    const l = POOL.filter(c => c.pos === pos && c.ovr >= lo && c.ovr <= hi && !c.base && skip.indexOf(c.id) < 0), out = [];
    while (out.length < n && out.length < l.length) { const c = l[Math.floor(r() * l.length)]; if (out.indexOf(c.id) < 0) out.push(c.id); }
    return out;
  }
  function fresh(seed) {
    const r = E.makeRng(seed >>> 0);
    const l1 = starters(r, 'ATT', 3, 75, 79, []).concat(starters(r, 'DEF', 2, 75, 79, [])), l2 = starters(r, 'ATT', 3, 70, 74, []).concat(starters(r, 'DEF', 2, 70, 74, []));
    return { v: 2, coins: 1500, owned: l1.concat(l2), lineup: l1, line2: l2, tacOwned: START_TAC.slice(), tac: START_TAC.slice(), opened: 0, played: 0, won: 0 };
  }
  // Alter Spielstand mit einer Linie: Die zweite Linie kommt aus der Sammlung; was fehlt, wird mit Bronze-Karten um 72 aufgefüllt.
  function upgrade(st, seed) {
    const r = E.makeRng((seed ^ 0x51ed) >>> 0), s = Object.assign({}, st, { owned: st.owned.filter(get) });
    const rest = () => s.owned.filter(id => s.lineup.indexOf(id) < 0).map(get);
    ['ATT', 'DEF'].forEach(pos => { const need = (pos === 'ATT' ? 3 : 2) - rest().filter(c => c.pos === pos).length; if (need > 0) s.owned = s.owned.concat(starters(r, pos, need, 70, 74, s.owned)); });
    s.line2 = best(s.owned.filter(id => s.lineup.indexOf(id) < 0));
    s.v = 2; s.tacOwned = START_TAC.slice(); s.tac = START_TAC.slice();
    return s;
  }

  // --- Gegner: von schwach bis stark. Köniz, Wiler und GC mit ihrer Hallenwache, WASA und Chur aus dem Pool ---
  const OPPS = [
    { id: 'wasa', code: 'S', win: 400, tac: ['timeout'] },
    { id: 'chur', code: 'C', win: 500, tac: ['timeout', 'press'] },
    { id: 'koeniz', code: 'K', win: 700, guard: true, tac: ['timeout', 'play', 'empty'] },
    { id: 'wiler', code: 'W', win: 800, guard: true, tac: ['timeout', 'press', 'wall'] },
    { id: 'gc', code: 'G', win: 900, guard: true, tac: ['play', 'press', 'empty'] }
  ];
  const fill = c => Object.assign({}, c, { stam: 100, box: 0, cap: false, home: false });
  /* Die zwei Linien des Gegners ohne deine Spieler (wer bei dir spielt, fehlt beim Gegner). Erste Linie: die Hallenwache
     oder die Besten des Vereins. Zweite Linie: die nächsten des Vereins. Fehlt eine Position, rückt der nächstbeste nach. */
  function oppLines(oppId, mineIds) {
    const o = OPPS.find(x => x.id === oppId), mine = {}; (mineIds || []).map(get).filter(Boolean).forEach(c => { mine[plain(c.first + ' ' + c.last)] = 1; });
    const key = c => plain(c.first + ' ' + c.last), free = c => !mine[key(c)];
    const team = POOL.filter(c => c.team === o.code && free(c)).sort((a, b) => b.ovr - a.ovr), spare = POOL.filter(c => c.team !== o.code && free(c) && c.ovr <= 74).sort((a, b) => b.ovr - a.ovr);
    const taken = {}, take = c => { taken[key(c)] = 1; return c; };
    const line = start => {
      const out = start.map(take);
      const need = (pos, n) => { while (out.filter(c => c.pos === pos).length < n) { const c = team.find(x => x.pos === pos && !taken[key(x)]) || spare.find(x => x.pos === pos && !taken[key(x)]); if (!c) break; out.push(take(c)); } };
      need('ATT', 3); need('DEF', 2);
      return out.map(fill);
    };
    const l1 = line(o.guard ? W.guard(W.create(), oppId).filter(free) : []);
    return [l1, line([])];
  }
  const oppCards = (oppId, mineIds) => oppLines(oppId, mineIds)[0];
  const oppTac = oppId => OPPS.find(x => x.id === oppId).tac.slice();
  // Münzen nach dem Match: Sieg je nach Gegner, Niederlage 120, dazu 30 pro eigenes Tor
  const LOSS = 120, GOAL = 30;
  function reward(oppId, won, goals) { const o = OPPS.find(x => x.id === oppId); return (won ? o.win : LOSS) + GOAL * goals; }
  function earn(st, coins, won) { return Object.assign({}, st, { coins: st.coins + coins, played: (st.played || 0) + 1, won: (st.won || 0) + (won ? 1 : 0) }); }

  // --- Speichern ---
  const KEY = 'hk-club-v1';
  const okV1 = st => st && st.v === 1 && Array.isArray(st.owned) && Array.isArray(st.lineup) && typeof st.coins === 'number' && okLine(st.lineup) && st.lineup.every(id => st.owned.indexOf(id) >= 0);
  function valid(st) {
    return st && st.v === 2 && Array.isArray(st.owned) && typeof st.coins === 'number' && okLines(st.lineup, st.line2) && st.lineup.concat(st.line2).every(id => st.owned.indexOf(id) >= 0)
      && Array.isArray(st.tacOwned) && Array.isArray(st.tac) && st.tac.length <= 3 && st.tac.every(id => st.tacOwned.indexOf(id) >= 0) && st.tacOwned.every(id => TAC.some(t => t.id === id));
  }
  function load(store, seed) {
    try {
      let st = JSON.parse(store.getItem(KEY));
      if (okV1(st)) st = upgrade(st, seed);
      if (valid(st)) { st.owned = st.owned.filter(get); return st; }
    } catch (e) { /* kein Speicher */ }
    return fresh(seed);
  }
  function save(store, st) { try { store.setItem(KEY, JSON.stringify(st)); } catch (e) { /* kein Speicher: gilt nur bis zum Neuladen */ } }

  root.HKClub = { POOL, get, rarity, RNAME, CLUB, DUPE, PACKS, BUCKET, open, best, bestLines, setLines, setBest, swapIn, teamOvr, lineCards, line2Cards, TAC, buyTac, toggleTac, fresh, upgrade, valid, OPPS, oppCards, oppLines, oppTac, reward, earn, load, save, KEY };
})(typeof window !== 'undefined' ? window : globalThis);
