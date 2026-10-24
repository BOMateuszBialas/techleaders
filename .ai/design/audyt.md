# Audyt: wykrywacz generycznego wyglądu (lekcja 06, ćwiczenie 1)

- **Data:** 2026-10-23
- **Prompt:** `wykrywacz-aplikacja-devmentor.txt` (Krok 1–3, format „Wynik”, zasady), blok „Co sprawdzasz” podmieniony na CommerceOS.
- **Co audytowano:**
  - kod UI: `packages/app/src/app`, `packages/app/src/components` (prymitywy shadcn w `components/ui`: badge, button, card, input, label, table, textarea),
  - design system: `packages/app/src/app/globals.css` (domyślne tokeny shadcn, `components.json`: styl `base-nova` na Base UI, `baseColor: neutral`, ikony lucide); Storybooka nie ma,
  - marka i dane: `.ai/specs/product-brief.md`, decyzja D10 (sklep z akcesoriami dla graczy), seed `packages/database/src/seeders/DatabaseSeeder.ts` i obrazki `packages/app/public/demo/products/*.svg`,
  - działająca aplikacja: sklep (strona główna, katalog, kategoria, puste wyszukiwanie, produkt, koszyk pusty i z pozycją, checkout pusty i z błędami, płatność demo, potwierdzenie zamówienia, wyszukiwanie zamówienia, 404), logowanie do panelu.
- **Na żywo czy z kodu:**
  - **Na żywo (agent-browser 0.35.2, Chrome 156, szerokości 1440 / 768 / 320 px):** cały sklep i ekran logowania. Mierzone w przeglądarce: kontrast (kolor tekstu złożony z tłem przodków i przezroczystością), wielkość celów kliknięcia z wyjątkiem odstępu z WCAG 2.5.8, fokus z klawiatury (Tab, styl wyliczony + zrzut), przewijanie w poziomie, długość linii, pola bez etykiety, unikalne kolory i rozmiary fontu przy 1440 px, treść bez JavaScriptu (HTML z serwera w ramce bez skryptów).
  - **Tylko z kodu:** cały panel po zalogowaniu (dashboard, produkty, formularz produktu, kategorie, zamówienia z listą i szczegółami, panel stanu magazynu, import CSV, Copilot). Bez hasła właściciela nie da się zalogować. Zgodnie z poleceniem nie zakładałem konta właściciela (również tymczasowego), więc kontrastu, fokusu, celów i rozjazdów w panelu **nie dało się zmierzyć**.
  - **Uwagi o środowisku:** serwer dev działał na **:3001**, nie na :3000 (port 3000 był wolny). Logowanie z błędnymi danymi zwraca „Sign-in is unavailable. Try again.” zamiast „Invalid email or password.”. Przypuszczenie: `APP_URL` wskazuje :3000, a sprawdzenie origin w Better Auth odrzuca :3001; nie weryfikowałem tego. Przejście checkoutu założyło w bazie dev jedno testowe zamówienie `CO-GWP9H-XS4PQ-YMB0S-181M8` („Audyt UI (test)”, opłacone w trybie demo, stan Vortex Wireless Mouse −1).
- **Zrzuty ekranu:** `C:/Users/Użytkownik/Desktop/KURS TECHLEADERS/materialy/audyt-zrzuty/` (poza repo), nazwy `NN-ekran-szerokość.png`. Odwołuję się do nich niżej jako `[zrzut NN-…]`.

## Krok 1. Znaki generycznego wyglądu

