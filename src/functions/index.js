const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.ping = functions.region("asia-southeast1").https.onRequest(async (req, res) => {
  const ref = await db.collection("health").add({
    ok: true,
    at: admin.firestore.FieldValue.serverTimestamp(),
  });
  res.json({ ok: true, id: ref.id });
});
