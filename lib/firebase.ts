// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDfpG9iftVfznj34eQaPKnRfipOpnVumuE",
  authDomain: "vitality60ai.firebaseapp.com",
  projectId: "vitality60ai",
  storageBucket: "vitality60ai.firebasestorage.app",
  messagingSenderId: "1064467932371",
  appId: "1:1064467932371:web:06012529af1c9975476026",
  measurementId: "G-P7WXRXHL6T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);