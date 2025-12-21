// src/services/securityService.js
// Browser-compatible security service using Web Crypto API
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

/**
 * Hash security answer using SHA-256 (Web Crypto API)
 * @param {string} answer - Plain text answer
 * @returns {Promise<string>} SHA-256 hash in hexadecimal format
 */
export const hashAnswer = async (answer) => {
    // Normalize the answer (lowercase and trim)
    const normalized = answer.toLowerCase().trim();

    // Convert string to Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);

    // Hash using Web Crypto API (SHA-256)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
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
 * @returns {Promise<boolean>} True if answer is correct
 */
export const verifySecurityAnswer = async (userAnswer, storedHash) => {
    const answerHash = await hashAnswer(userAnswer);
    return answerHash === storedHash;
};
