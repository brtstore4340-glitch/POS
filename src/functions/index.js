const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

function generatePassword6() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.createEmployee = functions
  .region("asia-southeast1")
  .https.onCall(async (data, context) => {
    // 🔐 (แนะนำ) เช็กว่าเป็น admin
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Login required");
    }

    const { employeeId, domain = "boots-pos.local", role = "user" } = data;

    if (!employeeId) {
      throw new functions.https.HttpsError("invalid-argument", "employeeId required");
    }

    const email = `${employeeId}@${domain}`;
    const password = generatePassword6();

    try {
      // 1) Create Auth user
      const userRecord = await admin.auth().createUser({
        email,
        password,
        emailVerified: false,
        disabled: false,
      });

      // 2) Create Firestore profile
      await db.collection("users").doc(userRecord.uid).set({
        employeeId,
        role,
        mustChangePassword: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ⚠️ ส่ง password กลับ (ใช้เฉพาะ admin)
      return {
        email,
        password, // ← เอาไปแจ้งพนักงาน
      };
    } catch (err) {
      if (err.code === "auth/email-already-exists") {
        throw new functions.https.HttpsError(
          "already-exists",
          "Employee already exists"
        );
      }
      throw new functions.https.HttpsError("internal", err.message);
    }
  });
