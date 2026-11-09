# Lekcja 16: model zagrożeń i dowody granic dostępu (CommerceOS)

Data: 2026-11-03. Środowisko: lokalny `next dev` na `localhost:3000`, lokalna baza PostgreSQL z migracjami, dwa konta testowe klienta (`klient-a-l16@demo.test`, `klient-b-l16@demo.test`, hasło w scratchpadzie, nie w repo). Brak konta właściciela w tej sesji.

## Model zagrożeń (zakres: dostęp i izolacja danych)

Cztery pytania: co budujemy (sklep, admin, Copilot, konta klientów), co może pójść źle (dostęp cudzy, eskalacja z konta klienta do admina, wyliczanie zamówień), co z tym zrobimy (straże i testy), czy wystarczy (poniżej).

| # | Zagrożenie (STRIDE) | Wpływ | Mechanizm w kodzie | Stan |
|---|---|---|---|---|
| T1 | Information disclosure: klient czyta cudze zamówienie (IDOR) | wysoki (dane osobowe, adres, zakupy) | `api/account/orders/[id]`, `order-access.ts`, `customerApiHandler` | Sprawdzone (dowód D1, D2) |
| T2 | Elevation of privilege: konto klienta wchodzi do API admina | wysoki (zmiana sklepu, dane wszystkich klientów) | `require-admin.ts`, `api/admin/*` | Sprawdzone bez pozytywnej kontroli właściciela (dowód D3) |
| T3 | Tampering: klient zmienia status cudzego zamówienia | wysoki (zmiana stanu zamówienia) | metody na `api/account/orders/[id]` | Sprawdzone (dowód D4) |

Odrzucone na tym etapie: wyliczanie zamówień po ID (ID to UUID, a 404 dla obcego i nieistniejącego ID jest identyczny, D2); SQL injection i XSS to zakres SAST/DAST, nie tego dowodu.

## Dowody

### D1. Klient A czyta zamówienie gościa (cudze) i nieistniejące ID

**Karta dowodu**
- Wymaganie / hipoteza: klient nie czyta zamówień, których nie jest właścicielem (R08–R10, D11, E07-S04).
- Zakres i ryzyko: T1, odczyt danych zamówienia.
- Baza i docelowy commit: `main` po #182, lokalna baza z migracjami.
- Środowisko, seed, konto i czas: konto A (zalogowane, bez zamówień), zamówienie gościa z seeda (`orders.customer_id` = null), 2026-11-03.
- Sprawdzenie: `curl -b jar-a.txt GET /api/account/orders/<id gościa>` oraz `.../00000000-0000-4000-8000-000000000000`.
- Oczekiwane zachowanie: 404 dla obu, identyczna odpowiedź.
- Rzeczywisty wynik: 404 `NOT_FOUND` "Order not found." dla obu (kontrola: bez ciasteczka 401).
- Czego to nie dowodzi: nie sprawdza zamówienia należącego do innego konta klienta (A i B z własnymi zamówieniami). Konto A nie ma zamówień, a utworzenie ich wymaga przejścia checkoutu.

### D2. Kontrola pozytywna: konto klienta widzi własną listę

- Sprawdzenie: `GET /api/account/orders` z ciasteczkiem A → 200 `{"ok":true,"data":{"orders":[],"capped":false}}`; bez ciasteczka → 401.
- Wynik: 200 z pustą listą (A nie ma zamówień). Kontrola pozytywna potwierdza, że trasa działa dla zalogowanego klienta.

### D3. Konto klienta nie dociera do API admina

- Sprawdzenie: `GET /api/admin/me` i `POST /api/admin/copilot/answers` z ciasteczkiem A i bez ciasteczka.
- Wynik: A → 401 w obu, bez ciasteczka → 401 w obu. Odpowiedź taka sama, więc sesja klienta nie daje dostępu.
- **Kontrola pozytywna (uzupełniona 2026-11-04):** `node .ai/scripts/layout-sweep.mjs` z kontem właściciela na lokalnym `next dev` (localhost:3000): 24 z 24 OK (strona główna, dashboard, zamówienia i Copilot w 320, 768 i 1440 px, jasny i ciemny motyw), bez overflow, błędów strony, błędów konsoli i odpowiedzi 5xx. Dowodzi to, że sesja właściciela przechodzi do stron admina. Sama trasa `/api/admin/me` z sesją właściciela nie była osobno wywołana.
- Czego to nie dowodzi: nie sprawdza, że sesja właściciela nie jest sesją klienta w drugą stronę (E07-S05), ani uprawnień poszczególnych endpointów admina poza dwoma.

### D4. Klient próbuje zmienić cudze zamówienie

