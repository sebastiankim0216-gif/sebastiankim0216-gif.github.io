// 공통 UI 도우미: 이스케이프, 날짜, 아이콘, 모달, 토스트, HUD 프레임, 업로더, 라이트박스

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// 사용자 글: 이스케이프 → 링크 자동 연결 → 줄바꿈
export function richText(s) {
  return esc(s)
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g, (u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`)
    .replace(/\n/g, "<br>");
}
export const lines = (s) => esc(s).replace(/\n/g, "<br>");
export const excerpt = (s, n = 80) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n) + "…" : t; };

// "제목 | 내용" 줄 목록 파싱
export function parsePairs(text) {
  return String(text || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf("|");
    return i < 0 ? [l, ""] : [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  });
}

// 안전한 링크 (사이트 내부 #, http(s)만 허용)
export function safeLink(href) {
  const h = String(href || "").trim();
  if (!h) return "#home";
  if (h.startsWith("#")) return h;
  if (/^https?:\/\//i.test(h)) return h;
  return "#" + h.replace(/^\/+/, "");
}
export const isExternal = (h) => /^https?:\/\//i.test(h);

// ---------- 날짜 ----------
const pad = (n) => String(n).padStart(2, "0");
export const DOW = ["일", "월", "화", "수", "목", "금", "토"];
export function ymd(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function parseYmd(s) { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); }
export function fmtDate(ms) { if (!ms) return ""; const d = new Date(ms); return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`; }
export function fmtDateTime(ms) { if (!ms) return ""; const d = new Date(ms); return `${fmtDate(ms)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
export function fmtYmd(s, withDow = true) { if (!s) return ""; const d = parseYmd(s); return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}${withDow ? ` (${DOW[d.getDay()]})` : ""}`; }
export function relTime(ms) {
  if (!ms) return "";
  const diff = Date.now() - ms;
  if (diff < 60000) return "방금 전";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}일 전`;
  return fmtDate(ms);
}
export const isNew = (ms) => ms && Date.now() - ms < 3 * 86400000;

// ---------- 아이콘 ----------
const P = {
  arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  back: '<path d="M20 12H5M11 6l-6 6 6 6"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  video: '<rect x="3" y="5" width="13" height="14" rx="3"/><path d="M16 10l5-3v10l-5-3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  pin: '<path d="M9 4h6l-1 6 3 3H7l3-3-1-6zM12 13v7"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5"/><path d="M16 4.5a3.5 3.5 0 010 7M18 15c2 .6 3.2 2.3 3.8 5"/>',
  logout: '<path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 16l-4-4 4-4M6 12h10"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
  comment: '<path d="M4 5h16v11H9l-5 4V5z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  map: '<path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  megaphone: '<path d="M3 10v4h3l7 4V6L6 10H3z"/><path d="M17 9a4 4 0 010 6"/>',
  play: '<path d="M7 4l13 8-13 8V4z"/>'
};
export function icon(name, cls = "") {
  if (name === "play") return `<svg class="ico fill ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P.play}</svg>`;
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ""}</svg>`;
}
export const SPARKLE_PATH = "M0,-24 C1.6,-7 7,-1.6 24,0 C7,1.6 1.6,7 0,24 C-1.6,7 -7,1.6 -24,0 C-7,-1.6 -1.6,-7 0,-24Z";
export function sparkle(cls = "") {
  return `<svg class="${cls}" viewBox="-25 -25 50 50" aria-hidden="true"><path d="${SPARKLE_PATH}"/><path d="M0,-9 C.6,-2.6 2.6,-.6 9,0 C2.6,.6 .6,2.6 0,9 C-.6,2.6 -2.6,.6 -9,0 C-2.6,-.6 -.6,-2.6 0,-9Z" transform="rotate(45)" opacity=".85"/></svg>`;
}
export function compassStar(cls = "") {
  return `<svg class="${cls}" viewBox="-25 -25 50 50" aria-hidden="true"><circle r="11" fill="none" stroke="#fff" stroke-width=".9" opacity=".8"/><path d="${SPARKLE_PATH}"/><path d="M0,-13 C.8,-3.5 3.5,-.8 13,0 C3.5,.8 .8,3.5 0,13 C-.8,3.5 -3.5,.8 -13,0 C-3.5,-.8 -.8,-3.5 0,-13Z" transform="rotate(45)" opacity=".7"/></svg>`;
}

// ASTRO 워드마크 (시안의 Λ 형태 A)
export function wordmark() {
  return `<svg class="wordmark" viewBox="0 0 500 64" role="img" aria-label="ASTRO">
    <polygon points="0,64 56,0 74,0 130,64 112,64 65,10.5 18,64"/>
    <g fill="none" stroke="#fff" stroke-width="13" stroke-linejoin="round">
      <path d="M229 6.5H156.5A12.75 12.75 0 0 0 156.5 32H208A12.75 12.75 0 0 1 208 57.5H136"/>
      <path d="M237 6.5H316M276.5 6.5V64"/>
      <path d="M332.5 64V6.5H383A12.75 12.75 0 0 1 383 32H332.5M364 32L401 64" stroke-linejoin="miter"/>
      <rect x="424.5" y="6.5" width="69" height="51" rx="23"/>
    </g>
  </svg>`;
}

// 히어로 궤도선 + 반짝이는 별 (시안 좌표계 900x410)
export function orbitSVG() {
  return `<svg class="orbit" viewBox="0 0 900 410" aria-hidden="true">
    <defs>
      <linearGradient id="og1" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#fff" stop-opacity=".75"/>
        <stop offset=".45" stop-color="#fff" stop-opacity=".35"/>
        <stop offset=".8" stop-color="#fff" stop-opacity=".95"/>
        <stop offset="1" stop-color="#fff" stop-opacity=".9"/>
      </linearGradient>
      <linearGradient id="og2" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#fff" stop-opacity="0"/>
        <stop offset=".35" stop-color="#fff" stop-opacity=".7"/>
        <stop offset=".8" stop-color="#fff" stop-opacity=".55"/>
        <stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="og4"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <radialGradient id="og3"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".25" stop-color="#e6efff" stop-opacity=".55"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="348.5" cy="157.5" rx="350" ry="108" transform="rotate(-17.9 348.5 157.5)" fill="none" stroke="url(#og1)" stroke-width="1.7"/>
    <path d="M150 412 Q 520 250 880 82" fill="none" stroke="url(#og2)" stroke-width="1.3"/>
    <g class="glint">
      <circle cx="653" cy="111" r="44" fill="url(#og3)"/>
      <path d="M480 111H826" stroke="url(#og4)" stroke-width="1.4"/>
      <path d="M653,58 C654.2,101 656,108.6 748,111 C656,113.4 654.2,121 653,164 C651.8,121 650,113.4 558,111 C650,108.6 651.8,101 653,58Z" fill="#fff"/>
      <circle cx="653" cy="111" r="5" fill="#fff"/>
    </g>
  </svg>`;
}

// ---------- 아바타 ----------
export function avatar(photo, name, cls = "") {
  if (photo) return `<img class="avatar ${cls}" src="${esc(photo)}" alt="" referrerpolicy="no-referrer" loading="lazy">`;
  return `<span class="avatar ${cls}" aria-hidden="true">${esc(String(name || "?").trim().charAt(0) || "?")}</span>`;
}
export const ROLE_LABEL = { owner: "운영담당자", admin: "관리자", user: "일반", member: "부원", guest: "일반" };
export const roleChip = (r) => `<span class="role ${r === "owner" ? "admin" : esc(r)}">${ROLE_LABEL[r] || "일반"}</span>`;

// ---------- 공통 블록 ----------
export const loading = () => `<div class="loading"><span class="spin" aria-label="불러오는 중"></span></div>`;
export const empty = (title, sub = "") => `<div class="empty">${sparkle()}<b>${esc(title)}</b>${sub ? esc(sub) : ""}</div>`;

export function pageHero({ en, ko, desc = "", bg = "assets/hero-day.jpg" }) {
  return `<section class="page-hero">
    <div class="ph-bg" style="background-image:url('${esc(bg)}')"></div>
    <svg class="hud" data-hud="page" aria-hidden="true"></svg>
    <div class="ph-inner wrap">
      <p class="ph-kicker">Bugil Academy ASTRO</p>
      <h1 class="ph-title">${esc(en)}${sparkle("ph-glint")}</h1>
      <p class="ph-ko"><b>${esc(ko)}</b>${esc(desc)}</p>
    </div>
  </section>`;
}

export function secHead(en, title, right = "", sub = "") {
  return `<div class="sec-head"><div><p class="eyebrow">${sparkle()}${esc(en)}</p><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ""}</div>${right ? `<div class="toolbar">${right}</div>` : ""}</div>`;
}

// ---------- 토스트 ----------
export function toast(msg, type = "info") {
  const root = $("#toastRoot");
  if (!root) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `${type === "ok" ? icon("check") : type === "err" ? icon("x") : sparkle("ico fill")}<span>${esc(msg)}</span>`;
  root.appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 320); }, type === "err" ? 4600 : 2800);
}
const AUTH_ERR = {
  "auth/user-not-found": "등록되지 않은 이메일입니다.",
  "auth/wrong-password": "비밀번호가 틀렸습니다.",
  "auth/invalid-email": "이메일 형식이 잘못되었습니다.",
  "auth/email-already-in-use": "이미 사용 중인 이메일입니다.",
  "auth/weak-password": "비밀번호는 6자 이상이어야 합니다.",
  "auth/popup-closed-by-user": "로그인 창이 닫혔습니다.",
  "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "auth/too-many-requests": "시도가 너무 많아요. 잠시 후 다시 시도해 주세요.",
  "auth/operation-not-allowed": "이 로그인 방식이 Firebase에서 꺼져 있어요."
};
export function errMsg(e) {
  const code = e && (e.code || "");
  if (AUTH_ERR[code]) return AUTH_ERR[code];
  if (code.includes("permission-denied") || code.includes("unauthorized")) return "권한이 없어요. 로그인 상태나 역할을 확인해 주세요.";
  if (code.includes("unavailable") || code.includes("network")) return "네트워크 연결을 확인해 주세요.";
  if (code.includes("unauthorized-domain")) return "이 도메인이 Firebase 인증 허용 도메인에 등록되지 않았어요.";
  if (code.includes("quota") || code.includes("402")) return "저장 공간 한도를 초과했어요. (Firebase 요금제를 확인해 주세요)";
  return (e && e.message) || "문제가 발생했어요.";
}

// ---------- 모달 ----------
let modalStack = 0;
export function modal({ title, body, foot = "", wide = false, onMount, dismissible = true }) {
  const root = $("#modalRoot");
  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `<div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-head"><h2>${esc(title)}</h2><button class="btn icon ghost" data-close aria-label="닫기">${icon("close")}</button></div>
    <div class="modal-body">${body}</div>
    ${foot ? `<div class="modal-foot">${foot}</div>` : ""}
  </div>`;
  root.appendChild(wrap);
  modalStack++;
  document.body.classList.add("modal-open");
  const prevFocus = document.activeElement;
  let busy = false;
  const close = () => {
    if (!wrap.isConnected) return;
    wrap.remove();
    document.removeEventListener("keydown", onKey);
    modalStack = Math.max(0, modalStack - 1);
    if (!modalStack) document.body.classList.remove("modal-open");
    if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
  };
  const onKey = (e) => { if (e.key === "Escape" && dismissible && !busy && wrap === root.lastElementChild) close(); };
  document.addEventListener("keydown", onKey);
  wrap.addEventListener("mousedown", (e) => { if (e.target === wrap && dismissible && !busy) close(); });
  wrap.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => { if (!busy) close(); }));
  const el = wrap.querySelector(".modal");
  const ctl = { el, close, setBusy(v) { busy = v; } };
  if (onMount) onMount(el, ctl);
  setTimeout(() => { const f = el.querySelector("input:not([type=hidden]):not([type=checkbox]), textarea, select, .modal-foot .btn.primary"); if (f) f.focus({ preventScroll: true }); }, 30);
  return ctl;
}
export function confirmDialog(message, { title = "확인", okText = "확인", danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const m = modal({
      title,
      body: `<p class="msg">${lines(message)}</p>`,
      foot: `<button class="btn" data-close>취소</button><button class="btn ${danger ? "danger" : "primary"}" data-ok>${esc(okText)}</button>`,
      onMount(el, ctl) {
        el.parentElement.querySelector("[data-ok]").addEventListener("click", () => { done = true; resolve(true); ctl.close(); });
      }
    });
    const obs = new MutationObserver(() => { if (!m.el.isConnected) { obs.disconnect(); if (!done) resolve(false); } });
    obs.observe($("#modalRoot"), { childList: true });
  });
}
export function setBtnBusy(btn, busy, label) {
  if (!btn) return;
  if (busy) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spin"></span>${label ? esc(label) : ""}`; }
  else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
}

