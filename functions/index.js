// Pagos con Stripe: el atleta paga desde la app y la cuota se marca como pagada sola.
// Necesita el plan Blaze de Firebase (pago por uso; con el uso de un box suele salir a 0 €) y una cuenta de Stripe del box.
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const Stripe = require("stripe");

admin.initializeApp();
const db = admin.firestore();
const STRIPE_KEY = defineSecret("STRIPE_SECRET_KEY");
const WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const OPTS = { region: "europe-west1" };

const ym = d => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
const cents = n => Math.round(n * 100);
const BOX = "CrossFit Iruña";

async function customerFor(stripe, uid, m) {
  if (m.stripeCustomer) return m.stripeCustomer;
  const c = await stripe.customers.create({ email: m.email, name: m.name, metadata: { uid } });
  await db.doc(`members/${uid}`).set({ stripeCustomer: c.id }, { merge: true });
  return c.id;
}

exports.checkout = onCall({ ...OPTS, secrets: [STRIPE_KEY] }, async req => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Inicia sesión");
  const { kind, id, period, back } = req.data || {};
  if (!/^https:\/\//.test(back || "")) throw new HttpsError("invalid-argument", "back");
  const [ms, bs] = await Promise.all([db.doc(`members/${uid}`).get(), db.doc("config/box").get()]);
  if (!ms.exists) throw new HttpsError("failed-precondition", "Sin ficha de socio");
  const m = ms.data(), box = bs.data() || {};
  const stripe = Stripe(STRIPE_KEY.value());
  const customer = await customerFor(stripe, uid, m);
  const urls = { success_url: `${back}?pago=ok`, cancel_url: `${back}?pago=no`, locale: "es", customer };

  if (kind === "plan") {
    const plan = (box.plans || []).find(p => p.id === id);
    if (!plan) throw new HttpsError("not-found", "Tarifa");
    const months = period === "year" ? 12 : period === "semester" ? 6 : 1;
    const disc = months === 12 ? box.discounts?.year || 0 : months === 6 ? box.discounts?.semester || 0 : 0;
    const meta = { uid, planId: plan.id, planName: plan.name, months: String(months) };
    const s = await stripe.checkout.sessions.create({
      ...urls, mode: "subscription", metadata: meta, subscription_data: { metadata: meta },
      line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: cents(plan.price * months * (100 - disc) / 100),
        product_data: { name: `${plan.name} · ${BOX}` }, recurring: { interval: "month", interval_count: months } } }]
    });
    return { url: s.url };
  }
  if (kind === "pass") {
    const pass = (box.passes || []).find(p => p.id === id);
    if (!pass) throw new HttpsError("not-found", "Bono");
    const s = await stripe.checkout.sessions.create({
      ...urls, mode: "payment", metadata: { uid, kind: "pass", passId: pass.id, passName: pass.name, credits: String(pass.credits) },
      line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: cents(pass.price), product_data: { name: `${pass.name} · ${BOX}` } } }]
    });
    return { url: s.url };
  }
  throw new HttpsError("invalid-argument", "kind");
});

exports.portal = onCall({ ...OPTS, secrets: [STRIPE_KEY] }, async req => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Inicia sesión");
  const m = (await db.doc(`members/${uid}`).get()).data() || {};
  if (!m.stripeCustomer) throw new HttpsError("failed-precondition", "Sin pagos con tarjeta");
  const stripe = Stripe(STRIPE_KEY.value());
  const s = await stripe.billingPortal.sessions.create({ customer: m.stripeCustomer, return_url: req.data?.back, locale: "es" });
  return { url: s.url };
});

