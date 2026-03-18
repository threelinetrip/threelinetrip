-- ──────────────────────────────────────────────
-- destinations 테이블 image_credit 컬럼 확인용 메모
--
-- [현재 상태]
--   image_credit  jsonb  (이미 수동으로 text → jsonb 변경 완료)
--
-- [저장 포맷]
--   [{url: "https://...", credit: "한국관광공사"}, ...]
--   — imageUrls 배열과 인덱스 1:1 대응
--
-- [추가 실행 필요 없음]
--   컬럼 타입이 이미 jsonb 라면 아래 구문은 무시해도 됩니다.
-- ──────────────────────────────────────────────

-- 혹시 아직 text 타입이라면 아래를 실행:
-- alter table public.destinations
--   alter column image_credit type jsonb
--   using case
--     when image_credit is null then '[]'::jsonb
--     else '[]'::jsonb
--   end;

-- 컬럼이 없다면 신규 추가:
alter table public.destinations
  add column if not exists image_credit jsonb not null default '[]'::jsonb;
