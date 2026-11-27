// 포트폴리오: 프로젝트 · 수상 · 전람회 출품 · 탐구 보고서 (Firestore 'portfolio')
import { S, isAdmin, imageMaxSide, authorFields } from "./state.js?v=202611271625";
import { PORTFOLIO_TYPES, UPLOAD_LIMITS } from "./config.js?v=202611271625";
import {
  $, esc, richText, excerpt, icon, sparkle, loading, empty, pageHero, secHead, toast, errMsg, modal, confirmDialog,
  setBtnBusy, mediaField, prepareImage, parsePairs, lightbox
} from "./ui.js?v=202611271625";

export async function renderPortfolio(app, id) {
  if (id) return portfolioDetail(app, id);
  app.innerHTML = `
  ${pageHero({ en: "PORTFOLIO", ko: "포트폴리오", desc: "ASTRO가 만들고, 탐구하고, 수상한 기록이에요.", bg: "assets/campus-front.jpg" })}
  <section class="page"><div class="wrap">
    ${secHead("PROJECTS & AWARDS", "우리가 남긴 기록", isAdmin() ? `<button class="btn primary" id="pfAdd">${icon("plus")} 기록 추가</button>` : "", "로켓 실험, 전람회 출품작, 탐구 보고서, 대회 수상 실적을 모았어요.")}
    <div class="act-filter">
      <label class="search">${icon("search")}<span class="sr">검색</span><input type="search" id="pfQ" placeholder="제목 · 참여자 · 내용 검색"></label>
      <select id="pfY" aria-label="연도"><option value="">전체 연도</option></select>
    </div>
    <div class="tabs mt-s" id="pfT">${["전체", ...PORTFOLIO_TYPES].map((t, i) => `<button class="tab${i === 0 ? " active" : ""}" data-t="${esc(t)}">${esc(t)}</button>`).join("")}</div>
    <div class="pf-grid mt-m" id="pfList">${loading()}</div>
  </div></section>`;
  $("#pfAdd")?.addEventListener("click", () => portfolioForm());
  let all = [];
  try { all = await S.api.list("portfolio", { orderBy: ["year", "desc"], limit: 500 }); }
  catch (e) { $("#pfList").innerHTML = empty("기록을 불러오지 못했어요", errMsg(e)); return; }
  if (!$("#pfList")) return;
  [...new Set(all.map((p) => String(p.year || "")).filter(Boolean))].sort().reverse().forEach((y) => $("#pfY").insertAdjacentHTML("beforeend", `<option value="${esc(y)}">${esc(y)}년</option>`));
  let t = "전체", q = "", y = "";
  const draw = () => {
    const list = $("#pfList");
    if (!list) return;
    const items = all
      .filter((p) => t === "전체" || p.type === t)
      .filter((p) => !y || String(p.year) === y)
      .filter((p) => !q || `${p.title} ${p.members || ""} ${p.summary || ""} ${p.content || ""} ${p.award || ""}`.toLowerCase().includes(q))
      .sort((a, b) => (+b.year || 0) - (+a.year || 0) || (b.createdAt || 0) - (a.createdAt || 0));
    list.innerHTML = items.map(card).join("") || empty(all.length ? "조건에 맞는 기록이 없어요" : "아직 등록된 기록이 없어요", isAdmin() ? "오른쪽 위 '기록 추가'로 첫 기록을 남겨 보세요." : "");
  };
  draw();
  $("#pfQ").addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); draw(); });
  $("#pfY").addEventListener("change", (e) => { y = e.target.value; draw(); });
  $("#pfT").addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (!b) return; t = b.dataset.t; app.querySelectorAll("#pfT .tab").forEach((x) => x.classList.toggle("active", x === b)); draw(); });
}

