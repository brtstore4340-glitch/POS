/**
 * Calculate Item Price based on Method
 * @param {object} product - Product Data { price, dealPrice, methods, ... }
 * @param {number} qty - Quantity
 * @param {number} method - Pricing Method (0-9)
 * @returns {object} { unitPrice, total, discount, isPromo }
 */
export const calculatePrice = (product, qty, method = 0) => {
    const regPrice = Number(product.price) || 0;
    const dealPrice = Number(product.dealPrice) || regPrice;
    let unitPrice = regPrice;
    let isPromo = false;

    // Safety check for quantity
    if (qty < 1) qty = 1;

    switch (Number(method)) {
        case 1: // Use Deal Price
            unitPrice = dealPrice;
            isPromo = unitPrice < regPrice;
            break;

        case 0:
        case 8:
        case 9:
        case 17:
        case 18:
        case 19:
        default: // Use Regular Price for these methods and as a fallback
            unitPrice = regPrice;
            break;
    }

    const total = unitPrice * qty;
    const discount = Math.max(0, (regPrice * qty) - total);

    return {
        unitPrice,
        total,
        discount,
        isPromo
    };
};
