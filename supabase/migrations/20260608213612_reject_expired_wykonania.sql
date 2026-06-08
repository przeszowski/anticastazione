create extension if not exists pg_cron with schema pg_catalog;

create index if not exists idx_wykonania_open_data
  on public.wykonania (data_dnia)
  where status in ('do_zrobienia', 'w_trakcie');

create or replace function public.reject_expired_wykonania()
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
    from public.wykonania
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

    update public.wykonania
    set status = 'odrzucone',
        czas_koniec = case when czas_start is not null then cutoff_at else null end,
        uwagi = execution.uwagi
    where id = execution.id;

    updated_count := updated_count + 1;
  end loop;

  return updated_count;
end;
$$;

revoke all on function public.reject_expired_wykonania() from public, anon, authenticated;

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
