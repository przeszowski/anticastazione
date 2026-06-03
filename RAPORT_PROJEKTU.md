# L'Antica Stazione — Moduł Procedur · Raport projektu

> Dokument zbiorczy: co budujemy, dlaczego, jak to działa, jak uruchomić i co dalej.
> Stan na: 2 czerwca 2026.

---

## 1. Czym jest projekt

Aplikacja webowa do **zarządzania procedurami pracy** w restauracji/hotelu L'Antica Stazione.
Pozwala definiować stanowiska (Kuchnia, Bar, Sala…), przypisywać do nich procedury z normą
czasu i porą dnia, a następnie śledzić ich wykonanie (kto, kiedy, ile czasu, odchylenie od normy).
Kierownik widzi raporty dzienne i zbiorcze; pracownik na telefonie odhacza zadania na dziś.

Powstaje na bazie **makiet HTML** (folder `makiety/`, 16 ekranów SCR-01…16) przygotowanych
skillem `kd-screen-builder`. Aplikacja przepisuje te makiety na żywy kod Nuxt + Supabase.

---

## 2. Architektura i stack

| Warstwa | Technologia |
|--------|-------------|
| Frontend | **Nuxt 3/4** (compatibility v4), **Vue 3**, **NuxtUI v3.3.7**, Tailwind |
| Backend / baza | **Supabase** (PostgreSQL + Auth + RLS), projekt ref `unqqhgcnvzntasazitdr` |
| Auth | Supabase Auth (email + hasło), sesje w cookies (SSR) |
| Repo | GitHub `przeszowski/anticastazione`, branch `main` |
| Hosting docelowy | Netlify (jak Antica) |

Kod aplikacji jest w `app/` (struktura Nuxt 4): `pages/`, `components/`, `composables/`,
`layouts/`, `plugins/`, `types/`. Logika serwerowa w `server/api/`. Schematy bazy w `supabase/`.

---

## 3. Kompatybilność z Antica / ENGINE (kluczowa decyzja)

**ENGINE** (`engine.k-development.pl`) to wewnętrzna platforma/backend K-Development, która hostuje
wiele projektów (ANTICA, CARFACTOR, EMPERITY, ENDORWINA…). **Antica** (`antica.netlify.app`) to
frontend Nuxt działający na ENGINE — ma własne `/api/*`, pełny system **RBAC** (role ADMIN/MANAGER/
CLIENT z granularnymi uprawnieniami `module:X` / `X:create|read|update|delete`), i18n (pl) i PWA.

**Decyzja:** nasz moduł procedur **zostaje na Supabase** (szybkie, działające logowanie), ale jego
**model danych odwzorowuje Antica** — role z listą uprawnień + użytkownicy z tymi samymi polami.
Dzięki temu późniejsze **scalenie procedur z Antica** będzie wykonalne bez przebudowy modelu.
Nie mamy na razie dostępu do API ENGINE, więc nie budujemy na nim bezpośrednio.

---

## 4. Model danych i autoryzacja (RBAC)

Schemat tworzą dwa pliki SQL w `supabase/`:

- **`schema.sql`** — tabele biznesowe: `stanowiska`, `procedury`, `wykonania` (+ dane przykładowe).
- **`auth_schema.sql`** — autoryzacja i role (uruchomione 1.06.2026):
  - **`roles`** — `nazwa`, `opis`, `permissions text[]`, `systemowa`. Startowe: **ADMIN, MANAGER, PRACOWNIK**.
  - **`profiles`** — profil 1:1 z `auth.users`: `imie`, `nazwisko`, `email`, `telefon`,
    `email_zweryfikowany`, `aktywny`, `role_id`, `stanowisko_id`.
  - **trigger `handle_new_user`** — przy zakładaniu konta tworzy profil z metadanych (imię, rola…).
  - **funkcje** `has_perm()`, `my_permissions()`, `my_role()` (SECURITY DEFINER — bez zapętlenia RLS).
  - **RLS** — dostęp do danych oparty na uprawnieniach (np. `procedury:update`, `users:read`).

