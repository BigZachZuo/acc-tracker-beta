import React, { useState, useEffect } from 'react';
import { User, Track, ViewState, LapTime } from './types';
import { TRACKS } from './constants';
import { getCurrentUser, logoutUser, seedMockData } from './services/storageService';
import Navbar from './components/Navbar';
import AuthForms from './components/AuthForms';
import Leaderboard from './components/Leaderboard';
import SubmitLapForm from './components/SubmitLapForm';
import AdminPanel from './components/AdminPanel';
import Button from './components/Button';
import HeroCarousel from './components/HeroCarousel';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.LEADERBOARD);
  const [selectedTrack, setSelectedTrack] = useState<Track>(TRACKS[0]); // Default to Monza
  const [editingLap, setEditingLap] = useState<LapTime | null>(null);

  useEffect(() => {
    // 1. Seed Mock Data (Async, fire and forget)
    seedMockData();

    // 2. Check for existing session
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setView(ViewState.LEADERBOARD);
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setView(ViewState.LEADERBOARD); // Stay on leaderboard as guest
  };

  const handleLogLapClick = () => {
    setEditingLap(null); // Clear editing state for new lap
    if (user) {
      setView(ViewState.SUBMIT);
    } else {
      setView(ViewState.LOGIN);
    }
  };

  const handleEditLap = (lap: LapTime) => {
    setEditingLap(lap);
    setView(ViewState.SUBMIT);
  };

  const renderContent = () => {
    // 1. Auth Views (Login / Register)
    if (view === ViewState.LOGIN || view === ViewState.REGISTER) {
      return (
        <AuthForms 
          onLogin={handleLogin} 
          isRegistering={view === ViewState.REGISTER}
          toggleMode={() => setView(view === ViewState.LOGIN ? ViewState.REGISTER : ViewState.LOGIN)}
        />
      );
    }

    // 2. Admin View
    if (view === ViewState.ADMIN && user?.isAdmin) {
      return <AdminPanel />;
    }

    // 3. Submit View (Protected)
    if (view === ViewState.SUBMIT) {
      // Security check in render
      if (!user) {
        // Should ideally not happen due to button logic, but safe fallback
        setView(ViewState.LOGIN);
        return null;
      }
      return (
        <SubmitLapForm 
          track={selectedTrack} 
          user={user}
          initialData={editingLap}
          onSuccess={() => {
             setView(ViewState.LEADERBOARD);
             setEditingLap(null);
          }}
          onCancel={() => {
             setView(ViewState.LEADERBOARD);
             setEditingLap(null);
          }}
        />
      );
    }

    // 4. Default: Leaderboard View (Accessible to all)
    return (
      <div className="space-y-6">
        {/* Track Selector & Action Bar */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-slate-900 sticky top-[64px] z-40 py-4 shadow-lg lg:shadow-none border-b lg:border-none border-slate-800">
          
          <div className="w-full lg:w-auto">
             <label className="text-xs text-slate-500 uppercase font-bold tracking-wider block mb-1 lg:hidden">选择赛道</label>
             <div className="relative">
                <select 
                  className="w-full lg:w-64 bg-slate-800 text-white font-bold border border-slate-700 rounded-lg px-4 py-3 appearance-none focus:ring-1 focus:ring-red-500 focus:border-red-500 cursor-pointer hover:bg-slate-700 transition-colors"
                  value={selectedTrack.id}
                  onChange={(e) => {
                    const track = TRACKS.find(t => t.id === e.target.value);
                    if (track) setSelectedTrack(track);
                  }}
                >
                  {TRACKS.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
             </div>
          </div>

          <Button onClick={handleLogLapClick} className="w-full lg:w-auto shadow-red-900/50">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
             录入圈速
          </Button>
        </div>

        <Leaderboard 
          selectedTrack={selectedTrack} 
          currentUser={user?.username} 
          onEdit={handleEditLap} 
        />
      </div>
    );
  };

  // Logic to show Hero Carousel: Show on Login/Register and Leaderboard view
  const showHero = view === ViewState.LOGIN || view === ViewState.REGISTER || view === ViewState.LEADERBOARD;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans selection:bg-red-500 selection:text-white">
      <Navbar 
        user={user} 
        onLogout={handleLogout}
        onLoginClick={() => setView(ViewState.LOGIN)}
        onHome={() => setView(ViewState.LEADERBOARD)}
        onAdmin={() => setView(ViewState.ADMIN)}
      />
      
      {showHero && <HeroCarousel />}

      <main className="max-w-7xl mx-auto px-4 py-6 pb-20">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;