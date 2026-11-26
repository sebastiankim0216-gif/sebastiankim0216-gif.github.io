-- =====================================================================
--  ASTRO 사진 저장소 (Supabase Storage) 설정 — SQL Editor 에 통째로 붙여넣고 Run 한 번
--  · 버킷 astro-photos : 누구나 사진 보기, 이미지(JPG/PNG/WEBP/GIF) 10MB 이하만
--  · 업로드/삭제 : Firebase(astro-web-1e6f4)로 로그인한 운영담당자 + 관리자만 (이메일 인증된 계정)
--  · 업로드 가능한 이메일 목록(astro_admins)은 사이트 관리자 페이지 › 관리자 탭을 열면 자동으로 맞춰집니다
--  전제: Supabase › Authentication › Sign In / Providers › Third-Party Auth 에 Firebase (프로젝트 ID: astro-web-1e6f4) 추가
--  ⚠️ '100120' 은 사이트 js/config.js 의 OWNER_CONSOLE_KEY 와 같아야 합니다.
--  여러 번 실행해도 안전합니다.
-- =====================================================================

-- 1) 사진 버킷
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('astro-photos', 'astro-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2) 업로드 가능한 이메일 목록 (운영담당자 + 관리자)
create table if not exists public.astro_admins (
  email text primary key,
  added_at timestamptz not null default now()
);
alter table public.astro_admins enable row level security;
drop policy if exists "astro_admins read" on public.astro_admins;
drop policy if exists "astro_admins owner insert" on public.astro_admins;
drop policy if exists "astro_admins owner update" on public.astro_admins;
drop policy if exists "astro_admins owner delete" on public.astro_admins;
create policy "astro_admins read" on public.astro_admins for select to anon, authenticated using (true);
revoke insert, update, delete on public.astro_admins from anon, authenticated;
grant select on public.astro_admins to anon, authenticated;

-- 3) Firebase ID 토큰(Supabase 가 검증)에서 인증된 이메일 꺼내기
create or replace function public.astro_firebase_email() returns text
language sql stable as $$
  select case
    when coalesce(auth.jwt() ->> 'iss', '') = 'https://securetoken.google.com/astro-web-1e6f4'
     and coalesce(auth.jwt() ->> 'aud', '') = 'astro-web-1e6f4'
     and coalesce((auth.jwt() ->> 'email_verified')::boolean, false)
    then lower(auth.jwt() ->> 'email')
    else null
  end
$$;

create or replace function public.astro_can_upload() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.astro_admins a where a.email = public.astro_firebase_email())
$$;

-- 4) 업로드 가능 목록 교체 (사이트 관리자 탭이 호출, 콘솔 비밀번호 필요)
create or replace function public.astro_set_uploaders(p_key text, p_emails text[]) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if p_key is distinct from '100120' then
    raise exception 'invalid key';
  end if;
  if public.astro_firebase_email() is null then
    raise exception 'login required';
  end if;
  delete from public.astro_admins where email <> all (coalesce(p_emails, '{}'));
  insert into public.astro_admins (email)
    select distinct lower(trim(e)) from unnest(coalesce(p_emails, '{}')) as e where trim(e) <> ''
  on conflict (email) do nothing;
  select count(*) into n from public.astro_admins;
  return n;
end
$$;
revoke all on function public.astro_set_uploaders(text, text[]) from public;
grant execute on function public.astro_set_uploaders(text, text[]) to anon, authenticated;

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
