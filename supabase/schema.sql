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
  pora_dnia       text not null check (pora_dnia in ('Rano','Dzien','Wieczor')),
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
  czas_min        int,
  odchylenie_min  int,
  uwagi           text,
  wykonane_przez  text,
  created_at      timestamptz default now()
);

-- Wylicz czas i odchylenie od normy przy zapisie wykonania.
-- Generated columns w PostgreSQL nie mogą używać subquery do tabeli procedury.
create or replace function set_wykonania_czasy()
returns trigger
language plpgsql
as $$
declare
  v_norma int;
begin
  if new.czas_start is not null and new.czas_koniec is not null then
    new.czas_min := extract(epoch from (new.czas_koniec - new.czas_start))::int / 60;
    select norma_min into v_norma from procedury where id = new.procedura_id;
    new.odchylenie_min := new.czas_min - coalesce(v_norma, 0);
  else
    new.czas_min := null;
    new.odchylenie_min := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_wykonania_czasy on wykonania;
create trigger trg_set_wykonania_czasy
  before insert or update of procedura_id, czas_start, czas_koniec on wykonania
  for each row execute function set_wykonania_czasy();

-- ── Indeksy ──────────────────────────────────────────────────────────
create index if not exists idx_wykonania_data on wykonania(data_dnia);
create index if not exists idx_wykonania_stanowisko on wykonania(stanowisko_id, data_dnia);
create index if not exists idx_procedury_stanowisko on procedury(stanowisko_id);
create index if not exists idx_wykonania_open_data
  on wykonania(data_dnia)
  where status in ('do_zrobienia', 'w_trakcie');

-- Niewykonane procedury zamykamy o 04:00 następnego dnia czasu warszawskiego.
create extension if not exists pg_cron with schema pg_catalog;

create or replace function reject_expired_wykonania()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  execution record;
  cutoff_at timestamptz;
  timer_meta jsonb;
  accumulated_ms bigint;
  running_since timestamptz;
  updated_count integer := 0;
  reason constant text := 'Upłynął czas na wykonanie';
  timer_prefix constant text := '__antica_timer_v1__:';
begin
  for execution in
    select id, data_dnia, czas_start, uwagi
    from wykonania
    where status in ('do_zrobienia', 'w_trakcie')
      and clock_timestamp() >= (
        data_dnia::timestamp + interval '1 day 4 hours'
      ) at time zone 'Europe/Warsaw'
    for update skip locked
  loop
    cutoff_at := (
      execution.data_dnia::timestamp + interval '1 day 4 hours'
    ) at time zone 'Europe/Warsaw';

    if left(coalesce(execution.uwagi, ''), length(timer_prefix)) = timer_prefix then
      begin
        timer_meta := substring(execution.uwagi from length(timer_prefix) + 1)::jsonb;
        accumulated_ms := greatest(
          0,
          coalesce((timer_meta->>'accumulatedMs')::numeric, 0)
        )::bigint;

        if not coalesce((timer_meta->>'paused')::boolean, false)
          and nullif(timer_meta->>'runningSince', '') is not null then
          running_since := (timer_meta->>'runningSince')::timestamptz;
          accumulated_ms := accumulated_ms + greatest(
            0,
            (extract(epoch from (cutoff_at - running_since)) * 1000)::bigint
          );
        end if;

        timer_meta := jsonb_set(timer_meta, '{accumulatedMs}', to_jsonb(accumulated_ms), true);
        timer_meta := jsonb_set(timer_meta, '{runningSince}', 'null'::jsonb, true);
        timer_meta := jsonb_set(timer_meta, '{paused}', 'false'::jsonb, true);
        timer_meta := jsonb_set(timer_meta, '{note}', to_jsonb(reason), true);
        execution.uwagi := timer_prefix || timer_meta::text;
      exception
        when others then
          execution.uwagi := reason;
      end;
    else
      execution.uwagi := reason;
    end if;

    update wykonania
    set status = 'odrzucone',
        czas_koniec = case when czas_start is not null then cutoff_at else null end,
        uwagi = execution.uwagi
    where id = execution.id;

    updated_count := updated_count + 1;
  end loop;

  return updated_count;
end;
$$;

revoke all on function reject_expired_wykonania() from public, anon, authenticated;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'reject-expired-wykonania';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'reject-expired-wykonania',
    '0 * * * *',
    'select public.reject_expired_wykonania();'
  );
end;
$$;

