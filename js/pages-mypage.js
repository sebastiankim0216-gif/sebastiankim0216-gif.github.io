// 마이페이지: 내 정보 · 가입 신청 현황 · 내가 쓴 글 · 화면 테마 · 회원 탈퇴
import { S, isAdmin, normActivity, isMuted } from "./state.js?v=202611271625";
import { $, esc, icon, avatar, roleChip, loading, pageHero, toast, errMsg, fmtDate, fmtYmd, confirmDialog, modal, setBtnBusy } from "./ui.js?v=202611271625";
import { findMyApplication, APP_STATUS } from "./pages-main.js?v=202611271625";
import { THEMES } from "./config.js?v=202611271625";
import { applyTheme, currentTheme } from "./theme.js?v=202611271625";

export async function renderMypage(app) {
  const u = S.user;
  app.innerHTML = `
  ${pageHero({ en: "MY PAGE", ko: "마이페이지", desc: "내 정보와 활동을 확인해요.", bg: "assets/hero-day.jpg" })}
  <section class="page"><div class="wrap my-layout">
    <aside class="panel hudc profile">
      ${u ? `
        ${avatar(u.photo, u.name, "xl")}
        <h2>${esc(u.name)}</h2>
        <p class="email">${esc(u.email)}</p>
        <div class="roles">${roleChip(u.role)}${u.verified === false ? `<span class="chip pending">이메일 인증 전</span>` : ""}${isMuted() ? `<span class="chip rejected">글쓰기 제한</span>` : ""}</div>
        ${u.verified === false ? `<p class="hint mt-s">받은 인증 메일의 링크를 누른 뒤 다시 로그인하면 인증돼요. <button class="btn sm ghost" id="myVerify" type="button">인증 메일 다시 보내기</button></p>` : ""}
        <div class="links">
          ${isAdmin() ? `<a class="btn" href="#admin">${icon("shield")} 관리자 페이지</a>` : ""}
          <button class="btn" id="myName" type="button">${icon("edit")} 이름 바꾸기</button>
          <button class="btn" id="myLogout" type="button">${icon("logout")} 로그아웃</button>
          <button class="btn ghost" id="myLeave" type="button" style="color:var(--red)">회원 탈퇴</button>
        </div>`
      : `
        <div class="status-ico">${icon("user")}</div>
        <h2>로그인해 주세요</h2>
        <p class="email">로그인하면 내 정보와 작성한 글, 가입 신청 현황을 볼 수 있어요.</p>
        <div class="links"><button class="btn primary" id="myLogin" type="button">로그인</button><a class="btn" href="#signup">회원가입</a></div>`}
    </aside>
    <div>
      ${u ? `<div class="panel"><div class="panel-head"><h3>APPLY <small>가입 신청</small></h3><a class="more" href="#join">신청 페이지 ${icon("right")}</a></div><div id="myAppBody">${loading()}</div></div>
      <div class="grid-2 mt-m">
        <div class="panel"><div class="panel-head"><h3>POSTS <small>내가 쓴 글</small></h3><a class="more" href="#community">커뮤니티 ${icon("right")}</a></div><ul class="my-list" id="myPosts">${loading()}</ul></div>
        <div class="panel" style="margin-top:0"><div class="panel-head"><h3>ACTIVITY <small>${isAdmin() ? "내가 올린 활동" : "활동 기록"}</small></h3><a class="more" href="#activity">활동 ${icon("right")}</a></div><ul class="my-list" id="myActs">${loading()}</ul></div>
      </div>` : ""}
      <div class="panel${u ? " mt-m" : ""}" id="theme"><div class="panel-head"><h3>THEME <small>화면 테마</small></h3></div>
        <div class="theme-opts" role="radiogroup" aria-label="화면 테마">${THEMES.map((t) => `
          <label class="theme-opt"><input type="radio" name="mpTheme" value="${t.id}" ${currentTheme() === t.id ? "checked" : ""}>
            <span class="tp" style="--a:${t.swatch[0]};--b:${t.swatch[1]};--c:${t.swatch[2]};--d:${t.swatch[3]}"><i></i><i></i><i></i></span>
            <span class="tn">${esc(t.name)}<span class="ok">${icon("check")}</span></span><small>${esc(t.desc)}</small></label>`).join("")}
        </div>
        <p class="hint mt-s">테마는 이 기기의 브라우저에 저장돼요.</p>
      </div>
    </div>
  </div></section>`;
  app.querySelectorAll('input[name="mpTheme"]').forEach((r) => r.addEventListener("change", () => { applyTheme(r.value); toast(`${THEMES.find((t) => t.id === r.value)?.name || ""} 테마로 바꿨어요.`, "ok"); }));

  $("#myLogin")?.addEventListener("click", () => S.login());
  $("#myLogout")?.addEventListener("click", async () => { try { await S.api.signOut(); toast("로그아웃했어요."); } catch (e) { toast(errMsg(e), "err"); } });
  $("#myVerify")?.addEventListener("click", async () => { try { await S.api.sendVerification(); toast("인증 메일을 보냈어요.", "ok"); } catch (e) { toast(errMsg(e), "err"); } });
  $("#myName")?.addEventListener("click", () => {
    modal({
      title: "이름 바꾸기",
      body: `<form class="form" id="nmF"><div class="field"><label for="nmIn">이름</label><input type="text" id="nmIn" maxlength="20" value="${esc(u.name)}"></div></form>`,
      foot: `<button class="btn" data-close>취소</button><button class="btn primary" id="nmGo">저장</button>`,
      onMount(el, ctl) {
        const go = async () => {
          const name = $("#nmIn", el).value.trim();
          if (!name) return toast("이름을 입력해 주세요.", "err");
          try { await S.api.saveProfile({ name }); ctl.close(); toast("이름을 바꿨어요.", "ok"); S.rerender(); } catch (e) { toast(errMsg(e), "err"); }
        };
        el.parentElement.querySelector("#nmGo").addEventListener("click", go);
        $("#nmF", el).addEventListener("submit", (e) => { e.preventDefault(); go(); });
      }
    });
  });
  $("#myLeave")?.addEventListener("click", async () => {
    if (!(await confirmDialog("정말 탈퇴할까요?\n회원 정보가 바로 삭제되고 되돌릴 수 없어요.\n(이미 쓴 게시물과 제출한 지원서는 남아요. 지원서는 가입 신청 페이지에서 먼저 취소할 수 있어요.)", { danger: true, okText: "탈퇴하기" }))) return;
    try { await S.api.deleteAccount(); toast("탈퇴했어요. 그동안 고마웠어요."); location.hash = "#home"; }
    catch (e) {
      if (String(e.code || "").includes("requires-recent-login")) toast("보안을 위해 다시 로그인한 뒤 탈퇴해 주세요.", "err");
      else toast(errMsg(e), "err");
    }
  });

  if (!u) return;
  const [myApp, posts, acts] = await Promise.all([
    findMyApplication().catch(() => null),
    S.api.list("community_posts", { where: [["authorEmail", "==", u.email]] }).catch(() => []),
    isAdmin() ? S.api.list("activity_posts", { where: [["authorEmail", "==", u.email]] }).then((l) => l.map(normActivity)).catch(() => []) : Promise.resolve([])
  ]);
  const pl = $("#myPosts"), al = $("#myActs"), ab = $("#myAppBody");
  if (!pl) return;
  if (!myApp) ab.innerHTML = `<p class="text-dim" style="padding:8px 2px">가입 신청 내역이 없어요. <a class="more" href="#join">가입 신청하기 ${icon("right")}</a></p>`;
  else {
    const st = APP_STATUS[myApp.status || "pending"];
    ab.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:6px 2px">
      <div><span class="chip ${st.cls}" style="font-size:13.5px;height:28px;padding:0 12px">${st.label}</span> <b style="margin-left:6px">${esc(myApp.name || "")}</b> <span class="text-dim" style="font-size:14px">· ${esc(myApp.studentId || "")} · ${fmtDate(myApp.createdAt)} 제출</span></div>
      <a class="btn sm" href="#join">${myApp.status === "pending" || !myApp.status ? `${icon("edit")} 확인 · 수정` : `${icon("eye")} 결과 보기`}</a></div>`;
  }
  posts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  acts.sort((a, b) => (b.date > a.date ? 1 : -1));
  pl.innerHTML = posts.slice(0, 6).map((p) => `<li><a href="#community-${esc(p.id)}"><span class="chip">${esc(p.category || "자유")}</span><span class="t">${esc(p.title)}</span><span class="d">${fmtDate(p.createdAt)}</span></a></li>`).join("")
    || `<li class="text-dim" style="padding:14px 2px">아직 쓴 글이 없어요.</li>`;
  al.innerHTML = acts.slice(0, 6).map((a) => `<li><a href="#activity-${esc(a.id)}"><span class="chip">${icon("calendar")}${esc(fmtYmd(a.date, false))}</span><span class="t">${esc(a.title)}</span><span class="d">${(a.media || []).length ? `${icon("image")} ${(a.media || []).length}` : ""}</span></a></li>`).join("")
    || `<li class="text-dim" style="padding:14px 2px">${isAdmin() ? "아직 올린 활동이 없어요." : "활동 기록은 관리자가 올려요. 활동 페이지에서 확인해 보세요."}</li>`;
}