// ---------- HUD 프레임 ----------
function hudPath(w, h, opts) {
  const small = w < 700;
  const m = small ? 10 : Math.round(Math.min(Math.max(w * 0.017, 14), 30));
  const L = m, R = w - m, T = small ? 10 : Math.max(16, Math.round(m * 0.75)), B = h - m;
  const st = small ? 0 : 6;
  const c1 = small ? 16 : 36, c3 = small ? 14 : 30, c4 = small ? 24 : 66;
  const tabL = w * 0.17, tabR = w * 0.83;
  const pts = [
    [L, B - c4], [L, h * 0.36],
    [L + st, h * 0.36 - st], [L + st, h * 0.19], [L, h * 0.19 - st],
    [L, T + c1], [L + c1, T],
    [tabL, T], [tabL + st, T - st], [tabR - st, T - st], [tabR, T],
    [R - c1, T], [R, T + c1],
    [R, h * 0.085], [R - st, h * 0.085 + st], [R - st, h * 0.16], [R, h * 0.16 + st],
    [R, B - c3], [R - c3, B],
    [w * 0.8, B], [w * 0.8 - 9, B + st], [w * 0.62, B + st], [w * 0.62 - 9, B],
    [w * 0.22, B], [w * 0.22 - 9, B - st], [w * 0.15, B - st], [w * 0.15 - 9, B],
    [L + c4, B]
  ];
  const d = (arr) => "M" + arr.map((p) => p.map((v) => Math.round(v * 10) / 10).join(",")).join("L");
  let main = d(pts) + "Z";
  const hi = [
    d([[tabL + st, T - st], [tabL + st + Math.min(90, w * 0.06), T - st]]),
    d([[tabR - st - Math.min(40, w * 0.03), T - st], [tabR - st, T - st]]),
    small ? "" : d([[L + st, h * 0.36 - st], [L + st, h * 0.19]]),
    small ? "" : d([[R - st, h * 0.085 + st], [R - st, h * 0.16]]),
    d([[R - c3, B], [R - c3 - Math.min(110, w * 0.07), B]])
  ].filter(Boolean).join("");
  let soft = "";
  if (opts.stripTop != null) {
    const sy = opts.stripTop;
    const xd = small ? R - 30 : w * 0.92;
    const rise = Math.min(R - xd, sy - h * 0.55);
    main += d([[L, sy], [xd, sy], [xd + rise, sy - rise]]);
    soft += d([[R - 9, sy - rise - 8], [R - 9, h * 0.2]]);
  }
  return { main, hi, soft };
}
export function drawHud(svg) {
  const w = svg.clientWidth, h = svg.clientHeight;
  if (!w || !h) return;
  const host = svg.parentElement;
  const strip = svg.dataset.hud === "hero" ? host.querySelector(".hero-strip") : null;
  const p = hudPath(w, h, { stripTop: strip ? strip.offsetTop : null });
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = `<path class="f-soft" d="${p.soft}"/><path class="f-main" d="${p.main}"/><path class="f-hi" d="${p.hi}"/>`;
}
const hudObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver((ents) => ents.forEach((e) => drawHud(e.target))) : null;
export function attachHud(root = document) {
  $$("svg.hud", root).forEach((s) => { drawHud(s); hudObserver && hudObserver.observe(s); });
}

