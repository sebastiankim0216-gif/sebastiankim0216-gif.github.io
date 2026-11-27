# ASTRO — 북일고등학교 항공우주·기계공학 동아리 웹사이트

GitHub Pages(정적 호스팅)용 사이트입니다. 빌드 과정 없이 이 저장소의 파일을 그대로 배포합니다.

- 주소: https://astro-bugil.kro.kr (`CNAME`)
- 로그인·데이터: Firebase (Authentication + Firestore)
- 사진 저장: Supabase Storage (`astro-photos` 버킷)

## 페이지
홈 · 소개 · 활동(달력 / 목록·검색) · 포트폴리오 · 갤러리 · 공지사항 · 커뮤니티 · 가입 신청 · 마이페이지 · 로그인 / 회원가입 · 이용약관 · 개인정보처리방침 · 관리자

## 배포
1. 이 폴더의 파일을 저장소 루트에 올립니다.
2. Settings › Pages › Source: `main` 브랜치 `/ (root)`.
3. Firebase 콘솔 › Authentication › 설정 › 승인된 도메인에 `astro-bugil.kro.kr` 추가.

## 보안 안내
- `js/config.js`의 Firebase 웹 설정과 Supabase publishable(anon) 키는 공개돼도 되는 값입니다.
  실제 권한은 Firebase 보안 규칙과 Supabase 정책이 막습니다.
- 보안 규칙 파일과 Supabase SQL 파일은 **이 저장소에 올리지 않습니다.** 운영진만 따로 보관하세요.
- Supabase service_role(secret) 키, DB 비밀번호, Firebase 서비스 계정 키는 절대 저장소에 넣지 마세요.
