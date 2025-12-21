import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { db, collection, addDoc, serverTimestamp } from '../services/firebase';
import { calculatePrice } from '../features/pricing';
import { PRODUCT_STORAGE_KEYS } from '../services/dataService';
import LoadingScreen from '../components/LoadingScreen';
import MaintenanceMode from '../components/MaintenanceMode';

const PosContext = createContext();

export const usePos = () => useContext(PosContext);

export const PosProvider = ({ children }) => {
    // --- Master Data State ---
    const [products, setProducts] = useState({});
    const [productList, setProductList] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [error, setError] = useState(null);

    // --- Transaction State ---
    const [billId, setBillId] = useState('');
    const [cart, setCart] = useState([]); 
    const [billStep, setBillStep] = useState('scanning'); 
    
    // ใช้ Ref เพื่อป้องกันการ Re-render และเก็บ Sequence
    const billSequenceRef = useRef({ stamp: '', seq: 0 });

    // --- Initialization ---
    useEffect(() => {
        // 1. Load Bill Sequence from LocalStorage (เพื่อไม่ให้เลขบิลซ้ำเมื่อ Refresh)
        const savedSeq = localStorage.getItem(PRODUCT_STORAGE_KEYS.billSeq);
        if (savedSeq) {
            try {
                billSequenceRef.current = JSON.parse(savedSeq);
            } catch (e) { console.error("Invalid seq storage"); }
        }

        // 2. Load Products
        const loaded = loadFromStorage();
        if (!loaded) {
            setLoadingProducts(false);
        } else {
             // Fake Loading for better UX
             let progress = 0;
             const interval = setInterval(() => {
                 progress += 20;
                 setLoadingProgress(progress);
                 if(progress >= 100) {
                     clearInterval(interval);
                     setLoadingProducts(false);
                 }
             }, 100);
        }
        
        generateBillId(); // Gen ครั้งแรก

        // Listen to storage events (Cross-tab or same-tab updates)
        const handleStorageUpdate = () => loadFromStorage();
        window.addEventListener('pos-products-updated', handleStorageUpdate);
        return () => window.removeEventListener('pos-products-updated', handleStorageUpdate);
    }, []);

    // --- Logic Functions ---

    const buildProductState = (items) => {
        const map = {};
        const list = [];
        const seen = new Set();

        items.forEach((item) => {
            const code = String(item.code || '').trim().toUpperCase();
            const barcode = String(item.barcode || '').trim().toUpperCase();
            
            if (!code && !barcode) return;

            // Safe Number Parsing
            const product = {
                ...item,
                code,
                barcode,
                name: item.name || 'สินค้าไม่ระบุชื่อ',
                price: parseFloat(item.price) || 0,
                dealPrice: parseFloat(item.dealPrice) || 0,
                method: parseInt(item.method) || 0,
                // Pre-compute lowercase for search optimization
                searchString: `${code} ${barcode} ${item.name || ''}`.toLowerCase()
            };

            if (code) map[code] = product;
            if (barcode) map[barcode] = product;

            // Create Unique List for UI
            const uniqueKey = code || barcode;
            if (!seen.has(uniqueKey)) {
                seen.add(uniqueKey);
                list.push(product);
            }
        });
        return { map, list };
    };

    const loadFromStorage = () => {
        try {
            const storedItemExport = localStorage.getItem(PRODUCT_STORAGE_KEYS.itemExport);
            if (!storedItemExport) return false;

            const items = JSON.parse(storedItemExport);
            if (Array.isArray(items) && items.length > 0) {
                const { map, list } = buildProductState(items);
                setProducts(map);
                setProductList(list);
                return true;
            }
        } catch (err) {
            console.error('Failed to read local products', err);
            setError(err);
        }
        return false;
    };

    const generateBillId = () => {
        const now = new Date();
        // Format: DDMMYYHHMM (10 digits)
        const stamp = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).slice(-2)}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        
        if (billSequenceRef.current.stamp === stamp) {
            billSequenceRef.current.seq += 1;
        } else {
            billSequenceRef.current = { stamp, seq: 1 };
        }
        
        // Save Sequence to storage to persist across refresh
        localStorage.setItem(PRODUCT_STORAGE_KEYS.billSeq, JSON.stringify(billSequenceRef.current));

        const seq = String(billSequenceRef.current.seq).padStart(2, '0');
        setBillId(`${stamp}${seq}`);
    };

    const addItem = (inputCode, qty = 1) => {
        const normalizedInput = String(inputCode || '').trim().toUpperCase();
        if (!normalizedInput) return false;
        
        // Lookup O(1)
        let product = products[normalizedInput];
        
        // Fallback search
        if (!product) {
             product = productList.find(p => p.code === normalizedInput || p.barcode === normalizedInput);
        }
        
        if (!product) return false;

        setCart(prevCart => {
            const existingIdx = prevCart.findIndex(item => item.code === product.code);
            const method = Number(product.method) || 0;
            const currentQty = Number(qty);

            if (existingIdx >= 0) {
                const newCart = [...prevCart];
                const oldItem = newCart[existingIdx];
                const newQty = oldItem.qty + currentQty;
                const pricing = calculatePrice(product, newQty, method);
                
                newCart[existingIdx] = { ...oldItem, ...pricing, qty: newQty };
                return newCart;
            } else {
                const pricing = calculatePrice(product, currentQty, method);
                return [...prevCart, { ...product, ...pricing, qty: currentQty, timestamp: null }];
            }
        });
        return true;
    };

    const removeItem = (index) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const clearBill = () => {
        setCart([]);
        setBillStep('scanning');
        generateBillId(); 
    };

    // ใช้ useMemo คำนวณ Totals เพื่อ performance ที่ดีขึ้น
    const totals = useMemo(() => {
        return cart.reduce((acc, item) => ({
            subtotal: acc.subtotal + (item.unitPrice * item.qty),
            totalDiscount: acc.totalDiscount + (item.discount || 0),
            netTotal: acc.netTotal + item.total
        }), { subtotal: 0, totalDiscount: 0, netTotal: 0 });
    }, [cart]);

    const finalizeBill = async (receivedAmount) => {
        if (!cart.length) return null;
        
        const received = Number(receivedAmount) || 0;
        const total = totals.netTotal;
        const change = Math.max(0, received - total);
        const timestamp = new Date();

        const itemsToSave = cart.map((item) => ({
            code: item.code,
            name: item.name,
            qty: item.qty,
            price: item.unitPrice,
            total: item.total,
            savedAt: timestamp.toISOString(),
            billNo: billId
        }));

        try {
            await addDoc(collection(db, 'bills'), {
                billNo: billId,
                items: itemsToSave,
                summary: {
                    subtotal: totals.subtotal,
                    discount: totals.totalDiscount,
                    total: total,
                    received,
                    change
                },
                timestamp: serverTimestamp(),
                dateStr: timestamp.toLocaleDateString('th-TH'),
                device: navigator.userAgent
            });

            clearBill();
            return { change };
        } catch (err) {
            console.error("Save bill error:", err);
            // ถ้า Offline หรือ Error ให้ throw เพื่อให้ UI แจ้งเตือน
            throw new Error("ไม่สามารถบันทึกบิลได้ กรุณาตรวจสอบอินเทอร์เน็ต");
        }
    };

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
            startNewBill: clearBill,
            cancelBill: () => { if(window.confirm('ยกเลิกบิลปัจจุบัน?')) clearBill(); },
            finalizeBill,
            totals
        }}>
            {error ? (
                <MaintenanceMode onRetry={() => window.location.reload()} />
            ) : (
                <>
                    {children}
                    <LoadingScreen isLoading={loadingProducts} progress={loadingProgress} />
                </>
            )}
        </PosContext.Provider>
    );
};