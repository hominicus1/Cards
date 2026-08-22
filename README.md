# Card Sandbox 0.7.2 — Remik 51

## 0.7.0 — Remik 51

- Trzecia pełnoprawna definicja gry: **Remik 51**, nadal na wspólnym silniku `meld`.
- 13 kart, wejście **51 pkt** i co najmniej **1 czysty sekwens bez jokera**.
- Klasyczny stół Remika: po wejściu wolno dokładać do meldów, ale nie wolno rozbierać istniejących układów.
- Uniwersalny stos odrzuconych: dobieranie z talii lub wierzchu odkrytego, obowiązkowy zrzut kończący turę i recykling odkrytych po wyczerpaniu talii.
- Przed wejściem odkrytą kartę można zabrać w trybie `finish-only`; transakcja musi zakończyć się wejściem i wyjściem w tej samej turze.
- Po wejściu wariant `top-must-use`: karta zabrana z odkrytego musi trafić do legalnego meldunku na stole.
- Odzyskanie jokera jest osobną regułą silnika: właściwa karta może zastąpić jokera, a odzyskany joker musi zostać ponownie użyty przed końcem tury.
- Punktacja Remika to suma kart pozostałych w ręce; Joker w ręce = **30 pkt karnych**.
- Naturalne pełne czwórki mogą być wizualnie zwijane jako „zamknięte” meldy bez mieszania ich ze stosem odrzuconych.
- Siódemki zachowują dotychczasową przebudowę całego stołu i auto-draw; Wojna pozostaje na osobnym silniku `battle`.



## 0.6.3 — Battle Interaction & Animation

- Wojna działa teraz fazowo: **rzut → pokazanie kart → rozstrzygnięcie → zebranie puli**.
- Zwykłe bitwy pokazują odkryte karty tak samo jak wojny; nie znikają w tej samej klatce.
- W Wojnie nie ma już przycisku `BITWA/WOJNA`: kliknięcie własnej zakrytej kupki jest akcją „dalej”.
- Karty animują wejście ze stosu na pole bitwy, a po rozstrzygnięciu cała pula leci do stosu zwycięzcy.
- AUTO PLAY korzysta z dokładnie tego samego przebiegu i animacji.


## 0.6.2 — Universal Table Seating

- Wspólny system miejsc przy stole dla wszystkich silników: 2–6 graczy.
- Ty zawsze siedzisz na dole; przeciwnicy zajmują miejsca top-left / top-center / top-right / side-left / side-right zależnie od liczby graczy.
- Siódemki korzystają z tych samych miejsc, ale zachowują środek na meldy i pełną rękę gracza na dole.
- Wojna przenosi odkryte karty z kafelkowego gridu na miejsca graczy; środek pokazuje wyłącznie pole bitwy, pulę i aktualną eskalację.
- Szybki wybór 2–6 graczy jest wspólny dla gier i od razu rozpoczyna nowe rozdanie.
- 0.6.1 mobile-fit zostaje wchłonięte w 0.6.2.

Card Sandbox ma teraz dwa niezależne typy silnika: **`meld`** (Siódemki) oraz **`battle`** (Wojna). Gry nadal są definicjami w `games/*.js`, a wspólne UI wybiera odpowiedni silnik na podstawie pola `engine`.

## 0.6.0 — drugi silnik gry

- Nowy `battle-engine.js`: rozdanie całej talii, odkrywanie, porównanie rang, wspólna pula, wojny i ponowne porównania.
- Nowy preset `games/war.js` z podwórkową Wojną: 2 jokery na talię, Joker > As, 2–6 graczy.
- **Dowolny remis** może uruchomić wojnę, nawet jeśli inny gracz ma aktualnie wyższą kartę.
- Przy wojnie tylko remisujący dokładają 1 kartę zakrytą + 1 odkrytą; pozostali trzymają swoją kartę. Dzięki temu wojna może przeskoczyć na innych graczy.
- Brak pełnych 2 kart na wojnę = wartość 0; nie pożyczamy kart z cudzych stosów.
- Jedna pula rośnie przez całą bitwę. Zwycięzca odkłada ją pod stos: najpierw własne karty, potem kolejni gracze zgodnie z miejscami, z zachowaniem kolejności wykładania.
- Globalny **AUTO PLAY** jest częścią sandboxa. Wojna może przelecieć całkowicie automatycznie; w Siódemkach AUTO PLAY oddaje miejsce gracza istniejącemu AI.
- Edytor pokazuje ustawienia odpowiednie dla aktywnego typu silnika zamiast mieszać reguły meldów z regułami bitwy.

## 0.5.3 — auto-draw + czytelne karty + tap-select 2.0

