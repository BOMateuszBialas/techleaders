# Runbook: wylogowanie z „Moje zamówienia” (PR #184)

Cel: sprawdzić ręcznie to, czego test nie pokaże: że przycisk wylogowania działa dla klienta na desktopie i mobile w obu motywach. Czas: ok. 10 minut.

**Zmiana po przeglądzie właściciela (2026-11-09):** nagłówek sklepu nie ma już wylogowania. Po zmianie układu nagłówka wylogowanie jest tylko na stronie „Moje zamówienia”, i tak ma być. Krok 4 poniżej opisuje to zachowanie.

## Przygotowanie

1. `npm run dev`, baza z migracjami (`npm run db:migrate`), sklep na `http://localhost:3000`.
2. Dwa konta klienta: utwórz je przez „Zaloguj / Załóż konto” (dane testowe, nie prawdziwe).

## Kroki

| # | Krok | Oczekiwany wynik |
|---|---|---|
| 1 | Zaloguj się jako klient A, wejdź w „Moje zamówienia” | Widać e-mail, przycisk „Sign out” obok niego |
| 2 | Kliknij „Sign out” na stronie zamówień | Wracasz na stronę główną, w nagłówku widać „Sign in”, nie „My orders” |
| 3 | Wejdź ręcznie na `/account/orders` | Przekierowanie do logowania, bez danych klienta A |
| 4 | Zaloguj się jako klient B, wejdź w „Moje zamówienia”, kliknij „Sign out” na tej stronie | Wylogowanie działa; w nagłówku sklepu nie ma wylogowania (zamierzone) |
| 5 | Powtórz krok 1 na szerokości 320 px, potem w ciemnym motywie | Przycisk widoczny, nie wychodzi poza ekran, czytelny |

## Karta dowodu

- Wymaganie / hipoteza: wylogowanie z widoku zamówień kończy sesję klienta; nagłówek nadal działa.
- Zakres i ryzyko: sesja klienta, dane zamówień, niski.
- Baza i commit: `main` po #184.
- Środowisko, seed, konto i czas: lokalnie, konta A i B z kroku przygotowania.
- Sprawdzenie: kroki 1–5 powyżej.
- Oczekiwane zachowanie: tabela wyżej.
- Rzeczywisty wynik i miejsce dowodu: tester (właściciel) przeszedł kroki 1–5 lokalnie (`npm run dev`, baza z migracjami) na desktopie i mobile, w jasnym i ciemnym motywie. Wylogowanie działa na stronie „Moje zamówienia”. Nagłówek nie ma wylogowania (zmiana układu, zamierzona). Zrzuty nie były zapisywane w repo.
- Czego to sprawdzenie nie dowodzi: nie sprawdza kont właściciela (admin) ani innych przeglądarek.
- Decyzja i osoba odpowiedzialna: **przeszedł**, właściciel (werdykt tester, 2026-11-09).

## Porównanie z testem automatycznym

Test e2e `customer-isolation` i `customer-auth` klika ten sam przycisk (`data-testid="account-sign-out"`) i sprawdza, że sesja została zakończona. Różnica: test nie widzi układu na 320 px ani kontrastu w ciemnym motywie. Te punkty są tylko w kroku 5.
