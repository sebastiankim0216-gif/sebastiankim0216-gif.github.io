// ASTRO 웹사이트 — 진입점: 부팅, 라우터, 헤더, 로그인
import { S, isAdmin, isMember, loadSite, loadBanners, isDemo } from "./state.js";
import { $, $$, esc, icon, avatar, roleChip, toast, errMsg, modal, attachHud, inAppBrowser, confirmDialog } from "./ui.js";
import { createBackend } from "./backend.js";
import { renderHome, renderAbout, renderNotice, renderCommunity, renderJoin } from "./pages-main.js";
import { renderActivity, renderGallery } from "./pages-activity.js";
import { renderAdmin } from "./pages-admin.js";

const ROUTES = {
  home: renderHome,
  about: renderAbout,
  activity: renderActivity,
  gallery: renderGallery,
  notice: renderNotice,
  community: renderCommunity,
  join: renderJoin,
  admin: renderAdmin
};
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
  document.title = ({ home: "", about: "소개 · ", activity: "활동 · ", gallery: "갤러리 · ", notice: "공지사항 · ", community: "커뮤니티 · ", join: "가입하기 · ", admin: "관리자 · " }[page] || "") + "ASTRO · 북일고 천체관측 동아리";
  const y = window.scrollY;
  try {
    await ROUTES[page](app, id);
  } catch (e) {
    console.error(e);
    app.innerHTML = `<section class="page" style="padding-top:140px"><div class="wrap"><div class="panel guard">${icon("x")}<h2 class="mt-s">페이지를 불러오지 못했어요</h2><p class="text-dim mt-s">${esc(errMsg(e))}</p><div class="acts"><a class="btn" href="#home">홈으로</a></div></div></div></section>`;
  }
  attachHud(app);
  if (keepScroll && sameView) window.scrollTo(0, y);
  else window.scrollTo(0, 0);
  onScroll();
}
S.rerender = () => route({ keepScroll: true });

