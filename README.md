# Card Sandbox 0.12.2 — progresywne rozdawanie kart

## 0.12.2

- Karty w rękach pojawiają się dopiero w chwili, gdy animowana karta doleci do gracza.
- Szkat pokazuje rozdanie etapami: pierwsze 3 karty, tajlong, kolejne 4 karty i ostatnie 3.
- Tajlong pozostaje ukryty do zakończenia jego części rozdania.
- Docelowe ułożenie ręki jest zachowane od początku, dzięki czemu kolejne karty nie powodują skakania układu.
- Przerwanie animacji lub wczytanie zapisu bezpiecznie odsłania wszystkie właściwe karty.

## 0.12.1

- Wszystkie gry mają wspólną animację tasowania oraz rozdawania kart do odpowiednich miejsc przy stole.
- W Szkacie rozdanie zachowuje tradycyjny rytm: po 3 karty, 2 do tajlongu, po 4 karty i ponownie po 3.
- Wojna korzysta z przyspieszonego wariantu animacji całej talii.
- Boty, Auto Play i ręczne akcje czekają do zakończenia rozdania.
- Kontynuacja automatycznego zapisu nie odtwarza animacji już zakończonego rozdania.

## 0.12.0

- Aktualna partia zapisuje się automatycznie po każdej zmianie stanu oraz przy opuszczaniu lub ukrywaniu strony.
- Po ponownym otwarciu menu oferuje kontynuację zapisu albo rozpoczęcie nowej gry, która go zastępuje.
- Zapis obejmuje ręce, talię, stół, fazę, kolejkę, wyniki, historię komunikatów oraz stan całego meczu.
- Wszystkie siedem gier zachowuje własne struktury silnika, w tym zbiory i mapy używane przez gry meldowe oraz Szkata.
- Po kontynuacji kolejka botów rusza ponownie, natomiast Auto Play pozostaje bezpiecznie wyłączony.
- Zapis działa lokalnie w tej samej przeglądarce i na tym samym urządzeniu.

## 0.11.7

- Null kończy się natychmiastową przegraną solisty po zabraniu przez niego pierwszego sztychu.
- Beznadziejnie przelicytowana gra kończy się od razu, bez Kontry i dogrywania martwych sztychów.
- Wczesna kontrola uwzględnia możliwego Schneidera, Schwarza, Hand oraz zapowiedzi, więc nie przerywa gry, którą da się jeszcze uratować.
- Null zachowuje stałe wartości i dlatego jego przelicytowanie można rozpoznać natychmiast.
- Wynik i kara za szybkie zakończenie są naliczane tak samo jak po pełnej rozgrywce.

## 0.11.6

- Nauczyciel pokazuje do trzech uzasadnionych ruchów: polecany, bezpieczny i aktywny, zamiast jednej pozornie pewnej odpowiedzi.
- Podpowiedzi rozróżniają solistę, współpracujących obrońców, Nulla oraz aktualnego zdobywcę sztychu.
- Boty i nauczyciel rozumieją cel ramsza: unikają przejmowania sztychów i zrzucają oczka na bezpiecznie przegrywane lewy.
- Pasek kontraktu pozostaje zwarty: pokazuje grę, solistę i wynik stron bez objaśniania triomfów.
- Wszystkie warianty ruchu pozostają widoczne również w mobilnym układzie nauczyciela.

## 0.11.5

- Boty wołają Kontrę na podstawie siły obrony przeciw faktycznie ogłoszonej grze; Ryj i Zup mają osobne, znacznie ostrzejsze progi.
- W próbie 5000 rozdań Kontra padała w około 6–8% gier i niemal 90% razy kończyła się wygraną obrony.
- W Grandzie dupki są ułożone razem po lewej; w grze kolorowej leżą bezpośrednio przy granym kolorze.
- W Nullu ręka zachowuje zwykły porządek kolorów oraz kolejność `7, 8, 9, 10, J, Q, K, A`.
- Pasek kontraktu pokazuje pełną kolejność dupków i pozostałych triomfów gry kolorowej.

## 0.11.4

- Pasek kontraktu sumuje bieżące oczka jako `SOLISTA : OBRONA` zamiast pokazywać nieprzydatne osobne wyniki botów.
- W Nullu pokazuje liczbę sztychów, a w ramszu wyniki wszystkich graczy osobno.
- Interfejs Szkata używa śląskich nazw kolorów: Szel, Herc, Grin i Krojc.
- Terminologia kontraktu używa nazw `triomf` oraz `dupki`, a zasady objaśniają ich znaczenie.

