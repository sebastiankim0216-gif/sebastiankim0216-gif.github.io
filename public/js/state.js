// 앱 전역 상태와 권한 도우미
import { DEFAULT_SITE, DEFAULT_BANNERS, UPLOAD_LIMITS } from "./config.js";

export const S = {
  api: null,
  user: null,
  site: { ...DEFAULT_SITE },
  banners: [],          // DB에 저장된 배너 (활성만)
  allBanners: [],       // 관리자용 전체
  calMonth: null,       // 활동 달력에서 보던 달 "YYYY-MM"
  login: null,          // 로그인 시작 함수 (app.js 에서 주입)
  refreshHeader: null
};

export const isLoggedIn = () => !!S.user;
export const isAdmin = () => S.user?.role === "admin";
export const isMember = () => S.user?.role === "member" || S.user?.role === "admin";
export const canEdit = (authorUid) => isAdmin() || (S.user && S.user.uid === authorUid);
export const isDemo = () => S.api?.mode === "demo";
export const imageMaxSide = () => (isDemo() ? 1280 : UPLOAD_LIMITS.imageMaxSide);

export function slides() {
  return S.banners.length ? S.banners : DEFAULT_BANNERS;
}

export async function loadSite() {
  try {
    const doc = await S.api.get("settings", "site");
    S.site = { ...DEFAULT_SITE, ...(doc || {}) };
  } catch (e) {
    console.warn("settings", e);
    S.site = { ...DEFAULT_SITE };
  }
}

export async function loadBanners() {
  try {
    const all = await S.api.list("banners", { orderBy: ["order", "asc"] });
    S.allBanners = all;
    S.banners = all.filter((b) => b.active !== false && b.imageUrl);
  } catch (e) {
    console.warn("banners", e);
    S.banners = [];
  }
}

// 작성자 정보 묶음
export function authorFields() {
  const u = S.user;
  return { authorUid: u.uid, authorName: u.realName || u.name, authorPhoto: u.photo || "" };
}
