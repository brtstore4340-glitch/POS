// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; // เพิ่ม Navigate
import { AuthProvider } from './context/AuthContext'; // แก้ Path ให้ถูก (ใน code เดิมเป็น contexts แต่ใน file structure เป็น context)
import PrivateRoute from './components/PrivateRoute';
import Login from './components/Login'; // แก้ Path จาก pages เป็น components ตาม file structure
import ChangePassword from './components/ChangePassword';
// import Dashboard from './pages/Dashboard'; // สมมติว่า Dashboard คือ PosTerminal หรือ Layout หลัก
import PosTerminal from './components/PosTerminal'; // ผมเปลี่ยนเป็น Component หลักที่มีอยู่จริง
import NotFound from './components/LoadingScreen'; // ใช้ Loading แทน NotFound ชั่วคราวหรือสร้างใหม่

function App() {
  return (
    <Router basename="/POS"> {/* เพิ่ม basename ให้ตรงกับ vite.config.js */}
      <AuthProvider>
        <div className="App min-h-screen bg-slate-50 text-slate-900 font-sans">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ChangePassword />} />
            
            {/* Private Routes */}
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                   {/* ใช้ PosTerminal เป็นหน้าหลัก */}
                  <PosTerminal />
                </PrivateRoute>
              } 
            />
            
            {/* Root Route - Redirect to Dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* 404 Route */}
            <Route path="*" element={<div className="p-10 text-center">404 Not Found</div>} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;