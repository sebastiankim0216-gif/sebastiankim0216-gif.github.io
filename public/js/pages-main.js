// 홈 · 소개 · 공지사항 · 커뮤니티 · 가입하기
import { S, isAdmin, isMember, canEdit, isDemo, slides, authorFields } from "./state.js";
import { COMMUNITY_CATEGORIES, INTERESTS } from "./config.js";
import {
  $, $$, esc, lines, richText, excerpt, parsePairs, safeLink, isExternal, icon, sparkle, compassStar, wordmark, orbitSVG,
  avatar, loading, empty, pageHero, secHead, toast, errMsg, modal, confirmDialog, setBtnBusy, fmtDate, fmtDateTime, relTime, isNew, ymd
} from "./ui.js";
import { actCard, firstImage } from "./pages-activity.js";

const ARROW = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>`;
const PAGE_SIZE = 10;

// =====================================================================
// HOME
// =====================================================================
export async function renderHome(app) {
  const sl = slides();
  const linkAttr = (h) => { const s = safeLink(h); return `href="${esc(s)}"${isExternal(s) ? ' target="_blank" rel="noopener"' : ""}`; };
  app.innerHTML = `
  <section class="hero" id="hero" aria-roledescription="carousel" aria-label="메인 배너">
    <h1 class="sr">Bugil Academy ASTRO — 북일고등학교 천체관측 동아리</h1>
    <div class="hero-slides">${sl.map((b, i) => `<div class="slide${i === 0 ? " active" : ""}" style="background-image:url('${esc(b.imageUrl)}')"></div>`).join("")}</div>
    <div class="hero-shade"></div>
    <div class="hero-strip">
      <nav class="strip-cols" aria-label="바로가기">
        <a class="strip-col" href="#about"><b>ABOUT${ARROW}</b><span>아스트로에 대해 알아보세요.</span></a>
        <a class="strip-col" href="#activity"><b>ACTIVITY${ARROW}</b><span>다양한 활동을 만나보세요.</span></a>
        <a class="strip-col" href="#gallery"><b>GALLERY${ARROW}</b><span>우리의 순간을 기록했어요.</span></a>
      </nav>
    </div>
    <svg class="hud" data-hud="hero" aria-hidden="true"></svg>
    <div class="hero-content">
      ${orbitSVG()}
      ${sl.map((b, i) => `
        <div class="title-block${i === 0 ? " active" : ""}" ${i === 0 ? "" : 'aria-hidden="true"'} role="group" aria-roledescription="slide" aria-label="${i + 1} / ${sl.length}">
          <p class="tb-sub">${esc(b.subtitle || "")}</p>
          <h2 class="tb-title">${String(b.title || "").trim().toUpperCase() === "ASTRO" ? wordmark() : `<span class="tb-text">${esc(b.title || "")}</span>`}</h2>
          <p class="tb-desc">${lines(b.text || "")}</p>
          ${b.buttonLabel ? `<a class="btn-line tb-btn" ${linkAttr(b.buttonLink)}>${esc(b.buttonLabel)}${ARROW}</a>` : ""}
        </div>`).join("")}
    </div>
    ${sl.length > 1 ? `<div class="dots" role="tablist" aria-label="배너 선택">${sl.map((_, i) => `<button type="button" role="tab" class="${i === 0 ? "active" : ""}" aria-selected="${i === 0}" aria-label="배너 ${i + 1}" data-i="${i}"></button>`).join("")}</div>` : ""}
    <span class="corner-star">${compassStar()}</span>
  </section>

  <section class="page">
    <div class="wrap">
      <div class="home-latest">
        <div class="panel hudc">
          <div class="panel-head"><h3>NOTICE <small>공지사항</small></h3><a class="more" href="#notice">더보기 ${icon("right")}</a></div>
          <ul class="mini-board" id="hNotices">${loading()}</ul>
        </div>
        <div class="panel hudc">
          <div class="panel-head"><h3>ACTIVITY <small>최근 활동</small></h3><a class="more" href="#activity">달력 보기 ${icon("right")}</a></div>
          <div class="act-list" id="hActs" style="margin-top:12px">${loading()}</div>
        </div>
      </div>
      <div class="sec">
        ${secHead("GALLERY", "우리가 함께 본 하늘", `<a class="more" href="#gallery">전체 보기 ${icon("right")}</a>`)}
        <div class="gal-strip" id="hGal"></div>
      </div>
      ${S.site.recruitOpen && !isMember() ? `<div class="sec">${recruitBand()}</div>` : ""}
    </div>
  </section>`;

  setupSlider($("#hero"), sl.length);

  const [notices, acts] = await Promise.all([
    S.api.list("notices", { orderBy: ["createdAt", "desc"], limit: 30 }).catch(() => []),
    S.api.list("activities", { orderBy: ["date", "desc"], limit: 24 }).catch(() => [])
  ]);
  const nl = $("#hNotices");
  if (!nl) return;
  const sorted = [...notices.filter((n) => n.pinned), ...notices.filter((n) => !n.pinned)].slice(0, 5);
  nl.innerHTML = sorted.length ? sorted.map((n) => `<li><a href="#notice-${esc(n.id)}"><span class="t">${n.pinned ? `<span class="chip pin">${icon("pin")}공지</span>` : ""}<span>${esc(n.title)}</span>${isNew(n.createdAt) ? '<span class="chip new">NEW</span>' : ""}</span><span class="d">${fmtDate(n.createdAt)}</span></a></li>`).join("") : `<li>${empty("등록된 공지가 없어요")}</li>`;
  const today = ymd();
  const recent = acts.filter((a) => a.date <= today).slice(0, 3);
  const upcoming = acts.filter((a) => a.date > today).slice(-1);
  $("#hActs").innerHTML = [...upcoming, ...recent].map(actCard).join("") || empty("아직 활동 기록이 없어요");
  const imgs = acts.flatMap((a) => (a.media || []).filter((m) => m.type === "image").map((m) => ({ url: m.url, id: a.id, title: a.title }))).slice(0, 6);
  $("#hGal").innerHTML = imgs.length ? imgs.map((m) => `<a href="#activity-${esc(m.id)}" style="background-image:url('${esc(m.url)}')" aria-label="${esc(m.title)}"></a>`).join("") : `<p class="text-dim">아직 사진이 없어요.</p>`;
}

function setupSlider(hero, n) {
  if (n < 2) return;
  let i = 0, timer = null, paused = false;
  const slidesEl = $$(".slide", hero), blocks = $$(".title-block", hero), dots = $$(".dots button", hero);
  const show = (k) => {
    i = (k + n) % n;
    slidesEl.forEach((s, j) => s.classList.toggle("active", j === i));
    blocks.forEach((b, j) => { b.classList.toggle("active", j === i); b.toggleAttribute("aria-hidden", j !== i); });
    dots.forEach((d, j) => { d.classList.toggle("active", j === i); d.setAttribute("aria-selected", j === i); });
  };
  const tick = () => {
    if (!hero.isConnected) return clearInterval(timer);
    if (!paused && !document.hidden) show(i + 1);
  };
  timer = setInterval(tick, 6500);
  dots.forEach((d) => d.addEventListener("click", () => { show(+d.dataset.i); clearInterval(timer); timer = setInterval(tick, 6500); }));
  const content = $(".hero-content", hero);
  content.addEventListener("mouseenter", () => (paused = true));
  content.addEventListener("mouseleave", () => (paused = false));
  content.addEventListener("focusin", () => (paused = true));
  content.addEventListener("focusout", () => (paused = false));
  let sx = null;
  hero.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener("touchend", (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 60) show(i + (dx < 0 ? 1 : -1)); sx = null; });
}

function recruitBand() {
  const s = S.site;
  return `<div class="recruit">
    <div>
      <p class="eyebrow">RECRUIT</p>
      <h2>${esc(s.recruitTitle)}</h2>
      ${s.recruitPeriod ? `<p class="period">${icon("calendar")} ${esc(s.recruitPeriod)}</p>` : ""}
      <p class="txt">${lines(s.recruitText)}</p>
    </div>
    <a class="btn-line" href="#join">가입 신청하기${ARROW}</a>
  </div>`;
}

// =====================================================================
// ABOUT (동아리 소개 / 홍보)
// =====================================================================
export async function renderAbout(app) {
  const s = S.site;
  const stats = parsePairs(s.stats);
  const programs = parsePairs(s.programs);
  const timeline = parsePairs(s.timeline);
  const contacts = [["지도교사", s.teacher], ["활동 장소", s.room], ["이메일", s.email], ["인스타그램", s.instagram]].filter(([, v]) => v);
  app.innerHTML = `
  ${pageHero({ en: "ABOUT", ko: "동아리 소개", desc: "별을 사랑하는 북일고 학생들의 이야기", bg: "assets/hero-campus.jpg" })}
  <section class="page">
    <div class="wrap">
      <div class="sec about-intro">
        <h2 class="about-quote">${lines(s.aboutHeadline)}</h2>
        <div class="about-body">${richText(s.aboutBody)}</div>
      </div>
      ${stats.length ? `<div class="sec stats">${stats.map(([k, v]) => `<div class="stat"><b>${esc(v || k)}</b><span>${esc(v ? k : "")}</span></div>`).join("")}</div>` : ""}
      ${programs.length ? `<div class="sec">${secHead("PROGRAM", "아스트로는 이런 활동을 해요")}
        <div class="grid-4">${programs.map(([t, d], i) => `<article class="prog">${sparkle("st")}<p class="idx">${String(i + 1).padStart(2, "0")}</p><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join("")}</div></div>` : ""}
      ${timeline.length ? `<div class="sec">${secHead("SCHEDULE", "한 해의 별자리", "", "해마다 이어지는 아스트로의 연간 일정이에요.")}
        <div class="panel hudc"><ol class="timeline">${timeline.map(([m, t]) => `<li><b>${esc(m)}</b><span>${esc(t)}</span></li>`).join("")}</ol></div></div>` : ""}
      <div class="sec">
        ${s.recruitOpen ? recruitBand() : `<div class="panel guard"><h2>지금은 모집 기간이 아니에요</h2><p class="text-dim mt-s">모집 소식은 공지사항에서 가장 먼저 알려드려요.</p><div class="acts"><a class="btn" href="#notice">공지사항 보기</a></div></div>`}
      </div>
      ${contacts.length ? `<div class="sec">${secHead("CONTACT", "문의")}
        <div class="contact-list">${contacts.map(([k, v]) => `<div><small>${esc(k)}</small><span>${k === "인스타그램" && !/^https?:/.test(v) ? esc(v.startsWith("@") ? v : "@" + v) : richText(v)}</span></div>`).join("")}</div></div>` : ""}
      ${isAdmin() ? `<p class="text-dim mt-l" style="text-align:right">이 페이지의 문구는 <a class="more" href="#admin-site">관리자 › 사이트 설정</a>에서 바꿀 수 있어요.</p>` : ""}
    </div>
  </section>`;
}

