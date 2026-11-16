# Hallenkampf

Prototyp «Hallenkampf» der Playmakerz-App: Du greifst mit sechs Karten eine Unihockey-Halle an. Jedes der zwölf Duelle läuft in drei Stufen ab (am Verteidiger vorbei, Schuss aufs Tor, Goalie geschlagen), mit Konter, Fouls, 2-Minuten-Strafen und Penaltys.

Der Prototyp ist eine einzelne HTML-Datei ohne Server. Standort, Check-in und alles, was mehrere Personen braucht, ist simuliert.

## Stand

Alle vier Etappen sind umgesetzt: die Duell-Engine, die 2D-Animation jeder Stufe, Vereine mit Hallenverteidigung und das Spiel gegen Freunde mit Elo-Rangliste.

Live: <https://unihockeygo.netlify.app>

## Testduell

Unter <https://unihockeygo.netlify.app/lab/> liegt ein neues Duell zum Ausprobieren, unabhängig vom Prototyp. Es ändert, wie ein Duell aussieht und sich spielt:

- **Kartenduell:** Beide Karten stehen sich gross gegenüber, beide Wahlen werden gleichzeitig aufgedeckt, ein Stempel zeigt GELESEN oder VORBEI.
- **Tor von vorne:** Jeder Schuss läuft vor dem Tor ab. Der Schütze wählt die Ecke, der Goalie rät. In der Abwehr springst du selbst.
- **Verlauf statt Prozente:** Bei der Wahl siehst du, was der Gegner zuletzt tat, und pro Spielzug einen einfachen Stärke-Balken.
- **Kürzer:** 8 Duelle, kein Weiter-Knopf, Antippen spult vor. Fouls, Taktiken, Momentum und Captain fehlen hier absichtlich.

Code in `src/lab/`, Simulation mit `node sim/lab.js`, Browser-Test mit `node test/lab.js`.

Unter <https://unihockeygo.netlify.app/lab/match/> liegt ein ganzes Match mit Shop:

**Spielfluss und Taktik.** Ein Match läuft über drei Drittel zu 20 Minuten, die Uhr läuft mit. Die Zahl der Chancen steht nicht fest (im Schnitt etwa 12, in der Simulation zwischen 2 und 21):

- **Chancen aus den Karten:** Jede Seite bekommt Chancen nach ihrem Angriffswert (die drei Stürmer: Schuss, Pass, Dribbling) gegen den Abwehrwert des Gegners (die zwei Verteidiger: Block, Antizipation, Zweikampf). Gute Stürmer bringen mehr eigene Chancen, schwache Verteidiger mehr Chancen für den Gegner.
- **Taktik:** Defensiv, Normal oder Offensiv, vor dem Match und jederzeit während des Spiels wählbar, mit Hinweis in jeder Drittelspause. Offensiv bringt mehr eigene Chancen (Faktor 1.35), öffnet aber hinten (1.3 für den Gegner, dazu mehr Konter). Defensiv senkt beides (0.72 und 0.68), die eigenen Chancen kommen öfter aus Kontern. Der Gegner stellt selbst um: im Rückstand offensiv, mit Vorsprung defensiv.
- **Arten von Chancen:** Positionsangriff, Konter 3 gegen 2, Konter 2 gegen 1 und selten ein Alleingang. Ein Konter nach einem groben Fehler ist ebenfalls meist eine Überzahl, nur selten ein Alleingang.
- **Feld von oben:** Die Spieler sind Figuren mit Schultern, Kopf, Armen, Beinen und Stock. Sie drehen sich in Laufrichtung oder zum Ball, die Beine laufen mit, der Stock schwingt bei Pass und Schuss, der Ball liegt an der Schaufel. Die Goalies knien im Torraum und rutschen mit dem Ball mit.

Wirkung der Taktik für den mittleren Modell-Spieler (zwei Linien um 81 und 76 gegen WASA, 800 Matches je Feld, Siegquote):

| Karten | Defensiv | Normal | Offensiv |
|---|---|---|---|
| 6 schwächer | 19 % | 16 % | 12 % |
| gleich | 49 % | 44 % | 45 % |
| 6 stärker | 82 % | 83 % | 83 % |

