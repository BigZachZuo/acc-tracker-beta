import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Track, Car, LapTime, InputDevice } from '../types';
import { CARS } from '../constants';
import { fetchLapTimes, deleteLapTime } from '../services/storageService';
import Button from './Button';
import InputDeviceIcon from './InputDeviceIcon';

interface LeaderboardProps {
  selectedTrack: Track;
  currentUser: string | undefined;
  onEdit?: (lap: LapTime) => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ selectedTrack, currentUser, onEdit }) => {
  const [times, setTimes] = useState<LapTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  
  // Sticky User Row State
  const [stickyState, setStickyState] = useState<'top' | 'bottom' | null>(null);

  // Delete Modal State
  const [lapToDelete, setLapToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper to reload data
  const loadData = async () => {
    setIsLoading(true);
    const loadedTimes = await fetchLapTimes(selectedTrack.id);
    setTimes(loadedTimes);
    setIsLoading(false);
    // Note: We don't reset selectedDriver here to allow refreshing the list after delete while staying in view
    // But if we delete the last lap, we might want to handle that.
    setStickyState(null);
  };

  useEffect(() => {
    loadData();
    setSelectedDriver(null); // Reset detail view only when track changes
  }, [selectedTrack]);

  const getCarName = (carId: string) => {
    const car = CARS.find(c => c.id === carId);
    return car ? `${car.brand} ${car.name}` : carId;
  };
  
  const getCarClass = (carId: string) => {
    return CARS.find(c => c.id === carId)?.class || 'GT3';
  };

  // 1. Filter raw times by selected class (if not ALL)
  const classFilteredTimes = useMemo(() => {
    return filterClass === 'ALL' 
      ? times 
      : times.filter(t => getCarClass(t.carId) === filterClass);
  }, [times, filterClass]);

  // 2. LEVEL 1 DATA: Group by User, keeping only their BEST time
  const uniqueDriverTimes = useMemo(() => {
    const bestTimesMap = new Map<string, LapTime>();

    classFilteredTimes.forEach(time => {
      const existing = bestTimesMap.get(time.username);
      if (!existing || time.totalMilliseconds < existing.totalMilliseconds) {
        bestTimesMap.set(time.username, time);
      }
    });

    return Array.from(bestTimesMap.values()).sort((a, b) => a.totalMilliseconds - b.totalMilliseconds);
  }, [classFilteredTimes]);

  // 3. LEVEL 2 DATA: Get all times for the selected driver (on this track)
  const selectedDriverTimes = useMemo(() => {
    if (!selectedDriver) return [];
    return times
      .filter(t => t.username === selectedDriver)
      .sort((a, b) => a.totalMilliseconds - b.totalMilliseconds);
  }, [times, selectedDriver]);

  // Find User's stats for sticky row
  const currentUserStats = useMemo(() => {
    if (!currentUser) return null;
    const index = uniqueDriverTimes.findIndex(t => t.username === currentUser);
    if (index === -1) return null;
    return {
      rank: index + 1,
      data: uniqueDriverTimes[index]
    };
  }, [uniqueDriverTimes, currentUser]);

  // Format helper: 1:47.500
  const formatTime = (t: LapTime | undefined) => {
    if (!t || typeof t.minutes === 'undefined') return '--:--.---';
    return `${t.minutes}:${t.seconds?.toString().padStart(2, '0')}.${t.milliseconds?.toString().padStart(3, '0')}`;
  };

  const handleRequestDelete = (lapId: string) => {
    setLapToDelete(lapId);
  };

  const confirmDelete = async () => {
    if (!lapToDelete) return;
    setIsDeleting(true);
    
    const result = await deleteLapTime(lapToDelete);
    
    if (result.success) {
      await loadData(); // Refresh data
      
      // If user deleted their last lap, go back to main view
      // We need to re-calc remaining laps based on the old state minus the deleted one
      const remainingLaps = selectedDriverTimes.filter(t => t.id !== lapToDelete);
      if (remainingLaps.length === 0) {
        setSelectedDriver(null);
      }
    } else {
      alert("删除失败: " + result.message);
    }

    setIsDeleting(false);
    setLapToDelete(null);
  };

  // --- Sticky Row Logic ---
  useEffect(() => {
    if (!currentUserStats || selectedDriver) { // Don't sticky if in detail view or no user data
      setStickyState(null);
      return;
    }

    const checkVisibility = () => {
      const element = document.getElementById('current-user-row');
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Offset for sticky header (Navbar + Track Header approx 130px)
      const topThreshold = 140; 
      
      if (rect.bottom < topThreshold) {
        setStickyState('top');
      } else if (rect.top > viewportHeight) {
        setStickyState('bottom');
      } else {
        setStickyState(null);
      }
    };

    window.addEventListener('scroll', checkVisibility);
    window.addEventListener('resize', checkVisibility);
    
    // Initial check
    checkVisibility();

    return () => {
      window.removeEventListener('scroll', checkVisibility);
      window.removeEventListener('resize', checkVisibility);
    };
  }, [currentUserStats, selectedDriver]);

  const scrollToUserRow = () => {
    const element = document.getElementById('current-user-row');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // --- RENDER HELPERS ---

  const renderConditions = (cond: 'Dry'|'Wet', temp?: number) => {
    return (
       <div className="flex flex-col items-center">
          <span className={`text-xs px-2 py-0.5 rounded border mb-0.5 ${
            cond === 'Wet' 
            ? 'bg-blue-900/30 text-blue-400 border-blue-800' 
            : 'bg-orange-900/30 text-orange-400 border-orange-800'
          }`}>
            {cond}
          </span>
          {temp !== undefined && temp !== null ? (
             <span className="text-[10px] text-slate-500">{temp}°C</span>
          ) : (
             <span className="text-[10px] text-slate-600">-</span>
          )}
       </div>
    )
  }

  const VerifiedBadge = () => (
    <div className="group/verified relative ml-2 inline-flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max hidden group-hover/verified:block z-50">
        <div className="bg-slate-900 text-slate-200 text-xs py-1 px-2 rounded border border-slate-700 shadow-xl">
           该成绩已通过截图验证
        </div>
        <div className="w-2 h-2 bg-slate-700 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
      </div>
    </div>
  );

  const renderLevel1 = () => {
    // Get the absolute best time for Gap calculation
    const overallBestTime = uniqueDriverTimes.length > 0 ? uniqueDriverTimes[0].totalMilliseconds : 0;

    return (
    <div className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700 backdrop-blur-sm animate-fade-in relative">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
              <th className="px-6 py-4 font-bold text-center">Pos</th>
              <th className="px-6 py-4 font-bold">Driver</th>
              <th className="px-6 py-4 font-bold">Best Time</th>
              <th className="px-6 py-4 font-bold">Gap</th>
              <th className="px-6 py-4 font-bold">Car Used</th>
              <th className="px-6 py-4 font-bold text-center">Env.</th>
              <th className="px-6 py-4 font-bold text-center">Input</th>
              <th className="px-6 py-4 font-bold text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {isLoading ? (
               <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex justify-center items-center gap-3">
                    <span className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></span>
                    <span>Loading Telemetry...</span>
                  </div>
                </td>
              </tr>
            ) : uniqueDriverTimes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500 italic">
                  No lap times recorded yet for this class. Be the first!
                </td>
              </tr>
            ) : (
              uniqueDriverTimes.map((time, index) => {
                const isCurrentUser = time.username === currentUser;
                
                // Calculate Gap
                const gap = time.totalMilliseconds - overallBestTime;
                const gapStr = index === 0 ? '-' : `+${(gap / 1000).toFixed(3)}`;

                return (
                  <tr 
                    key={time.id}
                    id={isCurrentUser ? 'current-user-row' : undefined}
                    onClick={() => setSelectedDriver(time.username)}
                    className={`group transition-colors cursor-pointer ${
                      isCurrentUser ? 'bg-red-900/20 hover:bg-red-900/30 border-l-4 border-l-red-500' : 'hover:bg-slate-700/30'
                    }`}
                  >
                    <td className="px-6 py-4 text-center align-middle">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                        index === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/50' :
                        index === 2 ? 'bg-orange-700/20 text-orange-400 border border-orange-700/50' :
                        'text-slate-500'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-white align-middle">
                      {time.username}
                      {isCurrentUser && <span className="ml-2 text-[10px] uppercase bg-red-600 px-1.5 py-0.5 rounded text-white">You</span>}
                    </td>
                    <td className="px-6 py-4 font-mono text-lg font-bold text-red-400 group-hover:text-red-300 align-middle">
                      <div className="flex items-center">
                        {formatTime(time)}
                        {time.isVerified && <VerifiedBadge />}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-400 align-middle">
                      {gapStr}
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-sm align-middle">
                      <div className="flex flex-col">
                        <span className="truncate max-w-[200px]">{getCarName(time.carId)}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-800 w-fit px-1 rounded mt-0.5">{getCarClass(time.carId)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center align-middle">
                      {renderConditions(time.conditions, time.trackTemp)}
                    </td>
                    <td className="px-6 py-4 text-center align-middle">
                      <div className="flex justify-center items-center text-slate-500">
                         {time.inputDevice ? (
                           <InputDeviceIcon device={time.inputDevice} />
                         ) : (
                           <span className="text-slate-600">-</span>
                         )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 align-middle">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-auto group-hover:text-white transition-colors" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
  }

  const renderLevel2 = () => {
    // Check if the current logged-in user is viewing their own profile
    const isOwner = currentUser === selectedDriver;

    return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-4 bg-slate-800/80 p-4 rounded-lg border border-slate-700">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => setSelectedDriver(null)} className="!py-1.5 !px-3 text-sm">
            ← Back
          </Button>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              {selectedDriver}
              {isOwner && <span className="text-xs bg-red-600 px-2 py-0.5 rounded text-white uppercase">You</span>}
            </h3>
            <p className="text-sm text-slate-400">Garage History at {selectedTrack.name}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700 backdrop-blur-sm">
        <table className="w-full text-left">
          <thead>
             <tr className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
              <th className="px-6 py-4 font-bold">Class</th>
              <th className="px-6 py-4 font-bold">Car Model</th>
              <th className="px-6 py-4 font-bold">Time</th>
              <th className="px-6 py-4 font-bold">Gap</th>
              <th className="px-6 py-4 font-bold text-center">Env.</th>
              <th className="px-6 py-4 font-bold text-center">Input</th>
              <th className="px-6 py-4 font-bold text-right">Date Set</th>
              {isOwner && <th className="px-6 py-4 font-bold text-right">Actions</th>}
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
             {selectedDriverTimes.map((time, index) => {
               // Calculate gap to their own best time (Level 2 compares to self)
               const bestTime = selectedDriverTimes[0].totalMilliseconds;
               const gap = time.totalMilliseconds - bestTime;
               const gapStr = gap === 0 ? '-' : `+${(gap / 1000).toFixed(3)}`;

               return (
                 <tr key={time.id} className="hover:bg-slate-700/30 transition-colors group">
                    <td className="px-6 py-4 align-middle">
                       <span className={`text-xs font-bold px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-300`}>
                         {getCarClass(time.carId)}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-white font-medium align-middle">
                       {getCarName(time.carId)}
                    </td>
                    <td className="px-6 py-4 font-mono text-lg font-bold text-red-400 align-middle">
                       <div className="flex items-center">
                          {formatTime(time)}
                          {time.isVerified && <VerifiedBadge />}
                       </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-500 align-middle">
                       {gapStr}
                    </td>
                    <td className="px-6 py-4 text-center align-middle">
                      {renderConditions(time.conditions, time.trackTemp)}
                    </td>
                    <td className="px-6 py-4 text-center align-middle">
                       <div className="flex justify-center items-center text-slate-500">
                          {time.inputDevice ? (
                             <InputDeviceIcon device={time.inputDevice} />
                          ) : (
                             <span className="text-slate-600">-</span>
                          )}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 text-sm align-middle">
                        {new Date(time.timestamp).toLocaleDateString()}
                    </td>
                    {isOwner && (
                      <td className="px-6 py-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-2">
                           <button
                             onClick={(e) => { e.stopPropagation(); onEdit?.(time); }}
                             className="text-red-500 hover:text-red-400 transition-colors p-1"
                             title="Edit lap time"
                           >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                             </svg>
                           </button>
                           <button
                             onClick={(e) => { e.stopPropagation(); handleRequestDelete(time.id); }}
                             className="text-red-500 hover:text-red-400 transition-colors p-1"
                             title="Delete lap time"
                           >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                             </svg>
                           </button>
                        </div>
                      </td>
                    )}
                 </tr>
               )
             })}
          </tbody>
        </table>
      </div>
    </div>
  );
  }

  return (
    <div className="space-y-6">
      {/* Header Area: Track Info & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-700 pb-6">
        <div className="flex items-center gap-4">
          {selectedTrack.imageUrl && (
            <div className="bg-slate-100/5 p-2 rounded-lg border border-slate-700/50">
               <img 
                 src={selectedTrack.imageUrl} 
                 alt={`${selectedTrack.name} Layout`} 
                 className="w-16 h-16 object-contain brightness-0 invert opacity-90" 
               />
            </div>
          )}
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-wider italic">
              {selectedTrack.name}
            </h2>
            <div className="flex items-center gap-2 text-slate-400 mt-1">
              <span className="bg-slate-800 px-2 py-0.5 rounded text-xs border border-slate-700">{selectedTrack.country}</span>
              <span className="text-sm">{selectedTrack.length}</span>
            </div>
          </div>
        </div>

        {!selectedDriver && (
          <div className="flex gap-2 flex-wrap">
             {['ALL', 'GT3', 'GT2', 'GT4', 'CUP'].map(cls => (
               <button
                key={cls}
                onClick={() => setFilterClass(cls)}
                className={`px-3 py-1 rounded text-sm font-bold transition-colors ${
                  filterClass === cls 
                    ? 'bg-red-600 text-white' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
               >
                 {cls}
               </button>
             ))}
          </div>
        )}
      </div>

      {/* View Logic */}
      {selectedDriver ? renderLevel2() : renderLevel1()}

      {/* Sticky User Row (Visible when user scrolled away) */}
      {stickyState && currentUserStats && (
        <div 
          onClick={scrollToUserRow}
          className={`fixed left-0 right-0 lg:left-auto lg:right-auto lg:max-w-7xl mx-auto px-4 lg:px-4 z-40 transition-all duration-300 animate-fade-in cursor-pointer ${
            stickyState === 'top' ? 'top-[140px]' : 'bottom-6'
          }`}
        >
          <div className="bg-slate-900/95 backdrop-blur-md border border-red-500 rounded-lg shadow-2xl p-4 flex items-center justify-between ring-2 ring-red-500/20">
             <div className="flex items-center gap-4">
                <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded uppercase">Your Rank</div>
                <div className="text-2xl font-bold text-white">#{currentUserStats.rank}</div>
                <div className="hidden sm:block h-6 w-px bg-slate-700"></div>
                <div className="hidden sm:block text-slate-300 text-sm truncate max-w-[150px]">
                   {getCarName(currentUserStats.data.carId)}
                </div>
             </div>
             <div className="flex items-center gap-4">
                <div className="font-mono text-xl font-bold text-red-400 flex items-center">
                    {formatTime(currentUserStats.data)}
                    {currentUserStats.data.isVerified && <VerifiedBadge />}
                </div>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stickyState === 'top' ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
                 </svg>
             </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {lapToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100 animate-fade-in-up">
            <h3 className="text-xl font-bold text-white mb-2">确认删除?</h3>
            <p className="text-slate-400 mb-6">
              您确定要删除这条圈速记录吗？<br/>
              此操作<span className="text-red-500 font-bold">无法撤销</span>。
            </p>
            <div className="flex gap-3 justify-end">
              <Button 
                variant="secondary" 
                onClick={() => setLapToDelete(null)}
                disabled={isDeleting}
              >
                取消
              </Button>
              <Button 
                variant="primary" 
                onClick={confirmDelete}
                isLoading={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Leaderboard;