/* Hallenkampf Welt: Vereine, Hallenbesitz, Stationierung und Schaden.
   Reine Funktionen wie die Engine: Welt rein, neue Welt raus. Fans und fremde Angriffe sind im Prototyp erfunden.

   Für die echte App gehört alles hier auf den Server (Supabase), weil es über Besitz und Wertung entscheidet:
   - applyResult, bonusDamage, conquer: Hallenstand und Eroberung
   - station, withdraw: Stationierung, inklusive der Sperre für eigene Matches
   - chooseClub: Vereinswahl und der eine Wechsel pro Saison
   - guard: die Hallenwache, gegen die ein Match gerechnet wird
   - matchday kommt dort aus den Spiel- und Venue-Daten von swiss unihockey, simAttack entfällt. */
(function (root) {
  'use strict';
  const E = root.HK, clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const CFG = {
    slots: 6,            // Plätze pro Halle
    perUser: 1,          // Karten pro User und Halle
    conquerHp: 60,       // Stärke nach der Eroberung
    fillerOvr: 70,       // Ersatzkarten in Hallen, die ein fremder Verein hält
    remote: 0.5,         // Fernangriff
    matchday: 2,         // Angriff vor Ort am Spieltag
    switches: 1          // Vereinswechsel pro Saison
  };
  // Herren L-UPL 2026/27, Namen wie in den Spieldaten von swiss unihockey.
  const CLUBS = [
    { id: 'chur', name: 'Floorball Chur United', short: 'Chur' },
    { id: 'koeniz', name: 'Floorball Köniz Bern', short: 'Köniz' },
    { id: 'thurgau', name: 'Floorball Thurgau', short: 'Thurgau' },
    { id: 'gc', name: 'Grasshopper Club Zürich', short: 'GC' },
    { id: 'rychenberg', name: 'HC Rychenberg Winterthur', short: 'Rychenberg' },
    { id: 'jets', name: 'Kloten-Dietlikon Jets', short: 'Jets' },
    { id: 'wiler', name: 'SV Wiler-Ersigen', short: 'Wiler' },
    { id: 'tigers', name: 'Tigers Langnau', short: 'Tigers' },
    { id: 'malans', name: 'UHC Alligator Malans', short: 'Malans' },
    { id: 'uster', name: 'UHC Uster', short: 'Uster' },
    { id: 'wasa', name: 'WASA St. Gallen', short: 'WASA' },
    { id: 'zug', name: 'Zug United', short: 'Zug' }
  ];
  // Erfundene Fans. Jeder hat eine Karte in der Heimhalle seines Vereins stationiert: Köniz 4, Wiler 6, GC 1.
  const FANS = [
    { id: 'k1', name: 'Nico_BE', club: 'koeniz', card: 'zaugg' },
    { id: 'k2', name: 'Lea.K', club: 'koeniz', card: 'jansson' },
    { id: 'k3', name: 'Weissenstein84', club: 'koeniz', card: 'ruh' },
    { id: 'k4', name: 'Simu_3098', club: 'koeniz', card: 'tringaniello' },
    { id: 'w1', name: 'Ersigen4ever', club: 'wiler', card: 'kaenzig' },
    { id: 'w2', name: 'Jana_W', club: 'wiler', card: 'martinjas' },
    { id: 'w3', name: 'Grossmatt', club: 'wiler', card: 'trekse' },
    { id: 'w4', name: 'Luki17', club: 'wiler', card: 'persson' },
    { id: 'w5', name: 'Tom.E', club: 'wiler', card: 'wyss' },
    { id: 'w6', name: 'Kirchberger', club: 'wiler', card: 'hollenstein' },
    { id: 'g1', name: 'Hopper_ZH', club: 'gc', card: 'riedi' }
  ];
  // Karte eines Vereins, die ein erfundener Fan nach einer Eroberung stationiert.
  const CLUB_CARD = { tigers: 'steiner', zug: 'sjogren', uster: 'wilhelmsson', malans: 'kovanen', thurgau: 'mariotti', jets: 'kauppinen', chur: 'mettier', koeniz: 'hutzli', wiler: 'persson', gc: 'bolin' };

  const byId = (list, id) => { for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; };
  const club = id => byId(CLUBS, id);
  const hallData = id => byId(E.DATA.halls, id);
  const fan = id => byId(FANS, id);
  // Erfundene Fans, die nach einer Eroberung auftauchen, heissen nach ihrem Verein.
  const fanName = id => (id === 'me' ? 'Du' : id.indexOf('x-') === 0 ? 'Fan_' + club(id.slice(2)).short : fan(id).name);
  function poolCard(id) {
    let c = byId(E.DATA.collection, id);
    for (let i = 0; !c && i < E.DATA.halls.length; i++) c = byId(E.DATA.halls[i].guard, id);
    return c;
  }
  const copy = w => JSON.parse(JSON.stringify(w));

  // Jede Halle gehört zu Beginn ihrem Heimverein. Die Halle trägt dieselbe Kennung wie der Heimverein.
  function create() {
    const halls = {};
    E.DATA.halls.forEach(h => { halls[h.id] = { owner: h.id, hp: 100, slots: FANS.filter(f => f.club === h.id).map(f => ({ user: f.id, card: f.card })) }; });
    return { season: '2026/27', club: null, switches: 0, halls, matchday: 'koeniz', news: '' };
  }

  // --- Hallenwache ---
  function filler(n, pos, short) {
    const v = CFG.fillerOvr;
    return { id: 'ersatz' + n, first: '', last: 'Ersatz ' + n, short, pos, no: null, ovr: v, sco: v, ply: v, clu: v, fai: v, frm: v, exp: v };
  }
  /* Sechs Verteidiger einer Halle. Stationierte Karten von Fans haben Heimvorteil. Freie Plätze füllt beim Heimverein
     das Heimteam ohne Heimvorteil, bei einem fremden Besitzer füllen Ersatzkarten. by sagt, wem die Karte gehört. */
  function guard(w, hallId) {
    const h = w.halls[hallId], data = hallData(hallId), out = [];
    h.slots.forEach(s => {
      const c = poolCard(s.card); if (!c || byId(out, c.id)) return;
      out.push(Object.assign({}, c, { stam: 100, box: 0, cap: false, home: true, kind: s.user === 'me' ? 'me' : 'fan', by: fanName(s.user) }));
    });
    const need = () => (out.filter(c => c.pos === 'DEF').length < 2 ? 'DEF' : 'ATT');
    if (h.owner === hallId) {
      const rest = data.guard.filter(c => !byId(out, c.id)).sort((a, b) => b.ovr - a.ovr);
      while (out.length < CFG.slots && rest.length) {
        const want = need(), i = Math.max(0, rest.findIndex(c => c.pos === want));
        out.push(Object.assign({}, rest.splice(i, 1)[0], { stam: 100, box: 0, cap: false, home: false, kind: 'team', by: 'Heimteam' }));
      }
    }
    for (let n = 1; out.length < CFG.slots; n++) out.push(Object.assign(filler(n, need(), club(h.owner).short), { stam: 100, box: 0, cap: false, home: false, kind: 'ersatz', by: 'Ersatz' }));
    return out;
  }
  const taken = (w, hallId) => w.halls[hallId].slots.length;

  // --- Vereinswahl ---
  // Die erste Wahl ist frei, danach ist ein Wechsel pro Saison erlaubt. Beim Wechsel kommen stationierte Karten zurück.
  const canSwitch = w => !w.club || w.switches < CFG.switches;
  function chooseClub(w, clubId) {
    if (!club(clubId) || clubId === w.club || !canSwitch(w)) return { world: w, ok: false };
    const n = copy(w);
    if (n.club) { n.switches++; Object.keys(n.halls).forEach(id => { n.halls[id].slots = n.halls[id].slots.filter(s => s.user !== 'me'); }); }
    n.club = clubId;
    return { world: n, ok: true };
  }

  // --- Stationieren ---
  // Karte → Halle für die eigenen stationierten Karten. Diese Karten sind für eigene Matches gesperrt.
  function stationed(w) { const m = {}; Object.keys(w.halls).forEach(id => w.halls[id].slots.forEach(s => { if (s.user === 'me') m[s.card] = id; })); return m; }
  const mySlot = (w, hallId) => w.halls[hallId].slots.filter(s => s.user === 'me')[0] || null;
  function canStation(w, hallId, cardId) {
    const h = w.halls[hallId];
    if (!w.club || h.owner !== w.club) return 'Diese Halle gehört nicht deinem Verein.';
    if (h.slots.length >= CFG.slots) return 'Alle ' + CFG.slots + ' Plätze sind besetzt.';
    if (h.slots.filter(s => s.user === 'me').length >= CFG.perUser) return 'Du hast hier schon eine Karte stationiert.';
    if (cardId && stationed(w)[cardId]) return 'Diese Karte ist schon stationiert.';
    if (cardId && h.slots.some(s => s.card === cardId)) return 'Diese Karte steht hier schon.';
    return '';
  }
  function station(w, hallId, cardId) {
    if (canStation(w, hallId, cardId) || !byId(E.DATA.collection, cardId)) return { world: w, ok: false };
    const n = copy(w); n.halls[hallId].slots.push({ user: 'me', card: cardId });
    return { world: n, ok: true };
  }
  function withdraw(w, hallId) {
    if (!mySlot(w, hallId)) return { world: w, ok: false };
    const n = copy(w); n.halls[hallId].slots = n.halls[hallId].slots.filter(s => s.user !== 'me');
    return { world: n, ok: true };
  }

  // --- Angriff und Schaden ---
  const canAttack = (w, hallId) => !!w.club && w.halls[hallId].owner !== w.club;
  /* Wie stark ein Sieg zählt. Vor Ort voll, aus der Ferne halb. Zurückerobern: Die Heimhalle des eigenen Vereins
     zählt auch aus der Ferne voll. Spieltag: Ein Angriff vor Ort zählt doppelt. */
  function factor(w, hallId) {
    const near = !!hallData(hallId).near, reclaim = hallId === w.club && w.halls[hallId].owner !== w.club, matchday = near && w.matchday === hallId;
    return { near, reclaim, matchday, value: (near || reclaim ? 1 : CFG.remote) * (matchday ? CFG.matchday : 1) };
  }
  function conquer(n, hallId, clubId) {
    const h = n.halls[hallId];
    h.owner = clubId; h.hp = CFG.conquerHp; h.slots = [];          // stationierte Karten kehren zu ihren Usern zurück
  }
  // outcome: 'win', 'penwin', 'loss', 'penloss' aus der Engine. Schaden wie bisher.
  function applyResult(w, hallId, outcome, score) {
    const n = copy(w), h = n.halls[hallId], before = h.hp, f = factor(w, hallId);
    let change = 0;
    if (outcome === 'penwin') change = -Math.round(20 * f.value);
    else if (outcome === 'win') change = -Math.round(Math.min(70, 30 + 10 * (score.you - score.home)) * f.value);
    else if (outcome === 'loss') change = 10;
    h.hp = clamp(before + change, 0, 100);
    const delta = h.hp - before, conquered = h.hp === 0;
    if (conquered) conquer(n, hallId, n.club);
    return { world: n, delta, conquered, before, factor: f };
  }
  const bonusValue = (w, hallId) => Math.round(15 * factor(w, hallId).value);
  function bonusDamage(w, hallId) {
    const n = copy(w), h = n.halls[hallId], before = h.hp;
    h.hp = clamp(before - bonusValue(w, hallId), 0, 100);
    const delta = h.hp - before, conquered = h.hp === 0;
    if (conquered) conquer(n, hallId, n.club);
    return { world: n, delta, conquered, before };
  }

  // --- Vereinstabelle: Zahl der gehaltenen Hallen, bei Gleichstand Summe der Hallenstärke ---
  function table(w) {
    return CLUBS.map(c => {
      const mine = Object.keys(w.halls).filter(id => w.halls[id].owner === c.id);
      return { id: c.id, name: c.name, short: c.short, halls: mine.length, hp: mine.reduce((a, id) => a + w.halls[id].hp, 0) };
    }).sort((a, b) => b.halls - a.halls || b.hp - a.hp || a.name.localeCompare(b.name, 'de'));
  }

  /* Nur im Prototyp: Ein erfundener Fan eines anderen Vereins greift eine Halle an. Je mehr Karten stationiert sind,
     desto seltener gewinnt er. Fällt die Halle, stationiert er eine Karte seines Vereins. */
  function simAttack(w, hallId, rng) {
    const n = copy(w), h = n.halls[hallId], data = hallData(hallId);
    const others = CLUBS.filter(c => c.id !== h.owner && c.id !== w.club), by = others[Math.floor(rng() * others.length)];
    const win = rng() < 0.3 + 0.05 * (CFG.slots - h.slots.length), before = h.hp;
    h.hp = clamp(before + (win ? -30 : 10), 0, 100);
    let text = 'Ein Fan von ' + by.name + ' greift ' + data.name + ' an und ' + (win ? 'gewinnt. Die Halle verliert ' + (before - h.hp) + ' Stärke.' : 'verliert.' + (h.hp > before ? ' Die Halle erholt sich um ' + (h.hp - before) + '.' : ''));
    const conquered = h.hp === 0;
    if (conquered) {
      const lost = h.slots.some(s => s.user === 'me');
      conquer(n, hallId, by.id);
      if (CLUB_CARD[by.id]) h.slots.push({ user: 'x-' + by.id, card: CLUB_CARD[by.id] });
      text = by.name + ' erobert ' + data.name + '.' + (lost ? ' Deine stationierte Karte kehrt zurück.' : '');
    }
    n.news = text;
    return { world: n, text, conquered, by: by.id };
  }

  root.HKWorld = { CFG, CLUBS, FANS, create, club, hallData, guard, taken, canSwitch, chooseClub, stationed, mySlot, canStation, station, withdraw, canAttack, factor, applyResult, bonusValue, bonusDamage, table, simAttack, poolCard };
})(typeof window !== 'undefined' ? window : globalThis);
