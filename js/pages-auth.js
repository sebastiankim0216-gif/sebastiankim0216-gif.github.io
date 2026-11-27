// 로그인 · 회원가입(동의) · 이용약관 · 개인정보처리방침 · 이용 제한 안내
import { S, isDemo } from "./state.js?v=202611271625";
import { CONSENT_VERSION } from "./config.js?v=202611271625";
import { $, esc, icon, pageHero, toast, errMsg, setBtnBusy, inAppBrowser, sparkle, confirmDialog, lines } from "./ui.js?v=202611271625";

export const GOOGLE_G = `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

const TERMS = `제1조 (목적) 이 약관은 북일고등학교 항공우주·기계공학 동아리 ASTRO(이하 "동아리")가 운영하는 웹사이트(이하 "사이트")의 이용 조건을 정합니다.
제2조 (회원) 회원은 이 약관과 개인정보 수집·이용에 동의하고 가입한 사람입니다. 회원은 가입 신청, 커뮤니티 글·댓글 작성 등 사이트 기능을 이용할 수 있습니다.
제3조 (회원의 의무) 회원은 다른 사람의 개인정보를 올리거나, 욕설·비방·광고·음란물 등 다른 사람에게 피해를 주는 글을 올려서는 안 됩니다. 다른 사람의 계정을 쓰거나 사이트 운영을 방해해서는 안 됩니다.
제4조 (게시물) 회원이 올린 글의 책임은 작성자에게 있습니다. 동아리 운영진은 약관에 어긋나는 게시물을 알리지 않고 삭제할 수 있습니다.
제5조 (이용 제한) 운영진은 약관을 어긴 회원의 커뮤니티 글쓰기를 제한하거나 사이트 이용을 제한할 수 있습니다.
제6조 (탈퇴) 회원은 마이페이지에서 언제든 탈퇴할 수 있습니다. 탈퇴하면 회원 정보는 바로 삭제되며, 이미 쓴 게시물은 남을 수 있습니다.
제7조 (기타) 이 약관에 없는 내용은 학교 규정과 관련 법령을 따릅니다.`;

const PRIVACY_CONSENT = `1. 수집 항목: 이름, 이메일 주소, (구글 로그인 시) 프로필 사진, 접속 기록
2. 이용 목적: 회원 식별, 로그인, 공지·커뮤니티 이용, 부정 이용 방지
3. 보유 기간: 회원 탈퇴 시까지 (탈퇴하면 바로 삭제)
4. 동의를 거부할 수 있으며, 거부하면 회원가입을 할 수 없습니다.
※ 가입 신청서(학번, 전화번호, 답변)는 신청할 때 따로 동의를 받습니다.`;

export function consentBlock(prefix = "cs") {
  return `<div class="consent">
    <label class="check-line all"><input type="checkbox" id="${prefix}All"><span><b>전체 동의</b></span></label>
    <div class="consent-item"><label class="check-line"><input type="checkbox" class="${prefix}-c" data-k="terms"><span><b class="req-tag">필수</b> 이용약관 동의</span></label>
      <details><summary>내용 보기</summary><div class="consent-text">${lines(TERMS)}</div></details></div>
    <div class="consent-item"><label class="check-line"><input type="checkbox" class="${prefix}-c" data-k="privacy"><span><b class="req-tag">필수</b> 개인정보 수집·이용 동의</span></label>
      <details><summary>내용 보기</summary><div class="consent-text">${lines(PRIVACY_CONSENT)}</div></details></div>
    <div class="consent-item"><label class="check-line"><input type="checkbox" class="${prefix}-c" data-k="age14"><span><b class="req-tag">필수</b> 만 14세 이상입니다</span></label></div>
    <p class="hint"><a href="#privacy" class="more">개인정보처리방침 전문</a> · <a href="#terms" class="more">이용약관 전문</a></p>
  </div>`;
}
export function wireConsent(root, prefix = "cs") {
  const all = $(`#${prefix}All`, root), items = [...root.querySelectorAll(`.${prefix}-c`)];
  all.addEventListener("change", () => items.forEach((c) => (c.checked = all.checked)));
  items.forEach((c) => c.addEventListener("change", () => { all.checked = items.every((x) => x.checked); }));
  return () => {
    const ok = items.every((c) => c.checked);
    return ok ? { terms: true, privacy: true, age14: true, version: CONSENT_VERSION, at: new Date().toISOString() } : null;
  };
}

