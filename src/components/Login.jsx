// Login Page Component
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';

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
      const email = `${formData.employeeId}@boots-pos.local`;
      await login(email, formData.password);
      
      // Check if password change is required
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
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your employee credentials
          </p>
        </div>
        
        {message && (
          <Alert variant="error" message={message} />
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700">
                Employee ID
              </label>
              <Input
                id="employeeId"
                name="employeeId"
                type="text"
                value={formData.employeeId}
                onChange={handleChange}
                error={errors.employeeId}
                disabled={loading}
                placeholder="Enter your employee ID"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                disabled={loading}
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              loading={loading}
              className="w-full"
              disabled={loading}
            >
              Sign in
            </Button>
          </div>
          
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/reset-password')}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Forgot Password?
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
