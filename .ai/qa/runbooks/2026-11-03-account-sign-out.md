# Runbook: wylogowanie z „Moje zamówienia” (PR #184)

Cel: sprawdzić ręcznie to, czego test nie pokaże: że przycisk wylogowania działa dla klienta, a nagłówek sklepu nadal wylogowuje tak samo. Czas: ok. 10 minut.

## Przygotowanie

1. `npm run dev`, baza z migracjami (`npm run db:migrate`), sklep na `http://localhost:3000`.
2. Dwa konta klienta: utwórz je przez „Zaloguj / Załóż konto” (dane testowe, nie prawdziwe).

## Kroki

| # | Krok | Oczekiwany wynik |
|---|---|---|
| 1 | Zaloguj się jako klient A, wejdź w „Moje zamówienia” | Widać e-mail, przycisk „Sign out” obok niego |
| 2 | Kliknij „Sign out” na stronie zamówień | Wracasz na stronę główną, w nagłówku widać „Sign in”, nie „My orders” |
| 3 | Wejdź ręcznie na `/account/orders` | Przekierowanie do logowania, bez danych klienta A |
| 4 | Zaloguj się jako klient B, wejdź w „Moje zamówienia”, kliknij „Sign out” z nagłówka sklepu | Wylogowanie działa też z nagłówka |
| 5 | Powtórz krok 1 na szerokości 320 px, potem w ciemnym motywie | Przycisk widoczny, nie wychodzi poza ekran, czytelny |

## Karta dowodu

- Wymaganie / hipoteza: wylogowanie z widoku zamówień kończy sesję klienta; nagłówek nadal działa.
- Zakres i ryzyko: sesja klienta, dane zamówień, niski.
- Baza i commit: `main` po #184.
- Środowisko, seed, konto i czas: lokalnie, konta A i B z kroku przygotowania.
- Sprawdzenie: kroki 1–5 powyżej.
- Oczekiwane zachowanie: tabela wyżej.
- Rzeczywisty wynik i miejsce dowodu: ___ (wpisz, zrzut ekranu: `.ai/qa/runbooks/…`)
- Czego to sprawdzenie nie dowodzi: nie sprawdza kont właściciela (admin) ani innych przeglądarek.
- Decyzja i osoba odpowiedzialna: ___ (werdykt tester).

## Porównanie z testem automatycznym

Test e2e `customer-isolation` i `customer-auth` klika ten sam przycisk (`data-testid="account-sign-out"`) i sprawdza, że sesja została zakończona. Różnica: test nie widzi układu na 320 px ani kontrastu w ciemnym motywie. Te punkty są tylko w kroku 5.
