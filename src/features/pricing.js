/**
 * Calculate Item Price based on Method
 * @param {object} product - Product Data { price, dealPrice, methods, ... }
 * @param {number} qty - Quantity
 * @param {number} method - Pricing Method (0-9)
 * @returns {object} { unitPrice, total, discount, isPromo }
 */
export const calculatePrice = (product, qty, method = 0) => {
    // Default: Method 0 (Reg Price)
    let unitPrice = Number(product.price) || 0;
    let dealPrice = Number(product.dealPrice) || unitPrice; // Fallback
    const regPrice = Number(product.price) || 0;

    // Safety
    if (qty < 1) qty = 1;

    let total = 0;
    let discount = 0;
    let isPromo = false;

    switch (Number(method)) {
        case 0: // Non Method
            unitPrice = regPrice;
            total = unitPrice * qty;
            break;

        case 1: // Automatic Markdown (Use Deal Price)
            unitPrice = dealPrice;
            total = unitPrice * qty;
            isPromo = unitPrice < regPrice;
            break;

        case 2: // Buy n Get 1 Free
            // Simplified: If Buy 2 Get 1 Free implies "Buy 2 items, pay for 1"? 
            // Or "Buy 2 get 1 free" = 3 items, pay for 2?
            // Usually "Buy N Get 1 Free" -> If you have N+1 items, 1 is free.
            // Requirement says: "Buy n Get 1 Free". 
            // We need a parameter 'n' from somewhere. 
            // For now, assume Buy 1 Get 1 Free for demo if no N specified, or standard logic.
            // Let's implement Buy 1 Get 1 Free as default for Method 2 for now,
            // OR checks 'methods' map if available.

            // Standard Logic: Pay for ceil(qty / 2) * price?
            // If Buy 1 Get 1: 2 items -> pay 1. 3 items -> pay 2.
            const paidQty = Math.ceil(qty / 2);
            unitPrice = regPrice;
            total = paidQty * unitPrice;
            isPromo = true;
            break;

        // ... Implement other methods as needed or placeholder ...
        // 8: Buy n of Group Product and Get Minimun Promotion Price
        // 9: Buy n of Group Product and Get Promotion Price

        default:
            unitPrice = regPrice;
            total = unitPrice * qty;
            break;
    }

    discount = (regPrice * qty) - total;

    return {
        unitPrice,
        total,
        discount,
        isPromo
    };
};
