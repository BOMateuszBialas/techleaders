# Referencje: CommerceOS

- Data: 2026-10-23. Referencje wybrał właściciel produktu, Mateusz Białas (linki). Karty, zrzuty i pomiary przygotował agent (agent-browser, `getComputedStyle`). Decyzje podjął właściciel w trzech rundach pytań (ćwiczenie 2 lekcji 06).
- **Słowa charakteru (potwierdzone):** wyrazisty, konkretny.
- **Antycharakter (potwierdzony):** nieczytelny, przeładowany.
- Wejście: audyt `audyt.md` (ten folder), brief `.ai/specs/product-brief.md`, decyzja D10 (sklep z akcesoriami gamingowymi).
- Pełne karty z pomiarami i 59 zrzutów leżą poza repozytorium, bo to obrazy firm trzecich: `KURS TECHLEADERS/materialy/referencje/karty-referencji.md`.

## Referencje

| # | Referencja | Źródło | Kto wybrał | Obserwacja | Bierzemy | Nie bierzemy | Robimy zamiast tego | Dlaczego pasuje do produktu | Rodzina | Waga | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R01.2 | Endorfy | https://endorfy.com/en | właściciel | Nagłówki grotesk display 48–72 px, waga 600, ciasny odstęp liter. Treść tym samym krojem w wersji text, 14–16 px. Skala 72/64/48/32/24/18/16/14/12 | Mocna hierarchia: duży, ciasno złożony grotesk w nagłówkach i spokojna treść, bez dekoracji | Komercyjny krój neue-haas-grotesk; skala z 9 stopniami | Darmowy grotesk display dołączony do projektu (wybór kroju to luka, niżej), 5–6 nazwanych stylów | Wyrazistość bez ozdobników. Sklep dla graczy ma charakter, a dane (ceny, stany) zostają czytelne | typografia | musi być | przyjęte |
| R01.3 | Endorfy | https://endorfy.com/en | właściciel | Zdjęcie produktu na jasnoszarej karcie `#f1f1f6`, bez cieni, mało tekstu na karcie | Produkt na jasnej karcie powierzchni, bez cienia | Promień 16 px (właściciel wybrał umiarkowane promienie) | Karta z promieniem 12 px, oddzielona tłem, nie cieniem | Katalog P0 to główna droga do koszyka. Produkt i cena są bohaterem | kompozycja i gęstość | warto | przyjęte |
| R01.1 | Endorfy | https://endorfy.com/en | właściciel | Żółty CTA `#ffba00` z ciemnym tekstem (10,17 : 1), drugi akcent to niebieski `#1d03cc` | – | Żółty kolor akcji i drugi niebieski akcent | Jeden kolor akcji: czerwień (R03.1) | – | kolor | – | odrzucone (konflikt K1) |
| R02.1 | Diablo Chairs | https://diablochairs.com/promocje | właściciel | Czarny nagłówek `#0a0a0a` jako rama marki, pod nim jasne body `#eeeef1` i białe karty. Listing, produkt i koszyk są jasne | Ciemna rama marki (nagłówek i stopka) i jasne powierzchnie handlowe (listing, produkt, koszyk, checkout) | Ciemna, promocyjna strona główna, czerwony pasek promocji nad nagłówkiem | Strona główna jasna, szybko do katalogu (K6) | Klimat gamingowy bez zaciemniania danych transakcyjnych (cena, stan, podsumowanie) | kompozycja i gęstość | musi być | przyjęte |
| R02.2 | Diablo Chairs | https://diablochairs.com/promocje | właściciel | Koszyk w 2 kolumnach: pozycje plus „Podsumowanie zamówienia” w białej karcie, jeden CTA 56 px „Przejdź do kasy”, 3-krokowy pasek kasy | Układ koszyka w 2 kolumnach z podsumowaniem w karcie i jednym głównym CTA, pasek kroków kasy | Informacje o rabatach i kodach (poza zakresem) | – | Przepływ P0 koszyk → checkout demo jest kluczowy dla demo end-to-end | komponenty | warto | przyjęte |
| R02.3 | Diablo Chairs | https://diablochairs.com/promocje | właściciel | Nagłówki krojem monospace (SpaceMono 400) | – | Monospace w nagłówkach | Grotesk display (R01.2) | – | typografia | – | odrzucone (konflikt K2) |
| R02.x | Diablo Chairs | https://diablochairs.com/promocje | właściciel | Trzy kolory akcji (limonka `#d6ff3a`, czerwień `#dd0e0e`, grafit). Limonka na jasnym tle ma kontrast elementu 1,00 : 1 | – | Trzy kolory dla podobnych akcji; limonka | Jeden kolor akcji (R03.1) | – | kolor | – | odrzucone |
| R03.1 | Hell's | https://hells.pl/ | właściciel | Jeden kolor akcji: czerwień `#b71f24` z tekstem `#fbfbfb` (6,27 : 1), konsekwentnie od strony głównej po „Zamawiam”. Ten sam kolor w cenach | Jeden czerwony kolor akcji zakupowej we wszystkich krokach | Czerwień jako kolor tekstu cen (jeden kolor w wielu rolach, por. A01) | Cena ciemnym tekstem, czerwień tylko na akcji (dokładny odcień i kontrast w kroku tokenów) | Jedna, jednoznaczna akcja na ekran. Czerwień występuje w 2 z 3 referencji sklepu | kolor | musi być | przyjęte |
| R03.2 | Hell's | https://hells.pl/ | właściciel | Listing 5 kolumn na 1440 px, 8 filtrów nad siatką | – | 5 kolumn | 3–4 kolumny, przestronniej (do ustalenia przy realnym rozmiarze katalogu seed) | – | kompozycja i gęstość | – | odrzucone |
| R03.3 | Hell's | https://hells.pl/ | właściciel | Krótkie komunikaty operacyjne: „Zamów do 17:00, wyślemy dziś”, „Wysyłka 24h” | Rzeczowe komunikaty o faktach (stan magazynu, dostępność, oznaczenie demo) zamiast haseł marketingowych | Komunikaty o realnej wysyłce (CommerceOS nie ma prawdziwej wysyłki, zasada 6 AGENTS.md) | Fakty, które produkt naprawdę ma: stan, cena, status zamówienia, etykieta demo | „Real, traceable data beats unsupported AI claims”, konkretny charakter | ton wypowiedzi | warto | przyjęte |
| R03.4 | Hell's (propozycja agenta z A01 i R03) | https://hells.pl/ | właściciel (przyjął propozycję) | 3–4 kolorowe etykiety na zdjęciu produktu, część poniżej AA (4,14 : 1) | Najwyżej 1–2 etykiety na zdjęciu, w jednym neutralnym stylu, status zawsze tekstem | Stos kolorowych naklejek | – | Antycharakter „przeładowany” i „nieczytelny” | komponenty | warto | przyjęte |
| R04.1 | Shopify admin (Polaris) | https://shopify.dev/docs/api/polaris, szablony app-home, wytyczne layout | właściciel | Ciemne boczne menu `#1b1b1b`, biała treść, gęste tabele zasobów (wiersz ok. 53 px), akcje strony w prawym górnym rogu (1 główna i 2 drugorzędne) | Rama admina: ciemne boczne menu, biała treść, gęste tabele, akcje strony w nagłówku | – | – | Admin P0 (produkty, kategorie, zamówienia, stany, dashboard) to wprost szablony index/details. Kupiec szybko skanuje dane | kompozycja i gęstość | musi być | przyjęte |
| R04.2 | Shopify admin (Polaris) | jw. | właściciel | Kolor tylko dla znaczenia: badge statusów (Active `#214b03` na `#b3f782`, 7,98 : 1), link, błąd. Główna akcja neutralnie czarna `#101010` | W adminie kolor wyłącznie w statusach, linkach i błędach. Główny przycisk neutralny (czarny lub grafit) | Czerwień marki jako tło głównego przycisku w adminie (właściciel nie przyjął) | Czerwień marki w adminie tylko jako akcent (np. logo, aktywna pozycja menu). Do potwierdzenia w kroku tokenów | Statusy zamówień i rekomendacji Copilota muszą być czytelne. „AI advises; the merchant decides”: jawna, neutralna akcja | kolor | musi być | przyjęte |
| R04.3 | Shopify admin (Polaris) | jw. | właściciel | Tekst UI 13/20 px, przyciski 28 px, karty r=12 px z cieniem-obrysem, siatka 4 px | Mała skala w adminie: tekst 13–14 px, kontrolki ok. 32 px na desktopie, karty 12 px, siatka 4 px | Przyciski 28 px na telefonie | Większe cele dotyku na telefonie (min. 44 px) | Gęstość pasuje do pracy na danych. Cele dotyku są wymagane przez WCAG 2.2 | komponenty | warto | przyjęte |

