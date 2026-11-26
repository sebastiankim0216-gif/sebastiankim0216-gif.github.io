// ASTRO 웹사이트 — 진입점: 부팅, 라우터, 헤더, 로그인, 상단 알림 배너
import { S, isAdmin, isOwner, loadSite, loadBanners, loadQuestions, isDemo } from "./state.js?v=202611261551";
import { $, $$, esc, icon, avatar, roleChip, toast, errMsg, modal, attachHud, inAppBrowser, confirmDialog, setBtnBusy } from "./ui.js?v=202611261551";
import { createBackend } from "./backend.js?v=202611261551";
import { renderHome, renderAbout, renderNotice, renderCommunity, renderJoin } from "./pages-main.js?v=202611261551";
import { renderActivity, renderGallery } from "./pages-activity.js?v=202611261551";
import { renderAdmin } from "./pages-admin.js?v=202611261551";
import { renderMypage } from "./pages-mypage.js?v=202611261551";
import { applyTheme, currentTheme } from "./theme.js?v=202611261551";

const ROUTES = {
  home: renderHome, about: renderAbout, activity: renderActivity, gallery: renderGallery,
  notice: renderNotice, community: renderCommunity, join: renderJoin, admin: renderAdmin, mypage: renderMypage
};
const TITLES = { about: "소개", activity: "활동", gallery: "갤러리", notice: "공지사항", community: "커뮤니티", join: "가입 신청", admin: "관리자", mypage: "마이페이지" };
const app = $("#app");
const header = $("#siteHeader");
let currentKey = "";

function parseHash() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const i = h.indexOf("-");
  const page = (i < 0 ? h : h.slice(0, i)) || "home";
  const id = i < 0 ? "" : h.slice(i + 1);
  return ROUTES[page] ? { page, id } : { page: "home", id: "" };
}

async function route({ keepScroll = false } = {}) {
  const { page, id } = parseHash();
  const key = `${page}-${id}`;
  const sameView = key === currentKey;
  currentKey = key;
  closeMenu();
  $$(".gnb a").forEach((a) => a.classList.toggle("active", a.dataset.nav === page));
  document.title = (TITLES[page] ? TITLES[page] + " · " : "") + "ASTRO · Bugil Academy";
  const y = window.scrollY;
  try {
    await ROUTES[page](app, id);
  } catch (e) {
    console.error(e);
    app.innerHTML = `<section class="page" style="padding-top:140px"><div class="wrap"><div class="panel guard"><h2>페이지를 불러오지 못했어요</h2><p class="text-dim mt-s">${esc(errMsg(e))}</p><div class="acts"><a class="btn" href="#home">홈으로</a></div></div></div></section>`;
  }
  attachHud(app);
  window.scrollTo(0, keepScroll && sameView ? y : 0);
  onScroll();
}
S.rerender = () => route({ keepScroll: true });

// ---------- 헤더 ----------
function renderHeader() {
  const u = S.user;
  const area = $("#authArea"), pill = $("#joinPill"), gnbJoin = $(".gnb-join");
  if (!u) {
    area.innerHTML = `<button class="login-link" id="loginBtn" type="button">로그인</button>`;
    $("#loginBtn").addEventListener("click", () => startLogin());
  } else {
    area.innerHTML = `
      <button class="avatar-btn" id="userBtn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="내 계정">${avatar(u.photo, u.name)}</button>
      <div class="user-menu" id="userMenu" role="menu">
        <div class="um-head">${avatar(u.photo, u.name, "lg")}<div><b>${esc(u.name)}</b><small>${esc(u.email)}</small><div class="mt-s">${roleChip(u.role)}</div></div></div>
        <a href="#mypage" role="menuitem">${icon("user")} 마이페이지 · 테마</a>
        ${isAdmin() ? `<a href="#admin" role="menuitem">${icon("shield")} 관리자 페이지</a>` : ""}
        <a href="#join" role="menuitem">${icon("check")} 가입 신청 / 결과 확인</a>
        ${isDemo() ? `<button type="button" data-switch role="menuitem">${icon("users")} 다른 데모 계정으로 바꾸기</button>` : ""}
        <button type="button" data-logout role="menuitem">${icon("logout")} 로그아웃</button>
      </div>`;
    const btn = $("#userBtn"), menu = $("#userMenu");
    btn.addEventListener("click", (e) => { e.stopPropagation(); const open = !menu.classList.contains("open"); menu.classList.toggle("open", open); btn.setAttribute("aria-expanded", open); });
    menu.addEventListener("click", (e) => e.stopPropagation());
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => menu.classList.remove("open")));
    menu.querySelector("[data-logout]").addEventListener("click", async () => {
      menu.classList.remove("open");
      try { await S.api.signOut(); toast("로그아웃했어요."); } catch (e) { toast(errMsg(e), "err"); }
    });
    menu.querySelector("[data-switch]")?.addEventListener("click", () => { menu.classList.remove("open"); demoPicker(); });
  }
  const [label, href] = isAdmin() ? ["관리자", "#admin"] : ["가입하기", "#join"];
  pill.hidden = false; pill.href = href; pill.querySelector("span").textContent = label;
  gnbJoin.href = href; gnbJoin.textContent = isAdmin() ? "관리자 페이지" : "가입 신청"; gnbJoin.dataset.nav = href.slice(1);
}
S.refreshHeader = renderHeader;
document.addEventListener("click", () => $("#userMenu")?.classList.remove("open"));

