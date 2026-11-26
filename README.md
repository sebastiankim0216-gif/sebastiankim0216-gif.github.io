# ASTRO 웹사이트 — GitHub Pages 업로드용 (설정 완료본)

- 도메인: **astro-bugil.kro.kr** (`CNAME` 포함)
- Firebase: **astro-web-1e6f4** · Supabase: **njjqrfzuyrxgzxfahmdi** — 모두 `js/config.js` 에 입력 완료

## 1. 업로드
저장소의 옛 파일을 모두 지우고, 이 압축의 **내용물 전부**를 저장소 맨 위에 올려 Commit → 1~2분 뒤 https://astro-bugil.kro.kr
(예전 화면이 보이면 Ctrl+Shift+R)

## 2. 처음 한 번만 (콘솔 설정)
### Firebase (astro-web-1e6f4)
1. Authentication › 로그인 방법: **Google**, **이메일/비밀번호** 사용
2. Authentication › 설정 › 승인된 도메인: **astro-bugil.kro.kr** 추가
3. Firestore Database 만들기 → 규칙 탭에 `setup/firestore.rules` 붙여넣고 **게시**

### Supabase (njjqrfzuyrxgzxfahmdi)
1. Authentication › Sign In / Providers › **Third-Party Auth** › Add provider › **Firebase** › 프로젝트 ID `astro-web-1e6f4`
2. SQL Editor › New query › `setup/supabase-setup.sql` 전체 붙여넣고 **Run** ("Success" 확인)

### 사이트에서
1. 홈 화면에서 키보드로 `100120` (휴대폰은 왼쪽 위 ASTRO 로고 5번 연속 터치) → 운영담당자 지정 콘솔 → 내 이메일 임명
2. 그 이메일로 로그인 → 관리자 페이지 › **관리자** 탭을 한 번 열기 → 사진 업로드 권한 자동 동기화

이후 수정은 GitHub 에 파일만 올리면 바로 반영됩니다.

## 권한
| 역할 | 할 수 있는 일 |
|---|---|
| 운영담당자 (홈 화면 콘솔에서 지정) | 전부 + 관리자 임명, 합격/불합격, 지원 문항 편집, 상단 알림 배너 |
| 관리자 (관리자 페이지 › 관리자 탭) | 지원서 열람·삭제, 공지, 활동·일정, 사진 업로드, 메인 배너, 사이트 설정 |
| 일반 (로그인) | 가입 신청·수정·취소, 결과 확인, 커뮤니티 |

## 참고
- 콘솔 비밀번호를 바꾸려면 `js/config.js`, `setup/firestore.rules`, `setup/supabase-setup.sql` 의 `100120` 을 함께 바꾸세요. 사이트 코드는 누구나 볼 수 있어 비밀번호도 보일 수 있으니, 가끔 콘솔에서 운영담당자 목록을 확인해 주세요.
- Supabase 무료 프로젝트는 1주일간 요청이 없으면 일시 정지될 수 있어요. 사진이 안 보이면 Supabase 대시보드에서 프로젝트를 다시 켜 주세요.
- 사진 업로드에서 오류가 나면 `js/config.js` 의 anonKey 를 주석에 적힌 예전 형식 anon 키로 바꿔 보세요.
