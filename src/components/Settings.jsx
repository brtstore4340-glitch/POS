import React, { useState } from 'react';
import { importProductMaster, importItemExport } from '../services/dataService';
import { Upload, Database } from 'lucide-react';

const Settings = () => {
    const [uploadingKey, setUploadingKey] = useState('');
    const [progress, setProgress] = useState(0);
    const [msg, setMsg] = useState('');

    const handleFile = async (type, e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingKey(type);
        setMsg('กำลังอ่านไฟล์...');
        setProgress(0);

        try {
            const importer = type === 'item' ? importItemExport : importProductMaster;
            await importer(file, (pct) => {
                setProgress(pct);
                setMsg(`กำลังอัพโหลด... ${pct}%`);
            });
            setMsg('อัพโหลดสำเร็จ!');
            window.dispatchEvent(new Event('pos-products-updated'));
        } catch (err) {
            console.error(err);
            setMsg('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            setUploadingKey('');
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ color: '#4285F4' }}>
                <Database />
                จัดการข้อมูล
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    { key: 'product', title: 'อัพโหลด Product Master' },
                    { key: 'item', title: 'อัพโหลด Item_Export' },
                ].map((card) => (
                    <div
                        key={card.key}
                        className="border-2 border-dashed rounded-xl p-6 text-center bg-slate-50 hover:bg-blue-50 transition-colors relative"
                        style={{ borderColor: '#4285F4' }}
                    >
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={(e) => handleFile(card.key, e)}
                            disabled={!!uploadingKey}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />

                        <div className="flex flex-col items-center">
                            {uploadingKey === card.key ? (
                                <div className="w-12 h-12 border-4 rounded-full animate-spin mb-4" style={{ borderColor: '#e8e8e8', borderTopColor: '#4285F4' }}></div>
                            ) : (
                                <Upload size={40} className="text-slate-400 mb-4" />
                            )}

                            <p className="text-base font-bold text-slate-700">
                                {uploadingKey === card.key ? 'กำลังประมวลผล...' : card.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                                ลากไฟล์วาง หรือ คลิกเพื่อเลือกไฟล์ (Excel/CSV)
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Status Bar */}
            {(uploadingKey || msg) && (
                <div className="bg-slate-100 rounded-lg p-4 mt-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-sm text-slate-600">{msg}</span>
                        <span className="font-mono text-xs text-slate-400">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div
                            className="h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%`, backgroundColor: '#4285F4' }}
                        ></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
