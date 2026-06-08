-- ============================================================
-- L'ANTICA STAZIONE — Autoryzacja, role i użytkownicy (model RBAC)
-- Zgodny z modelem Antica/ENGINE: role z uprawnieniami "module:akcja".
-- Wklej w: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================
-- Co tworzy ten plik:
--   1. roles      — role systemowe z listą uprawnień (jak w Antica)
--   2. profiles   — profil użytkownika (imię, nazwisko, email, telefon, rola…)
--   3. trigger    — automatyczne założenie profilu przy nowym koncie
--   4. funkcje    — sprawdzanie uprawnień zalogowanego użytkownika
--   5. RLS        — dostęp do danych oparty na uprawnieniach
--   6. dane       — 3 startowe role: ADMIN, MANAGER, PRACOWNIK
-- ============================================================

-- 1. ROLE ────────────────────────────────────────────────────
-- permissions: lista uprawnień w stylu Antica, np. {'module:procedury','procedury:create'}
create table if not exists roles (
  id           uuid primary key default gen_random_uuid(),
  nazwa        text not null unique,        -- ADMIN / MANAGER / PRACOWNIK
  opis         text,
  permissions  text[] not null default '{}',
  systemowa    boolean not null default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- 2. PROFILE UŻYTKOWNIKÓW ─────────────────────────────────────
-- Łączy się 1:1 z auth.users (logowanie obsługuje Supabase Auth).
-- Pola zgodne z tabelą "Użytkownicy" w Antica.
create table if not exists profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  imie               text,
  nazwisko           text,
  email              text,
  telefon            text,
  email_zweryfikowany boolean not null default false,
  aktywny            boolean not null default true,
  role_id            uuid references roles(id) on delete set null,
  stanowisko_id      uuid references stanowiska(id) on delete set null,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- 3. AUTO-TWORZENIE PROFILU przy nowym koncie ────────────────
-- Dane (imię, nazwisko, telefon, rola) admin podaje przy tworzeniu konta;
-- trafiają w metadanych użytkownika i ten trigger przepisuje je do profiles.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role_id uuid;
begin
  -- domyślna rola = PRACOWNIK, chyba że podano inną w metadanych
  select id into v_role_id from public.roles
    where nazwa = coalesce(new.raw_user_meta_data->>'rola', 'PRACOWNIK');

  insert into public.profiles (id, email, imie, nazwisko, telefon, email_zweryfikowany, role_id, stanowisko_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'imie', ''),
    coalesce(new.raw_user_meta_data->>'nazwisko', ''),
    new.raw_user_meta_data->>'telefon',
    (new.email_confirmed_at is not null),
    v_role_id,
    (new.raw_user_meta_data->>'stanowisko_id')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 4. FUNKCJE POMOCNICZE ──────────────────────────────────────
-- security definer = omijają RLS, więc nie ma zapętlenia reguł.

-- Lista uprawnień zalogowanego użytkownika
create or replace function my_permissions()
returns text[]
language sql security definer set search_path = public stable
as $$
  select coalesce(r.permissions, '{}')
  from public.profiles p
  left join public.roles r on r.id = p.role_id
  where p.id = auth.uid()
    and p.aktywny = true;
$$;

-- Czy zalogowany ma dane uprawnienie?
create or replace function has_perm(p text)
returns boolean
language sql security definer set search_path = public stable
as $$
  select coalesce(p = any(my_permissions()), false);
$$;

-- Nazwa roli zalogowanego (wygodne w UI)
create or replace function my_role()
returns text
language sql security definer set search_path = public stable
as $$
  select r.nazwa from public.profiles p
  left join public.roles r on r.id = p.role_id
  where p.id = auth.uid()
    and p.aktywny = true;
$$;

-- 5. RLS — dostęp oparty na uprawnieniach ────────────────────
alter table roles    enable row level security;
alter table profiles enable row level security;

-- ROLE: czytać może każdy zalogowany z roles:read; zarządzanie rozdzielone wg akcji
drop policy if exists "role: czytaj" on roles;
create policy "role: czytaj" on roles for select to authenticated
  using (has_perm('roles:read'));
drop policy if exists "role: zarzadzaj" on roles;
drop policy if exists "role: tworz" on roles;
drop policy if exists "role: aktualizuj" on roles;
drop policy if exists "role: usun" on roles;
create policy "role: tworz" on roles for insert to authenticated
  with check (has_perm('roles:create'));
create policy "role: aktualizuj" on roles for update to authenticated
  using (has_perm('roles:update')) with check (has_perm('roles:update'));
create policy "role: usun" on roles for delete to authenticated
  using (has_perm('roles:delete'));

-- PROFILE: każdy widzi swój; z users:read widzi wszystkie; zarządza z users:update
drop policy if exists "profil: czytaj" on profiles;
create policy "profil: czytaj" on profiles for select to authenticated
  using (id = (select auth.uid()) or has_perm('users:read'));
drop policy if exists "profil: zarzadzaj" on profiles;
drop policy if exists "profil: edytuj swoj" on profiles;
drop policy if exists "profil: aktualizuj" on profiles;
create policy "profil: aktualizuj" on profiles for update to authenticated
  using (has_perm('users:update'))
  with check (has_perm('users:update'));

-- 6. ZAOSTRZENIE REGUŁ NA TABELACH BIZNESOWYCH ───────────────
drop policy if exists "public read stanowiska"  on stanowiska;
drop policy if exists "public write stanowiska" on stanowiska;
drop policy if exists "public read procedury"   on procedury;
drop policy if exists "public write procedury"  on procedury;
drop policy if exists "public read wykonania"   on wykonania;
drop policy if exists "public write wykonania"  on wykonania;
drop policy if exists "pub_r_s" on stanowiska;
drop policy if exists "pub_w_s" on stanowiska;
drop policy if exists "pub_r_p" on procedury;
drop policy if exists "pub_w_p" on procedury;
drop policy if exists "pub_r_w" on wykonania;
drop policy if exists "pub_w_w" on wykonania;
drop policy if exists "stanowiska: pisz" on stanowiska;
drop policy if exists "procedury: pisz" on procedury;
drop policy if exists "wykonania: pisz" on wykonania;
drop policy if exists "stanowiska: tworz" on stanowiska;
drop policy if exists "stanowiska: aktualizuj" on stanowiska;
drop policy if exists "stanowiska: usun" on stanowiska;
drop policy if exists "procedury: tworz" on procedury;
drop policy if exists "procedury: aktualizuj" on procedury;
drop policy if exists "procedury: usun" on procedury;
drop policy if exists "wykonania: tworz" on wykonania;
drop policy if exists "wykonania: aktualizuj" on wykonania;
drop policy if exists "wykonania: usun" on wykonania;

create policy "stanowiska: czytaj" on stanowiska for select to authenticated using (has_perm('stanowiska:read'));
create policy "stanowiska: tworz" on stanowiska for insert to authenticated
  with check (has_perm('stanowiska:create'));
create policy "stanowiska: aktualizuj" on stanowiska for update to authenticated
  using (has_perm('stanowiska:update')) with check (has_perm('stanowiska:update'));
create policy "stanowiska: usun" on stanowiska for delete to authenticated
  using (has_perm('stanowiska:delete'));

create policy "procedury: czytaj" on procedury for select to authenticated using (has_perm('procedury:read'));
create policy "procedury: tworz" on procedury for insert to authenticated
  with check (has_perm('procedury:create'));
create policy "procedury: aktualizuj" on procedury for update to authenticated
  using (has_perm('procedury:update')) with check (has_perm('procedury:update'));
create policy "procedury: usun" on procedury for delete to authenticated
  using (has_perm('procedury:delete'));

create policy "wykonania: czytaj" on wykonania for select to authenticated using (
  has_perm('raporty:read')
  or (
    has_perm('wykonania:read')
    and exists (
      select 1 from profiles p
      where p.id = (select auth.uid())
        and p.aktywny = true
        and p.stanowisko_id = wykonania.stanowisko_id
    )
  )
);
create policy "wykonania: tworz" on wykonania for insert to authenticated with check (
  has_perm('raporty:read')
  or (
    has_perm('wykonania:create')
    and exists (
      select 1 from profiles p
      where p.id = (select auth.uid())
        and p.aktywny = true
        and p.stanowisko_id = wykonania.stanowisko_id
    )
  )
);
create policy "wykonania: aktualizuj" on wykonania for update to authenticated
  using (
    has_perm('raporty:read')
    or (
      has_perm('wykonania:update')
      and exists (
        select 1 from profiles p
        where p.id = (select auth.uid())
          and p.aktywny = true
          and p.stanowisko_id = wykonania.stanowisko_id
      )
    )
  )
  with check (
    has_perm('raporty:read')
    or (
      has_perm('wykonania:update')
      and exists (
        select 1 from profiles p
        where p.id = (select auth.uid())
          and p.aktywny = true
          and p.stanowisko_id = wykonania.stanowisko_id
      )
    )
  );
create policy "wykonania: usun" on wykonania for delete to authenticated
  using (has_perm('wykonania:delete') and has_perm('raporty:read'));

create index if not exists idx_procedury_stanowisko on procedury(stanowisko_id);
create index if not exists idx_wykonania_procedura on wykonania(procedura_id);
create index if not exists idx_wykonania_stanowisko on wykonania(stanowisko_id, data_dnia);
create index if not exists idx_profiles_role_id on profiles(role_id);
create index if not exists idx_profiles_stanowisko_id on profiles(stanowisko_id);

revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function has_perm(text) from public, anon;
revoke execute on function my_permissions() from public, anon;
revoke execute on function my_role() from public, anon;
grant execute on function has_perm(text) to authenticated;
grant execute on function my_permissions() to authenticated;
grant execute on function my_role() to authenticated;

-- 7. STARTOWE ROLE I UPRAWNIENIA ─────────────────────────────
-- Pełna lista uprawnień modułu procedur (wzór Antica: module:X + X:akcja)
insert into roles (nazwa, opis, systemowa, permissions) values
  ('ADMIN', 'Pełny dostęp do systemu', true, array[
    'module:procedury','procedury:read','procedury:create','procedury:update','procedury:delete',
    'module:stanowiska','stanowiska:read','stanowiska:create','stanowiska:update','stanowiska:delete',
    'module:raporty','raporty:read',
    'module:wykonania','wykonania:read','wykonania:create','wykonania:update','wykonania:delete',
    'module:users','users:read','users:create','users:update','users:delete',
    'module:roles','roles:read','roles:create','roles:update','roles:delete'
  ]),
  ('MANAGER', 'Kierownik — zarządza procedurami i stanowiskami, podgląd raportów', true, array[
    'module:procedury','procedury:read','procedury:create','procedury:update','procedury:delete',
    'module:stanowiska','stanowiska:read','stanowiska:create','stanowiska:update','stanowiska:delete',
    'module:raporty','raporty:read',
    'module:wykonania','wykonania:read','wykonania:create','wykonania:update','wykonania:delete',
    'module:users','users:read'
  ]),
  ('PRACOWNIK', 'Pracownik — wykonuje procedury (widok mobilny)', true, array[
    'module:procedury','procedury:read',
    'module:stanowiska','stanowiska:read',
    'module:wykonania','wykonania:read','wykonania:create','wykonania:update'
  ])
on conflict (nazwa) do update set permissions = excluded.permissions, opis = excluded.opis;

-- ============================================================
-- GOTOWE. Wróć do Claude — założymy pierwsze konto admina.
-- ============================================================
