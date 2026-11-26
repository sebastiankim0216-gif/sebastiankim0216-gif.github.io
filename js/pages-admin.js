// 관리자 페이지 — 옛 ASTRO 운영자 콘솔과 같은 권한 구조
//   운영담당자(owner): 전부 + 관리자 임명, 합격/불합격, 지원 질문, 상단 알림 배너
//   관리자(admin): 신청서 열람·삭제, 공지, 메인 배너, 사이트 설정
import { S, isAdmin, isOwner, imageMaxSide, loadBanners, saveBanners, loadSite, loadQuestions, applicationQA, loadOwners } from "./state.js?v=202611261642";
import { DEFAULT_BANNERS, UPLOAD_LIMITS, SUPABASE } from "./config.js?v=202611261642";
import {
  $, $$, esc, icon, avatar, loading, empty, pageHero, toast, errMsg, modal, confirmDialog,
  setBtnBusy, fmtDate, fmtDateTime, relTime, mediaField, prepareImage, safeLink
} from "./ui.js?v=202611261642";
import { noticeForm, APP_STATUS, applicationAnswersHTML } from "./pages-main.js?v=202611261642";

const TABS = [
  ["", "대시보드", "grid", false],
  ["applications", "가입 신청", "user", false],
  ["questions", "지원 질문", "edit", true],
  ["admins", "관리자", "users", true],
  ["banners", "메인 배너", "image", false],
  ["bar", "상단 알림", "megaphone", true],
  ["notices", "공지사항", "pin", false],
  ["site", "사이트 설정", "gear", false]
];

export async function renderAdmin(app, tab = "") {
  const visible = TABS.filter(([, , , ownerOnly]) => !ownerOnly || isOwner());
  if (!visible.some(([k]) => k === tab)) tab = "";
  app.innerHTML = `${pageHero({ en: "ADMIN", ko: isOwner() ? "운영자 콘솔" : "관리자", desc: "가입 신청 · 공지 · 배너 · 사이트를 관리해요.", bg: "assets/campus-night.jpg" })}
    <section class="page"><div class="wrap" id="adminWrap"></div></section>`;
  const w = $("#adminWrap");
  if (!S.user || !isAdmin()) {
    w.innerHTML = `<div class="panel guard"><div class="status-ico" style="margin:0 auto">${icon("shield")}</div><h2 class="mt-m">관리자 또는 운영담당자만 접근할 수 있어요</h2>
      <p class="text-dim mt-s">${S.user ? "현재 계정에는 관리자 권한이 없어요." : "관리자 계정으로 로그인해 주세요."}</p>
      <div class="acts">${S.user ? "" : `<button class="btn primary" id="admLogin">로그인</button>`}<a class="btn" href="#home">홈으로</a></div></div>`;
    $("#admLogin")?.addEventListener("click", () => S.login());
    return;
  }
  w.innerHTML = `<nav class="admin-tabs" aria-label="관리 메뉴">${visible.map(([k, label, ic]) => `<a href="#admin${k ? "-" + k : ""}" class="${k === tab ? "active" : ""}">${icon(ic)} ${label}${k === "applications" ? ' <span class="cnt" id="pendingCnt" hidden></span>' : ""}</a>`).join("")}</nav>
    <div id="adminBody">${loading()}</div>`;
  const body = $("#adminBody");
  S.api.list("applications").then((l) => setPending(l)).catch(() => {});
  const views = { "": dashboard, applications, questions, admins, banners, bar, notices, site };
  try { await views[tab](body); }
  catch (e) { console.error(e); body.innerHTML = `<div class="panel">${empty("불러오지 못했어요", errMsg(e))}</div>`; }
}
function setPending(list) {
  const c = $("#pendingCnt"), n = list.filter((a) => !a.status || a.status === "pending").length;
  if (c) { c.hidden = !n; c.textContent = n; }
}

