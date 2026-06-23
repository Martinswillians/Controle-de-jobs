import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyApuDKWvCZbdxRLUfFNYROJBiNaD3UQb5A",
  authDomain: "controle-de-job-39845.firebaseapp.com",
  projectId: "controle-de-job-39845",
  storageBucket: "controle-de-job-39845.firebasestorage.app",
  messagingSenderId: "929043876594",
  appId: "1:929043876594:web:efdda64235bb60f029de6b",
  measurementId: "G-4HDC230VCF"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
