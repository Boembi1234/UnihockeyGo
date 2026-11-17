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

**Spielfluss und Taktik.** Ein Match läuft über drei Drittel zu 20 Minuten, die Uhr zeigt Minuten und Sekunden. Es besteht aus sechs Sequenzen (zwei pro Drittel), in denen der Ball im Spiel bleibt (siehe «Sequenzen» gleich unten):

- **Wer am Drücker bleibt, kommt aus den Karten:** Angriffswert (die drei Stürmer: Schuss, Pass, Dribbling) gegen Abwehrwert des Gegners (die zwei Verteidiger: Block, Antizipation, Zweikampf). Daraus folgt, wer nach einem Zeitsprung den Ball hat und wie oft ein Team nach einem Ballgewinn gleich selbst angreift, statt dass das Spiel zur Ruhe kommt.
- **Taktik:** Defensiv, Normal oder Offensiv, vor dem Match und jederzeit während des Spiels wählbar, mit Hinweis in jeder Drittelspause. Offensiv: Du bleibst öfter am Drücker (Faktor 1.35), öffnest aber hinten (1.3 für den Gegner, dazu mehr Konter und öfter ein schneller Auswurf seines Goalies). Defensiv senkt beides (0.72 und 0.68): Das Spiel kommt schneller zur Ruhe, deine Angriffe kommen öfter aus Kontern. Der Gegner stellt selbst um: im Rückstand offensiv, mit Vorsprung defensiv.
- **Arten von Szenen:** Positionsangriff, Konter 3 gegen 2, Konter 2 gegen 1 und selten ein Alleingang. Ein Konter nach einem groben Fehler ist ebenfalls meist eine Überzahl, nur selten ein Alleingang.
- **Feld von oben:** Die Spieler sind Figuren mit Schultern, Kopf, Armen, Beinen und Stock. Sie drehen sich in Laufrichtung oder zum Ball, die Beine laufen mit, der Stock schwingt bei Pass und Schuss, der Ball liegt an der Schaufel. Die Goalies knien im Torraum und rutschen mit dem Ball mit.

Wirkung der Taktik für einen gedachten mittleren Spieler (150 ms Streuung am Balken, Reaktion im Mittel 390 ms; er wählt vor dem Tor die Aktion mit der besten Torchance; zwei zufällige Linien mit Karten von 78 bis 90 gegen ebensolche, 400 Matches je Feld, Siegquote mit Penaltys):

| Karten | Defensiv | Normal | Offensiv |
|---|---|---|---|
| 6 schwächer | 26 % | 31 % | 30 % |
| gleich | 54 % | 53 % | 50 % |
| 6 stärker | 76 % | 75 % | 73 % |

Bei 400 Matches schwankt jede Zahl um rund 2.5 Punkte: Die Taktiken liegen nahe beieinander, nur defensiv mit schwächeren Karten fällt ab. Offensiv bringt mehr Tore auf beiden Seiten (bei gleichen Karten 1.50:1.65 statt 1.40:1.49): gut, wenn du ein Tor brauchst. Der gedachte Spieler wählt seit den Standards klüger als in früheren Fassungen (damals passte er nach einer Faustregel), darum liegen alle Zahlen höher und sind mit früheren Tabellen nicht vergleichbar.

**Sequenzen: Der Ball bleibt im Spiel.** Früher bestand ein Match aus rund zwölf einzelnen Chancen. Dazwischen lief ein erzähltes Spiel, das nichts entschied, und nach jeder Chance sprang die Uhr. Jetzt folgt jede Lage aus der vorherigen, und erst wenn das Spiel zur Ruhe kommt, springt die Uhr.

| Was passiert | Wie es weitergeht |
|---|---|
| Der Goalie hält fest | Auswurf. Dein Goalie: Du wählst zwischen dem schnellen Auswurf (ein Balken: perfekt Konter 2 gegen 1, im Feld 3 gegen 2, knapp steht die Abwehr schon, daneben greift der Gegner an) und dem ruhigen Aufbau (Auslösung). Der Goalie des Gegners wirft schnell aus, wenn du aufgerückt warst (offensiv in 45 % der Fälle, normal 30 %, defensiv 15 %); dann kannst du den langen Ball abfangen. |
| Parade ohne Festhalten, Block, Pfosten | Der Ball liegt frei (oder fliegt ins Aus, siehe «Standards»). Steht ein Angreifer klar am nächsten, schiesst er sofort nach (höchstens einmal pro Szene). Steht sonst ein Spieler knapp drei Meter näher als jeder Gegner, hat er den Ball. Andernfalls gibt es den Zweikampf um den freien Ball. Holt ihn der Angreifer, spielt er die zweite Welle (eine Aktion, dann der Schuss; höchstens zwei pro Szene). Holt ihn der Verteidiger, greift sein Team an. |
| Schuss daneben | Der Verteidiger holt den Ball hinter dem Tor: Auslösung. Geht der Schuss über das Tor, ist der Ball im Aus: Einschlag hinten (siehe «Standards»). |
| Ballverlust | Der Gegner hat den Ball und greift an: gegen ein aufgerücktes Team oft mit einem Konter (offensiv 60 %, normal 40 %, defensiv 20 %), sonst mit der Auslösung. In der eigenen Hälfte verloren: Der Gegner steht sofort vor deinem Tor. Grober Fehler: Konter in Überzahl, wie bisher. |
| Ballgewinn in der Abwehr («Perfekt») | Dein Konter, wie bisher. |
| Tor | Bully am Mittelpunkt. |

