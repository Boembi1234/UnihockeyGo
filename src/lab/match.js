/* Match mit Spielfluss (Testversion unter /lab/match/).
   Drei Drittel zu 20 Minuten. Die Uhr läuft, und das Spiel besteht aus Szenen, die auseinander folgen (siehe Sequenzen).
   Wer öfter am Ball bleibt, hängt am Angriffswert (die drei Stürmer) gegen den Abwehrwert des Gegners (die zwei
   Verteidiger) und an der Taktik: offensiv bringt mehr eigene Angriffe, öffnet aber hinten, defensiv das Gegenteil.
   Eine Szene ist ein Positionsangriff, ein Konter 3 gegen 2, ein Konter 2 gegen 1 oder selten ein Alleingang.
   Nichts wird gewürfelt, was der User selbst entscheiden kann. Jeder Zweikampf läuft über einen Timing-Balken: Ein Strich
   läuft hin und her, der User tippt, wenn er im grünen Feld ist. Die Karten bestimmen, wie breit das Feld ist.
   Eigener Angriff, live: Die Chance läuft als durchgehende Szene auf dem Feld (siehe «Live-Szene»). Der User zeichnet vom
   Ball aus eine Linie: zu einem Mitspieler (Pass), ins Tor (Schuss) oder in den freien Raum (laufen). Alle bewegen sich
   weiter: Mitspieler laufen sich frei, Verteidiger decken, stören den Ballführenden und gehen in Passwege.
   Angriff in Schritten (ältere Form, noch für Tests und den Gegner): Der Ballführende kann schiessen, passen oder dribbeln. Die Mitspieler laufen sich frei: einer in den Slot, der
   ballferne Flügel an den zweiten Pfosten. Ein Dribbling schlägt den Gegenspieler und zieht den nächsten Verteidiger als
   Hilfe an, dessen Mann wird frei. Jedes weitere Dribbling desselben Spielers ist deutlich schwerer, und näher als bis vor
   den Slot kommt man so nicht. Ein Pass verschiebt den Goalie: Wer direkt nach einem Querpass schiesst (Direktschuss),
   findet ihn noch auf der anderen Seite, aber er rutscht schnell herüber.
   Dribbling: kein Balken, sondern ein kurzer Parcours. Der User wischt in die Richtung, in die der Spieler laufen soll; je
   weiter er wischt, desto schneller läuft er. So geht es an den Verteidigern vorbei: zuerst am Gegenspieler, der ihm
   entgegenkommt, dann an dem, der aushilft. Sie rücken mit Verzögerung nach; wer in ihre Reichweite läuft, verliert den
   Ball. Die Karten bestimmen, wie schnell und wendig der Dribbler ist und wie gut die Gegner zumachen.
   Abwehr: Der Plan des Gegners ist sichtbar, der passende Verteidiger reagiert von selbst, der User trifft das Timing.
   Eigener Schuss: ins Tor tippen (Ziel), dann den Schuss-Balken stoppen. Genau in der Mitte geht der Ball genau ins Ziel;
   steht der Strich links oder rechts davon, weicht der Ball nach links oder rechts ab. Bei einem schwachen oder müden
   Schützen läuft der Strich schneller. Der Goalie steht in der Mitte und hält, was in seiner Reichweite landet: aus der
   Distanz fast alles ausser den Ecken, aus der Nähe viel weniger. Sobald das Ziel steht, ahnt er die Ecke und rückt
   langsam dorthin: Wer lange wartet, findet die Ecke zu.
   Schussarten: Jeder Schuss ist ein Schlagschuss (hart, aber langes Ausholen: am besten aus der Distanz und direkt nach
   einem Querpass), ein Handgelenkschuss (schnell und genau: aus der Nähe und mit einem Gegner am Mann) oder ein Zugschuss
   (der Ball wird am Stock eines Gegners in der Schussbahn vorbeigezogen, der Goalie steht noch auf der alten Seite). Die
   passende Art ist eingestellt, der User kann eine andere wählen. Jeder Spieler hat einen Lieblingsschuss (siehe STYLES).
   Raum und Tiefe: Nicht jede Chance beginnt vor dem Tor. Ein Teil der Positionsangriffe beginnt als Auslösung in der
   eigenen Hälfte: Ein Verteidiger hat den Ball, der Gegner stört früh, die Spieler stehen über das ganze Feld verteilt.
   Konter beginnen dort, wo der Ball gewonnen wurde. Im Aufbau wählt der Ballführende zwischen dem langen Pass in die
   Tiefe (riskant, bringt den Durchbruch), dem Vorstoss durch die Mitte (bringt Überzahl, ein Ballverlust hinten ist ein
   Konter) und dem kurzen sicheren Pass (danach steht die Abwehr). Geschossen wird erst im Angriffsdrittel, und direkt vor
   dem Tor wird nicht mehr gedribbelt (siehe «Aufbau» und canDrib).
   Sequenzen: Der Ball bleibt im Spiel. Ein Drittel besteht aus wenigen langen Sequenzen statt aus einzelnen Chancen.
   Jedes Ende ist der Anfang der nächsten Lage: Hält der Goalie fest, wirft er aus; wehrt er nur ab oder wird ein Schuss
   geblockt, liegt der Ball frei, und wer ihn holt, spielt weiter (zweite Welle oder Gegenangriff); geht der Schuss
   daneben, baut der Verteidiger hinter dem Tor auf; ein Ballverlust ist der Angriff des Gegners. Erst wenn das Spiel
   zur Ruhe kommt, springt die Uhr zur nächsten Sequenz. Jedes Drittel und jedes Spiel nach einem Tor beginnt mit dem
   Bully (siehe «Sequenzen», turnover, loose, faceoff).
   Linien: Jedes Team hat zwei Linien zu fünf Feldspielern. Eine steht auf dem Feld, die andere erholt sich auf der Bank.
   Gewechselt wird zwischen zwei Sequenzen und nach einem Tor; der Wunsch lässt sich jederzeit setzen. Die Werte der Linie auf dem Feld bestimmen,
   wie viele Chancen entstehen.
   Taktikkarten: Jede Seite nimmt bis zu drei Karten ins Match, jede einmal einsetzbar (siehe CARDS).
   Energie: Jeder Spieler wird im Lauf des Matchs müde (Aktionen kosten Energie, die Pause bringt etwas zurück). Je müder,
   desto schneller läuft sein Strich auf jedem Balken.
   Schuss des Gegners: Die Flugbahn ist ehrlich zu sehen, der User muss die richtige Ecke antippen, bevor der Ball da ist.
   Spielfeld: Koordinaten 0 bis 360 (Breite) und 0 bis 400 (Länge). Angegriffen wird immer das Tor oben bei (180, 40).
   Reine Funktionen: Zustand rein, Ergebnis raus, Zufall nur aus rng. Karten und Grundwerte kommen aus HK. */