const goAfterLogin = () => {
  const back = S.afterLogin && !/^#(login|signup)/.test(S.afterLogin) ? S.afterLogin : "#home";
  S.afterLogin = null;
  location.hash = back;
};

// ---------------------------------------------------------------------
export async function renderLogin(app) {
  if (S.user) { goAfterLogin(); return; }
  const ia = inAppBrowser();
  app.innerHTML = `${pageHero({ en: "LOGIN", ko: "로그인", desc: "ASTRO 계정으로 로그인하세요.", bg: "assets/hero-day.jpg" })}
  <section class="page"><div class="wrap auth-wrap"><div class="panel hudc auth-card">
    <h2>로그인</h2>
    ${ia ? `<div class="notice-box mt-m"><span>카카오톡 등 앱 안의 브라우저에서는 <b>구글 로그인</b>이 막혀 있어요. 이메일로 로그인하거나 외부 브라우저로 열어 주세요.</span>${ia === "kakao" ? `<a class="btn sm" href="kakaotalk://web/openExternal?url=${encodeURIComponent(location.href)}">외부 브라우저로 열기</a>` : ""}</div>` : ""}
    <button class="google-btn mt-m" id="lgGoogle" type="button" style="width:100%;justify-content:center">${GOOGLE_G} Google로 로그인</button>
    <p class="divider"><span>또는 이메일로 로그인</span></p>
    <form class="form" id="lgForm" novalidate>
      <div class="field"><label for="lgEmail">이메일</label><input type="email" id="lgEmail" autocomplete="email" placeholder="example@email.com"></div>
      <div class="field"><label for="lgPw">비밀번호</label><input type="password" id="lgPw" autocomplete="current-password"></div>
      <button class="btn primary" type="submit" id="lgSubmit" style="width:100%">로그인</button>
    </form>
    <div class="auth-links"><button class="btn sm ghost" id="lgReset" type="button">비밀번호 찾기</button><span>계정이 없나요? <a class="more" href="#signup">회원가입</a></span></div>
  </div></div></section>`;
  $("#lgGoogle").addEventListener("click", async () => {
    if (isDemo()) return S.demoPicker();
    try { await S.api.signIn(); } catch (e) { toast(errMsg(e), "err"); }
  });
  $("#lgReset").addEventListener("click", async () => {
    const email = $("#lgEmail").value.trim();
    if (!email) return toast("비밀번호를 찾을 이메일을 먼저 입력해 주세요.", "err");
    try { await S.api.resetPassword(email); toast("비밀번호 재설정 메일을 보냈어요.", "ok"); } catch (e) { toast(errMsg(e), "err"); }
  });
  $("#lgForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isDemo()) return S.demoPicker();
    const email = $("#lgEmail").value.trim(), pw = $("#lgPw").value;
    if (!email || !pw) return toast("이메일과 비밀번호를 입력해 주세요.", "err");
    const btn = $("#lgSubmit");
    setBtnBusy(btn, true);
    try { await S.api.signInEmail(email, pw); toast("로그인했어요.", "ok"); }
    catch (err) { toast(errMsg(err), "err"); setBtnBusy(btn, false); }
  });
}

