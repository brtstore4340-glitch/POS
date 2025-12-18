# Firebase Setup Guide for Boots POS

## ⚠️ ปัญหา: หน้าจอขาว - ไม่มีอะไรเกิดขึ้นเลย

นี่คือวิธีแก้ปัญหา Firebase configuration

---

## 🔧 **Step 1: ตั้งค่า Firestore Security Rules**

### เข้า Firebase Console:
1. ไปที่ https://console.firebase.google.com
2. เลือก Project: `boots-thailand-pos-project`
3. ไปที่ **Firestore Database** → **Rules**
4. **Replace all** ด้วยรหัสด้านล่าง:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own document
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }

    // Allow authenticated users to read/write products
    match /products/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    // Allow authenticated users to read/write bills
    match /bills/{document=**} {
      allow read, write: if request.auth != null;
    }

    // Development mode: Allow all (REMOVE IN PRODUCTION)
    // match /{document=**} {
    //   allow read, write: if true;
    // }
  }
}
```

5. คลิก **Publish**

---

## 🔑 **Step 2: สร้าง Test Users ใน Firebase Authentication**

### เข้า Firebase Console:
1. ไปที่ **Authentication** → **Users**
2. คลิก **Add User** แล้วสร้าง:

#### **Admin User:**
- Email: `admin@boots-pos.local`
- Password: `Admin@123` (หรือรหัสที่ต้องการ)

#### **Cashier User:**
- Email: `cashier@boots-pos.local`
- Password: `Cashier@123`

---

## 👤 **Step 3: สร้าง User Data ใน Firestore**

### เข้า Firestore Database:
1. คลิก **Start collection** → ตั้งชื่อ: `users`
2. สร้าง document สำหรับ admin:

**Document ID:** (Copy UID จากAuthenticationหน้า)

**Data:**
```json
{
  "email": "admin@boots-pos.local",
  "role": "admin",
  "mustChangePassword": false,
  "employeeId": "A001",
  "name": "Admin User"
}
```

3. สร้าง document สำหรับ cashier:

**Document ID:** (Copy UID จาก Authentication)

**Data:**
```json
{
  "email": "cashier@boots-pos.local",
  "role": "user",
  "mustChangePassword": false,
  "employeeId": "C001",
  "name": "Cashier"
}
```

---

## 🎯 **Step 4: ตั้ง Custom Claims (Admin)**

### ใช้ Firebase Admin SDK หรือ Cloud Functions:

สร้าง Cloud Function ใหม่:

```javascript
// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  const uid = data.uid;
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    return { success: true, message: "Admin claim set" };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
```

**Deploy:**
```bash
firebase deploy --only functions
```

หรือ **ง่ายๆ** ใช้ Firebase CLI:
```bash
firebase auth:import users.json --hash-algo=scrypt --rounds=8 --mem-cost=14
```

---

## 📱 **Step 5: ทดสอบ Login**

1. เปิด app ที่ `http://localhost:5173`
2. ลองล็อกอินด้วย:
   - **Employee ID**: `admin` (หรือ username ใด ก็ได้)
   - **Password**: `Admin@123`

3. หรือโดยตรง ใช้ Email:
   - **Email**: `admin@boots-pos.local`
   - **Password**: `Admin@123`

---

## 🛠️ **ถ้ายังคงหน้าขาว - ทำการ Debug:**

### 1. เปิด Browser Console (F12):
```javascript
// ตรวจสอบ Firebase connection
firebase.firestore().collection('products').get()
  .then(snap => console.log('Connected:', snap.docs.length))
  .catch(err => console.error('Error:', err));
```

### 2. ตรวจสอบ Network:
- DevTools → Network → Firestore requests
- ดูว่ามี error ในการเชื่อมต่อหรือไม่

### 3. ลบ Cache:
```bash
# ใน Terminal
rm -r node_modules/.cache
npm run dev
```

### 4. ตรวจสอบ .env:
```bash
# ไม่ต้องตั้ง env ถ้า hardcode firebase config ได้แล้ว
# firebase.js มี config ฝังแล้ว
```

---

## 📊 **Create Collections:**

ถ้าหน้า Dashboard ขาด collections ให้สร้างเอง:

### 1. `products` collection:
```json
{
  "code": "P001",
  "name": "Product Name",
  "price": 100.00,
  "dealPrice": 80.00,
  "method": 0,
  "barcode": "1234567890"
}
```

### 2. `bills` collection:
```json
{
  "billNo": "19122502150101",
  "items": [
    {
      "code": "P001",
      "name": "Product",
      "qty": 1,
      "unitPrice": 100,
      "total": 100
    }
  ],
  "total": 100,
  "receivedAmount": 100,
  "change": 0,
  "timestamp": "2025-12-19T..."
}
```

---

## ✅ **Checklist:**

- [ ] Firestore Rules published
- [ ] Test users created in Authentication
- [ ] User documents in Firestore/users
- [ ] Custom claims set (optional)
- [ ] Collections created (products, bills)
- [ ] Login ทำงาน
- [ ] Dashboard แสดงผล
- [ ] Sidebar เห็น
- [ ] Scan ทำงาน

---

## 🚀 **Next Steps:**

หลังจากทำเสร็จ:

1. **Upload Product Data:**
   - ไปหน้า Settings
   - อัพโหลด Product Master และ Item_Export

2. **Start POS:**
   - ลองสแกนสินค้า
   - ลองบิล
   - ลองชำระเงิน

3. **Check Daily Report:**
   - ไปหน้า Reporting
   - ดูรายงานประจำวัน

---

## 📝 **Production Setup:**

เมื่อเตรียมพร้อมใช้งานจริง:

1. **Firestore Rules:** ใช้ authentication rules ที่ปลอดภัย
2. **Environment Variables:** ใช้ .env ปลอดภัย
3. **Firebase Hosting:** Deploy ที่ Firebase
4. **Enable Backups:** Firestore automatic backups
5. **Monitoring:** Enable Firebase Monitoring

---

**📞 หากยังมีปัญหา ให้ตรวจสอบ Browser Console เพื่อดู Error messages**