// =====================================================================
// NOTICE
// =====================================================================
export async function renderNotice(app, id) {
  if (id) return noticeDetail(app, id);
  app.innerHTML = `
  ${pageHero({ en: "NOTICE", ko: "공지사항", desc: "아스트로의 새로운 소식을 전해드려요.", bg: "assets/hero-day.jpg" })}
  <section class="page"><div class="wrap">
    ${secHead("ALL NOTICES", "공지사항", `<label class="search">${icon("search")}<span class="sr">검색</span><input type="search" id="nq" placeholder="제목·내용 검색"></label>${isAdmin() ? `<button class="btn primary" id="nWrite">${icon("plus")} 공지 작성</button>` : ""}`)}
    <div class="panel"><ul class="board" id="nList">${loading()}</ul><div class="pager" id="nPager"></div></div>
  </div></section>`;
  $("#nWrite")?.addEventListener("click", () => noticeForm());
  let all = [];
  try { all = await S.api.list("notices", { orderBy: ["createdAt", "desc"], limit: 500 }); }
  catch (e) { $("#nList").innerHTML = empty("공지를 불러오지 못했어요", errMsg(e)); return; }
  const pinned = all.filter((n) => n.pinned), normal = all.filter((n) => !n.pinned);
  let q = "", page = 1;
  const draw = () => {
    const list = $("#nList");
    if (!list) return;
    const f = (n) => !q || (n.title + " " + n.content).toLowerCase().includes(q);
    const items = normal.filter(f);
    const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    page = Math.min(page, pages);
    const slice = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const row = (n, no) => `<li class="${n.pinned ? "pinned" : ""}"><a href="#notice-${esc(n.id)}">
      <span class="no">${n.pinned ? `<span class="chip pin">${icon("pin")}공지</span>` : no}</span>
      <span class="t"><span>${esc(n.title)}</span>${isNew(n.createdAt) ? '<span class="chip new">NEW</span>' : ""}</span>
      <span class="d">${fmtDate(n.createdAt)}</span>
      <span class="meta-sm">${n.pinned ? "고정 공지 · " : ""}${fmtDate(n.createdAt)} · ${esc(n.authorName || "관리자")}</span></a></li>`;
    const pinRows = page === 1 ? pinned.filter(f).map((n) => row(n, "")).join("") : "";
    list.innerHTML = pinRows + slice.map((n, i) => row(n, items.length - ((page - 1) * PAGE_SIZE + i))).join("") || `<li>${empty(q ? "검색 결과가 없어요" : "등록된 공지가 없어요")}</li>`;
    $("#nPager").innerHTML = pages > 1 ? Array.from({ length: pages }, (_, k) => `<button class="${k + 1 === page ? "active" : ""}" data-p="${k + 1}">${k + 1}</button>`).join("") : "";
  };
  draw();
  $("#nq").addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); page = 1; draw(); });
  $("#nPager").addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (b) { page = +b.dataset.p; draw(); window.scrollTo({ top: $("#nList").getBoundingClientRect().top + scrollY - 120 }); } });
}

