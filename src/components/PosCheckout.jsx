import React, { useState } from 'react';
import { usePos } from '../context/PosContext';
import { CreditCard, Banknote, Coins, CheckCircle, XCircle } from 'lucide-react';

const PosCheckout = () => {
    const { totals, billStep, setBillStep, clearBill, cart } = usePos();
    const [receivedAmount, setReceivedAmount] = useState('');

    // Derived
    const total = totals.netTotal;
    const change = Math.max(0, (Number(receivedAmount) || 0) - total);
    const canPay = (Number(receivedAmount) || 0) >= total && total > 0;

    const handlePay = () => {
        if (!canPay) return;
        // In real app, save to DB here
        // For now, simulate success
        alert(`Paid! Change: ${change.toFixed(2)}`);
        clearBill();
        setReceivedAmount('');
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
                <CreditCard className="text-indigo-600" size={20} />
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
                        <span className="text-3xl font-extrabold text-indigo-600">
                            {totals.netTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Payment Input */}
            <div className="mt-auto space-y-4">
                <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                        Cash Received
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={receivedAmount}
                            onChange={(e) => setReceivedAmount(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handlePay();
                            }}
                            className="w-full text-3xl font-bold p-4 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 focus:outline-none text-right"
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                        Change
                    </label>
                    <div className="w-full text-2xl font-bold p-3 rounded-xl bg-slate-100 text-slate-400 text-right">
                        {change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <button
                    onClick={handlePay}
                    disabled={!canPay}
                    className={`w-full py-4 rounded-xl text-lg font-bold text-white shadow-lg transition-all ${canPay
                            ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 shadow-indigo-100'
                            : 'bg-slate-300 cursor-not-allowed'
                        }`}
                >
                    {canPay ? `CONFIRM PAY (${change.toFixed(2)})` : 'ENTER AMOUNT'}
                </button>
            </div>
        </div>
    );
};

export default PosCheckout;
