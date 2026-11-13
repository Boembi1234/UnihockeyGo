/* Regelprüfungen der Engine mit gesteuertem Zufall. Vorher bauen: node build.js. node test/engine.test.js */
'use strict';
const path = require('path'), sim = require('../sim/sim.js');
const HK = sim.loadEngine(path.join(__dirname, '..', 'dist', 'index.html'));
let fails = 0; const ok = (c, t) => { console.log((c ? 'ok   ' : 'FEHLT') + ' ' + t); if (!c) fails++; };
const seq = list => { let i = 0; return () => (i < list.length ? list[i++] : 0.5); };
const col = id => HK.DATA.collection.filter(c => c.id === id)[0], hall = HK.DATA.halls[0];
function fresh() {
  return HK.newMatch({ homeName: 'Köniz', you: { goalie: { val: 88 }, cards: ['steiner', 'sjogren', 'wilhelmsson', 'kainulainen', 'schwab', 'larsson'].map(col) },
    home: { goalie: { val: 88 }, cards: hall.guard.map(c => Object.assign({}, c, { home: true })) } }, HK.makeRng(1));
}
const steps = r => (r.state.phase === 'penalty' ? r.state.cur.entry : r.state.log[r.state.log.length - 1]).steps.map(e => e.t + (e.kind ? ':' + e.kind : '') + (e.ok === true ? '+' : e.ok === false ? '-' : ''));
const set = (s, cur) => { const t = JSON.parse(JSON.stringify(s)); t.cfg = s.cfg; Object.assign(t.cur, cur); return t; };

// Duell 1: Halle greift an. Zaugg mit Direktschuss, Schwab verteidigt.
let s = set(fresh(), { attacker: 'zaugg', move: 'direkt' });
let r = HK.act(s, { type: 'play', card: 'schwab', option: 'block' }, seq([0.99, 0.99, 0.99]));       // kein Foul, gestoppt, kein Konter
ok(steps(r).join(' ') === 's1-', 'gelesen und gestoppt, kein Konter: ' + steps(r).join(' '));
r = HK.act(s, { type: 'play', card: 'schwab', option: 'block' }, seq([0.99, 0.99, 0.0, 0.0, 0.0]));   // gestoppt, Konter, aufs Tor, Tor
ok(steps(r).join(' ') === 's1- counter s2+ s3+' && r.state.score.you === 1, 'Ballgewinn, Konter, Tor für den Verteidiger: ' + steps(r).join(' '));
ok(Math.abs((100 - HK.card(r.state, 'you', 'schwab').stam) - (HK.cost(col('schwab')) + 6)) < 1e-9, 'Konter kostet den Schützen 6 Ausdauer zusätzlich');
ok(r.state.mom === 1 && r.state.results[0].goal === 'you', 'Momentum und Duell-Punkt gehen an den Torschützen');
r = HK.act(s, { type: 'play', card: 'schwab', option: 'zwei' }, seq([0.99, 0.0, 0.0, 0.99, 0.0, 0.0, 0.0]));  // nicht gelesen, durch, aufs Tor, Parade, gefangen, Konter
ok(steps(r).join(' ') === 's1+ s2+ s3- counter s2+ s3+', 'Goalie fängt, Konter: ' + steps(r).join(' '));
ok(r.state.log[0].steps.filter(e => e.t === 'counter').length === 1, 'aus einem Konter entsteht kein weiterer Konter');

// Fouls
r = HK.act(s, { type: 'play', card: 'schwab', option: 'block' }, seq([0.0, 0.0]));                    // Foul, gelesen: kein Penalty möglich
ok(steps(r)[0] === 'foul:twomin', 'gelesen: aus dem tiefsten Wurf wird eine Strafe, kein Penalty: ' + steps(r)[0]);
r = HK.act(s, { type: 'play', card: 'schwab', option: 'zwei' }, seq([0.0, 0.0]));                     // Foul, nicht gelesen: Penalty
ok(steps(r)[0] === 'foul:penalty' && r.state.phase === 'penalty', 'nicht gelesen: Penalty, Engine wartet auf die Ecke');
const corner = r.state.cur.pen.corner, miss = ['l', 'm', 'r'].filter(c => c !== corner)[0];
let r2 = HK.act(r.state, { type: 'corner', corner: miss }, seq([0.0]));
ok(r2.state.score.home === 1 && r2.state.phase === 'duelDone' && r2.state.stats.src.pen === 1, 'Penalty im Match: falsch geraten, Tor');
ok(Math.abs(r2.state.log[0].steps[1].p - HK.penChance(s, 'home', hall.guard[0], false)) < 1e-9, 'Penalty nutzt die Formel des Penaltyschiessens');

