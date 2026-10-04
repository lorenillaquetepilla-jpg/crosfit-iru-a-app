import CONFIG from "./firebase-config.js";
import { DEFAULT_BOX, DEFAULT_SCHEDULE, CLASS_TYPES, LIFTS } from "./defaults.js";

const DEMO = !CONFIG || !CONFIG.apiKey || CONFIG.apiKey.startsWith("PEGA");
const be = DEMO ? (await import("./backend-demo.js")).default
                : (await import("./backend-firebase.js")).makeBackend(CONFIG);

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const parse = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d, 12); };
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate()+n); return ymd(d); };
const wdOf = s => (parse(s).getDay()+6) % 7;
const monthOf = s => s.slice(0,7);
const thisMonth = () => monthOf(today());
const addMonths = (m, n) => { const [y,mm] = m.split("-").map(Number); const d = new Date(y, mm-1+n, 1); return ymd(d).slice(0,7); };
const DAYS = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const DAYS_L = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const MONTHS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const monthName = m => MONTHS[Number(m.slice(5,7))-1];
const fmtDay = s => `${DAYS_L[wdOf(s)]} ${parse(s).getDate()} de ${MONTHS[parse(s).getMonth()]}`;
const fmtShort = s => `${parse(s).getDate()} ${MONTHS[parse(s).getMonth()].slice(0,3)}`;
const money = n => (Math.round(n*100)/100).toLocaleString("es-ES", {minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2}) + " €";
const initials = n => String(n || "?").split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0].toUpperCase()).join("");
const typeOf = id => CLASS_TYPES.find(t => t.id === id) || CLASS_TYPES[0];
const isOpenType = id => id === "open";
const startsAt = (date, s) => { const d = parse(date); const [h,m] = s.split(":").map(Number); d.setHours(h, m, 0, 0); return d; };
const firstName = n => String(n || "").split(" ")[0];
let toastT;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3200); }
function fail(e) { console.error(e); toast(e?.code === "permission-denied" ? "No tienes permiso para hacer eso." : "No se ha podido guardar. Revisa la conexión e inténtalo otra vez."); }
async function safe(fn) { try { return await fn(); } catch (e) { fail(e); } }

const dlg = $("#dlg");
function openDlg(html, bind) {
  $("#dlgBody").innerHTML = html;
  if (!dlg.open) dlg.showModal();
  bind?.($("#dlgBody"));
}
function closeDlg() { if (dlg.open) dlg.close(); }
dlg.addEventListener("close", () => { if (pendingRefresh) { pendingRefresh = false; refresh(); } });
dlg.addEventListener("click", e => { if (e.target === dlg) closeDlg(); });
function confirmDlg(title, text, okLabel = "Sí") {
  return new Promise(res => {
    let done = false;
    const finish = v => { if (!done) { done = true; dlg.removeEventListener("close", onClose); closeDlg(); res(v); } };
    const onClose = () => finish(false);
    openDlg(`<h3>${esc(title)}</h3><p>${text}</p><div class="dlgbtns"><button class="btn" data-no>No</button><button class="btn primary" data-ok>${esc(okLabel)}</button></div>`, b => {
      b.querySelector("[data-no]").onclick = () => finish(false);
      b.querySelector("[data-ok]").onclick = () => finish(true);
    });
    dlg.addEventListener("close", onClose);
  });
}

/* ---------- Caravinagre ---------- */
const CARA = `<svg viewBox="0 0 64 64" aria-hidden="true">
  <path d="M10 23c2-10 12-15 22-15s20 5 22 15c-7-3-15-4-22-4s-15 1-22 4z" fill="#1B0D10"/>
  <path d="M6 24c8-4 17-5 26-5s18 1 26 5c-1 2-3 3-5 3-6-2-14-3-21-3s-15 1-21 3c-2 0-4-1-5-3z" fill="#2A1418"/>
  <circle cx="32" cy="15" r="2.6" fill="#C8102E"/>
  <ellipse cx="32" cy="38" rx="17" ry="16" fill="#F1C7A1"/>
  <path d="M20 31l8 2.5M44 31l-8 2.5" stroke="#1B0D10" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="26" cy="36" r="2" fill="#1B0D10"/><circle cx="38" cy="36" r="2" fill="#1B0D10"/>
  <path d="M32 35c-3 4-4 8-2 10 1 1 3 1 4 0" fill="#E3A47F" stroke="#B9765A" stroke-width="1.2"/>
  <circle cx="21" cy="43" r="3.4" fill="#E58A7E" opacity=".7"/><circle cx="43" cy="43" r="3.4" fill="#E58A7E" opacity=".7"/>
  <path d="M26 49c4-2.5 8-2.5 12 0" stroke="#1B0D10" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M17 52c5 3 10 4 15 4s10-1 15-4l-15 11z" fill="#C8102E"/>
</svg>`;
const cara = (title, text) => `<div class="cara">${CARA}<div class="bubble"><span class="bt">${esc(title)}</span>${text}</div></div>`;

/* ---------- icons ---------- */
const I = {
  hoy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  clases: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  wod: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12"/></svg>',
  marcas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19l5-6 4 3 7-9"/><path d="M15 7h5v5"/></svg>',
  tienda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16l-1 12H5z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  cuota: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/></svg>',
  socios: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.6 3.5 5.2"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'
};

/* ---------- state ---------- */
const S = { user: null, me: null, box: null, sched: null, tab: null, myBookings: {}, extraUsed: 0 };
let globalSubs = [], viewSubs = [], pendingRefresh = false, view = null;
const isStaff = () => ["admin","coach"].includes(S.me?.role);
const isAdmin = () => S.me?.role === "admin";
const plans = () => S.box?.plans || [];
const planOf = id => plans().find(p => p.id === id);
const paidFor = (m, month = thisMonth()) => !!m?.paidUntil && m.paidUntil >= month;
function clearView() { for (const u of viewSubs) try { u(); } catch (e) {} viewSubs = []; }
function clearAll() { clearView(); for (const u of globalSubs) try { u(); } catch (e) {} globalSubs = []; }
const watchV = (p, cb) => viewSubs.push(be.watch(p, cb, fail));
const queryV = (c, f, cb) => viewSubs.push(be.watchQuery(c, f, cb, fail));

