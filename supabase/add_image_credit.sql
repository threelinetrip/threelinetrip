-- ──────────────────────────────────────────────
-- destinations 테이블에 image_credit 컬럼 추가
-- ※ 멱등(idempotent) 스크립트: 중복 실행 안전
-- ──────────────────────────────────────────────

-- 1. 컬럼 추가 (이미 있으면 무시)
alter table public.destinations
  add column if not exists image_credit text;

-- ──────────────────────────────────────────────
-- [실행 방법]
-- Supabase 대시보드 → SQL Editor → 이 파일 내용 붙여넣기 → Run
-- ──────────────────────────────────────────────
