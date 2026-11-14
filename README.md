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
- **Taktik:** Defensiv, Normal oder Offensiv, vor dem Match und jederzeit während des Spiels wählbar, mit Hinweis in jeder Drittelspause. Offensiv bringt mehr eigene Chancen (Faktor 1.35), öffnet aber hinten (1.3 für den Gegner, dazu mehr Konter) und kostet etwas mehr Energie. Defensiv senkt beides (0.72 und 0.68), die eigenen Chancen kommen öfter aus Kontern. Der Gegner stellt selbst um: im Rückstand offensiv, mit Vorsprung defensiv.
- **Arten von Chancen:** Positionsangriff, Konter 3 gegen 2, Konter 2 gegen 1 und selten ein Alleingang. Ein Konter nach einem groben Fehler ist ebenfalls meist eine Überzahl, nur selten ein Alleingang.
- **Feld von oben:** Die Spieler sind Figuren mit Schultern, Kopf, Armen, Beinen und Stock. Sie drehen sich in Laufrichtung oder zum Ball, die Beine laufen mit, der Stock schwingt bei Pass und Schuss, der Ball liegt an der Schaufel. Die Goalies knien im Torraum und rutschen mit dem Ball mit.

Wirkung der Taktik für den mittleren Modell-Spieler (Team um 81 gegen WASA, 800 Matches je Feld, Siegquote):

| Karten | Defensiv | Normal | Offensiv |
|---|---|---|---|
| 6 schwächer | 20 % | 16 % | 13 % |
| gleich | 54 % | 49 % | 48 % |
| 6 stärker | 83 % | 81 % | 87 % |

**Können und Karten statt Würfel.** Im Match wird nichts mehr gewürfelt, was der User selbst entscheiden kann:

- **Timing-Balken:** Jeder Pass, jedes Dribbling, jeder Schuss und jede Abwehraktion läuft über einen Balken. Ein Strich läuft hin und her, getippt wird irgendwo auf dem Bildschirm, ohne Zeitlimit. Die Karten bestimmen die Breite des grünen Felds: Grundlage ist der Wertevergleich (zum Beispiel Pass gegen Antizipation), eine Spezialfähigkeit macht es breiter.
- **Noten:** Mitte = perfekt (Vorteil: freier Mitspieler, mehr Raum, genauerer Schuss), im Feld = gelungen, knapp daneben = halb gelungen, daneben = Ball weg, grob daneben = Konter für den Gegner.
- **Abwehr:** Der Plan des Gegners ist sichtbar, der passende Verteidiger reagiert von selbst. Nur die Mitte gewinnt den Ball (und gibt einen Konter). Sonst gilt: Je besser getroffen, desto mehr Zeit bekommt der Goalie beim Schuss.
- **Eigener Schuss:** wie ein Penalty in einem Fussballspiel. Erst ins Tor tippen, wohin der Schuss gehen soll (schieben geht auch, die Zielmarke steht dann über dem Finger). Der gegnerische Goalie steht leicht auf einer Seite; grün ist, wo er nicht hinkommt, und aus der Distanz bleibt weniger Grün. Dann läuft der Schuss-Balken: Genau in der Mitte geht der Ball genau ins Ziel. Steht der Strich links oder rechts davon, weicht der Ball nach links oder rechts ab, am Rand des grünen Felds um die halbe Breite des freien Felds. Wer in die Mitte des freien Felds zielt und den Strich im Feld stoppt, trifft also. Das Feld auf dem Balken ist aus der Nähe breit (bis 17 %) und aus der Distanz schmal (ab 3 %). Steht ein Gegner nah, wird es schmaler, und ein klar verpasster Stopp wird geblockt. Gewürfelt wird beim eigenen Schuss nichts mehr.
- **Tempo des Strichs:** Der Abschlusswert bestimmt, wie schnell der Strich auf dem Schuss-Balken läuft: 0.95 Sekunden pro Durchlauf bei Abschluss 90, 0.68 bei 80, 0.45 bei 70. Ein schwacher Schütze muss also viel genauer tippen.
- **Energie:** Jeder Spieler startet mit 100. Jede Chance kostet alle etwas (offensiv mehr, defensiv weniger), dazu kosten Pass (4), Annahme (2), Dribbling (10), Schuss (7) und Abwehraktion (7). Jede Drittelspause bringt 15 zurück. Je müder ein Spieler, desto schneller läuft sein Strich auf jedem Balken, bei leerer Energie in 60 % der normalen Zeit. Die Energie steht als kleiner Balken unter jedem eigenen Spieler und bei jedem Pass-Ziel. Wer alles über denselben Star spielt, hat ihn im letzten Drittel müde. Müde Schützen des Gegners streuen stärker.
- **Goalie-Figur:** In der Torsicht ist der Goalie eine Figur mit Gelenken (`src/lab/keeper.js`): kniend, Gitterhelm, Trikot mit farbigen Ärmeln, schwarze Handschuhe. Becken, Oberkörper, Kopf, Arme und Beine bewegen sich einzeln: seitlich rutschen mit Schritt und Abstoss, Handparade mit geneigtem Oberkörper, Beinparade am Boden, Hechtsprung.
- **Parade:** Der Schuss des Gegners ist ehrlich zu sehen (goldener Ring am Landepunkt). Gehalten ist, wenn die richtige Ecke angetippt wird, bevor der Ball da ist. Bessere Verteidiger und gestörte Schützen geben mehr Zeit.

Torquote eines Schusses für den mittleren Modell-Spieler, nach Abschlusswert und Distanz (`node sim/shots.js`):

| Abschluss | weit weg | mittlere Distanz | nah | direkt vor dem Tor |
|---|---|---|---|---|
| 70 | 9 % | 22 % | 34 % | 43 % |
| 80 | 14 % | 32 % | 49 % | 65 % |
| 90 | 20 % | 45 % | 65 % | 79 % |
| 97 | 24 % | 51 % | 72 % | 87 % |

Ein müder Schütze (Energie 30) trifft aus der Nähe statt 34, 49, 65 und 72 % noch 29, 36, 48 und 58 %.

Abgestimmt ist das Match so, dass eine Stufe Können etwa sechs Kartenpunkte wert ist. Simulation mit drei Modell-Spielern (Streuung beim Tippen 45, 70 und 105 ms, Zielfehler im Tor 3, 5 und 8 % der halben Torbreite, Reaktionszeit 480, 560 und 650 ms), Team um 81 gegen WASA (81), normale Taktik, 800 Matches je Feld, Siegquote:

| Spieler | Karten −12 | −6 | gleich | +6 | +12 |
|---|---|---|---|---|---|
| stark | 25 % | 64 % | 93 % | 99 % | 100 % |
| mittel | 3 % | 17 % | 50 % | 84 % | 98 % |
| schwach | 0 % | 1 % | 11 % | 39 % | 71 % |

Die Profile sind Annahmen, keine Messung. `node sim/match.js` rechnet die Tabelle gegen Köniz nach; die Werte stehen in `CFG` in `src/lab/match.js`.

**Shop und Team:**

- **Team aus Packs:** Du startest mit fünf Bronze-Karten (Linie um 77) und 1500 Münzen. Im Shop gibt es drei Packs: Basis (500, 3 Karten), Premium (1200, 4 Karten, mind. 1 Silber) und Star (3000, 5 Karten, 1 Gold sicher). Bronze unter 85, Silber ab 85, Gold ab 92.
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