- **Ruhe und Zeitsprung:** Eine Sequenz endet, wenn das Spiel zur Ruhe kommt: Wer den Ball gerade gewonnen hat, greift dann nicht sofort an. Nach der ersten Szene geht es in 85 % der Fälle weiter, nach der zweiten in 30 %, nach der dritten in 5 %, jeweils mal dem Verhältnis aus Werten und Taktik. Gezählt werden Szenen, nicht Eingaben: Wer den Ball schnell verliert, schenkt dem Gegner damit nicht mehr Angriffe als umgekehrt. Danach springt die Uhr sichtbar («Zeitsprung, 12 Minuten später»), die Spieler sammeln sich, und es geht mit einem Standard (Einschlag oder Freischlag) oder mit einem Ballgewinn zum Konter weiter. Die letzte Sequenz jedes Drittels beginnt zwischen der 14. und 17. Minute. Nach einem Tor in der ersten Szene geht dieselbe Sequenz mit dem Bully weiter.
- **Bully:** zu Beginn jedes Drittels und nach jedem Tor. Die beiden Center stehen sich gegenüber, nach 0.9 bis 2.4 Sekunden fällt der Ball (grosses Signal «Jetzt!»). Du tippst, sobald er fällt, irgendwo auf den Bildschirm. Zeit hast du 400 ms, pro Punkt Unterschied bei Form und Erfahrung der beiden Center 3 ms mehr oder weniger, dazu bis 50 ms für die Energie (zwischen 300 und 560 ms). Rechtzeitig: Du hast den Ball, ein Verteidiger baut auf. Sehr schnell (höchstens 72 % der Zeit): Der Ball geht sofort nach vorn, 3 gegen 2. Zu spät: Der Gegner greift an. Zu früh getippt: Der Ball geht an den Gegner, der sofort in Überzahl kommt.
- **Freier Ball:** dasselbe kurze Tippen, mit dem Spieler, der am nächsten steht. Wer näher steht, hat mehr Zeit (2 ms pro Feldeinheit), und der Verteidiger hat 45 ms Vorsprung: Er steht zum Ball, der Angreifer kommt von hinten.
- **Block:** Gegen einen Schuss blockt dein Verteidiger schon mit «Im Feld». Der Ball springt weg und liegt frei. Vorher gab «Im Feld» deinem Goalie nur mehr Zeit.
- **Gegenpressing:** Verlierst du den Ball vor dem Tor des Gegners und baut er danach hinten auf, stehen deine Spieler noch vorne: Schon «Im Feld» holt den Ball zurück, und dein Angriff geht vor dem Tor weiter.
- **Bild:** Die Ansagen zeigen, was jetzt läuft («Ballwechsel», «Gegenstoss», «Umschalten», «Zweite Welle», «Auswurf», «Ruhe im Spiel», «Zeitsprung»), und alle laufen sichtbar dorthin, wo es weitergeht. Das Signal für Bully und freien Ball liegt in 3D unter dem Geschehen, in der Sicht von oben am Rand.
- **Länge:** Ein Match hat im Mittel rund 13.5 Szenen statt 11 und rund 50 Eingaben statt 35 (davon etwa 9 kurze Tipper bei Bully und freiem Ball), dauert aber gleich lang, weil das Zuschauen dazwischen wegfällt: Der Testspieler im Browser brauchte ohne Vorspulen im Mittel 585 Sekunden pro Match, vorher 624 (je zwei Matches, also grob).
- **Balance (gerechnet mit dem früheren, einfacheren gedachten Spieler):** Er gewinnt mit gleichen Karten 40 % (vorher 43 %), mit 6 Punkten schwächeren 23 % (27 %), mit 6 Punkten stärkeren 67 % (66 %). Ein sehr genauer Spieler (80 ms Streuung, zielt immer auf die beste Stelle) gewinnt jetzt öfter: 84, 94 und 99 % statt 73, 90 und 96 %, weil Können an mehr Stellen zählt. Tore pro Match für den mittleren Spieler: 0.98:1.39 (vorher 0.82:1.13). Wer nie die Linie wechselt, gewinnt mit gleichen Karten nur 29 %.
- **Tests:** `test/field.test.js` prüft Bully, freien Ball, zweite Welle, Auswurf, Block, Gegenpressing, Ruhe, Zeitsprung und Drittelsende und spielt 80 ganze Matches, in denen jeder Übergang vorkommen muss. `test/match.js` kennt im Browser Bully, freien Ball und Auswurf und macht von jeder Ansage ein Bild.
- **Noch nicht drin:** 2-Minuten-Strafen (der nächste Schritt); Druckphasen; fliegende Wechsel; beim Bully fällt der Ball in der 3D-Halle nicht sichtbar, nur das Signal zeigt es. Nicht auf einem echten Telefon gemessen: ob die Zeitfenster für Bully und freien Ball zur Reaktionszeit auf dem Gerät passen.

**Standards: Einschlag und Freischlag.** Nach einem Unterbruch gab es bisher nur das Bully. Jetzt kommen die zwei häufigsten Standards des Unihockeys dazu, mit ihren Regeln: Die Gegner halten drei Meter Abstand (gestrichelter Kreis um den Ball), und der Ball muss gespielt werden. Wer ausführt, darf nicht selbst loslaufen, und ein direkter Schuss darf kein Zugschuss sein.

| Auslöser | Standard |
|---|---|
| Foul im Zweikampf vor dem Tor | Freischlag am Ort des Fouls, nie näher als gut fünf Meter am Tor. Der Gefoulte führt aus. |
| Foul im Aufbau | Freischlag hinten: Das Team rückt in Ruhe auf, es geht als Positionsangriff weiter. |
| Ein geblockter Schuss fliegt über die Bande (in 20 % der Fälle, sonst liegt der Ball frei) | Einschlag für den Angreifer an der Seitenbande. |
| Eine Parade lenkt den Ball ins Aus (10 %) | Einschlag für den Angreifer in der Ecke. |
| Schuss über das Tor | Einschlag für den Verteidiger hinten: Die Auslösung beginnt an der Bande, der erste Ball muss gespielt werden (kein Vorstoss). |
| Zeitsprung, danach ein Positionsangriff | Einschlag vor dem Tor (60 %, davon ein Viertel in der Ecke) oder Freischlag (40 %). Konter beginnen wie bisher mit dem Ballgewinn. |

