import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CheckCheck,
  Key,
  X,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { DutyDefinition, DayDutyStatus } from '../types/roster';
import { DUTY_DEFINITIONS } from '../utils/cycleEngine';

interface MarkDoneRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: string; // YYYY-MM-DD
  dutyStatuses: Record<string, DayDutyStatus> | null;
  completedDutyIds: string[];
  isAdmin: boolean;
  onMarkAllDoneAndAdvance: () => void;
  onOpenLogin: () => void;
}

export const MarkDoneRequiredModal: React.FC<MarkDoneRequiredModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  dutyStatuses,
  completedDutyIds,
  isAdmin,
  onMarkAllDoneAndAdvance,
  onOpenLogin,
}) => {
  if (!isOpen) return null;

  const formatDisplayDate = (isoStr: string) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${m}/${d}/${y}`;
    }
    return isoStr;
  };

  const pendingDuties = DUTY_DEFINITIONS.filter(
    (d) => !completedDutyIds.includes(d.id)
  );
  const completedCount = completedDutyIds.length;
  const totalCount = DUTY_DEFINITIONS.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="bg-[#0b1628] border-2 border-amber-400/80 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl shadow-black/80 text-white relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#12233f] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0 shadow-md">
            <ShieldAlert className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Mark Done Required
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {formatDisplayDate(currentDate)}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight mt-1">
              Complete Duties Before Next Day
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              The roster cycle advances to the next day only when current duties are marked as completed.
            </p>
          </div>
        </div>

        {/* Progress summary banner */}
        <div className="bg-[#071120] border border-[#192f50] rounded-xl p-3.5 mb-4">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-300">
              Today's Duty Completion
            </span>
            <span className={pendingDuties.length === 0 ? 'text-emerald-400' : 'text-amber-400'}>
              {completedCount} of {totalCount} Done ({pendingDuties.length} Pending)
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-[#12223a] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Checklist of duties */}
        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 mb-5">
          {DUTY_DEFINITIONS.map((duty) => {
            const isDone = completedDutyIds.includes(duty.id);
            const assigned = dutyStatuses?.[duty.id]?.assignedStudents || duty.baseNames;

            return (
              <div
                key={duty.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                  isDone
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                    : 'bg-[#0e1a2f] border-[#1e3454] text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{duty.title}</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      Assigned: <span className="text-amber-300 font-semibold">{assigned.join(', ')}</span>
                    </div>
                  </div>
                </div>

                <span
                  className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {isDone ? '✓ Done' : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="space-y-2.5 pt-2 border-t border-[#192f50]">
          {isAdmin ? (
            <>
              <button
                onClick={onMarkAllDoneAndAdvance}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-98"
              >
                <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Mark All Done & Advance to Next Day</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0e1b30] hover:bg-[#162a4a] text-slate-300 font-bold text-xs border border-[#1f3554] transition-colors"
              >
                Review & Mark Duties Individually
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-98"
              >
                <Key className="w-4 h-4 stroke-[2.5]" />
                <span>Login as Admin to Mark Done</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0e1b30] hover:bg-[#162a4a] text-slate-300 font-bold text-xs border border-[#1f3554] transition-colors"
              >
                Stay on This Day
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
