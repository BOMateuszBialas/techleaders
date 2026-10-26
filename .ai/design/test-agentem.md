# Test agentem: strona potwierdzenia zamówienia (etap 5, wykonany na dokumentacji)

- Status: **wykonany, tylko dokumenty.** Agent zbudował ekran wyłącznie z dokumentacji: strony Storybooka „Start here”, „Components”, „How to choose”, „Usage and accessibility”, „Content”, „What to avoid”, „What is missing”, `docs/design-system.md` i `.ai/design/tokeny.md`. Nie otwierał kodu ekranu ani źródeł komponentów, nie czytał props, stron epickich, Foundations ani Primitives. Ekran nie został wpisany do aplikacji; wynik to lista decyzji.
- Ekran: „Order confirmation with a payment-pending note and a reorder action”. Składa się z: nagłówka (h1), jednego wiersza statusu (Badge „Pending payment”), podsumowania zamówienia (karta z listą pozycji), Alertu z notką płatności demo oraz dwóch przycisków: „View my orders” jako link i „Continue shopping” jako przycisk drugorzędny.
- Uwaga do tytułu: tytuł testu mówi o „reorder action”, ale wymienione dwa przyciski nie są ponownym zamówieniem. Zbudowano wymienione dwa. Brak akcji „zamów ponownie” w dokumentacji zapisano jako lukę L15.
- Zasady: każda decyzja ma jeden typ. **REGUŁA**: reguła w dokumentacji (podana strona i identyfikator). **PRZYKŁAD**: przykład z dokumentacji, użyty dosłownie lub z niewielką adaptacją. **ZGADUJĘ**: dokumentacja nie rozstrzyga, uzasadnienie podane w wierszu. Reguły oznaczone w dokumentacji jako **P** (bez źródła) liczone są jako REGUŁA, a w wierszu jest adnotacja „P”.

## Przygotowanie

1. Kroki szablonu 1–3 (`build-storybook`, serwer statyczny, motywy i gęstości, seed) **nie wykonano**. Test nie buduje ekranu w aplikacji i nie uruchamia Storybooka, więc nie ma zrzutów w obu motywach ani przy 320, 768 i 1440 px. Wizualne sprawdzenie to osobny krok po wdrożeniu.
2. Poza dokumentacją agent zajrzał tylko do: `.ai/lessons.md` (wymóg CLAUDE.md, nie wejście do ekranu) i do tego szablonu.

## Scenariusz

