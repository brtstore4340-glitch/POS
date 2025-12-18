import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, BarChart3, Settings, LogOut } from 'lucide-react';

const Sidebar = ({ currentView, onViewChange }) => {
    const { user, role, logout } = useAuth();

    const menuItems = [
        {
            icon: LayoutDashboard,
            label: 'แดชบอร์ด',
            id: 'dashboard',
            allowed: ['admin', 'user']
        },
        {
            icon: BarChart3,
            label: 'รายงาน',
            id: 'reporting',
            allowed: ['admin', 'user'] // User can see reports
        },
        {
            icon: Settings,
            label: 'ตั้งค่า',
            id: 'settings',
            allowed: ['admin'] // Admin ONLY
        },
    ];

    // Filter items based on current role
    const filteredItems = menuItems.filter(item => item.allowed.includes(role));

    // Get display name (using employee Id or name if we had it in context, 
    // current AuthContext only exposes user object. 
    // Let's us basic ID for now or just "Employee")
    const displayName = user?.displayName || user?.email?.split('@')[0] || 'พนักงาน';

    return (
        <aside className="hidden h-screen w-64 flex-col border-r border-slate-200 bg-white md:flex text-slate-900">
            {/* Logo */}
            <div className="flex h-16 items-center justify-center px-6 border-b border-slate-100">
                <img src="https://store.boots.co.th/images/boots-logo.png" alt="Boots Logo" className="h-8 object-contain" />
            </div>

            {/* Menu */}
            <nav className="flex-1 space-y-1 px-3 py-4">
                {filteredItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onViewChange(item.id)}
                        className={`w-full group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${currentView === item.id
                            ? 'text-white'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        style={{
                            backgroundColor: currentView === item.id ? '#4285F4' : 'transparent'
                        }}
                    >
                        <item.icon
                            className={`mr-3 h-5 w-5 flex-shrink-0 ${currentView === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-500'
                                }`}
                        />
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* Profile */}
            <div className="border-t border-slate-200 p-4">
                <div className="flex items-center">
                    <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden">
                        {displayName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="ml-3 overflow-hidden">
                        <p className="text-sm font-medium truncate w-24">{displayName}</p>
                        <p className="text-xs text-slate-500 capitalize">{role}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="ml-auto text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-slate-50"
                        title="ออกจากระบบ"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
