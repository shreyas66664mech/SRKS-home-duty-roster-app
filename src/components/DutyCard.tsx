import React, { useState } from 'react';
import { DutyDefinition, DayDutyStatus, Student } from '../types/roster';
import { getResidentNumber } from '../utils/cycleEngine';
import {
  Check,
  UserX,
  AlertTriangle,
  RefreshCw,
  Users,
  AlertCircle,
  ArrowLeftRight,
  Plus,
  Minus,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface DutyCardProps {
  duty: DutyDefinition;
  status: DayDutyStatus;
  isAdmin: boolean;
  allStudentNames: string[];
  students?: Student[];
  currentStudentName?: string;
  onMarkDone: (dutyId: string, isDone: boolean) => void;
  onSkipStudent: (dutyId: string, studentName: string) => void;
  onApplyRepeatPenalty: (dutyId: string, studentName: string, repeatTimes: number) => void;
  onCancelRepeat: (dutyId: string, studentName: string) => void;
  onReassign: (dutyId: string, newStudents: string[]) => void;
}

export const DutyCard: React.FC<DutyCardProps> = ({
  duty,
  status,
  isAdmin,
  allStudentNames,
  students = [],
  currentStudentName,
  onMarkDone,
  onSkipStudent,
  onApplyRepeatPenalty,
  onCancelRepeat,
  onReassign,
}) => {
  const [showRepeatModal, setShowRepeatModal] = useState<string | null>(null);
  const [repeatTimes, setRepeatTimes] = useState<number>(1);
  const [showReassignFor, setShowReassignFor] = useState<number | null>(null);
  const [showSkipModal, setShowSkipModal] = useState<boolean>(false);
  const [showSwapPickerModal, setShowSwapPickerModal] = useState<boolean>(false);

  const isCompleted = status.isCompleted ?? false;
  const isMyDuty = Boolean(currentStudentName && status.assignedStudents.includes(currentStudentName));

  const handleIncrementRepeat = () => {
    setRepeatTimes((prev) => Math.min(prev + 1, 999));
  };

  const handleDecrementRepeat = () => {
    setRepeatTimes((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div
      className={`relative rounded-2xl border transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between ${
        isMyDuty
          ? 'bg-gradient-to-b from-[#14294a] via-[#0d1f39] to-[#0a1628] border-2 border-amber-400 ring-4 ring-amber-400/50 shadow-[0_0_35px_rgba(251,191,36,0.38)] animate-[pulse_3s_ease-in-out_infinite]'
          : isCompleted
          ? 'bg-[#091526]/95 border-emerald-500/40 shadow-emerald-950/20'
          : status.hasRepeatPenalty
          ? 'bg-[#0d162b] border-amber-500/50 shadow-amber-950/20'
          : 'bg-[#0c182d] border-[#182c47] hover:border-[#25426b]'
      } shadow-lg shadow-black/40`}
    >
      {/* Floating Animated Badge for Logged-In Resident */}
      {isMyDuty && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-xl shadow-amber-500/40 flex items-center gap-1.5 border border-amber-100 animate-in fade-in zoom-in duration-200">
          <Sparkles className="w-3 h-3 text-slate-950 fill-slate-950" />
          <span>YOUR DUTY TODAY</span>
          <Sparkles className="w-3 h-3 text-slate-950 fill-slate-950" />
        </div>
      )}

      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              {duty.title}
            </h3>
            {isMyDuty && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-md">
                ⭐ Assigned to You
              </span>
            )}
            {status.hasRepeatPenalty && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                Repeat Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {duty.subtitle}
          </p>
        </div>

        {/* Member count & Direction pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold text-slate-400 bg-[#071120] px-2 py-0.5 rounded-full border border-[#1b3457]">
            {duty.direction === 'forward' ? 'Forward ↗' : 'Reverse ↙'}
          </span>
          <span className="text-[10px] font-semibold text-slate-300 border border-[#223b61] bg-[#071120] px-2 py-0.5 rounded-full">
            {duty.memberCount} {duty.memberCount === 1 ? 'resident' : 'residents'}
          </span>
        </div>
      </div>

      {/* Assigned Members Section */}
      <div className="space-y-2.5 mb-4">
        {status.assignedStudents.map((studentName, idx) => {
          const isThisResident = currentStudentName === studentName;
          const resNo = getResidentNumber(studentName, students);
          return (
            <div
              key={`${duty.id}-${studentName}-${idx}`}
              className={`transition-colors rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner ${
                isThisResident
                  ? 'bg-amber-950/40 border-2 border-amber-400/70 shadow-amber-500/10'
                  : 'bg-[#071120] border border-[#162740] hover:border-[#22395c]'
              }`}
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-sm ${
                  isThisResident
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400/40'
                    : 'bg-gradient-to-br from-[#12243d] to-[#0a1626] border border-[#243f66] text-amber-400'
                }`}>
                  {studentName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2 truncate">
                    {resNo && (
                      <span className="text-[11px] font-mono font-extrabold text-amber-300 bg-[#0c1c33] px-1.5 py-0.5 rounded border border-amber-400/30 shrink-0">
                        {resNo}
                      </span>
                    )}
                    <span className="truncate">{studentName}</span>
                    {isThisResident && (
                      <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/40 shrink-0">
                        You
                      </span>
                    )}
                  </div>
                  {status.customNotes && (
                    <div className="text-[11px] text-amber-300 font-medium truncate flex items-center gap-1 mt-0.5">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span>{status.customNotes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0 flex items-center">
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold tracking-wider uppercase text-emerald-300 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1.5 rounded-lg shadow-sm">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    DONE
                  </span>
                ) : (
                  <span className="text-xs sm:text-sm font-extrabold tracking-wider uppercase text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                    ASSIGNED
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Prominent Admin Action Controls (shown when unlocked) */}
      {isAdmin && (
        <div className="pt-4 border-t-2 border-[#152742] flex flex-col gap-2.5 mt-auto bg-[#07101f]/70 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-4 sm:p-5 rounded-b-2xl">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Admin controls for this duty</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Mark Done Toggle */}
            <button
              onClick={() => onMarkDone(duty.id, !isCompleted)}
              className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                isCompleted
                  ? 'bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-400'
                  : 'bg-[#10243d] hover:bg-[#183457] text-emerald-300 border border-emerald-600/40 hover:border-emerald-500'
              }`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isCompleted ? 'Marked Done ✓' : 'Mark Done'}</span>
            </button>

            {/* Skip (Went Home / Leave) */}
            <button
              onClick={() => {
                if (duty.memberCount > 1) {
                  setShowSkipModal(true);
                } else {
                  onSkipStudent(duty.id, status.assignedStudents[0]);
                }
              }}
              className="py-2 px-3 text-xs font-bold rounded-xl bg-[#10243d] hover:bg-amber-950/40 text-amber-300 hover:text-amber-200 border border-amber-600/40 hover:border-amber-400 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              title="Student went home - pass turn to next in cycle"
            >
              <UserX className="w-4 h-4 text-amber-400" />
              <span>Skip (Went Home)</span>
            </button>

            {/* Repeat Penalty Button (N Times) */}
            <button
              onClick={() => {
                setRepeatTimes(1);
                setShowRepeatModal(status.assignedStudents[0]);
              }}
              className="py-2 px-3 text-xs font-bold rounded-xl bg-[#10243d] hover:bg-rose-950/50 text-rose-300 hover:text-rose-200 border border-rose-600/40 hover:border-rose-400 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              title="Assign N number of repeat penalty days"
            >
              <RefreshCw className="w-4 h-4 text-rose-400" />
              <span>Repeat (N times)</span>
            </button>

            {/* Reassign / Swap */}
            <button
              onClick={() => {
                if (duty.memberCount > 1) {
                  setShowSwapPickerModal(true);
                } else {
                  setShowReassignFor(0);
                }
              }}
              className="py-2 px-3 text-xs font-bold rounded-xl bg-[#10243d] hover:bg-[#1b3558] text-slate-200 border border-[#23426e] hover:border-slate-400 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              title="Swap student manually for this date"
            >
              <ArrowLeftRight className="w-4 h-4 text-sky-400" />
              <span>Swap Student</span>
            </button>

            {/* Accidental Repeat Undo Button */}
            {status.hasRepeatPenalty && (
              <button
                onClick={() => onCancelRepeat(duty.id, status.assignedStudents[0])}
                className="col-span-2 py-2 px-3 text-xs font-bold rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border-2 border-amber-400 transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
                title="Accidentally put repeat? Click to undo and cancel this repeat penalty"
              >
                <RotateCcw className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                <span>Undo / Cancel Accidental Repeat</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Repeat Penalty Modal: Supports ANY N number of times */}
      {showRepeatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#0c182c] border-2 border-amber-500/60 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-amber-400 border-b border-[#182e4e] pb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-lg text-white">Assign Repeat Penalty</h4>
                <p className="text-xs text-amber-300/80">Duty: {duty.title}</p>
              </div>
            </div>

            {duty.memberCount > 1 && (
              <div className="bg-[#071120] border border-[#1b3457] rounded-xl p-2.5 flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold px-1">Select resident:</span>
                <div className="flex-1 flex gap-1.5">
                  {status.assignedStudents.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setShowRepeatModal(name)}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                        showRepeatModal === name
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : 'bg-[#10243d] text-slate-300 hover:text-white'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Resident <strong className="text-amber-300 font-bold">{showRepeatModal}</strong> will be assigned to repeat this duty for <strong className="text-white underline font-bold">{repeatTimes} {repeatTimes === 1 ? 'day' : 'days'}</strong>.
              Subsequent students in the cycle will be postponed by {repeatTimes} {repeatTimes === 1 ? 'day' : 'days'}.
            </p>

            {/* Any N Number Input with Stepper Controls */}
            <div className="bg-[#071120] border border-[#1b3457] rounded-xl p-4 space-y-3">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                Enter Number of Repeat Days (N):
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDecrementRepeat}
                  disabled={repeatTimes <= 1}
                  className="w-11 h-11 rounded-lg bg-[#11233c] hover:bg-[#183154] disabled:opacity-40 text-slate-200 flex items-center justify-center text-lg font-bold border border-[#223f66] active:scale-95 transition-all"
                  aria-label="Decrease repeat days"
                >
                  <Minus className="w-5 h-5" />
                </button>

                <input
                  type="number"
                  min="1"
                  max="999"
                  value={repeatTimes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1) {
                      setRepeatTimes(Math.min(val, 999));
                    } else if (e.target.value === '') {
                      setRepeatTimes(1);
                    }
                  }}
                  className="flex-1 h-11 text-center text-xl font-extrabold font-mono bg-[#0a1628] border-2 border-amber-400/60 focus:border-amber-400 rounded-lg text-amber-300 focus:outline-none shadow-inner"
                />

                <button
                  type="button"
                  onClick={handleIncrementRepeat}
                  className="w-11 h-11 rounded-lg bg-[#11233c] hover:bg-[#183154] text-slate-200 flex items-center justify-center text-lg font-bold border border-[#223f66] active:scale-95 transition-all"
                  aria-label="Increase repeat days"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Quick shortcut pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-slate-400 mr-1 font-medium">Quick select:</span>
                {[1, 2, 3, 5, 7, 10, 14].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setRepeatTimes(num)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md border transition-all ${
                      repeatTimes === num
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-[#0e1c31] text-slate-300 border-[#1f375a] hover:border-slate-400 hover:text-white'
                    }`}
                  >
                    {num}x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#182b45]">
              <button
                type="button"
                onClick={() => setShowRepeatModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onApplyRepeatPenalty(duty.id, showRepeatModal, repeatTimes);
                  setShowRepeatModal(null);
                }}
                className="px-5 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 transition-all shadow-lg shadow-amber-500/20"
              >
                Apply {repeatTimes} Repeat {repeatTimes === 1 ? 'Day' : 'Days'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Swap Selector */}
      {showReassignFor !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0c182c] border-2 border-[#233d63] p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="font-extrabold text-lg text-white">
              Swap Student for {duty.title}
            </h4>
            <p className="text-xs text-slate-300">
              Select any resident to take this turn on this day:
            </p>

            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {allStudentNames.map((name) => {
                const resNo = getResidentNumber(name, students);
                return (
                  <button
                    key={name}
                    onClick={() => {
                      const newStudents = [...status.assignedStudents];
                      newStudents[showReassignFor] = name;
                      onReassign(duty.id, newStudents);
                      setShowReassignFor(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      status.assignedStudents.includes(name)
                        ? 'bg-amber-400/20 text-amber-300 border-2 border-amber-400/60'
                        : 'hover:bg-[#12223a] text-slate-200 border border-[#162942]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {resNo && (
                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-[#0e1d33] px-1.5 py-0.5 rounded border border-amber-400/30">
                          {resNo}
                        </span>
                      )}
                      <span className="text-sm">{name}</span>
                    </div>
                    {status.assignedStudents.includes(name) && (
                      <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded">Current</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#182b45]">
              <button
                onClick={() => setShowReassignFor(null)}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip Student Selector Modal (for multi-member duties) */}
      {showSkipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0c182c] border-2 border-amber-500/60 p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-amber-400 pb-2 border-b border-[#182e4e]">
              <UserX className="w-5 h-5" />
              <h4 className="font-extrabold text-base text-white">Who Went Home?</h4>
            </div>
            <p className="text-xs text-slate-300">
              Select which resident went home from {duty.title}. The system will advance that turn to the next person in cycle:
            </p>
            <div className="space-y-2 pt-1">
              {status.assignedStudents.map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    onSkipStudent(duty.id, name);
                    setShowSkipModal(false);
                  }}
                  className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-[#10243d] hover:bg-amber-950/60 text-amber-300 hover:text-white border border-amber-500/40 hover:border-amber-400 transition-all flex items-center justify-between shadow-sm active:scale-95"
                >
                  <span>{name}</span>
                  <span className="text-[11px] text-amber-400/80 uppercase font-semibold">Skip & Rotate</span>
                </button>
              ))}
            </div>
            <div className="pt-2 text-right">
              <button
                onClick={() => setShowSkipModal(false)}
                className="px-4 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swap Member Selector Modal (for multi-member duties) */}
      {showSwapPickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0c182c] border-2 border-[#233d63] p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-sky-400 pb-2 border-b border-[#182e4e]">
              <ArrowLeftRight className="w-5 h-5" />
              <h4 className="font-extrabold text-base text-white">Select Member to Swap</h4>
            </div>
            <p className="text-xs text-slate-300">
              Which resident in {duty.title} would you like to reassign?
            </p>
            <div className="space-y-2 pt-1">
              {status.assignedStudents.map((name, idx) => (
                <button
                  key={name}
                  onClick={() => {
                    setShowSwapPickerModal(false);
                    setShowReassignFor(idx);
                  }}
                  className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-[#10243d] hover:bg-[#18355a] text-slate-200 hover:text-white border border-[#23426e] transition-all flex items-center justify-between shadow-sm active:scale-95"
                >
                  <span>Member {idx + 1}: <strong className="text-amber-300">{name}</strong></span>
                  <span className="text-xs text-sky-400 font-semibold">Select →</span>
                </button>
              ))}
            </div>
            <div className="pt-2 text-right">
              <button
                onClick={() => setShowSwapPickerModal(false)}
                className="px-4 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
