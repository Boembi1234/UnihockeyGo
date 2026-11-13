/* Regelprüfungen der Welt: Hallenwache, Vereinswahl, Stationieren, Schaden, Eroberung, Vereinstabelle.
   Vorher bauen: node build.js. node test/world.test.js */
'use strict';
const path = require('path'), sim = require('../sim/sim.js');
const HK = sim.loadEngine(path.join(__dirname, '..', 'dist', 'index.html')), W = HK.World;
let fails = 0; const ok = (c, t) => { console.log((c ? 'ok   ' : 'FEHLT') + ' ' + t); if (!c) fails++; };
const home = (w, id) => W.guard(w, id).filter(c => c.home).length;
let w = W.create();
ok(W.CLUBS.length === 12, 'zwölf Vereine der Herren L-UPL');
ok(['koeniz', 'wiler', 'gc'].every(id => w.halls[id].owner === id && w.halls[id].hp === 100), 'jede Halle gehört zu Beginn dem Heimverein');
ok(W.taken(w, 'koeniz') === 4 && W.taken(w, 'wiler') === 6 && W.taken(w, 'gc') === 1, 'simulierte Fans: Köniz 4, Wiler 6, GC 1');
ok(['koeniz', 'wiler', 'gc'].every(id => W.guard(w, id).length === 6 && new Set(W.guard(w, id).map(c => c.id)).size === 6), 'jede Wache hat sechs verschiedene Karten');
ok(home(w, 'koeniz') === 4 && home(w, 'wiler') === 6 && home(w, 'gc') === 1, 'Heimvorteil nur für stationierte Karten von Fans');
ok(W.guard(w, 'gc').filter(c => c.kind === 'team').length === 5 && W.guard(w, 'gc').filter(c => c.pos === 'DEF').length === 2, 'freie Plätze beim Heimverein: Heimteam ohne Heimvorteil, zwei Verteidiger');
ok(W.guard(w, 'wiler').every(c => c.stam === 100 && c.box === 0), 'Wache startet mit 100 Ausdauer');

ok(!W.canAttack(w, 'gc'), 'ohne Verein kein Angriff');
w = W.chooseClub(w, 'gc').world;
ok(w.club === 'gc' && w.switches === 0, 'erste Vereinswahl ist frei');
ok(!W.canAttack(w, 'gc') && W.canAttack(w, 'koeniz') && W.canAttack(w, 'wiler'), 'eigene Halle nicht angreifbar, fremde schon');

ok(W.canStation(w, 'koeniz', 'steiner') !== '', 'in fremder Halle kann man nicht stationieren');
let r = W.station(w, 'gc', 'steiner'); w = r.world;
ok(r.ok && W.stationed(w).steiner === 'gc' && home(w, 'gc') === 2 && W.taken(w, 'gc') === 2, 'eigene Karte stationiert, mit Heimvorteil');
ok(W.guard(w, 'gc').some(c => c.id === 'steiner' && c.by === 'Du' && c.kind === 'me'), 'Hallenwache zeigt Karte und User');
ok(!W.station(w, 'gc', 'sjogren').ok, 'nur eine Karte pro User und Halle');
r = W.withdraw(w, 'gc');
ok(r.ok && !W.stationed(r.world).steiner && W.taken(r.world, 'gc') === 1, 'Karte zurückziehen, ohne Wartezeit');

// Schaden und Faktoren
const f = id => W.factor(w, id).value;
ok(f('koeniz') === 2 && f('wiler') === 0.5, 'vor Ort am Spieltag doppelt, aus der Ferne halb');
let a = W.applyResult(w, 'wiler', 'win', { you: 3, home: 2 });
ok(a.delta === -20 && !a.conquered, 'Fernsieg mit einem Tor: 40 halbiert');
a = W.applyResult(w, 'wiler', 'loss', { you: 1, home: 2 }); ok(a.delta === 0, 'Niederlage bei voller Stärke ändert nichts');
a = W.applyResult(w, 'wiler', 'penwin', { you: 2, home: 2 }); ok(a.delta === -10, 'Sieg nach Penaltys aus der Ferne: 20 halbiert');
a = W.applyResult(w, 'koeniz', 'win', { you: 4, home: 2 });
ok(a.conquered && a.world.halls.koeniz.owner === 'gc' && a.world.halls.koeniz.hp === 60 && W.taken(a.world, 'koeniz') === 0, 'Stärke 0: Halle gehört dem Verein des Angreifers, Stärke 60, Plätze leer');
ok(W.guard(a.world, 'koeniz').every(c => c.kind === 'ersatz' && c.ovr === 70 && !c.home), 'fremder Besitzer ohne Fans: Ersatzkarten mit Gesamtwert 70');
ok(!W.canAttack(a.world, 'koeniz') && W.canStation(a.world, 'koeniz', 'sjogren') === '' && W.canStation(a.world, 'koeniz', 'steiner') !== '', 'eroberte Halle: nicht mehr angreifen, dafür stationieren, aber keine Karte doppelt');
const t = W.table(a.world);
ok(t[0].id === 'gc' && t[0].halls === 2 && t[0].hp === 160 && t[1].id === 'wiler' && t.length === 12, 'Vereinstabelle: Zahl der Hallen, dann Summe der Stärke');

