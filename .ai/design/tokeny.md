# Tokeny: CommerceOS (lekcja 06, ćwiczenie 2b)

- **Status: zatwierdzone przez właściciela 2026-10-24.** Rozstrzygnięcia w sekcji 8. Od teraz to reguła dla `globals.css` i komponentów.
- Data propozycji: 2026-10-23. Prompt: `od-decyzji-do-tokenow-devmentor.txt` (kontekst DevMentora podmieniony na CommerceOS).
- Wejście: `wt-design/.ai/design/referencje.md` (decyzje R01–R04, K1–K7), `wt-design/.ai/design/audyt.md` (5 decyzji, 11 wartości wpisanych na sztywno), `karty-referencji.md` (pomiary), notatki lekcji 06.
- **Wybrany plik tokenów:** `packages/app/src/app/globals.css`. To domyślny shadcn `base-nova`, `baseColor: neutral`, z blokiem `.dark` (dziś martwy). Nazwy shadcn opisują przeznaczenie (`--primary`, `--muted-foreground`), więc są **warstwą znaczeniową**. Nad nimi nie trzeba budować drugiej. Dochodzi pod nimi warstwa surowa (`--raw-*`), a nowe nazwy znaczeniowe tylko tam, gdzie nic nie pasuje.
- **Kontrast policzony skryptem**, bez szacowania: Node 24, konwersja oklch → sRGB (CSS Color 4, macierze OKLab), wzór WCAG 2.x, wynik ucięty (nie zaokrąglony) do 2 miejsc. Skrypt dał na starych tokenach dokładnie wartości z audytu (`#e5e5e5` 1,26 : 1, pierścień `/50` 1,54 : 1, „No image” 4,35 : 1), więc liczy tak samo jak przeglądarka. Skrypt i dane: `.ai/design/kontrast/` (`lib.mjs`, `tokens.mjs`, `run.mjs`, `pairs.md`); uruchomienie: `node .ai/design/kontrast/run.mjs`. Każdą nową parę kolorów liczy się nim przed zapisem (zasada 19).

## Decyzje → token / zasada / cecha komponentu

| Decyzja | Źródło | Co z niej powstaje |
|---|---|---|
| Jeden czerwony kolor akcji zakupowej, cena nie jest czerwona | R03.1, K1 | **token** `--action*`, **zasada** „cena nigdy w kolorze akcji” |
| Admin: neutralny główny przycisk, czerwień tylko jako akcent, kolor tylko dla znaczenia | R04.2, K7 | **token** `--primary` (grafit), `--sidebar-primary` (akcent); **zasada** kolorów w adminie |
| Ciemna rama sklepu, jasne powierzchnie handlowe, produkt na jasnej karcie bez cienia | R02.1, R01.3 | **token** `--frame*`, `--surface-product`; **cecha komponentu** karty produktu (jedna powierzchnia) |
| Rama admina: ciemne menu boczne, gęste tabele | R04.1 | **token** `--sidebar*` (istniejące nazwy shadcn) |
| Grotesk display, duży i ciasny; spokojniejsza treść | R01.2, K2 | **token** `--font-heading`, `--font-sans`, 6 nazwanych stylów tekstu |
| Promień 8 px przyciski i pola, 12 px karty | K4 | **token** `--radius-control`, `--radius-card` |
| Wspólne tokeny, różna gęstość | K7, R04.3 | **token komponentu** `--control-h-*` w dwóch zakresach gęstości; **zasada** celów dotyku |
| Jasny domyślnie, ciemny opcjonalny | decyzja „Motyw” | wartości light/dark każdego tokenu, kontrast w obu |
| Najwyżej 1–2 etykiety na zdjęciu, status tekstem | R03.4 | **zasada** + **cecha komponentu** badge |
| Rzeczowe komunikaty o faktach | R03.3, K5 | **zasada** treści (nie token) |
| Statusy, ostrzeżenia, demo zamiast palety Tailwinda | audyt, decyzja 4 | **token** `--success*`, `--warning*`, `--demo*` |
| Obrys pola ≥ 3 : 1, fokus ≥ 3 : 1 | audyt, decyzja 4; WCAG 1.4.11 | **token** `--input`, `--ring`; **cecha komponentu** pierścienia |
| Bez cieni na kartach, bez gradientów | A01 (podpisy 3 i 4) | **token** `--shadow-card: none`, jeden `--shadow-overlay`; **zasada** |

## 1. Tabela tokenów

Prefiks `--raw-` oznacza warstwę surową. Takich nazw używa tylko plik tokenów, nigdy komponent ani klasa. Wartości ciemne siedzą w bloku `.dark`. „Nowy” = token spoza obecnego `globals.css`.

### 1a. Warstwa surowa (paleta)

Neutralne mają lekko chłodny odcień (hue 285, chroma 0,002–0,012), jak jasne tła referencji `#f1f1f6` (R01.3) i `#eeeef1` (R02.1). To moja propozycja P6, do przyjęcia albo odrzucenia (zamiast tego czysty `neutral`).

| Token surowy | oklch | hex | Token surowy | oklch | hex |
|---|---|---|---|---|---|
| `--raw-gray-0` | `oklch(1 0 0)` | `#ffffff` | `--raw-red-50` | `oklch(0.95 0.02 25)` | `#fceae8` |
| `--raw-gray-25` | `oklch(0.985 0.002 285)` | `#fafafb` | `--raw-red-300` | `oklch(0.72 0.16 25)` | `#f97770` |
| `--raw-gray-50` | `oklch(0.97 0.003 285)` | `#f5f5f7` | `--raw-red-400` | `oklch(0.66 0.19 25)` | `#f05653` |
| `--raw-gray-100` | `oklch(0.965 0.004 285)` | `#f3f3f6` | `--raw-red-500` | `oklch(0.55 0.20 25)` | `#cc272e` |
| `--raw-gray-150` | `oklch(0.955 0.004 285)` | `#f0f0f3` | **`--raw-red-600`** | **`oklch(0.50 0.19 25)`** | **`#b71824`** |
| `--raw-gray-200` | `oklch(0.93 0.004 285)` | `#e7e7ea` | `--raw-red-700` | `oklch(0.44 0.17 25)` | `#9b0f1b` |
| `--raw-gray-250` | `oklch(0.91 0.004 285)` | `#e1e1e4` | `--raw-red-950` | `oklch(0.27 0.06 25)` | `#3f1917` |
| `--raw-gray-300` | `oklch(0.85 0.006 285)` | `#cdcdd2` | `--raw-green-50` | `oklch(0.96 0.04 150)` | `#e0fae4` |
| `--raw-gray-400` | `oklch(0.74 0.01 285)` | `#aaaab1` | `--raw-green-300` | `oklch(0.78 0.13 150)` | `#76cf8a` |
| `--raw-gray-500` | `oklch(0.62 0.012 285)` | `#85858d` | `--raw-green-700` | `oklch(0.46 0.11 150)` | `#1d6835` |
| `--raw-gray-550` | `oklch(0.55 0.01 285)` | `#717177` | `--raw-green-950` | `oklch(0.27 0.05 150)` | `#122d19` |
| `--raw-gray-600` | `oklch(0.49 0.012 285)` | `#5f6067` | `--raw-amber-50` | `oklch(0.96 0.04 95)` | `#faf2d4` |
| `--raw-gray-700` | `oklch(0.30 0.006 285)` | `#2d2d31` | `--raw-amber-100` | `oklch(0.94 0.07 90)` | `#fdeab6` |
| `--raw-gray-800` | `oklch(0.25 0.006 285)` | `#212124` | `--raw-amber-200` | `oklch(0.88 0.10 85)` | `#f6d389` |
| `--raw-gray-850` | `oklch(0.21 0.005 285)` | `#18181b` | `--raw-amber-300` | `oklch(0.82 0.12 80)` | `#edbb64` |
| `--raw-gray-900` | `oklch(0.17 0.005 285)` | `#0f0f12` | `--raw-amber-500` | `oklch(0.62 0.12 70)` | `#b47825` |
| `--raw-gray-950` | `oklch(0.12 0.004 285)` | `#060607` | `--raw-amber-700` | `oklch(0.48 0.10 65)` | `#845011` |
| | | | `--raw-amber-900` | `oklch(0.38 0.08 60)` | `#61370d` |
| | | | `--raw-amber-950` | `oklch(0.28 0.05 75)` | `#372508` |
| | | | `--raw-blue-300` | `oklch(0.76 0.11 258)` | `#85b3f7` |
| | | | `--raw-blue-600` | `oklch(0.48 0.17 258)` | `#0b58bb` |