## 0.11.3

- Stały pasek nad sztychem pokazuje rodzaj gry, atuty oraz nazwę solisty.
- Gry kolorowe opisują wybrany kolor i cztery walety, Grand wskazuje same walety, a Null brak atutu.
- Ramsz suwany wyświetla czytelnie `każdy na siebie` zamiast wskazywać solistę.
- Na telefonie pasek pozostaje przyklejony u góry przewijanego stołu.

## 0.11.2

- Obrońcy Szkata współpracują przeciw soliście: smarują punkty partnerowi, nie przebijają go bez potrzeby i oszczędzają wartościowe karty w przegranym sztychu.
- Bot przebija solistę najtańszą wystarczającą kartą i zapamiętuje publicznie ujawnione braki kolorów oraz atutów.
- W Nullu obrońcy wspólnie próbują pozostawić sztych soliście; ramsz nadal pozostaje grą każdego przeciw każdemu.
- Każda wartość rajcowania pokazuje odpowiadające jej gry, np. `23 · Null`, `36 · Karo ×4 · Trefl ×3` i `48 · Grand ×2`.
- Przycisk `TAK` opisuje utrzymywaną wartość oraz możliwe źródła jej wyliczenia.

## 0.11.1

- Mobilny Szkat używa jednej kolumny na pełną szerokość zamiast dziedziczyć dwukolumnową siatkę meldów.
- Nauczyciel nie wychodzi poza ekran i pokazuje jedną najważniejszą propozycję gry.
- Podczas rajcowania wyświetla bezpośrednią rekomendację `TAK`, konkretnej wartości albo `PAS` wraz z uzasadnieniem.
- Dłuższe etapy Szkata przewijają się wewnątrz stołu bez zasłaniania ręki.

## 0.11.0

- Siódma pełnoprawna gra: trzyosobowy **Szkat śląski** z osobnym `skat-engine.js`.
- Pełne rajcowanie, tajlong, gry kolorowe, Grand, Null, Hand, Schneider, Schwarz i Ouvert.
- Nauczyciel ocenia rękę, objaśnia wartość gry i podpowiada legalne zagrania bez podglądania kart przeciwników.
- Śląskie odzywki `Kontra → Ryj → Zup` zwiększają zapis kolejno do ×2, ×4 i ×8.
- Wygrany Grand z czterema waletami uruchamia trzy rozdania ramsza suwanego; waletów nie wolno przesuwać.
- Końcowy tajlong ramsza trafia do zwycięzcy ostatniego sztychu, a punktacja domyka się do 120 oczek.
- Boty obsługują wszystkie fazy, w tym gry Hand i mocniejsze zapowiedzi.
- Dodano testy jednostkowe oraz przeprowadzono 2000 pełnych symulacji rozdań bez zakleszczeń.

## 0.10.4

- Lista wszystkich wartości kontraktu została zastąpiona kompaktowym wybierakiem `−10 / wartość / +10`.
- Panel kontraktu zachowuje stałą wysokość również przy ofertach powyżej 190.
- Mobilny panel Tysiąca mieści się w szerokości ekranu i używa ciaśniejszych odstępów.

## 0.10.3

- Przed licytacją rozdanie jest automatycznie powtarzane, jeśli gracz bez meldunku ma mniej niż 18 punktów na ręce albo wszystkie cztery dziewiątki.
- Meldunek blokuje ponowne rozdanie słabej ręki.
- Ponowne rozdanie zachowuje rozdającego i numer rundy oraz pokazuje gracza i powód.

## 0.10.2

- Stały znacznik pokazuje aktywny meldunek Tysiąca wraz z wartością, symbolem i nazwą koloru; przed meldunkiem pokazuje brak atu.
- Boty ostrożniej licytują na podstawie Asów, chronionych dziesiątek, meldunków i przewidywanej wartości musika.
- Przy rozdzielaniu musika chronią meldunki i karty biorące oraz próbują wyczyścić słaby kolor.
- Podczas lew realizują meldunki, wychodzą pewnymi Asami i wykorzystują dziesiątki po zejściu Asa.
- Bot rzuca bombę, gdy ręka po musiku nie uzasadnia wylicytowanego kontraktu.
- W identycznej próbie 2000 rozdań skuteczność realizacji kontraktów wzrosła z 46,0% do 58,9%.

## 0.10.1 — mobile menu and trick reveal

