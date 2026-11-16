/* Simulation für das Match mit Schlüsselszenen. node sim/match.js [n] [key=value ...]
   Weil das Match vom Können abhängt, spielt hier ein Modell-Spieler mit einem Profil:
   s    Streuung beim Tippen auf einem Balken in ms (Timing-Balken und Schuss-Balken)
   aim  Zielfehler beim Setzen des Ziels im Tor, in halben Torbreiten (Tor von -1 bis 1)
   vis  Verzögerung in ms, mit der er im Dribbling-Parcours auf die Bewegung der Verteidiger reagiert
   wait so viele Durchläufe des Schuss-Balkens schaut er zusätzlich zu, bevor er stoppt (der Goalie rückt in der Zeit zur Ecke)
   rt   Reaktionszeit bei der Parade in ms, rtSd ihre Streuung, zerr Anteil falsch angetippter Zonen
   Linien und Taktikkarten setzt er nach einfachen Regeln ein (siehe coach).
   Die Zahlen sind Annahmen und müssen mit echten Spielern überprüft werden. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const box = {}; box.window = box; vm.createContext(box);
['src/engine.js', 'src/world.js', 'src/lab/match.js', 'src/lab/pool.js', 'src/lab/club.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), box));
const E = box.HK, W = box.HKWorld, M = box.HKMatch;
const PROFILES = {
  stark: { s: 45, aim: 0.03, vis: 150, wait: 0, rt: 480, rtSd: 70, zerr: 0.03 },       // etwa die besten 10 %
  mittel: { s: 70, aim: 0.05, vis: 190, wait: 0.5, rt: 560, rtSd: 85, zerr: 0.06 },
  schwach: { s: 105, aim: 0.08, vis: 240, wait: 1, rt: 650, rtSd: 100, zerr: 0.1 }     // etwa die schwächsten 10 %
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), pick = (l, r) => l[Math.floor(r() * l.length)];
function gauss(r) { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
const pHit = (pf, w, sweep) => erf(w * sweep / (2 * Math.SQRT2 * pf.s));
const shift = (sq, d) => sq.map(c => { const x = Object.assign({}, c); ['sco', 'ply', 'clu', 'fai', 'frm', 'exp', 'ovr'].forEach(k => { x[k] = Math.max(40, Math.min(99, x[k] + d)); }); return x; });
/* Eigener Schuss wie ein vernünftiger Spieler: Er kennt sein Können und wählt das Ziel, bei dem er am ehesten trifft
   (hohe oder flache Ecke, näher am Pfosten oder mit mehr Abstand). Dann stoppt er den Schuss-Balken mit seiner Streuung. */
const CAND = [];
[-1, 1].forEach(sd => { [0.06, 0.1, 0.15, 0.22, 0.32, 0.45].forEach(m => { CAND.push([sd * (1 - m), 1 - m * 0.75]); CAND.push([sd * (1 - m), 0.1]); }); });
const GQ = [-1.9, -1.25, -0.75, -0.35, 0, 0.35, 0.75, 1.25, 1.9], GW = GQ.map(x => Math.exp(-x * x / 2)), GS = GW.reduce((a, b) => a + b, 0);
// Zeit vom Setzen des Ziels bis zum Stopp: kurz hinschauen, dann beim nächsten Durchgang durch die Mitte tippen
// Bei einem Direktschuss (quick) wartet er kaum: Der Goalie rutscht schon herüber.
const tapTime = (pf, sweep, u, quick) => 350 + sweep * (u + pf.wait * (quick ? 0.3 : 1));
// Torchance für ein Ziel: gemittelt über die eigene Streuung auf dem Balken und den eigenen Zielfehler
function odds(pf, s, target, pre) {
  const b = pre.b, sd = pf.s / b.sweep, t = tapTime(pf, b.sweep, 0.5, !!s.shot.oneT), sg = target[0] < 0 ? -1 : 1, up = target[1] > 0.5 ? 1 : 0; let p = 0, n = 0;
  for (let k = -1; k <= 1; k++) {
    const tg = [target[0] + sg * k * pf.aim, target[1] + up * k * pf.aim * 0.7];
    for (let i = 0; i < GQ.length; i++) { const v = M.evalShot(s, tg, clamp(b.pos + GQ[i] * sd, 0, 1), t, pre); n += GW[i]; if (!v.blocked && v.result === 'goal') p += GW[i]; }
  }
  return p / n;
}
function shotPlan(pf, s) {
  const pre = { b: M.shotBar(s), R: M.reach(s, s.shot) }, far = s.shot.keeper.x > 0 ? -1 : 1; let best = { p: -1, target: null };
  CAND.forEach(tg => { if (tg[0] * far < 0) return; const p = odds(pf, s, tg, pre); if (p > best.p) best = { p, target: tg }; });   // nur die Seite, auf der der Goalie nicht steht
  return best;
}
/* Torchance für einen Schuss von Spieler id aus seiner Lage: Für ein paar Ziele auf der offenen Seite wird gesucht, wie weit
   der Strich links und rechts neben der Mitte stehen darf, damit es noch ein Tor ist. Daraus folgt mit der eigenen
   Streuung die Chance. from: als käme der Ball jetzt per Pass von diesem Spieler (Direktschuss). */
