// 관리자 페이지: 대시보드 · 가입 신청 · 회원 · 배너 · 공지 · 사이트 설정
import { S, isAdmin, imageMaxSide, loadBanners, loadSite } from "./state.js";
import { DEFAULT_BANNERS, UPLOAD_LIMITS, INTERESTS } from "./config.js";
import {
  $, $$, esc, lines, icon, sparkle, avatar, roleChip, loading, empty, pageHero, toast, errMsg, modal, confirmDialog,
  setBtnBusy, fmtDate, fmtDateTime, relTime, mediaField, prepareImage, safeLink, ROLE_LABEL
} from "./ui.js";
import { noticeForm } from "./pages-main.js";

const TABS = [
  ["", "대시보드", "grid"],
  ["applications", "가입 신청", "user"],
  ["members", "회원 관리", "users"],
  ["banners", "배너 관리", "image"],
  ["notices", "공지사항", "megaphone"],
  ["site", "사이트 설정", "gear"]
];
const STATUS = { pending: "대기", approved: "승인", rejected: "반려" };

export async function renderAdmin(app, tab = "") {
  if (!TABS.some(([k]) => k === tab)) tab = "";
  app.innerHTML = `${pageHero({ en: "ADMIN", ko: "관리자", desc: "배너 · 공지 · 가입 신청 · 회원을 관리해요.", bg: "assets/hero-night.jpg" })}
    <section class="page"><div class="wrap" id="adminWrap"></div></section>`;
  const w = $("#adminWrap");
  if (!S.user || !isAdmin()) {
    w.innerHTML = `<div class="panel guard"><div class="status-ico" style="margin:0 auto">${icon("shield")}</div><h2 class="mt-m">관리자만 들어올 수 있어요</h2>
      <p class="text-dim mt-s">${S.user ? "현재 계정에는 관리자 권한이 없어요." : "관리자 계정으로 로그인해 주세요."}</p>
      <div class="acts">${S.user ? "" : `<button class="btn primary" id="admLogin">로그인</button>`}<a class="btn" href="#home">홈으로</a></div></div>`;
    $("#admLogin")?.addEventListener("click", () => S.login());
    return;
  }
  w.innerHTML = `<nav class="admin-tabs" aria-label="관리 메뉴">${TABS.map(([k, label, ic]) => `<a href="#admin${k ? "-" + k : ""}" class="${k === tab ? "active" : ""}">${icon(ic)} ${label}${k === "applications" ? ' <span class="cnt" id="pendingCnt" hidden></span>' : ""}</a>`).join("")}</nav>
    <div id="adminBody">${loading()}</div>`;
  const body = $("#adminBody");
  S.api.list("applications", { where: [["status", "==", "pending"]] }).then((l) => {
    const c = $("#pendingCnt");
    if (c && l.length) { c.hidden = false; c.textContent = l.length; }
  }).catch(() => {});
  const views = { "": dashboard, applications, members, banners, notices, site };
  try { await views[tab](body); }
  catch (e) { console.error(e); body.innerHTML = `<div class="panel">${empty("불러오지 못했어요", errMsg(e))}</div>`; }
}

