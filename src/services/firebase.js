import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, writeBatch, serverTimestamp, getDoc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAJ8IOa8sK640qYEGSqJQpvwjOBfRFxXKA",
    authDomain: "boots-thailand-pos-project.firebaseapp.com",
    projectId: "boots-thailand-pos-project",
    storageBucket: "boots-thailand-pos-project.firebasestorage.app",
    messagingSenderId: "596081819830",
    appId: "1:596081819830:web:f4f2bac7790803b8606617",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth, collection, doc, writeBatch, serverTimestamp, getDoc, setDoc, getDocs, orderBy, query, where };
