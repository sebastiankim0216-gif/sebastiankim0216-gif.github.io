// 앱 전역 상태와 권한 도우미
// 권한: owner(운영담당자) > admin(관리자) > user(로그인 사용자)
import { DEFAULT_SITE, DEFAULT_BANNERS, DEFAULT_QUESTIONS, UPLOAD_LIMITS } from "./config.js?v=202611271625";

export const S = {
  api: null,
  user: null,
  site: { ...DEFAULT_SITE },
  banners: [],          // 메인 배너 (config/hero_banners.items 중 표시 중인 것)
  allBanners: [],
  questionList: DEFAULT_QUESTIONS.map((q) => ({ ...q })),
  owners: [],
  calMonth: null,
  calSel: null,
  login: null,
  refreshHeader: null
};

export const isLoggedIn = () => !!S.user;
export const isOwner = () => S.user?.role === "owner";
export const isAdmin = () => S.user?.role === "owner" || S.user?.role === "admin";
export const isMine = (authorEmail) => !!S.user && !!authorEmail && S.user.email === String(authorEmail).toLowerCase();
export const canEdit = (authorEmail) => isAdmin() || isMine(authorEmail);
export const isDemo = () => S.api?.mode === "demo";
export const imageMaxSide = () => (isDemo() ? 1280 : UPLOAD_LIMITS.imageMaxSide);

export function slides() {
  return S.banners.length ? S.banners : DEFAULT_BANNERS;
}

export async function loadSite() {
  try {
    const doc = await S.api.get("config", "site_content");
    S.site = { ...DEFAULT_SITE, ...(doc || {}) };
  } catch (e) {
    console.warn("site", e);
    S.site = { ...DEFAULT_SITE };
  }
}

export async function loadBanners() {
  try {
    const doc = await S.api.get("config", "hero_banners");
    const items = Array.isArray(doc?.items) ? doc.items : [];
    S.allBanners = items;
    S.banners = items.filter((b) => b.active !== false && b.imageUrl);
  } catch (e) {
    console.warn("banners", e);
    S.allBanners = []; S.banners = [];
  }
}

// 운영담당자 목록 (config/owners.emails) — 홈 화면 비밀번호 콘솔에서 관리
export async function loadOwners() {
  try { const d = await S.api.get("config", "owners"); S.owners = Array.isArray(d?.emails) ? d.emails : []; }
  catch { S.owners = []; }
  return S.owners;
}
export async function saveOwners(secret, emails) {
  S.owners = await S.api.saveOwners(secret, emails);
  return S.owners;
}
export const isMuted = () => S.user?.muted === true;

// 이름 가리기: 윤도서 → 윤O서, 김별 → 김O
export function maskName(n) {
  const c = [...String(n || "").trim()];
  if (c.length <= 1) return c.join("");
  if (c.length === 2) return c[0] + "O";
  return c[0] + "O".repeat(c.length - 2) + c[c.length - 1];
}
export async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function saveBanners(items) {
  await S.api.set("config", "hero_banners", { items, updatedAt: S.api.now() }, false);
  await loadBanners();
}

// 가입 신청 문항 목록: config/apply_questions.items (없으면 기본 5문항, 옛 q1/q2 문구 반영)
export function defaultQuestions(d) {
  return DEFAULT_QUESTIONS.map((q) => ({ ...q, title: q.id === "q1" && d?.q1 ? d.q1 : q.id === "q2" && d?.q2 ? d.q2 : q.title }));
}
export async function loadQuestions() {
  let d = null;
  try { d = await S.api.get("config", "apply_questions"); } catch { /* 기본값 */ }
  S.questionList = Array.isArray(d?.items) && d.items.length
    ? d.items.map((q) => ({ id: String(q.id), title: String(q.title || ""), min: +q.min || 0, max: +q.max || 0, required: q.required !== false }))
    : defaultQuestions(d);
  return S.questionList;
}
// 지원서 한 건의 문항·답 목록 (새 형식 answers/questions, 옛 형식 intro/motivation/q1/q2/extra 모두 지원)
export function applicationQA(a) {
  const qs = Array.isArray(a.questions) && a.questions.length ? a.questions
    : defaultQuestions({ q1: a.q1Label, q2: a.q2Label });
  return qs.map((q) => ({ id: q.id, title: q.title, answer: (a.answers && a.answers[q.id] != null) ? a.answers[q.id] : (a[q.id] ?? "") }));
}

// 작성자 정보 (옛 사이트와 같은 필드: authorEmail, authorName)
export function authorFields() {
  const u = S.user;
  return { authorEmail: u.email, authorName: u.name || u.email.split("@")[0], authorPhoto: u.photo || "", authorUid: u.uid };
}

// 옛 활동 게시물(mediaUrls/mediaTypes/storagePaths, date 없음)을 새 형식으로 맞춤
export function normActivity(a) {
  const media = Array.isArray(a.media) ? a.media
    : (a.mediaUrls || []).map((url, i) => ({ url, type: (a.mediaTypes || [])[i] === "video" ? "video" : "image", path: (a.storagePaths || [])[i] || "" }));
  let date = a.date;
  if (!date && a.createdAt) { const d = new Date(a.createdAt); date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  return { ...a, media, date: date || "" };
}
