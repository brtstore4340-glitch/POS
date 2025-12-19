// src/services/securityService.js
import crypto from 'crypto';
import { db, collection, getDocs } from './firebase';

/**
 * Hash security answer using SHA1
 * @param {string} answer - Plain text answer
 * @returns {string} SHA1 hash
 */
export const hashAnswer = (answer) => {
    return crypto
        .createHash('sha1')
        .update(answer.toLowerCase().trim())
        .digest('hex');
};

/**
 * Fetch all security questions from Firestore
 * @returns {Promise<Array>} Array of security questions
 */
export const fetchSecurityQuestions = async () => {
    try {
        const snapshot = await getDocs(collection(db, 'securityQuestions'));
        const questions = [];
        
        snapshot.forEach(doc => {
            questions.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Sort by order
        questions.sort((a, b) => (a.order || 0) - (b.order || 0));
        return questions;
    } catch (err) {
        console.error('Failed to fetch security questions:', err);
        throw new Error('ไม่สามารถดึงข้อมูลคำถามความปลอดภัยได้');
    }
};

/**
 * Verify security answer
 * @param {string} userAnswer - User's answer
 * @param {string} storedHash - Stored hash from Firestore
 * @returns {boolean} True if answer is correct
 */
export const verifySecurityAnswer = (userAnswer, storedHash) => {
    const answerHash = hashAnswer(userAnswer);
    return answerHash === storedHash;
};