- Definicja gry ma osobną sekcję `turn`: `drawMode` (`auto` / `manual` / `none`) i `drawCount`.
- Siódemki automatycznie dobierają 1 kartę dokładnie raz na początku tury; przycisk ręcznego dobierania znika w trybie `auto`.
- `Cofnij` wraca do stanu po obowiązkowym auto-draw, więc nie można przypadkiem zablokować swojej tury.
- Przy dużej liczbie meldów dolna połowa kart jest pionowo ukrywana: widoczna zostaje górna część z rangą i kolorem, dzięki czemu rzędy zajmują około połowę wysokości bez utraty czytelności.
- Powiększono indeksy rang i symbole kolorów; trefl jest dodatkowo optycznie wzmacniany względem pika.
- Tap-select podświetla legalne kupki docelowe, a kliknięcie poza celami anuluje wybór bez ruchu.

## 0.5.2 — tap-select na telefonie

- Tapnij kartę, aby ją zaznaczyć; zaznaczona karta wystaje ponad wachlarz i ma złotą obwódkę.
- Tapnij wybraną kupkę, aby przenieść do niej zaznaczoną kartę.
- Tapnij wolne miejsce stołu, aby utworzyć z zaznaczonej karty nowy układ.
- Ponowny tap w tę samą kartę anuluje zaznaczenie.
- Drag&drop pozostaje równoległym sposobem sterowania.

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
- `Cofnij turę` wraca do początku właściwej części tury, już po obowiązkowym automatycznym dobraniu.

## 0.3.7 — telefon, dotyk i orientacja

- edytor konfiguracji jest **domyślnie zamknięty**,
- na telefonie edytor otwiera się jako pełnoekranowy panel i ma własny przycisk `Zamknij`,
- zaawansowany edytor wartości oraz reguły rund są domyślnie zwinięte,
- karty można przeciągać **palcem** z ręki na stół, między układami oraz z powrotem do ręki, jeśli pozwalają na to zasady,
- przeciąganie palcem działa również do ręcznego układania kolejności kart w ręce,
- przy przeciąganiu pojawia się karta-duch i podświetlenie celu,
- ręka i stół automatycznie przewijają się przy przeciąganiu przy krawędzi,
- osobny layout dla telefonu **pionowo**,
- osobny, bardziej płaski layout dla telefonu **poziomo**,
- w pionie ręka jest przyklejona przy dolnej części stołu i karty są kompaktowe,
- w poziomie ograniczono wysokość przeciwników, talii i ręki, aby zostawić więcej miejsca na układy,
- kapsułkę `↘ X` można stuknąć na telefonie — opis podpowiedzi pokaże się jako komunikat.

## Przykład przebudowy stołu

Jeżeli na stole leży `3♦ 4♦ 5♦`, a gracz ma `3♠ 3♣ 6♦`, po wejściu może przebudować stół na:

- `4♦ 5♦ 6♦`
- `3♦ 3♠ 3♣`

Bot potrafi szukać takich przebudów i może korzystać z kart, które już leżą na stole.

## Publikacja

Do repozytorium GitHub wrzuć zawartość tego katalogu tak, aby `index.html`, `app.js`, `engine-core.js` i `style.css` leżały obok siebie w katalogu publikowanym przez GitHub Pages.


## 0.3.7
- Usunięto osobny przycisk/pole „Nowy układ”. Upuszczenie karty w wolnym miejscu stołu tworzy nowy układ automatycznie.
- Poprawiono poziomy overflow na telefonach.
- Ręka automatycznie zmniejsza i zagęszcza karty przy większej liczbie kart.

## 0.3.7 — mobilny stół w rzędach

- Na telefonie układy są ustawiane pionowo, po jednym na rząd — bez poziomego przewijania stołu.
- Pomiędzy układami są subtelne strefy upuszczania; przeciągnięcie tam karty tworzy nowy rząd.
- Działa w pionie i poziomie; w landscape przewijanie stołu jest pionowe.
- Naprawiono CSS z 0.3.6 tak, aby reguły dopasowania szerokości i skalowania ręki były rzeczywiście stosowane.


## 0.3.8 — wejście natychmiastowe
- Nowy meld może być chwilowo niepełny podczas układania; pełna walidacja następuje przy PROSZĘ.
- Osiągnięcie minimum wejścia (domyślnie 30 pkt) odblokowuje stół od razu w tej samej turze.
- Karty użyte do potwierdzenia wejścia muszą pozostać na stole do końca tej tury, ale można je przestawiać pomiędzy układami.
- Kliknięcie karty przed wejściem nie próbuje już wrzucać jej do starego układu stołu; tworzy nowy układ roboczy.


## 0.4.0 — Eco mobile
- mniejszy, zwarty stół w pionie telefonu,
- pionowe meldy mają niższe karty i mniejszą wysokość,
- pasek Cofnij / PROSZĘ jest przyklejony przy górze obszaru gry podczas przewijania,
- ręka dopasowuje szerokość i nakładanie kart do rzeczywistej szerokości telefonu; nie wymaga poziomego przewijania,
- build jest niezależny od konkretnego repozytorium GitHub.


## 0.4.0 — Compact Blocks

