import React from 'react';
import { LayoutDashboard, Folder, CheckSquare, BarChart3, Settings, LogOut } from 'lucide-react';

const Sidebar = ({ currentView, onViewChange }) => {
    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
        // { icon: Folder, label: 'Projects', id: 'projects' },
        // { icon: CheckSquare, label: 'Tasks', id: 'tasks' },
        { icon: BarChart3, label: 'Reporting', id: 'reporting' },
        { icon: Settings, label: 'Settings', id: 'settings' },
    ];

    return (
        <aside className="hidden h-screen w-64 flex-col border-r border-slate-200 bg-white md:flex text-slate-900">
            {/* Logo */}
            <div className="flex h-16 items-center px-6 border-b border-slate-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                    <span className="font-bold text-white">B</span>
                </div>
                <span className="ml-3 text-lg font-bold tracking-tight">Boots POS</span>
            </div>

            {/* Menu */}
            <nav className="flex-1 space-y-1 px-3 py-4">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onViewChange(item.id)}
                        className={`w-full group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${currentView === item.id
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <item.icon
                            className={`mr-3 h-5 w-5 flex-shrink-0 ${currentView === item.id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500'
                                }`}
                        />
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* Profile */}
            <div className="border-t border-slate-200 p-4">
                <div className="flex items-center">
                    <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                        U
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium">User Profile</p>
                        <p className="text-xs text-slate-500">View Profile</p>
                    </div>
                    <button className="ml-auto text-slate-400 hover:text-red-500">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