const TG = [[0.84, 0.86], [0.9, 0.12], [0.7, 0.8], [0.62, 0.14]];
function chance(pf, s, sc, id, from) {
  const pv = M.shotPreview(s, id, from), s2 = Object.assign({}, s, { shot: pv.sh }), pre = { b: M.shotBar(s2), R: pv.reach }, sd = pf.s / pre.b.sweep, t = tapTime(pf, pre.b.sweep, 0.5, !!pv.oneT);
  const kx = pv.sh.keeper.x, sides = kx > 0.1 ? [-1] : kx < -0.1 ? [1] : [-1, 1], goal = (tg, e) => { const v = M.evalShot(s2, tg, clamp(pre.b.pos + e, 0, 1), t, pre); return !v.blocked && v.result === 'goal'; };
  const edge = (tg, sg) => { let lo = 0, hi = Math.min(0.5, 3 * sd); if (goal(tg, sg * hi)) return hi; for (let i = 0; i < 6; i++) { const m = (lo + hi) / 2; if (goal(tg, sg * m)) lo = m; else hi = m; } return lo; };
  let best = 0;
  sides.forEach(sg => TG.forEach(g => { const tg = [sg * g[0], g[1]]; if (!goal(tg, 0)) return; const p = (erf(edge(tg, 1) / (sd * Math.SQRT2)) + erf(edge(tg, -1) / (sd * Math.SQRT2))) / 2; if (p > best) best = p; }));
  return clamp(best * 0.9, 0.02, 0.95);
}
/* Modell-Spieler in der Live-Szene. Er schaut alle paar Zehntelsekunden hin und entscheidet: schiessen, wenn die Lage gut
   und die Schussbahn frei ist (oder die Zeit abläuft); sonst den Mitspieler anspielen, der gefährlich steht und dessen
   Passweg offen aussieht; sonst mit dem Ball dorthin laufen, wo Platz ist und es näher zum Tor geht; wird es eng und
   nichts geht, ein sicherer Rückpass. Zwischen Entscheid und Ausführung liegt seine Verzögerung (vis), und er schätzt
   Passwege ungenau: so entstehen Fehlpässe. Gibt die Befehle der Szene zurück. */
