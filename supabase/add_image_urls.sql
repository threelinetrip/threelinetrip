-- =============================================
-- [STEP 1] destinations 테이블에 image_urls 컬럼 추가
-- =============================================
alter table public.destinations
  add column if not exists image_urls jsonb not null default '[]'::jsonb;


-- =============================================
-- [STEP 2] Supabase Storage 버킷 생성
-- =============================================
-- 버킷이 이미 있으면 무시됩니다.
insert into storage.buckets (id, name, public)
values ('destinations', 'destinations', true)
on conflict (id) do nothing;


-- =============================================
-- [STEP 3] Storage 정책 설정
-- 이미 같은 이름의 정책이 있으면 먼저 삭제 후 재생성합니다.
-- =============================================

-- 기존 정책 삭제 (중복 실행 시 오류 방지)
drop policy if exists "Storage 업로드 허용" on storage.objects;
drop policy if exists "Storage 공개 읽기" on storage.objects;
drop policy if exists "Storage 삭제 허용" on storage.objects;

-- 업로드 허용 (anon + authenticated)
create policy "Storage 업로드 허용"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'destinations');

-- 공개 읽기 허용
create policy "Storage 공개 읽기"
  on storage.objects for select
  to public
  using (bucket_id = 'destinations');

-- 삭제 허용
create policy "Storage 삭제 허용"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'destinations');