- Sprawdzenie: `PATCH|PUT|DELETE|POST /api/account/orders/<id gościa>` z ciasteczkiem A, body `{"status":"cancelled"}`.
- Wynik: 405 dla każdej metody (trasa eksportuje tylko `GET`). Status zamówienia w bazie bez zmian (`paid`).
- Czego to nie dowodzi: zapis przez inne trasy (np. akcje serwerowe) nie był testowany tym probe. Ich pokrycie jest w testach integracyjnych (`*.int.test.ts`, E04-S01 i E07).

### D5. Horyzontalna izolacja A↔B (oba konta mają zamówienia)

**Karta dowodu**
- Wymaganie / hipoteza: klient A nie dociera do zamówienia klienta B ani przez stronę, API, strony publiczne, akcję płatności, cache ani po wylogowaniu i zalogowaniu w tej samej przeglądarce (E07-S04).
- Zakres i ryzyko: T1 między kontami klientów (IDOR poziomy).
- Baza i commit: `main` po #185 (ten sam kod, co w CI), build produkcyjny `next build` z tego commita.
- Środowisko: lokalny build, lokalna baza PostgreSQL 17 w Dockerze, agent-browser v0.35.2 (przypięty), Chrome for Testing 157. Konta testowe tworzy globalny setup e2e, nie są w repo.
- Sprawdzenie: `npx vitest run --project e2e packages/app/e2e/customer-isolation.e2e.test.ts`. Klient A i B kupują po jednym produkcie przez UI (checkout jako zalogowany klient), potem A próbuje dotrzeć do zamówienia B.
- Oczekiwane zachowanie: wszystkie 8 testów zielone; zamówienie B nie pojawia się na stronach A, w API, na publicznych stronach referencji ani w akcji płatności.
- Rzeczywisty wynik: **8 z 8 testów zielone**, 31,7 s (`Test Files 1 passed`, log w scratchpadzie sesji).
- Czego to nie dowodzi: jeden przebieg, jeden seed, jedna przeglądarka. Nie testuje współbieżnych żądań ani konta właściciela (to D3). Nie dowodzi, że każda nowa trasa będzie chroniona; to zadanie testów przy kolejnych zmianach.

### D6. SAST (Semgrep) i DAST (OWASP ZAP baseline)

**Karta dowodu**
- Wymaganie / hipoteza: skan kodu i działającej aplikacji znajdzie problemy klasy wstrzyknięć, sekretów w kodzie i braków w nagłówkach, których ręczny przegląd nie objął.
- Zakres i ryzyko: cały kod `packages/` (bez testów i stories), działający serwer dev na `localhost:3000`. Ryzyko niskie: skan pasywny, bez logowania i bez wysyłania ataków.
- Baza i commit: `main` po #215 (`ee40b1b`).
- Środowisko: Semgrep 1.184.0 w osobnym venv poza repo (nie dodany do `package.json`). ZAP `ghcr.io/zaproxy/zaproxy:stable` w Dockerze. Serwer dev, nie build produkcyjny.
- Sprawdzenie SAST: `semgrep scan --config p/typescript --config p/nextjs --config p/owasp-top-ten --exclude node_modules --exclude "*.test.ts*" --exclude "*.stories.tsx" packages/`.
- Sprawdzenie DAST: `zap-baseline.py -t http://host.docker.internal:3000 -I -m 2`.
- Rzeczywisty wynik SAST: **0 znalezisk**, 83 reguły, 596 plików, 0 błędów skanera.
- Rzeczywisty wynik DAST: **0 FAIL**, 14 WARN, 54 PASS. Ostrzeżenia:
  - Brak nagłówka CSP (5 stron), brak `X-Frame-Options` / anti-clickjacking (5), brak `X-Content-Type-Options` (5), brak `Permissions-Policy` (5), brak `Cross-Origin-Resource-Policy` (5), nagłówek `X-Powered-By: Next.js` ujawnia framework (5).
  - Brak tokenów anty-CSRF w formularzach logowania i rejestracji klienta i admina (5). Do sprawdzenia: Better Auth chroni ciasteczka `SameSite`, ale tego nie zweryfikowałem osobnym testem.
  - Pozostałe (informacyjne, głównie tryb dev): komentarze w bundlach JS, „Dangerous JS functions” w bundlu dev, znacznik czasu w JS, „Storable and cacheable content”.
