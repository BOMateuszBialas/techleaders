# Run: design system, etap 2, partia 3 (Table, Tabs, Skeleton, Empty state, Error state, Disclosure)

- Data: 2026-10-25. Agent: Claude (subagent), gałąź `design/stage-2-batch-3` (worktree `wt-ds-batch3`), z `main` po merge'u partii 2 (#106, `dc15874`).
- Spec: `.ai/specs/2026-10-24-design-system.md`. Plan i stan: `.ai/design/POSTEP.md`, sekcja „Etap 2, partia 3”.

## Cel

Krok 1 partii 3 według promptu Storybooka: lista różnic kształtu, gęstości i stanów względem bazy (shadcn `base-nova` 4.21.4 na Base UI 1.9), z jedną rekomendacją, źródłem, ekranami, zmianą wizualną i ryzykiem dla testów przy każdym punkcie. Bez implementacji, bez push i bez PR; właściciel akceptuje punkty osobno.

## Kroki

1. Lektura: AGENTS.md, `.ai/lessons.md`, spec, POSTEP (format partii 1 i 2), `tokeny.md`, `referencje.md`, `audyt.md`, log partii 2, prompt `storybook-devmentor.txt` (lekcja 06), `components/ui/{table,alert,card}.tsx`, `globals.css` (gęstość, ruch, reduced motion).
2. Baza: `npx shadcn@4.21.4 view table tabs skeleton empty collapsible accordion spinner` w głównym checkoutcie (tylko podgląd rejestru). Wynik: `table` z rejestru = obecny plik (z niepotrzebnym `"use client"`); `tabs` ma warianty `default` (tor z cieniem) i `line`, style pionowe i 6 klas `dark:`; `skeleton` to `animate-pulse rounded-md bg-muted`; `empty` ma `EmptyMedia` (ikona na szarym kwadracie) i układ wyśrodkowany; `collapsible` i `accordion` wymagają JS; stanu błędu rejestr nie ma. Każdy element zależy tylko od `cn`.
3. Base UI 1.9 `Tabs.List`: `activateOnFocus` domyślnie `false` (sprawdzone w `TabsList.d.ts`).
4. Inwentaryzacja użyć: 10 tabel w 9 plikach (5 nadpisuje `whitespace-nowrap`, 8 ustawia `tabular-nums` per kolumna, tabela kategorii bez nazwy); 3 nawigacje-zakładki linkami z `aria-current` (Featured, kategorie w katalogu, okres na dashboardzie); 11 fallbacków ze szkieletem w sklepie (9 z `aria-label` na `div` bez roli) i 13 tekstowych w adminie; ok. 13 pustych stanów i 5 stron „not found”; ok. 12 `<p role="alert">` na stronach i 2 `error.tsx`; 2 natywne `<details>` (menu na telefonie, definicje w Copilocie).
5. Kontrast nowych par (skrypt tymczasowy w scratchpadzie, poza repo, na `lib.mjs` i `tokens.mjs`): `--primary` na `--muted` 15,99 / 13,01 : 1; podkreślenie zakładki `--foreground` 19,13 / 17,57 : 1 (tło) i 19,13 / 16,27 : 1 (karta); nieaktywna zakładka `--muted-foreground` 6,25 / 8,28 : 1; dekoracyjne: `--muted` do tła 1,10 / 1,19, do karty 1,10 / 1,10, do `--surface-product` 1,00 / 1,10, `--border` do `--muted` 1,17. Kontrola: `--action` na `--muted` w ciemnym motywie **2,98 : 1** (stąd brak czerwonego przycisku w pustym stanie).
6. Ryzyko testów: unit nie sprawdzają klas tabeli; e2e czytają tekst tabel i szerokość strony przy 390 px; przy retroficie: `home.e2e.test.ts:87,127`, `storefront-shell.test.ts:34,92`, `account-components.test.ts:81`.
7. Lista B3.1–B3.30, pytania Q1–Q6 i usunięcia z bazy w POSTEP; wiersz etapu 2, „Otwarte pytania” i „Następny krok” zaktualizowane.

## Decyzje

- Bez nowych zależności i bez nowych tokenów. Plan CLI: `npx shadcn add tabs skeleton empty` (3 nowe pliki, nic nie nadpisuje); bez `add table`, `collapsible`, `accordion`, `spinner`; `disclosure.tsx` i `error-state.tsx` ręcznie.
- Wszystkie rekomendacje czekają na właściciela (prompt: stop po każdym kroku).

## Wynik kroku 1

Jeden commit lokalny z POSTEP i tym logiem (lista różnic). Bez zmian w kodzie, bez push i bez PR.

## Do zrobienia

- Decyzje właściciela: Q1–Q6, B3.1–B3.30 i usunięcia z bazy (Table: `selected`, `expanded`, hover wiersza; Tabs: `default`, orientacja pionowa; Empty: `EmptyMedia`).
- Po decyzjach: implementacja partii 3, pary kontrastu do `tokeny.md` §2 i `kontrast/tokens.mjs`, stories i strony MDX, bramka, PR.
- Retrofit (lekcja 08): zakładki „Featured” → `TabsNav`, fallbacki → `SkeletonGroup`, puste stany → `Empty`, komunikaty błędu strony → `ErrorState`, `error.tsx` w sklepie (audyt), `<details>` → `Disclosure`, nazwa tabeli kategorii, sprzątanie nadpisań `whitespace-normal` i `tabular-nums`.
