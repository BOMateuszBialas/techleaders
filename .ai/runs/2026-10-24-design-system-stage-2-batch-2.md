# Run: design system, etap 2, partia 2 (Select, Checkbox, Radio group, Badge, Alert, Card)

- Data: 2026-10-24. Agent: Claude (subagent), gałąź `design/stage-2-batch-2` (worktree `wt-ds-batch2`), z `main` po merge'u partii 1 (#104, `ea8edc0`).
- Spec: `.ai/specs/2026-10-24-design-system.md`. Plan i stan: `.ai/design/POSTEP.md`, sekcja „Etap 2, partia 2”.

## Cel

Krok 1 partii 2 według promptu Storybooka: lista różnic kształtu, gęstości i stanów względem bazy (shadcn `base-nova` 4.21.4 na Base UI 1.9), z jedną rekomendacją, źródłem, ekranami, zmianą wizualną i ryzykiem dla testów przy każdym punkcie. Bez implementacji i bez PR; właściciel akceptuje punkty osobno.

## Kroki

1. Lektura: prompt lekcji 06, spec, POSTEP (format i decyzje partii 1), `tokeny.md`, `referencje.md`, `audyt.md`, log partii 1, `.ai/lessons.md`, `components/ui/*` (badge, card, button, input, field), `globals.css` (tokeny gęstości).
2. Baza: `npx shadcn view native-select select checkbox radio-group alert` w głównym checkoutcie (tylko podgląd rejestru, nic nie zapisuje). Wynik: każdy element zależy tylko od `cn`; `native-select` i `alert` bez `"use client"`; `alert` ma na sztywno `role="alert"` i część `AlertAction`; checkbox i radio to Base UI z `rounded-[4px]`, `ring-ring/50`, `opacity-50`; opcje natywnego selecta mają `bg-[Canvas]`.
3. Base UI 1.9 `CheckboxRoot`: `id` z propsa trafia do ukrytego `<input>`, a `span` z rolą dostaje wygenerowane id (ważne dla e2e po retroficie).
4. Inwentaryzacja użyć: 3 natywne `<select>` (2 lokalne `SELECT_CLASS`), 2 natywne checkboxy, 1 grupa radio (przełącznik motywu, spec A5), Badge w 13 miejscach w 9 plikach, Card w 5 plikach, ok. 25 komunikatów `<p role="alert|status|note">` bez komponentu.
5. Kontrast nowych par (skrypt tymczasowy poza repo, na `lib.mjs` i `tokens.mjs`): tekst `--foreground` na 4 tłach `--*-surface` 13,48–17,28 : 1; obrysy alertów 5,70–10,20 : 1; tła `--*-surface` do strony 1,10–1,28 : 1 (stąd obrys alertu); `--secondary` na `--surface-product` 1,02 : 1 (neutralny badge znika na karcie produktu); karta do tła w ciemnym motywie 1,08 : 1 (obrys jedyną granicą).
6. Ryzyko testów: unit sprawdzają tekst badge'ów, nie klasy; e2e używają `select` na `#product-status` i `#catalog-search-category` oraz `click` na `#product-featured` i `#confirm-cancelled` (dotyczy dopiero retrofitu).
7. Lista B2.1–B2.31, pytania Q1–Q5 i trzy usunięcia z bazy (Select `sm`, Badge `link`, `AlertAction`) w POSTEP.

## Decyzje

- Bez nowych zależności; plan CLI: `npx shadcn add native-select checkbox radio-group alert` (4 nowe pliki, nic nie nadpisuje), bez `add badge`, `add card`, `add select`, `add field`.
- Wszystkie rekomendacje czekają na właściciela (prompt: stop po każdym kroku).

## Wynik kroku 1

Commit lokalny z POSTEP i tym logiem (lista różnic). Bez zmian w kodzie.

## Decyzje właściciela (2026-10-24)

Q1–Q5 zgodnie z rekomendacjami; B2.1–B2.31 przyjęte, w tym trzy usunięcia z bazy (Select `sm`, Badge `link`, `AlertAction`).

## Implementacja (2026-10-24 – 2026-10-25)

1. Tokeny: `--choice-offset` (sklep 0, admin 2 px) i `--grid-template-columns-card-header` w `globals.css`; wiersz w `tokeny.md` §1, `token-data.ts`.
2. Pary kontrastu 63–71 w `tokeny.md` §2, `kontrast/tokens.mjs` i `kontrast/pairs.md` (tekst i link na 4 tłach `--*-surface`, `--primary` na `--card`); `verify-css.mjs`: 68 par w obu motywach, wszystkie niedekoracyjne przechodzą.
3. Nowe `ui/native-select.tsx`, `checkbox.tsx`, `radio-group.tsx`, `alert.tsx`; przepisane `badge.tsx`, `card.tsx`; `field.tsx` z poziomą orientacją i `FieldContent`; `label.tsx` szarzeje przy `data-disabled` kontrolki Base UI.
4. Storybook: 6 stron MDX po 13 sekcji, 38 nowych stories (`play` w 29) plus `Field` → `Horizontal`; kolejność menu w `preview.tsx`. Testy `play` z B2.31: Select (Tab, `selectOptions`, `FormData`), Checkbox (klik etykiety, Spacja, `FormData`, `required` w prawdziwym `<form>`), Radio (strzałki, jeden przystanek Tab, `FormData`, klik etykiety), Alert (rola tylko z propsa), Badge i Card (wymiary, a11y w obu motywach i gęstościach).
5. Poprzedni agent przerwał pracę po commicie `b55f221`; ten przebieg zrobił audyt B2.1–B2.31 względem diffu (nic nie brakowało), bramkę, POSTEP i PR.

## Wynik bramki (2026-10-25, lokalnie na Windows)

| Krok | Wynik |
|---|---|
| `npm run lint`, `format:check`, `typecheck` | ok |
| `npm run test:hooks` | ok, 334/334 (9 znanych luk) |
| `npm run test:coverage` | ok, 171 plików, 1965 testów, 100% |
| `npm run build` | ok |
| `npm run test:integration`, `test:e2e` | **nie uruchomione lokalnie**: na tej maszynie nie ma Dockera (Testcontainers); sprawdza CI |
| `npm run build-storybook` | ok |
| `npm run test:storybook:themes` | ok, 170/170 (85 stories × 2 motywy) |
| `npm run check:tokens` | kod 1, 25 znanych wartości poza plikami partii (było 28); pliki partii czyste |

## Do zrobienia

- Retrofit (lekcja 08): 3 natywne `<select>` → `NativeSelect`, 2 checkboxy → `Checkbox` (e2e `#product-featured`, `#confirm-cancelled` przejdą na etykietę lub rolę, B2.8), ok. 25 komunikatów → `Alert`, mapowanie statusów na warianty Badge (B2.17), `ghost` → `outline` i usunięcie `ghost`.
- Partia 3 etapu 2.