// ---------------------------------------------------------------------
export async function renderSignup(app) {
  const u = S.user;
  // 로그인했지만 동의를 안 한 경우 → 가입 마무리
  if (u && !u.consented) {
    app.innerHTML = `${pageHero({ en: "SIGN UP", ko: "회원가입", desc: "가입을 마무리해 주세요.", bg: "assets/hero-day.jpg" })}
    <section class="page"><div class="wrap auth-wrap"><div class="panel hudc auth-card">
      <h2>가입 마무리</h2>
      <p class="text-dim mt-s" style="font-size:14.5px">${esc(u.email)} 계정으로 ASTRO에 가입합니다. 아래 내용에 동의하면 사이트를 이용할 수 있어요.</p>
      <form class="form mt-m" id="cfForm" novalidate>
        <div class="field"><label for="cfName">이름<span class="req">*</span></label><input type="text" id="cfName" maxlength="20" autocomplete="name" value="${esc(u.name || "")}"><span class="hint">커뮤니티와 지원서에 표시되는 이름이에요. 실명을 권장해요.</span></div>
        ${consentBlock("cf")}
        <button class="btn primary" type="submit" style="width:100%">동의하고 시작하기</button>
        <button class="btn ghost" type="button" id="cfCancel" style="width:100%">가입하지 않고 로그아웃</button>
      </form>
    </div></div></section>`;
    const getConsent = wireConsent(app, "cf");
    $("#cfCancel").addEventListener("click", async () => { await S.api.signOut(); location.hash = "#home"; });
    $("#cfForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("#cfName").value.trim(), consents = getConsent();
      if (!name) return toast("이름을 입력해 주세요.", "err");
      if (!consents) return toast("필수 항목에 모두 동의해 주세요.", "err");
      const btn = e.target.querySelector("button[type=submit]");
      setBtnBusy(btn, true);
      try { await S.api.saveProfile({ name, consents }); toast("가입을 완료했어요. 환영해요!", "ok"); goAfterLogin(); }
      catch (err) { toast(errMsg(err), "err"); setBtnBusy(btn, false); }
    });
    return;
  }
  if (u) {
    app.innerHTML = `${pageHero({ en: "SIGN UP", ko: "회원가입", desc: "", bg: "assets/hero-day.jpg" })}
      <section class="page"><div class="wrap auth-wrap"><div class="panel guard"><h2>이미 가입한 계정이에요</h2><p class="text-dim mt-s">${esc(u.email)}</p><div class="acts"><a class="btn primary" href="#home">홈으로</a><a class="btn" href="#mypage">마이페이지</a></div></div></div></section>`;
    return;
  }
  app.innerHTML = `${pageHero({ en: "SIGN UP", ko: "회원가입", desc: "ASTRO 계정을 만들어 주세요.", bg: "assets/hero-day.jpg" })}
  <section class="page"><div class="wrap auth-wrap"><div class="panel hudc auth-card">
    <h2>회원가입</h2>
    <button class="google-btn mt-m" id="suGoogle" type="button" style="width:100%;justify-content:center">${GOOGLE_G} Google 계정으로 가입</button>
    <p class="hint mt-s" style="text-align:center">구글로 가입하면 다음 화면에서 약관 동의를 받아요.</p>
    <p class="divider"><span>또는 이메일로 가입</span></p>
    <form class="form" id="suForm" novalidate>
      <div class="field"><label for="suName">이름<span class="req">*</span></label><input type="text" id="suName" maxlength="20" autocomplete="name"></div>
      <div class="field"><label for="suEmail">이메일<span class="req">*</span></label><input type="email" id="suEmail" autocomplete="email" placeholder="example@email.com"><span class="hint">가입 후 이 주소로 인증 메일이 가요.</span></div>
      <div class="row-2">
        <div class="field"><label for="suPw">비밀번호<span class="req">*</span></label><input type="password" id="suPw" autocomplete="new-password" placeholder="8자 이상"></div>
        <div class="field"><label for="suPw2">비밀번호 확인<span class="req">*</span></label><input type="password" id="suPw2" autocomplete="new-password"></div>
      </div>
      ${consentBlock("su")}
      <button class="btn primary" type="submit" id="suSubmit" style="width:100%">가입하기</button>
    </form>
    <div class="auth-links"><span>이미 계정이 있나요? <a class="more" href="#login">로그인</a></span></div>
  </div></div></section>`;
  const getConsent = wireConsent(app, "su");
  $("#suGoogle").addEventListener("click", async () => {
    if (isDemo()) return S.demoPicker();
    if (inAppBrowser()) return toast("앱 안의 브라우저에서는 구글 가입이 막혀 있어요. 이메일로 가입하거나 외부 브라우저로 열어 주세요.", "err");
    try { await S.api.signIn(); } catch (e) { toast(errMsg(e), "err"); }
  });
  $("#suForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isDemo()) return S.demoPicker();
    const name = $("#suName").value.trim(), email = $("#suEmail").value.trim(), pw = $("#suPw").value, pw2 = $("#suPw2").value;
    const consents = getConsent();
    if (!name) return toast("이름을 입력해 주세요.", "err");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast("이메일 주소를 확인해 주세요.", "err");
    if (pw.length < 8) return toast("비밀번호는 8자 이상으로 정해 주세요.", "err");
    if (pw !== pw2) return toast("비밀번호 확인이 일치하지 않아요.", "err");
    if (!consents) return toast("필수 항목에 모두 동의해 주세요.", "err");
    const btn = $("#suSubmit");
    setBtnBusy(btn, true);
    try {
      S.pendingSignup = true;
      await S.api.signUpEmail(email, pw, name);
      await S.api.saveProfile({ name, consents });
      S.pendingSignup = false;
      toast("가입을 완료했어요! 받은편지함의 인증 메일도 확인해 주세요.", "ok");
      goAfterLogin();
    } catch (err) { S.pendingSignup = false; toast(errMsg(err), "err"); setBtnBusy(btn, false); }
  });
}

