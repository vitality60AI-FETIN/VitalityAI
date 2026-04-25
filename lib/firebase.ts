import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // <-- Adicionamos esta linha

const firebaseConfig = {
  apiKey: "AIzaSyDfpG9iftVfznj34eQaPKnRfipOpnVumuE",
  authDomain: "vitality60ai.firebaseapp.com",
  projectId: "vitality60ai",
  storageBucket: "vitality60ai.firebasestorage.app",
  messagingSenderId: "1064467932371",
  appId: "1:1064467932371:web:06012529af1c9975476026",
  measurementId: "G-P7WXRXHL6T"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // <-- Inicializamos o banco de dados

export { app, auth, db }; // <-- Exportamos o db para usar nas telas