| Znak | Stan | Gdzie / co |
|---|---|---|
| Indygo lub fiolet jako kolor akcji bez uzasadnienia | **nie występuje** jako kolor akcji (akcja = prawie czarny `--primary: oklch(0.205 0 0)`). **Odpowiednik występuje:** fiolet `#7e22ce` i indygo `#4338ca` (paleta Tailwinda) wypełniają ilustracje produktów: kontrolery i klawiatury (`public/demo/products/apex-wireless-controller.svg`, `nova-tkl-…`, `aurora-…`, `strike-60-…`, `arena-…`, `retro-…`). To największe plamy koloru na stronie głównej i w katalogu [zrzut 01-home-1440, 02-katalog-1440]. Martwe indygo jest też w `globals.css:112` (`.dark --sidebar-primary`), ale ciemnego motywu nikt nie włącza |
| Gradient w tekście nagłówka | nie występuje | – |
| Gradient w tle albo na przycisku | nie występuje | – |
| Ciemnogranatowe tło z poświatą | nie występuje | – |
| Duże zaokrąglenia i pigułki na większości elementów | **częściowo:** pigułki mają badge (`ui/badge.tsx:7`, `rounded-4xl` = 26 px), filtry kategorii i zakładki „Featured”, licznik koszyka (`rounded-full`). Przyciski, pola i karty mają 8–10 px | [zrzut 02-katalog-1440] |
| Karty z cieniem jako jedyny separator | nie występuje (karty mają obramowanie bez cienia; cień ma tylko rozwijane menu mobilne, `header-menu.tsx:51`) | – |
| Karta w karcie | **występuje:** karta produktu (`product-card.tsx:14`, `rounded-lg border p-3`) zawiera kafel obrazka z własnym obramowaniem, zaokrągleniem i tłem (`product-image.tsx`), a obrazek SVG rysuje w środku trzecią ramkę z podpisem „DEMO” | [zrzut 02-katalog-1440] |
| Półprzezroczyste, rozmyte panele | nie występuje (`bg-muted/40` w pasku bocznym panelu bez rozmycia, `admin/(protected)/layout.tsx:16`) | – |
| Pigułka z nowością albo liczbą nad nagłówkiem | nie występuje | – |
| Wyróżnione kolorem słowo w nagłówku | nie występuje | – |
| Para „Zacznij za darmo” + „Zobacz demo” | nie występuje (hero ma jeden przycisk „Shop all products”, `(storefront)/page.tsx:24`) | – |
| Rząd wielkich liczb | **występuje w panelu (z kodu), z uzasadnieniem:** 4 karty metryk `text-2xl font-semibold` (`dashboard-view.tsx:68`, siatka `xl:grid-cols-4` w :196). Liczby są prawdziwymi metrykami z definicją (`METRIC_DEFINITIONS`), więc wzorzec wynika z produktu | nie da się zobaczyć na żywo |
| Trzy identyczne karty z ikoną | nie występuje. Copilot pokazuje 3 karty rekomendacji (`copilot-answer-view.tsx:96`) bez ikon; liczbę 3 narzuca specyfikacja | – |
| Karty unoszące się nad pierwszym ekranem | nie występuje | – |
| Logo jako kolorowy kwadrat z literą albo ikoną | nie występuje (logo to sam tekst „CommerceOS”, `(storefront)/layout.tsx:28`; w panelu „CommerceOS Admin”) | – |
| Awatary z inicjałami na kolorowym tle | nie występuje | – |
| Emoji zamiast ikon | **występuje (odpowiednik):** znak Unicode `☰` zamiast ikony w przycisku menu mobilnego (`header-menu.tsx:47`). Gdzie indziej są ikony lucide (tylko `SearchIcon`, `ShoppingCart`) | [zrzut 15-menu-otwarte-320] |
| Iskierki jako symbol AI | nie występuje (Copilot bez ikon AI; grep `Sparkle\|Wand\|Bot` bez wyników) | – |
| Ikony na kolorowym tle przy nagłówkach | nie występuje | – |
| Obietnice, które nic nie mówią o produkcie | **słabo występuje:** hero „Gear up for your next match … picked for players who care about every frame” (`(storefront)/page.tsx:20-23`, stała `HERO_DESCRIPTION`). Zdanie wymienia kategorie i od razu mówi, że to dane demo, więc to umiarkowany przypadek | [zrzut 01-home-1440] |
| Liczby, opinie, oceny, klienci spoza danych produktu | nie występuje. Brak ocen i opinii; specyfikacje („26,000 DPI”, „70 hours”) pochodzą z seeda i mają oznaczenie `[DEMO]`; „16 products” zgadza się z siatką (15 produktów z seeda + „QA Mousepad XL” dodany ręcznie w bazie dev, spoza seeda) | [zrzut 02-katalog-1440] |

