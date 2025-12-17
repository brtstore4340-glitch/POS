import React, { useState } from 'react';
import { PosProvider } from './context/PosContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PosTerminal from './components/PosTerminal';
import PosCheckout from './components/PosCheckout';
import Settings from './components/Settings';
import DailyReport from './components/DailyReport';

function App() {
  const [view, setView] = useState('dashboard'); // 'dashboard', 'reporting', 'settings'

  return (
    <PosProvider>
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
        <Sidebar currentView={view} onViewChange={setView} />

        <div className="flex flex-1 flex-col h-screen">
          <Header />

          {/* Main Content Area */}
          <main className="flex-1 p-6 overflow-hidden">

            {view === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 h-full text-sm sm:text-base">
                <div className="flex flex-col h-full overflow-hidden">
                  <PosTerminal />
                </div>
                <div className="h-full overflow-hidden">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full">
                    <PosCheckout />
                  </div>
                </div>
              </div>
            )}

            {view === 'settings' && <Settings />}

            {view === 'reporting' && <DailyReport />}

          </main>
        </div>
      </div>
    </PosProvider>
  );
}

export default App;