// Stripe avisa aquí de cada cobro. Dirección para poner en Stripe → Desarrolladores → Webhooks.
exports.stripeWebhook = onRequest({ ...OPTS, secrets: [STRIPE_KEY, WEBHOOK_SECRET] }, async (req, res) => {
  const stripe = Stripe(STRIPE_KEY.value());
  let ev;
  try { ev = stripe.webhooks.constructEvent(req.rawBody, req.headers["stripe-signature"], WEBHOOK_SECRET.value()); }
  catch (e) { res.status(400).send("firma no válida"); return; }
  const o = ev.data.object;
  const method = types => (types || []).includes("sepa_debit") ? "domiciliación" : "tarjeta";

  if (ev.type === "checkout.session.completed") {
    const md = o.metadata || {};
    if (o.mode === "payment" && md.kind === "pass" && o.payment_status === "paid") {
      const ref = db.doc(`payments/${o.id}`);
      await db.runTransaction(async t => {
        if ((await t.get(ref)).exists) return;
        const mref = db.doc(`members/${md.uid}`), m = (await t.get(mref)).data() || {};
        t.set(ref, { uid: md.uid, name: m.name || "", amount: o.amount_total / 100, method: method(o.payment_method_types), month: ym(new Date()), concept: md.passName, at: new Date().toISOString(), by: "stripe" });
        t.set(mref, { extra: admin.firestore.FieldValue.increment(Number(md.credits) || 0) }, { merge: true });
      });
    }
    if (o.mode === "subscription" && o.subscription) {
      const mref = db.doc(`members/${md.uid}`), m = (await mref.get()).data() || {};
      // Cambio de tarifa: la domiciliación anterior se cancela para no cobrar dos veces.
      if (m.stripeSub && m.stripeSub !== o.subscription) await stripe.subscriptions.cancel(m.stripeSub).catch(() => {});
      await mref.set({ stripeSub: o.subscription, planId: md.planId, status: "active", payIssue: false }, { merge: true });
    }
  }

  if (ev.type === "invoice.paid" && o.amount_paid > 0) {
    const subId = o.subscription || o.parent?.subscription_details?.subscription;
    if (subId) {
      const sub = await stripe.subscriptions.retrieve(subId);
      const md = sub.metadata || {};
      const end = new Date((o.lines?.data?.[0]?.period?.end || Date.now() / 1000) * 1000 - 864e5);
      const start = new Date((o.lines?.data?.[0]?.period?.start || Date.now() / 1000) * 1000);
      const months = Number(md.months) || 1;
      await db.doc(`payments/${o.id}`).set({ uid: md.uid, name: o.customer_name || "", amount: o.amount_paid / 100, method: method(sub.payment_settings?.payment_method_types || [o.payment_settings?.payment_method_types].flat()),
        month: ym(start), concept: md.planName + (months > 1 ? ` · ${months} meses` : ""), at: new Date().toISOString(), by: "stripe" });
      await db.doc(`members/${md.uid}`).set({ paidUntil: ym(end), planId: md.planId, status: "active", payIssue: false }, { merge: true });
    }
  }

  if (ev.type === "invoice.payment_failed") {
    const subId = o.subscription || o.parent?.subscription_details?.subscription;
    if (subId) { const sub = await stripe.subscriptions.retrieve(subId); if (sub.metadata?.uid) await db.doc(`members/${sub.metadata.uid}`).set({ payIssue: true }, { merge: true }); }
  }

  if (ev.type === "customer.subscription.deleted" && o.metadata?.uid) {
    const mref = db.doc(`members/${o.metadata.uid}`), m = (await mref.get()).data() || {};
    if (m.stripeSub === o.id) await mref.set({ stripeSub: null }, { merge: true });
  }
  res.json({ received: true });
});

// ---------- Correo con cada reserva ----------
// Se envía con una cuenta de correo del box (por ejemplo Gmail con una "contraseña de aplicación").
// El socio puede desactivarlo en Cuota → Mis datos. La región tiene que ser la misma que la de Firestore.
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const nodemailer = require("nodemailer");
const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");
const DB_OPTS = { region: process.env.FIRESTORE_REGION || "europe-southwest1", secrets: [SMTP_USER, SMTP_PASS] };
const APP_URL = process.env.APP_URL || "";
const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dayTxt = ymd => { const [y, m, d] = ymd.split("-").map(Number); const dt = new Date(Date.UTC(y, m - 1, d)); return `${DAYS[dt.getUTCDay()]} ${d} de ${MONTHS[m - 1]}`; };
const icsTime = (ymd, hm) => ymd.replace(/-/g, "") + "T" + hm.replace(":", "") + "00";

