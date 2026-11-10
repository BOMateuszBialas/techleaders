# Spec: publiczny deploy na Prisma Compute

Status: draft (2026-11-10). Platforma wybrana przez właściciela: Prisma Compute + Prisma Postgres (plan Free, region eu-central-1). Ten dokument jest planem; kod nie jest zmieniany, dopóki spec nie zostanie zaakceptowany.

## 1. Cel

Aplikacja CommerceOS (`packages/app`, Next.js 16, `output: "standalone"`) działa pod publicznym adresem na Prisma Compute, z bazą Prisma Postgres, z health checkiem, smoke testem i opisanym rollbackiem.

Poza zakresem: Dockerfile jako ścieżka wdrożenia (Compute nie uruchamia obrazów Docker; `Dockerfile` zostaje dla `docker compose`), zmiany funkcjonalne, pełny CSP z nonce, płatne plany.

## 2. Ustalenia z dokumentacji Prisma Compute (sprawdzone 2026-11-10)

Źródła: `prisma.io/docs/composer/porting-an-app`, `prisma.io/docs/composer/deploying`, `prisma.io/docs/compute/environment-variables`, `prisma.io/docs/compute/limitations`. Strony są w wersji public beta; przed wdrożeniem trzeba je przeczytać jeszcze raz.

- Compute **nie buduje sam** (`prisma deploy` nie uruchamia builda). Build robimy przed deployem: `npm run build -w @commerceos/app`.
- Next.js: `import nextjs from '@prisma/composer/nextjs'`, `compute({ name, deps, build: nextjs({ module: import.meta.url, appDir: '..' }) })`, `output: "standalone"` w konfiguracji Next. Adapter `nextjsBuild()` w `prisma.config.ts`.
- Aplikacja działa na **Bun**. CLI wymaga Node 22.18+.
- Baza: w usługach Node/Bun deklaruje się `deps: { db: rawPostgres() }` i odczytuje `db.url`. Migracje **nie** są uruchamiane automatycznie dla `rawPostgres()`; trzeba je uruchamiać samemu.
- Zmienne środowiskowe: `bunx prisma project env add KEY=VALUE --role production` (wartości są write-only; `add` nie nadpisuje, do zmiany służy `update`).
- Strony wywołujące `service.load()` potrzebują `export const dynamic = 'force-dynamic'`.
- Scale-to-zero: pierwsze wywołanie po uśpieniu może zwrócić `ECONNRESET`; odpowiedź musi zacząć się w 60 s, inaczej 504.
- Brak WebSocketów, brak trwałego systemu plików, jeden region na usługę, do 3 domen (tylko produkcja).
- Nie znaleziono dokumentacji, jak Compute współgra z `cacheComponents`. Do sprawdzenia podczas spike'u.

## 3. Różnice między obecnym kodem a wymaganiami Compute

| Obszar | Stan obecny | Wymaganie Compute | Działanie |
|---|---|---|---|
| Połączenie z bazą | `DATABASE_URL` czytany w `packages/app/src/server/env.ts` przez `getEnv()` | `db.url` z `service.load()` albo env | Wprowadzić jedno miejsce odczytu URL bazy: najpierw `DATABASE_URL`, potem `service.load().db.url`. Nie zmieniać kontraktu env dla Docker. |
| Migracje | `npm run db:migrate` w obrazie `migrate` | ręcznie | Uruchamiać `db:migrate` z lokalnego checkoutu tagu przed deployem (ta sama procedura co w `docs/deployment.md`). |
| Runtime | Node (`node server.js` w Dockerfile) | Bun | Spike: sprawdzić, czy MikroORM + sterownik `pg` i Better Auth działają pod Bun. Jeśli nie, zatrzymać się i zgłosić. |
| Pliki | brak zapisu na dysk w runtime (wstępny grep: `node:fs` tylko w CLI `create-owner`) | brak trwałego FS | Potwierdzić grepem przed wdrożeniem (import CSV, uploady). |
| Dynamiczne strony | `cacheComponents: true` | `force-dynamic` przy `service.load()` | Dodać `force-dynamic` tylko tam, gdzie czytamy połączenie z usługi. |
| Health check | `GET /api/health` | platforma wymaga odpowiedzi <60 s | Bez zmian; smoke test sprawdza `/api/health`. |

## 4. Podejście