**Linien und Taktikkarten.** Wie in einem Manager-Spiel zählt jetzt der ganze Kader, und wie in Clash Royale nimmst du ein kleines Deck mit ins Match:

- **Zwei Linien:** Jedes Team hat zwei Linien zu drei Stürmern und zwei Verteidigern. Eine steht auf dem Feld, die andere erholt sich auf der Bank. Den Wechsel wünschst du jederzeit über den Umschalter neben der Taktik; gewechselt wird vor der nächsten Chance. Die Werte der Linie auf dem Feld bestimmen, wie viele Chancen entstehen.
- **Warum wechseln:** Simulation mit dem mittleren Modell-Spieler, erste Linie 81, zweite 76, gegen WASA (1500 Matches je Zeile, Siegquote): nie wechseln 39 %, selten wechseln 43 %, vernünftig wechseln 46 bis 49 %, nur die zweite Linie etwa 11 %. Die erste Linie soll also die meisten Chancen spielen, aber nicht alle.
- **Der Gegner coacht mit:** Er wechselt seine Linien nach der Energie, stellt in den letzten Minuten eines knappen Spiels die erste Linie und setzt seine Taktikkarten ein, wenn ihr Moment da ist.
- **Taktikkarten:** Bis zu drei kommen mit ins Match, jede einmal einsetzbar. Antippen zeigt, was die Karte tut; erst «Einsetzen» spielt sie. Drei hast du von Anfang an, drei gibt es im Shop.

| Karte | Wirkung | Preis |
|---|---|---|
| Time-out | Alle Spieler beider Linien bekommen 30 Energie zurück. | Start |
| Pressing | In den nächsten zwei Abwehrszenen gewinnt schon «Im Feld» den Ball, nicht erst «Perfekt». | Start |
| Spielzug | Die nächste Chance ist ein Konter 3 gegen 2, alle Felder sind 25 % breiter. | Start |
| Kaltblütig | Beim nächsten Schuss läuft der Strich 40 % langsamer. Geht auch im Penaltyschiessen. | 900 |
| Mauern | Bis zum Drittelsende hat der Gegner halb so viele Chancen, du selbst 40 % weniger. | 1400 |
| Goalie raus | Bis zum nächsten Tor oder Drittelsende doppelt so viele Chancen und 15 % breitere Felder. Jeder Schuss des Gegners trifft das leere Tor, jeder Ballverlust ist ein Konter. | 2000 |

Auch die Gegner haben Karten (WASA nur ein Time-out, GC drei). Nimmt der Gegner den Goalie raus, schiesst du aufs leere Tor.

**Der eigene Angriff läuft live auf dem Feld.** Es gibt keine Aktionsliste und keinen Timing-Balken mehr für Pass und Dribbling. Die Chance läuft als durchgehende Szene von oben, und du zeichnest vom Ball aus eine Linie:

- **Zum Mitspieler:** Pass. Die Linie ist grün, wenn der Weg frei ist, gelb, wenn es eng wird, rot, wenn ein Gegner dazwischenkommt.
- **Ins Tor:** Schuss. Es folgt der Abschluss vor dem Tor wie bisher (Ziel setzen, Schuss-Balken, Goalie). Direkt nach einem Querpass steht der Goalie noch falsch.
- **In den freien Raum:** Der Ballführende läuft dorthin.
- **Zeitlupe:** Solange der Finger aufliegt, läuft die Szene mit gut einem Fünftel des Tempos. Ein Befehl, der während eines Passes gezeichnet wird, gilt für den, der den Ball annimmt: So geht der Direktschuss.
- **Was sich bewegt:** Die Mitspieler laufen auf ihre Plätze (Slot, zweiter Pfosten, Bande, hinten) und laufen sich dort in kleinen Bögen frei. Die Verteidiger decken mit Verzögerung, stellen Passwege zu und sind immer wieder kurz unaufmerksam: Dann erscheint beim Mitspieler ein grüner Ring mit «FREI». Der Gegenspieler des Ballführenden greift nach gut einer Sekunde an; wer an ihm vorbei ist, zieht den nächsten Verteidiger an, dessen Mann frei wird.
- **Ballverlust:** Kommt ein Verteidiger an den Ballführenden (roter Kreis), ist der Ball weg, ebenso wenn ein Pass durch die Reichweite eines Verteidigers geht. Wer in einen Gegner hineinläuft oder ihm den Ball direkt in den Stock spielt, lädt zum Konter ein. Oben läuft die Zeit: neun Sekunden im Positionsangriff, sechseinhalb im Konter.
- **Karten:** Dribbling bestimmt das Tempo mit Ball, Pass das Tempo des Balls, Zweikampf und Antizipation der Gegner ihr Tempo, ihre Reaktion, ihre Reichweite und wie selten sie unaufmerksam sind. Müde Spieler sind langsamer.
- **Technik:** Die Szene wird in festen Schritten gerechnet (`liveTick` in `src/lab/match.js`). Der Bildschirm rechnet mit derselben Funktion; die Befehle gehen mit ihrem Schritt an die Engine, die die Szene nachspielt.

