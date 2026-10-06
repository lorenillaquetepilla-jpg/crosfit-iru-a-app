# Pruebas de seguridad

Con el simulador de Firebase (necesita Java):

- Reglas de la base de datos: `npm i -D firebase-tools @firebase/rules-unit-testing firebase` y
  `npx firebase emulators:exec --only firestore "node tests/rules.test.mjs"` (puerto 8089).
- Reservas en el servidor: `npx firebase emulators:exec --only firestore,functions,auth "node tests/book.test.cjs"`
  (con `functions/.secret.local` con valores de prueba y `SMTP_USER=none`).