// ---------------------------------------------------------------------
async function dashboard(body) {
  const [apps, users, notices, acts, posts] = await Promise.all([
    S.api.list("applications", { orderBy: ["createdAt", "desc"] }),
    S.api.list("users"),
    S.api.list("notices"),
    S.api.list("activities"),
    S.api.list("posts")
  ]);
  if (!body.isConnected) return;
  const pending = apps.filter((a) => a.status === "pending");
  const members = users.filter((u) => u.role === "member" || u.role === "admin");
  body.innerHTML = `
    <div class="kpis">
      <a class="kpi ${pending.length ? "hot" : ""}" href="#admin-applications"><small>대기 중인 가입 신청</small><b>${pending.length}</b></a>
      <a class="kpi" href="#admin-members"><small>부원 (관리자 포함)</small><b>${members.length}</b></a>
      <a class="kpi" href="#admin-notices"><small>공지사항</small><b>${notices.length}</b></a>
      <a class="kpi" href="#activity"><small>활동 기록</small><b>${acts.length}</b></a>
      <a class="kpi" href="#community"><small>커뮤니티 글</small><b>${posts.length}</b></a>
    </div>
    <div class="grid-2 mt-l">
      <div class="panel hudc">
        <div class="panel-head"><h3>NEW <small>대기 중인 신청</small></h3><a class="more" href="#admin-applications">전체 ${icon("right")}</a></div>
        ${pending.length ? `<ul class="mini-board">${pending.slice(0, 6).map((a) => `<li><a href="#admin-applications" data-app="${esc(a.id)}"><span class="t">${avatar(a.photo, a.name, "sm")}<span>${esc(a.name)} · ${esc(a.studentNo)}</span></span><span class="d">${relTime(a.createdAt)}</span></a></li>`).join("")}</ul>` : empty("대기 중인 신청이 없어요")}
      </div>
      <div class="panel hudc">
        <div class="panel-head"><h3>QUICK <small>바로 하기</small></h3></div>
        <div style="display:grid;gap:10px;margin-top:10px">
          <button class="btn" id="qNotice" style="justify-content:flex-start">${icon("megaphone")} 새 공지 작성</button>
          <a class="btn" href="#admin-banners" style="justify-content:flex-start">${icon("image")} 메인 배너 바꾸기</a>
          <a class="btn" href="#admin-site" style="justify-content:flex-start">${icon("gear")} 소개 문구 · 모집 상태 수정</a>
          <p class="text-dim" style="font-size:14px;margin-top:6px">현재 모집 상태: <b style="color:${S.site.recruitOpen ? "var(--green)" : "var(--red)"}">${S.site.recruitOpen ? "모집 중" : "모집 마감"}</b></p>
        </div>
      </div>
    </div>`;
  $("#qNotice").addEventListener("click", () => noticeForm(null, () => {}));
  body.querySelectorAll("[data-app]").forEach((el) => el.addEventListener("click", (e) => {
    e.preventDefault();
    const a = apps.find((x) => x.id === el.dataset.app);
    appDetail(a, () => dashboard(body));
  }));
}