- **Freischlag vor dem Tor:** Zwei Gegner bilden die Mauer, drei Meter vor dem Ball. Sie deckt die nahe Ecke; rund ein Drittel der Torbreite bleibt auf der fernen Seite offen, und dort steht der Goalie. Die vier Mitspieler stehen für je eine Variante bereit, im Spiel als Raster zum Antippen: **Ablage** (der beste Schütze steht neben dem Ball zur Mitte hin: sicherer Pass, dann Direktschuss an der Mauer vorbei), **2. Pfosten** (riskanter Pass quer durch den Slot; kommt er an, steht der Goalie noch falsch), **Vor den Goalie** (riskant, Abschluss aus nächster Nähe) und **Zurück** (sicher, neu aufbauen). Dazu **Direkt aufs Tor**: an der Mauer vorbei in die ferne Ecke.
- **Einschlag vor dem Tor:** Der Ball liegt an der Seitenbande oder in der Ecke, der Gegenspieler des Ausführenden steht drei Meter vor dem Ball im Weg zum Slot. Varianten: **In den Slot**, **2. Pfosten**, **Zurück** (zum Verteidiger an der Bande) und **Seitenwechsel**. Aus der Ecke gibt es keinen Schusswinkel: Der Knopf für den direkten Schuss ist dort gesperrt.
- **Was die Varianten wert sind:** für den gedachten mittleren Spieler, über 200 Freischläge und 300 Einschläge an zufälligen Orten gerechnet (Pass kommt an mal Torchance danach). Freischlag: direkt 12 %, Ablage 19 % (84 % mal 23 %), zweiter Pfosten 24 % (53 % mal 44 %), vor den Goalie 16 %. Einschlag: zweiter Pfosten 32 % (47 % mal 67 %), Slot 23 %, direkt 7 % (wo er erlaubt ist). Welche Variante die beste ist, wechselt mit dem Ort und damit, wer gerade frei steht.
- **Foul:** Im Zweikampf gegen ein Dribbling kann der Verteidiger foulen. Wie oft, hängt an seiner Fairness (ein Kartenwert, der bisher nur in den Zweikampfwert einfloss) und an seiner Energie: 30 % bei Fairness 78, 12 % bei 95, 47 % bei 62, müde bis zur Hälfte mehr. Bei deinem Dribbling: Bleibt es hängen (knapp daneben oder daneben), pfeift der Schiedsrichter mit dieser Quote, und du bekommst den Freischlag, statt den Ball zu verlieren. Bei deinem Zweikampf entscheidet zuerst das Timing: Grob daneben ist immer ein Foul, daneben mit der Quote deines Verteidigers. Höchstens ein Freischlag pro Szene. Im Aufbau des Gegners pfeift niemand gegen dich: Wer dort zu spät kommt, ist überlaufen, und der Vorteil läuft.
- **Abwehr:** Der Plan des Gegners ist wie immer sichtbar. Er dribbelt beim Standard nie und wechselt die Variante (Freischlag: Ablage und zweiter Pfosten je gut ein Viertel, direkt und vor den Goalie je rund ein Fünftel; Einschlag: meist in den Slot, sonst an den zweiten Pfosten oder zurück). Schiesst er den Freischlag direkt, blockt deine Mauer: Dein Feld ist ein Viertel breiter, schon «Im Feld» ist der Schuss geblockt. Kommt er durch, fliegt der Ball auf die ferne Seite, und dein Goalie hat 60 ms mehr Zeit.
- **Bild:** Pfiff und Stempel «Foul», «Aus», «Freischlag», «Einschlag» oder «Einschlag in der Ecke»; alle laufen auf ihre Plätze, die Mauer steht sichtbar, der Kreis zeigt den Abstand. Im Tor von vorne ist der Schatten der Mauer rot schraffiert. Nach einem Zeitsprung sagt die Ansage, warum unterbrochen war («Foul an …», «Der Ball war im Aus»).
- **Häufigkeit:** Für den gedachten mittleren Spieler gibt es pro Match gut zwei Standards vor einem Tor: 0.8 eigene (0.6 nach einem Zeitsprung, der Rest nach Fouls und Bällen im Aus) und 1.5 des Gegners (0.6 nach einem Zeitsprung, 0.5 nach Paraden und Blocks ins Aus, 0.3 nach eigenen Fouls). Der Gegner hat mehr, weil er öfter schiesst und dribbelt als dieser Spieler. Dazu kommen 0.6 Einschläge des Gegners hinten nach eigenen Schüssen über das Tor. Wer selbst oft dribbelt, holt mehr Freischläge heraus.
- **Balance und Länge:** Die Standards ersetzen andere Lagen (den freien Ball, den Positionsangriff nach dem Zeitsprung), sie kommen nicht obendrauf. Derselbe gedachte Spieler gewinnt mit gleichen Karten 53 % (vorher 52 %), mit 6 Punkten schwächeren 31 % (29 %), mit 6 Punkten stärkeren 75 % (70 %); bei 400 bis 500 Matches je Zahl sind Unterschiede bis etwa 3 Punkte Zufall. Der sehr genaue Spieler gewinnt 96 % (97 %). Tore pro Match 1.40:1.49 (1.34:1.43), Eingaben 52 (49). Wer nie die Linie wechselt, gewinnt mit gleichen Karten 34 %.
- **Tests:** `test/field.test.js` prüft Aufstellung, Mauer und Abstand, die Regeln (kein Dribbling, kein Zugschuss, kein Schuss aus der Ecke), Fouls auf beiden Seiten, den Ball im Aus und die Standards nach dem Zeitsprung, und spielt 120 ganze Matches, in denen jeder Standard vorkommen muss. `test/match.js` prüft im Browser das Raster der Varianten und macht Bilder.
- **Noch nicht drin:** Ein Foul kostet noch nichts ausser dem Freischlag, es gibt keine 2-Minuten-Strafe (der nächste Schritt). Der Schusswinkel zählt nur in der Ecke, sonst wie bisher über die Lage. Der Schiedsrichter kennt den Vorteil nur im Aufbau.

**Linien und Taktikkarten.** Wie in einem Manager-Spiel zählt jetzt der ganze Kader, und wie in Clash Royale nimmst du ein kleines Deck mit ins Match:

- **Zwei Linien:** Jedes Team hat zwei Linien zu drei Stürmern und zwei Verteidigern. Eine steht auf dem Feld, die andere erholt sich auf der Bank. Den Wechsel wünschst du jederzeit über den Umschalter neben der Taktik; gewechselt wird beim nächsten Unterbruch (zwischen zwei Sequenzen, nach einem Tor, in der Pause). Die Werte der Linie auf dem Feld bestimmen, wer am Drücker bleibt.
- **Warum wechseln:** Simulation mit dem gedachten mittleren Spieler und zwei gleich starken Linien (800 Matches je Zeile, Siegquote): nie wechseln 29 %, wechseln, sobald die Bank klar frischer ist, 40 %. Eine Linie spielt jetzt eine ganze Sequenz durch und wird dabei müde.
- **Der Gegner coacht mit:** Er wechselt seine Linien nach der Energie, stellt in den letzten Minuten eines knappen Spiels die erste Linie und setzt seine Taktikkarten ein, wenn ihr Moment da ist.
- **Taktikkarten:** Bis zu drei kommen mit ins Match, jede einmal einsetzbar. Antippen zeigt, was die Karte tut; erst «Einsetzen» spielt sie. Drei hast du von Anfang an, drei gibt es im Shop.

