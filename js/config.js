// =====================================================================
//  ASTRO 웹사이트 설정 파일 — 이 파일만 고치면 됩니다.
// =====================================================================

// 1) Firebase 웹 앱 설정 (프로젝트: astro-web-1e6f4)
//    apiKey 를 비우면 '데모 모드'(이 브라우저에만 저장되는 체험용)로 실행됩니다.
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCfS8K14FCFU4Du43LZqGVhlVo0ayS6Mpc",
  authDomain: "astro-web-1e6f4.firebaseapp.com",
  projectId: "astro-web-1e6f4",
  storageBucket: "astro-web-1e6f4.firebasestorage.app",
  messagingSenderId: "111721529007",
  appId: "1:111721529007:web:4d44d2a69562d7e2b71e5a",
  measurementId: "G-DEJ7NH1SQD"
};

// Firebase JS SDK 버전 (gstatic CDN에서 불러옵니다)
export const FIREBASE_SDK_VERSION = "13.4.0";

// 1-2) 사진 저장소: Supabase Storage
//    Supabase 대시보드 › Project Settings › API 에서 Project URL 과 anon(public) 키를 넣으세요.
//    ⚠️ service_role 키는 절대 넣지 마세요. (anon / publishable 키만)
export const SUPABASE = {
  url: "https://njjqrfzuyrxgzxfahmdi.supabase.co",
  anonKey: "sb_publishable_D8Se8ir3OTplFToq3x4Y6w_VjMFKvl-",
  // 예전 형식 anon 키 (publishable 키가 안 될 때 위 anonKey 와 바꿔 쓰세요):
  // eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qanFyZnp1eXJ4Z3p4ZmFobWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2NzY1NzEsImV4cCI6MjExMTI1MjU3MX0.SPBx1Ncw7R5K5tPRPyadILvZsVKizRLZnUyJeX7KLe8
  bucket: "astro-photos", // supabase-setup.sql 이 만드는 버킷 이름
  sdk: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.2/+esm"
};

// 2) 운영담당자(OWNER) 지정 콘솔 비밀번호
//    홈 화면(첫 화면)에서 입력창이 아닌 곳에 키보드로 이 숫자를 치면 '운영담당자 지정 콘솔'이 열립니다.
//    휴대폰: 홈 화면 왼쪽 아래 로고를 5번 연속으로 누르면 비밀번호 입력창이 뜹니다.
//    운영담당자 목록은 Firestore config/owners 에 저장됩니다. (firestore.rules 의 비밀번호도 같게 유지)
export const OWNER_CONSOLE_KEY = "100120";

// 3) 특정 도메인 계정만 로그인 허용하려면 입력 (예: "bugil.hs.kr"). 비워두면 모두 허용
export const ALLOWED_EMAIL_DOMAIN = "";

// 4) 업로드 제한
export const UPLOAD_LIMITS = {
  imageMB: 10,          // 사진 1장 최대 (큰 사진은 올리기 전에 자동으로 줄입니다)
  maxFiles: 20,         // 활동 기록 1건당 최대 사진 수
  imageMaxSide: 2048    // 업로드 전 사진 긴 변을 이 크기로 줄임
};

// 가입 신청서 기본 문항 — 관리자 페이지 › 지원 질문에서 개수·내용·글자 수를 자유롭게 바꿀 수 있어요.
//   (관리자가 한 번도 저장하지 않았을 때 쓰이는 기본값. 옛 사이트의 5개 문항과 같음)
//   q1 / q2 의 제목은 옛 설정(config/apply_questions 의 q1, q2)이 있으면 그 문구를 씁니다.
export const DEFAULT_QUESTIONS = [
  { id: "intro", title: "아스트로에 지원하게 된 동기를 본인의 관심분야(수학, 물리학, 화학 등)와 관련지어 구체적으로 작성하시오. (관심분야 연관 내용 작성 이후 자유롭게 지원동기 작성 가능)", min: 0, max: 500, required: true },
  { id: "motivation", title: "고등학교 진학 전 수학, 과학, 융합 분야에서 자기주도적으로 탐구한 활동을 자신의 열정, 탐구력 및 창의적 문제해결력 등이 잘 드러나도록 구체적으로 서술하시오. (복수의 활동 작성 가능. 구체적으로 쓸 것)", min: 400, max: 800, required: true },
  { id: "q1", title: "질문 3", min: 0, max: 0, required: true },
  { id: "q2", title: "질문 4", min: 0, max: 0, required: true },
  { id: "extra", title: "본인의 포부나 추가로 하고 싶은 말을 자유롭게 적어주세요.", min: 0, max: 0, required: false }
];