// ---------------------------------------------------------------------
async function applications(body) {
  let apps = await S.api.list("applications", { orderBy: ["createdAt", "desc"] });
  let f = "pending";
  const draw = () => {
    if (!body.isConnected) return;
    const cnt = (s) => apps.filter((a) => s === "all" || a.status === s).length;
    const items = apps.filter((a) => f === "all" || a.status === f);
    body.innerHTML = `
      <div class="tabs" id="apTabs" style="margin-bottom:16px">${[["pending", "대기"], ["approved", "승인"], ["rejected", "반려"], ["all", "전체"]].map(([k, l]) => `<button class="tab ${k === f ? "active" : ""}" data-f="${k}">${l} <span class="text-dim">${cnt(k)}</span></button>`).join("")}</div>
      <div class="panel">${items.length ? `<div class="table-wrap"><table class="tbl stack">
        <thead><tr><th>신청자</th><th>학번</th><th>관심 분야</th><th>신청일</th><th>상태</th><th></th></tr></thead>
        <tbody>${items.map((a) => `<tr>
          <td><div class="who">${avatar(a.photo, a.name)}<div><b>${esc(a.name)}</b><small>${esc(a.email || "")}</small></div></div></td>
          <td class="num">${esc(a.studentNo)}</td>
          <td>${esc((a.interests || []).join(", ") || "-")}</td>
          <td class="num">${fmtDate(a.createdAt)}</td>
          <td><span class="chip ${esc(a.status)}">${STATUS[a.status] || a.status}</span></td>
          <td class="acts"><button class="btn sm" data-v="${esc(a.id)}">${icon("eye")} 보기</button></td></tr>`).join("")}</tbody></table></div>`
        : empty(f === "pending" ? "대기 중인 신청이 없어요" : "해당하는 신청이 없어요")}</div>`;
    $("#apTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (b) { f = b.dataset.f; draw(); } });
    body.querySelectorAll("[data-v]").forEach((b) => b.addEventListener("click", () => appDetail(apps.find((a) => a.id === b.dataset.v), async () => {
      apps = await S.api.list("applications", { orderBy: ["createdAt", "desc"] });
      draw();
      const c = $("#pendingCnt"), n = apps.filter((a) => a.status === "pending").length;
      if (c) { c.hidden = !n; c.textContent = n; }
    })));
  };
  draw();
}

function appDetail(a, after) {
  if (!a) return;
  modal({
    title: `${a.name} 님의 가입 신청`,
    wide: true,
    body: `<div style="display:flex;gap:14px;align-items:center;margin-bottom:18px">${avatar(a.photo, a.name, "lg")}<div><b style="font-size:18px">${esc(a.name)}</b> <span class="chip ${esc(a.status)}">${STATUS[a.status] || ""}</span><div class="text-dim" style="font-size:14px">${esc(a.email || "")}</div></div></div>
      <dl class="dl">
        <dt>학번</dt><dd>${esc(a.studentNo)} <span class="text-dim">(${esc(a.studentNo?.[0] || "?")}학년 ${esc(String(+a.studentNo?.slice(1, 3) || "?"))}반 ${esc(String(+a.studentNo?.slice(3) || "?"))}번)</span></dd>
        <dt>연락처</dt><dd>${esc(a.phone || "-")}</dd>
        <dt>관심 분야</dt><dd>${esc((a.interests || []).join(", ") || "-")}</dd>
        <dt>지원 동기</dt><dd>${esc(a.motivation)}</dd>
        <dt>경험</dt><dd>${esc(a.experience || "-")}</dd>
        <dt>신청일</dt><dd>${fmtDateTime(a.createdAt)}${a.reviewedAt ? ` · 처리 ${fmtDateTime(a.reviewedAt)}` : ""}</dd>
      </dl>
      <div class="field mt-l"><label for="apMemo">신청자에게 보일 메모 (선택)</label><textarea id="apMemo" rows="2" style="min-height:70px" maxlength="300" placeholder="예: 환영해요! 첫 모임은 3월 둘째 주 금요일입니다.">${esc(a.adminMemo || "")}</textarea></div>`,
    foot: `<button class="btn danger" data-act="delete" style="margin-right:auto">${icon("trash")} 삭제</button>
      ${a.status !== "rejected" ? `<button class="btn" data-act="reject">${icon("x")} 반려</button>` : ""}
      ${a.status !== "approved" ? `<button class="btn primary" data-act="approve">${icon("check")} 승인 — 부원으로 등록</button>` : ""}`,
    onMount(el, ctl) {
      el.parentElement.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", async () => {
        const act = b.dataset.act;
        const memo = $("#apMemo", el).value.trim();
        if (act === "delete" && !(await confirmDialog("이 신청서를 삭제할까요?", { danger: true, okText: "삭제" }))) return;
        setBtnBusy(b, true); ctl.setBusy(true);
        try {
          if (act === "approve") {
            await S.api.update("applications", a.id, { status: "approved", adminMemo: memo, reviewedAt: S.api.now() });
            await S.api.set("users", a.id, { role: "member", realName: a.name, studentNo: a.studentNo }, true);
            toast(`${a.name} 님을 부원으로 등록했어요.`, "ok");
          } else if (act === "reject") {
            await S.api.update("applications", a.id, { status: "rejected", adminMemo: memo, reviewedAt: S.api.now() });
            toast("반려 처리했어요.");
          } else {
            await S.api.remove("applications", a.id);
            toast("삭제했어요.");
          }
          ctl.setBusy(false); ctl.close();
          after && after();
        } catch (e) { toast(errMsg(e), "err"); setBtnBusy(b, false); ctl.setBusy(false); }
      }));
    }
  });
}

