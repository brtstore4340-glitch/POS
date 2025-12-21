// src/components/Dashboard.jsx
import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import PosTerminal from '../components/PosTerminal';
import { PosProvider } from '../context/PosContext';

export default function Dashboard() {
  const [currentView, setCurrentView] = useState('dashboard');

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <PosProvider>
            <PosTerminal />
          </PosProvider>
        );
      case 'reporting':
        return <div className="p-8 text-slate-500">เธซเธเนเธฒเธฃเธฒเธขเธเธฒเธ (Coming Soon)</div>;
      case 'settings':
        return <div className="p-8 text-slate-500">เธซเธเนเธฒเธ•เธฑเนเธเธเนเธฒ (Coming Soon)</div>;
      default:
        return <div className="p-8">404 View Not Found</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - เธเนเธญเธเนเธเธกเธทเธญเธ–เธทเธญ เนเธชเธ”เธเนเธเธเธญเนเธซเธเน */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <div className="flex-1 flex flex-col h-full w-full">
        <Header />
        <main className="flex-1 overflow-hidden p-2 md:p-4 relative">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
