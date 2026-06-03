-- ============================================================
-- Dane testowe — wykonania procedur na DZIŚ
-- Idempotentne: usuwa dzisiejsze wykonania i tworzy świeże z mieszanymi statusami.
-- Uruchom w Supabase → SQL Editor, gdy chcesz odświeżyć dane do testów.
-- ============================================================

delete from wykonania where data_dnia = current_date;

insert into wykonania (procedura_id, stanowisko_id, data_dnia, status, czas_start, czas_koniec, wykonane_przez)
select
  p.id,
  p.stanowisko_id,
  current_date,
  case (row_number() over (order by p.stanowisko_id, p.kolejnosc)) % 3
    when 0 then 'wykonane'
    when 1 then 'w_trakcie'
    else 'do_zrobienia'
  end,
  case when (row_number() over (order by p.stanowisko_id, p.kolejnosc)) % 3 in (0, 1)
       then now() - interval '45 minutes' else null end,
  case when (row_number() over (order by p.stanowisko_id, p.kolejnosc)) % 3 = 0
       then now() - interval '15 minutes' else null end,
  case when (row_number() over (order by p.stanowisko_id, p.kolejnosc)) % 3 = 0
       then 'Anna Kowalska' else null end
from procedury p
where p.aktywna = true;
