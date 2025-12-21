// src/features/pricing.js

/**
 * คำนวณราคาสินค้าตามจำนวนและเงื่อนไข (Method)
 * @param {Object} product - ข้อมูลสินค้า
 * @param {number} qty - จำนวนสินค้า
 * @param {number} method - วิธีคิดราคา (0=ปกติ, 1=ราคาโปรโมชั่น)
 */
export const calculatePrice = (product, qty, method = 0) => {
    const quantity = Number(qty) || 0;
    let unitPrice = Number(product.price) || 0;
    let total = 0;
    let discount = 0;

    // Logic การคิดราคา
    // Method 0: ราคาปกติ
    // Method 1: ใช้ราคา Deal Price (ถ้ามี)
    
    if (method === 1 && product.dealPrice > 0) {
        unitPrice = Number(product.dealPrice);
    }

    // คำนวณราคารวม (Base Calculation)
    const subtotal = unitPrice * quantity;
    
    // ตรวจสอบส่วนลด (ถ้ามี Logic ส่วนลดเพิ่มเติมใส่ตรงนี้)
    // ตัวอย่าง: ถ้า method เป็นอะไรสักอย่างที่ลดราคา
    
    total = subtotal - discount;

    return {
        unitPrice, // ราคาต่อหน่วยที่ใช้คำนวณจริง
        total,     // ราคารวมสุทธิ
        discount   // ส่วนลดรวม
    };
};