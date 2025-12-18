// Setup Script: Create First Admin User
// Run this ONCE to bootstrap the system with the primary admin account
// Usage: node setup-admin.js

import admin from 'firebase-admin';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Initialize Admin SDK with your service account
// You need to download the service account key from Firebase Console
// Go to: Project Settings > Service Accounts > Generate New Private Key
// Save the JSON file and update the path below

try {
    const serviceAccount = require('./firebase-adminsdk-key.json');

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error('❌ Error: Cannot find firebase-adminsdk-key.json');
    console.error('Please download the service account key from Firebase Console:');
    console.error('  1. Go to Firebase Console > Project Settings > Service Accounts');
    console.error('  2. Click "Generate New Private Key"');
    console.error('  3. Save the file as "firebase-adminsdk-key.json" in this directory');
    process.exit(1);
}

const ADMIN_EMPLOYEE_ID = '6705067';
const ADMIN_EMAIL = `${ADMIN_EMPLOYEE_ID}@boots-pos.local`;
const ADMIN_PASSWORD = ADMIN_EMPLOYEE_ID; // Initial password (will be forced to change)
const RESET_PASSWORD_IF_EXISTS = true;

async function createAdminUser() {
    try {
        console.log('🚀 Starting Admin User Setup...\n');

        // 1. Create Authentication User
        console.log('1️⃣  Creating Auth user...');
        let userRecord;
        try {
            userRecord = await admin.auth().createUser({
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                displayName: 'Primary Admin'
            });
            console.log(`✅ Auth user created: ${userRecord.uid}`);
        } catch (error) {
            if (error.code === 'auth/email-already-exists') {
                console.log('⚠️  User already exists, fetching...');
                userRecord = await admin.auth().getUserByEmail(ADMIN_EMAIL);
                console.log(`✅ Found existing user: ${userRecord.uid}`);
                if (RESET_PASSWORD_IF_EXISTS) {
                    console.log('🔁 Resetting password for existing user...');
                    await admin.auth().updateUser(userRecord.uid, {
                        password: ADMIN_PASSWORD,
                        displayName: 'Primary Admin',
                    });
                    console.log('✅ Password reset for existing user');
                }
            } else {
                throw error;
            }
        }

        // 2. Create Firestore User Document
        console.log('\n2️⃣  Creating Firestore user document...');
        const db = admin.firestore();
        await db.collection('users').doc(userRecord.uid).set({
            employeeId: ADMIN_EMPLOYEE_ID,
            firstName: 'Admin',
            lastName: 'Root',
            storeId: '0000',
            role: 'admin',
            mustChangePassword: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Firestore document created');

        // 3. Summary
        console.log('\n🎉 Admin user setup complete!');
        console.log('\n📋 Login Credentials:');
        console.log(`   Employee ID: ${ADMIN_EMPLOYEE_ID}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
        console.log('\n⚠️  You will be required to change the password on first login.\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        process.exit(1);
    }
}

createAdminUser();
