/* Hallenkampf Simulation
   Lädt die Engine aus dist/index.html (derselbe Code wie im Spiel) und spielt Matches mit festen Spielweisen.
   Vorher bauen: node build.js
   Aufruf:  node sim/sim.js [--n 2000] [--seed 1] [--src] [--legacy] [--set key=value ...] [--json]
   --src     Engine aus src/engine.js statt aus dist/index.html (während der Entwicklung)
   --legacy  alte Regeln (ein Wurf pro Duell) mit denselben Spielweisen, als Vergleich */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

function loadEngine(file) {
  let code = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.html')) code = code.match(/<script id="hk-engine">([\s\S]*?)<\/script>/)[1];
  const box = {}; vm.createContext(box); vm.runInContext(code, box);
  return box.HK;
}

// ---------- Erwartungswerte für die Spielweise «vernünftig» ----------
function makeEV(HK) {
  const other = HK.other;
  const shotEV = (s, side, X, o) => HK.stage2(s, X, o) * (o && o.empty ? 1 : HK.stage3(s, side, X, o));
  const freeEV = (s, side, A) => { const short = A.ply > A.sco; return shotEV(s, side, A, { wall: !short, short }); };
  const penEV = (s, side, A) => HK.penChance(s, side, A, true) / 3 + HK.penChance(s, side, A, false) * 2 / 3;
  // Netto-Erwartung für die angreifende Seite: eigenes Tor minus Konter-Gegentor.
  function duel(s, side, A, mv, D, st) {
    const cfg = s.cfg, read = st.stops === mv.id, pf = HK.foulRisk(D, st, cfg);
    const pPen = read ? 0 : cfg.penaltyShare;
    const ppValue = 2 * cfg.ppBonus * 0.45;
    const foulEV = pPen * penEV(s, side, A) + (1 - pPen) * freeEV(s, side, A) + cfg.twoMin[st.id] * ppValue;
    const p1 = HK.stage1(s, side, A, mv, D, read);
    const cEV = shotEV(s, other(side), D, { counter: true, empty: !!s.cur.pull && side === s.cur.side });
    const q2 = HK.stage2(s, A), q3 = HK.stage3(s, side, A);
    return pf * foulEV + (1 - pf) * (p1 * (q2 * q3 - q2 * (1 - q3) * cfg.counterCatch * cEV) - (1 - p1) * (s.cur.pull && side === s.cur.side ? cfg.pullCounter : cfg.counter[st.id]) * cEV);
  }
  return {
    attack(s, A, mv, D) { const w = HK.stanceWeights(A, s.hist); let v = 0; HK.STANCES.forEach(st => { v += w[st.stops] * duel(s, 'you', A, mv, D, st); }); return v; },
    defend(s, A, D, st) { const t = HK.tendency(A); let v = 0; HK.MOVES.forEach(mv => { v += t[mv.id] * duel(s, 'home', A, mv, D, st); }); return v; }
  };
}