function livePlay(s, pf, r) {
  // Gezeichnet wird in Zeitlupe: Vom Entscheid bis zum Loslassen vergeht in der Szene nur ein Bruchteil der eigenen Verzögerung
  const L = M.liveInit(s), cmds = [], vis = Math.round(pf.vis * 0.35 / 1000 * L.hz), G = M.GOAL;
  const first = Math.round((0.3 + r() * 0.3) * L.hz); let next = first, pend = null;
  const defs = () => Object.keys(L.pl).filter(k => L.pl[k].side === 'home').map(k => L.pl[k]);
  const segD = (d, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1, t = clamp(((d.x - a[0]) * dx + (d.y - a[1]) * dy) / l, 0, 1); return Math.hypot(d.x - a[0] - t * dx, d.y - a[1] - t * dy); };
  while (!L.done) {
    let cmd = null;
    if (pend && L.t >= pend.at) { cmd = pend.cmd; pend = null; }
    if (!pend && !cmd && L.carrier && !L.fly && L.t % 4 === 0 && L.t >= first) {
      const car = L.pl[L.carrier], sh = M.liveShot(s, L, L.carrier), left = (L.limit - L.t) / L.hz, D = defs(), near = Math.min.apply(null, D.map(d => Math.hypot(d.x - car.x, d.y - car.y))); let pick = null;
      // Immer wach: Schuss aus guter Lage und Pass auf den freien, gefährlich stehenden Mitspieler
      if (left < 1.1 || (sh.q >= 0.6 && sh.block < 0.25) || (sh.oneT && sh.q >= 0.5 && sh.block < 0.3)) pick = { k: 'shoot' };
      if (!pick) {
        let best = null, bv = 0.45;
        Object.keys(L.pl).forEach(k => { const a = L.pl[k]; if (a.side !== 'you' || k === L.carrier) return; const lane = M.liveLane(L, k) + gauss(r) * 7 * pf.s / 70; if (lane <= 9) return; const q = M.liveShot(s, L, k).q, v = q + 0.25 * Math.abs(clamp((a.x - car.x) / 160, -1, 1)); if (q >= 0.45 && v > bv) { bv = v; best = k; } });
        if (best) pick = { k: 'pass', to: best };
      }
      if (!pick && L.t >= next) {
        // Sonst alle paar Zehntelsekunden: mit dem Ball dorthin, wo Platz ist (weg von den Gegnern), eher Richtung Tor als zurück
        let bo = null, bs = -Infinity;
        for (let o = 0; o < 8; o++) {
          const ang = o * Math.PI / 4, tx = clamp(car.x + Math.cos(ang) * 52, 30, 330), ty = clamp(car.y + Math.sin(ang) * 52, 84, 380);
          const way = Math.min.apply(null, D.map(d => segD(d, [car.x, car.y], [tx, ty]) - d.core)), room = Math.min.apply(null, D.map(d => Math.hypot(d.x - tx, d.y - ty)));
          const sc_ = (way < 14 ? -3 : 0) + 1.6 * Math.min(room, 80) / 80 - Math.hypot(tx - G[0], ty - (G[1] + 70)) / 260 + r() * 0.15;
          if (sc_ > bs) { bs = sc_; bo = [tx, ty]; }
        }
        if (bs > -1.5) pick = { k: 'run', x: Math.round(bo[0]), y: Math.round(bo[1]) };
        if (!pick || near < 26) {
          // eng und kein Weg: sicherer Rückpass, sonst Schuss
          let back = null, bl = 12; Object.keys(L.pl).forEach(k => { const a = L.pl[k]; if (a.side !== 'you' || k === L.carrier) return; const lane = M.liveLane(L, k) + gauss(r) * 5 * pf.s / 70; if (lane > bl) { bl = lane; back = k; } });
          if (back) pick = { k: 'pass', to: back }; else if (!pick) pick = { k: 'shoot' };
        }
        next = L.t + vis + Math.round((0.25 + r() * 0.2) * L.hz);
      }
      if (pick) pend = { at: L.t + vis, cmd: pick };
    }
    if (cmd) { if (L.carrier && !L.fly) cmds.push(Object.assign({ t: L.t }, cmd)); else cmd = null; }
    M.liveTick(s, L, cmd);
  }
  return { cmds, L };
}
/* Modell-Spieler im Dribbling-Parcours. Er wischt nach vorne und lenkt seitlich: Bei jedem Verteidiger täuscht er zur einen
   Seite an und zieht dann zur anderen, wo mehr Platz ist, so spät, wie er es sich mit seinem Timing zutraut. Er sieht die
   Verteidiger mit seiner Verzögerung (vis). Gibt den Lauf (gewischte Richtung pro Schritt) und den Endzustand zurück. */
