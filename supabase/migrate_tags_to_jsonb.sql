-- ──────────────────────────────────────────────────────────────
-- tags 컬럼 마이그레이션: text[] → jsonb [{name, color}]
-- ※ 멱등(idempotent): 중복 실행 안전
-- ──────────────────────────────────────────────────────────────

-- 1단계: 임시 jsonb 컬럼 추가
ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS tags_v2 jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2단계: 기존 text[] 데이터를 {name, color} 객체 배열로 변환
--        color 는 빈 문자열(기본값)로 초기화 — 관리자가 이후 색상 선택 가능
UPDATE public.destinations
SET tags_v2 = COALESCE(
  (
    SELECT jsonb_agg(jsonb_build_object('name', t, 'color', ''))
    FROM unnest(tags) AS t
    WHERE t IS NOT NULL AND t <> ''
  ),
  '[]'::jsonb
);

-- 3단계: 기존 text[] 컬럼 삭제
ALTER TABLE public.destinations DROP COLUMN IF EXISTS tags;

-- 4단계: 임시 컬럼을 tags 로 이름 변경
ALTER TABLE public.destinations RENAME COLUMN tags_v2 TO tags;

-- ──────────────────────────────────────────────────────────────
-- [실행 방법]
-- Supabase 대시보드 → SQL Editor → 이 파일 내용 붙여넣기 → Run
--
-- [저장 포맷 예시]
-- [{"name": "해변", "color": "#FBECDD"}, {"name": "일출", "color": ""}]
--  → color 가 빈 문자열이면 앱에서 해시 기반 파스텔 색상 자동 배정
-- ──────────────────────────────────────────────────────────────
