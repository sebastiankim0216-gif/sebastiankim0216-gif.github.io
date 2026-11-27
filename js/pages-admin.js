// 관리자 페이지
//   지원서 · 평가: 관리자마다 30점 만점 점수와 평가 메모, 운영담당자는 합격/불합격 결정(발표 전까지 비공개)
//   심사 현황: 평가표와 통계, 운영담당자의 '결과 발표'(지원자 공개 + 합격자 표 공지 자동 작성)
//   회원 관리(운영담당자): 등급별 회원, 관리자 임명, 글쓰기 제한, 이용 제한
import { S, isAdmin, isOwner, imageMaxSide, loadBanners, saveBanners, loadSite, loadQuestions, applicationQA, loadOwners, maskName } from "./state.js?v=202611271625";
import { DEFAULT_BANNERS, UPLOAD_LIMITS, SUPABASE, SCORE_MAX } from "./config.js?v=202611271625";
import {
  $, $$, esc, icon, avatar, loading, empty, pageHero, toast, errMsg, modal, confirmDialog,
  setBtnBusy, fmtDate, fmtDateTime, relTime, mediaField, prepareImage, safeLink, lines, roleChip
} from "./ui.js?v=202611271625";
import { noticeForm, APP_STATUS, applicationAnswersHTML, noticeTable } from "./pages-main.js?v=202611271625";

const TABS = [
  ["", "대시보드", "grid", false],
  ["applications", "지원서 · 평가", "user", false],
  ["review", "심사 현황", "check", false],
  ["questions", "지원 질문", "edit", true],
  ["members", "회원 관리", "users", true],
  ["banners", "메인 배너", "image", false],
  ["bar", "상단 알림", "megaphone", true],
  ["notices", "공지사항", "pin", false],
  ["site", "사이트 설정", "gear", false]
];
const DECISION = { accepted: { label: "합격", cls: "approved" }, rejected: { label: "불합격", cls: "rejected" }, "": { label: "미정", cls: "" } };