| Karte | Wirkung | Preis |
|---|---|---|
| Time-out | Alle Spieler beider Linien bekommen 30 Energie zurück. | Start |
| Pressing | In den nächsten zwei Abwehrszenen gewinnt schon «Im Feld» den Ball, nicht erst «Perfekt». | Start |
| Spielzug | Der nächste Angriff aus dem Spiel ist ein Konter 3 gegen 2, alle Felder sind 25 % breiter. | Start |
| Kaltblütig | Beim nächsten Schuss läuft der Strich 40 % langsamer. Geht auch im Penaltyschiessen. | 900 |
| Mauern | Bis zum Drittelsende kommt der Gegner nur halb so oft zum Angriff, du selbst 40 % seltener. | 1400 |
| Goalie raus | Bis zum nächsten Tor oder Drittelsende bleibst du doppelt so oft am Drücker, die Felder sind 15 % breiter, und das Drittel bekommt eine Sequenz mehr. Jeder Schuss des Gegners trifft das leere Tor, jeder Ballverlust ist ein Konter. | 2000 |

Auch die Gegner haben Karten (WASA nur ein Time-out, GC drei). Nimmt der Gegner den Goalie raus, schiesst du aufs leere Tor.

**Versuch: Angriff als Live-Szene (im Spiel wieder abgeschaltet).** Die Steuerung mit gezeichneten Linien war zu verwirrend. Im Spiel gelten wieder die Aktionsknöpfe (Schuss, Dribbling, Pass); die Live-Szene steckt noch in der Engine (`liveTick`), wird aber nicht mehr gezeigt. So war sie gedacht: Die Chance läuft als durchgehende Szene von oben, und du zeichnest vom Ball aus eine Linie:

- **Zum Mitspieler:** Pass. Die Linie ist grün, wenn der Weg frei ist, gelb, wenn es eng wird, rot, wenn ein Gegner dazwischenkommt.
- **Ins Tor:** Schuss. Es folgt der Abschluss vor dem Tor wie bisher (Ziel setzen, Schuss-Balken, Goalie). Direkt nach einem Querpass steht der Goalie noch falsch.
- **In den freien Raum:** Der Ballführende läuft dorthin.
- **Zeitlupe:** Solange der Finger aufliegt, läuft die Szene mit gut einem Fünftel des Tempos. Ein Befehl, der während eines Passes gezeichnet wird, gilt für den, der den Ball annimmt: So geht der Direktschuss.
- **Was sich bewegt:** Die Mitspieler laufen auf ihre Plätze (Slot, zweiter Pfosten, Bande, hinten) und laufen sich dort in kleinen Bögen frei. Die Verteidiger decken mit Verzögerung, stellen Passwege zu und sind immer wieder kurz unaufmerksam: Dann erscheint beim Mitspieler ein grüner Ring mit «FREI». Der Gegenspieler des Ballführenden greift nach gut einer Sekunde an; wer an ihm vorbei ist, zieht den nächsten Verteidiger an, dessen Mann frei wird.
- **Ballverlust:** Kommt ein Verteidiger an den Ballführenden (roter Kreis), ist der Ball weg, ebenso wenn ein Pass durch die Reichweite eines Verteidigers geht. Wer in einen Gegner hineinläuft oder ihm den Ball direkt in den Stock spielt, lädt zum Konter ein. Oben läuft die Zeit: neun Sekunden im Positionsangriff, sechseinhalb im Konter.
- **Karten:** Dribbling bestimmt das Tempo mit Ball, Pass das Tempo des Balls, Zweikampf und Antizipation der Gegner ihr Tempo, ihre Reaktion, ihre Reichweite und wie selten sie unaufmerksam sind. Müde Spieler sind langsamer.
- **Technik:** Die Szene wird in festen Schritten gerechnet (`liveTick` in `src/lab/match.js`). Der Bildschirm rechnet mit derselben Funktion; die Befehle gehen mit ihrem Schritt an die Engine, die die Szene nachspielt.

Die folgenden Abschnitte zu Passwegen, Dribbling-Parcours und Spielweisen beschreiben die Form in Schritten, die im Spiel gilt.

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

**Das Match in 3D.** Wo es WebGL gibt, läuft das ganze Match in einer 3D-Halle mit Knetfiguren, nicht mehr nur das Ergebnis einer Aktion. Die Regeln, die Knöpfe und der Timing-Balken sind dieselben wie vorher; geändert hat sich, was man sieht und wo man hintippt.

