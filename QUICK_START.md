# 🚀 Boots POS - Quick Start Guide

## ⚡ **วิธีเริ่มใช้งานโดยเร็วที่สุด**

### **Step 1: ตั้งค่า Firebase (5 นาที)**

1. **เปิด Firebase Console:**
   - ไป https://console.firebase.google.com/project/boots-thailand-pos-project

2. **ตั้ง Firestore Rules:**
   
    **คัดล📋อกโค้ดนี้ทั้งหมด (เฉพาะส่วนที่ไม่มี ``` ):**
   
   ```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
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

3. **สร้าง Test Users:**
   - **Email**: `admin@boots-pos.local` | **Password**: `Admin@123`
   - **Email**: `cashier@boots-pos.local` | **Password**: `Cashier@123`

4. **สร้าง User Documents** ใน Firestore `users` collection:
   ```json
   {
     "role": "admin",
     "mustChangePassword": false
   }
   ```

---

### **Step 2: รันแอพพลิเคชัน (1 นาที)**

```bash
# 1. ไปที่ folder project
cd d:\01\ Main\ Work\Boots\Boots-POS

# 2. รัน dev server
npm run dev

# 3. เปิด browser ที่ http://localhost:5173
```

---

### **Step 3: ล็อกอินและทดสอบ (2 นาที)**

**Login Page:**
- **Employee ID**: `admin` (หรือตัวเลขใดก็ได้)
- **Password**: `Admin@123`

**ลองใช้ฟีเจอร์:**
- ✅ Dashboard → POS Terminal
- ✅ กด F8 → Qty modal
- ✅ เปิด Settings → Upload products
- ✅ เปิด Reporting → Daily Report

---

## 🎯 **Default Test Credentials**

```
=== ADMIN ===
Email: admin@boots-pos.local
Password: Admin@123
Employee ID: admin

=== CASHIER ===
Email: cashier@boots-pos.local
Password: Cashier@123
Employee ID: cashier
```

---

## 🛠️ **ปัญหา: หน้าขาว - ทำการแก้ไข**

### **1. ตรวจสอบ Console (F12):**
```
ดูว่ามี error message อะไร
```

### **2. หลักๆ ปัญหา:**

| ปัญหา | แก้ไข |
|------|------|
| "Authentication/invalid-api-key" | ✅ Firebase config ดีแล้ว |
| "Unauthorized: Missing Permission" | ✅ ตั้ง Firestore Rules |
| "User document not found" | ✅ สร้าง user doc ใน Firestore |
| "Loading stuck" | ✅ ตรวจสอบ internet connection |

### **3. Reset Cache:**
```bash
# ลบ cache
rm -r node_modules/.cache

# รัน dev ใหม่
npm run dev
```

---

## 📤 **Upload Product Data**

1. เตรียม Excel file:
   - **Product Master** หรือ **Item_Export**
   - Columns: Code(H), Name(B), Price(G), Deal Price(I), Method(F), Barcode(L)

2. ไปหน้า **Settings** → คลิก upload button
3. เลือกไฟล์ → อัพโหลด

---

## 📊 **Firestore Collections Structure**

### `users`:
```json
{
  "uid": {
    "email": "admin@boots-pos.local",
    "role": "admin",
    "mustChangePassword": false,
    "name": "Admin User"
  }
}
```

### `products`:
```json
{
  "product_id": {
    "code": "P001",
    "name": "Product Name",
    "price": 100.00,
    "dealPrice": 80.00,
    "method": 0,
    "barcode": "1234567890"
  }
}
```

### `bills`:
```json
{
  "bill_id": {
    "billNo": "19122502150101",
    "items": [...],
    "total": 100,
    "receivedAmount": 100,
    "change": 0,
    "timestamp": "2025-12-19T..."
  }
}
```

---

## ✅ **Verification Checklist**

- [ ] Firebase Config ✓ (hardcoded ใน firebase.js)
- [ ] Firestore Rules published
- [ ] Test users created
- [ ] User documents in Firestore
- [ ] app runs: `npm run dev`
- [ ] Login ทำงาน
- [ ] Dashboard แสดงผล
- [ ] POS Terminal visible

---

## 📱 **Test Flow**

```
1. Login
   ↓
2. Dashboard (POS Terminal + Checkout)
   ↓
3. Scan/Search product (F8 = Qty)
   ↓
4. Add item (Enter)
   ↓
5. F4 → Checkout
   ↓
6. Enter amount → Calculate change
   ↓
7. Enter → Bill saved, Daily Report updated
```

---

## 🚀 **Deploy to Production**

```bash
# 1. Build
npm run build

# 2. Preview
npm run preview

# 3. Deploy to Firebase Hosting
firebase deploy --only hosting
```

---

## 🔗 **Links**

- 🌐 Firebase Console: https://console.firebase.google.com
- 📖 Documentation: IMPLEMENTATION_GUIDE.md
- 🎯 Features: BILLING_FEATURES.md
- 📝 Setup: FIREBASE_SETUP.md

---

**🎉 Ready to go! Start with `npm run dev`**
