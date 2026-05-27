import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyBE1rglgI3WDtNiZJR8DAh8OAkuN6UArKk",
    authDomain: "ecolia-39cd6.firebaseapp.com",
    projectId: "ecolia-39cd6",
    storageBucket: "ecolia-39cd6.firebasestorage.app",
    messagingSenderId: "802116173543",
    appId: "1:802116173543:web:dc85ef65a812c4ade06c42",
    measurementId: "G-X0K8WTK90J"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export { onAuthStateChanged };