// ---------- 파일 준비 (사진 리사이즈) ----------
export async function prepareImage(file, maxSide = 2048, quality = 0.86) {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { try { bmp = await createImageBitmap(file); } catch { return file; } }
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size < 1.2 * 1024 * 1024) { bmp.close && bmp.close(); return file; }
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close && bmp.close();
  const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", quality));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

// ---------- 미디어 업로더 ----------
export function mediaField(host, { initial = [], accept = "image/*", multiple = true, max = 20, limits }) {
  let kept = initial.filter((m) => m.type === "image" || m.type === "video").slice();
  const removed = [];
  let added = []; // {file, url}
  host.innerHTML = `
    <label class="drop" tabindex="0">
      ${icon("upload")}
      <span>사진을 끌어다 놓거나 <b>눌러서 선택</b></span>
      <small>JPG · PNG · WEBP · GIF · 사진 1장 최대 ${limits.imageMB}MB · 최대 ${max}장</small>
      <input type="file" accept="${accept}" ${multiple ? "multiple" : ""} hidden>
    </label>
    <div class="thumbs mt-s"></div>`;
  const input = host.querySelector("input");
  const drop = host.querySelector(".drop");
  const thumbs = host.querySelector(".thumbs");
  const render = () => {
    thumbs.innerHTML = [
      ...kept.map((m, i) => `<div class="thumb">${m.type === "video" ? `<video src="${esc(m.url)}" muted preload="metadata"></video>` : `<img src="${esc(m.url)}" alt="">`}<span class="kind">${m.type === "video" ? "동영상" : "사진"}</span><button type="button" class="x" data-k="${i}" aria-label="삭제">${icon("close")}</button></div>`),
      ...added.map((a, i) => `<div class="thumb">${a.file.type.startsWith("video") ? `<video src="${a.url}" muted preload="metadata"></video>` : `<img src="${a.url}" alt="">`}<span class="kind">새 ${a.file.type.startsWith("video") ? "동영상" : "사진"}</span><button type="button" class="x" data-a="${i}" aria-label="삭제">${icon("close")}</button></div>`)
    ].join("");
  };
  const addFiles = (files) => {
    for (const f of files) {
      const isImg = f.type.startsWith("image/"), isVid = f.type.startsWith("video/");
      if (isVid) { toast(`${f.name}: 동영상은 올릴 수 없어요. 유튜브 링크를 이용해 주세요.`, "err"); continue; }
      if (!isImg || !/image\/(jpeg|png|webp|gif)/.test(f.type)) { toast(`${f.name}: JPG·PNG·WEBP·GIF 사진만 올릴 수 있어요.`, "err"); continue; }
      if (f.size > limits.imageMB * 1024 * 1024 * 4) { toast(`${f.name}: 사진이 너무 커요.`, "err"); continue; }
      if (!multiple) { added.forEach((a) => URL.revokeObjectURL(a.url)); added = []; kept.forEach((k) => removed.push(k)); kept = []; }
      if (kept.length + added.length >= max) { toast(`최대 ${max}개까지 올릴 수 있어요.`, "err"); break; }
      added.push({ file: f, url: URL.createObjectURL(f) });
    }
    render();
  };
  input.addEventListener("change", () => { addFiles([...input.files]); input.value = ""; });
  drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => addFiles([...(e.dataTransfer?.files || [])]));
  thumbs.addEventListener("click", (e) => {
    const b = e.target.closest("button.x");
    if (!b) return;
    if (b.dataset.k != null) { removed.push(kept[+b.dataset.k]); kept.splice(+b.dataset.k, 1); }
    if (b.dataset.a != null) { URL.revokeObjectURL(added[+b.dataset.a].url); added.splice(+b.dataset.a, 1); }
    render();
  });
  render();
  return {
    get kept() { return kept.slice(); },
    get removed() { return removed.slice(); },
    get files() { return added.map((a) => a.file); },
    get count() { return kept.length + added.length; }
  };
}

