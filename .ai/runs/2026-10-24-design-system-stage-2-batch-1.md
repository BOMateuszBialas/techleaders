# Run: design system, etap 2, partia 1 (Button, Text link, Input, Textarea, Label, Field)

- Data: 2026-10-24. Agent: Claude (subagent), gałąź `design/stage-2-batch-1` (worktree `wt-ds-stage2`), z `main` po merge'u etapu 1 (#99).
- Spec: `.ai/specs/2026-10-24-design-system.md`. Plan i stan: `.ai/design/POSTEP.md`.

## Cel

Krok 1 partii 1 według promptu Storybooka: lista różnic kształtu, gęstości i stanów względem bazy (shadcn `base-nova` na Base UI), z jedną rekomendacją i źródłem przy każdej. Bez implementacji i bez PR; właściciel akceptuje punkty osobno.

## Kroki

1. Lektura: prompt lekcji 06, spec, POSTEP, `tokeny.md`, `referencje.md`, `audyt.md`, log etapu 1, `.ai/lessons.md`, `components/ui/*`, `.storybook/`, `globals.css`.
2. Inwentaryzacja użyć: Button w 28 plikach (warianty `outline` 15×, `sm` 7×, `icon` 1×, `buttonVariants` na `Link` 5×), Input w 13, Textarea w 3, Label w 13, wzorce linków w ok. 45 miejscach, `Field` składany ręcznie (`form-feedback.tsx`).
3. Baza Field: `npx shadcn view field` (bez instalacji): 10 eksportów, zależność rejestru `separator`, `FieldError` z `role="alert"`, `"use client"`.
4. Base UI Button: `data-disabled` także przy `focusableWhenDisabled`, a atrybutu `disabled` wtedy nie ma, więc `disabled:opacity-50` nie działa na „Draft with AI”.
5. Ryzyko testów: e2e `storefront-mobile` i `admin-dashboard-range` mierzą szerokość przy 390 px; unit nie sprawdzają klas przycisków i pól; `category-components.test.ts` porównuje HTML z `form-feedback.tsx` (bez zmian).
6. Lista B1.1–B1.28 i pytania Q1–Q5 w POSTEP.

## Decyzje właściciela

Q1–Q5 zgodnie z rekomendacjami (Q4: „Add to cart” w karcie produktu neutralny). B1.1–B1.28 przyjęte domyślnie; w PR wypisane jako „accepted by default, revert on request”.

## Implementacja

1. Token `--secondary-hover` (Q1): `globals.css`, `tokeny.md` (wiersz i para 14a), `kontrast/tokens.mjs`, `token-data.ts`; `verify-css.mjs`: 59 par w obu motywach, 14,35 / 12,59 : 1.
2. Tokeny komponentowe w `globals.css`: `--control-px`, `--control-icon-size`, `--field-text-size` / `-leading` (telefon w adminie 16 px), `--label-size` / `-leading`.
3. `ui/button.tsx`, `input.tsx`, `textarea.tsx`, `label.tsx` przepisane według B1.2–B1.21; nowe `ui/field.tsx` (z rejestru shadcn `base-nova`, przycięty; napisany ręcznie z `npx shadcn view field`, bo `add` nadpisałby `label.tsx` i dodał `separator`) i `ui/text-link.tsx`.
4. Powód wykluczenia `components/ui/**` w `vitest.config.mts` (B1.27).
5. Storybook: `.storybook/preview.css` (zamrożone stany przez `data-preview-state`), viewport testów 1280 × 800, kolejność menu; `stories/primitives/`: 6 stron MDX po 13 sekcji, 37 stories (`play` w 28), bloki `StateGrid`, `Narrow`, `DoDont`.
6. CI: job `storybook`, bramka w `.ai/agentic.config.json` i AGENTS.md „Validation” (B1.28).

## Wynik bramki

| Krok | Wynik |
|---|---|
| `npm run lint`, `format:check`, `typecheck` | ok |
| `npm run test:hooks` | ok, 334/334 (9 znanych luk) |
| `npm run test:coverage` | ok, 166 plików, 1903 testy, 100% |
| `npm run build` | ok |
| `npm run test:integration` | ok, 19 plików, 171 testów |
| `npm run test:e2e` | ok, 22 pliki, 112 testów |
| `npm run build-storybook` | ok; 6 stron dokumentacji: 13 nagłówków sekcji, tabele renderowane (sprawdzone w zbudowanym Storybooku) |
| `npm run test:storybook:themes` | ok, 92/92 (46 stories × 2 motywy) |
| `npm run check:tokens` | kod 1, 28 znanych wartości (było 35); pliki partii czyste |

Szerokości: e2e `storefront-mobile`, `admin-mobile` i `admin-dashboard-range` przy 390 px zielone. Lokalnie (bez commita) te same testy przy 320 px: sklep i zakres dat ok; jedyna porażka to tabela dowodów Copilota (30 px przewijania wewnątrz tabeli), która **na `main` też nie przechodzi** (tam dodatkowo cała strona `/admin/copilot` ma 329 px), więc to nie regresja partii.

## Do zrobienia

- Retrofit (lekcja 08): `action` na 4 CTA zakupu, `outline sm` w karcie produktu (Q4), `TextLink` w ok. 45 miejscach, `Field` w 10 formularzach, `aria-busy` na przyciskach w trakcie wysyłki.
- Tabela dowodów Copilota przy 320 px (istniejący problem).
