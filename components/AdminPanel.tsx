import React, { useState, useEffect } from 'react';
import { LapTime, User } from '../types';
import { fetchLapTimes, deleteLapTime, getUserByUsername } from '../services/storageService';
import { CARS, TRACKS } from '../constants';
import Button from './Button';

const AdminPanel: React.FC = () => {
  const [times, setTimes] = useState<LapTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});

  const refreshData = async () => {
    setLoading(true);
    const data = await fetchLapTimes();
    setTimes(data);

    // Fetch emails for these usernames for display
    // Optimized: Only fetch unique usernames we haven't seen yet
    const uniqueUsernames = Array.from(new Set(data.map(t => t.username)));
    const emailMap: Record<string, string> = { ...userEmails };
    
    await Promise.all(uniqueUsernames.map(async (username) => {
        if (!emailMap[username]) {
            const user = await getUserByUsername(username);
            emailMap[username] = user?.email || 'Unknown';
        }
    }));
    
    setUserEmails(emailMap);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm("Confirm delete record?")) {
        const result = await deleteLapTime(id);
        if (result.success) {
            refreshData();
        } else {
            alert("Delete failed: " + result.message);
        }
    }
  };

  const getCarName = (carId: string) => {
    const car = CARS.find(c => c.id === carId);
    return car ? `${car.brand} ${car.name}` : carId;
  };

  const getTrackName = (trackId: string) => {
    const track = TRACKS.find(t => t.id === trackId);
    return track ? track.name : trackId;
  };

  const formatTime = (t: LapTime) => {
    return `${t.minutes}:${t.seconds.toString().padStart(2, '0')}.${t.milliseconds.toString().padStart(3, '0')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-700 pb-6">
        <h2 className="text-3xl font-black text-white uppercase tracking-wider">
          Race Control <span className="text-red-500">Admin</span>
        </h2>
        <div className="text-slate-400 text-sm">
          Total Records: {times.length}
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">Driver Info</th>
                <th className="px-6 py-4 font-bold">Track</th>
                <th className="px-6 py-4 font-bold">Time</th>
                <th className="px-6 py-4 font-bold">Car</th>
                <th className="px-6 py-4 font-bold">Timestamp</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                 <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <span className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin inline-block mr-2"></span>
                    Loading database...
                  </td>
                </tr>
              ) : times.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                    No records found in database.
                  </td>
                </tr>
              ) : (
                times.map((time) => (
                  <tr key={time.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-white">
                      <div className="font-bold">{time.username}</div>
                      <div className="text-xs text-slate-500">{userEmails[time.username] || 'Loading...'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {getTrackName(time.trackId)}
                    </td>
                    <td className="px-6 py-4 font-mono text-red-400 font-bold">
                      {formatTime(time)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {getCarName(time.carId)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(time.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="danger" 
                        onClick={() => handleDelete(time.id)}
                        className="!px-3 !py-1 text-xs"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;