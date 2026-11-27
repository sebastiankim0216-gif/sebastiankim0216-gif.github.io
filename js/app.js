// ASTRO 웹사이트 — 진입점: 부팅, 라우터, 헤더, 로그인 이동, 운영담당자 콘솔, 상단 알림
import { S, isAdmin, loadSite, loadBanners, loadQuestions, isDemo, loadOwners, saveOwners, sha256 } from "./state.js?v=202611271625";
import { CONSOLE_HASHES, CONSOLE_STAGE1_LENGTH, CONSOLE_KEYPAD } from "./config.js?v=202611271625";
import { $, $$, esc, icon, avatar, roleChip, toast, errMsg, modal, attachHud, confirmDialog, setBtnBusy } from "./ui.js?v=202611271625";
import { createBackend } from "./backend.js?v=202611271625";
import { renderHome, renderAbout, renderNotice, renderCommunity, renderJoin } from "./pages-main.js?v=202611271625";
import { renderActivity, renderGallery } from "./pages-activity.js?v=202611271625";
import { renderAdmin } from "./pages-admin.js?v=202611271625";
import { renderMypage } from "./pages-mypage.js?v=202611271625";
import { renderPortfolio } from "./pages-portfolio.js?v=202611271625";
import { renderLogin, renderSignup, renderTerms, renderPrivacy, renderBanned } from "./pages-auth.js?v=202611271625";
import { applyTheme } from "./theme.js?v=202611271625";

const ROUTES = {
  home: renderHome, about: renderAbout, activity: renderActivity, portfolio: renderPortfolio, gallery: renderGallery,
  notice: renderNotice, community: renderCommunity, join: renderJoin, admin: renderAdmin, mypage: renderMypage,
  login: renderLogin, signup: renderSignup, terms: renderTerms, privacy: renderPrivacy
};
const TITLES = { about: "소개", activity: "활동", portfolio: "포트폴리오", gallery: "갤러리", notice: "공지사항", community: "커뮤니티", join: "가입 신청", admin: "관리자", mypage: "마이페이지", login: "로그인", signup: "회원가입", terms: "이용약관", privacy: "개인정보처리방침" };
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
    if (S.user?.banned) renderBanned(app);                                   // 이용 제한
    else if (S.user && !S.user.consented && !S.pendingSignup && !["signup", "terms", "privacy"].includes(page)) {
      if (!S.afterLogin) S.afterLogin = location.hash || "#home";
      await renderSignup(app);                                               // 가입 동의 마무리
    } else await ROUTES[page](app, id);
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
        <a href="#mypage" role="menuitem">${icon("user")} 마이페이지</a>
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
  const mobJoin = $("#mobJoin");
  if (mobJoin) { mobJoin.href = href; mobJoin.textContent = isAdmin() ? "관리자" : "가입"; }
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