| Krok | Działanie (decyzja) | Oczekiwany wynik | Źródło reguły (typ) |
| --- | --- | --- | --- |
| 1 | Powierzchnia strony: jasne body w ramie sklepu | jasne tło, ciemny nagłówek i stopka | **ZGADUJĘ**: tokeny §7 rule 18 wymienia listing, produkt, koszyk i checkout, potwierdzenia nie ma (L4) |
| 2 | Odstęp boczny (gutter) 16 / 24 / 32 px, bez przewijania w bok przy 320 px | `px-gutter` | **REGUŁA**: Usage and accessibility, Layout at 320, 768 and 1440 px, wiersz 1 |
| 3 | Tytuł strony jako h1, styl store 28/32 → 40/44 | nagłówek `h1` | **REGUŁA**: tokeny §4, styl `h1` („tytuł strony”) |
| 4 | Tekst tytułu „Order placed” | jedno zdanie, rzeczowe | **ZGADUJĘ**: Content nie ma przykładu potwierdzenia; P13 (sentence case) nieprzyjęte (L11) |
| 5 | Status „Pending payment” jako Badge | Badge z tekstem | **PRZYKŁAD**: tokeny §1b, wiersz `--warning`: „badge ‚Pending payment’” |
| 6 | Wariant Badge `warning` dla oczekującej płatności | tło `--warning-surface`, tekst `--warning` | **REGUŁA**: tokeny §7 rule 10 (mapa statusów, P2 przyjęte) |
| 7 | Status to słowo, nie sam kolor | Badge ma tekst, nie tylko kolor | **REGUŁA**: Usage and accessibility, Color, wiersz 2 (WCAG 1.4.1) |
| 8 | Zdanie obok statusu, które mówi, co się dzieje | jedno zdanie pod tytułem lub przy Badge | **ZGADUJĘ**: nie ma reguły o zdaniu statusu; „What is missing” nie ma wzorca (L1) |
| 9 | Numer zamówienia w kroju mono | `font-mono` | **REGUŁA**: tokeny §1c, `--font-mono` („numer zamówienia, SKU”) |
| 10 | Czy numer zamówienia ma prefiks `DEMO-` | prefiks zależny od trybu płatności | **ZGADUJĘ**: Content (Demo data) mówi o danych seedowanych; zamówienia kupującego nie są opisane (L5) |
| 11 | Podsumowanie jako karta z nagłówkiem h2 „Order summary” | biała karta `--card`, bez cienia | **PRZYKŁAD**: tokeny §1b (`--card`, „R02.2 podsumowanie w białej karcie”); §4 h2 („Order summary”); How to choose, Card |
| 12 | Pozycje zamówienia jako `<ul>` | lista bez tabeli | **PRZYKŁAD**: How to choose, Table/list, wiersz „order lines in the confirmation”. Konflikt z wierszem Table „records to scan and compare” (L8) |
| 13 | Odstępy w karcie: panel 24 / 16 px, między pozycjami 16 / 12 px | `--space-panel`, `--space-group-item` | **REGUŁA**: tokeny §3, tabela relacji |
| 14 | Cena w `--foreground`, `tabular-nums`, nigdy czerwona | ceny czarne, cyfry wyrównane | **REGUŁA**: Usage and accessibility, Color, wiersz 4 (R03.1); tokeny §7 rule 1 |
| 15 | Kwota przez `formatMoney` | format waluty ze sklepu | **REGUŁA**: Content, Numbers, money; uwaga P12 (locale pl-PL przy angielskim UI, nieprzyjęte) |
| 16 | Nazwa produktu z `[DEMO]` w demo sklepie | tekst `[DEMO]` przy nazwie | **REGUŁA**: Content, Demo data (AGENTS zasada 6, tokeny rule 11) |
| 17 | Wiersz sumy: styl h3 600, `tabular-nums` | suma pogrubiona, bez czerwieni | **ZGADUJĘ**: tokeny §4 h3 opisuje cenę w karcie produktu, nie sumę zamówienia (L13) |
| 18 | Ceny i sumy z serwera, bez przeliczania w przeglądarce | wartości z zamówienia | **REGUŁA**: Usage and accessibility, Product rules, wiersz 6 (AGENTS, Security) |
| 19 | Format ilości („× 2” czy „Qty 2”) | jeden zapis w liście | **ZGADUJĘ**: dokumentacja nie ma przykładu ilości |
| 20 | Notka płatności demo jako Alert wariantu `demo` | Alert w `--demo-surface`, obrys `--demo` | **REGUŁA**: tokeny rule 11 i §1d, wiersz 9 („notka płatności demo”); How to choose, Field error/alert, wiersz 3 |
| 21 | Treść Alertu: „Demo store — this is a demo payment. No real money is charged and no card details are collected.” | zdanie bez zmian | **PRZYKŁAD**: Content, Tone, zdanie 1 (dokładnie to zdanie ma notka płatności demo) |
| 22 | Alert bez `role` (notka stała na stronie) | brak `role="alert"` i `role="status"` | **REGUŁA**: Usage and accessibility, Forms and messages, wiersz 3 (B1.23, B2.18); How to choose, wiersz 3 |
| 23 | Słowo „demo”, nie „test” (tytuł testu mówi „test-payment”) | „demo payment” we wszystkich tekstach | **REGUŁA**: Content, Tone, zdanie 3; What to avoid, Product rules („Confirm demo payment (no charge)”). Brief używa innego słowa, zapisano jako L12 |
| 24 | Czy Alert ma `AlertTitle` | sama `AlertDescription` | **ZGADUJĘ**: How to choose wymienia `AlertTitle`, ale nie mówi, kiedy go użyć (L14) |
| 25 | „View my orders” jako Text link standalone (nawigacja) | link w tekście, nie przycisk | **REGUŁA**: How to choose, Button, wiersz 1 (`TextLink`, „going to another page”); Components, „Do not use” dla Button |
| 26 | „Continue shopping” jako przycisk wyglądający jak przycisk (`buttonVariants` na linku) | link o wyglądzie przycisku | **PRZYKŁAD**: How to choose, Button, wiersz 21 („Checkout” jako link z `buttonVariants()`). Ale nawigacja to Text link (L2) |
| 27 | Wariant `secondary` dla „Continue shopping”, a nie `default` | szare tło `--secondary`, nie grafit | **ZGADUJĘ**: wiersz 17 mówi „wsparcie obok głównej akcji”, ale nie mówi, która z dwóch nawigacji jest główna (L2) |
| 28 | Etykieta „View my orders” | czasownik i obiekt | **REGUŁA**: Content, Buttons (B4.14) |
| 29 | Etykieta „Continue shopping” | jak w brief | **ZGADUJĘ**: zasada „czasownik i obiekt” nie obejmuje tej frazy; Content podaje „Browse the catalog” jako następny krok (L11) |
| 30 | Brak czerwonego przycisku na stronie po zakupie | żaden przycisk `action` | **REGUŁA**: How to choose, Button, wiersz 15 (`action` tylko dla kroku zakupu); tokeny §7 rule 2 |
| 31 | Rozmiar przycisków: `md` (domyślny), 44 px w sklepie i na telefonie | wysokość 44 px | **REGUŁA**: tokeny §3, kontrolka `md` 44 px w sklepie; tokeny rule 16 (44 px na telefonie) |
| 32 | Układ dwóch akcji: obok siebie na desktopie, pod sobą na telefonie | dwa przyciski w jednym rzędzie lub w stosie | **ZGADUJĘ**: nie ma wzorca „rząd akcji”; „Patterns” są oznaczone jako „not yet” (L3) |
| 33 | Odstęp między tytułem a wierszem statusu | jeden odstęp | **ZGADUJĘ**: `related` (8 px) opisuje „cena–stan”, nie tytuł–status (L9) |
| 34 | Odstęp między blokami (status, Alert, karta, akcje): `group` czy `section` | `group` 24 px w sklepie | **ZGADUJĘ**: tokeny §3 podaje `group` „między grupami” i `section` „między sekcjami”, ale nie mówi, czym jest grupa na stronie (L9) |
| 35 | Zdanie statusu do 65 znaków | `max-width: 65ch` | **REGUŁA**: tokeny rule 15; Content, „Running text” (`--measure-prose`) |
| 36 | Stan ładowania: `SkeletonGroup` z etykietą | szkielet w jednej grupie | **REGUŁA**: How to choose, Skeleton, wiersz 1 („every `<Suspense>` fallback inside one `SkeletonGroup` with a label”) |
| 37 | Tekst etykiety ładowania „Loading …” | etykieta w grupie | **PRZYKŁAD**: How to choose, Skeleton, wiersz 1 (`SkeletonGroup label="Loading …"`) |
| 38 | Kształt szkieletu dla tej strony (karta, pozycje, badge) | ile i jakie bloki | **ZGADUJĘ**: dokumentacja nie opisuje szkieletu dla strony potwierdzenia (L15) |
| 39 | Nie można wczytać zamówienia: `ErrorState` | tytuł i opis, bez czerwonego wypełnienia | **REGUŁA**: How to choose, Error state (strona lub sekcja nie wczytała się), wiersz 4 (B3.24) |
| 40 | Tekst błędu: „The order is temporarily unavailable. Please try again later.” | dwa zdania: co się stało i co zrobić | **PRZYKŁAD**: Content, Errors, poziom „page or section” („The catalog is temporarily unavailable…”), zaadaptowane do zamówienia |
| 41 | Akcja w `ErrorState`: „Try again” | przycisk pod opisem | **ZGADUJĘ**: Content i How to choose nie opisują akcji w `ErrorState` (L7) |
| 42 | Nie znaleziono zamówienia (także obce): `Empty`, ta sama strona | jeden wygląd dla „nieznane” i „cudze” | **REGUŁA**: How to choose, Empty state („not found” pages), wiersz 6; What to avoid, Product rules, wiersz 5 („not found”, nigdy „forbidden”) |
| 43 | Nagłówek pustego stanu „Order not found” | jedno zdanie | **ZGADUJĘ**: Content nie ma przykładu „nie znaleziono”; wzór „Your cart is empty.” to inna sytuacja (L11) |
| 44 | Następny krok w pustym stanie: „Browse the catalog” | link do katalogu | **PRZYKŁAD**: Content, Empty states („Browse the catalog”, B3.23) |
| 45 | Fokus widoczny: 2 px `--ring`, offset 2 px | obrys przy `:focus-visible` | **REGUŁA**: Usage and accessibility, Keyboard and focus, wiersz 2 (B1.4, tokeny §5) |
| 46 | Kolejność Tab zgodna z wizualną, bez `tabIndex` dodatniego | Tab: link, przycisk | **REGUŁA**: Usage and accessibility, Keyboard and focus, ostatni wiersz (WCAG 2.4.3) |
| 47 | Fokus po wejściu na stronę (na h1 czy nigdzie) | ustalony punkt startu | **ZGADUJĘ**: zasada fokusu dotyczy tylko błędów formularza (L6) |
| 48 | Czy wiersz statusu ma `role` przy renderowaniu strony | brak roli albo `role="status"` | **ZGADUJĘ**: `role="status"` dotyczy sukcesu po akcji; strona po przekierowaniu nie jest tym przypadkiem (L6) |
| 49 | Długi numer zamówienia przy 320 px | zawijanie, bez przewijania w bok | **ZGADUJĘ**: brak reguły zawijania długich identyfikatorów (L10). Sam brak przewijania: REGUŁA, Layout, wiersz 1 |
| 50 | Tylko tokeny, bez `dark:`, bez klas palety, bez cienia na karcie | `bg-card`, `text-foreground`, `shadow-none` | **REGUŁA**: `docs/design-system.md`, „Build a screen” krok 3; What to avoid, Implementation mistakes; tokeny rule 8 |

