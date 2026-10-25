# Postęp: design system CommerceOS (prompt Storybooka, lekcja 06)

- Prompt: `storybook-devmentor.txt` z lekcji 06, kontekst DevMentora podmieniony na CommerceOS. Baza komponentów: **shadcn/ui `base-nova` na Base UI** (nie Radix).
- Spec: `.ai/specs/2026-10-24-design-system.md` (zakres, kolejność PR-ów, zależności, coverage, CI, otwarte decyzje ⚠D1–⚠D5).
- Kontynuacja w nowej sesji: przeczytaj prompt, spec i ten plik, potem idź od „Następny krok”. Zasady promptu (12) obowiązują dalej.

## Stan etapów

| Etap | Stan | Gdzie |
|---|---|---|
| 0. Inwentaryzacja i plan | **zakończony** 2026-10-24 | ten plik, spec |
| 1. Fundamenty | **zmergowany** (PR #99); pełna bramka zielona | log `.ai/runs/2026-10-24-design-system-stage-1.md` |
| 2. Komponenty bazowe | **w toku:** partie 1 i 2 zmergowane (PR #104, #106); partia 3: lista różnic czeka na decyzje właściciela (gałąź `design/stage-2-batch-3`, bez implementacji); partia 4 nie rozpoczęta | sekcje „Etap 2, partia 1”, „Etap 2, partia 2” i „Etap 2, partia 3” niżej; logi `.ai/runs/2026-10-24-design-system-stage-2-batch-1.md`, `.ai/runs/2026-10-24-design-system-stage-2-batch-2.md`, `.ai/runs/2026-10-25-design-system-stage-2-batch-3.md` |
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

Pytania 2–5 z sekcji 2 (pytanie 1, ⚠D1–⚠D5, rozstrzygnięte) i pytania Q1–Q6 partii 3 (sekcja „Etap 2, partia 3”). Pytania partii 1 i 2 są rozstrzygnięte.

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

## Etap 2, partia 3: różnice względem bazy (do akceptacji punkt po punkcie)

Partia: Table, Tabs, Skeleton, Empty state, Error state, Disclosure. Baza: shadcn `base-nova` 4.21.4 na Base UI 1.9: `ui/table.tsx` w stanie z rejestru (etapy 1–2 go nie ruszały; `npx shadcn view table` daje identyczną treść) oraz `npx shadcn view tabs skeleton empty collapsible accordion spinner` (podgląd rejestru, bez instalacji). Rejestr nie ma komponentu stanu błędu. Każdy punkt ma jedną rekomendację i źródło; **P** = moja propozycja, bo materiały milczą. Nic z tej listy nie jest jeszcze w kodzie. Decyzje partii 1 i 2 obowiązują dalej i nie powtarzam ich przy każdym komponencie: wysokość kontrolek z tokenów (B1.2), promień 8 px (B1.3), fokus jako `outline` 2 px z offsetem 2 px (B1.4), stany kolorami zamiast przezroczystości (B1.5), bez `dark:` w komponentach (B1.11), Alert bez domyślnej roli (B2.18), poziom nagłówka daje miejsce użycia (B2.27).

Kontrast nowych par policzyłem skryptem tymczasowym poza repozytorium (`lib.mjs` i `tokens.mjs` z `.ai/design/kontrast/`) przed zapisaniem tej listy; wyniki są przy punktach. Pary trafią do `tokeny.md` §2 i `kontrast/tokens.mjs` razem z implementacją (zasada 19). Partia nie potrzebuje nowych tokenów.

### Wspólne dla partii

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B3.1 | Zakres zmian w kodzie aplikacji | Jak B1.1 i B2.1: zmieniam tylko `src/components/ui/*` i dodaję `stories/primitives/`. Nowe pliki: `tabs.tsx`, `skeleton.tsx`, `empty.tsx`, `disclosure.tsx` i `error-state.tsx` (jeśli Q4 = tak); zmiana w `table.tsx`. **Bez zmian w miejscach użycia**: 3 nawigacje w formie zakładek, 24 fallbacki `<Suspense>`, 13 pustych stanów, ok. 14 komunikatów błędu strony, 2 `<details>`, 5 stron „not found” i 2 `error.tsx` to retrofit (lekcja 08). Na ekranie zmieni się tylko Table (10 tabel w 9 plikach), przez wspólne style | spec „Fazy” i A12, zasada 11 promptu; decyzje Q5 partii 1 i 2 |
| B3.2 | Wartości z bazy, które partie 1–2 już zastąpiły, wracają z nowymi plikami: `focus-visible:ring-[3px] ring-ring/50` i `outline-1`, `disabled:opacity-50`, `aria-disabled:opacity-50`, `dark:*` (6 klas w `tabs`), `p-[3px]`, `h-[calc(100%-1px)]`, `bottom-[-5px]`, `rounded-md` (6,4 px), `rounded-xl`, `gap-1.5`, `gap-2.5`, `px-1.5 py-0.5`, `shadow-sm`, `bg-muted/50`, `text-foreground/60`, `transition-all`, `text-sm`, `cn-font-heading`, `max-w-sm` | Zamieniam je według B1.4, B1.5, B1.8, B1.10, B1.11 we wszystkich plikach partii. Cel: `npm run check:tokens` nie znajduje nic w plikach partii | tokeny §3, §5; spec A10 |
| B3.3 | Zależności i CLI | **Bez nowych zależności**: `@base-ui/react` 1.9 ma `tabs` (sprawdzone w typach), `@tabler/icons-react`, `class-variance-authority` i `cn` są zainstalowane. W `packages/app` worktree (po `npm ci`) uruchamiam `npx shadcn add tabs skeleton empty`: rejestr podaje tylko zależność `cn`, żaden z 3 plików jeszcze nie istnieje, więc nic nie zostanie nadpisane. **Nie uruchamiam:** `add table` (nadpisałby plik tą samą treścią), `add collapsible` i `add accordion` (Q5), `add spinner` (bez spinnera, B1.6, tokeny §5: bez pętli). `disclosure.tsx` i `error-state.tsx` piszę ręcznie (rejestr ich nie ma albo nie pasuje, Q4, Q5). Po komendzie sprawdzam `package.json`, `package-lock.json` i diff (zasada 6) | zasada 6 promptu; AGENTS.md (biblioteki tylko z powodem) |

### Table

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B3.4 | `table.tsx` ma dyrektywę `"use client"`, choć nie używa hooków ani zdarzeń | Usuwam dyrektywę: tabela renderuje się na serwerze razem ze stroną (wszystkie 9 miejsc użycia to Server Components albo widoki bez stanu), mniej JavaScriptu w przeglądarce. To nie usuwa żadnej części ani wariantu | AGENTS.md „Server Components by default”; dokumentacja Next 16 (`'use client'` wyznacza granicę klienta) |
| B3.5 | Gęstość i tekst: nagłówek `h-10 px-2` (40 px), komórka `p-2` (wiersz ok. 36 px), `text-sm` w każdym kontekście, nagłówek bez tła, `font-medium text-foreground` | Komórka i nagłówek `px-3 py-3` (siatka 4 px): wiersz **44 px w adminie** (20 px linii + 24), 48 px w sklepie (konto klienta: 24 + 24). Tekst styl `body` (admin 14/20 jak dziś, sklep 16/24). Nagłówek na `--muted` (tokeny §1b: „nagłówek tabeli”), tekst `--foreground` 500 (para 4: 17,27 / 14,74 : 1), obrys dolny `--border` (dekoracyjny, 1,17 : 1 do `--muted`, policzone). **P:** nagłówek w rozmiarze komórki, nie w stylu `small` (12 px w adminie), z tego samego powodu co etykieta w Q3 partii 1 | tokeny §1b, §3 („wiersz tabeli 44 px”), §4; R04.1 (gęste tabele, nagłówek `#f7f7f7`), R04.3 |
| B3.6 | Liczby: baza nic nie mówi; dziś 8 z 10 tabel ustawia `text-right tabular-nums` w każdej kolumnie liczbowej osobno, a lista produktów (`products/page.tsx:85,88`) ma tylko `text-right`, więc ceny i stany nie są wyrównane w cyfrach | `tabular-nums` na całym `<table>` (cyfry w tekście nic nie tracą). Wyrównanie do prawej zostaje w miejscu użycia (`text-right` na kolumnie liczbowej i jej nagłówku), jako zasada w dokumentacji „liczby i kwoty do prawej, tekst do lewej”. **P:** bez nowego propsa `align` (wariant spoza planu) | tokeny §1c (`--font-sans` + `tabular-nums` dla cen), P13; zasada 6 promptu |
| B3.7 | Zawijanie: `whitespace-nowrap` w każdej komórce i nagłówku; 5 z 9 miejsc użycia nadpisuje to `whitespace-normal` (często z `wrap-anywhere`), żeby tabela zmieściła się przy 390 px (`account-orders-view.tsx:80,88`, `copilot-answer-view.tsx:63,72,73`, `dashboard-view.tsx:244`, `product-import-view.tsx:194–200`, `products/import/page.tsx:63`) | **P:** nagłówek zostaje `whitespace-nowrap`, komórki zawijają się domyślnie (`whitespace-normal wrap-break-word`). Nadpisania w miejscach użycia stają się zbędne (sprzątanie w retroficie). Na ekranie: długie nazwy produktów i kategorii w adminie zawijają się zamiast wypychać tabelę w bok | audyt Krok 2 (przewijanie w poziomie), znany problem tabeli dowodów Copilota przy 320 px (partia 2); tokeny §7 zasada 16 |
| B3.8 | Stany wiersza: `hover:bg-muted/50`, `has-aria-expanded:bg-muted/50` (przezroczystość), `data-[state=selected]:bg-muted` (atrybut Radix; Base UI i aplikacja go nie ustawiają) | **P:** bez podświetlenia wiersza w hover, bo wiersz nie jest klikalny (klikalna jest tylko nazwa zasobu, `TextLink` `resource` z własnym hover, B1.18); kolor w adminie tylko dla znaczenia. **Usuwam** style `selected` i `expanded` (0 użyć). Wybór wierszy (checkbox w wierszu, akcje zbiorcze) trafia do „What is missing”. Usunięcie z bazy wymaga Twojej zgody | R04.2, tokeny §7 zasady 4 i 14; zasada 12 promptu |
| B3.9 | `TableFooter` `bg-muted/50 font-medium`, `TableCaption` `mt-4 text-sm text-muted-foreground` | Stopka: `bg-muted`, 500, `border-t` (0 użyć, zostaje jak `CardFooter`, B2.28). Podpis: `mt-group-item type-small text-muted-foreground`, pod tabelą jak w bazie. Zasada w dokumentacji: każda tabela ma nazwę (`TableCaption`, także `sr-only`, albo `aria-label`); dziś bez nazwy jest tylko tabela kategorii (`categories/page.tsx:62`, retrofit) | WCAG 1.3.1; B2.28 |
| B3.10 | Szeroka tabela na telefonie: kontener `overflow-x-auto` bez `tabIndex`; region przewijany bez elementu z fokusem jest niedostępny z klawiatury (axe `scrollable-region-focusable`) | Kontener zostaje. **P:** bez automatycznego `tabIndex` (dodawałby przystanek Tab także wtedy, gdy nic się nie przewija). Zasada w dokumentacji: tabela szersza niż ekran ma link w każdym wierszu, a na telefonie wzorzec listy daje karty zamiast tabeli (tokeny §3, retrofit). Story przy 320 px z testem a11y pilnuje reguły. Padding `px-3` zostawia miejsce na pierścień fokusu linku w pierwszej kolumnie (offset 2 px nie jest ucinany przez kontener) | WCAG 2.1.1; tokeny §3 („lista kart zamiast tabeli”), §5 |

### Tabs

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B3.11 | Baza to Base UI Tabs (`role="tablist"`, strzałki, panele w tej samej stronie, `"use client"`). Wszystkie 3 dzisiejsze „zakładki” to nawigacja między adresami: „Featured categories” (`featured-products.tsx:11–31`, spec G11), kategorie w katalogu (`category-nav.tsx:35–47`) i okres na dashboardzie (`dashboard-view.tsx:152–165`), wszystkie jako linki z `aria-current="page"`, działające bez JavaScriptu | **Dwie formy w jednym pliku (Q1):** `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` z rejestru (Base UI) dla przełączania treści na tej samej stronie, oraz **`TabsNav` + `TabsNavLink`** (`<nav>` + `next/link` + `aria-current="page"`) dla przełączania widoku przez adres. Obie dzielą `tabsTriggerVariants`, więc wyglądają tak samo. Odrzucona alternatywa: linki z rolą `tab` (WAI-ARIA APG: zakładki to nie nawigacja; czytnik ogłosiłby panel, którego nie ma). Mapowanie w retroficie: „Featured” → `TabsNav`; kategorie w katalogu zostają filtrem w kształcie przycisku (P4); okres na dashboardzie → decyzja retrofitu (`TabsNav` albo Radio group, plan etapu 0) | WAI-ARIA APG „Tabs”; audyt (treść bez JS); spec G11; P4 |
| B3.12 | Warianty bazy: `default` (szary tor `bg-muted p-[3px]`, aktywna zakładka biała z `shadow-sm`) i `line` (podkreślenie `after:` 2 px) | **Jeden wygląd = `line` (Q2):** lista z obrysem dolnym `--border` (dekoracyjny), zakładka tekstem `--muted-foreground` (6,25 / 8,28 : 1 na tle; 6,25 / 7,67 : 1 w karcie), aktywna `--foreground` i podkreślenie 2 px `--foreground` (19,13 / 17,57 : 1 do tła, 19,13 / 16,27 : 1 w karcie, policzone), czyli stan także kształtem, nie tylko kolorem. Bez czerwieni (to nie akcja zakupu), bez cienia i bez toru. **Usuwam `default`** (cień na elemencie innym niż nakładka; przełącznik segmentowy jest już na stronie „What is missing”, B2.13), co wymaga Twojej zgody | tokeny §1b (kreska jako znacznik aktywnej pozycji: `--frame-accent`, `--sidebar-primary`), §7 zasady 2, 4, 8, 10; A01 (podpis 4); WCAG 1.4.1, 1.4.11; zasada 12 promptu |
| B3.13 | Gęstość: tor `h-8`, zakładka `h-[calc(100%-1px)] px-1.5 py-0.5 gap-1.5`, `text-sm font-medium`, ikona `size-4`; lista `w-fit` | Zakładka `h-control-md` (44 px sklep, 32 px admin, 44 px telefon), padding `--control-px`, tekst `body` 500 we wszystkich stanach (**P:** aktywna nie zmienia grubości, żeby szerokość nie skakała), ikona `--control-icon-size`, ikona–tekst `--space-related`. **P:** przy wąskim ekranie lista się zawija (`flex-wrap`, jak dzisiejsze „Featured”), zamiast przewijać w bok: nic nie jest ukryte i nie trzeba JavaScriptu (audyt: karuzela ucina treść bez wskazówki) | tokeny §3, §4, §6; WCAG 2.5.8; audyt Krok 2 |
| B3.14 | Stany: fokus `ring-[3px] ring-ring/50` + `outline-1`, hover `text-foreground`, wyłączona `opacity-50`, panel `outline-none text-sm`, odstęp lista–panel `gap-2`; Base UI 1.9 domyślnie aktywuje zakładkę dopiero Enterem lub Spacją (`activateOnFocus: false`) | Fokus `outline` z offsetem (B1.4); hover: tekst `--foreground`, bez tła; wyłączona: `--muted-foreground` bez podkreślenia, `cursor-not-allowed`, a w dokumentacji „nie wyłączaj zakładki, ukryj ją albo wyjaśnij w panelu” (0 użyć). Panel: **ma** widoczny fokus (Base UI daje mu `tabIndex=0`, gdy nie ma w nim elementu z fokusem), tekst `body`, odstęp `--space-group`. **P:** `activateOnFocus` domyślnie `true` (aktywacja automatyczna, bo panele są już w DOM, nic się nie doładowuje) | B1.4, B1.5; WAI-ARIA APG „Tabs” (aktywacja automatyczna, gdy panel jest od razu dostępny) |
| B3.15 | Baza ma style orientacji pionowej (`group-data-vertical/tabs:*`, `after:-right-1`) | **Usuwam** style pionowe (0 użyć, menu admina to osobna rama); komponent tylko poziomy. Usunięcie z bazy wymaga Twojej zgody | zasada 12 promptu; R04.1 (nawigacja admina to menu boczne, nie zakładki) |

### Skeleton

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B3.16 | Kształt i kolor: `animate-pulse rounded-md bg-muted` (6,4 px poza skalą) | Domyślnie `rounded-control` (8 px), dla kart i kafli `rounded-card` (12 px) przez `className`; kolor `--muted` zostaje (tokeny §1b: „skeleton”). Szkielet kafla produktu ma tło `--surface-product` (kształt tego, co się wczyta, R01.3). Policzone, wszystkie dekoracyjne: `--muted` do tła 1,10 / 1,19 : 1, do `--card` 1,10 / 1,10 : 1, do `--surface-product` **1,00** / 1,10 : 1 (w jasnym motywie ten sam kolor), stąd zasada: szkielet nie stoi na karcie produktu, tylko zastępuje cały kafel. Próg 3 : 1 nie dotyczy, bo stan ładowania niesie tekst dla czytnika (B3.18) | tokeny §1b, §5; R01.3; K4 |
| B3.17 | Ruch: `animate-pulse` (pętla 2 s) | Zostaje: to jedyny dozwolony wyjątek od „bez pętli”; przy `prefers-reduced-motion` globalna reguła w `globals.css` już go zatrzymuje (sprawdzę w Storybooku). Bez spinnera (B1.6) | tokeny §5 |
| B3.18 | Dostępność: baza nie daje nic. Dziś 9 z 11 fallbacków sklepu kładzie `aria-label` na `div` bez roli (np. `cart/page.tsx:45`, `checkout/page.tsx:34`, `products/[slug]/page.tsx:83`, `customer-auth-card.tsx:45`); na roli `generic` ARIA 1.2 zabrania nazwy, więc czytnik nic nie ogłasza. Dwa nazywają listę pustych `li` (`products/page.tsx:62`, `page.tsx:72`). Admin ma 13 fallbacków tekstowych („Loading…” ×10, „Checking…” ×3, np. `orders/page.tsx:47`) | Każdy `Skeleton` ma `aria-hidden="true"`. **Nowa część `SkeletonGroup` (Q3):** `<div role="status">` z ukrytym tekstem z propsa `label` (np. „Loading products…”) i szkieletami w środku. Jeden wzorzec ładowania w sklepie i w adminie (przejście fallbacków to retrofit) | WAI-ARIA 1.2 (rola `generic` bez nazwy, `status`); WCAG 4.1.3; audyt decyzja 5 („szkielet, a nie raz szkielet, a raz Loading…”) |
| B3.19 | Rozmiar: baza nie ma wariantów | **P:** bez wariantów; rozmiar z tokenów tego, co szkielet zastępuje (`h-control-md` dla przycisku i pola, `h-lh` dla linii tekstu, `aspect-square` dla zdjęcia). Przepisy w dokumentacji i stories: linie tekstu, kafel produktu, wiersze tabeli, karta | zasada 6 promptu; tokeny §3, §4 |

### Empty state

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B3.20 | Części bazy (`empty`): `Empty`, `EmptyHeader`, `EmptyMedia` (warianty `default` i `icon`: ikona na kwadracie `bg-muted rounded-lg size-8`), `EmptyTitle`, `EmptyDescription`, `EmptyContent` | Nazwy z bazy zostają (strona Storybooka „Empty state”). **Usuwam `EmptyMedia`** z oboma wariantami, co wymaga Twojej zgody: ikona na kolorowym tle przy nagłówku to znak generycznego wyglądu z audytu, a produkt nie ma ikon dekoracyjnych | audyt Krok 1 („ikony na kolorowym tle przy nagłówkach”); tokeny §6 („bez ikon dekoracyjnych”); zasada 12 promptu |
| B3.21 | Układ: wyśrodkowany (`items-center text-center text-balance`), `border-dashed` bez szerokości (obrys niewidoczny), `rounded-xl p-6 gap-4`, `max-w-sm` | **P:** wyrównanie do początku, jak wszystkie 13 dzisiejszych pustych stanów (np. `cart-summary.tsx:31`, `catalog-results.tsx:47`); tło `--muted` (tokeny §1b: „tło stanu pustego”), `rounded-card`, bez obrysu, padding `--space-panel`, odstęp grup `--space-group-item`, w nagłówku `--space-related`, tekst najwyżej `--measure-prose`. Kontrast na `--muted`: tytuł 17,27 / 14,74 : 1 (para 4), opis 5,65 / 6,95 : 1 (para 9), link 6,06 / 7,48 : 1 (para 23), obrys przycisku `outline` 3,30 / 3,31 : 1 (para 40), przycisk `default` 15,99 / 13,01 : 1 (nowa para, policzona). Kontrola: `--action` na `--muted` w ciemnym motywie **2,98 : 1**, więc w pustym stanie nie ma czerwonego przycisku (zgodnie z zasadą 2: pusty stan nie jest krokiem zakupu) | tokeny §1b, §3, §7 zasada 2; prompt etap 4 „What to avoid” („wszystko wyśrodkowane”); WCAG 1.4.11 |
| B3.22 | Tekst: tytuł `cn-font-heading text-sm font-medium`, opis `text-sm/relaxed text-muted-foreground` z własnym stylem linków (`[&>a]:underline`, hover `text-primary`), akcje `gap-2.5` (10 px) | Tytuł styl `h3` (sklep 18/600, admin 14/600), `div`, a poziom nagłówka daje miejsce użycia (jak `CardTitle`, B2.27). Opis styl `body` w `--muted-foreground`; własny styl linków usuwam, link to `TextLink`. Akcje: **P:** w rzędzie z zawijaniem, odstęp `--space-related` | tokeny §4; B1.18, B2.27; WCAG 1.3.1 |
| B3.23 | Rodzaje: baza ma jeden | **P:** bez wariantu; rodzaj wynika z treści. Dokumentacja rozróżnia „brak wyników dla filtrów lub wyszukiwania” (akcja: wyczyść, np. „Clear search” w katalogu) i „jeszcze nic tu nie ma” (akcja: utwórz albo przejdź do katalogu, np. pusty koszyk, brak zamówień). Zasada treści: dlaczego pusto i jaki następny krok. Bez roli (treść statyczna). Strony „not found” (5) też używają `Empty` z `<h1>`, neutralnie, bo nie zdradzają, czy zasób istnieje (A8) | prompt etap 3 („lista z filtrami”) i etap 4 („Content: puste stany”); spec zamówień A8 |

### Error state

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B3.24 | Baza nie ma stanu błędu. Dziś: ok. 12 komunikatów strony `<p role="alert" className="text-sm text-destructive">` (katalog na 4 stronach, koszyk, checkout, płatność, zamówienie, konto, dashboard, zapisane rekomendacje Copilota), 2 `error.tsx` (`h1` + szary tekst + „Try again”), w sklepie brak `error.tsx` poza kontem (audyt) | **Cienki `ErrorState` na `Alert variant="destructive"` (Q4):** stała rola `alert`, wymagany tytuł (co się stało) i opis (co zrobić), opcjonalna akcja (`Button` „Try again” albo `TextLink` „Back to …”). Bez nowych tokenów i stylów: wygląd, ikona i obrys z Alertu. Granice w dokumentacji: błąd pola = `FieldError`, błąd po wysłaniu formularza = `Alert` z rolą `alert`, „not found” = `Empty` (B3.23), fallback Copilota bez LLM = `Alert` `info` lub `warning` (to nie błąd: deterministyczne wskazówki działają). Odrzucona alternatywa: sam wzorzec w dokumentacji bez komponentu (agent musiałby pamiętać rolę i części) | B2.18–B2.24; prompt etap 4 („błąd, który wymaga działania, nigdy nie jest toastem”); audyt (komunikat bez wskazówki, brak `error.tsx` w sklepie); AGENTS.md (fallback Copilota); WCAG 3.3.1, 4.1.3 |
| B3.25 | Treść i fokus | **P:** tytuł `div`, poziom nagłówka z miejsca użycia (`error.tsx` ma dziś `<h1>`); bez przenoszenia fokusu (rola `alert` ogłasza komunikat). Treść według strony „Content”: co się stało i co zrobić, bez szczegółów technicznych (AGENTS.md: bez stack trace i surowych błędów) | B2.27; AGENTS.md „Security and validation” |

### Disclosure

| # | Różnica względem bazy | Rekomendacja | Źródło |
|---|---|---|---|
| B3.26 | Baza ma `collapsible` (Base UI, bez stylów, `"use client"`, przycisk z `aria-expanded`) i `accordion` (Base UI, ikony przez `IconPlaceholder`, animacje `tw-animate-css`); bez JavaScriptu panel się nie otwiera. Dziś oba użycia to natywne `<details>`: menu sklepu na telefonie (`header-menu.tsx:46`, celowo bez JS, spec G13) i definicje metryk w Copilocie (`copilot-answer-view.tsx:204`) | **Natywny `<details>` / `<summary>` (Q5)**, nowy `ui/disclosure.tsx` pisany ręcznie: działa bez JavaScriptu, przeglądarka daje rolę przycisku, stan rozwinięcia i klawiaturę. Odrzucone: `collapsible` (menu na telefonie przestałoby działać bez JS, wbrew G13 i audytowi), `accordion` (0 miejsc z kilkoma sekcjami; trafia do „What is missing”) | spec G13 (`header-menu.tsx`); audyt (treść bez JS); HTML Living Standard (`details`); zasada 6 promptu |
| B3.27 | Wygląd (baza go nie ma; dziś `cursor-pointer font-medium` w Copilocie, obrys i `rounded-md px-3 py-1` w menu) | Części: `Disclosure` (`details`), `DisclosureTrigger` (`summary` bez znacznika przeglądarki, `min-h-control-sm`, tekst `body` 500, ikona–tekst `--space-related`), `DisclosureContent` (odstęp `--space-related`). **P:** ikona `IconChevronDown` na końcu, `--control-icon-size`, `--muted-foreground` (6,25 / 8,28 : 1), obraca się o 180° w `--duration-base`; hover = podkreślenie tekstu (jak `TextLink` `resource`); fokus `outline` (B1.4). Bez animacji wysokości (wymagałaby JS albo `::details-content`, którego nie ma we wszystkich przeglądarkach). Wyzwalacz w kształcie przycisku (menu) dostaje klasy `buttonVariants({ variant: "outline" })`, bez nowego wariantu | tokeny §5, §6; B1.4, B1.18; zasada 6 promptu |
| B3.28 | Granice | Panel menu na telefonie (pozycja, cień nakładki, ucinanie przy 320 px z audytu) to retrofit ramy albo Popover z partii 4, nie Disclosure. Dokumentacja: Disclosure dla treści dodatkowej, nigdy dla informacji potrzebnej do decyzji (np. ceny, błędu) | audyt Krok 2 (menu ucięte przy 320 px); tokeny §5 (`--shadow-overlay`) |

### Testy, coverage i CI

| # | Różnica | Rekomendacja | Źródło |
|---|---|---|---|
| B3.29 | Coverage i bramka | Bez zmian: `src/components/ui/**` wykluczone z powodem z B1.27. Nowe komponenty bez rozgałęzień (`ErrorState` składa Alert, `SkeletonGroup` i `Disclosure` to sam markup). Job `storybook` w CI bez zmian | B1.27, B1.28, B2.30 |
| B3.30 | Testy `play` | Table: a11y przy 320 px (region przewijany z linkami), Tab przez linki w wierszach; Tabs: strzałki, Home/End, jeden przystanek Tab, aktywacja przy fokusie; `TabsNav`: dokładnie jeden `aria-current="page"`, linki w kolejności Tab; Skeleton: `SkeletonGroup` ma rolę `status` i tekst, szkielety `aria-hidden`; Empty: a11y w obu motywach i gęstościach, akcja osiągalna z klawiatury; Error state: rola `alert`, „Try again” wywołuje `onClick`; Disclosure: klik, Enter i Spacja przełączają `open`, treść widoczna po otwarciu | prompt etap 2 („test interakcji w play function”) |

### Gdzie dziś są komponenty, co się zmieni na ekranie, ryzyko dla testów

| Komponent | Ekrany dziś | Co zmieni się wizualnie w partii 3 | Ryzyko dla testów |
|---|---|---|---|
| Table | 10 tabel w 9 plikach: admin: kategorie (`categories/page.tsx:62`), zamówienia (`orders/page.tsx:74`), szczegóły zamówienia (`orders/[id]/page.tsx:151`), produkty (`products/page.tsx:63`), kolumny importu (`products/import/page.tsx:52`), podgląd importu (`product-import-view.tsx:177`), dashboard (top produkty i niski stan, `dashboard-view.tsx:232,268`), dowody Copilota (`copilot-answer-view.tsx:48`); sklep: „My orders” (`account-orders-view.tsx:67`) | admin: wiersz 36 → 44 px, nagłówek na szarym tle `--muted`, padding 8 → 12 px, cyfry tabelaryczne w każdej kolumnie, długie teksty zawijają się zamiast wypychać tabelę, brak podświetlenia wiersza w hover, podpis w stylu `small`; sklep („My orders”): tekst 14 → 16 px, wiersz 48 px | **niskie:** unit nie sprawdzają klas tabeli (jedyna asercja na klasę, `account-components.test.ts:114`, dotyczy `span` w komórce, nie `ui/table`); e2e czytają tekst (`table[aria-label="Products"]`, `main tbody tr`) i szerokość strony przy 390 px (`admin-mobile`, `storefront-mobile`), a tabela zostaje w kontenerze z przewijaniem, więc strona nie poszerza się. Sprawdzę 320 i 390 px przed commitem |
| Tabs | brak komponentu; 3 nawigacje linkami z `aria-current` (Featured na stronie głównej, kategorie w katalogu, okres na dashboardzie) | **brak** (B3.1) | brak; przy retroficie e2e `click('nav[aria-label="Featured categories"] a[href=…]')` (`home.e2e.test.ts:87`) zostaje ważne, bo `TabsNav` to dalej `<nav>` z linkami; unit sprawdzają `aria-current` (`storefront-shell.test.ts:92–93`, `catalog-components.test.ts:139–145`, `dashboard-components.test.ts:217`) |
| Skeleton | brak komponentu; 11 fallbacków ze szkieletem w sklepie (`animate-pulse rounded bg-muted` w 10 plikach), 10 tekstów „Loading…” i 3 „Checking…” w adminie | **brak** | brak teraz; przy retroficie zmieni się dokładny HTML w `account-components.test.ts:81` (`<div aria-label="Loading"></div>`) |
| Empty state | brak komponentu; ok. 13 pustych stanów (koszyk, katalog, polecane, „My orders”, kategorie, produkty, zamówienia, rekomendacje, dashboard ×3, historia stanu, usunięcie kategorii) i 5 stron „not found” | **brak** | brak teraz; przy retroficie unit sprawdzają tekst, e2e szukają tekstu |
| Error state | brak komponentu; ok. 12 `<p role="alert">` na stronach i 2 `error.tsx` | **brak** | brak teraz; przy retroficie `role="alert"` zostaje, tekst bez zmian |
| Disclosure | 2 natywne `<details>`: menu sklepu na telefonie, definicje metryk w Copilocie | **brak** | brak teraz; przy retroficie zostaje `<details>` / `<summary>`, więc e2e `click("header summary")` (`home.e2e.test.ts:127`) działa, a regex w `storefront-shell.test.ts:34` trzeba będzie dopasować do nowych klas i ikony |

Stories partii (szacunek): Table 6, Tabs 7, Skeleton 4, Empty state 5, Error state 4, Disclosure 5, razem ok. 31, każda w obu motywach i obu gęstościach; strona MDX z 13 sekcjami dla każdego komponentu.

### Pytania partii 3

- **Q1 (B3.11):** Tabs w dwóch formach (Base UI do paneli na tej samej stronie i `TabsNav` z linkami do przełączania przez adres, wspólny wygląd), czy tylko jedna z nich (sama `TabsNav`, a Base UI Tabs na „What is missing”)? Rekomendacja: obie.
- **Q2 (B3.12):** jeden wygląd zakładek `line` (podkreślenie 2 px `--foreground`, nieaktywne `--muted-foreground`) i usunięcie wariantu `default` (szary tor z cieniem)? Rekomendacja: tak.
- **Q3 (B3.18):** nowa część `SkeletonGroup` (`role="status"` i ukryty tekst „Loading …”) zamiast samego opisu wzorca w dokumentacji? Rekomendacja: dodać część (dziś 11 miejsc ma `aria-label`, którego czytnik nie ogłasza).
- **Q4 (B3.24):** Error state jako cienki komponent `ErrorState` na `Alert variant="destructive"` (stała rola `alert`, wymagany tytuł i opis, opcjonalna akcja), czy tylko wzorzec w dokumentacji bez nowego pliku? Rekomendacja: komponent.
- **Q5 (B3.26):** Disclosure na natywnym `<details>` (działa bez JS, nowy plik pisany ręcznie), czy Base UI Collapsible z rejestru (wymaga JS)? Rekomendacja: natywny.
- **Q6 (B3.1):** potwierdzasz, że partia 3 nie zmienia miejsc użycia, a na ekranie zmienia się tylko Table (nagłówek na szarym tle, wiersz 44 px w adminie, zawijanie długich tekstów, bez hover wiersza)? Rekomendacja: tak.

Usunięcia z bazy do Twojej zgody (zasada 12), przyjmowane razem z listą: style wiersza `selected` i `expanded` oraz podświetlenie w hover w Table (B3.8), wariant `default` w Tabs (B3.12), style pionowej orientacji Tabs (B3.15), `EmptyMedia` z wariantami `default` i `icon` (B3.20). Nie dodaję z rejestru: `collapsible`, `accordion`, `spinner` (B3.3).

## Następny krok

Decyzje właściciela w sprawie partii 3 etapu 2 (Q1–Q6, B3.1–B3.30, usunięcia z bazy); potem implementacja partii 3 na gałęzi `design/stage-2-batch-3` i PR.
