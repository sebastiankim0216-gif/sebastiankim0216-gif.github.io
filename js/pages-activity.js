// 활동(달력 + 기록) · 활동 상세 · 갤러리
import { S, isAdmin, canEdit, isDemo, imageMaxSide, authorFields, normActivity } from "./state.js?v=202611261551";
import { UPLOAD_LIMITS, ACTIVITY_CATEGORIES, EVENT_CATEGORIES } from "./config.js?v=202611261551";
import {
  $, $$, esc, richText, excerpt, icon, sparkle, avatar, loading, empty, pageHero, secHead, toast, errMsg, modal,
  confirmDialog, setBtnBusy, fmtDateTime, fmtYmd, ymd, parseYmd, DOW, mediaField, prepareImage, youtubeId, lightbox
} from "./ui.js?v=202611261551";

export const firstImage = (a) => (a.media || []).find((m) => m.type === "image")?.url || "";
const mediaCount = (a) => (a.media || []).length;

export function actCard(a) {
  const img = firstImage(a);
  const future = a.date > ymd();
  return `<a class="act-card" href="#activity-${esc(a.id)}">
    <div class="ph" ${img ? `style="background-image:url('${esc(img)}')"` : ""}>${img ? "" : sparkle()}</div>
    <div>
      <h3>${esc(a.title)}</h3>
      <div class="m">
        <span>${icon("calendar")}${esc(fmtYmd(a.date))}</span>
        ${a.place ? `<span>${icon("map")}${esc(a.place)}</span>` : ""}
        ${mediaCount(a) ? `<span>${icon("image")}${mediaCount(a)}</span>` : ""}
        ${a.category ? `<span class="chip">${esc(a.category)}</span>` : ""}
        ${future ? `<span class="chip future">예정</span>` : ""}
      </div>
    </div>
  </a>`;
}