// 2 Minuten: 4 Duelle gesperrt, Überzahl, Tor in Überzahl beendet die Strafe
r = HK.act(s, { type: 'play', card: 'schwab', option: 'block' }, seq([0.0, 0.3, 0.99]));               // Foul, 2 Minuten (unter der 40-%-Schwelle), Freischlag daneben
ok(steps(r).join(' ').indexOf('foul:twomin free s2-') === 0 && HK.card(r.state, 'you', 'schwab').box === 4, '2 Minuten: Freischlag, Karte 4 Duelle gesperrt');
let t = HK.act(r.state, { type: 'next' }, seq([])).state;
ok(HK.usable(t, 'you').every(c => c.id !== 'schwab') && HK.manAdv(t, 'home') === 1 && HK.manAdv(t, 'you') === -1, 'gesperrte Karte nicht wählbar, Halle in Überzahl');
// Halle greift in Überzahl an: +15 in Stufe 1
t = HK.act(t, { type: 'play', card: 'steiner', option: 'direkt' }, seq([0.99, 0.99, 0.99, 0.99])).state;   // eigenes Duell 2 ohne Ertrag
t = set(HK.act(t, { type: 'next' }, seq([])).state, { attacker: 'zaugg', move: 'direkt' });
const A = HK.card(t, 'home', 'zaugg'), D = HK.card(t, 'you', 'larsson');
const withPP = HK.stage1(t, 'home', A, HK.move('direkt'), D, true), t0 = set(t, {}); t0.teams.you.cards.forEach(c => { c.box = 0; });
ok(Math.abs(withPP - HK.stage1(t0, 'home', A, HK.move('direkt'), D, true) - 0.15) < 1e-9, 'Überzahl: +15 Prozentpunkte in Stufe 1');
ok(HK.card(t, 'you', 'schwab').box === 3, 'Strafbank zählt herunter: noch ' + HK.card(t, 'you', 'schwab').box);
r = HK.act(t, { type: 'play', card: 'larsson', option: 'zwei' }, seq([0.99, 0.0, 0.0, 0.0]));          // durch, aufs Tor, Tor
ok(steps(r).join(' ') === 's1+ s2+ s3+ ppend' && HK.card(r.state, 'you', 'schwab').box === 0, 'Tor in Überzahl beendet die Strafe: ' + steps(r).join(' '));
ok(r.state.log[2].steps[0].pp === true && r.state.stats.src.pp === 1, 'Stufe 1 ist als Überzahl markiert');

// Ohne Goalie: Ballgewinn der Halle wird zum Konter aufs leere Tor, Stufe 3 entfällt
let u = fresh(); u.duel = 9; u.cur = { side: 'you', attacker: null, defender: 'ruh', move: null, pressing: false, pull: false };
u = HK.act(u, { type: 'tactic', id: 'pull' }, seq([])).state;
ok(u.cur.pull === true && u.tac.you.pull === true, 'Ohne Goalie ab dem 3. Drittel im eigenen Angriff');
const open = HK.stage1(u, 'you', HK.card(u, 'you', 'sjogren'), HK.move('kombi'), HK.card(u, 'home', 'ruh'), false);
r = HK.act(u, { type: 'play', card: 'sjogren', option: 'kombi' }, seq([0.4, 0.99, 0.99, 0.99, 0.0]));   // Halle rät Kombination, kein Foul, gestoppt, (Konter sicher), aufs Tor
ok(steps(r).join(' ') === 's1- counter s2+ s3+' && r.state.log[0].steps[3].empty === true && r.state.log[0].steps[3].p === 1, 'Konter aufs leere Tor ohne Stufe 3: ' + steps(r).join(' '));
ok(!HK.act(fresh(), { type: 'tactic', id: 'pull' }, seq([])).ok, 'Ohne Goalie im 1. Drittel abgelehnt');

// Freischlag kurz oder direkt
u = set(fresh(), { attacker: 'buehler', move: 'kombi' });
r = HK.act(u, { type: 'play', card: 'schwab', option: 'block' }, seq([0.0, 0.99, 0.0, 0.99]));
ok(r.state.log[0].steps[1].t === 'free' && r.state.log[0].steps[1].short === true, 'Vorlagen höher als Abschluss: Freischlag kurz gespielt');
ok(Math.abs(HK.stage2(u, hall.guard[0], { wall: true }) - (HK.stage2(u, hall.guard[0]) - 0.35)) < 1e-9, 'Mauer-Malus in Stufe 2');