Die Abwehr läuft noch wie vorher (Timing-Balken, dann Parade). Die folgenden Abschnitte zu Passwegen, Dribbling-Parcours und Spielweisen beschreiben die ältere Form in Schritten; sie steckt noch in der Engine (für Tests), wird im Spiel aber nicht mehr gezeigt.

Simulation der Live-Szene mit dem mittleren Modell-Spieler bei gleichen Karten: 81 % der Chancen enden mit einem Schuss, 16 % mit einem abgefangenen Pass, 3 % im Zweikampf; 78 % der Pässe kommen an, 41 % der Schüsse sind Direktschüsse, eine Szene dauert im Schnitt gut zwei Sekunden.

**Angriff mit Spielzügen.** Früher war «dreimal dribbeln, dann schiessen» die beste Spielweise, Pässe brachten nichts. Jetzt hat jede Aktion ihren Zweck:

- **Aufstellung:** Im Positionsangriff steht der Ballführende an der Bande, in der Mitte oder hinten. Der Center läuft in den Slot, der ballferne Flügel an den zweiten Pfosten, der ballnahe bleibt als Anspielstation, die Verteidiger sichern. Die Gegner decken gefährliche Spieler im Passweg. Kommt einer zu spät, ist sein Mann frei: grüner Ring und Schild «FREI» auf dem Feld, der Pass steht zuoberst in der Liste.
- **Dribbling-Parcours:** Das Dribbling ist kein Balken, sondern ein kurzer Lauf von oben gesehen, gesteuert mit Wischen. Du wischst auf dem Feld in die Richtung, in die der Spieler laufen soll: Der Weg des Fingers ist Richtung und Tempo (ab knapp 60 Bildpunkten volles Tempo), ein goldener Pfeil am Spieler zeigt beides. Lässt du los, läuft er aus; wer weiter wischt, bleibt schnell. Maus mit gedrückter Taste und Pfeiltasten gehen auch. Vor ihm steht sein Gegenspieler, der ihm entgegenkommt, dahinter der Verteidiger, der aushilft; beim zweiten Dribbling desselben Spielers ist es einer mehr, im Konter 2 gegen 1 nur einer. Sie rücken mit Verzögerung dorthin, wo du gerade warst: Antäuschen und spät zur anderen Seite ziehen funktioniert. Roter Kreis berührt: Ball weg, frontal beim eigenen Gegenspieler sogar Konter. Gestrichelten Kreis des Gegenspielers gestreift oder nach sechs Sekunden nicht an ihm vorbei: Ball behalten, kein Raumgewinn. Sauber an ihm vorbei: gelungen. Auch am Helfer sauber vorbei: perfekt. Die Karten bestimmen den Parcours: Aus dem Wertevergleich, dem Raum und den Fähigkeiten werden Reichweite, Tempo und Verzögerung der Gegner, aus dem Dribbling-Wert und der Energie Tempo und Antritt des Dribblers. Der Bildschirm rechnet mit denselben Schritten wie die Engine, die den Lauf nachspielt.
- **Dribbling zieht Hilfe:** Wer seinen Gegenspieler schlägt, kommt näher ans Tor, aber nicht tiefer als bis vor den Slot. Der nächste Verteidiger stellt sich ihm in den Weg und lässt dafür seinen Mann frei. Jedes weitere Dribbling desselben Spielers in der Chance hat ein um 40 % kleineres Feld.
- **Direktschuss:** Ein Pass verschiebt den Goalie. Schiesst der Empfänger sofort, steht der Goalie noch auf der Seite, von der der Ball kam (umso weiter, je quer der Pass war), reicht weniger weit und rutscht nach einer halben Sekunde herüber. Wer schnell abzieht, hat die offene Seite. Ein knapp angekommener Pass gibt keinen Direktschuss.
- **Passwege:** Der Verteidiger, der am besten im Weg steht, zählt voll, weitere zu einem Drittel. Grün ist ein offener Weg, gelb ein enger, rot ein zugestellter.
- **Block:** Blocken kann nur, wer in der Schussbahn steht. Nach einem Querpass steht der Gegenspieler im Passweg, nicht in der Schussbahn.
- **Der Gegner spielt gleich:** Er sucht den freien Mann und zieht nach einem Querpass direkt ab. Dann hast du bei der Parade weniger Zeit.

