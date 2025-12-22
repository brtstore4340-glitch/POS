import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { db } from "../services/firebase.js";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import LoadingScreen from "../components/ui/LoadingScreen.jsx";

// ✅ keys ขั้นต่ำ (กันพังถ้า dataService ยังไม่มี)
const PRODUCT_STORAGE_KEYS = {
  itemExport: "pos_item_export",
  billSeq: "pos_bill_seq",
};

// ✅ pricing ขั้นต่ำ (กันพังถ้า features/pricing ยังไม่มี)
function calculatePrice(product, qty) {
  const unitPrice = Number(product?.dealPrice || product?.price || 0);
  const total = unitPrice * Number(qty || 0);
  return { unitPrice, total, discount: 0 };
}

const PosContext = createContext(null);
export const usePos = () => useContext(PosContext);

export function PosProvider({ children }) {
  // --- Master Data ---
  const [products, setProducts] = useState({});
  const [productList, setProductList] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);

  // --- Transaction ---
  const [billId, setBillId] = useState("");
  const [cart, setCart] = useState([]);
  const [billStep, setBillStep] = useState("scanning");

  const billSequenceRef = useRef({ stamp: "", seq: 0 });

  useEffect(() => {
    // 1) Load Bill Seq (กันเลขบิลซ้ำตอน refresh)
    const savedSeq = localStorage.getItem(PRODUCT_STORAGE_KEYS.billSeq);
    if (savedSeq) {
      try {
        billSequenceRef.current = JSON.parse(savedSeq);
      } catch {
        // ignore
      }
    }

    // 2) Load Products from localStorage
    const loaded = loadFromStorage();
    if (!loaded) {
      setLoadingProducts(false);
    } else {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        setLoadingProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setLoadingProducts(false);
        }
      }, 80);
    }

    generateBillId();

    const handleStorageUpdate = () => loadFromStorage();
    window.addEventListener("pos-products-updated", handleStorageUpdate);
    return () => window.removeEventListener("pos-products-updated", handleStorageUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildProductState(items) {
    const map = {};
    const list = [];
    const seen = new Set();

    items.forEach((item) => {
      const code = String(item.code || "").trim().toUpperCase();
      const barcode = String(item.barcode || "").trim().toUpperCase();
      if (!code && !barcode) return;

      const product = {
        ...item,
        code,
        barcode,
        name: item.name || "สินค้าไม่ระบุชื่อ",
        price: Number(item.price) || 0,
        dealPrice: Number(item.dealPrice) || 0,
        method: Number(item.method) || 0,
        searchString: `${code} ${barcode} ${item.name || ""}`.toLowerCase(),
      };

      if (code) map[code] = product;
      if (barcode) map[barcode] = product;

      const uniqueKey = code || barcode;
      if (!seen.has(uniqueKey)) {
        seen.add(uniqueKey);
        list.push(product);
      }
    });

    return { map, list };
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(PRODUCT_STORAGE_KEYS.itemExport);
      if (!raw) return false;

      const items = JSON.parse(raw);
      if (Array.isArray(items) && items.length > 0) {
        const { map, list } = buildProductState(items);
        setProducts(map);
        setProductList(list);
        return true;
      }
    } catch (err) {
      console.error("Failed to read local products", err);
      setError(err);
    }
    return false;
  }

  function generateBillId() {
    const now = new Date();
    const stamp =
      `${String(now.getDate()).padStart(2, "0")}` +
      `${String(now.getMonth() + 1).padStart(2, "0")}` +
      `${String(now.getFullYear()).slice(-2)}` +
      `${String(now.getHours()).padStart(2, "0")}` +
      `${String(now.getMinutes()).padStart(2, "0")}`;

    if (billSequenceRef.current.stamp === stamp) {
      billSequenceRef.current.seq += 1;
    } else {
      billSequenceRef.current = { stamp, seq: 1 };
    }

    localStorage.setItem(PRODUCT_STORAGE_KEYS.billSeq, JSON.stringify(billSequenceRef.current));
    const seq = String(billSequenceRef.current.seq).padStart(2, "0");
    setBillId(`${stamp}${seq}`);
  }

  function addItem(inputCode, qty = 1) {
    const normalized = String(inputCode || "").trim().toUpperCase();
    if (!normalized) return false;

    let product = products[normalized];
    if (!product) {
      product = productList.find((p) => p.code === normalized || p.barcode === normalized);
    }
    if (!product) return false;

    const q = Number(qty) || 1;

    setCart((prev) => {
      const idx = prev.findIndex((it) => it.code === product.code);
      if (idx >= 0) {
        const next = [...prev];
        const old = next[idx];
        const newQty = Number(old.qty || 0) + q;
        const pricing = calculatePrice(product, newQty);
        next[idx] = { ...old, ...pricing, qty: newQty };
        return next;
      } else {
        const pricing = calculatePrice(product, q);
        return [...prev, { ...product, ...pricing, qty: q }];
      }
    });

    return true;
  }

  function removeItem(index) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  function clearBill() {
    setCart([]);
    setBillStep("scanning");
    generateBillId();
  }

  const totals = useMemo(() => {
    return cart.reduce(
      (acc, item) => ({
        subtotal: acc.subtotal + (Number(item.unitPrice) || 0) * (Number(item.qty) || 0),
        totalDiscount: acc.totalDiscount + (Number(item.discount) || 0),
        netTotal: acc.netTotal + (Number(item.total) || 0),
      }),
      { subtotal: 0, totalDiscount: 0, netTotal: 0 }
    );
  }, [cart]);

  async function finalizeBill(receivedAmount) {
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
      billNo: billId,
    }));

    await addDoc(collection(db, "bills"), {
      billNo: billId,
      items: itemsToSave,
      summary: {
        subtotal: totals.subtotal,
        discount: totals.totalDiscount,
        total,
        received,
        change,
      },
      timestamp: serverTimestamp(),
      dateStr: timestamp.toLocaleDateString("th-TH"),
      device: navigator.userAgent,
    });

    clearBill();
    return { change };
  }

  return (
    <PosContext.Provider
      value={{
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
        finalizeBill,
        totals,
      }}
    >
      {children}
      {/* ถ้า LoadingScreen ของพี่เป็นแบบง่าย ๆ ก็ยังแสดงได้ ไม่พัง */}
      {loadingProducts ? <LoadingScreen /> : null}
      {error ? (
        <div style={{ padding: 16, color: "crimson" }}>
          POS Error: {String(error?.message || error)}
        </div>
      ) : null}
    </PosContext.Provider>
  );
}

