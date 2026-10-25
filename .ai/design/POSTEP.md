# Postęp: design system CommerceOS (prompt Storybooka, lekcja 06)

- Prompt: `storybook-devmentor.txt` z lekcji 06, kontekst DevMentora podmieniony na CommerceOS. Baza komponentów: **shadcn/ui `base-nova` na Base UI** (nie Radix).
- Spec: `.ai/specs/2026-10-24-design-system.md` (zakres, kolejność PR-ów, zależności, coverage, CI, otwarte decyzje ⚠D1–⚠D5).
- Kontynuacja w nowej sesji: przeczytaj prompt, spec i ten plik, potem idź od „Następny krok”. Zasady promptu (12) obowiązują dalej.

## Stan etapów

| Etap | Stan | Gdzie |
|---|---|---|
| 0. Inwentaryzacja i plan | **zakończony** 2026-10-24 | ten plik, spec |
| 1. Fundamenty | **zmergowany** (PR #99); pełna bramka zielona | log `.ai/runs/2026-10-24-design-system-stage-1.md` |
| 2. Komponenty bazowe | **w toku:** partia 1 zmergowana (PR #104); partia 2 zaimplementowana, PR do review właściciela (gałąź `design/stage-2-batch-2`); partie 3–4 nie rozpoczęte | sekcje „Etap 2, partia 1” i „Etap 2, partia 2” niżej; logi `.ai/runs/2026-10-24-design-system-stage-2-batch-1.md`, `.ai/runs/2026-10-24-design-system-stage-2-batch-2.md` |
| 3. Komponenty produktu, wzorce, ekrany | przeniesiony do lekcji 08 (retrofit) | osobny spec |
| 4. Strony, które uczą + `docs/design-system.md` | nie rozpoczęty | – |
| 5. Sprawdzenie i raport | nie rozpoczęty | – |

## Decyzje zatwierdzone przez właściciela

- Referencje R01–R04, antyreferencja A01, konflikty K1–K7 (`referencje.md`, 2026-10-23).
- Tokeny z `tokeny.md`, zatwierdzone 2026-10-24, z rozstrzygnięciami: ten sam `red-600` dla akcji i błędu, neutralny grafitowy pierścień fokusu, krój Archivo (osie `wght` i `wdth`), białe body i szara karta produktu, ikony Tabler zamiast lucide, P1–P15 przyjęte poza P11, P12 = usunąć `--chart-1…5`.
- Spec: ⚠D1–⚠D5 zaakceptowane zgodnie z rekomendacjami (bez nowych wykluczeń coverage, zależności etapu 1, Vitest 5.0.5, job `storybook` w CI w etapie 2, obejście ścieżki na Windows).

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

Pytania 2–5 z sekcji 2 (pytanie 1, ⚠D1–⚠D5, rozstrzygnięte) i pytania Q1–Q5 partii 2 (sekcja „Etap 2, partia 2”). Pytania partii 1 są rozstrzygnięte.

## Wynik etapu 1 (do pokazania)

- Tokeny w `globals.css` w 3 warstwach, oba motywy; `node .ai/design/kontrast/verify-css.mjs`: wartości zgodne z tokeny.md, 58 par niedekoracyjnych przechodzi w obu motywach.
- Archivo (`wdth` + `wght`) przez `next/font`, przełącznik Light / Dark / System w stopce sklepu i menu admina, skrypt w `<head>` bez mignięcia.
- Storybook 10.6.3: 7 stron Foundations (tabele MDX renderują się jako tabele, sprawdzone w zbudowanym Storybooku), 9 stories, testy a11y w obu motywach (18/18), test interakcji przełącznika.
- `npm run check:tokens`: 35 znanych wartości w `src/` (11 z audytu, wewnętrzne klasy shadcn, szablony siatek `grid-cols-[…]`); `stories/` i `.storybook/` czyste.
- Tabler zamiast lucide; ESLint blokuje `lucide-react`.
- Świadomie bez zmian: rozmiary ikon w nagłówku (16 px jak dziś, reguła 20/24 px przy retroficie ramy), pierścień fokusu w komponentach `ui/*` (`ring-ring/50`, etap 2), `rounded-md` = 6,4 px przy nowym `--radius` (etap 2), 11 wartości z audytu (lekcja 08).

## Etap 2, partia 1: różnice względem bazy (do akceptacji punkt po punkcie)

Partia: Button, Text link, Input, Textarea, Label, Field. Baza: shadcn `base-nova` 4.21.4 na Base UI 1.9 (stan `components/ui/*` po etapie 1, `npx shadcn view field` dla Field). Każdy punkt ma jedną rekomendację i źródło; **P** = moja propozycja, bo materiały milczą (zasada 1 i 4 promptu). Nic z tej listy nie jest jeszcze w kodzie.

### Wspólne dla wszystkich kontrolek

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B1.1 | Zakres zmian w kodzie aplikacji | Zmieniam tylko `src/components/ui/*` (plus nowe `text-link.tsx` i `field.tsx`) i dodaję `stories/primitives/`. **Bez zmian w miejscach użycia**: przepięcie CTA zakupu na `action`, linków na `TextLink` i formularzy na `Field` to retrofit (lekcja 08). Ekrany zmieniają się tylko przez wspólne style komponentów | spec „Fazy” i A12, zasada 11 promptu |
| B1.2 | Wysokość: baza `h-7` / `h-8` / `h-9` (28 / 32 / 36 px) w każdym kontekście | Wysokość z tokenów `h-control-sm/md/lg`. Sklep 40 / 44 / 48 px, admin na desktopie 28 / 32 / 36 px (bez zmian), telefon i `pointer: coarse` 44 / 44 / 48 px | K7, R04.3, R01 (CTA 40/48), tokeny §3, WCAG 2.5.8 |
| B1.3 | Promień: `rounded-lg` w `default`, ale `rounded-[min(var(--radius-md),10px)]` / `…12px)]` w `xs`, `sm`, `icon-*` (dziś 6,4 px) | Jeden promień `rounded-control` (8 px) dla każdego rozmiaru przycisku i pola | K4, tokeny §5 |
| B1.4 | Fokus: `focus-visible:ring-3 ring-ring/50` (1,54 : 1) i ramka `border-ring` | `focus-visible:outline-2 outline-offset-2 outline-ring` (13–19 : 1), offset obowiązkowy; pole dodatkowo zmienia obrys na `--ring`. `aria-invalid` na przycisku: obrys `--destructive`, bez czerwonego pierścienia | audyt, decyzja 4; tokeny §5, pary 41–44 i 59–60; WCAG 2.4.7, 2.4.13 |
| B1.5 | Stany przez przezroczystość: `hover:bg-primary/80`, `disabled:opacity-50`, `disabled:pointer-events-none` | Hover osobnymi kolorami (`--primary-hover`, `--action-hover`, `--accent`). Wyłączony: `bg-muted text-muted-foreground cursor-not-allowed`, powód obok przycisku. Styl przez `data-disabled` (Base UI ustawia go także przy `focusableWhenDisabled`), nie przez `:disabled`. Przy okazji naprawia „Draft with AI”: ten przycisk nie ma atrybutu `disabled`, więc dziś wygląda na aktywny | zasada 14, P5, P7 |
| B1.6 | Ładowanie: baza nie ma stanu, aplikacja robi `disabled={pending}` i zmienia tekst | **P:** `aria-busy="true"` zachowuje kolor wariantu i daje `cursor-progress`; tekst („Adding…”) zostaje w miejscu użycia; bez spinnera (bez pętli, tokeny §5). Do retrofitu przycisk w trakcie wysyłki będzie przez chwilę szary (stan wyłączony), bo miejsca użycia nie dostają `aria-busy` w tej partii | tokeny §5 (ruch), zasada 14 |
| B1.7 | Tekst: przycisk `text-sm` (14 px), `sm` `text-[0.8rem]` (12,8 px, audyt #11), pole `text-base md:text-sm` | Przycisk i pole: rozmiar `body` / 500 dla przycisku (sklep 16 px, admin 14 px); `sm` = styl `small` (sklep 14, admin 12). W polach na telefonie 16 px także w adminie (bez zoomu iOS) | tokeny §3 („Tekst w kontrolce”), §4, §1d #11; A01 podpis 5 |
| B1.8 | Odstępy wewnętrzne poza siatką: `px-2.5` (10 px), `gap-1.5` (6 px), `py-1` | **P:** przycisk `px-4` (16) w sklepie, `px-3` (12) w adminie i w rozmiarze `sm`; ikona–tekst `gap-2` (8, `--space-related`); pole `px-3`, textarea `px-3 py-2`. Konkretne wartości paddingu to propozycja, siatka 4 px i wypadnięcie 6/10 px wynikają z tokenów | tokeny §3 (wypadają 2, 6, 10 px) |
| B1.9 | Ikona w kontrolce zawsze 16 px (`size-4`) | **P:** nowy token komponentowy `--control-icon-size`: 20 px w sklepie, 16 px w adminie. Grubość kreski czeka na pytanie 3 z sekcji 2 | tokeny §6 |
| B1.10 | `transition-all` | `transition-colors` z `--duration-fast` (120 ms). Wciśnięcie `translate-y-px` zostaje (wyłączane przy `prefers-reduced-motion` w `globals.css`) | tokeny §5 |
| B1.11 | Ciemny motyw przez `dark:` w komponentach (`dark:bg-input/30`, `dark:aria-invalid:*`, `dark:hover:bg-muted/50`) | Usuwam wszystkie `dark:`; tokeny mają wartości `.dark`. Cel: `npm run check:tokens` nie znajduje nic w 6 plikach partii | tokeny §1d, spec A10 |

### Button

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B1.12 | Warianty bazy: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`; brak koloru akcji zakupu | `default` zostaje pod tą nazwą (zgodność z shadcn i ponad 40 miejscami), w dokumentacji „Primary” (grafit). **Nowy `action`**: `bg-action`, hover i wciśnięcie `--action-hover`, tylko Add to cart, Checkout, Place order, Pay (demo); najwyżej jeden na widocznym obszarze; nigdy w adminie | R03.1, K1, K7; tokeny §7 zasady 2–4 |
| B1.13 | `outline`: obrys `border-border` (1,30 : 1), hover `bg-muted` | Obrys `--input` (3,66 : 1), tło `--background`, hover `--accent` | zasada 12, para 38 |
| B1.14 | `secondary`: hover `color-mix(…)` (wartość arbitralna) | **P:** nowy token `--secondary-hover` (`--raw-gray-200` w jasnym, `--raw-gray-700` w ciemnym), kontrast przeliczony skryptem przed zapisem. To zmiana `tokeny.md`, więc pytanie Q1 | P7, zasada 14 |
| B1.15 | `destructive`: miękkie `bg-destructive/10` | Tekst i obrys `--destructive` na `--background`, hover `--destructive-surface`. Nigdy wypełniony czerwienią | zasada 5; pary 18, 20, 49 |
| B1.16 | `link`: `text-primary`, podkreślenie tylko w hover | Kolor `--link`, podkreślenie zawsze. Wariant tylko dla **akcji** wyglądającej jak link (np. „Remove” w koszyku); nawigacja to `TextLink` (B1.18) | P1; HTML i WAI-ARIA (przycisk = akcja, link = nawigacja); WCAG 1.4.1 |
| B1.17 | Rozmiary bazy: `xs`, `sm`, `default`, `lg`, `icon-xs`, `icon-sm`, `icon`, `icon-lg` | Zostają `sm`, `default` (= md), `lg`, `icon-sm`, `icon`, `icon-lg`. **Usuwam `xs` i `icon-xs`** (24 px, poza skalą kontrolek i poniżej 44 px na telefonie; 0 użyć w aplikacji). Usunięcie z bazy wymaga Twojej zgody (zasada 12) | tokeny §3; WCAG 2.5.8 |

### Text link (nowy)

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B1.18 | Baza nie ma linku; w aplikacji 3 wzorce klas w ok. 45 miejscach, wszystkie w kolorze tekstu: `underline underline-offset-4` (w treści), `w-fit text-sm underline` (powrót, paginacja), `font-medium hover:underline` (nazwa w tabeli) | `ui/text-link.tsx`: `TextLink` na `next/link` plus `textLinkVariants` (jak `buttonVariants`). Warianty: `inline` (domyślny: `--link`, zawsze podkreślony), `standalone` (jak `inline` plus cel min. 24 px: „Back to products”, paginacja, „Continue shopping”), `resource` (`--link`, 500, podkreślenie przy hover i fokusie: nazwa produktu lub zamówienia w tabeli admina). **P:** hover = grubsze podkreślenie, bez nowego koloru; bez stylu `:visited`. Bez wariantu dla ramy: nawigacja i stopka to retrofit ramy | P1, R04.2; tokeny §7 zasada 16; WCAG 1.4.1, 2.5.8 |

### Input, Textarea, Label

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B1.19 | Input: `h-8`, `px-2.5 py-1`, `bg-transparent` + `dark:bg-input/30`, błąd jako czerwony pierścień `ring-destructive/20`, wyłączony `opacity-50` + `bg-input/50` | Wysokość B1.2, tekst B1.7, padding B1.8; tło przezroczyste w obu motywach (pole stoi na `--background` lub `--card`); obrys `--input` (już jest); **P:** hover bez zmiany. Błąd: obrys `--destructive`, także w fokusie, a pierścień fokusu zostaje `--ring`. Wyłączony: `bg-muted text-muted-foreground`, obrys `--input`. Placeholder `--muted-foreground`. Przycisk pola pliku w stylu `small` | tokeny §5 (fokus i błąd), zasady 5, 12, 14; pary 6, 38–40 |
| B1.20 | Textarea: `min-h-16` (64 px) | Jak Input, plus **P:** `min-h-24` (96 px, ok. 3 linie w sklepie). `field-sizing-content` zostaje (rośnie z treścią; w przeglądarkach bez wsparcia działa minimalna wysokość i `resize-y`) | tokeny §3, §4 |
| B1.21 | Label: `text-sm leading-none` (14/14 px, długa etykieta nachodzi na siebie), wyłączony `opacity-50` | Sklep: styl `small` (14/20, 500). Admin: **P:** 14/20, 500 zamiast 12 px stylu `small` admina (etykieta nie może być mniejsza niż wartość w polu; Q3). Wyłączony: `--muted-foreground`. Etykieta zawsze widoczna | tokeny §4; audyt, decyzja 5 |

### Field (nowy)

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B1.22 | Baza (`npx shadcn add field`) daje 10 eksportów i ciągnie komponent `separator` spoza planu | Dodaję przez CLI i przycinam do: `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldSet`, `FieldLegend`. Usuwam `FieldSeparator` (i zależność `separator`), `FieldContent`, `FieldTitle` (poziome pole z checkboxem wróci w partii 2). Odrzucona alternatywa: `Field` z Base UI (automatyczne id i walidacja natywna), bo błędy z serwera wymagałyby `<Form errors>` i przebudowy `useActionState` w 10 formularzach | zasada 6 promptu; AGENTS.md (formularze admina: widok plus `useActionState`) |
| B1.23 | `FieldError` z `role="alert"`; `data-[invalid=true]:text-destructive` barwi całe pole (etykietę i podpowiedź) | Błąd = tekst `--destructive` + ikona Tabler `IconAlertCircle` + `id` dla `aria-describedby`, **bez** `role="alert"` (formularz ma już jeden `role="alert"` w komunikacie formularza; alert przy każdym polu to kilka ogłoszeń naraz). Etykieta i podpowiedź zostają w swoich kolorach | tokeny §7 zasada 5; antycharakter „przeładowany”; WCAG 3.3.1, 4.1.3 |
| B1.24 | Baza nie ma oznaczenia wymagane / opcjonalne | **P:** pola wymagane bez gwiazdki (atrybut `required`), opcjonalne z dopiskiem „(optional)” w `--muted-foreground` w etykiecie (`FieldLabel optional`). Q2 | audyt, decyzja 5 (wymaga oznaczenia, nie mówi jak) |
| B1.25 | Odstępy: `FieldGroup gap-5` (20 px, poza skalą), `FieldContent gap-0.5` (2 px) | Etykieta, kontrolka, podpowiedź i błąd co `--space-related` (8 px); między polami `FieldGroup` = `--space-group-item` (16 sklep, 12 admin); między grupami `FieldSet` = `--space-group`. Podpowiedź w stylu `small` (admin 12 px), `--muted-foreground` | tokeny §3, §4 |
| B1.26 | Kolejność części: baza nie narzuca | **P:** etykieta → kontrolka → podpowiedź → błąd, jak dziś we wszystkich formularzach (np. cena produktu) i w przykładach shadcn | audyt, decyzja 5 („stała kolejność”) |

### Testy, coverage i CI

| # | Różnica | Rekomendacja | Źródło |
|---|---|---|---|
| B1.27 | `src/components/ui/**` jest wykluczone z coverage z powodem „vendored shadcn/ui primitives”, a dochodzą `text-link.tsx` i przycięty `field.tsx` | Komponenty w `ui/` zostają bez logiki (same klasy i jeden warunek `optional`). Zmieniam tylko **powód** wykluczenia na „prymitywy DS na bazie shadcn, bez logiki; pokryte testami Storybooka (interakcje, a11y w obu motywach) w jobie CI `storybook`”. Glob bez zmian, ale to opis wykluczenia, więc za Twoją zgodą | AGENTS.md „Testing”; ⚠D1 |
| B1.28 | Job `storybook` w CI (⚠D4: „w etapie 2”) | **Wchodzi w PR partii 1**, osobnym commitem: `npm ci` → `npx playwright install --with-deps chromium` → `npm run build-storybook` → `npm run test:storybook:themes`. Razem: `.ai/agentic.config.json` (bramka) i AGENTS.md „Validation”. Powód: partia 1 przynosi pierwsze stories komponentów z `play` i a11y, a `ui/*` jest poza unit coverage (B1.27), więc bez joba ich jedyna siatka byłaby lokalna. Koszt: ok. 4–6 min, równolegle z innymi jobami | ⚠D4; BACKWARD_COMPATIBILITY.md (zmiana bramki razem z dokumentami) |

### Gdzie dziś są komponenty, co się zmieni na ekranie, ryzyko dla testów

| Komponent | Ekrany dziś | Co zmieni się wizualnie w partii 1 | Ryzyko dla testów |
|---|---|---|---|
| Button | sklep: hero („Shop all products”), wyszukiwanie katalogu i w nagłówku (ikona), karta i strona produktu (Add to cart, Out of stock), koszyk (Update, Remove, Checkout), checkout (Place order), płatność demo, wyszukiwanie zamówienia, konto klienta (logowanie, rejestracja, zamówienia, błąd); admin: logowanie, Sign out, kategorie, produkty (zapis, publikacja, stan, import, 5 przycisków draftu AI), zamówienia (zmiany statusu, anulowanie), dashboard (zakres dat), Copilot (pytanie, zapisz / odrzuć / ukończ), `error.tsx` | sklep: przyciski 32 → 44 px (`sm` 28 → 40), tekst 14 → 16 px, ikony 16 → 20 px; wszędzie: 8 px promienia, mocny fokus z offsetem, outline z ciemniejszym obrysem, wyłączony szary zamiast półprzezroczystego, destructive jako czerwony obrys. Admin na desktopie: wysokość bez zmian. Kolor akcji **nie** pojawia się (B1.1) | **średnie:** e2e `storefront-mobile` (390 px: szerokość strony, prawa krawędź koszyka i „Sign out” w nagłówku; przycisk lupy rośnie 32 → 44 px) i `admin-dashboard-range` (390 px: formularz zakresu nie może wyjść poza ekran). Sprawdzę 320 i 390 px przed commitem; jeśli coś wyjdzie poza ekran, zatrzymam się i zapytam, bo poprawka to zmiana w miejscu użycia. Unit: widoki renderowane do HTML sprawdzają tekst i atrybuty, nie klasy przycisku; `data-slot="button"` zostaje. e2e szukają po roli i nazwie, `aria-disabled` „Draft with AI” bez zmian |
| Text link | ok. 45 miejsc: powroty („Back to …”) na stronach admina i sklepu, paginacja zamówień i rekomendacji, nazwy w tabelach admina, „Continue shopping”, linki w koncie klienta, Copilot | **brak** (nowy komponent, bez przepięcia miejsc użycia, B1.1) | brak |
| Input | wyszukiwarka w nagłówku i katalogu, ilość (produkt, koszyk), checkout, wyszukiwanie zamówienia, konto klienta, logowanie admina, formularze kategorii i produktu, panel stanu, zakres dat dashboardu, import CSV (plik) | sklep: pola 32 → 44 px, tekst 14 → 16 px na desktopie; wszędzie: fokus z offsetem i ciemnym obrysem, błąd bez różowej poświaty, wyłączony szary | jak Button (te same dwa testy szerokości); unit bez asercji na klasy pól |
| Textarea | opis kategorii, opis produktu, pytanie do Copilota | min. wysokość 64 → 96 px, fokus, błąd, wyłączony | niskie |
| Label | wszystkie formularze wyżej plus Copilot i import | interlinia 14 → 20 px (dłuższe etykiety przestają nachodzić), wyłączony szary zamiast półprzezroczystego | niskie |
| Field | brak (formularze składane ręcznie w ok. 10 widokach: `Label` + kontrolka + `<p>` podpowiedzi + `FieldError` z `form-feedback.tsx`) | **brak** (B1.1); `FieldError`, `FormMessage` i `fieldA11y` w `form-feedback.tsx` zostają do retrofitu | brak (test `category-components.test.ts` porównuje dokładny HTML z `form-feedback.tsx`, którego nie ruszam) |

Stories partii (szacunek): Button 10, Text link 6, Input 7, Textarea 5, Label 3, Field 8, razem ok. 40, każda w obu motywach i w gęstości sklepu oraz admina (przełącznik w pasku narzędzi), `play` dla kliknięcia, klawiatury i walidacji. Każdy komponent dostaje stronę z 13 sekcjami.

### Pytania partii 1

- **Q1 (B1.14):** nowy token `--secondary-hover` (`gray-200` / `gray-700`) czy hover `secondary` = `--accent` (ten sam kolor co tło, więc hover niewidoczny)? Rekomendacja: nowy token.
- **Q2 (B1.24):** oznaczać pola opcjonalne dopiskiem „(optional)”, a wymaganych nie oznaczać? Rekomendacja: tak.
- **Q3 (B1.21):** etykieta w adminie 14 px (rekomendacja) czy 12 px ze stylu `small` admina?
- **Q4 (retrofit, potrzebne do dokumentacji `action`):** „Add to cart” w karcie produktu na liście: czerwony `action` (wtedy na liście jest wiele czerwonych przycisków, wbrew zasadzie 2 „najwyżej jeden na widocznym obszarze”) czy neutralny `outline` w rozmiarze `sm`, a czerwień tylko na stronie produktu, w koszyku, checkoutcie i płatności? Rekomendacja: neutralny w karcie.
- **Q5 (B1.1, B1.6):** potwierdzasz, że partia 1 nie zmienia miejsc użycia (także 4 CTA zakupu zostają grafitowe do retrofitu, a przycisk w trakcie wysyłki będzie chwilę szary)? Rekomendacja: tak.

### Decyzje właściciela (2026-10-24)

- **Q1 tak:** nowy token `--secondary-hover` (`--raw-gray-200` jasny, `--raw-gray-700` ciemny).
- **Q2 tak:** tylko dopisek „(optional)” przy polach opcjonalnych, bez gwiazdki przy wymaganych.
- **Q3:** etykieta w adminie 14 px.
- **Q4:** „Add to cart” w karcie produktu neutralny (`outline`, `sm`); czerwony `action` tylko na stronie produktu, w koszyku, checkoutcie i płatności (zastosowanie w retroficie).
- **Q5 tak:** partia 1 nie zmienia miejsc użycia.
- **B1.1–B1.28:** przyjęte domyślnie zgodnie z rekomendacjami (w tym B1.17 usunięcie `xs` i `icon-xs`, B1.27 opis wykluczenia coverage, B1.28 job `storybook` w tym PR); właściciel może je cofnąć w review PR.

## Etap 2, partia 2: różnice względem bazy (do akceptacji punkt po punkcie)

Partia: Select, Checkbox, Radio group, Badge, Alert, Card. Baza: shadcn `base-nova` 4.21.4 na Base UI 1.9: `ui/badge.tsx` i `ui/card.tsx` w stanie po etapie 1 (partia 1 ich nie ruszała) oraz `npx shadcn view native-select select checkbox radio-group alert` (podgląd rejestru, bez instalacji). Każdy punkt ma jedną rekomendację i źródło; **P** = moja propozycja, bo materiały milczą. Stan: wszystkie punkty B2.1–B2.31 są w kodzie (PR partii 2). Decyzje partii 1 obowiązują dalej i nie powtarzam ich przy każdym komponencie: wysokość kontrolek z tokenów (B1.2), promień 8 px (B1.3), fokus jako `outline` 2 px z offsetem 2 px (B1.4), stany kolorami zamiast przezroczystości (B1.5), bez `dark:` w komponentach (B1.11).

Kontrast nowych par policzyłem skryptem z `.ai/design/kontrast/` (`lib.mjs`, `tokens.mjs`) przed zapisaniem tej listy; wyniki są przy punktach. Pary trafią do `tokeny.md` §2 i `kontrast/tokens.mjs` razem z implementacją (zasada 19).

### Wspólne dla partii

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B2.1 | Zakres zmian w kodzie aplikacji | Jak B1.1: zmieniam tylko `src/components/ui/*` i dodaję `stories/primitives/`. Nowe pliki: `native-select.tsx`, `checkbox.tsx`, `radio-group.tsx`, `alert.tsx`; zmiany w `badge.tsx`, `card.tsx` i `field.tsx` (poziome pole, B2.11). **Bez zmian w miejscach użycia**: 3 natywne `<select>`, 2 natywne checkboxy, przełącznik motywu, ok. 25 komunikatów `<p role="alert|status">` i mapowanie statusów na warianty Badge to retrofit (lekcja 08). Na ekranie zmienią się więc tylko Badge i Card, przez wspólne style | spec „Fazy” i A12, zasada 11 promptu, decyzja Q5 partii 1 |
| B2.2 | Stany i wartości z bazy, które partia 1 już zastąpiła, wracają z każdym nowym plikiem z rejestru: `focus-visible:ring-3 ring-ring/50`, `disabled:opacity-50`, `aria-invalid:ring-destructive/20`, `dark:bg-input/30`, `dark:aria-invalid:*`, `rounded-[4px]`, `rounded-[min(var(--radius-md),10px)]`, `pl-2.5`, `py-0.5`, `bg-[Canvas]` | Zamieniam je według B1.4, B1.5, B1.11 we wszystkich 6 plikach. Cel: `npm run check:tokens` nie znajduje nic w plikach partii (dziś `badge.tsx:7` to wartość #10 z audytu) | tokeny §1d #10, §5; spec A10 |
| B2.3 | Zależności i CLI | **Bez nowych zależności.** `@base-ui/react` 1.9 ma już `checkbox`, `radio`, `radio-group`; `@tabler/icons-react`, `class-variance-authority` i `cn` są zainstalowane. W `packages/app` worktree (po `npm ci`) uruchamiam `npx shadcn add native-select checkbox radio-group alert`: rejestr podaje tylko zależność `cn`, a żaden z 4 plików jeszcze nie istnieje, więc nic nie zostanie nadpisane; `iconLibrary: tabler` daje `IconSelector` i `IconCheck` zamiast lucide. Po komendzie sprawdzam `package.json`, `package-lock.json` i diff (zasada 6). **Nie uruchamiam:** `add badge` i `add card` (nadpisałyby obecne pliki tą samą domyślną treścią, nic nie dają), `add select` (Q1), `add field` (nadpisałby `field.tsx` i `label.tsx` z partii 1 i dodał `separator`; poziome pole dopisuję ręcznie z `npx shadcn view field`, jak w partii 1). Jeśli CLI zechce zmienić cokolwiek poza 4 nowymi plikami, piszę je ręcznie z wyniku `view` | zasada 6 promptu; AGENTS.md (biblioteki tylko z powodem) |

### Select

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B2.4 | shadcn `base-nova` ma dwa selecty: `select` (Base UI Select: przycisk i lista w portalu, `"use client"`, ukryte pole formularza) oraz `native-select` (ostylowany `<select>`) | **`native-select`** (Q1). Trzy miejsca użycia to zwykłe formularze z `name` i `defaultValue` (formularz produktu: kategoria i status; wyszukiwarka katalogu jako GET), listy są krótkie (kategorie, 2 statusy). Natywny select daje systemowy wybór na telefonie, działa bez JavaScriptu (audyt: treść bez JS) i nie potrzebuje nakładki, której style przyjdą dopiero w partii 4. Komponent zostaje pod nazwami z bazy: `NativeSelect`, `NativeSelectOption`, `NativeSelectOptGroup`; w Storybooku strona „Select”. Base UI Select trafia na stronę „What is missing” (wróci, gdy opcja będzie potrzebowała własnej treści, np. miniatury) | audyt (bez JS, decyzja 5), WCAG 4.1.2 (rola i stan z przeglądarki), zasada 6 promptu |
| B2.5 | Kształt i gęstość: `h-8`, `pl-2.5 pr-8` (10 px poza siatką), `text-sm`, `rounded-lg`; rozmiar `sm` z `h-7` i `rounded-[min(…)]`; opakowanie `w-fit` | Jak Input (B1.19): `h-control-md`, `pl-3`, `pr-10` (miejsce na ikonę), tekst `--field-text-size`, `rounded-control`, opakowanie `w-full` (oba dzisiejsze `SELECT_CLASS` mają `w-full`). **Jeden rozmiar**: usuwam `sm` (0 użyć, Input też ma jeden), co jako usunięcie z bazy wymaga Twojej zgody | tokeny §3, K4; zasada 12 promptu |
| B2.6 | Ikona: `IconSelector` `size-4` na `right-2.5` (10 px) | Rozmiar `--control-icon-size` (20 px sklep, 16 px admin), `right-3`, kolor `--muted-foreground` (6,25 : 1 jasny, 8,28 : 1 ciemny), `aria-hidden`. **P:** zostaje `IconSelector` z bazy (materiały nie mówią nic o kształcie strzałki) | tokeny §6 (rozmiary ikon), B1.9 |
| B2.7 | Stany: `has-[select:disabled]:opacity-50` na opakowaniu, `dark:hover:bg-input/50`, błąd jako czerwony pierścień; opcje z `bg-[Canvas] text-[CanvasText]` | Jak Input: fokus zmienia obrys na `--ring` plus `outline`; błąd = obrys `--destructive`, także w fokusie; wyłączony = `bg-muted text-muted-foreground` (5,65 / 6,95 : 1), ikona też szara, bez przezroczystości; **P:** bez zmiany w hover (jak Input). Klasy `bg-[Canvas]` usuwam (wartości arbitralne); kolory listy rozwijanej daje `color-scheme`, które motyw już ustawia na `<html>` (`globals.css`, `color-scheme: light / dark`). Sprawdzę w Storybooku w obu motywach | B1.5, B1.19; tokeny §5; spec A10 |

### Checkbox

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B2.8 | Baza to Base UI Checkbox: `<span role="checkbox">` plus ukryte `<input>` dla formularza | **Zostaję przy Base UI** (Q2), bo zachowanie i dostępność bierzemy z Base UI (sekcja 3), a stan `data-checked` / `data-disabled` styluje się tak samo jak przycisk. Skutki dla retrofitu (nie dla tej partii): `id` z propsa trafia do ukrytego pola, a fokus i kliknięcie obsługuje `span` z wygenerowanym id, więc e2e `click("#product-featured")` i `click("#confirm-cancelled")` przejdą na kliknięcie etykiety albo roli; checkbox bez JavaScriptu się nie przełącza (dziś checkboxy są tylko w adminie). Atrybut `required` (potwierdzenie anulowania zamówienia) sprawdzę testem `play` z prawdziwym `<form>`. Odrzucona alternatywa: natywny `<input type="checkbox">` z `appearance-none` (bez JS, id bez zmian), bo to komponent pisany ręcznie poza bazą | sekcja 3 tego pliku; WAI-ARIA APG „Checkbox”; zasada 6 promptu |
| B2.9 | Kształt: `size-4` (16 px), `rounded-[4px]` (wartość arbitralna), pole kliknięcia przez `after:-inset-x-3 after:-inset-y-2` (40 × 32 px) | **P:** pole `--control-icon-size` (20 px sklep, 16 px admin), żeby rosło z gęstością jak ikony; promień `rounded-sm` (4,8 px ze skali promieni; 8 px przy 16–20 px wygląda jak radio); obrys `--input` (3,66 / 3,94 : 1); zaznaczony: tło i obrys `--primary`, znak `IconCheck` w `--primary-foreground` (16,98 / 15,50 : 1; `--primary` do tła 17,71 / 15,50 : 1). **Nigdy** `--action`. Pole kliknięcia `after:` zostaje (≥ 24 px), a poziome pole (B2.11) daje wierszowi `min-h-control-sm`, czyli 44 px na telefonie | tokeny §3, §6, §7 zasady 2, 4, 12, 16; WCAG 1.4.11, 2.5.8 |
| B2.10 | Stany: fokus `ring-3 ring-ring/50`, wyłączony `opacity-50`, błąd z czerwonym pierścieniem, brak hover, brak ikony stanu nieokreślonego | Fokus: `outline` 2 px z offsetem; błąd: obrys `--destructive` (zaznaczony zostaje `--primary`, jak w bazie); wyłączony: `bg-muted`, obrys `--input` (3,30 / 3,31 : 1 na `--muted`), znak `--muted-foreground`, etykieta `--muted-foreground`, `cursor-not-allowed`; **P:** hover bez zmiany (jak Input). Stan nieokreślony: produkt go nie potrzebuje, trafia do „What is missing” | B1.4, B1.5; tokeny §5, zasada 14 |
| B2.11 | Partia 1 usunęła z `Field` poziomą orientację, `FieldContent` i `FieldTitle` („wróci w partii 2”) | Wraca `Field orientation="horizontal"` (kontrolka po lewej, obok `FieldContent` z etykietą, podpowiedzią i błędem), odstęp `--space-related`, kontrolka wyrównana do pierwszej linii etykiety (`h-lh`, jak ikona w `FieldError`), wiersz `min-h-control-sm`. **P:** bez `FieldTitle` (żaden ekran nie potrzebuje tytułu innego niż etykieta). Miejsca użycia przy retroficie: „Featured” w formularzu produktu (etykieta, podpowiedź, błąd) i potwierdzenie anulowania zamówienia | B1.22; audyt, decyzja 5 („stała kolejność”); WCAG 1.3.1, 3.3.2 |

### Radio group

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B2.12 | Baza: Base UI `RadioGroup` + `Radio` (strzałki, jeden przystanek Tab, ukryte pole z `name`), `size-4`, zaznaczony = wypełnione `--primary` z białą kropką, `grid gap-2`, te same stany co checkbox | Te same decyzje co B2.9–B2.10: rozmiar `--control-icon-size`, obrys `--input`, zaznaczony `--primary` z kropką `--primary-foreground`, fokus `outline` z offsetem, wyłączony bez przezroczystości. Kształt koła `rounded-full` to wyjątek od P4 („pigułka tylko dla licznika koszyka”): koło jest konwencją radia, nie ozdobą. Między opcjami `--space-related` (każda opcja ma wiersz `min-h-control-sm`); nazwa grupy przez `FieldSet` + `FieldLegend variant="label"` z partii 1 | WAI-ARIA APG „Radio Group”; tokeny §3, §5; P4 |
| B2.13 | Kto go używa | Dziś nikt: jedyne radio w aplikacji to przełącznik motywu, natywny i w wyglądzie przełącznika segmentowego (spec A5, zatwierdzone). **Rekomendacja (Q3):** budować teraz (minimalny zestaw promptu, plan etapu 0 i przyszły wybór okresu na dashboardzie), a przełącznik motywu zostawić bez zmian. Przełącznik segmentowy jako osobny komponent trafia do „What is missing” | zasada 6 promptu; spec A5 |

### Badge

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B2.14 | Kształt: `rounded-4xl` (pigułka, 20,8 px przy nowym `--radius`), stałe `h-5` (20 px), `px-2 py-0.5`, `text-xs` (12 px), ikona `[&>svg]:size-3!` (12 px z `!important`), `has-data-[icon]:pl-1.5` (6 px) | Promień `rounded-badge` (4 px); bez stałej wysokości: `py-0.5` (2 px, jedyny dozwolony wyjątek z tokeny §3) i `px-2`; tekst styl `small` (sklep 14/20, admin 12/16; tokeny §4 wymienia badge i stan magazynu), 500. Wynik: 24 px w sklepie, 20 px w adminie. **P:** ikona `size-4` (16 px, najmniejszy rozmiar z tokeny §6), bez `!important` i bez osobnego paddingu dla ikony | P4, K4; tokeny §3, §4, §6; A01 (tekst ≥ 12 px) |
| B2.15 | Badge zachowuje się jak kontrolka: `focus-visible:ring-[3px] ring-ring/50` (audyt §1d #10), hover `[a]:hover:bg-*/80`, style `aria-invalid` | **P:** Badge nie jest interaktywny (status to tekst, R04.2); usuwam hover i `aria-invalid`. Jeśli ktoś wyrenderuje go jako link (`render`), dostaje standardowy fokus (`outline` z offsetem). W dokumentacji: link to `TextLink`, nigdy klikalny badge | tokeny §1d #10, §5; R04.2 |
| B2.16 | Warianty bazy: `default`, `secondary`, `destructive` (`bg-destructive/10`), `outline` (`border-border`), `ghost`, `link`; brak sukcesu, ostrzeżenia i demo (stąd klasy `amber-*` w `order-badges.tsx`) | Zostają `default` (grafit, najmocniejszy neutralny), `secondary` (neutralny), `outline` (obrys `--border` jest dekoracyjny, znaczenie niesie tekst; zasada 12 dotyczy kontrolek). `destructive` = `bg-destructive-surface text-destructive` (5,70 / 5,79 : 1) zamiast `/10`. **Nowe:** `success` (6,14 / 7,81), `warning` (5,96 / 8,31), `demo` (8,55 / 10,20). `ghost` (1 użycie: „Hidden” w produktach admina) zostaje do retrofitu jako przestarzały, potem znika. **Usuwam `link`** (0 użyć; link to `TextLink`), co wymaga Twojej zgody. Zasady w dokumentacji: status nigdy samym kolorem, najwyżej 1–2 etykiety na zdjęciu produktu | tokeny §7 zasady 6, 10, 11; §1b; P2, P3; R03.4; zasada 12 promptu |
| B2.17 | Mapowanie statusów na warianty (dziś każde miejsce wybiera samo: `paid` i `processing` są tym samym `secondary`, priorytet „high” Copilota jest czerwony jak błąd, DEMO to `outline` z `amber-*`) | Tabela „How to choose” w dokumentacji Badge, stosowana w retroficie: zamówienia według P2 (zatwierdzone: `pending_payment` warning, `paid` success, `processing` secondary, `shipped` outline, `cancelled` destructive, `refunded` outline); DEMO w zamówieniach i znacznik danych demo w Copilocie = `demo` (zasada 11); „In stock”, „Published” = `success`, „Low stock” = `warning` (tokeny §1b). **P:** „Out of stock” i „Hidden” = `outline`; „Featured” = `default`; import: utworzony `success`, pominięty `outline`, błąd `destructive`; priorytet Copilota „high” = `warning` zamiast `destructive` (czerwień znaczy błąd, zasada 5); stan systemu „up” = `success`, „down” = `destructive`. Przy okazji: neutralny `secondary` na karcie produktu ma kształt 1,02 : 1 do `--surface-product` (znika jako znacznik, tekst zostaje czytelny), co mapowanie „In stock” = `success` naprawia; parę policzę przy retroficie | P2, P3; tokeny §1b, §7 zasady 5, 10, 11, 20; audyt (statusy bez hierarchii) |

### Alert

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B2.18 | Baza ustawia `role="alert"` na każdym alercie | **Bez domyślnej roli** (Q4); rolę wybiera miejsce użycia: `alert` dla błędu po akcji albo nieudanego ładowania, `status` dla sukcesu, brak roli (albo `note`) dla stałych notek demo. Dziś aplikacja używa wszystkich trzech (`role="note"` pasek demo, `role="status"` notka płatności demo, `role="alert"` błędy). Stała notka z rolą `alert` byłaby ogłaszana przy każdym wejściu na stronę | WAI-ARIA 1.2 (`alert`: ważna i pilna informacja), WCAG 4.1.3 |
| B2.19 | Warianty bazy: `default` (`bg-card`) i `destructive` (tło karty, czerwony tekst) | Warianty: `info` (domyślny: `--card`, obrys `--border`), `success`, `warning`, `destructive` (w dokumentacji „Error”), `demo`, na tłach `--*-surface`. **P:** obrys 1 px w kolorze znaczenia (`--destructive`, `--success`, `--warning-border`, `--demo`; 5,70–10,20 : 1 do własnego tła), bo samo tło odróżnia się od strony tylko w 1,10–1,28 : 1 (policzone); token `--warning-border` istnieje właśnie dla obrysu alertu. Bez cienia i gradientu | audyt, decyzja 4; tokeny §1b, §7 zasady 8, 11; A01 |
| B2.20 | Kolory treści: opis `text-muted-foreground` w `default`, `text-destructive/90` (przezroczystość) w `destructive` | **P:** tytuł i ikona w kolorze znaczenia, opis zawsze `--foreground` (16,05–17,28 : 1 jasny, 13,48–14,15 : 1 ciemny), bo czerwony albo szary akapit gorzej się czyta (antycharakter „nieczytelny”). Linki w alercie to `TextLink`; parę `--link` na tłach `--*-surface` policzę przed zapisem | zasada 14; tokeny §1b; referencje (antycharakter) |
| B2.21 | Ikona: baza zostawia ją wywołującemu (`*:[svg]:size-4`, `translate-y-0.5`) | **P:** ikona wbudowana w wariant, żeby nikt jej nie pominął: `info` `IconInfoCircle`, `success` `IconCircleCheck`, `warning` `IconAlertTriangle`, `destructive` `IconAlertCircle` (ta sama co w `FieldError`), `demo` `IconFlask`; rozmiar `--control-icon-size`, `aria-hidden`, wyrównana do pierwszej linii (`h-lh`). Status nigdy samym kolorem | tokeny §6, §7 zasada 10; WCAG 1.4.1 |
| B2.22 | Kształt i odstępy: `rounded-lg`, `px-2.5 py-2` (10 / 8 px, 10 poza siatką), `gap-0.5` (2 px), `text-sm`, `text-balance` | **P:** promień `rounded-control` (8 px; alert stoi w formularzach obok pól i nie jest kontenerem jak karta); padding `--space-group-item` (16 px sklep, 12 px admin); ikona–tekst `--space-related`; tytuł–opis `gap-1` (4 px); tekst styl `body` (sklep 16, admin 14), tytuł 600; opis najwyżej `--measure-prose` | tokeny §3, §4, §7 zasada 15; K4 |
| B2.23 | Części bazy: `Alert`, `AlertTitle`, `AlertDescription`, `AlertAction` (przycisk zamknięcia w prawym górnym rogu, `pr-18`) | **Usuwam `AlertAction`** (wymaga Twojej zgody): żaden komunikat w produkcie nie jest zamykany (notka płatności demo jest stała według specu), a błąd, który wymaga działania, nie może zniknąć. Akcja („Try again”, „Back to products”) to zwykły `Button` albo `TextLink` w opisie. `AlertTitle` opcjonalny (pasek demo to jedno zdanie) | spec zamówień UI/UX „/checkout/pay” (notka stała); prompt etap 4 („błąd, który wymaga działania, nigdy nie jest toastem”); zasada 12 promptu |
| B2.24 | Granice z innymi komponentami (baza nie mówi) | Dokumentacja „When not to use”: błąd pola = `FieldError` (partia 1); podsumowanie formularza = dziś `FormMessage`, w retroficie Alert z rolą `alert` / `status`; pasek „Demo store” w ramie sklepu = decyzja retrofitu ramy (pełna szerokość, `demo`); toast nie istnieje (pytanie 4 z sekcji 2) | audyt, decyzja 5; tokeny §1d #1, #9 |

### Card

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B2.25 | Obrys `ring-1 ring-foreground/10` (przezroczystość), `rounded-xl`, stopka `bg-muted/50` | Obrys `border border-border` (dekoracyjny, para 57; tokeny §1b „obrys karty”), tło `--card`, bez cienia (`--shadow-card: none`); w ciemnym motywie karta różni się od tła tylko w 1,08 : 1 (policzone), więc obrys jest tam jedyną granicą. Promień przez alias `rounded-card` (ta sama wartość 12 px). Stopka: **P:** `border-t border-border` bez tła (0 użyć) | tokeny §1b, §5; A01 podpis 4; zasada 14 |
| B2.26 | Odstępy: `--card-spacing` = 16 px (`sm`: 12 px) jako padding i odstęp między częściami | Padding `--space-panel` (24 px sklep, 16 px admin); **P:** `size="sm"` = `--space-group-item` (16 / 12 px), odstęp nagłówek–treść `--space-group-item`, tytuł–opis `gap-1` (4 px) jak w bazie | tokeny §3 („wewnątrz panelu”) |
| B2.27 | Tekst: karta `text-sm`, tytuł `font-heading text-base font-medium`, opis `text-sm text-muted-foreground` | Karta: styl `body` (sklep 16, admin 14 jak dziś); tytuł: styl `h2` (sklep 20 → 24 px / 600, admin 16 / 600; tokeny §4 „nagłówek karty”); **P:** opis `body` w `--muted-foreground`. `CardTitle` zostaje `div`, a poziom nagłówka daje miejsce użycia (dziś logowanie ma w środku `<h1>`, Copilot `<h3>`); zasada w dokumentacji | tokeny §4; WCAG 1.3.1 |
| B2.28 | Części bazy: `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`; `CardAction` i `CardFooter` mają 0 użyć | Zostają wszystkie (bez usuwania z bazy); `CardAction` to miejsce na akcje karty po prawej, jak akcje strony w R04.1 | R04.1; zasada 12 promptu |
| B2.29 | Karta produktu w katalogu nie jest `Card` | Bez wariantu „produkt” w `Card`: kafel produktu to jedna powierzchnia `--surface-product` bez obrysu (zasada 7) i powstaje jako komponent produktu w etapie 3 (lekcja 08) | R01.3; tokeny §7 zasada 7; zasada 6 promptu |

### Testy, coverage i CI

| # | Różnica | Rekomendacja | Źródło |
|---|---|---|---|
| B2.30 | Coverage i bramka | Bez zmian: `src/components/ui/**` jest wykluczone z powodem z B1.27 (prymitywy bez logiki, pokryte testami Storybooka w jobie `storybook`). Nowe komponenty nie mają rozgałęzień (ikona Alertu to obiekt `wariant → ikona`). Job `storybook` w CI istnieje od #104, bramka bez zmian | B1.27, B1.28; ⚠D1 |
| B2.31 | Testy `play` | Select: wybór opcji z klawiatury (`userEvent.selectOptions`, bo lista natywna nie otwiera się w Chromium bez okna) i wartość w `FormData`; Checkbox: kliknięcie etykiety, Spacja, `name` / `value` w `FormData`, `required` w prawdziwym `<form>`; Radio group: strzałki zmieniają wybór, Tab wchodzi raz; Alert: rola z propsa; Badge i Card: tylko a11y w obu motywach i obu gęstościach | prompt etap 2 („test interakcji w play function”) |

### Gdzie dziś są komponenty, co się zmieni na ekranie, ryzyko dla testów

| Komponent | Ekrany dziś | Co zmieni się wizualnie w partii 2 | Ryzyko dla testów |
|---|---|---|---|
| Select | brak komponentu; 3 natywne `<select>` z lokalnym `SELECT_CLASS`: formularz produktu (kategoria, status przy tworzeniu), filtr kategorii w wyszukiwarce katalogu | **brak** (B2.1) | brak; e2e `select("#product-status")` i `select("#catalog-search-category")` zostają ważne także po retroficie, bo element zostaje `<select>` |
| Checkbox | brak komponentu; 2 natywne: „Featured” w formularzu produktu (`accent-primary`), potwierdzenie przejścia statusu zamówienia (`required`) | **brak** | brak teraz; przy retroficie 2 e2e klikają po `id` (B2.8) |
| Radio group | brak komponentu; natywne radio w przełączniku motywu (stopka sklepu, menu admina) | **brak** (przełącznik bez zmian) | brak |
| Badge | admin: lista i szczegóły zamówień (status, DEMO), produkty (dostępność, Featured), podgląd importu CSV, dashboard (brak w magazynie), stan systemu, Copilot (priorytet, status rekomendacji, źródło odpowiedzi, dane demo); sklep: karta i strona produktu (dostępność), płatność demo i potwierdzenie zamówienia (status) | wszędzie: pigułka → prostokąt 4 px, `destructive` na `--destructive-surface`. Sklep: wysokość 20 → 24 px, tekst 12 → 14 px. Admin: 20 px i 12 px bez zmian. Warianty i klasy z miejsc użycia (`border-border`, `amber-*`) działają dalej, nowe warianty nie pojawiają się do retrofitu | **niskie:** unit sprawdzają tekst badge'a (`toContain`), nie klasy; e2e szukają tekstu. Karta produktu przy 390 px rośnie o 4 px wysokości |
| Alert | brak komponentu; ok. 25 komunikatów `<p role="alert|status|note">`: błędy stron sklepu i admina, `FormMessage`, `RedirectNotice`, pasek „Demo store”, notka płatności demo, notka zamówienia demo, ostrzeżenia slugu i draftu AI, `error.tsx` sklepu konta i admina | **brak** (B2.1) | brak |
| Card | sklep: logowanie i rejestracja klienta (`customer-auth-card`); logowanie admina (poza layoutem admina, więc gęstość sklepu); admin: dashboard (karty metryk), stan systemu, karta rekomendacji Copilota | sklep i logowanie admina: padding 16 → 24 px, tekst 14 → 16 px, tytuł 16 → 20–24 px / 600; admin: padding i tekst bez zmian, tytuł waga 500 → 600; wszędzie obrys `--border` zamiast półprzezroczystego pierścienia | **niskie:** e2e `storefront-mobile` i `admin-mobile` mierzą szerokość przy 390 px; karta logowania przy 320 px traci 16 px szerokości treści (pola `w-full`, bez przewijania). Sprawdzę 320 i 390 px przed commitem; znany problem tabeli dowodów Copilota przy 320 px zostaje (nie regresja) |

Stories partii (szacunek): Select 6, Checkbox 7, Radio group 6, Badge 6, Alert 7, Card 5, razem ok. 37, każda w obu motywach i obu gęstościach; strona MDX z 13 sekcjami dla każdego komponentu.

### Pytania partii 2

- **Q1 (B2.4):** Select natywny (`native-select` z rejestru, systemowa lista, działa bez JS) czy Base UI Select (własna lista w portalu, wymaga JS i stylów nakładki)? Rekomendacja: natywny.
- **Q2 (B2.8, B2.12):** Checkbox i Radio z Base UI (zgodnie z sekcją 3; przy retroficie 2 testy e2e zmienią selektor, a checkbox wymaga JS) czy natywne inputy ostylowane ręcznie? Rekomendacja: Base UI.
- **Q3 (B2.13):** Radio group budować teraz, mimo że dziś nikt go nie używa (przełącznik motywu zostaje natywny, spec A5), czy przenieść na stronę „What is missing”? Rekomendacja: budować teraz.
- **Q4 (B2.18):** Alert bez domyślnej roli (rolę `alert` / `status` / brak wybiera miejsce użycia) zamiast stałego `role="alert"` z bazy? Rekomendacja: tak.
- **Q5 (B2.1):** potwierdzasz, że partia 2 nie zmienia miejsc użycia (nowe warianty Badge, Select, Checkbox, Radio i Alert pojawią się na ekranach dopiero w retroficie, a na ekranie zmienią się tylko Badge i Card)? Rekomendacja: tak.

Usunięcia z bazy do Twojej zgody (zasada 12), przyjmowane razem z listą: rozmiar `sm` w Select (B2.5), wariant `link` w Badge (B2.16), `AlertAction` (B2.23).

### Decyzje właściciela (2026-10-24)

- **Q1:** Select natywny (`native-select`).
- **Q2:** Checkbox i Radio z Base UI.
- **Q3:** Radio group budujemy teraz; przełącznik motywu zostaje natywny.
- **Q4:** Alert bez domyślnej roli.
- **Q5:** partia 2 nie zmienia miejsc użycia; na ekranie zmieniają się tylko Badge i Card.
- **B2.1–B2.31:** przyjęte zgodnie z rekomendacjami, w tym trzy usunięcia z bazy (Select `sm`, Badge `link`, `AlertAction`).

## Etap 2, partia 4: różnice względem bazy (do akceptacji punkt po punkcie)

Partia: Dialog, Alert dialog, Menu, Popover. Baza: shadcn `base-nova` 4.21.4 na Base UI 1.9: `npx shadcn@4.21.4 view dialog alert-dialog dropdown-menu popover` (podgląd rejestru, bez instalacji) oraz typy i dokumentacja Base UI w `node_modules/@base-ui/react` (`dialog`, `alert-dialog`, `menu`, `popover`). Każdy punkt ma jedną rekomendację i źródło; **P** = moja propozycja, bo materiały milczą. Nic z tej listy nie jest jeszcze w kodzie. Decyzje partii 1–3 obowiązują dalej i nie powtarzam ich przy każdym komponencie: wysokość kontrolek z tokenów (B1.2), fokus jako `outline` 2 px z offsetem (B1.4), stany kolorami zamiast przezroczystości (B1.5), `aria-busy` w trakcie wysyłki (B1.6), bez `dark:` w komponentach (B1.11), poziom nagłówka daje miejsce użycia (B2.27), bez ikony na kolorowym tle (B3.20), Disclosure na natywnym `<details>` (B3.26).

Kontrast nowych par policzyłem skryptem tymczasowym poza repozytorium (`lib.mjs` i `tokens.mjs` z `.ai/design/kontrast/`, plus składanie półprzezroczystego tła na stronie funkcją `composite`) przed zapisaniem tej listy; wyniki są przy punktach. Pary trafią do `tokeny.md` §2 i `kontrast/tokens.mjs` razem z implementacją (zasada 19).

**Wniosek wstępny:** z czterech komponentów planu tylko **Alert dialog** ma dziś potwierdzone użycie (2 miejsca w retroficie). Menu nie ma żadnego, a jedyne planowane użycie Popovera (definicje metryk) łamie kontrakt specu. Szczegóły w inwentaryzacji niżej i w pytaniach Q1–Q3.

### Inwentaryzacja użyć (czy partia jest potrzebna w całości)

| Komponent | Plan etapu 0 | Stan w kodzie dziś (pliki i linie) | Wniosek |
|---|---|---|---|
| Dialog | „– (potrzebny dla potwierdzeń)” | brak użyć. Oba potwierdzenia z planu to dialog potwierdzenia (rola `alertdialog`), nie zwykły dialog. Admin pracuje na osobnych stronach (R04.1: index → szczegóły, formularz produktu, import CSV z podglądem na stronie) | **0 użyć**; budowa tylko jako baza anatomii i dla kryterium promptu „oba motywy działają, także w dialogach” (Q3) |
| Alert dialog | usunięcie kategorii, anulowanie zamówienia | **usunięcie kategorii:** `delete-category-view.tsx:52–60` (formularz z jednym przyciskiem `destructive` „Delete category”, `:56`), użyte w `categories/[id]/page.tsx:68`. Pusta kategoria znika **po jednym kliknięciu, bez potwierdzenia** (nieodwracalne; spec katalogu G1 potwierdzenia nie wymaga, odrzucił tylko dialog przy kategorii z produktami). **Anulowanie i zwrot zamówienia:** `order-status-form-view.tsx:60–80`, wymagany checkbox `#confirm-cancelled` / `#confirm-refunded` z treścią z `order-copy.ts:73–89`; spec zamówień, UI/UX „Cancel / refund confirmation”: serwer sprawdza `confirm=yes` jeszcze raz | **2 użycia w retroficie** (Q5, Q6) |
| Menu (akcje wiersza) | „do potwierdzenia w retroficie” | tabele admina mają w wierszu **dokładnie jedną akcję**: link do zasobu (`categories/page.tsx:73–84`, `products/page.tsx:76–94`, `orders/page.tsx:88–109`; po retroficie `TextLink` `resource`, B1.18). Wszystkie akcje obiektu są na stronie szczegółów (R04.1). Grupy przycisków w produkcie mają 2–3 widoczne akcje: rekomendacja Copilota (`recommendation-status-form-view.tsx:58–72`), draft opisu AI (`description-draft-panel-view.tsx:93–99`). Menu w nagłówku sklepu na telefonie (`header-menu.tsx:46–58`) to nawigacja z linkami, więc Disclosure (B3.26), nigdy rola `menu` | **0 użyć** (Q1) |
| Popover | definicje metryk na dashboardzie | definicje są widocznym tekstem w karcie: `dashboard-view.tsx:75` (`CardDescription`), komentarz `:42` „always visible (R05, orders spec UI/UX)”, definicja porównania `:188`; w Copilocie `<details>` (`copilot-answer-view.tsx:203–210`). Kontrakt: spec zamówień R05 i AC #23 („each metric shows its definition”), AGENTS.md („printed on `/admin`”), e2e `admin-dashboard.e2e.test.ts:35–44` czyta definicję z tekstu karty. Popover chowa tekst za kliknięciem i renderuje go w portalu, poza kartą: to ta sama zasada co przy Tooltipie (sekcja 5: informacja potrzebna do decyzji nie siedzi w nakładce). Panel menu sklepu na telefonie (B3.28 wspomina Popover) zostaje Disclosure, bo Popover wymaga JavaScriptu, a spec G13 nie | **0 poprawnych użyć** (Q2) |

### Wspólne dla partii

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B4.1 | Zakres zmian w kodzie aplikacji | Jak B1.1–B3.1: zmieniam tylko `src/components/ui/*`, dodaję `stories/primitives/` i dwie zmiany w `globals.css` (B4.5, B4.6). Nowe pliki przy rekomendowanych odpowiedziach na Q1–Q3: `alert-dialog.tsx`, `dialog.tsx` (Menu i Popover tylko, jeśli zdecydujesz inaczej). **Bez zmian w miejscach użycia**: usunięcie kategorii i potwierdzenie statusu zamówienia przechodzą na Alert dialog w retroficie (lekcja 08). Na ekranie **nic się nie zmienia**: partia nie rusza żadnego istniejącego komponentu, a nowy token i selektor gęstości działają tylko w nakładkach, których jeszcze nie ma | spec „Fazy” i A12, zasada 11 promptu; decyzje Q5 partii 1–2 i Q6 partii 3 |
| B4.2 | Wartości z bazy, które partie 1–3 już zastąpiły albo które łamią zasady: `bg-black/10` (klasa palety), `supports-backdrop-filter:backdrop-blur-xs` (szkło i rozmycie), `ring-1 ring-foreground/10`, `shadow-md`, `shadow-lg`, `rounded-xl` / `rounded-lg` / `rounded-md`, `max-w-[calc(100%-2rem)]`, `min-w-[96px]`, `p-4`, `p-2.5`, `p-1`, `px-1.5 py-1`, `gap-1.5`, `gap-2.5`, `gap-0.5`, `-mx-4 -mb-4`, `bg-muted/50`, `focus:bg-destructive/10`, `dark:data-[variant=destructive]:focus:bg-destructive/20`, `data-disabled:opacity-50`, `duration-100`, `text-sm`, `text-xs`, `tracking-widest`, `cn-font-heading`, `leading-none`, `IconPlaceholder` | Zamieniam według B1.4, B1.5, B1.8, B1.10, B1.11 i punktów niżej. Cel: `npm run check:tokens` nie znajduje nic w plikach partii | tokeny §3, §5; spec A10; prompt etap 4 „What to avoid” (szkło i rozmycie); zasada 3 promptu |
| B4.3 | Zależności i CLI | **Bez nowych zależności**: `@base-ui/react` 1.9.0 ma `dialog`, `alert-dialog`, `menu` i `popover`; animacje `animate-in` / `animate-out` z bazy pochodzą z `tw-animate-css` 1.4, który jest zainstalowany i importowany (`globals.css:2`); `@tabler/icons-react` i `cn` są. **Nie uruchamiam `npx shadcn add dialog alert-dialog`**: oba mają w rejestrze zależność `button`, więc CLI nadpisałby albo kazał nadpisać `ui/button.tsx` z partii 1. Oba pliki piszę ręcznie z wyniku `view` (jak `field` w partii 1), z `IconX` z Tablera zamiast `IconPlaceholder`. Gdyby Menu albo Popover wchodziły (Q1, Q2): `npx shadcn add dropdown-menu popover` (zależność tylko `cn`, pliki nie istnieją), potem przegląd `package.json`, `package-lock.json` i diffu (zasada 6) | zasada 6 promptu; AGENTS.md (biblioteki tylko z powodem); B1.22 |
| B4.4 | Powierzchnia nakładki: `bg-popover`, obrys `ring-1 ring-foreground/10` (przezroczystość), cień `shadow-md` / `shadow-lg` albo brak, promień `rounded-xl` (dialog) i `rounded-lg` (menu, popover) | `bg-popover text-popover-foreground`, obrys `border border-border`, cień `shadow-overlay` (jedyny cień w systemie). Promień: Dialog i Alert dialog `rounded-card` (12 px, tokeny §1c: „karta, panel, dialog”), Menu i Popover `rounded-control` (8 px, tokeny §1c: „dropdown”). Policzone: nakładka do strony 1,00 (jasny) / 1,19 (ciemny), do karty 1,00 / 1,10, obrys do nakładki 1,30 / 1,17 : 1, czyli w jasnym motywie granicę dają obrys i cień, w ciemnym jaśniejsze `--popover` i obrys (dekoracyjne, tokeny §5 to przewidują). Tekst: pary 5 i 11 już są (19,13 / 14,74 i 6,25 / 6,95 : 1) | tokeny §1b (`--popover`), §1c, §5 („jeden cień nakładki”, „w dark nakładka ma zawsze obrys”); P8; A01 podpis 4 |
| B4.5 | Tło pod dialogiem (`Backdrop`): `bg-black/10` z rozmyciem `backdrop-blur-xs`; tokeny nie mają takiej wartości | **Nowy token `--backdrop` (Q4)**: jasny `oklch(0.17 0.005 285 / 50%)` (grafit `gray-900`, ten sam odcień co tekst), ciemny `oklch(0 0 0 / 60%)`; bez rozmycia. Policzone (skład na stronie): jasny motyw, przy 50% strona ciemnieje do `#878788`, a biały dialog ma do niej **3,58 : 1** (przy 40%: 2,64, przy 30%: 2,00), więc krawędź dialogu jest widoczna także bez cienia; nad ramą i menu bocznym 18,4–19,1 : 1. Ciemny motyw, przy 60%: strona `#060607`, dialog 1,26 : 1, obrys 1,47 : 1 (strona już jest ciemna; dialog odróżnia jaśniejsze `--popover` i obrys, jak w B4.4). Tylko Dialog i Alert dialog; Menu i Popover bez tła | tokeny §5 (nakładki); prompt etap 4 „What to avoid” (szkło i rozmycie); zasady 1 i 3 promptu |
| B4.6 | Gęstość w portalu: aplikacja ustawia `data-density="admin"` na `<div>` w layoucie admina (`admin/(protected)/layout.tsx:16`), a Base UI renderuje nakładki w portalu w `<body>`, poza tym `div`. Dialog w adminie dostałby więc gęstość sklepu (przyciski 44 px, tekst 16 px). Storybook ustawia gęstość na `<html>` (`.storybook/preview.tsx:24`), więc testy stories tego nie zobaczą | **P:** w `globals.css` selektor gęstości admina obejmuje też dokument z admina: `[data-density="admin"], :root:has([data-density="admin"])` (także w dwóch blokach `@media` dla telefonu). Sklep i admin nigdy nie są na jednej stronie, więc to ta sama gęstość, a portale ją dziedziczą; komponenty bez zmian. `:has()` działa we wszystkich obsługiwanych przeglądarkach (Baseline 2023). Odrzucona alternatywa: prop `container` przy każdym portalu (każde miejsce użycia musiałoby pamiętać). Test: story z gęstością na `div` wokół wyzwalacza, a nie na `<html>`, z `play`, który mierzy wysokość przycisku w otwartym dialogu (32 px na desktopie) | tokeny §3 (gęstość), P15; spec A13; zasada 9 promptu (nakładki poza story dziedziczą ustawienia z elementu głównego) |
| B4.7 | Ruch: `duration-100` dla wszystkiego, wejście `fade-in-0 zoom-in-95` (dialog) albo `fade-in-0 zoom-in-95 slide-in-from-top-2` (menu, popover), wyjście symetryczne, `ease` domyślne | Dialog i Alert dialog: wejście `--duration-slow` (300 ms) z `--ease-out`, **P:** wyjście `--duration-base` (200 ms) z `--ease-in` (tokeny nie podają wyjścia dialogu); ruch z bazy (przezroczystość i skala 95 → 100%), tło tylko przezroczystość. Menu i Popover: wejście `--duration-base` (200 ms) z `--ease-out`; **P:** wyjście `--duration-fast` (120 ms) z `--ease-in`, bo tokeny §5 mówią „150 ms wyjście”, ale takiego tokenu nie ma (najbliższy istniejący zamiast nowej wartości). Przesunięcie 8 px od strony wyzwalacza zostaje. `prefers-reduced-motion`: istniejący blok w `globals.css` (sekcja „Reduced motion”) skraca animacje do 0,01 ms i `--duration-base` / `-slow` do 120 ms, czyli bez ruchu i bez długiego zanikania (tokeny §5: przezroczystość ≤ 120 ms). Sprawdzę ręcznie w Chromium (emulacja w DevTools); jeśli tryb przeglądarki Vitesta pozwala emulować media, dodam test, a jeśli nie, wpiszę to jako ograniczenie | tokeny §5 (P9, ruch i reduced motion); próg Doherty’ego 400 ms |
| B4.8 | Warstwa: `z-50` w bazie; menu sklepu na telefonie ma `z-10` (`header-menu.tsx:52`) | **P:** `z-50` dla wszystkich nakładek (wartość ze skali Tailwinda, nie arbitralna); bez tokenu `z-index`, bo jest jedna warstwa nakładek. Menu mobilne przechodzi na tę samą wartość przy retroficie ramy | tokeny (milczą); B3.28 |

### Dialog i Alert dialog

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B4.9 | Położenie i szerokość: `top-1/2 left-1/2 -translate-*`, `max-w-[calc(100%-2rem)]` (arbitralna), Dialog `sm:max-w-sm` (384 px), Alert dialog `max-w-xs` → `sm:max-w-sm`; brak limitu wysokości | Margines od krawędzi ekranu z tokenu: `inset-x-gutter` + `mx-auto` (16 px na telefonie, tokeny §3). **P:** Alert dialog `max-w-md` (448 px), Dialog `max-w-lg` (512 px); na każdej szerokości na środku ekranu, bez wysuwanego panelu od dołu (Drawer z Base UI jest poza planem, trafia do „What is missing”). Długa treść: wysokość ograniczona do okna minus 2 × gutter, przewija się treść, a nagłówek i przyciski zostają widoczne; technikę bez wartości arbitralnych potwierdzę przy implementacji (zrzut 320 × 568 px) | tokeny §3 (gutter, 320 px bez przewijania w bok); WCAG 1.4.10 |
| B4.10 | Odstępy: `p-4 gap-4`; stopka na pasie `-mx-4 -mb-4 border-t bg-muted/50 p-4`, przyciski `gap-2`, na telefonie w kolumnie (`flex-col-reverse`), od `sm` w wierszu do prawej | Padding `--space-panel` (24 px sklep, 16 px admin, jak Card, B2.26); między nagłówkiem, treścią i stopką `--space-group-item`; tytuł–opis `gap-1` (4 px, jak B2.26). **P:** stopka bez pasa i bez obrysu (pas to przezroczystość i „karta w karcie”). Przyciski: odstęp `--space-related`, od `sm` w wierszu do prawej, na telefonie w kolumnie na pełną szerokość z potwierdzeniem na górze (kolejność z bazy), każdy ≥ 44 px | tokeny §3, §7 zasady 14, 16; audyt Krok 1 (karta w karcie); R04.1 (akcje po prawej) |
| B4.11 | Tekst: tytuł `cn-font-heading text-base leading-none font-medium`, opis `text-sm text-muted-foreground` z własnym stylem linków (`*:[a]:underline`) | Tytuł styl `h2` (sklep 20–24 px / 600, admin 16 / 600, jak `CardTitle`, B2.27); Base UI renderuje go jako `<h2>`, co pasuje, bo dialog to osobny kontekst. Opis Dialog: `body` w `--muted-foreground` (dodatkowe objaśnienie, jak `CardDescription`). **Opis Alert dialog: `body` w `--foreground`**, bo niesie skutek potrzebny do decyzji („returns 1 item to stock”). Własny styl linków usuwam, link to `TextLink` (`--link` na `--popover`: 6,71 / 7,48 : 1, nowa para) | tokeny §1b (`--muted-foreground`: nie dla tekstu wymaganego do działania), §4; B1.18, B2.27; WCAG 1.3.1 |
| B4.12 | Zamknięcie Dialogu: przycisk X (`ghost`, `icon-sm`, `absolute top-2 right-2`, `showCloseButton` domyślnie `true`) i dodatkowy przycisk „Close” w stopce (`DialogFooter showCloseButton`) | X zostaje (Base UI: w trybie modalnym `Close` w środku nakładki pozwala wyjść użytkownikom czytnika na ekranie dotykowym): `IconX`, `size="icon-sm"` (28 px w adminie na desktopie, 44 px na telefonie), nazwa „Close” (`sr-only`), położenie wyrównane do paddingu. **Usuwam `showCloseButton` w `DialogFooter`** (drugie zamknięcie obok X i przycisku rezygnacji; przyciski stopki pisze się jawnie, z czasownikiem), co wymaga Twojej zgody. Alert dialog **bez X**: wybór jest jawny, a Escape działa jak „Cancel” | dokumentacja Base UI `DialogRoot.modal`; WAI-ARIA APG „Alert and Message Dialogs”; WCAG 2.5.8; zasada 12 promptu |
| B4.13 | Części Alert dialog: `AlertDialogMedia` (ikona na szarym kwadracie `bg-muted size-10`), rozmiar `size="sm"` (wyśrodkowany tekst, 2 przyciski w siatce), nagłówek wyśrodkowany na telefonie (`place-items-center text-center`) | **Usuwam `AlertDialogMedia` i `size="sm"`** (wymaga Twojej zgody): ikona na kolorowym tle to znak generycznego wyglądu (jak `EmptyMedia`, B3.20), a wyśrodkowanie to „wszystko wyśrodkowane” z „What to avoid”; 0 użyć. Nagłówek zawsze wyrównany do początku | audyt Krok 1; prompt etap 4 „What to avoid”; B3.20; zasada 12 promptu |
| B4.14 | Przyciski Alert dialog: `AlertDialogAction` = `Button` `default`, `AlertDialogCancel` = `outline` | Rezygnacja `outline` (obrys `--input` na `--popover` 3,66 / 3,31 : 1, nowa para). Potwierdzenie według znaczenia: `destructive` dla usunięcia i anulowania (tekst i obrys, nigdy wypełniony; `--destructive` na `--popover` 6,62 / 6,04 : 1, nowa para), `default` dla reszty (granica 17,71 / 13,01 : 1); **nigdy `action`** (czerwień tylko dla zakupu). Etykiety: czasownik i obiekt („Delete category”, „Cancel order”), nigdy „OK” ani „Yes”. **P:** rezygnacja nie może brzmieć jak akcja: przy „Cancel order” przycisk rezygnacji to „Keep order”, w pozostałych „Cancel” | prompt etap 3 („potwierdzenie usunięcia”), etap 4 „Content”; tokeny §7 zasady 2, 5, 12 |
| B4.15 | Fokus, Escape, klik w tło, blokada przewijania (Base UI 1.9, baza tego nie dokumentuje) | **Dialog:** `modal` (domyślnie): fokus uwięziony w środku, przewijanie strony zablokowane z kompensacją paska, reszta strony nieaktywna; Escape i klik w tło zamykają; fokus startuje na pierwszym elemencie, który go przyjmuje (w formularzu pierwsze pole), a po zamknięciu wraca na wyzwalacz. **Alert dialog:** to samo, ale klik w tło **nie** zamyka (stałe w Base UI), Escape zamyka jak „Cancel”; w DOM najpierw rezygnacja, potem potwierdzenie, więc fokus startuje na bezpieczniejszej opcji. Role z Base UI: `dialog` / `alertdialog`, nazwa z `Title` (`aria-labelledby`), opis z `Description` (`aria-describedby`); **P:** `Title` wymagany w obu, `Description` wymagany w Alert dialog. Gdy wyzwalacz znika po akcji (przekierowanie, odświeżenie strony), wynik ogłasza komunikat `role="status"` na stronie (już jest: `FormMessage`). Bez JavaScriptu wyzwalacz nic nie robi; oba użycia są w adminie, jak Checkbox z Base UI (B2.8) | WAI-ARIA APG „Dialog (Modal)” i „Alert and Message Dialogs”; dokumentacja Base UI (`modal`, `initialFocus`, `finalFocus`, powody zamknięcia `escape-key` / `outside-press`); WCAG 2.1.2, 2.4.3, 4.1.2 |
| B4.16 | Formularz z server action w dialogu (baza nie mówi; dotyczy retrofitu i dokumentacji „Usage”) | **P:** formularz w środku nakładki, `Root` niekontrolowany, więc widok zostaje bez hooków (AGENTS.md: widok + cienki wrapper z `useActionState`). Potwierdzenie `type="submit"` z `aria-busy` w trakcie (B1.6), rezygnacja wyłączona w trakcie, błąd z serwera w dialogu (`Alert` z rolą `alert`), sukces: przekierowanie (kategoria) albo odświeżenie z komunikatem na stronie (zamówienie). Ukryte pole `confirm=yes` w formularzu dialogu zachowuje kontrakt serwera ze specu zamówień | AGENTS.md „Security and validation” (formularze admina); spec zamówień UI/UX; B1.6, B2.18 |

### Menu i Popover (tylko jeśli Q1 / Q2 = budować)

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B4.17 | Menu (`dropdown-menu`, Base UI Menu): 15 eksportów (checkbox, radio, podmenu, skróty, `inset`), pozycja `px-1.5 py-1` (ok. 28 px), podświetlenie `focus:bg-accent`, `modal` domyślnie `true` (blokuje przewijanie strony), wyłączona `opacity-50` | Zostają `DropdownMenu`, `Trigger`, `Content`, `Item` (`default`, `destructive`), `Separator`, `Group` + `Label`. **Usuwam** `CheckboxItem`, `RadioGroup`, `RadioItem`, `Sub`, `SubTrigger`, `SubContent`, `Shortcut` i `inset` (0 użyć; to menu akcji). Pozycja `min-h-control-sm`, `px-3`, styl `body`, ikona `--control-icon-size`. **Podświetlenie z bazy jest w ciemnym motywie niewidoczne**: `--accent` = `--popover`, 1,00 : 1 (jasny 1,13 : 1, policzone), a podświetlenie to tu wskaźnik fokusu; **P:** tło `--accent` plus wewnętrzny `outline` 2 px `--ring` przy podświetleniu (13,01 / 19,13 : 1). Pozycja `destructive`: tekst `--destructive` (6,62 / 6,04 : 1), podświetlenie `--destructive-surface` (para 20). Wyłączona: `--muted-foreground`. **P:** `modal={false}`, wyzwalacz `Button` `ghost` `icon` z `IconDots` i nazwą „Actions for {nazwa}” | WAI-ARIA APG „Menu Button”; WCAG 2.4.7, 2.4.13, 1.4.11; tokeny §1b; zasada 12 promptu |
| B4.18 | Popover: `w-72`, `p-2.5 gap-2.5`, tytuł `font-medium`, opis `text-muted-foreground`, `modal` domyślnie `false`, opcjonalne otwieranie najechaniem (`openOnHover`) | Padding `--space-group-item`, odstęp `--space-related`, **P:** szerokość `w-max max-w-xs`; tytuł styl `h3`, opis `body` w `--muted-foreground`; `modal={false}`; Escape i klik obok zamykają, fokus wraca na wyzwalacz. Wyzwalacz to przycisk z widocznym tekstem, **bez** `openOnHover` (treść znikająca po zjechaniu kursorem łamie WCAG 1.4.13). Zasada w dokumentacji: nigdy treść potrzebna do decyzji (definicje metryk R05, cena, błąd) | WCAG 1.4.13, 2.1.1; spec zamówień R05; sekcja 5 (Tooltip poza zakresem) |

### Testy, coverage i CI

| # | Różnica | Rekomendacja | Źródło |
|---|---|---|---|
| B4.19 | Coverage, bramka i tokeny | Bez zmian w bramce: `src/components/ui/**` wykluczone z powodem z B1.27; nowe komponenty bez rozgałęzień poza domyślnymi propsami. Job `storybook` bez zmian. Nowe pary w `tokeny.md` §2 i `kontrast/tokens.mjs`: `--destructive` na `--popover` (tekst i obrys), `--input` na `--popover`, `--ring` na `--popover` (19,13 / 13,01 : 1), `--primary` na `--popover`, `--link` na `--popover`; tło `--backdrop` z wynikami składu w notce pod tabelą (dekoracyjne). `verify-css.mjs` sprawdzi `--backdrop` w obu motywach | B1.27, B2.30, B3.29; zasada 19 |
| B4.20 | Testy `play` | Alert dialog: otwarcie kliknięciem i Enterem, fokus na „Cancel”, Tab krąży w środku, Escape zamyka i oddaje fokus wyzwalaczowi, klik w tło **nie** zamyka, rola `alertdialog` z nazwą i opisem, potwierdzenie wysyła `FormData` z `confirm=yes` w prawdziwym `<form>`. Dialog: Escape, klik w tło i X zamykają, fokus wraca, przewijanie strony zablokowane w trakcie. Gęstość admina w portalu (B4.6). a11y w obu motywach (portal dziedziczy `.dark` z `<html>`, zasada 9) i obu gęstościach. Menu / Popover, jeśli wchodzą: strzałki, Home / End, wyszukiwanie po literze, Enter wykonuje akcję, Escape oddaje fokus | prompt etap 2 („test interakcji w play function”), etap 5 („nakładki”) |

### Gdzie dziś są komponenty, co się zmieni na ekranie, ryzyko dla testów

| Komponent | Ekrany dziś | Co zmieni się wizualnie w partii 4 | Ryzyko dla testów |
|---|---|---|---|
| Dialog | brak | **brak** | brak |
| Alert dialog | usunięcie kategorii (jeden klik, bez potwierdzenia); anulowanie i zwrot zamówienia (wymagany checkbox) | **brak** (B4.1) | brak teraz. Przy retroficie: `admin-categories.e2e.test.ts:69,98` (drugi klik „Delete category” w dialogu; wyzwalacz i potwierdzenie mają tę samą nazwę, ale strona pod dialogiem jest nieaktywna, więc `clickRole` powinno trafić w dialog; sprawdzę), `admin-orders.e2e.test.ts:144` (`#confirm-cancelled` znika), unit `order-components.test.ts:159–170` (regex checkboxa) i `category-components.test.ts:196,245`. Zamknięty dialog nie jest w HTML renderowanym przez testy widoków (portal niezamontowany), więc testy widoku sprawdzają wyzwalacz, a treść dialogu Storybook i e2e |
| Menu | brak (0 akcji wiersza) | **brak** | brak |
| Popover | definicje metryk jako widoczny tekst | **brak** | brak; gdyby definicje przeszły do Popovera, `admin-dashboard.e2e.test.ts:35–44` by padł (definicji nie ma w karcie), co potwierdza Q2 |

Stories partii (szacunek): Alert dialog 7, Dialog 5, razem ok. 12 (z Menu i Popoverem ok. 23), każda w obu motywach i obu gęstościach; strona MDX z 13 sekcjami dla każdego komponentu.

### Pytania partii 4

- **Q1 (Menu):** nie budować Menu teraz i wpisać je na stronę „What is missing” (dziś 0 akcji wiersza: każdy wiersz ma jeden link, akcje są na stronie szczegółów, R04.1; menu w nagłówku to nawigacja, nie rola `menu`), z warunkiem powrotu: ta sama potrzeba w co najmniej dwóch miejscach (prompt „Contributing”), np. 3+ akcje drugorzędne na jednym obiekcie? Rekomendacja: tak, nie budować.
- **Q2 (Popover):** potwierdzasz, że definicje metryk zostają widocznym tekstem w karcie (spec zamówień R05, AC #23, AGENTS.md), a Popover bez innego użycia (panel menu na telefonie zostaje Disclosure bez JS, G13) trafia na „What is missing”? Rekomendacja: tak, oba.
- **Q3 (Dialog):** budować Dialog teraz razem z Alert dialog, mimo 0 użyć (ta sama anatomia i style co Alert dialog, kryterium promptu „oba motywy w dialogach”, strona „How to choose”: dialog, dialog potwierdzenia czy osobna strona; precedens: Radio group, Q3 partii 2), czy wpisać na „What is missing”? Rekomendacja: budować.
- **Q4 (B4.5):** nowy token `--backdrop` (jasny `gray-900` / 50%, ciemny czarny / 60%, bez rozmycia); to zmiana `tokeny.md`. Rekomendacja: tak.
- **Q5 (retrofit, B4.16):** anulowanie i zwrot zamówienia: Alert dialog zamiast wymaganego checkboxa (jeden wzorzec potwierdzenia z kategorią; ukryte `confirm=yes` zostawia kontrakt serwera; zmiana wiersza UI/UX w specu zamówień, 1 e2e i 1 test unit), czy checkbox zostaje (działa bez JS, spec bez zmian), a Alert dialog tylko przy kategorii? Rekomendacja: Alert dialog w obu.
- **Q6 (retrofit):** usunięcie pustej kategorii dostaje Alert dialog („Delete category {nazwa}?”, rezygnacja „Cancel”), choć dziś i według specu G1 usuwa się jednym kliknięciem? Rekomendacja: tak (nieodwracalne; wzorzec „potwierdzenie usunięcia” z promptu).
- **Q7 (B4.1):** potwierdzasz, że partia 4 nie zmienia miejsc użycia i niczego na ekranie (nowy token i selektor gęstości działają tylko w nakładkach)? Rekomendacja: tak.

Usunięcia do Twojej zgody (zasada 12), przyjmowane razem z listą: `showCloseButton` w `DialogFooter` (B4.12), `AlertDialogMedia` i `size="sm"` w Alert dialog (B4.13), rozmycie tła (B4.5); z planu etapu 2: Menu (Q1) i Popover (Q2). Gdyby Menu wchodziło: `CheckboxItem`, `RadioGroup`, `RadioItem`, `Sub*`, `Shortcut`, `inset` (B4.17). Nie uruchamiam `npx shadcn add dialog alert-dialog` (B4.3).

### Decyzje właściciela (2026-10-25)

- **Q1: odrzucone, zmiana właściciela.** Właściciel chce menu, najlepiej **megamenu**: nawigację kategorii w nagłówku sklepu (Base UI `NavigationMenu`, shadcn `navigation-menu`), a nie menu akcji z rolą `menu`. Interpretacja: Menu akcji (B4.17) zostaje poza partią (0 akcji wiersza, jak w inwentaryzacji) i trafia na „What is missing”; zamiast niego partia dostaje komponent **Navigation menu (megamenu)**. Różnice względem bazy i pytania: punkty B4.21 i dalsze w sekcji „Navigation menu (megamenu)” niżej; przyjęte domyślnie według rekomendacji, właściciel może je zawetować w review PR (praktyka z partii 1).
- **Q2:** definicje metryk zostają widocznym tekstem w karcie; Popover trafia na „What is missing”.
- **Q3:** Dialog budujemy teraz razem z Alert dialog.
- **Q4:** nowy token `--backdrop` (jasny `gray-900` / 50%, ciemny czarny / 60%, bez rozmycia).
- **Q5 (retrofit):** anulowanie i zwrot zamówienia dostają Alert dialog zamiast wymaganego checkboxa; ukryte `confirm=yes` zostaje.
- **Q6 (retrofit):** usunięcie kategorii dostaje Alert dialog.
- **Q7:** partia 4 nie zmienia miejsc użycia (dotyczy też megamenu: nagłówek sklepu przechodzi na nie w retroficie).
- **B4.1–B4.16, B4.18–B4.20:** przyjęte zgodnie z rekomendacjami. B4.17 (Menu akcji) nie wchodzi (Q1). B4.18 (Popover) dotyczy tylko zapisu na „What is missing” (Q2).
- **Usunięcia z bazy przyjęte:** `showCloseButton` w `DialogFooter`, `AlertDialogMedia`, `size="sm"` w Alert dialog, rozmycie tła; z planu etapu 2: Popover. Menu akcji wypada z planu (Q1), na jego miejsce wchodzi Navigation menu.

## Następny krok

Review i merge PR partii 2 przez właściciela (gałąź `design/stage-2-batch-2`); potem partia 3 etapu 2: lista różnic do akceptacji.
