// 데모 모드: Firebase 설정 전, 이 브라우저 안에서만 동작하는 가짜 백엔드입니다.
// 모든 데이터는 localStorage 에 저장되며 다른 사람에게 보이지 않습니다.

const KEY = "astro-demo-v2";
const SESSION_KEY = "astro-demo-user";
const NOW = { __now: 1 };

const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(15)), (b) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[b % 62]).join("");
const clone = (o) => JSON.parse(JSON.stringify(o));
const DAY = 86400000;
function ymd(offsetDays) {
  const d = new Date(Date.now() + offsetDays * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const monthOf = (offsetDays) => new Date(Date.now() + offsetDays * DAY).getMonth() + 1;
const ago = (days, hours = 0) => Date.now() - days * DAY - hours * 3600000;

export const DEMO_IDENTITIES = [
  { uid: "demo-admin", name: "김별", email: "byeol.kim@astro.demo", role: "admin", desc: "관리자 — 배너·공지·가입 신청·회원 관리" },
  { uid: "demo-member", name: "이은하", email: "eunha.lee@astro.demo", role: "member", desc: "부원 — 활동 기록·커뮤니티 글쓰기" },
  { uid: "demo-guest", name: "박하늘", email: "haneul.park@astro.demo", role: "guest", desc: "일반 학생 — 가입 신청해 보기" }
];

function seed() {
  const users = {};
  const addUser = (uid, name, email, role, extra = {}) => {
    users[uid] = { email, name, photo: "", role, createdAt: ago(60 + Object.keys(users).length * 3), lastLoginAt: ago(1), ...extra };
  };
  addUser("demo-admin", "김별", "byeol.kim@astro.demo", "admin", { realName: "김별", studentNo: "20301" });
  addUser("demo-member", "이은하", "eunha.lee@astro.demo", "member", { realName: "이은하", studentNo: "20514" });
  addUser("demo-guest", "박하늘", "haneul.park@astro.demo", "guest");
  addUser("m-choi", "최유성", "yuseong.choi@astro.demo", "member", { realName: "최유성", studentNo: "10207" });
  addUser("m-jung", "정달빛", "dalbit.jung@astro.demo", "member", { realName: "정달빛", studentNo: "10611" });
  addUser("m-han", "한오로라", "aurora.han@astro.demo", "member", { realName: "한오로라", studentNo: "20109" });
  addUser("g-yoon", "윤혜성", "hyeseong.yoon@astro.demo", "guest");
  addUser("g-seo", "서북두", "bukdu.seo@astro.demo", "guest");

  const applications = {
    "g-yoon": { name: "윤혜성", studentNo: "10415", phone: "010-0000-0000", email: "hyeseong.yoon@astro.demo", interests: ["천체 사진", "우주 과학"], motivation: "중학생 때 처음 은하수 사진을 보고 직접 찍어보고 싶다는 꿈이 생겼습니다. 장비 다루는 법을 배우고 꾸준히 기록을 남기고 싶어요.", experience: "스마트폰으로 달 사진을 몇 번 찍어 봤습니다.", status: "pending", adminMemo: "", createdAt: ago(1, 3) },
    "g-seo": { name: "서북두", studentNo: "10103", phone: "", email: "bukdu.seo@astro.demo", interests: ["천체 관측", "천문학 이론", "탐구 발표"], motivation: "과학 탐구 대회에서 항성의 분광형을 주제로 발표해 보고 싶습니다. 함께 관측하며 데이터를 모을 수 있는 동아리를 찾고 있었어요.", experience: "", status: "pending", adminMemo: "", createdAt: ago(0, 5) },
    "m-han": { name: "한오로라", studentNo: "20109", phone: "", email: "aurora.han@astro.demo", interests: ["천문학 이론"], motivation: "별의 일생에 관심이 많습니다.", experience: "", status: "approved", adminMemo: "환영합니다!", createdAt: ago(250), reviewedAt: ago(248) }
  };

  const notices = {};
  const addNotice = (title, content, pinned, days, author = "김별") => {
    notices[rid()] = { title, content, pinned, authorUid: "demo-admin", authorName: author, createdAt: ago(days, 2) };
  };
  addNotice("동아리 망원경 대여 규칙 안내", "동아리 망원경은 부원이라면 누구나 대여할 수 있습니다.\n\n1. 대여는 관리자에게 미리 말한 뒤 지구과학실 대여 장부에 기록해 주세요.\n2. 대여 기간은 최대 3일입니다.\n3. 렌즈는 손으로 만지지 말고, 반납 전 덮개를 꼭 닫아 주세요.", false, 30);
  addNotice("갤러리에 사진·영상 올리는 방법", "활동 메뉴의 달력에서 날짜를 고른 뒤 '활동 기록하기'를 누르면 글과 함께 사진, 동영상을 올릴 수 있어요.\n올린 사진과 영상은 갤러리에 자동으로 모입니다.", false, 18);
  addNotice(`${monthOf(17)}월 쌍둥이자리 유성우 관측 신청`, "올해 마지막 대형 유성우 관측을 진행합니다.\n참여를 원하는 부원은 커뮤니티 '정보' 게시판 글에 댓글로 신청해 주세요.\n따뜻한 옷과 담요는 필수입니다!", false, 3);
  addNotice("야간 관측 안전 수칙 (필독)", "· 관측 장소 밖으로 혼자 이동하지 않습니다.\n· 손전등은 빨간 셀로판을 씌워 사용합니다.\n· 관측이 끝나면 보호자 연락 후 2인 이상 함께 귀가합니다.\n· 날씨가 흐리면 관측은 실내 스터디로 바뀝니다.", true, 45);
  addNotice("2027학년도 신입 부원 모집 안내", "ASTRO에서 함께할 신입 부원을 모집합니다.\n\n■ 모집 기간: 3월 초 2주간\n■ 신청 방법: 홈페이지 오른쪽 위 '가입하기' → 구글 계정 로그인 → 신청서 작성\n■ 결과 안내: 신청 후 가입하기 페이지에서 바로 확인할 수 있어요.\n\n관측 경험이 없어도 괜찮습니다. 별을 좋아하는 마음이면 충분해요!", true, 6);

  const posts = {}, comments = {};
  const addPost = (category, title, content, uid, name, days, cmts = []) => {
    const id = rid();
    posts[id] = { category, title, content, authorUid: uid, authorName: name, authorPhoto: "", createdAt: ago(days, 4), commentCount: cmts.length };
    comments[`posts/${id}/comments`] = Object.fromEntries(cmts.map(([cu, cn, txt], i) => [rid(), { content: txt, authorUid: cu, authorName: cn, authorPhoto: "", createdAt: ago(days, 3 - i) }]));
  };
  addPost("정보", "이번 달 밤하늘 볼거리 정리", "· 목성: 해가 진 뒤 동쪽 하늘에서 가장 밝게 보여요.\n· 토성: 초저녁 남서쪽. 고리가 꽤 얇게 보이는 시기예요.\n· 쌍둥이자리 유성우: 극대기 전후 이틀 밤이 좋아요.\n관측 계획 세울 때 참고하세요!", "m-han", "한오로라", 9, [["demo-member", "이은하", "정리 감사해요! 유성우 날 날씨만 좋았으면…"]]);
  addPost("질문", "스마트폰으로 달 사진 잘 찍는 법 있을까요?", "망원경 접안렌즈에 폰을 대고 찍으면 자꾸 흔들리고 초점이 안 맞아요. 다들 어떻게 찍으시나요?", "m-choi", "최유성", 7, [
    ["demo-member", "이은하", "스마트폰 거치대(어댑터) 쓰면 훨씬 편해요. 동아리에 하나 있어요!"],
    ["m-han", "한오로라", "노출을 확 낮추고 화면을 탭해서 초점 고정하면 잘 나와요."],
    ["m-choi", "최유성", "오 내일 바로 해볼게요 감사합니다"]
  ]);
  addPost("자유", "새 망원경 이름 지어줘요", "이번에 들어온 굴절 망원경 이름을 정하려고 합니다. 후보: 은하철도, 별똥, 북일1호", "m-jung", "정달빛", 4, [["m-choi", "최유성", "북일1호 투표합니다"], ["demo-admin", "김별", "다음 회의 때 투표로 정해요!"]]);
  addPost("관측후기", "별 궤적 첫 도전 결과", "30초 노출로 120장을 찍어서 합성했어요. 북극성 주변이 동그랗게 도는 게 신기했습니다. 사진은 활동 기록에 올려뒀어요!", "demo-member", "이은하", 2, [["m-jung", "정달빛", "와 첫 도전인데 대박이에요"]]);
  addPost("관측후기", "어제 본 목성 줄무늬, 아직도 설레요", "망원경으로 처음 목성 줄무늬랑 위성 네 개를 봤어요. 눈으로 직접 보니까 사진이랑 느낌이 완전히 달라요.", "m-choi", "최유성", 0.4, []);

  const activities = {};
  const media = (...names) => names.map((n) => ({ url: `assets/${n}`, path: "", type: "image", name: n.split("/").pop() }));
  const addAct = (offset, title, place, content, m, uid = "demo-member", name = "이은하") => {
    activities[rid()] = { date: ymd(offset), title, place, content, media: m, authorUid: uid, authorName: name, authorPhoto: "", createdAt: ago(Math.max(0, -offset), 1) };
  };
  addAct(-40, "천문대 견학", "시립 천문대", "천문대 주망원경으로 성단을 관측하고, 천체투영관에서 계절별 별자리 해설을 들었습니다. 연구원 선생님께 관측 기록 남기는 법도 배웠어요.", media("hero-night.jpg"), "demo-admin", "김별");
  addAct(-23, `${monthOf(-23)}월 정기 관측회 — 달과 목성`, "본관 옥상", "상현달 표면의 크레이터와 목성의 갈릴레이 위성 4개를 관측했습니다. 신입 부원들도 직접 망원경 초점을 맞춰 봤어요.", media("demo/moon.jpg"));
  addAct(-12, "별 궤적 촬영 워크숍", "운동장", "삼각대와 릴리즈를 이용한 장노출 연속 촬영을 연습했습니다. 30초 × 120장을 합성해 북극성 주변 별 궤적을 완성!", media("demo/trails.jpg"));
  addAct(-8, "유성우 관측의 밤", "운동장", "자정 무렵부터 2시간 동안 유성 23개를 셌어요. 가장 밝은 유성은 긴 꼬리를 남기며 동쪽으로 떨어졌습니다.", media("demo/milkyway.jpg", "hero-night.jpg"), "m-choi", "최유성");
  addAct(-5, "천문 스터디 — 성운은 어떻게 빛날까", "지구과학실", "발광 성운, 반사 성운, 암흑 성운의 차이를 정리하고 각자 좋아하는 성운을 하나씩 골라 발표했습니다.", media("demo/nebula.jpg"), "m-han", "한오로라");
  addAct(-1, "정기 회의 · 겨울 관측 계획", "지구과학실", "다음 달 유성우 관측 일정과 준비물, 역할 분담을 정했습니다. 핫팩은 동아리 예산으로 구입하기로!", [], "demo-admin", "김별");
  addAct(17, "쌍둥이자리 유성우 관측 (예정)", "운동장", "올해 마지막 유성우 관측입니다. 참여 신청은 공지사항을 확인해 주세요.", [], "demo-admin", "김별");

  return { cols: { users, applications, notices, posts, ...comments, activities, banners: {}, settings: {} } };
}

export function createDemo() {
  let memoryOnly = false;
  let store;
  try { store = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { store = null; }
  if (!store || !store.cols) store = seed();

  const listeners = new Set();
  let current = null;

  function persist() {
    if (memoryOnly) return;
    try { localStorage.setItem(KEY, JSON.stringify(store)); }
    catch (e) { memoryOnly = true; console.warn("demo storage full", e); }
  }
  persist();

  const colOf = (path) => (store.cols[path] ||= {});
  function resolve(oldDoc, data) {
    const out = { ...(oldDoc || {}) };
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v === "object" && v.__now) out[k] = Date.now();
      else if (v && typeof v === "object" && "__inc" in v) out[k] = (Number(out[k]) || 0) + v.__inc;
      else out[k] = v;
    }
    return out;
  }
  function makeUser(uid) {
    const u = store.cols.users?.[uid];
    if (!u) return null;
    return { uid, email: u.email, name: u.name, photo: u.photo || "", role: u.role || "guest", realName: u.realName || "", studentNo: u.studentNo || "" };
  }
  const emit = () => listeners.forEach((cb) => cb(current));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  try { const saved = sessionStorage.getItem(SESSION_KEY); if (saved) current = makeUser(saved); } catch { /* noop */ }

  return {
    mode: "demo",
    get user() { return current; },
    get memoryOnly() { return memoryOnly; },
    identities: DEMO_IDENTITIES,
    onAuth(cb) { listeners.add(cb); setTimeout(() => cb(current), 0); return () => listeners.delete(cb); },
    onAuthError() {},
    async signIn() { throw new Error("demo-picker"); },
    async demoSignIn(uid) {
      if (!store.cols.users[uid]) {
        const idn = DEMO_IDENTITIES.find((d) => d.uid === uid);
        store.cols.users[uid] = { email: idn.email, name: idn.name, photo: "", role: idn.role, createdAt: Date.now() };
        persist();
      }
      store.cols.users[uid].lastLoginAt = Date.now();
      current = makeUser(uid);
      try { sessionStorage.setItem(SESSION_KEY, uid); } catch { /* noop */ }
      emit();
    },
    async signOut() {
      current = null;
      try { sessionStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
      emit();
    },
    async reloadMe() { if (current) { current = makeUser(current.uid); emit(); } return current; },
    reset() {
      store = seed();
      memoryOnly = false;
      try { localStorage.removeItem(KEY); } catch { /* noop */ }
      persist();
      if (current) current = makeUser(current.uid);
    },

    async list(path, opts = {}) {
      await wait(60);
      let docs = Object.entries(colOf(path)).map(([id, d]) => ({ id, ...clone(d) }));
      for (const [f, op, v] of opts.where || []) {
        docs = docs.filter((d) => {
          const x = d[f];
          switch (op) {
            case "==": return x === v;
            case "!=": return x !== v;
            case "<": return x < v;
            case "<=": return x <= v;
            case ">": return x > v;
            case ">=": return x >= v;
            case "in": return v.includes(x);
            case "array-contains": return Array.isArray(x) && x.includes(v);
            default: return true;
          }
        });
      }
      if (opts.orderBy) {
        const [f, dir] = opts.orderBy;
        const s = dir === "desc" ? -1 : 1;
        docs.sort((a, b) => (a[f] > b[f] ? s : a[f] < b[f] ? -s : 0));
      }
      if (opts.limit) docs = docs.slice(0, opts.limit);
      return docs;
    },
    async get(path, id) {
      await wait(40);
      const d = colOf(path)[id];
      return d ? { id, ...clone(d) } : null;
    },
    async add(path, data) {
      await wait(80);
      const id = rid();
      colOf(path)[id] = resolve(null, { ...data, createdAt: NOW });
      persist();
      return id;
    },
    async set(path, id, data, merge = true) {
      await wait(80);
      const c = colOf(path);
      c[id] = resolve(merge ? c[id] : null, data);
      persist();
    },
    async update(path, id, data) {
      await wait(60);
      const c = colOf(path);
      if (!c[id]) throw new Error("문서를 찾을 수 없어요.");
      c[id] = resolve(c[id], data);
      persist();
      if (path === "users" && current && id === current.uid) { current = makeUser(id); emit(); }
    },
    async remove(path, id) {
      await wait(60);
      delete colOf(path)[id];
      persist();
    },
    now: () => NOW,
    inc: (n) => ({ __inc: n }),

    async upload(file, folder, onProgress) {
      if (!current) throw new Error("로그인이 필요해요.");
      for (let i = 1; i <= 5; i++) { await wait(70); onProgress && onProgress(i / 6); }
      const isVideo = (file.type || "").startsWith("video");
      let url;
      if (isVideo) {
        url = URL.createObjectURL(file); // 데모: 새로고침하면 사라집니다
      } else {
        url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
      }
      onProgress && onProgress(1);
      return { url, path: `demo/${folder}/${rid()}`, type: isVideo ? "video" : "image", name: file.name || "", size: file.size || 0, ...(isVideo ? { ephemeral: true } : {}) };
    },
    async deleteFile() {}
  };
}
