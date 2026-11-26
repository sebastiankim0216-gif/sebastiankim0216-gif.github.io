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

import { FIREBASE_CONFIG, FIREBASE_SDK_VERSION, ADMIN_EMAILS, ALLOWED_EMAIL_DOMAIN } from "./config.js";

export function isConfigured() {
  return !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
}

export async function createBackend() {
  if (isConfigured()) return createFirebase();
  const { createDemo } = await import("./demo-backend.js");
  return createDemo();
}

const isAdminEmail = (e) => ADMIN_EMAILS.map((s) => s.trim().toLowerCase()).includes(String(e || "").toLowerCase());
const safeName = (n) => String(n || "file").replace(/[^\w.\-가-힣]+/g, "_").slice(-80);

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
  const listeners = new Set();
  const errorListeners = new Set();
  const emit = () => listeners.forEach((cb) => cb(current));
  const emitError = (e) => errorListeners.forEach((cb) => cb(e));

  const col = (path) => fs.collection(db, ...path.split("/"));
  const ref = (path, id) => fs.doc(db, ...path.split("/"), id);
  const toObj = (s) => ({ id: s.id, ...norm(s.data()) });

  async function syncUser(u) {
    if (!u) return null;
    if (ALLOWED_EMAIL_DOMAIN && !String(u.email || "").toLowerCase().endsWith("@" + ALLOWED_EMAIL_DOMAIN.toLowerCase())) {
      await authM.signOut(auth);
      const err = new Error(`@${ALLOWED_EMAIL_DOMAIN} 계정으로만 로그인할 수 있어요.`);
      err.code = "astro/domain";
      throw err;
    }
    const r = ref("users", u.uid);
    const snap = await fs.getDoc(r);
    const profile = {
      email: u.email || "",
      name: u.displayName || (u.email || "").split("@")[0] || "사용자",
      photo: u.photoURL || "",
      lastLoginAt: fs.serverTimestamp()
    };
    let data;
    if (!snap.exists()) {
      data = { ...profile, role: "guest", createdAt: fs.serverTimestamp() };
      await fs.setDoc(r, data);
    } else {
      data = { ...snap.data(), ...profile };
      await fs.updateDoc(r, profile);
    }
    let role = data.role || "guest";
    if (isAdminEmail(u.email) && role !== "admin") {
      await fs.updateDoc(r, { role: "admin" });
      role = "admin";
    }
    return {
      uid: u.uid, email: profile.email, name: profile.name, photo: profile.photo, role,
      realName: data.realName || "", studentNo: data.studentNo || ""
    };
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

    async upload(file, folder, onProgress) {
      if (!storage) {
        const err = new Error("Firebase Storage가 설정되지 않았어요. (config.js 의 storageBucket 확인)");
        err.code = "astro/no-storage";
        throw err;
      }
      if (!current) throw new Error("로그인이 필요해요.");
      const path = `${folder}/${current.uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName(file.name)}`;
      const r = st.ref(storage, path);
      const task = st.uploadBytesResumable(r, file, { contentType: file.type || undefined, cacheControl: "public,max-age=31536000" });
      await new Promise((res, rej) => task.on("state_changed",
        (s) => onProgress && onProgress(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0), rej, res));
      const url = await st.getDownloadURL(r);
      return { url, path, type: (file.type || "").startsWith("video") ? "video" : "image", name: file.name || "", size: file.size || 0 };
    },
    async deleteFile(path) {
      if (!storage || !path) return;
      try { await st.deleteObject(st.ref(storage, path)); } catch (e) { console.warn("deleteFile", e); }
    }
  };
}
