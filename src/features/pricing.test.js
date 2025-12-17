import { describe, it, expect } from 'vitest';
import { calculatePrice } from './pricing';

describe('Pricing Logic', () => {
    const product = {
        code: '100',
        name: 'Test Item',
        price: 100,
        dealPrice: 80,
    };

    it('Method 0: Regular Price', () => {
        const res = calculatePrice(product, 2, 0);
        expect(res.unitPrice).toBe(100);
        expect(res.total).toBe(200);
        expect(res.discount).toBe(0);
        expect(res.isPromo).toBe(false);
    });

    it('Method 1: Automatic Markdown', () => {
        const res = calculatePrice(product, 2, 1);
        expect(res.unitPrice).toBe(80);
        expect(res.total).toBe(160);
        expect(res.discount).toBe(40); // (100*2) - 160
        expect(res.isPromo).toBe(true);
    });

    it('Method 2: Buy 2 Pay 1 (Buy 1 Get 1 Simulation)', () => {
        // Since we implemented Method 2 roughly, let's verify assumptions
        // Method 2 in our implementation: Math.ceil(qty / 2). "Buy 1 Get 1 Free" often means for every 2, pay 1.

        // 2 items -> pay 1
        let res = calculatePrice(product, 2, 2);
        expect(res.total).toBe(100);

        // 3 items -> pay 2 (2 for 1 deal + 1 regular) ?? 
        // Our logic: ceil(3/2) = 2. Correct.
        res = calculatePrice(product, 3, 2);
        expect(res.total).toBe(200);

        // 1 item -> pay 1. ceil(1/2) = 1.
        res = calculatePrice(product, 1, 2);
        expect(res.total).toBe(100);
    });
});