async function noticeDetail(app, id) {
  app.innerHTML = `${pageHero({ en: "NOTICE", ko: "공지사항", desc: "아스트로의 새로운 소식을 전해드려요.", bg: "assets/hero-day.jpg" })}
    <section class="page"><div class="wrap"><div class="panel hudc" id="nDetail">${loading()}</div></div></section>`;
  const [n, all] = await Promise.all([S.api.get("notices", id), S.api.list("notices", { orderBy: ["createdAt", "desc"], limit: 500 }).catch(() => [])]);
  const box = $("#nDetail");
  if (!box) return;
  if (!n) { box.innerHTML = `<div class="guard">${empty("공지를 찾을 수 없어요", "삭제되었거나 주소가 잘못되었어요.")}<div class="acts"><a class="btn" href="#notice">목록으로</a></div></div>`; return; }
  const idx = all.findIndex((x) => x.id === id);
  const newer = idx > 0 ? all[idx - 1] : null, older = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
  box.innerHTML = `
    <div class="article-head">
      ${n.pinned ? `<span class="chip pin">${icon("pin")}고정 공지</span>` : `<span class="chip">공지사항</span>`}
      <h1>${esc(n.title)}</h1>
      <div class="meta"><span class="who">${avatar("", n.authorName || "관")}${esc(n.authorName || "관리자")}</span><span>${fmtDateTime(n.createdAt)}</span>${n.updatedAt && n.updatedAt - n.createdAt > 60000 ? `<span>수정 ${fmtDateTime(n.updatedAt)}</span>` : ""}</div>
    </div>
    <div class="article-body">${richText(n.content)}</div>
    <div class="article-actions">
      <a class="btn" href="#notice">${icon("back")} 목록</a>
      ${isAdmin() ? `<div class="right"><button class="btn" id="nEdit">${icon("edit")} 수정</button><button class="btn danger" id="nDel">${icon("trash")} 삭제</button></div>` : ""}
    </div>
    <nav class="adjacent" aria-label="이전 다음 글">
      ${newer ? `<a href="#notice-${esc(newer.id)}"><span>다음 글 ${icon("up")}</span><span>${esc(newer.title)}</span></a>` : ""}
      ${older ? `<a href="#notice-${esc(older.id)}"><span>이전 글 ${icon("down")}</span><span>${esc(older.title)}</span></a>` : ""}
    </nav>`;
  $("#nEdit")?.addEventListener("click", () => noticeForm(n));
  $("#nDel")?.addEventListener("click", async () => {
    if (!(await confirmDialog(`"${n.title}" 공지를 삭제할까요?\n삭제하면 되돌릴 수 없어요.`, { danger: true, okText: "삭제" }))) return;
    try { await S.api.remove("notices", id); toast("삭제했어요.", "ok"); location.hash = "#notice"; } catch (e) { toast(errMsg(e), "err"); }
  });
}