-- ── RLS (Row Level Security) ──────────────────────────────────────────
alter table stanowiska enable row level security;
alter table procedury   enable row level security;
alter table wykonania   enable row level security;

drop policy if exists "public read stanowiska" on stanowiska;
drop policy if exists "public write stanowiska" on stanowiska;
drop policy if exists "public read procedury" on procedury;
drop policy if exists "public write procedury" on procedury;
drop policy if exists "public read wykonania" on wykonania;
drop policy if exists "public write wykonania" on wykonania;
drop policy if exists "pub_r_s" on stanowiska;
drop policy if exists "pub_w_s" on stanowiska;
drop policy if exists "pub_r_p" on procedury;
drop policy if exists "pub_w_p" on procedury;
drop policy if exists "pub_r_w" on wykonania;
drop policy if exists "pub_w_w" on wykonania;

-- Polityki dostępu oparte o role tworzy auth_schema.sql.
-- Po wykonaniu tylko tego pliku tabele pozostają niedostępne przez API.

-- ── Dane przykładowe ─────────────────────────────────────────────────
update stanowiska set nazwa = 'Zarządzanie' where nazwa = 'Zarzadzanie';
update stanowiska set dzial = 'Zarządzanie' where dzial = 'Zarzadzanie';

insert into stanowiska (nazwa, dzial, opis, godziny_od, godziny_do)
select s.nazwa, s.dzial, s.opis, s.godziny_od::time, s.godziny_do::time
from (values
  ('Kuchnia',        'Kuchnia',     'Strefa kuchenna i przygotowania posiłków', '06:00', '23:00'),
  ('Bar',            'Bar',         'Obsługa baru i przygotowanie napojów',     '14:00', '02:00'),
  ('Sala',           'Sala',        'Obsługa sali restauracyjnej',              '11:00', '23:30'),
  ('Obsługa gości',  'Obsługa',     'Recepcja i obsługa gości hotelowych',      '10:00', '22:00'),
  ('Zarządzanie',    'Zarządzanie', 'Procedury zarządcze i administracyjne',    '08:00', '20:00')
) as s(nazwa, dzial, opis, godziny_od, godziny_do)
where not exists (
  select 1 from stanowiska existing where existing.nazwa = s.nazwa
);

insert into procedury (nazwa, opis, stanowisko_id, pora_dnia, norma_min, kolejnosc)
select
  p.nazwa, p.opis,
  s.id,
  p.pora_dnia, p.norma_min, p.kolejnosc
from (values
  ('Otwieranie kuchni — przygotowanie stanowiska', 'Przygotowanie wszystkich urządzeń i narzędzi', 'Kuchnia', 'Rano', 25, 1),
  ('Kontrola temperatur urządzeń chłodniczych',    'Sprawdzenie i zapis temperatur lodówek/zamrażarek', 'Kuchnia', 'Rano', 15, 2),
  ('Przygotowanie mise en place na lunch',         'Przygotowanie składników i narzędzi na lunch', 'Kuchnia', 'Rano', 40, 3),
  ('Dezynfekcja powierzchni roboczych',            'Mycie i dezynfekcja blatów, desek, nożyc', 'Kuchnia', 'Dzien', 20, 4),
  ('Uzupełnienie stanów magazynowych',             'Sprawdzenie i uzupełnienie zapasów baru', 'Bar', 'Dzien', 30, 1),
  ('Przygotowanie mise en place na kolację',       'Przygotowanie składników na kolację', 'Kuchnia', 'Dzien', 35, 5),
  ('Porządkowanie i mycie urządzeń kuchennych',    'Czyszczenie urządzeń po zakończeniu zmiany', 'Kuchnia', 'Wieczor', 45, 6),
  ('Zamknięcie kuchni — checklist końcowy',        'Weryfikacja checklisty zamknięcia kuchni', 'Kuchnia', 'Wieczor', 20, 7),
  ('Przygotowanie sali na otwarcie',               'Nakrycie stołów i przygotowanie sali', 'Sala', 'Rano', 30, 1),
  ('Zamknięcie baru',                              'Checklist zamknięcia baru', 'Bar', 'Wieczor', 25, 2)
) as p(nazwa, opis, stanowisko, pora_dnia, norma_min, kolejnosc)
join stanowiska s on s.nazwa = p.stanowisko
where not exists (
  select 1
  from procedury existing
  where existing.nazwa = p.nazwa
    and existing.stanowisko_id is not distinct from s.id
);
