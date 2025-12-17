import React, { useState } from 'react';
import { importMasterData } from '../services/dataService';
import { Upload, Database, Check } from 'lucide-react';

const Settings = () => {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [msg, setMsg] = useState('');

    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setMsg('Parsing file...');
        setProgress(0);

        try {
            await importMasterData(file, (pct) => {
                setProgress(pct);
                setMsg(`Uploading... ${pct}%`);
            });
            setMsg('Upload Complete!');
        } catch (err) {
            console.error(err);
            setMsg('Error: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Database className="text-indigo-600" />
                Data Management
            </h2>

            <div className="space-y-6">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors relative">
                    <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFile}
                        disabled={uploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />

                    <div className="flex flex-col items-center">
                        {uploading ? (
                            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                        ) : (
                            <Upload size={48} className="text-slate-400 mb-4" />
                        )}

                        <p className="text-lg font-bold text-slate-700">
                            {uploading ? 'Processing Data...' : 'Upload Master File'}
                        </p>
                        <p className="text-sm text-slate-500 mt-2">
                            Drag & drop or Click to browse (Excel/CSV)
                        </p>
                    </div>
                </div>

                {/* Status Bar */}
                {(uploading || msg) && (
                    <div className="bg-slate-100 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-sm text-slate-600">{msg}</span>
                            <span className="font-mono text-xs text-slate-400">{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                            <div
                                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
