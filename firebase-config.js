// Pega aquí el objeto firebaseConfig del proyecto de Firebase del box (ver README).
// Mientras ponga PEGA_AQUI la app funciona en modo demostración, con datos de ejemplo guardados en el navegador.
// Estos datos no son secretos: la seguridad la ponen las reglas (firestore.rules).
export default {
  apiKey: "PEGA_AQUI",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  // Ponlo a true cuando estén desplegadas las funciones de pago (carpeta functions/).
  stripe: false,
  functionsRegion: "europe-west1"
};
