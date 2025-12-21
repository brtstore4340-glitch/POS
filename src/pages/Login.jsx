import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();

  const from = location.state?.from?.pathname || "/dashboard";

  function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    // ✅ โหมดชั่วคราว: ให้ “ล็อกอินผ่าน” โดยไม่ต้อง Firebase ก่อน
    // เอาไว้ยืนยันว่า route/PrivateRoute ทำงาน
    if (!email || !password) {
      setMsg("กรุณากรอก Email และ Password");
      return;
    }

    setUser({ email }); // mock user
    navigate(from, { replace: true });
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 24 }}>
      <h2 style={{ marginBottom: 12 }}>Login</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            style={{ padding: 10 }}
            autoComplete="username"
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            style={{ padding: 10 }}
            autoComplete="current-password"
          />
        </label>

        <button type="submit" style={{ padding: 10, cursor: "pointer" }}>
          Login
        </button>

        {msg ? <div style={{ color: "crimson" }}>{msg}</div> : null}

        <div style={{ fontSize: 13, opacity: 0.8 }}>
          ทดสอบ routing: ล็อกอินแล้วจะไป <b>{from}</b>
          <br />
          <Link to="/change-password">Change Password</Link>
        </div>
      </form>
    </div>
  );
}
