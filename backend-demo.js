// Modo demostración: mismos métodos que backend-firebase.js, con los datos guardados en este navegador.
import { DEFAULT_BOX, DEFAULT_SCHEDULE } from "./defaults.js";
const KEY = "cfi-demo-v1";

const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayOff = n => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
const wd = d => (d.getDay() + 6) % 7;

function seed() {
  const now = new Date().toISOString();
  const month = ymd(new Date()).slice(0, 7);
  const prev = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return ymd(d).slice(0, 7); })();
  const db = {
    "config/setup": { by: "demo-david", at: now },
    "config/box": DEFAULT_BOX,
    "config/schedule": DEFAULT_SCHEDULE
  };
  const people = [
    ["demo-david", "David Chica", "admin", null, month],
    ["demo-ivan", "Iván", "coach", null, month],
    ["demo-ana", "Ana Goñi", "athlete", "p3", month],
    ["u-mikel", "Mikel Etxeberria", "athlete", "ilim", month],
    ["u-irati", "Irati Lasa", "athlete", "p2", month],
    ["u-javier", "Javier Ruiz", "athlete", "p4", prev],
    ["u-maite", "Maite Arregui", "athlete", "p1", month],
    ["u-unai", "Unai Zabala", "athlete", "ilim", prev],
    ["u-laura", "Laura Pérez", "athlete", "p3", month],
    ["u-iker", "Iker Sarasa", "athlete", "open", month],
    ["u-nerea", "Nerea Urdániz", "athlete", null, null]
  ];
  for (const [id, name, role, planId, paid] of people) {
    db["members/" + id] = { name, role, email: name.split(" ")[0].toLowerCase() + "@demo", status: planId || role !== "athlete" ? "active" : "pending",
      planId, paidUntil: paid, joined: ymd(dayOff(-90)), extra: id === "u-maite" ? 10 : 0 };
  }
  const book = (date, slot, uid, attended) => {
    db[`bookings/${date}__${slot.id}__${uid}`] = { date, slotId: slot.id, uid, name: db["members/" + uid].name,
      type: slot.type, s: slot.s, at: new Date(dayOff(-1).getTime() + Math.random() * 1e7).toISOString(), wait: false, ...(attended ? { attended: true } : {}) };
  };
  const regulars = ["demo-ana", "u-mikel", "u-irati", "u-maite", "u-laura", "u-iker"];
  for (let off = -20; off <= 2; off++) {
    const date = ymd(dayOff(off)), d = wd(dayOff(off));
    const slots = DEFAULT_SCHEDULE.slots.filter(s => s.d === d && s.type === "crossfit");
    if (!slots.length) continue;
    regulars.forEach((u, i) => {
      if ((off + i) % 3 === 0 && off !== 0) return;
      const sl = slots[(i + 3) % slots.length];
      book(date, sl, u, off < 0);
    });
    if (off < -12) book(date, slots[0], "u-javier", true);
  }
  const today = ymd(new Date());
  db["wods/" + today] = { title: "“Caravinagre”", score: "time",
    text: "Por tiempo (cap 15'):\n21-15-9\nThrusters 43/30 kg\nPull-ups\n\nDespués: Back squat 5x5 al 75 %" };
  db["wods/" + ymd(dayOff(-1))] = { title: "AMRAP 12'", score: "rounds", text: "AMRAP 12':\n10 wall balls 9/6 kg\n10 box jumps\n10 burpees" };
  const res = [["u-mikel", "6:42", 402, true], ["u-laura", "7:15", 435, true], ["u-irati", "8:03", 483, false], ["u-iker", "9:20", 560, false]];
  for (const [u, score, value, rx] of res)
    db[`results/${today}__${u}`] = { date: today, uid: u, name: db["members/" + u].name, score, value, rx, note: "", at: now, likes: { "u-laura": true } };
  db["prs/demo-ana"] = { items: {
    "Back squat": [{ v: 65, date: ymd(dayOff(-120)) }, { v: 72.5, date: ymd(dayOff(-60)) }, { v: 80, date: ymd(dayOff(-8)) }],
    "Clean": [{ v: 45, date: ymd(dayOff(-90)) }, { v: 50, date: ymd(dayOff(-20)) }],
    "Peso muerto": [{ v: 95, date: ymd(dayOff(-40)) }]
  } };
  const pay = (uid, amount, method, month, plan) => { db["payments/" + Math.random().toString(36).slice(2, 10)] = { uid, name: db["members/" + uid].name, amount, method, month, concept: plan, at: now, by: "demo-david" }; };
  pay("demo-ana", 82, "tarjeta", month, "Pack 3"); pay("u-mikel", 105, "tarjeta", month, "Ilimitada");
  pay("u-irati", 71, "bizum", month, "Pack 2"); pay("u-maite", 59, "efectivo", month, "Pack 1");
  pay("u-laura", 82, "domiciliación", month, "Pack 3"); pay("u-iker", 85, "tarjeta", month, "Ilimitada solo Open");
  pay("u-maite", 110, "bizum", month, "Bono 10 clases");
  db["notices/n1"] = { title: "Sábado: WOD por parejas", body: "Este sábado a las 10:00 hacemos WOD por parejas. ¡Trae a quien quieras!", at: now };
  const prod = (id, name, cat, price, img, colors) => { db["products/" + id] = { name, cat, price, img, colors, at: now, visible: true }; };
  prod("pr1", "Calleras sin magnesio Velites", "Calleras", 50, "demo/calleras.jpg", ["Blanco", "Gris", "Negro", "Rosa", "Verde"]);
  prod("pr2", "Cinturón de halterofilia", "Cinturones", 36, "demo/cinturon.jpg", ["Azul", "Naranja", "Negro", "Rosa"]);
  prod("pr3", "Comba Fire 2.0", "Combas", 40, "demo/comba.jpg", ["Camuflaje", "Negro", "Plata", "Rojo"]);
  prod("pr4", "Tape No Second", "Tape", 3.5, "demo/tape.jpg", ["Azul", "Negro", "Rosa", "Verde"]);
  db["leads/l1"] = { name: "Ainhoa Martínez", phone: "600 000 000", email: "ainhoa@ejemplo.com", msg: "Nunca he hecho CrossFit, ¿puedo probar?", at: now, done: false };
  return db;
}

