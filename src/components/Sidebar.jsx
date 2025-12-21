import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, BarChart3, Settings, LogOut } from 'lucide-react';

const Sidebar = ({ currentView, onViewChange }) => {
    const { user, role, logout } = useAuth();

    const menuItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'ขายหน้าร้าน', allowed: ['admin', 'user'] },
        { id: 'reporting', icon: BarChart3, label: 'รายงาน', allowed: ['admin'] },
        { id: 'settings', icon: Settings, label: 'ตั้งค่า', allowed: ['admin'] },
    ];

    return (
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-full shrink-0">
            <div className="h-16 flex items-center justify-center border-b border-slate-100">
                <h1 className="text-xl font-bold text-blue-600 tracking-tight">BOOTS <span className="text-slate-800">POS</span></h1>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map((item) => {
                    // Simple role check
                    if (role !== 'admin' && !item.allowed.includes('user')) return null;

                    const isActive = currentView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onViewChange(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                                isActive 
                                ? 'bg-blue-50 text-blue-600 shadow-sm' 
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-100">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{user?.email?.split('@')[0]}</p>
                        <p className="text-xs text-slate-500 capitalize">{role || 'user'}</p>
                    </div>
                </div>
                <button 
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                >
                    <LogOut size={16} /> ออกจากระบบ
                </button>
            </div>
        </aside>
    );
};
export default Sidebar;