## Co zapisać po wykonaniu

### Liczby

- Decyzje razem: **50**.
  - REGUŁA: **24** (48%).
  - PRZYKŁAD: **8** (16%).
  - ZGADUJĘ: **18** (36%).
- Ile razy trzeba było zgadywać: **18** (36% decyzji).
- Ile razy trzeba było zajrzeć poza dokumentację: **0** do kodu ekranu, props, stron epickich, Foundations i Primitives (wszystkie poza zakresem testu). **1** odczyt `.ai/lessons.md` (wymóg CLAUDE.md, nie dokumentacja designu).
- Kroki szablonu 1–3 (Storybook, motywy, seed) nie wykonane; zrzuty brak.

### Luki (kandydaci na listę P albo poprawki dokumentacji)

Żadnej luki nie naprawiono w kodzie. Każda idzie na listę P w „What is missing” do decyzji właściciela, zgodnie z zasadą z szablonu.

| # | Czego brakuje | Strona, która powinna to mieć | Sugerowane zdanie |
| --- | --- | --- | --- |
| L1 | Wzorzec strony potwierdzenia po zakupie (tytuł, status, podsumowanie, notka, akcje). Start here, krok 1, odsyła do stron epickich, których ten test nie mógł użyć. „Patterns” jest oznaczone jako „not yet” | What is missing, wiersz E02-S03, i Start here, krok 1 | „Order confirmation: the h1 states the outcome, the status is one Badge with its word, the summary is one Card, one demo Alert without a role, and at most two actions below it.” |
| L2 | Konflikt: nawigacja to Text link (How to choose, wiersz 1), ale „Checkout” jako link z `buttonVariants()` jest przykładem (wiersz 21). Nie ma reguły, który wariant dla nawigacji będącej głównym krokiem | How to choose, Button, wiersze 1 i 21 | „A navigation that is the main next step is a link styled with buttonVariants (default); a supporting navigation is the same with secondary; a Text link is for navigation inside running text.” |
| L3 | Brak wzorca rzędu akcji: kolejność, układ obok siebie, stos na telefonie, odstęp | Usage and accessibility, Layout; Components, Button | „Two or more actions on one screen sit in one row with gap-related (8 px), the main action first; below 768 px they stack, full width, 44 px tall.” |
| L4 | Powierzchnia strony po zakupie nieopisana: tokeny rule 18 wymienia listing, produkt, koszyk i checkout | Usage and accessibility, Product rules (Storybook); tokeny §7 rule 18 | „Confirmation pages follow checkout: light body, dark frame header and footer.” |
| L5 | Oznaczenie demo zamówień składanych przez kupującego (Content mówi tylko o seedzie); to zgodność z zasadą 6 AGENTS | Content, Demo data | „Orders placed in demo payment mode carry the DEMO- reference and show the demo Alert on their confirmation and order pages.” (decyzja właściciela) |
| L6 | Fokus i rola przy wejściu na stronę. Zasady fokusu są tylko dla błędów formularza | Usage and accessibility, Keyboard and focus oraz Forms and messages | „A page reached by an action moves focus to its h1; a status line shown on page load has no role; a status that follows an action uses role=status once.” |
| L7 | `ErrorState`: czy ma akcję i jaką | How to choose, Error state; Content, Errors | „ErrorState has a title, a description and at most one action, written as a verb and an object (for example ‚Try again’).” |
| L8 | Konflikt Table vs lista dla pozycji zamówienia (Table: „records to scan and compare”; lista: „order lines in the confirmation”) | How to choose, Table, list, cards | „Order lines are a plain list up to three items; from four items they are a Table with right-aligned prices.” |
| L9 | Brak reguły odstępów między blokami strony (`group` vs `section`, tytuł–status) | tokeny §3; Usage and accessibility, Layout | „On a page with a heading, a status and a card, heading to status is related (8 px) and blocks are separated by group (24 px store, 16 px admin).” |
| L10 | Zawijanie długich identyfikatorów (numer zamówienia, SKU) przy 320 px | Usage and accessibility, Layout | „Order numbers and SKUs wrap at any character and never scroll sideways.” |
| L11 | Copy: brak przykładów potwierdzenia i „nie znaleziono”; „Continue shopping” nie jest czasownikiem z obiektem, a Content daje „Browse the catalog” | Content, Buttons i Empty states | „Navigation buttons name the destination: ‚View my orders’, ‚Browse the catalog’.” |
| L12 | Słownictwo: brief mówi „test payment”, dokumentacja „demo payment” | Content, Tone | „Payments are called demo payments; the word ‚test’ is not used for them.” |
| L13 | Wiersz sumy zamówienia nie ma stylu (tokeny §4 opisuje tylko cenę w karcie produktu) | tokeny §4; Content, Numbers | „A total is h3 weight 600 with tabular-nums and --foreground.” |
| L14 | Czy `AlertTitle` używać | How to choose, Alert | „An Alert has a title only when it carries two facts; a one-sentence note uses AlertDescription alone.” |
| L15 | Brak szkieletu dla strony potwierdzenia; brak wzorca „reorder” (tytuł testu mówi o akcji ponownego zamówienia, której w dokumentacji nie ma) | Usage and accessibility; What is missing | „A reorder action is a secondary link to the order’s items; it is listed in What is missing until the owner decides.” |
| L16 | Prop API i nazwy wariantów (np. `variant="secondary"` dla Button, wariant Badge `warning`) są tylko w Primitives, których nie wolno było czytać | Components, kolumna Import | „Each component row gives its variant prop and its values.” |

### Najważniejsze luki (top 5)

1. L1: brak wzorca strony potwierdzenia. Najbardziej blokuje: agent musiał złożyć układ z elementów, bez reguły kolejności.
2. L2: konflikt nawigacja jako link czy przycisk. Dwie reguły w dwóch wierszach dają różne wyniki.
3. L3: brak wzorca rzędu akcji (układ i zawijanie na telefonie).
4. L5: oznaczenie DEMO zamówień kupującego, zgodność z zasadą 6.
5. L4: powierzchnia strony po zakupie (ramka jasna czy ciemna), bo reguła 18 jej nie wymienia.

### Ocena

Dokumentacja wystarczyła, żeby **zbudować ekran w postaci opisanej przez decyzje**: każda część ma przynajmniej jedną regułę albo przykład dla 32 z 50 decyzji. Nie wystarczyła, żeby ekran był w pełni określony: 18 decyzji to zgadywanie, a cztery z nich dotyczą zasad, które właściciel musi zatwierdzić (L1, L2, L4, L5).