// Ecken zählen über Match und Penaltyschiessen
u = fresh(); u.duel = 1; u.cur = { side: 'you', attacker: null, defender: 'ruh', move: null, pressing: false, pull: false };
r = HK.act(u, { type: 'play', card: 'steiner', option: 'direkt' }, seq([0.9, 0.0, 0.0]));               // Halle rät Solo, Foul, Penalty
ok(r.state.phase === 'penalty' && r.state.cur.pen.corner === null, 'Penalty für den User: er wählt die Ecke');
r = HK.act(r.state, { type: 'corner', corner: 'l' }, seq([0.5, 0.0]));
ok(r.state.corners.l === 1, 'Ecke aus dem Match zählt für die Goalie-Gewichtung');
ok(HK.keeperWeights(r.state.corners).l === 2.5, 'Goalie gewichtet die geschossene Ecke höher');

// Goalie-Feld pro Team
u = fresh(); const base = HK.stage3(u, 'you', HK.card(u, 'you', 'steiner')); u.teams.home.goalie.val = 98;
ok(Math.abs(base - HK.stage3(u, 'you', HK.card(u, 'you', 'steiner')) - 0.12) < 1e-9, 'Goalie-Wert pro Team wirkt in Stufe 3');
// Freundschaftsspiel: Verteidiger zeigt zuerst, Zug des Freundes bleibt verdeckt, Taktiken auf beiden Seiten
function friendly() {
  return HK.newMatch({ mode: 'friend', homeName: 'Mika', you: { goalie: { val: 88 }, cards: ['steiner', 'sjogren', 'wilhelmsson', 'kainulainen', 'schwab', 'larsson'].map(col) },
    home: { goalie: { val: 88 }, cards: hall.guard.map(c => Object.assign({}, c, { home: false })) } }, HK.makeRng(2));
}
let fm = friendly();
ok(fm.cur.side === 'home' && fm.cur.wait === 'defender' && fm.cur.attacker === null && fm.cur.move === null, 'Freund greift an: Sein Angreifer und sein Zug sind noch nicht gewählt');
ok(!HK.act(fm, { type: 'play', card: 'schwab', option: 'block' }, seq([])).ok, 'ohne gezeigten Verteidiger keine Auflösung');
r = HK.act(fm, { type: 'card', card: 'schwab' }, seq([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]));
ok(r.ok && r.state.cur.defender === 'schwab' && !!r.state.cur.attacker && r.state.cur.move === null && r.state.cur.wait === null, 'Verteidiger gezeigt, danach wählt der Freund den Angreifer, der Zug bleibt verdeckt');
r2 = HK.act(r.state, { type: 'play', card: 'schwab', option: 'pass' }, HK.makeRng(4));
ok(r2.ok && r2.state.phase === 'duelDone' && !!r2.state.log[0].move && r2.state.shist.pass === 1, 'Auflösung deckt den Zug des Freundes auf');
ok(HK.card(fm, 'home', 'zaugg').home === false && HK.stage1(fm, 'home', HK.card(fm, 'home', 'zaugg'), HK.move('direkt'), HK.card(fm, 'you', 'schwab'), true) < HK.stage1(fresh(), 'home', HK.card(fresh(), 'home', 'zaugg'), HK.move('direkt'), HK.card(fresh(), 'you', 'schwab'), true), 'kein Heimvorteil im Freundschaftsspiel');
fm = friendly(); fm.duel = 9; fm.cur = null;
let fn = HK.act(Object.assign({}, fm, { phase: 'duelDone', duel: 8, results: [], cur: { side: 'home', attacker: 'zaugg', defender: 'schwab', move: 'direkt', entry: { steps: [] } } }), { type: 'next' }, HK.makeRng(1));
ok(fn.ok && fn.state.cur.side === 'you' && fn.state.cur.pressing === true && fn.state.tac.home.pressing === true && fn.state.cur.told.indexOf('pressing') !== -1, 'der Freund spielt sein Pressing im 3. Drittel und sagt es an');
console.log(fails ? '\n' + fails + ' Prüfungen fehlgeschlagen' : '\nAlle Prüfungen bestanden');
process.exit(fails ? 1 : 0);
