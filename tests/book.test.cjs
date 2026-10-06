process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8089";
const admin = require("../functions/node_modules/firebase-admin");
admin.initializeApp({ projectId: "demo-cfi" });
const db = admin.firestore();
const ymd = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const wd = s => (new Date(s + "T12:00:00Z").getUTCDay() + 6) % 7;
const month = day(0).slice(0, 7);
async function user(email) {
  const r = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: "secreto1", returnSecureToken: true }) });
  const tx = await r.text(); let j; try { j = JSON.parse(tx); } catch (e) { throw new Error("auth: " + tx.slice(0, 200)); } return { uid: j.localId, token: j.idToken };
}
const call = async (u, data) => { const r = await fetch("http://127.0.0.1:5011/demo-cfi/europe-west1/book", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + u.token }, body: JSON.stringify({ data }) });
  const j = await r.json(); return j.error ? "ERR: " + j.error.message : JSON.stringify(j.result); };
(async () => {
  const slots = []; for (let d = 0; d < 7; d++) slots.push({ id: "c" + d, d, s: "07:30", e: "08:30", type: "crossfit", cap: 2 }, { id: "o" + d, d, s: "09:30", e: "10:30", type: "open", cap: 10 }, { id: "k" + d, d, s: "18:00", e: "19:00", type: "kids", cap: 10 });
  await db.doc("config/box").set({ plans: [{ id: "p1", classes: 4, open: 4 }, { id: "p0", classes: 0, open: 0 }], openDays: 2, openTime: "21:00", maxPerDay: 2, cancelHours: 2, blockUnpaid: true });
  await db.doc("config/schedule").set({ slots, off: {} });
  const U = {};
  for (const [n, m] of Object.entries({ ana: { planId: "p1", paidUntil: month }, bea: { planId: "p1", paidUntil: month }, eva: { planId: "p1", paidUntil: month }, cris: { planId: "p1", paidUntil: null }, dan: { status: "pending" }, fran: { planId: "p0", paidUntil: month, extra: 1 } })) {
    U[n] = await user(n + "@x.com"); await db.doc("members/" + U[n].uid).set({ role: "athlete", name: n, email: n + "@x.com", status: "active", extra: 0, ...m });
  }
  const T = day(1), F = day(3);
  console.log("ana books tomorrow:", await call(U.ana, { date: T, slotId: "c" + wd(T) }));
  console.log("ana same again:", await call(U.ana, { date: T, slotId: "c" + wd(T) }));
  console.log("bea books:", await call(U.bea, { date: T, slotId: "c" + wd(T) }));
  console.log("eva (full -> wait):", await call(U.eva, { date: T, slotId: "c" + wd(T) }));
  console.log("cris unpaid:", await call(U.cris, { date: T, slotId: "c" + wd(T) }));
  console.log("dan pending:", await call(U.dan, { date: T, slotId: "c" + wd(T) }));
  console.log("ana not open yet:", await call(U.ana, { date: F, slotId: "c" + wd(F) }));
  console.log("ana 2nd same day:", await call(U.ana, { date: T, slotId: "o" + wd(T) }));
  console.log("ana 3rd same day:", await call(U.ana, { date: T, slotId: "k" + wd(T) }));
  console.log("wrong slot day:", await call(U.bea, { date: T, slotId: "c" + ((wd(T) + 1) % 7) }));
  console.log("fran no credit ok:", await call(U.fran, { date: T, slotId: "k" + wd(T) }));
  console.log("fran useCredit:", await call(U.fran, { date: T, slotId: "k" + wd(T), useCredit: true }));
  const bk = (await db.doc(`bookings/${T}__c${wd(T)}__${U.ana.uid}`).get()).data();
  console.log("cutoff stored:", !!bk.cutoff, "startsAt:", bk.startsAt.toDate().toISOString());
  await db.doc(`bookings/${T}__c${wd(T)}__${U.bea.uid}`).delete();
  await new Promise(r => setTimeout(r, 8000));
  console.log("eva after bea cancels:", JSON.stringify((await db.doc(`bookings/${T}__c${wd(T)}__${U.eva.uid}`).get()).data(), ["wait", "promoted"]));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