Wszystkie wartości mieszczą się w gamucie sRGB (sprawdzone skryptem). `--raw-red-600` `#b71824` to prawie dokładnie czerwień R03.1 `#b71f24`.

### 1b. Warstwa znaczeniowa: kolor

| Token | Warstwa | Light | Dark | Pochodzenie | Gdzie używać | Gdzie nie używać |
|---|---|---|---|---|---|---|
| `--background` | znaczeniowa (istniejący) | `oklch(1 0 0)` `#ffffff` | `oklch(0.17 0.005 285)` `#0f0f12` | R02.1 (jasne powierzchnie handlowe), Motyw | tło strony sklepu i treści admina | nagłówek i stopka sklepu (`--frame`), menu admina (`--sidebar`) |
| `--foreground` | znaczeniowa (istniejący) | `oklch(0.17 0.005 285)` `#0f0f12` | `oklch(0.97 0.003 285)` `#f5f5f7` | karty: tekst prawie czarny 16,5–21 : 1 | tekst główny, **cena**, nagłówki | tekst na ciemnej ramie (`--frame-foreground`) |
| `--card` / `--card-foreground` | znaczeniowa (istniejący) | `#ffffff` / `#0f0f12` | `oklch(0.21 0.005 285)` `#18181b` / `#f5f5f7` | R02.2 (podsumowanie w białej karcie), R04.1 | karty admina, podsumowanie koszyka, panele formularzy | karta produktu w katalogu (`--surface-product`) |
| `--popover` / `--popover-foreground` | znaczeniowa (istniejący) | `#ffffff` / `#0f0f12` | `oklch(0.25 0.006 285)` `#212124` / `#f5f5f7` | Motyw (nakładka jaśniejsza od tła w dark) | menu, popover, dialog, menu mobilne | karty w treści |
| `--surface-product` | znaczeniowa (**nowy**) | `oklch(0.965 0.004 285)` `#f3f3f6` | `oklch(0.21 0.005 285)` `#18181b` | R01.3 (produkt na jasnej karcie `#f1f1f6`, bez cienia) | tło karty produktu i kafla zdjęcia (jedna powierzchnia) | tło strony, karty admina, pola formularzy |
| `--primary` | znaczeniowa (istniejący) | `oklch(0.21 0.005 285)` `#18181b` | `oklch(0.93 0.004 285)` `#e7e7ea` | R04.2 (główna akcja neutralnie czarna `#101010`), K7 | główny przycisk admina, główny neutralny przycisk sklepu poza zakupem (np. „Find order”) | akcje zakupowe w sklepie (`--action`) |
| `--primary-hover` | znaczeniowa (**nowy**) | `oklch(0.30 0.006 285)` `#2d2d31` | `oklch(0.85 0.006 285)` `#cdcdd2` | lekcja: stany osobnymi kolorami, nie półprzezroczystością (zamiast `bg-primary/80`) | hover przycisku głównego | – |
| `--primary-foreground` | znaczeniowa (istniejący) | `oklch(0.985 0.002 285)` `#fafafb` | `oklch(0.17 0.005 285)` `#0f0f12` | R04.2 | tekst i ikona na `--primary` | – |
| `--action` | znaczeniowa (**nowy**) | `oklch(0.50 0.19 25)` `#b71824` | `oklch(0.55 0.20 25)` `#cc272e` | R03.1, K1 | tylko akcje zakupu: „Add to cart”, „Checkout”, „Place order”, „Pay (demo)” | cena, rabat, tekst, tło sekcji, ikony, admin, ciemna rama (2,88 : 1), błędy |
| `--action-hover` | znaczeniowa (**nowy**) | `oklch(0.44 0.17 25)` `#9b0f1b` | `oklch(0.50 0.19 25)` `#b71824` | R03.1 + lekcja (stany osobnymi kolorami) | hover i stan wciśnięty CTA zakupowego | – |
| `--action-foreground` | znaczeniowa (**nowy**) | `oklch(0.985 0.002 285)` `#fafafb` | `#fafafb` | R03.1 (tekst `#fbfbfb`) | tekst i ikona na `--action` | – |
| `--secondary` / `--secondary-foreground` | znaczeniowa (istniejący) | `oklch(0.955 0.004 285)` `#f0f0f3` / `#18181b` | `oklch(0.25 0.006 285)` `#212124` / `#f5f5f7` | R03 (drugorzędny jasnoszary), R04.1 (2 drugorzędne akcje) | przyciski drugorzędne, neutralny badge statusu | akcja główna |
| `--muted` | znaczeniowa (istniejący) | `oklch(0.965 0.004 285)` `#f3f3f6` | `oklch(0.25 0.006 285)` `#212124` | R04.1 (nagłówek tabeli `#f7f7f7`) | nagłówek tabeli, skeleton, tło stanu pustego | tło tekstu ciągłego |
| `--muted-foreground` | znaczeniowa (istniejący) | `oklch(0.49 0.012 285)` `#5f6067` | `oklch(0.74 0.01 285)` `#aaaab1` | audyt (4,35 : 1 na `--muted`), R01 (drugorzędny 4,31 : 1 do poprawy) | opisy, podpisy, placeholder, metadane | tekst wymagany do działania, ceny, błędy |
| `--accent` / `--accent-foreground` | znaczeniowa (istniejący) | `#f0f0f3` / `#18181b` | `#212124` / `#f5f5f7` | shadcn (hover ghost/outline, zaznaczony wiersz R04.1) | hover przycisku ghost/outline, zaznaczony wiersz, aktywny filtr | kolor marki (to nie jest akcent marki, mimo nazwy) |
| `--border` | znaczeniowa (istniejący) | `oklch(0.91 0.004 285)` `#e1e1e4` | `oklch(0.30 0.006 285)` `#2d2d31` | R04.1 (ramki `#dddddd`) | separatory, obrys karty i tabeli (elementy dekoracyjne) | **jedyna granica pola, przycisku outline, checkboxa** (1,30 : 1, patrz pary 57–58) |
| `--input` | znaczeniowa (istniejący) | `oklch(0.62 0.012 285)` `#85858d` | `oklch(0.55 0.01 285)` `#717177` | audyt, decyzja 4; WCAG 1.4.11 (było 1,26 : 1) | obrys pola, selecta, textarea, checkboxa, radia, przycisku outline | separatory dekoracyjne (zbyt ciężkie) |
| `--ring` | znaczeniowa (istniejący) | `oklch(0.17 0.005 285)` `#0f0f12` | `oklch(0.93 0.004 285)` `#e7e7ea` | audyt, decyzja 4; WCAG 2.4.7, 2.4.13 (było 1,54 : 1) | pierścień fokusu na jasnych powierzchniach | rama i menu boczne (tam `--frame-ring`, `--sidebar-ring`), bez `/50` |
| `--destructive` | znaczeniowa (istniejący) | `oklch(0.50 0.19 25)` `#b71824` | `oklch(0.72 0.16 25)` `#f97770` | R04.2 (kolor dla błędu) | tekst błędu, obrys pola z błędem, akcja usuwająca w adminie (tekst/obrys) | wypełniony przycisk w sklepie (myli się z CTA), dekoracja |
| `--destructive-surface` | znaczeniowa (**nowy**) | `oklch(0.95 0.02 25)` `#fceae8` | `oklch(0.27 0.06 25)` `#3f1917` | R04.2 + zamiast `bg-destructive/10` | tło alertu błędu, badge „Cancelled” | duże tła sekcji |
| `--link` | znaczeniowa (**nowy**, propozycja P1) | `oklch(0.48 0.17 258)` `#0b58bb` | `oklch(0.76 0.11 258)` `#85b3f7` | R04.2 (link `#1650d0`, 6,79 : 1) | link w tekście i nazwa zasobu w tabeli admina, zawsze podkreślony w tekście ciągłym | przyciski, nawigacja w ramie, nagłówki |
| `--success` / `--success-surface` | znaczeniowa (**nowy**) | `oklch(0.46 0.11 150)` `#1d6835` / `oklch(0.96 0.04 150)` `#e0fae4` | `oklch(0.78 0.13 150)` `#76cf8a` / `oklch(0.27 0.05 150)` `#122d19` | audyt, decyzja 4 (zamiast `emerald-700/400`); R04.2 (badge Active) | „Added to cart.”, sukces formularza, `redirect-notice`, badge „Paid”, „Published”, „In stock” | CTA, dekoracja |
| `--warning` / `--warning-surface` | znaczeniowa (**nowy**) | `oklch(0.48 0.10 65)` `#845011` / `oklch(0.96 0.04 95)` `#faf2d4` | `oklch(0.82 0.12 80)` `#edbb64` / `oklch(0.28 0.05 75)` `#372508` | audyt, decyzja 4 (zamiast `amber-700/400`) | ostrzeżenie o slugu, ostrzeżenie draftu AI, badge „Pending payment”, „Low stock” | oznaczenie danych demo (`--demo`) |
| `--warning-border` | znaczeniowa (**nowy**) | `oklch(0.62 0.12 70)` `#b47825` | `oklch(0.62 0.12 70)` `#b47825` | zamiast `border-amber-500/50` (`orders/[id]/page.tsx:84`) | obrys alertu ostrzeżenia | tekst |
| `--demo` / `--demo-surface` | znaczeniowa (**nowy**, propozycja P3) | `oklch(0.38 0.08 60)` `#61370d` / `oklch(0.94 0.07 90)` `#fdeab6` | `oklch(0.88 0.10 85)` `#f6d389` / `oklch(0.28 0.05 75)` `#372508` | audyt, decyzja 4; AGENTS.md zasada 6 (demo jawnie oznaczone) | pasek „Demo store”, badge DEMO, notka płatności demo w checkoutcie | ostrzeżenia (`--warning`), dekoracja |
| `--frame` | znaczeniowa (**nowy**) | `oklch(0.17 0.005 285)` `#0f0f12` | `oklch(0.12 0.004 285)` `#060607` | R02.1 (czarny nagłówek `#0a0a0a`), R03 (`#050505`) | nagłówek i stopka sklepu | listing, produkt, koszyk, checkout (zostają jasne) |
| `--frame-foreground` | znaczeniowa (**nowy**) | `#fafafb` | `#fafafb` | R02.1, R03 (`#d9d9d9` na czarnym 14,44 : 1) | logo, nawigacja, linki stopki | – |
| `--frame-muted-foreground` | znaczeniowa (**nowy**) | `oklch(0.74 0.01 285)` `#aaaab1` | `#aaaab1` | R02 (`#a0a3ad` na `#0a0a0a`) | drugorzędny tekst stopki, placeholder wyszukiwarki | jedyna etykieta pola |
| `--frame-border` | znaczeniowa (**nowy**) | `oklch(0.30 0.006 285)` `#2d2d31` | `#2d2d31` | R02.1 | separator w ramie (dekoracyjny) | obrys pola w ramie |
| `--frame-input` | znaczeniowa (**nowy**) | `oklch(0.55 0.01 285)` `#717177` | `#717177` | WCAG 1.4.11 | obrys wyszukiwarki i pól w ramie | – |
| `--frame-ring` | znaczeniowa (**nowy**) | `#fafafb` | `#fafafb` | WCAG 2.4.7 | fokus w nagłówku i stopce (w zakresie ramy `--ring: var(--frame-ring)`) | jasne powierzchnie |
| `--frame-accent` | znaczeniowa (**nowy**) | `oklch(0.66 0.19 25)` `#f05653` | `#f05653` | R03.1 + K7 (czerwień marki jako akcent); kontrola: `--action` na ramie ma 2,88 : 1 | znak logo, kreska aktywnej kategorii w nawigacji | tło przycisku z białym tekstem (3,26 : 1), tekst |
| `--sidebar` | znaczeniowa (istniejący) | `oklch(0.21 0.005 285)` `#18181b` | `oklch(0.12 0.004 285)` `#060607` | R04.1 (ciemne menu `#1b1b1b`) | boczne menu admina | treść admina |
| `--sidebar-foreground` | znaczeniowa (istniejący) | `oklch(0.93 0.004 285)` `#e7e7ea` | `#e7e7ea` | R04.1 | pozycje menu | – |
| `--sidebar-muted-foreground` | znaczeniowa (**nowy**) | `oklch(0.74 0.01 285)` `#aaaab1` | `#aaaab1` | R04.1 | etykiety grup, „CommerceOS Admin” podtytuł | aktywna pozycja |
| `--sidebar-accent` / `--sidebar-accent-foreground` | znaczeniowa (istniejący) | `oklch(0.30 0.006 285)` `#2d2d31` / `#fafafb` | `oklch(0.25 0.006 285)` `#212124` / `#fafafb` | R04.1 (aktywna pozycja `#343434`); audyt (brak `aria-current`) | aktywna pozycja menu i hover | – |
| `--sidebar-primary` | znaczeniowa (istniejący, **nowa wartość**) | `oklch(0.66 0.19 25)` `#f05653` | `#f05653` | R04.2 + K7: czerwień w adminie tylko jako akcent; usuwa martwe indygo z `.dark` (audyt) | znacznik aktywnej pozycji (kreska 3 px), znak logo | przyciski, tekst |
| `--sidebar-primary-foreground` | znaczeniowa (istniejący) | `#0f0f12` | `#0f0f12` | – | gdyby na znaczniku stał tekst (nie planuję) | – |
| `--sidebar-border` / `--sidebar-ring` | znaczeniowa (istniejący) | `#2d2d31` / `#fafafb` | `#2d2d31` / `#fafafb` | R04.1, WCAG 2.4.7 | separator menu / fokus w menu | – |
| `--chart-1…5` | znaczeniowa (istniejący) | bez zmian | bez zmian | – | grep: dziś nieużywane w `src` | P12: zostawić albo usunąć |

