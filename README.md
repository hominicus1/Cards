# Card Sandbox 0.5.2 — Game Definitions + stable mobile table

Lokalny proof-of-concept karcianego sandboxa, w którym **Siódemki są definicją gry w `games/sevens.js`, a nie zestawem stałych zaszytych w UI**, botem korzystającym ze stołu i solverem podpowiadającym, ilu kart można się jeszcze pozbyć. Nie wymaga instalacji ani serwera — otwórz `index.html` w nowoczesnej przeglądarce albo opublikuj katalog przez GitHub Pages.

## 0.5.2 — tap-select na telefonie

- Tapnij kartę, aby ją zaznaczyć; zaznaczona karta wystaje ponad wachlarz i ma złotą obwódkę.
- Tapnij wybraną kupkę, aby przenieść do niej zaznaczoną kartę.
- Tapnij wolne miejsce stołu, aby utworzyć z zaznaczonej karty nowy układ.
- Ponowny tap w tę samą kartę anuluje zaznaczenie.
- Drag&drop pozostaje równoległym sposobem sterowania.
