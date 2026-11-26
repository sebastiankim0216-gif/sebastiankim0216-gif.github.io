// 데이터 계층: Firebase(실서비스) 또는 데모(브라우저 저장) 중 하나를 같은 인터페이스로 제공합니다.
//
//  api.mode                       'firebase' | 'demo'
//  api.onAuth(cb)                 로그인 상태 변화 구독 → cb(user | null)
//  api.signIn() / api.signOut()
//  api.reloadMe()                 내 역할 등 다시 읽기
//  api.list(path, {where, orderBy, limit})
//  api.get(path, id) / api.add(path, data) / api.set(path, id, data, merge) / api.update(path, id, data) / api.remove(path, id)
//  api.now() / api.inc(n)         서버 시각 / 숫자 증가 (update, set 에서 사용)
//  api.upload(file, folder, onProgress) → { url, path, type, name, size }
//  api.deleteFile(path)

import { FIREBASE_CONFIG, FIREBASE_SDK_VERSION, OWNER_EMAILS, ALLOWED_EMAIL_DOMAIN, SUPABASE, UPLOAD_LIMITS } from "./config.js?v=202611261551";

export function isConfigured() {
  return !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
}

export async function createBackend() {
  if (isConfigured()) return createFirebase();
  const { createDemo } = await import("./demo-backend.js?v=202611261551");
  return createDemo();
}

export const isOwnerEmail = (e) => OWNER_EMAILS.map((s) => s.trim().toLowerCase()).includes(String(e || "").toLowerCase());
const extOf = (f) => (String(f.name || "").match(/\.(jpe?g|png|webp|gif)$/i)?.[1] || (f.type || "image/jpeg").split("/")[1] || "jpg").toLowerCase().replace("jpeg", "jpg");

// Firestore Timestamp → 밀리초 숫자
function norm(v) {
  if (v && typeof v.toMillis === "function") return v.toMillis();
  if (Array.isArray(v)) return v.map(norm);
  if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
    const o = {};
    for (const k in v) o[k] = norm(v[k]);
    return o;
  }
  return v;
}