- Oczekiwane zachowanie: brak FAIL; ostrzeżenia zapisane z oceną.
- Czego to nie dowodzi: SAST nie widzi błędów autoryzacji wynikających z logiki (to D1–D5). ZAP baseline nie testuje zalogowanych ścieżek ani IDOR. Skan był na dev, a nagłówki na buildzie produkcyjnym mogą wyglądać inaczej. Nagłówki nie są ustawione w `packages/app/next.config.ts` ani w proxy, więc ostrzeżenia dotyczą też produkcji.
- Decyzja (2026-11-09, właściciel: „robimy”): wdrożony bezpieczny zestaw nagłówków w `packages/app/next.config.ts` (test e2e `packages/app/e2e/security-headers.e2e.test.ts`, sprawdza build produkcyjny na trzech trasach): `nosniff`, `X-Frame-Options: DENY`, `frame-ancestors 'none'` w CSP, `Referrer-Policy`, `Permissions-Policy`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, i wyłączony `X-Powered-By`. Pełna polityka skryptów (`script-src` z nonce) nie jest wdrożona: wymaga proxy z nonce, a to wymusza renderowanie dynamiczne, co koliduje z `cacheComponents`.
- **Po zmianie (ZAP baseline na buildzie produkcyjnym, `next start`):** znikły ostrzeżenia o braku `X-Frame-Options`, `X-Content-Type-Options`, `Permissions-Policy` i `X-Powered-By`. Pojawiły się nowe ostrzeżenia dotyczące polityki skryptów (`script-src`/`style-src` `unsafe-inline`, `CSP: Wildcard`), bo CSP ma tylko dyrektywy ramek i nie ogranicza skryptów. To ten sam otwarty punkt, nie nowa luka. COEP i COOP są raportowane jako brakujące (niskie ryzyko, nie ustawiane).

### D7. Anty-CSRF

**Karta dowodu**
- Wymaganie / hipoteza: żądanie zmieniające stan, wysłane z obcego źródła (`Origin: https://evil.example`) z ważnym ciasteczkiem sesji, nie zmienia stanu aplikacji (D6: brak tokenów anty-CSRF w formularzach).
- Zakres i ryzyko: wszystkie endpointy zmieniające stan: Better Auth (`/api/auth/*` admin, `/api/customer-auth/*` klient: logowanie, rejestracja, wylogowanie) oraz 22 server actions z `server-reference-manifest.json` (koszyk, checkout, płatność demo, status zamówienia, produkty, kategorie, zapas, import, rekomendacje Copilot, logowanie i wylogowanie). Poza zakresem: `api/admin/copilot/answers` i `api/admin/products/description-drafts` (POST bez zapisu stanu, Copilot tylko czyta, szkic nic nie zapisuje) oraz `api/account/orders/[id]` (tylko GET).
- Baza i commit: build produkcyjny z gałęzi `feat/security-headers-csrf-check` (po `main` c16605e), lokalna baza PostgreSQL w kontenerze, globalny setup e2e.
- Środowisko: `npx vitest run --project e2e packages/app/e2e/anti-csrf.e2e.test.ts` (32 testy, zielone).
- Mechanizmy, na których opiera się wynik:
  - Better Auth: `advanced.disableOriginCheck: false`, `trustedOrigins: [APP_URL]` (obie instancje, `create-auth.ts` i `create-customer-auth.ts`). Ciasteczko sesji klienta ustawiane z domyślnym `SameSite=Lax` i `HttpOnly` (test kontrolny sprawdza `Set-Cookie`); ciasteczko admina ma tę samą konfigurację, ale nie sprawdzałem jego `Set-Cookie` osobno.
  - Server actions: Next.js porównuje nagłówek `Origin` z `Host` przed wykonaniem akcji (`node_modules/next/dist/server/app-render/action-handler.js`, dokumentacja `01-app/02-guides/server-actions.md`).
- Sprawdzenie i wyniki (kod HTTP zaobserwowany w teście, każdy z ciasteczkiem właściciela lub klienta A):

| Trasa | Żądanie | Kontrola (ten sam request z własnego origin) | Wynik z obcym origin | Werdykt |
|---|---|---|---|---|
| `POST /api/customer-auth/sign-in/email` | logowanie klienta | 200, `Set-Cookie` z `SameSite=Lax; HttpOnly` | **403**, bez `Set-Cookie` | odrzucone |
| `POST /api/customer-auth/sign-up/email` | rejestracja klienta | (nie wykonano, tworzyłaby konto) | **403**, bez `Set-Cookie` | odrzucone |
| `POST /api/customer-auth/sign-out` | wylogowanie klienta | (nie wykonano, zakończyłaby sesję) | **403**; sesja nadal działa (`get-session` 200) | odrzucone |
| `POST /api/auth/sign-in/email` | logowanie właściciela | 200 | **403**, bez `Set-Cookie` | odrzucone |
| `POST /api/auth/sign-up/email` | rejestracja admina (wyłączona w konfiguracji) | (nie dotyczy) | **403** | odrzucone |
| `POST /api/auth/sign-out` | wylogowanie właściciela | (nie wykonano) | **403**; sesja nadal działa (`/api/admin/me` 200) | odrzucone |
| 22 server actions (`POST /` z nagłówkiem `Next-Action`) | m.in. `placeOrder`, `confirmDemoPayment`, `changeOrderStatus`, `setProductStatus`, `createProduct`, `updateProduct`, `adjustStock`, `submitProductImport`, `createCategory`, `updateCategory`, `deleteCategory`, `changeRecommendationStatus`, `addToCart`, `updateCartLine`, `removeCartLine`, `acceptCartChanges`, `signIn`, `signOut`, `signInCustomer`, `signUpCustomer`, `signOutCustomer`, `lookupOrder` | `lookupOrder` z własnego origin: **200** | **500** w każdym z 22 przypadków (komunikat „Invalid Server Actions request.”, akcja się nie wykonuje) | odrzucone |

