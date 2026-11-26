# ASTRO 웹사이트 — GitHub Pages 배포용

이 폴더 안의 파일을 **그대로 GitHub 저장소 맨 위(루트)에 올리면** 바로 `https://아이디.github.io/저장소이름/` 으로 열립니다.
빌드 과정은 필요 없습니다.

```
(저장소 루트)
├─ index.html
├─ .nojekyll           ← GitHub의 Jekyll 처리를 끄는 빈 파일 (그대로 두세요)
├─ css/  js/  assets/
└─ firebase-rules/     ← Firebase 콘솔에 붙여넣을 보안 규칙 (사이트 동작과는 무관)
```

## 1. GitHub에 올리기 (5분)

1. GitHub › **New repository** → 이름 예: `astro` → **Public** → Create
2. 저장소 화면에서 **Add file › Upload files** → 이 폴더 안의 **내용물 전부**(index.html, css, js, assets, firebase-rules, .nojekyll)를 끌어다 놓기 → **Commit changes**
   - 폴더째(`astro-ghpages/`) 올리면 주소가 달라지니, 꼭 *안의 내용물*을 올려 주세요.
   - `.nojekyll` 이 숨김 파일이라 안 보이면 빼도 사이트는 동작합니다.
3. 저장소 **Settings › Pages** → Source: **Deploy from a branch** → Branch: **main** / **/(root)** → Save
4. 1~2분 뒤 `https://아이디.github.io/astro/` 접속

> Firebase 설정 전에는 **데모 모드**로 열립니다. (로그인 누르면 관리자·부원·일반 학생 체험, 데이터는 각자 브라우저에만 저장)

## 2. Firebase 연결 (실제 로그인 · 저장)

1. https://console.firebase.google.com → 새 프로젝트 → 프로젝트 설정 › 내 앱 › 웹 앱(`</>`) 추가
2. 나온 `firebaseConfig` 값을 **`js/config.js`** 의 `FIREBASE_CONFIG` 에 붙여넣기
   (GitHub에서 파일 열고 연필 아이콘으로 바로 수정 → Commit 하면 1~2분 뒤 반영)
3. `js/config.js` 의 `ADMIN_EMAILS` 에 관리자 구글 이메일 입력
4. **Authentication › 로그인 방법 › Google** 사용 설정
5. **Authentication › 설정 › 승인된 도메인 › 도메인 추가 → `아이디.github.io`** ← 이걸 안 하면 구글 로그인이 안 됩니다
6. **Firestore Database** 만들기 (위치 `asia-northeast3` 서울 권장)
   → **규칙** 탭에 `firebase-rules/firestore.rules` 내용을 붙여넣고, `admin@example.com` 을 3번의 관리자 이메일로 바꾼 뒤 **게시**
7. **Storage** 만들기 (사진·동영상 업로드용)
   → **Rules** 탭에 `firebase-rules/storage.rules` 내용을 붙여넣고, 이메일 바꾼 뒤 **게시**
   - Storage는 Blaze(종량제) 요금제에서만 쓸 수 있어요. 무료 사용량은 그대로 있으니 예산 알림을 설정해 두세요.
   - Storage 없이 쓰려면 활동 기록에서 사진 대신 **유튜브 링크**만 사용하면 됩니다.
8. 사이트에서 관리자 이메일로 로그인 → 자동으로 관리자. 오른쪽 위 **관리자** 버튼으로 관리 페이지 이동

> `config.js` 의 apiKey 가 공개 저장소에 보여도 괜찮습니다. Firebase 웹 설정값은 원래 공개되는 값이고, 데이터는 6·7번의 보안 규칙이 지킵니다.

## 3. 운영 메모

- **배너**: 관리자 › 배너 관리 › "기본 배너 가져와서 편집하기" → 사진·문구·순서 수정. 큰 제목을 `ASTRO` 로 쓰면 로고 글자체로 나와요.
- **소개 문구**: 기본 소개글·숫자·연간 일정은 예시입니다. 관리자 › 사이트 설정에서 바꿔 주세요.
- **모집 마감**: 사이트 설정에서 "지금 신입 부원 모집 중"을 끄면 새 신청을 받지 않아요.
- **카카오톡으로 링크 공유 시**: 카톡 안 브라우저는 구글 로그인이 막혀 있어서, 사이트가 "외부 브라우저로 열기" 안내를 띄웁니다.
- 코드를 고친 뒤 화면이 그대로면 브라우저 강력 새로고침(Ctrl+Shift+R)을 해 주세요. GitHub Pages는 몇 분간 캐시를 둡니다.