// ---------------------------------------------------------------------
async function dashboard(body) {
  const [apps, notices, admins] = await Promise.all([
    S.api.list("applications", { orderBy: ["createdAt", "desc"] }),
    S.api.list("notices").catch(() => []),
    isOwner() ? S.api.list("admins").catch(() => []) : Promise.resolve(null)
  ]);
  if (!body.isConnected) return;
  const pending = apps.filter((a) => !a.status || a.status === "pending");
  body.innerHTML = `
    <div class="kpis">
      <a class="kpi ${pending.length ? "hot" : ""}" href="#admin-applications"><small>검토 대기</small><b>${pending.length}</b></a>
      <a class="kpi" href="#admin-applications"><small>전체 가입 신청</small><b>${apps.length}</b></a>
      <a class="kpi" href="#admin-applications"><small>합격</small><b>${apps.filter((a) => a.status === "accepted").length}</b></a>
      <a class="kpi" href="#admin-notices"><small>등록된 공지사항</small><b>${notices.length}</b></a>
      ${admins ? `<a class="kpi" href="#admin-admins"><small>임명된 관리자</small><b>${admins.length}</b></a>` : `<a class="kpi" href="#activity"><small>내 권한</small><b style="font-size:20px">관리자</b></a>`}
    </div>
    <div class="grid-2 mt-l">
      <div class="panel hudc">
        <div class="panel-head"><h3>NEW <small>검토 대기 중인 신청</small></h3><a class="more" href="#admin-applications">전체 ${icon("right")}</a></div>
        ${pending.length ? `<ul class="mini-board">${pending.slice(0, 6).map((a) => `<li><a href="#admin-applications" data-app="${esc(a.id)}"><span class="t">${avatar("", a.name, "sm")}<span>${esc(a.name || "(이름 없음)")} · ${esc(a.studentId || "")}</span></span><span class="d">${relTime(a.createdAt)}</span></a></li>`).join("")}</ul>` : empty("검토 대기 중인 신청이 없어요")}
      </div>
      <div class="panel hudc">
        <div class="panel-head"><h3>QUICK <small>빠른 작업</small></h3></div>
        <div style="display:grid;gap:10px;margin-top:10px">
          <button class="btn" id="qNotice" style="justify-content:flex-start">${icon("pin")} 새 공지 작성</button>
          ${isOwner() ? `<a class="btn" href="#admin-bar" style="justify-content:flex-start">${icon("megaphone")} 상단 알림 배너 수정</a>
          <a class="btn" href="#admin-admins" style="justify-content:flex-start">${icon("users")} 관리자 추가</a>
          <a class="btn" href="#admin-questions" style="justify-content:flex-start">${icon("edit")} 지원 질문 설정</a>` : ""}
          <a class="btn" href="#admin-site" style="justify-content:flex-start">${icon("gear")} 소개 문구 · 모집 상태</a>
          <p class="text-dim" style="font-size:14px;margin-top:6px">모집 상태: <b style="color:${S.site.recruitOpen ? "var(--green)" : "var(--red)"}">${S.site.recruitOpen ? "모집 중" : "모집 마감"}</b></p>
        </div>
      </div>
    </div>`;
  $("#qNotice").addEventListener("click", () => noticeForm(null, () => {}));
  body.querySelectorAll("[data-app]").forEach((el) => el.addEventListener("click", (e) => {
    e.preventDefault();
    appDetail(apps.find((x) => x.id === el.dataset.app), () => dashboard(body));
  }));
}

