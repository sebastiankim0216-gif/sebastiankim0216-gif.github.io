# ASTRO 웹사이트 — GitHub Pages 업로드용

- 도메인: **astro-bugil.kro.kr** (`CNAME` 포함)
- 로그인 · 데이터: Firebase (프로젝트 `astro-bugil-a1dd7`)
- 사진 저장: **Supabase Storage** (동영상 파일 업로드는 막혀 있고, 영상은 유튜브 링크로 올립니다)

## 설정값은 한 곳에: `js/config.js`

| 항목 | 위치 | 비고 |
|---|---|---|
| Firebase 웹 앱 설정 | `FIREBASE_CONFIG` | 지금은 `astro-bugil-a1dd7` 프로젝트 값이 들어 있음 |
| 운영담당자 이메일 | `OWNER_EMAILS` | `setup/firestore.rules`, `setup/supabase-setup.sql` 안의 이메일도 같게 |
| Supabase 주소·키 | `SUPABASE.url`, `SUPABASE.anonKey` | **anon(public) 키만**. service_role 키는 절대 넣지 마세요 |

## 처음 한 번만 하는 설정

### Firebase 콘솔
1. Authentication › 로그인 방법: **Google**, **이메일/비밀번호** 사용
2. Authentication › 설정 › 승인된 도메인: `astro-bugil.kro.kr` 추가
3. Firestore › 규칙: `setup/firestore.rules` 내용 붙여넣고 **게시**

### Supabase 대시보드
1. 새 프로젝트 생성 (무료 플랜 가능)
2. Authentication › Sign In / Providers › **Third-Party Auth** › Add provider › **Firebase** › 프로젝트 ID `astro-bugil-a1dd7`
3. SQL Editor › `setup/supabase-setup.sql` 전체 붙여넣고 **Run** (사진 버킷 + 업로드 권한 생성)
4. Project Settings › API 의 **Project URL**, **anon public 키**를 `js/config.js` 의 `SUPABASE` 에 입력
5. 사이트에서 운영담당자로 로그인 › 관리자 페이지 › **관리자** 탭을 한 번 열기 → 관리자들의 사진 업로드 권한이 Supabase 에 자동으로 맞춰짐

> Supabase 무료 프로젝트는 1주일 동안 아무 요청이 없으면 일시 정지될 수 있어요. 정지되면 대시보드에서 다시 켜면 됩니다.

## 업로드 (매번)
1. 저장소의 옛 파일을 지우고 이 압축의 **내용물 전부**를 저장소 맨 위에 올려 Commit
2. 1~2분 뒤 https://astro-bugil.kro.kr — 예전 화면이 보이면 Ctrl+Shift+R

## 권한
| 역할 | 할 수 있는 일 |
|---|---|
| 운영담당자 (`OWNER_EMAILS`) | 전부 + 관리자 임명, 합격/불합격, **지원 문항 편집**, 상단 알림 배너 |
| 관리자 (관리자 탭에서 이메일로 추가) | 지원서 열람·삭제, 공지, 활동·일정, 사진 업로드, 메인 배너, 사이트 설정 |
| 일반 (로그인) | 가입 신청·수정·취소, 결과 확인, 커뮤니티 |

관리자·운영담당자 권한은 **이메일 인증된 계정**(구글 로그인, 또는 인증 메일을 확인한 이메일 계정)에만 적용됩니다.

## 가입 신청 문항
- 관리자 페이지 › **지원 질문**에서 문항을 추가·삭제·순서 변경하고, 문항마다 최소/최대 글자 수와 필수 여부를 정할 수 있어요.
- 학번 · 이름 · 전화번호 · 이메일은 항상 받습니다.
- 제출된 지원서에는 제출 당시 문항이 함께 저장되어, 나중에 문항을 바꿔도 예전 지원서가 그대로 보여요. (옛 사이트의 지원서도 그대로 표시)
- 관리자 페이지에서 엑셀(CSV)로 저장할 수 있어요.
