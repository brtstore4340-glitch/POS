import React, { useEffect, useState } from 'react';
import { db, collection, getDocs, orderBy, query } from '../services/firebase';
import Barcode from 'react-barcode';

const DailyReport = () => {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBills = async () => {
            try {
                // In real app, filter by Date. For now fetch all recent.
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Firestore filtering by timestamp would require an index. 
                // For demo, just limit 50? Or fetch all.
                const q = query(
                    collection(db, "bills"),
                    // where("timestamp", ">=", today), // Needs Index
                    orderBy("timestamp", "desc")
                );

                const snap = await getDocs(q);
                const list = [];
                snap.forEach(d => list.push({ id: d.id, ...d.data() }));
                setBills(list);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchBills();
    }, []);

    const totalAmount = bills.reduce((sum, b) => sum + (b.total || 0), 0);
    const totalReceived = bills.reduce((sum, b) => sum + (b.receivedAmount || 0), 0);
    const totalChange = bills.reduce((sum, b) => sum + (b.change || 0), 0);
    const reportDate = new Date().toLocaleDateString('th-TH');

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col h-full">
            {/* Report Header */}
            <div className="p-6 border-b border-slate-100 bg-blue-50">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <img
                            src="https://store.boots.co.th/images/boots-logo.png"
                            alt="Boots"
                            className="h-10 w-auto"
                        />
                        <div>
                            <h1 className="text-lg font-bold uppercase tracking-tight text-slate-800">
                                4340 Grand 5 Sukhumvit Daily Sale IT Maintenance Report
                            </h1>
                            <div className="text-xs text-blue-700 font-medium">รายงานประจำวันที่ {reportDate}</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold text-slate-500">Total Bills</div>
                        <div className="text-2xl font-extrabold text-blue-700">{bills.length}</div>
                    </div>
                </div>
                <div className="flex justify-between items-center mt-6 flex-wrap gap-2">
                    <div className="text-sm font-bold text-slate-500">
                        Grand Total: <span className="text-blue-600 text-2xl">{totalAmount.toLocaleString()} THB</span>
                    </div>
                    <div className="text-sm font-bold text-slate-500">
                        Total Received: <span className="text-slate-900 text-xl">{totalReceived.toLocaleString()} THB</span>
                    </div>
                    <div className="text-sm font-bold text-slate-500">
                        Total Change: <span className="text-slate-900 text-xl">{totalChange.toLocaleString()} THB</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 space-y-8">
                {bills.length === 0 && !loading && (
                    <div className="text-center text-slate-400 py-10">No transactions today</div>
                )}

                {bills.map((bill) => (
                    <div key={bill.id} className="border border-slate-200 rounded-lg p-4 break-inside-avoid">
                        <div className="flex justify-between mb-2 text-xs font-mono text-slate-500 border-b border-dashed border-slate-200 pb-2">
                            <span>Bill: {bill.billNo}</span>
                            <span>{bill.timestamp?.toDate ? bill.timestamp.toDate().toLocaleString() : 'Just now'}</span>
                        </div>

                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-slate-400 uppercase text-left">
                                    <th className="font-semibold pb-2">Item Code / Name</th>
                                    <th className="font-semibold pb-2 text-left">Barcode</th>
                                    <th className="font-semibold pb-2 text-right">Qty</th>
                                    <th className="font-semibold pb-2 text-right">Price</th>
                                    <th className="font-semibold pb-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {bill.items?.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-2">
                                            <div className="font-bold text-slate-700">{item.name}</div>
                                            <div className="text-xs font-mono text-slate-400">{item.code}</div>
                                        </td>
                                        <td className="py-2">
                                            {item.code ? (
                                                <Barcode
                                                    value={String(item.code)}
                                                    height={30}
                                                    width={1.2}
                                                    displayValue={false}
                                                />
                                            ) : (
                                                <span className="text-xs text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className={`py-2 text-right ${item.qty > 1 ? 'text-red-700 font-extrabold text-lg' : 'text-slate-600 font-medium'}`}>
                                            {item.qty}
                                        </td>
                                        <td className="py-2 text-right text-slate-600">
                                            {Number(item.unitPrice || 0).toFixed(2)}
                                        </td>
                                        <td className="py-2 text-right font-bold text-slate-800">
                                            {Number(item.total || 0).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-sm text-slate-600 flex items-center justify-between">
                <div>
                    สรุปจำนวนบิล: <span className="font-bold text-slate-800">{bills.length}</span> | ยอดรวมเงิน:{' '}
                    <span className="font-bold text-slate-800">{totalAmount.toLocaleString()} THB</span> | ยอดรับชำระ:{' '}
                    <span className="font-bold text-slate-800">{totalReceived.toLocaleString()} THB</span> | เงินทอน:{' '}
                    <span className="font-bold text-slate-800">{totalChange.toLocaleString()} THB</span>
                </div>
                <div className="text-slate-500 font-medium">สิ้นสุดบิลวันที่ {reportDate}</div>
            </div>
        </div>
    );
};

export default DailyReport;
