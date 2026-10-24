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

## Wynik

Lista różnic czeka na akceptację. Rekomendacja: job `storybook` w CI wchodzi w PR partii 1 (B1.28).

## Do zrobienia

- Decyzje właściciela (B1.1–B1.28, Q1–Q5), potem implementacja, bramka, zrzuty i PR.
