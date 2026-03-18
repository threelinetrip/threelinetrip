-- ──────────────────────────────────────────────
-- destinations 테이블에 main_tag 컬럼 추가
-- ※ 멱등(idempotent) 스크립트: 중복 실행 안전
-- ──────────────────────────────────────────────

-- 1. 컬럼 추가 (이미 있으면 무시)
alter table public.destinations
  add column if not exists main_tag text;

-- 2. 너무 긴 값 방지 체크 제약 (이미 있으면 무시)
--    ※ PostgreSQL 에는 "add constraint if not exists" 가 없으므로
--       중복 실행 시 오류가 날 수 있습니다. 이미 적용했다면 이 블록은 건너뛰세요.
do $$
begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_name = 'destinations' and constraint_name = 'destinations_main_tag_length'
  ) then
    alter table public.destinations
      add constraint destinations_main_tag_length check (char_length(main_tag) <= 20);
  end if;
end
$$;

-- 3. 인덱스 (태그 필터링 성능 개선용, 선택 사항)
create index if not exists idx_destinations_main_tag
  on public.destinations (main_tag);

-- ──────────────────────────────────────────────
-- [실행 방법]
-- Supabase 대시보드 → SQL Editor → 이 파일 내용 붙여넣기 → Run
-- ──────────────────────────────────────────────