- **Laufendes Spiel und Entscheidungen:** Die Kamera schaut schräg von hinten über deine Hälfte aufs Feld und fährt dem Spiel nach; du spielst immer nach oben, der Gegner kommt auf dich zu. Über den Figuren stehen Namensschilder, bei deinen Spielern mit Energiebalken. Passwege liegen als farbige Linien am Boden, freie Mitspieler haben einen grünen Ring und ein grünes Schild. Einen Mitspieler anspielen: auf die Figur tippen oder den Knopf darunter nehmen.
- **Schuss:** Die Kamera schaut mit langer Brennweite aufs Tor. Ins Tor tippen oder schieben setzt das Ziel (goldener Ring); der dunkle Bereich um den Goalie ist seine Reichweite, und er rückt wie bisher zur Seite des Ziels, während der Schuss-Balken läuft. Danach Schnitt hinter den Schützen: Schuss, Flug, Tor oder Parade, bei einem Tor der Jubel.
- **Parade:** Der Gegner schiesst, der Ball fliegt auf dein Tor, ein goldener Ring zeigt den Landepunkt. In die Ecke tippen; dein Goalie springt dorthin, und die Szene läuft ohne Unterbruch weiter.
- **Dribbling-Parcours:** Derselbe Lauf mit Wischen, jetzt mit den Figuren in der Halle und der Kamera im Rücken des Dribblers. Rote Kreise: Ball weg. Weisse Ringe: gestört. Wer ausgespielt ist, greift ins Leere und fällt auf den Bauch.
- **Szenen:** Pässe, Zweikämpfe und Schüsse laufen als kurze Szenen in derselben Halle; ein Tipp aufs Feld spult vor. Greift der Gegner an, spielt die Szene vor deinem Tor.
- **Figuren aus Knete:** bewusst nicht realistisch. Grosser Kopf, Kulleraugen mit Glanzpunkt, die dem Ball folgen und blinzeln, Brauen, Nase, Ohren, rote Wangen, ein Mund mit Zähnen, der lacht, jubelt oder die Mundwinkel hängen lässt, sieben Frisuren aus dicken Knetrollen, kurze dicke Arme und Beine, Fäuste, dicke Stulpen, grosse runde Schuhe. Alles ist leicht unrund. Die Figuren federn und strecken und stauchen sich. Der Goalie kniet mit Gitterhelm, dicken Handschuhen und Knieschonern. Die Vorlage waren zwei mit Artlist erzeugte Entwürfe; im Spiel sind die Figuren im Code gebaut, ohne Modell-Dateien.
- **Bild:** weiches Studiolicht aus einer gerechneten Umgebung, weiche Schatten, und Tiefenunschärfe: Was weit hinter dem scharfen Punkt liegt (Tribüne, Wand), wird weich, wie bei einer Aufnahme von Miniaturen. Der Hallenboden glänzt leicht. Das Tor ist etwas grösser gebaut und der Goalie etwas kleiner, damit die Ecken sichtbar offen bleiben.
- **Halle:** ganzes Feld mit zwei Toren, Netze, die beim Tor ausbeulen und nachschwingen, Tribünen rundum mit bunten Knetfans (sie jubeln für ihre Seite), Leuchtbänder («TOR!» beim Treffer), Hallenlampen.
- **Langsame Geräte:** Bleibt die Darstellung länger unter 20 Bildern pro Sekunde, wird sie von selbst einfacher: erst kleinere Auflösung, dann ohne Unschärfe und Schatten. Fällt sie ganz aus, läuft das Match in der Sicht von oben weiter.
- **Ohne 3D:** Fehlt WebGL oder ist am Gerät «Bewegung reduzieren» eingestellt, läuft alles wie vorher in der Sicht von oben und in der Torsicht von vorne. Die Sicht von oben bleibt im Hintergrund das Modell: Jede Bewegung wird dort gerechnet und an die 3D-Halle weitergereicht.
- **Technik:** `src/lab/scene3d.js` (`HKScene3D`), dazu three.js r149 (`vendor/three.min.js`, MIT-Lizenz, 608 KB, gzip rund 150 KB), das neben der Match-Seite liegt und nachgeladen wird. Der Browser-Test spielt Matches in 3D durch (Tippen auf Figuren, Zielen im Tor, Parade, Parcours) und prüft, dass Tippen ins Tor die richtige Stelle trifft. Die Testumgebung rechnet 3D ohne Grafikkarte und darum sehr langsam; wie flüssig es auf einem echten Telefon läuft, ist nicht gemessen.

**Vollbild.** Im Match ist der Bildschirm das Spiel: Die Seite scrollt nicht mehr, und alles, was man zum Spielen antippt, liegt im Bild.

- **Aufbau in 3D:** Die Halle füllt den ganzen Bildschirm. Oben liegt die Anzeige darüber (Spielstand, Drittel, Minute, darunter der Trainer-Knopf und die Taktikkarten als runde Knöpfe), unten ein Bereich mit der Ansage und den Knöpfen der aktuellen Aktion (Schuss, Dribbling, Pässe; Schussarten; Tippfläche des Balkens). Die Kamera legt das Geschehen in das Fenster zwischen Anzeige und Knöpfen; dahinter läuft das Bild weiter.
- **Knöpfe kürzer:** Die Pässe sind eine Reihe zum Wischen statt vier grosser Knöpfe (anspielen geht weiter direkt auf dem Feld). Erklärtexte sind auf zwei Zeilen gekürzt, ein Tipp darauf klappt sie auf. Am Schuss-Knopf steht das Wichtigste zuerst (Schussbahn, Schussart).
- **Trainer:** Taktik, Linienwechsel, Taktik des Gegners und Ticker liegen in einem Blatt, das der Trainer-Knopf öffnet; er zeigt die laufende Taktik und die Energie der Linie und leuchtet in der Drittelspause. Ein Tipp neben das Blatt schliesst es, ohne etwas auszulösen.
- **Ohne 3D:** Das Feld von oben steht unter der Anzeige, die Knöpfe darunter; auch das passt ohne Scrollen auf einen Bildschirm.
- **Echtes Vollbild:** Auf Android-Telefonen und -Tablets bittet die Seite beim Anpfiff um Vollbild (ohne Adresszeile) und verlässt es beim Schlusspfiff. Das iPhone erlaubt das Webseiten nicht; dort füllt das Spiel das Browserfenster.
- **Geprüft:** in der Testumgebung bei 375 x 812, 390 x 664 und 375 x 667 Bildpunkten, mit und ohne 3D. Auf echten Telefonen ist es nicht ausprobiert. Die 3D-Halle rechnet im Vollbild etwa doppelt so viele Bildpunkte wie vorher; die Auflösung geht deshalb mit der Fläche etwas zurück, und die automatische Vereinfachung auf langsamen Geräten bleibt.

**Schussarten.** Jeder Schuss ist ein Schlagschuss, ein Handgelenkschuss oder ein Zugschuss. Es bleibt bei einem Ziel im Tor und einem Schuss-Balken; die Schussart verändert, wie breit das Feld ist, wie schnell der Strich läuft, wie weit der Goalie reicht, wo er steht und wie leicht ein Gegner blockt.

| | Schlagschuss | Handgelenkschuss | Zugschuss |
|---|---|---|---|
| Idee | weit ausholen, hart | kurz und schnell | Ball zur Seite ziehen, dann schiessen |
| Feld am Balken | schmal (mal 0.85), Strich schneller | breit (mal 1.15), Strich langsamer | normal |
| Goalie | reicht weniger weit, vor allem aus der Distanz | reicht aus der Distanz weiter | steht noch auf der alten Seite, rutscht aber schnell zurück |
| Gegner in der Schussbahn (sein Schatten im Tor, siehe unten) | 30 % breiter: Er hat Zeit, sich breit zu machen | 25 % schmaler | wandert zur Seite: Es öffnet sich ein Fenster |
| Gegner am Mann | blockt, schon bei «knapp daneben» | stört nur halb so stark | stört stärker: Für den Zug fehlt der Platz |
| Direktschuss nach Querpass | voller Vorteil | 40 % davon | keiner: Der Zug braucht eine Annahme |

