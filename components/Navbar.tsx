import React from 'react';
import { User } from '../types';
import Button from './Button';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onLoginClick: () => void;
  onHome: () => void;
  onAdmin?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onLoginClick, onHome, onAdmin }) => {
  return (
    <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div 
          onClick={onHome} 
          className="cursor-pointer flex items-center gap-4 group"
        >
          <img 
            src="/assets/ui/logo.png" 
            alt="Assetto Corsa Competizione" 
            className="w-32 h-auto object-contain hover:brightness-110 transition-all"
          />
          <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>
          <span className="font-bold text-xl text-white tracking-tight group-hover:text-red-500 transition-colors hidden sm:block">
            TRACKER<span className="font-light text-slate-400">PRO</span>
          </span>
        </div>

        {user ? (
          <div className="flex items-center gap-4">
            {user.isAdmin && onAdmin && (
              <Button 
                variant="secondary" 
                onClick={onAdmin}
                className="!px-3 !py-1.5 !text-xs border-amber-500/50 text-amber-500 hover:bg-amber-900/20"
              >
                管理后台
              </Button>
            )}
            
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs text-slate-400 uppercase tracking-widest">
                {user.isAdmin ? 'RACE CONTROL' : 'DRIVER'}
              </span>
              <span className="font-bold text-white">{user.username}</span>
            </div>
            <Button variant="ghost" onClick={onLogout} className="!px-2 !text-sm border border-slate-700">
              退出登录
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button onClick={onLoginClick} variant="primary" className="!px-4 !py-1.5 text-sm shadow-red-900/20">
              登录 / 注册
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;