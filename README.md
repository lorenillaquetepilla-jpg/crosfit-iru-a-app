# CrossFit Iruña · app del box

App web instalable (PWA) para CrossFit Iruña: reservas con lista de espera, WOD con pizarra y "choca esos cinco", panel del atleta con marcas personales (con vídeo de YouTube), ranking por ejercicio y muro para picarse, catálogo de la tienda, cuotas y bonos con pago online, y panel del dueño (socios, cobros, horario, tarifas, avisos, clases de prueba y competiciones con inscripción y clasificación).

- Sin configurar Firebase (`firebase-config.js` con `PEGA_AQUI`) funciona en **modo demostración** con datos de ejemplo.
- Alojamiento: GitHub Pages (gratis). Datos y usuarios: Firebase. Pagos: Stripe.

## Puesta en marcha
1. Crear un proyecto en https://console.firebase.google.com (a nombre del box).
2. Añadir una app web (`</>`) y copiar `firebaseConfig` en `firebase-config.js`.
3. Authentication → Correo electrónico/contraseña → Habilitar. Añadir el dominio de GitHub Pages en Dominios autorizados.
4. Firestore → Crear base de datos (europe-west) → pegar `firestore.rules` en Reglas → Publicar.
5. Abrir la app, crear cuenta y pulsar «Configurar CrossFit Iruña»: esa cuenta queda como dueño.

## Pagos con Stripe (opcional)
Necesita el plan Blaze de Firebase (pago por uso; para un box suele salir a 0 €) y una cuenta de Stripe del box.
1. `firebase functions:secrets:set STRIPE_SECRET_KEY` (clave secreta de Stripe).
2. `firebase deploy --only functions`.
3. En Stripe → Desarrolladores → Webhooks: añadir la dirección de la función `stripeWebhook` con los eventos `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, y guardar su secreto con `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET` (y volver a desplegar).
4. En Stripe → Configuración → Métodos de pago: activar tarjeta y adeudo directo SEPA. Activar el portal de clientes.
5. Poner `stripe: true` en `firebase-config.js`.

## Correo con cada reserva (opcional)
También necesita el plan Blaze. Usa una cuenta de correo del box (por ejemplo Gmail con una "contraseña de aplicación").
1. `firebase functions:secrets:set SMTP_USER` (el correo) y `firebase functions:secrets:set SMTP_PASS` (la contraseña de aplicación).
2. En `functions/.env` poner `APP_URL=https://…` (la dirección de la app) y, si Firestore no está en Madrid, `FIRESTORE_REGION=` con su región.
3. `firebase deploy --only functions`.
Cada socio puede desactivar los correos en Cuota → Mis datos.

Sin Stripe, el dueño apunta los pagos (Bizum, efectivo…) desde la ficha de cada socio.

## Roles
- **Dueño** (`admin`): todo, incluidos cobros, tarifas, horario y tienda.
- **Coach** (`coach`): clases, asistencia, WOD y altas de socios.
- **Atleta** (`athlete`): reserva, apunta resultados y marcas, ve la tienda y paga su cuota.
