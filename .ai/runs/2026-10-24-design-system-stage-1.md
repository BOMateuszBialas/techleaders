# Run: design system, etap 0 i etap 1 (fundamenty)

- Data: 2026-10-24. Agent: Claude (subagent), gałęzie `design/system-foundations` (PR designu) i `design/stage-1-foundations` (ten PR, draft, stacked).
- Spec: `.ai/specs/2026-10-24-design-system.md`. Plan i stan: `.ai/design/POSTEP.md`.

## Cel

Etap 0 promptu Storybooka (plan, zgodność Storybooka) i etap 1 (tokeny w kodzie, motywy, font, Storybook z Foundations, skrypt tokenów, Tabler), z pełną bramką. Bez etapu 2.

## Kroki

1. Rebase `design/system-foundations` na `origin/main` (potrzebny #87: hook i `test:hooks` w bramce). Spec i POSTEP, push, PR designu.
2. Instalacja próbna Storybooka 10.6.3 w `wt-design` (bez commita): build ok, testy stories ok dopiero po obejściu błędu ścieżki z polskim znakiem; stories w `.storybook/` nie są testami.
3. Worktree `wt-ds-stage1`, commity:
   - `chore(deps)`: Vitest i coverage-v8 5.0.4 → 5.0.5 (advisory GHSA-p458-7748-mcp3, dotyczy trybu przeglądarki);
   - tokeny w `globals.css` (3 warstwy, oba motywy, typografia, odstępy, ruch, gęstość, bez `--chart-*`) + `.ai/design/kontrast/verify-css.mjs`;
   - Archivo przez `next/font` (`src/app/fonts.ts`), motyw (`src/lib/theme/`, `ThemeToggle`, skrypt w `<head>`, `data-density="admin"`);
   - Tabler zamiast lucide, `components.json` `iconLibrary: tabler`, reguła ESLint;
   - Storybook (`.storybook/`, `stories/foundations/`, `vitest.storybook.config.mts`, skrypty, ignorowanie `storybook-static`);
   - `check:tokens` (`src/lib/design-tokens/` + `scripts/check-tokens.ts`).

## Decyzje podjęte w trakcie

- Stories w `packages/app/stories/` (poza `src/` i poza katalogiem z kropką): zero nowych wykluczeń coverage.
- Osobny `vitest.storybook.config.mts` z dwoma projektami (`storybook-light`, `storybook-dark`), motyw domyślny przez `define`.
- Tabela kontrastu w Storybooku mierzy prawdziwe zmienne CSS w przeglądarce (canvas → sRGB, WCAG); wyniki zgodne z tokeny.md §2.
- Rozmiary ikon w nagłówku zostają 16 px (zmiana razem z retrofitem ramy); fokus komponentów `ui/*` w etapie 2.
- Docker Desktop nie działał na starcie; uruchomiłem go, potem integracja i e2e przeszły.

## Wynik bramki

| Krok | Wynik |
|---|---|
| `npm run lint` | ok |
| `npm run format:check` | ok |
| `npm run test:hooks` | ok, 334/334 (9 znanych luk) |
| `npm run typecheck` | ok (obejmuje `.storybook/` i `stories/`) |
| `npm run test:coverage` | ok, 157 plików, 1835 testów, 100% lines/branches/functions/statements |
| `npm run build` | ok |
| `npm run test:integration` | ok, 17 plików, 148 testów |
| `npm run test:e2e` | ok, 20 plików, 98 testów |
| `npm run build-storybook` | ok |
| `npm run test:storybook:themes` | ok, 18/18 (9 stories × 2 motywy); kontrolny test z naruszeniem kontrastu failuje w obu |
| `npm run check:tokens` | kod 1, 35 znanych wartości w `src/` (oczekiwane, spec A11) |
| `node .ai/design/kontrast/verify-css.mjs` | ok, 58 par w obu motywach |

## Problemy

- Hook PreToolUse zablokował dwa polecenia z heredociem Pythona (fałszywy alarm: wyrażenie `.*?` i nazwa pliku env w treści). Nie obchodziłem blokady w powłoce; te same edycje zrobiłem narzędziem Edit (zwykła edycja plików źródłowych i dokumentów, bez dotykania plików env).
- Narzędzie bezpieczeństwa Claude Code odrzuciło `rm` z globem po `cd` (pliki snapshotów próby); nic nie zostało usunięte, katalog i tak był pusty.

## Do zrobienia

- Decyzje ⚠D1–⚠D5 w specu, merge PR designu, potem zdjęcie `do-not-merge`.
- Zgłosić błąd `convertToFilePath` w Storybooku.
- Etap 2 (partia 1) po zatwierdzeniu.