// ---------------------------------------------------------------------
async function members(body) {
  let users = await S.api.list("users", { orderBy: ["createdAt", "desc"] });
  let q = "", rf = "all";
  const draw = () => {
    if (!body.isConnected) return;
    const items = users.filter((u) => (rf === "all" || u.role === rf) && (!q || `${u.realName || ""} ${u.name} ${u.email} ${u.studentNo || ""}`.toLowerCase().includes(q)));
    const tbody = $("#mBody");
    tbody.innerHTML = items.map((u) => `<tr>
      <td><div class="who">${avatar(u.photo, u.realName || u.name)}<div><b>${esc(u.realName || u.name)}</b><small>${esc(u.email)}</small></div></div></td>
      <td class="num">${esc(u.studentNo || "-")}</td>
      <td><select data-uid="${esc(u.id)}" aria-label="${esc(u.realName || u.name)} 역할" ${u.id === S.user.uid ? "disabled title='내 역할은 바꿀 수 없어요'" : ""}>
        ${["guest", "member", "admin"].map((r) => `<option value="${r}" ${u.role === r ? "selected" : ""}>${ROLE_LABEL[r]}</option>`).join("")}</select></td>
      <td class="num">${fmtDate(u.createdAt)}</td>
      <td class="num text-dim">${u.lastLoginAt ? relTime(u.lastLoginAt) : "-"}</td></tr>`).join("") || `<tr><td colspan="5">${empty("해당하는 회원이 없어요")}</td></tr>`;
    $("#mCount").textContent = `${items.length}명`;
  };
  body.innerHTML = `
    <div class="sec-head" style="margin-bottom:16px">
      <div class="tabs" id="mTabs">${[["all", "전체"], ["admin", "관리자"], ["member", "부원"], ["guest", "일반"]].map(([k, l]) => `<button class="tab ${k === rf ? "active" : ""}" data-r="${k}">${l} <span class="text-dim">${k === "all" ? users.length : users.filter((u) => u.role === k).length}</span></button>`).join("")}</div>
      <label class="search">${icon("search")}<span class="sr">회원 검색</span><input type="search" id="mq" placeholder="이름·이메일·학번"></label>
    </div>
    <div class="panel"><p class="text-dim" style="font-size:13.5px;margin-bottom:10px"><span id="mCount"></span> · 역할: <b>일반</b>(로그인만) · <b>부원</b>(활동 기록·커뮤니티 작성) · <b>관리자</b>(전체 관리)</p>
      <div class="table-wrap"><table class="tbl stack"><thead><tr><th>회원</th><th>학번</th><th>역할</th><th>가입일</th><th>최근 접속</th></tr></thead><tbody id="mBody"></tbody></table></div></div>`;
  draw();
  $("#mq").addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); draw(); });
  $("#mTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-r]"); if (!b) return; rf = b.dataset.r; $$("#mTabs .tab").forEach((t) => t.classList.toggle("active", t === b)); draw(); });
  $("#mBody").addEventListener("change", async (e) => {
    const sel = e.target.closest("select[data-uid]");
    if (!sel) return;
    const u = users.find((x) => x.id === sel.dataset.uid);
    const role = sel.value;
    const ok = await confirmDialog(`${u.realName || u.name} 님의 역할을 '${ROLE_LABEL[u.role] || "일반"}' → '${ROLE_LABEL[role]}'(으)로 바꿀까요?${role === "admin" ? "\n관리자는 모든 데이터를 수정·삭제할 수 있어요." : ""}`, { okText: "변경" });
    if (!ok) { sel.value = u.role; return; }
    try { await S.api.update("users", u.id, { role }); u.role = role; toast("역할을 바꿨어요.", "ok"); }
    catch (err) { sel.value = u.role; toast(errMsg(err), "err"); }
  });
}