(function (root) {
  'use strict';
  const E = root.HK, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), other = s => (s === 'you' ? 'home' : 'you');
  const GOAL = [180, 40];
  const ROLES = ['LD', 'RD', 'LW', 'C', 'RW'];
  const FORM = { LD: [96, 312], RD: [264, 312], LW: [70, 168], C: [180, 222], RW: [290, 168] };
  const MARKS = { LD: 'RW', RD: 'LW', LW: 'RD', C: 'C', RW: 'LD' };   // Rolle des Angreifers → Rolle seines Gegenspielers
  const ZONES = ['tl', 'tm', 'tr', 'bl', 'bm', 'br'];
  const ZC = { tl: [-0.62, 0.72], tm: [0, 0.75], tr: [0.62, 0.72], bl: [-0.62, 0.25], bm: [0, 0.2], br: [0.62, 0.25] };

  const CFG = {
    periods: 3, periodMin: 20, goalie: 88, maxSteps: 4, counterSteps: 2, defSteps: 2,
    // Gewicht einer Seite bei gleichen Werten und ausgeglichener Taktik; wie stark Angriff gegen Abwehr zählt. Daraus
    // (rates) folgt, wer nach einem Zeitsprung den Ball hat und wer nach einem Ballgewinn am Drücker bleibt (siehe Sequenzen)
    chanceBase: 0.095, chanceK: 0.035,
    // Timing-Balken: Durchlauf in ms, Streuung eines durchschnittlichen Spielers in ms (bei ihr trifft er so oft wie die
    // Chance aus dem Wertevergleich), kleinstes und grösstes Feld, Anteil des perfekten Kerns, «knapp daneben»
    barSweep: 900, barRef: 80, barMin: 0.045, barMax: 0.34, barCore: 0.26, barNear: 0.07, barGross: 0.2,
    blockFree: 0.2,                                                  // darunter ist der Schuss frei, ohne Balken
    defScale: 0.8, defBlock: 0.7,                                     // Feld in der Abwehr, gegen Schüsse etwas schmaler
    pressGood: 130, pressNear: 60,                                    // gestörter Gegner: so viele ms mehr Zeit für die Parade
    // Streuung der Schüsse des Gegners (Radius um sein Ziel, Tor von -1 bis 1), vor allem nach dem Abschlusswert
    sdBase: 0.1, sdSkill: 0.22, sdDist: 0.06, post: 0.07,
    /* Dein Schuss: Balken wie beim Penalty. Breite des grünen Felds nach der Lage: shotW von ganz weit, shotWq dazu direkt
       vor dem Tor; unter Druck bis shotPress schmaler. Tempo des Strichs nach dem Abschlusswert: 88 ist normal, jeder Punkt
       darunter macht ihn 3 % schneller. Am Rand des grünen Felds weicht der Ball um devEdge vom Ziel ab (Tor von -1 bis 1). */
    shotW: -0.01, shotWq: 0.175, shotWMin: 0.03, shotPress: 0.5, shotTempo: 0.03, tempoMin: 0.5, tempoMax: 1.3, sweepMin: 380, devEdge: 0.24,
    /* Goalie des Gegners: steht fast in der Mitte (höchstens kOff daneben), sein Körper ist auf Höhe kY. Er hält, was näher
       als seine Reichweite landet; die Höhe zählt dabei kYs-fach, hohe Ecken sind also am weitesten weg. Reichweite: reach
       direkt vor dem Tor, reachDist dazu von ganz weit, reachVal weniger pro Punkt Abschluss über dem Goalie.
       Er ahnt die Ecke: creepDelay ms nach dem Setzen des Ziels rückt er mit creepSpeed pro Sekunde dorthin, höchstens creepMax. */
    kOff: 0.12, kY: 0.3, kYs: 1.3,
    reach: 0.72, reachDist: 0.46, reachVal: 0.003, reachTrait: 0.07, reachMin: 0.45, reachMax: 1.25,
    creepDelay: 1500, creepSpeed: 0.3, creepMax: 0.45,
    enSpread: 0.5,                                                    // müder Schütze des Gegners streut bis so viel mehr
    // Energie: Kosten pro Chance (für alle; mal enTacOff bei offensiver, mal enTacDef bei defensiver Taktik), Pass, Annahme, Dribbling, Schuss, Abwehraktion; Erholung in der Pause;
    // bei leerer Energie läuft der Strich mit diesem Anteil der normalen Dauer
    enChance: 5, enTacOff: 1, enTacDef: 1, enPass: 4, enRecv: 2, enDrib: 10, enShot: 7, enDef: 7, enBreak: 15, enFloor: 0.62,
    // Linien: Erholung auf der Bank pro Chance. Trainer des Gegners: wechselt unter aiRest Energie der Linie, zurück ab aiBack.
    // Eine müde Linie erspielt weniger Chancen und lässt mehr zu: bei leerer Energie zählen ihre Werte enVal Punkte weniger.
    enRest: 9, enVal: 18, aiRest: 72, aiBack: 90,
    /* Taktikkarten. Time-out: Energie für alle. Pressing: so viele Abwehrszenen gewinnt schon «Im Feld» den Ball (presst der
       Gegner, sind deine Felder um fxPressAi schmaler). Spielzug: Felder mal fxPlay (beim Gegner deine Abwehrfelder mal
       fxPlayAi). Kaltblütig: Dauer des Strichs mal fxCalm. Goalie raus: eigene Chancen mal fxEmptyOwn, Felder mal
       fxEmptyAtt. Mauern: Chancen des Gegners mal fxWallOpp, eigene mal fxWallOwn. */
    fxTimeout: 30, fxPress: 2, fxPressAi: 0.8, fxPlay: 1.25, fxPlayAi: 0.85, fxCalm: 1.4, fxEmptyOwn: 2, fxEmptyAtt: 1.15, fxWallOpp: 0.5, fxWallOwn: 0.6,
    // Reaktionsparade: Zeit in ms, bis der Ball im Tor ist
    aiPowMin: 0.1, rxBase: 400, rxPow: 700, rxVal: 5, rxDist: 200, rxCounter: 90, rxTrait: 70, rxLate: 90, rxMin: 360, rxMax: 1000, rxEdge: 0.12,
    blockBase: 0.65,                                                  // Schuss geblockt, wenn ein Gegner ganz nah steht
    // Pass und Dribbling
    /* Dribbling: Raumgewinn in Feldeinheiten (perfekt mehr), aber nie näher ans Tor als dribStop. Jedes weitere Dribbling
       desselben Spielers in der Chance: Chance mal dribRepeat. Ein Verteidiger im Umkreis helpRange hilft aus.
       Frei ist ein gefährlich stehender Mitspieler mit offenem Passweg (Risiko höchstens freeRisk). Enge Deckung
       (tightDist) macht den Pass riskanter. */
    dribStep: 62, dribStepPerfect: 84, dribStop: 88, dribRepeat: 0.6, helpRange: 135, freeRisk: 0.34, tightDist: 26, tightRisk: 0.1,
    /* Dribbling-Parcours. Masse in Feldeinheiten (die Bahn ist 2 mal dbLane breit), Tempo pro Sekunde, gerechnet in dbHz
       Schritten pro Sekunde. Der Dribbler läuft dorthin, wohin gewischt wird: Höchsttempo dbVa plus dbVaVal pro Punkt
       Dribbling über 60 (müde: bis zu einem Fünftel langsamer), Beschleunigung dbAcc mal Höchsttempo pro Sekunde.
       Verteidiger stehen im Abstand dbGap, der erste nach dbFirst; er kommt nach dbAdvDelay Sekunden mit dbAdv entgegen,
       höchstens dbAdvMax weit. Nach dbTime Sekunden ist Schluss. Aus der Chance p (Wertevergleich, Raum, Fähigkeiten) wird
       die Stärke der Verteidiger: Reichweite dbCore plus dbCoreP mal (1 - p), darum der Stockbereich dbBrush, Seitentempo
       dbVd plus dbVdP mal (1 - p), Verzögerung dbLag plus dbLagP mal p Millisekunden. Beim Helfer ist die Reichweite kleiner
       (mal dbHelp), der Stockbereich aber grösser (dbHelpBrush): An ihm kommt man selten ganz sauber vorbei. */
    dbHz: 60, dbLane: 118, dbFirst: 125, dbGap: 100, dbEnd: 55, dbVa: 211, dbVaVal: 0.8, dbAcc: 5.5, dbAdv: 38, dbAdvDelay: 0.5, dbAdvMax: 70, dbTime: 6,
    dbCore: 24, dbCoreP: 5, dbBrush: 12, dbVd: 87, dbVdP: 36, dbLag: 136, dbLagP: 100, dbHelp: 0.75, dbHelpBrush: 34,
    /* Live-Szene (eigener Angriff in Echtzeit). Zeit in Sekunden, Wege in Feldeinheiten, Tempo pro Sekunde.
       lvTime, lvTimeRush: Dauer einer Chance (Positionsangriff, Konter). Tempo: Mitspieler ohne Ball lvRun, Ballführender
       lvDrib plus lvDribVal pro Punkt Dribbling über 60, Pass lvPass plus lvPassVal pro Punkt Pass über 60, Verteidiger
       lvDef plus lvDefVal pro Punkt Zweikampf über 75. Verteidiger reagieren mit lvLag ms Verzögerung (lvLagVal weniger pro
       Punkt), nehmen dem Ballführenden im Umkreis lvCore den Ball ab und fangen Pässe im Umkreis lvReach ab (plus
       lvReachVal pro Punkt Antizipation über 75). Sie gehen in einen Passweg, wenn er näher als lvCut liegt. Der Gegenspieler
       des Ballführenden greift nach lvPress Sekunden an (nach einer Annahme nach lvPressRecv), mit lvAttack mal seinem Tempo. lvCatch: so nah muss der Ball für die Annahme sein. lvOneT: so lange
       nach der Annahme gilt ein Schuss als Direktschuss. lvWob: Radius der Laufwege, mit denen sich Mitspieler freilaufen.
       lvEnRun: Energie pro Feldeinheit mit Ball. */
    lvHz: 60, lvTime: 9, lvTimeRush: 6.5, lvRun: 128, lvDrib: 128, lvDribVal: 1.5, lvPass: 380, lvPassVal: 5, lvDef: 118, lvDefVal: 1.4,
    lvLag: 300, lvLagVal: 5, lvCore: 15, lvReach: 15, lvReachVal: 0.25, lvCut: 30, lvPress: 1.3, lvPressRecv: 0.7, lvAttack: 0.75, lvCatch: 15, lvOneT: 1.0, lvWob: 30, lvEnRun: 0.05,
    // Unaufmerksamkeit: Ein Verteidiger ohne Ball schaut immer wieder kurz nur auf den Ball und verliert seinen Mann (lvLapse: Schwelle bei Antizipation 75, lvLapseVal pro Punkt strenger)
    lvLapse: 0.72, lvLapseVal: 0.012,
    /* Deckung: Wer gefährlich steht (näher als dangerDist am Tor), wird im Passweg gedeckt (denyAt: Anteil des Wegs zum
       Ball). Mit Wahrscheinlichkeit lateProb kommt sein Gegenspieler zu spät: Dann ist er frei. */
    dangerDist: 150, denyAt: 0.3, lateProb: 0.3,
    /* Direktschuss nach einem Pass: Der Goalie steht noch auf der Seite, von der der Ball kam (kOneT mal Querbewegung des
       Passes), reicht weniger weit (reachOneT) und rutscht nach oneTDelay ms mit oneTSpeed herüber, höchstens oneTMax.
       Schuss des Gegners direkt nach einem Querpass: rxOneT ms weniger Zeit für die Parade. */
    kOneT: 0.58, reachOneT: 0.16, oneTDelay: 500, oneTSpeed: 0.35, oneTMax: 0.9, rxOneT: 110,
    /* Schussarten: Schlagschuss (slap), Handgelenkschuss (wrist), Zugschuss (drag). Jede verändert denselben Schuss.
       Dein Schuss. w: Breite des grünen Felds mal; sweep: Dauer des Strichs mal (kleiner heisst schneller); reach: Reichweite
       des Goalies plus (negativ: harter Schuss), reachFar: dazu aus der Distanz (mal 1 - Lage); lane: Druck eines Gegners in
       der Schussbahn mal (nur noch beim Gegner, bei dir zählen die Schatten, siehe unten), tight: Druck eines Gegners
       direkt auf den Füssen mal (wer ausholt, wird leicht geblockt; ein Zug braucht Platz); one: so viel bleibt vom Vorteil des Direktschusses; hard: Wer unter Druck
       ausholt, wird schon geblockt, wenn der Strich knapp neben dem Feld steht (sonst erst klar daneben).
       Schuss des Gegners. rx: Zeit für die Parade mal; sd: Streuung mal; gain: so stark wirkt deine Störung.
       Zugschuss: Der Ball wird zur Mitte gezogen, der Goalie steht noch um pull auf der alten Seite. Er rutscht nach
       pullDelay ms mit pullSpeed zurück, höchstens pullMax. Beim Gegner zieht der Ball zuerst zur falschen Seite: so lange
       wie der Anteil feint des Zeitfensters (mindestens feintMin, höchstens feintMax ms); diese Zeit kommt oben drauf.
       favW: Im Lieblingsschuss des Spielers ist das Feld so viel breiter, favSd: beim Gegner streut er so viel weniger. */
    styles: {
      slap: { w: 0.85, sweep: 0.9, reach: -0.05, reachFar: -0.26, lane: 1.6, tight: 1.6, shade: 1.3, one: 1, hard: true, rx: 0.84, sd: 1.25, gain: 1.5 },
      wrist: { w: 1.15, sweep: 1.06, reach: 0, reachFar: 0.15, lane: 1, tight: 0.5, shade: 0.75, one: 0.4, rx: 1, sd: 0.85, gain: 0.6 },
      drag: { w: 1, sweep: 1, reach: 0.03, reachFar: 0.08, lane: 0.15, tight: 1.25, shade: 0.85, one: 0, rx: 1, sd: 1, gain: 1 }
    },
    /* Verkehr vor dem Tor (dein Schuss). Jeder Gegner zwischen Ball und Tor wirft einen Schatten ins Tor: Was dorthin
       fliegt, blockt er. goalHalf: halbe Torbreite in Feldeinheiten. blockBody: halbe Breite eines Blockers (blockVal mehr
       oder weniger pro Punkt Block über 85, zwischen blockMin und blockMax, «Wand» mal 1.25). blockH: seine Höhe, gemessen
       an der Torhöhe. Je näher er am Schützen steht, desto mehr vom Tor deckt er ab. Die Schussart zählt (shade): Wer
       ausholt, lässt ihm Zeit, sich breit zu machen; beim Direktschuss ist er noch nicht bereit (oneShade weniger).
       Zugschuss: Der Ball wird um dragShift zur Seite gezogen. Ein Gegner näher als dragNear geht zu einem Teil mit
       (dragFollow, dragFollowVal pro Punkt Zweikampf über dem Dribbling des Schützen): Es öffnet sich ein Fenster.
       Sichtschutz: Ein Mitspieler vor dem Goalie (näher als screenDist am Tor, höchstens screenLane neben der Schussbahn,
       mindestens screenMin vom Schützen weg) nimmt ihm die Sicht: Reichweite minus screenReach, höchstens zwei zählen.
       Hat ein Verteidiger hinten den Ball, läuft der Center dafür auf die Schussbahn, screenAt vor das Tor.
       Abpraller: Nach einer Parade, die den Ball nicht festhält, springt er rebOut vor das Tor, zur Seite des Schusses
       (rebSide). Ist ein Angreifer näher als rebDist und um rebEdge näher als jeder Verteidiger, schiesst er sofort nach:
       aus dem Handgelenk, der Goalie liegt noch dort, wo er gehalten hat (rebK), und reicht weniger weit (rebReach).
       Beim Gegner bleibt dir für die zweite Parade weniger Zeit (rebRx). Höchstens ein Nachschuss pro Szene; sonst
       liegt der Ball frei (siehe Sequenzen). */
    goalHalf: 20, blockBody: 6.5, blockVal: 0.012, blockMin: 0.8, blockMax: 1.25, blockH: 0.8, oneShade: 0.3,
    dragShift: 14, dragNear: 48, dragFollow: 0.5, dragFollowVal: 0.012,
    screenDist: 105, screenLane: 18, screenMin: 45, screenReach: 0.07, screenAt: 56,
    rebOut: 52, rebSide: 44, rebDist: 62, rebEdge: 16, rebK: 0.55, rebReach: 0.12, rebRx: 0.8,
    pull: 0.34, pullDelay: 400, pullSpeed: 0.45, pullMax: 0.75, feint: 0.3, feintMin: 110, feintMax: 220, favW: 1.15, favSd: 0.9,
    /* Raum und Tiefe. dribNear: Näher am Tor gibt es kein Dribbling mehr (kein Platz: schiessen oder passen).
       buildProb, buildProbAi: Anteil der Positionsangriffe (du, Gegner), die als Auslösung in der eigenen Hälfte beginnen.
       turnProb: Anteil der Konter aus dem Spiel, die mit dem Umschalten hinten beginnen (nach einem Ballgewinn in einer
       Szene beginnt der Konter immer dort, wo der Ball gewonnen wurde).
       deepMax, deepMaxAi: so viele Aktionen hat der Aufbau, danach steht die Abwehr, und es geht als Positionsangriff mit
       settleSteps Aktionen weiter. Langer Pass (ab longPass Feldeinheiten, nur im Aufbau): Er wird hoch gespielt. Abfangen
       kann ihn nur, wer nah beim Empfänger steht (letzter Teil des Wegs, ab longCut); dafür ist er an sich schwer
       (longBase), und die Vorlagen des Passgebers zählen für alles. pressGap: Abstand des Gegners, der den Ballführenden
       im Aufbau stört (Verteidiger, Center, Flügel). cutC, cutW: so oft steht der Gegenspieler von Center und kurzem Flügel
       im Passweg statt im Rücken. openRun: Ist im Umkreis vor dem Ballführenden kein Gegner, läuft er ohne Zweikampf. */
    dribNear: 100, buildProb: 0.5, buildProbAi: 0.4, turnProb: 0.7, deepMax: 2, deepMaxAi: 1, settleSteps: 3,
    longPass: 230, longCut: 0.6, longBase: 0.08, pressGap: { D: 64, C: 46, W: 44 }, cutC: 0.5, cutW: 0.35, openRun: 110,
    /* Sequenzen. Ein Drittel hat seqPer Sequenzen: Die erste beginnt mit dem Bully, die letzte in der Schlussphase
       (seqLate: Minuten nach Drittelsbeginn), die übrigen gleichmässig dazwischen. Nach einem Angriff ohne Tor hat der
       andere den Ball und greift selbst an, solange das Spiel nicht zur Ruhe kommt. seqGo: so wahrscheinlich geht es
       nach der ersten, zweiten, dritten ... Szene der Sequenz weiter (danach nicht mehr), mal dem Verhältnis der
       Chancen aus Werten und Taktik (rates gegen chanceBase, zwischen seqMin und seqMax). Gezählt werden Szenen, nicht
       Eingaben: Wer den Ball schnell verliert, schenkt dem Gegner damit nicht mehr Angriffe als umgekehrt. Nach einem
       Tor läuft die Sequenz mit dem Bully weiter, wenn es in einer der ersten seqGoal Szenen fiel.
       turnGo: so oft wird aus einem Ballgewinn gegen einen aufgerückten Gegner ein Konter (nach dessen Taktik; nach
       einem freien Ball looseGo mehr), sonst beginnt die Auslösung. waveMax: so oft kann der Angreifer in einer Szene
       einen freien Ball holen (zweite Welle, mit waveSteps Aktionen).
       Bully und freier Ball: Der User tippt, sobald der Ball frei ist. Er hat foBase ms Zeit (freier Ball: looseBase),
       pro Punkt Unterschied bei Form und Erfahrung der beiden Spieler foVal ms mehr oder weniger, dazu bis foEn für die
       Energie; zwischen foMin und foMax. Sauber gewonnen (höchstens foClean mal das Fenster): Der Ball geht sofort nach
       vorn. foDelay: so lange dauert es, bis der Ball fällt. Freier Ball: Wer looseDist ms pro Feldeinheit näher steht,
       hat mehr Zeit, und der Verteidiger hat looseDef ms Vorsprung (er steht zum Ball, der Angreifer kommt von hinten);
       steht einer um looseSkip näher, hat er ihn ohne Zweikampf.
       Auswurf: throwP ist die Chance des schnellen Auswurfs (throwVal pro Punkt des Goalies über 88, throwSet mehr,
       wenn der Gegner aufgerückt war, sonst so viel weniger). throwQuick: so oft wirft der Goalie des Gegners schnell
       aus, wenn du aufgerückt warst (nach deiner Taktik). sec: Sekunden auf der Uhr pro Eingabe. */
    seqPer: 2, seqLate: [14, 17], seqGo: [0.85, 0.3, 0.05], seqGoal: 1, seqMin: 0.45, seqMax: 2,
    turnGo: { off: 0.6, bal: 0.4, def: 0.2 }, looseGo: 0.15, waveMax: 2, waveSteps: 2,
    foBase: 400, foVal: 3, foEn: 50, foMin: 300, foMax: 560, foClean: 0.72, foDelay: [900, 2400],
    looseBase: 400, looseVal: 3, looseDist: 2, looseDef: 45, looseSkip: 50, looseDelay: [350, 950],
    throwP: 0.6, throwVal: 0.012, throwSet: 0.08, throwQuick: { off: 0.45, bal: 0.3, def: 0.15 },
    sec: { pass: 5, dribble: 7, shoot: 2, defend: 6, aim: 3, duel: 4, throw: 6 },
    laneRange: 36, laneMore: 0.35, intercept: 0.55, passLong: 700,
    drib: 0.52, dribSlope: 0.022, dribMin: 0.12, dribMax: 0.9,
    // Abwehrszene: richtige Abwehr stoppt so oft, verschoben um den Wertevergleich
    stopRight: 0.5, stopSlope: 0.02, stopMin: 0.25, stopMax: 0.92, stopHalf: 0.15,
    traitBonus: 0.15,                                                 // Spezialfähigkeit im passenden Einsatz
    traitShot: 0.6
  };

  const byId = (l, id) => { for (let i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; };
  const card = (s, side, id) => byId(s.teams[side].cards, id) || byId(s.teams[side].bench || [], id);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  function distSeg(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1, t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l, 0, 1); return dist(p, [a[0] + t * dx, a[1] + t * dy]); }
  function sample(w, rng) { const k = Object.keys(w); let r = rng() * k.reduce((a, x) => a + w[x], 0); for (let i = 0; i < k.length; i++) { r -= w[k[i]]; if (r <= 0) return k[i]; } return k[k.length - 1]; }
  const copy = s => JSON.parse(JSON.stringify(s));
  const jit = (rng, p, r) => [p[0] + (rng() - 0.5) * 2 * r, p[1] + (rng() - 0.5) * 2 * r];

  // --- Werte ---
  // Abwehr wie im Testduell: Block aus Erfahrung und Clutch, Passweg aus Vorlagen und Erfahrung, Zweikampf aus Form und Fairness
  function stanceVal(c, st) {
    const v = st === 'block' ? 0.6 * c.exp + 0.4 * c.clu : st === 'pass' ? 0.6 * c.ply + 0.4 * c.exp : 0.7 * c.frm + 0.3 * c.fai;
    return E.eff(v + (c.pos === 'DEF' ? 5 : 0), c);
  }
  const dribVal = c => E.eff(0.5 * c.frm + 0.5 * c.clu, c);
  const shotVal = c => E.eff(c.sco, c);
  const passVal = c => E.eff(c.ply, c);
  const duelVal = c => E.eff(0.6 * c.frm + 0.4 * c.exp, c);           // Bully und freier Ball: Form und Erfahrung
  const strength = cards => cards.reduce((a, c) => a + E.eff(c.ovr, c), 0) / cards.length;
  // Energie 0 bis 100. Müde Spieler haben einen schnelleren Strich: Dauer eines Durchlaufs mal diesen Faktor.
  const tired = (cfg, c) => cfg.enFloor + (1 - cfg.enFloor) * clamp(c.en === undefined ? 100 : c.en, 0, 100) / 100;
  const drain = (c, v) => { if (c) c.en = clamp((c.en === undefined ? 100 : c.en) - v, 0, 100); };
  // Angriff: was die drei Stürmer mit dem Ball können. Abwehr: was die zwei Verteidiger gegen den Ball können.
  const FWD = ['C', 'LW', 'RW'], BACK = ['LD', 'RD'];
  const avg = l => l.reduce((a, v) => a + v, 0) / Math.max(1, l.length);
  const attackVal = cards => avg(cards.filter(c => FWD.indexOf(c.role) !== -1).map(c => (shotVal(c) + passVal(c) + dribVal(c)) / 3));
  const defenceVal = cards => avg(cards.filter(c => BACK.indexOf(c.role) !== -1).map(c => (stanceVal(c, 'block') + stanceVal(c, 'pass') + stanceVal(c, 'zwei')) / 3 - (c.pos === 'DEF' ? 5 : 0)));
  /* Taktik. own: Faktor auf die eigenen Chancen. open: Faktor auf die Chancen des Gegners.
     Wer offensiv spielt, gibt dem Gegner ausserdem öfter Konter; wer defensiv spielt, kommt selbst öfter über Konter. */
  /* Taktikkarten: einmal pro Match einsetzbar. when: wann sie am meisten bringt (für die Anzeige). */
  const CARDS = {
    timeout: { name: 'Time-out', text: 'Alle deine Spieler bekommen 30 Energie zurück.', when: 'Wenn beide Linien müde sind' },
    press: { name: 'Pressing', text: 'In den nächsten zwei Abwehrszenen gewinnst du den Ball schon mit «Im Feld», nicht erst mit «Perfekt».', when: 'Wenn du den Ball brauchst' },
    play: { name: 'Spielzug', text: 'Dein nächster Angriff aus dem Spiel ist ein Konter 3 gegen 2, und alle Felder sind breiter.', when: 'Wenn du ein Tor brauchst' },
    calm: { name: 'Kaltblütig', text: 'Bei deinem nächsten Schuss läuft der Strich deutlich langsamer.', when: 'Vor einem wichtigen Schuss oder Penalty' },
    empty: { name: 'Goalie raus', text: 'Bis zum nächsten Tor oder Drittelsende bleibst du viel öfter am Drücker, hast breitere Felder und bekommst eine Sequenz mehr. Aber jeder Schuss des Gegners trifft das leere Tor, und jeder Ballverlust ist ein Konter.', when: 'Im Rückstand kurz vor Schluss' },
    wall: { name: 'Mauern', text: 'Bis zum Drittelsende kommt der Gegner nur halb so oft zum Angriff. Du selbst greifst auch seltener an.', when: 'Um einen Vorsprung zu halten' }
  };
  const TACTICS = {
    def: { name: 'Defensiv', own: 0.72, open: 0.68 },
    bal: { name: 'Normal', own: 1, open: 1 },
    off: { name: 'Offensiv', own: 1.35, open: 1.3 }
  };
  const KINDS = { set: 'Angriff', rush32: 'Konter 3 gegen 2', rush21: 'Konter 2 gegen 1', solo: 'Alleingang' };

  /* Spezialfähigkeiten aus den Ratings. Jede Karte hat höchstens eine: Stürmer zuerst eine Angriffs-, Verteidiger zuerst eine
     Abwehrfähigkeit, jeweils die, deren Wert die Schwelle am weitesten übertrifft. Im passenden Einsatz gibt sie einen grossen Bonus. */
  const TRAITS = {
    kanone: { name: 'Kanone', what: 'Schuss', off: true, val: c => c.sco, min: 98 },
    passer: { name: 'Passmaschine', what: 'Pass', off: true, val: c => c.ply, min: 98 },
    dribbler: { name: 'Dribbelkönig', what: 'Dribbling', off: true, val: c => (c.frm + c.clu) / 2, min: 95.5 },
    wand: { name: 'Wand', what: 'Block', off: false, val: c => 0.6 * c.exp + 0.4 * c.clu + (c.pos === 'DEF' ? 5 : 0), min: 97 },
    anti: { name: 'Antizipation', what: 'Passweg', off: false, val: c => 0.6 * c.ply + 0.4 * c.exp + (c.pos === 'DEF' ? 5 : 0), min: 97 },
    kampf: { name: 'Zweikämpfer', what: 'Druck', off: false, val: c => 0.7 * c.frm + 0.3 * c.fai + (c.pos === 'DEF' ? 5 : 0), min: 98 }
  };
  function trait(c) {
    const pick = off => { let b = null, m = 0; Object.keys(TRAITS).forEach(k => { const t = TRAITS[k]; if (t.off !== off) return; const x = t.val(c) - t.min; if (x >= 0 && x >= m) { m = x; b = k; } }); return b; };
    const first = c.pos === 'DEF' ? false : true;
    return pick(first) || pick(!first);
  }
  const has = (c, t) => !!c && trait(c) === t;

  // --- Lage auf dem Feld ---
  const atkSide = sc => (sc.type === 'att' ? 'you' : 'home');
  const P = (sc, id) => sc.pos[id];
  const players = (s, side) => s.teams[side].cards;                                     // die Linie auf dem Feld
  const all = (s, side) => s.teams[side].cards.concat(s.teams[side].bench || []);      // beide Linien
  const avgEn = cards => cards.reduce((a, c) => a + (c.en === undefined ? 100 : c.en), 0) / (cards.length || 1);
  function nearest(s, sc, side, p) { let b = null, d = Infinity; players(s, side).forEach(c => { const x = dist(P(sc, c.id), p); if (x < d) { d = x; b = c; } }); return { c: b, d }; }
  // Schussqualität 0 bis 1 aus Distanz und Winkel; Blockgefahr aus dem nächsten Verteidiger
  function shotInfo(s, sc, id) {
    const side = atkSide(sc), X = card(s, side, id), p = P(sc, id), d = dist(p, GOAL);
    const q = clamp(1 - (d - 55) / 250, 0.12, 1) * clamp(1 - Math.abs(p[0] - 180) / 280, 0.5, 1);
    // Blocken kann, wer in der Schussbahn steht (je näher am Schützen, desto eher) oder ihm direkt auf den Füssen steht
    // lane: stärkster Druck aus der Schussbahn, tight: stärkster Druck direkt am Mann (für die Schussarten getrennt)
    const n = { c: null, d: Infinity }; let press = 0, lane = 0, tight = 0;
    players(s, other(side)).forEach(x => {
      const q_ = P(sc, x.id), near = dist(q_, p), vl = clamp(1 - distSeg(q_, p, GOAL) / 30, 0, 1) * clamp(1.25 - near / 130, 0.25, 1), vt = clamp(1 - near / 22, 0, 1), v = Math.max(vl, vt);
      lane = Math.max(lane, vl); tight = Math.max(tight, vt);
      if (v > press || (!n.c && near < n.d)) { if (v >= press) { press = v; n.c = x; n.d = near; } }
    });
    if (!n.c) { const m = nearest(s, sc, other(side), p); n.c = m.c; n.d = m.d; }
    const bk = s.cfg.blockBase * clamp(1 + (stanceVal(n.c, 'block') - shotVal(X)) * 0.02, 0.5, 1.5) * (has(n.c, 'wand') ? 1.4 : 1), block = clamp(press * bk, 0, 0.75);
    // Grobe Torchance für die Anzeige, bei einem guten Schuss in eine freie Ecke
    const est = (1 - block) * clamp(0.5 + (shotVal(X) - 88) * 0.012 + (q - 0.6) * 0.7 + (has(X, 'kanone') ? 0.1 : 0), 0.05, 0.9);
    // Verkehr: jeder Gegner zwischen Ball und Tor (mit seiner Breite als Blocker) und Mitspieler, die dem Goalie die Sicht nehmen
    const c = s.cfg, r1 = v => Math.round(v * 10) / 10;
    const blk = players(s, other(side)).map(x => { const q_ = P(sc, x.id); return { id: x.id, x: r1(q_[0]), y: r1(q_[1]), bw: r1(c.blockBody * clamp(1 + (stanceVal(x, 'block') - 85) * c.blockVal, c.blockMin, c.blockMax) * (has(x, 'wand') ? 1.25 : 1)), fol: Math.round(clamp(c.dragFollow + (stanceVal(x, 'zwei') - dribVal(X)) * c.dragFollowVal, 0.3, 0.8) * 100) / 100 }; }).filter(b => b.y < p[1] - 4 && b.y > GOAL[1] + 2);
    const scr = players(s, side).filter(m => { const q_ = P(sc, m.id); return m.id !== id && dist(q_, GOAL) < c.screenDist && dist(q_, p) > c.screenMin && distSeg(q_, p, GOAL) < c.screenLane; }).map(m => m.id).slice(0, 2);
    return { q, block, by: n.c.id, est, lane, tight, bk, px: p[0], py: p[1], blk, scr };
  }
  /* --- Schussarten ---
     Lieblingsschuss eines Spielers, aus seinen Werten: Wer vor allem trifft, schlägt; wer in wichtigen Momenten stark
     ist, schiesst aus dem Handgelenk; wer in Form ist, zieht. Kanone schlägt immer, Dribbelkönig zieht immer. */
  const STYLES = ['slap', 'wrist', 'drag'];
  const STYLE = { slap: { name: 'Schlagschuss', short: 'Schlag' }, wrist: { name: 'Handgelenkschuss', short: 'Handgelenk' }, drag: { name: 'Zugschuss', short: 'Zug' } };
  function favStyle(c) {
    const t = trait(c); if (t === 'kanone') return 'slap'; if (t === 'dribbler') return 'drag';
    const v = c.pos === 'DEF' ? { slap: c.sco - 70, wrist: c.clu - 76, drag: c.frm - 76 } : { slap: c.sco - 79, wrist: c.clu - 76, drag: c.frm - 77 };      // gemessen an der Mitte aller Karten: je etwa ein Drittel, Verteidiger schlagen öfter
    return STYLES.reduce((b, k) => (v[k] > v[b] ? k : b), 'slap');
  }
  // Druck auf den Schützen für eine Schussart. Dein Schuss: nur der Gegner direkt am Mann (wer in der Schussbahn steht,
  // blockt über seinen Schatten im Tor). Schuss des Gegners (laneBlock): auch aus der Schussbahn.
  const styleBlock = (c, o, st) => clamp((o.tight || 0) * c.styles[st].tight * (o.bk || 0), 0, 0.75);
  const laneBlock = (c, o, st) => clamp(Math.max((o.lane || 0) * c.styles[st].lane, (o.tight || 0) * c.styles[st].tight) * (o.bk || 0), 0, 0.75);
  /* Schussart des Gegners nach der Lage. o: { q, lane, tight, bk, oneT }. Gibt { style, why } zurück.
     direct: Direktschuss nach einem Querpass, niemand im Weg: schlagen. tight: Gegner am Mann, nur das Handgelenk ist
     schnell genug. lane: Gegner in der Schussbahn, der Zug geht an seinem Stock vorbei. far: aus der Distanz hilft nur
     Härte. near: aus der Nähe zählt Genauigkeit. fav: nichts davon, also der Lieblingsschuss. */
  function ruleStyle(c, X, o) {
    const one = Math.abs(o.oneT || 0), blk = st => laneBlock(c, o, st), free = st => blk(st) < c.blockFree;
    if (one >= 0.25 && free('slap') && (o.q < 0.78 || one >= 0.6)) return { style: 'slap', why: 'direct' };
    if (!free('wrist') || !free('drag')) return blk('wrist') <= blk('drag') ? { style: 'wrist', why: 'tight' } : { style: 'drag', why: 'lane' };
    if (!free('slap')) return o.q < 0.5 && one < 0.25 ? { style: 'drag', why: 'lane' } : { style: 'wrist', why: 'tight' };
    if (o.q < 0.5) return { style: 'slap', why: 'far' };
    if (o.q >= 0.78) return { style: 'wrist', why: 'near' };
    return { style: X ? favStyle(X) : 'wrist', why: 'fav' };
  }
  // Risiko, dass der Pass abgefangen wird: Gegner nahe der Passlinie, Länge des Passes, Vorlagen des Passgebers
  function passInfo(s, sc, from, to) {
    const side = atkSide(sc), a = P(sc, from), b = P(sc, to), X = card(s, side, from), c = s.cfg, len = dist(a, b), long = !!sc.deep && len >= c.longPass;
    // Der Verteidiger, der am besten im Passweg steht, zählt voll, jeder weitere nur zu einem Teil (laneMore)
    let by = null, worst = 0; const rs = [];
    players(s, other(side)).forEach(d => {
      const q = P(sc, d.id);
      if (long && ((q[0] - a[0]) * (b[0] - a[0]) + (q[1] - a[1]) * (b[1] - a[1])) / (len * len) < c.longCut) return;      // langer Pass: fliegt hoch über ihn weg
      const r = clamp(1 - distSeg(q, a, b) / c.laneRange, 0, 1) * clamp(c.intercept + (stanceVal(d, 'pass') - 88) * 0.025, 0.15, 0.95) * (has(d, 'anti') ? 1.35 : 1) * (d.id === sc.mark[from] ? 0.5 : 1);      // der eigene Gegenspieler steht zum Ball, nicht im Passweg
      rs.push(r); if (r > worst) { worst = r; by = d.id; }
    });
    rs.sort((x, y) => y - x); const keep = (1 - Math.min(0.97, rs[0] || 0)) * rs.slice(1).reduce((k, r) => k * (1 - c.laneMore * Math.min(0.97, r)), 1);
    const tight = nearest(s, sc, other(side), b).d < c.tightDist ? c.tightRisk : 0;          // eng gedeckter Empfänger
    const skill = clamp(1.4 - (passVal(X) - 70) / 60, 0.5, 1.3), far = Math.max(0, len - 160) / c.passLong;
    const risk = (long ? (1 - keep + far + c.longBase) * skill + tight : (1 - keep) * skill + far + tight) * (has(X, 'passer') ? 0.5 : 1);
    if (!by) by = nearest(s, sc, other(side), long ? b : lerp(a, b, 0.5)).c.id;   // langer Pass ohne Gegner in der Linie: der nächste läuft ihn ab
    return { risk: clamp(risk, 0.03, 0.9), by, lat: clamp((b[0] - a[0]) / 160, -1, 1), long, len };   // lat: Querbewegung des Balls, -1 ganz nach links bis 1 ganz nach rechts
  }
  // Frei ist, wer keinen Gegner in der Nähe hat
  // Frei ist ein Mitspieler, der gefährlich steht, einen offenen Passweg vom Ballführenden hat und keinen Gegner direkt bei sich
  const isFree = (s, sc, id) => id !== sc.carrier && dist(P(sc, id), GOAL) <= (sc.kind === 'set' ? s.cfg.dangerDist : 230) && passInfo(s, sc, sc.carrier, id).risk <= s.cfg.freeRisk && nearest(s, sc, other(atkSide(sc)), P(sc, id)).d > s.cfg.tightDist;
  // Querbewegung des letzten Passes, wenn id ihn gerade bekommen hat und sofort schiesst (Direktschuss), sonst 0
  const oneTimer = (sc, id) => (sc.last && sc.last.type === 'pass' && sc.last.to === id ? sc.last.lat : 0);
  function dribInfo(s, sc, id) {
    const side = atkSide(sc), X = card(s, side, id), M = card(s, other(side), sc.mark[id]);
    const space = (dist(P(sc, id), P(sc, M.id)) - 40) / 200;
    const bonus = (has(X, 'dribbler') ? s.cfg.traitBonus : 0) - (has(M, 'kampf') ? s.cfg.traitBonus : 0);
    const again = (sc.dribs && sc.dribs[id]) || 0;                                          // wie oft er in dieser Chance schon gedribbelt hat
    return { p: clamp((s.cfg.drib + (dribVal(X) - stanceVal(M, 'zwei')) * s.cfg.dribSlope + clamp(space, -0.12, 0.3) + bonus) * Math.pow(s.cfg.dribRepeat, again), s.cfg.dribMin, s.cfg.dribMax), by: M.id, again, edge: dribVal(X) - stanceVal(M, 'zwei'), av: dribVal(X), dv: stanceVal(M, 'zwei') };
  }
  /* Dribbeln kann nur, wer Platz hat. Direkt vor dem Tor (näher als dribNear) und allein vor dem Goalie gibt es kein
     Dribbling: Dort wird geschossen oder quer gelegt. Im Aufbau ist das Dribbling der Vorstoss mit dem Ball. */
  const canDrib = (s, sc) => !!sc.deep || (sc.kind !== 'solo' && dist(P(sc, sc.carrier), GOAL) > s.cfg.dribNear);
  // Freie Bahn im Aufbau: kein Gegner vor dem Ballführenden in der Nähe. Dann läuft er ohne Zweikampf.
  const openRun = (s, sc) => { const p = P(sc, sc.carrier); return !!sc.deep && !players(s, other(atkSide(sc))).some(d => { const q = P(sc, d.id); return q[1] < p[1] + 10 && dist(q, p) < s.cfg.openRun; }); };

  /* Wohin ein Angreifer ohne Ball im Positionsangriff läuft: der Center in den Slot, der ballferne Flügel an den zweiten
     Pfosten, der ballnahe bleibt als Anspielstation an der Bande, die Verteidiger sichern hinten. */
  function spotOf(role, left) {
    if (role === 'LD' || role === 'RD') return [role === 'LD' ? 104 : 256, 290];
    if (role === 'C') return [180 + (left ? 18 : -18), 130];
    return (role === 'LW') !== left ? [role === 'LW' ? 124 : 236, 94] : [role === 'LW' ? 62 : 298, 152];
  }
  /* Hat ein Verteidiger hinten den Ball, stellt sich der Center dem Goalie in die Sicht: auf der Schussbahn, screenAt vor
     dem Tor. Sonst gilt spotOf. */
  function spotFor(s, sc, role, left) {
    const car = sc.carrier ? card(s, atkSide(sc), sc.carrier) : null, p = car && P(sc, car.id);
    if (role === 'C' && p && (car.role === 'LD' || car.role === 'RD')) return lerp(GOAL, p, s.cfg.screenAt / Math.max(s.cfg.screenAt + 1, dist(p, GOAL)));
    return spotOf(role, left);
  }
  /* Wo der Gegenspieler eines Angreifers ohne Ball steht. Steht der Angreifer gefährlich, stellt er den Passweg zu: ein
     Stück auf der Linie zum Ball, leicht torseitig. Kommt er zu spät (late), bleibt er auf halbem Weg hängen, und sein Mann
     ist frei. Wer weit hinten steht, wird nur locker gedeckt. */
  function coverPos(s, sc, id, d, late) {
    const c = s.cfg, a = P(sc, id), ball = P(sc, sc.carrier);
    if (dist(a, GOAL) > c.dangerDist) return lerp(a, GOAL, 0.36);
    const t = lerp(a, ball, c.denyAt), deny = lerp(t, GOAL, 0.1);
    if (!late) return deny;
    // zu spät: Er steht tief und vom Ball abgewandt, der Passweg ist offen
    const deep = lerp(a, GOAL, 0.55), away = a[0] >= ball[0] ? 1 : -1;
    return [clamp(deep[0] + away * 32, 60, 300), deep[1]];
  }
  // Laufwege: Nach jeder gelungenen Aktion laufen sich die anderen Angreifer frei (im Konter: alle aufs Tor), die Gegenspieler folgen.
  function shift(s, sc, rng) {
    const as = atkSide(sc), left = P(sc, sc.carrier)[0] < 180, n = {}, busy = sc.mark[sc.carrier];
    Object.keys(sc.mark).forEach(a => { n[sc.mark[a]] = (n[sc.mark[a]] || 0) + 1; });
    players(s, as).forEach(c => {
      if (c.id === sc.carrier) return;
      const back = c.role === 'C' && ['LD', 'RD'].indexOf(card(s, as, sc.carrier).role) !== -1;      // der Center läuft dem Goalie in die Sicht
      const p = sc.kind === 'set' ? lerp(P(sc, c.id), spotFor(s, sc, c.role, left), back ? 0.9 : 0.6) : lerp(P(sc, c.id), GOAL, 0.2);
      sc.pos[c.id] = [clamp(p[0] + (rng() - 0.5) * 16, 30, 330), clamp(p[1] + (rng() - 0.5) * 12, 84, 360)];
      const d = sc.mark[c.id]; if (!d || n[d] > 1 || d === busy) return;       // deckt mehrere oder ist beim Ballführenden: bleibt
      sc.pos[d] = sc.kind === 'set' ? coverPos(s, sc, c.id, d, (sc.freed || []).indexOf(c.id) !== -1 || rng() < s.cfg.lateProb) : lerp(sc.pos[c.id], GOAL, 0.24);
    });
    sc.freed = null;
  }
  /* Nach einem gelungenen Dribbling: Der nächste Verteidiger in der Nähe stellt sich dem Ballführenden in den Weg. Wen er
     dafür stehen lässt, den muss der Überspielte übernehmen, und der kommt zu spät. Ist keiner nah genug, ist die Bahn frei. */
  function help(s, sc, X, beaten) {
    const ds = other(atkSide(sc)), p = P(sc, X); let h = null, hd = s.cfg.helpRange;
    players(s, ds).forEach(d => { if (d.id === beaten) return; const v = dist(P(sc, d.id), p); if (v < hd) { hd = v; h = d.id; } });
    if (!h) return null;
    const left = Object.keys(sc.mark).filter(a => sc.mark[a] === h && a !== X);
    sc.pos[h] = lerp(p, GOAL, clamp(30 / dist(p, GOAL), 0.1, 0.6));
    sc.mark[X] = h;
    left.forEach(a => { sc.mark[a] = beaten; });
    sc.freed = left;                                            // beim nächsten Verschieben kommt der Überspielte zu spät
    return { by: h, free: left };
  }

  // --- Szenen ---
  const byRole = (s, side) => { const m = {}; players(s, side).forEach(x => { m[x.role] = x; }); return m; };
  const onField = (s, side, id) => (id ? byId(players(s, side), id) : null);
  /* Positionsangriff: Der Ballführende steht auf seinem Platz (Bande, Mitte oder hinten). Die anderen haben sich schon
     freigelaufen: Center im Slot, ballferner Flügel am zweiten Pfosten. Ihre Gegenspieler stellen die Passwege zu, nicht
     jeder rechtzeitig. */
  function laySet(s, sc, rng, carrier) {
    const as = atkSide(sc), c = s.cfg, A = byRole(s, as), D = byRole(s, other(as));
    const car = onField(s, as, carrier) || A[sample({ C: 0.22, LW: 0.24, RW: 0.24, LD: 0.15, RD: 0.15 }, rng)];
    sc.carrier = car.id; sc.pos[car.id] = jit(rng, FORM[car.role], 12);
    const left = car.role === 'C' ? rng() < 0.5 : sc.pos[car.id][0] < 180;
    ROLES.forEach(r => { if (A[r].id !== car.id) sc.pos[A[r].id] = jit(rng, spotFor(s, sc, r, left), 9); sc.mark[A[r].id] = D[MARKS[r]].id; });
    ROLES.forEach(r => { const a = A[r], d = sc.mark[a.id]; sc.pos[d] = a.id === car.id ? jit(rng, lerp(sc.pos[a.id], GOAL, clamp(34 / dist(sc.pos[a.id], GOAL), 0.1, 0.5)), 4) : jit(rng, coverPos(s, sc, a.id, d, rng() < c.lateProb), 4); });
  }
  /* Konter vor dem Tor. kind: rush32, rush21 oder solo. Nur ein Teil der Spieler ist vorne dabei, der Rest läuft hinterher.
     o.through: allein durch nach einem Pass in die Tiefe. Dann rückt ein Mitspieler nach (Anspielstation), und der nächste
     Verfolger ist abgehängt oder dem Ballführenden im Rücken (o.tight: Er muss früher abschliessen, von weiter weg).
     o.tight sonst: Ein Verteidiger steht eng am Ballführenden. o.late: Der zweite Verteidiger ist überlaufen (3 gegen 2).
     o.sx: auf welcher Seite der Ballführende läuft (-1 links, 1 rechts). */
  function layRush(s, sc, rng, kind, carrier, o) {
    o = o || {};
    const as = atkSide(sc), A = byRole(s, as), D = byRole(s, other(as));
    const nA = kind === 'rush32' ? 3 : kind === 'rush21' ? 2 : 1, nD = kind === 'rush32' ? 2 : kind === 'rush21' ? 1 : 0;
    const car = onField(s, as, carrier) || A[sample({ C: 0.4, LW: 0.3, RW: 0.3 }, rng)];
    const mates = FWD.concat(BACK).map(r => A[r]).filter(x => x.id !== car.id), front = [car].concat(mates.slice(0, nA - 1)), trail = mates.slice(nA - 1);
    const backs = BACK.concat(FWD).map(r => D[r]), guard = backs.slice(0, nD), chase = backs.slice(nD), sx = o.sx || (rng() < 0.5 ? -1 : 1);
    const spots = kind === 'solo' ? [o.through && o.tight ? [180 + sx * 30, 172] : [180 + sx * 22, 142]] : kind === 'rush21' ? [[180 + sx * 46, 196], [180 - sx * 58, 178]] : [[180 + sx * 8, 208], [180 - sx * 86, 176], [180 + sx * 90, 182]];
    front.forEach((x, i) => { sc.pos[x.id] = jit(rng, spots[i], 9); });
    trail.forEach((x, i) => { sc.pos[x.id] = jit(rng, [84 + i * 64, 306 + (i % 2) * 26], 12); });
    (nD === 1 ? [[180 - sx * 6, 120]] : [[180 + sx * 36, 126], o.late ? [180 - sx * 60, 222] : [180 - sx * 42, 114]]).slice(0, nD).forEach((p, i) => { sc.pos[guard[i].id] = jit(rng, p, 6); });
    chase.forEach((x, i) => { sc.pos[x.id] = jit(rng, [66 + i * 58, 250 + (i % 2) * 24], 10); });               // laufen hinterher
    const p = sc.pos[car.id], closest = l => l.reduce((n, d) => (dist(sc.pos[d.id], p) < dist(sc.pos[n.id], p) ? d : n), l[0]);
    if (o.through) {
      sc.pos[trail[0].id] = jit(rng, [180 - sx * 84, 232], 8);
      sc.pos[closest(chase).id] = o.tight ? [p[0] - sx * 8, p[1] + 15] : [p[0] - sx * 30, p[1] + 64];
    } else if (o.tight && guard.length) sc.pos[closest(guard).id] = lerp(p, GOAL, 20 / dist(p, GOAL));
    // Gegenspieler: für die vorne der nächste Verteidiger, der noch hinten ist, für die Nachrückenden ein Verfolger
    players(s, as).forEach(x => {
      const pool = front.indexOf(x) !== -1 && guard.length ? guard : chase.length ? chase : guard; let b = pool[0], bd = Infinity;
      pool.forEach(d => { const v = dist(sc.pos[x.id], sc.pos[d.id]); if (v < bd) { bd = v; b = d; } });
      sc.mark[x.id] = b.id;
    });
    sc.carrier = car.id;
  }
  /* --- Aufbau: Chancen, die nicht vor dem Tor beginnen ---
     Solange sc.deep gesetzt ist, läuft der Aufbau: { kind: 'build' (Auslösung) | 'turn' (Umschalten nach Ballgewinn),
     n: gespielte Aktionen, max: so viele sind möglich, run: wer in die Tiefe läuft (Ziel des langen Passes) }.
     Das Feld ist 800 lang: Das Tor des Angreifers steht bei y 760, die Mittellinie bei y 400. Geschossen wird im Aufbau
     nicht. Jede Aktion entscheidet, wie es vor dem Tor weitergeht (siehe deepAction, deepDef und arrive).
     Auslösung (layBuild): Ein Verteidiger hat den Ball hinten. Sein Partner steht daneben, der Center kommt kurz, ein
     Flügel wartet an der Bande auf Höhe der Mittellinie, der andere läuft in die Tiefe (hi). Der Gegner stört früh: Jeder
     hat seinen Mann. Wer den Ballführenden stört, steht vor ihm zur Mitte hin; die Gegenspieler von Center und kurzem
     Flügel stehen im Passweg oder im Rücken; der Mann des tiefen Flügels ist der letzte vor dem Goalie.
     Nach einem kurzen Pass stellt sich alles neu auf, mit dem neuen Ballführenden (Center oder kurzer Flügel). */
  function layBuild(s, sc, rng, carrier) {
    const as = atkSide(sc), c = s.cfg, A = byRole(s, as), D = byRole(s, other(as));
    let car = onField(s, as, carrier);
    if (!sc.deep) {
      if (!car || BACK.indexOf(car.role) === -1) car = A[rng() < 0.5 ? 'LD' : 'RD'];
      const hi = rng() < 0.5 ? 'LW' : 'RW';
      sc.deep = { kind: 'build', n: 0, max: sc.type === 'att' ? c.deepMax : c.deepMaxAi, hi, run: A[hi].id };
    }
    const hi = sc.deep.hi, lo = hi === 'LW' ? 'RW' : 'LW', sd = r => (r === 'LD' || r === 'LW' ? -1 : 1), X = (r, off) => 180 + sd(r) * off, q = {}, isD = r => BACK.indexOf(r) !== -1;
    if (isD(car.role)) {
      const pr = car.role === 'LD' ? 'RD' : 'LD';
      q[car.role] = [X(car.role, 68), 648]; q[pr] = [X(pr, 82), 664]; q.C = [180 + sd(car.role) * 8, 548]; q[lo] = [X(lo, 134), 486]; q[hi] = [X(hi, 106), 296];
    } else if (car.role === 'C') {
      q.C = [180, 540]; q.LD = [104, 628]; q.RD = [256, 628]; q[lo] = [X(lo, 134), 410]; q[hi] = [X(hi, 106), 250];
    } else {
      const nd = car.role === 'LW' ? 'LD' : 'RD', fd = nd === 'LD' ? 'RD' : 'LD';
      q[car.role] = [X(car.role, 134), 486]; q[nd] = [X(nd, 76), 600]; q[fd] = [X(fd, 76), 640]; q.C = [180 + sd(car.role) * 20, 420]; q[hi] = [X(hi, 106), 250];
    }
    sc.carrier = car.id; sc.pos = {}; sc.mark = {};
    ROLES.forEach(r => { sc.pos[A[r].id] = jit(rng, q[r], r === car.role ? 5 : 8); sc.mark[A[r].id] = D[MARKS[r]].id; });
    const ball = sc.pos[car.id], back = (a, g) => lerp(a, GOAL, g / dist(a, GOAL)), to = (a, b, g) => lerp(a, b, g / Math.max(g, dist(a, b)));
    ROLES.forEach(r => {
      const a = sc.pos[A[r].id], d = sc.mark[A[r].id]; let p;
      if (r === car.role) p = to(a, [180, a[1] - 120], c.pressGap[r === 'C' ? 'C' : isD(r) ? 'D' : 'W']);      // stört den Ballführenden, zur Mitte hin
      else if (r === hi) p = back(a, 40);                                                 // der letzte Mann: torseitig beim tiefen Flügel
      else if (isD(r)) { if (isD(car.role)) p = to(a, [180 + sd(r) * 24, a[1] - 150], 104); else { p = lerp(a, ball, 0.42); p = [p[0] + (p[0] < 180 ? 34 : -34), p[1]]; } }      // beim zweiten Verteidiger: versperrt die Mitte. Überspielt: läuft dem Ball nach, der Rückpass bleibt offen
      else p = rng() < (r === 'C' ? c.cutC : c.cutW) ? lerp(lerp(a, ball, r === 'C' ? 0.3 : 0.26), GOAL, 0.02) : back(a, 34);      // im Passweg oder im Rücken
      sc.pos[d] = jit(rng, p, 3);
    });
  }
  /* Umschalten (layTurn): Der Ball ist in der eigenen Hälfte gewonnen. Der Gegner war im Angriff: Die meisten seiner
     Spieler sind hinter dem Ball und laufen zurück, hinten sichern einer oder zwei ab. Ein eigener Spieler läuft schon in
     die Tiefe (run), sein Gegenspieler ist bei ihm; im Konter 3 gegen 2 läuft ein zweiter aussen mit. */
  function layTurn(s, sc, rng, carrier) {
    const kind = sc.kind, as = atkSide(sc), A = byRole(s, as), D = byRole(s, other(as)), nA = kind === 'rush32' ? 3 : 2, nD = kind === 'rush32' ? 2 : 1;
    const car = onField(s, as, carrier) || A[sample({ C: 0.4, LW: 0.3, RW: 0.3 }, rng)];
    const mates = FWD.concat(BACK).map(r => A[r]).filter(x => x.id !== car.id), front = [car].concat(mates.slice(0, nA - 1)), trail = mates.slice(nA - 1);
    const backs = BACK.concat(FWD).map(r => D[r]), guard = backs.slice(0, nD), chase = backs.slice(nD), sx = rng() < 0.5 ? -1 : 1, run = front[1];
    sc.pos = {}; sc.mark = {};
    sc.pos[car.id] = jit(rng, [180 + sx * 36, 524], 8); sc.pos[run.id] = jit(rng, [180 - sx * 92, 300], 8);
    if (front[2]) sc.pos[front[2].id] = jit(rng, [180 + sx * 122, 446], 9);
    trail.forEach((x, i) => { sc.pos[x.id] = jit(rng, [96 + i * 84, 618 + (i % 2) * 30], 12); });
    const r0 = sc.pos[run.id];
    sc.pos[guard[0].id] = jit(rng, [r0[0] + sx * 20, r0[1] - 20], 3);
    if (guard[1]) sc.pos[guard[1].id] = jit(rng, [180 + sx * 44, 330], 6);
    chase.forEach((x, i) => { sc.pos[x.id] = jit(rng, [70 + i * 74, 590 + (i % 2) * 34], 10); });
    players(s, as).forEach(x => {
      const pool = front.indexOf(x) !== -1 ? guard : chase; let b = pool[0], bd = Infinity;
      pool.forEach(d => { const v = dist(sc.pos[x.id], sc.pos[d.id]); if (v < bd) { bd = v; b = d; } });
      sc.mark[x.id] = b.id;
    });
    sc.carrier = car.id; sc.deep = { kind: 'turn', n: 0, max: 1, run: run.id, sx };
  }
  /* Der Aufbau ist vorbei, vor dem Tor geht es weiter. how: 'through' (allein durch: als Alleingang, mit höchstens einer
     Aktion vor dem Schuss), 'rush21' oder 'rush32' (Überzahl; nach einer Auslösung mit einer Aktion mehr als im Konter,
     die Mitspieler sind schon aufgerückt), 'set' (die Abwehr steht: Positionsangriff). o: siehe layRush. */
  function arrive(s, sc, rng, ev, how, o) {
    const c = s.cfg, from = sc.deep.kind; o = Object.assign({ sx: sc.deep.sx }, o);
    sc.deep = null; sc.dribs = {}; sc.freed = null; sc.pos = {}; sc.mark = {}; sc.step = 0;
    if (how === 'set') { sc.kind = 'set'; sc.counter = false; sc.last = null; sc.max = sc.type === 'def' ? c.defSteps : c.settleSteps; laySet(s, sc, rng, sc.carrier); }
    else { sc.kind = how === 'through' ? 'solo' : how; sc.counter = true; sc.max = c.counterSteps + (from === 'build' && how !== 'through' ? 1 : 0); layRush(s, sc, rng, sc.kind, sc.carrier, Object.assign(o, { through: how === 'through' })); }
    sc.bar = newBar(rng);
    ev.push({ t: 'arrive', side: atkSide(sc), how, from, x: sc.carrier, tight: !!o.tight });
  }

  /* Stellt eine Chance auf. kind: set (Positionsangriff), rush32, rush21 (Konter) oder solo (Alleingang, führt direkt zum
     Schuss). deep: Die Chance beginnt nicht vor dem Tor, sondern mit dem Aufbau (Auslösung oder Umschalten). */
  function makeScene(s, rng, type, opt) {
    const o = opt || {}, kind = o.kind || 'set', c = s.cfg;
    const sc = { type, kind, step: 0, max: kind === 'set' ? (type === 'def' ? c.defSteps : c.maxSteps) : c.counterSteps, counter: kind !== 'set', pos: {}, mark: {}, carrier: null, intent: null, press: 0, dribs: {}, last: null, deep: null };
    if (kind === 'set') { if (o.deep) layBuild(s, sc, rng, o.carrier); else laySet(s, sc, rng, o.carrier); }
    else if (o.deep && kind !== 'solo') layTurn(s, sc, rng, o.carrier);
    else layRush(s, sc, rng, kind, o.carrier);
    sc.bar = newBar(rng);
    s.cur = sc;
    if (type === 'def') aiIntent(s, rng);
    s.phase = 'decide';
  }
  // Plan des Gegners in der Abwehrszene. Er schiesst eher aus guter Position, passt eher zu freien Mitspielern.
  function aiIntent(s, rng) {
    const sc = s.cur, X = card(s, 'home', sc.carrier), w = {};
    if (sc.deep) {
      /* Im Aufbau: langer Pass in die Tiefe, Vorstoss mit dem Ball oder kurzer Pass zum sichersten Mitspieler. Beim
         Umschalten ist die Bahn frei, er läuft meist selbst oder sucht den Mann in der Tiefe. */
      const dp = sc.deep, turn = dp.kind === 'turn'; let to = null, bv = -1;
      players(s, 'home').forEach(c => { if (c.id === sc.carrier || c.id === dp.run) return; const pi = passInfo(s, sc, sc.carrier, c.id), v = (1 - pi.risk) * (P(sc, c.id)[1] < P(sc, sc.carrier)[1] ? 1 : 0.5); if (v > bv) { bv = v; to = c.id; } });
      if (dp.run !== sc.carrier) w.long = (1 - passInfo(s, sc, sc.carrier, dp.run).risk) * (turn ? 0.55 : 0.5);
      w.dribble = turn ? 0.75 : dribInfo(s, sc, sc.carrier).p * 0.55;
      if (to && !(turn && sc.kind === 'rush21')) w.pass = turn ? 0.3 : 0.75;
      const k = sample(w, rng);
      sc.intent = k === 'long' ? { kind: 'pass', to: dp.run, long: true } : k === 'pass' ? { kind: 'pass', to } : { kind: 'dribble', free: openRun(s, sc) };
      return;
    }
    const sh = shotInfo(s, sc, sc.carrier);
    if (sc.step >= sc.max - 1) { sc.intent = { kind: 'shoot' }; return; }
    w.shoot = (sh.q * sh.q * (shotVal(X) / 90) * 1.6 * (1 - sh.block) + sc.step * 0.15) * (1 + 1.5 * Math.abs(oneTimer(sc, sc.carrier)));      // nach einem Querpass zieht er gern direkt ab
    let bestTo = null, bestV = 0;
    players(s, 'home').forEach(c => { if (c.id === sc.carrier) return; const pi = passInfo(s, sc, sc.carrier, c.id), v = (1 - pi.risk) * shotInfo(s, sc, c.id).q * (1 + 0.5 * Math.abs(pi.lat)) * (isFree(s, sc, c.id) ? 1.3 : 1); if (v > bestV) { bestV = v; bestTo = c.id; } });
    w.pass = bestV * 1.1;
    w.dribble = canDrib(s, sc) ? dribInfo(s, sc, sc.carrier).p * 0.45 : 0;
    const kind = sample(w, rng);
    sc.intent = kind === 'pass' ? { kind, to: bestTo } : { kind };
  }

  // --- Timing-Balken ---
  /* Grundlage ist die Chance p aus dem Wertevergleich (Pass gegen Antizipation, Dribbling gegen Zweikampf, Schuss gegen
     Block, in der Abwehr umgekehrt). Daraus wird die Breite des grünen Felds: Ein durchschnittlicher Spieler trifft es etwa
     so oft wie p. Wer genauer tippt, trifft öfter, und bessere Karten machen das Feld breiter. hit ist die Stelle des
     Strichs beim Tippen, 0 bis 1. Note: perfect (im Kern), good (im Feld), near (knapp daneben: halber Erfolg),
     bad (daneben), gross (grob daneben: im Angriff Konter für den Gegner). */
  function erfinv(x) { const a = 0.147, l = Math.log(1 - x * x), t = 2 / (Math.PI * a) + l / 2; return Math.sign(x) * Math.sqrt(Math.sqrt(t * t - l / a) - t); }
  const zone = (cfg, p) => clamp(2 * Math.SQRT2 * cfg.barRef / cfg.barSweep * erfinv(clamp(p, 0.03, 0.985)), cfg.barMin, cfg.barMax);
  function grade(cfg, hit, pos, w) { const d = Math.abs(hit - pos); return d <= w * cfg.barCore / 2 ? 'perfect' : d <= w / 2 ? 'good' : d <= w / 2 + cfg.barNear ? 'near' : d <= w / 2 + cfg.barGross ? 'bad' : 'gross'; }
  const newBar = rng => ({ pos: 0.18 + rng() * 0.64, start: rng() });
  const hitOk = a => typeof a.hit === 'number' && isFinite(a.hit) && a.hit >= 0 && a.hit <= 1;
  // Wer abwehrt und wie gut. Für Anzeige und Auflösung.
  function defChoice(s, sc, action, target) {
    const X = card(s, 'home', sc.carrier);
    let D, kind, stat, tr;
    if (action === 'press') { D = nearest(s, sc, 'you', P(sc, X.id)).c; kind = 'dribble'; stat = 'zwei'; tr = 'kampf'; }
    else if (action === 'block') { let b = null, bd = Infinity; players(s, 'you').forEach(c => { const d = distSeg(P(sc, c.id), P(sc, X.id), GOAL); if (d < bd) { bd = d; b = c; } }); D = b; kind = 'shoot'; stat = 'block'; tr = 'wand'; }
    else { D = card(s, 'you', sc.mark[target]) || nearest(s, sc, 'you', P(sc, target)).c; kind = 'pass'; stat = 'pass'; tr = 'anti'; }
    const atkV = kind === 'shoot' ? shotVal(X) : kind === 'pass' ? passVal(X) : dribVal(X), dv = stanceVal(D, stat), c = s.cfg;
    const bonus = (has(D, tr) ? c.traitBonus : 0) - (kind === 'shoot' && has(X, 'kanone') || kind === 'pass' && has(X, 'passer') || kind === 'dribble' && has(X, 'dribbler') ? c.traitBonus : 0);
    return { D, kind, atkV, dv, trait: has(D, tr) ? tr : null, p: clamp(c.stopRight + (dv - atkV) * c.stopSlope + bonus, c.stopMin, c.stopMax) };
  }
  // Abwehr: Der Plan des Gegners ist sichtbar, der passende Verteidiger reagiert von selbst. Offen ist nur das Timing.
  const ANSWER = { shoot: 'block', pass: 'lane', dribble: 'press' };
  function defInfo(s, sc) {
    const it = sc.intent, action = ANSWER[it.kind], ch = defChoice(s, sc, action, it.to);
    const p = ch.p * (it.kind === 'shoot' ? s.cfg.defBlock : s.cfg.defScale);
    return { action, D: ch.D, kind: it.kind, to: it.to || null, atkV: ch.atkV, dv: ch.dv, trait: ch.trait, p, w: clamp(zone(s.cfg, p) * (sc.dboost || 1), s.cfg.barMin, s.cfg.barMax) };
  }
  /* Balken für eine Aktion in der laufenden Szene: Chance p, Feldbreite w, Lage des Felds pos, Gegenspieler by.
     free: freier Schuss ohne Balken. a: { type: 'shoot' | 'pass' | 'dribble', to }, in der Abwehr egal. */
  function contest(s, a) {
    const sc = s.cur, X = sc.carrier, c = s.cfg;
    if (sc.type === 'def') { const d = defInfo(s, sc); return { p: d.p, w: d.w, pos: sc.bar.pos, start: sc.bar.start, by: d.D.id, free: false, sweep: Math.round(c.barSweep * tired(c, d.D)) }; }
    let p, by, free = false;
    if (a.type === 'shoot') { const sh = shotInfo(s, sc, X); p = 1 - sh.block; by = sh.by; free = true; }      // der Schuss hat seinen eigenen Balken
    else if (a.type === 'pass') { const pi = passInfo(s, sc, X, a.to); p = 1 - pi.risk; by = pi.by; }
    else { const di = dribInfo(s, sc, X); p = di.p; by = di.by; free = openRun(s, sc); }      // freie Bahn im Aufbau: Er läuft ohne Zweikampf
    return { p, w: free ? 1 : clamp(zone(c, p) * (sc.boost || 1), c.barMin, c.barMax), pos: sc.bar.pos, start: sc.bar.start, by, free, sweep: Math.round(c.barSweep * tired(c, card(s, 'you', X))) };
  }

  // --- Live-Szene: der eigene Angriff in Echtzeit ---
  /* Baut die Szene aus der laufenden Chance. pl: alle zehn Spieler mit Ort und ihren Werten für diese Szene. carrier: wer den
     Ball hat (null, solange ein Pass fliegt). fly: der Pass in der Luft. path: wohin der Ballführende läuft. mark: wer wen
     deckt. hist: Orte der letzten Schritte, damit Verteidiger verzögert reagieren. */
  function liveInit(s) {
    const sc = s.cur, c = s.cfg, boost = sc.boost || 1, pl = {}, fresh = x => 0.5 + 0.5 * tired(c, x);
    players(s, 'you').forEach((x, i) => {
      const p = P(sc, x.id);
      pl[x.id] = { id: x.id, side: 'you', role: x.role, x: p[0], y: p[1], sp: c.lvRun * fresh(x), spBall: (c.lvDrib + (dribVal(x) - 60) * c.lvDribVal) * fresh(x) * Math.sqrt(boost), pass: (c.lvPass + (passVal(x) - 60) * c.lvPassVal) * (has(x, 'passer') ? 1.15 : 1) * Math.sqrt(boost), ph: i * 1.9 + sc.bar.start * 6 };
    });
    players(s, 'home').forEach(x => {
      const p = P(sc, x.id), z = stanceVal(x, 'zwei');
      pl[x.id] = { id: x.id, side: 'home', x: p[0], y: p[1], sp: (c.lvDef + (z - 75) * c.lvDefVal) * (sc.pressed ? 1.1 : 1) * fresh(x), core: c.lvCore * (has(x, 'kampf') ? 1.2 : 1), reach: (c.lvReach + (stanceVal(x, 'pass') - 75) * c.lvReachVal) * (has(x, 'anti') ? 1.3 : 1), lag: Math.max(4, Math.round((c.lvLag - (z - 75) * c.lvLagVal) / 1000 * c.lvHz)), lapse: clamp(c.lvLapse + (stanceVal(x, 'pass') - 75) * c.lvLapseVal, 0.5, 0.97), ph: (p[0] * 7 + p[1] * 3) % 6.283, tx: p[0], ty: p[1] };
    });
    return { t: 0, hz: c.lvHz, limit: Math.round((sc.kind === 'set' ? c.lvTime : c.lvTimeRush) * c.lvHz), done: false, out: null, kind: sc.kind, carrier: sc.carrier, fly: null, loose: null, path: null, pl, mark: Object.assign({}, sc.mark),
      left: P(sc, sc.carrier)[0] < 180, last: null, grace: Math.round(c.lvPress * c.lvHz), pressAt: Math.round(c.lvPress * c.lvHz), helpAt: -99, hist: [], cost: {}, n: { pass: 0, passOk: 0, beat: 0 } };
  }
  const lvAtk = L => Object.keys(L.pl).filter(id => L.pl[id].side === 'you'), lvDef = L => Object.keys(L.pl).filter(id => L.pl[id].side === 'home');
  const lvBall = L => (L.fly ? [L.fly.x, L.fly.y] : L.loose ? L.loose : L.carrier ? [L.pl[L.carrier].x, L.pl[L.carrier].y] : [180, 200]);
  function lvStep(q, tx, ty, sp, dt) { const dx = tx - q.x, dy = ty - q.y, d = Math.hypot(dx, dy), st = sp * dt; if (d <= st || d < 0.01) { q.x = tx; q.y = ty; return d; } q.x += dx / d * st; q.y += dy / d * st; return st; }
  /* Wie offen ist der Passweg vom Ballführenden zum Mitspieler id gerade? Kleinster Abstand eines Verteidigers zur Linie,
     abzüglich seiner Reichweite und des Wegs, den er während des Flugs noch macht. Über 0: frei. */
  function liveLane(L, id) {
    const a = L.pl[L.carrier], b = L.pl[id]; if (!a || !b) return -99;
    const fl = Math.hypot(b.x - a.x, b.y - a.y) / a.pass; let m = Infinity;
    lvDef(L).forEach(k => { const d = L.pl[k], v = distSeg([d.x, d.y], [a.x, a.y], [b.x, b.y]) - d.reach - d.sp * Math.max(0, fl - d.lag / L.hz) * 0.6; if (v < m) m = v; });
    return m;
  }
  // Lage und Blockgefahr für einen Schuss von Spieler id aus dem jetzigen Stand der Szene, dazu ob es ein Direktschuss wäre
  function liveShot(s, L, id) {
    const pos = {}; Object.keys(L.pl).forEach(k => { pos[k] = [L.pl[k].x, L.pl[k].y]; });
    const si = shotInfo(s, Object.assign({}, s.cur, { pos }), id);
    return { q: si.q, block: si.block, by: si.by, oneT: L.last && L.last.to === id && L.t - L.last.at <= s.cfg.lvOneT * L.hz ? L.last.lat : 0 };
  }
  /* Befehl aus der gezeichneten Linie. Nur wer den Ball am Stock hat, kann etwas tun.
     { k: 'run', x, y } laufen, { k: 'pass', to } Pass zum Mitspieler, { k: 'shoot' } Schuss: die Szene endet, es folgt der Abschluss. */
  function liveCmd(s, L, cmd) {
    const c = s.cfg, car = L.carrier ? L.pl[L.carrier] : null; if (!car || L.fly || L.done || !cmd) return;
    if (cmd.k === 'shoot') { L.done = true; L.out = { type: 'shot', x: L.carrier, oneT: L.last && L.last.to === L.carrier && L.t - L.last.at <= c.lvOneT * L.hz ? L.last.lat : 0 }; return; }
    if (cmd.k === 'pass') {
      const R = L.pl[cmd.to]; if (!R || R.side !== 'you' || cmd.to === L.carrier) return;
      const len = Math.hypot(R.x - car.x, R.y - car.y) || 1;
      L.fly = { x: car.x, y: car.y, sx: car.x, sy: car.y, tx: R.x, ty: R.y, v: car.pass, from: L.carrier, to: cmd.to, len, lat: clamp((R.x - car.x) / 160, -1, 1), t0: L.t };
      L.n.pass++; L.cost[L.carrier] = (L.cost[L.carrier] || 0) + c.enPass; L.cost[cmd.to] = (L.cost[cmd.to] || 0) + c.enRecv; L.carrier = null; L.path = null; return;
    }
    if (cmd.k === 'run' && isFinite(cmd.x) && isFinite(cmd.y)) L.path = [clamp(+cmd.x, 24, 336), clamp(+cmd.y, 58, 392)];
  }
  /* Ein Schritt der Szene. Reihenfolge: Befehl, Ballführender läuft, Ball fliegt (Annahme oder abgefangen), Mitspieler laufen
     sich frei, Verteidiger decken und stören mit Verzögerung, Zweikampf am Ball, Uhr. */
  function liveTick(s, L, cmd) {
    if (L.done) return L;
    const c = s.cfg, dt = 1 / L.hz, atk = lvAtk(L), def = lvDef(L);
    if (cmd) liveCmd(s, L, cmd);
    if (L.done) return L;
    const car = L.carrier ? L.pl[L.carrier] : null;
    if (car) {
      if (L.path) { const d = lvStep(car, L.path[0], L.path[1], car.spBall, dt); L.cost[car.id] = (L.cost[car.id] || 0) + d * c.lvEnRun; if (car.x === L.path[0] && car.y === L.path[1]) L.path = null; }
      if (car.x < 172) L.left = true; else if (car.x > 188) L.left = false;
    }
    // Ball in der Luft
    if (L.fly) {
      const f = L.fly, dx = f.tx - f.sx, dy = f.ty - f.sy, st = f.v * dt, done = Math.hypot(f.x - f.sx, f.y - f.sy) + st;
      f.x = f.sx + dx / f.len * Math.min(done, f.len + 40); f.y = f.sy + dy / f.len * Math.min(done, f.len + 40);
      let got = null;
      for (let i = 0; i < def.length && !got; i++) { const d = L.pl[def[i]]; if (Math.hypot(d.x - f.x, d.y - f.y) < d.reach) got = d.id; }
      if (got) { L.done = true; L.out = { type: 'lost', how: 'pass', by: got, x: f.from, gross: done < f.len * 0.35 }; return L; }
      for (let i = 0; i < atk.length; i++) { const a = L.pl[atk[i]]; if (a.id !== f.from && Math.hypot(a.x - f.x, a.y - f.y) < c.lvCatch) { L.carrier = a.id; L.last = { type: 'pass', to: a.id, lat: f.lat, at: L.t }; L.fly = null; L.grace = 16; L.pressAt = L.t + Math.round(c.lvPressRecv * L.hz); L.n.passOk++; break; } }
      if (L.fly && done >= f.len + 40) { L.loose = [f.x, f.y]; L.fly = null; }      // niemand war da: freier Ball
    }
    // Freier Ball: der Nächste holt ihn
    if (L.loose) {
      let best = null, bd = Infinity; Object.keys(L.pl).forEach(k => { const q = L.pl[k], d = Math.hypot(q.x - L.loose[0], q.y - L.loose[1]); if (d < bd) { bd = d; best = q; } });
      if (bd < 12) { if (best.side === 'you') { L.carrier = best.id; L.loose = null; L.grace = 10; L.pressAt = L.t + Math.round(c.lvPressRecv * L.hz); L.n.passOk++; } else { L.done = true; L.out = { type: 'lost', how: 'loose', by: best.id, x: null, gross: false }; return L; } }
    }
    const ball = lvBall(L), snap = { ball }; atk.forEach(id => { snap[id] = [L.pl[id].x, L.pl[id].y]; }); L.hist.push(snap);
    // Mitspieler ohne Ball: auf ihre Plätze, mit kleinen Laufwegen, um sich freizulaufen. Der Angespielte läuft dem Ball entgegen.
    atk.forEach(id => {
      if (id === L.carrier) return; const a = L.pl[id];
      if (L.fly && L.fly.to === id) { lvStep(a, L.fly.tx, L.fly.ty, a.sp, dt); return; }
      if (L.loose) { lvStep(a, L.loose[0], L.loose[1], a.sp, dt); return; }
      const sp = spotOf(a.role, L.left), w = L.t / L.hz * 2.3 + a.ph, far = Math.hypot(sp[0] - GOAL[0], sp[1] - GOAL[1]) > 170 ? 0.4 : 1;
      lvStep(a, clamp(sp[0] + Math.cos(w) * c.lvWob * far, 28, 332), clamp(sp[1] + Math.sin(w * 1.3) * c.lvWob * 0.8 * far, 70, 380), a.sp * 0.9, dt);
    });
    // Hilfe: Ist der Ballführende an seinem Gegenspieler vorbei, stellt sich ihm der nächste Verteidiger in den Weg; dessen Mann wird frei
    if (car && L.t - L.helpAt > 36) {
      const m = L.pl[L.mark[car.id]];
      if (m && Math.hypot(car.x - GOAL[0], car.y - GOAL[1]) < Math.hypot(m.x - GOAL[0], m.y - GOAL[1]) - 10 && Math.hypot(car.x - m.x, car.y - m.y) > 22) {
        let h = null, hd = c.helpRange; def.forEach(k => { if (k === m.id) return; const d = Math.hypot(L.pl[k].x - car.x, L.pl[k].y - car.y); if (d < hd) { hd = d; h = k; } });
        if (h) { atk.forEach(a => { if (L.mark[a] === h && a !== car.id) L.mark[a] = m.id; }); L.mark[car.id] = h; L.helpAt = L.t; L.n.beat++; }
        else if (L.helpAt < 0) { L.helpAt = L.t; L.n.beat++; }
      }
    }
    // Verteidiger
    const press = L.t > L.pressAt, sec = L.t / L.hz;
    def.forEach(k => {
      const d = L.pl[k], old = L.hist[Math.max(0, L.hist.length - 1 - d.lag)], ob = old.ball; let tx = d.x, ty = d.y, sp = d.sp;
      const mine = atk.filter(a => L.mark[a] === k), tgt = mine.indexOf(L.carrier) !== -1 ? L.carrier : mine.sort((a, b) => Math.hypot(old[a][0] - GOAL[0], old[a][1] - GOAL[1]) - Math.hypot(old[b][0] - GOAL[0], old[b][1] - GOAL[1]))[0];
      if (L.fly) {
        // Pass unterwegs: Wer nah an der Bahn steht, geht dazwischen. Der Gegenspieler des Angespielten rückt zu ihm.
        const f = L.fly, ux = (f.tx - f.sx) / f.len, uy = (f.ty - f.sy) / f.len, along = clamp((d.x - f.sx) * ux + (d.y - f.sy) * uy, 0, f.len), qx = f.sx + ux * along, qy = f.sy + uy * along, off = Math.hypot(d.x - qx, d.y - qy), flown = Math.hypot(f.x - f.sx, f.y - f.sy);
        if (L.t - f.t0 < d.lag) { tx = d.tx; ty = d.ty; }                         // er braucht einen Moment, bis er den Pass erkennt
        else if (off < c.lvCut && along > flown) { tx = qx; ty = qy; } else if (tgt === f.to) { tx = f.tx + (GOAL[0] - f.tx) * 0.1; ty = f.ty + (GOAL[1] - f.ty) * 0.1; }
      } else if (L.loose) { tx = L.loose[0]; ty = L.loose[1]; }
      else if (tgt && tgt === L.carrier) {
        // Am Ballführenden: erst torseitig vor ihn, dann greift er an
        const cx = old[tgt][0], cy = old[tgt][1], dg = Math.hypot(cx - GOAL[0], cy - GOAL[1]) || 1;
        if (press) { tx = cx; ty = cy; sp *= c.lvAttack; } else { tx = cx + (GOAL[0] - cx) * 32 / dg; ty = cy + (GOAL[1] - cy) * 32 / dg; }
      } else if (tgt && Math.sin(sec * 1.9 + d.ph) > d.lapse) { tx = d.tx; ty = d.ty; }      // unaufmerksam: Er schaut nur auf den Ball und bleibt stehen
      else if (tgt) {
        // Ohne Ball: Wer gefährlich steht, wird im Passweg gedeckt, die anderen locker torseitig
        const ax = old[tgt][0], ay = old[tgt][1];
        if (Math.hypot(ax - GOAL[0], ay - GOAL[1]) > c.dangerDist) { tx = ax + (GOAL[0] - ax) * 0.36; ty = ay + (GOAL[1] - ay) * 0.36; }
        else { const px = ax + (ob[0] - ax) * c.denyAt, py = ay + (ob[1] - ay) * c.denyAt; tx = px + (GOAL[0] - px) * 0.1; ty = py + (GOAL[1] - py) * 0.1; }
        sp *= 0.9;
      } else { tx = d.x + (GOAL[0] - d.x) * 0.02; ty = d.y + (150 - d.y) * 0.02; }
      d.tx = tx; d.ty = ty; lvStep(d, tx, ty, sp, dt);
    });
    // Zweikampf: Kommt ein Verteidiger an den Ballführenden, ist der Ball weg. Wer in ihn hineinläuft, lädt zum Konter ein.
    if (L.grace > 0) L.grace--;
    else if (car) {
      for (let i = 0; i < def.length; i++) {
        const d = L.pl[def[i]];
        if (Math.hypot(d.x - car.x, d.y - car.y) < d.core) { const into = L.path ? ((L.path[0] - car.x) * (d.x - car.x) + (L.path[1] - car.y) * (d.y - car.y)) / ((Math.hypot(L.path[0] - car.x, L.path[1] - car.y) || 1) * (Math.hypot(d.x - car.x, d.y - car.y) || 1)) : 0; L.done = true; L.out = { type: 'lost', how: 'tackle', by: d.id, x: car.id, gross: into > 0.75 }; return L; }
      }
    }
    if (++L.t >= L.limit) { L.done = true; L.out = { type: 'time', x: L.carrier, by: L.carrier ? L.mark[L.carrier] : null }; }
    return L;
  }
  // Spielt eine ganze Szene nach. cmds: Befehle mit dem Schritt t, in dem sie kamen, aufsteigend
  function liveRun(s, cmds) {
    const L = liveInit(s), list = (cmds || []).filter(x => x && typeof x.t === 'number').slice(0, 400); let i = 0;
    while (!L.done) { let cmd = null; while (i < list.length && list[i].t <= L.t) { cmd = list[i]; i++; } liveTick(s, L, cmd); }
    return L;
  }
  /* Wendet eine gespielte Live-Szene an: Orte, Energie und Statistik übernehmen, dann Schuss (es folgt der Abschluss vor dem
     Tor), Ballverlust (bei einem groben Fehler Konter) oder Zeit abgelaufen. */
  function liveAction(s, rng, ev, a) {
    const sc = s.cur, c = s.cfg; if (!Array.isArray(a.cmds)) return false;
    const L = liveRun(s, a.cmds), o = L.out;
    Object.keys(L.pl).forEach(id => { sc.pos[id] = [L.pl[id].x, L.pl[id].y]; });
    Object.keys(L.cost).forEach(id => drain(card(s, 'you', id), L.cost[id]));
    Object.keys(L.mark).forEach(k => { sc.mark[k] = L.mark[k]; });
    s.stats.passes += L.n.pass; s.stats.passOk += L.n.passOk; s.stats.dribbles += L.n.beat; s.stats.dribOk += L.n.beat;
    if (o.type === 'shot') {
      sc.carrier = o.x; sc.last = o.oneT ? { type: 'pass', to: o.x, lat: o.oneT } : null;
      const me = card(s, 'you', o.x), sh = shotInfo(s, sc, o.x), D = card(s, 'home', sh.by);
      ev.push({ t: 'shootStart', live: true, x: o.x, q: sh.q, block: sh.block, by: sh.by, av: shotVal(me), dv: stanceVal(D, 'block'), trait: has(me, 'kanone') ? 'kanone' : null, btrait: has(D, 'wand') ? 'wand' : null });
      setShot(s, rng, 'you', o.x, sh.q, sc.counter ? 'counter' : 'attack', Object.assign({}, sh, { oneT: o.oneT })); return;
    }
    if (o.x) sc.carrier = o.x;
    ev.push({ t: 'live', out: o.type, how: o.how || null, by: o.by || null, x: o.x || null, gross: !!o.gross });
    if (o.type === 'lost') return lost(s, rng, ev, o.by, o.gross || s.fx.you.empty);
    endScene(s, ev, 'lost');
  }

  // --- Dribbling-Parcours ---
  /* Der Parcours für das Dribbling des Ballführenden in der laufenden Szene. Bahn von x min bis max, Lauf von y 0 bis len.
     defs: die Verteidiger in der Reihenfolge, in der er auf sie trifft. Zuerst sein Gegenspieler, dann wer aushilft (im Konter
     2 gegen 1 niemand, beim zweiten Dribbling desselben Spielers einer mehr). core: wer so nah kommt, verliert den Ball.
     brush: Stockbereich, wer ihn streift, wird gestört. vd: Seitentempo, lag: Verzögerung in Schritten. */
  function dribCourse(s) {
    const sc = s.cur, c = s.cfg, X = card(s, 'you', sc.carrier), di = dribInfo(s, sc, X.id);
    const others = players(s, 'home').filter(d => d.id !== di.by).sort((a, b) => dist(P(sc, a.id), P(sc, X.id)) - dist(P(sc, b.id), P(sc, X.id)));
    const n = (sc.kind === 'rush21' ? 1 : 2) + (di.again ? 1 : 0);
    return courseOf(c, clamp(di.p * (sc.boost || 1), c.dribMin, c.dribMax), { ids: [di.by].concat(others.slice(0, n - 1).map(d => d.id)), val: dribVal(X), tired: tired(c, X), start: sc.bar.start, pos: sc.bar.pos, x: X.id });
  }
  // Der Parcours aus Zahlen: Chance p, Verteidiger ids, Dribbling-Wert val, Müdigkeit tired (1 = frisch), start und pos (0 bis 1) für die Aufstellung
  function courseOf(c, p, o) {
    const hard = 1 - p, sd = o.start < 0.5 ? -1 : 1, n = o.ids.length, vmax = (c.dbVa + (o.val - 60) * c.dbVaVal) * (0.5 + 0.5 * o.tired);
    const defs = o.ids.map((id, i) => {
      const k = i ? c.dbHelp : 1, core = (c.dbCore + c.dbCoreP * hard) * k;
      return { id, y: c.dbFirst + i * c.dbGap, x: i ? (i % 2 ? sd : -sd) * (36 + 44 * o.pos) : (o.start - 0.5) * 44, core, brush: core + (i ? c.dbHelpBrush : c.dbBrush), vd: c.dbVd + c.dbVdP * hard, lag: Math.round((c.dbLag + c.dbLagP * p) / 1000 * c.dbHz) };
    });
    return { p, hz: c.dbHz, vmax, acc: vmax * c.dbAcc, adv: c.dbAdv, advAt: Math.round(c.dbAdvDelay * c.dbHz), advMax: c.dbAdvMax, limit: Math.round(c.dbTime * c.dbHz), min: -c.dbLane, max: c.dbLane, back: -14, x0: 0, len: c.dbFirst + (n - 1) * c.dbGap + c.dbEnd, x: o.x, defs };
  }
  const dribInit = co => ({ t: 0, x: co.x0, y: 0, vx: 0, vy: 0, hist: [], d: co.defs.map(d => ({ x: d.x, y: d.y, min: Infinity })), done: false, out: null, late: false });
  /* Ein Schritt. ux, uy: gewünschte Richtung und Stärke aus dem Wischen (Länge höchstens 1, uy positiv = nach vorne). Das
     Tempo des Dribblers nähert sich dem Wunsch an (er hat Trägheit). Jeder Verteidiger, an dem er noch nicht vorbei ist,
     rückt seitlich dorthin, wo der Dribbler vor lag Schritten war; der erste kommt ihm ausserdem entgegen. Berührung: Ball
     weg, Ende. Wer an einem Verteidiger vorbei ist, hat ihn hinter sich: Der zählt nicht mehr. */
  function dribTick(co, st, ux, uy) {
    if (st.done) return st;
    const dt = 1 / co.hz; let ax = typeof ux === 'number' && isFinite(ux) ? ux : 0, ay = typeof uy === 'number' && isFinite(uy) ? uy : 0;
    const m = Math.hypot(ax, ay); if (m > 1) { ax /= m; ay /= m; }
    const dvx = ax * co.vmax - st.vx, dvy = ay * co.vmax - st.vy, dv = Math.hypot(dvx, dvy), k = dv > co.acc * dt ? co.acc * dt / dv : 1;
    st.vx += dvx * k; st.vy += dvy * k;
    st.x = clamp(st.x + st.vx * dt, co.min, co.max); st.y = Math.max(co.back, st.y + st.vy * dt); st.hist.push(st.x); st.t++;
    for (let i = 0; i < co.defs.length; i++) {
      const D = co.defs[i], o = st.d[i];
      if (st.y > o.y + 4) continue;                                     // schon vorbei: Er kommt nicht mehr an den Ball
      const seen = st.hist[Math.max(0, st.hist.length - 1 - D.lag)]; o.x += clamp(seen - o.x, -D.vd * dt, D.vd * dt);
      if (i === 0 && st.t > co.advAt) o.y = Math.max(D.y - co.advMax, o.y - co.adv * dt);      // der Gegenspieler kommt entgegen
      const d = Math.hypot(st.x - o.x, st.y - o.y); if (d < o.min) o.min = d;
      if (d < D.core) { st.done = true; st.out = { hit: i, dx: st.x - o.x }; return st; }
    }
    if (st.y >= co.len) st.done = true; else if (st.t >= co.limit) { st.done = true; st.late = true; }
    return st;
  }
  /* Note nach dem Lauf. Berührt: Ball weg (bad), beim eigenen Gegenspieler frontal: grober Fehler (gross). Stockbereich des
     Gegenspielers gestreift oder in der Zeit nicht an ihm vorbeigekommen: knapp (near). An ihm sauber vorbei, vom Helfer
     gestört oder aufgehalten: gelungen (good). An allen sauber vorbei: perfekt. by: wer den Ball hat oder am nächsten dran war. */
  function dribGrade(co, st) {
    if (st.out) return { grade: st.out.hit === 0 && Math.abs(st.out.dx) < co.defs[0].core * 0.45 ? 'gross' : 'bad', by: co.defs[st.out.hit].id };
    const br = st.d.map((o, i) => o.min < co.defs[i].brush), by = co.defs[0].id;
    if (br[0] || (st.late && st.y <= st.d[0].y + 4)) return { grade: 'near', by };
    return { grade: st.late || br.slice(1).some(Boolean) ? 'good' : 'perfect', by };
  }
  // Spielt einen ganzen Lauf nach. run: pro Schritt zwei Zahlen, Richtung x und y in Hundertsteln (-100 bis 100); fehlen sie, steht der Wunsch auf null
  function dribRun(co, run) {
    const st = dribInit(co), num = v => (typeof v === 'number' && isFinite(v) ? clamp(v, -100, 100) / 100 : 0);
    for (let i = 0; i <= co.limit && !st.done; i++) dribTick(co, st, num(run[2 * i]), num(run[2 * i + 1]));
    return st;
  }

  // --- Schuss auf das Tor ---
  const zoneOf = (x, y) => (y >= 0.5 ? 't' : 'b') + (x < -0.34 ? 'l' : x > 0.34 ? 'r' : 'm');
  // Liegt der Ball in der gewählten Zone? Mit etwas Spielraum an den Grenzen: dort hält jede der beiden Zonen.
  function inZone(land, z, e) {
    const x = land[0], y = land[1], col = z[1] === 'l' ? x < -0.34 + e : z[1] === 'r' ? x > 0.34 - e : x > -0.34 - e && x < 0.34 + e;
    return col && (z[0] === 't' ? y >= 0.5 - e * 0.8 : y < 0.5 + e * 0.8);
  }
  // Streuung eines gegnerischen Schützen aus einer Lage q: Radius um sein Ziel
  function spread(s, X, q) { const c = s.cfg; return (c.sdBase + c.sdSkill * clamp((99 - shotVal(X)) / 27, 0, 1) + c.sdDist * (1 - q)) * (1 + c.enSpread * (1 - clamp(X.en === undefined ? 100 : X.en, 0, 100) / 100)); }
  // Zufälliger Punkt im Kreis, gleichmässig verteilt. Die Höhe ist gestaucht, damit der Kreis auf dem Bildschirm rund ist.
  function inDisc(rng, rad) { const r = rad * Math.sqrt(rng()), a = 2 * Math.PI * rng(); return [r * Math.cos(a), r * Math.sin(a) * 0.69]; }
  function missOf(c, land) {
    const ax = Math.abs(land[0]);
    if (ax < 1 && land[1] < 1) return null;
    const post = (ax >= 1 && ax < 1 + c.post && land[1] < 1 + c.post) || (land[1] >= 1 && land[1] < 1 + c.post && ax < 1 + c.post);
    return post ? 'post' : land[1] >= 1 ? 'high' : 'wide';
  }
  function favZone(id) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return ['tl', 'br', 'tr', 'bl', 'bm'][h % 5]; }
  // Schuss ohne Schussart (ältere Aufrufe): alles wie bisher
  const PLAIN = { w: 1, sweep: 1, reach: 0, reachFar: 0, lane: 1, tight: 1, one: 1, rx: 1, sd: 1, gain: 1 };
  const stOf = (c, sh) => (sh.style && c.styles[sh.style]) || PLAIN;
  // Was vom Direktschuss bleibt: Der Schlagschuss nimmt den Ball direkt, das Handgelenk braucht eine kurze Annahme, der Zug eine ganze
  const oneOf = (c, sh) => (sh.oneT || 0) * stOf(c, sh).one;
  // Wo der Goalie steht, wenn du zum Schuss ansetzt: fast in der Mitte; nach einem Querpass noch auf der Seite, von der der
  // Ball kam; beim Zugschuss noch dort, wo der Ball vor dem Zug lag (pull: wohin gezogen wird, -1 links, 1 rechts)
  function keeperStart(c, sh) {
    const one = oneOf(c, sh), kr = sh.kr || 0;
    if (sh.reb) return clamp((sh.kx0 || 0) + kr * 0.05, -0.7, 0.7);                      // Abpraller: Er liegt noch dort, wo er gehalten hat
    if (one) return clamp(-one * c.kOneT + kr * 0.05, -0.6, 0.6);
    if (sh.style === 'drag') return clamp(-(sh.pull || 1) * c.pull + kr * 0.05, -0.6, 0.6);
    return kr * c.kOff;
  }
  /* Schatten der Gegner im Tor für die eingestellte Schussart: [{ id, x, w, top }] in Torkoordinaten (x Mitte, w halbe
     Breite, top bis zu dieser Höhe). Vom Ball aus gesehen: Wer nah am Schützen steht, deckt fast das ganze Tor, wer vor
     dem Goalie steht, nur einen Streifen. Beim Zugschuss liegt der Ball zur Seite versetzt: Die Schatten wandern. */
  function shadows(c, sh) {
    if (!sh.blk || !sh.blk.length || sh.py === undefined) return [];
    const st = stOf(c, sh), drag = sh.style === 'drag', pull = sh.pull || 1, sx = sh.px + (drag ? pull * c.dragShift : 0), dy = sh.py - GOAL[1], k = (st.shade || 1) * (1 - c.oneShade * Math.min(1, Math.abs(oneOf(c, sh)))), out = [];
    sh.blk.forEach(b => {
      const f = (sh.py - b.y) / dy; if (!(f > 0.06 && f < 0.97)) return;
      const bx = b.x + (drag && Math.hypot(b.x - sh.px, b.y - sh.py) < c.dragNear ? pull * c.dragShift * b.fol : 0);
      const x = (sx + (bx - sx) / f - 180) / c.goalHalf, w = b.bw * k / f / c.goalHalf;
      if (Math.abs(x) - w < 1.2) out.push({ id: b.id, x: Math.round(x * 1000) / 1000, w: Math.round(w * 1000) / 1000, top: Math.round(Math.min(1.3, c.blockH / f) * 100) / 100 });
    });
    return out;
  }
  // Stellt die Schussart ein: Druck des Gegners, Schatten der Blocker und Stand des Goalies hängen von ihr ab
  function setStyle(c, sh, style) { sh.style = style; sh.block = styleBlock(c, sh, style); sh.keeper = { x: keeperStart(c, sh) }; sh.shade = shadows(c, sh); }
  // Reichweite des Goalies um seinen Körper für deinen Schuss: aus der Distanz gross, aus der Nähe klein, je härter der Schuss, desto kleiner.
  function reach(s, sh) {
    const c = s.cfg, X = card(s, 'you', sh.x), st = stOf(c, sh);
    if (sh.empty) return -1;                                                            // Goalie des Gegners ist draussen: leeres Tor
    return clamp(c.reach + c.reachDist * (1 - sh.q) - (shotVal(X) - s.teams.home.goalie.val) * c.reachVal - (has(X, 'kanone') ? c.reachTrait : 0) - (sh.ctx === 'counter' ? 0.05 : 0) - c.reachOneT * Math.abs(oneOf(c, sh))
      + st.reach + st.reachFar * (1 - sh.q) - c.screenReach * (sh.scr ? sh.scr.length : 0) - (sh.reb ? c.rebReach : 0), c.reachMin, c.reachMax);
  }
  /* Wo der Goalie t ms nach dem Setzen des Ziels steht: Er rückt zur Seite des Ziels, aber nie darüber hinaus. Nach einem
     Querpass rutscht er sofort und schnell herüber, nach einem Zug ebenso: Wer zieht, muss schnell abschliessen. */
  function keeperAt(s, sh, target, t) {
    const c = s.cfg, k0 = sh.keeper.x, gap = target[0] - k0, one = !!oneOf(c, sh) || !!sh.reb, pull = !one && sh.style === 'drag';
    const delay = one ? c.oneTDelay : pull ? c.pullDelay : c.creepDelay, speed = one ? c.oneTSpeed : pull ? c.pullSpeed : c.creepSpeed, max = one ? c.oneTMax : pull ? c.pullMax : c.creepMax;
    const move = Math.min(max, Math.max(0, (t || 0) - delay) / 1000 * speed, Math.abs(gap));
    return k0 + Math.sign(gap) * move;
  }
  // Abstand eines Punkts im Tor vom Körper des Goalies, wie er für die Parade zählt
  const kDist = (c, kx, p) => Math.hypot(p[0] - kx, (p[1] - c.kY) * c.kYs);
  /* Rechnet deinen Schuss durch, ohne etwas zu ändern: Ziel im Tor, Stelle des Strichs auf dem Schuss-Balken (hit) und
     Zeit seit dem Setzen des Ziels (t in ms). Abweichung vom Ziel: keine im Kern, am Rand des grünen Felds devEdge,
     ausserhalb im selben Mass weiter. Der Ball weicht auf die Seite ab, auf der der Strich neben der Mitte stand: Strich
     links, Ball weiter links. Dabei folgt er der Linie von der Tormitte zum Ziel: nach aussen steigt ein hoher Ball.
     pre: { b: shotBar(s), R: reach(s, s.shot) }, falls schon gerechnet (für viele Aufrufe hintereinander). */
  function evalShot(s, tg, hit, t, pre) {
    const c = s.cfg, sh = s.shot, b = pre ? pre.b : shotBar(s), target = [clamp(+tg[0], -1.2, 1.2), clamp(+tg[1], 0.03, 1.2)], e = hit - b.pos, d = Math.abs(e), g = grade(c, hit, b.pos, b.w);
    const core = b.w * c.barCore / 2, dev = d <= core ? 0 : (d - core) / (b.w / 2 - core) * c.devEdge;
    const tx = target[0], ty = (target[1] - 0.45) / 0.69, tl = Math.hypot(tx, ty) || 1, hx = Math.max(Math.abs(tx) / tl, 0.6), hy = (tx < 0 ? -1 : 1) * ty / tl, hl = Math.hypot(hx, hy);
    const sg = e < 0 ? -1 : 1, land = [tx + sg * dev * hx / hl, Math.max(0.03, target[1] + sg * dev * hy / hl * 0.69)], miss = missOf(c, land);
    const kx = keeperAt(s, sh, target, t), R = pre ? pre.R : reach(s, sh), kd = kDist(c, kx, land);
    // Geblockt: vom Gegner am Mann (unter Druck klar neben dem Feld gestoppt) oder von einem Gegner in der Schussbahn (der Ball fliegt in seinen Schatten)
    const tightB = b.pressed && (g === 'bad' || g === 'gross' || (g === 'near' && !!stOf(c, sh).hard)), sd = tightB ? null : (sh.shade || []).filter(o => Math.abs(land[0] - o.x) <= o.w && land[1] <= o.top).sort((x, y) => y.w - x.w)[0] || null;
    return { land, target, kx, reach: R, kd, grade: g, dir: sg, dev, miss, blocked: tightB || !!sd, blockBy: sd ? sd.id : sh.by, how: sd ? 'lane' : tightB ? 'tight' : null, result: miss ? 'miss' : kd <= R ? (kd <= R * 0.4 ? 'catch' : 'save') : 'goal' };
  }
  /* Schuss-Balken für deinen laufenden Schuss. Das Feld liegt in der Mitte: breit aus der Nähe, schmal aus der Distanz und
     unter Druck (Gegner nah). Die Schussart macht es breiter oder schmaler, der Lieblingsschuss des Spielers breiter.
     sweep ist die Dauer eines Durchlaufs in ms: kürzer, also schneller, bei schwachem Abschluss, bei wenig Energie und beim Schlagschuss. */
  function shotBar(s) {
    const c = s.cfg, sh = s.shot, X = card(s, 'you', sh.x), st = stOf(c, sh), fav = !!sh.style && favStyle(X) === sh.style;
    const tempo = clamp(1 + (shotVal(X) - 88) * c.shotTempo, c.tempoMin, c.tempoMax) * (has(X, 'kanone') ? 1.15 : 1) * tired(c, X) * (sh.calm ? c.fxCalm : 1) * st.sweep;
    return { w: clamp((c.shotW + c.shotWq * sh.q) * (1 - c.shotPress * clamp(sh.block / 0.75, 0, 1)), c.shotWMin, c.barMax) * st.w * (fav ? c.favW : 1), pos: 0.5, start: sh.start, sweep: Math.round(Math.max(c.sweepMin, c.barSweep * tempo)), pressed: sh.block >= c.blockFree, by: sh.by, fav };
  }
  /* Torchance einer Schussart für den Schuss sh, grob gerechnet: ein Spieler mit der üblichen Streuung am Balken (barRef),
     der beim ersten Durchgang tippt und auf die beste Stelle zielt. Gibt { p, tg } zurück. */
  const QH = [[-1.5, 0.103], [-0.75, 0.239], [0, 0.316], [0.75, 0.239], [1.5, 0.103]];
  const QT = []; [-0.85, -0.5, 0, 0.5, 0.85].forEach(x => [0.2, 0.55, 0.88].forEach(y => QT.push([x, y])));
  function styleChance(s, sh0, style) {
    const c = s.cfg, sh = Object.assign({}, sh0); setStyle(c, sh, style);
    const s2 = Object.assign({}, s, { shot: sh }), b = shotBar(s2), pre = { b, R: reach(s2, sh) }, t = 300 + b.sweep / 2; let best = -1, tg = null;
    QT.forEach(T_ => { let p = 0; QH.forEach(h => { const v = evalShot(s2, T_, clamp(0.5 + h[0] * c.barRef / b.sweep, 0, 1), t, pre); if (!v.blocked && v.result === 'goal') p += h[1]; }); if (p > best) { best = p; tg = T_; } });
    return { p: best, tg };
  }
  /* Welche Schussart passt zum Schuss sh? Die mit der besten Torchance; liegt der Lieblingsschuss kaum dahinter, er.
     Gibt { style, why, ch } zurück, ch: Torchance je Art. why, der Grund für die Anzeige:
     direct: Direktschuss nach einem Querpass. far: aus der Distanz hilft nur Härte. power: der harte Schuss kommt durch.
     tight: Gegner am Mann, nur das Handgelenk ist schnell genug. near: aus der Nähe zählt Genauigkeit. acc: genau zielen.
     lane: Gegner in der Schussbahn, der Zug öffnet ein Fenster. goalie: der Zug lässt den Goalie falsch stehen.
     fav: Lieblingsschuss. shut: die Schussbahn ist für jede Art zu. empty: leeres Tor. rebound: Abpraller. */
  function pickStyle(s, sh0) {
    const c = s.cfg, X = card(s, 'you', sh0.x), fav = favStyle(X), ch = {};
    if (sh0.reb) return { style: 'wrist', why: 'rebound', ch: { wrist: styleChance(s, sh0, 'wrist').p } };
    STYLES.forEach(st => { ch[st] = Math.round(styleChance(s, sh0, st).p * 1000) / 1000; });
    if (sh0.empty) return { style: 'wrist', why: 'empty', ch };
    let best = STYLES.reduce((a, k) => (ch[k] > ch[a] ? k : a), fav);
    if (ch[best] - ch[fav] <= 0.02) best = fav;
    if (ch[best] <= 0.001) return { style: best, why: 'shut', ch };
    const one = Math.abs(sh0.oneT || 0) >= 0.25, tightP = (sh0.tight || 0) * (sh0.bk || 0) >= c.blockFree;
    // Wie viel vom Tor die Blocker beim Handgelenkschuss zudecken (Anteil der Breite)
    const cov = (() => { const sd = shadows(c, Object.assign({}, sh0, { style: 'wrist' })).map(o => [Math.max(-1, o.x - o.w), Math.min(1, o.x + o.w)]).filter(r => r[1] > r[0]).sort((a, b) => a[0] - b[0]); let e = -1, sum = 0; sd.forEach(r => { const a = Math.max(e, r[0]); if (r[1] > a) { sum += r[1] - a; e = r[1]; } }); return sum / 2; })();
    const why = best === 'slap' ? (one ? 'direct' : sh0.q < 0.5 ? 'far' : best === fav ? 'fav' : 'power')
      : best === 'wrist' ? (tightP ? 'tight' : sh0.q >= 0.78 ? 'near' : best === fav ? 'fav' : 'acc')
        : (cov >= 0.3 ? 'lane' : best === fav ? 'fav' : 'goalie');
    return { style: best, why, ch };
  }
  // Wohin der Ball beim Zugschuss gezogen wird: zur Mitte des Felds; wer schon in der Mitte steht, zieht nach links oder rechts (kr)
  const pullDir = (px, kr) => (px === undefined || Math.abs(px - 180) < 15 ? (kr < 0 ? -1 : 1) : px < 180 ? 1 : -1);
  /* Vorschau für einen Schuss von Spieler id aus der laufenden Szene: Lage, Druck, Reichweite des Goalies und Schuss-Balken.
     from: als käme der Ball jetzt per Pass von diesem Spieler (Direktschuss). style: mit dieser Schussart, sonst mit der
     empfohlenen (auto, why: siehe pickStyle). sh ist der gedachte Schuss für evalShot. */
  function shotPreview(s, id, from, style) {
    const sc = s.cur, c = s.cfg, si = shotInfo(s, sc, id), oneT = from ? passInfo(s, sc, from, id).lat : oneTimer(sc, id);
    const sh = { side: 'you', x: id, q: si.q, ctx: sc.counter ? 'counter' : 'attack', by: si.by, start: 0, oneT, kr: 0, lane: si.lane, tight: si.tight, bk: si.bk, px: si.px, py: si.py, blk: si.blk, scr: si.scr, pull: pullDir(si.px, 0), calm: !!(s.fx && s.fx.you.calm > 0), empty: !!(s.fx && s.fx.home.empty) };
    // Für einen Mitspieler, der den Ball erst bekäme, reicht eine grobe Wahl: Die genaue Rechnung folgt, wenn er schiesst
    const pk = from && !c.styles[style] ? { style: Math.abs(oneT) >= 0.25 ? 'slap' : 'wrist', why: 'pass', ch: null } : pickStyle(s, sh); sh.auto = pk.style; sh.why = pk.why;
    setStyle(c, sh, c.styles[style] ? style : pk.style);
    const b = shotBar(Object.assign({}, s, { shot: sh }));
    return { q: si.q, block: sh.block, by: si.by, reach: reach(s, sh), sweep: b.sweep, w: b.w, pressed: b.pressed, oneT, free: isFree(s, sc, id), sh, style: sh.style, auto: pk.style, why: pk.why, ch: pk.ch, fav: b.fav, shade: sh.shade, scr: sh.scr };
  }
  /* Bereitet einen Schuss vor. opt: Lage aus shotInfo (lane, tight, bk, px, by), dazu oneT (Direktschuss) und press (Störung in ms).
     Dein Schuss: Die empfohlene Schussart ist eingestellt (auto, why), sie lässt sich bis zum Abschluss ändern. Der Goalie
     steht fast in der Mitte (keeper.x), nach einem Querpass oder beim Zugschuss noch daneben. block und by: Druck des nächsten Gegners.
     Schuss des Gegners: Schussart, Ziel, Härte und Streuung stehen sofort fest, damit die Flugbahn ehrlich gezeigt werden
     kann. window ist die Zeit in ms, bis der Ball im Tor ist. Deine Verteidiger (Block) geben dir mehr Zeit. Beim Zugschuss
     zieht der Ball zuerst zur falschen Seite: feint { land: dorthin, ms: so lange }. */
  function setShot(s, rng, side, x, q, ctx, opt) {
    const c = s.cfg, X = card(s, side, x), sh = { side, x, q, ctx }, o = opt || {};
    const lay = { q, lane: o.lane || 0, tight: o.tight || 0, bk: o.bk || 0, oneT: o.oneT || 0 };
    if (o.block && !o.bk) { lay.lane = o.block; lay.bk = 1; }                             // ältere Aufrufe kennen nur den Druck insgesamt
    if (side === 'home') {
      const w = {}; ZONES.forEach(z => { w[z] = 0.11; }); w[favZone(x)] = 0.45;
      const zc = ZC[sample(w, rng)], power = c.aiPowMin + rng() * (0.95 - c.aiPowMin), target = [zc[0] + (rng() - 0.5) * 0.24, zc[1] + (rng() - 0.5) * 0.2];
      // Schussart: meist die, die zur Lage passt, manchmal der Lieblingsschuss oder etwas Überraschendes
      const pk = ruleStyle(c, X, lay), u = rng(), style = ctx === 'rebound' ? 'wrist' : ctx === 'so' ? (u < 0.5 ? 'drag' : u < 0.8 ? 'wrist' : 'slap')
        : pk.why === 'lane' ? (u < 0.55 ? 'drag' : u < 0.85 ? 'wrist' : 'slap') : u < 0.15 ? favStyle(X) : u < 0.22 ? STYLES[Math.floor(u * 1000) % 3] : pk.style, st = c.styles[style], fav = favStyle(X) === style;
      const off = inDisc(rng, spread(s, X, q) * (has(X, 'kanone') ? c.traitShot : 1) * st.sd * (fav ? c.favSd : 1));
      const land = [target[0] + off[0], Math.max(0.03, target[1] + off[1])];
      drain(X, c.enShot);
      const defs = players(s, 'you').filter(d => d.role === 'LD' || d.role === 'RD'), dv = ctx === 'so' ? 93 : defs.reduce((a, d) => a + stanceVal(d, 'block'), 0) / defs.length;
      sh.style = style; sh.fav = fav; sh.power = power; sh.land = land; sh.miss = missOf(c, land); sh.zone = zoneOf(clamp(land[0], -0.99, 0.99), Math.min(0.99, land[1])); sh.dv = dv;
      const base = (c.rxBase - c.rxPow * (power - 0.5) - (shotVal(X) - 88) * c.rxVal + (dv - 93) * c.rxVal + c.rxDist * (1 - q) - (ctx === 'counter' ? c.rxCounter : 0) - (has(X, 'kanone') ? c.rxTrait : 0)) * (ctx === 'rebound' ? c.rebRx : 1);
      if (ctx === 'rebound') sh.reb = true;
      sh.oneT = (o.oneT || 0) * st.one;                                                   // Direktschuss: weniger Zeit
      sh.window = Math.round(clamp(base * st.rx + (o.press || 0) * st.gain - c.rxOneT * Math.abs(sh.oneT), c.rxMin, c.rxMax));
      if (style === 'drag') { const side0 = Math.abs(land[0]) >= 0.34 ? -Math.sign(land[0]) : power < 0.5 ? -1 : 1; sh.feint = { land: [side0 * clamp(Math.abs(land[0]), 0.55, 0.9), Math.min(0.95, land[1])], ms: Math.round(clamp(sh.window * c.feint, c.feintMin, c.feintMax)) }; sh.window += sh.feint.ms; }
      sh.press = o.press || 0; sh.empty = !!(s.fx && s.fx.you.empty);                    // dein Goalie ist draussen: jeder Schuss aufs Tor ist drin
    } else {
      sh.by = o.by || null; sh.start = rng(); sh.oneT = ctx === 'rebound' ? 0 : o.oneT || 0; sh.kr = rng() * 2 - 1;
      sh.lane = lay.lane; sh.tight = lay.tight; sh.bk = lay.bk; sh.pull = pullDir(o.px, sh.kr);
      sh.px = o.px; sh.py = o.py; sh.blk = o.blk || []; sh.scr = ctx === 'rebound' ? [] : o.scr || [];      // Verkehr vor dem Tor
      if (ctx === 'rebound') { sh.reb = true; sh.kx0 = o.kx || 0; }
      if (s.fx) { sh.calm = s.fx.you.calm > 0; if (sh.calm) s.fx.you.calm--; sh.empty = s.fx.home.empty; }
      const pk = pickStyle(s, sh); sh.auto = pk.style; sh.why = pk.why; sh.ch = pk.ch;
      setStyle(c, sh, pk.style);
    }
    s.shot = sh; s.phase = 'aim';
  }

  // --- Ablauf ---
  /* setup: { homeName, cfg, you: { goalie, cards }, home: { goalie, cards } }. Je 5 Karten, 2 Verteidiger und 3 Stürmer. */
  function lineup(cards) {
    const byOvr = (x, y) => y.ovr - x.ovr, def = cards.filter(c => c.pos === 'DEF').sort(byOvr).slice(0, 2), att = cards.filter(c => c.pos !== 'DEF').sort(byOvr).slice(0, 3);
    while (def.length < 2) def.push(att.pop());
    const r = ['LD', 'RD'], a = ['C', 'LW', 'RW'];
    return def.map((c, i) => Object.assign({}, c, { role: r[i], en: 100 })).concat(att.map((c, i) => Object.assign({}, c, { role: a[i], en: 100 })));
  }
  /* setup: { cfg, homeName, tactic, you: { goalie, cards, bench, tac }, home: { ... } }. cards ist die erste Linie, bench die
     zweite (fehlt sie, gibt es keine Linienwechsel), tac die Taktikkarten (höchstens drei). */
  function newMatch(setup, rng) {
    const cfg = setup.cfg || CFG;
    const team = t => ({ goalie: Object.assign({}, t.goalie), cards: lineup(t.cards), bench: t.bench && t.bench.length >= 5 ? lineup(t.bench) : null, line: 0, want: 0 });
    const deck = ids => (ids || []).filter((id, i, l) => CARDS[id] && l.indexOf(id) === i).slice(0, 3).map(id => ({ id, used: false }));
    const fx0 = () => ({ press: 0, play: 0, calm: 0, empty: false, wall: false });
    const s = {
      cfg, homeName: setup.homeName || '', teams: { you: team(setup.you), home: team(setup.home) },
      tac: { you: deck(setup.you.tac), home: deck(setup.home.tac) }, fx: { you: fx0(), home: fx0() },
      period: 0, clock: 0, from: 0, minute: 0, seq: { n: 0, acts: 0, scenes: 0, goal: false, extra: false }, duel: null, throw: null, tactic: { you: TACTICS[setup.tactic] ? setup.tactic : 'bal', home: 'bal' }, chances: { you: 0, home: 0 },
      score: { you: 0, home: 0 }, cur: null, fill: null, shot: null, phase: 'decide', pen: null, outcome: null, results: [],
      stats: { att: 0, def: 0, shots: 0, goals: 0, faced: 0, onGoal: 0, saved: 0, passes: 0, passOk: 0, dribbles: 0, dribOk: 0, stops: 0, counters: 0, bars: 0, hits: 0, perfects: 0, nears: 0, changes: 0, duels: 0, duelsWon: 0, seqs: 0, blocks: 0 }
    };
    setVal(s);
    advance(s, rng, null);
    return s;
  }
  // Angriffs- und Abwehrwert der Linien, die gerade auf dem Feld stehen
  function setVal(s) { s.val = { you: { att: attackVal(s.teams.you.cards), def: defenceVal(s.teams.you.cards) }, home: { att: attackVal(s.teams.home.cards), def: defenceVal(s.teams.home.cards) } }; }
  // Linienwechsel: Wer es wünscht, wechselt jetzt. Die Linie von der Bank kommt aufs Feld.
  function applyLines(s, ev) {
    ['you', 'home'].forEach(sd => {
      const T = s.teams[sd]; if (!T.bench || T.want === T.line) return;
      const b = T.cards; T.cards = T.bench; T.bench = b; T.line = T.want; if (sd === 'you') s.stats.changes++;
      if (ev) ev.push({ t: 'line', side: sd, line: T.line });
    });
    setVal(s);
  }
  /* Setzt eine Taktikkarte ein. Time-out und Karten mit Dauer wirken sofort, Pressing auch in der laufenden Abwehrszene,
     Kaltblütig auch für den Schuss, der gerade ansteht. Im Penaltyschiessen geht nur Kaltblütig. */
  function useCard(s, side, id, ev) {
    const d = s.tac[side].filter(x => x.id === id && !x.used)[0], f = s.fx[side], c = s.cfg, sc = s.cur;
    if (!d || s.phase === 'end' || (s.pen && id !== 'calm')) return false;
    d.used = true;
    if (id === 'timeout') all(s, side).forEach(x => drain(x, -c.fxTimeout));
    else if (id === 'press') { f.press = c.fxPress; if (side === 'you' && sc && !sc.done && sc.type === 'def' && s.phase === 'decide' && !sc.pressing) { sc.pressing = true; f.press--; } }
    else if (id === 'play') f.play = 1;
    else if (id === 'calm') { if (side === 'you' && s.shot && s.shot.side === 'you') s.shot.calm = true; else f.calm = 1; }
    else if (id === 'empty') f.empty = true;
    else if (id === 'wall') f.wall = true;
    if (ev) ev.push({ t: 'card', side, id });
    return true;
  }
  /* Trainer des Gegners, vor jeder neuen Chance: Taktik nach dem Spielstand, Linie nach der Energie (in den letzten
     Minuten eines knappen Spiels die erste), und höchstens eine Taktikkarte, wenn ihr Moment da ist. */
  function aiCoach(s, ev) {
    const c = s.cfg, T = s.teams.home, d = s.score.home - s.score.you, last = s.period >= c.periods - 1, left = (s.period + 1) * c.periodMin - s.clock, was = s.tactic.home;
    s.tactic.home = aiTactic(s); if (ev && was !== s.tactic.home) ev.push({ t: 'tactic', side: 'home', value: s.tactic.home });
    if (T.bench) {
      const on = avgEn(T.cards), off = avgEn(T.bench), clutch = last && left < 5 && Math.abs(d) <= 1;
      if (T.line === 0) T.want = on < c.aiRest && off > on + 10 && !(clutch && on > 45) ? 1 : 0;
      else T.want = off >= c.aiBack || on < off - 5 || (clutch && off > 55) ? 0 : 1;
    }
    const can = id => s.tac.home.some(x => x.id === id && !x.used), en = avgEn(all(s, 'home'));
    const pick = can('empty') && last && left <= 3.5 && d < 0 && d >= -2 && !s.fx.home.empty ? 'empty'
      : can('wall') && last && left <= 6 && d > 0 && !s.fx.home.wall ? 'wall'
      : can('timeout') && en < 62 && s.period >= 1 ? 'timeout'
      : can('play') && s.period >= 1 && d <= 0 ? 'play'
      : can('press') && s.period >= 1 && (d < 0 || (last && d === 0)) ? 'press' : null;
    if (pick) useCard(s, 'home', pick, ev);
  }
  // Chancen pro Minute für beide Seiten: Angriff gegen Abwehr, mal die eigene Taktik, mal wie offen der Gegner steht
  function rates(s) {
    const c = s.cfg, f = side => (s.fx[side].empty ? c.fxEmptyOwn : 1) * (s.fx[side].wall ? c.fxWallOwn : 1) * (s.fx[other(side)].wall ? c.fxWallOpp : 1);
    const tire = side => c.enVal * (1 - avgEn(players(s, side)) / 100);
    const r = side => c.chanceBase * Math.exp(c.chanceK * (s.val[side].att - tire(side) - s.val[other(side)].def + tire(other(side)))) * TACTICS[s.tactic[side]].own * TACTICS[s.tactic[other(side)]].open * f(side);
    return { you: r('you'), home: r('home') };
  }
  // Der Gegner stellt um: im Rückstand offensiv (spät oder ab zwei Toren), mit Vorsprung defensiv
  function aiTactic(s) { const d = s.score.home - s.score.you, late = s.period >= s.cfg.periods - 1; return d < 0 && (late || d <= -2) ? 'off' : d >= 2 || (d > 0 && late) ? 'def' : 'bal'; }
  // Art der Chance. Gegen ein offensives Team gibt es mehr Konter, gegen ein defensives fast nur Positionsangriffe.
  function pickKind(s, rng, side) {
    const open = s.tactic[other(side)];
    const w = open === 'off' ? { set: 0.36, rush32: 0.28, rush21: 0.26, solo: 0.1 } : open === 'def' ? { set: 0.74, rush32: 0.14, rush21: 0.09, solo: 0.03 } : { set: 0.56, rush32: 0.21, rush21: 0.17, solo: 0.06 };
    if (s.tactic[side] === 'def') { w.set -= 0.12; w.rush32 += 0.06; w.rush21 += 0.06; }
    return sample(w, rng);
  }
  /* Beginnt eine Szene: side hat den Ball. Ein Alleingang führt direkt zum Schuss. quiet: Die Szene folgt aus dem Spiel
     davor (kein Zeitsprung). far: beginnt mit dem Aufbau (true) oder vor dem Tor (false); fehlt es, entscheidet der Zufall. */
  function startChance(s, rng, side, kind, carrier, quiet, far) {
    const type = side === 'you' ? 'att' : 'def', c = s.cfg, fm = s.fx[side], fo = s.fx[other(side)];
    let play = false; if (fm.play > 0 && kind === 'set') { fm.play--; play = true; kind = 'rush32'; }      // Spielzug: einstudierter Angriff in Überzahl, statt des nächsten Angriffs aus dem Spiel
    s.duel = null; s.throw = null; s.shot = null; s.seq.scenes++;
    // Wo die Chance beginnt: Konter mit dem Umschalten hinten, ein Teil der Positionsangriffe mit der Auslösung. far legt es fest.
    const deep = play ? false : far !== undefined ? !!far : kind === 'solo' ? false : rng() < (kind !== 'set' ? c.turnProb : side === 'you' ? c.buildProb : c.buildProbAi);
    s.chances[side]++; if (type === 'att') s.stats.att++; else s.stats.def++;
    ['you', 'home'].forEach(sd => {
      const k = c.enChance * (s.tactic[sd] === 'off' ? c.enTacOff : s.tactic[sd] === 'def' ? c.enTacDef : 1);
      players(s, sd).forEach(x => drain(x, k)); (s.teams[sd].bench || []).forEach(x => drain(x, -c.enRest));      // die Bank erholt sich
    });
    makeScene(s, rng, type, { kind, carrier, deep });
    const sc = s.cur; sc.play = play;
    if (side === 'you') { sc.boost = (play ? c.fxPlay : 1) * (fm.empty ? c.fxEmptyAtt : 1) * (fo.press > 0 ? c.fxPressAi : 1); if (fo.press > 0) { fo.press--; sc.pressed = true; } }
    else { sc.dboost = play ? c.fxPlayAi : 1; if (fo.press > 0) { fo.press--; sc.pressing = true; } }
    sc.fresh = !quiet;                                       // beginnt nach einem Zeitsprung
    if (kind === 'solo') setShot(s, rng, side, sc.carrier, Math.max(0.8, shotInfo(s, sc, sc.carrier).q), 'counter', { px: P(sc, sc.carrier)[0] });
  }
  // --- Sequenzen ---
  // Die Uhr läuft mit jeder Eingabe ein paar Sekunden weiter, aber nie über das Drittelsende hinaus.
  const tick = (s, sec) => { const end = (s.period + 1) * s.cfg.periodMin; s.clock = Math.min(end - 0.02, s.clock + sec / 60); s.minute = Math.max(1, Math.ceil(s.clock)); };
  /* Beginnt die nächste Sequenz oder beendet das Drittel. Die erste Sequenz jedes Drittels beginnt mit dem Bully, ebenso
     jede nach einem Tor. Sonst springt die Uhr, und eine Seite hat den Ball: welche, entscheiden wie bisher die Werte
     der Linien und die Taktik (rates), die Art des Angriffs pickKind. Ist ein Goalie draussen, gibt es einmal pro
     Drittel eine Sequenz mehr. */
  function advance(s, rng, ev) {
    const c = s.cfg, start = s.period * c.periodMin, end = start + c.periodMin, was = s.seq, empty = s.fx.you.empty || s.fx.home.empty;
    aiCoach(s, ev); applyLines(s, ev);
    s.from = s.clock; s.fill = null; s.duel = null; s.throw = null; s.shot = null;
    if (was.n >= c.seqPer && !(empty && !was.extra)) {
      s.clock = end; s.minute = end; s.cur = null;
      ['you', 'home'].forEach(sd => { s.fx[sd].empty = false; s.fx[sd].wall = false; });                  // Goalie zurück, Mauern vorbei
      if (ev) ev.push({ t: 'period', period: s.period });
      if (s.period < c.periods - 1) { s.phase = 'break'; return; }
      if (s.score.you === s.score.home) { s.pen = { you: 0, home: 0, shots: { you: 0, home: 0 }, results: [] }; penShot(s, rng); } else finish(s);
      return;
    }
    const n = was.n + 1;
    s.seq = { n, acts: 0, scenes: 0, goal: false, extra: was.extra || n > c.seqPer }; s.stats.seqs++;
    if (n === 1) s.clock = start;
    else {
      const t = n > c.seqPer ? s.clock + 0.6 : n === c.seqPer ? start + c.seqLate[0] + rng() * (c.seqLate[1] - c.seqLate[0]) : start + c.periodMin * (n - 1) / c.seqPer + (rng() - 0.3) * 3;
      s.clock = Math.min(end - 0.6, Math.max(t, s.clock + 0.5));
    }
    s.minute = Math.max(1, Math.ceil(s.clock)); s.cur = null;
    if (ev) ev.push({ t: 'seq', n, from: s.from, clock: s.clock });
    if (n === 1 || was.goal) return faceoff(s, rng, ev);
    const r = rates(s), side = rng() < r.you / (r.you + r.home) ? 'you' : 'home';
    startChance(s, rng, side, pickKind(s, rng, side));
  }
  // Zeitfenster für Bully und freien Ball: Werte und Energie der beiden Spieler, adv: Vorsprung in ms (wer näher steht)
  function duelWindow(c, me, opp, base, k, adv) {
    const en = x => clamp(x.en === undefined ? 100 : x.en, 0, 100);
    return Math.round(clamp(base + (duelVal(me) - duelVal(opp)) * k + (en(me) - en(opp)) / 100 * c.foEn + (adv || 0), c.foMin, c.foMax));
  }
  /* Bully am Mittelpunkt: zu Beginn jedes Drittels und nach einem Tor. Die beiden Center stehen sich gegenüber, der Ball
     fällt nach delay ms. Der User tippt, sobald er fällt: Innerhalb von window ms gewinnt er ihn, zu früh oder zu spät
     geht er an den Gegner. */
  function faceoff(s, rng, ev) {
    const c = s.cfg, A = byRole(s, 'you').C, B = byRole(s, 'home').C;
    s.cur = null; s.shot = null; s.throw = null;
    s.duel = { kind: 'faceoff', you: A.id, home: B.id, window: duelWindow(c, A, B, c.foBase, c.foVal), delay: Math.round(c.foDelay[0] + rng() * (c.foDelay[1] - c.foDelay[0])) };
    s.phase = 'duel';
    if (ev) ev.push({ t: 'faceoff', you: A.id, home: B.id });
  }
  /* Bully oder freien Ball auflösen. { type: 'duel', rt }: rt ms nach dem Signal getippt. { type: 'duel', early: true }:
     zu früh getippt, der Ball geht an den Gegner. Fehlt rt, war es zu spät.
     Bully: Der Sieger greift an. Sauber gewonnen (oder der User war zu früh): Der Ball geht sofort nach vorn, Überzahl
     3 gegen 2. Sonst geht er zurück zum Verteidiger: Auslösung oder Positionsangriff. */
  function duelAction(s, rng, ev, a) {
    const d = s.duel, c = s.cfg; if (!d) return false;
    const early = !!a.early, rt = !early && typeof a.rt === 'number' && isFinite(a.rt) ? Math.max(0, a.rt) : Infinity;
    const won = !early && rt <= d.window, clean = won && rt <= d.window * c.foClean, side = won ? 'you' : 'home';
    s.stats.duels++; if (won) s.stats.duelsWon++;
    drain(card(s, 'you', d.you), c.enRecv); drain(card(s, 'home', d.home), c.enRecv);
    ev.push({ t: 'duel', kind: d.kind, won: side, clean, early, rt: isFinite(rt) ? Math.round(rt) : null, window: d.window, you: d.you, home: d.home, at: d.at || null, att: d.att || null });
    s.duel = null;
    if (d.kind !== 'faceoff') return afterLoose(s, rng, ev, side, d);
    const T = byRole(s, side);
    if (clean || early) startChance(s, rng, side, 'rush32', T[rng() < 0.5 ? 'LW' : 'RW'].id, true, false);
    else startChance(s, rng, side, 'set', T[rng() < 0.5 ? 'LD' : 'RD'].id, true);
  }
  /* Freier Ball vor dem Tor: nach einer Parade, die den Ball nicht festhält, nach einem Block, nach einem Pfostenschuss.
     att: wer in der Szene angreift, at: wo der Ball liegt. Steht ein Spieler klar näher (looseSkip) oder hat der Angreifer
     in dieser Szene schon waveMax freie Bälle geholt, gibt es keinen Zweikampf. Sonst tippt der User, sobald der Ball
     frei ist; wer näher steht und die besseren Werte hat, hat mehr Zeit. */
  function loose(s, rng, ev, att, at) {
    const sc = s.cur, c = s.cfg, me = nearest(s, sc, 'you', at), opp = nearest(s, sc, 'home', at), ids = { att, at, you: me.c.id, home: opp.c.id };
    sc.loose = at; sc.last = null; s.shot = null;
    const spent = (sc.waves || 0) >= c.waveMax;
    if (spent || Math.abs(me.d - opp.d) > c.looseSkip) {
      const side = spent ? other(att) : me.d < opp.d ? 'you' : 'home';
      ev.push({ t: 'loose', side: att, at, auto: true, won: side, x: ids[side] });
      return afterLoose(s, rng, ev, side, ids);
    }
    s.duel = Object.assign({ kind: 'loose', window: duelWindow(c, me.c, opp.c, c.looseBase, c.looseVal, (opp.d - me.d) * c.looseDist + (att === 'you' ? -c.looseDef : c.looseDef)), delay: Math.round(c.looseDelay[0] + rng() * (c.looseDelay[1] - c.looseDelay[0])) }, ids);
    s.phase = 'duel';
    ev.push({ t: 'loose', side: att, at, you: me.c.id, home: opp.c.id });
  }
  // Wer den freien Ball hat: der Angreifer spielt die zweite Welle, der Verteidiger hat den Ball für sein Team gewonnen
  function afterLoose(s, rng, ev, side, d) {
    if (side === d.att) return wave(s, rng, ev, d[side], d.at);
    turnover(s, rng, ev, side, 'loose', d[side]);
  }
  /* Zweite Welle: Der Angreifer hat den freien Ball. Die Szene läuft mit denselben Spielern an ihren Plätzen weiter, er
     steht dort, wo der Ball lag. Ihm bleiben waveSteps Aktionen (die letzte ist der Schuss). */
  function wave(s, rng, ev, id, at) {
    const sc = s.cur, c = s.cfg, as = atkSide(sc);
    sc.waves = (sc.waves || 0) + 1; sc.loose = null; sc.deep = null;      // sc.reb bleibt: höchstens ein direkter Nachschuss pro Szene
    sc.carrier = id; sc.pos[id] = [clamp(at[0], 40, 320), clamp(at[1], 84, 360)];
    sc.mark[id] = nearest(s, sc, other(as), sc.pos[id]).c.id;
    sc.step = 0; sc.max = c.waveSteps; sc.last = null; sc.dribs = {}; sc.freed = null; sc.intent = null; sc.press = 0; sc.bar = newBar(rng);
    s.shot = null; s.phase = 'decide';
    ev.push({ t: 'wave', side: as, x: id, at });
    if (as === 'home') aiIntent(s, rng);
  }
  /* Geht das Spiel weiter, wenn side jetzt den Ball hat, oder kommt es zur Ruhe? Je mehr Szenen die Sequenz schon hat,
     desto eher ist Ruhe. Wer nach Werten und Taktik mehr Chancen hat (rates), bleibt eher am Drücker. */
  function goOn(s, rng, side) {
    const c = s.cfg, f = clamp(rates(s)[side] / c.chanceBase, c.seqMin, c.seqMax);
    return rng() < clamp((c.seqGo[s.seq.scenes - 1] || 0) * f, 0, 1);
  }
  /* Der Ballbesitz wechselt, ohne dass das Spiel unterbrochen ist: side hat jetzt den Ball. how: 'catch' (der Goalie hält
     fest), 'behind' (Schuss daneben, der Ball liegt hinter dem Tor), 'won' (abgefangen oder Zweikampf gewonnen), 'loose'
     (freien Ball geholt). near: Der Ball ging in der Hälfte des Verlierers verloren. Dann greift side sofort vor dem Tor
     an. Sonst: Kommt das Spiel zur Ruhe (goOn), endet die Sequenz. Wenn nicht, greift side selbst an: nach einem
     gehaltenen Ball mit dem Auswurf, gegen einen aufgerückten Gegner (er war im Positionsangriff) oft mit dem Konter,
     sonst mit der Auslösung hinten. */
  function turnover(s, rng, ev, side, how, by, near) {
    const sc = s.cur, c = s.cfg, opp = other(side), high = sc.kind === 'set' && !sc.deep;
    closeChance(s, null);
    if (near) { ev.push({ t: 'turn', side, how, x: by || null, kind: 'set', near: true }); return startChance(s, rng, side, 'set', by, true, false); }
    if (!goOn(s, rng, side)) { ev.push({ t: 'end', why: how === 'catch' ? 'catch' : how === 'behind' ? 'miss' : 'lost', goal: null, calm: true, ball: side }); sc.done = true; s.shot = null; s.phase = 'done'; return; }
    if (how === 'catch') return throwOut(s, rng, ev, side, high);
    const go = how !== 'behind' && high && rng() < clamp(c.turnGo[s.tactic[opp]] + (how === 'loose' ? c.looseGo : 0) + (s.tactic[side] === 'def' ? 0.1 : 0), 0, 0.9);
    const kind = go ? sample({ rush32: 0.5, rush21: 0.5 }, rng) : 'set';
    ev.push({ t: 'turn', side, how, x: by || null, kind });
    // Konter beginnen dort, wo der Ball gewonnen wurde; hinter dem eigenen Tor und nach einem Ballgewinn gegen einen
    // aufgerückten Gegner beginnt die Auslösung. Sonst wie bei jedem Angriff aus dem Spiel: ein Teil mit der Auslösung,
    // der Rest setzt sich ohne Gegenwehr vorne fest.
    startChance(s, rng, side, kind, by, true, go || how === 'behind' || (how === 'won' && high) ? true : undefined);
    // Gegenpressing: Du hast den Ball vorne verloren, deine Spieler stehen noch hoch. Baut der Gegner jetzt hinten auf,
    // holst du den Ball schon mit «Im Feld» zurück (siehe deepDef).
    if (side === 'home' && how === 'won' && high && s.cur.deep && s.cur.deep.kind === 'build') s.cur.gegen = true;
  }
  /* Auswurf: Der Goalie hält den Ball fest und bringt ihn wieder ins Spiel.
     Dein Goalie: Du wählst. Schnell auswerfen ist ein Balken: perfekt läuft dein Konter 2 gegen 1, im Feld 3 gegen 2,
     knapp kommt der Ball an, aber die Abwehr steht; daneben fängt ihn der Gegner ab und greift an (grob daneben: Konter).
     Ruhig aufbauen ist die Auslösung hinten.
     Goalie des Gegners: Er wirft schnell aus, wenn du aufgerückt warst (throwQuick nach deiner Taktik). Dann beginnt
     sein Konter hinten, und du kannst den langen Ball abfangen. Sonst baut der Gegner hinten auf. */
  function throwOut(s, rng, ev, side, high) {
    const c = s.cfg, T = byRole(s, side);
    if (side === 'home') {
      const quick = rng() < (high ? c.throwQuick[s.tactic.you] : 0.1), kind = quick ? sample({ rush32: 0.5, rush21: 0.5 }, rng) : 'set';
      ev.push({ t: 'throw', side, quick, kind });
      return startChance(s, rng, side, kind, quick ? T[sample({ C: 0.4, LW: 0.3, RW: 0.3 }, rng)].id : null, true, true);
    }
    const to = T[rng() < 0.5 ? 'LW' : 'RW'], p = clamp(c.throwP + (s.teams.you.goalie.val - 88) * c.throwVal + (high ? c.throwSet : -c.throwSet), 0.3, 0.85);
    s.throw = { to: to.id, p, w: clamp(zone(c, p), c.barMin, c.barMax), pos: 0.18 + rng() * 0.64, start: rng(), sweep: c.barSweep, high };
    s.shot = null; s.phase = 'throw';
    ev.push({ t: 'throw', side, ask: true, to: to.id });
  }
  // { type: 'throw', quick: false } ruhig aufbauen, { type: 'throw', quick: true, hit } schnell auswerfen
  function throwAction(s, rng, ev, a) {
    const t = s.throw, c = s.cfg; if (!t) return false;
    if (!a.quick) { s.throw = null; ev.push({ t: 'throwOut', side: 'you', quick: false }); return startChance(s, rng, 'you', 'set', null, true, true); }
    if (!hitOk(a)) return false;
    const g = grade(c, a.hit, t.pos, t.w); tally(s, g); s.throw = null;
    ev.push({ t: 'throwOut', side: 'you', quick: true, to: t.to, grade: g, w: t.w, p: t.p });
    if (g === 'perfect' || g === 'good' || g === 'near') return startChance(s, rng, 'you', g === 'perfect' ? 'rush21' : g === 'good' ? 'rush32' : 'set', t.to, true, false);
    const by = byRole(s, 'home')[rng() < 0.5 ? 'LD' : 'RD'].id;      // abgefangen
    if (g === 'gross' || s.fx.you.empty) { const kind = sample({ rush21: 0.45, solo: 0.3, rush32: 0.25 }, rng); ev.push({ t: 'counter', side: 'home', x: by, kind, near: true }); return startChance(s, rng, 'home', kind, by, true, false); }
    ev.push({ t: 'turn', side: 'home', how: 'won', x: by, kind: 'set', near: true });
    startChance(s, rng, 'home', 'set', by, true, false);
  }
  const closeChance = (s, goal) => { s.results.push({ type: s.cur.type, kind: s.cur.kind, goal: goal || null, minute: s.minute }); };
  function endScene(s, ev, why) {
    const goal = s.cur.goal || null;
    closeChance(s, goal);
    ev.push({ t: 'end', why, goal });
    s.cur.done = true; s.phase = 'done';
  }
  /* Ballverlust. Der Gegner hat den Ball (siehe turnover). Ein grober Fehler (weit neben dem Feld) gibt ihm sofort den
     Konter: meist in Überzahl gegen deine Verteidiger, nur selten allein vor dem Tor. near: Der Ball ging im Aufbau in der
     eigenen Hälfte verloren. Dann steht der Gegner schon vor deinem Tor, öfter allein; sonst beginnt sein Konter mit dem Umschalten. */
  function lost(s, rng, ev, by, counter, near) {
    if (!counter) return turnover(s, rng, ev, 'home', 'won', by, near);
    const kind = sample(near ? { rush21: 0.45, solo: 0.3, rush32: 0.25 } : { rush32: 0.42, rush21: 0.42, solo: 0.16 }, rng);
    ev.push({ t: 'counter', side: 'home', x: by, kind, near: !!near });
    closeChance(s, null);
    startChance(s, rng, 'home', kind, by, true, !near);
  }
  const tally = (s, g) => { s.stats.bars++; if (g === 'perfect' || g === 'good') s.stats.hits++; if (g === 'perfect') s.stats.perfects++; if (g === 'near') s.stats.nears++; };
  /* Aktion im Aufbau (dein Angriff). Geschossen wird hier nicht.
     Langer Pass in die Tiefe (zu deep.run). Beim Umschalten: im Feld heisst allein durch, mit einem Verfolger im Rücken;
     perfekt: ganz frei. In der Auslösung: im Feld heisst 2 gegen 1, perfekt allein durch. Knapp: Er nimmt den Ball an,
     aber der Verteidiger ist dran. Daneben: Ball weg.
     Vorstoss mit dem Ball. Freie Bahn (Umschalten): ohne Zweikampf, der Konter läuft wie gewohnt vors Tor. Auslösung: Der
     Parcours gegen die Gegner, die stören. Vorbei heisst 3 gegen 2 (perfekt: Auch der zweite Verteidiger ist überlaufen);
     knapp: kein Raumgewinn. Ein grober Fehler in der eigenen Hälfte (Pass oder Vorstoss) ist ein Konter für den Gegner
     direkt vor deinem Tor.
     Kurzer Pass. Auslösung: Der Ball läuft, alle stellen sich neu auf; nach deep.max Aktionen steht die Abwehr des
     Gegners, und es geht als Positionsangriff weiter. Umschalten: Der Empfänger führt den Konter weiter; ein Rückpass
     bricht ihn ab. */
  function deepAction(s, rng, ev, a) {
    const sc = s.cur, c = s.cfg, dp = sc.deep, X = sc.carrier, me = card(s, 'you', X), turn = dp.kind === 'turn', base = sc.kind;
    if (a.type === 'shoot') return false;                               // zu weit weg
    if (a.type === 'pass' && (!onField(s, 'you', a.to) || a.to === X)) return false;
    const ct = contest(s, a), course = a.type === 'dribble' && !ct.free && Array.isArray(a.run) && a.run.length <= 4000 ? dribCourse(s) : null;
    if (!ct.free && !course && !hitOk(a)) return false;
    const dr = course ? dribGrade(course, dribRun(course, a.run)) : null; if (dr) ct.by = dr.by;
    const g = ct.free ? 'good' : dr ? dr.grade : grade(c, a.hit, ct.pos, ct.w), ok = g === 'perfect' || g === 'good' || g === 'near', D = card(s, 'home', ct.by), own = P(sc, X)[1] > 400;
    if (!ct.free) tally(s, g);
    if (a.type === 'pass') {
      const pi = passInfo(s, sc, X, a.to), ahead = P(sc, a.to)[1] < P(sc, X)[1] - 20;
      s.stats.passes++; drain(me, c.enPass); drain(card(s, 'you', a.to), c.enRecv);
      ev.push({ t: 'pass', from: X, to: a.to, ok, grade: g, w: ct.w, risk: 1 - ct.p, by: ct.by, long: pi.long, deep: dp.kind, av: passVal(me), dv: stanceVal(D, 'pass'), trait: has(me, 'passer') ? 'passer' : null, dtrait: has(D, 'anti') ? 'anti' : null });
      if (!ok) { sc.pos[ct.by] = lerp(P(sc, X), P(sc, a.to), pi.long ? 0.82 : 0.5); return lost(s, rng, ev, ct.by, g === 'gross' || s.fx.you.empty, own && !pi.long); }
      s.stats.passOk++; dp.n++;
      sc.carrier = a.to; sc.last = { type: 'pass', to: a.to, lat: g === 'near' || pi.long ? 0 : pi.lat };      // nach einem langen Ball wird angenommen, nicht direkt geschossen
      if (a.to === dp.run) {
        const how = g === 'near' ? (turn ? base : 'rush21') : turn || g === 'perfect' ? 'through' : 'rush21';
        return arrive(s, sc, rng, ev, how, { tight: g === 'near' || (how === 'through' && !(turn && g === 'perfect')) });
      }
      if (turn) return arrive(s, sc, rng, ev, ahead ? base : 'set', { tight: g === 'near' });
      if (dp.n >= dp.max) return arrive(s, sc, rng, ev, 'set');
      layBuild(s, sc, rng, a.to); sc.bar = newBar(rng); return;
    }
    if (ct.free) { drain(me, c.enPass); dp.n++; ev.push({ t: 'carry', side: 'you', x: X, deep: dp.kind }); return arrive(s, sc, rng, ev, turn ? base : 'rush32'); }
    s.stats.dribbles++; drain(me, c.enDrib);
    ev.push({ t: 'dribble', x: X, by: ct.by, ok, grade: g, w: ct.w, p: ct.p, deep: dp.kind, av: dribVal(me), dv: stanceVal(D, 'zwei'), trait: has(me, 'dribbler') ? 'dribbler' : null, dtrait: has(D, 'kampf') ? 'kampf' : null });
    if (!ok) return lost(s, rng, ev, ct.by, g === 'gross' || s.fx.you.empty, own);
    dp.n++; sc.last = { type: 'dribble', x: X };
    if (g === 'near') { if (dp.n >= dp.max) return arrive(s, sc, rng, ev, 'set'); sc.dribs[X] = (sc.dribs[X] || 0) + 1; sc.bar = newBar(rng); return; }
    s.stats.dribOk++;
    arrive(s, sc, rng, ev, turn ? base : 'rush32', { late: g === 'perfect' });
  }
  /* Abwehr im Aufbau des Gegners: ein Balken gegen seine Aktion. Einen langen Pass fängst du schon mit «Im Feld» ab (er
     ist lange unterwegs), sonst gewinnt wie immer nur «Perfekt» den Ball. Gegenpressing (sc.gegen: Du hast den Ball
     eben vorne verloren): Schon «Im Feld» holt ihn zurück, und dein Angriff geht als Positionsangriff weiter. Ein Ballgewinn weit vorne ist sofort eine
     Chance vor dem Tor; nach einem abgefangenen langen Pass beginnt dein Konter hinten.
     Kommt der lange Pass an: knapp gestört heisst, dein Verteidiger ist dran; daneben: Überzahl oder allein durch.
     Vorstoss in der Auslösung: Im Feld gestört bleibt er hängen, und deine Abwehr steht. */
  function deepDef(s, rng, ev, a) {
    const sc = s.cur, c = s.cfg, dp = sc.deep, X = card(s, 'home', sc.carrier), it = sc.intent, turn = dp.kind === 'turn', base = sc.kind;
    if (!hitOk(a)) return false;
    const d = defInfo(s, sc), D = d.D, g = grade(c, a.hit, sc.bar.pos, d.w), long = it.kind === 'pass' && !!it.long, back = g === 'good' && !!sc.gegen && !sc.pressing && !long, won = g === 'perfect' || (g === 'good' && (!!sc.pressing || long || !!sc.gegen));
    const gain = g === 'good' ? c.pressGood : g === 'near' ? c.pressNear : g === 'gross' ? -c.rxLate : 0;
    tally(s, g); drain(D, c.enDef);
    sc.press = (sc.press || 0) + gain;
    ev.push({ t: 'defend', action: d.action, target: it.to || null, intent: it, by: D.id, x: X.id, stopped: won, grade: g, gain, w: d.w, av: d.atkV, dv: d.dv, trait: d.trait, long, deep: dp.kind });
    if (back) {
      // Gegenpressing: Ball zurückgeholt, dein Angriff geht vor dem Tor weiter (kein Konter: der Gegner steht noch hinten)
      s.stats.stops++; ev.push({ t: 'turn', side: 'you', how: 'press', x: D.id, kind: 'set' });
      closeChance(s, null); startChance(s, rng, 'you', 'set', D.id, true, false); return;
    }
    if (won) {
      const kind = sample(long ? { rush32: 0.5, rush21: 0.4, solo: 0.1 } : { rush21: 0.45, solo: 0.3, rush32: 0.25 }, rng);
      s.stats.stops++; s.stats.counters++; ev.push({ t: 'counter', side: 'you', x: D.id, kind, near: !long });
      closeChance(s, null); startChance(s, rng, 'you', kind, D.id, true, long); return;
    }
    const tight = g === 'good' ? 1 : g === 'near' ? 0.5 : 0;
    dp.n++;
    if (it.kind === 'pass') {
      const lat = passInfo(s, sc, X.id, it.to).lat, ahead = P(sc, it.to)[1] < P(sc, X.id)[1] - 20;
      sc.carrier = it.to; sc.last = { type: 'pass', to: it.to, lat: long || tight >= 1 ? 0 : lat };
      if (long) { const how = tight ? (turn ? base : 'rush21') : turn || g === 'gross' ? 'through' : 'rush21'; arrive(s, sc, rng, ev, how, { tight: tight > 0 || (how === 'through' && !(turn && g === 'gross')) }); }
      else if (turn) arrive(s, sc, rng, ev, ahead ? base : 'set', { tight: tight > 0 });
      else if (dp.n >= dp.max) arrive(s, sc, rng, ev, 'set');
      else { layBuild(s, sc, rng, it.to); sc.bar = newBar(rng); }
    } else if (turn) arrive(s, sc, rng, ev, base, { tight: tight >= 1 });
    else if (tight >= 1) { if (dp.n >= dp.max) arrive(s, sc, rng, ev, 'set'); else sc.bar = newBar(rng); }
    else arrive(s, sc, rng, ev, g === 'gross' ? 'rush21' : 'rush32');
    // allein durch: Er schiesst sofort
    if (!sc.deep && sc.kind === 'solo') { setShot(s, rng, 'home', sc.carrier, Math.max(0.8, shotInfo(s, sc, sc.carrier).q), 'counter', { px: P(sc, sc.carrier)[0], press: sc.press }); return; }
    aiIntent(s, rng);
  }
  /* Angriff. perfekt: Vorteil (freier Empfänger, mehr Raum, genauerer Schuss). im Feld: gelungen. knapp daneben: halb
     gelungen (Pass kommt an, aber der Gegenspieler steht eng; Dribbling ohne Raumgewinn; Schuss gestört und streut stärker).
     daneben: Ball weg. grob daneben: Ball weg und Konter für den Gegner. */
  function attAction(s, rng, ev, a) {
    const sc = s.cur, X = sc.carrier, me = card(s, 'you', X);
    if (sc.deep) return deepAction(s, rng, ev, a);
    if (a.type !== 'shoot' && sc.step >= sc.max - 1) return false;      // letzte Aktion der Szene: nur noch Schuss
    if (a.type === 'pass' && (!onField(s, 'you', a.to) || a.to === X)) return false;
    if (a.type === 'dribble' && !canDrib(s, sc)) return false;          // direkt vor dem Tor: kein Platz für ein Dribbling
    const c = contest(s, a), course = a.type === 'dribble' && Array.isArray(a.run) && a.run.length <= 4000 ? dribCourse(s) : null;
    if (!c.free && !course && !hitOk(a)) return false;
    // Dribbling: der gesteuerte Lauf durch den Parcours entscheidet (ohne Lauf, etwa in alten Tests: der Balken)
    const dr = course ? dribGrade(course, dribRun(course, a.run)) : null; if (dr) c.by = dr.by;
    const g = c.free ? 'good' : dr ? dr.grade : grade(s.cfg, a.hit, c.pos, c.w), ok = g === 'perfect' || g === 'good' || g === 'near', D = card(s, 'home', c.by);
    if (!c.free) tally(s, g);
    if (a.type === 'shoot') {
      const sh = shotInfo(s, sc, X);
      ev.push({ t: 'shootStart', x: X, q: sh.q, block: sh.block, by: sh.by, av: shotVal(me), dv: stanceVal(D, 'block'), trait: has(me, 'kanone') ? 'kanone' : null, btrait: has(D, 'wand') ? 'wand' : null });
      setShot(s, rng, 'you', X, sh.q, sc.counter ? 'counter' : 'attack', Object.assign({}, sh, { oneT: oneTimer(sc, X) })); return;
    }
    if (a.type === 'pass') {
      s.stats.passes++; drain(me, s.cfg.enPass); drain(card(s, 'you', a.to), s.cfg.enRecv);
      ev.push({ t: 'pass', from: X, to: a.to, ok, grade: g, w: c.w, risk: 1 - c.p, by: c.by, av: passVal(me), dv: stanceVal(D, 'pass'), trait: has(me, 'passer') ? 'passer' : null, dtrait: has(D, 'anti') ? 'anti' : null });
      if (!ok) { sc.pos[c.by] = lerp(P(sc, X), P(sc, a.to), 0.5); return lost(s, rng, ev, c.by, g === 'gross' || s.fx.you.empty); }
      s.stats.passOk++;
      // Der Gegenspieler des Empfängers rückt nach: nach einem perfekten Pass kaum, nach einem knappen Pass steht er eng dran
      const m = sc.mark[a.to], lat = passInfo(s, sc, X, a.to).lat; if (m) sc.pos[m] = lerp(P(sc, m), lerp(P(sc, a.to), GOAL, 0.15), g === 'perfect' ? 0.05 : g === 'near' ? 0.92 : 0.2);
      sc.carrier = a.to; shift(s, sc, rng); sc.step++; sc.bar = newBar(rng);
      sc.last = { type: 'pass', to: a.to, lat: g === 'near' ? 0 : lat };       // knapper Pass: Annahme dauert, kein Direktschuss
      return;
    }
    s.stats.dribbles++; drain(me, s.cfg.enDrib);
    ev.push({ t: 'dribble', x: X, by: c.by, ok, grade: g, w: c.w, p: c.p, av: dribVal(me), dv: stanceVal(D, 'zwei'), trait: has(me, 'dribbler') ? 'dribbler' : null, dtrait: has(D, 'kampf') ? 'kampf' : null });
    if (!ok) return lost(s, rng, ev, c.by, g === 'gross' || s.fx.you.empty);
    sc.dribs[X] = (sc.dribs[X] || 0) + 1; sc.last = { type: 'dribble', x: X };
    if (g !== 'near') {
      s.stats.dribOk++;
      /* Vorbei: ein Stück näher ans Tor (perfekt mehr), aber nicht tiefer als bis vor den Slot; von dort geht es nur noch zur
         Mitte. Der Gegenspieler bleibt stehen, der nächste Verteidiger hilft aus und lässt dafür seinen Mann frei. */
      const cf = s.cfg, p = P(sc, X), dG = dist(p, GOAL), fwd = Math.min(g === 'perfect' ? cf.dribStepPerfect : cf.dribStep, Math.max(0, dG - cf.dribStop));
      const to = fwd > 12 ? lerp(p, GOAL, fwd / dG) : [p[0] + Math.sign(180 - p[0]) * 26, p[1]];
      sc.pos[c.by] = [p[0], p[1] + 6];
      sc.pos[X] = [clamp(to[0] + (p[0] < 180 ? 12 : -12), 40, 320), Math.max(80, to[1])];
      const h = help(s, sc, X, c.by);
      ev[ev.length - 1].help = h ? h.by : null; ev[ev.length - 1].freed = h ? h.free : [];
    }
    shift(s, sc, rng); sc.step++; sc.bar = newBar(rng);
  }
  /* Abwehr: ein Balken pro Aktion des Gegners. Nur genau in der Mitte (perfekt) gewinnst du den Ball, daraus wird ein
     Konter. Gegen einen Schuss blockt schon «Im Feld»: Der Ball springt weg und liegt frei (siehe loose). Sonst kommt
     der Gegner durch, aber je besser du triffst, desto stärker ist er gestört: im Feld deutlich, knapp daneben etwas. Die Störung summiert sich über die Szene und gibt deinem Goalie beim Schuss mehr Zeit (press, in ms).
     Grob daneben kostet Zeit. */
  function defAction(s, rng, ev, a) {
    const sc = s.cur, X = card(s, 'home', sc.carrier), it = sc.intent, c = s.cfg;
    if (sc.deep) return deepDef(s, rng, ev, a);
    if (!hitOk(a)) return false;
    const d = defInfo(s, sc), D = d.D, g = grade(c, a.hit, sc.bar.pos, d.w), won = g === 'perfect' || (!!sc.pressing && g === 'good');
    const gain = g === 'good' ? c.pressGood : g === 'near' ? c.pressNear : g === 'gross' ? -c.rxLate : 0;
    tally(s, g); drain(D, c.enDef);
    sc.press = (sc.press || 0) + gain;
    const blocked = !won && it.kind === 'shoot' && g === 'good' && !s.fx.you.empty;      // im Feld gegen den Schuss: geblockt
    ev.push({ t: 'defend', action: d.action, target: it.to || null, intent: it, by: D.id, x: X.id, stopped: won, blocked, grade: g, gain, w: d.w, av: d.atkV, dv: d.dv, trait: d.trait });
    if (blocked) {
      // Dein Verteidiger wirft sich in den Schuss: Der Ball springt von ihm weg und liegt frei
      const bp = lerp(P(sc, X.id), GOAL, 0.3); sc.pos[D.id] = bp; s.stats.blocks++;
      return loose(s, rng, ev, 'home', [clamp(Math.round(bp[0] + (rng() - 0.5) * 60), 40, 320), clamp(Math.round(bp[1] + 10 + rng() * 24), 84, 300)]);
    }
    if (won) {
      const kind = sample({ rush32: 0.5, rush21: 0.4, solo: 0.1 }, rng);
      s.stats.stops++; s.stats.counters++; ev.push({ t: 'counter', side: 'you', x: D.id, kind });
      closeChance(s, null); startChance(s, rng, 'you', kind, D.id, true); return;
    }
    if (it.kind === 'shoot') { const si = shotInfo(s, sc, X.id); setShot(s, rng, 'home', X.id, si.q, 'attack', Object.assign({}, si, { press: sc.press, oneT: oneTimer(sc, X.id) })); return; }
    const tight = g === 'good' ? 1 : g === 'near' ? 0.5 : 0;      // gestört: Empfänger enger gedeckt, weniger Raumgewinn
    if (it.kind === 'pass') { const m = sc.mark[it.to], lat = passInfo(s, sc, X.id, it.to).lat; sc.pos[m] = lerp(P(sc, m), P(sc, it.to), 0.3 + 0.55 * tight); sc.carrier = it.to; sc.last = { type: 'pass', to: it.to, lat: tight >= 1 ? 0 : lat }; }
    else {
      const p = P(sc, X.id), dG = dist(p, GOAL), fwd = Math.min(c.dribStep - 34 * tight, Math.max(0, dG - c.dribStop)), to = fwd > 12 ? lerp(p, GOAL, fwd / dG) : [p[0] + Math.sign(180 - p[0]) * 22, p[1]];
      sc.pos[X.id] = [to[0], Math.max(80, to[1])]; sc.pos[D.id] = [p[0], p[1] + 6]; sc.dribs[X.id] = (sc.dribs[X.id] || 0) + 1; sc.last = { type: 'dribble', x: X.id };
      if (!tight) help(s, sc, X.id, D.id);
    }
    shift(s, sc, rng);
    sc.step++; sc.bar = newBar(rng);
    aiIntent(s, rng);
  }
  /* Schuss auflösen.
     Dein Schuss { target, hit, t }: siehe evalShot. hit ist die Stelle des Strichs auf dem Schuss-Balken, t die Zeit in ms
     seit dem Setzen des Ziels (so weit ist der Goalie schon zur Ecke gerückt).
     Schuss des Gegners { zone, rt }: gehalten, wenn du rechtzeitig (rt ms nach dem Abschluss) die richtige Zone antippst. */
  function shoot(s, rng, ev, a) {
    const sh = s.shot, c = s.cfg, X = card(s, sh.side, sh.x); let r;
    if (sh.side === 'you') {
      if (!a.target || !isFinite(a.target[0]) || !isFinite(a.target[1]) || !hitOk(a)) return false;
      const v = evalShot(s, a.target, a.hit, typeof a.t === 'number' && isFinite(a.t) ? Math.max(0, a.t) : 0);
      tally(s, v.grade); drain(X, c.enShot);
      // Geblockt: unter Druck klar daneben (how 'tight': der Gegner am Mann) oder in den Schatten eines Gegners in der Schussbahn geschossen (how 'lane')
      if (v.blocked) {
        ev.push({ t: 'shot', side: 'you', x: sh.x, ctx: sh.ctx, q: sh.q, style: sh.style, pull: sh.pull, result: 'blocked', how: v.how, grade: v.grade, dir: v.dir, by: v.blockBy, target: v.target, land: v.land, kx: v.kx });
        s.stats.shots++; s.shot = null; s.phase = 'decide';
        if (sh.ctx === 'so') { const P_ = s.pen; P_.shots.you++; P_.results.push({ side: 'you', goal: false }); s.phase = 'done'; return; }
        if (v.grade === 'gross' || s.fx.you.empty) return lost(s, rng, ev, v.blockBy, true);
        // Der Ball springt vom Blocker weg: freier Ball
        const bp = P(s.cur, v.blockBy);
        return loose(s, rng, ev, 'you', [clamp(Math.round(bp[0] + (rng() - 0.5) * 60), 40, 320), clamp(Math.round(bp[1] + 10 + rng() * 24), 84, 300)]);
      }
      r = { land: v.land, zone: zoneOf(clamp(v.land[0], -0.99, 0.99), Math.min(0.99, v.land[1])), target: v.target, power: 0.6, kx: v.kx, reach: v.reach, kd: v.kd, grade: v.grade, dir: v.dir, dev: v.dev, miss: v.miss, empty: !!sh.empty, calm: !!sh.calm, result: v.result };
    } else {
      const zn = ZONES.indexOf(a.zone) !== -1 ? a.zone : null, rt = typeof a.rt === 'number' && isFinite(a.rt) ? Math.max(0, a.rt) : Infinity;
      const right = !!zn && inZone(sh.land, zn, c.rxEdge), inTime = rt <= sh.window;
      r = { land: sh.land, zone: sh.zone, guess: zn, power: sh.power, rt: isFinite(rt) ? Math.round(rt) : null, window: sh.window, right, inTime, miss: sh.miss, empty: !!sh.empty, result: sh.miss ? 'miss' : sh.empty ? 'goal' : right && inTime ? (rt <= sh.window * 0.6 ? 'catch' : 'save') : 'goal' };
    }
    const goal = r.result === 'goal';
    if (sh.side === 'you') { s.stats.shots++; if (goal) s.stats.goals++; } else { s.stats.faced++; if (r.result === 'save' || r.result === 'catch') s.stats.saved++; if (!sh.miss) s.stats.onGoal++; }
    ev.push(Object.assign({ t: 'shot', side: sh.side, x: sh.x, ctx: sh.ctx, q: sh.q, style: sh.style, pull: sh.pull || 0, feint: sh.feint || null, fav: sh.side === 'you' ? favStyle(X) === sh.style : !!sh.fav }, r));
    s.shot = null;
    if (sh.ctx === 'so') { const P_ = s.pen; if (goal) P_[sh.side]++; P_.shots[sh.side]++; P_.results.push({ side: sh.side, goal }); s.phase = 'done'; return; }
    if (goal) { s.score[sh.side]++; s.cur.goal = sh.side; ['you', 'home'].forEach(sd => { if (s.fx[sd].empty) { s.fx[sd].empty = false; ev.push({ t: 'fx', side: sd, id: 'empty', on: false }); } }); }      // nach einem Tor steht der Goalie wieder drin
    // Abpraller: Die Parade hält den Ball nicht fest, ein Angreifer ist zuerst dort und schiesst sofort nach
    const rb = r.result === 'save' ? reboundTo(s, sh.side, r.land) : null;
    if (rb) {
      const sc = s.cur; sc.reb = true; sc.pos[rb.x] = rb.at; sc.carrier = rb.x; sc.last = null;
      ev[ev.length - 1].rebound = rb.x; ev.push({ t: 'rebound', side: sh.side, x: rb.x, from: sh.x, at: rb.at });
      const si = shotInfo(s, sc, rb.x);
      setShot(s, rng, sh.side, rb.x, Math.max(si.q, 0.85), 'rebound', Object.assign({}, si, { kx: clamp(r.land[0], -1, 1) * c.rebK }));
      return;
    }
    if (goal) return endScene(s, ev, 'goal');
    // Kein Tor: Der Ball bleibt im Spiel
    const def = other(sh.side);
    if (r.result === 'catch') return turnover(s, rng, ev, def, 'catch');
    if (r.result === 'save') return loose(s, rng, ev, sh.side, reboundSpot(c, r.land));
    if (r.miss === 'post') return loose(s, rng, ev, sh.side, [Math.round(180 + (r.land[0] < 0 ? -1 : 1) * (28 + rng() * 34)), Math.round(GOAL[1] + 46 + rng() * 30)]);      // vom Pfosten zurück ins Feld
    turnover(s, rng, ev, def, 'behind', byRole(s, def)[rng() < 0.5 ? 'LD' : 'RD'].id);
  }
  /* Abpraller: wohin der Ball nach einer Parade springt und wer zuerst dort ist. Gibt { x, at } zurück, wenn ein Angreifer
     nachschiessen kann, sonst null (der Verteidiger klärt, oder es gab in dieser Chance schon einen Abpraller). */
  const reboundSpot = (c, land) => [Math.round(180 + clamp(land[0], -1, 1) * c.rebSide), GOAL[1] + c.rebOut];
  function reboundTo(s, side, land) {
    const sc = s.cur, c = s.cfg; if (!sc || sc.reb || !sc.pos) return null;
    const at = reboundSpot(c, land), a = nearest(s, sc, side, at), d = nearest(s, sc, other(side), at);
    return a.c && a.d < c.rebDist && a.d + c.rebEdge < d.d ? { x: a.c.id, at } : null;
  }
  // Penaltyschiessen bei Unentschieden: je drei Schüsse, dann sudden death. Du beginnst.
  function penShot(s, rng) {
    const P_ = s.pen, side = P_.shots.you <= P_.shots.home ? 'you' : 'home', order = all(s, side).sort((a, b) => shotVal(b) - shotVal(a)).slice(0, 5);
    setShot(s, rng, side, order[P_.shots[side] % order.length].id, 0.8, 'so');
  }
  function penOver(P_) {
    const a = P_.shots.you, b = P_.shots.home;
    if (a <= 3 && b <= 3) return P_.you > P_.home + (3 - b) || P_.home > P_.you + (3 - a);
    return a === b && P_.you !== P_.home;
  }
  function next(s, rng, ev) {
    if (s.pen) { if (penOver(s.pen)) finish(s); else penShot(s, rng); return; }
    if (s.phase === 'break') { s.period++; s.seq = { n: 0, acts: 0, scenes: 0, goal: false, extra: false }; ['you', 'home'].forEach(sd => all(s, sd).forEach(c => drain(c, -s.cfg.enBreak))); }
    else if (s.cur && s.cur.goal) {
      // Nach einem Tor: Bully. Ist die Sequenz noch jung, läuft sie weiter; sonst beginnt die nächste, ebenfalls mit dem Bully.
      if (s.seq.scenes <= s.cfg.seqGoal) { aiCoach(s, ev); applyLines(s, ev); tick(s, 25); return faceoff(s, rng, ev); }
      s.seq.goal = true;
    }
    advance(s, rng, ev);
  }
  function finish(s) { s.outcome = s.pen ? (s.pen.you > s.pen.home ? 'penwin' : 'penloss') : (s.score.you > s.score.home ? 'win' : 'loss'); s.phase = 'end'; }

  /* Einziger Einstieg für Eingaben. Gibt einen neuen Zustand und die Ereignisse zurück, der alte bleibt unverändert.
     hit ist die Stelle des Strichs auf dem Timing-Balken beim Tippen (0 bis 1), siehe contest().
     Angriff live: { type: 'live', cmds } die gespielte Szene: Befehle mit Schritt, siehe liveCmd und liveRun
     Angriff in Schritten: { type: 'shoot' } | { type: 'pass', to, hit } | { type: 'dribble', run }
               run: der Lauf durch den Dribbling-Parcours, pro Schritt die gewischte Richtung x und y in Hundertsteln,
               siehe dribCourse, dribTick und dribRun
     Abwehr:   { type: 'defend', hit }
     Schuss:   { type: 'style', value: 'slap' | 'wrist' | 'drag' } Schussart für den eigenen Schuss wählen (vor dem Abschluss)
               { type: 'aim', target: [x, y], hit, t } eigener Schuss: Ziel im Tor, Stelle des Strichs auf dem Schuss-Balken,
               Zeit in ms seit dem Setzen des Ziels
               { type: 'aim', zone, rt } Parade, rt in ms seit dem Abschluss des Gegners
     Taktik:   { type: 'tactic', value: 'def' | 'bal' | 'off' } jederzeit, gilt ab der nächsten Chance
     Linie:    { type: 'line', value: 0 | 1 } jederzeit, gewechselt wird vor der nächsten Chance
     Karte:    { type: 'card', id } Taktikkarte einsetzen, jederzeit, jede nur einmal
     Bully, freier Ball: { type: 'duel', rt } rt ms nach dem Signal getippt, { type: 'duel', early: true } zu früh
     Auswurf:  { type: 'throw', quick: false } ruhig aufbauen, { type: 'throw', quick: true, hit } schnell auswerfen
     Weiter:   { type: 'next' } nach einem Tor, wenn das Spiel zur Ruhe gekommen ist, oder in der Drittelspause */
  function act(state, a, rng) {
    const s = copy(state), ev = [];
    let ok = true;
    if (s.cfg.sec[a.type] && !s.pen && s.phase !== 'end') { s.seq.acts++; tick(s, s.cfg.sec[a.type]); }      // jede Eingabe im Spiel zählt für die Sequenz, die Uhr läuft
    if (a.type === 'tactic') { if (TACTICS[a.value] && s.phase !== 'end') s.tactic.you = a.value; else ok = false; }
    else if (a.type === 'line') { const T = s.teams.you; if (T.bench && (a.value === 0 || a.value === 1) && s.phase !== 'end' && !s.pen) T.want = a.value; else ok = false; }
    else if (a.type === 'card') ok = useCard(s, 'you', a.id, ev);
    else if (s.phase === 'decide' && s.cur.type === 'att' && a.type === 'live') ok = liveAction(s, rng, ev, a) !== false;
    else if (s.phase === 'decide' && s.cur.type === 'att' && ['shoot', 'pass', 'dribble'].indexOf(a.type) !== -1) ok = attAction(s, rng, ev, a) !== false;
    else if (s.phase === 'decide' && s.cur.type === 'def' && a.type === 'defend') ok = defAction(s, rng, ev, a) !== false;
    else if (s.phase === 'aim' && a.type === 'style') { if (s.shot && s.shot.side === 'you' && !s.shot.reb && s.cfg.styles[a.value]) setStyle(s.cfg, s.shot, a.value); else ok = false; }      // beim Abpraller bleibt nur das Handgelenk
    else if (s.phase === 'aim' && a.type === 'aim') ok = shoot(s, rng, ev, a) !== false;
    else if (s.phase === 'duel' && a.type === 'duel') ok = duelAction(s, rng, ev, a) !== false;
    else if (s.phase === 'throw' && a.type === 'throw') ok = throwAction(s, rng, ev, a) !== false;
    else if ((s.phase === 'done' || s.phase === 'break') && a.type === 'next') next(s, rng, ev);
    else ok = false;
    return ok ? { state: s, events: ev, ok: true } : { state, events: [], ok: false };
  }

  root.HKMatch = { startChance, pickKind, duelVal, duelWindow, goOn, canDrib, openRun, STYLES, STYLE, favStyle, pickStyle, ruleStyle, styleChance, styleBlock, setStyle, shadows, reboundTo, TACTICS, KINDS, CARDS, all, avgEn, rates, attackVal, defenceVal, TRAITS, trait, defChoice, defInfo, contest, zone, grade, shotBar, shotPreview, isFree, oneTimer, liveInit, liveTick, liveRun, liveLane, liveShot, spotOf, dribCourse, courseOf, dribInit, dribTick, dribGrade, dribRun, evalShot, keeperAt, kDist, tired, reach, setShot, inZone, FORM, MARKS, CFG, GOAL, ROLES, ZONES, ZC, zoneOf, newMatch, act, card, shotInfo, passInfo, dribInfo, stanceVal, dribVal, shotVal, passVal, strength, spread, favZone, penOver, atkSide, other, nearest, dist };
})(typeof window !== 'undefined' ? window : globalThis);
