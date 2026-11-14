# Prompt do recenzji innym modelem: dwie specyfikacje P1 (2026-11-14)

Cel: spełnić wymóg certyfikatu „każdą specyfikację przegląda inny model niż autor" dla dwóch specyfikacji P1, które nie miały takiej recenzji:

- `.ai/specs/implemented/2026-10-19-csv-product-import.md` (import CSV)
- `.ai/specs/implemented/2026-10-19-dashboard-date-range-comparison.md` (porównanie zakresów dat)

Jak użyć (ta sama procedura co w `2026-10-24-customer-accounts-cross-model.md`):

1. Otwórz **nowy, pusty czat** w Gemini i w ChatGPT. Osobny czat dla każdej specyfikacji i każdego modelu, żeby recenzje były niezależne. Razem: 4 czaty.
2. Wklej prompt z sekcji „Prompt" poniżej. Pod linią `=== SPECYFIKACJA ===` wklej pełną treść jednej specyfikacji (albo dołącz plik).
3. Zapisz **całą** odpowiedź bez skracania w `.ai/specs/research/reviews/2026-11-14-<slug-specyfikacji>-cross-model.md`, z nagłówkiem: model, data, nazwa specyfikacji.
4. Nie przekazuj recenzentom komentarzy autora ani tego pliku. Recenzja ma opierać się wyłącznie na tekście specyfikacji.

Rozstrzygnięcie każdego znaleziska (przyjęte, przyjęte w części, odrzucone, z uzasadnieniem) zapisuje się potem w sekcji „Recenzja innym modelem" danej specyfikacji. Tę decyzję podejmuje właściciel.

---

## Prompt

```
Jesteś recenzentem specyfikacji funkcji dla sklepu e-commerce o nazwie CommerceOS.
Nie masz dostępu do repozytorium. Oceniasz wyłącznie tekst, który dostajesz.
Nie przepisuj całej specyfikacji. Nie chwal tego, co działa; wypisz tylko problemy.

Zasady nadrzędne produktu, których specyfikacja musi przestrzegać:
- AI doradza, a właściciel sklepu decyduje. Model nie zmienia cen, nie publikuje produktów,
  nie wystawia zwrotów i nie modyfikuje zamówień.
- Dane muszą być śledzalne. Wartości pieniężne są w groszach (liczby całkowite), nie w floatach.
- Każde twierdzenie w interfejsie lub w raporcie musi wynikać z danych sklepu.
- Dostęp jest rozdzielony między role; nikt nie widzi danych innych klientów.
- Brakujące dane są nazywane wprost, a nie zgadywane.
- Ograniczenia mają być jawne, a nie ukryte.

Zadanie:
1. Oceń spójność wewnętrzną (sprzeczne reguły, niedopowiedzenia, przypadki brzegowe bez
   zachowania).
2. Oceń bezpieczeństwo i uprawnienia (import, wejście od użytkownika, dostęp do danych,
   walidacja po stronie serwera, błędy, wycieki w komunikatach).
3. Oceń poprawność liczb i reguł biznesowych (zaokrąglenia, strefy czasowe, zakresy dat,
   porównania okresów, pola puste, zera, dzielenie przez zero).
4. Oceń testowalność: czy każde kryterium akceptacji da się sprawdzić testem.

Zwróć wynik w dwóch częściach.

Część 1. Tabela znalezisk, posortowana od najważniejszego:
| ID | Obszar | Problem | Dowód (cytat lub numer sekcji) | Ważność (wysoka/średnia/niska) | Proponowana zmiana w tekście specyfikacji |

Część 2. Do 3 pytań do autora, na które nie da się odpowiedzieć z samego tekstu.

Na końcu jedno zdanie: czy specyfikacja nadaje się do implementacji bez zmian, z drobnymi
poprawkami, czy wymaga przepisania (i dlaczego).

=== SPECYFIKACJA ===
[tu wklej pełną treść specyfikacji]
```

---

## Kontrola przed wysłaniem (dla właściciela)

- Nie dołączaj do promptu żadnych danych osobowych, kluczy ani zawartości `.env`. Obie specyfikacje są w publicznym repo, więc zawierają wyłącznie treść tego repo.
- Autor obu specyfikacji nie jest tu sprawdzany. Recenzenci mają być inni niż model, który je pisał. Jeśli nie wiesz, który model je pisał, w sekcji nagłówka zapisz, że nieznany, i zachowaj recenzję.
