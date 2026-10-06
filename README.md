# CrossFit Iruña · app del box

App web instalable (PWA) para CrossFit Iruña: reservas con lista de espera, WOD con pizarra y "choca esos cinco", panel del atleta con marcas personales (con vídeo de YouTube), ranking por ejercicio y muro para picarse, catálogo de la tienda, cuotas y bonos con pago online, y panel del dueño (socios, cobros, horario, tarifas, avisos, clases de prueba y competiciones con inscripción y clasificación).

- Sin configurar Firebase (`firebase-config.js` con `PEGA_AQUI`) funciona en **modo demostración** con datos de ejemplo.
- Alojamiento: GitHub Pages (gratis). Datos y usuarios: Firebase. Pagos: Stripe.

## Puesta en marcha
1. Crear un proyecto en https://console.firebase.google.com (a nombre del box) y pasarlo al plan **Blaze** (las reservas, los cobros y los correos se hacen en el servidor; con el uso de un box suele salir a 0 €).
2. Añadir una app web (`</>`) y copiar `firebaseConfig` en `firebase-config.js`.
3. Authentication → Correo electrónico/contraseña → Habilitar. Añadir el dominio de la app en Dominios autorizados.
4. En `firestore.rules`, cambiar `PON_AQUI_EL_CORREO_DEL_DUENO` por el correo del dueño. Solo esa cuenta, con el correo confirmado, puede configurar la app la primera vez.
5. Firestore → Crear base de datos (Madrid, `europe-southwest1`) → `firebase deploy --only firestore:rules`.
6. En `functions/.env` poner `APP_URL=https://…` (la dirección exacta de la app) y desplegar: `firebase deploy --only functions`.
7. Abrir la app con el correo del dueño, crear cuenta, confirmar el correo y pulsar «Configurar CrossFit Iruña».

## Seguridad
- Cada socio solo ve sus datos (ficha, pagos, medidas). Los coaches ven las fichas de los socios; las cuotas y los cobros, solo el dueño.
- Las reservas las hace el servidor (función `book`), que comprueba cuota pagada, clases de la tarifa, bonos, hora de apertura, límite diario y plazas. Un socio solo puede cancelar la suya y antes del plazo; la lista de espera la mueve el servidor.
- Nadie puede ponerse una tarifa, marcarse como pagado, darse bonos ni cambiarse el rol: eso solo lo hacen el dueño o Stripe.
- Las tarjetas nunca pasan por la app: se meten en la página segura de Stripe. Los avisos de Stripe se aceptan solo con su firma.
- Los socios importados de Aimharder tienen que confirmar su correo antes de entrar con su tarifa.
- Las reglas se pueden probar con el simulador de Firebase (`firebase emulators:start`).
- Recomendado: activar App Check (reCAPTCHA) para frenar envíos masivos de solicitudes de clase de prueba.

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
