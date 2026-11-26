-- =====================================================================
--  ASTRO 사진 저장소 (Supabase Storage) 설정 — SQL Editor 에 통째로 붙여넣고 Run 한 번
--  · 버킷 astro-photos : 누구나 사진 보기, 이미지(JPG/PNG/WEBP/GIF) 10MB 이하만
--  · 업로드/삭제 : Firebase 로그인한 운영담당자 + 관리자만 (이메일 인증된 계정)
--  · 관리자 목록(astro_admins)은 사이트 관리자 페이지 › 관리자 탭을 열면 자동으로 맞춰집니다
--  전제: Supabase › Authentication › Sign In / Providers › Third-Party Auth 에 Firebase (프로젝트 ID: astro-bugil-a1dd7) 추가
--  여러 번 실행해도 안전합니다.
-- =====================================================================

-- 1) 사진 버킷
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('astro-photos', 'astro-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2) 업로드 권한이 있는 관리자 이메일 목록
create table if not exists public.astro_admins (
  email text primary key,
  added_at timestamptz not null default now()
);
alter table public.astro_admins enable row level security;

-- 3) 권한 확인 함수 (Firebase ID 토큰을 Supabase 가 검증한 뒤 그 안의 정보로 판단)
create or replace function public.astro_firebase_email() returns text
language sql stable as $$
  select case
    when coalesce(auth.jwt() ->> 'iss', '') = 'https://securetoken.google.com/astro-bugil-a1dd7'
     and coalesce(auth.jwt() ->> 'aud', '') = 'astro-bugil-a1dd7'
     and coalesce((auth.jwt() ->> 'email_verified')::boolean, false)
    then lower(auth.jwt() ->> 'email')
    else null
  end
$$;

create or replace function public.astro_is_owner() returns boolean
language sql stable as $$
  select coalesce(public.astro_firebase_email() in ('yunthomas0120@gmail.com', 'yunarchive0120@gmail.com'), false)
$$;

create or replace function public.astro_can_upload() returns boolean
language sql stable security definer set search_path = public as $$
  select public.astro_is_owner()
      or exists (select 1 from public.astro_admins a where a.email = public.astro_firebase_email())
$$;

-- 4) astro_admins 정책: 읽기는 누구나, 추가/삭제는 운영담당자만
drop policy if exists "astro_admins read" on public.astro_admins;
drop policy if exists "astro_admins owner insert" on public.astro_admins;
drop policy if exists "astro_admins owner update" on public.astro_admins;
drop policy if exists "astro_admins owner delete" on public.astro_admins;
create policy "astro_admins read" on public.astro_admins for select to anon, authenticated using (true);
create policy "astro_admins owner insert" on public.astro_admins for insert to anon, authenticated with check (public.astro_is_owner());
create policy "astro_admins owner update" on public.astro_admins for update to anon, authenticated using (public.astro_is_owner()) with check (public.astro_is_owner());
create policy "astro_admins owner delete" on public.astro_admins for delete to anon, authenticated using (public.astro_is_owner());
grant select, insert, update, delete on public.astro_admins to anon, authenticated;

-- 5) 사진 파일 정책
drop policy if exists "astro photos read" on storage.objects;
drop policy if exists "astro photos upload" on storage.objects;
drop policy if exists "astro photos delete" on storage.objects;
create policy "astro photos read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'astro-photos');
create policy "astro photos upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'astro-photos' and public.astro_can_upload());
create policy "astro photos delete" on storage.objects for delete to anon, authenticated
  using (bucket_id = 'astro-photos' and public.astro_can_upload());