// ---------------------------------------------------------------------
export async function renderTerms(app) {
  app.innerHTML = `${pageHero({ en: "TERMS", ko: "이용약관", desc: "", bg: "assets/hero-day.jpg" })}
  <section class="page"><div class="wrap"><div class="panel legal"><p class="text-dim">시행일 ${CONSENT_VERSION}</p>${TERMS.split("\n").map((l) => `<p>${esc(l)}</p>`).join("")}</div></div></section>`;
}

export async function renderPrivacy(app) {
  const s = S.site;
  const P = [
    ["1. 개인정보를 처리하는 곳", `북일고등학교 항공우주·기계공학 동아리 ASTRO 운영진${s.teacher ? ` (지도교사: ${s.teacher})` : ""}`],
    ["2. 수집하는 항목과 목적", "· 회원가입: 이름, 이메일, (구글 로그인 시) 프로필 사진 — 회원 식별, 로그인, 커뮤니티 이용\n· 가입 신청: 학번, 이름, 전화번호, 이메일, 지원서 답변 — 신입 부원 선발과 결과 안내\n· 자동 수집: 접속 기록 — 부정 이용 방지"],
    ["3. 보유 기간", "· 회원 정보: 회원 탈퇴 시 바로 삭제\n· 가입 신청서: 선발이 끝난 뒤 6개월 이내 삭제\n· 이용 제한 기록: 제한이 풀릴 때까지"],
    ["4. 제3자 제공", "동아리는 개인정보를 외부에 제공하지 않습니다. 단, 법령에 따른 요청이 있는 경우는 예외입니다."],
    ["5. 처리 위탁", "· Google Firebase (로그인, 데이터 저장)\n· Supabase (사진 저장)\n위 서비스는 해외 서버를 사용할 수 있습니다."],
    ["6. 정보주체의 권리", "회원은 언제든 자신의 정보를 확인·수정하거나 탈퇴(삭제)할 수 있습니다. 마이페이지에서 직접 하거나 운영진에게 요청할 수 있습니다."],
    ["7. 안전성 확보 조치", "접근 권한을 운영진으로 제한하고, 보안 규칙으로 본인과 운영진만 개인정보를 볼 수 있게 합니다."],
    ["8. 문의", `${s.teacher ? `지도교사 ${s.teacher}` : "동아리 운영진"}${s.email ? ` · ${s.email}` : ""}`]
  ];
  app.innerHTML = `${pageHero({ en: "PRIVACY", ko: "개인정보처리방침", desc: "", bg: "assets/hero-day.jpg" })}
  <section class="page"><div class="wrap"><div class="panel legal"><p class="text-dim">시행일 ${CONSENT_VERSION}</p>
    ${P.map(([h, t]) => `<h3>${esc(h)}</h3><p>${lines(t)}</p>`).join("")}</div></div></section>`;
}

// ---------------------------------------------------------------------
export function renderBanned(app) {
  const u = S.user;
  app.innerHTML = `<section class="banned"><div class="banned-card">
    <img src="assets/logo-color.png" alt="ASTRO" class="banned-logo">
    <h1>사이트 이용이 제한된 계정입니다</h1>
    <p>${esc(u?.email || "")} 계정은 운영진에 의해 ASTRO 사이트 이용이 제한되었습니다.</p>
    ${u?.banReason ? `<div class="banned-reason"><small>사유</small><p>${esc(u.banReason)}</p></div>` : ""}
    <p class="text-dim">문의가 필요하면 동아리 운영진이나 지도교사에게 연락해 주세요.</p>
    <button class="btn" id="banOut" type="button">${icon("logout")} 로그아웃</button>
  </div></section>`;
  $("#banOut").addEventListener("click", async () => { await S.api.signOut(); location.hash = "#home"; });
}
