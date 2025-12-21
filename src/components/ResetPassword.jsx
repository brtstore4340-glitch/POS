// Reset Password Component with Security Questions
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { fetchSecurityQuestions, verifySecurityAnswer } from '../services/securityService';
import { APP_CONFIG } from '../config/constants';

export default function ResetPassword() {
  const [step, setStep] = useState(1); // 1: Enter ID, 2: Answer Question
  const [employeeId, setEmployeeId] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [userId, setUserId] = useState(null);
  const [securityAnswerHash, setSecurityAnswerHash] = useState('');
  
  const navigate = useNavigate();

  const handleEmployeeIdSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('employeeId', '==', employeeId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Employee ID not found');
        setLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      if (!userData.securityQuestionId || !userData.securityAnswerHash) {
        setError('Security question not set up for this account. Please contact administrator.');
        setLoading(false);
        return;
      }

      // Fetch the security question
      const questions = await fetchSecurityQuestions();
      const question = questions.find(q => String(q.id) === String(userData.securityQuestionId));

      if (!question) {
        setError('Security question not found. Please contact administrator.');
        setLoading(false);
        return;
      }

      setUserId(userDoc.id);
      setSecurityQuestion(question.question);
      setSecurityAnswerHash(userData.securityAnswerHash);
      setStep(2);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to retrieve account information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityAnswerSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const isCorrect = await verifySecurityAnswer(securityAnswer, securityAnswerHash);

      if (!isCorrect) {
        setError('Incorrect answer. Please try again.');
        setLoading(false);
        return;
      }

      // Answer is correct, now flag the account for password reset
      await updateDoc(doc(db, 'users', userId), {
        mustChangePassword: true,
        passwordResetAt: new Date().toISOString()
      });
      
      setSuccess('Verification successful. Please contact an administrator to complete the password reset.');
      
      setTimeout(() => {
        navigate('/login');
      }, 4000);

    } catch (err) {
      console.error('Error:', err);
      setError('Failed to process your request. Please try again or contact an administrator.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    // This function is no longer used, logic is merged into handleSecurityAnswerSubmit
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Step {step} of 2
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleEmployeeIdSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700">
                Employee ID
              </label>
              <input
                id="employeeId"
                name="employeeId"
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={loading}
                placeholder="Enter your employee ID"
                required
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {loading ? 'Loading...' : 'Continue'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSecurityAnswerSubmit} className="mt-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Security Question
              </label>
              <p className="text-gray-900 font-medium p-3 bg-gray-50 rounded-lg">
                {securityQuestion}
              </p>
            </div>

            <div>
              <label htmlFor="securityAnswer" className="block text-sm font-medium text-gray-700">
                Your Answer
              </label>
              <input
                id="securityAnswer"
                name="securityAnswer"
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                disabled={loading}
                placeholder="Enter your answer"
                required
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {loading ? 'Verifying...' : 'Verify Answer'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