// =====================================================================
// ACTIVITY CALENDAR
// =====================================================================
export async function renderActivity(app, id) {
  if (id) return activityDetail(app, id);
  const today = ymd();
  let month = S.calMonth || today.slice(0, 7);
  let selected = S.calSel || null;
  S.calSel = null;
  const cache = new Map();

  app.innerHTML = `
  ${pageHero({ en: "ACTIVITY", ko: "활동 기록", desc: "달력에서 날짜를 골라 그날의 활동을 확인하세요.", bg: "assets/hero-night.jpg" })}
  <section class="page"><div class="wrap">
    ${secHead("CALENDAR", "활동 · 일정 달력", isAdmin() ? `<button class="btn" id="eWrite">${icon("calendar")} 일정 추가</button><button class="btn primary" id="aWrite">${icon("plus")} 활동 기록하기</button>` : "", "날짜를 누르면 그날의 일정과 활동 기록을 볼 수 있어요.")}
    <div class="act-layout">
      <div class="panel hudc">
        <div class="cal-head">
          <div class="cal-title">
            <button class="btn icon ghost" id="calPrev" aria-label="이전 달">${icon("left")}</button>
            <h2 id="calLabel" aria-live="polite"></h2>
            <button class="btn icon ghost" id="calNext" aria-label="다음 달">${icon("right")}</button>
          </div>
          <button class="btn sm" id="calToday">오늘</button>
        </div>
        <div class="cal-grid" id="calGrid" role="grid"></div>
      </div>
      <div class="panel day-panel" id="dayPanel">${loading()}</div>
    </div>
  </div></section>`;

  $("#aWrite")?.addEventListener("click", () => activityForm(null, selected || today));
  $("#eWrite")?.addEventListener("click", () => eventForm(selected || today));

  // 옛 데이터 호환: activity_posts 전체를 불러와 날짜(date 또는 작성일)로 묶음 + events(일정)
  let allActs = null, allEvents = null;
  async function loadAll() {
    if (!allActs) {
      const [acts, evs] = await Promise.all([
        S.api.list("activity_posts", { orderBy: ["createdAt", "desc"], limit: 500 }),
        S.api.list("events", { limit: 500 }).catch(() => [])
      ]);
      allActs = acts.map(normActivity);
      allEvents = evs.filter((e) => e.date);
    }
  }
  async function getMonth(m) {
    await loadAll();
    return allActs.filter((a) => a.date.startsWith(m)).sort((a, b) => (a.date > b.date ? 1 : -1));
  }
  const eventsOn = (ds) => allEvents.filter((e) => e.date <= ds && (e.endDate || e.date) >= ds);

  async function draw() {
    const grid = $("#calGrid");
    if (!grid) return;
    S.calMonth = month;
    const [y, mo] = month.split("-").map(Number);
    $("#calLabel").textContent = `${y}. ${String(mo).padStart(2, "0")}`;
    let list = [];
    try { list = await getMonth(month); } catch (e) { $("#dayPanel").innerHTML = empty("활동을 불러오지 못했어요", errMsg(e)); }
    if (!grid.isConnected) return;
    const byDate = {};
    list.forEach((a) => (byDate[a.date] ||= []).push(a));
    const first = new Date(y, mo - 1, 1);
    const start = new Date(y, mo - 1, 1 - first.getDay());
    const daysInMonth = new Date(y, mo, 0).getDate();
    const weeks = Math.ceil((first.getDay() + daysInMonth) / 7);
    let html = DOW.map((d, i) => `<div class="cal-dow ${i === 0 ? "sun" : i === 6 ? "sat" : ""}" role="columnheader">${d}</div>`).join("");
    for (let k = 0; k < weeks * 7; k++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + k);
      const ds = ymd(d);
      const inMonth = d.getMonth() === mo - 1;
      const items = inMonth ? byDate[ds] || [] : [];
      const evs = inMonth ? eventsOn(ds) : [];
      const img = items.map(firstImage).find(Boolean);
      const cls = ["cal-day", img ? "has-img" : "", d.getDay() === 0 ? "sun" : "", d.getDay() === 6 ? "sat" : "", inMonth ? "" : "out", ds === today ? "today" : "", ds === selected ? "sel" : ""].join(" ");
      html += `<button type="button" class="${cls}" data-d="${ds}" aria-pressed="${ds === selected}" aria-label="${d.getMonth() + 1}월 ${d.getDate()}일${evs.length ? `, 일정 ${evs.length}개` : ""}${items.length ? `, 활동 ${items.length}건` : ""}">
        ${img ? `<span class="bg" style="background-image:url('${esc(img)}')"></span>` : ""}
        <span class="n">${d.getDate()}</span>
        ${evs.length ? `<span class="ev-mark c${+evs[0].category || 0}">${esc(evs[0].title)}${evs.length > 1 ? ` 외 ${evs.length - 1}` : ""}</span>` : ""}
        ${items.length ? `<span class="marks">${sparkle()}<span>${items.length}건</span></span>` : "<span></span>"}
      </button>`;
    }
    grid.innerHTML = html;
    drawPanel(list, byDate);
  }

  function drawPanel(list, byDate) {
    const p = $("#dayPanel");
    if (!p) return;
    const [, mo] = month.split("-").map(Number);
    const day = selected && selected.startsWith(month);
    const items = day ? byDate[selected] || [] : list.slice().reverse();
    const evs = day ? eventsOn(selected) : allEvents.filter((e) => e.date.slice(0, 7) <= month && (e.endDate || e.date).slice(0, 7) >= month).sort((a, b) => (a.date > b.date ? 1 : -1));
    const title = day ? fmtYmd(selected) : `${mo}월의 일정 · 활동`;
    p.innerHTML = `
      <h2>${day ? icon("calendar") : sparkle("ico fill")} ${esc(title)}</h2>
      <p class="sub">일정 ${evs.length}개 · 활동 ${items.length}건${selected ? ` · <button class="btn sm ghost" id="showMonth" style="min-height:28px;padding:0 8px">${mo}월 전체 보기</button>` : ""}</p>
      ${evs.length ? `<ul class="ev-list">${evs.map((e) => `<li><span class="ev-dot c${+e.category || 0}"></span><div><b>${esc(e.title)}</b><small>${esc(EVENT_CATEGORIES[+e.category || 0] || "일반")} · ${esc(fmtYmd(e.date, false))}${e.endDate && e.endDate !== e.date ? ` ~ ${esc(fmtYmd(e.endDate, false))}` : ""}</small>${e.note ? `<p>${esc(e.note)}</p>` : ""}</div>${isAdmin() ? `<button class="btn icon ghost" data-evdel="${esc(e.id)}" aria-label="일정 삭제">${icon("trash")}</button>` : ""}</li>`).join("")}</ul>` : ""}
      <div class="act-list">${items.map(actCard).join("") || (evs.length ? "" : empty(day ? "이 날은 일정이나 기록이 없어요" : "이번 달 소식을 기다리고 있어요"))}</div>
      ${day && isAdmin() ? `<div class="grid-2 mt-m" style="gap:10px"><button class="btn" id="evHere">${icon("calendar")} 이 날 일정 추가</button><button class="btn" id="writeHere">${icon("plus")} 이 날 활동 기록</button></div>` : ""}`;
    $("#showMonth")?.addEventListener("click", () => { selected = null; draw(); });
    $("#writeHere")?.addEventListener("click", () => activityForm(null, selected));
    $("#evHere")?.addEventListener("click", () => eventForm(selected));
    p.querySelectorAll("[data-evdel]").forEach((b) => b.addEventListener("click", async () => {
      if (!(await confirmDialog("이 일정을 삭제할까요?", { danger: true, okText: "삭제" }))) return;
      try { await S.api.remove("events", b.dataset.evdel); allEvents = allEvents.filter((e) => e.id !== b.dataset.evdel); toast("일정을 삭제했어요."); draw(); }
      catch (err) { toast(errMsg(err), "err"); }
    }));
  }

  const shift = (n) => { const [y, m] = month.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; draw(); };
  $("#calPrev").addEventListener("click", () => shift(-1));
  $("#calNext").addEventListener("click", () => shift(1));
  $("#calToday").addEventListener("click", () => { month = today.slice(0, 7); selected = today; draw(); });
  $("#calGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-d]");
    if (!b) return;
    const d = b.dataset.d;
    if (!d.startsWith(month)) { month = d.slice(0, 7); selected = d; return draw(); }
    selected = selected === d ? null : d;
    draw();
  });
  if (selected) month = selected.slice(0, 7);
  S.reloadCalendar = () => { allActs = null; draw(); };
  draw();
}

