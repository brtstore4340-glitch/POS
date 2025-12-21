// Login Page Component
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [formData, setFormData] = useState({
    employeeId: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [currentUser, navigate, location]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.employeeId.trim()) {
      newErrors.employeeId = 'Employee ID is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setMessage('');
    setErrors({});
    
    try {
      await login(formData.employeeId, formData.password);
      
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
      
    } catch (error) {
      console.error('Login error:', error);
      
      switch (error.code) {
        case 'auth/user-not-found':
          setErrors({ employeeId: 'Invalid employee ID' });
          break;
        case 'auth/wrong-password':
          setErrors({ password: 'Incorrect password' });
          break;
        case 'auth/too-many-requests':
          setMessage('Too many failed attempts. Please try again later.');
          break;
        default:
          setMessage('Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Sign in to Boots POS</h2>
          <p className="mt-2 text-sm text-gray-600">Enter your employee credentials</p>
        </div>
        
        {message && (
          <div className="bg-blue-50 border border-blue-200 text-blue-600 px-4 py-3 rounded-lg text-sm" role="alert">
            {message}
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700">Employee ID</label>
              <input
                id="employeeId"
                name="employeeId"
                type="text"
                autoComplete="username"
                required
                className={`mt-1 block w-full px-3 py-2 border ${errors.employeeId ? 'border-red-300 text-red-900' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="Enter your employee ID"
                value={formData.employeeId}
                onChange={handleChange}
              />
              {errors.employeeId && <p className="mt-2 text-sm text-red-600">{errors.employeeId}</p>}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`mt-1 block w-full px-3 py-2 border ${errors.password ? 'border-red-300 text-red-900' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password}</p>}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/reset-password')}
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              Forgot Password?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
