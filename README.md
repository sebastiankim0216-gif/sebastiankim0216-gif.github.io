# ASTRO — 북일고 천체관측 동아리 웹사이트

시안 디자인(HUD 프레임 · ASTRO 워드마크 · 궤도선 · 하단 유리 띠)을 그대로 옮긴 정적 웹사이트입니다.
빌드 도구 없이 HTML/CSS/JS(ES 모듈)만으로 동작하고, 데이터는 Firebase(구글 로그인 · Firestore · Storage)에 저장됩니다.

## 기능

| 메뉴 | 내용 |
|---|---|
| 홈 | 풀스크린 배너 슬라이더(관리자가 교체), 최근 공지 · 활동 · 갤러리, 모집 배너 |
| 소개 | 동아리 홍보 페이지 — 대표 문구, 소개글, 숫자, 주요 활동, 연간 일정, 모집 안내, 연락처 (관리자가 수정) |
| 활동 | **달력**에서 날짜 선택 → 그날의 활동 목록. 부원은 글 + 사진 · 동영상 · 유튜브 링크로 활동 기록 |
| 갤러리 | 활동 기록에 올라온 사진 · 영상 모음, 크게 보기(라이트박스) |
| 공지사항 | 목록 · 검색 · 상단 고정 · NEW 표시. 관리자만 작성 |
| 커뮤니티 | 말머리(자유/질문/관측후기/정보), 검색, 댓글. 부원만 작성 |
| 가입하기 | 구글 로그인 → 신청서(이름 · 학번 · 관심 분야 · 지원 동기) → 진행 상태 확인 · 수정 · 취소 |
| 관리자 | 대시보드, 가입 신청 승인/반려(승인 시 자동으로 부원 등록), 회원 역할 관리, 배너 관리(사진 업로드 · 순서 · 숨김), 공지 관리, 사이트 설정(소개 문구 · 모집 on/off) |

권한: **일반**(로그인만 함) · **부원**(활동 기록 · 커뮤니티 작성) · **관리자**(전체 관리)

## 폴더 구조

```
astro-web/
├─ public/                  ← 웹사이트 (Firebase Hosting 에 올라가는 폴더)
│  ├─ index.html
│  ├─ css/style.css
│  ├─ js/
│  │  ├─ config.js          ← ★ 설정은 이 파일만 고치면 됩니다
│  │  ├─ app.js             라우터 · 헤더 · 로그인
│  │  ├─ backend.js         Firebase 연결
│  │  ├─ demo-backend.js    데모 모드(설정 전 체험용)
│  │  ├─ pages-main.js      홈 · 소개 · 공지 · 커뮤니티 · 가입
│  │  ├─ pages-activity.js  활동 달력 · 상세 · 갤러리
│  │  ├─ pages-admin.js     관리자
│  │  ├─ state.js / ui.js   공통
│  └─ assets/               배너 사진, 데모용 이미지
├─ firestore.rules          Firestore 보안 규칙
├─ storage.rules            Storage 보안 규칙
├─ firebase.json / .firebaserc
```

## 1. 먼저 데모로 둘러보기 (설정 없이)

`config.js` 의 `apiKey` 가 비어 있으면 **데모 모드**로 실행됩니다. 데이터는 그 브라우저에만 저장되고,
로그인 버튼을 누르면 관리자 / 부원 / 일반 학생 중 하나로 체험할 수 있어요.