### 1c. Pozostałe tokeny (typografia, kształt, głębia, ruch, gęstość)

| Token | Warstwa | Light | Dark | Pochodzenie | Gdzie używać | Gdzie nie używać |
|---|---|---|---|---|---|---|
| `--font-heading` | znaczeniowa (istniejący, dziś = `--font-sans`) | kandydat z sekcji 4 (krój display) | = | R01.2, K2 | style display, h1, h2 | tekst ciągły, tabele, ceny |
| `--font-sans` | znaczeniowa (istniejący) | krój treści (ta sama rodzina, odmiana text) | = | R01.2 („treść tym samym krojem w wersji text”) | treść, UI, ceny (`tabular-nums`) | – |
| `--font-mono` | znaczeniowa (istniejący) | Geist Mono (bez zmian, P13) | = | audyt, decyzja 2 | numer zamówienia, SKU | nagłówki (K2 odrzucił monospace), ceny |
| `--radius` | surowa (istniejący) | `0.5rem` (8 px) zamiast `0.625rem` | = | K4 | baza dla `--radius-*` | w komponentach bezpośrednio |
| `--radius-control` (`--radius-lg` w `@theme`) | znaczeniowa (**nowy** alias) | 8 px | = | K4 | przycisk, pole, select, filtr kategorii, dropdown | karty |
| `--radius-card` (`--radius-xl` w `@theme`) | znaczeniowa (**nowy** alias) | 12 px (dziś 14 px) | = | K4, R04.3 | karta, panel, dialog, kafel produktu | przyciski |
| `--radius-badge` | komponentowa (**nowy**, P4) | 4 px | = | audyt (pigułki bez reguły), R03.4 | badge statusu i etykieta na zdjęciu | – |
| `--radius-full` | surowa (Tailwind) | 9999 px | = | P4 | tylko licznik koszyka (kółko) | przyciski, filtry, badge |
| `--shadow-card` | znaczeniowa (**nowy**) | `none` | `none` | R01.3, A01 (podpis 4) | karty | – |
| `--shadow-overlay` | znaczeniowa (**nowy**, P8) | `0 8px 24px oklch(0.17 0.005 285 / 12%)` + obrys `--border` | `0 8px 24px oklch(0 0 0 / 50%)` + obrys `--border` | R01 (1 cień `0 8px 40px rgba(26,26,26,.08)`) | menu, popover, dialog, menu mobilne | karty, przyciski, CTA |
| `--duration-fast` / `--duration-base` / `--duration-slow` | znaczeniowa (**nowy**, P9) | 120 / 200 / 300 ms | = | luka „Ruch i reakcja”; próg Doherty’ego 400 ms | kolor/hover / menu, popover / dialog, panel | pętle, animacje dekoracyjne |
| `--ease-out` / `--ease-in` | znaczeniowa (**nowy**, P9) | `cubic-bezier(0.2, 0, 0, 1)` / `cubic-bezier(0.4, 0, 1, 1)` | = | jw. | wejście / wyjście nakładek | – |
| `--control-h-sm` / `-md` / `-lg` | komponentowa (**nowy**) | sklep: 40 / 44 / 48 px; admin desktop: 28 / 32 / 36 px; telefon (oba): min. 44 px | = | K7, R04.3, R01 (CTA 40/48), R02.2 (56 px), WCAG 2.5.8, 44 pt | wysokość przycisku, pola, selecta | odstępy (to nie jest skala odstępów) |
| `--space-*` | znaczeniowa (**nowy**) | patrz sekcja 3 | = | R04.3 (siatka 4 px), audyt decyzja 3 | odstępy według relacji | – |
| `--measure-prose` | znaczeniowa (**nowy**) | `65ch` | = | audyt (84 znaki na `/orders/lookup`), lekcja (45–75 znaków) | tekst ciągły | tabele |