function refresh() {
  if (dlg.open) { pendingRefresh = true; return; }
  const a = document.activeElement;
  if (a && $("#main").contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { pendingRefresh = true; a.addEventListener("blur", () => { if (pendingRefresh) { pendingRefresh = false; refresh(); } }, { once: true }); return; }
  view?.draw?.();
}

/* ---------- auth ---------- */
function renderWho() {
  const w = $("#who");
  if (!S.user) { w.innerHTML = DEMO ? '<span class="demo-tag">DEMO</span>' : ""; return; }
  w.innerHTML = `${DEMO ? '<span class="demo-tag">DEMO</span><br>' : ""}${esc(S.me?.name || S.user.email)}<br><button id="out">Salir</button>`;
  $("#out").onclick = () => be.signOut();
}

be.onAuth(async u => {
  clearAll(); closeDlg();
  S.user = u; S.me = null; S.box = null; S.sched = null; S.tab = null; S.myBookings = {}; view = null; membersCache = null; started = false;
  renderWho(); $("#nav").hidden = true;
  if (!u) return renderLogin();
  $("#main").innerHTML = '<p class="empty">Cargando…</p>';
  let ready = { me: false, box: false, sched: false };
  const go1 = () => { if (ready.me && ready.box && ready.sched) start(); };
  globalSubs.push(be.watch("members/" + u.uid, m => { S.me = m; ready.me = true; renderWho(); if (view) { renderNav(); refresh(); } go1(); }, e => { ready.me = true; go1(); }));
  globalSubs.push(be.watch("config/box", b => { S.box = { ...DEFAULT_BOX, ...(b || {}) }; ready.box = true; if (view) refresh(); go1(); }, e => { S.box = DEFAULT_BOX; ready.box = true; go1(); }));
  globalSubs.push(be.watch("config/schedule", s => { S.sched = s || { slots: [], off: {} }; ready.sched = true; if (view) refresh(); go1(); }, e => { S.sched = { slots: [], off: {} }; ready.sched = true; go1(); }));
});

let started = false;
async function start() {
  if (!S.me) { started = false; return renderJoin(); }
  if (started && view) return;
  started = true;
  globalSubs.push(be.watchQuery("bookings", [["uid","==",S.user.uid]], o => { S.myBookings = o; if (view) refresh(); }, fail));
  const params = new URLSearchParams(location.search);
  if (params.get("pago") === "ok") { toast("¡Pago recibido! Tu cuota se actualiza en unos segundos."); history.replaceState(null, "", location.pathname); }
  if (params.get("pago") === "no") { toast("El pago no se ha completado."); history.replaceState(null, "", location.pathname); }
  renderNav();
  go(S.tab && tabs().some(t => t.id === S.tab) ? S.tab : "hoy");
}

function renderLogin(mode = "in") {
  started = false;
  const m = $("#main");
  m.innerHTML = `<div class="auth">
    ${cara("¡Aupa!", "Entra para reservar tus clases, ver el WOD y apuntar tus marcas.")}
    <div class="card">
      <div class="tabs2"><button data-m="in" aria-pressed="${mode === "in"}">Entrar</button><button data-m="up" aria-pressed="${mode === "up"}">Crear cuenta</button></div>
      <form id="af">
        ${mode === "up" ? '<label>Nombre y apellidos<input id="aName" required autocomplete="name"></label>' : ""}
        <label>Correo electrónico<input id="aEmail" type="email" required autocomplete="email"></label>
        <label>Contraseña<input id="aPw" type="password" required minlength="6" autocomplete="${mode === "up" ? "new-password" : "current-password"}"></label>
        <div class="err" id="aErr"></div>
        <button class="btn primary block" type="submit">${mode === "up" ? "Crear cuenta" : "Entrar"}</button>
        ${mode === "in" ? '<button class="btn ghost block" type="button" id="aReset">He olvidado la contraseña</button>' : ""}
      </form>
      ${DEMO ? `<hr><p class="small muted">Modo demostración. Prueba con <b>ana@demo</b> (atleta), <b>ivan@demo</b> (coach) o <b>david@demo</b> (dueño). Contraseña: <b>demo</b>.</p>
        <div class="row"><button class="btn sm" data-demo="ana@demo">Entrar como Ana</button><button class="btn sm" data-demo="ivan@demo">Como Iván</button><button class="btn sm" data-demo="david@demo">Como David</button></div>` : ""}
    </div>
    <div class="card"><h3>¿Quieres probar?</h3><p class="muted small">Déjanos tu correo y te escribimos para tu clase de prueba gratis.</p>
      <button class="btn block" id="trial">Pedir clase de prueba</button></div>
  </div>`;
  m.querySelectorAll("[data-m]").forEach(b => b.onclick = () => renderLogin(b.dataset.m));
  m.querySelectorAll("[data-demo]").forEach(b => b.onclick = () => be.signIn(b.dataset.demo, "demo"));
  $("#trial").onclick = trialForm;
  $("#aReset")?.addEventListener("click", async () => {
    const e = $("#aEmail").value.trim(); if (!e) { $("#aErr").textContent = "Escribe tu correo y vuelve a pulsar."; return; }
    try { await be.reset(e); $("#aErr").textContent = "Te hemos enviado un correo para cambiar la contraseña."; } catch (x) { $("#aErr").textContent = "No se ha podido enviar el correo."; }
  });
  $("#af").onsubmit = async ev => {
    ev.preventDefault();
    const email = $("#aEmail").value.trim(), pw = $("#aPw").value;
    $("#aErr").textContent = "";
    try {
      if (mode === "up") { sessionStorage.setItem("cfi-name", $("#aName").value.trim()); await be.signUp(email, pw); }
      else await be.signIn(email, pw);
    } catch (e) {
      const c = e.code || "";
      $("#aErr").textContent = c.includes("invalid") || c.includes("wrong") || c.includes("not-found") ? "Correo o contraseña incorrectos."
        : c.includes("in-use") ? "Ya hay una cuenta con ese correo. Pulsa «Entrar»." : c.includes("weak") ? "La contraseña debe tener al menos 6 caracteres." : "No se ha podido entrar. Revisa la conexión.";
    }
  };
}

function trialForm() {
  openDlg(`<h3>Clase de prueba</h3><p class="muted small">Gratis y sin compromiso. Te escribimos por correo para elegir el día.</p>
    <form id="tf"><label>Nombre<input id="tN" required maxlength="80"></label>
    <label>Correo electrónico<input id="tE" type="email" required maxlength="120" autocomplete="email"></label>
    <label>¿Algo que debamos saber? (opcional)<textarea id="tM" maxlength="500" style="min-height:70px"></textarea></label>
    <div class="err" id="tErr"></div>
    <div class="dlgbtns"><button type="button" class="btn" id="tC">Cancelar</button><button class="btn primary">Enviar</button></div></form>`, b => {
    $("#tC").onclick = closeDlg;
    $("#tf").onsubmit = async ev => {
      ev.preventDefault();
      try {
        await be.add("leads", { name: $("#tN").value.trim(), phone: "", email: $("#tE").value.trim(), msg: $("#tM").value.trim(), at: new Date().toISOString(), done: false });
        closeDlg(); toast("¡Recibido! Te escribiremos al correo muy pronto.");
      } catch (e) { $("#tErr").textContent = "No se ha podido enviar. Inténtalo otra vez."; }
    };
  });
}

async function renderJoin() {
  const setup = await be.get("config/setup").catch(() => ({}));
  const name = sessionStorage.getItem("cfi-name") || "";
  const m = $("#main");
  if (!setup) {
    m.innerHTML = `<div class="auth"><div class="card"><h3>Configurar el box</h3>
      <p>Esta es la primera cuenta de la app. Si eres el dueño del box, pulsa el botón: tu cuenta quedará como administradora y se cargarán las tarifas y el horario de ejemplo, que luego puedes cambiar.</p>
      <label>Tu nombre<input id="jN" value="${esc(name)}" required></label>
      <button class="btn primary block" id="boot" style="margin-top:12px">Configurar CrossFit Iruña</button></div></div>`;
    $("#boot").onclick = () => safe(() => be.bootstrap(S.user.uid,
      { role: "admin", name: $("#jN").value.trim() || "Dueño", email: S.user.email, status: "active", joined: today() },
      { box: DEFAULT_BOX, schedule: DEFAULT_SCHEDULE }));
    return;
  }
  m.innerHTML = `<div class="auth">${cara("¡Bienvenido al box!", "Completa tus datos. El box revisará tu alta y te asignará tu tarifa.")}
    <div class="card"><form id="jf"><label>Nombre y apellidos<input id="jN" value="${esc(name)}" required maxlength="80"></label>
    <label>Teléfono<input id="jP" type="tel" maxlength="20"></label>
    <button class="btn primary block" style="margin-top:12px">Entrar al box</button></form></div></div>`;
  $("#jf").onsubmit = ev => { ev.preventDefault(); safe(() => be.set("members/" + S.user.uid,
    { role: "athlete", name: $("#jN").value.trim(), phone: $("#jP").value.trim(), email: S.user.email, status: "pending", planId: null, paidUntil: null, extra: 0, joined: today() })); };
}

/* ---------- navigation ---------- */
function tabs() {
  if (isAdmin()) return [["hoy","Hoy"],["clases","Clases"],["wod","WOD"],["socios","Socios"],["box","Box"]].map(([id,l]) => ({id,l}));
  if (isStaff()) return [["hoy","Hoy"],["clases","Clases"],["wod","WOD"],["socios","Socios"],["tienda","Tienda"]].map(([id,l]) => ({id,l}));
  return [["hoy","Hoy"],["clases","Clases"],["marcas","Mi panel"],["tienda","Tienda"],["cuota","Cuota"]].map(([id,l]) => ({id,l}));
}
function renderNav() {
  const n = $("#nav"); n.hidden = false;
  n.innerHTML = `<div class="in">${tabs().map(t => `<button data-t="${t.id}" ${S.tab === t.id ? 'aria-current="page"' : ""}>${I[t.id]}<span>${t.l}</span></button>`).join("")}</div>`;
  n.querySelectorAll("[data-t]").forEach(b => b.onclick = () => go(b.dataset.t));
}
const VIEWS = {};
function go(tab) {
  clearView(); S.tab = tab; renderNav(); if (tab !== "wod") wodCopy = null;
  window.scrollTo(0, 0);
  if (S.me?.status === "baja" && !isStaff()) { view = null; $("#main").innerHTML = cara("Te echamos de menos", "Tu cuenta está dada de baja. Habla con el box si quieres volver."); return; }
  view = VIEWS[tab]($("#main"));
  view?.draw?.();
}

/* ---------- classes and bookings ---------- */
function slotsFor(date) {
  return (S.sched?.slots || []).filter(s => s.d === wdOf(date)).sort((a, b) => a.s.localeCompare(b.s) || a.e.localeCompare(b.e));
}
const isOff = (date, slot) => !!(S.sched?.off?.[date] || S.sched?.off?.[`${date}__${slot.id}`]);
function splitList(bookings, slot) {
  const all = Object.entries(bookings).filter(([, b]) => b.slotId === slot.id).map(([id, b]) => ({ id, ...b }))
    .sort((a, b) => (a.wait === b.wait ? 0 : a.wait ? 1 : -1) || a.at.localeCompare(b.at));
  const cap = slot.cap || 99;
  return { inn: all.filter(b => !b.wait).slice(0, cap), wait: [...all.filter(b => !b.wait).slice(cap), ...all.filter(b => b.wait)] };
}
function usage(month = thisMonth(), me = S.me, mine = S.myBookings) {
  let cls = 0, open = 0, credit = 0;
  for (const b of Object.values(mine)) {
    if (b.credit) { credit++; continue; }
    if (b.wait || monthOf(b.date) !== month) continue;
    if (isOpenType(b.type)) open++; else cls++;
  }
  const p = planOf(me?.planId);
  return { cls, open, plan: p, clsMax: p ? p.classes : 0, openMax: p ? p.open : 0, extraLeft: Math.max(0, (me?.extra || 0) - credit) };
}
const limitTxt = (used, max) => max == null ? `${used} · ilimitadas` : `${used} de ${max}`;

async function book(date, slot, list) {
  const me = S.me;
  if (me.status !== "active") return toast("Tu alta está pendiente. El box tiene que asignarte una tarifa.");
  if (!isOpenToBook(date)) return toast(`Las reservas de esta clase se abren el ${fmtDay(ymd(opensAt(date))).toLowerCase()} a las ${S.box.openTime || "21:00"}.`);
  const month = monthOf(date);
  const u = usage(month);
  const max = isOpenType(slot.type) ? u.openMax : u.clsMax;
  const used = isOpenType(slot.type) ? u.open : u.cls;
  let credit = false;
  if (max != null && used >= max) {
    if (u.extraLeft > 0) {
      if (!await confirmDlg("Usar tu bono", `Ya has usado las ${isOpenType(slot.type) ? "sesiones Open" : "clases"} de tu tarifa este mes. ¿Usamos 1 clase de tu bono? Te quedan ${u.extraLeft}.`, "Usar bono")) return;
      credit = true;
    } else return toast(`Has gastado tus ${isOpenType(slot.type) ? "Open" : "clases"} de ${monthName(month)}. Compra un bono en Cuota.`);
  } else if (u.plan && S.box.blockUnpaid !== false && !paidFor(me, month)) {
    return toast(`Tu cuota de ${monthName(month)} está pendiente. Págala en Cuota para reservar.`);
  }
  const full = list.inn.length >= (slot.cap || 99);
  if (full && !await confirmDlg("Clase llena", "Esta clase está completa. ¿Te apunto a la lista de espera? Si alguien cancela, entras tú automáticamente.", "Apuntarme")) return;
  await safe(() => be.set(`bookings/${date}__${slot.id}__${S.user.uid}`, { date, slotId: slot.id, uid: S.user.uid, name: me.name, type: slot.type, s: slot.s, at: new Date().toISOString(), wait: full, credit }));
  toast(full ? "Estás en lista de espera." : "¡Reservado! Nos vemos en el box.");
}
async function cancelBooking(date, slot, bookingId, list, byStaff = false) {
  if (!byStaff) {
    const limit = startsAt(date, slot.s).getTime() - (S.box.cancelHours ?? 2) * 3600e3;
    if (Date.now() > limit) return toast(`Solo se puede cancelar hasta ${S.box.cancelHours ?? 2} h antes. Avisa al coach.`);
    if (!await confirmDlg("Cancelar reserva", `¿Cancelas tu plaza de las ${slot.s}?`, "Cancelar plaza")) return;
  }
  const wasIn = list.inn.some(b => b.id === bookingId);
  await safe(async () => {
    await be.del("bookings/" + bookingId);
    // Free spot: the first person waiting moves into the class.
    const next = list.wait[0];
    if (wasIn && next && next.wait) await be.merge("bookings/" + next.id, { wait: false });
  });
  toast("Reserva cancelada.");
}

// A class on day D can be booked from (D - openDays) at openTime.
function opensAt(date) { const d = startsAt(addDays(date, -(S.box.openDays ?? 2)), S.box.openTime || "21:00"); return d; }
const isOpenToBook = date => Date.now() >= opensAt(date).getTime();
const opensTxt = date => { const o = opensAt(date); return `Abre ${DAYS[(o.getDay() + 6) % 7].toLowerCase()} ${S.box.openTime || "21:00"}`; };
function slotRow(date, slot, bookings, { staff = false } = {}) {
  const list = splitList(bookings, slot), t = typeOf(slot.type), cap = slot.cap || 99;
  const mine = Object.entries(bookings).find(([, b]) => b.slotId === slot.id && b.uid === S.user.uid);
  const myWait = mine && list.wait.some(b => b.id === mine[0]);
  const past = startsAt(date, slot.e).getTime() < Date.now();
  const off = isOff(date, slot);
  const full = list.inn.length >= cap;
  let action = "";
  if (!staff) {
    if (off) action = '<span class="chip bad">Cancelada</span>';
    else if (mine) action = `<button class="btn sm ${myWait ? "" : "primary"}" data-cancel="${slot.id}">${myWait ? `En espera ${list.wait.findIndex(b => b.id === mine[0]) + 1}º · Salir` : "✓ Reservado"}</button>`;
    else if (!past && !isOpenToBook(date)) action = `<span class="chip grey">${opensTxt(date)}</span>`;
    else if (!past) action = `<button class="btn sm" data-book="${slot.id}">${full ? "Lista de espera" : "Reservar"}</button>`;
  } else {
    action = `<button class="btn sm" data-manage="${slot.id}">Gestionar</button>`;
  }
  const people = staff || isOpenType(slot.type) || true ? `<div class="people">${list.inn.map(b => `<${staff ? "button" : "span"} class="person ${b.attended ? "here" : ""}" ${staff ? `data-att="${b.id}" title="Marcar asistencia"` : ""}><span class="av">${initials(b.name)}</span>${esc(firstName(b.name))}</${staff ? "button" : "span"}>`).join("")}${list.wait.map(b => `<span class="person wait"><span class="av">${initials(b.name)}</span>${esc(firstName(b.name))}</span>`).join("")}</div>` : "";
  return `<div class="slot ${past ? "past" : ""} ${off ? "off" : ""}">
    <div class="bar" style="background:${t.c}"></div>
    <div class="time">${slot.s}<small>${slot.e}</small></div>
    <div class="info"><b>${esc(t.name)}</b> <span class="small muted">${list.inn.length}/${cap}${list.wait.length ? ` · ${list.wait.length} en espera` : ""}</span>
      <div class="fill ${full ? "full" : ""}"><i style="width:${Math.min(100, list.inn.length / cap * 100)}%"></i></div>
      ${(staff || mine) && (list.inn.length || list.wait.length) ? people : ""}
    </div>
    <div>${action}</div></div>`;
}
function bindSlots(root, date, bookings, slots) {
  const find = id => slots.find(s => s.id === id);
  root.querySelectorAll("[data-book]").forEach(b => b.onclick = () => { const s = find(b.dataset.book); book(date, s, splitList(bookings, s)); });
  root.querySelectorAll("[data-cancel]").forEach(b => b.onclick = () => { const s = find(b.dataset.cancel); const id = `${date}__${s.id}__${S.user.uid}`; cancelBooking(date, s, id, splitList(bookings, s)); });
  root.querySelectorAll("[data-att]").forEach(b => b.onclick = () => { const bk = bookings[b.dataset.att]; safe(() => be.merge("bookings/" + b.dataset.att, { attended: !bk.attended })); });
  root.querySelectorAll("[data-manage]").forEach(b => b.onclick = () => manageSlot(date, find(b.dataset.manage), bookings));
}

let membersCache = null;
function manageSlot(date, slot, bookings) {
  const draw = () => {
    const list = splitList(bookings, slot), off = isOff(date, slot);
    openDlg(`<h3>${esc(typeOf(slot.type).name)} · ${slot.s}</h3><p class="muted small">${fmtDay(date)} · ${list.inn.length}/${slot.cap} plazas</p>
      <div class="list">${list.inn.map(b => `<div class="li"><span class="av">${initials(b.name)}</span><span class="grow t">${esc(b.name)}${b.credit ? ' <span class="chip grey">bono</span>' : ""}</span>
        <button class="btn sm ${b.attended ? "primary" : ""}" data-att="${b.id}">${b.attended ? "✓ Ha venido" : "¿Ha venido?"}</button><button class="btn sm danger" data-rm="${b.id}" aria-label="Quitar">✕</button></div>`).join("") || '<p class="empty">Nadie apuntado todavía.</p>'}</div>
      ${list.wait.length ? `<h4 style="margin-top:12px">Lista de espera</h4><div class="list">${list.wait.map((b, i) => `<div class="li"><span class="av">${i + 1}º</span><span class="grow">${esc(b.name)}</span><button class="btn sm danger" data-rm="${b.id}">✕</button></div>`).join("")}</div>` : ""}
      <label>Apuntar a un socio</label><div class="row"><select id="addM" class="grow"><option value="">Elige un socio…</option>${Object.entries(membersCache || {}).filter(([, m]) => m.status === "active" && m.role === "athlete").sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([id, m]) => `<option value="${id}">${esc(m.name)}</option>`).join("")}</select><button class="btn" id="addB">Apuntar</button></div>
      <div class="dlgbtns"><button class="btn ${off ? "" : "danger"}" id="offB">${off ? "Volver a abrir la clase" : "Cancelar esta clase"}</button><button class="btn primary" id="cl">Cerrar</button></div>`, b => {
      $("#cl").onclick = closeDlg;
      b.querySelectorAll("[data-att]").forEach(x => x.onclick = async () => { const bk = bookings[x.dataset.att]; await safe(() => be.merge("bookings/" + x.dataset.att, { attended: !bk.attended })); bk.attended = !bk.attended; draw(); });
      b.querySelectorAll("[data-rm]").forEach(x => x.onclick = async () => { await cancelBooking(date, slot, x.dataset.rm, list, true); delete bookings[x.dataset.rm]; const nx = list.wait[0]; if (nx && bookings[nx.id]) bookings[nx.id].wait = false; draw(); });
      $("#addB").onclick = async () => {
        const id = $("#addM").value; if (!id) return; const m = membersCache[id];
        const full = list.inn.length >= slot.cap;
        const doc = { date, slotId: slot.id, uid: id, name: m.name, type: slot.type, s: slot.s, at: new Date().toISOString(), wait: full, credit: false };
        await safe(() => be.set(`bookings/${date}__${slot.id}__${id}`, doc)); bookings[`${date}__${slot.id}__${id}`] = doc; draw();
      };
      $("#offB").onclick = async () => { await safe(() => be.merge("config/schedule", { off: { [`${date}__${slot.id}`]: !off } })); closeDlg(); toast(off ? "Clase abierta de nuevo." : "Clase cancelada. Los socios la verán tachada."); };
    });
  };
  if (!membersCache && isStaff()) be.watchQuery("members", [], o => { membersCache = o; }, () => {});
  draw();
}

function dayPicker(sel, from, n, onPick) {
  let h = '<div class="seg" role="group" aria-label="Día">';
  for (let i = 0; i < n; i++) {
    const d = addDays(from, i);
    h += `<button data-day="${d}" aria-pressed="${d === sel}"><span>${i === 0 && from === today() ? "Hoy" : DAYS[wdOf(d)]}</span><b>${parse(d).getDate()}</b></button>`;
  }
  return h + "</div>";
}
const bindDays = (root, cb) => root.querySelectorAll("[data-day]").forEach(b => b.onclick = () => cb(b.dataset.day));

/* ---------- WOD and results ---------- */
const SCORE = { time: "Tiempo (mm:ss)", rounds: "Rondas + reps", reps: "Repeticiones", kg: "Kilos", none: "Sin marca" };
function scoreValue(type, txt) {
  txt = String(txt).trim().replace(",", ".");
  if (type === "time") { const p = txt.split(":").map(Number); if (p.some(isNaN)) return null; return p.length === 2 ? p[0] * 60 + p[1] : p[0] * 60; }
  if (type === "rounds") { const [r, x] = txt.split("+").map(Number); if (isNaN(r)) return null; return r * 1000 + (x || 0); }
  const v = parseFloat(txt); return isNaN(v) ? null : v;
}
function ranking(results, type) {
  return Object.entries(results).map(([id, r]) => ({ id, ...r })).sort((a, b) => (b.rx ? 1 : 0) - (a.rx ? 1 : 0) || (type === "time" ? a.value - b.value : b.value - a.value));
}
function trackCards(wod) {
  return TRACKS.filter(t => t.id !== "crossfit" && wod?.tracks?.[t.id]?.text).map(t => `<div class="card track"><div class="k" style="color:${typeOf(t.id).c}">${esc(t.name)}</div><div class="pre">${esc(wod.tracks[t.id].text)}</div></div>`).join("");
}
function wodCard(date, wod) {
  if (wod && !wod.text) return trackCards(wod) || wodCard(date, null);
  if (!wod) return `<div class="card">${cara("Sin WOD todavía", isStaff() ? "Publica el WOD de este día en la pestaña WOD." : "Los coaches aún no han publicado el WOD. ¡Paciencia!")}<button class="btn sm" data-hist>📚 Ver WODs anteriores</button></div>`;
  return `<div class="wod"><div class="row between"><div class="k">WOD · ${fmtShort(date)}</div><button class="btn sm wodlink" data-hist>📚 WODs anteriores</button></div><h3>${esc(wod.title || "WOD")}</h3><div class="pre">${esc(wod.text)}</div></div>${trackCards(wod)}`;
}
function rankingCard(date, wod, results) {
  if (!wod?.text || wod.score === "none") return "";
  const list = ranking(results, wod.score), mine = results[`${date}__${S.user.uid}`];
  return `<div class="card"><div class="row between"><h3>Pizarra</h3>${!isStaff() ? `<button class="btn sm ${mine ? "" : "primary"}" id="logR">${mine ? "Editar mi resultado" : "Apuntar mi resultado"}</button>` : ""}</div>
    ${list.length ? `<ol class="rank">${list.map((r, i) => `<li><span class="pos">${i + 1}</span><span class="grow"><b>${esc(r.name)}</b> ${r.rx ? '<span class="chip">RX</span>' : '<span class="chip grey">Escalado</span>'}${r.note ? `<br><span class="small muted">${esc(r.note)}</span>` : ""}</span>
      <span class="sc">${esc(r.score)}</span>${r.uid !== S.user.uid ? `<button class="bump" data-bump="${r.id}" aria-pressed="${!!r.likes?.[S.user.uid]}" title="Choca esos cinco">👊 ${Object.keys(r.likes || {}).length || ""}</button>` : `<span class="bump" title="Choques recibidos">👊 ${Object.keys(r.likes || {}).length}</span>`}</li>`).join("")}</ol>`
      : '<p class="empty">Nadie ha apuntado su resultado todavía. ¡Sé el primero!</p>'}</div>`;
}
function bindRanking(root, date, wod, results) {
  root.querySelectorAll("[data-hist]").forEach(b => b.onclick = () => go("historial"));
  root.querySelector("#logR")?.addEventListener("click", () => logResult(date, wod, results[`${date}__${S.user.uid}`]));
  root.querySelectorAll("[data-bump]").forEach(b => b.onclick = () => { const r = results[b.dataset.bump]; const on = !r.likes?.[S.user.uid];
    const likes = { ...(r.likes || {}) }; if (on) likes[S.user.uid] = true; else delete likes[S.user.uid];
    safe(() => be.set("results/" + b.dataset.bump, { ...r, likes })); });
}
function logResult(date, wod, cur) {
  openDlg(`<h3>Mi resultado</h3><p class="muted small">${esc(wod.title)} · ${SCORE[wod.score]}</p>
    <form id="rf"><label>${SCORE[wod.score]}<input id="rS" required value="${esc(cur?.score || "")}" placeholder="${wod.score === "time" ? "8:45" : wod.score === "rounds" ? "6+12" : "0"}" inputmode="${wod.score === "time" || wod.score === "rounds" ? "text" : "decimal"}"></label>
    <label class="check"><input type="checkbox" id="rX" ${cur?.rx !== false ? "checked" : ""}> Hecho RX (pesos y movimientos tal cual)</label>
    <label>Nota (opcional)<input id="rN" maxlength="120" value="${esc(cur?.note || "")}" placeholder="Ej.: con banda en las dominadas"></label>
    <div class="err" id="rE"></div>
    <div class="dlgbtns">${cur ? '<button type="button" class="btn danger" id="rD">Borrar</button>' : ""}<button type="button" class="btn" id="rC">Cancelar</button><button class="btn primary">Guardar</button></div></form>`, () => {
    $("#rC").onclick = closeDlg;
    $("#rD")?.addEventListener("click", async () => { await safe(() => be.del(`results/${date}__${S.user.uid}`)); closeDlg(); });
    $("#rf").onsubmit = async ev => {
      ev.preventDefault();
      const score = $("#rS").value.trim(), value = scoreValue(wod.score, score);
      if (value == null) { $("#rE").textContent = wod.score === "time" ? "Escribe el tiempo así: 8:45" : wod.score === "rounds" ? "Escribe rondas + repeticiones, así: 6+12" : "Escribe solo el número."; return; }
      await safe(() => be.set(`results/${date}__${S.user.uid}`, { date, uid: S.user.uid, name: S.me.name, score, value, rx: $("#rX").checked, note: $("#rN").value.trim(), at: new Date().toISOString(), likes: cur?.likes || {} }));
      closeDlg(); toast("¡Resultado apuntado!");
    };
  });
}

/* ---------- view: HOY ---------- */
VIEWS.hoy = root => {
  const d = today();
  let bookings = {}, wod, results = {}, notices = {}, extra = { members: {}, leads: {} };
  const draw = () => {
    const slots = slotsFor(d);
    if (isStaff()) {
      const pend = Object.values(extra.members).filter(m => m.status === "pending").length;
      const unpaid = Object.values(extra.members).filter(m => m.status === "active" && m.role === "athlete" && m.planId && !paidFor(m)).length;
      const leads = Object.values(extra.leads).filter(l => !l.done).length;
      const booked = Object.values(bookings).filter(b => !b.wait).length;
      root.innerHTML = `${cara(`¡Egun on, ${firstName(S.me.name)}!`, `Hoy hay <b>${booked}</b> ${booked === 1 ? "reserva" : "reservas"} en ${slots.length} ${slots.length === 1 ? "clase" : "clases"}.`)}
        ${pend || leads || (isAdmin() && unpaid) ? `<div class="card"><h3>Pendiente</h3><div class="stack">
          ${pend ? `<button class="btn block" data-go="socios">👋 ${pend} ${pend === 1 ? "alta nueva" : "altas nuevas"} por revisar</button>` : ""}
          ${leads && isAdmin() ? `<button class="btn block" data-go="box" data-sec="pruebas">✉️ ${leads} ${leads === 1 ? "persona quiere" : "personas quieren"} clase de prueba</button>` : ""}
          ${unpaid && isAdmin() ? `<button class="btn block" data-go="socios" data-f="impago">💶 ${unpaid} con la cuota de ${monthName(thisMonth())} pendiente</button>` : ""}
        </div></div>` : ""}
        <div class="h"><h2>Clases de hoy</h2><span class="sub">Toca un nombre para marcar que ha venido</span></div>
        <div class="card" id="sl">${slots.map(s => slotRow(d, s, bookings, { staff: true })).join("") || '<p class="empty">Hoy no hay clases.</p>'}</div>
        <div class="h"><h2>WOD de hoy</h2></div>${wodCard(d, wod)}${rankingCard(d, wod, results)}`;
      bindSlots(root, d, bookings, slots); bindRanking(root, d, wod, results);
      root.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { if (b.dataset.f) sociosFilter = b.dataset.f; if (b.dataset.sec) boxSec = b.dataset.sec; go(b.dataset.go); });
      return;
    }
    const mineNext = Object.values(S.myBookings).filter(b => b.date >= d && !(b.date === d && startsAt(b.date, b.s) < new Date(Date.now() - 3600e3))).sort((a, b) => (a.date + a.s).localeCompare(b.date + b.s));
    const todayB = mineNext.find(b => b.date === d);
    const u = usage();
    const pending = S.me.status === "pending";
    const unpaid = u.plan && !paidFor(S.me);
    const msg = pending ? ["¡Ya casi estás!", "El box tiene que revisar tu alta y asignarte una tarifa. Mientras, cotillea el WOD."]
      : unpaid ? ["Ojo con la cuota", `Tu cuota de ${monthName(thisMonth())} está pendiente. <a href="#" data-go="cuota">Págala aquí</a> y a entrenar.`]
      : todayB ? [`Hoy a las ${todayB.s}`, `Te esperamos en ${esc(typeOf(todayB.type).name)}. ¡Sin excusas!`]
      : mineNext.length ? ["Hoy toca descanso", `Tu próxima clase: ${fmtDay(mineNext[0].date).toLowerCase()} a las ${mineNext[0].s}.`]
      : ["¿Hoy no entrenas?", 'Caravinagre te está mirando… <a href="#" data-go="clases">Reserva una clase</a>.'];
    const ns = Object.entries(notices).sort((a, b) => b[1].at.localeCompare(a[1].at)).slice(0, 3);
    root.innerHTML = `${cara(msg[0], msg[1])}
      ${ns.map(([, n]) => `<div class="card" style="border-left:5px solid var(--brand)"><h3>📣 ${esc(n.title)}</h3><div class="pre">${esc(n.body)}</div></div>`).join("")}
      <div class="h"><h2>WOD de hoy</h2></div>${wodCard(d, wod)}${rankingCard(d, wod, results)}
      ${u.plan ? `<div class="h"><h2>Este mes</h2><a href="#" class="small" data-go="cuota">Ver mi cuota</a></div><div class="quota">
        <div class="qbox"><div class="n">${u.clsMax == null ? "∞" : Math.max(0, u.clsMax - u.cls)}</div><div class="l">clases te quedan</div></div>
        <div class="qbox"><div class="n">${u.openMax == null ? "∞" : Math.max(0, u.openMax - u.open)}</div><div class="l">sesiones Open te quedan</div></div></div>` : ""}
      <div class="h"><h2>Mis reservas</h2><a href="#" class="small" data-go="clases">Reservar</a></div>
      <div class="card">${mineNext.length ? `<div class="list">${mineNext.slice(0, 6).map(b => `<div class="li" style="cursor:default"><span class="av" style="background:${typeOf(b.type).c};color:#fff">${b.s.slice(0, 2)}</span><span class="grow"><span class="t">${esc(typeOf(b.type).name)} · ${b.s}</span><br><span class="small muted">${fmtDay(b.date)}${b.wait ? " · en lista de espera" : ""}</span></span></div>`).join("")}</div>` : '<p class="empty">No tienes clases reservadas.</p>'}</div>`;
    bindRanking(root, d, wod, results);
    root.querySelectorAll("[data-go]").forEach(b => b.onclick = e => { e.preventDefault(); go(b.dataset.go); });
  };
  queryV("bookings", [["date", "==", d]], o => { bookings = o; draw(); });
  watchV("wods/" + d, w => { wod = w; draw(); });
  queryV("results", [["date", "==", d]], o => { results = o; draw(); });
  queryV("notices", [], o => { notices = o; draw(); });
  if (isStaff()) {
    queryV("members", [], o => { extra.members = o; membersCache = o; draw(); });
    if (isAdmin()) queryV("leads", [["done", "==", false]], o => { extra.leads = o; draw(); });
  }
  return { draw };
};