// ---------- Alte Regeln als Vergleich: gleiche Zustandsform, ein Wurf pro Duell ----------
function makeLegacy(HK) {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), other = HK.other;
  const foulOld = (c, st) => clamp((100 - c.fai) * 0.005 * (st ? st.foul : 1), 0, 0.6);
  function chance(s, side, A, mv, D, read, foul) {
    const cur = s.cur;
    let p = 0.36 + (HK.eff(mv.val(A), A) - HK.eff(HK.defVal(D), D)) * 0.014 + (read ? -0.22 : 0.04) + HK.clutch(A, s.duel);
    if (foul) p += 0.18;
    p += (side === 'you' ? 1 : -1) * 0.04 * s.mom;
    if (side === 'home' && cur.pressing) p -= 0.15;
    if (side === 'you' && cur.pull) p += 0.22;
    return clamp(p, 0.06, 0.90);
  }
  function act(state, action, rng) {
    if (action.type !== 'play') return HK.act(state, action, rng);       // Taktik, Weiter und Penaltyschiessen sind unverändert
    const s = JSON.parse(JSON.stringify(state)); s.cfg = state.cfg;
    const cur = s.cur, side = cur.side;
    let A, D, mv, st;
    if (side === 'home') { A = HK.card(s, 'home', cur.attacker); mv = HK.move(cur.move); D = HK.card(s, 'you', action.card); st = HK.stance(action.option); }
    else {
      A = HK.card(s, 'you', action.card); mv = HK.move(action.option); D = HK.card(s, 'home', cur.defender);
      const w = HK.stanceWeights(A, s.hist), keys = Object.keys(w); let r = rng() * keys.reduce((a, k) => a + w[k], 0), g = keys[keys.length - 1];
      for (let i = 0; i < keys.length; i++) { r -= w[keys[i]]; if (r <= 0) { g = keys[i]; break; } }
      st = HK.STANCES.filter(x => x.stops === g)[0]; s.hist[mv.id]++;
    }
    const read = st.stops === mv.id, foul = rng() < foulOld(D, st), p = chance(s, side, A, mv, D, read, foul), goal = rng() < p;
    A.stam = Math.max(0, A.stam - HK.cost(A, mv)); D.stam = Math.max(0, D.stam - HK.cost(D));
    s.teams.you.cards.concat(s.teams.home.cards).forEach(x => { if (x !== A && x !== D) x.stam = Math.min(100, x.stam + 7); if (x.box > 0) x.box--; });
    if (foul) { D.box = 2; s.stats.fouls++; s.stats.twomin++; }
    if (goal) { s.score[side]++; s.stats.src[foul ? 'pp' : 'attack']++; }
    if (cur.pull && !goal && rng() < 0.35) { s.score.home++; s.stats.src.counter++; s.stats.counters++; }
    const good = side === 'you' ? goal : !goal;
    s.mom = good ? (s.mom < 0 ? 0 : Math.min(3, s.mom + 1)) : (s.mom > 0 ? 0 : Math.max(-3, s.mom - 1));
    s.results[s.duel] = { goal: goal ? side : null };
    s.phase = 'duelDone';
    return { state: s, events: [], ok: true };
  }
  const ev = {
    attack(s, A, mv, D) {
      const w = HK.stanceWeights(A, s.hist); let v = 0;
      HK.STANCES.forEach(st => { const read = st.stops === mv.id, pf = foulOld(D, st), p = pf * chance(s, 'you', A, mv, D, read, true) + (1 - pf) * chance(s, 'you', A, mv, D, read, false); v += w[st.stops] * (p - (s.cur.pull ? 0.35 * (1 - p) : 0)); });
      return v;
    },
    defend(s, A, D, st) {
      const t = HK.tendency(A), pf = foulOld(D, st); let v = 0;
      HK.MOVES.forEach(mv => { const read = st.stops === mv.id; v += t[mv.id] * (pf * (chance(s, 'home', A, mv, D, read, true) + 0.03) + (1 - pf) * chance(s, 'home', A, mv, D, read, false)); });
      return v;
    }
  };
  return { act, ev };
}

// ---------- Kader ----------
function squads(HK) {
  const col = HK.DATA.collection;
  const top = (pos, n) => col.filter(c => c.pos === pos).sort((a, b) => b.ovr - a.ovr).slice(0, n);
  const standard = top('ATT', 4).concat(top('DEF', 2)).map(c => c.id);           // Vorschlag der App: 4 ATT und 2 DEF
  const weak = col.map((c, i) => ({ c, i })).sort((a, b) => a.c.ovr - b.c.ovr || b.i - a.i).slice(0, 6).map(x => x.c.id);
  const best = col.map((c, i) => ({ c, i })).sort((a, b) => b.c.ovr - a.c.ovr || a.i - b.i).slice(0, 6).map(x => x.c.id);
  return { standard, weak, best };
}