- Mobilne menu wyboru gry wykorzystuje dostępną wysokość ekranu i przewija listę bez ucinania dolnych pozycji.
- Po zagraniu trzeciej karty kompletna lewa pozostaje widoczna przez 1,5 sekundy przed rozpoczęciem następnej.
- Zwycięska karta lewy otrzymuje złote oznaczenie; podczas podglądu wejście gracza i botów jest zablokowane.
- AUTO PLAY używa krótszego podglądu 0,55 sekundy.

## 0.10.0 — Tysiąc

- Szósta pełnoprawna gra: klasyczny trzyosobowy **Tysiąc**.
- Nowy ogólny `trick-engine.js`: licytacja, kontrakt, musik, lewy, obowiązek koloru i przebijania oraz dynamiczne atu.
- Talia 24 kart, rozdanie po 7, trzykartowy musik i przekazanie rywalom po jednej karcie.
- Meldunki 40/60/80/100 można zgłaszać również w pierwszej lewie; ostatni meldunek zmienia atu.
- Punktacja kontraktu, kart i meldunków, zaokrąglanie obrońców oraz zwycięstwo po osiągnięciu 1000 punktów.
- Beczka od 800: obrońca nie dopisuje punktów i musi wygrać licytację oraz zrealizować kontrakt.
- Pierwsza bomba gracza jest bezpłatna, a kolejne dają przeciwnikom po 60 punktów, jeśli nie są na beczce.
- Boty obsługują wszystkie fazy i potrafią licytować, rozdzielać musik, meldować, rozgrywać lewy oraz rzucać bombę.
- Dodano testy reguł i przeprowadzono 100 pełnych symulacji meczów do 1000 punktów bez zakleszczeń.

## 0.9.1 — visible Makao demands

- Żądanie bota po walecie lub asie jest wyświetlane jako duży, trwały komunikat nad stosem Makao.
- Walet pokazuje żądaną wartość, a As symbol i nazwę żądanego koloru.
- Komunikat pozostaje widoczny do odpowiedzi na żądanie albo dobrania karty.

## 0.9.0 — Makao

- Piąta pełnoprawna gra: **Makao**, obsługująca od 2 do 6 graczy i rozdanie po 5 kart.
- Nowy `macao-engine.js`: stos dobierania i odrzuconych, recykling talii, żądania, postoje, kary oraz boty korzystające z tego samego walidatora co gracz.
- Legalne zestawy mają dokładnie 1, 3 albo 4 karty tej samej wartości; par nie wolno wykładać.
- Kary 2, 3, K♥ i K♠ sumują się i można je łączyć tą samą wartością lub kolorem.
- K♦ i K♣ anulują karę, a dama w kolorze wierzchniej karty karnej przekazuje ją dalej.
- Czwórki sumują postoje, walet żąda wartości 5–10, a As żąda koloru.
- Po zejściu do jednej karty gracz ma 5 sekund na kliknięcie **MAKAO**; spóźnienie oznacza dobranie 5 kart.
- Dodano testy jednostkowe mechanik oraz symulacje pełnych rozgrywek bez zakleszczeń.

## 0.8.8 — optional help mode

## 0.8.8

- Dolne, odwrócone oznaczenia kart w ręce zostały ukryte, aby nie wystawały poza kartę.
- Dodano globalną żarówkę włączającą teksty instruktażowe i dymki pomocy.
- Pomoc jest domyślnie wyłączona, a wybór zostaje zapamiętany w przeglądarce.

## 0.8.7

- Podświetlenie nowych meldów dotyczy wyłącznie ruchów botów.
- Usunięto obcinaną etykietę `NOWY`; pozostała dyskretna błękitna poświata.

## 0.8.6

- Remik i Siódemki oznaczają nowe meldy oraz sekwensy błękitną poświatą i etykietą `NOWY`.
- Oznaczenie obejmuje ruch człowieka i botów oraz pozostaje widoczne podczas następnej tury człowieka.
- Mechanika jest ogólną, konfigurowalną możliwością silnika meldowego.

## 0.8.5

- Joker może rozpoczynać nowy układ roboczy i być jego drugą kartą.
- Kliknięcie karty w nieukończonym meldunku dokłada zaznaczoną kartę zamiast uruchamiać wymianę Jokera.
- Wymiana Jokera naturalną kartą działa wyłącznie w ukończonym, legalnym meldunku.

## 0.8.4

- Osiągnięte wejście meldowe zostaje zapamiętane podczas dalszej legalnej przebudowy stołu.
- Karty stanowiące dowód wejścia mogą zmienić układy, ale muszą pozostać na legalnym stole do końca tury.
- Test regresyjny obejmuje wejście `3×2 + 3×8 = 30` i późniejszą przebudowę z Jokerem.