**Uprawnienia (wzór Antica):** `module:procedury`, `procedury:read|create|update|delete`, analogicznie
`stanowiska`, `wykonania`, `raporty`, `users`, `roles`.

**Role startowe:**
- **ADMIN** — pełny dostęp, w tym zarządzanie użytkownikami i rolami.
- **MANAGER** (kierownik) — procedury, stanowiska, raporty, podgląd użytkowników.
- **PRACOWNIK** — odczyt procedur/stanowisk + wykonywanie zadań (widok mobilny).

Konta zakłada **wyłącznie admin** (brak otwartej rejestracji).

---

## 5. Mapa plików (co gdzie)

```
app/
  app.vue                      # root + <UApp> (toasty/nakładki)
  layouts/default.vue          # layout z sidebarem
  components/AppSidebar.vue     # menu filtrowane wg uprawnień + wyloguj
  plugins/profile.client.ts     # ładuje profil+uprawnienia po zalogowaniu (onAuthStateChange)
  composables/
    useSupabase.ts             # stanowiska, procedury, wykonania (CRUD)
    useAuth.ts                 # login, logout, profil, uprawnienia, can()
    useAdmin.ts                # useUsers, useRoles (panel admina)
  pages/
    login.vue                  # logowanie (styl Antica)
    confirm.vue                # callback po zalogowaniu
    index.vue                  # redirect → /raporty
    procedury/                 # lista, nowa, edytuj/[id]
    stanowiska/                # lista, nowe, [id]
    raporty/                   # przegląd dzienny + tabela
    uzytkownicy/               # lista (rola, aktywność) + nowy
    role/                      # podgląd ról i uprawnień
    mobile.vue                 # widok pracownika (zadania na dziś)
  types/database.types.ts      # typy tabel (roles, profiles, stanowiska, procedury, wykonania)
server/api/users/create.post.ts  # tworzenie kont przez admina (klucz serwisowy)
supabase/schema.sql, auth_schema.sql
makiety/                       # źródłowe makiety HTML (SCR-01…16) + index.html
```

---

## 6. Ekrany — status

| Ekran | Trasa | Status |
|-------|-------|--------|
| Logowanie | `/login` | ✅ działa, styl Antica |
| Raporty — przegląd dzienny | `/raporty` | ✅ działa, dane z bazy |
| Raporty — tabela zbiorcza | `/raporty/tabela` | ✅ (po fixach NuxtUI v3) |
| Procedury — lista/nowa/edycja | `/procedury` | ✅ (po fixach NuxtUI v3, pora_dnia ASCII) |
| Stanowiska — lista/nowe/szczegóły | `/stanowiska` | ✅ (po fixach NuxtUI v3) |
| Użytkownicy — lista | `/uzytkownicy` | ✅ rola + aktywność |
| Użytkownicy — nowy | `/uzytkownicy/nowy` | ⚙️ wymaga `SUPABASE_SERVICE_KEY` |
| Role — podgląd | `/role` | ✅ |
| Widok mobilny (pracownik) | `/mobile` | ✅ zadania na dziś, Start/Zakończ |

---

## 7. Skille K-Development użyte

- **`kd-screen-builder`** — wygenerował makiety HTML (`makiety/`, `_project.json`) w stylu NuxtUI.
  To one są źródłem prawdy dla wyglądu ekranów.
- **`kd-spec-writer`** — tworzy formalną specyfikację (.docx). W folderze źródłowym jest już
  `ZP_06_05_26_ANTICA.docx`.

