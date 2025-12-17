import React, { useState, useEffect, useRef } from 'react';
import { usePos } from '../context/PosContext';
import { Scan, Search, PlusCircle, Trash2, Box } from 'lucide-react';

const PosTerminal = () => {
    const {
        cart,
        addItem,
        removeItem,
        billId,
        products
    } = usePos();

    // Local UI State
    const [scanInput, setScanInput] = useState('');
    const [qtyInput, setQtyInput] = useState(1);
    const [isQtyModalOpen, setIsQtyModalOpen] = useState(false);

    const inputRef = useRef(null);

    // Auto Focus Scan Input
    useEffect(() => {
        if (!isQtyModalOpen) inputRef.current?.focus();
    }, [isQtyModalOpen, cart]);

    const handleScan = (e) => {
        if (e.key === 'Enter') {
            if (!scanInput) return;

            // Attempt add
            const success = addItem(scanInput, qtyInput);

            if (success) {
                setScanInput('');
                setQtyInput(1); // Reset Qty
            } else {
                // Not found logic (Alert or Search)
                alert("Product not found!");
                setScanInput('');
            }
        }
    };

    const handleF8 = (e) => {
        if (e.key === 'F8') {
            e.preventDefault();
            setIsQtyModalOpen(true);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Top Bar: Bill Info & Scan */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700 font-bold font-mono text-sm">
                            BILL: {billId || '...'}
                        </div>
                    </div>
                    <div className="text-xs font-bold text-slate-400">
                        Method: Standard
                    </div>
                </div>

                <div className="flex gap-4">
                    {/* Qty Indicator */}
                    <div
                        className="flex flex-col items-center justify-center w-20 bg-white border border-indigo-100 rounded-xl cursor-pointer hover:border-indigo-300"
                        onClick={() => setIsQtyModalOpen(true)}
                        title="Press F8 to change"
                    >
                        <span className="text-[10px] uppercase font-bold text-slate-400">QTY (F8)</span>
                        <span className="text-2xl font-bold text-indigo-600">{qtyInput}</span>
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
                            }}
                            className="w-full h-14 pl-12 pr-4 rounded-xl border border-slate-200 text-lg font-semibold shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none"
                            placeholder="Scan Barcode..."
                            autoComplete="off"
                        />
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
                        <div key={idx} className="group grid grid-cols-[1fr_80px_100px_100px_50px] gap-4 px-4 py-3 items-center rounded-lg hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100">
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
                                {item.discount > 0 && <div className="text-xs text-green-600Line-through">Reg: {item.unitPrice + (item.discount / item.qty)}</div>}
                            </div>

                            <div className="text-right font-bold text-indigo-600 text-lg">
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
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-80">
                        <h3 className="font-bold text-lg mb-4 text-center">Enter Quantity</h3>
                        <input
                            type="number"
                            min="1"
                            className="w-full text-center text-4xl font-bold p-4 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 focus:outline-none mb-6"
                            autoFocus
                            onChange={(e) => setQtyInput(Number(e.target.value))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setIsQtyModalOpen(false);
                                    inputRef.current?.focus();
                                }
                            }}
                        />
                        <button
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                            onClick={() => setIsQtyModalOpen(false)}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PosTerminal;