// ---------- Spielweisen ----------
function makePolicies(HK, ev) {
  const pick = (list, rng) => list[Math.floor(rng() * list.length)];
  const argbest = (list, fn) => { let top = null, sc = -Infinity; list.forEach(x => { const v = fn(x); if (v > sc) { sc = v; top = x; } }); return top; };
  function cornerFor(s, rng) { const w = HK.keeperWeights(s.corners); const min = Math.min(w.l, w.r); const c = ['l', 'r'].filter(k => w[k] === min); return pick(c, rng); }
  function guess(rng) { const r = rng(); return r < 0.4 ? 'l' : (r < 0.6 ? 'm' : 'r'); }

  function reasonable(opt) {
    return function (s, rng) {
      const cur = s.cur, you = s.teams.you.cards;
      if (s.phase === 'pick') {
        const usable = HK.usable(s, 'you');
        // Taktiken
        if (!s.tac.you.timeout) { const need = you.reduce((a, c) => a + Math.min(30, 100 - c.stam), 0); if (need >= 130 || (s.duel >= 8 && need >= 80)) return { type: 'tactic', id: 'timeout' }; }
        if (cur.side === 'home' && !s.tac.you.pressing && !cur.pressing && ((s.duel === 8 && s.score.you - s.score.home <= 1) || s.duel >= 10)) return { type: 'tactic', id: 'pressing' };
        if (cur.side === 'you' && !s.tac.you.pull && !cur.pull && ((s.duel === 9 && s.score.you - s.score.home < 2) || s.duel >= 11)) return { type: 'tactic', id: 'pull' };
        if (cur.side === 'home') {
          const A = HK.card(s, 'home', cur.attacker), st = HK.STANCES.filter(x => x.stops === HK.bestMove(A).id)[0];
          const defs = usable.filter(c => c.pos === 'DEF'), cand = defs.length ? defs : usable;
          const D = argbest(cand, c => -ev.defend(s, A, c, st));
          return { type: 'play', card: D.id, option: st.id };
        }
        const D = HK.card(s, 'home', cur.defender), atts = usable.filter(c => c.pos === 'ATT'), cand = atts.length ? atts : usable;
        let bestA = null, bestM = null, sc = -Infinity;
        cand.forEach(A => HK.MOVES.forEach(mv => { const v = ev.attack(s, A, mv, D); if (v > sc) { sc = v; bestA = A; bestM = mv; } }));
        if (opt.randomMove) bestM = pick(HK.MOVES, rng);
        return { type: 'play', card: bestA.id, option: bestM.id };
      }
      if (s.phase === 'penalty') return { type: 'corner', corner: cur.side === 'home' ? guess(rng) : cornerFor(s, rng) };
      if (s.phase === 'so-guess') return { type: 'corner', corner: guess(rng) };
      if (s.phase === 'so-shoot') { const free = you.filter(c => !HK.soBlocked(s, c.id)); return { type: 'shoot', card: argbest(free, c => c.clu).id, corner: cornerFor(s, rng) }; }
      return { type: 'next' };
    };
  }
  function random(s, rng) {
    const cur = s.cur, you = s.teams.you.cards;
    if (s.phase === 'pick') {
      if (rng() < 0.15) {
        const open = ['timeout'].concat(cur.side === 'home' ? ['pressing'] : (s.duel >= 8 ? ['pull'] : [])).filter(id => !s.tac.you[id]);
        if (open.length) return { type: 'tactic', id: pick(open, rng) };
      }
      const c = pick(HK.usable(s, 'you'), rng);
      return { type: 'play', card: c.id, option: pick(cur.side === 'home' ? HK.STANCES : HK.MOVES, rng).id };
    }
    if (s.phase === 'penalty' || s.phase === 'so-guess') return { type: 'corner', corner: pick(['l', 'm', 'r'], rng) };
    if (s.phase === 'so-shoot') return { type: 'shoot', card: pick(you.filter(c => !HK.soBlocked(s, c.id)), rng).id, corner: pick(['l', 'm', 'r'], rng) };
    return { type: 'next' };
  }
  return { reasonable, random };
}