- **Wann welche:** Aus der Distanz und beim Direktschuss schlagen. Aus der Nähe und mit einem Gegner am Mann aus dem Handgelenk. Steht der Gegenspieler direkt in der Schussbahn, ziehen. Aus mittlerer Distanz und frei liegen alle drei nah beisammen.
- **Empfehlung:** Die Engine rechnet für jede Art die Torchance in genau dieser Lage (Blocker, Goalie, Druck), stellt die beste ein («Tipp») und nennt den Grund; liegt der Lieblingsschuss kaum dahinter, nimmt sie ihn. Beim Zielen stehen die drei Arten als Knöpfe unten im Bild; ein Tipp auf eine andere stellt Goalie, Reichweite und Balken sofort um. Die Zahl auf dem Knopf ist die Breite des grünen Felds in Prozent, «Block droht» warnt vor dem Gegner.
- **Lieblingsschuss:** Jede Karte hat einen, abgeleitet aus ihren Werten (Abschluss: Schlag, Clutch: Handgelenk, Form: Zug; gemessen an der Mitte aller Karten, sodass jede Art bei etwa einem Drittel der Stürmer vorkommt). Kanone schlägt immer, Dribbelkönig zieht immer. Im Lieblingsschuss ist das Feld 15 % breiter. Er steht im Kartenblatt (Karte antippen) und beim Zielen als «Liebling» am Knopf. Auf den Karten stehen keine neuen Zahlen.
- **Schuss des Gegners:** Seine Schussart ist angesagt, bevor der Ball fliegt, und in 3D sieht man ihn von hinten ausholen. Schlagschuss: Er holt lange aus, danach bleibt 16 % weniger Zeit für die Parade. Handgelenk: kommt ohne Ansatz. Zugschuss: Der Ball zieht zuerst zur falschen Seite, der Ring steht dort; nach 110 bis 220 ms springt der Ring an den echten Landepunkt. Wer wartet, hat danach so viel Zeit wie beim Handgelenk; wer die Finte kennt, tippt gleich auf die andere Seite. Deine Störung in der Abwehr wirkt gegen den Schlagschuss stärker, gegen das Handgelenk schwächer.
- **In 3D:** Beim Schlagschuss bleibt der Ball liegen, der Stock holt bis Hüfthöhe aus, der Ball fliegt flach und schnell, das Netz beult stärker aus. Das Handgelenk ist ein kurzes Schnappen. Beim Zugschuss geht der Schütze mit dem Ball zur Seite, die Kamera rückt mit.
- **Balance:** `test/styles.test.js` rechnet für einen gedachten Spieler (80 ms Streuung am Balken, bestes Ziel im Tor) die Torchance jeder Art in jeder Lage und spielt 200 ganze Matches. In den Schusslagen dieser Matches ist die empfohlene Art in rund 80 % die beste, im Mittel fehlen 2 Punkte Torchance; immer dieselbe Art zu nehmen kostet je nach Art 6 bis 11 Punkte pro Schuss. Die Werte sind gerechnet, nicht mit echten Spielern gemessen.
- **Noch nicht drin:** Heber, Aufsetzer und Rückhand; Gesten statt Knöpfe.

**Verkehr vor dem Tor.** Ein Schuss fliegt nicht mehr durch die Gegner hindurch. Wer zwischen Ball und Tor steht, blockt; wer dem Goalie die Sicht nimmt, hilft dem Schützen; und was der Goalie nicht festhält, kann ein zweites Mal aufs Tor kommen.

- **Block:** Jeder Gegner zwischen Ball und Tor wirft einen Schatten ins Tor, gerechnet vom Ball aus. Was in den Schatten fliegt, ist geblockt («In den Block»), auch wenn der Strich perfekt gestoppt war. Wer nah am Schützen steht, deckt fast das ganze Tor; wer vor dem Goalie steht, nur einen Streifen und nicht ganz bis zur Latte. Gute Blocker (Block-Wert, «Wand») sind breiter. Beim Zielen sind die Schatten rot schraffiert im Tor zu sehen, in 3D und in der Torsicht von vorne.
- **Aus der Distanz:** Von hinten steht im Schnitt gut ein Gegner im Weg, im Mittel ist gut die Hälfte des Tors verdeckt. Wer trotzdem schlägt, schiesst oft in den Block: Im Testlauf war es etwa jeder dritte Distanzschuss. Der Weg zum Tor aus der Distanz ist der Pass quer nach hinten und der Direktschuss, bevor der Block steht (beim Direktschuss sind die Schatten bis zu 30 % schmaler).
- **Gegenspieler direkt vor dem Schützen:** Sein Schatten deckt das ganze Tor, Schlag und Handgelenk gehen sicher in den Block. Der Zugschuss zieht den Ball 0.8 m zur Seite; der Gegenspieler geht nur zum Teil mit (je nach Zweikampf gegen Dribbling 30 bis 80 % des Wegs), und auf der Seite des Zugs öffnet sich ein Fenster. Sonst: passen oder dribbeln. Der Knopf «Schuss» warnt mit «Schussbahn zu».
- **Sichtschutz:** Hat ein Verteidiger hinten den Ball, läuft der Center auf die Schussbahn, drei Meter vor das Tor. Steht ein Mitspieler dort, sieht der Goalie den Ball spät und reicht weniger weit (pro Mitspieler 0.07, höchstens zwei). Sein Gegenspieler steht dann allerdings auch in der Schussbahn.
- **Abpraller:** Eine Parade, die den Ball nicht festhält, lässt ihn vor das Tor springen. Ist ein Angreifer klar zuerst dort, schiesst er sofort nach: nur aus dem Handgelenk, der Goalie liegt noch auf der Seite der Parade und reicht weniger weit. Höchstens ein Nachschuss pro Szene; sonst liegt der Ball frei, und es gibt den Zweikampf darum (siehe «Sequenzen»). Das gilt für beide Seiten: Hält dein Goalie spät, kommt der Nachschuss mit 20 % weniger Zeit; wer schnell reagiert (in den ersten 60 % des Zeitfensters), fängt den Ball, es gibt keinen Abpraller, und es folgt dein Auswurf.
- **Slot:** Die Zone vor dem Tor, aus der die meisten Tore fallen, ist am Boden hell und gestrichelt eingezeichnet, in 3D und in der Sicht von oben.
- **Druck am Balken:** Ein Gegner in der Schussbahn macht das Feld am Balken nicht mehr schmaler; das tut nur noch ein Gegner direkt am Mann.
- **Wirkung im Testlauf:** Derselbe gedachte Spieler (schiesst nur mit mindestens 30 % Torchance oder wenn kein Pass besser ist) erzielt mit diesen Regeln rund 1.6 Tore pro Match statt 1.1, weil er nicht mehr in zugestellte Schussbahnen schiesst und früher passt; der Gegner kommt auf rund 0.9 statt 0.7, der Unterschied sind seine Abpraller. Gerechnet, nicht mit echten Spielern gemessen.
- **Tests:** `test/styles.test.js` prüft Schatten, Fenster beim Zugschuss, Sichtschutz und Abpraller in der Engine. `test/traffic.js` stellt drei Lagen im Browser in 3D (Schuss von hinten in den Block, eigener Abpraller, Abpraller des Gegners) und spielt sie durch; dafür gibt es `window.HKMatchTest` (Zustand lesen und laden).
- **Noch nicht drin:** Schüsse des Gegners werden nicht von deinen Spielern in der Schussbahn geblockt (dafür gibt es weiter den Block am Timing-Balken); abgefälschte Schüsse; Mitspieler blocken nie.

