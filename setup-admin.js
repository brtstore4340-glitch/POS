// Setup Script: Create First Admin User
// Run this ONCE to bootstrap the system with the primary admin account
// Usage: npm run setup-admin

import admin from 'firebase-admin';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Admin SDK with environment variables
try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON.replace(/\\"/g, '"'));

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error('❌ Error: Cannot initialize Firebase Admin SDK');
    console.error('Please check your .env.local file and ensure FIREBASE_SERVICE_ACCOUNT_JSON is set correctly');
    console.error('Error details:', error.message);
    process.exit(1);
}

const ADMIN_EMPLOYEE_ID = '6705067';
const ADMIN_EMAIL = `${ADMIN_EMPLOYEE_ID}@boots-pos.local`;
const ADMIN_PASSWORD = ADMIN_EMPLOYEE_ID;
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
                    console.log('🔁 Deleting and recreating user to reset password...');
                    await admin.auth().deleteUser(userRecord.uid);
                    userRecord = await admin.auth().createUser({
                        uid: userRecord.uid,
                        email: ADMIN_EMAIL,
                        password: ADMIN_PASSWORD,
                        displayName: 'Primary Admin'
                    });
                    console.log('✅ User recreated with new password');
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