// ---------- ein Match, viele Matches ----------
function playMatch(HK, actFn, policy, hall, squadIds, capId, rng, cfg, shift) {
  const you = squadIds.map(id => Object.assign({}, HK.DATA.collection.filter(c => c.id === id)[0], { stam: 100, box: 0, cap: id === capId }));
  if (shift) you.forEach(c => { ['sco', 'ply', 'clu', 'fai', 'frm', 'exp'].forEach(k => { c[k] = Math.max(40, Math.min(99, c[k] + shift)); }); });
  const home = hall.guard.map(c => Object.assign({}, c, { stam: 100, box: 0, home: true }));
  let s = HK.newMatch({ mode: 'hall', homeName: hall.short, cfg, you: { goalie: HK.DATA.user.goalie, cards: you }, home: { goalie: hall.goalie, cards: home } }, rng);
  let guard = 0;
  while (s.phase !== 'done') {
    const r = actFn(s, policy(s, rng), rng);
    if (!r.ok) throw new Error('Ungültige Aktion in Phase ' + s.phase);
    s = r.state;
    if (++guard > 500) throw new Error('Match endet nicht');
  }
  return s;
}
function run(HK, o) {
  const cfg = Object.assign({}, HK.CFG, o.cfg || {});
  ['counter', 'twoMin'].forEach(k => { cfg[k] = Object.assign({}, HK.CFG[k], (o.cfg || {})[k] || {}); });
  const legacy = o.legacy ? makeLegacy(HK) : null;
  const actFn = legacy ? legacy.act : HK.act, ev = legacy ? legacy.ev : makeEV(HK);
  const P = makePolicies(HK, ev), sq = squads(HK);
  const capOf = ids => ids.map(id => HK.DATA.collection.filter(c => c.id === id)[0]).sort((a, b) => b.ovr - a.ovr)[0].id;
  const styles = {
    zufaellig: { policy: P.random, squad: sq.standard },
    vernuenftig: { policy: P.reasonable({}), squad: sq.standard },
    zufallszug: { policy: P.reasonable({ randomMove: true }), squad: sq.standard },
    schwach6: { policy: P.reasonable({}), squad: sq.weak },
    minus8: { policy: P.reasonable({}), squad: sq.standard, shift: -8 }   // Zusatz: Standardkader, alle sechs Werte um 8 tiefer
  };
  const out = {};
  HK.DATA.halls.forEach((hall, hi) => {
    out[hall.id] = {};
    Object.keys(styles).forEach((name, si) => {
      if (o.styles && o.styles.indexOf(name) === -1) return;
      const st = styles[name], rng = HK.makeRng((o.seed || 1) * 7919 + hi * 101 + si * 13);
      const m = { n: o.n, gf: 0, ga: 0, win: 0, regWin: 0, so: 0, fouls: 0, twomin: 0, matchPen: 0, counters: 0, stops: 0, src: { attack: 0, pp: 0, counter: 0, free: 0, pen: 0 } };
      for (let i = 0; i < o.n; i++) {
        const s = playMatch(HK, actFn, st.policy, hall, st.squad, capOf(st.squad), rng, cfg, st.shift);
        m.gf += s.score.you; m.ga += s.score.home;
        if (s.outcome === 'win' || s.outcome === 'penwin') m.win++;
        if (s.outcome === 'win') m.regWin++;
        if (s.pen) m.so++;
        m.fouls += s.stats.fouls; m.twomin += s.stats.twomin; m.matchPen += s.stats.matchPen; m.counters += s.stats.counters; m.stops += s.stats.stops;
        Object.keys(m.src).forEach(k => { m.src[k] += s.stats.src[k]; });
      }
      out[hall.id][name] = m;
    });
  });
  return out;
}