// ---------- 헤더 ----------
function renderHeader() {
  const u = S.user;
  const area = $("#authArea");
  const pill = $("#joinPill");
  const gnbJoin = $(".gnb-join");
  if (!u) {
    area.innerHTML = `<button class="login-link" id="loginBtn" type="button">로그인</button>`;
    $("#loginBtn").addEventListener("click", () => startLogin());
  } else {
    area.innerHTML = `
      <button class="avatar-btn" id="userBtn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="내 계정">${avatar(u.photo, u.realName || u.name)}</button>
      <div class="user-menu" id="userMenu" role="menu">
        <div class="um-head">${avatar(u.photo, u.realName || u.name, "lg")}<div><b>${esc(u.realName || u.name)}</b><small>${esc(u.email)}</small><div class="mt-s">${roleChip(u.role)}</div></div></div>
        ${isAdmin() ? `<a href="#admin" role="menuitem">${icon("shield")} 관리자 페이지</a>` : ""}
        ${!isMember() ? `<a href="#join" role="menuitem">${icon("user")} 가입 신청 현황</a>` : ""}
        <a href="#community" role="menuitem">${icon("comment")} 커뮤니티</a>
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
  // 가입하기 버튼: 비회원/일반 → 가입하기, 관리자 → 관리자, 부원 → 숨김
  const [label, href, show] = isAdmin() ? ["관리자", "#admin", true] : isMember() ? ["", "", false] : ["가입하기", "#join", true];
  pill.hidden = !show;
  gnbJoin.style.display = show ? "" : "none";
  if (show) {
    pill.href = href; pill.querySelector("span").textContent = label;
    gnbJoin.href = href; gnbJoin.textContent = isAdmin() ? "관리자 페이지" : label;
    gnbJoin.dataset.nav = href.slice(1);
  }
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

// ---------- 로그인 ----------
async function startLogin() {
  if (isDemo()) return demoPicker();
  const ia = inAppBrowser();
  if (ia) {
    const url = location.href;
    modal({
      title: "외부 브라우저에서 열어 주세요",
      body: `<p class="msg">카카오톡·인스타그램 같은 앱 안의 브라우저에서는 구글이 로그인을 막고 있어요.<br>오른쪽 위 메뉴(⋮)에서 <b>다른 브라우저로 열기</b>를 누르거나, 아래 버튼을 눌러 크롬·사파리에서 열어 주세요.</p>`,
      foot: `${ia === "kakao" ? `<a class="btn primary" href="kakaotalk://web/openExternal?url=${encodeURIComponent(url)}">외부 브라우저로 열기</a>` : ""}<button class="btn" data-copy>주소 복사</button><button class="btn ghost" data-close>닫기</button>`,
      onMount(el) {
        el.querySelector("[data-copy]").addEventListener("click", async () => {
          try { await navigator.clipboard.writeText(url); toast("주소를 복사했어요. 브라우저에 붙여넣어 주세요.", "ok"); } catch { toast(url); }
        });
      }
    });
    return;
  }
  try { await S.api.signIn(); } catch (e) { console.error(e); toast(errMsg(e), "err"); }
}
S.login = startLogin;

function demoPicker() {
  const ids = S.api.identities;
  modal({
    title: "데모 계정 선택",
    body: `<p class="msg" style="margin-bottom:16px">Firebase를 연결하기 전 체험용 데모예요. 실제 사이트에서는 이 자리에 <b>구글 계정 로그인</b> 창이 뜹니다.</p>
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

function demoPill() {
  const b = document.createElement("button");
  b.className = "demo-pill";
  b.type = "button";
  b.innerHTML = `<i></i>DEMO MODE`;
  b.addEventListener("click", () => {
    modal({
      title: "데모 모드로 실행 중",
      body: `<p class="msg">아직 <b>js/config.js</b>에 Firebase 설정이 없어서, 모든 데이터가 <b>이 브라우저에만</b> 저장되는 체험 모드로 실행되고 있어요. 다른 사람에게는 보이지 않아요.</p>
        <p class="msg mt-s">Firebase 설정값을 넣으면 구글 로그인, 실시간 데이터베이스, 사진·동영상 저장소가 실제로 동작합니다. (README.md 참고)</p>
        ${S.api.memoryOnly ? `<p class="msg mt-s" style="color:var(--gold)">브라우저 저장 공간이 가득 차서 지금부터 올리는 내용은 새로고침하면 사라져요.</p>` : ""}`,
      foot: `<button class="btn" data-reset>${icon("trash")} 데모 데이터 초기화</button><button class="btn" data-sw>${icon("users")} 데모 계정 바꾸기</button><button class="btn primary" data-close>확인</button>`,
      onMount(el, ctl) {
        el.parentElement.querySelector("[data-sw]").addEventListener("click", () => { ctl.close(); demoPicker(); });
        el.parentElement.querySelector("[data-reset]").addEventListener("click", async () => {
          if (!(await confirmDialog("데모 데이터를 처음 상태로 되돌릴까요?", { danger: true, okText: "초기화" }))) return;
          S.api.reset();
          ctl.close();
          await Promise.all([loadSite(), loadBanners()]);
          await S.api.reloadMe();
          toast("데모 데이터를 초기화했어요.", "ok");
          route();
        });
      }
    });
  });
  document.body.appendChild(b);
}

// ---------- 부팅 ----------
async function boot() {
  $("#year").textContent = new Date().getFullYear();
  try {
    S.api = await createBackend();
  } catch (e) {
    console.error(e);
    app.innerHTML = `<section class="page" style="padding-top:140px;min-height:100vh"><div class="wrap"><div class="panel guard"><h2>Firebase에 연결하지 못했어요</h2><p class="text-dim mt-s">${esc(errMsg(e))}</p><p class="text-dim mt-s">js/config.js 의 설정값과 인터넷 연결을 확인해 주세요.</p></div></div></section>`;
    return;
  }
  S.api.onAuthError((e) => toast(errMsg(e), "err"));
  let first = true;
  let firstResolve;
  const firstAuth = new Promise((r) => (firstResolve = r));
  S.api.onAuth((u) => {
    const prevRole = S.user?.role, prevUid = S.user?.uid;
    S.user = u;
    renderHeader();
    if (first) { first = false; firstResolve(); return; }
    if (prevUid !== u?.uid || prevRole !== u?.role) route({ keepScroll: true });
  });
  await Promise.all([loadSite(), loadBanners(), firstAuth]);
  $("#footerText").textContent = S.site.footerText || "북일고등학교 천체관측 동아리";
  if (isDemo()) demoPill();
  window.addEventListener("hashchange", () => route());
  await route();
}
boot();
