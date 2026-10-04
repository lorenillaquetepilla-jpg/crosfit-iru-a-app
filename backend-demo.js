// Modo demostración: mismos métodos que backend-firebase.js, con los datos guardados en este navegador.
import { DEFAULT_BOX, DEFAULT_SCHEDULE } from "./defaults.js";
const KEY = "cfi-demo-v4";

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
  const H = ["Snatch: 5x2 al 75 %\nSnatch pull 3x3\nOverhead squat 3x5", "Clean & jerk: EMOM 10' 1 rep al 70-80 %\nFront squat 4x4", "Power snatch + hang snatch 6x(1+1)\nSnatch balance 3x3"];
  const G = ["Handstand: 5x30\" contra la pared\nKipping pull-ups técnica 5x5\nHollow hold 4x30\"", "Muscle-up: progresiones 10'\nToes to bar 5x8\nRing dips 4x6", "Pistols 4x5 por pierna\nHSPU estrictos 5x3\nL-sit 5x15\""];
  for (let i = 0; i < 7; i++) { const d = ymd(dayOff(-wd(new Date()) + i)); db["wods/" + d] = { ...(db["wods/" + d] || { date: d, title: "", text: "", score: "time" }), date: d,
    tracks: { ...(i % 2 ? { halter: { text: H[i % 3] } } : {}), ...(i === 2 || i === 4 ? { gim: { text: G[i % 3] } } : {}) } }; }
  db["wods/" + today] = { ...db["wods/" + today], date: today, title: "“Caravinagre”", score: "time",
    text: "Por tiempo (cap 15'):\n21-15-9\nThrusters 43/30 kg\nPull-ups\n\nDespués: Back squat 5x5 al 75 %" };
  db["wods/" + ymd(dayOff(-1))] = { ...db["wods/" + ymd(dayOff(-1))], date: ymd(dayOff(-1)), title: "AMRAP 12'", score: "rounds", text: "AMRAP 12':\n10 wall balls 9/6 kg\n10 box jumps\n10 burpees" };
  const classics = [["Fran", "time", "21-15-9\nThrusters 43/30 kg\nPull-ups"], ["Cindy", "rounds", "AMRAP 20':\n5 pull-ups\n10 push-ups\n15 air squats"],
    ["Grace", "time", "30 clean & jerks 61/43 kg por tiempo"], ["Helen", "time", "3 rondas:\n400 m carrera\n21 kettlebell swings 24/16 kg\n12 pull-ups"],
    ["Karen", "time", "150 wall balls 9/6 kg por tiempo"], ["Back squat 5RM", "kg", "Back squat: busca tu 5RM\nDespués: 3x10 zancadas"],
    ["Isabel", "time", "30 snatches 61/43 kg por tiempo"], ["Diane", "time", "21-15-9\nPeso muerto 102/70 kg\nHandstand push-ups"],
    ["Chipper navarro", "time", "50 double unders\n40 wall balls\n30 box jumps\n20 burpees\n10 power cleans 60/40 kg"], ["Murph", "time", "1,6 km carrera\n100 pull-ups\n200 push-ups\n300 squats\n1,6 km carrera\n(con chaleco 9/6 kg)"]];
  classics.forEach(([title, score, text], i) => { const d = ymd(dayOff(-3 - i * 3)); db["wods/" + d] = { date: d, title, score, text, tracks: {} }; });
  db[`results/${ymd(dayOff(-3))}__demo-ana`] = { date: ymd(dayOff(-3)), uid: "demo-ana", name: "Ana Goñi", score: "5:58", value: 358, rx: false, note: "Con banda", at: now, likes: { "u-mikel": true } };
  db[`results/${ymd(dayOff(-3))}__u-mikel`] = { date: ymd(dayOff(-3)), uid: "u-mikel", name: "Mikel Etxeberria", score: "3:41", value: 221, rx: true, note: "", at: now, likes: {} };
  const res = [["u-mikel", "6:42", 402, true], ["u-laura", "7:15", 435, true], ["u-irati", "8:03", 483, false], ["u-iker", "9:20", 560, false]];
  for (const [u, score, value, rx] of res)
    db[`results/${today}__${u}`] = { date: today, uid: u, name: db["members/" + u].name, score, value, rx, note: "", at: now, likes: { "u-laura": true } };
  const sexes = { "demo-ana": "f", "u-mikel": "m", "u-irati": "f", "u-javier": "m", "u-maite": "f", "u-unai": "m", "u-laura": "f", "u-iker": "m" };
  for (const [u, x] of Object.entries(sexes)) db["members/" + u].sex = x;
  let mk = 0;
  const mark = (u, lift, v, ago, extra = {}) => { db["marks/m" + (++mk)] = { uid: u, name: db["members/" + u].name, sex: sexes[u], lift, v, date: ymd(dayOff(-ago)), video: "", note: "", public: true, pr: true,
    at: new Date(dayOff(-ago).getTime() + mk * 1000).toISOString(), likes: {}, ...extra }; };
  mark("demo-ana", "Back squat", 65, 120); mark("demo-ana", "Back squat", 72.5, 60); mark("demo-ana", "Back squat", 80, 8, { note: "¡Por fin los 80!", likes: { "u-laura": true, "u-mikel": true } });
  mark("demo-ana", "Clean", 45, 90); mark("demo-ana", "Clean", 50, 20); mark("demo-ana", "Peso muerto", 95, 40);
  mark("u-laura", "Back squat", 85, 5, { note: "Rozando los 90 💪", likes: { "demo-ana": true } }); mark("u-irati", "Back squat", 70, 15); mark("u-maite", "Back squat", 62.5, 30);
  mark("u-mikel", "Back squat", 140, 3, { note: "PR de la temporada", likes: { "u-iker": true, "u-unai": true, "demo-ana": true } }); mark("u-iker", "Back squat", 125, 12); mark("u-javier", "Back squat", 132.5, 25); mark("u-unai", "Back squat", 118, 40);
  mark("u-mikel", "Snatch", 85, 6); mark("u-iker", "Snatch", 80, 2, { likes: { "u-mikel": true } }); mark("u-laura", "Snatch", 50, 9); mark("demo-ana", "Snatch", 42.5, 11);
  mark("u-mikel", "Clean & jerk", 110, 18); mark("u-laura", "Clean & jerk", 65, 1, { note: "Con split jerk por primera vez" }); mark("u-irati", "Clean", 55, 4);
  mark("u-javier", "Peso muerto", 190, 22); mark("u-mikel", "Peso muerto", 200, 35); mark("u-maite", "Peso muerto", 100, 7);
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
  db["leads/l1"] = { name: "Ainhoa Martínez", phone: "", email: "ainhoa@ejemplo.com", msg: "Nunca he hecho CrossFit, ¿puedo probar?", at: now, done: false };
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
