import React, { useState, useEffect, useRef } from 'react';
import { usePos } from '../contexts/PosContext';
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
                <p>ไม่มีสินค้าในบิล</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <h3 className="font-bold text-base md:text-lg mb-4 md:mb-6 flex items-center gap-2" style={{ color: '#4285F4' }}>
                <CreditCard size={18} />
                ชำระเงิน
            </h3>

            {/* Totals */}
            <div className="space-y-2 md:space-y-3 mb-4 md:mb-6 text-sm md:text-base">
                <div className="flex justify-between text-slate-500 font-medium">
                    <span>ราคารวม</span>
                    <span>{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600 font-medium">
                    <span>ส่วนลด</span>
                    <span>-{totals.totalDiscount.toFixed(2)}</span>
                </div>
                <div className="pt-2 md:pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-end">
                        <span className="text-base md:text-lg font-bold text-slate-900">ยอดสุทธิ</span>
                        <span className="text-2xl md:text-3xl font-extrabold" style={{ color: '#4285F4' }}>
                            {totals.netTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Payment Input */}
            <div className="mt-auto space-y-3 md:space-y-4">
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
                            className="w-full text-2xl md:text-3xl font-bold p-3 md:p-4 rounded-lg md:rounded-xl bg-slate-50 border-2 focus:outline-none text-right transition-all"
                            style={{
                                borderColor: billStep === 'payment' ? '#4285F4' : '#cbd5e1',
                                boxShadow: billStep === 'payment' ? '0 0 0 4px rgba(66, 133, 244, 0.1)' : 'none'
                            }}
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                        เงินทอน
                    </label>
                    <div className="w-full text-xl md:text-2xl font-bold p-2 md:p-3 rounded-lg md:rounded-xl bg-slate-100 text-slate-400 text-right">
                        {change.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <button
                    onClick={handlePay}
                    disabled={!canPay}
                    className={`w-full py-3 md:py-4 rounded-lg md:rounded-xl text-base md:text-lg font-bold text-white shadow-lg transition-all ${canPay
                            ? 'hover:shadow-lg'
                            : 'cursor-not-allowed opacity-50'
                        }`}
                    style={{
                        backgroundColor: canPay ? '#4285F4' : '#cbd5e1',
                    }}
                >
                    {canPay ? `รับเงิน (Enter)` : 'กรอกจำนวนเงิน'}
                </button>
            </div>
        </div>
    );
};

export default PosCheckout;