// ---------------------------------------------------------------------
async function banners(body) {
  await loadBanners();
  const draw = () => {
    if (!body.isConnected) return;
    const list = S.allBanners;
    body.innerHTML = `
      <div class="sec-head" style="margin-bottom:16px"><div><h2 style="font-size:20px">메인 배너</h2><p>홈 화면 첫 화면에 차례로 넘어가는 배너예요. 사진은 가로 1920px 이상을 권장해요.</p></div>
        <div class="toolbar"><a class="btn" href="#home">${icon("eye")} 홈에서 보기</a><button class="btn primary" id="bAdd">${icon("plus")} 배너 추가</button></div></div>
      ${!list.length ? `<div class="notice-box"><span>등록된 배너가 없어서 지금은 <b>기본 배너 ${DEFAULT_BANNERS.length}장</b>이 보이고 있어요.</span><button class="btn sm" id="bImport">기본 배너 가져와서 편집하기</button></div>` : ""}
      <div class="banner-list mt-m">${list.map((b, i) => `
        <div class="banner-row ${b.active === false ? "off" : ""}">
          <div class="bimg" style="background-image:url('${esc(b.imageUrl)}')"></div>
          <div><h3>${esc(b.title || "(제목 없음)")} ${b.active === false ? '<span class="chip">숨김</span>' : '<span class="chip approved">표시 중</span>'}</h3>
            <p>${esc(b.subtitle || "")}${b.subtitle ? " · " : ""}${esc(b.text || "")}</p>
            <p>${b.buttonLabel ? `버튼: ${esc(b.buttonLabel)} → ${esc(b.buttonLink || "")}` : "버튼 없음"}</p></div>
          <div class="acts">
            <button class="btn sm icon" data-up="${i}" ${i === 0 ? "disabled" : ""} aria-label="위로">${icon("up")}</button>
            <button class="btn sm icon" data-down="${i}" ${i === list.length - 1 ? "disabled" : ""} aria-label="아래로">${icon("down")}</button>
            <button class="btn sm" data-toggle="${i}">${b.active === false ? "보이기" : "숨기기"}</button>
            <button class="btn sm" data-edit="${i}">${icon("edit")} 수정</button>
            <button class="btn sm danger icon" data-del="${i}" aria-label="삭제">${icon("trash")}</button>
          </div>
        </div>`).join("")}</div>`;
    $("#bAdd").addEventListener("click", () => bannerForm(null, refresh));
    $("#bImport")?.addEventListener("click", async (e) => {
      setBtnBusy(e.target, true);
      try {
        for (let i = 0; i < DEFAULT_BANNERS.length; i++) await S.api.add("banners", { ...DEFAULT_BANNERS[i], imagePath: "", order: i, active: true });
        toast("기본 배너를 가져왔어요. 이제 자유롭게 고칠 수 있어요.", "ok");
        refresh();
      } catch (err) { toast(errMsg(err), "err"); setBtnBusy(e.target, false); }
    });
    body.querySelector(".banner-list").addEventListener("click", async (e) => {
      const t = e.target.closest("button");
      if (!t) return;
      const L = S.allBanners;
      try {
        if (t.dataset.up || t.dataset.down) {
          const i = +(t.dataset.up ?? t.dataset.down), j = t.dataset.up ? i - 1 : i + 1;
          const order = L.map((b) => b.id);
          [order[i], order[j]] = [order[j], order[i]];
          await Promise.all(order.map((id, k) => S.api.update("banners", id, { order: k })));
          return refresh();
        }
        if (t.dataset.toggle) { const b = L[+t.dataset.toggle]; await S.api.update("banners", b.id, { active: b.active === false }); return refresh(); }
        if (t.dataset.edit) return bannerForm(L[+t.dataset.edit], refresh);
        if (t.dataset.del) {
          const b = L[+t.dataset.del];
          if (!(await confirmDialog(`'${b.title || "배너"}' 배너를 삭제할까요?`, { danger: true, okText: "삭제" }))) return;
          await S.api.remove("banners", b.id);
          if (b.imagePath) await S.api.deleteFile(b.imagePath);
          toast("삭제했어요.");
          return refresh();
        }
      } catch (err) { toast(errMsg(err), "err"); }
    });
  };
  const refresh = async () => { await loadBanners(); draw(); };
  draw();
}

