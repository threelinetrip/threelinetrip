-- ============================================================
-- view_logs 에 event_type 컬럼 추가 ('view' | 'share')
-- ============================================================
alter table public.view_logs
  add column if not exists event_type text not null default 'view';

-- ============================================================
-- 게시글별 조회·공유 집계 함수 (관리자 대시보드용)
-- ============================================================
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
  select
    destination_id,
    count(*) filter (where event_type = 'view')  as view_count,
    count(*) filter (where event_type = 'share') as share_count
  from public.view_logs
  where destination_id is not null
  group by destination_id;
$$;

-- authenticated 사용자(관리자)만 함수 실행 허용
grant execute on function public.get_destination_stats() to authenticated;