function dribPlay(co, pf, r) {
  // Wischen ist ungenauer als ein Tipp im Takt: Der Moment des Hakens streut gut doppelt so stark wie auf dem Balken,
  // ab und zu wählt er die engere Seite, und die Richtung zittert etwas.
  const st = M.dribInit(co), run = [], plan = co.defs.map(() => ({ side: 0, go: false, late: gauss(r) * pf.s * 2.2 / 1000, wrong: r() < pf.zerr * 1.5 })), seen = [], vis = Math.round(pf.vis / 1000 * co.hz), fwd = co.vmax * 0.8;
  let jit = 0;
  while (!st.done) {
    seen.push(st.d.map(o => o.x));
    if (st.t % 8 === 0) jit = gauss(r) * 200 * pf.aim;
    let k = -1; for (let i = 0; i < co.defs.length; i++) if (st.y <= st.d[i].y + 4) { k = i; break; }
    let target = st.x;
    if (k >= 0) {
      const D = co.defs[k], pl = plan[k], ox = seen[Math.max(0, seen.length - 1 - vis)][k];
      if (!pl.side) pl.side = (ox >= (co.min + co.max) / 2 ? -1 : 1) * (pl.wrong ? -1 : 1);
      // Ziel: seitlich am Verteidiger vorbei, mit Vorhalt, weil er bis dahin noch nachrückt
      const tLine = Math.max(0, (st.d[k].y - st.y) / (fwd + (k ? 0 : co.adv))), lead = D.vd * (tLine + pf.vis / 1000);
      const goal = clamp(ox + pl.side * (D.brush + 8 + 60 * pf.aim + lead), co.min, co.max), need = Math.abs(goal - st.x) / (co.vmax * 0.8);
      if (pl.go || tLine <= need + 0.06 + 1.5 * pf.s / 1000 + pl.late) { pl.go = true; target = goal; } else target = clamp(ox - pl.side * D.brush * 0.6, co.min, co.max);
    }
    target = clamp(target + jit, co.min, co.max);
    // Wischrichtung: seitlich zum Ziel, mit dem Rest der Kraft nach vorne
    const ux = Math.round(clamp((target - st.x) / 22, -1, 1) * 100), uy = Math.round(Math.sqrt(Math.max(0.09, 1 - ux * ux / 10000)) * 100);
    run.push(ux, uy); M.dribTick(co, st, ux / 100, uy / 100);
  }
  return { run, st };
}
// Wie oft dieser Spieler durch diesen Parcours kommt (Ball behalten und Raum gewonnen), aus ein paar Probeläufen
function dribOdds(co, pf, r, n) { let ok = 0; for (let i = 0; i < (n || 6); i++) { const g = M.dribGrade(co, dribPlay(co, pf, r).st).grade; if (g === 'perfect' || g === 'good') ok++; } return ok / (n || 6); }
/* Trainer-Entscheide zwischen zwei Chancen: Linie nach der Energie (in den letzten Minuten eines knappen Spiels die erste)
   und Taktikkarten, wenn ihr Moment da ist. style: { rest, back } Schwellen der Energie, never: nie wechseln, cards: false = keine Karten. */
const STYLE = { rest: 72, back: 90 };
function coach(s, style) {
  const st = style || STYLE, T = s.teams.you, c = s.cfg, d = s.score.you - s.score.home, last = s.period >= c.periods - 1, left = (s.period + 1) * c.periodMin - s.clock;
  if (T.bench && !s.pen) {
    const on = M.avgEn(T.cards), off = M.avgEn(T.bench), clutch = last && left < 5 && Math.abs(d) <= 1;
    const want = st.never ? 0 : st.always !== undefined ? st.always : T.line === 0 ? (on < st.rest && off > on + 10 && !(clutch && on > 45) ? 1 : 0) : (off >= st.back || on < off - 5 || (clutch && off > 55) ? 0 : 1);
    if (want !== T.want) return { type: 'line', value: want };
  }
  if (st.cards === false || s.pen) return null;
  const can = id => s.tac.you.some(x => x.id === id && !x.used), en = M.avgEn(M.all(s, 'you'));
  const pick = can('empty') && last && left <= 3.5 && d < 0 && d >= -2 && !s.fx.you.empty ? 'empty'
    : can('wall') && last && left <= 6 && d > 0 && !s.fx.you.wall ? 'wall'
    : can('timeout') && en < 62 && s.period >= 1 ? 'timeout'
    : can('play') && s.period >= 1 && d <= 0 ? 'play'
    : can('press') && s.period >= 1 && (d < 0 || (last && d === 0)) ? 'press' : null;
  return pick ? { type: 'card', id: pick } : null;
}
/* Spielt vernünftig: wählt die Aktion mit dem besten Erwartungswert für das eigene Können, tippt mit seiner Streuung,
   zielt ins freie Feld und reagiert bei der Parade mit seiner Reaktionszeit. */