**Wniosek z kroku 1:** typowych ozdobników z landing page’y AI prawie nie ma. Generyczność wynika z czegoś innego: **całość to nietknięty domyślny shadcn** (tokeny `neutral` 1:1 z szablonu, font Geist z `create-next-app`, `--radius: 0.625rem`, lucide). Sklep dla graczy (D10) nie ma żadnej własnej decyzji wizualnej, a jedyny kolor pochodzi z przypadkowej palety Tailwinda w ilustracjach. Brief nie definiuje marki (brak kolorów, logo, kroju, tonu wizualnego), więc żaden z tych wyborów nie ma uzasadnienia w produkcie.

## Krok 2. Błędy UX i dostępności (sklep na żywo; panel z kodu)

- **Kontrast tekstu:** przy 1440, 768 i 320 px nie ma tekstu poniżej progu poza jednym miejscem: „No image” `#737373` na `#f5f5f5` = **4,35 : 1** (wymagane 4,5; `product-image.tsx`, karta „QA Mousepad XL”). `muted-foreground` na białym = 4,74 : 1 (przechodzi z małym zapasem). „Out of stock” na wyłączonym przycisku = 3,71 : 1; elementy wyłączone są zwolnione z wymogu. W ilustracjach napis „DEMO” `#a8a29e` na `#f5f5f4` ma ok. 2,4 : 1 (obliczone z wartości w SVG; to tekst w obrazku, nazwa produktu jest też w `alt` i pod obrazkiem). Panel: nie da się zmierzyć; z tokenów wynika, że teksty `amber-700`/`emerald-700` na białym przechodzą (ok. 5 : 1), ale nie mierzyłem tego na ekranie.
- **Kontrast elementów interfejsu (3 : 1):** obramowanie pól, selecta i przycisków `outline` `--input`/`--border` `#e5e5e5` na białym = **1,26 : 1** na każdym ekranie z formularzem (wyszukiwarka, checkout, ilość, logowanie, koszyk). Granica pola jest prawie niewidoczna [zrzut 08-checkout-1440, 12-logowanie-admin-1440].
- **Cele < 24 × 24 px:** linki tekstowe w nawigacji i stopce mają 18–21 px wysokości, ale wszystkie mieszczą się w wyjątku odstępu 2.5.8 (sprawdzone geometrycznie: koło 24 px nie zahacza o inne cele). Przyciski mają min. 28 px (`size sm` = `h-7`), domyślnie 32 px. Nie ma celów poza wyjątkiem.
- **Pola bez widocznej etykiety:** wyszukiwarka w nagłówku ma etykietę tylko `sr-only` (`header-search.tsx:20`); widać sam placeholder „Search products”. Przy 320 px pole ma **49 px** szerokości i placeholder ucina się do „S…” [zrzut 15-menu-otwarte-320]. Pozostałe pola mają widoczne `<Label>`.
- **Kolor jako jedyny nośnik stanu:** nie stwierdzono. Błędy pól = czerwona ramka + tekst + `aria-invalid`; statusy zamówień i dostępność to tekst w badge (`order-badges.tsx:14`); aktywny filtr = wypełnienie + `aria-current`. Uwaga z kodu: `paid` i `processing` mają ten sam wariant badge (`order-badges.tsx:7-8`), więc różni je tylko tekst. Nie łamie to WCAG, ale statusy nie mają hierarchii wizualnej.
- **Stany ładowanie / pusto / błąd:** sklep ma szkielety ładowania (`Suspense` + `*Skeleton`), puste wyszukiwanie z „Clear search” [zrzut 04-szukaj-pusto-1440], pusty koszyk z linkiem [zrzut 06-koszyk-pusty-1440] i strony 404 [zrzut 13-404-1440]. **Brak `error.tsx` w `(storefront)`:** błąd bazy w sklepie kończy się domyślnym ekranem błędu Next (z kodu; nie wywoływałem błędu). Panel ma `error.tsx` z „Try again” oraz tekstowe stany ładowania („Loading orders…”).
- **Fokus z klawiatury:** jest widoczny wszędzie, ale słaby. Pola i przyciski dostają pierścień `ring-ring/50` = `#d0d0d0` na białym = **1,54 : 1**, a ramka pola w fokusie `#a1a1a1` = 2,58 : 1, obie poniżej 3 : 1 [zrzut 14-fokus-przycisk-1440]. Linki dostają systemowy kontur `outline: auto` + podkreślenie i są dobrze widoczne [zrzut 14-fokus-link-1440]. Po wysłaniu pustego checkoutu **fokus zostaje na `body`** zamiast przejść do pierwszego błędnego pola (zmierzone; w kodzie nie ma żadnego `.focus()`).
- **Linie > 75 znaków:** przy 1440 px akapit na `/orders/lookup` ma ok. **84 znaki w linii** (szerokość 1120 px, bez `max-w-prose`). Hero i opis produktu mieszczą się w limicie. Przy 768 i 320 px nie ma przekroczeń.
- **Komunikaty błędów, które nie mówią, co zrobić:** w checkoutcie komunikaty są konkretne („Enter a postal code like 00-950.”) [zrzut 08b-checkout-blad-1440]. Logowanie: „Sign-in is unavailable. Try again.” nie mówi, co zrobić, kiedy ponowienie nie pomaga [zrzut 12b-logowanie-blad-1440]. Panel: „Something went wrong” + „Try again” (`admin/(protected)/error.tsx:18`), „Copilot is temporarily unavailable.” (`copilot-copy.ts:19`) obok deterministycznego fallbacku.
- **Treść bez JavaScriptu:** **sprawdzone, znika.** Strona główna bez JS pokazuje hero bez polecanych produktów; katalog pokazuje 3 szare szkielety zamiast 16 produktów, a linki kategorii w nagłówku i stopce nie pojawiają się [zrzut 16-bez-js_-1440, 16-bez-js_products-1440]. Przyczyna: treść strumieniowana z `<Suspense>` przy `cacheComponents` trafia do ukrytych `<div hidden id="S:…">` i podmienia ją dopiero skrypt. Formularz wyszukiwania działa jako zwykły GET, ale nie ma czego pokazać. Sprawdzone na serwerze dev; na buildzie produkcyjnym nie sprawdzałem (przypuszczenie: dynamiczne części katalogu zachowają się tak samo).
- **Przewijanie w poziomie:** dokument się nie przewija przy żadnej szerokości. **Przy 320 px otwarte menu mobilne wychodzi za lewą krawędź:** panel `absolute right-0 w-56` (`header-menu.tsx:51`) zaczyna się na x ≈ −21 px i ucina „Shop all”, „Controllers” [zrzut 15-menu-otwarte-320]. Przy 375 px mieści się. Karuzela polecanych produktów (`featured-products.tsx:63`, `overflow-x-auto`) ucina 5. kartę bez żadnej wskazówki, że można przewinąć [zrzut 01-home-1440].

