# Test agentem: lista kategorii w adminie (etap 5, przygotowany, nie wykonany)

- Status: **przygotowany, nie wykonany.** Test uruchomi agent w osobnej sesji po merge partii PR; nie ma tu wyników.
- Ekran do testu (pytanie 5 z POSTEP §2, potwierdzone w etapie 4): lista kategorii w adminie z wyszukiwaniem i stanami: ładowanie, pusto, brak wyników, błąd. Dziś listy z wyszukiwaniem nie ma, więc test sprawdza wzorzec z dokumentacji (Empty, Skeleton, ErrorState), a nie istniejący ekran.
- Zasady: każda reguła z Storybooka („What to avoid”, „Usage and accessibility”, „Content”) ma źródło albo jest na liście P. Agent ocenia ekran tylko według tych stron.

## Przygotowanie

1. `npm run build-storybook` i serwer statyczny na `packages/app/storybook-static` (nie dodawać zależności).
2. Storybook w obu motywach (`globals=theme:light` i `theme:dark`) i obu gęstościach (`density:admin`).
3. Dane demo: sklep po `npm run db:seed`; kategorie z seeda.

## Scenariusz

| Krok | Działanie | Oczekiwany wynik | Źródło reguły |
| --- | --- | --- | --- |
| 1 | Otwórz listę kategorii przy 1440, 768 i 320 px, w obu motywach | brak przewijania poziomego strony; kontrola wysokości 32 px (admin, desktop) i 44 px (telefon) | Usage and accessibility, Layout |
| 2 | Wpisz w wyszukiwanie tekst bez wyników | komunikat z powodem i akcją „Clear search” (stan pusty z wyszukiwaniem) | Content, Empty states; B3.23 |
| 3 | Wpisz ponad 100 znaków | błąd przy polu (`FieldError`), fokus na polu | Forms and messages; B1.23 |
| 4 | Wyłącz sieć (lub wywołaj błąd bazy na stronie testowej) | `ErrorState` z tytułem (co się stało) i akcją „Try again” | B3.24; What to avoid |
| 5 | Usuń kategorię | potwierdzenie `AlertDialog` z nazwą kategorii w tytule, „Cancel” pierwszy w DOM, fokus startuje na „Cancel” | B4.14, B4.15 |
| 6 | Tab przez cały ekran | kolejność zgodna z wyglądem, widoczny fokus 2 px z offsetem | Keyboard and focus |
| 7 | Sprawdź kolor | przycisk główny graphite, czerwień tylko dla błędu lub usunięcia (obrys, bez wypełnienia) | Color; tokeny §7 rules 4–5 |
| 8 | Sprawdź wyłączone stany | powód obok wyłączonego przycisku, bez `opacity` | tokeny P5; What to avoid |

## Co zapisać po wykonaniu

- Każde odstępstwo: krok, motyw, szerokość, zrzut, reguła.
- Każdy wynik, który nie ma źródła, trafia na listę P w „What is missing”, a nie do poprawki w kodzie.
- Liczby: kroki zaliczone / niezaliczone, przypadki na listę P.
