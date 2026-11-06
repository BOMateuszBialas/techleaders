# Audyt: 13 sekcji dokumentacji w komponentach bazowych

- Data: 2026-11-06. Zakres: komponenty w `packages/app/src/components/ui/`, które mają story (22 pliki). Komponenty produktu i Copilot poza zakresem.
- Wzorzec 13 sekcji: nagłówki `## 1.` … `## 13.` na stronach `Button.mdx` i `Dialog.mdx` (referencja dla pozostałych stron). Spec `2026-10-24-design-system.md` wymaga „13 sekcji” bez wypisania nazw; lista poniżej pochodzi z tych stron.
- Metoda: dla każdej strony MDX sprawdzono numer i nazwę nagłówka oraz to, czy pod nagłówkiem jest treść (co najmniej jedna niepusta linia). Status `✓` = jest i ma treść, `✗` = brak nagłówka lub pusta sekcja.

Sekcje: 1 What it is for (Do czego służy) · 2 When to use · 3 When not to use · 4 Anatomy · 5 Variants · 6 States · 7 Behavior and accessibility · 8 Content · 9 Responsive · 10 API · 11 Code · 12 Do and don't · 13 Related

## Tabela: komponent × sekcja (stan przed poprawką)

| Komponent (`ui/`) | Strona MDX | Story | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | Braki |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| alert | Alert.mdx | alert.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| alert-dialog | AlertDialog.mdx | alert-dialog.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| badge | Badge.mdx | badge.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| button | Button.mdx | button.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| card | Card.mdx | card.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| checkbox | Checkbox.mdx | checkbox.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| dialog | Dialog.mdx | dialog.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| disclosure | Disclosure.mdx | disclosure.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| drawer | Drawer.mdx | drawer.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✗ | ✓* | ✓* | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 7 (+2 złe numery) |
| empty (Empty state) | EmptyState.mdx | empty.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| error-state (Error state) | ErrorState.mdx | error-state.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| field | Field.mdx | field.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| input | Input.mdx | input.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| label | Label.mdx | label.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| native-select (Select) | Select.mdx | select.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| navigation-menu | NavigationMenu.mdx | navigation-menu.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| radio-group (Radio group) | RadioGroup.mdx | radio-group.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| skeleton | Skeleton.mdx | skeleton.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| table | Table.mdx | table.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| tabs | Tabs.mdx | tabs.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| textarea | Textarea.mdx | textarea.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |
| text-link (Text link) | TextLink.mdx | text-link.stories.tsx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 0 |

`*` Drawer.mdx miało nagłówki `## 5. States` i `## 6. Behavior…` (numery o jeden za małe); nazwy są, numery poprawione.

## Podsumowanie

- Komponenty z 13 sekcjami przed poprawką: **21 z 22**.
- Luki załatane: **1 komponent (Drawer), 7 brakujących sekcji** (5 Variants, 8 Content, 9 Responsive, 10 API, 11 Code, 12 Do and don't, 13 Related) i **poprawa numeracji** (States, Behavior). Po poprawce: **22 z 22**.
- Sekcje nieprzypisane (`nie dotyczy`): brak. Każdy z 13 punktów ma treść dla każdego komponentu.
- Poza tabelą: `drawer.test.ts` i `navigation-menu.test.ts` to testy jednostkowe, nie komponenty.

## Komponenty z listy braków w POSTEP.md

| Komponent | Plik w `ui/` | Story | Strona MDX | Stan |
| --- | --- | --- | --- | --- |
| Select | `native-select.tsx` (natywny `<select>`, zgodnie z POSTEP, partia 2) | `select.stories.tsx` | `Select.mdx` | jest |
| Checkbox | `checkbox.tsx` | `checkbox.stories.tsx` | `Checkbox.mdx` | jest |
| Dialog | `dialog.tsx` | `dialog.stories.tsx` | `Dialog.mdx` | jest |
| Alert | `alert.tsx` | `alert.stories.tsx` | `Alert.mdx` | jest |
| Skeleton | `skeleton.tsx` | `skeleton.stories.tsx` | `Skeleton.mdx` | jest |
| Empty state | `empty.tsx` | `empty.stories.tsx` | `EmptyState.mdx` | jest |
| Error state | `error-state.tsx` | `error-state.stories.tsx` | `ErrorState.mdx` | jest |
| Field | `field.tsx` | `field.stories.tsx` | `Field.mdx` | jest |

Żaden z ośmiu komponentów nie brakuje. Nie zbudowano nowych komponentów.

## Uwagi

- Drawer nie ma na liście POSTEP (partii 1–4), ale jest w `ui/` i ma story, więc objęty audytem.
- Niezgodność do decyzji właściciela: `components/storefront/mobile-categories-menu.tsx` używa Drawera z `side="left"` (menu kategorii na telefonie), a POSTEP (B3.28, tabela partii 3) zakłada Disclosure dla tego menu. Dokumentacja Drawer opisuje stan kodu; kod nie został zmieniony.
- Brak story dla `side="left"`; wariant jest opisany w tekście, bez podglądu.