// ---------------------------------------------------------------------
async function applications(body) {
  await loadQuestions();
  let apps = await S.api.list("applications", { orderBy: ["createdAt", "desc"] });
  let f = "all";
  const reload = async () => { apps = await S.api.list("applications", { orderBy: ["createdAt", "desc"] }); setPending(apps); draw(); };
  const st = (a) => a.status || "pending";
  const draw = () => {
    if (!body.isConnected) return;
    const cnt = (s) => apps.filter((a) => s === "all" || st(a) === s).length;
    const items = apps.filter((a) => f === "all" || st(a) === f);
    body.innerHTML = `
      <div class="sec-head" style="margin-bottom:16px">
        <div class="tabs" id="apTabs">${[["all", "전체"], ["pending", "검토 대기"], ["accepted", "합격자"], ["rejected", "불합격자"]].map(([k, l]) => `<button class="tab ${k === f ? "active" : ""}" data-f="${k}">${l} <span class="text-dim">${cnt(k)}</span></button>`).join("")}</div>
        <div class="toolbar"><button class="btn" id="apCsv">${icon("down")} 엑셀(CSV) 저장</button>${isOwner() && apps.length ? `<button class="btn danger" id="apDelAll">${icon("trash")} 전체 삭제</button>` : ""}</div>
      </div>
      ${!isOwner() ? `<p class="text-dim" style="font-size:13.5px;margin-bottom:12px">합격·불합격 결정은 운영담당자만 할 수 있어요. 관리자는 지원서 열람과 삭제가 가능해요.</p>` : ""}
      <div class="panel">${items.length ? `<div class="table-wrap"><table class="tbl stack">
        <thead><tr><th>#</th><th>신청자</th><th>학번</th><th>전화번호</th><th>제출일</th><th>상태</th><th></th></tr></thead>
        <tbody>${items.map((a, i) => `<tr>
          <td class="num text-dim">${i + 1}</td>
          <td><div class="who">${avatar("", a.name)}<div><b>${esc(a.name || "(이름 없음)")}</b><small>${esc(a.email || "")}</small></div></div></td>
          <td class="num">${esc(a.studentId || "-")}</td>
          <td class="num">${esc(a.phone || "-")}</td>
          <td class="num">${a.createdAt ? fmtDate(a.createdAt) : "날짜 미상"}</td>
          <td><span class="chip ${APP_STATUS[st(a)].cls}">${APP_STATUS[st(a)].label}</span></td>
          <td class="acts">
            <button class="btn sm" data-v="${esc(a.id)}">${icon("eye")} 보기</button>
            ${isOwner() ? (st(a) === "pending" ? `<button class="btn sm" data-pass="${esc(a.id)}" style="color:var(--green)">합격</button><button class="btn sm" data-fail="${esc(a.id)}" style="color:var(--red)">불합격</button>` : `<button class="btn sm" data-reset="${esc(a.id)}">결과 취소</button>`) : ""}
            <button class="btn sm danger icon" data-del="${esc(a.id)}" aria-label="삭제">${icon("trash")}</button>
          </td></tr>`).join("")}</tbody></table></div>`
        : empty("조회된 신청자가 없어요")}</div>`;
    $("#apTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (b) { f = b.dataset.f; draw(); } });
    $("#apCsv").addEventListener("click", () => downloadCsv(items));
    $("#apDelAll")?.addEventListener("click", async () => {
      if (!(await confirmDialog(`정말 모든 지원서 ${apps.length}건을 삭제할까요?\n복구할 수 없어요.`, { danger: true, okText: "전체 삭제" }))) return;
      try { await Promise.all(apps.map((a) => S.api.remove("applications", a.id))); toast("모든 신청이 삭제되었어요.", "ok"); reload(); }
      catch (e) { toast(errMsg(e), "err"); reload(); }
    });
    body.querySelector("tbody")?.addEventListener("click", async (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const id = b.dataset.v || b.dataset.pass || b.dataset.fail || b.dataset.reset || b.dataset.del;
      const a = apps.find((x) => x.id === id);
      if (!a) return;
      try {
        if (b.dataset.v) return appDetail(a, reload);
        if (b.dataset.pass) { await S.api.update("applications", id, { status: "accepted" }); toast(`${a.name} 님 합격 처리했어요.`, "ok"); }
        if (b.dataset.fail) { await S.api.update("applications", id, { status: "rejected" }); toast(`${a.name} 님 불합격 처리했어요.`); }
        if (b.dataset.reset) { await S.api.update("applications", id, { status: "pending" }); toast("결과를 취소했어요."); }
        if (b.dataset.del) {
          if (!(await confirmDialog(`${a.name} 님의 지원서를 완전히 삭제할까요?`, { danger: true, okText: "삭제" }))) return;
          await S.api.remove("applications", id); toast("삭제했어요.");
        }
        reload();
      } catch (err) { toast(errMsg(err), "err"); }
    });
  };
  draw();
}

function appDetail(a, after) {
  if (!a) return;
  const st = a.status || "pending";
  modal({
    title: `${a.name || "(이름 없음)"} 님의 지원서`,
    wide: true,
    body: `<p style="margin-bottom:14px"><span class="chip ${APP_STATUS[st].cls}">${APP_STATUS[st].label}</span> <span class="text-dim" style="font-size:13.5px">제출 ${fmtDateTime(a.createdAt)}${a.updatedAt ? ` · 수정 ${fmtDateTime(a.updatedAt)}` : ""}</span></p>${applicationAnswersHTML(a)}`,
    foot: isOwner()
      ? (st === "pending" ? `<button class="btn" data-act="rejected">${icon("x")} 불합격</button><button class="btn primary" data-act="accepted">${icon("check")} 합격</button>` : `<button class="btn" data-act="pending">결과 취소</button><button class="btn primary" data-close>닫기</button>`)
      : `<button class="btn primary" data-close>닫기</button>`,
    onMount(el, ctl) {
      el.parentElement.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", async () => {
        setBtnBusy(b, true);
        try {
          await S.api.update("applications", a.id, { status: b.dataset.act });
          toast(b.dataset.act === "accepted" ? "합격 처리했어요." : b.dataset.act === "rejected" ? "불합격 처리했어요." : "결과를 취소했어요.", "ok");
          ctl.close(); after && after();
        } catch (e) { toast(errMsg(e), "err"); setBtnBusy(b, false); }
      }));
    }
  });
}

