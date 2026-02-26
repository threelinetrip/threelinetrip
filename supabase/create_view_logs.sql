-- =============================================
-- view_logs 테이블 생성
-- 여행지 상세 페이지 조회 기록을 저장합니다.
-- Supabase > SQL Editor 에 붙여넣고 실행하세요.
-- =============================================

create table if not exists public.view_logs (
  id            uuid        primary key default gen_random_uuid(),
  destination_id uuid        not null references public.destinations(id) on delete cascade,
  user_agent    text        not null default '',
  referrer      text        not null default '',
  created_at    timestamptz not null default now()
);

-- 조회 분석용 인덱스
create index if not exists view_logs_destination_id_idx on public.view_logs (destination_id);
create index if not exists view_logs_created_at_idx     on public.view_logs (created_at desc);

-- RLS 활성화
alter table public.view_logs enable row level security;

-- 누구나 로그 기록 가능 (anon 포함)
create policy "view_logs 기록 허용"
  on public.view_logs for insert
  to anon, authenticated
  with check (true);

-- 인증된 관리자만 조회 가능
create policy "view_logs 관리자 조회"
  on public.view_logs for select
  to authenticated
  using (true);