## Krok 3. Rozrzut wartości

- **Kolory tekstu widoczne przy 1440 px:** **7** (sklep + logowanie): foreground, `primary-foreground` (na przyciskach), `primary` (licznik), `muted-foreground`, `amber-950` (pasek demo), `emerald-700` („Added to cart.”), `destructive`. Panelu nie zmierzono; w kodzie panelu dochodzą `amber-700`, `amber-400`/`emerald-400` (dark) i `secondary-foreground`. W całym kodzie jest 12 różnych klas koloru tekstu.
- **Rozmiary fontu widoczne przy 1440 px:** **9**: 12, 12,8, 14, 16, 18, 20, 24, 30, 36 px. 12,8 px pochodzi z arbitralnego `text-[0.8rem]` w `ui/button.tsx:25` (przycisk `sm`). W kodzie jest 9 klas rozmiaru (`text-sm` 181×, `2xl` 15×, `lg` 11×, `3xl` 10×, `xs` 8×, `base` 5×, `xl` 3×, `4xl` 1×, `[0.8rem]` 1×) i 2 grubości (`font-medium` 37×, `font-semibold` 52×).
- **Promienie zaokrąglenia w kodzie:** **6** wartości: 4 px (`rounded`, 7×), 8 px (`rounded-md`, 18×, oraz `rounded-[min(var(--radius-md),10px|12px)]`, 4×), 10 px (`rounded-lg`, 14×), 14 px (`rounded-xl` / `-t-xl` / `-b-xl`, 6×), 26 px (`rounded-4xl`, badge) i pełne (`rounded-full`, 3×). Na ekranie widać 5 z nich (8, 10, 14, 26 px, pełne).
- **Odstępy (padding, margin, gap) w kodzie:** **12** unikalnych wartości: 0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32 i 40 px w 297 użyciach. **3 są spoza siatki 4 px:** 2 px (`*-0.5`, 2×), 6 px (`*-1.5`, 20×) i 10 px (`*-2.5`, 5×), łącznie 27 użyć. Arbitralnych odstępów w px nie ma.
- **Kolory i wartości wpisane na sztywno poza plikiem tokenów:** grep z lekcji („Sprawdzenie w CI”) na `packages/app/src` bez `globals.css` (`*.tsx`, `*.ts`, `*.css`, bez testów) zwraca **11 linii w 11 plikach**:
  1. `packages/app/src/app/(storefront)/layout.tsx:23`: `bg-amber-100 … text-amber-950` (pasek „Demo store”)
  2. `packages/app/src/app/admin/(protected)/orders/[id]/page.tsx:84`: `border-amber-500/50 bg-amber-50 … dark:bg-amber-950/30`
  3. `packages/app/src/components/admin/categories/category-form-view.tsx:64`: `text-amber-700 dark:text-amber-400` (ostrzeżenie o slugu)
  4. `packages/app/src/components/admin/form-feedback.tsx:17`: `text-emerald-700 dark:text-emerald-400` (sukces formularza, używany też w sklepie)
  5. `packages/app/src/components/admin/orders/order-badges.tsx:26`: `border-amber-500 text-amber-700 dark:text-amber-400` (badge DEMO)
  6. `packages/app/src/components/admin/products/description-draft-panel-view.tsx:92`: `text-amber-700 dark:text-amber-400`
  7. `packages/app/src/components/admin/products/product-form-view.tsx:114`: `text-amber-700 dark:text-amber-400`
  8. `packages/app/src/components/admin/redirect-notice.tsx:18`: `text-emerald-700 dark:text-emerald-400`
  9. `packages/app/src/components/checkout/order-forms-view.tsx:28`: `border-amber-300 bg-amber-50 … text-amber-950`
  10. `packages/app/src/components/ui/badge.tsx:7`: `focus-visible:ring-[3px]` (arbitralna wartość)
  11. `packages/app/src/components/ui/button.tsx:25`: `text-[0.8rem]` (arbitralna wartość, źródło rozmiaru 12,8 px)

  Grep nie obejmuje ilustracji w `packages/app/public/demo/products/*.svg`: 15 plików używa 8 kolorów hex z palety Tailwinda (`#7e22ce` purple-700, `#4338ca` indigo-700, `#b91c1c` red-700, `#0f766e` teal-700, `#334155` slate-700, `#44403c`, `#a8a29e`, `#f5f5f4` stone).