function bannerForm(b, after) {
  const LINKS = [["#about", "소개"], ["#activity", "활동"], ["#gallery", "갤러리"], ["#notice", "공지사항"], ["#community", "커뮤니티"], ["#join", "가입하기"]];
  const custom = b && b.buttonLink && !LINKS.some(([v]) => v === b.buttonLink);
  let mf;
  modal({
    title: b ? "배너 수정" : "배너 추가",
    wide: true,
    body: `<form class="form" id="bf">
      <div class="field"><span class="label">배경 사진<span class="req">*</span></span><div id="bfImg"></div><span class="hint">글씨가 올라가는 왼쪽이 하늘처럼 단순한 사진이 잘 어울려요.</span></div>
      <div class="row-2">
        <div class="field"><label for="bfS">작은 제목</label><input type="text" id="bfS" maxlength="40" placeholder="예: Bugil Academy" value="${esc(b?.subtitle || "")}"></div>
        <div class="field"><label for="bfT">큰 제목</label><input type="text" id="bfT" maxlength="24" placeholder="예: ASTRO" value="${esc(b?.title || "")}"><span class="hint">'ASTRO'라고 쓰면 로고 글자체로 보여요. 영문 대문자 12자 이내가 보기 좋아요.</span></div>
      </div>
      <div class="field"><label for="bfX">설명 (두 줄 권장)</label><textarea id="bfX" rows="2" style="min-height:76px" maxlength="120">${esc(b?.text || "")}</textarea></div>
      <div class="row-2">
        <div class="field"><label for="bfL">버튼 글자 (비우면 버튼 숨김)</label><input type="text" id="bfL" maxlength="16" placeholder="예: 둘러보기" value="${esc(b?.buttonLabel ?? "")}"></div>
        <div class="field"><label for="bfK">버튼 연결</label><select id="bfK">${LINKS.map(([v, l]) => `<option value="${v}" ${b?.buttonLink === v ? "selected" : ""}>${l} 페이지</option>`).join("")}<option value="custom" ${custom ? "selected" : ""}>직접 입력 (외부 링크)</option></select>
          <input type="url" id="bfU" class="mt-s" placeholder="https://..." value="${custom ? esc(b.buttonLink) : ""}" ${custom ? "" : "hidden"}></div>
      </div>
      <label class="switch"><input type="checkbox" id="bfA" ${b?.active === false ? "" : "checked"}> 홈 화면에 표시</label>
      <div id="bfProg" hidden><div class="progress"><i></i></div></div>
    </form>`,
    foot: `<button class="btn" data-close>취소</button><button class="btn primary" id="bfSave">${b ? "저장" : "추가"}</button>`,
    onMount(el, ctl) {
      mf = mediaField($("#bfImg", el), { initial: b?.imageUrl ? [{ url: b.imageUrl, path: b.imagePath || "", type: "image" }] : [], accept: "image/*", multiple: false, max: 1, limits: UPLOAD_LIMITS });
      const k = $("#bfK", el), u = $("#bfU", el);
      k.addEventListener("change", () => { u.hidden = k.value !== "custom"; });
      const save = el.parentElement.querySelector("#bfSave");
      save.addEventListener("click", async () => {
        if (!mf.count) return toast("배경 사진을 올려 주세요.", "err");
        const link = k.value === "custom" ? safeLink(u.value) : k.value;
        if (k.value === "custom" && !/^https?:\/\//.test(link)) return toast("외부 링크는 https:// 로 시작해야 해요.", "err");
        setBtnBusy(save, true); ctl.setBusy(true);
        try {
          let imageUrl = b?.imageUrl || "", imagePath = b?.imagePath || "";
          if (mf.files.length) {
            $("#bfProg", el).hidden = false;
            const f = await prepareImage(mf.files[0], Math.max(imageMaxSide(), 1920), 0.88);
            const r = await S.api.upload(f, "banners", (p) => { $("#bfProg i", el).style.width = `${p * 100}%`; });
            if (imagePath && imagePath !== r.path) await S.api.deleteFile(imagePath);
            imageUrl = r.url; imagePath = r.path;
          }
          const data = { imageUrl, imagePath, subtitle: $("#bfS", el).value.trim(), title: $("#bfT", el).value.trim(), text: $("#bfX", el).value.trim(), buttonLabel: $("#bfL", el).value.trim(), buttonLink: link, active: $("#bfA", el).checked, updatedAt: S.api.now() };
          if (b) await S.api.update("banners", b.id, data);
          else await S.api.add("banners", { ...data, order: (S.allBanners.reduce((m, x) => Math.max(m, x.order ?? 0), -1)) + 1 });
          ctl.setBusy(false); ctl.close();
          toast(b ? "배너를 저장했어요." : "배너를 추가했어요.", "ok");
          after && after();
        } catch (e) { toast(errMsg(e), "err"); setBtnBusy(save, false); ctl.setBusy(false); }
      });
    }
  });
}

// ---------------------------------------------------------------------
async function notices(body) {
  const draw = async () => {
    const list = await S.api.list("notices", { orderBy: ["createdAt", "desc"] });
    if (!body.isConnected) return;
    body.innerHTML = `
      <div class="sec-head" style="margin-bottom:16px"><div><h2 style="font-size:20px">공지사항 관리</h2><p>고정한 공지는 목록 맨 위에 보여요.</p></div>
        <div class="toolbar"><button class="btn primary" id="anWrite">${icon("plus")} 공지 작성</button></div></div>
      <div class="panel">${list.length ? `<div class="table-wrap"><table class="tbl stack"><thead><tr><th>제목</th><th>작성일</th><th>고정</th><th></th></tr></thead><tbody>
        ${list.map((n) => `<tr><td><a href="#notice-${esc(n.id)}" style="font-weight:500">${esc(n.title)}</a></td><td class="num">${fmtDate(n.createdAt)}</td>
          <td><label class="switch"><input type="checkbox" data-pin="${esc(n.id)}" ${n.pinned ? "checked" : ""} aria-label="고정"></label></td>
          <td class="acts"><button class="btn sm" data-edit="${esc(n.id)}">${icon("edit")} 수정</button><button class="btn sm danger icon" data-del="${esc(n.id)}" aria-label="삭제">${icon("trash")}</button></td></tr>`).join("")}
      </tbody></table></div>` : empty("등록된 공지가 없어요")}</div>`;
    $("#anWrite").addEventListener("click", () => noticeForm(null, draw));
    body.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => noticeForm(list.find((n) => n.id === b.dataset.edit), draw)));
    body.querySelectorAll("[data-pin]").forEach((c) => c.addEventListener("change", async () => {
      try { await S.api.update("notices", c.dataset.pin, { pinned: c.checked }); toast(c.checked ? "상단에 고정했어요." : "고정을 해제했어요."); }
      catch (e) { c.checked = !c.checked; toast(errMsg(e), "err"); }
    }));
    body.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      const n = list.find((x) => x.id === b.dataset.del);
      if (!(await confirmDialog(`"${n.title}" 공지를 삭제할까요?`, { danger: true, okText: "삭제" }))) return;
      try { await S.api.remove("notices", n.id); toast("삭제했어요."); draw(); } catch (e) { toast(errMsg(e), "err"); }
    }));
  };
  await draw();
}

