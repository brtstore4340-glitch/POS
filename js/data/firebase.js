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
const firebaseConfig = {
    apiKey: "AIzaSyAJ8IOa8sK640qYEGSqJQpvwjOBfRFxXKA",
    authDomain: "boots-thailand-pos-project.firebaseapp.com",
    projectId: "boots-thailand-pos-project",
    storageBucket: "boots-thailand-pos-project.firebasestorage.app",
    messagingSenderId: "596081819830",
    appId: "1:596081819830:web:f4f2bac7790803b8606617",
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
