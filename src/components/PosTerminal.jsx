import React, { useState, useEffect, useRef } from 'react';
import { usePos } from '../context/PosContext';
import { Scan, Trash2, Box, X } from 'lucide-react';

const PosTerminal = () => {
    const {
        cart,
        addItem,
        removeItem,
        billId,
        productList,
        startNewBill,
        cancelBill,
        setBillStep
    } = usePos();

    // Local UI State
    const [scanInput, setScanInput] = useState('');
    const [qtyInput, setQtyInput] = useState(1);
    const [isQtyModalOpen, setIsQtyModalOpen] = useState(false);
    const [qtyDraft, setQtyDraft] = useState('1');
    const [searchResults, setSearchResults] = useState([]);
    const [showNotFound, setShowNotFound] = useState(false);

    const inputRef = useRef(null);

    // Auto Focus Scan Input
    useEffect(() => {
        if (!isQtyModalOpen) inputRef.current?.focus();
    }, [isQtyModalOpen, cart]);

    useEffect(() => {
        const value = scanInput.trim().toLowerCase();
        if (value.length < 2) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(() => {
            const matches = productList.filter((item) => item.nameLower?.includes(value));
            setSearchResults(matches.slice(0, 8));
        }, 150);

        return () => clearTimeout(timer);
    }, [scanInput, productList]);

    const handleScan = (e) => {
        if (e.key === 'Enter') {
            if (!scanInput) return;

            // Attempt add
            let success = addItem(scanInput, qtyInput);

            if (!success && searchResults.length === 1) {
                success = addItem(searchResults[0].code, qtyInput);
            }

            if (!success) {
                setShowNotFound(true);
                setScanInput('');
                return;
            }

            setScanInput('');
            setQtyInput(1); // Reset Qty
            setSearchResults([]);
        }
    };

    const handleF8 = (e) => {
        if (e.key === 'F8') {
            e.preventDefault();
            setQtyDraft(String(qtyInput || 1));
            setIsQtyModalOpen(true);
        }
    };

    const handleF4 = (e) => {
        if (e.key === 'F4') {
            e.preventDefault();
            setBillStep('payment');
            window.dispatchEvent(new Event('pos-focus-payment'));
        }
    };

    const handlePickResult = (item) => {
        const success = addItem(item.code, qtyInput);
        if (!success) {
            setShowNotFound(true);
        }
        setScanInput('');
        setQtyInput(1);
        setSearchResults([]);
        inputRef.current?.focus();
    };

    const handleStartNewBill = () => {
        startNewBill();
        setScanInput('');
        setQtyInput(1);
        setSearchResults([]);
        inputRef.current?.focus();
    };

    const handleCancelBill = () => {
        cancelBill();
        setScanInput('');
        setQtyInput(1);
        setSearchResults([]);
        inputRef.current?.focus();
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Top Bar: Bill Info & Scan */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700 font-bold font-mono text-sm">
                            BILL: {billId || '...'}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleStartNewBill}
                            className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors"
                        >
                            เริ่มบิลใหม่
                        </button>
                        <button
                            type="button"
                            onClick={handleCancelBill}
                            className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-colors"
                        >
                            ยกเลิกบิล
                        </button>
                    </div>
                </div>

                <div className="flex gap-4">
                    {/* Qty Indicator */}
                    <div
                        className="flex flex-col items-center justify-center w-20 bg-white border border-blue-100 rounded-xl cursor-pointer hover:border-blue-300"
                        onClick={() => {
                            setQtyDraft(String(qtyInput || 1));
                            setIsQtyModalOpen(true);
                        }}
                        title="Press F8 to change"
                    >
                        <span className="text-[10px] uppercase font-bold text-slate-400">QTY (F8)</span>
                        <span className="text-2xl font-bold text-blue-600">{qtyInput}</span>
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
                                handleScan(e);
                                handleF8(e);
                                handleF4(e);
                            }}
                            onFocus={() => setBillStep('scanning')}
                            onBlur={() => {
                                if (!isQtyModalOpen) {
                                    setTimeout(() => inputRef.current?.focus(), 0);
                                }
                            }}
                            className="w-full h-14 pl-12 pr-4 rounded-xl border border-slate-200 text-lg font-semibold shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
                            placeholder="Scan Barcode / Search by Name..."
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
            <div className="grid grid-cols-[1fr_80px_100px_100px_50px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                <div>Item</div>
                <div className="text-center">Qty</div>
                <div className="text-right">Price</div>
                <div className="text-right">Total</div>
                <div></div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                        <Box size={48} className="mb-4 opacity-50" />
                        <p className="font-medium">Ready to Scan</p>
                    </div>
                ) : (
                    cart.map((item, idx) => (
                        <div key={idx} className="group grid grid-cols-[1fr_80px_100px_100px_50px] gap-4 px-4 py-3 items-center rounded-lg hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100">
                            <div>
                                <div className="font-bold text-slate-800">{item.name}</div>
                                <div className="text-xs text-slate-400 font-mono">{item.code}</div>
                                {item.isPromo && (
                                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                                        PROMO
                                    </span>
                                )}
                            </div>

                            <div className="text-center font-bold text-lg text-slate-700">
                                {item.qty}
                            </div>

                            <div className="text-right">
                                <div className="font-medium text-slate-600">{item.unitPrice.toFixed(2)}</div>
                                {item.discount > 0 && (
                                    <div className="text-xs text-slate-400 line-through">
                                        Reg: {(item.unitPrice + (item.discount / item.qty)).toFixed(2)}
                                    </div>
                                )}
                            </div>

                            <div className="text-right font-bold text-blue-600 text-lg">
                                {item.total.toFixed(2)}
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => removeItem(idx)}
                                    className="p-2 text-slate-300 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 size={16} />
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
                    onClick={() => {
                        if (!qtyDraft) setQtyInput(1);
                        setIsQtyModalOpen(false);
                    }}
                >
                    <div
                        className="bg-white p-6 rounded-2xl shadow-2xl w-80"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="font-bold text-lg mb-4 text-center">ใส่จำนวนสินค้า (F8)</h3>
                        <input
                            type="number"
                            min="1"
                            value={qtyDraft}
                            className="w-full text-center text-4xl font-bold p-4 border-2 border-blue-100 rounded-xl focus:border-blue-500 focus:outline-none mb-6"
                            autoFocus
                            onChange={(e) => setQtyDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const parsed = Number(qtyDraft);
                                    const nextQty = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
                                    setQtyInput(nextQty);
                                    setIsQtyModalOpen(false);
                                    inputRef.current?.focus();
                                }
                                if (e.key === 'Escape') {
                                    setIsQtyModalOpen(false);
                                }
                            }}
                        />
                        <button
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                            onClick={() => {
                                const parsed = Number(qtyDraft);
                                const nextQty = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
                                setQtyInput(nextQty);
                                setIsQtyModalOpen(false);
                                inputRef.current?.focus();
                            }}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            )}

            {/* Not Found Modal */}
            {showNotFound && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-80 text-center">
                        <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                            <X className="text-red-600" size={20} />
                        </div>
                        <h3 className="font-bold text-lg mb-2 text-slate-800">ไม่พบรหัสสินค้า</h3>
                        <p className="text-sm text-slate-500 mb-6">กรุณาตรวจสอบบาร์โค้ดหรือชื่อสินค้า</p>
                        <button
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
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