// ---------------------------------------------------------------------
async function site(body) {
  await loadSite();
  const s = S.site;
  const ta = (id, label, val, rows = 4, hint = "") => `<div class="field"><label for="${id}">${label}</label><textarea id="${id}" rows="${rows}" style="min-height:${rows * 26 + 24}px">${esc(val || "")}</textarea>${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;
  const inp = (id, label, val, ph = "") => `<div class="field"><label for="${id}">${label}</label><input type="text" id="${id}" value="${esc(val || "")}" placeholder="${esc(ph)}"></div>`;
  body.innerHTML = `<form class="form" id="sf">
    <div class="panel hudc"><div class="panel-head"><h3>RECRUIT <small>모집</small></h3></div>
      <div class="form mt-s">
        <label class="switch"><input type="checkbox" id="sfOpen" ${s.recruitOpen ? "checked" : ""}> 지금 신입 부원 모집 중 <span class="text-dim" style="font-size:13px">(끄면 새 가입 신청을 받지 않아요)</span></label>
        <div class="row-2">${inp("sfRT", "모집 제목", s.recruitTitle)}${inp("sfRP", "모집 기간", s.recruitPeriod, "예: 2027. 3. 2. ~ 3. 13.")}</div>
        ${ta("sfRX", "모집 안내 문구", s.recruitText, 3)}
      </div></div>
    <div class="panel hudc"><div class="panel-head"><h3>ABOUT <small>소개 페이지</small></h3></div>
      <div class="form mt-s">
        ${ta("sfAH", "대표 문구", s.aboutHeadline, 2)}
        ${ta("sfAB", "동아리 소개 본문", s.aboutBody, 6)}
        ${ta("sfST", "숫자로 보는 아스트로", s.stats, 4, "한 줄에 하나씩 <b>항목 | 값</b> (예: 정기 관측회 | 매월)")}
        ${ta("sfPG", "주요 활동", s.programs, 4, "한 줄에 하나씩 <b>활동 이름 | 설명</b>")}
        ${ta("sfTL", "연간 일정", s.timeline, 6, "한 줄에 하나씩 <b>시기 | 내용</b> (예: 3월 | 신입 부원 모집)")}
      </div></div>
    <div class="panel hudc"><div class="panel-head"><h3>CONTACT <small>연락처 · 하단 문구</small></h3></div>
      <div class="form mt-s">
        <div class="row-2">${inp("sfTe", "지도교사", s.teacher, "예: 과학과 ○○○ 선생님")}${inp("sfRo", "활동 장소", s.room)}</div>
        <div class="row-2">${inp("sfEm", "이메일", s.email)}${inp("sfIg", "인스타그램", s.instagram, "@astro_bugil 또는 https://instagram.com/…")}</div>
        ${inp("sfFt", "사이트 하단 문구", s.footerText)}
        <p class="hint">비워 둔 연락처 항목은 소개 페이지에 보이지 않아요.</p>
      </div></div>
    <div class="form-foot"><a class="btn" href="#about">${icon("eye")} 소개 페이지 보기</a><button class="btn primary" type="submit">${icon("check")} 저장</button></div>
  </form>`;
  $("#sf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = (id) => $(id).value.trim();
    const data = {
      recruitOpen: $("#sfOpen").checked, recruitTitle: v("#sfRT"), recruitPeriod: v("#sfRP"), recruitText: v("#sfRX"),
      aboutHeadline: v("#sfAH"), aboutBody: v("#sfAB"), stats: v("#sfST"), programs: v("#sfPG"), timeline: v("#sfTL"),
      teacher: v("#sfTe"), room: v("#sfRo"), email: v("#sfEm"), instagram: v("#sfIg"), footerText: v("#sfFt"), updatedAt: S.api.now()
    };
    const btn = e.target.querySelector("button[type=submit]");
    setBtnBusy(btn, true);
    try {
      await S.api.set("settings", "site", data, true);
      await loadSite();
      $("#footerText").textContent = S.site.footerText || "";
      toast("사이트 설정을 저장했어요.", "ok");
    } catch (err) { toast(errMsg(err), "err"); }
    setBtnBusy(btn, false);
  });
}
