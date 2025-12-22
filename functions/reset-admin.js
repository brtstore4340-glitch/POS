// reset-admin.js
import admin from "firebase-admin";
import fs from "fs";

// 🔴 ใช้ service account แค่ชั่วคราวในเครื่องพี่
const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccount.temp.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const EMPLOYEE_EMAIL = "6705067@boots-pos.local";

// สุ่มรหัส 6 หลัก
const newPassword = Math.floor(100000 + Math.random() * 900000).toString();

(async () => {
  try {
    const user = await admin.auth().getUserByEmail(EMPLOYEE_EMAIL);

    await admin.auth().updateUser(user.uid, {
      password: newPassword,
    });

    console.log("✅ RESET SUCCESS");
    console.log("Email:", EMPLOYEE_EMAIL);
    console.log("New Password:", newPassword);

    process.exit(0);
  } catch (err) {
    console.error("❌ RESET FAILED", err);
    process.exit(1);
  }
})();
