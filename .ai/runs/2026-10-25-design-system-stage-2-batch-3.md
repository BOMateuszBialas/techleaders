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

## Decyzje właściciela (2026-10-25)

Q1–Q6 zgodnie z rekomendacjami; B3.1–B3.30 przyjęte, w tym wszystkie usunięcia z bazy (Table: style `selected`, `expanded` i hover wiersza; Tabs: wariant `default` i orientacja pionowa; Empty: `EmptyMedia`). Bez `collapsible`, `accordion` i `spinner`.

## Implementacja (2026-10-25)

1. Decyzje w POSTEP (commit osobny).
2. Pary kontrastu 72–74 (podkreślenie aktywnej zakładki na tle i w karcie, `--primary` na `--muted`) w `tokeny.md` §2, `kontrast/tokens.mjs`, `kontrast/pairs.md`; `run.mjs` i `verify-css.mjs`: wszystkie niedekoracyjne pary przechodzą w obu motywach.
3. `npx shadcn@latest add tabs skeleton empty` w `packages/app` (shadcn 4.22.1): 3 nowe pliki, `package.json` i `package-lock.json` bez zmian. Pliki przepisane według B3.2 i decyzji; `error-state.tsx` i `disclosure.tsx` ręcznie; `table.tsx` bez `"use client"`.
4. Storybook: 6 stron MDX po 13 sekcji, 32 stories (`play` w 28), menu w `preview.tsx`.
5. Odstępstwa (szczegóły w POSTEP, „Implementacja”): Disclosure bez testu Enter i Spacji w `play` (niezaufane zdarzenia `user-event` nie wywołują akcji `<summary>`); domyślny promień szkieletu przez `[:where(&)]`, bo `cn` nie scala klas tokenów projektu (lekcja w `.ai/lessons.md`); wysokości wierszy w testach z 1 px linii.

## Poprawki po CI (2026-10-25)

1. Pierwszy przebieg CI PR #107: czerwone e2e `admin-mobile` („keeps Copilot evidence tables readable without sideways scrolling”, 26 px nadmiaru) i `storefront-mobile` („keeps the signed-in customer header within the viewport”, tabela „My orders”). Przyczyna: padding poziomy komórek 8 → 12 px (+32 px na 4 kolumny) i tekst sklepu 14 → 16 px. Pomiar prawdziwych `RecommendationCardView` i `AccountOrdersView` w tymczasowej story (niecommitowanej): 37 / 27 px nadmiaru z 12 px, 5 / 0 px z 8 px. Poprawka: `px-2 md:px-3`.
2. Drugi przebieg: `admin-mobile` zielone, `storefront-mobile` nadal czerwone. Zrzut z CI: kolumny statusu i sumy szersze niż lokalnie (tekst ok. 6 % szerzej na Linuksie). Minimalna szerokość „My orders” (`width: min-content`, viewport 390 px przez `page.viewport` z `vitest/browser` w tymczasowej story): 345 px przy 16 px, 325 px przy 14 px, 337 px z samym nagłówkiem 14 px, 313 px z paddingiem 4 px, na 358 px dostępnych. Poprawka: `max-md:text-sm` na tabeli (14/20 na telefonie w obu zakresach, jak przed partią). Odstępstwo od B3.5 opisane w POSTEP.

Ryzyko z listy różnic („Sprawdzę 320 i 390 px przed commitem”) bez Dockera dało się sprawdzić dopiero w CI; pomiar w story przy 1280 px nie widzi tokenów telefonu (`width < 48rem`).

## Wynik bramki (2026-10-25, lokalnie na Windows)

| Krok | Wynik |
|---|---|
| `npm run lint`, `format:check`, `typecheck` | ok |
| `npm run test:hooks` | ok, 334/334 (9 znanych luk) |
| `npm run test:coverage` | ok, 171 plików, 1965 testów, 100% |
| `npm run build` | ok |
| `npm run test:integration`, `test:e2e` | **nie uruchomione lokalnie**: brak Dockera (Testcontainers); sprawdza CI (w tym `admin-mobile` i `storefront-mobile` przy 390 px po zmianie tabeli) |
| `npm run build-storybook` | ok |
| `npm run test:storybook:themes` | ok, 234/234 (117 stories × 2 motywy) |
| `npm run check:tokens` | kod 1, 25 znanych wartości poza plikami partii (bez zmian); pliki partii czyste |

## Do zrobienia

- Retrofit (lekcja 08): zakładki „Featured” → `TabsNav`, fallbacki → `SkeletonGroup`, puste stany → `Empty`, komunikaty błędu strony → `ErrorState`, `error.tsx` w sklepie (audyt), `<details>` → `Disclosure`, nazwa tabeli kategorii, sprzątanie nadpisań `whitespace-normal` i `tabular-nums`.
- Konfiguracja `createCn` (`cn/config`) z grupami tokenów projektu, żeby nadpisania klas tokenów w `className` działały (osobna zmiana).
- Partia 4 etapu 2.