function policy(pf, style) {
  return (s, r) => {
    const sc = s.cur, tap = (pos, sweep) => clamp(pos + gauss(r) * pf.s / sweep, 0, 1);
    if (s.phase === 'decide' && sc.type === 'att' && style && style.live) return { type: 'live', cmds: livePlay(s, pf, r).cmds };      // Versuch: der Angriff als Live-Szene (im Spiel nicht mehr gezeigt)
    if (s.phase === 'decide' && sc.type === 'att') {
      const X = sc.carrier, last = sc.step >= sc.max - 1;
      const val = a => { const c = M.contest(s, a); return c.free ? 1 : pHit(pf, c.w, c.sweep); };
      const now = chance(pf, s, sc, X); let best = { v: now * 1.05, a: { type: 'shoot' } }, mate = 0;
      if (!last) {
        // Pass: Was der Mitspieler aus dem Direktschuss macht. Dribbling: danach aus besserer Lage schiessen oder den frei gewordenen Mitspieler anspielen.
        s.teams.you.cards.forEach(c => { if (c.id === X) return; const a = { type: 'pass', to: c.id }, sh = chance(pf, s, sc, c.id, X), v = val(a) * sh * 0.92; mate = Math.max(mate, sh); if (v > best.v) best = { v, a }; });
        const co = M.dribCourse(s), vd = dribOdds(co, pf, r, 5) * Math.min(0.92, Math.max(now + 0.14, mate * 0.8)) * 0.9; if (vd > best.v) best = { v: vd, a: { type: 'dribble' } };
      }
      if (best.a.type === 'dribble') return { type: 'dribble', run: dribPlay(M.dribCourse(s), pf, r).run };      // durch den Parcours steuern
      const c = M.contest(s, best.a);
      return c.free ? best.a : Object.assign({ hit: tap(c.pos, c.sweep) }, best.a);
    }
    if (s.phase === 'decide') { const c = M.contest(s, {}); return { type: 'defend', hit: tap(c.pos, c.sweep) }; }
    if (s.phase === 'aim' && s.shot.side === 'you') {
      // Kaltblütig: für einen Schuss aus guter Lage oder im Penaltyschiessen
      if ((!style || style.cards !== false) && !s.shot.calm && s.tac.you.some(x => x.id === 'calm' && !x.used) && (s.shot.q >= 0.6 || s.shot.ctx === 'so')) return { type: 'card', id: 'calm' };
      const pl = shotPlan(pf, s), b = M.shotBar(s);
      return { type: 'aim', hit: tap(b.pos, b.sweep), t: tapTime(pf, b.sweep, r(), !!s.shot.oneT), target: [pl.target[0] + gauss(r) * pf.aim, pl.target[1] + gauss(r) * pf.aim * 0.7] };
    }
    if (s.phase === 'aim') { const sh = s.shot; return { type: 'aim', zone: r() < pf.zerr ? pick(M.ZONES.filter(z => z !== sh.zone), r) : sh.zone, rt: Math.max(160, pf.rt + gauss(r) * pf.rtSd) }; }
    return coach(s, style) || { type: 'next' };
  };
}
// squad und opp: fünf Karten (ohne Bank) oder { cards, bench, tac }
const side = x => (Array.isArray(x) ? { goalie: { val: 88 }, cards: x } : Object.assign({ goalie: { val: 88 } }, x));
function play(squad, opp, pol, n, seed, cfg, tactic) {
  const r = E.makeRng(seed), m = { n, win: 0, gf: 0, ga: 0, so: 0, chY: 0, chH: 0, min: 99, max: 0, en: 0, enMin: 0, changes: 0, l2: 0, cards: 0 };
  ['att', 'shots', 'goals', 'faced', 'onGoal', 'saved', 'stops', 'def', 'bars', 'hits', 'perfects', 'counters'].forEach(k => { m[k] = 0; });
  for (let i = 0; i < n; i++) {
    let s = M.newMatch({ cfg, tactic, you: side(squad), home: side(opp) }, r), g = 0;
    while (s.phase !== 'end') { const a = pol(s, r), x = M.act(s, a, r); if (!x.ok) throw new Error('ungültig ' + JSON.stringify(a) + ' ' + s.phase); s = x.state; if (++g > 900) throw new Error('endlos'); }
    if (s.outcome === 'win' || s.outcome === 'penwin') m.win++; if (s.pen) m.so++;
    m.chY += s.chances.you; m.chH += s.chances.home; const tot = s.chances.you + s.chances.home; m.min = Math.min(m.min, tot); m.max = Math.max(m.max, tot);
    const en = M.all(s, 'you').map(c => c.en); m.en += en.reduce((a, b) => a + b, 0) / en.length; m.enMin += Math.min.apply(null, en); m.changes += s.stats.changes; m.cards += s.tac.you.filter(x => x.used).length;
    m.gf += s.score.you; m.ga += s.score.home; Object.keys(s.stats).forEach(k => { if (k in m) m[k] += s.stats[k]; });
  }
  return m;
}
module.exports = { box, PROFILES, STYLE, policy, coach, livePlay, dribPlay, dribOdds, play, shift, shotPlan, tapTime, chance, gauss };
if (require.main === module) {
  const n = +process.argv[2] || 1500, cfg = JSON.parse(JSON.stringify(M.CFG));
  process.argv.slice(3).forEach(kv => { const [k, v] = kv.split('='); cfg[k] = +v; });
  const col = E.DATA.collection, top = (pos, k) => col.filter(c => c.pos === pos).sort((a, b) => b.ovr - a.ovr).slice(0, k);
  const SQ = top('ATT', 3).concat(top('DEF', 2)), opp = W.guard(W.create(), 'koeniz');
  const pc = v => (100 * v).toFixed(0).padStart(3) + '%', f = v => v.toFixed(2);
  console.log('Gegner Köniz (Stärke ' + M.strength(M.newMatch({ cfg, you: { goalie: { val: 88 }, cards: SQ }, home: { goalie: { val: 88 }, cards: opp } }, E.makeRng(1)).teams.home.cards).toFixed(1) + '), dein Team ' + (SQ.reduce((a, c) => a + c.ovr, 0) / 5).toFixed(1) + ' plus Verschiebung. ' + n + ' Matches je Feld.');
  console.log('Siegquote        ' + [-12, -6, 0, 6, 12].map(d => ('Karten ' + (d > 0 ? '+' : '') + d).padStart(11)).join(''));
  const rows = {};
  Object.keys(PROFILES).forEach((name, pi) => {
    rows[name] = [-12, -6, 0, 6, 12].map((d, di) => play(shift(SQ, d), opp, policy(PROFILES[name]), n, 11 + pi * 10 + di, cfg));
    console.log(name.padEnd(16) + rows[name].map(m => pc(m.win / m.n).padStart(11)).join(''));
  });
  console.log('\nBei gleichen Karten:');
  Object.keys(rows).forEach(name => {
    const m = rows[name][2];
    console.log(name.padEnd(8), 'Tore', f(m.gf / m.n) + ':' + f(m.ga / m.n), ' Balken getroffen', pc(m.hits / m.bars), 'perfekt', pc(m.perfects / m.bars), ' Schüsse', f(m.shots / m.n), 'davon Tor', pc(m.goals / Math.max(1, m.shots)),
      ' gegen dich', f(m.faced / m.n), 'gehalten', pc(m.saved / Math.max(1, m.onGoal)), ' Ballgewinne je Abwehrszene', pc(m.stops / Math.max(1, m.def)), ' Penaltys', pc(m.so / m.n), ' Energie am Ende', (m.en / m.n).toFixed(0), 'tiefste', (m.enMin / m.n).toFixed(0));
  });
}
