import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, AlertCircle, HelpCircle } from 'lucide-react';

const Login = () => {
    const { login, changeFirstTimePassword, mustChangePassword } = useAuth();

    // Login State
    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');

    // Change Password State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Reset Password State
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetEmployeeId, setResetEmployeeId] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [resetNewPassword, setResetNewPassword] = useState('');
    const [resetConfirmPassword, setResetConfirmPassword] = useState('');

    // UI State
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Security Questions
    const SECURITY_QUESTIONS = [
        { id: 1, question: 'What is your favorite color?', answer: 'blue' },
        { id: 2, question: 'What is your mother\'s name?', answer: 'mom' },
        { id: 3, question: 'What city were you born in?', answer: 'bangkok' },
        { id: 4, question: 'What is your pet\'s name?', answer: 'pet' }
    ];

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(employeeId, password);
        } catch (err) {
            console.error(err);
            setError('Failed to login. Please check Employee ID and Password.');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await changeFirstTimePassword(newPassword);
            // Success will automatically update auth state in context
        } catch (err) {
            console.error(err);
            setError('Failed to update password. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        // Validation
        if (!resetEmployeeId.trim()) {
            setError('Please enter Employee ID.');
            return;
        }

        if (!securityAnswer.trim()) {
            setError('Please answer the security question.');
            return;
        }

        if (resetNewPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (resetNewPassword !== resetConfirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        // Verify security answer (case-insensitive)
        const currentQuestion = SECURITY_QUESTIONS[0]; // For demo, use first question
        if (securityAnswer.trim().toLowerCase() !== currentQuestion.answer.toLowerCase()) {
            setError('Incorrect answer to security question. Please try again.');
            return;
        }

        setLoading(true);
        try {
            // In a real app, this would call an API to reset the password
            // For now, we'll just show success message
            setSuccessMessage('✓ Password reset successful! Please log in with your new password.');
            
            // Reset form
            setTimeout(() => {
                setShowResetModal(false);
                setResetEmployeeId('');
                setSecurityAnswer('');
                setResetNewPassword('');
                setResetConfirmPassword('');
                setSuccessMessage('');
            }, 2000);
        } catch (err) {
            console.error(err);
            setError('Failed to reset password. Try again.');
        } finally {
            setLoading(false);
        }
    };

    // 1. Initial Password Change View
    // We check mustChangePassword from context (which is populated after successful login)
    // BUT the App router usually redirects. 
    // Wait, if mustChangePassword is TRUE, we should likely block access to the rest of the app.
    // This Logic is best handled inside App.jsx or here. 
    // Assuming App.jsx renders <Login /> if !user.
    // If user && mustChangePassword, we might still want to show this screen overlaid or as a dedicated route.
    // For simplicity, let's assume this component handles BOTH the initial login AND the "Change Password" 
    // state if it's rendered. Ideally, App.jsx controls this.

    // However, `login` function sets the user. 
    // If the user IS logged in but `mustChangePassword` is true, 
    // App.jsx will likely need to pass a prop or render this component specifically.
    // Let's design this component to be reusable for both:
    // - Mode "login" (default)
    // - Mode "change_password" (passed via prop or determined by context if we are already logged in)

    // Actually, if we are NOT logged in, we show Login form.
    // If we ARE logged in but `mustChangePassword` is true, we show Change Password form.

    const { user } = useAuth();

    // Reset Password Modal
    if (showResetModal) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
                    <div className="text-center mb-8">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <HelpCircle className="w-6 h-6 text-amber-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
                        <p className="text-slate-500 mt-2 text-sm">Answer security question to reset password</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-600 text-sm">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-lg flex items-center gap-3 text-green-600 text-sm">
                            {successMessage}
                        </div>
                    )}

                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Employee ID</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    value={resetEmployeeId}
                                    onChange={(e) => setResetEmployeeId(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    placeholder="Enter your Employee ID"
                                    required
                                />
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <p className="text-sm text-slate-700 font-medium mb-2">Security Question:</p>
                            <p className="text-sm text-slate-600 mb-3">{SECURITY_QUESTIONS[0].question}</p>
                            <input
                                type="text"
                                value={securityAnswer}
                                onChange={(e) => setSecurityAnswer(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                placeholder="Your answer"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">New Password (Min 6 chars)</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="password"
                                    value={resetNewPassword}
                                    onChange={(e) => setResetNewPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    placeholder="New password"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="password"
                                    value={resetConfirmPassword}
                                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    placeholder="Confirm password"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowResetModal(false)}
                                className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    if (user && mustChangePassword) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-slate-900">Setup New Password</h1>
                        <p className="text-slate-500 mt-2">First time login requires a password change.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-600 text-sm">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleChangePassword} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">New Password (Min 6 chars)</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="Enter new password"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="Confirm new password"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Fallback: If logged in & no pswd change needed, we shouldn't be here (App.jsx handles redirect).
    // But if we are NOT logged in:
    if (!user) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
                            <span className="text-2xl font-bold text-white">B</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Boots POS Login</h1>
                        <p className="text-slate-500 mt-2">Enter your Employee ID to continue</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-600 text-sm">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Employee ID</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    value={employeeId}
                                    onChange={(e) => setEmployeeId(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="e.g. 6705067"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="Enter password"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowResetModal(true)}
                            className="w-full py-2 text-center text-blue-600 hover:text-blue-700 font-medium text-sm transition-all"
                        >
                            Forgot Password?
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return null; // Should not reach here
};

export default Login;
