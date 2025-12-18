import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db, collection, getDocs, addDoc, serverTimestamp } from '../services/firebase';
import { calculatePrice } from '../features/pricing'; // ต้องมีไฟล์นี้ตามข้อ 1
import { PRODUCT_STORAGE_KEYS } from '../services/dataService';

import LoadingScreen from '../components/LoadingScreen';
import MaintenanceMode from '../components/MaintenanceMode';

const PosContext = createContext();

export const usePos = () => useContext(PosContext);

export const PosProvider = ({ children }) => {
    // Master Data State
    const [products, setProducts] = useState({}); // Map สำหรับค้นหาเร็วๆ
    const [productList, setProductList] = useState([]); // Array สำหรับ Search/Filter
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [error, setError] = useState(null);

    // Transaction State
    const [billId, setBillId] = useState('');
    const [cart, setCart] = useState([]); 
    const [billStep, setBillStep] = useState('scanning'); // scanning, payment
    
    // ใช้ Ref เก็บ Sequence เพื่อไม่ให้ Reset ระหว่าง Re-render
    const billSequenceRef = useRef({ stamp: '', seq: 0 });

    // Load Data on Mount
    useEffect(() => {
        const loaded = loadFromStorage();
        // ถ้าไม่มีใน LocalStorage ให้ลองดึงจาก Firebase (ถ้ามีระบบนั้น) หรือรอ User Upload
        if (!loaded) {
            setLoadingProducts(false); // ปิด Loading เพื่อให้ User ไปหน้า Settings ได้
        } else {
             // Simulate loading effect for UX
             let progress = 0;
             const interval = setInterval(() => {
                 progress += 10;
                 setLoadingProgress(progress);
                 if(progress >= 100) {
                     clearInterval(interval);
                     setLoadingProducts(false);
                 }
             }, 50);
        }
        
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
            // Normalization
            const code = String(item.code || '').trim().toUpperCase();
            const barcode = String(item.barcode || '').trim().toUpperCase();
            
            if (!code && !barcode) return;

            const product = {
                ...item,
                code,
                barcode,
                name: item.name || 'Unknown Item',
                price: Number(item.price) || 0,
                dealPrice: Number(item.dealPrice) || 0,
                method: Number(item.method) || 0,
                nameLower: String(item.name || '').toLowerCase(),
            };

            // Indexing for O(1) lookup
            if (code) map[code] = product;
            if (barcode) map[barcode] = product;

            // List for UI search
            // ใช้ Code เป็น Unique Key ในการแสดงผล list
            if (code && !seen.has(code)) {
                seen.add(code);
                list.push(product);
            } else if (!code && barcode && !seen.has(barcode)) {
                seen.add(barcode);
                list.push(product);
            }
        });

        return { map, list };
    };

    const loadFromStorage = () => {
        const storedItemExport = localStorage.getItem(PRODUCT_STORAGE_KEYS.itemExport);
        
        if (!storedItemExport) return false;

        try {
            const items = JSON.parse(storedItemExport);
            if (Array.isArray(items) && items.length > 0) {
                const { map, list } = buildProductState(items);
                setProducts(map);
                setProductList(list);
                return true;
            }
        } catch (err) {
            console.error('Failed to read local products', err);
        }
        return false;
    };

    const generateBillId = () => {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yy = String(now.getFullYear()).slice(-2);
        const hh = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        
        // Format: DDMMYYHHMM (เช่น 1912250930)
        const stamp = `${dd}${mm}${yy}${hh}${mins}`;
        
        if (billSequenceRef.current.stamp === stamp) {
            billSequenceRef.current.seq += 1;
        } else {
            billSequenceRef.current = { stamp, seq: 1 };
        }
        
        // ต่อท้ายด้วยลำดับ 01, 02...
        const seq = String(billSequenceRef.current.seq).padStart(2, '0');
        setBillId(`${stamp}${seq}`);
    };

    const addItem = (inputCode, qty = 1) => {
        const normalizedInput = String(inputCode || '').trim().toUpperCase();
        if (!normalizedInput) return false;
        
        // 1. ค้นหาจาก Map (รองรับทั้ง Code และ Barcode เพราะเรา Index ไว้ทั้งคู่)
        let product = products[normalizedInput];
        
        // 2. Fallback: ถ้าไม่เจอใน Map ลองหาแบบ loop (เผื่อกรณี edge case)
        if (!product) {
             product = productList.find(p => 
                p.code === normalizedInput || 
                p.barcode === normalizedInput
            );
        }
        
        if (!product) return false; // ไม่พบสินค้า

        // คำนวณราคาตาม Method
        const method = Number(product.method) || 0;
        const currentQty = Number(qty);
        
        // เช็คว่ามีสินค้านี้ในตะกร้าแล้วหรือยัง (ใช้ Product Code เป็นหลัก)
        const existingIdx = cart.findIndex(item => item.code === product.code);

        let newCart = [...cart];
        
        if (existingIdx >= 0) {
            // มีแล้ว -> บวกเพิ่ม
            const oldItem = newCart[existingIdx];
            const newQty = oldItem.qty + currentQty;
            const pricing = calculatePrice(product, newQty, method); // คำนวณใหม่ทั้งก้อน
            
            newCart[existingIdx] = {
                ...oldItem,
                ...pricing,
                qty: newQty
            };
        } else {
            // ยังไม่มี -> เพิ่มใหม่
            const pricing = calculatePrice(product, currentQty, method);
            newCart.push({
                ...product,
                ...pricing,
                qty: currentQty,
                timestamp: null // จะใส่เมื่อจ่ายเงิน
            });
        }
        
        setCart(newCart);
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
        generateBillId(); // รีเซ็ตเลขบิลใหม่ หรือจะใช้เลขเดิมก็ได้แล้วแต่ Logic ร้าน (ที่นี่เลือก Gen ใหม่เพื่อความชัวร์)
    };

    const startNewBill = () => {
        clearBill();
    };

    const cancelBill = () => {
        if(window.confirm('ยืนยันการยกเลิกบิลปัจจุบัน? รายการทั้งหมดจะถูกลบ')) {
            clearBill();
        }
    };

    const finalizeBill = async (receivedAmount) => {
        if (!cart.length) return null;
        
        const received = Number(receivedAmount) || 0;
        const total = netTotal;
        const change = Math.max(0, received - total);
        const timestamp = new Date();

        // Stamp เวลาลงในทุก Item
        const itemsToSave = cart.map((item) => ({
            ...item,
            savedAt: timestamp.toISOString(),
            billNo: billId
        }));

        try {
            // บันทึกลง Firestore
            await addDoc(collection(db, 'bills'), {
                billNo: billId,
                items: itemsToSave,
                total,
                receivedAmount: received,
                change,
                timestamp: serverTimestamp(),
                dateStr: timestamp.toLocaleDateString('th-TH')
            });

            // Reset UI
            clearBill();
            return { change };
        } catch (err) {
            console.error("Save bill error:", err);
            throw err;
        }
    };

    // Derived Totals
    const subtotal = cart.reduce((acc, item) => acc + (item.unitPrice * item.qty), 0); // จริงๆ ควรเป็น RegPrice * Qty แต่เพื่อความง่ายใช้ UnitPrice
    const totalDiscount = cart.reduce((acc, item) => acc + (item.discount || 0), 0);
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