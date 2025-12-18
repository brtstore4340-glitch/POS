import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

const MaintenanceMode = ({ onRetry }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-red-50 rounded-full">
                        <AlertCircle className="w-12 h-12 text-red-500" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2">ระบบกำลังบำรุงรักษา</h1>
                <p className="text-slate-500 mb-8">
                    เกิดปัญหาในการเชื่อมต่อเซิร์ฟเวอร์ อาจเป็นเพราะอินเทอร์เน็ต หรือการบำรุงรักษาประจำ
                </p>

                <button
                    onClick={onRetry}
                    className="w-full flex items-center justify-center gap-2 text-white font-medium py-3 px-6 rounded-xl transition-all active:scale-95 hover:shadow-lg"
                    style={{ backgroundColor: '#4285F4' }}
                >
                    <RefreshCw className="w-5 h-5" />
                    ลองใหม่
                </button>
            </div>
        </div>
    );
};

export default MaintenanceMode;
