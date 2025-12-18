import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, collection, getDocs } from '../services/firebase';
import { calculatePrice } from '../features/pricing';

import LoadingScreen from '../components/LoadingScreen';
import MaintenanceMode from '../components/MaintenanceMode';

const PosContext = createContext();

export const usePos = () => useContext(PosContext);

export const PosProvider = ({ children }) => {
    // Master Data
    const [products, setProducts] = useState({}); // Map<Code, Product>
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [error, setError] = useState(null);

    // Transaction State
    const [billId, setBillId] = useState('');
    const [cart, setCart] = useState([]); // Array of { code, name, qty, price, total, method ... }
    const [billStep, setBillStep] = useState('scanning'); // scanning, payment

    // Load Products
    useEffect(() => {
        fetchProducts();
        generateBillId();
    }, []);

    const fetchProducts = async () => {
        setLoadingProducts(true);
        setError(null);
        setLoadingProgress(0);

        // Simulate progress
        const progressInterval = setInterval(() => {
            setLoadingProgress(prev => {
                if (prev >= 90) return prev;
                // Slow down as it gets higher
                const increment = prev > 60 ? 1 : 5;
                return prev + increment;
            });
        }, 100);

        try {
            const querySnapshot = await getDocs(collection(db, "products"));
            const map = {};
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.code) map[data.code] = data;
                if (data.barcode && data.barcode !== data.code) map[data.barcode] = data;
            });
            setProducts(map);
            setLoadingProgress(100);

            // Short delay to let the 100% show before fading out
            setTimeout(() => {
                setLoadingProducts(false);
            }, 500);

        } catch (error) {
            console.error("Error loading products:", error);
            setError(error);
        } finally {
            clearInterval(progressInterval);
        }
    };

    const generateBillId = () => {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yy = String(now.getFullYear()).slice(-2);
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');

        // Random 2 digits for uniqueness in this session/demo
        const rand = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
        setBillId(`${dd}${mm}${yy}${hh}${min}${rand}`);
    };

    const addItem = (code, qty = 1, method = 0) => {
        const product = products[code];
        if (!product) return false; // Not found

        const existingIdx = cart.findIndex(item => item.code === code && item.method === method);

        if (existingIdx >= 0) {
            // Update existing
            const newCart = [...cart];
            const oldItem = newCart[existingIdx];
            const newQty = oldItem.qty + qty;
            const { total, unitPrice, discount, isPromo } = calculatePrice(product, newQty, method);

            newCart[existingIdx] = {
                ...oldItem,
                qty: newQty,
                total,
                unitPrice,
                discount,
                isPromo
            };
            setCart(newCart);
        } else {
            // New Item
            const { total, unitPrice, discount, isPromo } = calculatePrice(product, qty, method);
            const newItem = {
                code: product.code,
                name: product.name,
                barcode: product.barcode, // track barcode used
                qty,
                method,
                unitPrice,
                total,
                discount,
                isPromo
            };
            setCart([...cart, newItem]);
        }
        return true;
    };

    const removeItem = (index) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const clearBill = () => {
        setCart([]);
        setBillStep('scanning');
        generateBillId();
    };

    // Derived Totals
    const subtotal = cart.reduce((acc, item) => acc + (item.unitPrice * item.qty), 0); // Reg Price Total
    const totalDiscount = cart.reduce((acc, item) => acc + item.discount, 0);
    const netTotal = cart.reduce((acc, item) => acc + item.total, 0);

    return (
        <PosContext.Provider value={{
            products,
            loadingProducts,
            cart,
            billId,
            billStep,
            setBillStep,
            addItem,
            removeItem,
            clearBill,
            totals: { subtotal, totalDiscount, netTotal }
        }}>
            {error ? (
                <MaintenanceMode onRetry={fetchProducts} />
            ) : (
                <>
                    {children}
                    <LoadingScreen isLoading={loadingProducts} progress={loadingProgress} />
                </>
            )}
        </PosContext.Provider>
    );
};
