-- =============================================
-- destinations 테이블 생성 SQL
-- Supabase > SQL Editor 에 붙여넣고 실행하세요
-- =============================================

create table if not exists public.destinations (
  id          uuid primary key default gen_random_uuid(),
  title       text        not null,
  sido        text        not null,
  sigungu     text        not null,
  address     text        not null default '',
  summary     text        not null default '',
  rating      numeric(3,1) not null default 0,
  image_url   text        not null default '',
  view_count  bigint      not null default 0,
  share_count bigint      not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- updated_at 자동 갱신 트리거
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger destinations_updated_at
  before update on public.destinations
  for each row execute procedure public.set_updated_at();

-- RLS(Row Level Security) 활성화
alter table public.destinations enable row level security;

-- 전체 공개 읽기 허용
create policy "누구나 읽기 가능"
  on public.destinations for select
  using (true);

-- 인증된 사용자만 쓰기 가능 (현재는 anon 도 허용 - 추후 인증 추가 시 변경)
create policy "anon 쓰기 허용 (임시)"
  on public.destinations for all
  using (true)
  with check (true);
