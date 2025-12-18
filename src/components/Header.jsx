import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

const Header = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    return (
        <header className="flex h-14 md:h-16 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-3 md:px-6">
            <div className="flex items-center gap-2 md:gap-4">
                <img
                    src="https://store.boots.co.th/images/boots-logo.png"
                    alt="Boots"
                    className="h-8 md:h-10 w-auto"
                />
                <div className="leading-tight border-l border-slate-300 pl-2 md:pl-4 hidden sm:block">
                    <div className="text-sm md:text-lg font-bold text-slate-900">4340 Grand 5 Sukhumvit</div>
                    <div className="text-xs font-medium" style={{ color: '#4285F4' }}>ระบบขายหน้าร้าน POS</div>
                </div>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
                <Clock size={14} className="text-slate-400 md:w-4 md:h-4" />
                <div className="text-right text-xs md:text-sm">
                    <div className="text-[10px] md:text-xs font-medium text-slate-500">เวลา</div>
                    <div className="text-xs md:text-sm font-bold text-slate-900 font-mono">
                        {format(currentTime, 'dd/MM HH:mm')}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