export function noticeForm(n = null, after) {
  modal({
    title: n ? "공지 수정" : "공지 작성",
    wide: true,
    body: `<form class="form" id="nf">
      <div class="field"><label for="nfT">제목<span class="req">*</span></label><input type="text" id="nfT" maxlength="120" required value="${esc(n?.title || "")}"></div>
      <div class="field"><label for="nfC">내용<span class="req">*</span></label><textarea id="nfC" rows="12" required>${esc(n?.content || "")}</textarea><span class="hint">링크(https://…)는 자동으로 연결돼요.</span></div>
      <label class="switch"><input type="checkbox" id="nfP" ${n?.pinned ? "checked" : ""}> 목록 맨 위에 고정</label>
    </form>`,
    foot: `<button class="btn" data-close>취소</button><button class="btn primary" id="nfSave">${n ? "수정 완료" : "등록"}</button>`,
    onMount(el, ctl) {
      const save = el.parentElement.querySelector("#nfSave");
      const submit = async () => {
        const title = $("#nfT", el).value.trim(), content = $("#nfC", el).value.trim();
        if (!title || !content) return toast("제목과 내용을 입력해 주세요.", "err");
        setBtnBusy(save, true); ctl.setBusy(true);
        try {
          const data = { title, content, pinned: $("#nfP", el).checked };
          let id = n?.id;
          if (n) await S.api.update("notices", n.id, { ...data, updatedAt: S.api.now() });
          else id = await S.api.add("notices", { ...data, authorUid: S.user.uid, authorName: S.user.realName || S.user.name });
          ctl.setBusy(false); ctl.close();
          toast(n ? "수정했어요." : "공지를 등록했어요.", "ok");
          if (after) after(); else if (location.hash === `#notice-${id}`) S.rerender(); else location.hash = `#notice-${id}`;
        } catch (e) { toast(errMsg(e), "err"); setBtnBusy(save, false); ctl.setBusy(false); }
      };
      save.addEventListener("click", submit);
      $("#nf", el).addEventListener("submit", (e) => { e.preventDefault(); submit(); });
    }
  });
}