### 1d. Mapa 11 wartości wpisanych na sztywno z audytu

| # | Plik:linia | Dziś | Token |
|---|---|---|---|
| 1 | `(storefront)/layout.tsx:23` | `bg-amber-100 text-amber-950` | `bg-demo-surface text-demo` |
| 2 | `admin/(protected)/orders/[id]/page.tsx:84` | `border-amber-500/50 bg-amber-50 dark:bg-amber-950/30` | `border-warning-border bg-warning-surface` (albo `--demo*`, jeśli to notka demo; do sprawdzenia przy retroficie) |
| 3 | `category-form-view.tsx:64` | `text-amber-700 dark:text-amber-400` | `text-warning` |
| 4 | `form-feedback.tsx:17` | `text-emerald-700 dark:text-emerald-400` | `text-success` |
| 5 | `order-badges.tsx:26` | `border-amber-500 text-amber-700` | `bg-demo-surface text-demo` (badge DEMO) |
| 6 | `description-draft-panel-view.tsx:92` | `text-amber-700` | `text-warning` |
| 7 | `product-form-view.tsx:114` | `text-amber-700` | `text-warning` |
| 8 | `redirect-notice.tsx:18` | `text-emerald-700` | `text-success` |
| 9 | `order-forms-view.tsx:28` | `border-amber-300 bg-amber-50 text-amber-950` | `bg-demo-surface text-demo` (notka płatności demo) |
| 10 | `ui/badge.tsx:7` | `focus-visible:ring-[3px] ring-ring/50` | specyfikacja fokusu z sekcji 5 |
| 11 | `ui/button.tsx:25` | `text-[0.8rem]` | styl `small` (sekcja 4) |

Wszystkie warianty `dark:` z tych plików znikają, bo tokeny mają własną wartość w `.dark`.

## 2. Kontrast par w obu motywach

Progi: tekst 4,5 : 1; duży tekst (≥ 24 px albo ≥ 18,66 px pogrubiony) i elementy UI 3 : 1 (WCAG 1.4.3, 1.4.11). „Kontrola” = para, której **nie wolno** użyć; liczę ją, żeby uzasadnić zasadę.