function downloadCsv(items) {
  // 문항 목록: 지금 설정된 문항 + 지원서에 저장된 문항(예전 문항 포함)
  const qcols = [];
  const seen = new Set();
  [...S.questionList.map((q) => ({ id: q.id, title: q.title })), ...items.flatMap((a) => applicationQA(a))].forEach((q) => {
    if (!seen.has(q.id)) { seen.add(q.id); qcols.push(q); }
  });
  const base = [["studentId", "학번"], ["name", "이름"], ["phone", "전화번호"], ["email", "이메일"], ["status", "상태"], ["createdAt", "제출일"]];
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = [...base.map(([, l]) => l), ...qcols.map((q, i) => `${i + 1}. ${q.title}`)];
  const rows = items.map((a) => {
    const ans = Object.fromEntries(applicationQA(a).map((q) => [q.id, q.answer]));
    return [...base.map(([k]) => k === "createdAt" ? fmtDateTime(a.createdAt) : k === "status" ? APP_STATUS[a.status || "pending"].label : a[k]), ...qcols.map((q) => ans[q.id] ?? "")].map(cell).join(",");
  });
  const csv = "\uFEFF" + [head.map(cell).join(","), ...rows].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = `ASTRO_가입신청_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------------------------------------------------------------------
// 지원 문항 편집 — 개수·순서·글자 수·필수 여부를 자유롭게 (config/apply_questions.items)
async function questions(body) {
  let list = (await loadQuestions()).map((q) => ({ ...q }));
  const newId = () => "q" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const draw = () => {
    if (!body.isConnected) return;
    body.innerHTML = `<div class="panel hudc">
      <div class="panel-head"><h3>QUESTIONS <small>가입 신청 문항</small></h3><span class="text-dim" style="font-size:13.5px">${list.length}개 문항</span></div>
      <p class="text-dim" style="font-size:14px;margin:6px 0 18px">문항을 추가·삭제하고 순서와 글자 수 제한을 정할 수 있어요. 학번·이름·전화번호·이메일은 항상 받아요.<br>이미 제출된 지원서에는 제출 당시의 문항이 함께 저장되어 그대로 보여요.</p>
      <div class="q-edit" id="qList">${list.map((q, i) => `
        <div class="q-row" data-i="${i}">
          <div class="q-no">${i + 1}</div>
          <div class="q-main">
            <textarea data-k="title" rows="2" placeholder="질문 내용">${esc(q.title)}</textarea>
            <div class="q-opts">
              <label>최소 <input type="number" data-k="min" min="0" max="5000" value="${q.min || ""}" placeholder="없음">자</label>
              <label>최대 <input type="number" data-k="max" min="0" max="5000" value="${q.max || ""}" placeholder="없음">자</label>
              <label class="check-line" style="align-items:center"><input type="checkbox" data-k="required" ${q.required ? "checked" : ""}> 필수</label>
            </div>
          </div>
          <div class="q-acts">
            <button type="button" class="btn sm icon" data-up="${i}" ${i === 0 ? "disabled" : ""} aria-label="위로">${icon("up")}</button>
            <button type="button" class="btn sm icon" data-down="${i}" ${i === list.length - 1 ? "disabled" : ""} aria-label="아래로">${icon("down")}</button>
            <button type="button" class="btn sm icon danger" data-del="${i}" aria-label="삭제">${icon("trash")}</button>
          </div>
        </div>`).join("")}</div>
      <button type="button" class="btn mt-m" id="qAdd" style="width:100%">${icon("plus")} 문항 추가</button>
      <div class="form-foot mt-m"><a class="btn" href="#join">${icon("eye")} 신청서 보기</a><button type="button" class="btn" id="qReset">기본 5문항으로</button><button type="button" class="btn primary" id="qSave">${icon("check")} 저장</button></div>
    </div>`;
    $("#qList").addEventListener("input", (e) => {
      const row = e.target.closest(".q-row"), k = e.target.dataset.k;
      if (!row || !k) return;
      const q = list[+row.dataset.i];
      q[k] = k === "required" ? e.target.checked : k === "title" ? e.target.value : Math.max(0, parseInt(e.target.value, 10) || 0);
    });
    $("#qList").addEventListener("change", (e) => { if (e.target.dataset.k === "required") list[+e.target.closest(".q-row").dataset.i].required = e.target.checked; });
    $("#qList").addEventListener("click", async (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.up) { const i = +b.dataset.up; [list[i - 1], list[i]] = [list[i], list[i - 1]]; draw(); }
      if (b.dataset.down) { const i = +b.dataset.down; [list[i + 1], list[i]] = [list[i], list[i + 1]]; draw(); }
      if (b.dataset.del) {
        if (list.length <= 1) return toast("문항은 최소 1개가 필요해요.", "err");
        if (!(await confirmDialog(`${+b.dataset.del + 1}번 문항을 삭제할까요?\n(저장해야 반영돼요)`, { danger: true, okText: "삭제" }))) return;
        list.splice(+b.dataset.del, 1); draw();
      }
    });
    $("#qAdd").addEventListener("click", () => { list.push({ id: newId(), title: "", min: 0, max: 0, required: true }); draw(); body.querySelector(".q-row:last-child textarea")?.focus(); });
    $("#qReset").addEventListener("click", async () => {
      if (!(await confirmDialog("옛 사이트와 같은 기본 5문항으로 되돌릴까요?\n(저장해야 반영돼요)", { okText: "되돌리기" }))) return;
      const { DEFAULT_QUESTIONS } = await import("./config.js?v=202611261642");
      list = DEFAULT_QUESTIONS.map((q) => ({ ...q })); draw();
    });
    $("#qSave").addEventListener("click", async (e) => {
      const items = list.map((q) => ({ id: q.id, title: String(q.title || "").trim(), min: +q.min || 0, max: +q.max || 0, required: !!q.required }));
      const bad = items.findIndex((q) => !q.title);
      if (bad >= 0) return toast(`${bad + 1}번 문항 내용을 입력해 주세요.`, "err");
      const badLen = items.findIndex((q) => q.max && q.min > q.max);
      if (badLen >= 0) return toast(`${badLen + 1}번 문항의 최소 글자 수가 최대보다 커요.`, "err");
      setBtnBusy(e.target, true);
      try {
        await S.api.set("config", "apply_questions", { items, updatedAt: S.api.now() }, true);
        list = (await loadQuestions()).map((q) => ({ ...q }));
        toast("가입 신청 문항을 저장했어요.", "ok"); draw();
      } catch (err) { toast(errMsg(err), "err"); setBtnBusy(e.target, false); }
    });
  };
  draw();
}

// ---------------------------------------------------------------------
async function admins(body) {
  const sync = async (list, quiet = true) => {
    if (!SUPABASE.url || !SUPABASE.anonKey) return;
    try {
      const r = await S.api.syncUploaders([...S.owners, ...list.map((a) => a.id)]);
      if (!quiet) toast(`사진 업로드 권한을 맞췄어요. (${r.count}명)`, "ok");
      const el = $("#sbSync"); if (el) el.innerHTML = `${icon("check")} 사진 저장소(Supabase) 업로드 권한 동기화됨`;
    } catch (e) {
      const el = $("#sbSync"); if (el) el.innerHTML = `${icon("x")} Supabase 동기화 실패: ${esc(errMsg(e))}`;
    }
  };
  const draw = async () => {
    const [list] = await Promise.all([S.api.list("admins").catch(() => []), loadOwners()]);
    if (!body.isConnected) return;
    body.innerHTML = `<div class="grid-2">
      <div class="panel hudc">
        <div class="panel-head"><h3>ADMINS <small>현재 관리자</small></h3></div>
        <ul class="my-list">
          ${S.owners.map((e) => `<li><a><span class="role admin">운영담당자</span><span class="t">${esc(e)}</span><span class="d"></span></a></li>`).join("")}
          ${list.map((a) => `<li><a><span class="role">관리자</span><span class="t">${esc(a.id)}</span><button class="btn sm danger" data-rm="${esc(a.id)}">해제</button></a></li>`).join("")}
        </ul>
        ${!list.length ? `<p class="text-dim mt-s" style="font-size:14px">임명된 관리자가 없어요.</p>` : ""}
        <p class="hint mt-s">운영담당자는 홈 화면 비밀번호 콘솔에서 임명·해제해요.</p>
        <p class="text-dim mt-m" id="sbSync" style="font-size:13px;display:flex;gap:6px;align-items:center">${SUPABASE.url ? "사진 저장소 권한 확인 중…" : "사진 저장소(Supabase)가 아직 설정되지 않았어요."}</p>
      </div>
      <div class="panel hudc">
        <div class="panel-head"><h3>ADD <small>새 관리자 추가</small></h3></div>
        <p class="text-dim" style="font-size:14px;margin:6px 0 14px">관리자는 공지 작성·삭제, 활동·일정 등록, 지원서 열람, 메인 배너와 사이트 설정을 할 수 있어요. 해당 이메일로 로그인하면 바로 적용돼요.</p>
        <form class="form" id="adF"><div class="field"><label for="adE">관리자 이메일</label><input type="email" id="adE" placeholder="example@gmail.com"></div><div class="form-foot"><button class="btn primary" type="submit">${icon("plus")} 추가</button></div></form>
      </div></div>`;
    $("#adF").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#adE").value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast("올바른 이메일을 입력해 주세요.", "err");
      if (S.owners.includes(email)) return toast("이미 운영담당자인 이메일이에요.", "err");
      try { await S.api.set("admins", email, { addedBy: S.user.email, addedAt: S.api.now() }, false); toast(`${email} 을(를) 관리자로 추가했어요.`, "ok"); draw(); }
      catch (err) { toast(errMsg(err), "err"); }
    });
    body.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", async () => {
      if (!(await confirmDialog(`${b.dataset.rm} 의 관리자 권한을 해제할까요?`, { danger: true, okText: "해제" }))) return;
      try { await S.api.remove("admins", b.dataset.rm); toast("해제했어요."); draw(); } catch (err) { toast(errMsg(err), "err"); }
    }));
    sync(list);
  };
  await draw();
}

// ---------------------------------------------------------------------
async function banners(body) {
  await loadBanners();
  const draw = () => {
    if (!body.isConnected) return;
    const list = S.allBanners;
    body.innerHTML = `
      <div class="sec-head" style="margin-bottom:16px"><div><h2 style="font-size:20px">메인 배너</h2><p>홈 첫 화면에 보이는 배너예요. 2장 이상이면 자동으로 넘어가요. 사진은 가로 1920px 이상을 권장해요.</p></div>
        <div class="toolbar"><a class="btn" href="#home">${icon("eye")} 홈에서 보기</a><button class="btn primary" id="bAdd">${icon("plus")} 배너 추가</button></div></div>
      ${!list.length ? `<div class="notice-box"><span>등록된 배너가 없어서 지금은 <b>기본 ASTRO 배너</b>가 보이고 있어요.</span><button class="btn sm" id="bImport">기본 배너 가져와서 편집하기</button></div>` : ""}
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
      try { await saveBanners(DEFAULT_BANNERS.map((b) => ({ ...b, imagePath: "", active: true }))); toast("기본 배너를 가져왔어요.", "ok"); draw(); }
      catch (err) { toast(errMsg(err), "err"); setBtnBusy(e.target, false); }
    });
    body.querySelector(".banner-list").addEventListener("click", async (e) => {
      const t = e.target.closest("button");
      if (!t) return;
      const L = S.allBanners.slice();
      try {
        if (t.dataset.up || t.dataset.down) {
          const i = +(t.dataset.up ?? t.dataset.down), j = t.dataset.up ? i - 1 : i + 1;
          [L[i], L[j]] = [L[j], L[i]];
          await saveBanners(L); return draw();
        }
        if (t.dataset.toggle) { const i = +t.dataset.toggle; L[i] = { ...L[i], active: L[i].active === false }; await saveBanners(L); return draw(); }
        if (t.dataset.edit) return bannerForm(+t.dataset.edit, refresh);
        if (t.dataset.del) {
          const i = +t.dataset.del, b = L[i];
          if (!(await confirmDialog(`'${b.title || "배너"}' 배너를 삭제할까요?`, { danger: true, okText: "삭제" }))) return;
          L.splice(i, 1);
          await saveBanners(L);
          if (b.imagePath) await S.api.deleteFile(b.imagePath);
          toast("삭제했어요."); return draw();
        }
      } catch (err) { toast(errMsg(err), "err"); }
    });
  };
  const refresh = () => draw();
  draw();
}