## Wynik

### 1. Najważniejsze znaleziska

| Znak lub błąd | Gdzie | Co widać | Dlaczego to problem | Czym zastąpić | Pewność |
|---|---|---|---|---|---|
| Nietknięty motyw shadcn jako cała „marka” | `globals.css:51-118`, `layout.tsx:5-13` (Geist), `components.json` (`neutral`, lucide) | Szarości 1:1 z szablonu, akcja prawie czarna, font z `create-next-app`, promień 0,625 rem; sklep dla graczy wygląda jak każdy szablon | generyczny wygląd (żaden wybór nie ma uzasadnienia w briefie ani D10) | Decyzje marki w tokenach: kolor akcji, krój, promień (decyzje 1–3) | sprawdzone |
| Jedyny kolor pochodzi z palety Tailwinda w ilustracjach | `public/demo/products/*.svg` (fiolet `#7e22ce`, indygo `#4338ca`, red, teal, slate) | Największe plamy koloru w sklepie to fioletowe pady i indygo klawiatury, przypisane do kategorii przypadkiem | generyczny wygląd (indygo/fiolet bez uzasadnienia w marce) | Ilustracje z palety marki (1–2 kolory + neutralne) albo neutralne zdjęcia demo | sprawdzone |
| Obramowania pól i przycisków `outline` prawie niewidoczne | `--input`/`--border` `oklch(0.922 0 0)` = `#e5e5e5`; każde pole | 1,26 : 1 do białego tła | dostępność (WCAG 1.4.11 wymaga 3 : 1) | Token `--input` ≥ 3 : 1 do `--background` (np. ok. `#8a8a8a`) | sprawdzone |
| Słaby pierścień fokusu | `outline-ring/50` (`globals.css:122`), `focus-visible:ring-3 ring-ring/50` w `ui/button.tsx`, `ui/input.tsx` | Pierścień `#d0d0d0` 1,54 : 1, ramka w fokusie 2,58 : 1; widoczny, ale blady | dostępność (wskaźnik fokusu < 3 : 1) | Token `--ring` o kontraście ≥ 3 : 1, bez `/50`, offset 2 px | sprawdzone |
| Treść znika bez JavaScriptu | `(storefront)/page.tsx:41`, `products/page.tsx:18` (`<Suspense>` + `cacheComponents`) | Bez JS: katalog = 3 szare szkielety, brak polecanych produktów i linków kategorii | UX / dostępność (wolne łącza, błąd skryptu = pusty sklep) | Statyczna powłoka z listą produktów (`"use cache"` dla katalogu) albo `<noscript>` z linkiem do pełnej listy | sprawdzone (dev), przypuszczenie dla buildu prod |
| Menu mobilne ucięte przy 320 px | `header-menu.tsx:51` (`absolute right-0 w-56`) | Panel zaczyna się na x ≈ −21 px, „Shop all”, „Controllers” ucięte | UX (nawigacja na najmniejszym telefonie) | Panel na pełną szerokość pod nagłówkiem (`inset-x-0`) albo `left-0` + `max-w-[calc(100vw-2rem)]` | sprawdzone |
| Wyszukiwarka w nagłówku: sam placeholder, przy 320 px ma 49 px | `header-search.tsx:20-29` | Etykieta tylko `sr-only`; przy 320 px widać „S…” | UX (pole bez widocznej etykiety, nieużywalne na wąskim ekranie) | Na mobile ikona otwierająca pełnowymiarowe pole albo osobny wiersz; widoczna etykieta lub ikona-lupa jako prefiks | sprawdzone |
| Fokus nie przechodzi do pierwszego błędu | checkout (`checkout-form-view.tsx`), formularze panelu (brak `.focus()` w kodzie) | Po „Place order” z pustymi polami fokus zostaje na `body` | UX / dostępność (czytnik ekranu dostaje tylko `role="alert"`, klawiatura wraca na górę) | Zasada formularza: po błędzie fokus na pierwsze błędne pole | sprawdzone (checkout), przypuszczenie (panel) |
| Karta w karcie w karcie produktu | `product-card.tsx:14` + `product-image.tsx` + ramka w SVG | Obramowana karta, w niej obramowany kafel z tłem, w nim ilustracja z ramką i „DEMO” | generyczny wygląd (zbędne warstwy zamiast hierarchii) | Jedna powierzchnia: obraz do krawędzi karty albo karta bez ramki | sprawdzone |
| 9 rozmiarów tekstu, w tym 12,8 px spoza skali | `ui/button.tsx:25` (`text-[0.8rem]`), 9 klas `text-*` | 12 / 12,8 / 14 / 16 / 18 / 20 / 24 / 30 / 36 px | generyczny wygląd (skala nie została wybrana, tylko się nazbierała) | 5–6 nazwanych stylów typografii | sprawdzone |
| Kolory statusów spoza tokenów | 9 linii `amber-*` / `emerald-*` (lista w kroku 3) | Ostrzeżenia, sukces, pasek demo i badge DEMO wpisane paletą Tailwinda, osobno w każdym pliku | generyczny wygląd / utrzymanie (brak tokenów `warning`, `success`; martwy `.dark` dubluje warianty) | Tokeny znaczeniowe `--warning`, `--success`, `--demo` z parą light/dark i sprawdzonym kontrastem | sprawdzone |
| Brak `error.tsx` w sklepie | `packages/app/src/app/(storefront)/` (jest tylko w `admin/(protected)`) | Błąd danych kończy się domyślnym ekranem Next | UX (brak stanu błędu z instrukcją) | `error.tsx` sklepu z „Spróbuj ponownie” i linkiem do katalogu | sprawdzone (kod), błędu nie wywoływano |
| Komunikat logowania bez wskazówki | `server/auth/sign-in-errors.ts:9`; na żywo pokazany przy błędnym haśle | „Sign-in is unavailable. Try again.” | UX (nie mówi, co zrobić, gdy ponowienie nie pomaga); w tym środowisku prawdopodobnie ukrywa błąd konfiguracji `APP_URL` | Komunikat z następnym krokiem i rozróżnienie „złe dane” od „usługa niedostępna”; sprawdzić `APP_URL` vs port | sprawdzone (tekst), przypuszczenie (przyczyna) |
| Karuzela ucina kartę bez wskazówki | `featured-products.tsx:63` | 5. karta ucięta przy 1440 px; brak strzałek i licznika | UX (ukryta treść, przewijanie w poziomie myszką) | Siatka zamiast karuzeli albo widoczne sterowanie i krawędź z cieniowaniem | sprawdzone |
| Długa linia na wyszukiwaniu zamówienia | `/orders/lookup` (akapit bez `max-w-prose`) | ok. 84 znaki w linii przy 1440 px | UX (czytelność) | Zasada: tekst ciągły `max-w-prose` (≤ 65–75 znaków) | sprawdzone |