// 일정 추가 (옛 calendar 'events' 컬렉션과 같은 형식)
function eventForm(date) {
  modal({
    title: "일정 추가",
    body: `<form class="form" id="ef">
      <div class="field"><label for="efT">제목<span class="req">*</span></label><input type="text" id="efT" maxlength="60" required></div>
      <div class="row-2">
        <div class="field"><label for="efD">시작 날짜<span class="req">*</span></label><input type="date" id="efD" required value="${esc(date || ymd())}"></div>
        <div class="field"><label for="efE">종료 날짜 (선택)</label><input type="date" id="efE"></div>
      </div>
      <div class="field"><span class="label">분류</span><div class="checks">${EVENT_CATEGORIES.map((c, i) => `<label><input type="radio" name="efC" value="${i}" ${i === 0 ? "checked" : ""}><span>${esc(c)}</span></label>`).join("")}</div></div>
      <div class="field"><label for="efN">메모 (선택)</label><textarea id="efN" rows="3" style="min-height:90px" maxlength="300"></textarea></div>
    </form>`,
    foot: `<button class="btn" data-close>취소</button><button class="btn primary" id="efSave">추가</button>`,
    onMount(el, ctl) {
      const save = el.parentElement.querySelector("#efSave");
      save.addEventListener("click", async () => {
        const title = $("#efT", el).value.trim(), d = $("#efD", el).value, end = $("#efE", el).value, note = $("#efN", el).value.trim();
        const category = +($('input[name="efC"]:checked', el)?.value || 0);
        if (!title) return toast("제목을 입력해 주세요.", "err");
        if (!d) return toast("날짜를 선택해 주세요.", "err");
        if (end && end < d) return toast("종료 날짜는 시작 날짜 이후여야 해요.", "err");
        setBtnBusy(save, true); ctl.setBusy(true);
        try {
          await S.api.add("events", { title, date: d, endDate: end || null, note, category, createdBy: S.user.email });
          ctl.setBusy(false); ctl.close();
          toast("일정을 추가했어요.", "ok");
          S.calMonth = d.slice(0, 7); S.calSel = d;
          S.rerender();
        } catch (e) { toast(errMsg(e), "err"); setBtnBusy(save, false); ctl.setBusy(false); }
      });
    }
  });
}

