import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db, collection, getDocs, addDoc, serverTimestamp } from '../services/firebase';
import { calculatePrice } from '../features/pricing';
import { PRODUCT_STORAGE_KEYS } from '../services/dataService';

import LoadingScreen from '../components/LoadingScreen';
import MaintenanceMode from '../components/MaintenanceMode';

const PosContext = createContext();

export const usePos = () => useContext(PosContext);

export const PosProvider = ({ children }) => {
    // Master Data
    const [products, setProducts] = useState({}); // Map<Code|Barcode, Product>
    const [productList, setProductList] = useState([]); // Unique Product List
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [error, setError] = useState(null);

    // Transaction State
    const [billId, setBillId] = useState('');
    const [cart, setCart] = useState([]); // Array of { code, name, qty, price, total, method ... }
    const [billStep, setBillStep] = useState('scanning'); // scanning, payment
    const billSequenceRef = useRef({ stamp: '', seq: 0 });

    // Load Products
    useEffect(() => {
        const loaded = loadFromStorage();
        fetchProducts({ silent: loaded });
        generateBillId();

        const handleStorageUpdate = () => {
            loadFromStorage();
        };

        window.addEventListener('pos-products-updated', handleStorageUpdate);
        return () => window.removeEventListener('pos-products-updated', handleStorageUpdate);
    }, []);

    const buildProductState = (items) => {
        const map = {};
        const list = [];
        const seen = new Set();

        items.forEach((item) => {
            const code = String(item.code || '').trim();
            const barcode = String(item.barcode || '').trim();
            if (!code && !barcode) return;

            const product = {
                ...item,
                code,
                barcode: barcode || code,
                name: item.name || 'Unknown Item',
                price: Number(item.price) || 0,
                dealPrice: Number(item.dealPrice) || 0,
                method: Number(item.method) || 0,
                nameLower: String(item.name || '').toLowerCase(),
            };

            if (code) map[code] = product;
            if (barcode && barcode !== code) map[barcode] = product;

            if (code && !seen.has(code)) {
                seen.add(code);
                list.push(product);
            }
        });

        return { map, list };
    };

    const loadFromStorage = () => {
        const storedItemExport = localStorage.getItem(PRODUCT_STORAGE_KEYS.itemExport);
        const storedProductMaster = localStorage.getItem(PRODUCT_STORAGE_KEYS.productMaster);
        const stored = storedItemExport || storedProductMaster;
        if (!stored) return false;

        try {
            const items = JSON.parse(stored);
            if (Array.isArray(items) && items.length > 0) {
                const { map, list } = buildProductState(items);
                setProducts(map);
                setProductList(list);
                setLoadingProgress(100);
                setLoadingProducts(false);
                return true;
            }
        } catch (err) {
            console.error('Failed to read local products', err);
        }
        return false;
    };

    const fetchProducts = async ({ silent = false } = {}) => {
        if (!silent) {
            setLoadingProducts(true);
            setLoadingProgress(0);
        }
        setError(null);

        // Simulate progress
        const progressInterval = silent ? null : setInterval(() => {
            setLoadingProgress(prev => {
                if (prev >= 90) return prev;
                // Slow down as it gets higher
                const increment = prev > 60 ? 1 : 5;
                return prev + increment;
            });
        }, 100);

        try {
            const querySnapshot = await getDocs(collection(db, "products"));
            const items = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                items.push(data);
            });

            if (items.length > 0) {
                const { map, list } = buildProductState(items);
                setProducts(map);
                setProductList(list);
            }
            if (!silent) {
                setLoadingProgress(100);
            }

            // Short delay to let the 100% show before fading out
            if (!silent) {
                setTimeout(() => {
                    setLoadingProducts(false);
                }, 500);
            }

        } catch (error) {
            console.error("Error loading products:", error);
            setError(error);
        } finally {
            if (progressInterval) clearInterval(progressInterval);
        }
    };

    const generateBillId = () => {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yy = String(now.getFullYear()).slice(-2);
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const stamp = `${dd}${mm}${yy}${hh}${min}`;
        if (billSequenceRef.current.stamp === stamp) {
            billSequenceRef.current.seq += 1;
        } else {
            billSequenceRef.current = { stamp, seq: 1 };
        }
        const seq = String(billSequenceRef.current.seq).padStart(2, '0');
        setBillId(`${stamp}${seq}`);
    };

    const addItem = (code, qty = 1) => {
        const product = products[code];
        if (!product) return false; // Not found

        const existingIdx = cart.findIndex(item => item.code === product.code);
        const method = Number(product.method) || 0;

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

    const startNewBill = () => {
        clearBill();
    };

    const cancelBill = () => {
        clearBill();
    };

    const finalizeBill = async (receivedAmount) => {
        if (!cart.length) return null;
        const received = Number(receivedAmount) || 0;
        const total = netTotal;
        const change = Math.max(0, received - total);
        const timestamp = new Date();

        const items = cart.map((item) => ({
            ...item,
            timestamp: timestamp.toISOString(),
        }));

        await addDoc(collection(db, 'bills'), {
            billNo: billId,
            items,
            total,
            receivedAmount: received,
            change,
            timestamp: serverTimestamp(),
        });

        clearBill();
        return { change };
    };

    // Derived Totals
    const subtotal = cart.reduce((acc, item) => acc + (item.unitPrice * item.qty), 0); // Reg Price Total
    const totalDiscount = cart.reduce((acc, item) => acc + item.discount, 0);
    const netTotal = cart.reduce((acc, item) => acc + item.total, 0);

    return (
        <PosContext.Provider value={{
            products,
            productList,
            loadingProducts,
            cart,
            billId,
            billStep,
            setBillStep,
            addItem,
            removeItem,
            clearBill,
            startNewBill,
            cancelBill,
            finalizeBill,
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
