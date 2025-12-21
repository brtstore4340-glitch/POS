// src/services/dataService.js

export const PRODUCT_STORAGE_KEYS = {
    itemExport: 'pos_products_data', // Key สำหรับเก็บข้อมูลสินค้าหลัก
    cart: 'pos_current_cart',        // (Optional) เผื่อเก็บตะกร้าค้างไว้
    billSeq: 'pos_bill_sequence'     // (Recommended) เก็บเลขที่บิลล่าสุด
};

// Helper function to safe parse JSON
export const safeParse = (data, fallback = null) => {
    try {
        return JSON.parse(data);
    } catch (e) {
        return fallback;
    }
};