/* ---------- view: CLASES ---------- */
let clasesDay = null;
VIEWS.clases = root => {
  if (!clasesDay || clasesDay < today()) clasesDay = today();
  let bookings = {}, unsub = null;
  const listen = () => { unsub?.(); unsub = be.watchQuery("bookings", [["date", "==", clasesDay]], o => { bookings = o; draw(); }, fail); };
  viewSubs.push(() => unsub?.());
  const draw = () => {
    const slots = slotsFor(clasesDay), staff = isStaff();
    const days = staff ? 14 : (S.box.openDays ?? 2) + 1;
    const from = staff ? addDays(today(), -3) : today();
    root.innerHTML = `<div class="h"><h2>Clases</h2><span class="sub">${fmtDay(clasesDay)}</span></div>
      ${dayPicker(clasesDay, from, days)}
      ${S.sched?.off?.[clasesDay] ? `<div class="card">${cara("Box cerrado", "Este día no hay clases.")}</div>` : ""}
      <div class="card" style="margin-top:10px">${slots.map(s => slotRow(clasesDay, s, bookings, { staff })).join("") || '<p class="empty">Este día no hay clases.</p>'}</div>
      ${!staff ? `<p class="small muted">Las reservas se abren ${S.box.openDays ?? 2} días antes a las ${esc(S.box.openTime || "21:00")}. Puedes cancelar hasta ${S.box.cancelHours ?? 2} h antes. Si la clase está llena, apúntate a la lista de espera: si alguien cancela, entras tú.</p>` : ""}`;
    bindDays(root, d => { clasesDay = d; listen(); draw(); });
    bindSlots(root, clasesDay, bookings, slots);
  };
  if (isStaff() && !membersCache) queryV("members", [], o => { membersCache = o; });
  listen();
  return { draw };
};