Simulation mit dem mittleren Modell-Spieler bei gleichen Karten (400 Matches je Zeile). Im Parcours steuert das Modell wie ein vernünftiger Spieler mit Verzögerung und Zittern (bei einer Chance von 45 % kommt es in 43 % der Läufe durch, bei 60 % in 79 %, bei 30 % nur in 4 %, behält dann aber meist den Ball):

| Spielweise | Siegquote | Tor je Chance |
|---|---|---|
| klug mischen (4 Pässe, 3 Dribblings pro Match) | 44 % | 43 % |
| Pass zum besten Mitspieler, dann Schuss | 43 % | 42 % |
| Dribbling, Pass, Schuss | 41 % | 43 % |
| ein Dribbling, dann Schuss | 31 % | 32 % |
| sofort schiessen | 28 % | 29 % |
| immer dribbeln | 25 % | 29 % |

**Bild von oben.** Die Halle hat einen Boden mit Glanz, eine Bande mit runden Ecken, Torräume und Tore mit Netz. Die Spieler sind vorgebeugte Figuren mit Trikot im Licht, Hose, Rückennummer und Schatten. Der Ball zieht bei Pässen und Schüssen eine Leuchtspur. Bei einem Tor leuchtet eine Anzeigetafel aus Leuchtpunkten mit «TOR!» und Lichtstrahlen auf.

**Können und Karten statt Würfel.** Im Match wird nichts mehr gewürfelt, was der User selbst entscheiden kann:

