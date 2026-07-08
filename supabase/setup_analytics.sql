-- ============================================================
-- 조회·공유 통계 전체 설정 (실서버 Supabase SQL Editor에서 1회 실행)
-- create_view_logs.sql, add_event_type.sql, add_period_stats.sql 통합본
-- ============================================================

create table if not exists public.view_logs (
  id             uuid        primary key default gen_random_uuid(),
  destination_id uuid        references public.destinations(id) on delete cascade,
  user_agent     text        not null default '',
  referrer       text        not null default '',
  event_type     text        not null default 'view',
  created_at     timestamptz not null default now()
);

alter table public.view_logs
  alter column destination_id drop not null;

alter table public.view_logs
  add column if not exists event_type text not null default 'view';

create index if not exists view_logs_destination_id_idx on public.view_logs (destination_id);
create index if not exists view_logs_created_at_idx     on public.view_logs (created_at desc);
create index if not exists view_logs_event_type_idx     on public.view_logs (event_type);

alter table public.view_logs enable row level security;

drop policy if exists "view_logs 기록 허용" on public.view_logs;
create policy "view_logs 기록 허용"
  on public.view_logs for insert
  to anon, authenticated
  with check (true);

drop policy if exists "view_logs 관리자 조회" on public.view_logs;
create policy "view_logs 관리자 조회"
  on public.view_logs for select
  to authenticated
  using (true);

create or replace function public.get_destination_stats(since_timestamptz timestamptz default null)
returns table(
  destination_id uuid,
  view_count     bigint,
  share_count    bigint
)
language sql
security definer
set search_path = public
as $$
  select
    destination_id,
    count(*) filter (where event_type = 'view')  as view_count,
    count(*) filter (where event_type = 'share') as share_count
  from public.view_logs
  where destination_id is not null
    and (since_timestamptz is null or created_at >= since_timestamptz)
  group by destination_id;
$$;

grant execute on function public.get_destination_stats(timestamptz) to authenticated;

create or replace function public.get_destination_stats()
returns table(
  destination_id uuid,
  view_count     bigint,
  share_count    bigint
)
language sql
security definer
set search_path = public
as $$
  select * from public.get_destination_stats(null::timestamptz);
$$;

grant execute on function public.get_destination_stats() to authenticated;
