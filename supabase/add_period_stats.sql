-- ============================================================
-- get_destination_stats 에 기간 필터(since) 파라미터 추가
-- Supabase SQL Editor 에서 실행하세요.
-- ============================================================

-- event_type 컬럼이 없는 경우 대비
alter table public.view_logs
  add column if not exists event_type text not null default 'view';

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

-- 기존 무인자 버전이 있을 경우 호환 유지
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
