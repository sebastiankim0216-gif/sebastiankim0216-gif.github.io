// =====================================================================
//  ASTRO 웹사이트 설정 파일 — 이 파일만 고치면 됩니다.
// =====================================================================

// 1) Firebase 웹 앱 설정
//    Firebase 콘솔 > 프로젝트 설정 > 일반 > 내 앱(웹 </>) > "SDK 설정 및 구성" 의 값을 붙여넣으세요.
//    apiKey 가 비어 있으면 사이트는 '데모 모드'로 실행됩니다. (이 브라우저에만 저장되는 체험용)
export const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Firebase JS SDK 버전 (gstatic CDN에서 불러옵니다)
export const FIREBASE_SDK_VERSION = "13.4.0";

// 2) 최초 관리자 구글 계정 (여러 개 가능)
//    여기에 적힌 계정은 로그인하는 순간 자동으로 관리자가 됩니다.
//    firestore.rules / storage.rules 안의 ADMIN 이메일 목록도 똑같이 맞춰 주세요.
export const ADMIN_EMAILS = [
  "admin@example.com"
];

// 3) 특정 도메인 계정만 로그인 허용하려면 입력 (예: "bugil.hs.kr"). 비워두면 모든 구글 계정 허용
export const ALLOWED_EMAIL_DOMAIN = "";

// 4) 업로드 제한
export const UPLOAD_LIMITS = {
  imageMB: 15,          // 사진 1장 최대 용량 (큰 사진은 자동으로 줄여서 올립니다)
  videoMB: 100,         // 동영상 1개 최대 용량
  maxFiles: 20,         // 활동 기록 1건당 최대 파일 수
  imageMaxSide: 2048    // 업로드 전 사진의 긴 변을 이 크기로 줄입니다
};

// 커뮤니티 말머리
export const COMMUNITY_CATEGORIES = ["자유", "질문", "관측후기", "정보"];

// 가입 신청서의 관심 분야
export const INTERESTS = ["천체 관측", "천체 사진", "천문학 이론", "우주 과학", "망원경·장비", "탐구 발표"];

// 관리자 페이지에서 배너를 하나도 등록하지 않았을 때 보여줄 기본 배너
export const DEFAULT_BANNERS = [
  {
    imageUrl: "assets/hero-day.jpg",
    subtitle: "Bugil Academy",
    title: "ASTRO",
    text: "하늘을 바라보는 순간,\n우리는 더 가까워집니다.",
    buttonLabel: "둘러보기",
    buttonLink: "#about"
  },
  {
    imageUrl: "assets/hero-dusk.jpg",
    subtitle: "2027 Recruit",
    title: "JOIN US",
    text: "별을 좋아하는 마음 하나면 충분합니다.\n아스트로의 새 부원을 기다립니다.",
    buttonLabel: "가입 신청",
    buttonLink: "#join"
  },
  {
    imageUrl: "assets/hero-night.jpg",
    subtitle: "Observation Night",
    title: "STARGAZING",
    text: "한 달에 한 번, 운동장에 망원경을 펼치고\n함께 밤하늘을 올려다봅니다.",
    buttonLabel: "활동 보기",
    buttonLink: "#activity"
  },
  {
    imageUrl: "assets/hero-campus.jpg",
    subtitle: "Our Moments",
    title: "GALLERY",
    text: "함께 본 하늘과 웃음을\n사진과 영상으로 남겼어요.",
    buttonLabel: "갤러리",
    buttonLink: "#gallery"
  }
];

// 관리자 > 사이트 설정에서 저장하기 전까지 쓰이는 기본 소개 문구 (예시 문구입니다)
//   목록 항목은 한 줄에 하나씩, "제목 | 내용" 형식
export const DEFAULT_SITE = {
  recruitOpen: true,
  recruitTitle: "2027학년도 신입 부원 모집",
  recruitPeriod: "2027. 3. 2. ~ 3. 13.",
  recruitText: "별을 좋아하는 마음 하나면 충분합니다.\n관측 경험이 없어도 괜찮아요. 망원경 다루는 법부터 선배들이 차근차근 알려드립니다.",
  aboutHeadline: "하늘을 바라보는 순간,\n우리는 더 가까워집니다.",
  aboutBody: "ASTRO는 북일고등학교 천체관측 동아리입니다.\n맑은 밤이면 망원경을 펼쳐 달과 행성, 성단을 관측하고, 카메라로 별의 궤적과 은하수를 기록합니다. 관측이 없는 날에는 별자리와 항성의 일생, 우주의 구조를 함께 공부하고 발표합니다.\n같은 하늘을 올려다보며 질문하고, 기록하고, 나누는 것 — 그것이 ASTRO가 하는 일입니다.",
  stats: "정기 관측회 | 매월\n활동 분야 | 4개\n모집 시기 | 매년 3월\n활동 장소 | 지구과학실",
  programs: "정기 관측회 | 한 달에 한 번, 운동장과 옥상에서 망원경으로 달·행성·성단을 관측합니다.\n천체 사진 | 카메라와 스마트폰으로 별 궤적, 은하수, 달 표면을 촬영하고 보정해 봅니다.\n천문 스터디 | 별자리, 항성의 진화, 우주론까지 주제를 정해 공부하고 발표합니다.\n탐구·행사 | 학교 축제 관측 부스, 과학 탐구 발표, 천문대 견학을 함께 준비합니다.",
  timeline: "3월 | 신입 부원 모집 · 오리엔테이션\n4월 | 망원경 조작 교육 · 첫 관측회\n5월 | 천문대 견학\n8월 | 페르세우스자리 유성우 관측\n9월 | 학교 축제 천체 관측 부스\n12월 | 쌍둥이자리 유성우 관측 · 연말 발표회",
  teacher: "",
  room: "지구과학실",
  email: "",
  instagram: "",
  footerText: "북일고등학교 천체관측 동아리 ASTRO"
};