export async function renderAdmin(app, tab = "") {
  const visible = TABS.filter(([, , , ownerOnly]) => !ownerOnly || isOwner());
  if (!visible.some(([k]) => k === tab)) tab = "";
  app.innerHTML = `${pageHero({ en: "ADMIN", ko: isOwner() ? "운영 관리" : "관리자", desc: "심사 · 회원 · 공지 · 사이트를 관리해요.", bg: "assets/campus-night.jpg" })}
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
  loadReview().then((d) => setTodo(d)).catch(() => {});
  const views = { "": dashboard, applications, review, questions, members, banners, bar, notices, site };
  try { await views[tab](body); }
  catch (e) { console.error(e); body.innerHTML = `<div class="panel">${empty("불러오지 못했어요", errMsg(e))}</div>`; }
}
// 탭 배지: 내가 아직 평가하지 않은 지원서 수
function setTodo(d) {
  const c = $("#pendingCnt"), n = d.rows.filter((r) => !r.mine).length;
  if (c) { c.hidden = !n; c.textContent = n; c.title = "내가 아직 평가하지 않은 지원서"; }
}

// ---------------------------------------------------------------------
// 심사 데이터: 지원서 + 평가 점수 + 결정
async function loadReview() {
  const [apps, scores, decisions] = await Promise.all([
    S.api.list("applications", { orderBy: ["createdAt", "desc"] }),
    S.api.list("app_scores").catch(() => []),
    S.api.list("app_decisions").catch(() => [])
  ]);
  const dec = Object.fromEntries(decisions.map((d) => [d.id, d.decision || ""]));
  const byApp = {};
  scores.forEach((s) => (byApp[s.appId] ||= []).push(s));
  const rows = apps.map((a) => {
    const sc = (byApp[a.id] || []).sort((x, y) => (x.name || x.email).localeCompare(y.name || y.email));
    const avg = sc.length ? sc.reduce((t, x) => t + (+x.score || 0), 0) / sc.length : null;
    return { app: a, scores: sc, avg, decision: dec[a.id] || "", mine: sc.find((x) => x.email === S.user.email) || null, announced: a.status === "accepted" || a.status === "rejected" };
  });
  const graders = [...new Map(scores.map((s) => [s.email, s.name || s.email.split("@")[0]])).entries()];
  return { apps, scores, rows, graders };
}
const fmtAvg = (v) => (v == null ? "-" : (Math.round(v * 10) / 10).toFixed(1));
const decChip = (d) => `<span class="chip ${DECISION[d || ""].cls}">${DECISION[d || ""].label}</span>`;
const pubChip = (r) => r.announced ? `<span class="chip ${APP_STATUS[r.app.status].cls}">발표됨 · ${APP_STATUS[r.app.status].label}</span>` : `<span class="chip">미발표</span>`;

async function setDecision(appId, decision) {
  if (decision) await S.api.set("app_decisions", appId, { decision, by: S.user.email, at: S.api.now() }, false);
  else await S.api.remove("app_decisions", appId);
}

// ---------------------------------------------------------------------
async function dashboard(body) {
  const [d, notices] = await Promise.all([loadReview(), S.api.list("notices").catch(() => [])]);
  if (!body.isConnected) return;
  const todo = d.rows.filter((r) => !r.mine);
  const decided = d.rows.filter((r) => r.decision).length;
  body.innerHTML = `
    <div class="kpis">
      <a class="kpi" href="#admin-applications"><small>전체 지원자</small><b>${d.apps.length}</b></a>
      <a class="kpi ${todo.length ? "hot" : ""}" href="#admin-applications"><small>내가 평가할 지원서</small><b>${todo.length}</b></a>
      <a class="kpi" href="#admin-review"><small>평가 받은 지원서</small><b>${d.rows.filter((r) => r.scores.length).length}</b></a>
      <a class="kpi" href="#admin-review"><small>결정 완료</small><b>${decided}</b></a>
      <a class="kpi" href="#admin-notices"><small>공지사항</small><b>${notices.length}</b></a>
    </div>
    <div class="grid-2 mt-l">
      <div class="panel hudc">
        <div class="panel-head"><h3>TO DO <small>내가 아직 평가하지 않은 지원서</small></h3><a class="more" href="#admin-applications">전체 ${icon("right")}</a></div>
        ${todo.length ? `<ul class="mini-board">${todo.slice(0, 6).map((r) => `<li><a href="#admin-applications" data-app="${esc(r.app.id)}"><span class="t">${avatar("", r.app.name, "sm")}<span>${esc(r.app.name || "(이름 없음)")} · ${esc(r.app.studentId || "")}</span></span><span class="d">${relTime(r.app.createdAt)}</span></a></li>`).join("")}</ul>` : empty("모든 지원서를 평가했어요")}
      </div>
      <div class="panel hudc">
        <div class="panel-head"><h3>QUICK <small>빠른 작업</small></h3></div>
        <div style="display:grid;gap:10px;margin-top:10px">
          <a class="btn" href="#admin-review" style="justify-content:flex-start">${icon("check")} 심사 현황 · 결과 발표</a>
          <button class="btn" id="qNotice" style="justify-content:flex-start">${icon("pin")} 새 공지 작성</button>
          ${isOwner() ? `<a class="btn" href="#admin-members" style="justify-content:flex-start">${icon("users")} 회원 관리</a>
          <a class="btn" href="#admin-questions" style="justify-content:flex-start">${icon("edit")} 지원 질문 설정</a>` : ""}
          <a class="btn" href="#admin-site" style="justify-content:flex-start">${icon("gear")} 소개 문구 · 모집 상태</a>
          <p class="text-dim" style="font-size:14px;margin-top:6px">모집 상태: <b style="color:${S.site.recruitOpen ? "var(--green)" : "var(--red)"}">${S.site.recruitOpen ? "모집 중" : "모집 마감"}</b></p>
        </div>
      </div>
    </div>`;
  $("#qNotice").addEventListener("click", () => noticeForm(null, () => {}));
  body.querySelectorAll("[data-app]").forEach((el) => el.addEventListener("click", (e) => {
    e.preventDefault();
    appDetail(d.rows.find((x) => x.app.id === el.dataset.app), () => dashboard(body));
  }));
}

// ---------------------------------------------------------------------
async function applications(body) {
  await loadQuestions();
  let d = await loadReview();
  let f = "all", q = "";
  const reload = async () => { d = await loadReview(); setTodo(d); draw(); };
  const draw = () => {
    if (!body.isConnected) return;
    const match = (r) => f === "all" || (f === "todo" && !r.mine) || (f === "accepted" && r.decision === "accepted") || (f === "rejected" && r.decision === "rejected") || (f === "undecided" && !r.decision);
    const cnt = (k) => { const keep = f; f = k; const n = d.rows.filter(match).length; f = keep; return n; };
    const items = d.rows.filter(match).filter((r) => !q || `${r.app.name} ${r.app.studentId} ${r.app.email}`.toLowerCase().includes(q));
    body.innerHTML = `
      <div class="sec-head" style="margin-bottom:16px">
        <div class="tabs" id="apTabs">${[["all", "전체"], ["todo", "내 평가 전"], ["undecided", "미정"], ["accepted", "합격 결정"], ["rejected", "불합격 결정"]].map(([k, l]) => `<button class="tab ${k === f ? "active" : ""}" data-f="${k}">${l} <span class="text-dim">${cnt(k)}</span></button>`).join("")}</div>
        <div class="toolbar"><label class="search">${icon("search")}<span class="sr">검색</span><input type="search" id="apQ" placeholder="이름·학번" value="${esc(q)}"></label><button class="btn" id="apCsv">${icon("down")} CSV</button>${isOwner() && d.apps.length ? `<button class="btn danger" id="apDelAll">${icon("trash")} 전체 삭제</button>` : ""}</div>
      </div>
      <p class="text-dim" style="font-size:13.5px;margin-bottom:12px">점수는 ${SCORE_MAX}점 만점이에요. ${isOwner() ? "합격/불합격 결정은 '결과 발표'를 누르기 전까지 지원자에게 보이지 않아요." : "합격/불합격 결정은 운영담당자가 해요."}</p>
      <div class="panel">${items.length ? `<div class="table-wrap"><table class="tbl stack">
        <thead><tr><th>신청자</th><th>학번</th><th>제출일</th><th>내 점수</th><th>평균 (평가 수)</th><th>결정</th><th>발표</th><th></th></tr></thead>
        <tbody>${items.map((r) => `<tr>
          <td><div class="who">${avatar("", r.app.name)}<div><b>${esc(r.app.name || "(이름 없음)")}</b><small>${esc(r.app.email || "")}</small></div></div></td>
          <td class="num">${esc(r.app.studentId || "-")}</td>
          <td class="num">${r.app.createdAt ? fmtDate(r.app.createdAt) : "-"}</td>
          <td class="num">${r.mine ? `<b>${r.mine.score}</b> / ${SCORE_MAX}` : `<span class="chip pending">평가 전</span>`}</td>
          <td class="num"><b>${fmtAvg(r.avg)}</b> <span class="text-dim">(${r.scores.length})</span></td>
          <td>${isOwner() ? `<select data-dec="${esc(r.app.id)}" aria-label="결정">${["", "accepted", "rejected"].map((k) => `<option value="${k}" ${r.decision === k ? "selected" : ""}>${DECISION[k].label}</option>`).join("")}</select>` : decChip(r.decision)}</td>
          <td>${pubChip(r)}</td>
          <td class="acts"><button class="btn sm primary" data-v="${esc(r.app.id)}">${icon("edit")} 보기 · 평가</button>${isAdmin() ? `<button class="btn sm danger icon" data-del="${esc(r.app.id)}" aria-label="삭제">${icon("trash")}</button>` : ""}</td></tr>`).join("")}</tbody></table></div>`
        : empty("조건에 맞는 지원서가 없어요")}</div>`;
    $("#apTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (b) { f = b.dataset.f; draw(); } });
    $("#apQ").addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); const pos = e.target.selectionStart; draw(); const i = $("#apQ"); i.focus(); i.setSelectionRange(pos, pos); });
    $("#apCsv").addEventListener("click", () => downloadCsv(items, d.graders));
    $("#apDelAll")?.addEventListener("click", async () => {
      if (!(await confirmDialog(`정말 모든 지원서 ${d.apps.length}건과 평가를 삭제할까요?\n복구할 수 없어요. (모집이 끝나고 개인정보를 파기할 때 쓰세요)`, { danger: true, okText: "전체 삭제" }))) return;
      try {
        await Promise.all(d.apps.map((a) => S.api.remove("applications", a.id)));
        await Promise.all(d.scores.map((s) => S.api.remove("app_scores", s.id).catch(() => {})));
        await Promise.all(d.rows.filter((r) => r.decision).map((r) => S.api.remove("app_decisions", r.app.id).catch(() => {})));
        toast("모든 지원서와 평가를 삭제했어요.", "ok"); reload();
      } catch (e) { toast(errMsg(e), "err"); reload(); }
    });
    body.querySelectorAll("[data-dec]").forEach((sel) => sel.addEventListener("change", async () => {
      try { await setDecision(sel.dataset.dec, sel.value); toast(`결정을 '${DECISION[sel.value].label}'(으)로 저장했어요. (발표 전까지 비공개)`, "ok"); reload(); }
      catch (e) { toast(errMsg(e), "err"); reload(); }
    }));
    body.querySelector("tbody")?.addEventListener("click", async (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const r = d.rows.find((x) => x.app.id === (b.dataset.v || b.dataset.del));
      if (!r) return;
      if (b.dataset.v) return appDetail(r, reload);
      if (b.dataset.del) {
        if (!(await confirmDialog(`${r.app.name} 님의 지원서를 완전히 삭제할까요?`, { danger: true, okText: "삭제" }))) return;
        try {
          await S.api.remove("applications", r.app.id);
          await Promise.all(r.scores.map((s) => S.api.remove("app_scores", s.id).catch(() => {})));
          if (r.decision) await S.api.remove("app_decisions", r.app.id).catch(() => {});
          toast("삭제했어요."); reload();
        } catch (err) { toast(errMsg(err), "err"); }
      }
    });
  };
  draw();
}

function appDetail(r, after) {
  if (!r) return;
  const a = r.app;
  modal({
    title: `${a.name || "(이름 없음)"} 님의 지원서`,
    wide: true,
    body: `<p style="margin-bottom:14px">${pubChip(r)} ${isOwner() ? "" : decChip(r.decision)} <span class="text-dim" style="font-size:13.5px">제출 ${fmtDateTime(a.createdAt)}${a.updatedAt ? ` · 수정 ${fmtDateTime(a.updatedAt)}` : ""}</span></p>
      ${applicationAnswersHTML(a)}
      <div class="eval-box">
        <h3>${icon("edit")} 내 평가 <span class="text-dim" style="font-weight:400;font-size:13px">${SCORE_MAX}점 만점</span></h3>
        <div class="eval-score"><input type="range" id="evR" min="0" max="${SCORE_MAX}" step="1" value="${r.mine ? r.mine.score : Math.round(SCORE_MAX / 2)}" aria-label="점수 슬라이더"><input type="number" id="evN" min="0" max="${SCORE_MAX}" step="1" value="${r.mine ? r.mine.score : ""}" placeholder="점수"><span>/ ${SCORE_MAX}</span></div>
        <div class="field mt-s"><label for="evC">평가 메모</label><textarea id="evC" rows="3" style="min-height:90px" maxlength="1000" placeholder="좋았던 점, 아쉬운 점, 면접에서 확인할 것 등">${esc(r.mine?.comment || "")}</textarea></div>
        <div class="form-foot">${r.mine ? `<button class="btn ghost" id="evDel" type="button" style="color:var(--red)">내 평가 지우기</button>` : ""}<button class="btn primary" id="evSave" type="button">${icon("check")} 평가 저장</button></div>
      </div>
      <div class="eval-list">
        <h3>${icon("users")} 전체 평가 <span class="text-dim" style="font-weight:400;font-size:13px">평균 ${fmtAvg(r.avg)} · ${r.scores.length}명</span></h3>
        ${r.scores.length ? r.scores.map((s) => `<div class="eval-item"><div><b>${esc(s.name || s.email)}</b><span class="text-dim"> · ${relTime(s.updatedAt || s.createdAt)}</span></div><div class="eval-pt">${s.score}<small>/${SCORE_MAX}</small></div>${s.comment ? `<p>${lines(s.comment)}</p>` : ""}</div>`).join("") : `<p class="text-dim">아직 평가가 없어요.</p>`}
      </div>
      ${isOwner() ? `<div class="eval-box owner">
        <h3>${icon("shield")} 최종 결정 <span class="text-dim" style="font-weight:400;font-size:13px">발표 전까지 지원자에게 보이지 않아요</span></h3>
        <div class="checks" id="decRadios">${["accepted", "rejected", ""].map((k) => `<label><input type="radio" name="dec" value="${k}" ${r.decision === k ? "checked" : ""}><span>${DECISION[k].label}</span></label>`).join("")}</div>
      </div>` : ""}`,
    foot: `<button class="btn" data-close>닫기</button>`,
    onMount(el, ctl) {
      const R = $("#evR", el), N = $("#evN", el);
      R.addEventListener("input", () => { N.value = R.value; });
      N.addEventListener("input", () => { if (N.value !== "") R.value = Math.max(0, Math.min(SCORE_MAX, +N.value)); });
      $("#evSave", el).addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        const score = parseInt(N.value, 10);
        if (Number.isNaN(score) || score < 0 || score > SCORE_MAX) return toast(`점수는 0~${SCORE_MAX} 사이 정수로 입력해 주세요.`, "err");
        setBtnBusy(btn, true);
        try {
          await S.api.set("app_scores", `${a.id}__${S.user.email}`, { appId: a.id, email: S.user.email, name: S.user.name, score, comment: $("#evC", el).value.trim(), updatedAt: S.api.now() }, false);
          toast("평가를 저장했어요.", "ok"); ctl.close(); after && after();
        } catch (err) { toast(errMsg(err), "err"); setBtnBusy(btn, false); }
      });
      $("#evDel", el)?.addEventListener("click", async () => {
        if (!(await confirmDialog("내 평가를 지울까요?", { danger: true, okText: "지우기" }))) return;
        try { await S.api.remove("app_scores", `${a.id}__${S.user.email}`); toast("내 평가를 지웠어요."); ctl.close(); after && after(); } catch (err) { toast(errMsg(err), "err"); }
      });
      $("#decRadios", el)?.addEventListener("change", async (e) => {
        try { await setDecision(a.id, e.target.value); r.decision = e.target.value; toast(`결정: ${DECISION[e.target.value].label} (발표 전까지 비공개)`, "ok"); }
        catch (err) { toast(errMsg(err), "err"); }
      });
    }
  });
}

function downloadCsv(rows, graders) {
  const qcols = [];
  const seen = new Set();
  [...S.questionList.map((q) => ({ id: q.id, title: q.title })), ...rows.flatMap((r) => applicationQA(r.app))].forEach((q) => { if (!seen.has(q.id)) { seen.add(q.id); qcols.push(q); } });
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["학번", "이름", "전화번호", "이메일", "제출일", "평균 점수", "평가 수", ...graders.map(([, n]) => `${n} 점수`), "결정", "발표 상태", ...qcols.map((q, i) => `${i + 1}. ${q.title}`)];
  const body = rows.map((r) => {
    const a = r.app, ans = Object.fromEntries(applicationQA(a).map((q) => [q.id, q.answer]));
    return [a.studentId, a.name, a.phone, a.email, fmtDateTime(a.createdAt), fmtAvg(r.avg), r.scores.length,
      ...graders.map(([em]) => r.scores.find((s) => s.email === em)?.score ?? ""), DECISION[r.decision].label, r.announced ? APP_STATUS[a.status].label : "미발표",
      ...qcols.map((q) => ans[q.id] ?? "")].map(cell).join(",");
  });
  const csv = "﻿" + [head.map(cell).join(","), ...body].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = `ASTRO_지원서_평가_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------------------------------------------------------------------
// 심사 현황 (정보 패널) — 모든 관리자
async function review(body) {
  const [d, result] = await Promise.all([loadReview(), S.api.get("config", "recruit_result").catch(() => null)]);
  if (!body.isConnected) return;
  const rows = d.rows.slice().sort((x, y) => (y.avg ?? -1) - (x.avg ?? -1) || String(x.app.studentId).localeCompare(String(y.app.studentId)));
  const n = rows.length, evaluated = rows.filter((r) => r.scores.length).length;
  const allScores = d.scores.map((s) => +s.score || 0);
  const overall = allScores.length ? allScores.reduce((t, x) => t + x, 0) / allScores.length : null;
  const cAcc = rows.filter((r) => r.decision === "accepted").length, cRej = rows.filter((r) => r.decision === "rejected").length;
  const bars = (items) => { const mx = Math.max(1, ...items.map(([, v]) => v)); return items.map(([k, v]) => `<div class="bar-row"><span class="bl">${esc(k)}</span><span class="bt"><i style="width:${(v / mx) * 100}%"></i></span><b>${v}</b></div>`).join(""); };
  const grades = [1, 2, 3].map((g) => [`${g}학년`, rows.filter((r) => String(r.app.studentId || "")[0] === String(g)).length]);
  const other = n - grades.reduce((t, [, v]) => t + v, 0);
  if (other) grades.push(["기타", other]);
  const step = Math.ceil(SCORE_MAX / 6);
  const buckets = [];
  for (let lo = 0; lo <= SCORE_MAX; lo += step) { const hi = Math.min(SCORE_MAX, lo + step - 1); buckets.push([`${lo}~${hi}점`, rows.filter((r) => r.avg != null && r.avg >= lo && r.avg < hi + 1).length]); }
  const graderBars = d.graders.map(([em, nm]) => [nm, d.scores.filter((s) => s.email === em).length]);
  const days = {};
  rows.forEach((r) => { if (r.app.createdAt) { const k = fmtDate(r.app.createdAt).slice(5); days[k] = (days[k] || 0) + 1; } });
  const dayBars = Object.entries(days).sort(([a], [b]) => a.localeCompare(b)).slice(-10);
  body.innerHTML = `
    <div class="kpis">
      <div class="kpi"><small>전체 지원자</small><b>${n}</b></div>
      <div class="kpi"><small>평가 진행률</small><b>${n ? Math.round((evaluated / n) * 100) : 0}%</b></div>
      <div class="kpi"><small>전체 평균 점수</small><b>${fmtAvg(overall)}</b></div>
      <div class="kpi"><small>합격 / 불합격 / 미정</small><b style="font-size:22px">${cAcc} / ${cRej} / ${n - cAcc - cRej}</b></div>
      <div class="kpi ${result?.announcedAt ? "" : "hot"}"><small>결과 발표</small><b style="font-size:18px">${result?.announcedAt ? fmtDateTime(result.announcedAt) : "발표 전"}</b></div>
    </div>
    ${isOwner() ? `<div class="announce-bar mt-m"><div><b>결과 발표</b><p class="text-dim">합격/불합격을 결정한 지원자에게 결과를 공개하고, 합격자 표가 들어간 공지를 올려요.</p></div><button class="btn primary" id="annBtn">${icon("megaphone")} 결과 발표하기</button></div>` : ""}
    <div class="grid-2 mt-m">
      <div class="panel"><div class="panel-head"><h3>GRADE <small>학년별 지원자</small></h3></div><div class="bars">${bars(grades)}</div></div>
      <div class="panel" style="margin-top:0"><div class="panel-head"><h3>SCORE <small>평균 점수 분포</small></h3></div><div class="bars">${bars(buckets)}</div></div>
      <div class="panel"><div class="panel-head"><h3>GRADERS <small>관리자별 평가 수 (전체 ${n}건)</small></h3></div><div class="bars">${graderBars.length ? bars(graderBars) : `<p class="text-dim">아직 평가가 없어요.</p>`}</div></div>
      <div class="panel" style="margin-top:0"><div class="panel-head"><h3>DAILY <small>날짜별 지원 (최근 10일)</small></h3></div><div class="bars">${dayBars.length ? bars(dayBars) : `<p class="text-dim">지원서가 없어요.</p>`}</div></div>
    </div>
    <div class="panel mt-m">
      <div class="panel-head"><h3>RANKING <small>지원서 평가표 · 평균 점수 순</small></h3></div>
      ${rows.length ? `<div class="table-wrap"><table class="tbl review-tbl">
        <thead><tr><th>순위</th><th>이름</th><th>학번</th>${d.graders.map(([, nm]) => `<th>${esc(nm)}</th>`).join("")}<th>평균</th><th>평가 수</th><th>결정</th><th>발표</th></tr></thead>
        <tbody>${rows.map((r, i) => `<tr>
          <td class="num">${r.avg == null ? "-" : i + 1}</td>
          <td><button class="linkish" data-v="${esc(r.app.id)}">${esc(r.app.name || "(이름 없음)")}</button></td>
          <td class="num">${esc(r.app.studentId || "-")}</td>
          ${d.graders.map(([em]) => { const s = r.scores.find((x) => x.email === em); return `<td class="num" ${s?.comment ? `title="${esc(s.comment)}"` : ""}>${s ? s.score : "<span class='text-dim'>-</span>"}</td>`; }).join("")}
          <td class="num"><b>${fmtAvg(r.avg)}</b></td>
          <td class="num">${r.scores.length}</td>
          <td>${isOwner() ? `<select data-dec="${esc(r.app.id)}" aria-label="결정">${["", "accepted", "rejected"].map((k) => `<option value="${k}" ${r.decision === k ? "selected" : ""}>${DECISION[k].label}</option>`).join("")}</select>` : decChip(r.decision)}</td>
          <td>${pubChip(r)}</td></tr>`).join("")}</tbody></table></div>` : empty("지원서가 없어요")}
      <p class="hint mt-s">점수 칸에 마우스를 올리면 평가 메모가 보여요. 이름을 누르면 지원서와 평가 전체를 볼 수 있어요.</p>
    </div>`;
  body.querySelectorAll("[data-v]").forEach((b) => b.addEventListener("click", () => appDetail(rows.find((r) => r.app.id === b.dataset.v), () => review(body))));
  body.querySelectorAll("[data-dec]").forEach((sel) => sel.addEventListener("change", async () => {
    try { await setDecision(sel.dataset.dec, sel.value); toast(`결정을 '${DECISION[sel.value].label}'(으)로 저장했어요.`, "ok"); review(body); }
    catch (e) { toast(errMsg(e), "err"); }
  }));
  $("#annBtn")?.addEventListener("click", () => announce(rows, () => review(body)));
}

// 결과 발표: 결정된 지원자 공개 + 합격자 표 공지
function announce(rows, after) {
  const decided = rows.filter((r) => r.decision);
  const undecided = rows.length - decided.length;
  const accepted = decided.filter((r) => r.decision === "accepted").sort((x, y) => String(x.app.studentId).localeCompare(String(y.app.studentId)));
  if (!decided.length) return toast("합격/불합격을 결정한 지원자가 없어요.", "err");
  const year = new Date().getFullYear();
  const table = { headers: ["번호", "학번", "이름"], rows: accepted.map((r, i) => ({ cells: [String(i + 1), String(r.app.studentId || ""), maskName(r.app.name)] })), caption: "개인정보 보호를 위해 이름 일부를 가렸습니다." };
  modal({
    title: "결과 발표",
    wide: true,
    body: `<div class="notice-box"><span>합격 <b>${accepted.length}명</b> · 불합격 <b>${decided.length - accepted.length}명</b>에게 결과가 공개돼요.${undecided ? ` 결정하지 않은 <b>${undecided}명</b>은 계속 '검토 중'으로 보여요.` : ""}</span></div>
      <form class="form mt-m" id="anF">
        <label class="switch"><input type="checkbox" id="anMake" checked> 합격자 발표 공지 함께 올리기</label>
        <div id="anCompose">
          <div class="field"><label for="anT">공지 제목</label><input type="text" id="anT" maxlength="120" value="${year} ASTRO 신입 부원 합격자 발표"></div>
          <div class="field mt-s"><label for="anA">표 위 내용</label><textarea id="anA" rows="4" style="min-height:110px">ASTRO 신입 부원 선발 결과를 알려드립니다.\n합격자는 아래 표에서 확인해 주세요. 자세한 결과는 사이트의 '가입 신청' 페이지에서도 확인할 수 있어요.</textarea></div>
          <div class="field mt-s"><span class="label">합격자 표 (자동)</span>${accepted.length ? noticeTable({ table }) : `<p class="text-dim">합격자가 없어요.</p>`}</div>
          <div class="field mt-s"><label for="anB">표 아래 내용 (축하 메시지 등)</label><textarea id="anB" rows="4" style="min-height:110px">합격을 진심으로 축하합니다! 첫 모임 일정은 따로 안내할게요.\n지원해 주신 모든 분께 감사드립니다.</textarea></div>
          <label class="switch mt-s"><input type="checkbox" id="anPin" checked> 공지 맨 위에 고정</label>
        </div>
      </form>`,
    foot: `<button class="btn" data-close>취소</button><button class="btn primary" id="anGo">${icon("megaphone")} 발표하기</button>`,
    onMount(el, ctl) {
      $("#anMake", el).addEventListener("change", (e) => { $("#anCompose", el).hidden = !e.target.checked; });
      el.parentElement.querySelector("#anGo").addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        const makeNotice = $("#anMake", el).checked;
        const title = $("#anT", el).value.trim();
        if (makeNotice && !title) return toast("공지 제목을 입력해 주세요.", "err");
        if (!(await confirmDialog(`지금 결과를 발표할까요?\n지원자 ${decided.length}명에게 결과가 바로 보여요.`, { okText: "발표" }))) return;
        setBtnBusy(btn, true, "발표 중"); ctl.setBusy(true);
        try {
          for (const r of decided) {
            if (r.app.status !== r.decision) await S.api.update("applications", r.app.id, { status: r.decision, announcedAt: S.api.now() });
          }
          let noticeId = null;
          if (makeNotice) {
            noticeId = await S.api.add("notices", {
              title, content: $("#anA", el).value.trim(), contentAfter: $("#anB", el).value.trim(),
              table, pinned: $("#anPin", el).checked, kind: "recruit-result", authorEmail: S.user.email, authorName: S.user.name
            });
          }
          await S.api.set("config", "recruit_result", { announcedAt: S.api.now(), by: S.user.email, noticeId, accepted: accepted.length, rejected: decided.length - accepted.length }, false);
          ctl.setBusy(false); ctl.close();
          toast("결과를 발표했어요.", "ok");
          if (noticeId) location.hash = `#notice-${noticeId}`; else after && after();
        } catch (err) { toast(errMsg(err), "err"); setBtnBusy(btn, false); ctl.setBusy(false); }
      });
    }
  });
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
      const { DEFAULT_QUESTIONS } = await import("./config.js?v=202611271625");
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
// 회원 관리 (운영담당자) — 등급별 회원, 관리자 임명, 글쓰기 제한, 이용 제한
async function members(body) {
  let users = [], admins = [], accepted = new Set();
  let f = "all", q = "";
  const load = async () => {
    const [u, a, apps] = await Promise.all([
      S.api.list("users").catch(() => []),
      S.api.list("admins").catch(() => []),
      S.api.list("applications").catch(() => []),
      loadOwners()
    ]);
    users = u; admins = a.map((x) => x.id);
    accepted = new Set(apps.filter((x) => x.status === "accepted").map((x) => String(x.email || "").toLowerCase()));
  };
  const tier = (u) => S.owners.includes(u.email) ? "owner" : admins.includes(u.email) ? "admin" : accepted.has(u.email) ? "member" : "user";
  const TIER = { owner: "운영담당자", admin: "관리자", member: "부원", user: "일반" };
  const sync = async () => {
    const el = $("#sbSync");
    if (!SUPABASE.url || !SUPABASE.anonKey) { if (el) el.textContent = "사진 저장소가 설정되지 않았어요."; return; }
    try { const r = await S.api.syncUploaders([...S.owners, ...admins]); if (el) el.innerHTML = `${icon("check")} 사진 업로드 권한 동기화됨 (${r.count}명)`; }
    catch (e) { if (el) el.innerHTML = `${icon("x")} 사진 업로드 권한 동기화 실패: ${esc(errMsg(e))}`; }
  };
  const draw = () => {
    if (!body.isConnected) return;
    const cnt = (k) => users.filter((u) => k === "all" || (k === "limited" ? u.muted || u.banned : tier(u) === k)).length;
    const items = users
      .filter((u) => f === "all" || (f === "limited" ? u.muted || u.banned : tier(u) === f))
      .filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q))
      .sort((x, y) => ["owner", "admin", "member", "user"].indexOf(tier(x)) - ["owner", "admin", "member", "user"].indexOf(tier(y)) || (y.createdAt || 0) - (x.createdAt || 0));
    body.innerHTML = `
      <div class="sec-head" style="margin-bottom:16px">
        <div class="tabs" id="mTabs">${[["all", "전체"], ["owner", "운영담당자"], ["admin", "관리자"], ["member", "부원"], ["user", "일반"], ["limited", "제한됨"]].map(([k, l]) => `<button class="tab ${k === f ? "active" : ""}" data-f="${k}">${l} <span class="text-dim">${cnt(k)}</span></button>`).join("")}</div>
        <label class="search">${icon("search")}<span class="sr">회원 검색</span><input type="search" id="mq" placeholder="이름·이메일" value="${esc(q)}"></label>
      </div>
      <p class="text-dim" style="font-size:13.5px;margin-bottom:12px">가입(약관 동의)을 마친 회원이 보여요. 부원은 합격 발표된 지원자예요. <b>글쓰기 제한</b>은 커뮤니티 글·댓글만 막고, <b>이용 제한</b>은 로그인하면 이용 제한 안내만 보이게 해요.</p>
      <div class="panel">${items.length ? `<div class="table-wrap"><table class="tbl stack"><thead><tr><th>회원</th><th>등급</th><th>가입일</th><th>최근 접속</th><th>상태</th><th></th></tr></thead><tbody>
        ${items.map((u) => { const t = tier(u), me = u.email === S.user.email; return `<tr>
          <td><div class="who">${avatar(u.photo, u.name)}<div><b>${esc(u.name || "(이름 없음)")}</b><small>${esc(u.email)}</small></div></div></td>
          <td><span class="role ${t === "owner" || t === "admin" ? "admin" : t === "member" ? "member" : ""}">${TIER[t]}</span></td>
          <td class="num">${fmtDate(u.createdAt)}</td>
          <td class="num text-dim">${u.lastLoginAt ? relTime(u.lastLoginAt) : "-"}</td>
          <td>${u.banned ? `<span class="chip rejected" title="${esc(u.banReason || "")}">이용 제한</span>` : ""}${u.muted ? ` <span class="chip pending" title="${esc(u.mutedReason || "")}">글쓰기 제한</span>` : ""}${!u.banned && !u.muted ? `<span class="text-dim">정상</span>` : ""}</td>
          <td class="acts">${t === "owner" || me ? `<span class="text-dim" style="font-size:12.5px">${me ? "나" : "운영담당자"}</span>` : `
            <button class="btn sm" data-adm="${esc(u.id)}">${t === "admin" ? "관리자 해제" : "관리자 임명"}</button>
            <button class="btn sm" data-mute="${esc(u.id)}">${u.muted ? "글쓰기 허용" : "글쓰기 제한"}</button>
            <button class="btn sm ${u.banned ? "" : "danger"}" data-ban="${esc(u.id)}">${u.banned ? "제한 해제" : "이용 제한"}</button>`}</td></tr>`; }).join("")}
      </tbody></table></div>` : empty("조건에 맞는 회원이 없어요")}</div>
      <div class="panel mt-m">
        <div class="panel-head"><h3>ADMIN <small>이메일로 관리자 추가 (아직 가입 안 한 사람도 가능)</small></h3></div>
        <form class="cmt-form mt-s" id="adF" novalidate><label class="sr" for="adE">관리자 이메일</label><input type="email" id="adE" placeholder="example@gmail.com"><button class="btn primary" type="submit">${icon("plus")} 관리자 추가</button></form>
        ${admins.length ? `<p class="hint mt-s">현재 관리자: ${admins.map(esc).join(", ")}</p>` : ""}
        <p class="hint mt-s" id="sbSync" style="display:flex;gap:6px;align-items:center">사진 업로드 권한 확인 중…</p>
      </div>`;
    $("#mTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (b) { f = b.dataset.f; draw(); } });
    $("#mq").addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); const pos = e.target.selectionStart; draw(); const i = $("#mq"); i.focus(); i.setSelectionRange(pos, pos); });
    $("#adF").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#adE").value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast("올바른 이메일을 입력해 주세요.", "err");
      if (S.owners.includes(email)) return toast("이미 운영담당자인 이메일이에요.", "err");
      try { await S.api.set("admins", email, { addedBy: S.user.email, addedAt: S.api.now() }, false); toast(`${email} 을(를) 관리자로 추가했어요.`, "ok"); await load(); draw(); sync(); }
      catch (err) { toast(errMsg(err), "err"); }
    });
    body.querySelector("tbody")?.addEventListener("click", async (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const u = users.find((x) => x.id === (b.dataset.adm || b.dataset.mute || b.dataset.ban));
      if (!u) return;
      try {
        if (b.dataset.adm) {
          if (admins.includes(u.email)) {
            if (!(await confirmDialog(`${u.name} 님의 관리자 권한을 해제할까요?`, { danger: true, okText: "해제" }))) return;
            await S.api.remove("admins", u.email); toast("관리자 권한을 해제했어요.");
          } else {
            if (!(await confirmDialog(`${u.name} 님을 관리자로 임명할까요?\n지원서 열람·평가, 공지·활동 관리를 할 수 있어요.`, { okText: "임명" }))) return;
            await S.api.set("admins", u.email, { addedBy: S.user.email, addedAt: S.api.now() }, false); toast("관리자로 임명했어요.", "ok");
          }
          await load(); draw(); sync(); return;
        }
        if (b.dataset.mute) {
          if (u.muted) { await S.api.update("users", u.id, { muted: false, mutedReason: "" }); toast("글쓰기 제한을 풀었어요."); }
          else {
            const reason = await reasonPrompt(`${u.name} 님 커뮤니티 글쓰기 제한`, "제한 사유 (회원 관리에서만 보여요)");
            if (reason == null) return;
            await S.api.update("users", u.id, { muted: true, mutedReason: reason, mutedAt: S.api.now(), mutedBy: S.user.email }); toast("커뮤니티 글쓰기를 제한했어요.", "ok");
          }
        }
        if (b.dataset.ban) {
          if (u.banned) { await S.api.update("users", u.id, { banned: false, banReason: "" }); toast("이용 제한을 풀었어요."); }
          else {
            const reason = await reasonPrompt(`${u.name} 님 사이트 이용 제한`, "제한 사유 (본인에게 안내 화면으로 보여요)");
            if (reason == null) return;
            await S.api.update("users", u.id, { banned: true, banReason: reason, bannedAt: S.api.now(), bannedBy: S.user.email }); toast("사이트 이용을 제한했어요.", "ok");
          }
        }
        await load(); draw(); sync();
      } catch (err) { toast(errMsg(err), "err"); }
    });
  };
  await load();
  draw();
  sync();
}

function reasonPrompt(title, label) {
  return new Promise((resolve) => {
    let done = false;
    const m = modal({
      title,
      body: `<form class="form" id="rsF"><div class="field"><label for="rsIn">${esc(label)}</label><textarea id="rsIn" rows="3" style="min-height:90px" maxlength="300"></textarea></div></form>`,
      foot: `<button class="btn" data-close>취소</button><button class="btn danger" id="rsGo">제한하기</button>`,
      onMount(el, ctl) {
        el.parentElement.querySelector("#rsGo").addEventListener("click", () => { done = true; resolve($("#rsIn", el).value.trim()); ctl.close(); });
      }
    });
    const obs = new MutationObserver(() => { if (!m.el.isConnected) { obs.disconnect(); if (!done) resolve(null); } });
    obs.observe($("#modalRoot"), { childList: true });
  });
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
