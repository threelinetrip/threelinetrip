-- ──────────────────────────────────────────────
-- destinations 테이블에 tags 컬럼 추가
-- ※ 멱등(idempotent): 중복 실행 안전
-- ──────────────────────────────────────────────

alter table public.destinations
  add column if not exists tags text[] not null default '{}';

-- ──────────────────────────────────────────────
-- [실행 방법]
-- Supabase 대시보드 → SQL Editor → 이 파일 내용 붙여넣기 → Run
-- ──────────────────────────────────────────────
