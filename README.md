# Hallenkampf

Prototyp «Hallenkampf» der Playmakerz-App: Du greifst mit sechs Karten eine Unihockey-Halle an. Jedes der zwölf Duelle läuft in drei Stufen ab (am Verteidiger vorbei, Schuss aufs Tor, Goalie geschlagen), mit Konter, Fouls, 2-Minuten-Strafen und Penaltys.

Der Prototyp ist eine einzelne HTML-Datei ohne Server. Standort, Check-in und alles, was mehrere Personen braucht, ist simuliert.

## Stand

Etappe 1 von 4 ist umgesetzt: die Duell-Engine. Es folgen die 2D-Animation, Vereine mit Hallenverteidigung und das Spiel gegen Freunde mit Elo.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `src/engine.js` | Spiel-Engine: Regeln, Zufall und KI der Halle als reine Funktionen. Alle Stellschrauben stehen in `CFG`. |
| `src/ui.js` | Oberfläche. Rechnet nichts selbst aus, sondern zeigt, was die Engine zurückgibt. |
| `src/page.html` | Markup und Styles |
| `build.js` | Setzt daraus `dist/index.html` zusammen |
| `sim/` | Simulation zum Kalibrieren. Lädt die Engine aus `dist/index.html`, also denselben Code wie das Spiel. |
| `test/` | Regelprüfungen der Engine und automatisches Durchspielen im Browser |

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
node test/play.js
```

`--legacy` rechnet die alten Regeln (ein Wurf pro Duell) mit denselben Spielweisen, als Vergleich. Einzelne Werte lassen sich mit `--set` übersteuern, zum Beispiel `--set s3Base=0.66`. Die Browser-Tests brauchen Playwright mit Chromium.

## Engine

- **Zustand rein, Ergebnis raus:** `HK.newMatch(setup, rng)` erzeugt ein Match, `HK.act(state, action, rng)` gibt einen neuen Zustand und die Ereignisse der Sequenz zurück. Der alte Zustand bleibt unverändert.
- **Zufall mit Seed:** `HK.makeRng(seed)`. Jede Funktion, die Zahlen von 0 bis 1 liefert, kann sie ersetzen. Gleicher Seed ergibt dasselbe Match.
- **Für die echte App:** Der Kommentar am Anfang von `src/engine.js` hält fest, welche Funktionen später auf den Server gehören.

## Messwerte Etappe 1

4000 Matches pro Halle und Spielweise, Seed 11. «Vernünftig» spielt mit dem Kader, den die App vorschlägt, und wählt Karte und Spielzug nach der höchsten Erwartung.

| Messwert | Ziel | Köniz | Wiler | GC |
| --- | --- | --- | --- | --- |
| Tore pro Match | ca. 6 | 6.01 (3.28:2.73) | 6.00 (2.91:3.08) | 6.36 (3.51:2.85) |
| Fouls pro Match | 3 bis 4 | 3.50 | 2.90 | 4.02 |
| 2-Minuten-Strafen pro Match | 1 bis 2 | 1.60 | 1.29 | 1.87 |
| Penalty im Match | jedes 4. bis 5. | jedes 4.4. | jedes 5.5. | jedes 3.7. |
| Matches mit Penaltyschiessen | weniger als bisher | 15.7 % | 18.8 % | 17.2 % |
| Siegquote vernünftig, mit Penaltys | ähnlich wie bisher | 60.1 % | 48.0 % | 60.9 % |
| Siegquote zufällig | deutlich tiefer | 28.8 % | 22.3 % | 32.4 % |
| Kader: Standard gegen 6 schwächste | mind. 15 Punkte | +2.8 | +0.3 | −2.4 |
| Spielzug: vernünftig gegen zufällig | mind. 8 Punkte | +4.5 | +5.5 | +1.6 |

Nicht erreicht sind der Anteil Penaltyschiessen, die Kader-Stärke und die Spielzugwahl. Mit den alten Regeln und denselben Spielweisen liegt die Siegquote gegen Köniz bei 46.3 %.