Sam moduł Nuxt jest pisany ręcznie na podstawie makiet (nie ma osobnego skilla „nuxt-builder").

---

## 8. Jak uruchomić (krok po kroku)

1. **Zależności** (raz): w `C:\Users\przes\Desktop\ANTICA_NUXT` uruchom `npm install`.
2. **`.env`** — musi zawierać `SUPABASE_URL` i `SUPABASE_KEY` (są). Aby tworzyć konta z panelu,
   dodaj `SUPABASE_SERVICE_KEY` (z Supabase → Project Settings → API → service_role).
3. **Baza** — `supabase/schema.sql` i `supabase/auth_schema.sql` są już wgrane do projektu Supabase.
4. **Start** w terminalu (PowerShell, z głównego folderu):
   ```
   npm run dev
   ```
   Otwórz `http://localhost:3000`.

> **Uwaga:** po zmianie `nuxt.config.ts` lub dodaniu pluginu zrób pełny restart (`Ctrl+C`, `npm run dev`).
> Jeśli coś się „zacina", czysty restart: `Remove-Item -Recurse -Force .nuxt` i ponownie `npm run dev`.

---

## 9. Pierwsze konto admina

1. Supabase → Authentication → Users → **Create new user** (email + hasło, „Auto confirm”).
2. Trigger założy profil (domyślnie rola PRACOWNIK).
3. Nadaj rolę ADMIN (SQL Editor):
   ```sql
   update profiles set role_id = (select id from roles where nazwa='ADMIN')
   where email = 'twoj@email.pl';
   ```
4. Zaloguj się — w sidebarze pojawią się wszystkie moduły.

Konto `p.rzeszowski@k-development.pl` zostało już utworzone i podniesione do **ADMIN**.

---

## 10. Napotkane problemy i rozwiązania

- **„Failed to fetch / NetworkError" przy logowaniu** → klient miał pusty URL Supabase.
  Rozwiązanie: wpisany na sztywno `url`/`key` w `nuxt.config.ts` (klucz publishable jest jawny).
- **`@supabase/ssr ... export 'parse'`** → błąd pre-bundlingu Vite paczki `cookie`.
  Rozwiązanie: `vite.optimizeDeps.include: ['cookie']` w `nuxt.config.ts`.
- **Pusty sidebar po zalogowaniu** → profil ładował się z `id = undefined` (timing).
  Rozwiązanie: plugin `profile.client.ts` (Supabase `onAuthStateChange` + `getSession`) z jawnym `id`.
- **NuxtUI v2 → v3** → `UToggle`→`USwitch`, `USelect :options/option-attribute`→`:items/value-key`,
  `row.X`→`row.original.X`. Poprawione we wszystkich formularzach i listach.
- **`pora_dnia`** → baza wymaga ASCII (`Rano/Dzien/Wieczor`); ogonki tylko jako etykiety w UI.
- **Git `.lock`** → operacje gita z sandboxa Cowork blokują pliki blokad. Commit/push robić
  z terminala VS Code (`Remove-Item .git\*.lock` gdy trzeba).
- **`WARN [Icon] Collection lucide`** → kosmetyczne; dla ikon offline: `npm i -D @iconify-json/lucide`.

---

## 11. Co dalej (TODO)

- [ ] Dodać `SUPABASE_SERVICE_KEY` do `.env` i przetestować tworzenie kont (`/uzytkownicy/nowy`).
- [ ] Reset hasła (Supabase recovery) — obecnie „Zapomniałeś hasła?" tylko informuje.
- [ ] Mobile: gest swipe i ekran odrzucenia (SCR-12/13) — pełniejsze odwzorowanie makiet.
- [ ] Generowanie wykonań na dany dzień (scheduler) — by lista zadań tworzyła się automatycznie.
- [ ] i18n (pl) i PWA — dla pełnej zgodności z Antica.
- [ ] Docelowo: wpięcie modułu do Antica/ENGINE.

---

## 12. Makiety źródłowe

Folder **`makiety/`** zawiera komplet ekranów HTML, na których bazujemy:
panel webowy (SCR-01…09), widok mobilny (SCR-10-16-mobile.html), `index.html` (nawigacja prototypu)
oraz `_project.json` (branding `#c59d5f`, lista ekranów). To referencja wyglądu — kod Nuxt ma do nich
wracać przy każdej rozbudowie.
