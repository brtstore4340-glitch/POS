// src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // แก้เป็น ../context (ไม่มี s)
import LoadingScreen from './LoadingScreen'; // เปลี่ยนจาก LoadingSpinner เป็น LoadingScreen

export default function PrivateRoute({ children }) {
  const { user, loading, mustChangePassword } = useAuth(); // ใช้ user แทน currentUser ให้ตรงกับ AuthContext
  const location = useLocation();

  if (loading) {
    return <LoadingScreen isLoading={true} />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}