| # | Para | Próg | Light | | Dark | | Gdzie |
|---|---|---|---|---|---|---|---|
| 1 | `--foreground` na `--background` | tekst 4,5 | 19,13 : 1 | ok | 17,57 : 1 | ok | tekst główny |
| 2 | `--foreground` na `--card` | tekst 4,5 | 19,13 : 1 | ok | 16,27 : 1 | ok | tekst w karcie, cena |
| 3 | `--foreground` na `--surface-product` | tekst 4,5 | 17,27 : 1 | ok | 16,27 : 1 | ok | nazwa i cena na karcie produktu |
| 4 | `--foreground` na `--muted` | tekst 4,5 | 17,27 : 1 | ok | 14,74 : 1 | ok | tekst na muted (nagłówek tabeli) |
| 5 | `--foreground` na `--popover` | tekst 4,5 | 19,13 : 1 | ok | 14,74 : 1 | ok | menu, popover |
| 6 | `--muted-foreground` na `--background` | tekst 4,5 | 6,25 : 1 | ok | 8,28 : 1 | ok | opis, podpis, placeholder |
| 7 | `--muted-foreground` na `--card` | tekst 4,5 | 6,25 : 1 | ok | 7,67 : 1 | ok | podpis w karcie |
| 8 | `--muted-foreground` na `--surface-product` | tekst 4,5 | 5,65 : 1 | ok | 7,67 : 1 | ok | „No image”, podpis na karcie produktu (audyt: 4,35) |
| 9 | `--muted-foreground` na `--muted` | tekst 4,5 | 5,65 : 1 | ok | 6,95 : 1 | ok | podpis w nagłówku tabeli, skeleton |
| 10 | `--muted-foreground` na `--accent` | tekst 4,5 | 5,50 : 1 | ok | 6,95 : 1 | ok | podpis w wierszu w hover |
| 11 | `--muted-foreground` na `--popover` | tekst 4,5 | 6,25 : 1 | ok | 6,95 : 1 | ok | opis w menu |
| 12 | `--primary-foreground` na `--primary` | tekst 4,5 | 16,98 : 1 | ok | 15,50 : 1 | ok | przycisk główny admina |
| 13 | `--primary-foreground` na `--primary-hover` | tekst 4,5 | 13,14 : 1 | ok | 12,08 : 1 | ok | przycisk główny admina, hover |
| 14 | `--secondary-foreground` na `--secondary` | tekst 4,5 | 15,57 : 1 | ok | 14,74 : 1 | ok | przycisk drugorzędny |
| 15 | `--accent-foreground` na `--accent` | tekst 4,5 | 15,57 : 1 | ok | 14,74 : 1 | ok | ghost/outline w hover |
| 16 | `--action-foreground` na `--action` | tekst 4,5 | 6,35 : 1 | ok | 5,16 : 1 | ok | CTA zakupowe |
| 17 | `--action-foreground` na `--action-hover` | tekst 4,5 | 8,12 : 1 | ok | 6,35 : 1 | ok | CTA zakupowe, hover |
| 18 | `--destructive` na `--background` | tekst 4,5 | 6,62 : 1 | ok | 7,19 : 1 | ok | tekst błędu |
| 19 | `--destructive` na `--card` | tekst 4,5 | 6,62 : 1 | ok | 6,66 : 1 | ok | błąd w karcie |
| 20 | `--destructive` na `--destructive-surface` | tekst 4,5 | 5,70 : 1 | ok | 5,79 : 1 | ok | badge Cancelled, alert błędu |
| 21 | `--link` na `--background` | tekst 4,5 | 6,71 : 1 | ok | 8,91 : 1 | ok | link w treści |
| 22 | `--link` na `--card` | tekst 4,5 | 6,71 : 1 | ok | 8,25 : 1 | ok | link w karcie / tabeli |
| 23 | `--link` na `--muted` | tekst 4,5 | 6,06 : 1 | ok | 7,48 : 1 | ok | link na muted |
| 24 | `--success` na `--background` | tekst 4,5 | 6,80 : 1 | ok | 10,08 : 1 | ok | „Added to cart.”, sukces formularza |
| 25 | `--success` na `--card` | tekst 4,5 | 6,80 : 1 | ok | 9,33 : 1 | ok | sukces w karcie |
| 26 | `--success` na `--success-surface` | tekst 4,5 | 6,14 : 1 | ok | 7,81 : 1 | ok | badge Paid / Published |
| 27 | `--warning` na `--background` | tekst 4,5 | 6,69 : 1 | ok | 10,83 : 1 | ok | ostrzeżenie (slug, draft AI) |
| 28 | `--warning` na `--card` | tekst 4,5 | 6,69 : 1 | ok | 10,03 : 1 | ok | ostrzeżenie w karcie |
| 29 | `--warning` na `--warning-surface` | tekst 4,5 | 5,96 : 1 | ok | 8,31 : 1 | ok | badge Pending payment, alert ostrzeżenia |
| 30 | `--demo` na `--demo-surface` | tekst 4,5 | 8,55 : 1 | ok | 10,20 : 1 | ok | pasek Demo store, badge DEMO, notka demo |
| 31 | `--demo` na `--background` | tekst 4,5 | 10,19 : 1 | ok | 13,30 : 1 | ok | tekst DEMO bez tła |
| 32 | `--frame-foreground` na `--frame` | tekst 4,5 | 18,34 : 1 | ok | 19,41 : 1 | ok | nagłówek/stopka sklepu |
| 33 | `--frame-muted-foreground` na `--frame` | tekst 4,5 | 8,28 : 1 | ok | 8,77 : 1 | ok | stopka: drugorzędny tekst, placeholder wyszukiwarki |
| 34 | `--sidebar-foreground` na `--sidebar` | tekst 4,5 | 14,35 : 1 | ok | 16,41 : 1 | ok | menu boczne admina |
| 35 | `--sidebar-muted-foreground` na `--sidebar` | tekst 4,5 | 7,67 : 1 | ok | 8,77 : 1 | ok | etykiety grup w menu |
| 36 | `--sidebar-accent-foreground` na `--sidebar-accent` | tekst 4,5 | 13,14 : 1 | ok | 15,39 : 1 | ok | aktywna pozycja menu |
| 37 | `--sidebar-foreground` na `--sidebar-accent` | tekst 4,5 | 11,11 : 1 | ok | 13,01 : 1 | ok | pozycja menu w hover |
| 38 | `--input` na `--background` | UI 3 | 3,66 : 1 | ok | 3,94 : 1 | ok | obrys pola, checkbox, select (audyt: 1,26) |
| 39 | `--input` na `--card` | UI 3 | 3,66 : 1 | ok | 3,65 : 1 | ok | obrys pola w karcie |
| 40 | `--input` na `--muted` | UI 3 | 3,30 : 1 | ok | 3,31 : 1 | ok | obrys pola na muted |
| 41 | `--ring` na `--background` | UI 3 | 19,13 : 1 | ok | 15,50 : 1 | ok | pierścień fokusu (audyt: 1,54) |
| 42 | `--ring` na `--card` | UI 3 | 19,13 : 1 | ok | 14,35 : 1 | ok | fokus w karcie |
| 43 | `--ring` na `--surface-product` | UI 3 | 17,27 : 1 | ok | 14,35 : 1 | ok | fokus na karcie produktu |
| 44 | `--ring` na `--muted` | UI 3 | 17,27 : 1 | ok | 13,01 : 1 | ok | fokus na muted |
| 45 | `--action` na `--background` | UI 3 | 6,62 : 1 | ok | 3,55 : 1 | ok | granica CTA wobec tła |
| 46 | `--action` na `--surface-product` | UI 3 | 5,98 : 1 | ok | 3,28 : 1 | ok | CTA na karcie produktu |
| 47 | `--action` na `--card` | UI 3 | 6,62 : 1 | ok | 3,28 : 1 | ok | CTA w karcie podsumowania koszyka |
| 48 | `--primary` na `--background` | UI 3 | 17,71 : 1 | ok | 15,50 : 1 | ok | granica przycisku głównego admina |
| 49 | `--destructive` na `--background` | UI 3 | 6,62 : 1 | ok | 7,19 : 1 | ok | obrys pola z błędem |
| 50 | `--frame-input` na `--frame` | UI 3 | 3,94 : 1 | ok | 4,17 : 1 | ok | obrys wyszukiwarki w ciemnym nagłówku |
| 51 | `--frame-ring` na `--frame` | UI 3 | 18,34 : 1 | ok | 19,41 : 1 | ok | fokus w nagłówku/stopce |
| 52 | `--frame-accent` na `--frame` | UI 3 | 5,61 : 1 | ok | 5,94 : 1 | ok | akcent marki w nagłówku |
| 53 | `--sidebar-primary` na `--sidebar` | UI 3 | 5,19 : 1 | ok | 5,94 : 1 | ok | czerwony znacznik aktywnej pozycji |
| 54 | `--sidebar-primary` na `--sidebar-accent` | UI 3 | 4,02 : 1 | ok | 4,71 : 1 | ok | znacznik na tle aktywnej pozycji |
| 55 | `--sidebar-ring` na `--sidebar` | UI 3 | 16,98 : 1 | ok | 19,41 : 1 | ok | fokus w menu bocznym |
| 56 | `--warning-border` na `--warning-surface` | UI 3 | 3,31 : 1 | ok | 3,95 : 1 | ok | obrys alertu ostrzeżenia |
| 57 | `--border` na `--background` | UI 3 | 1,30 : 1 | **PONIŻEJ** | 1,39 : 1 | **PONIŻEJ** | obrys karty, separator (dekoracyjny) |
| 58 | `--border` na `--surface-product` | UI 3 | 1,17 : 1 | **PONIŻEJ** | 1,29 : 1 | **PONIŻEJ** | separator na karcie produktu (dekoracyjny) |
| 59 | `--ring` na `--action` | kontrola | 2,88 : 1 | kontrola | 4,36 : 1 | kontrola | fokus bez odstępu na CTA |
| 60 | `--ring` na `--primary` | kontrola | 1,08 : 1 | kontrola | 1,00 : 1 | kontrola | fokus bez odstępu na przycisku głównym |
| 61 | `--action` na `--frame` | kontrola | 2,88 : 1 | kontrola | 3,75 : 1 | kontrola | czerwień akcji bezpośrednio na ciemnej ramie |
| 62 | `--action-foreground` na `--frame-accent` | kontrola | 3,26 : 1 | kontrola | 3,26 : 1 | kontrola | biały tekst na jasnej czerwieni ramy |

### Oznaczone pary i poprawki