- **Timing-Balken:** Jeder Pass, jeder Schuss und jede Abwehraktion läuft über einen Balken (das Dribbling über einen eigenen Parcours). Ein Strich läuft hin und her, getippt wird irgendwo auf dem Bildschirm, ohne Zeitlimit. Die Karten bestimmen die Breite des grünen Felds: Grundlage ist der Wertevergleich (zum Beispiel Pass gegen Antizipation), eine Spezialfähigkeit macht es breiter.
- **Noten:** Mitte = perfekt (Vorteil: freier Mitspieler, mehr Raum, genauerer Schuss), im Feld = gelungen, knapp daneben = halb gelungen, daneben = Ball weg, grob daneben = Konter für den Gegner.
- **Abwehr:** Der Plan des Gegners ist sichtbar, der passende Verteidiger reagiert von selbst. Nur die Mitte gewinnt den Ball (und gibt einen Konter). Sonst gilt: Je besser getroffen, desto mehr Zeit bekommt der Goalie beim Schuss.
- **Eigener Schuss:** wie ein Penalty in einem Fussballspiel. Der gegnerische Goalie steht fast in der Mitte. Der dunkle Bereich um ihn ist seine Reichweite: Was dort landet, hält er. Hell ist, was frei bleibt: aus der Distanz nur die hohen Ecken, aus der Nähe viel mehr. Erst ins Tor tippen, wohin der Schuss gehen soll (schieben geht auch, die Zielmarke steht dann über dem Finger). Dann läuft der Schuss-Balken: Genau in der Mitte geht der Ball genau ins Ziel. Steht der Strich links oder rechts davon, weicht der Ball nach links oder rechts ab, am Rand des grünen Felds um 12 % der Torbreite. Wer nah an den Pfosten zielt, riskiert also Pfosten oder Latte, wer Abstand lässt, den Goalie. Das Feld auf dem Balken ist aus der Nähe breit (bis 17 %) und aus der Distanz schmal (ab 3 %). Steht ein Gegner nah, wird es schmaler, und ein klar verpasster Stopp wird geblockt. Gewürfelt wird beim eigenen Schuss nichts.
- **Der Goalie ahnt die Ecke:** Sobald das Ziel steht, läuft eine stille Uhr. Nach 1.5 Sekunden rückt der Goalie zur Seite des Ziels (30 % der halben Torbreite pro Sekunde, höchstens 45 %), seine Reichweite wandert mit. Wer den Strich mehrmals durchlaufen lässt, findet die Ecke zu. Ob er noch hinkommt, zeigt erst der Flug: Bei knappen Bällen läuft er langsamer aus, der Goalie streckt sich, dann erst fällt die Entscheidung.
- **Tempo des Strichs:** Der Abschlusswert bestimmt, wie schnell der Strich auf dem Schuss-Balken läuft: 0.95 Sekunden pro Durchlauf bei Abschluss 90, 0.68 bei 80, 0.45 bei 70. Ein schwacher Schütze muss also viel genauer tippen.
- **Energie:** Jeder Spieler startet mit 100. Jede Chance kostet die Spieler auf dem Feld 5, dazu kosten Pass (4), Annahme (2), Dribbling (10), Schuss (7) und Abwehraktion (7). Wer auf der Bank sitzt, bekommt pro Chance 9 zurück, jede Drittelspause bringt allen 15. Je müder ein Spieler, desto schneller läuft sein Strich auf jedem Balken (bei leerer Energie in 62 % der normalen Zeit). Eine müde Linie erspielt ausserdem weniger Chancen und lässt mehr zu: Bei leerer Energie zählen ihre Werte 18 Punkte weniger. Die Energie steht als kleiner Balken unter jedem eigenen Spieler, bei jedem Pass-Ziel und am Linien-Umschalter. Müde Schützen des Gegners streuen stärker.
- **Tor und Jubel:** Das Netz ist ein Gitter aus Punkten. Beim Tor drückt der Ball es in Flugrichtung nach hinten, eine Welle läuft über die Maschen, es zappelt etwa zwei Sekunden nach, und der Ball fällt im Tor zu Boden. Hinter dem Tor steht eine Tribüne mit den Fans der angreifenden Seite (deine in Blau, die des Gegners in Gold). Beim Tor springen sie, reissen die Arme hoch, Schals und Fahnen gehen hoch, es blitzt und es regnet Konfetti. Bei Parade oder Fehlschuss sinken sie zusammen. Mit reduzierter Bewegung bleiben nur die erhobenen Arme.
- **Goalie-Figur:** In der Torsicht ist der Goalie eine Figur mit Gelenken (`src/lab/keeper.js`): kniend, Gitterhelm, Trikot mit farbigen Ärmeln, schwarze Handschuhe. Becken, Oberkörper, Kopf, Arme und Beine bewegen sich einzeln: seitlich rutschen mit Schritt und Abstoss, Handparade mit geneigtem Oberkörper, Beinparade am Boden, Hechtsprung.
- **Parade:** Der Schuss des Gegners ist ehrlich zu sehen (goldener Ring am Landepunkt). Gehalten ist, wenn die richtige Ecke angetippt wird, bevor der Ball da ist. Bessere Verteidiger und gestörte Schützen geben mehr Zeit.

Torquote eines Schusses für den mittleren Modell-Spieler, nach Abschlusswert und Distanz (`node sim/shots.js`):

| Abschluss | weit weg | mittlere Distanz | nah | direkt vor dem Tor |
|---|---|---|---|---|
| 70 | 5 % | 15 % | 31 % | 46 % |
| 80 | 9 % | 24 % | 45 % | 65 % |
| 90 | 12 % | 34 % | 62 % | 82 % |
| 97 | 16 % | 42 % | 70 % | 87 % |

Ein müder Schütze (Energie 30) trifft aus der Nähe statt 31, 45, 62 und 70 % noch 24, 35, 47 und 57 %.

