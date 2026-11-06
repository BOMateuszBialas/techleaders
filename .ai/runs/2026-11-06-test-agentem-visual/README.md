# Run: test agentem, część wizualna (2026-11-06)

- Cel: wykonać wizualne kroki z `.ai/design/test-agentem.md` (ekran potwierdzenia, motywy, 320 / 768 / 1440 px) i zapisać wyniki w nowej sekcji „Część wizualna”.
- Gałąź: `docs/test-agentem-visual`, worktree od `main` (353ae1d).

## Kroki

1. `npm ci` w worktree (970 pakietów, 45 s).
2. `npm run storybook` (dev server, port 6006). `build-storybook` nie uruchamiany w worktree (Turbopack / build sprawdzi CI).
3. Tymczasowa historia `packages/app/stories/design-system/tmp-test-agent-confirmation.stories.tsx` (cztery stany: Pending, Loading, Unavailable, Not found), złożona z komponentów `ui` i tokenów. Usunięta z worktree przed commitem; kopia poza repo w scratchpad.
4. Rozszerzenie Claude in Chrome nie połączyło się (`Browser extension is not connected`), więc zrzuty zrobiono skryptem Playwright-core z zainstalowanym Chrome (`chrome.exe`), w headless. Skrypt poza repo.
5. 24 zrzuty (4 stany × 2 motywy × 3 szerokości), pomiary `scrollWidth`, kolorów, rozmiaru h1 i paddingu `main`. Błędy strony: 0 we wszystkich przebiegach.
6. Wybrano 6 zrzutów do repo (`.ai/design/test-agentem-shots/`), pomiary w `report.json`.

## Problemy w trakcie runu

- Pierwszy przebieg mierzył `document.querySelector("h1")` i trafiał w nagłówek poza historią (14 px). Poprawiono na `main h1`.
- Id historii dla eksportu `NotFound` to `not-found`, nie `notfound`; pierwszy przebieg pokazał pustą stronę Storybooka. Poprawiono.
- Mój własny błąd kompozycji: `p-panel` na `CardContent` podwoił odstęp w karcie (V2 w doc). Nie usunięto go, bo jest to wynik zapisany jako luka.

## Ograniczenia

- Brak sprawdzenia fokusu klawiatury, czytnika ekranu i atrybutów `role` w DOM.
- Brak zrzutu ramy sklepu (nagłówek, stopka) dla strony potwierdzenia.
- Serwer dev, nie build.

## Wynik

Zobacz sekcję „Część wizualna” w `.ai/design/test-agentem.md`.
