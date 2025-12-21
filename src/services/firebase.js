import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, writeBatch, serverTimestamp, getDoc, setDoc, getDocs, query, where, orderBy, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ใช้ Environment Variables ที่เราตั้งค่าไว้
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate Firebase configuration
const requiredConfigKeys = ['apiKey', 'authDomain', 'projectId'];
const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
    const errorMsg = `Firebase Configuration Error: Missing required keys: ${missingKeys.join(', ')}. Please check your .env.local file or GitHub Secrets.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth, collection, doc, writeBatch, serverTimestamp, getDoc, setDoc, getDocs, orderBy, query, where, addDoc };

