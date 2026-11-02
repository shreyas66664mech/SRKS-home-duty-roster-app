import React, { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface DateNavigatorProps {
  currentDate: string; // YYYY-MM-DD
  onDateChange: (newDate: string) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  isToday: boolean;
  isAllCompleted?: boolean;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({
  currentDate,
  onDateChange,
  onPrevDay,
  onNextDay,
  onToday,
  isToday,
  isAllCompleted = false,
}) => {
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Format YYYY-MM-DD to readable day: "Mon, Nov 2"
  const formatDisplayDate = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      const [y, m, d] = isoStr.split('-').map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
    } catch {
      return isoStr;
    }
  };

  const handleBoxClick = () => {
    if (dateInputRef.current) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          dateInputRef.current.showPicker();
        } catch {
          dateInputRef.current.focus();
        }
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  return (
    <div className="w-full py-2.5 mb-2">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 rounded-2xl bg-[#091426]/90 border border-[#1b3252] shadow-md">
        {/* Left: Previous Day Button */}
        <button
          onClick={onPrevDay}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#0c1a2f] hover:bg-[#142947] active:scale-95 text-slate-200 border border-[#1f375a] text-xs sm:text-sm font-bold transition-all shadow-sm"
          title="See yesterday's assigned students"
        >
          <ChevronLeft className="w-4 h-4 text-amber-400 stroke-[2.5]" />
          <span>Previous</span>
        </button>

        {/* Center: Date Display & Native Picker */}
        <div
          onClick={handleBoxClick}
          className="relative flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#060e1c] hover:bg-[#0c182b] border border-amber-500/40 cursor-pointer text-slate-100 text-xs sm:text-sm font-extrabold transition-all shadow-inner active:scale-98"
          title="Tap to pick any calendar date"
        >
          <CalendarIcon className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="tracking-tight text-white">{formatDisplayDate(currentDate)}</span>
          {isToday && (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 ml-1">
              Today
            </span>
          )}
          <input
            ref={dateInputRef}
            type="date"
            value={currentDate}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>

        {/* Right: Next Day & Today Quick Jump */}
        <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
          {!isToday && (
            <button
              onClick={onToday}
              className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-xs font-black transition-all active:scale-95"
              title="Jump back to today"
            >
              Today
            </button>
          )}

          <button
            onClick={onNextDay}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all shadow-sm active:scale-95 ${
              isAllCompleted
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                : 'bg-[#0c1a2f] hover:bg-[#142947] text-slate-200 border-[#1f375a]'
            }`}
            title={isAllCompleted ? 'Advance to next day' : 'Next day (requires duties marked done)'}
          >
            <span>Next</span>
            {isAllCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-amber-400 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
