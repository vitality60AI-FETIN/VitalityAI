import { initializeApp } from "firebase/app";

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

export { app };