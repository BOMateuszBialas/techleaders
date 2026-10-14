# D02 — Copilot ma być oparty na danych i nie wykonywać zmian samodzielnie

- **Status:** active — zatwierdzona przez właściciela produktu (autor projektu) 2026-10-14 w sesji om-discover, w brzmieniu z pakietu discovery.

## Decyzja
Copilot korzysta z jawnych narzędzi analitycznych i domenowych. Odpowiedź pokazuje okres analizy oraz podstawę liczbową. Jeśli danych brakuje, mówi to wprost. W MVP Copilot nie zmienia automatycznie produktów, cen, zapasów ani zamówień.

## Uzasadnienie
Zmniejsza ryzyko zmyślonych metryk i niepożądanych działań, a zarazem ułatwia testowanie poprawności.

## Warunek zmiany
Wymaga testów, jawnego potwierdzenia użytkownika i nowej decyzji opisującej uprawnienia, audyt oraz scenariusze błędów.
