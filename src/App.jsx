import React, { useState, useEffect } from 'react';
import { PosProvider } from './context/PosContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PosTerminal from './components/PosTerminal';
import PosCheckout from './components/PosCheckout';
import Settings from './components/Settings';
import DailyReport from './components/DailyReport';
import Login from './components/Login';
import UserManagement from './components/UserManagement'; // Import UserManagement
import { Loader2 } from 'lucide-react';

const AppContent = () => {
  const { user, loading, mustChangePassword, role } = useAuth();
  const [view, setView] = useState('dashboard'); // 'dashboard', 'reporting', 'settings' //, 'user-management' (via Settings?)

  // Effect to reset view if role changes (e.g. from Admin to User, restricted views)
  useEffect(() => {
    if (role === 'user' && view === 'settings') {
      setView('dashboard');
    }
  }, [role, view]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  // 1. Not Logged In -> Show Login
  if (!user) {
    return <Login />;
  }

  // 2. Logged In BUT Must Change Password -> Show Login (Change Password Mode)
  // Our Login component handles this state if user is passed from context
  if (mustChangePassword) {
    return <Login />;
  }

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

            {/* Settings View: 
                If Admin: Show Settings + User Management 
                Actually, simpler to likely make UserManagement PART of settings or a sub-tab.
                But for now, if 'settings' is selected and user is admin, let's show UserManagement + other settings?
                Or just UserManagement as the main "Settings" feature for now.
            */}
            {view === 'settings' && role === 'admin' && (
              <div className="h-full space-y-6 overflow-y-auto">
                {/* We can put UserManagement here directly for now */}
                <UserManagement />

                {/* Existing Settings component below if needed, or if Settings was a wrapper */}
                <div className="pt-6 border-t border-slate-200">
                  <Settings />
                </div>
              </div>
            )}

            {view === 'reporting' && <DailyReport />}

          </main>
        </div>
      </div>
    </PosProvider>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