ES 모듈을 쓰기 때문에 `index.html` 을 더블클릭(file://)하면 열리지 않습니다. 간단한 로컬 서버로 여세요.

```bash
cd astro-web/public
npx serve .            # 또는: python -m http.server 8000
```
VS Code 를 쓴다면 **Live Server** 확장으로 `public/index.html` 을 열어도 됩니다.

## 2. Firebase 연결하기

1. **프로젝트 만들기** — https://console.firebase.google.com 에서 새 프로젝트 생성
2. **웹 앱 추가** — 프로젝트 설정 › 일반 › 내 앱 › `</>` 웹 앱 추가 → 나오는 `firebaseConfig` 값을
   `public/js/config.js` 의 `FIREBASE_CONFIG` 에 붙여넣기
3. **구글 로그인 켜기** — Authentication › 로그인 방법 › Google › 사용 설정
   - 직접 산 도메인으로 배포한다면 Authentication › 설정 › **승인된 도메인**에 그 도메인을 추가
4. **Firestore 만들기** — Firestore Database › 데이터베이스 만들기 (위치: `asia-northeast3` 서울 권장, 프로덕션 모드)
5. **Storage 만들기 (사진 · 동영상 업로드용)** — Storage › 시작하기
   - Cloud Storage for Firebase 는 현재 **Blaze(종량제) 요금제**에서만 쓸 수 있습니다. 요금제를 올려도 무료 사용량은 그대로 있어서,
     동아리 규모에서는 대부분 무료 범위 안에서 쓰게 됩니다. 결제 예산 알림을 꼭 설정해 두세요.
   - Storage 를 쓰지 않으려면: 사진 업로드 대신 활동 기록의 **유튜브 링크** 칸만 사용하면 됩니다. (배너는 `public/assets` 사진 사용)
6. **관리자 이메일 지정** — 아래 3곳을 같은 구글 이메일로 바꾸기
   - `public/js/config.js` › `ADMIN_EMAILS`
   - `firestore.rules` › `['admin@example.com']`
   - `storage.rules` › `['admin@example.com']`
7. **배포**
   ```bash
   npm install -g firebase-tools
   firebase login
   # .firebaserc 의 your-firebase-project-id 를 내 프로젝트 ID 로 바꾸기
   firebase deploy
   ```
   배포가 끝나면 `https://프로젝트ID.web.app` 주소로 접속할 수 있어요.
   (Storage 규칙이 Firestore 의 역할 정보를 읽기 때문에, 처음 배포할 때 권한 허용을 묻는 메시지가 나오면 **Yes** 를 선택하세요.)
8. **첫 로그인** — 6번에서 적은 계정으로 로그인하면 자동으로 관리자가 됩니다.
   다른 사람을 관리자로 만들 때는 관리자 › 회원 관리에서 역할을 바꾸면 됩니다.

### (선택) 학교 계정만 로그인 허용
`config.js` 의 `ALLOWED_EMAIL_DOMAIN` 에 학교 도메인(예: `bugil.hs.kr`)을 넣으면 그 도메인 계정만 로그인됩니다.
보안 규칙에서도 막으려면 `firestore.rules` 의 `signedIn()` 을 아래처럼 바꾸세요.
```
function signedIn() { return request.auth != null && request.auth.token.email.matches('.*@bugil[.]hs[.]kr$'); }
```

## 3. 운영 팁

- **배너 바꾸기**: 관리자 › 배너 관리 › "기본 배너 가져와서 편집하기"를 누르면 지금 보이는 4장이 DB로 옮겨지고, 그다음부터 사진 · 문구 · 순서를 바꿀 수 있어요. 큰 제목에 `ASTRO` 라고 쓰면 시안의 로고 글자체로 표시됩니다.
- **소개 페이지 문구**: 기본으로 들어 있는 소개 · 숫자 · 연간 일정은 **예시 문구**입니다. 관리자 › 사이트 설정에서 실제 내용으로 바꿔 주세요. 목록 칸은 한 줄에 하나씩 `제목 | 내용` 형식입니다.
- **모집 마감**: 사이트 설정에서 "지금 신입 부원 모집 중"을 끄면 새 가입 신청을 받지 않아요.
- **카카오톡 링크**: 카카오톡 · 인스타그램 앱 안의 브라우저에서는 구글이 로그인을 막습니다. 사이트가 이를 감지해 "외부 브라우저로 열기" 안내를 띄워 줍니다.
- **큰 동영상**: 동영상은 기본 100MB 제한입니다(`config.js` › `UPLOAD_LIMITS`). 긴 영상은 유튜브(일부 공개)에 올리고 링크를 붙이는 쪽이 용량 · 비용 면에서 유리해요.
- 사진은 올리기 전에 자동으로 긴 변 2048px 로 줄여서 저장합니다.

## 데이터 구조 (Firestore)

| 컬렉션 | 내용 |
|---|---|
| `users/{uid}` | email, name, photo, role(`guest`/`member`/`admin`), realName, studentNo |
| `applications/{uid}` | name, studentNo, phone, interests[], motivation, experience, status(`pending`/`approved`/`rejected`), adminMemo |
| `notices/{id}` | title, content, pinned, authorName, createdAt |
| `posts/{id}` (+ `comments`) | category, title, content, author*, commentCount |
| `activities/{id}` | date(`YYYY-MM-DD`), title, place, content, media[{type, url, path}], author* |
| `banners/{id}` | imageUrl, imagePath, subtitle, title, text, buttonLabel, buttonLink, order, active |
| `settings/site` | 모집 · 소개 페이지 문구 |

## 디자인 메모

- 배경 사진(`assets/hero-day.jpg`)은 시안 이미지에서 글자와 선을 지운 학교 사진입니다. 저녁 · 밤 · 캠퍼스 버전은 이를 색보정해 만든 배너용 사진이에요.
  실제 학교 사진으로 바꾸고 싶으면 관리자 › 배너 관리에서 올리면 됩니다.
- HUD 프레임은 화면 크기에 맞춰 스크립트가 다시 그립니다 (`ui.js` › `hudPath`).
- 글꼴: 한글 Pretendard(없으면 Noto Sans KR), 영문 제목 Michroma.
