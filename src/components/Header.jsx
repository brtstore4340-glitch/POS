import React, { useState, useEffect } from 'react';
import { Search, Bell } from 'lucide-react';
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
            {/* Search */}
            <div className="flex w-96 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-indigo-500">
                <Search size={20} className="text-slate-400" />
                <input
                    type="text"
                    placeholder="Search..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-6">
                {/* Date Display */}
                <div className="text-right">
                    <div className="text-xs font-medium text-slate-500">Current Time</div>
                    <div className="text-sm font-bold text-slate-900 font-mono">
                        {format(currentTime, 'dd/MM/yy HH:mm')}
                    </div>
                </div>

                <div className="relative">
                    <button className="relative rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
