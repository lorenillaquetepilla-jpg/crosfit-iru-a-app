const V = "10.12.2";
const B = `https://www.gstatic.com/firebasejs/${V}`;
const { initializeApp } = await import(`${B}/firebase-app.js`);
const A = await import(`${B}/firebase-auth.js`);
const F = await import(`${B}/firebase-firestore.js`);

export function makeBackend(cfg) {
  const app = initializeApp(cfg);
  const auth = A.getAuth(app);
  let fs;
  try { fs = F.initializeFirestore(app, { localCache: F.persistentLocalCache() }); }
  catch (e) { fs = F.getFirestore(app); }
  const d = p => F.doc(fs, p);
  let fnsP;
  const fns = () => fnsP ||= import(`${B}/firebase-functions.js`).then(M => ({ M, f: M.getFunctions(app, cfg.functionsRegion || "europe-west1") }));
  return {
    demo: false,
    payments: !!cfg.stripe,
    onAuth: cb => A.onAuthStateChanged(auth, u => cb(u ? { uid: u.uid, email: u.email } : null)),
    signIn: (e, p) => A.signInWithEmailAndPassword(auth, e, p),
    signUp: (e, p) => A.createUserWithEmailAndPassword(auth, e, p),
    signOut: () => A.signOut(auth),
    reset: e => A.sendPasswordResetEmail(auth, e),
    get: async p => { const s = await F.getDoc(d(p)); return s.exists() ? s.data() : null; },
    watch: (p, cb, err) => F.onSnapshot(d(p), s => cb(s.exists() ? s.data() : null), err),
    watchQuery: (c, filters, cb, err) =>
      F.onSnapshot(F.query(F.collection(fs, c), ...filters.map(f => F.where(...f))),
        s => { const o = {}; s.forEach(x => o[x.id] = x.data()); cb(o); }, err),
    set: (p, data) => F.setDoc(d(p), data),
    merge: (p, data) => F.setDoc(d(p), data, { merge: true }),
    del: p => F.deleteDoc(d(p)),
    add: (c, data) => F.addDoc(F.collection(fs, c), data).then(r => r.id),
    call: async (name, data) => { const { M, f } = await fns(); return (await M.httpsCallable(f, name)(data)).data; },
    bootstrap: async (uid, member, box) => {
      const b = F.writeBatch(fs);
      b.set(d("members/" + uid), member);
      b.set(d("config/setup"), { by: uid, at: new Date().toISOString() });
      b.set(d("config/box"), box.box);
      b.set(d("config/schedule"), box.schedule);
      await b.commit();
    }
  };
}
