# Run: design system, etap 2, partia 4 (Dialog, Alert dialog, Menu, Popover)

- Data: 2026-10-25. Agent: Claude (subagent), gałąź `design/stage-2-batch-4` (worktree `wt-ds-batch4`), z `main` po merge'u partii 2 (#106, `dc15874`). Równolegle inny agent implementuje partię 3 w `wt-ds-batch3` (tylko do odczytu w tym przebiegu).
- Spec: `.ai/specs/2026-10-24-design-system.md`. Plan i stan: `.ai/design/POSTEP.md`, sekcja „Etap 2, partia 4”.

## Cel

Krok 1 partii 4 według promptu Storybooka: lista różnic kształtu, gęstości i stanów względem bazy (shadcn `base-nova` 4.21.4 na Base UI 1.9), z jedną rekomendacją, źródłem, ekranami, zmianą wizualną i ryzykiem dla testów przy każdym punkcie, plus ocena, czy Menu (i reszta partii) jest w ogóle potrzebne. Bez implementacji, bez push i bez PR; właściciel akceptuje punkty osobno.

## Kroki

1. Lektura: AGENTS.md, `.ai/lessons.md`, spec, POSTEP (format partii 1–2), sekcja „Etap 2, partia 3” i log partii 3 z `wt-ds-batch3` (decyzje właściciela B3.1–B3.30, Q1–Q6), `tokeny.md`, `referencje.md`, `audyt.md`, log partii 2, prompt `storybook-devmentor.txt` (lekcja 06).
2. Baza: `npx shadcn@4.21.4 view dialog alert-dialog dropdown-menu popover` w głównym checkoutcie (tylko podgląd rejestru). Wynik: wszystkie zależą od `cn`; `dialog` i `alert-dialog` mają zależność rejestru `button` (CLI ruszyłby `ui/button.tsx` z partii 1); tło `bg-black/10` z `backdrop-blur-xs`; obrys `ring-foreground/10`; stopka na pasie `bg-muted/50` z ujemnymi marginesami; `AlertDialogMedia` i `size="sm"`; menu z 15 eksportami i podświetleniem `focus:bg-accent`; animacje z `tw-animate-css` (już importowany w `globals.css`).
3. Base UI 1.9 (typy i `docs/` w pakiecie): `Dialog.Root.modal` domyślnie `true` (fokus uwięziony, przewijanie zablokowane), `AlertDialog` bez `modal` i `disablePointerDismissal` (klik w tło nie zamyka, Escape zamyka), `Menu.Root.modal` domyślnie `true`, `Popover.Root.modal` domyślnie `false`, `initialFocus` / `finalFocus` na `Popup`, `Portal.container`.
4. Inwentaryzacja użyć: usunięcie kategorii bez potwierdzenia (`delete-category-view.tsx:52–60`); anulowanie i zwrot zamówienia z wymaganym checkboxem (`order-status-form-view.tsx:60–80`, kontrakt serwera `confirm=yes`); tabele admina mają w wierszu jeden link, 0 akcji wiersza; definicje metryk są widocznym tekstem z kontraktem R05 / AC #23 / AGENTS.md i e2e, które czyta je z karty; menu w nagłówku na telefonie to nawigacja (Disclosure).
5. Znalezisko techniczne: `data-density="admin"` siedzi na `div` w layoucie admina, a portale Base UI renderują się w `<body>`, więc dialog w adminie miałby gęstość sklepu; Storybook ustawia gęstość na `<html>` i tego nie wykryje. Propozycja: selektor `:root:has([data-density="admin"])` w `globals.css` (B4.6).
6. Kontrast (skrypt tymczasowy w scratchpadzie, poza repo, na `lib.mjs` i `tokens.mjs`, z `composite` dla tła półprzezroczystego): `--destructive` na `--popover` 6,62 / 6,04; `--input` na `--popover` 3,66 / 3,31; `--ring` na `--popover` 19,13 / 13,01; `--primary` na `--popover` 17,71 / 13,01; `--link` na `--popover` 6,71 / 7,48. Kontrole: `--accent` na `--popover` 1,13 / **1,00** (podświetlenie pozycji menu z bazy niewidoczne w ciemnym motywie); nakładka do strony 1,00 / 1,19. Tło dialogu: jasny `gray-900` przy 30 / 40 / 50% daje dialog do przyciemnionej strony 2,00 / 2,64 / 3,58 : 1 (wybrane 50%); ciemny czarny 60% daje 1,26 (obrys 1,47).
7. Lista B4.1–B4.20, inwentaryzacja, pytania Q1–Q7 i usunięcia w POSTEP (tylko nowa sekcja przed „Następny krok”; wiersz etapu, „Otwarte pytania” i „Następny krok” bez zmian, uzgodni je wywołujący po partii 3).

## Decyzje