// ---------- Ausgabe ----------
const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), pc = v => (100 * v).toFixed(1) + '%';
function report(HK, res) {
  const lines = [];
  HK.DATA.halls.forEach(hall => {
    const r = res[hall.id], v = r.vernuenftig, n = v.n;
    lines.push('', '## ' + hall.short + '  (' + n + ' Matches je Spielweise)');
    lines.push('Tore pro Match (vernünftig):       ' + f2((v.gf + v.ga) / n) + '   Du ' + f2(v.gf / n) + ' : ' + f2(v.ga / n) + ' ' + hall.short);
    lines.push('  Quellen: Angriff ' + f2(v.src.attack / n) + ', Überzahl ' + f2(v.src.pp / n) + ', Konter ' + f2(v.src.counter / n) + ', Freischlag ' + f2(v.src.free / n) + ', Penalty ' + f2(v.src.pen / n));
    lines.push('Fouls pro Match:                   ' + f2(v.fouls / n));
    lines.push('2-Minuten-Strafen pro Match:       ' + f2(v.twomin / n));
    lines.push('Penalty im Match:                  ' + f2(v.matchPen / n) + ' pro Match' + (v.matchPen ? ', jedes ' + f1(n / v.matchPen) + '. Match' : ''));
    lines.push('Konter pro Match:                  ' + f2(v.counters / n));
    lines.push('Matches mit Penaltyschiessen:      ' + pc(v.so / n));
    lines.push('Siegquote vernünftig, mit Penaltys: ' + pc(v.win / n) + '   (ohne Penaltys ' + pc(v.regWin / n) + ')');
    lines.push('Siegquote zufällig:                ' + pc(r.zufaellig.win / n) + '   (ohne Penaltys ' + pc(r.zufaellig.regWin / n) + ')');
    lines.push('Kader: Standard gegen 6 schwächste: ' + pc(v.win / n) + ' gegen ' + pc(r.schwach6.win / n) + '  = ' + f1(100 * (v.win - r.schwach6.win) / n) + ' Punkte');
    if (r.minus8) lines.push('Zusatz: Standard gegen alle Werte −8:  ' + pc(v.win / n) + ' gegen ' + pc(r.minus8.win / n) + '  = ' + f1(100 * (v.win - r.minus8.win) / n) + ' Punkte');
    lines.push('Spielzug: vernünftig gegen zufällig: ' + pc(v.win / n) + ' gegen ' + pc(r.zufallszug.win / n) + '  = ' + f1(100 * (v.win - r.zufallszug.win) / n) + ' Punkte');
  });
  return lines.join('\n');
}

if (require.main === module) {
  const a = process.argv.slice(2), opt = { n: 2000, seed: 1, cfg: {} };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--n') opt.n = +a[++i];
    else if (a[i] === '--seed') opt.seed = +a[++i];
    else if (a[i] === '--src') opt.src = true;
    else if (a[i] === '--legacy') opt.legacy = true;
    else if (a[i] === '--json') opt.json = true;
    else if (a[i] === '--set') {
      const kv = a[++i].split('='), keys = kv[0].split('.');
      if (keys.length === 2) { opt.cfg[keys[0]] = opt.cfg[keys[0]] || {}; opt.cfg[keys[0]][keys[1]] = +kv[1]; } else opt.cfg[kv[0]] = +kv[1];
    }
  }
  const HK = loadEngine(opt.src ? path.join(ROOT, 'src/engine.js') : path.join(ROOT, 'dist/index.html'));
  const t0 = Date.now(), res = run(HK, opt);
  if (opt.json) console.log(JSON.stringify(res));
  else {
    console.log((opt.legacy ? 'ALTE REGELN' : 'NEUE ENGINE') + ', Seed ' + opt.seed + (Object.keys(opt.cfg).length ? ', geändert: ' + JSON.stringify(opt.cfg) : ''));
    console.log('Kader Standard: ' + squads(HK).standard.join(', ') + '\nKader schwach:   ' + squads(HK).weak.join(', '));
    console.log(report(HK, res));
    console.log('\n' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
  }
}
module.exports = { loadEngine, run, report, squads, makeEV, makeLegacy, makePolicies, playMatch };
