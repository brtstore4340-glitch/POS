import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PosProvider } from "./context/PosContext";
import Login from "./components/Login";
import ResetPassword from "./components/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  const basename = import.meta.env.DEV ? "/" : "/POS";

  return (
    <Router basename={basename}>
      <AuthProvider>
        <PosProvider>
          {/* กันหน้าโล่งกรณี Provider ทำงานแต่ยังไม่เข้า route */}
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route
              path="/change-password"
              element={
                <PrivateRoute>
                  <ChangePassword />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />

            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </PosProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