// =====================================================================
// COMMUNITY
// =====================================================================
export async function renderCommunity(app, id) {
  if (id) return postDetail(app, id);
  app.innerHTML = `
  ${pageHero({ en: "COMMUNITY", ko: "커뮤니티", desc: "관측 후기, 질문, 정보를 자유롭게 나눠요.", bg: "assets/hero-campus.jpg" })}
  <section class="page"><div class="wrap">
    ${secHead("BOARD", "이야기 나누기", `<label class="search">${icon("search")}<span class="sr">검색</span><input type="search" id="cq" placeholder="제목·내용·작성자 검색"></label><button class="btn primary" id="cWrite">${icon("edit")} 글쓰기</button>`)}
    <div class="tabs" id="cTabs" style="margin-bottom:18px">${["전체", ...COMMUNITY_CATEGORIES].map((c, i) => `<button class="tab${i === 0 ? " active" : ""}" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
    <div class="post-list" id="cList">${loading()}</div>
    <div class="pager" id="cPager"></div>
  </div></section>`;
  $("#cWrite").addEventListener("click", () => { if (guardMember("글을 쓰려면")) postForm(); });
  let all = [];
  try { all = await S.api.list("posts", { orderBy: ["createdAt", "desc"], limit: 500 }); }
  catch (e) { $("#cList").innerHTML = empty("글을 불러오지 못했어요", errMsg(e)); return; }
  let cat = "전체", q = "", page = 1;
  const per = 12;
  const draw = () => {
    const list = $("#cList");
    if (!list) return;
    const items = all.filter((p) => (cat === "전체" || p.category === cat) && (!q || `${p.title} ${p.content} ${p.authorName}`.toLowerCase().includes(q)));
    const pages = Math.max(1, Math.ceil(items.length / per));
    page = Math.min(page, pages);
    list.innerHTML = items.slice((page - 1) * per, page * per).map((p) => `
      <a class="post-item" href="#community-${esc(p.id)}">
        <div><span class="chip">${esc(p.category || "자유")}</span>${isNew(p.createdAt) ? ' <span class="chip new">NEW</span>' : ""}<h3>${esc(p.title)}</h3><p>${esc(excerpt(p.content, 90))}</p></div>
        <div class="side"><span class="who" style="display:inline-flex;gap:8px;align-items:center">${avatar(p.authorPhoto, p.authorName, "sm")}${esc(p.authorName)}</span><span>${relTime(p.createdAt)} · <span class="cmt">${icon("comment")}${p.commentCount || 0}</span></span></div>
      </a>`).join("") || empty(q || cat !== "전체" ? "조건에 맞는 글이 없어요" : "첫 글을 남겨 보세요!");
    $("#cPager").innerHTML = pages > 1 ? Array.from({ length: pages }, (_, k) => `<button class="${k + 1 === page ? "active" : ""}" data-p="${k + 1}">${k + 1}</button>`).join("") : "";
  };
  draw();
  $("#cTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-c]"); if (!b) return; cat = b.dataset.c; page = 1; $$("#cTabs .tab").forEach((t) => t.classList.toggle("active", t === b)); draw(); });
  $("#cq").addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); page = 1; draw(); });
  $("#cPager").addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (b) { page = +b.dataset.p; draw(); } });
}

// 부원 권한 확인 (아니면 안내)
export function guardMember(what = "이 기능을 쓰려면") {
  if (!S.user) { toast(`${what} 먼저 로그인해 주세요.`); S.login(); return false; }
  if (!isMember()) {
    modal({
      title: "부원 전용 기능이에요",
      body: `<p class="msg">${esc(what)} ASTRO 부원이어야 해요.<br>가입 신청 후 관리자가 승인하면 바로 사용할 수 있어요.</p>`,
      foot: `<button class="btn" data-close>닫기</button><a class="btn primary" href="#join" data-close>가입 신청하러 가기</a>`
    });
    return false;
  }
  return true;
}

async function postDetail(app, id) {
  app.innerHTML = `${pageHero({ en: "COMMUNITY", ko: "커뮤니티", desc: "관측 후기, 질문, 정보를 자유롭게 나눠요.", bg: "assets/hero-campus.jpg" })}
    <section class="page"><div class="wrap"><div class="panel hudc" id="pDetail">${loading()}</div></div></section>`;
  const p = await S.api.get("posts", id);
  const box = $("#pDetail");
  if (!box) return;
  if (!p) { box.innerHTML = `<div class="guard">${empty("글을 찾을 수 없어요", "삭제되었거나 주소가 잘못되었어요.")}<div class="acts"><a class="btn" href="#community">목록으로</a></div></div>`; return; }
  const cpath = `posts/${id}/comments`;
  box.innerHTML = `
    <div class="article-head">
      <span class="chip">${esc(p.category || "자유")}</span>
      <h1>${esc(p.title)}</h1>
      <div class="meta"><span class="who">${avatar(p.authorPhoto, p.authorName, "sm")}${esc(p.authorName)}</span><span>${fmtDateTime(p.createdAt)}</span>${p.updatedAt ? `<span>(수정됨)</span>` : ""}</div>
    </div>
    <div class="article-body">${richText(p.content)}</div>
    <div class="comments">
      <h3>${icon("comment")} 댓글 <span id="cCount" class="text-dim">${p.commentCount || 0}</span></h3>
      <ul class="cmt-list" id="cmts">${loading()}</ul>
      ${isMember() ? `<form class="cmt-form" id="cmtForm"><label class="sr" for="cmtIn">댓글</label><textarea id="cmtIn" maxlength="1000" placeholder="따뜻한 댓글을 남겨 주세요" required></textarea><button class="btn primary" type="submit">등록</button></form>`
      : `<p class="text-dim mt-m">${S.user ? "댓글은 부원만 쓸 수 있어요. " : ""}<button class="btn sm" id="cmtLogin">${S.user ? "가입 신청하기" : "로그인하고 댓글 쓰기"}</button></p>`}
    </div>
    <div class="article-actions mt-l">
      <a class="btn" href="#community">${icon("back")} 목록</a>
      ${canEdit(p.authorUid) ? `<div class="right">${S.user?.uid === p.authorUid ? `<button class="btn" id="pEdit">${icon("edit")} 수정</button>` : ""}<button class="btn danger" id="pDel">${icon("trash")} 삭제</button></div>` : ""}
    </div>`;
  $("#cmtLogin")?.addEventListener("click", () => (S.user ? (location.hash = "#join") : S.login()));
  $("#pEdit")?.addEventListener("click", () => postForm(p));
  $("#pDel")?.addEventListener("click", async () => {
    if (!(await confirmDialog("이 글을 삭제할까요? 댓글도 함께 사라져요.", { danger: true, okText: "삭제" }))) return;
    try {
      const cs = await S.api.list(cpath).catch(() => []);
      await Promise.all(cs.map((c) => S.api.remove(cpath, c.id).catch(() => {})));
      await S.api.remove("posts", id);
      toast("삭제했어요.", "ok"); location.hash = "#community";
    } catch (e) { toast(errMsg(e), "err"); }
  });

  const loadComments = async () => {
    const ul = $("#cmts");
    if (!ul) return;
    let cs = [];
    try { cs = await S.api.list(cpath, { orderBy: ["createdAt", "asc"] }); } catch (e) { ul.innerHTML = `<li class="text-dim">${esc(errMsg(e))}</li>`; return; }
    $("#cCount").textContent = cs.length;
    ul.innerHTML = cs.map((c) => `<li>${avatar(c.authorPhoto, c.authorName, "sm")}<div><div class="c-name">${esc(c.authorName)}<span class="c-time">${relTime(c.createdAt)}</span></div><div class="c-body">${richText(c.content)}</div></div>
      ${canEdit(c.authorUid) || S.user?.uid === p.authorUid ? `<button class="btn icon ghost" data-del="${esc(c.id)}" aria-label="댓글 삭제">${icon("trash")}</button>` : "<span></span>"}</li>`).join("") || `<li class="text-dim" style="display:block">아직 댓글이 없어요.</li>`;
  };
  loadComments();
  $("#cmts").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-del]");
    if (!b || !(await confirmDialog("댓글을 삭제할까요?", { danger: true, okText: "삭제" }))) return;
    try {
      await S.api.remove(cpath, b.dataset.del);
      await S.api.update("posts", id, { commentCount: S.api.inc(-1) }).catch(() => {});
      loadComments();
    } catch (err) { toast(errMsg(err), "err"); }
  });
  $("#cmtForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ta = $("#cmtIn"), btn = e.target.querySelector("button");
    const content = ta.value.trim();
    if (!content) return;
    setBtnBusy(btn, true);
    try {
      await S.api.add(cpath, { content, ...authorFields() });
      await S.api.update("posts", id, { commentCount: S.api.inc(1) }).catch(() => {});
      ta.value = "";
      await loadComments();
    } catch (err) { toast(errMsg(err), "err"); }
    setBtnBusy(btn, false);
  });
}

function postForm(p = null) {
  modal({
    title: p ? "글 수정" : "새 글 쓰기",
    wide: true,
    body: `<form class="form" id="pf">
      <div class="row-3">
        <div class="field"><label for="pfC">말머리</label><select id="pfC">${COMMUNITY_CATEGORIES.map((c) => `<option ${p?.category === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
        <div class="field" style="grid-column:span 2"><label for="pfT">제목<span class="req">*</span></label><input type="text" id="pfT" maxlength="120" required value="${esc(p?.title || "")}"></div>
      </div>
      <div class="field"><label for="pfB">내용<span class="req">*</span></label><textarea id="pfB" rows="12" required>${esc(p?.content || "")}</textarea><span class="hint">사진·동영상은 '활동' 메뉴의 활동 기록에 올려 주세요.</span></div>
    </form>`,
    foot: `<button class="btn" data-close>취소</button><button class="btn primary" id="pfSave">${p ? "수정 완료" : "등록"}</button>`,
    onMount(el, ctl) {
      const save = el.parentElement.querySelector("#pfSave");
      const submit = async () => {
        const title = $("#pfT", el).value.trim(), content = $("#pfB", el).value.trim(), category = $("#pfC", el).value;
        if (!title || !content) return toast("제목과 내용을 입력해 주세요.", "err");
        setBtnBusy(save, true); ctl.setBusy(true);
        try {
          let id = p?.id;
          if (p) await S.api.update("posts", p.id, { title, content, category, updatedAt: S.api.now() });
          else id = await S.api.add("posts", { title, content, category, commentCount: 0, ...authorFields() });
          ctl.setBusy(false); ctl.close();
          toast(p ? "수정했어요." : "글을 등록했어요.", "ok");
          if (location.hash === `#community-${id}`) S.rerender(); else location.hash = `#community-${id}`;
        } catch (e) { toast(errMsg(e), "err"); setBtnBusy(save, false); ctl.setBusy(false); }
      };
      save.addEventListener("click", submit);
      $("#pf", el).addEventListener("submit", (e) => { e.preventDefault(); submit(); });
    }
  });
}

