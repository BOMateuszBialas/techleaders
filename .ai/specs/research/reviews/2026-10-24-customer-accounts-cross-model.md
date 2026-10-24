# Recenzja speca E07 innym modelem: surowe odpowiedzi

- Spec: `.ai/specs/2026-10-24-customer-accounts.md` (wersja z PR #89 sprzed recenzji, 2026-10-24).
- Sposób: recenzję uruchomił ręcznie właściciel produktu, w nowych, pustych czatach Gemini i ChatGPT. Prompt był ten sam w obu (instrukcja plus pełny tekst speca pod linią `=== SPEC ===`), z dopiskiem, że A6 i A9 są zatwierdzone.
- Rozstrzygnięcie każdego znaleziska (przyjęte, przyjęte w części, odrzucone, z powodem) jest w sekcji „Recenzja innym modelem” w specu. Decyzje właściciela D-a…D-d zapadły po tej recenzji.
- Poniżej odpowiedzi skopiowane bez redakcji treści.

## Gemini

Oto krytyczna recenzja specyfikacji technicznej E07.

### 1. Werdykt

Poprawić przed implementacją.

Specyfikacja jest wyjątkowo dobrze przemyślana i dojrzała pod kątem architektury oraz izolacji ról. Zawiera jednak jedną krytyczną lukę bezpieczeństwa (Critical) związaną z mechanizmem idempotentności checkoutu, która pozwala na przejęcie cudzego zamówienia, oraz dwie istotne spójnościowe luki wysokie (High). Problemy te należy poprawić w specyfikacji przed rozpoczęciem prac nad kodem.

### 2. Znaleziska

**1. Przejęcie zamówienia przez wyścigi/replay idempotentności (Cross-User Order Leak)**

- Ważność: Critical
- Obszar: Bezpieczeństwo / Izolacja
- Gdzie: A15 (Założenia) oraz Opis przepływu danych (Data flow)
- Problem: Założenie A15 mówi: "The checkout request fingerprint includes the placing principal (customer:<id> or guest)". Jednak klucz idempotentności checkoutu w CommerceOS (specyfikacja kartowa A7) jest zazwyczaj generowany na kliencie (np. w nagłówku/formularzu) lub budowany z koszyka. Scenariusz ataku: Zalogowany Klient A rozpoczyna checkout, serwer generuje odciski/odniesienia. Jeśli Klient B pozna klucz idempotentności Klienta A (lub jeśli koszyk/stan przeglądarki zostanie podmieniony) i wyśle zapytanie checkoutu podając identyfikator wygenerowany przez Klienta A, serwer z identyfikatorem idempotentności Klienta A przypisze zamówienie do Klienta B (lub zwróci referencję zamówienia Klienta A dla Klienta B). Co więcej, specyfikacja w sekcji Data flow (krok 2) wskazuje, że odnośnik główny idzie do nagłówka przed sprawdzeniem spójności. Wyścig na poziomie bazy danych przy współbieżnych requestach (np. re-use tokena koszyka z inną sesją) może ujawnić referencję Klienta A Klientowi B.
- Rekomendacja: Wprost dopisać w A15 oraz w use-case PlaceOrderUseCase, że sprawdzenie idempotentności zamówienia Musi uwzględniać warunek: WHERE idempotency_key = :key AND customer_id IS NOT DISTINCT FROM :customerId. W przypadku braku zgodności customer_id (np. re-use klucza przez innego klienta/gościa), system nie może zwrócić istniejącego zamówienia, lecz musi zwrócić błąd konfliktu form_reused / 409 Conflict bez ujawniania danych zamówienia pierwotnego.

**2. Brak wymuszenia sprawdzania wersji / wymuszenia bazy dla unieważnionych sesji Klienta**

- Ważność: High
- Obszar: Bezpieczeństwo
- Gdzie: Sekcja packages/app/src/server/customer-auth/ (require-customer.ts) & A8
- Problem: Specyfikacja zakłada użycie wtyczki nextCookies() oraz domyślnego weryfikatora sesji Better Auth. Jeśli Better Auth lub Next.js zbuforuje odczyt cookie / sesji na poziomie requestu/RSC bez weryfikacji w bazie PostgreSQL przy każdym Server Action lub transition (albo użyje buforowania cookie cookie cache), wylogowany lub zablokowany klient z przejętym tokenem sesji może nadal wykonywać odczyty GET /api/account/orders. Co więcej, getCurrentCustomerId() w przypadku błędu odczytu sesji odpada bezpiecznie do null (fail closed to guest), ale jeśli baza danych zgłosi przejściowy błąd (timeout/connection limit), zapytań o zamówienia przypisane do konta nie wykona, ale zapytanie gościa na publicznych ścieżkach /orders/[reference] wykona jako Gość.
- Rekomendacja: Doprecyzować w specyfikacji, że:
  - Instancja klienta Better Auth ma bezwzględnie wyłączony cache sesji po stronie cookie (session.cookieCache.enabled: false) – jak wskazano w A8, ale należy dodać test integracyjny sprawdzający, że po usunięciu rekordu z customer_sessions kolejny request z tym samym tokenem natychmiast zwraca null / 401.
  - W getCurrentCustomerId() wyraźnie rozróżnić błąd "brak sesji/zły token" (zwraca null) od błędu "awaria bazy danych" (musi rzucić błędem 500 / DatabaseError, zamiast po prostu degradować klienta do Gościa i pozwalać na dalsze wykonywanie logiki).

**3. Podatność na enumeration atak na API /api/account/orders/[id] via Timing Attack / Format UUID**

- Ważność: High
- Obszar: Bezpieczeństwo / Izolacja
- Gdzie: Sekcja API Contracts (GET /api/account/orders/<id>) oraz A14
- Problem: Specyfikacja mówi, że dla niepoprawnego UUID zwraca 400 Bad Request, dla nieistniejącego UUID 404 NOT_FOUND, a dla cudzego UUID również 404 NOT_FOUND. Zgodnie z zasadą braku wycieku informacji (AC4/A14), walidacja UUID rzucająca 400 przed zapytaniem do bazy pozwala atakującemu rozróżnić: zapytanie ze złym formatem (400); zapytanie z poprawnym UUID, które do nie go nie należy / nie istnieje (404). Co ważniejsze: Zapytanie SQL WHERE id = :id AND customer_id = :customerId zwróci 404 zarówno gdy zamówienie :id nie istnieje, jak i gdy należy do kogoś innego. Jednakże, czas odpowiedzi SQL dla istniejącego ID (trafienie w indeks PK) vs nieistniejącego ID w dużej bazie danych może różnić się wykrywalnie (timing attack).
- Rekomendacja: Zmienić specyfikację w następujący sposób:
  - Walidację formatu UUID w API spójnie mapować na ten sam format odpowiedzi 404 NOT_FOUND z identycznym generycznym body ("Order not found"), aby nie ujawniać czy dany ciąg znaków w ogóle przeszedł parser UUID.
  - Zapewnić w opisie zapytania SQL (DatabaseOrderRepository), że zapytanie wykonuje się zawsze po indeksie łączonym lub używa stałego czasu weryfikacji, tak aby czas odpowiedzi nie zdradzał istnienia zasobu.

**4. Niespójność założenia A6 (Wspólny secret podpisujący) z założeniem niezależności ról**

- Ważność: Medium
- Obszar: Architektura / Bezpieczeństwo
- Gdzie: Założenie A6 (⚠ Session-signing secret)
- Problem: Użycie tego samego BETTER_AUTH_SECRET dla obu instancji (Owner i Customer) powoduje, że w przypadku potencjalnego wycieku / podatności w bibliotece Better Auth (np. w sposobie szyfrowania/podpisywania cookie), token wygenerowany dla jednej roli jest kryptograficznie poprawny dla drugiej. Co prawda tabele sesji są rozdzielone (admin_sessions vs customer_sessions), ale współdzielenie klucza szyfrującego znosi zasadę defense in depth (obrona w głąb). Jeśli w przyszłości powstanie mechanizm stateless JWT lub cache w Redis/pamięci, rola będzie podatna na zamianę kontekstu.
- Rekomendacja: Usunąć oznaczenie ⚠ i narzucić osobny klucz w konfiguracji: CUSTOMER_AUTH_SECRET z fallbackiem na BETTER_AUTH_SECRET w środowiskach deweloperskich/testowych, ale wymagany jako osobny secret w środowisku produkcyjnym.

**5. Brak jednoznacznej obsługi wygaśnięcia/usunięcia konta w kontekście FK on delete restrict**

- Ważność: Medium
- Obszar: Migracja / Baza danych
- Gdzie: Sekcja Data Model (orders.customer_id FK → customer_users(id) on delete restrict)
- Problem: Reguła on delete restrict uniemożliwia usunięcie klienta z bazy danych, jeśli posiada on jakiekolwiek zamówienie. Choć w A5 ustalono brak możliwości usuwania konta przez klienta (N06), specyfikacja nie określa, co dzieje się w sytuacjach administracyjnych / RODO (np. ręczne usunięcie klienta przez CLI/DBA lub w testach). Ręczne usunięcie użytkownika rzuci błędem spójności FK na poziomie bazy.
- Rekomendacja: Jawnie opisać w specyfikacji (w sekcji Data Model), że usunięcie kaskadowe użytkownika jest zablokowane celowo (restrict) w celu ochrony historii finansowej sklepu, a procedura ewentualnego anonimizowania konta (GDPR/RODO) polegać ma na czyszczeniu danych osobowych w customer_users (np. zmiana e-maila na deleted_<id>@deleted.local), a nie usunięciu rekordu.

**6. Ryzyko braku spójności transakcyjnej przy tworzeniu użytkownika w Better Auth**

- Ważność: Medium
- Obszar: Testowalność / Baza danych
- Gdzie: Krok 4 & Krok 7 Planu Implementacji
- Problem: Better Auth domyślnie wykonuje rejestrację tworząc rekord w customer_users oraz customer_accounts. Specyfikacja zakłada ustawienie name: "Customer" w akcji serwerowej przed przekazaniem do Better Auth. Jeśli zapytanie do Better Auth powiedzie się partially (np. zapis w customer_users przejdzie, a zapis w customer_accounts rzuci błędem), w bazie pozostanie "sierota".
- Rekomendacja: W kroku testów integracyjnych Phase 1 (krok 4) dodać przypadek testowy weryfikujący transakcyjność rejestracji (rollback w przypadku błędu zapisu hasła/konta).

### 3. Pytania do autora

- Zachowanie przy próbie zmiany e-maila przez formularz checkoutu: Czy jeśli zalogowany Klient A podczas checkoutu zmieni prefillowany e-mail na e-mail Klienta B, to czy zamówienie nadal ma zostać przypisane do konta Klienta A (z e-mailem B w snapshot danych do wysyłki), czy checkout powinien zostać odrzucony? Specyfikacja A16 mówi, że e-mail w checkoucie pozostaje edytowalny, ale warto to doprecyzować.
- Zachowanie wtyczki nextCookies() przy dwóch instancjach: Czy przeszedł już wstępny Spike sprawdzający, czy dwa wywołania nextCookies() od Better Auth w ramach jednego cyklu żądania Next.js App Router nie nadpisują wzajemnie nagłówków Set-Cookie w kontekście AsyncLocalStorage Next.js?

### 4. Ograniczenia recenzji

- Brak dostępu do kodu źródłowego repositorium: Nie można było zweryfikować dokładnej struktury order-access.ts, require-admin.ts ani istniejących mocków w Testcontainers.
- Wersja Better Auth (~1.7.10): Recenzja opiera się na specyfikacji i publicznej dokumentacji Better Auth. Zachowanie wewnętrzne funkcji disabledPaths w połączeniu z własnym handlerem HTTP przy dwóch instancjach w jednym procesie musi zostać ostatecznie potwierdzone w Phase 0 (Spike).

## ChatGPT

### 1. Werdykt

Najpierw rozstrzygnąć i poprawić wskazane kwestie przed implementacją. Specyfikacja ma konkretne mechanizmy kontroli dostępu, ale wymaga doprecyzowania zachowania przy błędach odczytu sesji, izolacji cache oraz bezpiecznego wycofywania migracji, aby nie dopuścić do niezamierzonego udostępnienia lub odłączenia zamówień kontowych.

### 2. Znaleziska

**1. Błąd odczytu sesji może po cichu zamienić zamówienie kontowe w gościnne**

- High
- Obszar: bezpieczeństwo / spójność danych
- Gdzie: getCurrentCustomerId(), A14, krok 6 oraz krok 12.
- Problem: Spec przewiduje, że gdy odczyt sesji zakończy się wyjątkiem, getCurrentCustomerId() zaloguje błąd i zwróci null, aby zachować działanie ścieżki gościnnej. Jeśli klient jest zalogowany i właśnie składa zamówienie, przejściowa awaria odczytu sesji może więc spowodować utworzenie zamówienia z customer_id = null. Zamówienie nie pojawi się w historii konta, a jego dostępność będzie oparta na sekretnym odnośniku gościa. To nie musi oznaczać bezpośredniego wycieku zamówienia kontowego, ale jest niejawnie zmienionym zachowaniem transakcji zakupowej.
- Rekomendacja: Rozdzielić trzy stany: brak sesji, poprawna sesja klienta oraz błąd weryfikacji sesji. Dla publicznego podglądu zamówienia można nadal odrzucać dostęp do zamówień kontowych przy braku zweryfikowanego klienta. Dla placeOrder błąd odczytu sesji powinien jednak przerwać operację kontrolowanym błędem, a nie automatycznie przełączać ją w tryb gościa. Dodać test, który symuluje awarię getSession() podczas zakupu i potwierdza, że zamówienie nie zostaje zapisane jako gościnne.

**2. Wycofanie migracji może usunąć powiązanie zamówień z kontami**

- High
- Obszar: migracja / prywatność danych
- Gdzie: krok 9, plan migracji orders_customer, zasady rollbacku.
- Problem: Spec opisuje, że wycofanie drugiej migracji usuwa kolumnę customer_id, przez co zamówienia kontowe stają się zamówieniami gościnnymi i ich referencje mogą ponownie umożliwić dostęp przez publiczny URL. Polityka „forward-only” jest opisana, ale nie blokuje wykonania destrukcyjnego rollbacku. Jedna pomyłka operacyjna może więc zmienić reguły dostępu do istniejących zamówień.
- Rekomendacja: Zmienić migrację w dół tak, aby przerywała działanie, jeśli istnieją zamówienia z niepustym customer_id. Alternatywnie usunąć obsługiwany rollback tej migracji i formalnie opisać ją jako nieodwracalną po pojawieniu się zamówień kontowych. Test migracji powinien sprawdzać nie tylko up → down → up na danych gościnnych, ale również bezpieczne zachowanie down przy istniejących zamówieniach kontowych.

**3. Nie określono wystarczająco jednoznacznie izolacji cache dla publicznych stron zależnych od sesji**

- High
- Obszar: izolacja / bezpieczeństwo
- Gdzie: A14, A21, kroki 6, 12–13; Next.js 16 i cacheComponents.
- Problem: A21 wyraźnie zabrania umieszczania UI nagłówka zależnego od sesji wewnątrz use cache, ale podobnie jednoznaczna reguła nie jest sformułowana dla stron /orders/[reference] i /checkout/pay/[reference], które również przekazują do logiki zamówienia użytkownika wynik odczytu sesji. Sam test A↔B nie gwarantuje, że zachowanie pozostanie poprawne przy współdzielonym lub nieprawidłowo kluczowanym cache. Jeśli wynik zależny od użytkownika zostanie ponownie użyty dla innego żądania, granica dostępu może zostać naruszona.
- Rekomendacja: Dodać jawny wymóg, że wyniki stron, loaderów i operacji odczytu zależnych od sesji nie mogą być współdzielone pomiędzy użytkownikami. W testach E2E sprawdzić oba kierunki po rozgrzaniu stron: A otwiera zamówienie A, następnie B próbuje otworzyć A; potem B otwiera własne zamówienie, a A próbuje otworzyć B. Powtórzyć testy po wylogowaniu i zalogowaniu innego użytkownika w tym samym kontekście przeglądarki. W ramach spike'u zweryfikować faktyczne zachowanie Next.js 16 z włączonym cacheComponents, zamiast opierać się wyłącznie na założeniu architektonicznym.

**4. Założenia A6 i A9 są oznaczone jako nierozstrzygnięte mimo informacji o akceptacji właściciela produktu**

- Medium
- Obszar: spójność specyfikacji / decyzje bezpieczeństwa
- Gdzie: nagłówek dokumentu, „Decisions and assumptions”, A6, A9 oraz Review log.
- Problem: Nagłówek mówi, że A6 i A9 wymagają wyraźnego potwierdzenia właściciela produktu. Jednocześnie zapis A6 opisuje zatwierdzone współdzielenie sekretu, a A9 jest opisane jako świadomie przyjęte ograniczenie dotyczące enumeracji adresów e-mail. Review log wskazuje też, że ograniczenie surowego endpointu Better Auth zostało już odnotowane. W tej postaci dokument nie daje implementującemu jednoznacznej informacji, które decyzje są zatwierdzone, a które nadal blokują start.
- Rekomendacja: Ujednolicić status A6 i A9 w nagłówku oraz tabeli decyzji. Jeśli decyzje zostały zatwierdzone, usunąć oznaczenie ⚠ i opisać je jako zaakceptowane ryzyka. Jeżeli nie — jawnie wskazać, że implementacja pozostaje zablokowana do ich potwierdzenia. W przypadku A9 zachować rozróżnienie między ogólnym komunikatem akcji serwerowej a odpowiedzią bezpośredniego endpointu, która może ujawniać istnienie adresu e-mail.

**5. Wspólny limit 20 żądań na minutę może stać się globalnym punktem odmowy usługi**

- Medium
- Obszar: bezpieczeństwo / dostępność
- Gdzie: A10, konfiguracja rate limitingu oraz krok 1(e).
- Problem: Gdy nie ma zaufanego nagłówka adresu klienta, spec przewiduje wspólny limit 20 żądań na minutę. W takim wariancie aktywność jednego klienta może wyczerpać budżet żądań dla wszystkich klientów korzystających z tego mechanizmu. W efekcie zwykłe logowanie lub rejestracja innych użytkowników mogą otrzymywać odpowiedzi 429, mimo że nie przekroczyli indywidualnego limitu.
- Rekomendacja: Opisać wspólny limit jako awaryjny mechanizm o znanym wpływie na dostępność, a nie równoważnik limitowania per IP. Jeśli biblioteka pozwala, zastosować połączenie limitu globalnego z limitem per konto lub zaufane IP. W przeciwnym razie jawnie określić, czy w środowisku produkcyjnym brak konfiguracji zaufanego źródła IP ma blokować wdrożenie. Zachować test, który potwierdza brak możliwości resetowania limitu przez spoofing niezaufanego nagłówka.

**6. Kryterium AC4 i kontrakt API są niespójne w sprawie kodu 404 dla każdego nieudanego dostępu**

- Medium
- Obszar: luka względem briefu / testowalność
- Gdzie: AC4, kontrakt GET /api/account/orders/<id>, krok 12.
- Problem: AC4 mówi, że każda próba dostępu do cudzego zamówienia kończy się odpowiedzią 404, nigdy 403. Kontrakt API przewiduje natomiast 400 dla niepoprawnego UUID. To może być poprawne rozróżnienie błędu składni od braku dostępu, ale obecne sformułowanie AC4 jest szersze niż kontrakt i może prowadzić do sprzecznych testów.
- Rekomendacja: Doprecyzować AC4: 404 dotyczy identyfikatora poprawnego składniowo, który nie istnieje albo nie należy do bieżącego klienta; 400 dotyczy niepoprawnego formatu identyfikatora. Dodać testy potwierdzające identyczne odpowiedzi dla cudzego i nieistniejącego UUID oraz osobny test dla błędnego formatu.

**7. Reguła inwentaryzacji guardów może dawać fałszywe poczucie ochrony**

- Medium
- Obszar: testowalność / utrzymanie bezpieczeństwa
- Gdzie: krok 6, krok 12 i reguła wymagająca importu require-customer.
- Problem: Test inwentaryzacyjny ma wymagać, aby pliki wywołujące getOrderByReferenceUseCase lub confirmDemoPaymentUseCase importowały require-customer. Sam import nie dowodzi jednak, że guard został rzeczywiście wywołany ani że viewer pochodzi ze zweryfikowanej sesji. Plik może spełnić regułę przez nieużywany import. Spec opisuje osobne testy jednostkowe pochodzenia viewer, ale inwentaryzacja nie powinna być traktowana jako samodzielny dowód autoryzacji.
- Rekomendacja: Traktować inwentaryzację jako kontrolę uzupełniającą. Dla każdej ścieżki wymagającej sesji sprawdzać zachowanie przy braku sesji, sesji niewłaściwej roli i awarii odczytu sesji. Dla ścieżek publicznych dopuszczających gościa testować, że viewer jest wyprowadzany z wyniku weryfikacji sesji, a nie z danych formularza lub stałej wartości. W dokumentacji nie przedstawiać samego importu guardu jako dowodu jego wykonania.

**8. Odpowiedź o duplikacie e-maila nadal może ujawniać istnienie konta przez surowy endpoint**

- Medium
- Obszar: bezpieczeństwo / prywatność
- Gdzie: A9, /api/customer-auth/*, krok 1(f–h).
- Problem: Spec ogranicza jednolity komunikat błędu do akcji serwerowej, ale dopuszcza bezpośredni dostęp do endpointu Better Auth, który może zwracać inną odpowiedź dla istniejącego adresu e-mail. Osoba atakująca może ominąć UI i wywołać endpoint bezpośrednio. Dokument przyznaje to jako ograniczenie, więc nie jest to nieujawniony błąd, ale ryzyko powinno pozostać wyraźnie widoczne przy ocenie bezpieczeństwa.
- Rekomendacja: Zachować ten punkt jako zaakceptowane ograniczenie, jeśli odpowiada decyzji właściciela produktu. W wynikach spike'u zapisać rzeczywisty status, treść i zachowanie czasowe odpowiedzi dla istniejącego i nieistniejącego adresu. Jeśli wymaganiem ma być rzeczywiste ograniczenie enumeracji, należy znormalizować odpowiedzi na surowym endpointcie lub uniemożliwić publiczne wywołanie ścieżki rejestracji z pominięciem kontrolowanej warstwy.

### 3. Pytania do autora

1. Zachowanie przy awarii sesji: Czy w przypadku błędu odczytu sesji podczas składania zamówienia wymagane jest przerwanie zakupu, czy produktowo dopuszczone jest utworzenie zamówienia gościnnego? Spec opisuje mechanizm techniczny, ale nie rozstrzyga konsekwencji dla klienta.
2. Rollback migracji: Czy w środowisku produkcyjnym ma istnieć możliwość wykonania migracji w dół po utworzeniu zamówień kontowych? Jeśli nie, czy zespół akceptuje techniczne zablokowanie takiego rollbacku?
3. A6 — wspólny sekret: Czy wynik spike'u ma potwierdzać jedynie rozdzielenie sesji i cookies, czy również zachowanie wszystkich istotnych mechanizmów Better Auth korzystających z sekretu przy dwóch instancjach? Samo sprawdzenie, że token z jednej tabeli nie daje sesji w drugiej, nie rozstrzyga całego zachowania biblioteki.

### 4. Ograniczenia recenzji

- Recenzja dotyczy tekstu specyfikacji, a nie działającej implementacji. Nie sprawdziłem rzeczywistego zachowania aplikacji, zapytań SQL, konfiguracji cache ani poprawności guardów.
- Nie uruchomiłem spike'u z Better Auth 1.7.10 i Next.js 16. Nie mogę więc potwierdzić semantyki disabledPaths, współistnienia pluginów nextCookies(), zachowania współdzielonego sekretu ani faktycznego kształtu odpowiedzi endpointów.
- Nie zweryfikowałem zawartości dokumentów źródłowych wymienionych w specyfikacji, takich jak D11, AGENTS.md czy wcześniejsze specyfikacje implementacyjne. Nie rozstrzygam zatem, czy każde wymaganie z briefu zostało wiernie przeniesione do E07.
- Nie potwierdziłem, czy konkretna wersja Next.js faktycznie współdzieliłaby którykolwiek z opisanych wyników. Ryzyko cache wskazuje na brak jawnego kontraktu i wymagane testy, a nie stwierdzenie, że wyciek już występuje.

Pozostałe obszary: Na podstawie samego tekstu nie wskazuję odrębnego błędu w założeniu, że identyfikator klienta pochodzi z sesji, ani w podstawowej regule odrzucania dostępu do zamówień należących do innego klienta. To jednak nadal wymaga potwierdzenia testami integracyjnymi i E2E opisanymi w specyfikacji.

Priorytet przed implementacją: najpierw rozdzielić brak sesji od błędu jej odczytu w przepływie zakupowym, zabezpieczyć rollback migracji oraz dopisać jednoznaczny kontrakt izolacji cache. Następnie ujednolicić kryteria API i status decyzji A6/A9.
