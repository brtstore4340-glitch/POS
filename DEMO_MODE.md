# 🧪 Demo Mode - ทดสอบแอพ ไม่ต้อง Firebase

ถ้าต้องการทดสอบแอพพลิเคชัน ไม่ต้องตั้ง Firebase ให้ใช้ Demo Mode

---

## **ขั้นตอน 1: สร้างไฟล์ `.env.local`**

สร้างไฟล์ที่ root folder:
```
d:\01 Main Work\Boots\Boots-POS\.env.local
```

**เพิ่มเนื้อหา:**
```env
VITE_DEMO_MODE=true
VITE_SKIP_AUTH=true
```

---

## **ขั้นตอน 2: แก้ไข `src/main.jsx`**

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Demo mode
if (import.meta.env.VITE_DEMO_MODE === 'true') {
  console.log("🎭 DEMO MODE ENABLED - Skip Firebase");
  window.DEMO_MODE = true;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

## **ขั้นตอน 3: แก้ไข `src/context/AuthContext.jsx`**

เพิ่มก่อนส่วน `export const AuthProvider`:

```javascript
// Demo User
const DEMO_USER = {
  uid: "demo-user-123",
  email: "demo@boots-pos.local",
  displayName: "Demo User"
};

const DEMO_ROLE = "admin";
```

แล้วแก้ useEffect:

```javascript
// Auth State Observer
useEffect(() => {
  // DEMO MODE: Skip Firebase
  if (window.DEMO_MODE) {
    console.log("🎭 Using demo user");
    setUser(DEMO_USER);
    setRole(DEMO_ROLE);
    setMustChangePassword(false);
    setLoading(false);
    return;
  }

  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    // ... original code
  });

  return unsubscribe;
}, []);
```

---

## **ขั้นตอน 4: Mock Product Data**

สร้างไฟล์ `src/services/mockData.js`:

```javascript
export const MOCK_PRODUCTS = [
  {
    code: "P001",
    name: "Vitamin C 500mg",
    price: 250,
    dealPrice: 200,
    method: 0,
    barcode: "8858188000121",
    nameLower: "vitamin c 500mg"
  },
  {
    code: "P002",
    name: "Protein Powder",
    price: 1500,
    dealPrice: 1200,
    method: 1,
    barcode: "8858188000122",
    nameLower: "protein powder"
  },
  {
    code: "P003",
    name: "Sunscreen SPF50",
    price: 450,
    dealPrice: 400,
    method: 0,
    barcode: "8858188000123",
    nameLower: "sunscreen spf50"
  },
  {
    code: "P004",
    name: "Face Mask Sheet",
    price: 150,
    dealPrice: 100,
    method: 1,
    barcode: "8858188000124",
    nameLower: "face mask sheet"
  },
];
```

---

## **ขั้นตอน 5: โหลด Mock Data ใน PosContext**

แก้ `src/context/PosContext.jsx`:

```javascript
import { MOCK_PRODUCTS } from '../services/mockData';

// เพิ่มใน useEffect:
useEffect(() => {
  if (window.DEMO_MODE) {
    const { map, list } = buildProductState(MOCK_PRODUCTS);
    setProducts(map);
    setProductList(list);
    setLoadingProgress(100);
    setLoadingProducts(false);
    return;
  }

  const loaded = loadFromStorage();
  fetchProducts({ silent: loaded });
  generateBillId();
  // ... rest
}, []);
```

---

## **ขั้นตอน 6: รัน Demo**

```bash
npm run dev
```

**ผลลัพธ์:**
- ✅ Login หน้าจอข้าม (auto-login demo user)
- ✅ Dashboard แสดง POS Terminal
- ✅ 4 สินค้า test พร้อมใช้
- ✅ ค้นหา / สแกน / บิล ทั้งหมดใช้ได้
- ✅ ไม่ต้องตั้ง Firebase

---

## **Mock Products ที่ได้:**

| Code | Name | Price | Deal |
|------|------|-------|------|
| P001 | Vitamin C 500mg | 250 | 200 |
| P002 | Protein Powder | 1500 | 1200 |
| P003 | Sunscreen SPF50 | 450 | 400 |
| P004 | Face Mask Sheet | 150 | 100 |

---

## **ทดลอง Flow:**

1. **Dashboard** → เห็น POS Terminal
2. **Search** "vitamin" → ได้ Vitamin C
3. **F8** → เปลี่ยน qty เป็น 2
4. **Enter** → เพิ่ม item 2 ชิ้น
5. **F4** → ไปที่ Checkout
6. **Enter amount** 500 → เงินทอน 0
7. **Enter** → บิลจบ

---

## **Disable Demo Mode:**

ลบ `.env.local` หรือเปลี่ยน:
```env
VITE_DEMO_MODE=false
```

แล้วกลับไปตั้ง Firebase ปกติ

---

## **ข้อดี:**

✅ ไม่ต้องตั้ง Firebase  
✅ ทดสอบได้ทั่นที  
✅ ไม่ต้อง internet  
✅ Development เร็ว  
✅ Reset ง่ายๆ  

---

**สำคัญ:** Demo mode ใช้ได้เฉพาะ **Development** เท่านั้น!  
ใช้ Firebase ปกติเมื่อเตรียม Production
