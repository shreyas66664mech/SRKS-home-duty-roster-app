import React from 'react';
import {
  CalendarSearch,
  LogOut,
  ShieldCheck,
  Share2,
  User,
  Settings,
} from 'lucide-react';
import { Student } from '../types/roster';

interface HeaderProps {
  isAdmin: boolean;
  currentStudent: Student | null;
  isInstalled: boolean;
  isLiveConnected: boolean;
  onOpenLogin: (tab?: 'student' | 'admin' | 'share') => void;
  onLogoutAdmin: () => void;
  onLogoutStudent: () => void;
  onOpenSettings: () => void;
  onOpenShare: () => void;
  onOpenTurnFinder: () => void;
  onOpenInstall: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isAdmin,
  currentStudent,
  isLiveConnected,
  onOpenLogin,
  onLogoutAdmin,
  onLogoutStudent,
  onOpenSettings,
  onOpenShare,
  onOpenTurnFinder,
}) => {
  return (
    <header className="w-full border-b border-[#132238] bg-[#070c18]/95 backdrop-blur-md sticky top-0 z-30 px-3 sm:px-5 py-2.5 sm:py-3">
      <div className="max-w-xl sm:max-w-2xl lg:max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Brand Lockup - Mobile-first compact */}
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/assets/aistudio/Ramakrishna_Students_Home_Duty_Assigner_fb337d9c.png"
            alt="Sri Ramakrishna Students' Home Duty Assigner"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover shadow-md shadow-amber-500/20 border border-amber-400/40 shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase truncate">
                SRKSH Bengaluru
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isLiveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
                title={isLiveConnected ? 'Realtime live sync active' : 'Connecting...'}
              />
            </div>
            <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight leading-none truncate">
              Hostel Duty Roster
            </h1>
          </div>
        </div>

        {/* Action Controls - Compact mobile buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Find my turn icon button */}
          <button
            onClick={onOpenTurnFinder}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-[#0e1b30] hover:bg-[#162947] text-slate-200 border border-[#1e385c] text-xs font-semibold flex items-center gap-1 transition-colors active:scale-95"
            title="Find when my turn comes"
            aria-label="Find my turn"
          >
            <CalendarSearch className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">My Turn</span>
          </button>

          {/* Share icon button */}
          <button
            onClick={onOpenShare}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-[#0e243d] hover:bg-[#163354] text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1 transition-colors active:scale-95"
            title="Share roster link on WhatsApp"
            aria-label="Share roster link"
          >
            <Share2 className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Single Portal / Login Button */}
          {isAdmin ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenSettings}
                className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1 transition-all active:scale-95 shadow-sm shadow-amber-500/20"
                title="Admin Settings & Student List"
              >
                <Settings className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Admin</span>
              </button>
              <button
                onClick={onLogoutAdmin}
                className="p-1.5 rounded-lg bg-[#111c2e] hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-[#213554] text-xs transition-colors active:scale-95"
                title="Log out of admin"
                aria-label="Log out of admin"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : currentStudent ? (
            <button
              onClick={() => onOpenLogin('student')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/50 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
              title={`Logged in as ${currentStudent.name}. Click to switch student or enter Admin.`}
            >
              <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="max-w-[80px] sm:max-w-[120px] truncate">{currentStudent.name}</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenLogin('student')}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Open Hostel Portal (Choose your name or Admin)"
            >
              <User className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Portal</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
