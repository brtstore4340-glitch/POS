import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
    getFirestore, serverTimestamp,
    doc, getDoc, setDoc,
    collection, writeBatch
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

/**
 * IMPORTANT:
 * - Firebase config “ไม่ใช่ secret” แต่ควรล็อก Firestore Rules ให้ดี
 * - ถ้าพี่ไม่อยาก commit config ให้ทำไฟล์ config.local.js แล้ว .gitignore
 */
// Firebase Configuration (Vite)

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const fb = {
    serverTimestamp,
    doc,
    getDoc,
    setDoc,
    collection,
    writeBatch,
    signInAnonymously,
    onAuthStateChanged,
};