// ---------- 로그인 페이지로 이동 ----------
function startLogin() {
  if (isDemo()) return demoPicker();
  const h = location.hash;
  if (!/^#(login|signup)/.test(h)) S.afterLogin = h || "#home";
  location.hash = "#login";
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
S.demoPicker = demoPicker;

// ---------- 운영담당자 지정 콘솔 (홈 화면 · 3단계 확인) ----------
let keyBuf = "";
document.addEventListener("keydown", async (e) => {
  if (parseHash().page !== "home" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target && e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
  if (document.querySelector(".modal-backdrop, .lightbox")) return;
  if (!/^[0-9]$/.test(e.key)) { if (e.key.length === 1) keyBuf = ""; return; }
  keyBuf = (keyBuf + e.key).slice(-CONSOLE_STAGE1_LENGTH);
  if (keyBuf.length === CONSOLE_STAGE1_LENGTH && (await sha256(keyBuf)) === CONSOLE_HASHES.stage1) { const s1 = keyBuf; keyBuf = ""; stage2(s1); }
});
let taps = [];
document.addEventListener("click", (e) => {
  if (parseHash().page !== "home" || !e.target.closest(".site-header .logo, .corner-star")) return;
  const now = Date.now();
  taps = [...taps.filter((t) => now - t < 2500), now];
  if (taps.length >= 5) { taps = []; stage1Prompt(); }
});
function passwordModal(title, label, onOk) {
  modal({
    title,
    body: `<form id="pwF" class="form"><div class="field"><label for="pwIn">${esc(label)}</label><input type="password" id="pwIn" inputmode="numeric" autocomplete="off"></div></form>`,
    foot: `<button class="btn" data-close>취소</button><button class="btn primary" id="pwGo">확인</button>`,
    onMount(el, ctl) {
      const go = async () => { const v = $("#pwIn", el).value; if (await onOk(v)) ctl.close(); else { toast("비밀번호가 맞지 않아요.", "err"); $("#pwIn", el).value = ""; } };
      el.parentElement.querySelector("#pwGo").addEventListener("click", go);
      $("#pwF", el).addEventListener("submit", (e) => { e.preventDefault(); go(); });
    }
  });
}
function stage1Prompt() {
  passwordModal("비밀번호", "비밀번호", async (v) => {
    if ((await sha256(v)) !== CONSOLE_HASHES.stage1) return false;
    setTimeout(() => stage2(v), 0); return true;
  });
}
function stage2(s1) {
  passwordModal("비밀번호 패널", "2차 비밀번호", async (v) => {
    if ((await sha256(v)) !== CONSOLE_HASHES.stage2) return false;
    setTimeout(() => stage3(s1, v), 0); return true;
  });
}
function stage3(s1, s2) {
  const keys = CONSOLE_KEYPAD.slice().sort(() => Math.random() - 0.5);
  let typed = [];
  modal({
    title: "키패드",
    body: `<div class="keypad-out" id="kpOut" aria-live="polite"></div>
      <div class="keypad">${keys.map((k) => `<button type="button" data-k="${esc(k)}">${esc(k)}</button>`).join("")}
        <button type="button" data-del class="kp-fn">${icon("back")}</button><button type="button" data-clear class="kp-fn">지움</button><button type="button" data-ok class="kp-fn kp-ok">확인</button></div>`,
    onMount(el, ctl) {
      const out = $("#kpOut", el);
      const draw = () => { out.textContent = typed.length ? "●".repeat(typed.length) : "키패드로 입력하세요"; };
      draw();
      el.querySelector(".keypad").addEventListener("click", async (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.k) { if (typed.length < 8) typed.push(b.dataset.k); return draw(); }
        if (b.dataset.del != null) { typed.pop(); return draw(); }
        if (b.dataset.clear != null) { typed = []; return draw(); }
        if (b.dataset.ok != null) {
          if (!S.user && !isDemo()) return toast("먼저 로그인해 주세요.", "err");
          const secret = `${s1}|${s2}|${typed.join("")}`;
          setBtnBusy(b, true);
          let ok = false;
          try { ok = await S.api.ownerProbe(secret); } catch (err) { toast(errMsg(err), "err"); }
          setBtnBusy(b, false);
          if (!ok) { typed = []; draw(); return toast("확인에 실패했어요.", "err"); }
          ctl.close();
          ownerConsole(secret);
        }
      });
    }
  });
}
async function ownerConsole(secret) {
  try { await loadOwners(); } catch { /* 빈 목록 */ }
  // 콘솔을 열 때마다 운영담당자 목록을 서버(Firebase·Supabase)에 다시 맞춰 둠
  if (S.owners.length) { try { await saveOwners(secret, S.owners); } catch (e) { console.warn("owners sync", e); } }
  modal({
    title: "운영담당자 지정 콘솔",
    body: `<p class="msg">운영담당자는 사이트의 모든 관리 권한을 가져요. 구글 계정이나 인증된 이메일 계정으로 로그인했을 때 적용돼요.</p>
      <ul class="my-list mt-m" id="ocList"></ul>
      <form id="ocForm" class="cmt-form mt-m" novalidate><label class="sr" for="ocEmail">임명할 이메일</label><input type="email" id="ocEmail" placeholder="임명할 이메일 (예: name@gmail.com)"><button class="btn primary" type="submit">${icon("plus")} 임명</button></form>`,
    foot: `<button class="btn primary" data-close>닫기</button>`,
    onMount(el) {
      const valid = (m) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m);
      const save = async (list, msg) => {
        try { await saveOwners(secret, list); toast(msg, "ok"); draw(); }
        catch (err) { toast(errMsg(err), "err"); }
      };
      const draw = (editIdx = -1) => {
        const ul = $("#ocList", el);
        ul.innerHTML = S.owners.length ? S.owners.map((m, i) => i === editIdx
          ? `<li><a style="grid-template-columns:minmax(0,1fr) auto"><input type="email" id="ocEdit" value="${esc(m)}"><span style="display:flex;gap:6px"><button class="btn sm primary" data-save="${i}">저장</button><button class="btn sm" data-cancel>취소</button></span></a></li>`
          : `<li><a><span class="role admin">운영담당자</span><span class="t">${esc(m)}</span><span style="display:flex;gap:6px"><button class="btn sm" data-edit="${i}">${icon("edit")} 수정</button><button class="btn sm danger" data-del="${i}">해제</button></span></a></li>`).join("")
          : `<li class="text-dim" style="padding:12px 2px">아직 운영담당자가 없어요. 아래에 이메일을 입력해 임명해 주세요.</li>`;
        $("#ocEdit", el)?.focus();
      };
      $("#ocList", el).addEventListener("click", async (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.edit) return draw(+b.dataset.edit);
        if (b.dataset.cancel != null) return draw();
        if (b.dataset.save) {
          const v = $("#ocEdit", el).value.trim().toLowerCase();
          if (!valid(v)) return toast("올바른 이메일을 입력해 주세요.", "err");
          const list = S.owners.slice(); list[+b.dataset.save] = v;
          return save(list, "운영담당자 이메일을 수정했어요.");
        }
        if (b.dataset.del) {
          const m = S.owners[+b.dataset.del];
          if (!(await confirmDialog(`${m} 의 운영담당자 권한을 해제할까요?${S.owners.length === 1 ? "\n마지막 운영담당자예요." : ""}`, { danger: true, okText: "해제" }))) return;
          return save(S.owners.filter((x) => x !== m), "운영담당자를 해제했어요.");
        }
      });
      $("#ocForm", el).addEventListener("submit", (e) => {
        e.preventDefault();
        const v = $("#ocEmail", el).value.trim().toLowerCase();
        if (!valid(v)) return toast("올바른 이메일을 입력해 주세요.", "err");
        if (S.owners.includes(v)) return toast("이미 운영담당자예요.", "err");
        $("#ocEmail", el).value = "";
        save([...S.owners, v], `${v} 을(를) 운영담당자로 임명했어요.`);
      });
      draw();
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
    await Promise.all([loadSite(), loadBanners(), loadQuestions(), loadOwners()]);
    route();
  });
  document.body.appendChild(b);
}

// ---------- 부팅 ----------
async function boot() {
  applyTheme((() => { try { return localStorage.getItem("astro-theme"); } catch { return null; } })() || "white", false);
  $("#year").textContent = new Date().getFullYear();
  try {
    S.api = await createBackend();
  } catch (e) {
    console.error(e);
    app.innerHTML = `<section class="page" style="padding-top:140px;min-height:100vh"><div class="wrap"><div class="panel guard"><h2>서버에 연결하지 못했어요</h2><p class="text-dim mt-s">${esc(errMsg(e))}</p></div></div></section>`;
    return;
  }
  S.api.onAuthError((e) => toast(errMsg(e), "err"));
  let first = true, firstResolve;
  const firstAuth = new Promise((r) => (firstResolve = r));
  const sig = (u) => (u ? [u.uid, u.role, u.consented, u.banned, u.muted].join(":") : "");
  S.api.onAuth((u) => {
    const prev = sig(S.user);
    S.user = u;
    renderHeader();
    if (first) { first = false; firstResolve(); return; }
    if (prev !== sig(u)) {
      if (u && u.consented && /^#(login)/.test(location.hash)) { location.hash = S.afterLogin && !/^#(login|signup)/.test(S.afterLogin) ? S.afterLogin : "#home"; S.afterLogin = null; return; }
      route({ keepScroll: true });
    }
  });
  await Promise.all([loadSite(), loadBanners(), loadQuestions(), loadOwners(), firstAuth]);
  $("#footerText").textContent = S.site.footerText || "북일고등학교 항공우주·기계공학 동아리 ASTRO";
  if (isDemo()) demoPill();
  loadSiteBar();
  window.addEventListener("hashchange", () => route());
  await route();
}
boot();
