# Postęp: design system CommerceOS (prompt Storybooka, lekcja 06)

- Prompt: `storybook-devmentor.txt` z lekcji 06, kontekst DevMentora podmieniony na CommerceOS. Baza komponentów: **shadcn/ui `base-nova` na Base UI** (nie Radix).
- Spec: `.ai/specs/2026-10-24-design-system.md` (zakres, kolejność PR-ów, zależności, coverage, CI, otwarte decyzje ⚠D1–⚠D5).
- Kontynuacja w nowej sesji: przeczytaj prompt, spec i ten plik, potem idź od „Następny krok”. Zasady promptu (12) obowiązują dalej.

## Stan etapów

| Etap | Stan | Gdzie |
|---|---|---|
| 0. Inwentaryzacja i plan | **zakończony** 2026-10-24 | ten plik, spec |
| 1. Fundamenty | **zrobiony** 2026-10-24 na gałęzi `design/stage-1-foundations` (draft PR, `do-not-merge` do merge'u PR designu i zatwierdzenia specu); pełna bramka zielona | log `.ai/runs/2026-10-24-design-system-stage-1.md` |
| 2. Komponenty bazowe | nie rozpoczęty | partie niżej |
| 3. Komponenty produktu, wzorce, ekrany | przeniesiony do lekcji 08 (retrofit) | osobny spec |
| 4. Strony, które uczą + `docs/design-system.md` | nie rozpoczęty | – |
| 5. Sprawdzenie i raport | nie rozpoczęty | – |

## Decyzje zatwierdzone przez właściciela

- Referencje R01–R04, antyreferencja A01, konflikty K1–K7 (`referencje.md`, 2026-10-23).
- Tokeny z `tokeny.md`, zatwierdzone 2026-10-24, z rozstrzygnięciami: ten sam `red-600` dla akcji i błędu, neutralny grafitowy pierścień fokusu, krój Archivo (osie `wght` i `wdth`), białe body i szara karta produktu, ikony Tabler zamiast lucide, P1–P15 przyjęte poza P11, P12 = usunąć `--chart-1…5`.

## 1. Moje decyzje w dziesięciu linijkach

1. Charakter: **wyrazisty, konkretny**; antycharakter: **nieczytelny, przeładowany** (referencje).
2. Jeden czerwony kolor akcji zakupu `--action` (R03.1, K1); cena nigdy w kolorze akcji (A01, zasada 1).
3. Ciemna rama sklepu (nagłówek, stopka), jasne powierzchnie handlowe (R02.1); produkt na szarej karcie `--surface-product` bez cienia (R01.3).
4. Admin: ciemne menu, gęste tabele, neutralny grafitowy przycisk główny, kolor tylko dla znaczenia (R04.1, R04.2, K7).
5. Typografia: grotesk display duży i ciasny, spokojna treść tej samej rodziny, Archivo (R01.2, K2, tokeny §8).
6. Kształt: kontrolki 8 px, karty 12 px, badge 4 px, pigułka tylko dla licznika koszyka (K4, P4).
7. Wspólne tokeny, dwie gęstości: sklep przestronny (kontrolki 40/44/48 px), admin gęsty (28/32/36 px), na telefonie ≥ 44 px (K7, R04.3, WCAG 2.5.8).
8. Antyreferencja A01: bez ściany promocji, gradientów, cieni na kartach, stosu etykiet na zdjęciu, tekstu < 12 px.
9. Statusy i demo mają własne tokeny (`--success`, `--warning`, `--demo`), status nigdy samym kolorem (audyt, decyzja 4; P2, P3).
10. Motyw jasny domyślnie, ciemny opcjonalny z przełącznikiem i ustawieniem systemowym; kontrast liczony w obu (decyzja „Motyw”).

## 2. Czego brakuje w materiałach (pytania, najwyżej pięć)

1. **⚠D1–⚠D5 ze specu** (coverage, zależności, Vitest 5.0.5, CI dla Storybooka, obejście błędu ścieżki na Windows): potrzebuję decyzji przed mergem etapu 1.
2. **Liczba kolumn listingu** (K3: „3–4, otwarte”): potrzebna dopiero przy wzorcu listy z filtrami (lekcja 08). Do tego czasu zostaje obecny układ.
3. **Kreska ikon przy 16 px** (1,75 czy 2 px, tokeny §6 „do potwierdzenia w Storybooku”): strona Foundations „Icons” pokaże oba warianty obok siebie; wybierasz po etapie 1.
4. **Toast**: produkt dziś pokazuje komunikaty inline (`role="status"`). Proponuję nie dodawać toastu w etapie 2 i wpisać go do „What is missing” (propozycja, do decyzji).
5. **Ekran do testu agentem** (etap 5): propozycja to lista kategorii w adminie z wyszukiwaniem i stanami (ładowanie, pusto, brak wyników, błąd), bo dziś jej nie ma w Storybooku. Do potwierdzenia przy etapie 4.

## 3. Baza komponentów

shadcn/ui 4.21, styl `base-nova`, prymitywy **Base UI** (`@base-ui/react` 1.9), `cn` zamiast `clsx` + `tailwind-merge` (lekcja 2026-10-13). Zachowanie i dostępność bierzemy z Base UI, wygląd wyłącznie z naszych tokenów. Po każdym `npx shadcn@latest add` (w `packages/app`) sprawdzam `package.json` i diff komponentu, a ikony z `lucide-react` przepinam na Tabler (od etapu 1 `components.json` ma `"iconLibrary": "tabler"`, a ESLint blokuje import lucide).

## 4. Plan techniczny

- **Gdzie:** bez nowego pakietu (spec A1). Tokeny `packages/app/src/app/globals.css`; komponenty `packages/app/src/components/ui`; konfiguracja Storybooka `packages/app/.storybook/`; treść Storybooka `packages/app/stories/` (poza `src/`, więc bez wykluczeń z coverage, spec A2).
- **Wersja:** Storybook **10.6.3** z frameworkiem `@storybook/nextjs-vite` (Vite 8). Aplikacja dalej buduje się Turbopackiem; Storybook ma własny build.
- **Dodatki:** `@storybook/addon-docs` (MDX, `remark-gfm` dla tabel), `@storybook/addon-a11y` (`a11y: { test: "error" }`), `@storybook/addon-vitest` (stories jako testy w Chromium przez Playwright, interakcje w `play`). Symulowanie API (`msw`): **nie teraz**; aplikacja woła server actions, a wzorce z odpowiedziami API to etap 3 w lekcji 08.
- **Skrypty:** `storybook`, `build-storybook`, `test:storybook`, `test:storybook:dark`, `test:storybook:themes`, `check:tokens` (root `package.json`).
- **Przełącznik motywu w Storybooku:** global `theme` w pasku narzędzi, dekorator ustawia `.dark` na `<html>` (zasada 9), bez `@storybook/addon-themes`.

### Zgodność Storybooka (etap 0, instalacja próbna 2026-10-24)

| Sprawdzenie | Wynik |
|---|---|
| Peer dependencies `@storybook/nextjs-vite@10.6.3`: `next ^16`, `react ^19`, `vite ^8` | ok z Next 16.4.1, React 19.3.0, Vite 8.3.4 |
| Peer dependencies `@storybook/addon-vitest@10.6.3`: `vitest ^4 \|\| ^5`, `@vitest/browser(-playwright) ^4 \|\| ^5` | ok z Vitest 5.0.4; `@vitest/browser-playwright` wymaga dokładnie tej samej wersji co `vitest` |
| Turbopack | bez znaczenia: Storybook buduje Vite (Rolldown), nie Turbopack |
| Tailwind v4 | ok przez `@tailwindcss/vite@4.3.3`, ten sam `globals.css` |
| `storybook build` (story z prawdziwym `Button` + tabela MDX) | ok; ostrzeżenia o dyrektywie `use client` z Base UI to szum |
| Stories jako testy w Chromium | ok po obejściu: dodatek dekoduje w ścieżce tylko `%20`, więc w `C:\Users\Użytkownik\…` story nie staje się testem („No test suite found”). Wtyczka Vite z `decodeURIComponent` naprawia (⚠D5); CI na Linuksie nie ma problemu |
| `a11y: { test: "error" }` | ok: story z kontrastem `#eee` na białym kończy się błędem `color-contrast` |
| Stories w `.storybook/` | nie są testami (glob bez plików z kropką), stąd katalog `stories/` |
| `npm audit` | +5 moderate z jednego advisory GHSA-p458-7748-mcp3 (łańcuch `@vitest/browser`, serwer Vite może podać `.env`); naprawione w Vitest 5.0.5 (⚠D3) |

**Rekomendacja:** Storybook 10.6.3 + `@storybook/nextjs-vite` w etapie 1, z Vitestem 5.0.5 i obejściem ścieżki na Windows. Instalacja próbna nie jest w commicie.

## 5. Komponenty i wzorce wyprowadzone z ekranów

### Komponenty bazowe (etap 2, partie po ok. 6)

| Partia | Komponent | Stan dziś | Ekrany, które go potrzebują |
|---|---|---|---|
| 1 | Button (warianty: primary, action, secondary, outline, ghost, link, destructive) | jest (`ui/button.tsx`), domyślny shadcn | wszystkie; CTA zakupu: produkt, koszyk, checkout, płatność demo |
| 1 | Text link | brak (klasy w miejscu użycia) | stopka, menu, tabele admina (nazwa zasobu, P1 `--link`) |
| 1 | Input | jest | wyszukiwarka, checkout, formularze admina, wyszukiwanie zamówienia |
| 1 | Textarea | jest | opis produktu, import CSV |
| 1 | Label | jest | wszystkie formularze |
| 1 | Field (etykieta, podpowiedź, błąd, wymagane / opcjonalne) | brak (składane ręcznie) | checkout, formularz produktu i kategorii, logowanie |
| 2 | Select | natywny `<select>` bez stylu DS | formularz produktu (kategoria), filtr kategorii w katalogu |
| 2 | Checkbox | natywny | formularz produktu (publikacja), formularz statusu zamówienia |
| 2 | Radio group | brak (etap 1 dodaje przełącznik motywu na natywnych radio) | przełącznik motywu, w przyszłości wybór okresu na dashboardzie |
| 2 | Badge (statusy zamówień P2, demo, dostępność) | jest, pigułka `rounded-4xl` | lista i szczegóły zamówień, produkty, Copilot, dashboard |
| 2 | Alert (info, success, warning, error, demo) | brak (różne `<p>`) | pasek demo, notka płatności demo, ostrzeżenia slugu i draftu AI, błędy stron (`role="alert"`) |
| 2 | Card | jest | dashboard, logowanie, Copilot, podsumowanie koszyka |
| 3 | Table | jest | listy admina: produkty, kategorie, zamówienia, podgląd importu, Copilot |
| 3 | Tabs | brak (zakładki „Featured” jako linki) | strona główna (polecane według kategorii) |
| 3 | Skeleton | brak (fallbacki Suspense tekstem) | każdy fallback `<Suspense>`: menu, licznik koszyka, sesja admina, dashboard |
| 3 | Empty state | brak (tekst w miejscu) | pusty koszyk, brak wyników wyszukiwania, brak zamówień, brak rekomendacji |
| 3 | Error state | brak (różne komunikaty) | katalog niedostępny, `admin/error.tsx`, fallback Copilota |
| 3 | Disclosure (menu mobilne `<details>`) | natywny `<details>` | menu sklepu na telefonie, szczegóły odpowiedzi Copilota |
| 4 | Dialog | brak | – (dziś nie ma; potrzebny dla potwierdzeń) |
| 4 | Alert dialog (potwierdzenie) | brak (osobne formularze) | usunięcie kategorii, anulowanie zamówienia (pending → cancelled) |
| 4 | Menu (akcje) | brak | akcje wiersza w tabelach admina (do potwierdzenia w retroficie) |
| 4 | Popover | brak | definicje metryk na dashboardzie (dziś tekst pod kartą) |

Poza zakresem etapu 2, na stronę „What is missing” z uzasadnieniem: **Tooltip** (informacja niezbędna do działania nie może siedzieć w podpowiedzi), **Toast** (pytanie 4), **Avatar** (produkt nie ma użytkowników z obrazkami), **Switch** (publikacja to checkbox w formularzu z przyciskiem zapisu, nie natychmiastowa zmiana).

### Komponenty produktu (etap 3, lekcja 08)

| Epik | Komponenty (dziś w `src/components/...`) |
|---|---|
| E01 katalog | karta produktu, kafel zdjęcia, badge dostępności, nawigacja kategorii, formularz wyszukiwania, wyniki katalogu, polecane produkty, rama sklepu (nagłówek, menu, stopka) |
| E02 koszyk i checkout | link koszyka z licznikiem, „Add to cart”, pozycja koszyka, podsumowanie koszyka, formularz checkoutu, podsumowanie zamówienia, szczegóły zamówienia, notka i formularz płatności demo |
| E03 katalog właściciela | formularz produktu i kategorii, publikacja, panel stanu magazynu, import CSV z podglądem, panel draftu opisu AI, potwierdzenie usunięcia kategorii |
| E04 zamówienia i dashboard | badge statusów, formularz zmiany statusu, karty metryk z definicjami, porównanie okresów, stan systemu |
| E05 Copilot | panel pytania, odpowiedź z 3 rekomendacjami, karta rekomendacji z dowodami, akcje zapisz / odrzuć / ukończ, stan fallbacku LLM, oznaczenie danych demo ruchu |

### Wzorce (etap 3, lekcja 08)

Formularz (checkout, produkt, kategoria, logowanie), lista z filtrami (katalog, zamówienia, produkty), widok szczegółów (produkt, zamówienie), potwierdzenie usunięcia (kategoria, anulowanie zamówienia), podgląd przed zapisem (import CSV, draft opisu AI), odpowiedź AI z fallbackiem (Copilot).

## 6. Drzewo menu Storybooka i liczba stories

```
CommerceOS design system
├─ Design system            (etap 4)
│  ├─ Start here
│  ├─ Components
│  ├─ How to choose
│  ├─ Usage and accessibility
│  ├─ Content
│  ├─ What to avoid
│  ├─ What is missing
│  ├─ Contributing
│  └─ Epics: E01 Catalog · E02 Cart and checkout · E03 Owner catalog · E04 Orders and dashboard · E05 Copilot
├─ Foundations              (etap 1)
│  ├─ Colors · Typography · Spacing and layout · Shape and depth · Motion · Icons · Themes
├─ Primitives               (etap 2, 22 komponenty w 4 partiach)
├─ Product                  (etap 3, lekcja 08, według epików)
└─ Patterns                 (etap 3, lekcja 08)
```

Przybliżona liczba stories: Foundations ok. 10 (bloki z testem a11y), Primitives ok. 150 (Playground, warianty i rozmiary, macierz stanów, długa treść i wąski ekran, `play` dla głównego zachowania: średnio 7 na komponent), strony dokumentacji ok. 7 + 9 + 22.

## 7. Istniejący design system: co zostaje, co zmieniam, co usuwam

| Pozycja | Decyzja | Uzasadnienie | Stan |
|---|---|---|---|
| Nazwy tokenów shadcn (`--primary`, `--muted-foreground` …) | zostają jako warstwa znaczeniowa | opisują przeznaczenie (tokeny.md, wstęp) | zatwierdzone |
| Wartości tokenów shadcn | zmieniam na tokeny.md | audyt (kontrast, generyczny wygląd) | zatwierdzone |
| Blok `.dark` | zmieniam wartości, włączam przełącznik | decyzja „Motyw” | zatwierdzone |
| `--chart-1…5` | usuwam | P12 | zatwierdzone |
| Geist (sans) | zastępuje Archivo | tokeny §8 pkt 3 | zatwierdzone |
| Geist Mono | zostaje dla SKU i numeru zamówienia | P13 | zatwierdzone |
| `lucide-react` | usuwam, zastępuje Tabler | tokeny §8 pkt 5 | zatwierdzone |
| 7 prymitywów w `components/ui` | zostają, dopasowanie w etapie 2 (promienie, wysokości, fokus, stany bez przezroczystości) | tokeny §5, §7 | do etapu 2 |
| 11 wartości na sztywno (tokeny §1d) | zamiana na tokeny w retroficie (lekcja 08); #10 i #11 w etapie 2 | spec A12 | zaplanowane |
| Ilustracje SVG demo (fiolet, indygo) | przemalowanie na szarości + co najwyżej `red-600` w retroficie | P10 | zaplanowane |

## Otwarte pytania

Pytania 1–5 z sekcji 2 i decyzje ⚠D1–⚠D5 ze specu.

## Wynik etapu 1 (do pokazania)

- Tokeny w `globals.css` w 3 warstwach, oba motywy; `node .ai/design/kontrast/verify-css.mjs`: wartości zgodne z tokeny.md, 58 par niedekoracyjnych przechodzi w obu motywach.
- Archivo (`wdth` + `wght`) przez `next/font`, przełącznik Light / Dark / System w stopce sklepu i menu admina, skrypt w `<head>` bez mignięcia.
- Storybook 10.6.3: 7 stron Foundations (tabele MDX renderują się jako tabele, sprawdzone w zbudowanym Storybooku), 9 stories, testy a11y w obu motywach (18/18), test interakcji przełącznika.
- `npm run check:tokens`: 35 znanych wartości w `src/` (11 z audytu, wewnętrzne klasy shadcn, szablony siatek `grid-cols-[…]`); `stories/` i `.storybook/` czyste.
- Tabler zamiast lucide; ESLint blokuje `lucide-react`.
- Świadomie bez zmian: rozmiary ikon w nagłówku (16 px jak dziś, reguła 20/24 px przy retroficie ramy), pierścień fokusu w komponentach `ui/*` (`ring-ring/50`, etap 2), `rounded-md` = 6,4 px przy nowym `--radius` (etap 2), 11 wartości z audytu (lekcja 08).

## Następny krok

Po merge'u PR designu i zatwierdzeniu specu (⚠D1–⚠D5): etap 2, partia 1 (Button, Text link, Input, Textarea, Label, Field). Najpierw lista różnic kształtu, gęstości i stanów względem bazy, z decyzją przy każdej.