function onScroll() { header.classList.toggle("scrolled", window.scrollY > 40); }
window.addEventListener("scroll", onScroll, { passive: true });
function closeMenu() { header.classList.remove("menu-open"); $("#menuBtn").setAttribute("aria-expanded", "false"); }
$("#menuBtn").addEventListener("click", () => {
  const open = !header.classList.contains("menu-open");
  header.classList.toggle("menu-open", open);
  $("#menuBtn").setAttribute("aria-expanded", open);
});
$("#gnb").addEventListener("click", (e) => { if (e.target.closest("a")) closeMenu(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

// ---------- 로그인 (구글 + 이메일) ----------
const GOOGLE_G = `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

async function startLogin() {
  if (isDemo()) return demoPicker();
  const ia = inAppBrowser();
  let mode = "login";
  modal({
    title: "로그인",
    body: `
      ${ia ? `<div class="notice-box" style="margin-bottom:14px"><span>카카오톡 등 앱 안의 브라우저에서는 <b>구글 로그인</b>이 막혀 있어요. 이메일로 로그인하거나 외부 브라우저로 열어 주세요.</span>${ia === "kakao" ? `<a class="btn sm" href="kakaotalk://web/openExternal?url=${encodeURIComponent(location.href)}">외부 브라우저로 열기</a>` : ""}</div>` : ""}
      <button class="google-btn" id="lgGoogle" type="button" style="width:100%;justify-content:center">${GOOGLE_G} Google로 로그인</button>
      <p class="text-dim" style="text-align:center;font-size:13px;margin:16px 0 12px">또는 이메일로 <span id="lgModeText">로그인</span></p>
      <form class="form" id="lgForm" novalidate>
        <div class="field" id="lgNameF" hidden><label for="lgName">이름</label><input type="text" id="lgName" maxlength="20" autocomplete="name"></div>
        <div class="field"><label for="lgEmail">이메일</label><input type="email" id="lgEmail" autocomplete="email" placeholder="example@email.com"></div>
        <div class="field"><label for="lgPw">비밀번호 <span class="text-dim" id="lgPwHint" style="font-weight:400" hidden>(6자 이상)</span></label><input type="password" id="lgPw" autocomplete="current-password"></div>
        <button class="btn primary" type="submit" id="lgSubmit" style="width:100%">로그인</button>
      </form>
      <p class="text-dim" style="text-align:center;font-size:13.5px;margin-top:14px"><span id="lgSwitchText">계정이 없으신가요?</span> <button class="btn sm ghost" id="lgSwitch" type="button" style="color:var(--accent)">회원가입</button> · <button class="btn sm ghost" id="lgReset" type="button">비밀번호 찾기</button></p>`,
    onMount(el, ctl) {
      const setMode = (m) => {
        mode = m;
        const signup = m === "signup";
        $("#lgNameF", el).hidden = !signup; $("#lgPwHint", el).hidden = !signup;
        $("#lgModeText", el).textContent = signup ? "회원가입" : "로그인";
        $("#lgSubmit", el).textContent = signup ? "가입하기" : "로그인";
        $("#lgSwitchText", el).textContent = signup ? "이미 계정이 있으신가요?" : "계정이 없으신가요?";
        $("#lgSwitch", el).textContent = signup ? "로그인" : "회원가입";
        $("#lgPw", el).autocomplete = signup ? "new-password" : "current-password";
      };
      $("#lgSwitch", el).addEventListener("click", () => setMode(mode === "login" ? "signup" : "login"));
      $("#lgGoogle", el).addEventListener("click", async () => {
        try { await S.api.signIn(); ctl.close(); } catch (e) { toast(errMsg(e), "err"); }
      });
      $("#lgReset", el).addEventListener("click", async () => {
        const email = $("#lgEmail", el).value.trim();
        if (!email) return toast("비밀번호를 찾을 이메일을 먼저 입력해 주세요.", "err");
        try { await S.api.resetPassword(email); toast("비밀번호 재설정 메일을 보냈어요.", "ok"); } catch (e) { toast(errMsg(e), "err"); }
      });
      $("#lgForm", el).addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = $("#lgEmail", el).value.trim(), pw = $("#lgPw", el).value, name = $("#lgName", el).value.trim();
        if (!email || !pw) return toast("이메일과 비밀번호를 입력해 주세요.", "err");
        if (mode === "signup" && pw.length < 6) return toast("비밀번호는 6자 이상이어야 해요.", "err");
        const btn = $("#lgSubmit", el);
        setBtnBusy(btn, true); ctl.setBusy(true);
        try {
          if (mode === "signup") await S.api.signUpEmail(email, pw, name);
          else await S.api.signInEmail(email, pw);
          ctl.setBusy(false); ctl.close();
          toast(mode === "signup" ? "가입을 완료했어요. 받은편지함의 인증 메일도 확인해 주세요." : "로그인했어요.", "ok");
        } catch (err) { toast(errMsg(err), "err"); setBtnBusy(btn, false); ctl.setBusy(false); }
      });
    }
  });
}
S.login = startLogin;

function demoPicker() {
  const ids = S.api.identities;
  modal({
    title: "데모 계정 선택",
    body: `<p class="msg" style="margin-bottom:16px">Firebase 설정이 없을 때만 보이는 체험용 데모예요.</p>
      <div class="demo-ids">${ids.map((d) => `<button type="button" data-uid="${esc(d.uid)}">${avatar("", d.name)}<span><b>${esc(d.name)}</b><small>${esc(d.desc)}</small></span>${roleChip(d.role)}</button>`).join("")}</div>`,
    onMount(el, ctl) {
      el.querySelectorAll("[data-uid]").forEach((b) => b.addEventListener("click", async () => {
        ctl.close();
        await S.api.demoSignIn(b.dataset.uid);
        toast(`${b.querySelector("b").textContent} 님으로 로그인했어요.`, "ok");
      }));
    }
  });
}

// ---------- 상단 알림 배너 (config/site_banner) ----------
const BAR_LS = "astro_banner";
async function loadSiteBar() {
  $("#siteBar")?.remove();
  document.body.classList.remove("has-bar");
  let d;
  try { d = await S.api.get("config", "site_banner"); } catch { return; }
  if (!d || !d.active || !d.message) return;
  const bid = String(d.updatedAt || "x");
  try { const until = +localStorage.getItem(`${BAR_LS}_${bid}`); if (until && Date.now() < until) return; } catch { /* noop */ }
  const type = ["info", "warning", "danger"].includes(d.type) ? d.type : "info";
  const bar = document.createElement("div");
  bar.id = "siteBar";
  bar.className = `site-bar bar-${type}`;
  bar.setAttribute("role", "status");
  bar.innerHTML = `<span class="bar-msg">${icon(type === "info" ? "megaphone" : "shield")}<span>${esc(d.message)}</span></span>
    <span class="bar-acts">${d.dismissible !== false ? `<button type="button" data-today>오늘 하루 보지 않기</button>` : ""}<button type="button" data-x aria-label="닫기">${icon("close")}</button></span>`;
  document.body.prepend(bar);
  document.body.classList.add("has-bar");
  const hide = () => { bar.remove(); document.body.classList.remove("has-bar"); };
  bar.querySelector("[data-x]").addEventListener("click", hide);
  bar.querySelector("[data-today]")?.addEventListener("click", () => {
    const m = new Date(); m.setHours(23, 59, 59, 999);
    try { localStorage.setItem(`${BAR_LS}_${bid}`, String(m.getTime())); } catch { /* noop */ }
    hide();
  });
}
S.reloadSiteBar = loadSiteBar;

function demoPill() {
  const b = document.createElement("button");
  b.className = "demo-pill"; b.type = "button"; b.innerHTML = `<i></i>DEMO MODE`;
  b.addEventListener("click", async () => {
    if (!(await confirmDialog("Firebase 설정이 비어 있어 데모 모드로 실행 중이에요.\n데모 데이터를 처음 상태로 되돌릴까요?", { okText: "초기화", danger: true }))) return;
    S.api.reset();
    await Promise.all([loadSite(), loadBanners(), loadQuestions()]);
    route();
  });
  document.body.appendChild(b);
}

// ---------- 부팅 ----------
async function boot() {
  applyTheme(currentTheme(), false);
  $("#year").textContent = new Date().getFullYear();
  try {
    S.api = await createBackend();
  } catch (e) {
    console.error(e);
    app.innerHTML = `<section class="page" style="padding-top:140px;min-height:100vh"><div class="wrap"><div class="panel guard"><h2>Firebase에 연결하지 못했어요</h2><p class="text-dim mt-s">${esc(errMsg(e))}</p></div></div></section>`;
    return;
  }
  S.api.onAuthError((e) => toast(errMsg(e), "err"));
  let first = true, firstResolve;
  const firstAuth = new Promise((r) => (firstResolve = r));
  S.api.onAuth((u) => {
    const prev = S.user ? `${S.user.uid}:${S.user.role}` : "";
    S.user = u;
    if (u && u.theme && u.theme !== currentTheme()) applyTheme(u.theme);
    renderHeader();
    if (first) { first = false; firstResolve(); return; }
    if (prev !== (u ? `${u.uid}:${u.role}` : "")) route({ keepScroll: true });
  });
  await Promise.all([loadSite(), loadBanners(), loadQuestions(), firstAuth]);
  $("#footerText").textContent = S.site.footerText || "북일고등학교 항공우주·기계공학 동아리 ASTRO";
  if (isDemo()) demoPill();
  loadSiteBar();
  window.addEventListener("hashchange", () => route());
  await route();
}
boot();
