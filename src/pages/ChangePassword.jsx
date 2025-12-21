// src/components/ChangePassword.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // แก้ Path
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase'; // แก้ Path
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      return setError('รหัสผ่านใหม่ไม่ตรงกัน');
    }
    if (formData.newPassword.length < 6) {
      return setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
    }

    setLoading(true);
    try {
      // 1. Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, formData.currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // 2. Update Password
      await updatePassword(user, formData.newPassword);
      
      // 3. Update Firestore status
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        mustChangePassword: false,
        lastPasswordChange: new Date().toISOString()
      });
      
      setSuccess('เปลี่ยนรหัสผ่านสำเร็จ! กำลังกลับสู่หน้าหลัก...');
      setTimeout(() => navigate('/dashboard'), 2000);
      
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/wrong-password') {
        setError('รหัสผ่านปัจจุบันไม่ถูกต้อง');
      } else {
        setError('เกิดข้อผิดพลาด: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-100">
        <h2 className="text-2xl font-bold text-center mb-6 text-slate-800">เปลี่ยนรหัสผ่าน</h2>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200">{error}</div>}
        {success && <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm border border-green-200">{success}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่านปัจจุบัน</label>
            <input
              name="currentPassword"
              type="password"
              required
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่านใหม่</label>
            <input
              name="newPassword"
              type="password"
              required
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
            <input
              name="confirmPassword"
              type="password"
              required
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium mt-2"
          >
            {loading ? 'กำลังดำเนินการ...' : 'บันทึกรหัสผ่าน'}
          </button>
        </form>
      </div>
    </div>
  );
}