// Zurückerobern: die eigene Heimhalle zählt auch aus der Ferne voll
let z = W.chooseClub(W.create(), 'wiler').world; z.halls.wiler.owner = 'zug'; z.halls.wiler.slots = [];
ok(W.canAttack(z, 'wiler') && W.factor(z, 'wiler').reclaim && W.factor(z, 'wiler').value === 1, 'Zurückerobern: voller Schaden im Fernangriff');
ok(W.factor(z, 'gc').value === 0.5, 'andere ferne Hallen bleiben bei halbem Schaden');

// Vereinswechsel: einmal pro Saison, stationierte Karten kehren zurück
w = W.station(w, 'gc', 'steiner').world;
r = W.chooseClub(w, 'zug');
ok(r.ok && r.world.switches === 1 && !W.stationed(r.world).steiner && W.canAttack(r.world, 'gc'), 'Wechsel: Karten kehren zurück, alte Halle wird angreifbar');
ok(!W.canSwitch(r.world) && !W.chooseClub(r.world, 'uster').ok, 'zweiter Wechsel in derselben Saison abgelehnt');

// Simulierter Angriff: gleiche Welt und gleicher Seed ergeben dasselbe
const s1 = W.simAttack(w, 'gc', HK.makeRng(5)), s2 = W.simAttack(w, 'gc', HK.makeRng(5));
ok(JSON.stringify(s1.world) === JSON.stringify(s2.world) && JSON.stringify(w) !== JSON.stringify(s1.world), 'simulierter Angriff ist mit Seed wiederholbar und ändert die alte Welt nicht');
// Freunde und Elo
let e = W.chooseClub(W.create(), 'koeniz').world;
ok(e.elo.me === 1000 && W.CFG.eloK === 32, 'Elo startet bei 1000, K-Faktor 32');
ok(W.USERS.length >= 10 && W.USERS.filter(u => u.friend).length === 4, 'rund zehn erfundene User, vier davon Freunde');
ok(W.friendSquad('mika').length === 6 && W.friendSquad('mika').every(c => !c.home && c.stam === 100) && W.friendSquad('mika').filter(c => c.cap).length === 1, 'Kader des Freundes: sechs Karten, ein Captain, kein Heimvorteil, 100 Ausdauer');
let g1 = W.friendResult(e, 'mika', true, '2026-11-13');
ok(g1.delta === Math.round(32 * (1 - W.expected(1000, 1184))) && g1.after === 1000 + g1.delta && g1.oppAfter === 1184 - g1.delta, 'Sieg gegen den Stärkeren: Elo nach Formel, der Gegner verliert gleich viel');
ok(W.friendResult(e, 'mika', false, '2026-11-13').delta === Math.round(32 * (0 - W.expected(1000, 1184))), 'Niederlage kostet nach Formel, die Tordifferenz spielt keine Rolle');
let g = g1.world; g = W.friendResult(g, 'mika', true, '2026-11-13').world; g = W.friendResult(g, 'mika', true, '2026-11-13').world;
const g4 = W.friendResult(g, 'mika', true, '2026-11-13');
ok(!g4.counted && g4.delta === 0 && g4.played === 4, 'viertes Spiel desselben Paars am selben Tag zählt nicht');
ok(W.friendResult(g4.world, 'mika', true, '2026-11-14').counted && W.friendResult(g4.world, 'sara', true, '2026-11-13').counted, 'am nächsten Tag und gegen andere Freunde zählt es wieder');
const all = W.ranking(g, 'all'), fr = W.ranking(g, 'friends'), cl = W.ranking(g, 'club');
ok(all.length === W.USERS.length + 1 && all.every((x, i) => i === 0 || all[i - 1].elo >= x.elo), 'Rangliste aller User, nach Elo sortiert');
ok(fr.length === 5 && fr.some(x => x.me) && cl.every(x => x.me || x.club === 'koeniz') && cl.length === 2, 'Filter Freunde und mein Verein, der eigene Eintrag ist immer dabei');
ok(JSON.stringify(W.table(g)) === JSON.stringify(W.table(e)), 'die Vereinstabelle zählt unabhängig von der Elo');
console.log(fails ? '\n' + fails + ' Prüfungen fehlgeschlagen' : '\nAlle Prüfungen bestanden');
process.exit(fails ? 1 : 0);