**Decyzje przekrojowe bez jednej referencji:**
- **Kształt:** przyciski i pola 8 px, karty 12 px, we wszystkich częściach (konflikt K4). Rodzina: komponenty. Waga: musi być. Przyjęte.
- **Sklep i admin:** wspólne tokeny (kolory, fonty, statusy), różny charakter. Sklep jest przestronny z czerwonym CTA, admin gęsty i neutralny jak Shopify (K7). Rodzina: kompozycja i gęstość. Waga: musi być. Przyjęte.
- **Motyw:** domyślnie jasny, jak wszystkie referencje. Ciemny jest opcjonalny, z przełącznikiem i ustawieniem systemowym. Kontrast liczymy w obu motywach. Rodzina: kolor. Waga: warto. Przyjęte.
- **Strona główna:** krótki hero, a pod nim od razu kategorie i polecane produkty (K6). Rodzina: kompozycja. Waga: warto. Przyjęte.

## Antyreferencje

| # | Wygląd | Dlaczego nie | Podpis do uniknięcia | Źródło |
|---|---|---|---|---|
| A01 | AceGear (https://acegear.pl/) | „Ściana promocji”: kolor akcji jest też kolorem cen, rabatów, teł i banerów, więc nic się nie wyróżnia. Cena ma 1,92 : 1, kolaż banerów w obcych paletach. To wprost antycharakter: przeładowany, nieczytelny | 1) kolor akcji użyty jako tekst (cena, procent) z kontrastem < 4,5 : 1; 2) jeden kolor w ponad 3 rolach naraz (CTA, cena, tło sekcji, gradient); 3) gradienty w banerach i tłach; 4) cień na każdej karcie (100+ cieni na stronie); 5) dwie rodziny sans w UI i tekst < 11 px; 6) stos 2+ etykiet marketingowych na zdjęciu; 7) hero z wielu banerów w różnych paletach | gust (właściciel), podpis: propozycja agenta, przyjęta |

**Nie zapisane z wyboru właściciela:**
- **A02, „generyczny wygląd AI”.** Kurs domyślnie każe ją zawsze dodać. Audyt wykazał jej znaki w aplikacji: fiolet i indygo w ilustracjach SVG produktów, nietknięty domyślny shadcn. Usuwa je decyzja R03.1 (jeden czerwony kolor akcji) i decyzje 1–2 z audytu.
- **A03, „Copilot bez magii AI”.** Iskierki, fioletowe gradienty, tokeny „AI” Polaris.

## Konflikty i rozstrzygnięcia

| Konflikt | Referencje | Rozstrzygnięcie | Kto zdecydował |
|---|---|---|---|
| K1 kolor akcji: żółty / limonka + czerwień + grafit / czerwień | R01, R02, R03 | Czerwień, jeden kolor dla wszystkich akcji zakupu (R03.1) | właściciel |
| K2 nagłówki: grotesk display / monospace / Barlow 700 wersaliki | R01, R02, R03 | Grotesk display (R01.2) | właściciel |
| K3 gęstość listingu: 4 / 3 + filtry z boku / 5 kolumn | R01, R02, R03 | Nie 5 kolumn (R03.2 odrzucone). Konkretna liczba kolumn przy realnym katalogu seed | właściciel, liczba otwarta |
| K4 kształt: pigułki + 16 px / 999 i 32 px / 0 | R01, R02, R03, R04 | Umiarkowany: przyciski i pola 8 px, karty 12 px | właściciel |
| K5 ton: angielski aspiracyjny / polski zaczepny z presją / polski rzeczowy | R01, R02, R03 | Rzeczowy i konkretny (R03.3), w języku interfejsu, czyli po angielsku jak cała aplikacja | właściciel (ton); język wynika z obecnego UI |
| K6 strona główna: wizerunek / promocje / szybko do kategorii | R01, R02, R03 | Szybko do katalogu | właściciel |
| K7 sklep (kolorowy CTA 40–56 px) kontra admin (czarny CTA 28 px, 13 px) | R01–R03 vs R04 | Wspólne tokeny, różny charakter. Admin: neutralny główny przycisk, czerwień tylko jako akcent | właściciel |

## Luki

- **Krój pisma:** wybrany kierunek to grotesk display, ale nie wybrano konkretnego darmowego kroju. Krok tokenów zaproponuje 2–3 kandydatów (lekcja: unikać nadużywanych Inter i Roboto, font dołączony do projektu, nie z CDN).
- **Odcień czerwieni i kontrast:** dokładne wartości (jasny i ciemny motyw, hover, fokus) ustala krok tokenów.
- **Ruch i reakcja:** żadna referencja nie była mierzona pod kątem animacji, hover i focus. Propozycja w kroku tokenów, z obsługą `prefers-reduced-motion`.
- **Ciemny motyw:** brak referencji. Wartości wyprowadzimy z jasnego, zachowując znaczenia.
- **Copilot:** brak referencji wizualnej dla UI rekomendacji AI. A03 nie została przyjęta, więc wygląd Copilota wynika z reguł admina (R04.2).
- **Ikony:** referencje używają różnych zestawów (własne SVG, Heroicons, Polaris Icons). Zostajemy przy lucide czy zmieniamy? Do decyzji w kroku tokenów.
- **Propozycje nieprzyjęte:** „bez komunikatów presji i pilności” i „wersaliki tylko w etykietach, tekst ≥ 14 px na telefonie”. Właściciel ich nie wybrał. Brak rabatów wynika z zakresu MVP, a minimalny rozmiar tekstu wynika z zasad dostępności lekcji.

## Obrazy

Zrzuty nie są w repozytorium, bo to obrazy firm trzecich. Leżą w `KURS TECHLEADERS/materialy/referencje/` jako `R01-endorfy-*`, `R02-diablo-*`, `R03-hells-*`, `R04-polaris-*`, `R04-shopify-admin-*` i `A01-acegear-*` w szerokościach 1440 i 390 px.

Nic w tym pliku nie jest jeszcze regułą. Zasady i tokeny powstają w następnym kroku, z tego pliku, i każdą z nich właściciel zatwierdza osobno.
