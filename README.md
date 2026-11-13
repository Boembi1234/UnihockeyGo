# Hallenkampf

Prototyp «Hallenkampf» der Playmakerz-App: Du greifst mit sechs Karten eine Unihockey-Halle an. Jedes der zwölf Duelle läuft in drei Stufen ab (am Verteidiger vorbei, Schuss aufs Tor, Goalie geschlagen), mit Konter, Fouls, 2-Minuten-Strafen und Penaltys.

Der Prototyp ist eine einzelne HTML-Datei ohne Server. Standort, Check-in und alles, was mehrere Personen braucht, ist simuliert.

## Stand

Etappe 3 von 4 ist umgesetzt: die Duell-Engine, die 2D-Animation jeder Stufe und Vereine mit Hallenverteidigung. Es folgt das Spiel gegen Freunde mit Elo.

Live: <https://unihockeygo.netlify.app>

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `src/engine.js` | Spiel-Engine: Regeln, Zufall und KI der Halle als reine Funktionen. Alle Stellschrauben stehen in `CFG`. |
| `src/world.js` | Welt: Vereine, Hallenbesitz, Stationierung, Schaden und Vereinstabelle, ebenfalls reine Funktionen |
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

## Engine

- **Zustand rein, Ergebnis raus:** `HK.newMatch(setup, rng)` erzeugt ein Match, `HK.act(state, action, rng)` gibt einen neuen Zustand und die Ereignisse der Sequenz zurück. Der alte Zustand bleibt unverändert.
- **Zufall mit Seed:** `HK.makeRng(seed)`. Jede Funktion, die Zahlen von 0 bis 1 liefert, kann sie ersetzen. Gleicher Seed ergibt dasselbe Match.
- **Für die echte App:** Der Kommentar am Anfang von `src/engine.js` hält fest, welche Funktionen später auf den Server gehören.

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
