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

## Wynik

Commit lokalny z POSTEP i tym logiem. Bez zmian w kodzie, bez pusha i bez PR.

## Do zrobienia

- Po decyzjach: implementacja partii 2, pary kontrastu do `tokeny.md` §2 i `kontrast/tokens.mjs`, pełna bramka, PR.