function bannerForm(index, after) {
  const b = index == null ? null : S.allBanners[index];
  const LINKS = [["#about", "소개"], ["#activity", "활동"], ["#gallery", "갤러리"], ["#notice", "공지사항"], ["#community", "커뮤니티"], ["#join", "가입 신청"]];
  const custom = b && b.buttonLink && !LINKS.some(([v]) => v === b.buttonLink);
  let mf;
  modal({
    title: b ? "배너 수정" : "배너 추가",
    wide: true,
    body: `<form class="form" id="bf">
      <div class="field"><span class="label">배경 사진<span class="req">*</span></span><div id="bfImg"></div><span class="hint">글씨가 올라가는 왼쪽이 하늘처럼 단순한 사진이 잘 어울려요.</span></div>
      <div class="row-2">
        <div class="field"><label for="bfS">작은 제목</label><input type="text" id="bfS" maxlength="40" placeholder="예: Bugil Academy" value="${esc(b?.subtitle || "")}"></div>
        <div class="field"><label for="bfT">큰 제목</label><input type="text" id="bfT" maxlength="24" placeholder="예: ASTRO" value="${esc(b?.title || "")}"><span class="hint">'ASTRO'라고 쓰면 로고 글자체로 보여요.</span></div>
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
          const item = { imageUrl, imagePath, subtitle: $("#bfS", el).value.trim(), title: $("#bfT", el).value.trim(), text: $("#bfX", el).value.trim(), buttonLabel: $("#bfL", el).value.trim(), buttonLink: link, active: $("#bfA", el).checked };
          const L = S.allBanners.slice();
          if (b) L[index] = item; else L.push(item);
          await saveBanners(L);
          ctl.setBusy(false); ctl.close();
          toast(b ? "배너를 저장했어요." : "배너를 추가했어요.", "ok");
          after && after();
        } catch (e) { toast(errMsg(e), "err"); setBtnBusy(save, false); ctl.setBusy(false); }
      });
    }
  });
}

// ---------------------------------------------------------------------
// 상단 알림 배너 (옛 사이트 config/site_banner 와 같은 형식)
async function bar(body) {
  const d = (await S.api.get("config", "site_banner").catch(() => null)) || {};
  let type = ["info", "warning", "danger"].includes(d.type) ? d.type : "info";
  body.innerHTML = `<div class="panel hudc">
    <div class="panel-head"><h3>NOTICE BAR <small>사이트 맨 위 알림 배너</small></h3></div>
    <p class="text-dim" style="font-size:14px;margin:6px 0 16px">현재 상태: <b style="color:${d.active ? "var(--green)" : "var(--dim)"}">${d.active ? "게시 중" : "꺼짐"}</b>${d.active && d.message ? ` — ${esc(d.message)}` : ""}</p>
    <form class="form" id="barF">
      <div class="field"><span class="label">배너 유형</span><div class="checks" id="barType">${[["info", "안내"], ["warning", "경고"], ["danger", "긴급"]].map(([k, l]) => `<label><input type="radio" name="bt" value="${k}" ${k === type ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>
      <div class="field"><label for="barM">배너 메시지</label><input type="text" id="barM" maxlength="200" placeholder="예) 오늘 오후 2시~4시 서버 점검 예정" value="${esc(d.message || "")}"></div>
      <label class="switch"><input type="checkbox" id="barD" ${d.dismissible === false ? "" : "checked"}> '오늘 하루 보지 않기' 버튼 표시</label>
      <div class="site-bar-preview" id="barPrev"></div>
      <div class="form-foot">${d.active ? `<button type="button" class="btn danger" id="barOff">${icon("x")} 배너 내리기</button>` : ""}<button class="btn primary" type="submit">${icon("megaphone")} 게시</button></div>
    </form></div>`;
  const prev = () => {
    type = $('input[name="bt"]:checked')?.value || "info";
    $("#barPrev").innerHTML = `<div class="site-bar bar-${type}" style="position:relative"><span class="bar-msg">${icon(type === "info" ? "megaphone" : "shield")}<span>${esc($("#barM").value || "미리보기")}</span></span></div>`;
  };
  prev();
  $("#barType").addEventListener("change", prev);
  $("#barM").addEventListener("input", prev);
  $("#barF").addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = $("#barM").value.trim();
    if (!message) return toast("메시지를 입력해 주세요.", "err");
    try {
      await S.api.set("config", "site_banner", { active: true, type, message, dismissible: $("#barD").checked, updatedAt: S.api.now() }, false);
      toast("배너가 게시되었어요.", "ok"); S.reloadSiteBar && S.reloadSiteBar(); bar(body);
    } catch (err) { toast(errMsg(err), "err"); }
  });
  $("#barOff")?.addEventListener("click", async () => {
    try { await S.api.set("config", "site_banner", { active: false, updatedAt: S.api.now() }, false); toast("배너를 내렸어요."); S.reloadSiteBar && S.reloadSiteBar(); bar(body); }
    catch (err) { toast(errMsg(err), "err"); }
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
        <label class="switch"><input type="checkbox" id="sfOpen" ${s.recruitOpen ? "checked" : ""}> 지금 신입 부원 모집 중 <span class="text-dim" style="font-size:13px">(끄면 새 지원서를 받지 않아요. 이미 낸 사람은 결과 확인 가능)</span></label>
        <div class="row-2">${inp("sfRT", "모집 제목", s.recruitTitle)}${inp("sfRP", "모집 기간", s.recruitPeriod, "예: 2027. 3. 2. ~ 3. 13.")}</div>
        ${ta("sfRX", "모집 안내 문구", s.recruitText, 3)}
      </div></div>
    <div class="panel hudc"><div class="panel-head"><h3>ABOUT <small>소개 페이지</small></h3></div>
      <div class="form mt-s">
        ${ta("sfAH", "대표 문구", s.aboutHeadline, 2)}
        ${ta("sfAB", "동아리 소개 본문", s.aboutBody, 6)}
        ${ta("sfST", "숫자로 보는 아스트로", s.stats, 4, "한 줄에 하나씩 <b>항목 | 값</b>")}
        ${ta("sfPG", "주요 활동", s.programs, 4, "한 줄에 하나씩 <b>활동 이름 | 설명</b>")}
        ${ta("sfTL", "연간 일정 (비우면 숨김)", s.timeline, 5, "한 줄에 하나씩 <b>시기 | 내용</b>")}
      </div></div>
    <div class="panel hudc"><div class="panel-head"><h3>CONTACT <small>연락처 · 하단 문구</small></h3></div>
      <div class="form mt-s">
        <div class="row-2">${inp("sfTe", "지도교사", s.teacher)}${inp("sfRo", "활동 장소", s.room)}</div>
        <div class="row-2">${inp("sfEm", "이메일", s.email)}${inp("sfIg", "인스타그램", s.instagram, "@아이디 또는 https://instagram.com/…")}</div>
        ${inp("sfFt", "사이트 하단 문구", s.footerText)}
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
      await S.api.set("config", "site_content", data, true);
      await loadSite();
      $("#footerText").textContent = S.site.footerText || "";
      toast("사이트 설정을 저장했어요.", "ok");
    } catch (err) { toast(errMsg(err), "err"); }
    setBtnBusy(btn, false);
  });
}
