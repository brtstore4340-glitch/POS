import React, { useState, useEffect } from 'react';

const Header = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    return (
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2 md:hidden">
                {/* Mobile Logo Show/Hide logic here if needed */}
                <span className="font-bold text-blue-600">BOOTS POS</span>
            </div>
            
            {/* Title for Desktop */}
            <div className="hidden md:block text-slate-500 text-sm">
                สาขา: 4340 Grand 5 Sukhumvit
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right">
                    <div className="text-[10px] text-slate-400">เวลาปัจจุบัน</div>
                    <div className="text-sm font-bold font-mono text-slate-700">
                        {time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>
        </header>
    );
};
export default Header;