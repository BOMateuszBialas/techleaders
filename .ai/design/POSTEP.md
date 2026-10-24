# Postęp: design system CommerceOS (prompt Storybooka, lekcja 06)

- Prompt: `storybook-devmentor.txt` z lekcji 06, kontekst DevMentora podmieniony na CommerceOS. Baza komponentów: **shadcn/ui `base-nova` na Base UI** (nie Radix).
- Spec: `.ai/specs/2026-10-24-design-system.md` (zakres, kolejność PR-ów, zależności, coverage, CI, otwarte decyzje ⚠D1–⚠D5).
- Kontynuacja w nowej sesji: przeczytaj prompt, spec i ten plik, potem idź od „Następny krok”. Zasady promptu (12) obowiązują dalej.

## Stan etapów

| Etap | Stan | Gdzie |
|---|---|---|
| 0. Inwentaryzacja i plan | **zakończony** 2026-10-24 | ten plik, spec |
| 1. Fundamenty | **zmergowany** (PR #99); pełna bramka zielona | log `.ai/runs/2026-10-24-design-system-stage-1.md` |
| 2. Komponenty bazowe | **w toku:** partia 1, lista różnic względem bazy czeka na akceptację (gałąź `design/stage-2-batch-1`) | sekcja „Etap 2, partia 1” niżej; log `.ai/runs/2026-10-24-design-system-stage-2-batch-1.md` |
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

Pytania 2–5 z sekcji 2 (pytanie 1, ⚠D1–⚠D5, rozstrzygnięte) i pytania Q1–Q5 partii 1 (sekcja „Etap 2, partia 1”).

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

## Następny krok

Akceptacja listy B1.1–B1.28 i odpowiedzi na Q1–Q5. Potem implementacja partii 1 w `design/stage-2-batch-1`: komponenty, stories z 13 sekcjami, job `storybook` w CI, pełna bramka, zrzuty 320 / 768 / 1440 px w obu motywach, PR.
