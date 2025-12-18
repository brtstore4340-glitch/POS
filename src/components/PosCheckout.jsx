import React, { useState, useEffect, useRef } from 'react';
import { usePos } from '../context/PosContext';
import { CreditCard, Banknote } from 'lucide-react';

const PosCheckout = () => {
    const { totals, billStep, setBillStep, finalizeBill, cart } = usePos();
    const [receivedAmount, setReceivedAmount] = useState('');
    const inputRef = useRef(null);

    // Derived
    const total = totals.netTotal;
    const change = Math.max(0, (Number(receivedAmount) || 0) - total);
    const canPay = (Number(receivedAmount) || 0) >= total && total > 0;

    useEffect(() => {
        const focusHandler = () => inputRef.current?.focus();
        window.addEventListener('pos-focus-payment', focusHandler);
        return () => window.removeEventListener('pos-focus-payment', focusHandler);
    }, []);

    useEffect(() => {
        if (billStep === 'payment') {
            inputRef.current?.focus();
        }
    }, [billStep]);

    const handlePay = async () => {
        if (!canPay) return;
        try {
            await finalizeBill(receivedAmount);
            setReceivedAmount('');
            setBillStep('scanning');
        } catch (error) {
            console.error('Failed to finalize bill', error);
            alert('ไม่สามารถบันทึกบิลได้ กรุณาลองใหม่อีกครั้ง');
        }
    };

    if (cart.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Banknote size={48} className="mb-4 opacity-50" />
                <p>No items in bill</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <CreditCard className="text-blue-600" size={20} />
                Checkout
            </h3>

            {/* Totals */}
            <div className="space-y-3 mb-6">
                <div className="flex justify-between text-slate-500 font-medium">
                    <span>Subtotal</span>
                    <span>{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600 font-medium">
                    <span>Discount</span>
                    <span>-{totals.totalDiscount.toFixed(2)}</span>
                </div>
                <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-end">
                        <span className="text-lg font-bold text-slate-900">Total</span>
                        <span className="text-3xl font-extrabold text-blue-600">
                            {totals.netTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Payment Input */}
            <div className="mt-auto space-y-4">
                <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                        รับเงิน (F4)
                    </label>
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="number"
                            value={receivedAmount}
                            onChange={(e) => setReceivedAmount(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handlePay();
                            }}
                            onFocus={() => setBillStep('payment')}
                            className="w-full text-3xl font-bold p-4 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:outline-none text-right"
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                        เงินทอน
                    </label>
                    <div className="w-full text-2xl font-bold p-3 rounded-xl bg-slate-100 text-slate-400 text-right">
                        {change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <button
                    onClick={handlePay}
                    disabled={!canPay}
                    className={`w-full py-4 rounded-xl text-lg font-bold text-white shadow-lg transition-all ${canPay
                            ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200 shadow-blue-100'
                            : 'bg-slate-300 cursor-not-allowed'
                        }`}
                >
                    {canPay ? `รับเงิน (Enter)` : 'กรอกจำนวนเงิน'}
                </button>
            </div>
        </div>
    );
};

export default PosCheckout;
