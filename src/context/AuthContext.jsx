// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { APP_CONFIG } from '../config/constants';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null); // 'admin' | 'user'
    const [loading, setLoading] = useState(true);
    const [mustChangePassword, setMustChangePassword] = useState(false);

    // Auto-logout Timer
    const logoutTimerRef = useRef(null);
    const INACTIVITY_LIMIT = APP_CONFIG.INACTIVITY_TIMEOUT_MS;

    // Helper: Convert Employee ID to Synthetic Email
    const getEmailFromId = (employeeId) => `${employeeId}@${APP_CONFIG.SYNTHETIC_EMAIL_DOMAIN}`;

    const login = async (employeeId, password) => {
        const email = getEmailFromId(employeeId);
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            return result;
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setRole(null);
            if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    // เพิ่มฟังก์ชัน Reauthenticate (จำเป็นสำหรับการเปลี่ยนรหัสผ่าน)
    const reauthenticate = async (currentPassword) => {
        if (!user) throw new Error("No user logged in");
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        return await reauthenticateWithCredential(user, credential);
    };

    const changeFirstTimePassword = async (newPassword) => {
        if (!auth.currentUser) throw new Error("No user logged in");

        await updatePassword(auth.currentUser, newPassword);

        // Update Firestore to indicate password has been changed
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, { mustChangePassword: false }, { merge: true });

        setMustChangePassword(false);
    };

    // Auto-logout Logic
    const resetTimer = () => {
        if (!user) return;
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

        logoutTimerRef.current = setTimeout(() => {
            console.log("Auto-logout due to inactivity");
            logout();
        }, INACTIVITY_LIMIT);
    };

    useEffect(() => {
        // Listen for activity
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        const handleActivity = () => resetTimer();

        if (user) {
            events.forEach(event => window.addEventListener(event, handleActivity));
            resetTimer(); // Start timer on login
        }

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        };
    }, [user]);
}