| Para | Wynik | Poprawka |
|---|---|---|
| **Było** `--input`/`--border` `#e5e5e5` na białym (audyt) | 1,26 : 1 | Rozdzielone: `--input` `#85858d` (3,66 : 1 light, 3,94 : 1 dark) dla granic kontrolek, `--border` tylko dla dekoracji |
| **Było** `ring-ring/50` `#d0d0d0` na białym (audyt); pełny `--ring` bez `/50` też tylko 2,58 : 1 | 1,54 : 1 | `--ring` `#0f0f12` bez przezroczystości, 19,13 : 1; w dark `#e7e7ea` 15,50 : 1 |
| **Było** w dark: `--input` 15% bieli na tle | 1,48 : 1 | `--input` dark `#717177`, 3,94 : 1 |
| **Było** w dark: pierścień `/50` | 1,88 : 1 | `--ring` dark 15,50 : 1 |
| **Było** „No image” `--muted-foreground` na `--muted` | 4,35 : 1 | `--muted-foreground` `#5f6067`: 5,65 : 1 |
| 57–58: `--border` na tle | 1,17–1,39 : 1 | Celowo poniżej progu: separatory i obrys karty są dekoracyjne (WCAG 1.4.11 ich nie obejmuje). **Zasada:** `--border` nigdy nie jest jedyną granicą pola, checkboxa ani przycisku outline. Tam zawsze `--input` |
| 59–60: pierścień bez odstępu na CTA i przycisku głównym | 1,00–2,88 : 1 | **Zasada:** `outline-offset: 2px` jest obowiązkowy. Przerwa w kolorze tła daje kontrast pary 41–44 |
| 61: `--action` bezpośrednio na ciemnej ramie | 2,88 : 1 (light) | **Zasada:** w nagłówku i stopce nie ma czerwonego wypełnienia. Akcent marki to `--frame-accent` (5,61 : 1), przycisk koszyka jest neutralny |
| 62: biały tekst na `--frame-accent` | 3,26 : 1 | **Zasada:** `--frame-accent` i `--sidebar-primary` to tylko znaki i kreski, bez tekstu na nich |
| Dark `--action` na `--surface-product` przy pierwszej wersji (`gray-800`) | 2,98 : 1 | Poprawione w trakcie: `--surface-product` dark = `gray-850`, teraz 3,28 : 1 |
| 40: `--input` na `--muted` | 3,30 / 3,31 : 1 | Przechodzi z małym zapasem. Pola stawiamy na `--background`/`--card`; na `--muted` tylko filtry tabeli |
| 16 dark: CTA 5,16 : 1 | ok | Zapas mniejszy niż w light (6,35). Nie przyciemniać tła CTA w dark bez ponownego liczenia |

## 3. Skala odstępów i gęstość

**Jedna skala (siatka 4 px):** 4, 8, 12, 16, 24, 32, 48, 64, 96 px. To klasy Tailwinda `1, 2, 3, 4, 6, 8, 12, 16, 24` (`--spacing: 0.25rem` zostaje). **Wypadają** 2, 6 i 10 px (`*-0.5`, `*-1.5`, `*-2.5`, 27 użyć z audytu): 6 → 4 albo 8, 10 → 8 albo 12. Wyjątek: 2 px tylko wewnątrz badge'a (pionowy padding), zapisany w komponencie.

| Relacja | Token | Sklep | Admin (desktop) | Przykład |
|---|---|---|---|---|
| W grupie (etykieta–pole, ikona–tekst, cena–stan) | `--space-related` | 8 | 4–8 | etykieta nad polem, ikona w przycisku |
| Między elementami grupy (pola formularza, wiersze listy) | `--space-group-item` | 16 | 12 | kolejne pola checkoutu |
| Między grupami | `--space-group` | 24 | 16 | adres → dane kontaktowe; filtry → tabela |
| Wewnątrz panelu (padding karty) | `--space-panel` | 24 (kafel produktu 16) | 16 | karta podsumowania koszyka; karta metryki |
| Między sekcjami | `--space-section` | 64 (telefon 48) | 32 (telefon 24) | hero → kategorie → polecane |
| Hero / duże odstępy strony głównej | `--space-hero` | 96 (telefon 48) | – | R01 (sekcje 96–108 px), K6 krótki hero |
| Gutter strony | `--space-gutter` | 16 (telefon), 24 (tablet), 32 (desktop) | 16 / 24 | brak przewijania w bok przy 320 px |

**Gęstość (tokeny komponentowe w dwóch zakresach, np. `[data-density="store"]` i `[data-density="admin"]` na layoucie, P15):**

| | Sklep | Admin desktop | Telefon (< 768 px albo `pointer: coarse`), oba |
|---|---|---|---|
| Kontrolka `sm` | 40 px (CTA w karcie produktu, R01) | 28 px (akcje w wierszu tabeli) | 44 px |
| Kontrolka `md` (domyślna) | 44 px | 32 px (R04.3) | 44 px |
| Kontrolka `lg` | 48 px (CTA na stronie produktu i w koszyku, R01 48, R03 48) | 36 px | 48 px |
| Tekst w kontrolce | 16 px / 500 | 14 px / 500 | 16 px w polach (bez zoomu iOS) |
| Wiersz tabeli | – | 44 px (R04.1 ok. 53 px z miniaturą) | lista kart zamiast tabeli |
| Kolumny listingu | 3–4 (K3: liczba otwarta) | – | 2 (pół szerokości) albo 1 |

## 4. Typografia

### Kandydaci na krój (darmowe, `next/font/google`, samohostowane w buildzie, Latin Extended)

Sprawdziłem w `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`: każdy z trzech ma subset `latin-ext` i oś `wght` (fonty zmienne).

| Krój | Dlaczego | Ryzyko | Link |
|---|---|---|---|
| **Archivo** (Omnibus-Type) | Jedna rodzina zmienna z osią szerokości `wdth` 62–125 i `wght` 100–900. Display = węższa odmiana (ok. `wdth` 85–90), 650–700, ciasno; treść = `wdth` 100, 400. To odpowiednik R01.2 (display + text tej samej rodziny) w jednym pliku. Zwarty, „sportowy” charakter: wyrazisty bez ozdobników | Oś `wdth` trzeba włączyć w `next/font` (`axes: ["wdth"]`), co zwiększa plik. Cyfry tabelaryczne (`tnum`) do sprawdzenia w etapie 1 | https://fonts.google.com/specimen/Archivo |
| **Schibsted Grotesk** (Bakken & Bæck dla Schibsted) | Grotesk z prasy informacyjnej, robiony pod gęste dane i nagłówki. `wght` 400–900: 700 w nagłówkach daje mocną hierarchię, 400 w treści jest spokojna. Najbezpieczniejszy dla cen i tabel admina | Najmniej „gamingowy”, charakter niesie głównie waga i ciasny tracking | https://fonts.google.com/specimen/Schibsted+Grotesk |
| **Funnel Display + Funnel Sans** (NORD ID dla Funnel) | Para zaprojektowana razem: odmiana display z wyraźnymi kształtami do nagłówków i spokojna odmiana sans do treści. To najdokładniejszy odpowiednik `neue-haas-grotesk-display` + `-text` z R01.2 | Dwa pliki fontów zamiast jednego. Display ma najwięcej „osobowości”, więc trzeba go trzymać tylko w display/h1/h2 | https://fonts.google.com/specimen/Funnel+Display, https://fonts.google.com/specimen/Funnel+Sans |

Odrzuceni (poza Inter, Roboto, Geist): **Space Grotesk**, bo wywodzi się z kroju mono (K2 odrzucił monospace) i jest bardzo częsty na stronach generowanych przez AI. **Bricolage Grotesque**, bo jest dziś jednym z najczęściej podsuwanych „alternatywnych” krojów w promptach frontendowych, więc szybko stanie się nową średnią.

### Nazwane style tekstu (6 na kontekst)

Rozmiar / interlinia / grubość, tracking. Rozmiary nagłówków sklepu są płynne (`clamp`) między telefonem a 1440 px. Krój: display, h1, h2 = `--font-heading`; h3, body, small = `--font-sans`. Ceny: `--font-sans` + `tabular-nums`.

| Styl | Sklep: telefon → desktop | Admin | Gdzie | Gdzie nie |
|---|---|---|---|---|
| `display` | 40/44 → 56/60, 700, −0,02 em | 24/32, 600, `tabular-nums` (wartość metryki) | hero (sklep); liczby metryk dashboardu (admin) | więcej niż 1 na ekranie |
| `h1` | 28/32 → 40/44, 700, −0,015 em | 24/32, 600, −0,01 em | tytuł strony (kategoria, nazwa produktu, „Cart”) / tytuł strony admina | nazwy w kartach |
| `h2` | 20/28 → 24/32, 600, −0,01 em | 16/24, 600 | sekcje („Featured”, „Order summary”) / nagłówek karty i sekcji formularza | – |
| `h3` | 18/24, 600 | 14/20, 600 | nazwa produktu w karcie, cena w karcie (`tabular-nums`) / nagłówek grupy pól | tekst ciągły |
| `body` | 16/24, 400 | 14/20, 400 (tabela też 14/20) | treść, opis produktu (`max-width: 65ch`) / treść, komórki tabeli | – |
| `small` | 14/20, 500 | 12/16, 500 | etykiety pól, stan magazynu, podpisy, przyciski `sm` / badge, metadane, podpowiedzi | treść wymagana do decyzji zakupowej; tekst < 12 px (A01) |