function card(p) {
  return `<a class="pf-card" href="#portfolio-${esc(p.id)}">
    <div class="pf-cover" ${p.coverUrl ? `style="background-image:url('${esc(p.coverUrl)}')"` : ""}>${p.coverUrl ? "" : sparkle()}<span class="chip">${esc(p.type || "기타")}</span>${p.year ? `<span class="pf-year">${esc(p.year)}</span>` : ""}</div>
    <div class="pf-body">
      ${p.award ? `<p class="pf-award">${icon("check")} ${esc(p.award)}</p>` : ""}
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.summary || excerpt(p.content, 80))}</p>
      ${p.members ? `<p class="pf-members">${icon("users")} ${esc(p.members)}</p>` : ""}
    </div>
  </a>`;
}

async function portfolioDetail(app, id) {
  app.innerHTML = `${pageHero({ en: "PORTFOLIO", ko: "포트폴리오", desc: "ASTRO가 만들고, 탐구하고, 수상한 기록이에요.", bg: "assets/campus-front.jpg" })}
    <section class="page"><div class="wrap"><div class="panel hudc" id="pfD">${loading()}</div></div></section>`;
  const p = await S.api.get("portfolio", id);
  const box = $("#pfD");
  if (!box) return;
  if (!p) { box.innerHTML = `<div class="guard">${empty("기록을 찾을 수 없어요")}<div class="acts"><a class="btn" href="#portfolio">목록으로</a></div></div>`; return; }
  const links = parsePairs(p.links || "").filter(([, u]) => /^https?:\/\//i.test(u));
  box.innerHTML = `
    <div class="article-head">
      <span class="chip">${esc(p.type || "기타")}</span> ${p.year ? `<span class="chip future">${esc(p.year)}년</span>` : ""}
      <h1>${esc(p.title)}</h1>
      <div class="meta">${p.award ? `<span class="pf-award">${icon("check")} ${esc(p.award)}</span>` : ""}${p.members ? `<span>${icon("users")} ${esc(p.members)}</span>` : ""}</div>
    </div>
    <div class="article-body">
      ${p.coverUrl ? `<button class="pf-hero-img" type="button" id="pfImg" aria-label="사진 크게 보기"><img src="${esc(p.coverUrl)}" alt="${esc(p.title)}"></button>` : ""}
      ${p.summary ? `<p class="pf-summary">${esc(p.summary)}</p>` : ""}
      ${richText(p.content || "")}
      ${links.length ? `<div class="pf-links">${links.map(([l, u]) => `<a class="btn" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${icon("link")} ${esc(l || "자료 보기")}</a>`).join("")}</div>` : ""}
    </div>
    <div class="article-actions">
      <a class="btn" href="#portfolio">${icon("back")} 목록</a>
      ${isAdmin() ? `<div class="right"><button class="btn" id="pfEdit">${icon("edit")} 수정</button><button class="btn danger" id="pfDel">${icon("trash")} 삭제</button></div>` : ""}
    </div>`;
  $("#pfImg")?.addEventListener("click", () => lightbox([{ url: p.coverUrl, type: "image", title: p.title }], 0));
  $("#pfEdit")?.addEventListener("click", () => portfolioForm(p));
  $("#pfDel")?.addEventListener("click", async () => {
    if (!(await confirmDialog(`"${p.title}" 기록을 삭제할까요?`, { danger: true, okText: "삭제" }))) return;
    try { await S.api.remove("portfolio", id); if (p.coverPath) await S.api.deleteFile(p.coverPath); toast("삭제했어요.", "ok"); location.hash = "#portfolio"; }
    catch (e) { toast(errMsg(e), "err"); }
  });
}

function portfolioForm(p = null) {
  let mf;
  modal({
    title: p ? "기록 수정" : "포트폴리오 기록 추가",
    wide: true,
    body: `<form class="form" id="pff">
      <div class="row-3">
        <div class="field"><label for="pfType">분류</label><select id="pfType">${PORTFOLIO_TYPES.map((t) => `<option ${p?.type === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
        <div class="field"><label for="pfYear">연도<span class="req">*</span></label><input type="number" id="pfYear" min="2000" max="2100" value="${esc(p?.year || new Date().getFullYear())}"></div>
        <div class="field"><label for="pfAward">수상 · 성과 (선택)</label><input type="text" id="pfAward" maxlength="60" placeholder="예: 전국과학전람회 장려상" value="${esc(p?.award || "")}"></div>
      </div>
      <div class="field"><label for="pfTitle">제목<span class="req">*</span></label><input type="text" id="pfTitle" maxlength="100" placeholder="예: CNC 가공 로켓 동체와 고체연료 추진 실험" value="${esc(p?.title || "")}"></div>
      <div class="field"><label for="pfMem">참여자 (선택)</label><input type="text" id="pfMem" maxlength="120" placeholder="예: 2학년 김OO, 이OO" value="${esc(p?.members || "")}"></div>
      <div class="field"><label for="pfSum">한 줄 소개</label><input type="text" id="pfSum" maxlength="120" value="${esc(p?.summary || "")}"></div>
      <div class="field"><label for="pfCon">내용</label><textarea id="pfCon" rows="8" placeholder="목표, 방법, 결과, 배운 점 등을 정리해 주세요.">${esc(p?.content || "")}</textarea></div>
      <div class="field"><span class="label">대표 사진 (선택)</span><div id="pfMedia"></div></div>
      <div class="field"><label for="pfLinks">자료 링크 (선택, 한 줄에 하나: <b>이름 | https://주소</b>)</label><textarea id="pfLinks" rows="3" style="min-height:80px" placeholder="보고서 PDF | https://drive.google.com/...\n발표 영상 | https://youtu.be/...">${esc(p?.links || "")}</textarea><span class="hint">보고서 파일은 구글 드라이브 등에 올린 뒤 링크를 붙여 주세요.</span></div>
    </form>`,
    foot: `<button class="btn" data-close>취소</button><button class="btn primary" id="pfSave">${p ? "수정 완료" : "등록"}</button>`,
    onMount(el, ctl) {
      mf = mediaField($("#pfMedia", el), { initial: p?.coverUrl ? [{ url: p.coverUrl, path: p.coverPath || "", type: "image" }] : [], multiple: false, max: 1, limits: UPLOAD_LIMITS });
      const save = el.parentElement.querySelector("#pfSave");
      save.addEventListener("click", async () => {
        const title = $("#pfTitle", el).value.trim(), year = parseInt($("#pfYear", el).value, 10);
        if (!title) return toast("제목을 입력해 주세요.", "err");
        if (!year || year < 2000 || year > 2100) return toast("연도를 확인해 주세요.", "err");
        setBtnBusy(save, true); ctl.setBusy(true);
        try {
          let coverUrl = mf.kept[0]?.url || "", coverPath = mf.kept[0]?.path || "";
          if (mf.files.length) {
            const r = await S.api.upload(await prepareImage(mf.files[0], imageMaxSide()), "portfolio");
            coverUrl = r.url; coverPath = r.path;
          }
          const data = { type: $("#pfType", el).value, year, award: $("#pfAward", el).value.trim(), title, members: $("#pfMem", el).value.trim(),
            summary: $("#pfSum", el).value.trim(), content: $("#pfCon", el).value.trim(), links: $("#pfLinks", el).value.trim(), coverUrl, coverPath };
          let id = p?.id;
          if (p) await S.api.update("portfolio", p.id, { ...data, updatedAt: S.api.now() });
          else id = await S.api.add("portfolio", { ...data, ...authorFields() });
          await Promise.all(mf.removed.filter((m) => m.path && m.path !== coverPath).map((m) => S.api.deleteFile(m.path)));
          ctl.setBusy(false); ctl.close();
          toast(p ? "수정했어요." : "기록을 등록했어요.", "ok");
          if (location.hash === `#portfolio-${id}`) S.rerender(); else location.hash = `#portfolio-${id}`;
        } catch (e) { toast(errMsg(e), "err"); setBtnBusy(save, false); ctl.setBusy(false); }
      });
    }
  });
}
