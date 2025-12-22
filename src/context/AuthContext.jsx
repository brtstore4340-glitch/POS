// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { APP_CONFIG } from "../config/constants";

const AuthContext = createContext(null);

// ✅ Named export (แก้ error: does not provide an export named 'useAuth')
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'admin' | 'user'
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Auto-logout Timer
  const logoutTimerRef = useRef(null);
  const INACTIVITY_LIMIT = APP_CONFIG?.INACTIVITY_TIMEOUT_MS ?? 30 * 60 * 1000;

  // employeeId -> synthetic email
  const getEmailFromId = (employeeIdRaw) => {
    const employeeId = String(employeeIdRaw ?? "").trim().replace(/\s+/g, "");
    const domain = String(APP_CONFIG?.SYNTHETIC_EMAIL_DOMAIN ?? "")
      .trim()
      .replace(/^@+/, ""); // remove leading "@"
    return `${employeeId}@${domain}`;
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setRole(null);
      setMustChangePassword(false);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const login = async (employeeId, password) => {
    const email = getEmailFromId(employeeId);
    // debug: check actual email used
    console.log("LOGIN EMAIL =>", email);
    return await signInWithEmailAndPassword(auth, email, password);
  };

  const reauthenticate = async (currentPassword) => {
    if (!auth.currentUser) throw new Error("No user logged in");
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    return await reauthenticateWithCredential(auth.currentUser, credential);
  };

  const changeFirstTimePassword = async (newPassword) => {
    if (!auth.currentUser) throw new Error("No user logged in");

    await updatePassword(auth.currentUser, newPassword);

    const userRef = doc(db, "users", auth.currentUser.uid);
    await setDoc(
      userRef,
      { mustChangePassword: false, updatedAt: serverTimestamp() },
      { merge: true }
    );

    setMustChangePassword(false);
  };

  // Auto-logout Logic
  const resetTimer = () => {
    if (!auth.currentUser) return;
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

    logoutTimerRef.current = setTimeout(() => {
      console.log("Auto-logout due to inactivity");
      logout();
    }, INACTIVITY_LIMIT);
  };

  // Listen auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true);

        if (!firebaseUser) {
          setUser(null);
          setRole(null);
          setMustChangePassword(false);
          return;
        }

        setUser(firebaseUser);

        // Load profile from Firestore (role + mustChangePassword)
        const userRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data() || {};
          setRole(data.role ?? "user");
          setMustChangePassword(!!data.mustChangePassword);
        } else {
          // Create default profile doc if missing
          await setDoc(
            userRef,
            {
              role: "user",
              mustChangePassword: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          setRole("user");
          setMustChangePassword(false);
        }
      } catch (e) {
        console.error("AuthContext init failed:", e);
        setRole(null);
        setMustChangePassword(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inactivity listeners
  useEffect(() => {
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    const handle = () => resetTimer();

    if (user) {
      events.forEach((evt) => window.addEventListener(evt, handle));
      resetTimer();
    }

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handle));
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      role,
      loading,
      mustChangePassword,
      login,
      logout,
      reauthenticate,
      changeFirstTimePassword,
      resetTimer,
      getEmailFromId, // เผื่อหน้าอื่นอยากใช้
    }),
    [user, role, loading, mustChangePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