- mobilny stół jest mniejszy i bardziej prostokątny,
- krótkie układy 3–4 kart mogą leżeć obok siebie jako bloki,
- układy 5+ kart automatycznie dostają większą szerokość,
- nowy układ nadal powstaje przez upuszczenie karty na wolnym miejscu stołu,
- pasek Cofnij / PROSZĘ nie przewija się razem z układami,
- zmniejszono napis JOKER, szczególnie na małych kartach i w ręce.


## 0.4.1 — Dynamic Drop Table
- stół pozostaje kompaktowy w spoczynku,
- rozpoczęcie przeciągania dowolnej karty automatycznie rozszerza obszar meldów,
- na dole pojawia się szeroka strefa `+ NOWY UKŁAD`, widoczna przez cały drag,
- upuszczenie w tej strefie tworzy nowy blok bez celowania w szczeliny między meldami,
- strefa jest sticky, więc pozostaje łatwo dostępna także przy większej liczbie układów,
- po puszczeniu karty stół wraca do kompaktowego rozmiaru.


## 0.4.3 — Dynamiczny stół + limit jokerów
- podczas przeciągania karty stół sam zwiększa obszar roboczy i pokazuje szeroką strefę na nowy układ,
- nie trzeba celować w wąską granicę między blokami; po puszczeniu stół wraca do kompaktowej wysokości,
- nowa reguła Siódemek: w każdym meldzie/sekwensie liczba jokerów musi być **mniejsza niż połowa** liczby kart,
- przykładowo `2, 2, Joker, Joker` jest nielegalne; 1 joker w 3 lub 4 kartach jest dozwolony, 2 jokery dopiero od 5 kart.


## 0.4.3 — cały stół + menu gier

- Ekran startowy „Wybierz grę”; Siódemki są pierwszym modułem.
- Przycisk „Gry” wraca do menu bez kasowania bieżącej konfiguracji edytora.
- Na telefonie wszystkie meldy pozostają widoczne naraz: plansza nie przewija układów, tylko automatycznie zmniejsza bloki i karty.
- Liczba kolumn i nakładanie kart w meldach są dobierane do szerokości, wysokości oraz liczby układów.
- Strefa „nowy układ” podczas przeciągania jest nakładką i nie wypycha istniejących meldów poza widok.


## 0.4.4 — dolny rząd bez zasłaniania + chwytalny wachlarz

- Strefa `+ nowy układ` podczas dragowania jest teraz osobną półką pod obszarem meldów i nie zakrywa dolnego rzędu kart.
- Karty w meldach układają się wachlarzowo z priorytetem dla czytelnego odsłonięcia każdej kolejnej karty.
- Algorytm dopasowania stołu preferuje mniej kolumn, jeśli długi sekwens byłby zbyt mocno ściśnięty do wygodnego chwytania palcem.


## 0.4.5 — pół-karty + szerokość zależna od liczby kart

- Przy większej liczbie kart/układów na stole wachlarz przechodzi na odsłonięcie 50% każdej kolejnej karty.
- Szerokość każdego bloku meldunku wynika z liczby kart: krótka trójka zajmuje mało miejsca, długi sekwens dostaje proporcjonalnie szerszy blok.
- Algorytm dobiera największy możliwy rozmiar kart, przy którym wszystkie układy nadal mieszczą się w stałym prostokątnym stole bez przewijania.
- Przy mniejszym zagęszczeniu karty są odsłonięte szerzej (ok. 2/3 szerokości), aby zachować wygodę chwytania.


## 0.6.1 — Wojna mobile fit + quick players
- Osobny mobilny layout silnika battle: 3 graczy = 3×1, 4 = 2×2, 5–6 = 3×2; bez limitu wysokości odziedziczonego po meldach.
- Pole bitwy pokazuje wszystkich graczy i ich aktualne karty bez obcinania dolnego rzędu.
- W Wojnie ukryto redundantny górny pasek stosów, a liczby kart są widoczne bezpośrednio przy polach graczy.
- Dodano szybki wybór 2–6 graczy w toolbarze pola bitwy; zmiana natychmiast rozpoczyna nową partię z wybraną liczbą graczy.


## 0.7.1 — Compact Game List
- Game picker changed from large tiles to a narrow single-column list.
- Each row keeps order, game name, one-line description and Play action.
- The list scrolls independently, so dozens of future game definitions remain practical on mobile.
- No game rules or engine behavior changed.


## 0.7.2 — Remik: próg odkrytego stosu + mecz do 500

- Remik 51: nie wolno dobierać z odkrytego stosu, jeśli przed dobieraniem gracz ma mniej niż 3 karty w ręce.
- Reguła jest konfigurowalna jako `discard.minHandToDraw` (0 wyłącza limit).
- Punktacja Remika działa między rundami: zwycięzca rundy +0, pozostali dopisują wartość kart, które zostały im w ręce.
- `game.penaltyLoseAt=500` kończy cały mecz, gdy po rozliczeniu rundy dowolny gracz osiągnie co najmniej 500 punktów karnych. Przy aktywnym progu sztywna liczba rund nie kończy meczu.