Abgestimmt ist das Match so, dass eine Stufe Können etwa sechs Kartenpunkte wert ist. Simulation mit zwei Linien und den drei Start-Taktikkarten, mit drei Modell-Spielern (Streuung beim Tippen 45, 70 und 105 ms, Zielfehler im Tor 3, 5 und 8 % der halben Torbreite, der mittlere und der schwache schauen dem Schuss-Balken einen halben und einen ganzen Durchlauf länger zu, Reaktionszeit 480, 560 und 650 ms), erste Linie um 81 und zweite um 76 gegen WASA (81 und 76), normale Taktik, 250 Matches je Feld, mit dem Angriff als Live-Szene, Siegquote:

| Spieler | Karten −12 | −6 | gleich | +6 | +12 |
|---|---|---|---|---|---|
| stark | 21 % | 56 % | 86 % | 98 % | 100 % |
| mittel | 2 % | 14 % | 46 % | 77 % | 93 % |
| schwach | 1 % | 1 % | 7 % | 22 % | 49 % |

Die Profile sind Annahmen, keine Messung. `node sim/match.js` rechnet die Tabelle gegen Köniz nach; die Werte stehen in `CFG` in `src/lab/match.js`.

**Hosting:** Die Seite baut mit `node build.js` in den Ordner `dist`. `netlify.toml` und `vercel.json` enthalten dieselbe Einstellung für Netlify und Vercel.

**Menü:** Drei Tabs unten. Team ist die Startseite (Stärke beider Linien, Bilanz, Aufstellung, Sammlung), Spielen in der Mitte (Gegner, Aufstellung, Taktik, Taktikkarten, Anpfiff), Shop rechts (Packs und Taktikkarten). Im Match und beim Resultat ist die Leiste ausgeblendet.

**Shop und Team:**

- **Team aus Packs:** Du startest mit zehn Bronze-Karten (erste Linie um 77, zweite um 72), drei Taktikkarten und 1500 Münzen. Ein alter Spielstand mit einer Linie wird umgestellt: Die zweite Linie kommt aus der Sammlung, fehlende Plätze werden mit Bronze-Karten um 72 aufgefüllt. Im Shop gibt es drei Packs: Basis (500, 3 Karten), Premium (1200, 4 Karten, mind. 1 Silber) und Star (3000, 5 Karten, 1 Gold sicher). Bronze unter 85, Silber ab 85, Gold ab 92.
- **Pool:** alle 271 Feldspieler der Herren L-UPL 2026/27 aus dem Fantasy-Pool (`src/lab/pool.js`), mit Nation, Rückennummer, Jahrgang und Porträt. Die 28 bekannten Karten behalten ihre Werte, die übrigen werden aus dem Fantasy-Preis abgeleitet.
- **Karte:** ein Wappen mit Metallrand in Bronze, Silber oder Gold. Oben links hängt ein Wimpel mit Gesamtwert, Position, Flagge und dem Zeichen der Spezialfähigkeit. Das Porträt ist auf das Metall «gedruckt» (der weisse Studiohintergrund verschwindet), darunter steht der Name auf einem dunklen Feld. Die volle Karte zeigt die sechs Werte, mit denen das Match rechnet: Schuss, Pass, Dribbling, Zweikampf, Block, Antizipation. Unter 150 px Breite erscheint die Kurzform ohne Werte. Ohne Bild zeigt die Karte geprägte Initialen.
- **Porträts:** 190 Bilder kommen von swiss unihockey (Cloudinary), 17 von hcrychenberg.ch, 10 sind Google-Vorschaubilder, 1 liegt bei fliiga.com. Die Seite lädt sie direkt von dort. 53 Spieler haben kein Bild.
- **Pack öffnen:** Reisskante wischen oder antippen, die Karten steigen aus dem Beutel und werden einzeln aufgedeckt, die beste zuletzt. Das Licht unter der Reisskante hat die Farbe der besten Karte. Silber und Gold als beste Karte bekommen eine Ankündigung (Position, bei Gold auch der Verein). Aufgedeckte Karten lassen sich mit Finger oder Maus kippen, Gold schillert dabei. Mit «Bewegung reduzieren» erscheint direkt die Übersicht.
- **Münzen:** Sieg 400 (WASA) bis 900 (GC), Niederlage 120, dazu 30 pro eigenes Tor. Doppelte Karten geben 60, 200 oder 600.
- **Speichern:** Karten, Linie und Münzen liegen im `localStorage` dieses Browsers. «Neu beginnen» im Shop setzt alles zurück.

