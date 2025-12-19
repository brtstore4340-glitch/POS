# 🔐 Security Questions Firebase Setup

## 📋 Firebase Collections Structure

### 1️⃣ Collection: `securityQuestions` (Global)

**Purpose:** ศูนย์กลางเก็บคำถามความปลอดภัยทั้งหมด

```
Firestore → Create Collection: securityQuestions
```

**Add Documents:**

#### Document ID: `1`
```json
{
  "id": 1,
  "question": "What is your favorite color?",
  "order": 1
}
```

#### Document ID: `2`
```json
{
  "id": 2,
  "question": "What is your mother's name?",
  "order": 2
}
```

#### Document ID: `3`
```json
{
  "id": 3,
  "question": "What city were you born in?",
  "order": 3
}
```

#### Document ID: `4`
```json
{
  "id": 4,
  "question": "What is your pet's name?",
  "order": 4
}
```

---

### 2️⃣ Update `users` Collection

**Add to existing user documents:**

```json
{
  "email": "admin@boots-pos.local",
  "role": "admin",
  "mustChangePassword": false,
  "securityQuestionId": 1,
  "securityAnswerHash": "1b4f0e9851971998e732078544c11c82f590e7f2"
}
```

**Where:**
- `securityQuestionId`: ID ของคำถาม (1, 2, 3, หรือ 4)
- `securityAnswerHash`: SHA1 hash ของคำตอบ (ตัวอย่างคำตอบ: "blue")

**Generate Hash คำตอบ:**

ใช้ online tool: https://www.sha1-online.com/
- Type: `blue`
- Copy SHA1 hash: `1b4f0e9851971998e732078544c11c82f590e7f2`

---

### 3️⃣ Update Firestore Security Rules

**ไปที่ Firestore Rules Editor:**

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    
    // ✅ อ่านได้สำหรับ unauthenticated users (สำหรับหน้า Password Reset)
    match /securityQuestions/{document=**} {
      allow read: if true;
      allow write: if false;
    }
    
    match /products/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /bills/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 🔐 Security Answer Hashing

**ทำให้ Code:**

```javascript
import crypto from 'crypto';

export const hashAnswer = (answer) => {
  return crypto
    .createHash('sha1')
    .update(answer.toLowerCase().trim())
    .digest('hex');
};

// ตัวอย่าง:
// hashAnswer("blue") → "1b4f0e9851971998e732078544c11c82f590e7f2"
// hashAnswer("BLUE") → "1b4f0e9851971998e732078544c11c82f590e7f2"
```

---

## 📝 Step-by-Step Setup

### Firebase Console:

1. **Firestore Database** → Create Collection: `securityQuestions`
2. **Add 4 documents** (see above)
3. **Update users collection:**
   - Add field: `securityQuestionId` (number: 1-4)
   - Add field: `securityAnswerHash` (string: SHA1 hash)
4. **Update Security Rules** (copy-paste from above)
5. **Publish Rules**

### Code:

- ✅ `Login.jsx` ← updated to fetch from Firestore
- ✅ `services/securityService.js` ← new file with hashing logic
- ✅ `firebase.js` ← exports ready

---

## 🔄 Password Reset Flow

```
1. User clicks "Forgot Password?"
2. Enter Employee ID
3. System fetches user document from Firestore
4. Displays security question from Firestore
5. User answers → System hashes answer
6. Compare with stored hash in user doc
7. If match → Allow password reset
```

---

## ⚠️ Important

- ❌ **Never store plain text answers**
- ✅ **Always use SHA1 hash**
- ❌ **Don't expose answers in frontend**
- ✅ **Security Rules ต้องอนุญาต read securityQuestions**

---

## 🧪 Test Flow

1. Go to Login page
2. Click "Forgot Password?"
3. Enter Employee ID: `admin`
4. System loads question from Firestore
5. Enter answer: `blue`
6. Click "Reset Password"
7. ✅ Should succeed

---

**บันทึก:** Commit จะมี Login.jsx + securityService.js ที่ updated