- Uwaga o kodzie 500: Next.js zwraca 500 (nie 403) dla odrzuconego żądania akcji fetch z obcym `Origin`. To mechanizm frameworka, nie błąd; test sprawdza dokładnie 500 i kontrolę 200.
- Co to dowodzi: każda trasa zmieniająca stan w zakresie odrzuca żądanie z obcego origin nawet z ważną sesją, a żądanie z własnego origin przechodzi (kontrola). Ciasteczko sesji ma `SameSite=Lax`, więc przeglądarka nie wysyła go w cross-site POST, co daje drugą warstwę.
- Czego to nie dowodzi: nie sprawdza przeglądarki (żądania są z Node `fetch`, nie z formularza cross-site); nie sprawdza akcji wywoływanych tylko z kodu klienta bez wpisu w manifeście (manifest obejmuje wszystkie `"use server"` w buildzie); jeden build, jedna baza.
- **Otwarte ustalenia (nie naprawiane w tym PR):** nie znaleziono niechronionej trasy zmieniającej stan. Obserwacja: `api/admin/copilot/answers` i `api/admin/products/description-drafts` nie mają własnego sprawdzenia `Origin` (`adminApiHandler` go nie robi). Nie zmieniają stanu, więc nie są luką; ochronę daje tu `SameSite=Lax`.

## Co nie zostało zrobione (uczciwie)

- **Pełny CSP ze skryptami (D6):** częściowo zrobione 2026-11-09 w tym PR jako **świadomy bazowy CSP** (decyzja koordynatora): `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. Skrypty i style z `'unsafe-inline'` są celowe (skrypt motywu w layoucie i inline dane hydracji Next.js). Polityka oparta na nonce wymaga proxy i renderowania dynamicznego, więc jest osobną, późniejszą decyzją. Konsekwencja: `img-src 'self'` blokuje obrazy produktów z zewnętrznych adresów URL (admin może je wpisać); demo używa lokalnych obrazów.
- **CORP, COEP, COOP (D6):** zrobione 2026-11-09 w tym samym PR: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: credentialless`, `Cross-Origin-Resource-Policy: same-origin`. `credentialless`, a nie `require-corp`, bo admin może wpisać dowolny adres zdjęcia produktu, a storefront wyświetla go zwykłym `<img>`: `require-corp` zablokowałby takie obrazy (bez nagłówka CORP). Fonty są samohostowane przez `next/font`, skrypty są własne. Po dodaniu bazowego CSP (`img-src 'self'`) zewnętrzne obrazy są blokowane przez CSP, więc o wyborze decyduje teraz głównie polityka obrazów, a `credentialless` zostaje jako bezpieczniejsza wartość na przyszłość.
- **Tokeny anty-CSRF (D6):** sprawdzone w D7 (2026-11-09): Better Auth i Next.js odrzucają obcy origin, ciasteczko `SameSite=Lax`. Bez tokenów w formularzach.
- **Pozytywna kontrola admina:** zrobiona (patrz D3, sweep 24/24). Wywołanie `/api/admin/me` z sesją właściciela zrobione 2026-11-09 w przeglądarce (dev, `fetch('/api/admin/me')` po zalogowaniu na `/admin/sign-in`): **status 200**, odpowiedź `{"ok":true,"data":{"role":"owner", …}}`. Kontrola negatywna: D3 pokazuje 401 dla konta klienta. Ten sam request bez żadnej sesji (okno incognito, dev): **status 401** (2026-11-09, ręcznie przez testera właściciela).

## Wynik

Dla T1–T3 nie znaleziono przekroczenia granicy w sprawdzonym zakresie. Zgodnie z lekcją to poprawny wynik: dowód to metoda i kontrola pozytywna, a nie liczba znalezisk. Nie tworzę testów regresji, bo nie ma potwierdzonego znaleziska. Pozostałe luki wypisane wyżej.