/* ---------- view: WOD (staff) ---------- */
let wodDay = null, wodCopy = null, wodMode = "semana", wodWeek = null, wodTrack = "crossfit";
const TRACKS = [{ id: "crossfit", name: "WOD CrossFit" }, { id: "halter", name: "Halterofilia" }, { id: "gim", name: "Gimnásticos" }, { id: "endurance", name: "Endurance" }];
const weekStart = off => addDays(today(), -wdOf(today()) + off * 7);
VIEWS.wod = root => {
  wodDay ||= today();
  if (wodCopy) wodMode = "dia";
  // From Saturday on, coaches are usually preparing next week.
  if (wodWeek == null) wodWeek = wdOf(today()) >= 5 ? 1 : 0;
  let wod = null, results = {}, week = {}, u1, u2, u3;
  const listen = () => { u1?.(); u2?.();
    u1 = be.watch("wods/" + wodDay, w => { wod = w; if (wodMode === "dia") draw(); }, fail);
    u2 = be.watchQuery("results", [["date", "==", wodDay]], o => { results = o; if (wodMode === "dia") draw(); }, fail); };
  const listenWeek = () => { u3?.(); const from = weekStart(wodWeek);
    u3 = be.watchQuery("wods", [["date", ">=", from], ["date", "<=", addDays(from, 6)]], o => { week = o; if (wodMode === "semana") draw(); }, fail); };
  viewSubs.push(() => { u1?.(); u2?.(); u3?.(); });
  const modeBar = () => `<div class="tabs2"><button data-mode="semana" aria-pressed="${wodMode === "semana"}">Programar la semana</button><button data-mode="dia" aria-pressed="${wodMode === "dia"}">Un día</button></div>`;
  const bindMode = () => root.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { wodMode = b.dataset.mode; draw(); });

  const drawDay = () => {
    const src = wodCopy || wod;
    root.innerHTML = `<div class="h"><h2>Programación</h2><button class="btn sm" data-hist>📚 Anteriores</button></div>${modeBar()}
      <p class="small muted" style="margin:-4px 0 10px">${fmtDay(wodDay)}${wodCopy ? ` · copiado de «${esc(wodCopy.title)}». Elige el día y publícalo` : ""}</p>
      ${dayPicker(wodDay, addDays(today(), -3), 11)}
      <div class="card" style="margin-top:10px"><form id="wf">
        <h3>CrossFit · WOD</h3>
        <label>Nombre del WOD<input id="wT" maxlength="60" value="${esc(src?.title || "")}" placeholder="Ej.: Fran, AMRAP 20'…"></label>
        <label>Entrenamiento<textarea id="wX" maxlength="2000" placeholder="Calentamiento, fuerza, WOD…">${esc(src?.text || "")}</textarea></label>
        <label>Cómo se puntúa<select id="wS">${Object.entries(SCORE).map(([k, v]) => `<option value="${k}" ${(src?.score || "time") === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        ${TRACKS.filter(t => t.id !== "crossfit").map(t => `<label>${t.name} (opcional)<textarea data-tr="${t.id}" maxlength="2000" style="min-height:80px" placeholder="Entreno de ${t.name.toLowerCase()} de este día">${esc((wodCopy ? wodCopy : wod)?.tracks?.[t.id]?.text || "")}</textarea></label>`).join("")}
        <div class="dlgbtns">${wod ? '<button type="button" class="btn danger" id="wD">Borrar el día</button>' : ""}<button class="btn primary">${wod ? "Guardar cambios" : "Publicar"}</button></div>
      </form></div>
      ${wod?.text ? `<div class="h"><h2>Así lo ven los atletas</h2></div>${wodCard(wodDay, wod)}${rankingCard(wodDay, wod, results)}` : ""}`;
    bindMode();
    root.querySelector("[data-hist]").onclick = () => { wodCopy = null; go("historial"); };
    bindDays(root, d => { wodDay = d; wod = null; results = {}; listen(); });
    $("#wD")?.addEventListener("click", async () => { if (await confirmDlg("Borrar el día", "¿Seguro que quieres borrar la programación de este día?", "Borrar")) safe(() => be.del("wods/" + wodDay)); });
    $("#wf").onsubmit = async ev => { ev.preventDefault();
      const text = $("#wX").value.trim(), tracks = {};
      root.querySelectorAll("[data-tr]").forEach(x => tracks[x.dataset.tr] = x.value.trim() ? { text: x.value.trim() } : null);
      if (!text && !Object.values(tracks).some(Boolean)) return toast("Escribe al menos un entrenamiento.");
      await safe(() => be.set("wods/" + wodDay, { date: wodDay, title: text ? $("#wT").value.trim() || "WOD" : "", text, score: $("#wS").value, tracks, by: S.user.uid, at: new Date().toISOString() }));
      wodCopy = null; document.activeElement?.blur(); toast("Publicado."); };
    bindRanking(root, wodDay, wod, results);
  };

  const drawWeek = () => {
    const from = weekStart(wodWeek), tr = TRACKS.find(t => t.id === wodTrack);
    const days = [...Array(7)].map((_, i) => addDays(from, i));
    const val = (d, k) => { const w = week[d]; if (!w) return ""; return tr.id === "crossfit" ? w[k] || "" : w.tracks?.[tr.id]?.[k] || ""; };
    const filled = t => days.filter(d => t.id === "crossfit" ? week[d]?.text : week[d]?.tracks?.[t.id]?.text).length;
    root.innerHTML = `<div class="h"><h2>Programación</h2><button class="btn sm" data-hist>📚 Anteriores</button></div>${modeBar()}
      <div class="row between" style="margin-bottom:10px"><button class="btn sm" id="wPrev" aria-label="Semana anterior">‹</button>
        <b>Semana del ${fmtShort(from)} al ${fmtShort(addDays(from, 6))}</b><button class="btn sm" id="wNext" aria-label="Semana siguiente">›</button></div>
      <div class="gseg" style="margin-bottom:10px">${TRACKS.map(t => `<button data-track="${t.id}" aria-pressed="${t.id === wodTrack}">${esc(t.name)} <span>${filled(t)}/7</span></button>`).join("")}</div>
      <div class="row" style="flex-wrap:wrap;gap:8px;margin-bottom:12px"><button class="btn sm" id="wPaste">📋 Pegar la semana de golpe</button><button class="btn sm" id="wCopy">↻ Copiar de la semana pasada</button></div>
      <form id="wkf">${days.map((d, i) => `<div class="card"><div class="row between"><h3>${DAYS_L[i]} <span class="small muted" style="font-family:Inter;font-weight:500">${fmtShort(d)}</span></h3>${!slotsFor(d).length ? '<span class="chip grey">Sin clases</span>' : ""}</div>
        ${tr.id === "crossfit" ? `<div class="grid2"><label>Nombre<input data-d="${d}" data-k="title" maxlength="60" value="${esc(val(d, "title"))}" placeholder="Fran, AMRAP…"></label><label>Puntúa por<select data-d="${d}" data-k="score">${Object.entries(SCORE).map(([k, v]) => `<option value="${k}" ${(val(d, "score") || "time") === k ? "selected" : ""}>${v}</option>`).join("")}</select></label></div>` : ""}
        <textarea data-d="${d}" data-k="text" maxlength="2000" style="min-height:90px" placeholder="${tr.id === "crossfit" ? "WOD del " + DAYS_L[i].toLowerCase() : `${tr.name} del ${DAYS_L[i].toLowerCase()}`}">${esc(val(d, "text"))}</textarea></div>`).join("")}
        <button class="btn primary block" style="position:sticky;bottom:calc(var(--nav-h) + env(safe-area-inset-bottom,0px) + 8px);z-index:5">Guardar ${esc(tr.name.toLowerCase())} de la semana</button></form>`;
    bindMode();
    root.querySelector("[data-hist]").onclick = () => go("historial");
    $("#wPrev").onclick = () => { wodWeek--; listenWeek(); };
    $("#wNext").onclick = () => { wodWeek++; listenWeek(); };
    root.querySelectorAll("[data-track]").forEach(b => b.onclick = () => { wodTrack = b.dataset.track; draw(); });
    const field = (d, k) => root.querySelector(`[data-d="${d}"][data-k="${k}"]`);
    $("#wPaste").onclick = () => openDlg(`<h3>Pegar la semana</h3><p class="small muted">Pega aquí la programación tal cual la tengas (WhatsApp, notas…). Cada día tiene que empezar con su nombre: <b>Lunes</b>, <b>Martes</b>… y la app lo reparte sola.</p>
      <textarea id="pT" style="min-height:220px" placeholder="LUNES&#10;Fran&#10;21-15-9 thrusters y pull-ups&#10;&#10;MARTES&#10;…"></textarea>
      <div class="dlgbtns"><button class="btn" id="pC">Cancelar</button><button class="btn primary" id="pOk">Repartir por días</button></div>`, () => {
      $("#pC").onclick = closeDlg;
      $("#pOk").onclick = () => {
        const parts = splitWeek($("#pT").value);
        const n = Object.keys(parts).length;
        if (!n) return toast("No encuentro los días. Empieza cada día con «Lunes», «Martes»…");
        closeDlg();
        for (const [i, txt] of Object.entries(parts)) { const d = days[i]; field(d, "text").value = txt.body;
          if (tr.id === "crossfit" && txt.title && !field(d, "title").value) field(d, "title").value = txt.title; }
        toast(`Repartido en ${n} ${n === 1 ? "día" : "días"}. Revisa y pulsa Guardar.`);
      };
    });
    $("#wCopy").onclick = async () => {
      const prevFrom = addDays(from, -7);
      const prev = {}; for (let i = 0; i < 7; i++) { const w = await be.get("wods/" + addDays(prevFrom, i)).catch(() => null); if (w) prev[i] = w; }
      let n = 0;
      days.forEach((d, i) => { const w = prev[i]; if (!w) return; const src = tr.id === "crossfit" ? w : w.tracks?.[tr.id]; if (!src?.text) return; n++;
        field(d, "text").value = src.text; if (tr.id === "crossfit") { field(d, "title").value = src.title || ""; field(d, "score").value = src.score || "time"; } });
      toast(n ? `Copiados ${n} días. Cambia lo que quieras y pulsa Guardar.` : "La semana pasada no tiene nada de " + tr.name.toLowerCase() + ".");
    };
    $("#wkf").onsubmit = async ev => { ev.preventDefault();
      let n = 0;
      await safe(async () => {
        for (const d of days) {
          const text = field(d, "text").value.trim(), cur = week[d];
          if (tr.id === "crossfit") {
            const title = text ? field(d, "title").value.trim() || "WOD" : "", score = field(d, "score").value;
            if (!cur && !text) continue;
            if (cur && cur.text === text && (cur.title || "") === title && (cur.score || "time") === score) continue;
            await be.merge("wods/" + d, { date: d, title, text, score, by: S.user.uid, at: new Date().toISOString() }); n++;
          } else {
            if ((cur?.tracks?.[tr.id]?.text || "") === text) continue;
            await be.merge("wods/" + d, { date: d, tracks: { [tr.id]: text ? { text } : null }, by: S.user.uid, at: new Date().toISOString() }); n++;
          }
        }
      });
      document.activeElement?.blur();
      toast(n ? `Semana guardada: ${n} ${n === 1 ? "día actualizado" : "días actualizados"}.` : "No había cambios.");
    };
  };

  const draw = () => wodMode === "semana" ? drawWeek() : drawDay();
  listen(); listenWeek();
  return { draw };
};

// "LUNES\n...\nMARTES\n..." → { 0: {title, body}, 1: ... }
function splitWeek(raw) {
  const names = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
  const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const out = {}; let cur = null;
  for (const line of String(raw).replace(/\r/g, "").split("\n")) {
    const m = norm(line.trim()).replace(/^[^a-z]+/, "").match(/^(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b[\s:.\-–—)]*(.*)$/);
    if (m && line.trim().length < 60) { cur = names.indexOf(m[1]); out[cur] = { lines: [] }; const rest = line.trim().replace(/^[^A-Za-zÁÉÍÓÚáéíóú]*\S+\s*[:.\-–—)]*\s*/, ""); if (rest) out[cur].lines.push(rest); continue; }
    if (cur != null) out[cur].lines.push(line);
  }
  const res = {};
  for (const [k, v] of Object.entries(out)) {
    const lines = v.lines.join("\n").trim().split("\n");
    const body = lines.join("\n").trim(); if (!body) continue;
    const first = lines[0].trim();
    res[k] = { body, title: first.length <= 40 && lines.length > 1 ? first.replace(/^["“«]|["”»]$/g, "") : "" };
  }
  return res;
}

/* ---------- view: HISTÓRICO DE WODs ---------- */
let histQ = "";
VIEWS.historial = root => {
  let wods = {}, mine = {};
  const back = isStaff() ? "wod" : "hoy";
  const draw = () => {
    const q = histQ.trim().toLowerCase();
    const list = Object.entries(wods).filter(([d]) => d <= today()).sort((a, b) => b[0].localeCompare(a[0]))
      .filter(([, w]) => w.text || Object.values(w.tracks || {}).some(t => t?.text))
      .filter(([, w]) => !q || `${w.title} ${w.text} ${Object.values(w.tracks || {}).map(t => t?.text || "").join(" ")}`.toLowerCase().includes(q));
    const byMonth = {}; for (const e of list) (byMonth[monthOf(e[0])] ||= []).push(e);
    root.innerHTML = `<div class="h"><h2>Entrenos anteriores</h2><button class="btn sm" id="hBack">← Volver</button></div>
      <input class="search" id="hq" type="search" placeholder="Buscar: Fran, snatch, muscle-up…" value="${esc(histQ)}">
      <p class="small muted" style="margin-top:-2px">${Object.keys(wods).length} WODs guardados.${isStaff() ? "" : " Los que hiciste llevan tu resultado."}</p>
      ${list.length ? Object.entries(byMonth).map(([m, es]) => `<div class="sched-day"><h4>${monthName(m)} ${m.slice(0, 4)}</h4><div class="card" style="padding-top:4px;padding-bottom:4px"><div class="list">${es.map(([d, w]) => { const r = mine[`${d}__${S.user.uid}`];
        return `<button class="li" data-w="${d}"><span class="av">${parse(d).getDate()}</span><span class="grow" style="min-width:0"><span class="t">${esc(w.text ? w.title || "WOD" : TRACKS.filter(t => w.tracks?.[t.id]?.text).map(t => t.name).join(" · "))}</span>${TRACKS.filter(t => t.id !== "crossfit" && w.text && w.tracks?.[t.id]?.text).map(t => ` <span class="chip grey">${esc(t.name)}</span>`).join("")}<br><span class="small muted" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc((w.text || Object.values(w.tracks || {}).find(t => t?.text)?.text || "").replace(/\n+/g, " · "))}</span></span>${r ? `<span class="chip">${esc(r.score)}</span>` : ""}›</button>`; }).join("")}</div></div></div>`).join("")
        : `<div class="card">${cara("Nada por aquí", q ? "No hay ningún WOD con esa palabra." : "Cuando se publiquen WODs se guardarán aquí.")}</div>`}`;
    $("#hBack").onclick = () => go(back);
    const hq = $("#hq"); hq.oninput = () => { histQ = hq.value; const pos = hq.selectionStart; draw(); const n = $("#hq"); n.focus(); n.setSelectionRange(pos, pos); };
    root.querySelectorAll("[data-w]").forEach(b => b.onclick = () => showWod(b.dataset.w, wods[b.dataset.w]));
  };
  const showWod = (date, wod) => {
    let results = {};
    const un = be.watchQuery("results", [["date", "==", date]], o => { results = o; paint(); }, fail);
    const onClose = () => { un(); dlg.removeEventListener("close", onClose); };
    dlg.addEventListener("close", onClose);
    const paint = () => openDlg(`<p class="muted small" style="margin:0 0 6px">${fmtDay(date)}</p>${wodCard(date, wod).replace(/<button class="btn sm wodlink"[^>]*>.*?<\/button>/, "")}${rankingCard(date, wod, results).replace(/<button class="btn sm[^"]*" id="logR">.*?<\/button>/, "")}
      <div class="dlgbtns">${isStaff() ? '<button class="btn" id="hRep">Repetir este WOD…</button>' : ""}<button class="btn primary" id="hC">Cerrar</button></div>`, b => {
      $("#hC").onclick = closeDlg;
      bindRanking(b, date, wod, results);
      $("#hRep")?.addEventListener("click", () => { closeDlg(); wodDay = today(); wodCopy = wod; go("wod"); });
    });
    paint();
  };
  queryV("wods", [], o => { wods = o; draw(); });
  queryV("results", [["uid", "==", S.user.uid]], o => { mine = o; draw(); });
  return { draw };
};

/* ---------- view: PANEL DEL ATLETA (marcas, ranking, muro) ---------- */
let panelSec = "marcas", rankLift = "Back squat", rankSex = "";
const ytId = u => { const m = String(u || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/); return m ? m[1] : null; };
const cleanUrl = u => { u = String(u || "").trim(); return /^https:\/\/[^\s"'<>]+$/.test(u) ? u : ""; };
function videoBox(url) {
  const u = cleanUrl(url); if (!u) return "";
  const id = ytId(u);
  return `<a class="vid" href="${esc(u)}" target="_blank" rel="noopener">${id ? `<img src="https://img.youtube.com/vi/${id}/mqdefault.jpg" alt="" loading="lazy" onerror="this.remove()">` : ""}<span>▶ Ver vídeo</span></a>`;
}
function bestBy(marks) {
  const o = {};
  for (const [id, m] of Object.entries(marks)) if (!o[m.uid] || m.v > o[m.uid].v || (m.v === o[m.uid].v && m.date < o[m.uid].date)) o[m.uid] = { id, ...m };
  return Object.values(o).sort((a, b) => b.v - a.v || a.date.localeCompare(b.date));
}
function streakWeeks(mine) {
  const weeks = new Set(Object.values(mine).filter(b => !b.wait && b.date <= today()).map(b => addDays(b.date, -wdOf(b.date))));
  let n = 0, w = addDays(today(), -wdOf(today()));
  if (!weeks.has(w)) w = addDays(w, -7);  // this week may not have started yet
  while (weeks.has(w)) { n++; w = addDays(w, -7); }
  return n;
}

VIEWS.marcas = root => {
  let mine = {}, pub = {}, monthB = {}, myRes = {};
  const draw = () => {
    const me = S.me, myBest = {};
    for (const m of Object.values(mine)) if (!myBest[m.lift] || m.v > myBest[m.lift].v) myBest[m.lift] = m;
    const prsMonth = Object.values(mine).filter(m => monthOf(m.date) === thisMonth() && m.pr).length;
    const cls = Object.values(S.myBookings).filter(b => !b.wait && b.date <= today() && monthOf(b.date) === thisMonth()).length;
    const head = `<div class="card me-card"><div class="row"><span class="av big">${initials(me.name)}</span><div class="grow"><h3 style="margin:0">${esc(me.name)}</h3><span class="small muted">${esc(planOf(me.planId)?.name || "Atleta")} · CrossFit Iruña</span></div></div>
      <div class="mstats"><div><b>${cls}</b><span>clases en ${monthName(thisMonth())}</span></div><div><b>${streakWeeks(S.myBookings)}</b><span>semanas seguidas</span></div><div><b>${prsMonth}</b><span>PRs este mes</span></div></div></div>
      <div class="tabs2"><button data-ps="marcas" aria-pressed="${panelSec === "marcas"}">Mis marcas</button><button data-ps="ranking" aria-pressed="${panelSec === "ranking"}">Ranking</button><button data-ps="muro" aria-pressed="${panelSec === "muro"}">Muro</button></div>`;
    let body = "";
    if (panelSec === "marcas") {
      const names = [...new Set([...LIFTS, ...Object.keys(myBest)])];
      const res = Object.values(myRes).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
      body = `<button class="btn primary block" id="newPR" style="margin-bottom:12px">＋ Apuntar una marca</button>
        <div class="card"><div class="list">${names.map(n => { const b = myBest[n]; return `<div class="pr" data-l="${esc(n)}"><span class="grow"><b>${esc(n)}</b><br><span class="small muted">${b ? `${fmtShort(b.date)}${b.video ? " · 🎥 con vídeo" : ""}` : "Toca para apuntar tu marca"}</span></span><span class="kg">${b ? `${b.v.toLocaleString("es-ES")} <small class="small muted">kg</small>` : "—"}</span></div>`; }).join("")}</div>
        <button class="btn sm ghost" id="newL" style="margin-top:6px">+ Otro ejercicio</button></div>
        <div class="h"><h2>Mis WODs</h2><a href="#" class="small" data-go="historial">Ver todos</a></div>
        <div class="card">${res.length ? `<div class="list">${res.map(r => `<div class="li" style="cursor:default"><span class="grow"><span class="t">${esc(r.score)}</span> ${r.rx ? '<span class="chip">RX</span>' : ""}<br><span class="small muted">${fmtDay(r.date)}${r.note ? " · " + esc(r.note) : ""}</span></span><span class="small">👊 ${Object.keys(r.likes || {}).length}</span></div>`).join("")}</div>` : '<p class="empty">Cuando apuntes resultados de WODs aparecerán aquí.</p>'}</div>`;
    }
    if (panelSec === "ranking") {
      const lifts = [...new Set([...LIFTS, ...Object.values(pub).map(m => m.lift)])];
      const list = bestBy(Object.fromEntries(Object.entries(pub).filter(([, m]) => m.lift === rankLift && (!rankSex || m.sex === rankSex))));
      const myPos = list.findIndex(m => m.uid === S.user.uid);
      const att = {}; for (const b of Object.values(monthB)) if (!b.wait && b.date <= today()) { (att[b.uid] ||= { n: 0, name: b.name }).n++; }
      const attList = Object.entries(att).sort((a, b) => b[1].n - a[1].n).slice(0, 10);
      body = `<div class="card"><div class="grid2"><label style="margin-top:0">Ejercicio<select id="rkL">${lifts.map(l => `<option ${l === rankLift ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
          <label style="margin-top:0">Categoría<select id="rkS"><option value="">Todos</option><option value="f" ${rankSex === "f" ? "selected" : ""}>Chicas</option><option value="m" ${rankSex === "m" ? "selected" : ""}>Chicos</option></select></label></div>
        ${myPos >= 0 ? `<p class="small" style="margin:10px 0 0">Vas <b>${myPos + 1}º</b> de ${list.length} en ${esc(rankLift)}.${myPos > 0 ? ` Te faltan <b>${(list[myPos - 1].v - list[myPos].v).toLocaleString("es-ES")} kg</b> para pasar a ${esc(firstName(list[myPos - 1].name))}. 😈` : " ¡Mandas tú! 👑"}</p>` : `<p class="small muted" style="margin:10px 0 0">Apunta tu marca de ${esc(rankLift)} para entrar en el ranking.</p>`}
        ${list.length ? `<ol class="rank" style="margin-top:8px">${list.map((m, i) => `<li class="${m.uid === S.user.uid ? "mine" : ""}"><span class="pos">${i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span><span class="grow"><b>${esc(m.name)}</b><br><span class="small muted">${fmtShort(m.date)}</span></span>${cleanUrl(m.video) ? `<a class="bump" href="${esc(cleanUrl(m.video))}" target="_blank" rel="noopener" title="Ver vídeo">▶</a>` : ""}<span class="sc">${m.v.toLocaleString("es-ES")} kg</span></li>`).join("")}</ol>` : '<p class="empty">Nadie ha publicado esta marca todavía.</p>'}</div>
        <div class="h"><h2>Los más constantes</h2><span class="sub">clases en ${monthName(thisMonth())}</span></div>
        <div class="card">${attList.length ? `<ol class="rank">${attList.map(([uid, a], i) => `<li class="${uid === S.user.uid ? "mine" : ""}"><span class="pos">${i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span><span class="grow"><b>${esc(a.name)}</b></span><span class="sc">${a.n}</span></li>`).join("")}</ol>` : '<p class="empty">Aún no hay clases este mes.</p>'}</div>
        ${!me.sex ? `<p class="small muted">Para salir en la categoría de chicas o chicos, elígela en Cuota → Mis datos.</p>` : ""}`;
    }
    if (panelSec === "muro") {
      const feed = Object.entries(pub).sort((a, b) => b[1].at.localeCompare(a[1].at)).slice(0, 40);
      body = `<p class="small muted" style="margin:0 0 10px">Las marcas que publica la gente del box. ¡Choca esos cinco!</p>
        ${feed.length ? feed.map(([id, m]) => `<div class="card post"><div class="row"><span class="av">${initials(m.name)}</span><div class="grow"><b>${esc(m.name)}</b><br><span class="small muted">${fmtDay(m.date)}</span></div>${m.pr ? '<span class="chip ok">¡PR!</span>' : ""}</div>
          <div class="postbody"><span class="kg">${m.v.toLocaleString("es-ES")} kg</span> <span>${esc(m.lift)}</span></div>
          ${m.note ? `<p style="margin:6px 0 0">${esc(m.note)}</p>` : ""}${videoBox(m.video)}
          <div class="row" style="margin-top:10px"><button class="bump" data-like="${id}" aria-pressed="${!!m.likes?.[S.user.uid]}" ${m.uid === S.user.uid ? "disabled" : ""}>👊 ${Object.keys(m.likes || {}).length || ""}</button></div></div>`).join("")
          : `<div class="card">${cara("Muro vacío", "Sé el primero: apunta una marca y publícala.")}</div>`}`;
    }
    root.innerHTML = `<div class="h"><h2>Mi panel</h2></div>${head}${body}`;
    root.querySelectorAll("[data-ps]").forEach(b => b.onclick = () => { panelSec = b.dataset.ps; draw(); });
    root.querySelectorAll("[data-go]").forEach(b => b.onclick = e => { e.preventDefault(); go(b.dataset.go); });
    root.querySelectorAll("[data-l]").forEach(b => b.onclick = () => liftDlg(b.dataset.l));
    $("#newPR")?.addEventListener("click", () => markForm());
    $("#newL")?.addEventListener("click", () => openDlg(`<h3>Nuevo ejercicio</h3><form id="nf"><label>Nombre<input id="nN" required maxlength="40" placeholder="Ej.: Overhead squat"></label><div class="dlgbtns"><button type="button" class="btn" id="nC">Cancelar</button><button class="btn primary">Seguir</button></div></form>`, () => {
      $("#nC").onclick = closeDlg; $("#nf").onsubmit = e => { e.preventDefault(); markForm($("#nN").value.trim()); }; }));
    $("#rkL")?.addEventListener("change", e => { rankLift = e.target.value; draw(); });
    $("#rkS")?.addEventListener("change", e => { rankSex = e.target.value; draw(); });
    root.querySelectorAll("[data-like]").forEach(b => b.onclick = () => { const m = pub[b.dataset.like]; const likes = { ...(m.likes || {}) };
      if (likes[S.user.uid]) delete likes[S.user.uid]; else likes[S.user.uid] = true; safe(() => be.set("marks/" + b.dataset.like, { ...m, likes })); });
  };
  const markForm = (lift = LIFTS[0]) => {
    const lifts = [...new Set([...LIFTS, ...Object.values(mine).map(m => m.lift), lift])];
    openDlg(`<h3>Nueva marca</h3><form id="mkf">
      <label>Ejercicio<select id="kL">${lifts.map(l => `<option ${l === lift ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
      <div class="grid2"><label>Kilos<input id="kV" type="number" step="0.5" min="1" max="500" required inputmode="decimal"></label><label>Fecha<input id="kD" type="date" value="${today()}" max="${today()}" required></label></div>
      <label>Vídeo (opcional)<input id="kY" type="url" maxlength="300" placeholder="Pega el enlace de YouTube"></label>
      <label>Comentario (opcional)<input id="kN" maxlength="140" placeholder="Ej.: ¡Por fin!"></label>
      <label class="check"><input type="checkbox" id="kP" checked> Publicar en el muro y en el ranking</label>
      <div class="err" id="kE"></div>
      <div class="dlgbtns"><button type="button" class="btn" id="kC">Cancelar</button><button class="btn primary">Guardar marca</button></div></form>`, () => {
      $("#kC").onclick = closeDlg;
      $("#mkf").onsubmit = async e => { e.preventDefault();
        const l = $("#kL").value, v = parseFloat($("#kV").value), video = $("#kY").value.trim();
        if (video && !cleanUrl(video)) { $("#kE").textContent = "El enlace del vídeo tiene que empezar por https://"; return; }
        const prev = Object.values(mine).filter(m => m.lift === l), pr = !prev.length || v > Math.max(...prev.map(m => m.v));
        await safe(() => be.add("marks", { uid: S.user.uid, name: S.me.name, sex: S.me.sex || "", lift: l, v, date: $("#kD").value, video: cleanUrl(video), note: $("#kN").value.trim(), public: $("#kP").checked, pr, at: new Date().toISOString(), likes: {} }));
        closeDlg(); toast(pr ? "🎉 ¡Nueva marca personal!" : "Marca apuntada.");
      };
    });
  };
  const liftDlg = name => {
    const arr = Object.entries(mine).filter(([, m]) => m.lift === name).map(([id, m]) => ({ id, ...m })).sort((a, b) => a.date.localeCompare(b.date));
    if (!arr.length) return markForm(name);
    const b = Math.max(...arr.map(x => x.v));
    const spark = () => {
      if (arr.length < 2) return "";
      const vs = arr.map(x => x.v), mn = Math.min(...vs), mx = Math.max(...vs), W = 300, H = 70, P = 6;
      const pts = arr.map((x, i) => [P + i * (W - 2 * P) / (arr.length - 1), H - P - (mx === mn ? .5 : (x.v - mn) / (mx - mn)) * (H - 2 * P)]);
      return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="#4A1019" stroke-width="2.5" vector-effect="non-scaling-stroke"/>${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#4A1019"/>`).join("")}</svg>`;
    };
    openDlg(`<h3>${esc(name)}</h3><p class="muted">Tu mejor marca: <b style="color:var(--brand)">${b} kg</b></p>
      <div class="pct">${[50, 60, 65, 70, 75, 80, 85, 90].map(p => `<div><b>${Math.round(b * p / 100 * 2) / 2}</b>${p} %</div>`).join("")}</div>${spark()}
      <button class="btn primary block" id="lAdd" style="margin-top:12px">＋ Apuntar nueva marca</button>
      <label>Historial</label><div class="list">${arr.slice().reverse().map(x => `<div class="li" style="cursor:default"><span class="grow">${fmtDay(x.date)}${x.public ? "" : ' <span class="chip grey">privada</span>'}${cleanUrl(x.video) ? ` · <a href="${esc(cleanUrl(x.video))}" target="_blank" rel="noopener">vídeo</a>` : ""}</span><b>${x.v} kg</b><button class="btn sm danger" data-del="${x.id}" aria-label="Borrar">✕</button></div>`).join("")}</div>
      <div class="dlgbtns"><button class="btn" id="lC">Cerrar</button></div>`, r2 => {
      $("#lC").onclick = closeDlg;
      $("#lAdd").onclick = () => markForm(name);
      r2.querySelectorAll("[data-del]").forEach(x => x.onclick = async () => { await safe(() => be.del("marks/" + x.dataset.del)); delete mine[x.dataset.del]; liftDlg(name); });
    });
  };
  queryV("marks", [["uid", "==", S.user.uid]], o => { mine = o; if (!dlg.open) draw(); });
  queryV("marks", [["public", "==", true]], o => { pub = o; if (!dlg.open) draw(); });
  queryV("bookings", [["date", ">=", thisMonth() + "-01"]], o => { monthB = o; if (panelSec === "ranking" && !dlg.open) draw(); });
  queryV("results", [["uid", "==", S.user.uid]], o => { myRes = o; if (!dlg.open) draw(); });
  return { draw };
};

/* ---------- view: TIENDA ---------- */
let shopCat = "";
VIEWS.tienda = root => {
  let products = {};
  const draw = () => {
    const all = Object.entries(products).filter(([, p]) => p.visible !== false || isAdmin()).sort((a, b) => (a[1].cat || "").localeCompare(b[1].cat || "") || a[1].name.localeCompare(b[1].name));
    const cats = [...new Set(all.map(([, p]) => p.cat).filter(Boolean))];
    const list = all.filter(([, p]) => !shopCat || p.cat === shopCat);
    root.innerHTML = `<div class="h"><h2>Tienda del box</h2>${isAdmin() ? '<button class="btn sm primary" id="np">+ Producto</button>' : ""}</div>
      <p class="small muted" style="margin-top:-4px">Pregunta en el box y te lo llevas allí mismo.</p>
      ${cats.length > 1 ? `<div class="seg" style="margin-bottom:12px"><button data-c="" aria-pressed="${!shopCat}">Todo</button>${cats.map(c => `<button data-c="${esc(c)}" aria-pressed="${shopCat === c}">${esc(c)}</button>`).join("")}</div>` : ""}
      ${list.length ? `<div class="shop">${list.map(([id, p]) => `<div class="prod ${p.visible === false ? "hidden" : ""}" ${isAdmin() ? `data-p="${id}" style="cursor:pointer"` : ""}>
        <div class="ph">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy">` : `<img src="icons/mark.png" alt="" style="width:40%;opacity:.25">`}</div>
        <div class="bd"><div class="pp">${money(p.price)}</div><div class="nm">${esc(p.name)}</div>${p.colors?.length ? `<div class="cols">${p.colors.map(esc).join(" · ")}</div>` : ""}${p.visible === false ? '<span class="chip grey">Oculto</span>' : ""}</div></div>`).join("")}</div>`
        : `<div class="card">${cara("Tienda vacía", isAdmin() ? "Añade tu primer producto con el botón de arriba." : "Pronto habrá cosas chulas por aquí.")}</div>`}`;
    root.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { shopCat = b.dataset.c; draw(); });
    $("#np")?.addEventListener("click", () => productDlg(null, {}));
    root.querySelectorAll("[data-p]").forEach(b => b.onclick = () => productDlg(b.dataset.p, products[b.dataset.p]));
  };
  queryV("products", [], o => { products = o; draw(); });
  return { draw };
};
function resizeImage(file, max = 640) {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", .8)); };
    img.onerror = rej; img.src = url;
  });
}
function productDlg(id, p) {
  let img = p.img || "";
  openDlg(`<h3>${id ? "Editar producto" : "Nuevo producto"}</h3><form id="pf">
    <div class="row"><div style="width:96px;height:96px;border:1px solid var(--line);border-radius:12px;display:grid;place-items:center;overflow:hidden;background:#fff" id="pImg">${img ? `<img src="${esc(img)}" style="width:100%;height:100%;object-fit:contain">` : '<span class="small muted">Sin foto</span>'}</div>
      <label class="btn" style="margin:0;color:var(--ink)">📷 Elegir foto<input type="file" accept="image/*" id="pFile" hidden></label></div>
    <label>Nombre<input id="pN" required maxlength="80" value="${esc(p.name || "")}"></label>
    <div class="grid2"><label>Precio (€)<input id="pP" type="number" step="0.01" min="0" required value="${p.price ?? ""}" inputmode="decimal"></label>
    <label>Categoría<input id="pC" maxlength="30" value="${esc(p.cat || "")}" placeholder="Calleras, Ropa…"></label></div>
    <label>Colores o tallas (separados por comas)<input id="pV" maxlength="200" value="${esc((p.colors || []).join(", "))}" placeholder="Negro, Rojo, Blanco"></label>
    <label class="check"><input type="checkbox" id="pVis" ${p.visible !== false ? "checked" : ""}> Visible para los socios</label>
    <div class="dlgbtns">${id ? '<button type="button" class="btn danger" id="pD">Borrar</button>' : ""}<button type="button" class="btn" id="pX">Cancelar</button><button class="btn primary">Guardar</button></div></form>`, () => {
    $("#pX").onclick = closeDlg;
    $("#pFile").onchange = async e => { const f = e.target.files[0]; if (!f) return; try { img = await resizeImage(f); $("#pImg").innerHTML = `<img src="${img}" style="width:100%;height:100%;object-fit:contain">`; } catch (x) { toast("No se ha podido leer la foto."); } };
    $("#pD")?.addEventListener("click", async () => { if (await confirmDlg("Borrar producto", "¿Seguro que quieres borrarlo?", "Borrar")) safe(() => be.del("products/" + id)); });
    $("#pf").onsubmit = async e => { e.preventDefault();
      const doc = { name: $("#pN").value.trim(), price: parseFloat($("#pP").value) || 0, cat: $("#pC").value.trim(), colors: $("#pV").value.split(",").map(s => s.trim()).filter(Boolean), img, visible: $("#pVis").checked, at: p.at || new Date().toISOString() };
      await safe(() => id ? be.set("products/" + id, doc) : be.add("products", doc)); closeDlg(); toast("Producto guardado."); };
  });
}

/* ---------- view: CUOTA (athlete) ---------- */
const cuotaOpen = {};
VIEWS.cuota = root => {
  let pays = {};
  const draw = () => {
    const me = S.me, u = usage(), m = thisMonth();
    const paid = paidFor(me), box = S.box, disc = box.discounts || {};
    const payBtns = p => be.payments ? `<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:8px">
        <button class="btn sm primary" data-pay="${p.id}" data-per="month">Pagar mes · ${money(p.price)}</button>
        ${disc.semester ? `<button class="btn sm" data-pay="${p.id}" data-per="semester">6 meses · ${money(p.price * 6 * (100 - disc.semester) / 100)} <span class="chip ok">-${disc.semester} %</span></button>` : ""}
        ${disc.year ? `<button class="btn sm" data-pay="${p.id}" data-per="year">Año · ${money(p.price * 12 * (100 - disc.year) / 100)} <span class="chip ok">-${disc.year} %</span></button>` : ""}</div>` : "";
    const hist = Object.values(pays).sort((a, b) => b.at.localeCompare(a.at));
    root.innerHTML = `<div class="h"><h2>Mi cuota</h2>${u.plan ? (paid ? `<span class="chip ok">Al día hasta ${monthName(me.paidUntil)}</span>` : `<span class="chip bad">${monthName(m)} pendiente</span>`) : ""}</div>
      ${me.status === "pending" ? `<div class="card">${cara("Alta pendiente", "El box revisará tu alta muy pronto. Mientras, puedes elegir tu tarifa aquí abajo.")}</div>` : ""}
      ${u.plan ? `<div class="card"><div class="row between"><div><span class="small muted">Tu tarifa</span><h3>${esc(u.plan.name)}</h3></div><div class="plan" style="border:0;padding:0;margin:0"><span class="price">${money(u.plan.price)}<small>/mes</small></span></div></div>
        <div class="quota" style="margin-top:8px"><div class="qbox"><div class="n">${limitTxt(u.cls, u.clsMax).split(" ")[0]}</div><div class="l">clases usadas en ${monthName(m)}${u.clsMax != null ? ` de ${u.clsMax}` : " · ilimitadas"}</div></div>
        <div class="qbox"><div class="n">${u.open}</div><div class="l">sesiones Open${u.openMax != null ? ` de ${u.openMax}` : " · ilimitadas"}</div></div></div>
        ${u.extraLeft ? `<p style="margin:10px 0 0">🎟️ Te quedan <b>${u.extraLeft}</b> clases de bono.</p>` : ""}
        ${!paid ? payBtns(u.plan) : ""}${me.stripeCustomer && be.payments && !be.demo ? '<button class="btn sm ghost" id="portal" style="margin-top:8px">Cambiar tarjeta o cancelar la domiciliación</button>' : ""}
        ${!be.payments && !paid ? '<p class="small muted" style="margin-top:8px">Paga en recepción (Bizum, efectivo o transferencia) y el box lo apuntará.</p>' : ""}</div>` : ""}
      <details class="more" ${u.plan ? "" : "open"}><summary>${u.plan ? "Cambiar de tarifa" : "Elige tu tarifa"}</summary>
      ${plans().filter(p => p.id !== me.planId).map(p => `<div class="plan"><div class="grow"><b>${esc(p.name)}</b><br><span class="small muted">${p.classes == null ? "Clases ilimitadas" : p.classes ? `${p.classes} clases` : "Sin clases dirigidas"} · ${p.open == null ? "Open ilimitado" : `${p.open} Open`} al mes</span></div><span class="price">${money(p.price)}<small>/mes</small></span>${be.payments ? `<button class="btn sm" data-pick="${p.id}">Elegir</button>` : ""}</div>`).join("")}
      ${!be.payments ? '<p class="small muted">Para cambiar de tarifa, díselo al box.</p>' : ""}
      </details><details class="more"><summary>Comprar un bono de clases</summary>
      ${(box.passes || []).map(x => `<div class="plan"><div class="grow"><b>${esc(x.name)}</b><br><span class="small muted">${x.credits} ${x.credits === 1 ? "clase" : "clases"} para usar cuando quieras</span>
        ${be.payments ? `<div style="margin-top:8px"><button class="btn sm" data-pass="${x.id}">Comprar</button></div>` : ""}</div><span class="price">${money(x.price)}</span></div>`).join("")}</details>
      <div class="h"><h2>Mis pagos</h2></div>
      <div class="card">${hist.length ? `<div class="list">${hist.map(p => `<div class="li" style="cursor:default"><span class="grow"><span class="t">${esc(p.concept || "Cuota")}</span><br><span class="small muted">${fmtDay(p.at.slice(0, 10))} · ${esc(p.method)}</span></span><b>${money(p.amount)}</b></div>`).join("")}</div>` : '<p class="empty">Todavía no hay pagos.</p>'}</div>
      <div class="h"><h2>Mis datos</h2></div>
      <div class="card"><form id="mf"><label>Nombre<input id="mN" value="${esc(me.name)}" required maxlength="80"></label><label>Teléfono<input id="mP" type="tel" value="${esc(me.phone || "")}" maxlength="20"></label>
        <label>Categoría en los rankings<select id="mX"><option value="">Sin categoría</option><option value="f" ${me.sex === "f" ? "selected" : ""}>Chicas</option><option value="m" ${me.sex === "m" ? "selected" : ""}>Chicos</option></select></label>
        <p class="small muted">Correo: ${esc(S.user.email)}</p><button class="btn">Guardar mis datos</button></form></div>`;
    const pay = async (kind, id, period) => {
      const what = kind === "plan" ? planOf(id)?.name : box.passes.find(x => x.id === id)?.name;
      if (be.demo && !await confirmDlg("Pago de prueba", `En la demo no se cobra nada: se simula el pago de <b>${esc(what)}</b> como si hubieras pagado con tarjeta.`, "Simular pago")) return;
      toast("Abriendo el pago seguro…");
      try {
        const r = await be.call("checkout", { kind, id, period, back: location.origin + location.pathname });
        if (r?.url) location.href = r.url; else if (r?.demo) toast("¡Pago recibido! (demo)");
      } catch (e) { console.error(e); toast("No se ha podido abrir el pago. Inténtalo más tarde."); }
    };
    root.querySelectorAll("details.more").forEach((d, i) => { if (cuotaOpen[i]) d.open = true; d.ontoggle = () => cuotaOpen[i] = d.open; });
    root.querySelectorAll("[data-pay]").forEach(b => b.onclick = () => pay("plan", b.dataset.pay, b.dataset.per));
    root.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => { const p = planOf(b.dataset.pick);
      openDlg(`<h3>${esc(p.name)}</h3><p class="muted small">Elige cómo quieres pagarla. Se renueva sola y puedes cancelarla cuando quieras.${u.plan ? " Tu tarifa actual se cancela al cambiar." : ""}</p>${payBtns(p)}<div class="dlgbtns"><button class="btn" id="pkC">Cancelar</button></div>`, d => {
        $("#pkC").onclick = closeDlg; d.querySelectorAll("[data-pay]").forEach(x => x.onclick = () => { closeDlg(); setTimeout(() => pay("plan", x.dataset.pay, x.dataset.per), 50); }); }); });
    root.querySelectorAll("[data-pass]").forEach(b => b.onclick = () => pay("pass", b.dataset.pass));
    $("#portal")?.addEventListener("click", async () => { try { const r = await be.call("portal", { back: location.origin + location.pathname }); if (r?.url) location.href = r.url; } catch (e) { toast("No se ha podido abrir."); } });
    $("#mf").onsubmit = e => { e.preventDefault(); safe(() => be.merge("members/" + S.user.uid, { name: $("#mN").value.trim(), phone: $("#mP").value.trim(), sex: $("#mX").value })).then(() => toast("Datos guardados.")); };
  };
  queryV("payments", [["uid", "==", S.user.uid]], o => { pays = o; draw(); });
  return { draw };
};

/* ---------- view: SOCIOS (staff) ---------- */
let sociosFilter = "todos", sociosQ = "";
VIEWS.socios = root => {
  let members = {}, recent = {}, monthPays = {};
  const since = addDays(today(), -45);
  const lastSeen = () => { const o = {}; for (const b of Object.values(recent)) if (b.date <= today() && !b.wait && (!o[b.uid] || b.date > o[b.uid])) o[b.uid] = b.date; return o; };
  const draw = () => {
    const seen = lastSeen(), lim = addDays(today(), -10);
    const ath = Object.entries(members).filter(([, m]) => m.role === "athlete" || sociosFilter === "todos");
    const F = {
      todos: ([, m]) => m.status !== "baja",
      nuevos: ([, m]) => m.status === "pending",
      impago: ([, m]) => m.status === "active" && m.role === "athlete" && m.planId && !paidFor(m),
      ausentes: ([id, m]) => m.status === "active" && m.role === "athlete" && (!seen[id] || seen[id] < lim),
      baja: ([, m]) => m.status === "baja"
    };
    const count = k => ath.filter(F[k]).length;
    const q = sociosQ.trim().toLowerCase();
    const list = ath.filter(F[sociosFilter]).filter(([, m]) => !q || m.name.toLowerCase().includes(q) || (m.email || "").includes(q)).sort((a, b) => a[1].name.localeCompare(b[1].name));
    const L = { todos: "Todos", nuevos: "Nuevos", impago: "Sin pagar", ausentes: "+10 días sin venir", baja: "Bajas" };
    root.innerHTML = `<div class="h"><h2>Socios</h2><span class="sub">${count("todos")} en el box</span></div>
      <div class="seg" style="margin-bottom:10px">${Object.keys(L).filter(k => isAdmin() || k !== "impago").map(k => `<button data-f="${k}" aria-pressed="${sociosFilter === k}">${L[k]} <span>${count(k)}</span></button>`).join("")}</div>
      <input class="search" id="sq" type="search" placeholder="Buscar por nombre…" value="${esc(sociosQ)}">
      <div class="card">${list.length ? `<div class="list">${list.map(([id, m]) => { const p = planOf(m.planId);
        return `<button class="li" data-m="${id}"><span class="av">${initials(m.name)}</span><span class="grow"><span class="t">${esc(m.name)}</span>${m.role !== "athlete" ? ` <span class="chip">${m.role === "admin" ? "Dueño" : "Coach"}</span>` : ""}<br>
          <span class="small muted">${p ? esc(p.name) : m.role === "athlete" ? "Sin tarifa" : ""}${m.role === "athlete" && m.status === "active" ? ` · ${seen[id] ? `vino el ${fmtShort(seen[id])}` : "sin venir"}` : ""}</span></span>
          ${m.status === "pending" ? '<span class="chip warn">Nuevo</span>' : m.status === "baja" ? '<span class="chip grey">Baja</span>' : m.role === "athlete" && m.planId && isAdmin() ? (paidFor(m) ? '<span class="chip ok">Pagado</span>' : '<span class="chip bad">Pendiente</span>') : ""}</button>`; }).join("")}</div>` : '<p class="empty">No hay nadie en esta lista.</p>'}</div>`;
    root.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { sociosFilter = b.dataset.f; draw(); });
    const sq = $("#sq"); sq.oninput = () => { sociosQ = sq.value; const pos = sq.selectionStart; draw(); const n = $("#sq"); n.focus(); n.setSelectionRange(pos, pos); };
    root.querySelectorAll("[data-m]").forEach(b => b.onclick = () => memberDlg(b.dataset.m, members[b.dataset.m], seen[b.dataset.m]));
  };
  const memberDlg = (id, m, seen) => {
    const mb = Object.values(recent).filter(b => b.uid === id && monthOf(b.date) === thisMonth() && !b.wait);
    const u = usage(thisMonth(), m, Object.fromEntries(Object.entries(recent).filter(([, b]) => b.uid === id)));
    const p = planOf(m.planId);
    openDlg(`<h3>${esc(m.name)}</h3><p class="muted small">${esc(m.email || "")}${m.phone ? ` · <a href="tel:${esc(m.phone)}">${esc(m.phone)}</a> · <a href="https://wa.me/34${esc(m.phone.replace(/\D/g, "").replace(/^34/, ""))}" target="_blank" rel="noopener">WhatsApp</a>` : ""}</p>
      <div class="quota"><div class="qbox"><div class="n">${mb.length}</div><div class="l">clases en ${monthName(thisMonth())}${p?.classes != null && p ? ` (tarifa: ${p.classes} + ${p.open ?? "∞"} Open)` : ""}</div></div>
      <div class="qbox"><div class="n">${seen ? fmtShort(seen) : "—"}</div><div class="l">última clase</div></div></div>
      <form id="mf">
        <div class="grid2"><label>Tarifa<select id="mPlan" ${isAdmin() ? "" : "disabled"}><option value="">Sin tarifa</option>${plans().map(x => `<option value="${x.id}" ${m.planId === x.id ? "selected" : ""}>${esc(x.name)} · ${money(x.price)}</option>`).join("")}</select></label>
        <label>Estado<select id="mSt"><option value="active" ${m.status === "active" ? "selected" : ""}>Activo</option><option value="pending" ${m.status === "pending" ? "selected" : ""}>Pendiente de alta</option><option value="baja" ${m.status === "baja" ? "selected" : ""}>Baja</option></select></label></div>
        ${isAdmin() ? `<div class="grid2"><label>Rol<select id="mRole"><option value="athlete" ${m.role === "athlete" ? "selected" : ""}>Atleta</option><option value="coach" ${m.role === "coach" ? "selected" : ""}>Coach</option><option value="admin" ${m.role === "admin" ? "selected" : ""}>Dueño / admin</option></select></label>
        <label>Clases de bono<input id="mEx" type="number" min="0" step="1" value="${m.extra || 0}"></label></div>` : ""}
        <div class="dlgbtns"><button type="button" class="btn" id="mC">Cerrar</button><button class="btn primary">Guardar</button></div>
      </form>
      ${isAdmin() && m.role === "athlete" ? `<hr><div class="row between"><div><b>Cuota</b><br>${m.paidUntil ? `<span class="small muted">Pagado hasta ${monthName(m.paidUntil)} ${m.paidUntil.slice(0, 4)}</span>` : '<span class="small muted">Sin pagos</span>'}</div>${paidFor(m) ? '<span class="chip ok">Al día</span>' : '<span class="chip bad">Pendiente</span>'}</div>
        <form id="payF" style="margin-top:6px"><div class="grid2"><label>Cómo ha pagado<select id="pyM"><option>bizum</option><option>efectivo</option><option>transferencia</option><option>tarjeta</option></select></label>
        <label>Meses<select id="pyN"><option value="1">1 mes</option><option value="6">6 meses (-${S.box.discounts?.semester || 0} %)</option><option value="12">1 año (-${S.box.discounts?.year || 0} %)</option></select></label></div>
        <button class="btn block" style="margin-top:10px" ${p ? "" : "disabled"}>💶 Apuntar pago de ${monthName(m.paidUntil && m.paidUntil >= thisMonth() ? addMonths(m.paidUntil, 1) : thisMonth())}</button></form>` : ""}`, () => {
      $("#mC").onclick = closeDlg;
      $("#mf").onsubmit = async e => { e.preventDefault();
        const upd = { status: $("#mSt").value };
        if (isAdmin()) { upd.planId = $("#mPlan").value || null; upd.role = $("#mRole").value; upd.extra = Math.max(0, parseInt($("#mEx").value) || 0); }
        if (id === S.user.uid && upd.role && upd.role !== "admin") return toast("No puedes quitarte a ti mismo el rol de dueño.");
        await safe(() => be.merge("members/" + id, upd)); closeDlg(); toast("Socio actualizado."); };
      $("#payF")?.addEventListener("submit", async e => { e.preventDefault();
        const n = Number($("#pyN").value), d = n === 12 ? S.box.discounts?.year || 0 : n === 6 ? S.box.discounts?.semester || 0 : 0;
        const from = m.paidUntil && m.paidUntil >= thisMonth() ? addMonths(m.paidUntil, 1) : thisMonth();
        const until = addMonths(from, n - 1), amount = Math.round(p.price * n * (100 - d)) / 100;
        await safe(async () => {
          await be.add("payments", { uid: id, name: m.name, amount, method: $("#pyM").value, month: from, concept: p.name + (n > 1 ? ` · ${n} meses` : ""), at: new Date().toISOString(), by: S.user.uid });
          await be.merge("members/" + id, { paidUntil: until, status: "active" });
        });
        closeDlg(); toast(`Pago de ${money(amount)} apuntado.`); });
    });
  };
  queryV("members", [], o => { members = o; membersCache = o; draw(); });
  queryV("bookings", [["date", ">=", since]], o => { recent = o; draw(); });
  return { draw };
};

/* ---------- view: BOX (admin) ---------- */
let boxSec = "resumen";
VIEWS.box = root => {
  let members = {}, pays = {}, week = {}, leads = {}, notices = {};
  const wkStart = addDays(today(), -wdOf(today()));
  const draw = () => {
    const S2 = { resumen: "Resumen", horario: "Horario", tarifas: "Tarifas", tienda: "Tienda", avisos: "Avisos", pruebas: "Pruebas" };
    let h = `<div class="h"><h2>El box</h2></div><div class="gseg g3" style="margin-bottom:12px">${Object.entries(S2).map(([k, v]) => `<button data-s="${k}" aria-pressed="${boxSec === k}">${v}${k === "pruebas" && Object.values(leads).filter(l => !l.done).length ? ` <span>${Object.values(leads).filter(l => !l.done).length}</span>` : ""}</button>`).join("")}</div><div id="sec"></div>`;
    root.innerHTML = h;
    root.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { boxSec = b.dataset.s; draw(); });
    const sec = $("#sec");
    if (boxSec === "tienda") { const v = VIEWS.tienda(sec); v.draw(); return; }
    SECS[boxSec](sec);
  };
  const SECS = {
    resumen(sec) {
      const ath = Object.values(members).filter(m => m.role === "athlete");
      const active = ath.filter(m => m.status === "active");
      const income = Object.values(pays).reduce((s, p) => s + (p.amount || 0), 0);
      const unpaid = active.filter(m => m.planId && !paidFor(m));
      const expected = active.reduce((s, m) => s + (planOf(m.planId)?.price || 0), 0);
      const slots = S.sched.slots;
      let cap = 0, used = 0; const fills = [];
      for (let i = 0; i < 7; i++) { const d = addDays(wkStart, i); if (d > today()) break;
        for (const s of slots.filter(x => x.d === i)) { if (isOff(d, s)) continue; const n = Object.values(week).filter(b => b.date === d && b.slotId === s.id && !b.wait).length; cap += s.cap; used += n; fills.push({ s, n }); } }
      const byHour = {}; for (const f of fills) { const k = `${typeOf(f.s.type).name} ${f.s.s}`; (byHour[k] ||= { n: 0, c: 0 }); byHour[k].n += f.n; byHour[k].c += f.s.cap; }
      const top = Object.entries(byHour).sort((a, b) => b[1].n / b[1].c - a[1].n / a[1].c).slice(0, 5);
      const newThis = ath.filter(m => (m.joined || "").startsWith(thisMonth())).length;
      const planMix = plans().map(p => ({ p, n: active.filter(m => m.planId === p.id).length }));
      const maxMix = Math.max(1, ...planMix.map(x => x.n));
      sec.innerHTML = `<div class="stats">
        <div class="stat"><div class="n">${active.length}</div><div class="l">socios activos</div></div>
        <div class="stat"><div class="n">${money(income)}</div><div class="l">cobrado en ${monthName(thisMonth())} (de ${money(expected)} en cuotas)</div></div>
        <div class="stat"><div class="n" style="color:${unpaid.length ? "var(--bad)" : "var(--ok)"}">${unpaid.length}</div><div class="l">cuotas sin pagar</div></div>
        <div class="stat"><div class="n">${cap ? Math.round(used / cap * 100) : 0} %</div><div class="l">ocupación esta semana</div></div></div>
        <div class="card"><h3>Clases más llenas esta semana</h3>${top.length ? top.map(([k, v]) => `<div class="row" style="margin-top:8px"><span class="grow small"><b>${esc(k)}</b></span><span class="small muted">${Math.round(v.n / v.c * 100)} %</span></div><div class="fill" style="max-width:none"><i style="width:${v.n / v.c * 100}%"></i></div>`).join("") : '<p class="empty">Aún no hay datos esta semana.</p>'}</div>
        <div class="card"><h3>Socios por tarifa</h3>${planMix.map(x => `<div class="row" style="margin-top:8px"><span class="grow small"><b>${esc(x.p.name)}</b></span><span class="small muted">${x.n}</span></div><div class="fill" style="max-width:none"><i style="width:${x.n / maxMix * 100}%"></i></div>`).join("")}
          <p class="small muted" style="margin-top:12px">Altas este mes: <b>${newThis}</b> · Bajas: <b>${ath.filter(m => m.status === "baja").length}</b> en total</p></div>
        <div class="card"><h3>Cobros de ${monthName(thisMonth())}</h3>${Object.values(pays).length ? `<div class="list">${Object.values(pays).sort((a, b) => b.at.localeCompare(a.at)).map(p => `<div class="li" style="cursor:default"><span class="grow"><span class="t">${esc(p.name)}</span><br><span class="small muted">${esc(p.concept || "")} · ${esc(p.method)}${p.by === "stripe" ? " · automático" : ""}</span></span><b>${money(p.amount)}</b></div>`).join("")}</div>` : '<p class="empty">Aún no hay cobros este mes.</p>'}</div>`;
    },
    horario(sec) {
      const slots = S.sched.slots.slice();
      sec.innerHTML = `<div class="card"><p class="small muted" style="margin-top:0">Este es el horario de todas las semanas. Para cancelar una clase un día concreto, hazlo desde la pestaña Clases.</p>
        ${DAYS_L.map((dn, d) => `<div class="sched-day"><h4>${dn}</h4>${slots.filter(s => s.d === d).sort((a, b) => a.s.localeCompare(b.s)).map(s => `<button class="li" data-e="${s.id}"><span class="av" style="background:${typeOf(s.type).c};color:#fff">${s.s.slice(0, 2)}</span><span class="grow"><span class="t">${s.s}–${s.e} · ${esc(typeOf(s.type).name)}</span><br><span class="small muted">${s.cap} plazas</span></span>›</button>`).join("") || '<p class="small muted">Sin clases</p>'}
          <button class="btn sm ghost" data-add="${d}">+ Añadir clase el ${dn.toLowerCase()}</button></div>`).join("")}</div>`;
      const edit = (s, isNew) => openDlg(`<h3>${isNew ? "Nueva clase" : "Editar clase"}</h3><form id="sf">
        <label>Día<select id="sD">${DAYS_L.map((n, i) => `<option value="${i}" ${s.d === i ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <div class="grid2"><label>Empieza<input id="sS" type="time" step="300" required value="${s.s}"></label><label>Termina<input id="sE" type="time" step="300" required value="${s.e}"></label></div>
        <div class="grid2"><label>Tipo<select id="sT">${CLASS_TYPES.map(t => `<option value="${t.id}" ${s.type === t.id ? "selected" : ""}>${t.name}</option>`).join("")}</select></label><label>Plazas<input id="sC" type="number" min="1" max="99" required value="${s.cap}"></label></div>
        <div class="err" id="sErr"></div>
        <div class="dlgbtns">${!isNew ? '<button type="button" class="btn danger" id="sDel">Borrar</button>' : ""}<button type="button" class="btn" id="sX">Cancelar</button><button class="btn primary">Guardar</button></div></form>`, () => {
        $("#sX").onclick = closeDlg;
        $("#sDel")?.addEventListener("click", async () => { await safe(() => be.merge("config/schedule", { slots: S.sched.slots.filter(x => x.id !== s.id) })); closeDlg(); });
        $("#sf").onsubmit = async e => { e.preventDefault();
          const n = { id: s.id, d: Number($("#sD").value), s: $("#sS").value, e: $("#sE").value, type: $("#sT").value, cap: Number($("#sC").value) };
          if (n.e <= n.s) { $("#sErr").textContent = "La hora de fin tiene que ser después de la de inicio."; return; }
          await safe(() => be.merge("config/schedule", { slots: isNew ? [...S.sched.slots, n] : S.sched.slots.map(x => x.id === s.id ? n : x) })); closeDlg(); toast("Horario guardado."); };
      });
      sec.querySelectorAll("[data-e]").forEach(b => b.onclick = () => edit(slots.find(s => s.id === b.dataset.e), false));
      sec.querySelectorAll("[data-add]").forEach(b => b.onclick = () => edit({ id: "s" + Date.now().toString(36), d: Number(b.dataset.add), s: "19:00", e: "20:00", type: "crossfit", cap: 14 }, true));
    },
    tarifas(sec) {
      const box = S.box;
      const num = v => v === "" || v == null ? null : Number(v);
      sec.innerHTML = `<form id="tf"><div class="card"><h3>Tarifas mensuales</h3><p class="small muted">Deja en blanco las clases u Open para que sean ilimitadas.</p>
        <div id="pl">${box.plans.map((p, i) => `<div class="plan" data-i="${i}" style="display:block"><div class="grid2"><label>Nombre<input data-k="name" value="${esc(p.name)}" required></label><label>Precio/mes (€)<input data-k="price" type="number" step="0.01" min="0" value="${p.price}" required></label></div>
          <div class="grid2"><label>Clases al mes<input data-k="classes" type="number" min="0" value="${p.classes ?? ""}" placeholder="Ilimitadas"></label><label>Open al mes<input data-k="open" type="number" min="0" value="${p.open ?? ""}" placeholder="Ilimitado"></label></div>
          <button type="button" class="btn sm danger" data-rmp="${i}" style="margin-top:8px">Quitar tarifa</button></div>`).join("")}</div>
        <button type="button" class="btn sm" id="addP">+ Añadir tarifa</button></div>
        <div class="card"><h3>Bonos</h3><div id="ps">${(box.passes || []).map((x, i) => `<div class="plan" data-j="${i}" style="display:block"><div class="grid2"><label>Nombre<input data-k="name" value="${esc(x.name)}" required></label><label>Precio (€)<input data-k="price" type="number" step="0.01" min="0" value="${x.price}" required></label></div><label>Clases que incluye<input data-k="credits" type="number" min="1" value="${x.credits}" required></label></div>`).join("")}</div></div>
        <div class="card"><h3>Normas</h3>
          <div class="grid2"><label>Descuento 6 meses (%)<input id="dS" type="number" min="0" max="50" value="${box.discounts?.semester ?? 0}"></label><label>Descuento anual (%)<input id="dY" type="number" min="0" max="50" value="${box.discounts?.year ?? 0}"></label></div>
          <label>Cancelar hasta (horas antes)<input id="cH" type="number" min="0" max="48" value="${box.cancelHours ?? 2}"></label>
          <div class="grid2"><label>Las reservas se abren (días antes)<input id="oD" type="number" min="0" max="30" value="${box.openDays ?? 2}"></label><label>a las<input id="oT" type="time" step="300" value="${box.openTime || "21:00"}"></label></div>
          <p class="small muted" style="margin:4px 0 0">Ahora: la clase del miércoles se puede reservar desde el lunes a las ${esc(box.openTime || "21:00")}.</p>
          <label class="check" style="margin-top:12px"><input type="checkbox" id="bU" ${box.blockUnpaid !== false ? "checked" : ""}> No dejar reservar si la cuota del mes está sin pagar</label></div>
        <button class="btn primary block">Guardar tarifas y normas</button></form>`;
      const collect = () => ({
        plans: [...sec.querySelectorAll("[data-i]")].map((el, i) => { const g = k => el.querySelector(`[data-k=${k}]`).value; return { id: box.plans[i]?.id || "p" + Date.now().toString(36) + i, name: g("name").trim(), price: Number(g("price")), classes: num(g("classes")), open: num(g("open")) }; }),
        passes: [...sec.querySelectorAll("[data-j]")].map((el, i) => { const g = k => el.querySelector(`[data-k=${k}]`).value; return { id: box.passes[i].id, name: g("name").trim(), price: Number(g("price")), credits: Number(g("credits")) }; })
      });
      $("#addP").onclick = () => { const c = collect(); S.box = { ...box, plans: [...c.plans, { id: "p" + Date.now().toString(36), name: "Nueva tarifa", price: 0, classes: 8, open: 4 }] }; SECS.tarifas(sec); };
      sec.querySelectorAll("[data-rmp]").forEach(b => b.onclick = async () => {
        const p = box.plans[Number(b.dataset.rmp)], n = Object.values(members).filter(m => m.planId === p.id && m.status !== "baja").length;
        if (n) return toast(`${n} socios tienen esta tarifa. Cámbiales la tarifa antes de quitarla.`);
        const c = collect(); c.plans.splice(Number(b.dataset.rmp), 1); S.box = { ...box, plans: c.plans }; SECS.tarifas(sec); });
      $("#tf").onsubmit = async e => { e.preventDefault(); const c = collect();
        await safe(() => be.merge("config/box", { ...c, discounts: { semester: Number($("#dS").value) || 0, year: Number($("#dY").value) || 0 }, cancelHours: Number($("#cH").value), openDays: Number($("#oD").value), openTime: $("#oT").value || "21:00", blockUnpaid: $("#bU").checked }));
        document.activeElement?.blur(); toast("Tarifas guardadas."); };
    },
    avisos(sec) {
      const list = Object.entries(notices).sort((a, b) => b[1].at.localeCompare(a[1].at));
      sec.innerHTML = `<div class="card"><h3>Nuevo aviso</h3><p class="small muted">Los socios lo verán en la pantalla de inicio.</p><form id="nf"><label>Título<input id="nT" required maxlength="80" placeholder="Ej.: El lunes cerramos por fiestas"></label><label>Mensaje<textarea id="nB" maxlength="800" style="min-height:80px"></textarea></label><button class="btn primary">Publicar aviso</button></form></div>
        <div class="card"><h3>Avisos publicados</h3>${list.length ? `<div class="list">${list.map(([id, n]) => `<div class="li" style="cursor:default"><span class="grow"><span class="t">${esc(n.title)}</span><br><span class="small muted">${fmtDay(n.at.slice(0, 10))}</span></span><button class="btn sm danger" data-rmn="${id}">Quitar</button></div>`).join("")}</div>` : '<p class="empty">No hay avisos.</p>'}</div>`;
      $("#nf").onsubmit = async e => { e.preventDefault(); await safe(() => be.add("notices", { title: $("#nT").value.trim(), body: $("#nB").value.trim(), at: new Date().toISOString() })); document.activeElement?.blur(); toast("Aviso publicado."); };
      sec.querySelectorAll("[data-rmn]").forEach(b => b.onclick = () => safe(() => be.del("notices/" + b.dataset.rmn)));
    },
    pruebas(sec) {
      const list = Object.entries(leads).sort((a, b) => (a[1].done ? 1 : 0) - (b[1].done ? 1 : 0) || b[1].at.localeCompare(a[1].at));
      sec.innerHTML = `<div class="card"><h3>Clases de prueba pedidas</h3><p class="small muted">Llegan desde la pantalla de entrada de la app. Comparte el enlace de la app en Instagram para conseguir más.</p>
        ${list.length ? `<div class="list">${list.map(([id, l]) => `<div class="li" style="cursor:default;${l.done ? "opacity:.55" : ""}"><span class="av">${initials(l.name)}</span><span class="grow"><span class="t">${esc(l.name)}</span><br><span class="small muted">${fmtDay(l.at.slice(0, 10))}${l.msg ? " · " + esc(l.msg) : ""}</span><br>
          ${l.email ? `<span class="small sel">${esc(l.email)}</span><br><a class="btn sm" style="margin-top:6px" href="mailto:${esc(l.email)}?subject=${encodeURIComponent("Tu clase de prueba en CrossFit Iruña")}&body=${encodeURIComponent(`¡Hola ${firstName(l.name)}!\n\nGracias por querer probar CrossFit Iruña. ¿Qué día y hora te vienen bien para tu clase de prueba gratis?\n\nEstamos en el Polígono Ipertegui II, 64, Orkoien. Trae ropa cómoda, agua y ganas.\n\n¡Nos vemos en el box!`)}">✉️ Responder por correo</a>` : esc(l.phone || "")}</span>
          <button class="btn sm ${l.done ? "" : "primary"}" data-dn="${id}">${l.done ? "Deshacer" : "✓ Hecho"}</button></div>`).join("")}</div>` : '<p class="empty">Nadie ha pedido clase de prueba todavía.</p>'}</div>`;
      sec.querySelectorAll("[data-dn]").forEach(b => b.onclick = () => safe(() => be.merge("leads/" + b.dataset.dn, { done: !leads[b.dataset.dn].done })));
    }
  };
  queryV("members", [], o => { members = o; membersCache = o; if (boxSec === "resumen") draw(); });
  queryV("payments", [["month", "==", thisMonth()]], o => { pays = o; if (boxSec === "resumen") draw(); });
  queryV("bookings", [["date", ">=", wkStart]], o => { week = o; if (boxSec === "resumen") draw(); });
  queryV("leads", [], o => { leads = o; if (boxSec === "pruebas" || boxSec === "resumen") draw(); });
  queryV("notices", [], o => { notices = o; if (boxSec === "avisos") draw(); });
  return { draw };
};

if ("serviceWorker" in navigator && !DEMO) navigator.serviceWorker.register("sw.js").catch(() => {});
