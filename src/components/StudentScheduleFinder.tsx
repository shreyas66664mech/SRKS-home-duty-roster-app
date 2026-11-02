import React, { useState, useMemo } from 'react';
import { Student, DutyDefinition, RepeatPenalty, DayDutyStatus, DutyId } from '../types/roster';
import { getUpcomingDutiesForStudent, getResidentNumber } from '../utils/cycleEngine';
import { X, Calendar, CheckCircle2, Search, ArrowRight, UserCheck } from 'lucide-react';

interface StudentScheduleFinderProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  currentDate: string;
  penalties: RepeatPenalty[];
  overrides: Record<string, Record<DutyId, Partial<DayDutyStatus>>>;
  completedDuties: Record<string, DutyId[]>;
  baselineDate: string;
  duties?: DutyDefinition[];
  onSelectDate: (date: string) => void;
}

export const StudentScheduleFinder: React.FC<StudentScheduleFinderProps> = ({
  isOpen,
  onClose,
  students,
  currentDate,
  penalties,
  overrides,
  completedDuties,
  baselineDate,
  duties,
  onSelectDate,
}) => {
  const [selectedStudentName, setSelectedStudentName] = useState<string>(
    students[0]?.name || ''
  );
  const [daysWindow, setDaysWindow] = useState<number>(30);

  const upcomingList = useMemo(() => {
    if (!selectedStudentName) return [];
    return getUpcomingDutiesForStudent(
      selectedStudentName,
      currentDate,
      daysWindow,
      students,
      penalties,
      overrides,
      completedDuties,
      baselineDate,
      duties
    );
  }, [
    selectedStudentName,
    currentDate,
    daysWindow,
    students,
    penalties,
    overrides,
    completedDuties,
    baselineDate,
    duties,
  ]);

  if (!isOpen) return null;

  const formatDateDisplay = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-[#0c182c] border border-[#1e385c] shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#152740] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Find My Duty Turns</h3>
              <p className="text-xs text-slate-400">See exactly when your turn will arrive in the cycle</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#162945] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#152740] bg-[#091322] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Select Resident */}
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
              Select Resident Name
            </label>
            <select
              value={selectedStudentName}
              onChange={(e) => setSelectedStudentName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0e1a2f] border border-[#1e385c] text-slate-100 text-sm font-semibold focus:outline-none focus:border-amber-400"
            >
              {students.map((s) => {
                const resNo = getResidentNumber(s.name, students);
                return (
                  <option key={s.id} value={s.name}>
                    {resNo ? `${resNo} - ` : ''}{s.name} {s.isAway ? '(Currently Away)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Window */}
          <div className="sm:w-36">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Timeline Range
            </label>
            <select
              value={daysWindow}
              onChange={(e) => setDaysWindow(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-[#0e1a2f] border border-[#1e385c] text-slate-100 text-sm focus:outline-none focus:border-amber-400"
            >
              <option value={14}>Next 14 Days</option>
              <option value={30}>Next 30 Days</option>
              <option value={60}>Next 60 Days</option>
            </select>
          </div>
        </div>

        {/* Results List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-2.5">
          {upcomingList.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              No duties scheduled for {selectedStudentName} in the next {daysWindow} days.
            </div>
          ) : (
            upcomingList.map((item, idx) => (
              <div
                key={`${item.date}-${item.duty.id}-${idx}`}
                className="p-3.5 rounded-xl bg-[#081324] border border-[#162a47] hover:border-amber-500/40 transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <div className="text-center font-mono w-14 py-1 rounded bg-[#0f1f36] border border-[#1f375a]">
                    <div className="text-[10px] text-slate-400 uppercase">
                      {item.date.split('-')[1]}/{item.date.split('-')[2]}
                    </div>
                    <div className="text-xs font-bold text-amber-400">
                      {formatDateDisplay(item.date).split(',')[0]}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      {item.duty.title}
                    </div>
                    <div className="text-xs text-slate-400">
                      {item.duty.subtitle} {item.isPartner ? '· Partner' : ''}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSelectDate(item.date);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-[#11233c] hover:bg-amber-400 hover:text-slate-950 transition-colors flex items-center gap-1"
                >
                  <span>View Date</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