// =====================================================================
// JOIN (가입 신청)
// =====================================================================
export async function renderJoin(app) {
  const s = S.site;
  app.innerHTML = `
  ${pageHero({ en: "JOIN ASTRO", ko: "가입하기", desc: "같은 하늘을 바라볼 새 부원을 기다려요.", bg: "assets/hero-dusk.jpg" })}
  <section class="page"><div class="wrap join-layout">
    <aside class="panel hudc">
      <p class="eyebrow" style="font-family:var(--display);font-size:12px;letter-spacing:.12em;color:var(--blue-200)">RECRUIT</p>
      <h2 style="font-size:24px;margin-top:8px">${esc(s.recruitTitle)}</h2>
      ${s.recruitPeriod ? `<p class="period mt-s" style="color:var(--gold);display:flex;gap:8px;align-items:center">${icon("calendar")} ${esc(s.recruitPeriod)}</p>` : ""}
      <p class="mt-m" style="color:var(--muted)">${lines(s.recruitText)}</p>
      <ol class="steps">
        <li><span class="num">01</span><div><b>구글 계정으로 로그인</b><span>학교 또는 개인 구글 계정</span></div></li>
        <li><span class="num">02</span><div><b>신청서 작성</b><span>학번, 관심 분야, 지원 동기</span></div></li>
        <li><span class="num">03</span><div><b>관리자 승인</b><span>승인되면 활동 기록·커뮤니티 이용 가능</span></div></li>
      </ol>
    </aside>
    <div class="panel" id="joinBox">${loading()}</div>
  </div></section>`;
  const box = $("#joinBox");
  const u = S.user;
  if (!u) {
    box.innerHTML = `<div class="status-card"><div class="status-ico">${sparkle()}</div><p class="big">로그인하고 신청해 주세요</p><p>구글 계정으로 로그인하면 신청서를 작성할 수 있어요.</p>
      <div class="acts"><button class="google-btn" id="jLogin">${googleG()} Google 계정으로 로그인</button></div></div>`;
    $("#jLogin").addEventListener("click", () => S.login());
    return;
  }
  if (isMember()) {
    box.innerHTML = `<div class="status-card"><div class="status-ico">${sparkle()}</div><p class="big">이미 ASTRO ${u.role === "admin" ? "관리자" : "부원"}이에요</p><p>${esc(u.realName || u.name)} 님, 오늘도 맑은 하늘이길!</p>
      <div class="acts"><a class="btn primary" href="#activity">활동 기록 보러 가기</a><a class="btn" href="#community">커뮤니티</a></div></div>`;
    return;
  }
  let a = null;
  try { a = await S.api.get("applications", u.uid); } catch (e) { box.innerHTML = empty("신청 정보를 불러오지 못했어요", errMsg(e)); return; }
  if (!box.isConnected) return;
  const showForm = () => joinForm(box, a);
  if (!a) {
    if (!s.recruitOpen) {
      box.innerHTML = `<div class="status-card"><div class="status-ico">${icon("clock")}</div><p class="big">지금은 모집 기간이 아니에요</p><p>모집이 시작되면 공지사항으로 알려드릴게요.</p><div class="acts"><a class="btn" href="#notice">공지사항 보기</a></div></div>`;
      return;
    }
    return showForm();
  }
  const st = { pending: ["검토 중", "신청서를 받았어요. 관리자가 확인한 뒤 승인해 드릴게요."], approved: ["승인 완료", "환영해요! 잠시 후 부원 기능이 열려요. 새로고침해 보세요."], rejected: ["반려됨", "아쉽지만 이번에는 함께하기 어려워요."] }[a.status] || ["검토 중", ""];
  box.innerHTML = `<div class="status-card">
    <div class="status-ico">${a.status === "approved" ? icon("check") : a.status === "rejected" ? icon("x") : sparkle()}</div>
    <p class="mt-m"><span class="chip ${esc(a.status)}">${st[0]}</span></p>
    <p class="big">${esc(a.name)} 님의 가입 신청</p>
    <p>${st[1]}</p>
    <dl class="dl memo"><dt>학번</dt><dd>${esc(a.studentNo)}</dd><dt>관심 분야</dt><dd>${esc((a.interests || []).join(", ") || "-")}</dd><dt>신청일</dt><dd>${fmtDateTime(a.createdAt)}</dd>${a.adminMemo ? `<dt>관리자 메모</dt><dd>${esc(a.adminMemo)}</dd>` : ""}</dl>
    <div class="acts">
      ${a.status === "pending" ? `<button class="btn" id="jEdit">${icon("edit")} 신청서 수정</button><button class="btn danger" id="jCancel">신청 취소</button>` : ""}
      ${a.status === "rejected" && s.recruitOpen ? `<button class="btn primary" id="jEdit">다시 신청하기</button>` : ""}
      ${a.status === "approved" ? `<button class="btn primary" id="jReload">새로고침</button>` : ""}
    </div></div>`;
  $("#jEdit")?.addEventListener("click", showForm);
  $("#jReload")?.addEventListener("click", async () => { await S.api.reloadMe(); S.rerender(); });
  $("#jCancel")?.addEventListener("click", async () => {
    if (!(await confirmDialog("가입 신청을 취소할까요?", { danger: true, okText: "신청 취소" }))) return;
    try { await S.api.remove("applications", u.uid); toast("신청을 취소했어요."); S.rerender(); } catch (e) { toast(errMsg(e), "err"); }
  });
}

