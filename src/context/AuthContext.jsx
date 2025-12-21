import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { APP_CONFIG } from '../config/constants';

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  
  // Inactivity tracking
  const inactivityTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();
    
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    if (user) {
      inactivityTimerRef.current = setTimeout(() => {
        console.log('Auto-logout due to inactivity');
        logout();
      }, APP_CONFIG.INACTIVITY_TIMEOUT_MS);
    }
  };

  // Setup activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetInactivityTimer);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
      });
      
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [user]);

  // Monitor auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setRole(userData.role || 'user');
            setMustChangePassword(userData.mustChangePassword || false);
          } else {
            // User exists in Auth but not in Firestore - set defaults
            setRole('user');
            setMustChangePassword(false);
          }
          
          setUser(currentUser);
          resetInactivityTimer();
        } else {
          setUser(null);
          setRole(null);
          setMustChangePassword(false);
        }
      } catch (error) {
        console.error("Auth Error:", error);
        // If error fetching user data, still set the user but with default role
        setUser(currentUser);
        setRole('user');
        setMustChangePassword(false);
      } finally {
        // Critical: Always stop loading
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Login function
  const login = async (employeeId, password) => {
    try {
      const email = `${employeeId}@${APP_CONFIG.SYNTHETIC_EMAIL_DOMAIN}`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Fetch user data to check password change requirement
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setMustChangePassword(userData.mustChangePassword || false);
      }
      
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value = {
    user,
    role,
    loading,
    mustChangePassword,
    login,
    logout,
    currentUser: user, // Alias for compatibility
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};