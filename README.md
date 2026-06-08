# L'Antica Stazione - Procedury

Aplikacja Nuxt do zarządzania procedurami, stanowiskami i wykonaniami w restauracji.
Panel desktopowy służy do administracji i raportowania, a widok `/m` do pracy na telefonie.

## Stack

- Nuxt 3 z układem katalogów Nuxt 4
- Vue 3 i Nuxt UI
- Supabase Auth, PostgreSQL i RLS
- Playwright E2E
- Netlify

## Uruchomienie

```bash
npm install
npm run dev
```

Wymagane zmienne środowiskowe:

```dotenv
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_KEY=
```

`SUPABASE_SERVICE_KEY` jest potrzebny tylko serwerowemu endpointowi tworzenia użytkowników.
Nie może być udostępniany po stronie klienta.

## Weryfikacja

```bash
npm run typecheck
npm run build
npm run test:e2e
```

Testy zalogowanych tras uruchamiają się po ustawieniu:

```dotenv
E2E_EMAIL=
E2E_PASSWORD=
```

Bez tych danych Playwright nadal sprawdza logowanie, routing mobilny, responsywność,
ochronę endpointu administracyjnego i anonimowy dostęp RLS.

## Baza

Pliki SQL należy wykonywać w tej kolejności:

1. `supabase/schema.sql`
2. `supabase/auth_schema.sql`
3. opcjonalnie `supabase/seed_wykonania.sql`

`auth_schema.sql` usuwa historyczne publiczne polityki i zakłada reguły dostępu oparte o role.

## Trasy

- `/` - dashboard
- `/procedury` - procedury
- `/stanowiska` - stanowiska
- `/raporty` - raport dzienny
- `/raporty/tabela` - raport zbiorczy
- `/uzytkownicy` - użytkownicy
- `/role` - role
- `/m` - aplikacja mobilna