## 0.8.3 — Pan central pile and heart-backed triples

## 0.8.3

- Dobieranie w Panie odbywa się po kliknięciu odkrytej kupki w centrum stołu, nie bocznej talii.
- Trzy jednakowe karty bez kiera są legalne, jeśli kier tej samej rangi znajduje się już na stosie.
- Reguła kiera na stosie działa również w drabinkach, generatorze ruchów AI i sprawdzaniu końcowego wyjścia.

## 0.8.2 — Pan selection glow fix

## 0.8.2

- Zaznaczenie karty w Panie jest wyłącznie nieruchomym złotym podświetleniem.
- Specyficzny styl Pana nadpisuje globalne wysunięcie i `z-index`, więc zaznaczone karty nie zasłaniają sąsiednich.

## 0.8.1 — Pan UI fixes

## 0.8.1

- Dobieranie w Panie odbywa się bezpośrednio przez kliknięcie talii; usunięto narożną „3” i dodatkowy przycisk.
- Zaznaczone karty nie zasłaniają kolejnych kart ręki podczas układania drabinki.
- Ręka Pana jest automatycznie sortowana rosnąco według wartości, także po dobraniu kart.

## 0.8.0 — Pan / Historyczny Upadek Japonii

## 0.8.0 — trzeci typ silnika: shedding

- Czwarta gra: **Pan**, znany też jako **Historyczny Upadek Japonii**.
- Nowy ogólny `shedding-engine.js`: rozdanie całej wybranej talii, stos o rosnącej randze, wielokartowe pakiety i drabinki, branie kart ze stosu, wychodzenie graczy oraz porażka zapisywana słowem.
- Preset Pana używa 24 kart od 9 do Asa; posiadacz 9♥ zaczyna, a karta ta jest chronioną podstawą stosu.
- Legalne zagrania: pojedyncza karta, trójka zawierająca kiera lub komplet czterech. Par nie wolno zagrywać.
- Drabinka składa się wyłącznie z rosnących trójek i czwórek; oba rozmiary można mieszać.
- Gracz może dobrowolnie zabrać do 3 kart ze stosu nawet wtedy, gdy ma legalny ruch.
- Ostatni gracz może uniknąć litery, jeśli zejdzie ze wszystkich kart jednym legalnym ruchem.
- Bot i globalny **AUTO PLAY** korzystają z tego samego generatora legalnych zagrań co walidacja ruchu człowieka.


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

## 0.7.3 — Remik: Joker w dokładaniu + wspólny solver

- Bot nie rezerwuje już automatycznie Jokera jako końcowego zrzutu tylko dlatego, że Joker ma 30 pkt; jeśli solver widzi dla niego legalne użycie, preferuje zrzut karty niewykorzystywanej przez plan.
- Nowy `findBestTableExtension()` obsługuje klasyczne dokładanie do nieruszalnych meldów oraz równoległe tworzenie nowych meldów z ręki.
- Ten sam planner zasila bota i licznik `↘ X`, więc tooltip widzi również karty (w tym Jokery) możliwe do dołożenia do już istniejących układów przy `allowRearrange=false`.
- Dodano regresje dla Jokera dopinanego do `J-Q-K` oraz dla jednoczesnego dokładania Jokera i tworzenia osobnego meldunku.

## 0.7.3 — Remik: kara za brak wyłożenia

- W punktacji `hand-penalty` można ustawić `game.unenteredPenaltyBase`.
- Remik 51 ustawia `unenteredPenaltyBase: 100`.
- Gracz, który do końca rundy nie zaliczył pierwszego wyłożenia, dostaje 100 pkt karnych + 30 pkt za każdego jokera pozostałego w ręce.
- W takim przypadku wartości pozostałych zwykłych kart nie są dodatkowo sumowane.
- Gracz, który wcześniej się wyłożył, nadal dostaje zwykłą sumę kart pozostałych w ręce (joker = 30).


### 0.7.3 — Clockwise starter
- Gry rundowe mogą określać `game.roundStarterMode`: `winner`, `clockwise` lub `fixed`.
- Remik 51 używa `clockwise`, więc starter przechodzi co rundę na kolejne miejsce niezależnie od zwycięzcy.


## 0.7.4 — pusty stos odrzuconych na początku rundy
- Dodano ogólną regułę `discard.seedAtRoundStart`.
- Remik 51 ustawia ją na `false`: po rozdaniu stos odkryty jest pusty.
- Pierwsza karta trafia na stos odrzuconych dopiero po faktycznym zrzucie gracza.