Wynik: 9 rozmiarów z audytu (z 12,8 px spoza skali) zastępuje 10 wartości z jednej skali: 12, 14, 16, 18, 20, 24, 28, 40, 44 (tylko interlinia), 56. Każdy rozmiar jest przypisany do nazwanego stylu, a agent wybiera styl, nie rozmiar.

## 5. Kształt, głębia, ruch, fokus

- **Promień:** `--radius: 0.5rem`. W `@theme inline` jawnie: `--radius-lg: var(--radius)` (8 px, kontrolki, bo `button`, `input` mają `rounded-lg`) i `--radius-xl: 0.75rem` (12 px, karty). Usunąć `rounded-[min(var(--radius-md),10px|12px)]` z `ui/button.tsx` (rozmiary `xs`, `sm`, `icon-*`) i `rounded-4xl` z `ui/badge.tsx`. Pigułka (`rounded-full`) tylko dla licznika koszyka (P4).
- **Cień:** karty bez cienia (`--shadow-card: none`), oddzielone tłem (`--surface-product` na `--background`) albo `--border`. Jeden cień nakładki `--shadow-overlay` dla menu, popovera, dialogu i menu mobilnego. W dark cień prawie znika, więc nakładka ma zawsze obrys `--border` i jaśniejsze tło `--popover`.
- **Ruch (P9):**
  - hover i kolor: `--duration-fast` 120 ms, `ease-out`;
  - menu, popover, rozwijanie: `--duration-base` 200 ms wejście (`--ease-out`), 150 ms wyjście (`--ease-in`);
  - dialog i panel: `--duration-slow` 300 ms;
  - każda reakcja na akcję przed 400 ms (próg Doherty'ego), dłuższa operacja dostaje stan ładowania (skeleton albo przycisk w stanie `pending`);
  - bez pętli i animacji dekoracyjnych; wyjątek to pulsowanie skeletonu;
  - `@media (prefers-reduced-motion: reduce)`: ruch (`transform`, przesuwanie, `active:translate-y-px`) wyłączony, przejścia przezroczystości skrócone do ≤ 120 ms, pulsowanie skeletonu zatrzymane.
- **Pierścień fokusu (zastępuje `outline-ring/50`, `ring-3 ring-ring/50`, `ring-[3px]`):**
  - tylko `:focus-visible`, `outline: 2px solid var(--ring); outline-offset: 2px`;
  - kolor `--ring`: neutralny (grafit w light, prawie biały w dark), 13,01–19,13 : 1 do każdej powierzchni (pary 41–44);
  - w ramie i menu bocznym zakres nadpisuje `--ring` na `--frame-ring` / `--sidebar-ring` (pary 51, 55);
  - offset jest obowiązkowy, bo bez niego pierścień na CTA ma 2,88 : 1, a na przycisku głównym 1,00 : 1 (pary 59–60);
  - pole w fokusie: obrys zmienia się z `--input` na `--ring` (1 px) plus `outline`; pole z błędem zostaje z obrysem `--destructive`, ale fokus nadal ma `--ring` (nie czerwony pierścień);
  - spełnia WCAG 2.4.7 (AA) i wymóg kontrastu 3 : 1 z 2.4.13.

## 6. Ikony: lucide czy zmiana

Dziś aplikacja używa tylko 2 ikon lucide (`SearchIcon`, `ShoppingCart`) i znaku `☰` (audyt). Zmiana jest więc tania teraz i droga później.

| Opcja | Za | Przeciw |
|---|---|---|
| **Zostać przy lucide** | Już zainstalowany; `components.json` ma `iconLibrary: lucide`, więc `npx shadcn add` generuje gotowe importy; ok. 1500 ikon, licencja ISC, import pojedynczych ikon; spójna siatka 24 px | Lekcja: lucide to część domyślnego wyglądu shadcn; jedna grubość (2 px) przy 16 px wygląda „szablonowo”; charakter musi wtedy nieść typografia i kolor |
| **Phosphor** (`@phosphor-icons/react`) | 6 grubości (`bold` pasuje do „wyrazisty” i do ciężkiego groteska); ponad 9000 ikon; licencja MIT; wyraźnie inny niż domyślny shadcn | Nowa zależność (wymaga uzasadnienia, AGENTS.md); komponenty dodane przez shadcn trzeba ręcznie przepinać z lucide; większy pakiet przy złym imporcie |
| **Tabler Icons** (`@tabler/icons-react`) | Ponad 5000 ikon; regulowana grubość kreski; licencja MIT; geometryczny, „techniczny” rysunek pasuje do sprzętu gamingowego | Nowa zależność; ręczne przepinanie po `shadcn add`; styl bliski lucide, więc mniej odróżnia |

Propozycja P11 brzmiała: zostać przy lucide. **Właściciel ją odrzucił i wybrał Tabler Icons** (`@tabler/icons-react`, licencja MIT). Nowa zależność ma uzasadnienie: decyzja DS, regulowana grubość kreski i odejście od domyślnego wyglądu shadcn. Zasady:

- rozmiary: 16 px w adminie, 20 px w sklepie, 24 px w ramie; kreska 2 px przy 20–24 px, 1,75 px przy 16 px (do potwierdzenia w Storybooku);
- `☰` → `IconMenu2`, `SearchIcon` → `IconSearch`, `ShoppingCart` → `IconShoppingCart`; bez ikon dekoracyjnych;
- w `components.json` ustawić `iconLibrary` na Tabler, jeśli zainstalowana wersja shadcn to obsługuje (do sprawdzenia przy wdrożeniu). Jeśli nie, każdy komponent po `npx shadcn add` przepinamy ręcznie z lucide i sprawdzamy w review;
- po przepięciu odinstalować `lucide-react` i dodać do ESLint `no-restricted-imports` z zakazem jego importu, żeby nie wrócił z kolejnym `shadcn add`.

## 7. Decyzje, które nie są tokenami (zasady i cechy komponentów)

1. **Cena nigdy w kolorze akcji** (R03.1, A01 podpis 1). Cena ma `--foreground`, styl `h3` albo `body` 600, `tabular-nums`.
2. **Czerwień akcji tylko na akcjach zakupu**: Add to cart, Checkout, Place order, Pay (demo). Najwyżej jeden czerwony przycisk w widocznym obszarze ekranu. Reszta jest neutralna (`--primary`, `outline`, `ghost`). (R03.1, A01 podpis 2.)
3. **Czerwień nie stoi bezpośrednio na ciemnej ramie** (para 61: 2,88 : 1). Przycisk koszyka w nagłówku jest neutralny; czerwień w ramie to tylko `--frame-accent` jako znak lub kreska, bez tekstu na niej (para 62).
4. **Admin: kolor tylko dla znaczenia** (R04.2): statusy, linki, błędy. Główna akcja to `--primary` (grafit). Czerwień tylko jako `--sidebar-primary` (znacznik aktywnej pozycji, logo). W adminie nie ma `--action`.
5. **Błąd to nie akcja.** Błąd = tekst + ikona + `aria-invalid`, nigdy wypełniony czerwony przycisk w sklepie. Usuwanie w adminie to `destructive` jako tekst/obrys na `--destructive-surface`.
6. **Etykiety na zdjęciu produktu: najwyżej 1–2**, jeden neutralny styl, status zawsze tekstem (R03.4, A01 podpis 6).
7. **Karta produktu = jedna powierzchnia** (audyt: karta w karcie w karcie). Obraz do krawędzi na `--surface-product`, bez ramki kafla, bez cienia, bez ramki w SVG.
8. **Bez gradientów** w tłach, banerach i przyciskach; **bez cienia na kartach** (A01 podpisy 3, 4).
9. **Jedna rodzina sans w UI**, tekst nigdy < 12 px; w sklepie na telefonie treść ≥ 16 px, pola 16 px (A01 podpis 5).
10. **Status nigdy samym kolorem.** Badge zawsze z tekstem; statusy różnią się też wariantem (P2: `pending_payment` = warning, `paid` = success, `processing` = secondary, `shipped` = outline z mocnym tekstem, `cancelled` = destructive-surface, `refunded` = outline). Dziś `paid` i `processing` mają ten sam wariant (audyt).
11. **Demo zawsze `--demo`, nigdy `--warning`** (P3). Pasek „Demo store”, badge DEMO i notka płatności demo wyglądają tak samo; ostrzeżenia mają własny wygląd.
12. **`--border` nigdy nie jest jedyną granicą kontrolki** (para 57). Pola, checkboxy, radio, select i przycisk outline mają `--input`.
13. **Fokus zawsze widoczny, z offsetem 2 px**; po nieudanym wysłaniu formularza fokus idzie na pierwsze błędne pole (audyt, decyzja 5).
14. **Stany kolorami, nie przezroczystością:** hover `--primary-hover` / `--action-hover`, wyłączony = `--muted` + `--muted-foreground` + `cursor: not-allowed` + powód obok (P5), zamiast `opacity-50` i `bg-primary/80`.
15. **Tekst ciągły ≤ 65 znaków** (`--measure-prose`), m.in. `/orders/lookup` (audyt: 84 znaki).
16. **Cele dotyku:** ≥ 44 px na telefonie w sklepie i adminie, ≥ 24 px wszędzie (WCAG 2.5.8), także linki w stopce i nawigacji.
17. **Komunikaty rzeczowe o faktach, które produkt ma** (R03.3, K5): stan magazynu, cena, status zamówienia, etykieta demo. Bez obietnic wysyłki i komunikatów o realnej logistyce (AGENTS.md zasada 6).
18. **Rama sklepu:** ciemny nagłówek i stopka, a listing, produkt, koszyk i checkout zawsze jasne (R02.1); strona główna jasna, krótki hero, potem od razu kategorie (K6).
19. **Motyw:** klasa `.dark` na `<html>`, przełącznik plus ustawienie systemowe; każda nowa para kolorów liczona w obu motywach przed zapisem.
20. **Copilot bez „magii AI”:** wygląd z reguł admina (R04.2): karty rekomendacji neutralne, priorytet jako badge z tekstem, bez fioletu, iskierek i gradientów (luka „Copilot”, A02/A03 nieprzyjęte jako antyreferencje, ale wynika to z decyzji 4 powyżej).

## 8. Pytania do właściciela i rozstrzygnięcia

**Rozstrzygnięcia z 2026-10-24:**

| # | Pytanie | Decyzja |
|---|---|---|
| 1 | Czerwień błędu a czerwień akcji | **Ten sam `red-600`** dla `--action` i `--destructive`; rozróżnia je forma (zasada 5) |
| 2 | Pierścień fokusu | **Neutralny grafit** (`--ring`, 13,01–19,13 : 1) |
| 3 | Krój | **Archivo** (zmienna rodzina z osiami `wght` i `wdth`: display w węższej odmianie, treść w `wdth` 100) |
| 4 | Tło sklepu | **Białe body + szara karta produktu** (`--surface-product`, R01.3) |
| 5 | Ikony | **Tabler Icons** zamiast lucide (P11 odrzucona, sekcja 6) |
| P1–P15 | Propozycje | **Przyjęte wszystkie poza P11**. P12: **usunąć** nieużywane `--chart-1…5`, wrócą razem z pierwszym wykresem |

Wartości kolorów zostały bez zmian, więc kontrast z sekcji 2 obowiązuje bez przeliczania.

### Pytania w brzmieniu z propozycji

1. **Czerwień błędu = czerwień akcji?** Proponuję jeden surowy `red-600` dla `--action` i `--destructive` (w light), a rozróżnienie formą (zasada 5). Alternatywa: przesunąć błąd w stronę pomarańczowej czerwieni (hue ok. 35), żeby oko nie łączyło „błąd” z „kup”.
2. **Pierścień fokusu: neutralny czy czerwony?** Proponuję neutralny (19,13 : 1), bo czerwony pierścień myli się z polem w błędzie i ginie na czerwonym CTA. Czerwony (6,62 : 1 na białym) byłby bardziej „marką”.
3. **Krój:** Archivo, Schibsted Grotesk czy Funnel Display + Funnel Sans? Moja kolejność: Archivo (jedna rodzina, dwie szerokości), Funnel (najbliżej R01.2), Schibsted (najbezpieczniejszy).
4. **Tło strony sklepu: białe z szarą kartą produktu** (R01.3, proponuję) **czy lekko szare body z białymi kartami** (R02.1, `#eeeef1` + biel)?
5. **Ikony:** zostajemy przy lucide (P11) czy zmieniamy na Phosphor (6 grubości) albo Tabler?

### Propozycje (rozstrzygnięte w tabeli powyżej)

| # | Propozycja | Skąd |
|---|---|---|
| P1 | Token `--link` (niebieski `#0b58bb` / `#85b3f7`) dla linków w tekście i nazw zasobów w tabelach admina; bez niego linki = `--foreground` + podkreślenie | R04.2 („link”) |
| P2 | Mapa statusów zamówień na warianty badge (zasada 10) | audyt (`paid` = `processing`) |
| P3 | Osobny `--demo` obok `--warning` (dziś oba to amber z palety) | audyt, decyzja 4 |
| P4 | Badge 4 px, filtry kategorii 8 px jak przyciski, pigułka tylko dla licznika koszyka | audyt (dwa języki kształtu), K4 |
| P5 | Stan wyłączony bez `opacity-50`: `--muted` + `--muted-foreground` + widoczny powód | lekcja (stany osobnymi kolorami) |
| P6 | Chłodne neutralne (hue 285, chroma ≤ 0,012) zamiast czystego `neutral` shadcn | R01.3 `#f1f1f6`, R02.1 `#eeeef1` |
| P7 | Jawne tokeny hover `--primary-hover`, `--action-hover` zamiast `/80` | lekcja |
| P8 | Jeden cień `--shadow-overlay`, tylko dla nakładek | R01 (1 cień), A01 podpis 4 |
| P9 | Wartości ruchu: 120 / 200 / 300 ms, `ease-out` / `ease-in`, reduced-motion | luka „Ruch i reakcja” |
| P10 | Przemalować 15 ilustracji SVG demo na neutralne szarości + co najwyżej `red-600`, usunąć fiolet i indygo | audyt (jedyny kolor z palety Tailwinda) |
| P11 | Zostać przy lucide z rozmiarami 16 / 20 / 24 px, `☰` → `Menu` | sekcja 6 |
| P12 | `--chart-1…5`: zostawić bez zmian (dziś nieużywane) albo usunąć | grep `src` |
| P13 | `--font-mono` (Geist Mono) tylko dla numeru zamówienia i SKU; ceny w kroju treści z `tabular-nums` | audyt, decyzja 2 |
| P14 | W dark rama i menu boczne ciemniejsze od tła (`#060607` na `#0f0f12`), żeby rama nadal była „ramą” | Motyw, R02.1 |
| P15 | Gęstość jako zakres na layoucie (`data-density="store"` / `"admin"`), który ustawia `--control-h-*` i odstępy | K7 |

Po zmianie którejkolwiek wartości przeliczę kontrast skryptem jeszcze raz i pokażę pary, które spadły poniżej progu (punkt 8 promptu). Do repozytorium zapiszę dopiero po zatwierdzeniu.
