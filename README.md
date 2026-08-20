# Card Sandbox 0.5.0 — Game Definitions + stable mobile table

Lokalny proof-of-concept karcianego sandboxa, w którym **Siódemki są definicją gry w `games/sevens.js`, a nie zestawem stałych zaszytych w UI**, botem korzystającym ze stołu i solverem podpowiadającym, ilu kart można się jeszcze pozbyć. Nie wymaga instalacji ani serwera — otwórz `index.html` w nowoczesnej przeglądarce albo opublikuj katalog przez GitHub Pages.

## 0.5.0 — Siódemki jako definicja gry + stabilny stół

- `games/sevens.js` zawiera domyślne zasady Siódemek: talie, jokery, wejście, meldy, sekwensy, wartości, zachowanie stołu i AI.
- Menu gier buduje się z rejestru `window.CardSandboxGames`; dodanie kolejnej definicji nie wymaga dopisywania osobnego przycisku w `index.html`.
- Ustawienia wcześniej wymuszone przez kod (`setMax`, limit udziału jokerów, jeden kolor sekwensu, różne kolory grupy, pozostawanie kart na stole, możliwość pasu) są częścią modelu zasad.
- Edytor pokazuje te parametry i JSON całej definicji nadal można eksportować/importować.
- Dopasowanie meldów jest wykonywane synchronicznie w tym samym renderze, więc nie ma klatki z domyślną szerokością przed przeliczeniem.
- Przy zagęszczeniu stół przechodzi na rzeczywisty wachlarz 50% zanim zacznie mocno pomniejszać karty.

## Zasady presetu

- domyślnie 2 talie i **2 jokery łącznie** (1 joker na talię),
- 7 kart na rękę,
- na początku tury dobierana jest 1 karta,
- sekwens: minimum 3 kolejne karty jednego koloru,
- grupa: 3 lub 4 takie same rangi, wszystkie w różnych kolorach,
- może istnieć kilka osobnych grup tej samej rangi,
- joker jest dziki,
- w pojedynczej kupce jokery muszą stanowić **mniej niż 50%** kart (dokładnie połowa już odpada),
- wejście wymaga minimum 30 punktów z własnych kart,
- 2–10 liczą się według numeru, J/Q/K = 10, A = 11,
- A-2-3 jest legalne i As liczy się wtedy jako 1,
- Q-K-A jest legalne i As liczy się wtedy jako 11,
- K-A-2 jest nielegalne,
- po wejściu można przebudowywać cały stół,
- karta, która była na stole przed turą, musi na nim pozostać,
- joker ze stołu może zostać uwolniony i użyty gdzie indziej, jeśli końcowy stół pozostaje legalny,
- `PROSZĘ →` zatwierdza całą turę transakcyjnie,
- `Cofnij turę` wraca do stanu sprzed dobrania.
