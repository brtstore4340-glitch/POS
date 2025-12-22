// src/components/PosTerminal.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePos } from "../context/PosContext";
import { Scan, Trash2, Box, X } from "lucide-react";

const PosTerminal = () => {
  // ✅ Robust destructure: กัน usePos() ยังไม่พร้อม
  const pos = usePos?.() || {};
  const {
    cart = [],
    addItem = () => false,
    removeItem = () => {},
    billId = "",
    productList = [],
    startNewBill = () => {},
    cancelBill = () => {},
    billStep = "scanning",
    setBillStep = () => {},
  } = pos;

  // Local UI State
  const [scanInput, setScanInput] = useState("");
  const [qtyInput, setQtyInput] = useState(1);
  const [isQtyModalOpen, setIsQtyModalOpen] = useState(false);
  const [qtyDraft, setQtyDraft] = useState("1");
  const [searchResults, setSearchResults] = useState([]);
  const [showNotFound, setShowNotFound] = useState(false);

  const inputRef = useRef(null);

  // Auto Focus Scan Input
  useEffect(() => {
    if (!isQtyModalOpen) inputRef.current?.focus();
  }, [isQtyModalOpen, cart.length]);

  // Search suggestions
  useEffect(() => {
    const value = scanInput.trim();
    if (value.length < 1) {
      setSearchResults([]);
      return;
    }

    const list = Array.isArray(productList) ? productList : [];
    const needleUpper = value.toUpperCase();
    const needleLower = value.toLowerCase();

    const timer = setTimeout(() => {
      const matches = list.filter((item) => {
        const nameLower = String(item?.nameLower ?? "").toLowerCase();
        const code = String(item?.code ?? "").toUpperCase();
        const barcode = String(item?.barcode ?? "").toUpperCase();

        return (
          nameLower.includes(needleLower) ||
          code.includes(needleUpper) ||
          barcode.includes(needleUpper)
        );
      });

      setSearchResults(matches.slice(0, 8));
    }, 80);

    return () => clearTimeout(timer);
  }, [scanInput, productList]);

  const doAddItemByTerm = useCallback(
    (termUpper) => {
      if (!termUpper) return false;

      // Try exact code match first
      let success = addItem(termUpper, qtyInput);

      // If not found, try from search results
      if (!success) {
        if (searchResults.length === 1) {
          success = addItem(searchResults[0].code, qtyInput);
        } else if (searchResults.length > 1) {
          const exactMatch = searchResults.find(
            (item) => item.code === termUpper || item.barcode === termUpper
          );
          if (exactMatch) success = addItem(exactMatch.code, qtyInput);
        }
      }

      return success;
    },
    [addItem, qtyInput, searchResults]
  );

  const handleScanEnter = useCallback(() => {
    const raw = scanInput.trim();
    if (!raw) return;

    const termUpper = raw.toUpperCase();
    const success = doAddItemByTerm(termUpper);

    if (!success) {
      setShowNotFound(true);
      setScanInput("");
      return;
    }

    setScanInput("");
    setQtyInput(1);
    setSearchResults([]);
  }, [scanInput, doAddItemByTerm]);

  const openQtyModal = useCallback(() => {
    setQtyDraft(String(qtyInput || 1));
    setIsQtyModalOpen(true);
  }, [qtyInput]);

  const focusPayment = useCallback(() => {
    setBillStep("payment");
    window.dispatchEvent(new Event("pos-focus-payment"));
  }, [setBillStep]);

  // Key handlers (F8/F4) - use window listener so it works even if input focus changes
  useEffect(() => {
    const onKeyDown = (e) => {
      if (isQtyModalOpen) return;

      if (e.key === "F8") {
        e.preventDefault();
        openQtyModal();
      }

      if (e.key === "F4") {
        e.preventDefault();
        focusPayment();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isQtyModalOpen, openQtyModal, focusPayment]);

  const handlePickResult = (item) => {
    const success = addItem(item.code, qtyInput);
    if (!success) setShowNotFound(true);

    setScanInput("");
    setQtyInput(1);
    setSearchResults([]);
    inputRef.current?.focus();
  };

  const handleStartNewBill = () => {
    startNewBill();
    setScanInput("");
    setQtyInput(1);
    setSearchResults([]);
    inputRef.current?.focus();
  };

  const handleCancelBill = () => {
    cancelBill();
    setScanInput("");
    setQtyInput(1);
    setSearchResults([]);
    inputRef.current?.focus();
  };

  const confirmQty = () => {
    const parsed = Number(qtyDraft);
    const nextQty = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
    setQtyInput(nextQty);
    setIsQtyModalOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg md:rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Top Bar: Bill Info & Scan */}
      <div className="p-2 md:p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-2 md:mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div
              className="px-2 md:px-3 py-1 rounded-lg font-bold font-mono text-xs md:text-sm"
              style={{ backgroundColor: "#e8f0fe", color: "#4285F4" }}
            >
              บิล: {billId || "..."}
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <button
              type="button"
              onClick={handleStartNewBill}
              className="px-2 md:px-4 py-1 md:py-2 rounded-lg text-white text-xs md:text-xs font-bold hover:shadow-md transition-all"
              style={{ backgroundColor: "#34A853" }}
            >
              เริ่มบิล
            </button>
            <button
              type="button"
              onClick={handleCancelBill}
              className="px-2 md:px-4 py-1 md:py-2 rounded-lg text-white text-xs md:text-xs font-bold hover:shadow-md transition-all"
              style={{ backgroundColor: "#EA4335" }}
            >
              ยกเลิก
            </button>
          </div>
        </div>

        <div className="flex gap-2 md:gap-4">
          {/* Qty Indicator */}
          <div
            className="flex flex-col items-center justify-center px-2 md:px-4 py-1 md:py-2 bg-white border rounded-lg md:rounded-xl cursor-pointer hover:shadow-md transition-all text-sm md:text-base"
            onClick={openQtyModal}
            title="Press F8 to change"
            style={{ borderColor: "#4285F4", color: "#4285F4" }}
          >
            <span className="text-[8px] md:text-[10px] uppercase font-bold text-slate-400">
              จำนวน (F8)
            </span>
            <span className="text-xl md:text-2xl font-bold">{qtyInput}</span>
          </div>

          {/* Scan Input */}
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Scan size={20} />
            </div>

            <input
              ref={inputRef}
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleScanEnter();
                }
              }}
              onFocus={() => setBillStep("scanning")}
              onBlur={() => {
                if (!isQtyModalOpen) setTimeout(() => inputRef.current?.focus(), 0);
              }}
              className="w-full h-12 md:h-14 pl-10 md:pl-12 pr-4 rounded-lg md:rounded-xl border-2 text-base md:text-lg font-semibold shadow-sm focus:outline-none transition-all"
              style={{
                boxShadow:
                  billStep === "scanning" ? "0 0 0 4px rgba(66, 133, 244, 0.1)" : "none",
                borderColor: billStep === "scanning" ? "#4285F4" : "#e8e8e8",
              }}
              placeholder="สแกนบาร์โค้ด / ค้นหา..."
              autoComplete="off"
            />

            {searchResults.length > 0 && scanInput && (
              <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
                {searchResults.map((item) => (
                  <button
                    type="button"
                    key={item.code}
                    onClick={() => handlePickResult(item)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-semibold text-slate-800">{item.name}</div>
                    <div className="text-xs text-slate-400 font-mono">{item.code}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* List Header */}
      <div
        className="grid grid-cols-[1fr_60px_80px_80px_40px] md:grid-cols-[1fr_80px_100px_100px_50px] gap-2 md:gap-4 px-3 md:px-6 py-2 md:py-3 bg-slate-50 border-b text-xs md:text-xs font-bold uppercase tracking-wider"
        style={{ color: "#4285F4", borderBottomColor: "#4285F4" }}
      >
        <div>รายการ</div>
        <div className="text-center">จำนวน</div>
        <div className="text-right">ราคา</div>
        <div className="text-right">รวม</div>
        <div></div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-1 md:p-2 space-y-0.5 md:space-y-1">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
            <Box size={36} className="mb-2 md:mb-4 opacity-50" />
            <p className="font-medium text-sm md:text-base">พร้อมสแกน</p>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div
              key={idx}
              className="group grid grid-cols-[1fr_60px_80px_80px_40px] md:grid-cols-[1fr_80px_100px_100px_50px] gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 items-center rounded-lg hover:bg-blue-50 transition-colors border border-transparent"
            >
              <div>
                <div className="font-bold text-slate-800 text-xs md:text-base">{item.name}</div>
                <div className="text-[10px] md:text-xs text-slate-400 font-mono">{item.code}</div>
                {item.isPromo && (
                  <span
                    className="inline-block mt-0.5 md:mt-1 px-1 md:px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-bold text-white"
                    style={{ backgroundColor: "#34A853" }}
                  >
                    โปรโมชั่น
                  </span>
                )}
              </div>

              <div className="text-center font-bold text-base md:text-lg text-slate-700">
                {item.qty}
              </div>

              <div className="text-right text-xs md:text-base">
                <div className="font-medium text-slate-600">{item.unitPrice.toFixed(2)}</div>
                {item.discount > 0 && (
                  <div className="text-[8px] md:text-xs text-slate-400 line-through">
                    {(item.unitPrice + item.discount / item.qty).toFixed(2)}
                  </div>
                )}
              </div>

              <div className="text-right font-bold text-sm md:text-lg" style={{ color: "#4285F4" }}>
                {item.total.toFixed(2)}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="p-1 md:p-2 rounded-full transition-colors"
                  style={{ color: "#9ca3af" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
                  aria-label="Remove item"
                >
                  <Trash2 size={14} className="md:w-4 md:h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Qty Modal */}
      {isQtyModalOpen && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
          onClick={() => setIsQtyModalOpen(false)}
        >
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4 text-center">ใส่จำนวนสินค้า (F8)</h3>
            <input
              type="number"
              min="1"
              value={qtyDraft}
              className="w-full text-center text-4xl font-bold p-4 border-2 rounded-xl focus:outline-none mb-6 transition-all"
              style={{ borderColor: "#4285F4", boxShadow: "0 0 0 2px rgba(66, 133, 244, 0.1)" }}
              autoFocus
              onChange={(e) => setQtyDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmQty();
                if (e.key === "Escape") setIsQtyModalOpen(false);
              }}
            />
            <button
              type="button"
              className="w-full py-3 text-white rounded-xl font-bold hover:shadow-lg transition-all"
              style={{ backgroundColor: "#4285F4" }}
              onClick={confirmQty}
            >
              ยืนยัน
            </button>
          </div>
        </div>
      )}

      {/* Not Found Modal */}
      {showNotFound && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-80 text-center">
            <div
              className="mx-auto mb-3 h-10 w-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(234, 67, 53, 0.1)" }}
            >
              <X style={{ color: "#EA4335" }} size={20} />
            </div>
            <h3 className="font-bold text-lg mb-2 text-slate-800">ไม่พบรหัสสินค้า</h3>
            <p className="text-sm text-slate-500 mb-6">กรุณาตรวจสอบบาร์โค้ดหรือชื่อสินค้า</p>
            <button
              type="button"
              className="w-full py-3 text-white rounded-xl font-bold hover:shadow-lg transition-all"
              style={{ backgroundColor: "#4285F4" }}
              onClick={() => {
                setShowNotFound(false);
                inputRef.current?.focus();
              }}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PosTerminal;