// ---------- 유튜브 ----------
export function youtubeId(url) {
  const m = String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}

// ---------- 라이트박스 ----------
export function lightbox(items, start = 0, { demo = false } = {}) {
  let i = start;
  const el = document.createElement("div");
  el.className = "lightbox";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", "미디어 보기");
  document.body.appendChild(el);
  document.body.classList.add("modal-open");
  const render = () => {
    const it = items[i];
    let media = "";
    if (it.type === "video") media = `<video src="${esc(it.url)}" controls autoplay playsinline></video>`;
    else if (it.type === "youtube") media = demo ? `<a class="yt-link" href="https://www.youtube.com/watch?v=${esc(it.yt)}" target="_blank" rel="noopener">${icon("play")} 유튜브에서 보기</a>` : `<iframe src="https://www.youtube-nocookie.com/embed/${esc(it.yt)}?autoplay=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="YouTube"></iframe>`;
    else media = `<img src="${esc(it.url)}" alt="${esc(it.title || "")}">`;
    el.innerHTML = `<div class="lb-top"><span class="cnt">${i + 1} / ${items.length}</span><button class="btn icon ghost" data-x aria-label="닫기">${icon("close")}</button></div>
      <div class="lb-stage">${media}
        ${items.length > 1 ? `<button class="lb-nav prev" data-p aria-label="이전">${icon("left")}</button><button class="lb-nav next" data-n aria-label="다음">${icon("right")}</button>` : ""}
      </div>
      <div class="lb-cap">${esc(it.title || "")}${it.date ? `<small>${esc(fmtYmd(it.date))}</small>` : ""}${it.href ? `<a href="${esc(it.href)}" data-go>활동 보기</a>` : ""}</div>`;
    el.querySelector("[data-x]").focus({ preventScroll: true });
  };
  const close = () => { el.remove(); document.removeEventListener("keydown", onKey); if (!$("#modalRoot").children.length) document.body.classList.remove("modal-open"); };
  const go = (d) => { i = (i + d + items.length) % items.length; render(); };
  const onKey = (e) => { if (e.key === "Escape") close(); if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); };
  el.addEventListener("click", (e) => {
    if (e.target.closest("[data-x]") || e.target === el || e.target.classList.contains("lb-stage")) return close();
    if (e.target.closest("[data-p]")) return go(-1);
    if (e.target.closest("[data-n]")) return go(1);
    if (e.target.closest("[data-go]")) close();
  });
  let sx = null;
  el.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  el.addEventListener("touchend", (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); sx = null; });
  document.addEventListener("keydown", onKey);
  render();
}

// 인앱 브라우저 감지 (카카오톡 등은 구글 로그인이 차단됨)
export function inAppBrowser() {
  const ua = navigator.userAgent || "";
  if (/KAKAOTALK/i.test(ua)) return "kakao";
  if (/NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|everytimeApp|DaumApps|wv\)/i.test(ua)) return "other";
  return null;
}