let data;
try { data = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { data = null; }
if (!data) data = seed();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} };
const clone = v => v == null ? null : JSON.parse(JSON.stringify(v));

const listeners = new Set();
function notify() { save(); for (const l of [...listeners]) l(); }

function deepMerge(a, b) {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === "object" && !Array.isArray(v) ? deepMerge(out[k], v) : v;
  return out;
}
function match(doc, [f, op, v]) {
  const x = doc[f];
  return op === "==" ? x === v : op === ">=" ? x >= v : op === "<=" ? x <= v : op === "!=" ? x !== v : op === "<" ? x < v : true;
}

const USERS = { "david@demo": "demo-david", "ivan@demo": "demo-ivan", "ana@demo": "demo-ana" };
let authUser = null; try { authUser = JSON.parse(sessionStorage.getItem("cfi-demo-user") || "null"); } catch (e) {}
const authCbs = new Set();
function setUser(u) { authUser = u; try { sessionStorage.setItem("cfi-demo-user", JSON.stringify(u)); } catch (e) {} for (const c of authCbs) c(u); }
const err = code => Object.assign(new Error(code), { code });

export default {
  demo: true,
  payments: true,
  reseed() { data = seed(); notify(); },
  onAuth(cb) { authCbs.add(cb); setTimeout(() => cb(authUser), 0); return () => authCbs.delete(cb); },
  async signIn(email, pw) {
    email = email.trim().toLowerCase();
    const uid = USERS[email] || data[`_users/${email}`]?.uid;
    if (!uid || (USERS[email] ? pw !== "demo" : data[`_users/${email}`].pw !== pw)) throw err("auth/invalid-credential");
    setUser({ uid, email });
  },
  async signUp(email, pw) {
    email = email.trim().toLowerCase();
    if (USERS[email] || data[`_users/${email}`]) throw err("auth/email-already-in-use");
    if (pw.length < 6) throw err("auth/weak-password");
    const uid = "u-" + Math.random().toString(36).slice(2, 10);
    data[`_users/${email}`] = { uid, pw }; save(); setUser({ uid, email });
  },
  async signOut() { setUser(null); },
  async reset() {},
  async get(p) { return clone(data[p]); },
  watch(p, cb) { let last; const l = () => { const v = JSON.stringify(data[p] ?? null); if (v !== last) { last = v; cb(clone(data[p])); } }; listeners.add(l); setTimeout(l, 0); return () => listeners.delete(l); },
  watchQuery(c, filters, cb) {
    let last;
    const l = () => {
      const o = {};
      for (const [k, v] of Object.entries(data)) {
        const i = k.indexOf("/"); if (k.slice(0, i) !== c || k.indexOf("/", i + 1) !== -1) continue;
        if (filters.every(f => match(v, f))) o[k.slice(i + 1)] = clone(v);
      }
      const s = JSON.stringify(o); if (s !== last) { last = s; cb(o); }
    };
    listeners.add(l); setTimeout(l, 0); return () => listeners.delete(l);
  },
  async set(p, v) { data[p] = clone(v); notify(); },
  async merge(p, v) { data[p] = deepMerge(data[p], clone(v)); notify(); },
  async del(p) { delete data[p]; notify(); },
  async add(c, v) { const id = Math.random().toString(36).slice(2, 12); data[`${c}/${id}`] = clone(v); notify(); return id; },
  // En la demo el pago se simula: se apunta como si Stripe lo hubiera confirmado.
  async call(name, { kind, id, period } = {}) {
    if (name !== "checkout") return { url: null };
    const uid = authUser?.uid, m = data["members/" + uid], box = data["config/box"];
    const month = ymd(new Date()).slice(0, 7);
    if (kind === "plan") {
      const p = box.plans.find(x => x.id === id), months = period === "year" ? 12 : period === "semester" ? 6 : 1;
      const disc = months === 12 ? box.discounts.year : months === 6 ? box.discounts.semester : 0;
      const until = new Date(); until.setDate(1); until.setMonth(until.getMonth() + months - 1);
      data["members/" + uid] = { ...m, planId: id, status: "active", paidUntil: ymd(until).slice(0, 7) };
      await this.add("payments", { uid, name: m.name, amount: Math.round(p.price * months * (100 - disc)) / 100, method: "tarjeta", month, concept: p.name, at: new Date().toISOString(), by: "stripe" });
    } else {
      const x = box.passes.find(x => x.id === id);
      data["members/" + uid] = { ...m, extra: (m.extra || 0) + x.credits };
      await this.add("payments", { uid, name: m.name, amount: x.price, method: "tarjeta", month, concept: x.name, at: new Date().toISOString(), by: "stripe" });
    }
    notify();
    return { demo: true };
  },
  async bootstrap(uid, member, box) { data["members/" + uid] = member; data["config/setup"] = { by: uid }; data["config/box"] = box.box; data["config/schedule"] = box.schedule; notify(); }
};