// 게시판 분류
export const COMMUNITY_CATEGORIES = ["자유", "질문", "정보", "후기"];
export const ACTIVITY_CATEGORIES = ["실험", "대회", "학술교류", "제작", "기타"];
export const EVENT_CATEGORIES = ["일반", "시험/마감", "활동", "학술교류", "행사"];

// 화면 테마 (마이페이지에서 선택). 첫 번째가 기본값
export const THEMES = [
  { id: "white", name: "흰색", desc: "밝고 깔끔한 기본 테마", meta: "#ffffff", swatch: ["#ffffff", "#f3f6fb", "#0e1838", "#2456d6"] },
  { id: "black", name: "검정색", desc: "눈이 편한 어두운 테마", meta: "#0b0b0e", swatch: ["#0b0b0e", "#1a1a20", "#f2f3f6", "#9cbcff"] },
  { id: "navy", name: "남색", desc: "밤하늘 같은 남색 테마", meta: "#0a1640", swatch: ["#0a1640", "#16296e", "#f4f7ff", "#8fb8ff"] }
];
export const DEFAULT_THEME = "white";

// 메인 배너 — 관리자 페이지에서 배너를 등록하지 않았을 때 보여줄 기본 배너 (1장)
export const DEFAULT_BANNERS = [
  {
    imageUrl: "assets/hero-day.jpg",
    subtitle: "Bugil Academy",
    title: "ASTRO",
    text: "하늘을 바라보는 순간,\n우리는 더 가까워집니다.",
    buttonLabel: "둘러보기",
    buttonLink: "#about"
  }
];

// 소개 페이지 기본 문구 (관리자 › 사이트 설정에서 수정). 목록은 한 줄에 하나씩 "제목 | 내용"
export const DEFAULT_SITE = {
  recruitOpen: true,
  recruitTitle: "ASTRO 신입 부원 모집",
  recruitPeriod: "",
  recruitText: "공학도를 지망하는 모두를 환영합니다.\nASTRO와 함께 항공우주공학의 꿈을 키워갈 새로운 부원을 모집합니다.",
  aboutHeadline: "하늘을 바라보는 순간,\n우리는 더 가까워집니다.",
  aboutBody: "ASTRO는 북일고등학교의 항공우주·기계공학 동아리입니다.\n20년 역사의 북일고등학교 최고의 공학 동아리로, 공학도를 꿈꾸는 열정적인 학생들이 모여 미래를 준비하는 배움의 공동체입니다.\n학술 교류 행사, 공학 실험 활동, 전산유체역학(CFD) 프로그램 학습 등 다양한 활동을 진행합니다.",
  stats: "역사 | 20년\n분야 | 항공우주·기계\n주요 활동 | 4가지\n학술 교류 | 3개 학교",
  programs: "항공기 플랩 모형 제작 | 항공기의 플랩 모형 제작 활동을 통해 유체역학과 항공우주공학을 심화 탐구합니다.\n대회 참가 | 국립중앙과학관에서 개최하는 전국 과학 전람회에 참가합니다.\nCNC 로켓 실험 | CNC 공법으로 제작한 로켓 본체와 고체연료를 통해 로켓을 발사하는 실험을 진행합니다.\n학술 교류 | 한민고등학교, 용인외국어대학교부설고등학교, 경기북과학고등학교와 학술 교류를 진행합니다.",
  timeline: "",
  teacher: "차미숙 선생님, 이현 선생님",
  room: "",
  email: "",
  instagram: "",
  footerText: "북일고등학교 항공우주·기계공학 동아리 ASTRO"
};