function joinForm(box, a) {
  const u = S.user;
  const sel = new Set(a?.interests || []);
  box.innerHTML = `<form class="form" id="jf" novalidate>
    <div><h2 style="font-size:21px">가입 신청서</h2><p class="text-dim mt-s" style="font-size:14px">${esc(u.email)} 계정으로 신청해요.</p></div>
    <div class="row-2">
      <div class="field"><label for="jfN">이름<span class="req">*</span></label><input type="text" id="jfN" maxlength="20" required autocomplete="name" value="${esc(a?.name || u.realName || u.name || "")}"></div>
      <div class="field"><label for="jfS">학번<span class="req">*</span></label><input type="text" id="jfS" inputmode="numeric" maxlength="5" pattern="[0-9]{5}" placeholder="예: 10312" required value="${esc(a?.studentNo || "")}"><span class="hint">학년 1자리 + 반 2자리 + 번호 2자리</span></div>
    </div>
    <div class="field"><label for="jfP">연락처 <span class="text-dim" style="font-weight:400">(선택)</span></label><input type="tel" id="jfP" maxlength="13" placeholder="010-0000-0000" autocomplete="tel" value="${esc(a?.phone || "")}"></div>
    <div class="field"><span class="label">관심 분야 <span class="text-dim" style="font-weight:400">(여러 개 선택)</span></span>
      <div class="checks">${INTERESTS.map((it) => `<label><input type="checkbox" value="${esc(it)}" ${sel.has(it) ? "checked" : ""}><span>${esc(it)}</span></label>`).join("")}</div></div>
    <div class="field"><label for="jfM">지원 동기<span class="req">*</span></label><textarea id="jfM" rows="5" maxlength="1500" required placeholder="ASTRO에서 해보고 싶은 것, 별을 좋아하게 된 계기 등을 자유롭게 적어 주세요.">${esc(a?.motivation || "")}</textarea></div>
    <div class="field"><label for="jfE">관측·촬영 경험 <span class="text-dim" style="font-weight:400">(선택)</span></label><textarea id="jfE" rows="3" maxlength="800" placeholder="없어도 괜찮아요!" style="min-height:90px">${esc(a?.experience || "")}</textarea></div>
    <label class="check-line"><input type="checkbox" id="jfA" ${a ? "checked" : ""}><span>동아리 운영을 위해 이름, 학번, 연락처를 수집·이용하는 데 동의합니다. 정보는 동아리 관리자만 볼 수 있으며 탈퇴 시 삭제를 요청할 수 있어요.</span></label>
    <div class="form-foot">${a ? `<button type="button" class="btn" id="jfBack">취소</button>` : ""}<button class="btn primary" type="submit">${a ? "신청서 다시 제출" : "가입 신청하기"}</button></div>
  </form>`;
  $("#jfBack")?.addEventListener("click", () => S.rerender());
  $("#jf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const name = $("#jfN").value.trim(), studentNo = $("#jfS").value.trim(), phone = $("#jfP").value.trim();
    const motivation = $("#jfM").value.trim(), experience = $("#jfE").value.trim();
    const interests = $$(".checks input:checked", f).map((c) => c.value);
    if (!name) return toast("이름을 입력해 주세요.", "err");
    if (!/^\d{5}$/.test(studentNo)) return toast("학번은 숫자 5자리로 입력해 주세요. (예: 10312)", "err");
    if (phone && !/^[0-9\-\s]{9,13}$/.test(phone)) return toast("연락처 형식을 확인해 주세요.", "err");
    if (motivation.length < 10) return toast("지원 동기를 10자 이상 적어 주세요.", "err");
    if (!$("#jfA").checked) return toast("개인정보 수집·이용에 동의해 주세요.", "err");
    const btn = f.querySelector("button[type=submit]");
    setBtnBusy(btn, true);
    try {
      const data = { name, studentNo, phone, interests, motivation, experience, email: u.email, photo: u.photo || "", status: "pending", adminMemo: "", updatedAt: S.api.now() };
      if (!a) data.createdAt = S.api.now();
      await S.api.set("applications", u.uid, data, true);
      toast(a ? "신청서를 다시 제출했어요." : "가입 신청을 완료했어요!", "ok");
      S.rerender();
    } catch (err) { toast(errMsg(err), "err"); setBtnBusy(btn, false); }
  });
}

function googleG() {
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;
}