- Rekomendacja zakresu: budować Alert dialog (2 użycia w retroficie) i Dialog (Q3, ta sama anatomia, kryterium promptu); Menu (Q1) i Popover (Q2) na „What is missing”, bo nie mają poprawnego użycia.
- Bez nowych zależności. Bez `npx shadcn add dialog alert-dialog` (nadpisałby `button.tsx`); oba pliki ręcznie z `view`. Jeden nowy token `--backdrop` (Q4).
- Wszystkie rekomendacje czekają na właściciela (prompt: stop po każdym kroku).

## Wynik kroku 1

Jeden commit lokalny z POSTEP i tym logiem (lista różnic). Bez zmian w kodzie, bez push i bez PR.

## Krok 2: decyzje właściciela i implementacja (2026-10-25)

Decyzje: B4.1–B4.16 i B4.18–B4.20 przyjęte, Q2–Q7 zgodnie z rekomendacjami; **Q1 odrzucone**: właściciel chce megamenu (nawigacja kategorii w nagłówku, Base UI `NavigationMenu`), a nie menu akcji. Zapis w POSTEP („Decyzje właściciela (2026-10-25)” partii 4).

1. Commit z decyzjami w POSTEP.
2. Token `--backdrop`, gęstość admina w portalach (`:root:has([data-density="admin"])`), pary 75–80, sprawdzenie `--backdrop` w `verify-css.mjs`.
3. Dialog i Alert dialog (ręcznie z `view`), 12 stories z `play`, 2 strony MDX. Debug: status na stronie pod otwartym dialogiem jest niewidoczny dla `getByRole` (strona jest `aria-hidden`), więc stories zamykają dialog po wysłaniu; wysokości przez `offsetHeight` (animacja skali).
4. Merge `origin/main` po zmergowaniu partii 3 (#107): konflikty w `tokens.mjs`, `pairs.md`, `tokeny.md` (najpierw pary 72–74, potem 75–80) i w POSTEP (wersja z `main` + sekcja partii 4 przed „Następny krok”). Dopisane w POSTEP: właściciel zaakceptował odstępstwo B3.5 na telefonie 2026-10-25.
5. Lista różnic megamenu B4.21–B4.32 i pytania Q8–Q12 z rekomendacjami (inwentaryzacja nagłówka i danych kategorii, zrzuty R01–R03 z kart referencji). Przyjęte domyślnie, weto w review PR.
6. Navigation menu (`ui/navigation-menu.tsx`): wyzwalacz-link do `/products` (bez JS zwykły link; rola przycisku i `aria-expanded` dopiero po hydracji), panel `keepMounted`, najechanie z opóźnieniem 200 / 300 ms, 7 stories, MDX, unit test HTML z serwera. axe zgłaszał strażniki fokusu Base UI (`aria-hidden-focus`): wyłączone z analizy w stories megamenu z komentarzem.
7. Bramka, POSTEP (stan etapu, „Otwarte pytania”, „Następny krok”, sekcja „Implementacja”), lekcja w `.ai/lessons.md`, PR.

## Bramka (po merge'u `main` z partią 3)

| Krok | Wynik |
|---|---|
| `npm run lint`, `format:check`, `test:hooks`, `typecheck` | ok |
| `npm run test:coverage` | ok, 100% |
| `npm run build`, `build-storybook` | ok |
| `npm run test:storybook:themes` | 56 plików, 272 testy ok (pierwszy przebieg: znany błąd „Failed to fetch dynamically imported module” po nowych importach, drugi zielony) |
| `npm run check:tokens` | pliki partii czyste; 25 znanych wartości poza partią (jak po partii 3) |
| `node .ai/design/kontrast/verify-css.mjs` | ok, 77 par w obu motywach, `--backdrop` zgodny |
| `npm run test:integration` | 20 plików, 182 testy ok (Docker lokalnie) |
| `npm run test:e2e` | 23 pliki, 121 testów ok |

## Decyzje kroku 2

- Megamenu: jeden wyzwalacz „Shop” (kategorie są płaskie), wyzwalacz jest linkiem (spec G13), najechanie + klik, panel tylko z „Shop all” i kategoriami, od 768 px (telefon: Disclosure z partii 3).
- Bez nowych zależności i bez CLI shadcn (wszystkie trzy pliki ręcznie z `view`).

## Do zrobienia

- Review właściciela: weto Q8–Q12 megamenu, merge po zielonym CI.
- Retrofit (lekcja 08): Alert dialog przy usunięciu kategorii i przy anulowaniu / zwrocie zamówienia (Q5, Q6), e2e `admin-categories` i `admin-orders`, testy widoków; megamenu w nagłówku sklepu (test `storefront-shell.test.ts`).
- Etap 4: „What is missing” (Menu akcji, Popover, Drawer, Tooltip, Toast).
