// src/features/pricing.js
export const calculatePrice = (product, qty = 1, method = 0) => {
    // แปลงค่าให้เป็นตัวเลขที่แน่นอน
    const regPrice = Number(product.price) || 0;     // จาก Column G (Reg. Price)
    const dealPrice = Number(product.dealPrice) || 0; // จาก Column I (Deal Price)
    const safeQty = Number(qty) || 1;
    const currentMethod = Number(method);

    let unitPrice = regPrice;
    let isPromo = false;

    // Logic การเลือกราคาตาม Method
    // Method 1 ใช้ราคา Deal Price
    // Method 0, 8, 9, 17, 18, 19 ใช้ราคา Reg Price
    if (currentMethod === 1) {
        unitPrice = dealPrice;
        isPromo = true;
    } else {
        unitPrice = regPrice;
        isPromo = false;
    }

    // คำนวณส่วนลด (Discount = ราคาปกติ - ราคาที่ขายจริง)
    // ถ้าขายราคาปกติ ส่วนลดจะเป็น 0
    // ถ้าขายราคา Deal ส่วนลดจะเป็น Reg - Deal
    const discountPerUnit = Math.max(0, regPrice - unitPrice);
    const totalDiscount = discountPerUnit * safeQty;
    const total = unitPrice * safeQty;

    return {
        unitPrice,
        total,
        discount: totalDiscount,
        isPromo,
        method: currentMethod
    };
};