### 2. Pozostałe znaleziska

- Znak `☰` zamiast ikony w przycisku menu (`header-menu.tsx:47`); reszta interfejsu używa lucide.
- Pigułki (`rounded-4xl`, `rounded-full`) na badge’ach, filtrach i licznikach obok promieni 8–10 px na przyciskach i polach: dwa języki kształtu bez reguły, kiedy który.
- „No image” 4,35 : 1 na `bg-muted` (`product-image.tsx`), czyli `muted-foreground` na `muted` nie przechodzi 4,5 : 1.
- Napis „DEMO” w ilustracjach ma ok. 2,4 : 1 (`#a8a29e` na `#f5f5f4`); oznaczenie danych demo jest zasadą produktu, a tu jest najsłabiej widocznym tekstem.
- Hero „Gear up for your next match … every frame”: ogólnikowe, ale mówi o kategoriach i o danych demo.
- Statusy zamówień `paid` i `processing` mają ten sam wariant badge (`order-badges.tsx:7-8`); `refunded` i `pending_payment` też (`outline`).
- Martwy blok `.dark` w `globals.css:86-118` (aplikacja nie włącza ciemnego motywu), a mimo to 6 plików ma warianty `dark:`.
- Odstępy 6 px (`*-1.5`, 20×) i 10 px (`*-2.5`, 5×) spoza siatki 4 px, głównie w prymitywach shadcn i nawigacji panelu.
- W bazie dev jest produkt „QA Mousepad XL” bez obrazka i spoza seeda; zaburza wrażenie katalogu na demo (dane, nie kod).
- Panel (z kodu): nawigacja boczna nie oznacza bieżącej strony (`admin/(protected)/layout.tsx:22-54`: brak `aria-current` i stylu aktywnego), a dashboard ma `aria-current` na zakładkach okresu.
- Panel (z kodu): stany ładowania to tylko tekst „Loading…” (`text-sm text-muted-foreground`), sklep ma szkielety; dwa różne wzorce ładowania.
- Przycisk „Remove” w koszyku jest wariantem bez ramki i tła; jako tekstowy cel przechodzi, ale wygląda jak zwykły tekst obok obramowanego „Update”.
- Nie da się sprawdzić bez logowania: kontrast, fokus, cele i rozjazdy przy 768/320 px w panelu, tabela produktów i zamówień na telefonie, karta rekomendacji Copilota i fallback LLM na ekranie, podgląd importu CSV.

