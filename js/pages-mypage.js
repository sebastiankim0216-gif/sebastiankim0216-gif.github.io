// 마이페이지: 내 정보 · 화면 테마 · 내가 쓴 글
import { S, isAdmin, normActivity, loadQuestions } from "./state.js?v=202611261642";
import { findMyApplication, APP_STATUS } from "./pages-main.js?v=202611261642";
import { THEMES } from "./config.js?v=202611261642";
import { applyTheme, currentTheme } from "./theme.js?v=202611261642";
import { $, esc, icon, avatar, roleChip, loading, pageHero, secHead, toast, errMsg, fmtDate, fmtYmd } from "./ui.js?v=202611261642";

export async function renderMypage(app) {
  const u = S.user;
  app.innerHTML = `
  ${pageHero({ en: "MY PAGE", ko: "마이페이지", desc: "내 정보와 화면 테마를 설정해요.", bg: "assets/hero-day.jpg" })}
  <section class="page"><div class="wrap my-layout">
    <aside class="panel hudc profile">
      ${u ? `
        ${avatar(u.photo, u.name, "xl")}
        <h2>${esc(u.name)}</h2>
        <p class="email">${esc(u.email)}</p>
        <div class="roles">${roleChip(u.role)}${u.verified === false ? `<span class="chip pending">이메일 인증 전</span>` : ""}</div>
        ${u.verified === false ? `<p class="hint mt-s">받은 인증 메일의 링크를 누른 뒤 다시 로그인하면 인증돼요. 관리자 권한은 인증된 계정에만 적용돼요.</p>` : ""}
        <div class="links">
          ${isAdmin() ? `<a class="btn" href="#admin">${icon("shield")} 관리자 페이지</a>` : ""}
          <a class="btn" href="#activity">${icon("calendar")} 활동 달력</a>
          <button class="btn" id="myLogout" type="button">${icon("logout")} 로그아웃</button>
        </div>`
      : `
        <div class="status-ico">${icon("user")}</div>
        <h2>로그인해 주세요</h2>
        <p class="email">로그인하면 내 정보와 작성한 글을 볼 수 있고,<br>고른 테마가 계정에 저장돼요.</p>
        <div class="links"><button class="btn primary" id="myLogin" type="button">로그인</button></div>`}
    </aside>
    <div>
      ${u ? `<div class="panel" id="myApp"><div class="panel-head"><h3>APPLY <small>가입 신청</small></h3><a class="more" href="#join">신청 페이지 ${icon("right")}</a></div><div id="myAppBody">${loading()}</div></div>` : ""}
      <div class="panel">
        ${secHead("THEME", "화면 테마", "", u ? "고르는 즉시 바뀌고, 내 계정에도 저장돼서 다른 기기에서도 같은 테마로 보여요." : "고르는 즉시 바뀌고, 이 브라우저에 저장돼요.")}
        <div class="theme-opts" role="radiogroup" aria-label="화면 테마">
          ${THEMES.map((t) => `
            <label class="theme-opt">
              <input type="radio" name="theme" value="${esc(t.id)}" ${t.id === currentTheme() ? "checked" : ""}>
              <span class="tp" style="--a:${t.swatch[0]};--b:${t.swatch[1]};--c:${t.swatch[2]};--d:${t.swatch[3]}" aria-hidden="true"><i></i><i></i><i></i></span>
              <span><span class="tn">${esc(t.name)}<span class="ok">${icon("check")}</span></span><small>${esc(t.desc)}${t.id === THEMES[0].id ? " · 기본" : ""}</small></span>
            </label>`).join("")}
        </div>
      </div>
      ${u ? `<div class="grid-2 mt-m">
        <div class="panel"><div class="panel-head"><h3>POSTS <small>내가 쓴 글</small></h3><a class="more" href="#community">커뮤니티 ${icon("right")}</a></div><ul class="my-list" id="myPosts">${loading()}</ul></div>
        <div class="panel" style="margin-top:0"><div class="panel-head"><h3>ACTIVITY <small>${isAdmin() ? "내가 올린 활동" : "활동 기록"}</small></h3><a class="more" href="#activity">달력 ${icon("right")}</a></div><ul class="my-list" id="myActs">${loading()}</ul></div>
      </div>` : ""}
    </div>
  </div></section>`;

  $("#myLogin")?.addEventListener("click", () => S.login());
  $("#myLogout")?.addEventListener("click", async () => {
    try { await S.api.signOut(); toast("로그아웃했어요."); } catch (e) { toast(errMsg(e), "err"); }
  });

  app.querySelectorAll('input[name="theme"]').forEach((r) => r.addEventListener("change", async () => {
    const id = applyTheme(r.value);
    const name = THEMES.find((t) => t.id === id)?.name || id;
    if (S.user) {
      try {
        if (S.api.saveTheme) await S.api.saveTheme(id);
        S.user.theme = id;
      } catch (e) { console.warn("theme save", e); }
    }
    toast(`${name} 테마로 바꿨어요.`, "ok");
  }));

  if (!u) return;
  const [myApp, posts, acts] = await Promise.all([
    findMyApplication().catch(() => null),
    S.api.list("community_posts", { where: [["authorEmail", "==", u.email]] }).catch(() => []),
    isAdmin() ? S.api.list("activity_posts", { where: [["authorEmail", "==", u.email]] }).then((l) => l.map(normActivity)).catch(() => []) : Promise.resolve([])
  ]);
  const pl = $("#myPosts"), al = $("#myActs"), ab = $("#myAppBody");
  if (!pl) return;
  if (ab) {
    if (!myApp) ab.innerHTML = `<p class="text-dim" style="padding:8px 2px">가입 신청 내역이 없어요. <a class="more" href="#join">가입 신청하기 ${icon("right")}</a></p>`;
    else {
      const st = APP_STATUS[myApp.status || "pending"];
      ab.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:6px 2px">
        <div><span class="chip ${st.cls}" style="font-size:13.5px;height:28px;padding:0 12px">${st.label}</span> <b style="margin-left:6px">${esc(myApp.name || "")}</b> <span class="text-dim" style="font-size:14px">· ${esc(myApp.studentId || "")} · ${fmtDate(myApp.createdAt)} 제출</span></div>
        <a class="btn sm" href="#join">${myApp.status === "pending" || !myApp.status ? `${icon("edit")} 수정 · 확인` : `${icon("eye")} 결과 보기`}</a></div>`;
    }
  }
  posts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  acts.sort((a, b) => (b.date > a.date ? 1 : -1));
  pl.innerHTML = posts.slice(0, 6).map((p) => `<li><a href="#community-${esc(p.id)}"><span class="chip">${esc(p.category || "자유")}</span><span class="t">${esc(p.title)}</span><span class="d">${fmtDate(p.createdAt)}</span></a></li>`).join("")
    || `<li class="text-dim" style="padding:14px 2px">아직 쓴 글이 없어요.</li>`;
  al.innerHTML = acts.slice(0, 6).map((a) => `<li><a href="#activity-${esc(a.id)}"><span class="chip">${icon("calendar")}${esc(fmtYmd(a.date, false))}</span><span class="t">${esc(a.title)}</span><span class="d">${(a.media || []).length ? `${icon("image")} ${(a.media || []).length}` : ""}</span></a></li>`).join("")
    || `<li class="text-dim" style="padding:14px 2px">${isAdmin() ? "아직 올린 활동이 없어요." : "활동 기록은 관리자가 올려요. 달력에서 확인해 보세요."}</li>`;
}