**Raum und Tiefe.** Nicht mehr jede Chance beginnt mit allen zehn Spielern vor einem Tor. Chancen können hinten beginnen, die Spieler stehen dann über das ganze Feld verteilt, und was der Ballführende dort wählt, entscheidet, wie es vor dem Tor weitergeht.

- **Auslösung:** Knapp die Hälfte der Positionsangriffe beginnt in der eigenen Hälfte. Ein Verteidiger hat den Ball, sein Partner steht daneben, der Center kommt kurz, ein Flügel wartet an der Bande auf Höhe der Mittellinie, der andere steht tief in der Hälfte des Gegners. Der Gegner stört früh, Mann gegen Mann.
- **Umschalten:** Konter beginnen dort, wo der Ball gewonnen wurde: nach einem Ballgewinn in einer Abwehrszene immer, aus dem laufenden Spiel in etwa sieben von zehn Fällen. Die meisten Gegner sind noch hinter dem Ball, ein Mitspieler läuft schon in die Tiefe.
- **Langer Pass («Steilpass» im Konter):** Er wird hoch gespielt. Abfangen kann ihn nur, wer beim Empfänger steht; dafür ist er an sich schwer (im Mittel rund 55 bis 60 % Erfolgschance, das grüne Feld ist etwa halb so breit wie bei einem sicheren Pass). Er bringt am meisten: beim Umschalten «allein durch» (im Feld mit einem Verfolger im Rücken und darum von weiter weg, perfekt ganz frei), in der Auslösung 2 gegen 1 (perfekt: allein durch). Knapp: Er kommt an, aber der Verteidiger ist dran. Daneben: Ball weg.
- **Vorstoss:** Der Ballführende trägt den Ball selbst nach vorn. Beim Umschalten ist die Bahn frei, es braucht keinen Zweikampf, und der Konter läuft wie bisher vors Tor. In der Auslösung ist es der Dribbling-Parcours gegen die Gegner, die stören; vorbei heisst 3 gegen 2 (perfekt: auch der zweite Verteidiger ist überlaufen).
- **Kurzer Pass:** sicher. In der Auslösung stellt sich danach alles neu auf, mit Center oder Flügel am Ball; von dort ist der lange Ball kürzer und leichter. Nach zwei Aktionen ohne Durchbruch steht die Abwehr des Gegners, und es geht als Positionsangriff mit drei Aktionen weiter. Im Konter führt der Empfänger den Konter weiter, ein Rückpass bricht ihn ab.
- **Nach dem Durchbruch:** Wer aus der Auslösung in Überzahl ankommt, hat eine Aktion mehr als im Konter (die Mitspieler sind aufgerückt). Wer allein durch ist, schiesst oder legt quer auf den nachrückenden Mitspieler.
- **Risiko hinten:** Ein grober Fehler in der eigenen Hälfte (Pass oder Vorstoss weit neben dem Feld) ist ein Konter direkt vor dem eigenen Tor, öfter als sonst ein Alleingang.
- **Kein Schuss von hinten, kein Dribbling vor dem Tor:** Im Aufbau gibt es den Knopf «Schuss» nicht. Näher als 5.5 Meter am Tor und allein vor dem Goalie gibt es kein Dribbling mehr: Dort bleiben Schuss und Querpass, der Schuss-Knopf füllt dann die ganze Breite. Der Gegner hält sich an dieselben Regeln.
- **Abwehr:** Baut der Gegner auf oder schaltet er um, gibt es einen Balken gegen seine Aktion (er hat im Aufbau eine). Einen langen Pass fängt schon «Im Feld» ab, daraus wird dein Konter; kommt er an, ist der Gegner in Überzahl oder allein durch und schiesst sofort. Ein Ballgewinn gegen Vorstoss oder kurzen Pass ist eine Chance direkt vor seinem Tor.
- **Bild:** In 3D fährt die Kamera mit. Beim eigenen Aufbau steht sie hinter dem Ballführenden und so weit zurück, dass alle Mitspieler im Bild sind; baut der Gegner auf, zeigt sie den Ballführenden und, bei einem Pass, den Empfänger und seinen Gegenspieler. Der lange Ball fliegt im Bogen. Der Mitspieler in der Tiefe trägt ein goldenes Schild «tief». Nach dem Aufbau laufen alle sichtbar dorthin, wo es weitergeht, mit einer Ansage («Durchbruch», «2 gegen 1», «3 gegen 2», «Abwehr steht»). Die Sicht von oben zeigt im Aufbau fast das ganze Feld.
- **Wirkung im Testlauf:** Derselbe gedachte Spieler wie oben erzielt rund 1.55 Tore pro Match, wenn er im Aufbau immer sicher spielt (vor dieser Änderung 1.6), rund 1.75, wenn er immer den langen Ball sucht, und rund 1.5, wenn er immer selbst vorstösst; der Gegner bleibt bei rund 0.9. Wer nichts riskiert, verliert also fast nichts, und der lange Ball lohnt sich für den, der das schmale Feld trifft. Pro Szene: Ein Konter mit Steilpass endet in rund 33 % mit einem Tor, mit Vorstoss in rund 27 %; eine Auslösung mit langem Ball in rund 28 %, sicher gespielt in rund 21 %. Gerechnet in je 400 Matches, nicht mit echten Spielern gemessen.
- **Tests:** `test/field.test.js` prüft in der Engine, wo Chancen beginnen, die Aufstellungen, was jede Aktion im Aufbau bringt (für beide Seiten), den hohen langen Ball, das Dribbling-Verbot vor dem Tor und ganze Matches mit jeder Wahl im Aufbau.
- **Noch nicht drin:** Aufstellungen und Abwehrsysteme zum Wählen (der Gegner stört immer Mann gegen Mann); Pässe hinter das Tor; Schüsse aus der eigenen Hälfte; im Vorstoss des Gegners mit freier Bahn zeigt die 3D-Halle keine eigene Szene, nur den Lauf.