### 3. Liczby z kroku 3

| Miara | Wartość |
|---|---|
| Kolory tekstu widoczne przy 1440 px (sklep + logowanie) | **7** (12 klas koloru tekstu w kodzie) |
| Rozmiary fontu widoczne przy 1440 px | **9** (12, 12,8, 14, 16, 18, 20, 24, 30, 36 px) |
| Promienie zaokrąglenia w kodzie | **6** (4, 8, 10, 14, 26 px, pełne); na ekranie 5 |
| Wartości odstępów w kodzie | **12**, z czego **3 spoza siatki 4 px** (2, 6, 10 px; 27 z 297 użyć) |
| Wartości na sztywno poza plikiem tokenów (grep z lekcji) | **11 linii w 11 plikach** (9 palety Tailwinda, 2 arbitralne) + 8 kolorów hex w 15 SVG |

### 4. Pięć decyzji, żeby interfejs przestał wyglądać jak średnia

1. **Jeden kolor akcji marki, wybrany z powodu, a nie z szablonu** (**token**). Dziś akcja to domyślna czerń shadcn, a jedyne kolory dają fiolet i indygo z ilustracji. Trzeba zdecydować, czym jest sklep dla graczy (np. jeden wyrazisty akcent plus neutralne tło), zapisać to w `--primary` / `--ring` z parą light/dark i kontrastem ≥ 4,5 : 1 dla tekstu i ≥ 3 : 1 dla fokusu, a ilustracje demo przemalować z tej samej palety.
2. **Skala typografii: 5–6 nazwanych stylów i świadomy krój** (**token**). Zamiast 9 rozmiarów (z 12,8 px spoza skali) i Geista z szablonu: np. `display`, `title`, `heading`, `body`, `small`, `caption`. Decyzja o kroju (czy ceny i numery zamówień dostają krój mono z `tabular-nums`, jak `font-mono` już przy numerze zamówienia) z uzasadnieniem w produkcie.
3. **Jedna skala odstępów i dwa promienie** (**token** + **zasada**). Siatka 4 px bez 2/6/10 px; promienie: jeden dla pól, przycisków i kart, drugi (pełny) tylko dla elementów-liczników i filtrów, z zapisaną regułą, kiedy pigułka. Przy okazji: jedna powierzchnia na kartę produktu (bez karty w karcie).
4. **Tokeny znaczeniowe stanów zamiast palety Tailwinda** (**token**). `--success`, `--warning`, `--demo`, `--input` (granica pola ≥ 3 : 1), `--ring` (fokus ≥ 3 : 1) z wartościami light/dark i zmierzonym kontrastem. Zastępują 11 linii z kroku 3 i pozwalają włączyć job `tokens` w CI. Trzeba też zdecydować, czy ciemny motyw istnieje (dziś martwy `.dark`).
5. **Komponent pola formularza i reguła formularzy** (**komponent** + **zasada**). Jeden `Field`: zawsze widoczna etykieta (także wyszukiwarka w nagłówku), opis, błąd z `aria-describedby`, czytelny fokus; po błędzie fokus na pierwsze błędne pole; komunikat mówi, co zrobić; stała kolejność stopki. Do tego zasada dla stron: treść katalogu dostępna bez JS (statyczna powłoka) i każda grupa tras ma stan ładowania, pusty i błędu w tym samym wzorcu (szkielet, a nie raz szkielet, a raz „Loading…”).
