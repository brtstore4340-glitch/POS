import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const Header = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    return (
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
            <div className="flex items-center gap-3">
                <img
                    src="https://store.boots.co.th/images/boots-logo.png"
                    alt="Boots"
                    className="h-8 w-auto"
                />
                <div className="leading-tight">
                    <div className="text-lg font-bold text-slate-900">4340 Grand 5 Sukhumvit</div>
                    <div className="text-xs font-medium text-blue-600">ระบบขายหน้าร้าน POS</div>
                </div>
            </div>

            <div className="text-right">
                <div className="text-xs font-medium text-slate-500">เวลาปัจจุบัน</div>
                <div className="text-sm font-bold text-slate-900 font-mono">
                    {format(currentTime, 'dd/MM/yy HH:mm')}
                </div>
            </div>
        </header>
    );
};

export default Header;