**Bild von oben.** Die Halle hat einen Boden mit Glanz, eine Bande mit runden Ecken, Torräume und Tore mit Netz. Die Spieler sind vorgebeugte Figuren mit Trikot im Licht, Hose, Rückennummer und Schatten. Der Ball zieht bei Pässen und Schüssen eine Leuchtspur. Bei einem Tor leuchtet eine Anzeigetafel aus Leuchtpunkten mit «TOR!» und Lichtstrahlen auf.

**Können und Karten statt Würfel.** Im Match wird nichts mehr gewürfelt, was der User selbst entscheiden kann:

- **Timing-Balken:** Jeder Pass, jeder Schuss und jede Abwehraktion läuft über einen Balken (das Dribbling über einen eigenen Parcours). Ein Strich läuft hin und her, getippt wird irgendwo auf dem Bildschirm, ohne Zeitlimit. Die Karten bestimmen die Breite des grünen Felds: Grundlage ist der Wertevergleich (zum Beispiel Pass gegen Antizipation), eine Spezialfähigkeit macht es breiter.
- **Noten:** Mitte = perfekt (Vorteil: freier Mitspieler, mehr Raum, genauerer Schuss), im Feld = gelungen, knapp daneben = halb gelungen, daneben = Ball weg, grob daneben = Konter für den Gegner.
- **Abwehr:** Der Plan des Gegners ist sichtbar, der passende Verteidiger reagiert von selbst. Nur die Mitte gewinnt den Ball (und gibt einen Konter). Sonst gilt: Je besser getroffen, desto mehr Zeit bekommt der Goalie beim Schuss.
- **Eigener Schuss:** wie ein Penalty in einem Fussballspiel. Der gegnerische Goalie steht fast in der Mitte. Der dunkle Bereich um ihn ist seine Reichweite: Was dort landet, hält er. Hell ist, was frei bleibt: aus der Distanz nur die hohen Ecken, aus der Nähe viel mehr. Erst ins Tor tippen, wohin der Schuss gehen soll (schieben geht auch, die Zielmarke steht dann über dem Finger). Dann läuft der Schuss-Balken: Genau in der Mitte geht der Ball genau ins Ziel. Steht der Strich links oder rechts davon, weicht der Ball nach links oder rechts ab, am Rand des grünen Felds um 12 % der Torbreite. Wer nah an den Pfosten zielt, riskiert also Pfosten oder Latte, wer Abstand lässt, den Goalie. Das Feld auf dem Balken ist aus der Nähe breit (bis 17 %) und aus der Distanz schmal (ab 3 %). Steht ein Gegner nah, wird es schmaler, und ein klar verpasster Stopp wird geblockt. Gewürfelt wird beim eigenen Schuss nichts.
- **Der Goalie ahnt die Ecke:** Sobald das Ziel steht, läuft eine stille Uhr. Nach 1.5 Sekunden rückt der Goalie zur Seite des Ziels (30 % der halben Torbreite pro Sekunde, höchstens 45 %), seine Reichweite wandert mit. Wer den Strich mehrmals durchlaufen lässt, findet die Ecke zu. Ob er noch hinkommt, zeigt erst der Flug: Bei knappen Bällen läuft er langsamer aus, der Goalie streckt sich, dann erst fällt die Entscheidung.
- **Tempo des Strichs:** Der Abschlusswert bestimmt, wie schnell der Strich auf dem Schuss-Balken läuft: 0.95 Sekunden pro Durchlauf bei Abschluss 90, 0.68 bei 80, 0.45 bei 70. Ein schwacher Schütze muss also viel genauer tippen.
- **Energie:** Jeder Spieler startet mit 100. Jede Szene kostet die Spieler auf dem Feld 5, dazu kosten Pass (4), Annahme (2), Dribbling (10), Schuss (7) und Abwehraktion (7). Wer auf der Bank sitzt, bekommt pro Szene 9 zurück, jede Drittelspause bringt allen 15. Je müder ein Spieler, desto schneller läuft sein Strich auf jedem Balken (bei leerer Energie in 62 % der normalen Zeit). Eine müde Linie bleibt ausserdem seltener am Drücker und lässt mehr zu: Bei leerer Energie zählen ihre Werte 18 Punkte weniger. Die Energie steht als kleiner Balken unter jedem eigenen Spieler, bei jedem Pass-Ziel und am Linien-Umschalter. Müde Schützen des Gegners streuen stärker.
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

Abgestimmt ist das Match so, dass eine Stufe Können etwa sechs Kartenpunkte wert ist. Simulation mit zwei Linien und den drei Start-Taktikkarten, mit drei Modell-Spielern (Streuung beim Tippen 45, 70 und 105 ms, Zielfehler im Tor 3, 5 und 8 % der halben Torbreite, der mittlere und der schwache schauen dem Schuss-Balken einen halben und einen ganzen Durchlauf länger zu, Reaktionszeit 480, 560 und 650 ms), erste Linie um 81 und zweite um 76 gegen WASA (81 und 76), normale Taktik, 300 Matches je Feld, Siegquote:

| Spieler | Karten −12 | −6 | gleich | +6 | +12 |
|---|---|---|---|---|---|
| stark | 36 % | 63 % | 93 % | 99 % | 100 % |
| mittel | 4 % | 12 % | 46 % | 77 % | 95 % |
| schwach | 0 % | 2 % | 6 % | 29 % | 59 % |

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
| `src/lab/scene3d.js` | 3D-Szenen des Matchs: Halle, Figuren, Kamera. Braucht `vendor/three.min.js`. |
| `vendor/three.min.js` | three.js r149, unverändert (MIT-Lizenz) |
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
node test/styles.test.js
```

```bash
node test/field.test.js
```

```bash
node test/traffic.js
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