async function createFirebase() {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
  const [appM, authM, fs, st] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
    import(`${base}/firebase-storage.js`)
  ]);
  const app = appM.initializeApp(FIREBASE_CONFIG);
  const auth = authM.getAuth(app);
  auth.languageCode = "ko";
  const db = fs.getFirestore(app);
  const storage = FIREBASE_CONFIG.storageBucket ? st.getStorage(app) : null;
  const provider = new authM.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account", ...(ALLOWED_EMAIL_DOMAIN ? { hd: ALLOWED_EMAIL_DOMAIN } : {}) });

  let current = null;
  let fbUser = null;

  // Supabase 클라이언트 (필요할 때 한 번만 불러옴). Firebase ID 토큰을 그대로 전달합니다.
  let sbClient = null;
  async function supabase() {
    if (!SUPABASE.url || !SUPABASE.anonKey) {
      const err = new Error("사진 저장소(Supabase)가 아직 설정되지 않았어요. js/config.js 의 SUPABASE 값을 확인해 주세요.");
      err.code = "astro/no-supabase";
      throw err;
    }
    if (!sbClient) {
      const { createClient } = await import(SUPABASE.sdk);
      sbClient = createClient(SUPABASE.url, SUPABASE.anonKey, {
        accessToken: async () => (auth.currentUser ? await auth.currentUser.getIdToken() : null)
      });
    }
    return sbClient;
  }
  const sbError = (e) => {
    const m = String(e?.message || e || "");
    const err = new Error(/row-level security|Unauthorized|403|new row violates/i.test(m)
      ? "사진을 올릴 권한이 없어요. (Supabase 설정: 서드파티 인증 · 관리자 동기화 확인)"
      : /JWT|invalid.*token|401/i.test(m) ? "Supabase가 로그인 토큰을 거부했어요. Supabase › Authentication › Third-party Auth 에 Firebase를 추가했는지 확인해 주세요."
      : /mime|file size|Payload too large|413/i.test(m) ? "사진 형식 또는 크기 제한에 걸렸어요." : m);
    err.code = "astro/supabase";
    return err;
  };
  const listeners = new Set();
  const errorListeners = new Set();
  const emit = () => listeners.forEach((cb) => cb(current));
  const emitError = (e) => errorListeners.forEach((cb) => cb(e));

  const col = (path) => fs.collection(db, ...path.split("/"));
  const ref = (path, id) => fs.doc(db, ...path.split("/"), id);
  const toObj = (s) => ({ id: s.id, ...norm(s.data()) });

  // 역할: owner(OWNER_EMAILS) > admin('admins' 컬렉션, 문서 ID = 이메일) > user
  async function syncUser(u) {
    if (!u) return null;
    const email = String(u.email || "").toLowerCase();
    if (ALLOWED_EMAIL_DOMAIN && !email.endsWith("@" + ALLOWED_EMAIL_DOMAIN.toLowerCase())) {
      await authM.signOut(auth);
      const err = new Error(`@${ALLOWED_EMAIL_DOMAIN} 계정으로만 로그인할 수 있어요.`);
      err.code = "astro/domain";
      throw err;
    }
    let role = "user";
    if (!u.emailVerified) role = "user"; // 인증되지 않은 이메일은 관리자 권한을 받을 수 없음
    else if (isOwnerEmail(email)) role = "owner";
    else {
      try { const a = await fs.getDoc(ref("admins", email)); if (a.exists()) role = "admin"; } catch (e) { console.warn("admin check", e); }
    }
    let theme = "";
    try { const p = await fs.getDoc(ref("users", u.uid)); if (p.exists()) theme = p.data().theme || ""; } catch { /* 규칙상 없을 수 있음 */ }
    return { uid: u.uid, email, name: u.displayName || email.split("@")[0] || "사용자", photo: u.photoURL || "", role, theme, verified: !!u.emailVerified };
  }

  authM.onAuthStateChanged(auth, async (u) => {
    fbUser = u;
    try {
      current = await syncUser(u);
    } catch (e) {
      console.error(e);
      current = null;
      emitError(e);
    }
    emit();
  });
  authM.getRedirectResult(auth).catch((e) => emitError(e));

  return {
    mode: "firebase",
    get user() { return current; },
    onAuth(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    onAuthError(cb) { errorListeners.add(cb); },
    async signIn() {
      try {
        await authM.signInWithPopup(auth, provider);
      } catch (e) {
        if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") {
          await authM.signInWithRedirect(auth, provider);
          return;
        }
        if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") return;
        throw e;
      }
    },
    async signInEmail(email, pw) { await authM.signInWithEmailAndPassword(auth, email, pw); },
    async signUpEmail(email, pw, name) {
      const cred = await authM.createUserWithEmailAndPassword(auth, email, pw);
      if (name) { await authM.updateProfile(cred.user, { displayName: name }); current = await syncUser(cred.user); emit(); }
      try { await authM.sendEmailVerification(cred.user); } catch { /* 선택 */ }
    },
    async resetPassword(email) { await authM.sendPasswordResetEmail(auth, email); },
    async saveTheme(theme) { if (current) { try { await fs.setDoc(ref("users", current.uid), { theme }, { merge: true }); } catch { /* 선택 기능 */ } } },
    async signOut() { await authM.signOut(auth); },
    async reloadMe() { if (fbUser) { current = await syncUser(fbUser); emit(); } return current; },

    async list(path, opts = {}) {
      const cons = [];
      (opts.where || []).forEach(([f, op, v]) => cons.push(fs.where(f, op, v)));
      if (opts.orderBy) cons.push(fs.orderBy(opts.orderBy[0], opts.orderBy[1] || "asc"));
      if (opts.limit) cons.push(fs.limit(opts.limit));
      const snap = await fs.getDocs(fs.query(col(path), ...cons));
      return snap.docs.map(toObj);
    },
    async get(path, id) {
      const s = await fs.getDoc(ref(path, id));
      return s.exists() ? toObj(s) : null;
    },
    async add(path, data) {
      const r = await fs.addDoc(col(path), { ...data, createdAt: fs.serverTimestamp() });
      return r.id;
    },
    async set(path, id, data, merge = true) { await fs.setDoc(ref(path, id), data, { merge }); },
    async update(path, id, data) { await fs.updateDoc(ref(path, id), data); },
    async remove(path, id) { await fs.deleteDoc(ref(path, id)); },
    now: () => fs.serverTimestamp(),
    inc: (n) => fs.increment(n),

    // ---- 사진 업로드: Supabase Storage (Firebase 로그인 토큰으로 권한 확인) ----
    async upload(file, folder, onProgress) {
      if (!current) throw new Error("로그인이 필요해요.");
      if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type || "")) throw new Error("JPG·PNG·WEBP·GIF 사진만 올릴 수 있어요.");
      if (file.size > UPLOAD_LIMITS.imageMB * 1024 * 1024) throw new Error(`사진은 ${UPLOAD_LIMITS.imageMB}MB 이하만 올릴 수 있어요.`);
      const sb = await supabase();
      const key = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${extOf(file)}`;
      onProgress && onProgress(0.15);
      const { error } = await sb.storage.from(SUPABASE.bucket).upload(key, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
      if (error) throw sbError(error);
      onProgress && onProgress(1);
      const url = sb.storage.from(SUPABASE.bucket).getPublicUrl(key).data.publicUrl;
      return { url, path: "sb:" + key, type: "image", name: file.name || "", size: file.size || 0 };
    },
    async deleteFile(path) {
      if (!path) return;
      try {
        if (path.startsWith("sb:")) {
          const sb = await supabase();
          await sb.storage.from(SUPABASE.bucket).remove([path.slice(3)]);
        } else if (storage) {
          await st.deleteObject(st.ref(storage, path)); // 옛 사이트에서 Firebase Storage 에 올린 파일
        }
      } catch (e) { console.warn("deleteFile", e); }
    },
    // 업로드 권한(관리자 목록)을 Supabase 에도 맞춰 둠 — 운영담당자만 가능
    async syncUploaders(emails) {
      if (!SUPABASE.url || !SUPABASE.anonKey) return { ok: false, reason: "Supabase 미설정" };
      const sb = await supabase();
      const want = new Set(emails.map((e) => String(e).toLowerCase()));
      const { data, error } = await sb.from("astro_admins").select("email");
      if (error) throw sbError(error);
      const have = new Set((data || []).map((r) => r.email));
      const add = [...want].filter((e) => !have.has(e)).map((email) => ({ email }));
      const del = [...have].filter((e) => !want.has(e));
      if (add.length) { const r = await sb.from("astro_admins").upsert(add); if (r.error) throw sbError(r.error); }
      if (del.length) { const r = await sb.from("astro_admins").delete().in("email", del); if (r.error) throw sbError(r.error); }
      return { ok: true, added: add.length, removed: del.length };
    }
  };
}