Logik in `src/lab/club.js`, Oberfläche in `src/lab/store-ui.js`, Aussehen in `src/lab/store.css`. Simulation mit `node sim/club.js`, Browser-Test mit `node test/store.js`.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `src/engine.js` | Spiel-Engine: Regeln, Zufall und KI der Halle als reine Funktionen. Alle Stellschrauben stehen in `CFG`. |
| `src/world.js` | Welt: Vereine, Hallenbesitz, Stationierung, Schaden, Vereinstabelle, Freunde und Elo, ebenfalls reine Funktionen |
| `src/scene.js` | 2D-Szenen von oben: eine kurze Szene pro Ereignis der Engine, nur HTML und CSS, keine Bilder |
| `src/ui.js` | Oberfläche. Rechnet nichts selbst aus, sondern zeigt, was die Engine zurückgibt. |
| `src/page.html` | Markup und Styles |
| `build.js` | Setzt daraus `dist/index.html` zusammen |
| `sim/` | Simulation zum Kalibrieren. Lädt die Engine aus `dist/index.html`, also denselben Code wie das Spiel. |
| `test/` | Regelprüfungen von Engine und Welt, automatisches Durchspielen im Browser, Standbilder und Dauer der Szenen |

## Befehle

```bash
node build.js
```

```bash
node sim/sim.js --n 2000
```

```bash
node sim/sim.js --n 2000 --legacy
```

```bash
node sim/sim.js --n 2000 --freunde
```

```bash
node test/engine.test.js
```

```bash
node test/world.test.js
```

```bash
node test/play.js
```

```bash
node test/scenes.js
```

```bash
node test/timing.js
```

`--legacy` rechnet die alten Regeln (ein Wurf pro Duell) mit denselben Spielweisen, als Vergleich. `--heimteam` rechnet die neuen Regeln gegen die alte Hallenwache, bei der alle sechs Karten Heimvorteil haben. Einzelne Werte lassen sich mit `--set` übersteuern, zum Beispiel `--set s3Base=0.66`. Die Browser-Tests brauchen Playwright mit Chromium.

## Animation

- **Dauer:** Ein normales Duell läuft 1.8 Sekunden, mit Konter 2.4, mit Freischlag bis 2.7. Längere Ketten werden auf 3.4 Sekunden gestaucht.
- **Überspringen:** Ein Tipp aufs Feld springt zum Endbild der Sequenz.
- **Reduzierte Bewegung:** Jede Stufe zeigt nur Start- und Endbild.
- **Lesen:** Die Bewegung des Verteidigers zeigt, ob er den Zug gelesen hat: früh an der richtigen Stelle oder sichtbar in die falsche Richtung.

## Vereine und Hallen

- **Verein:** Beim ersten Start wählst du einen der zwölf Vereine der Herren L-UPL. Ein Wechsel pro Saison ist möglich.
- **Besitz:** Jede Halle gehört zu Beginn ihrem Heimverein. Fällt die Stärke auf 0, gehört sie dem Verein des Angreifers und startet mit 60 Stärke.
- **Verteidigen:** Hallen des eigenen Vereins greift man nicht an. Man stationiert dort eine Karte pro Halle, höchstens sechs pro Halle. Stationierte Karten haben Heimvorteil und fehlen im eigenen Kader.
- **Freie Plätze:** Beim Heimverein füllt das Heimteam ohne Heimvorteil, bei einem fremden Besitzer füllen Ersatzkarten mit Gesamtwert 70.
- **Schaden:** Vor Ort voll, aus der Ferne halb, am Spieltag vor Ort doppelt. Die eigene Heimhalle zurückzuerobern zählt auch aus der Ferne voll.
- **Simulation:** Die Fans (Köniz 4, Wiler 6, GC 1), der Spieltag in Weissenstein und fremde Angriffe sind erfunden.

## Freunde und Elo

