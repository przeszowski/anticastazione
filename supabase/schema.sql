-- ============================================================
-- L'ANTICA STAZIONE — Procedury module schema
-- Wklej w: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. STANOWISKA (Stations)
create table if not exists stanowiska (
  id          uuid primary key default gen_random_uuid(),
  nazwa       text not null,
  dzial       text not null,
  opis        text,
  godziny_od  time not null default '06:00',
  godziny_do  time not null default '23:00',
  aktywne     boolean not null default true,
  kolejnosc   int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 2. PROCEDURY (Procedures)
create table if not exists procedury (
  id              uuid primary key default gen_random_uuid(),
  nazwa           text not null,
  opis            text,
  stanowisko_id   uuid references stanowiska(id) on delete set null,
  pora_dnia       text not null check (pora_dnia in ('Rano','Dzień','Wieczór')),
  norma_min       int not null default 15,  -- norma czasu w minutach
  aktywna         boolean not null default true,
  kolejnosc       int default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 3. WYKONANIA (Executions / Answers)
create table if not exists wykonania (
  id              uuid primary key default gen_random_uuid(),
  procedura_id    uuid not null references procedury(id) on delete cascade,
  stanowisko_id   uuid references stanowiska(id) on delete set null,
  data_dnia       date not null default current_date,
  status          text not null default 'do_zrobienia'
                  check (status in ('do_zrobienia','w_trakcie','wykonane','odrzucone')),
  czas_start      timestamptz,
  czas_koniec     timestamptz,
  czas_min        int generated always as (
                    case when czas_start is not null and czas_koniec is not null
                    then extract(epoch from (czas_koniec - czas_start))::int / 60
                    else null end
                  ) stored,
  odchylenie_min  int generated always as (
                    case when czas_start is not null and czas_koniec is not null
                    then (extract(epoch from (czas_koniec - czas_start))::int / 60)
                         - (select norma_min from procedury p where p.id = procedura_id)
                    else null end
                  ) stored,
  uwagi           text,
  wykonane_przez  text,
  created_at      timestamptz default now()
);

-- ── Indeksy ──────────────────────────────────────────────────────────
create index if not exists idx_wykonania_data on wykonania(data_dnia);
create index if not exists idx_wykonania_stanowisko on wykonania(stanowisko_id, data_dnia);
create index if not exists idx_procedury_stanowisko on procedury(stanowisko_id);

-- ── RLS (Row Level Security) — na razie wyłączone dla dev ────────────
alter table stanowiska enable row level security;
alter table procedury   enable row level security;
alter table wykonania   enable row level security;

-- Tymczasowe polityki — pełny dostęp (zmień przed produkcją!)
create policy "public read stanowiska"  on stanowiska for select using (true);
create policy "public write stanowiska" on stanowiska for all    using (true);
create policy "public read procedury"   on procedury  for select using (true);
create policy "public write procedury"  on procedury  for all    using (true);
create policy "public read wykonania"   on wykonania  for select using (true);
create policy "public write wykonania"  on wykonania  for all    using (true);

-- ── Dane przykładowe ─────────────────────────────────────────────────
insert into stanowiska (nazwa, dzial, opis, godziny_od, godziny_do) values
  ('Kuchnia',        'Kuchnia',     'Strefa kuchenna i przygotowania posiłków', '06:00', '23:00'),
  ('Bar',            'Bar',         'Obsługa baru i przygotowanie napojów',     '14:00', '02:00'),
  ('Sala',           'Sala',        'Obsługa sali restauracyjnej',              '11:00', '23:30'),
  ('Obsługa gości',  'Obsługa',     'Recepcja i obsługa gości hotelowych',      '10:00', '22:00'),
  ('Zarządzanie',    'Zarządzanie', 'Procedury zarządcze i administracyjne',    '08:00', '20:00')
on conflict do nothing;

insert into procedury (nazwa, opis, stanowisko_id, pora_dnia, norma_min, kolejnosc)
select
  p.nazwa, p.opis,
  (select id from stanowiska where nazwa = p.stanowisko limit 1),
  p.pora_dnia, p.norma_min, p.kolejnosc
from (values
  ('Otwieranie kuchni — przygotowanie stanowiska', 'Przygotowanie wszystkich urządzeń i narzędzi', 'Kuchnia', 'Rano', 25, 1),
  ('Kontrola temperatur urządzeń chłodniczych',    'Sprawdzenie i zapis temperatur lodówek/zamrażarek', 'Kuchnia', 'Rano', 15, 2),
  ('Przygotowanie mise en place na lunch',         'Przygotowanie składników i narzędzi na lunch', 'Kuchnia', 'Rano', 40, 3),
  ('Dezynfekcja powierzchni roboczych',            'Mycie i dezynfekcja blatów, desek, nożyc', 'Kuchnia', 'Dzień', 20, 4),
  ('Uzupełnienie stanów magazynowych',             'Sprawdzenie i uzupełnienie zapasów baru', 'Bar', 'Dzień', 30, 1),
  ('Przygotowanie mise en place na kolację',       'Przygotowanie składników na kolację', 'Kuchnia', 'Dzień', 35, 5),
  ('Porządkowanie i mycie urządzeń kuchennych',    'Czyszczenie urządzeń po zakończeniu zmiany', 'Kuchnia', 'Wieczór', 45, 6),
  ('Zamknięcie kuchni — checklist końcowy',        'Weryfikacja checklisty zamknięcia kuchni', 'Kuchnia', 'Wieczór', 20, 7),
  ('Przygotowanie sali na otwarcie',               'Nakrycie stołów i przygotowanie sali', 'Sala', 'Rano', 30, 1),
  ('Zamknięcie baru',                              'Checklist zamknięcia baru', 'Bar', 'Wieczór', 25, 2)
) as p(nazwa, opis, stanowisko, pora_dnia, norma_min, kolejnosc)
on conflict do nothing;