async function bookingMail(b, kind, pos) {
  const [ms, ss, bs] = await Promise.all([db.doc(`members/${b.uid}`).get(), db.doc("config/schedule").get(), db.doc("config/box").get()]);
  const m = ms.data();
  if (!m?.email || m.mailBookings === false) return;
  const slot = (ss.data()?.slots || []).find(s => s.id === b.slotId) || { s: b.s, e: b.s };
  const box = bs.data() || {};
  const TYPES = { crossfit: "CrossFit", halter: "Halterofilia", gim: "Gimnásticos", endurance: "Endurance", kids: "Kids", open: "Open", outdoor: "Open Outdoor" };
  const cls = `${TYPES[b.type] || "Clase"} · ${dayTxt(b.date)} de ${slot.s} a ${slot.e}`;
  const subject = kind === "in" ? `Reserva confirmada: ${cls}` : kind === "wait" ? `En lista de espera (${pos}º): ${cls}` : `¡Has entrado en la clase! ${cls}`;
  const lead = kind === "in" ? "Tienes tu plaza reservada." : kind === "wait" ? `La clase está llena y estás el <b>${pos}º</b> en la lista de espera. Si alguien cancela, entras automáticamente y te avisamos.` : "Se ha liberado una plaza y ya estás dentro de la clase.";
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1B0D10">
    <div style="background:#4A1019;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0;font-size:20px;font-weight:bold">${esc(BOX)}</div>
    <div style="border:1px solid #eadfe1;border-top:0;padding:22px;border-radius:0 0 12px 12px">
      <p style="font-size:17px;margin:0 0 12px">¡Aupa, ${esc(String(m.name || "").split(" ")[0])}! ${lead}</p>
      <p style="font-size:20px;font-weight:bold;margin:0 0 12px;color:#4A1019">${esc(cls)}</p>
      <p style="margin:0 0 16px;color:#5A4247">Puedes cancelar hasta ${box.cancelHours ?? 2} h antes desde la app.</p>
      ${APP_URL ? `<a href="${APP_URL}" style="display:inline-block;background:#4A1019;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold">Abrir la app</a>` : ""}
      <p style="font-size:12px;color:#8A7F82;margin-top:22px">Si no quieres recibir estos correos, desactívalo en la app: Cuota → Mis datos.</p></div></div>`;
  const ics = kind === "wait" ? null : ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CrossFit Iruna//App//ES", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${b.date}-${b.slotId}-${b.uid}@crossfit-iruna`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=Europe/Madrid:${icsTime(b.date, slot.s)}`, `DTEND;TZID=Europe/Madrid:${icsTime(b.date, slot.e)}`,
    `SUMMARY:${TYPES[b.type] || "Clase"} en ${BOX}`, "LOCATION:CrossFit Iruña, Orkoien", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const t = nodemailer.createTransport({ host: process.env.SMTP_HOST || "smtp.gmail.com", port: 465, secure: true, auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() } });
  await t.sendMail({ from: `"${BOX}" <${SMTP_USER.value()}>`, to: m.email, subject, html,
    ...(ics ? { attachments: [{ filename: "clase.ics", content: ics, contentType: "text/calendar; charset=utf-8" }] } : {}) });
}

exports.bookingCreated = onDocumentCreated({ ...DB_OPTS, document: "bookings/{id}" }, async ev => {
  const b = ev.data?.data(); if (!b) return;
  let pos = 0;
  if (b.wait) { const q = await db.collection("bookings").where("date", "==", b.date).where("slotId", "==", b.slotId).where("wait", "==", true).get(); pos = q.size; }
  await bookingMail(b, b.wait ? "wait" : "in", pos).catch(e => console.error("mail", e.message));
});
exports.bookingPromoted = onDocumentUpdated({ ...DB_OPTS, document: "bookings/{id}" }, async ev => {
  const a = ev.data.before.data(), b = ev.data.after.data();
  if (a?.wait && b && !b.wait) await bookingMail(b, "promoted").catch(e => console.error("mail", e.message));
});