// =====================================================================
// ACTIVITY DETAIL
// =====================================================================
async function activityDetail(app, id) {
  app.innerHTML = `${pageHero({ en: "ACTIVITY", ko: "활동 기록", desc: "달력에서 날짜를 골라 그날의 활동을 확인하세요.", bg: "assets/hero-night.jpg" })}
    <section class="page"><div class="wrap"><div class="panel hudc" id="aDetail">${loading()}</div></div></section>`;
  const raw = await S.api.get("activity_posts", id);
  const a = raw ? normActivity(raw) : null;
  const box = $("#aDetail");
  if (!box) return;
  if (a) S.api.update("activity_posts", id, { views: S.api.inc(1) }).catch(() => {});
  if (!a) { box.innerHTML = `<div class="guard">${empty("활동 기록을 찾을 수 없어요", "삭제되었거나 주소가 잘못되었어요.")}<div class="acts"><a class="btn" href="#activity">달력으로</a></div></div>`; return; }
  const files = (a.media || []).filter((m) => m.type === "image" || m.type === "video");
  const yts = (a.media || []).filter((m) => m.type === "youtube");
  const future = a.date > ymd();
  box.innerHTML = `
    <div class="article-head">
      <span class="chip">${icon("calendar")} ${esc(fmtYmd(a.date))}</span> ${a.category ? `<span class="chip">${esc(a.category)}</span>` : ""} ${future ? `<span class="chip future">예정</span>` : ""}
      <h1>${esc(a.title)}</h1>
      <div class="meta">
        <span class="who">${avatar(a.authorPhoto, a.authorName || a.authorEmail, "sm")}${esc(a.authorName || (a.authorEmail || "").split("@")[0] || "관리자")}</span>
        ${a.place ? `<span>${icon("map")} ${esc(a.place)}</span>` : ""}
        <span>${fmtDateTime(a.createdAt)} 작성</span>
      </div>
    </div>
    <div class="article-body">
      ${richText(a.content)}
      ${files.length ? `<div class="media-grid mt-l">${files.map((m, i) => `<button type="button" class="mi ${i === 0 && files.length % 2 === 1 ? "first" : ""}" data-i="${i}" aria-label="${m.type === "video" ? "동영상" : "사진"} ${i + 1} 크게 보기">
          ${m.type === "video" ? `<video src="${esc(m.url)}#t=0.1" muted playsinline preload="metadata"></video><span class="play-badge"><span>${icon("play")}</span></span>` : `<img src="${esc(m.url)}" alt="${esc(a.title)} 사진 ${i + 1}" loading="lazy">`}
        </button>`).join("")}</div>` : ""}
      ${yts.map((y) => isDemo() ? `<a class="yt-link" href="https://www.youtube.com/watch?v=${esc(y.yt)}" target="_blank" rel="noopener">${icon("play")} 유튜브 영상 보기</a>`
        : `<div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/${esc(y.yt)}" title="YouTube 영상" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`).join("")}
    </div>
    <div class="article-actions">
      <a class="btn" href="#activity" id="aBack">${icon("calendar")} 달력으로</a>
      ${canEdit(a.authorEmail) ? `<div class="right"><button class="btn" id="aEdit">${icon("edit")} 수정</button><button class="btn danger" id="aDel">${icon("trash")} 삭제</button></div>` : ""}
    </div>`;
  $("#aBack").addEventListener("click", () => { S.calMonth = a.date.slice(0, 7); S.calSel = a.date; });
  box.querySelectorAll(".mi").forEach((b) => b.addEventListener("click", () => lightbox(files.map((m) => ({ ...m, title: a.title, date: a.date })), +b.dataset.i, { demo: isDemo() })));
  $("#aEdit")?.addEventListener("click", () => activityForm(a));
  $("#aDel")?.addEventListener("click", async () => {
    if (!(await confirmDialog(`"${a.title}" 기록을 삭제할까요?\n올린 사진·동영상도 함께 삭제되며 되돌릴 수 없어요.`, { danger: true, okText: "삭제" }))) return;
    try {
      await S.api.remove("activity_posts", id);
      await Promise.all((a.media || []).filter((m) => m.path).map((m) => S.api.deleteFile(m.path)));
      S.calMonth = a.date.slice(0, 7);
      toast("삭제했어요.", "ok");
      location.hash = "#activity";
    } catch (e) { toast(errMsg(e), "err"); }
  });
}

// =====================================================================
// ACTIVITY FORM (작성 / 수정)
// =====================================================================
export function activityForm(a = null, date = null) {
  const ytText = (a?.media || []).filter((m) => m.type === "youtube").map((m) => m.url).join("\n");
  let mf;
  modal({
    title: a ? "활동 기록 수정" : "활동 기록하기",
    wide: true,
    body: `<form class="form" id="af">
      <div class="row-3">
        <div class="field"><label for="afD">날짜<span class="req">*</span></label><input type="date" id="afD" required value="${esc(a?.date || date || ymd())}"></div>
        <div class="field" style="grid-column:span 2"><label for="afT">제목<span class="req">*</span></label><input type="text" id="afT" maxlength="100" required placeholder="예: CNC 로켓 발사 실험" value="${esc(a?.title || "")}"></div>
      </div>
      <div class="row-2">
        <div class="field"><label for="afK">분류</label><select id="afK">${ACTIVITY_CATEGORIES.map((c) => `<option ${(a?.category || "기타") === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
        <div class="field"><label for="afP">장소 <span class="text-dim" style="font-weight:400">(선택)</span></label><input type="text" id="afP" maxlength="60" placeholder="예: 과학관 실험실" value="${esc(a?.place || "")}"></div>
      </div>
      <div class="field"><label for="afC">내용<span class="req">*</span></label><textarea id="afC" rows="7" required placeholder="어떤 활동을 했는지, 무엇을 배웠는지 기록해 주세요.">${esc(a?.content || "")}</textarea></div>
      <div class="field"><span class="label">사진</span><div id="afMedia"></div></div>
      <div class="field"><label for="afY">영상은 유튜브 링크로 <span class="text-dim" style="font-weight:400">(선택, 한 줄에 하나)</span></label><textarea id="afY" rows="2" style="min-height:70px" placeholder="https://youtu.be/...">${esc(ytText)}</textarea><span class="hint">동영상 파일은 올릴 수 없어요. 유튜브(일부 공개)에 올린 뒤 링크를 붙여 주세요.</span></div>
      <div id="afProg" hidden><div class="progress"><i></i></div><p class="hint mt-s" id="afProgT"></p></div>
    </form>`,
    foot: `<button class="btn" data-close>취소</button><button class="btn primary" id="afSave">${a ? "수정 완료" : "기록 올리기"}</button>`,
    onMount(el, ctl) {
      mf = mediaField($("#afMedia", el), { initial: a?.media || [], max: UPLOAD_LIMITS.maxFiles, limits: UPLOAD_LIMITS });
      const save = el.parentElement.querySelector("#afSave");
      const submit = async () => {
        const date = $("#afD", el).value, title = $("#afT", el).value.trim(), place = $("#afP", el).value.trim(), content = $("#afC", el).value.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return toast("날짜를 선택해 주세요.", "err");
        if (!title || !content) return toast("제목과 내용을 입력해 주세요.", "err");
        const ytLines = $("#afY", el).value.split("\n").map((s) => s.trim()).filter(Boolean);
        const yt = [];
        for (const l of ytLines) { const vid = youtubeId(l); if (!vid) return toast(`유튜브 주소를 확인해 주세요: ${l}`, "err"); yt.push({ type: "youtube", url: l, yt: vid }); }
        setBtnBusy(save, true, "저장 중"); ctl.setBusy(true);
        const files = mf.files;
        const uploaded = [];
        const prog = $("#afProg", el), bar = $("#afProg i", el), txt = $("#afProgT", el);
        try {
          if (files.length) prog.hidden = false;
          for (let i = 0; i < files.length; i++) {
            txt.textContent = `업로드 중 ${i + 1} / ${files.length} — ${files[i].name}`;
            const f = files[i].type.startsWith("image/") ? await prepareImage(files[i], imageMaxSide()) : files[i];
            const r = await S.api.upload(f, "activities", (p) => { bar.style.width = `${((i + p) / files.length) * 100}%`; });
            uploaded.push(r);
          }
          bar.style.width = "100%";
          const media = [...mf.kept, ...uploaded, ...yt];
          const files2 = media.filter((m) => m.type !== "youtube");
          const category = $("#afK", el).value;
          const data = { date, title, place, content, category, media,
            mediaUrls: files2.map((m) => m.url), mediaTypes: files2.map((m) => m.type), storagePaths: files2.map((m) => m.path || "") };
          let id = a?.id;
          if (a) await S.api.update("activity_posts", a.id, { ...data, updatedAt: S.api.now() });
          else id = await S.api.add("activity_posts", { ...data, views: 0, ...authorFields() });
          await Promise.all(mf.removed.filter((m) => m.path).map((m) => S.api.deleteFile(m.path)));
          ctl.setBusy(false); ctl.close();
          toast(a ? "활동 기록을 수정했어요." : "활동을 기록했어요!", "ok");
          S.calMonth = date.slice(0, 7);
          if (location.hash === `#activity-${id}`) S.rerender(); else location.hash = `#activity-${id}`;
        } catch (e) {
          console.error(e);
          await Promise.all(uploaded.filter((u) => u.path).map((u) => S.api.deleteFile(u.path)));
          toast(errMsg(e), "err");
          prog.hidden = true;
          setBtnBusy(save, false); ctl.setBusy(false);
        }
      };
      save.addEventListener("click", submit);
      $("#af", el).addEventListener("submit", (e) => { e.preventDefault(); submit(); });
    }
  });
}