- **Ablauf:** Dieselbe Engine wie gegen die Halle. Die verteidigende Seite zeigt zuerst ihre Karte, dann wählt der Angreifer. Spielzug und Abwehr wählen beide verdeckt.
- **Fairness:** Kein Heimvorteil, beide Kader starten mit 100 Ausdauer, Taktiken je einmal pro Seite. Die Ausdauer für Hallenkämpfe bleibt unberührt, stationierte Karten bleiben gesperrt.
- **Elo:** Start 1000, K-Faktor 32. Ein Sieg nach Penaltys zählt als Sieg, die Tordifferenz zählt nicht. Dasselbe Paar zählt höchstens dreimal pro Tag. Matches gegen Hallen zählen nie.
- **Simulation:** Ohne Server spielt die KI vier erfundene Freunde, ohne Tendenz-Anzeige. Die Rangliste hat elf erfundene User, Einladungscode und Link führen nirgends hin.
- **Messung:** Vernünftiges Spiel mit dem Standardkader gewinnt gegen die vier Freunde 49.3 %, 57.9 %, 42.9 % und 54.4 % (2000 Matches je Freund).

## Engine

- **Zwei Modi:** `mode: 'hall'` gegen die Hallenwache, `mode: 'friend'` für das Freundschaftsspiel.
- **Zustand rein, Ergebnis raus:** `HK.newMatch(setup, rng)` erzeugt ein Match, `HK.act(state, action, rng)` gibt einen neuen Zustand und die Ereignisse der Sequenz zurück. Der alte Zustand bleibt unverändert.
- **Zufall mit Seed:** `HK.makeRng(seed)`. Jede Funktion, die Zahlen von 0 bis 1 liefert, kann sie ersetzen. Gleicher Seed ergibt dasselbe Match.
- **Für die echte App:** Die Kommentare am Anfang von `src/engine.js` und `src/world.js` halten fest, welche Funktionen später auf den Server gehören.

## Messwerte

4000 Matches pro Halle und Spielweise, Seed 11, gegen die Hallenwache zu Beginn (Köniz 4 Fans, Wiler 6, GC 1). «Vernünftig» spielt mit dem Kader, den die App vorschlägt, und wählt Karte und Spielzug nach der höchsten Erwartung.

| Messwert | Ziel | Köniz | Wiler | GC |
| --- | --- | --- | --- | --- |
| Tore pro Match | ca. 6 | 6.24 (3.27:2.97) | 5.95 (2.90:3.05) | 6.26 (3.60:2.65) |
| Fouls pro Match | 3 bis 4 | 3.73 | 2.94 | 4.04 |
| 2-Minuten-Strafen pro Match | 1 bis 2 | 1.74 | 1.29 | 1.88 |
| Penalty im Match | jedes 4. bis 5. | jedes 3.9. | jedes 5.1. | jedes 3.5. |
| Matches mit Penaltyschiessen | weniger als bisher | 18.1 % | 17.2 % | 15.4 % |
| Siegquote vernünftig, mit Penaltys | ähnlich wie bisher | 55.5 % | 48.4 % | 66.4 % |
| Siegquote zufällig | deutlich tiefer | 27.6 % | 23.2 % | 39.3 % |
| Kader: Standard gegen 6 schwächste | mind. 15 Punkte | −1.4 | +0.5 | −3.6 |
| Kader: Standard gegen alle Werte −8 | Zusatz | +33.8 | +31.5 | +30.8 |
| Spielzug: vernünftig gegen zufällig | mind. 8 Punkte | +4.7 | +5.3 | +4.2 |

Nicht erreicht sind der Anteil Penaltyschiessen, die Kader-Stärke mit den 6 schwächsten Karten und die Spielzugwahl. Mit den alten Regeln und denselben Spielweisen liegen die Siegquoten bei 46.3 % (Köniz), 42.4 % (Wiler) und 55.0 % (GC).

Gegen die alte Hallenwache, bei der alle sechs Karten Heimvorteil haben, gewinnt vernünftiges Spiel 52.9 % (Köniz), 48.4 % (Wiler) und 60.6 % (GC). GC ist mit nur einem Fan also rund 6 Punkte leichter.

Die Halle wählt ihren Angreifer zur Hälfte nach dem Abschluss statt nur nach dem besten Spielzug-Wert (`aiFinish` in `CFG`). Mit der alten Wahl gewinnt vernünftiges Spiel gegen Köniz 60.1 %.
