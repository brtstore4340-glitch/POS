exports.resetEmployeePassword = functions
  .region("asia-southeast1")
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Login required");
    }

    const { employeeId, domain = "boots-pos.local" } = data;
    if (!employeeId) {
      throw new functions.https.HttpsError("invalid-argument", "employeeId required");
    }

    const email = `${employeeId}@${domain}`;

    // 1) หา user ใน Auth ด้วย email
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (err) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }

    // 2) เช็ก role ใน Firestore ว่าเป็น admin จริงไหม
    const userRef = db.collection("users").doc(userRecord.uid);
    const snap = await userRef.get();
    const profile = snap.exists ? snap.data() : null;

    if (!profile || profile.role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "Target is not admin");
    }

    // 3) สุ่มรหัส 6 หลัก แล้วอัปเดต
    const newPassword = Math.floor(100000 + Math.random() * 900000).toString();

    await admin.auth().updateUser(userRecord.uid, { password: newPassword });

    // 4) บังคับเปลี่ยนรหัสครั้งแรก
    await userRef.set(
      {
        mustChangePassword: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { email, password: newPassword };
  });
