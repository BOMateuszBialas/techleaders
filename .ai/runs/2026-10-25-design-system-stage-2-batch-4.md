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

## Do zrobienia

- Decyzje właściciela: Q1–Q7, B4.1–B4.20 i usunięcia (`DialogFooter showCloseButton`, `AlertDialogMedia`, `size="sm"`, rozmycie tła; Menu i Popover z planu).
- Po decyzjach: implementacja partii 4, token `--backdrop` i pary kontrastu w `tokeny.md` §2 i `kontrast/tokens.mjs`, selektor gęstości w `globals.css`, stories i strony MDX, bramka, PR.
- Uzgodnienie POSTEP z partią 3 (wiersz etapu 2, „Otwarte pytania”, „Następny krok”).
- Retrofit (lekcja 08): Alert dialog przy usunięciu kategorii i przy anulowaniu / zwrocie zamówienia (Q5, Q6), e2e `admin-categories` i `admin-orders`, testy widoków.