1. **Spike (dzień 1, bez zmian na `main`):** branch `feat/prisma-compute-deploy` z `main`. Dodać `prisma.config.ts`, `src/service.ts` z `nextjs(...)` i `prisma` jako devDependency. Sprawdzić `npm run build` i `bunx prisma dev` lokalnie.
2. **Połączenie z bazą:** jeden moduł odczytu konfiguracji bazy, pokryty testami jednostkowymi (100% pokrycia wymagane). Zmiana kontraktu env wymaga aktualizacji `.env.example` i `env.ts` w tym samym PR (zgodnie z `AGENTS.md`).
3. **Test integracyjny** połączenia i migracji na Testcontainers (już jest infrastruktura `npm run test:integration`).
4. **Deploy:** właściciel tworzy projekt przez CLI (`npx prisma auth login` w swoim terminalu, wybór regionu, `prisma project env add` dla sekretów). Agent nie widzi wartości sekretów. Potem `npx prisma deploy` z checkoutu tagu.
5. **Walidacja na żywym hoście:** `npm run smoke -- https://<adres>`; ręczne logowanie admina i jedno zamówienie w sklepie; wykonanie rollbacku na poprzedni deploy i ponowny smoke.
6. **Dokumentacja:** `docs/deployment.md` (sekcje TO FILL IN wypełnione dla Prisma Compute), sekcja rollback w README.

## 5. Ryzyka

- **Public beta Compute.** Zmiany API są możliwe; wersje Composer trzeba przypiąć.
- **Bun vs Node.** Największe ryzyko techniczne. Próg wejścia: jeśli spike nie przejdzie testów integracyjnych, deploy na Compute zostaje odłożony, a właściciel dostaje zgłoszenie.
- **Cold start.** Pierwszy request po uśpieniu może dać 504 lub `ECONNRESET`. Opisać w README jako ograniczenie planu Free.
- **Limity planu Free** nie są podane w dokumentacji, którą czytaliśmy. Sprawdzić przed deployem w panelu.
- **Sekrety.** Connection string z zrzutu ekranu (`commerceos-db`) został pokazany w pliku w `Downloads`. Przed deployem zrobić rotację hasła w panelu Prisma i usunąć plik.

## 6. Decyzje do potwierdzenia przez właściciela

1. Czy akceptujemy spike na Bun (krok 1) jako warunek dalszej pracy.
2. Czy publiczny adres ma być domyślny (`*.prisma.app`), czy własna domena (wtedy tylko produkcja, do 3 domen).
3. Czy `ADMIN_EMAIL`/`ADMIN_PASSWORD` do `admin:create` zostają tylko lokalnie (rekomendacja: tak).

## 7. Kryteria ukończenia

- `npm run lint`, `format:check`, `check:tokens`, `check:agents`, `test:hooks`, `typecheck`, `test:coverage` (100%), `build`, `test:integration`, `test:e2e` zielone.
- Publiczny adres odpowiada na `/api/health` i `npm run smoke` przechodzi.
- Rollback wykonany i opisany w `docs/deployment.md`.
- Spec przeniesiony do `.ai/specs/implemented/` po wdrożeniu.

## 8. Wyniki spike'u na Bun (2026-11-10, lokalnie)

Środowisko: Bun 1.4.4 (przez `npx bun@1`), Node 24.14.1, PostgreSQL 17.11 w Dockerze, gałąź `feat/prisma-compute-deploy` od `main`.

| Sprawdzenie | Wynik |
|---|---|
| MikroORM init + `select version()` pod Bun | OK |
| `pg` Pool (`createAuthPool`) pod Bun | OK |
| Migracje (`npm run db:migrate`, 23 pliki) i odczyt schematu z Bun (21 tabel) | OK |
| `npm run build -w @commerceos/app` (Next 16.4.3, `output: standalone`) | OK |
| `bun server.js` z katalogu standalone: `/api/health` (baza `up`), `/`, `/products`, `/admin/sign-in` | 200 |
| `npm run smoke -- http://127.0.0.1:3300` | 4/4 PASS |

Wniosek: runtime Bun nie blokuje wdrożenia. Pozostaje nieprzetestowane: sam adapter `nextjs` i `prisma deploy` (wymagają konta Prisma i logowania właściciela), `service.load()`/`rawPostgres()` (w obecnym kodzie wszystko idzie przez `DATABASE_URL`), oraz cold start na Compute.

Uwaga do kontraktu: dokumentacja mówi, że aplikacja Compute nie czyta `DATABASE_URL`. Najmniej inwazyjna droga to ustawić `DATABASE_URL` jako zmienną projektu Compute (`prisma project env add`), bez zmiany kodu. Do potwierdzenia w kroku 4.