// =====================================================================
// GALLERY
// =====================================================================
export async function renderGallery(app) {
  app.innerHTML = `
  ${pageHero({ en: "GALLERY", ko: "갤러리", desc: "활동 기록에 올라온 사진과 영상이 모두 모여요.", bg: "assets/hero-dusk.jpg" })}
  <section class="page"><div class="wrap">
    ${secHead("OUR MOMENTS", "우리의 순간", `<div class="tabs" id="gTabs"><button class="tab active" data-f="all">전체</button><button class="tab" data-f="image">사진</button><button class="tab" data-f="video">영상</button></div>`)}
    <div id="gWrap">${loading()}</div>
  </div></section>`;
  let acts = [];
  try { acts = (await S.api.list("activity_posts", { orderBy: ["createdAt", "desc"], limit: 300 })).map(normActivity).sort((a, b) => (a.date < b.date ? 1 : -1)); }
  catch (e) { $("#gWrap").innerHTML = empty("갤러리를 불러오지 못했어요", errMsg(e)); return; }
  const all = acts.flatMap((a) => (a.media || []).map((m) => ({ ...m, title: a.title, date: a.date, href: `#activity-${a.id}` })));
  let filter = "all";
  const draw = () => {
    const w = $("#gWrap");
    if (!w) return;
    const items = all.filter((m) => filter === "all" || (filter === "image" ? m.type === "image" : m.type === "video" || m.type === "youtube"));
    if (!items.length) { w.innerHTML = empty(all.length ? "해당하는 항목이 없어요" : "아직 올라온 사진이 없어요", "활동 기록에 사진·영상을 올리면 이곳에 모여요."); return; }
    w.innerHTML = `<p class="text-dim" style="margin-bottom:14px;font-size:14px">${items.length}개</p><div class="masonry">${items.map((m, i) => {
      let inner;
      if (m.type === "video") inner = `<video src="${esc(m.url)}#t=0.1" muted playsinline preload="metadata"></video><span class="play-badge"><span>${icon("play")}</span></span>`;
      else if (m.type === "youtube") inner = isDemo() ? `<div style="aspect-ratio:16/9;display:grid;place-items:center;background:linear-gradient(135deg,#3a1030,#10184a)"></div><span class="play-badge"><span>${icon("play")}</span></span>` : `<img src="https://i.ytimg.com/vi/${esc(m.yt)}/hqdefault.jpg" alt="${esc(m.title)} 영상" loading="lazy"><span class="play-badge"><span>${icon("play")}</span></span>`;
      else inner = `<img src="${esc(m.url)}" alt="${esc(m.title)}" loading="lazy">`;
      return `<button type="button" class="g-item" data-i="${i}">${inner}<span class="cap"><b>${esc(m.title)}</b><small>${esc(fmtYmd(m.date, false))}</small></span></button>`;
    }).join("")}</div>`;
    w.querySelectorAll(".g-item").forEach((b) => b.addEventListener("click", () => lightbox(items, +b.dataset.i, { demo: isDemo() })));
  };
  draw();
  $("#gTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (!b) return; filter = b.dataset.f; $$("#gTabs .tab").forEach((t) => t.classList.toggle("active", t === b)); draw(); });
}
