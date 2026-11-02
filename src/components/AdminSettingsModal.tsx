import React, { useState, useEffect } from 'react';
import { Student, RepeatPenalty, DutyId, DutyDefinition } from '../types/roster';
import { DUTY_DEFINITIONS, getCycleStudentOrder } from '../utils/cycleEngine';
import {
  X,
  Key,
  Users,
  AlertTriangle,
  RotateCcw,
  Download,
  Upload,
  Check,
  Shield,
  Home,
  Trash2,
  Plus,
  RefreshCw,
  Minus,
  ChevronUp,
  ChevronDown,
  UserPlus,
  ArrowUpDown,
  UserX,
  Eye,
  EyeOff,
  Lock,
  Layers,
  ArrowRight,
  Star,
  Edit3,
  Save,
  CheckCircle2,
  SlidersHorizontal,
  Search,
} from 'lucide-react';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  duties?: DutyDefinition[];
  penalties: RepeatPenalty[];
  isPasswordSet?: boolean;
  initialTab?: 'students' | 'cycles' | 'penalties' | 'security' | 'backup';
  onToggleStudentAway: (studentId: string) => void;
  onAddStudent: (name: string, rollNo?: number) => boolean;
  onUpdateStudent?: (studentId: string, updates: Partial<Student>) => void;
  onBulkAddStudents?: (names: string[]) => number;
  onRemoveStudent: (studentId: string) => void;
  onReorderStudents: (newStudents: Student[]) => void;
  onAddDuty?: (duty: Omit<DutyDefinition, 'id'>) => boolean;
  onUpdateDuty?: (dutyId: string, updatedDuty: Partial<DutyDefinition>) => boolean;
  onRemoveDuty?: (dutyId: string) => boolean;
  onReorderDuties?: (newDuties: DutyDefinition[]) => void;
  onClearPenalty: (penaltyId: string) => void;
  onAddPenalty?: (dutyId: DutyId, studentName: string, repeatTimes: number) => void;
  onChangePassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; message: string }>;
  onResetPasswordToDefault?: () => void;
  onResetStudentPassword?: (studentId: string) => void;
  onExportData: () => void;
  onImportData: (jsonString: string) => boolean;
  onResetToDefaults: () => void;
  onResetAdminActions?: () => void;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  onClose,
  students,
  duties,
  penalties,
  isPasswordSet = false,
  initialTab = 'students',
  onToggleStudentAway,
  onAddStudent,
  onUpdateStudent,
  onBulkAddStudents,
  onRemoveStudent,
  onReorderStudents,
  onAddDuty,
  onUpdateDuty,
  onRemoveDuty,
  onReorderDuties,
  onClearPenalty,
  onAddPenalty,
  onChangePassword,
  onResetPasswordToDefault,
  onResetStudentPassword,
  onExportData,
  onImportData,
  onResetToDefaults,
  onResetAdminActions,
}) => {
  const [activeTab, setActiveTab] = useState<'students' | 'cycles' | 'penalties' | 'security' | 'backup'>(initialTab);

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Student management state with resident number #N support
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRollNo, setNewStudentRollNo] = useState<number>(students.length + 1);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [bulkAddText, setBulkAddText] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentRollNo, setEditStudentRollNo] = useState<number>(1);
  const [addStudentFeedback, setAddStudentFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Keep newStudentRollNo synced with total students
  useEffect(() => {
    setNewStudentRollNo(students.length + 1);
  }, [students.length]);

  // Turn Cycle management state
  const activeDuties = (duties && duties.length > 0) ? duties : DUTY_DEFINITIONS;
  const [newCycleTitle, setNewCycleTitle] = useState('');
  const [newCycleSubtitle, setNewCycleSubtitle] = useState('');
  const [newCycleMemberCount, setNewCycleMemberCount] = useState<number>(1);
  const [newCycleDirection, setNewCycleDirection] = useState<'forward' | 'reverse'>('forward');
  const [newCycleBaseNames, setNewCycleBaseNames] = useState<string[]>([
    students[0]?.name || 'Shreyas',
  ]);
  const [cycleFeedback, setCycleFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit cycle state
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editMemberCount, setEditMemberCount] = useState<number>(1);
  const [editDirection, setEditDirection] = useState<'forward' | 'reverse'>('forward');
  const [editBaseNames, setEditBaseNames] = useState<string[]>([]);
  const [cycleToDelete, setCycleToDelete] = useState<DutyDefinition | null>(null);

  // Helper to adjust member count for new cycle with smart starting names
  const handleSetNewCycleMemberCount = (count: number) => {
    const validCount = Math.max(1, Math.min(count, Math.max(students.length, 50)));
    setNewCycleMemberCount(validCount);
    setNewCycleBaseNames(prev => {
      const next = [...prev];
      if (next.length === 0) {
        next.push(students[0]?.name || '');
      }
      const firstIdx = students.findIndex(s => s.name === next[0]);
      const baseIdx = firstIdx !== -1 ? firstIdx : 0;
      while (next.length < validCount) {
        const studentIdx = (baseIdx + next.length) % (students.length || 1);
        next.push(students[studentIdx]?.name || students[0]?.name || '');
      }
      return next.slice(0, validCount);
    });
  };

  const handleUpdateNewCycleBaseName = (index: number, studentName: string) => {
    setNewCycleBaseNames(prev => {
      const next = [...prev];
      next[index] = studentName;
      return next;
    });
  };

  const handleAutoFillNewCycleSlots = () => {
    if (students.length === 0) return;
    const firstStudent = newCycleBaseNames[0] || students[0]?.name;
    const startIdx = Math.max(0, students.findIndex(s => s.name === firstStudent));
    const filled: string[] = [];
    for (let k = 0; k < newCycleMemberCount; k++) {
      const idx = (startIdx + k) % students.length;
      filled.push(students[idx]?.name || '');
    }
    setNewCycleBaseNames(filled);
  };

  // Helper to adjust member count for edit cycle with smart starting names
  const handleSetEditMemberCount = (count: number) => {
    const validCount = Math.max(1, Math.min(count, Math.max(students.length, 50)));
    setEditMemberCount(validCount);
    setEditBaseNames(prev => {
      const next = [...prev];
      if (next.length === 0) {
        next.push(students[0]?.name || '');
      }
      const firstIdx = students.findIndex(s => s.name === next[0]);
      const baseIdx = firstIdx !== -1 ? firstIdx : 0;
      while (next.length < validCount) {
        const studentIdx = (baseIdx + next.length) % (students.length || 1);
        next.push(students[studentIdx]?.name || students[0]?.name || '');
      }
      return next.slice(0, validCount);
    });
  };

  const handleUpdateEditBaseName = (index: number, studentName: string) => {
    setEditBaseNames(prev => {
      const next = [...prev];
      next[index] = studentName;
      return next;
    });
  };

  const handleAutoFillEditSlots = () => {
    if (students.length === 0) return;
    const firstStudent = editBaseNames[0] || students[0]?.name;
    const startIdx = Math.max(0, students.findIndex(s => s.name === firstStudent));
    const filled: string[] = [];
    for (let k = 0; k < editMemberCount; k++) {
      const idx = (startIdx + k) % students.length;
      filled.push(students[idx]?.name || '');
    }
    setEditBaseNames(filled);
  };

  // Change password form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);

  // New penalty form inside settings
  const [penStudent, setPenStudent] = useState<string>(students[0]?.name || '');
  const [penDuty, setPenDuty] = useState<DutyId>('10_turn');
  const [penTimes, setPenTimes] = useState<number>(1);
  const [penaltySuccessMsg, setPenaltySuccessMsg] = useState<string | null>(null);

  // Import state
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  // Turn Cycle handlers
  const handleAddCycleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCycleTitle.trim()) {
      setCycleFeedback({ type: 'error', text: 'Please enter a cycle title.' });
      return;
    }
    if (onAddDuty) {
      const baseNames = newCycleBaseNames.filter(Boolean);
      if (baseNames.length === 0 && students[0]) {
        baseNames.push(students[0].name);
      }

      const ok = onAddDuty({
        title: newCycleTitle.trim(),
        subtitle: newCycleSubtitle.trim() || 'General hostel duty',
        memberCount: newCycleMemberCount,
        direction: newCycleDirection,
        baseNames,
      });

      if (ok) {
        setCycleFeedback({
          type: 'success',
          text: `Created new turn cycle: "${newCycleTitle.trim()}" with ${newCycleMemberCount} ${newCycleMemberCount === 1 ? 'resident' : 'residents'} per day!`,
        });
        setNewCycleTitle('');
        setNewCycleSubtitle('');
        setNewCycleMemberCount(1);
        setNewCycleBaseNames([students[0]?.name || 'Shreyas']);
        setTimeout(() => setCycleFeedback(null), 3500);
      }
    }
  };

  const handleStartEditingCycle = (duty: DutyDefinition) => {
    setEditingCycleId(duty.id);
    setEditTitle(duty.title);
    setEditSubtitle(duty.subtitle);
    const count = Math.max(1, duty.memberCount || 1);
    setEditMemberCount(count);
    setEditDirection(duty.direction);

    // Populate edit base names for all N slots
    const names = Array.isArray(duty.baseNames) ? [...duty.baseNames] : [];
    if (names.length === 0 && students[0]) {
      names.push(students[0].name);
    }
    const firstIdx = students.findIndex(s => s.name === names[0]);
    const baseIdx = firstIdx !== -1 ? firstIdx : 0;
    while (names.length < count) {
      const studentIdx = (baseIdx + names.length) % (students.length || 1);
      names.push(students[studentIdx]?.name || students[0]?.name || '');
    }
    setEditBaseNames(names.slice(0, count));
  };

  const handleSaveEditedCycle = (dutyId: string) => {
    if (!editTitle.trim()) return;
    if (onUpdateDuty) {
      const baseNames = editBaseNames.filter(Boolean);
      if (baseNames.length === 0 && students[0]) {
        baseNames.push(students[0].name);
      }

      onUpdateDuty(dutyId, {
        title: editTitle.trim(),
        subtitle: editSubtitle.trim(),
        memberCount: editMemberCount,
        direction: editDirection,
        baseNames,
      });
    }
    setEditingCycleId(null);
  };

  const handleToggleCycleDirection = (duty: DutyDefinition) => {
    if (onUpdateDuty) {
      const nextDir = duty.direction === 'forward' ? 'reverse' : 'forward';
      onUpdateDuty(duty.id, { direction: nextDir });
    }
  };

  const handleChangeCycleStartStudent = (duty: DutyDefinition, newStartStudentName: string) => {
    if (onUpdateDuty) {
      const count = Math.max(1, duty.memberCount || 1);
      const newBaseNames = [newStartStudentName];
      if (count > 1) {
        if (duty.baseNames && duty.baseNames.length >= count) {
          for (let i = 1; i < count; i++) {
            newBaseNames.push(duty.baseNames[i]);
          }
        } else {
          const startIdx = students.findIndex(s => s.name === newStartStudentName);
          const baseIdx = startIdx !== -1 ? startIdx : 0;
          for (let i = 1; i < count; i++) {
            const nextIdx = (baseIdx + i) % (students.length || 1);
            newBaseNames.push(students[nextIdx]?.name || '');
          }
        }
      }
      onUpdateDuty(duty.id, { baseNames: newBaseNames });
    }
  };

  const handleMoveCycle = (index: number, direction: 'up' | 'down') => {
    if (!onReorderDuties) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeDuties.length) return;
    const reordered = [...activeDuties];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;
    onReorderDuties(reordered);
  };

  const handleConfirmDeleteCycle = (duty: DutyDefinition) => {
    if (onRemoveDuty) {
      onRemoveDuty(duty.id);
      setCycleToDelete(null);
    }
  };

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    const ok = onAddStudent(newStudentName.trim(), newStudentRollNo);
    if (ok) {
      setAddStudentFeedback({ type: 'success', text: `Added Resident #${newStudentRollNo} "${newStudentName.trim()}" to cycle!` });
      setNewStudentName('');
      setNewStudentRollNo(students.length + 2);
      setTimeout(() => setAddStudentFeedback(null), 3000);
    } else {
      setAddStudentFeedback({ type: 'error', text: 'Resident name already exists or is invalid.' });
      setTimeout(() => setAddStudentFeedback(null), 3000);
    }
  };

  const handleBulkAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkAddText.trim() || !onBulkAddStudents) return;
    const names = bulkAddText
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length === 0) return;
    const count = onBulkAddStudents(names);
    if (count > 0) {
      setAddStudentFeedback({ type: 'success', text: `Successfully added ${count} new residents to the roster!` });
      setBulkAddText('');
      setIsBulkAddOpen(false);
      setTimeout(() => setAddStudentFeedback(null), 3500);
    } else {
      setAddStudentFeedback({ type: 'error', text: 'No new unique names were added.' });
      setTimeout(() => setAddStudentFeedback(null), 3000);
    }
  };

  const handleStartEditStudent = (student: Student, idx: number) => {
    setEditingStudentId(student.id);
    setEditStudentName(student.name);
    setEditStudentRollNo(student.rollNo ?? (idx + 1));
  };

  const handleSaveEditStudent = (studentId: string) => {
    if (!editStudentName.trim() || !onUpdateStudent) return;
    onUpdateStudent(studentId, {
      name: editStudentName.trim(),
      rollNo: editStudentRollNo > 0 ? editStudentRollNo : undefined,
    });
    setEditingStudentId(null);
  };

  const handleMoveStudent = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= students.length) return;
    const reordered = [...students];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;
    onReorderStudents(reordered);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdFeedback(null);

    if (newPassword.length < 4) {
      setPwdFeedback({ type: 'error', text: 'New password must be at least 4 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdFeedback({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsUpdatingPwd(true);
    const result = await onChangePassword(oldPassword, newPassword);
    setIsUpdatingPwd(false);

    if (result.success) {
      setPwdFeedback({ type: 'success', text: 'Password successfully changed!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPwdFeedback({ type: 'error', text: result.message });
    }
  };

  const handleAddPenaltySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddPenalty || !penStudent) return;
    onAddPenalty(penDuty, penStudent, penTimes);
    setPenaltySuccessMsg(`Assigned ${penTimes}x repeat penalty to ${penStudent}!`);
    setTimeout(() => setPenaltySuccessMsg(null), 3000);
  };

  const getDutyTitle = (id: DutyId) => {
    return DUTY_DEFINITIONS.find((d) => d.id === id)?.title || id;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-[#0c182c] border-2 border-[#1e3a63] shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[#152740] flex items-center justify-between bg-[#081222]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-white">Admin Control Center</h3>
              <p className="text-xs text-amber-300/80">Manage residents, leaves, N-repeat penalties, and security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#162945] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-6 pt-3 border-b border-[#152740] bg-[#070e1b] overflow-x-auto">
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'students'
                ? 'bg-[#0c182c] text-amber-300 border-t-2 border-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Residents ({students.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cycles')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'cycles'
                ? 'bg-[#0c182c] text-amber-300 border-t-2 border-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Turn Cycles & Order ({activeDuties.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('penalties')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'penalties'
                ? 'bg-[#0c182c] text-amber-300 border-t-2 border-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Repeat Penalties ({penalties.filter((p) => p.active).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-[#0c182c] text-amber-300 border-t-2 border-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Change Password</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'backup'
                ? 'bg-[#0c182c] text-amber-300 border-t-2 border-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Backup & Reset</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* STUDENTS / LEAVE & CYCLE ORDER TAB */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              {/* Quick Section Navigation: Student Add & Turn Cycles List */}
              <div className="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-[#091526] border border-[#1b3457]">
                <button
                  type="button"
                  onClick={() => setActiveTab('students')}
                  className="py-2 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 bg-amber-400 text-slate-950 shadow-sm"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>1. Student Residents ({students.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('cycles')}
                  className="py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 text-amber-300 hover:text-amber-200 bg-[#0d213b] hover:bg-[#122e52] border border-amber-400/30"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>2. Turn Cycles List ({activeDuties.length}) ➔</span>
                </button>
              </div>

              {/* Add New Student Form (Supports Single or Bulk N Residents) */}
              <div className="p-4 sm:p-5 rounded-xl bg-[#081324] border-2 border-amber-500/40 space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm uppercase tracking-wider">
                    <UserPlus className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                    <span>Add Resident (N Number Support)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBulkAddOpen(!isBulkAddOpen)}
                    className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#0e213b] hover:bg-[#15345c] text-amber-300 border border-amber-400/30 transition-all flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{isBulkAddOpen ? 'Switch to Single Add' : '+ Bulk Add N Residents'}</span>
                  </button>
                </div>

                {addStudentFeedback && (
                  <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center gap-2 ${
                    addStudentFeedback.type === 'success'
                      ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/70 border border-rose-500/50 text-rose-300'
                  }`}>
                    {addStudentFeedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span>{addStudentFeedback.text}</span>
                  </div>
                )}

                {!isBulkAddOpen ? (
                  /* Single Add Form with Name and Resident #N */
                  <form onSubmit={handleAddStudentSubmit} className="space-y-2.5">
                    <p className="text-xs text-slate-300">
                      Add a new hostel resident. Assign their official Resident Number or let the system auto-number them.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center gap-2.5">
                      {/* Resident Number #N Input */}
                      <div className="w-full sm:w-28 flex items-center gap-1.5 bg-[#0c182c] border-2 border-[#1d365a] focus-within:border-amber-400 rounded-xl px-2.5 py-1.5 shrink-0">
                        <span className="text-xs font-black text-amber-400">#</span>
                        <input
                          type="number"
                          min="1"
                          max="9999"
                          value={newStudentRollNo}
                          onChange={(e) => setNewStudentRollNo(parseInt(e.target.value, 10) || 1)}
                          title="Resident Number #N"
                          className="w-full bg-transparent text-slate-100 text-sm font-mono font-bold focus:outline-none"
                        />
                      </div>

                      {/* Full Name Input */}
                      <input
                        type="text"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        placeholder="Enter resident full name..."
                        className="flex-1 w-full px-3.5 py-2.5 rounded-xl bg-[#0c182c] border-2 border-[#1d365a] focus:border-amber-400 text-slate-100 text-sm font-semibold placeholder:text-slate-500 focus:outline-none"
                      />

                      <button
                        type="submit"
                        disabled={!newStudentName.trim()}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 shrink-0"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Add Resident #{newStudentRollNo}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Bulk Add N Residents at Once */
                  <form onSubmit={handleBulkAddSubmit} className="space-y-3 bg-[#060e1a] p-3.5 rounded-xl border border-[#172c4a]">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Bulk Add N Residents at once:
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Will be numbered from #{students.length + 1} upwards
                      </span>
                    </div>
                    <textarea
                      value={bulkAddText}
                      onChange={(e) => setBulkAddText(e.target.value)}
                      rows={3}
                      placeholder="Paste or type resident names separated by comma or new lines, e.g.:&#10;Ganesh Sharma&#10;Mahesh Kumar&#10;Kiran Rao"
                      className="w-full p-3 rounded-xl bg-[#091526] border border-[#1b3457] text-white text-xs font-semibold focus:outline-none focus:border-amber-400 placeholder:text-slate-500"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsBulkAddOpen(false)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!bulkAddText.trim()}
                        className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow"
                      >
                        <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Add All Residents</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Resident Search & Filter Toolbar */}
              <div className="p-3 rounded-xl bg-[#091526] border border-[#1e3a63] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex-1 w-full flex items-center gap-2 bg-[#0c182c] border border-[#193256] focus-within:border-amber-400 rounded-lg px-3 py-1.5">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Search by resident name or #N (e.g. #05, Shreyas)..."
                    className="w-full bg-transparent text-slate-100 text-xs font-semibold placeholder:text-slate-500 focus:outline-none"
                  />
                  {studentSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStudentSearchQuery('')}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-2 text-xs font-mono font-bold text-amber-300 bg-[#0e1f38] px-3 py-1.5 rounded-lg border border-amber-500/30">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>{students.length} Total Residents</span>
                </div>
              </div>

              {/* Student Cards List */}
              <div className="space-y-2.5">
                {students
                  .filter((s, idx) => {
                    if (!studentSearchQuery.trim()) return true;
                    const q = studentSearchQuery.toLowerCase().trim();
                    const num = String(s.rollNo ?? (idx + 1));
                    return s.name.toLowerCase().includes(q) || num.includes(q.replace('#', ''));
                  })
                  .map((student) => {
                    const idx = students.findIndex((s) => s.id === student.id);
                    const resNo = `#${String(student.rollNo ?? (idx + 1)).padStart(2, '0')}`;
                    const isEditing = editingStudentId === student.id;

                    return (
                      <div
                        key={student.id}
                        className={`p-3.5 rounded-xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          student.isAway
                            ? 'bg-rose-950/20 border-rose-800/40 shadow-sm'
                            : 'bg-[#081222] border-[#182b47] hover:border-[#223d66]'
                        }`}
                      >
                        {isEditing ? (
                          /* Inline Edit Resident Form */
                          <div className="flex-1 flex flex-col sm:flex-row items-center gap-2">
                            <div className="w-full sm:w-24 flex items-center gap-1 bg-[#0c182c] border border-amber-400 rounded-lg px-2 py-1">
                              <span className="text-xs text-amber-400 font-bold">#</span>
                              <input
                                type="number"
                                min="1"
                                max="9999"
                                value={editStudentRollNo}
                                onChange={(e) => setEditStudentRollNo(parseInt(e.target.value, 10) || 1)}
                                className="w-full bg-transparent text-white text-xs font-mono font-bold focus:outline-none"
                              />
                            </div>
                            <input
                              type="text"
                              value={editStudentName}
                              onChange={(e) => setEditStudentName(e.target.value)}
                              className="flex-1 w-full px-3 py-1.5 rounded-lg bg-[#0c182c] border border-amber-400 text-white text-xs font-bold focus:outline-none"
                            />
                            <div className="flex items-center gap-1.5 self-end sm:self-auto">
                              <button
                                type="button"
                                onClick={() => handleSaveEditStudent(student.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingStudentId(null)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#142845] hover:bg-[#1a3459] text-slate-300 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Normal Resident Display */
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Resident Number #N Badge */}
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#12243d] to-[#0a1626] border-2 border-amber-400/60 text-amber-300 flex items-center justify-center font-mono font-black text-xs shrink-0 shadow-md">
                              {resNo}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-base font-extrabold truncate block ${student.isAway ? 'text-rose-300 line-through' : 'text-slate-100'}`}>
                                  {student.name}
                                </span>
                                <span className="text-[10px] font-mono text-amber-400/90 bg-[#0e1f38] px-1.5 py-0.5 rounded border border-amber-500/20">
                                  Resident {resNo}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                Cycle Turn Position {idx + 1} of {students.length}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                          {/* Reorder Up / Down Controls */}
                          <div className="flex items-center bg-[#0d1c31] border border-[#1b3457] rounded-lg p-0.5 shadow-sm">
                            <button
                              type="button"
                              onClick={() => handleMoveStudent(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 text-slate-300 hover:text-amber-400 disabled:opacity-25 disabled:hover:text-slate-300 rounded hover:bg-[#132845] transition-colors"
                              title="Move up in cycle sequence"
                              aria-label={`Move ${student.name} up in cycle`}
                            >
                              <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveStudent(idx, 'down')}
                              disabled={idx === students.length - 1}
                              className="p-1.5 text-slate-300 hover:text-amber-400 disabled:opacity-25 disabled:hover:text-slate-300 rounded hover:bg-[#132845] transition-colors"
                              title="Move down in cycle sequence"
                              aria-label={`Move ${student.name} down in cycle`}
                            >
                              <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                            </button>
                          </div>

                          {/* Home Leave Toggle */}
                          <button
                            type="button"
                            onClick={() => onToggleStudentAway(student.id)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95 ${
                              student.isAway
                                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                                : 'bg-[#12233b] hover:bg-[#1a3359] text-emerald-400 border border-emerald-500/40'
                            }`}
                            title={student.isAway ? 'Mark as Present' : 'Mark as Away / Went Home'}
                          >
                            {student.isAway ? 'Went Home (Away)' : 'Present'}
                          </button>

                          {/* Edit Resident Details */}
                          <button
                            type="button"
                            onClick={() => handleStartEditStudent(student, idx)}
                            className="p-2 text-slate-400 hover:text-amber-300 hover:bg-[#132845] border border-transparent hover:border-amber-400/40 rounded-lg transition-all active:scale-95"
                            title="Edit resident name or number"
                            aria-label={`Edit ${student.name}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Reset Student Password to 12345 */}
                          {onResetStudentPassword && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Reset password for ${student.name} back to default "12345"?`)) {
                                  onResetStudentPassword(student.id);
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-[#132845] border border-transparent hover:border-amber-400/40 rounded-lg transition-all active:scale-95"
                              title={`Reset ${student.name}'s password back to default "12345"`}
                              aria-label={`Reset password for ${student.name}`}
                            >
                              <Key className="w-4 h-4 text-amber-400" />
                            </button>
                          )}

                          {/* Remove Permanently Button */}
                          <button
                            type="button"
                            onClick={() => setStudentToDelete(student)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800/50 rounded-lg transition-all active:scale-95"
                            title={`Permanently remove ${student.name} from hostel roster`}
                            aria-label={`Permanently remove ${student.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TURN CYCLES & ORDER TAB */}
          {activeTab === 'cycles' && (
            <div className="space-y-5">
              {/* Quick Section Navigation: Student Add & Turn Cycles List */}
              <div className="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-[#091526] border border-[#1b3457]">
                <button
                  type="button"
                  onClick={() => setActiveTab('students')}
                  className="py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 text-slate-300 hover:text-white"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>⬅ 1. Student Residents ({students.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('cycles')}
                  className="py-2 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 bg-amber-400 text-slate-950 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>2. Turn Cycles List ({activeDuties.length})</span>
                </button>
              </div>

              {/* Information Banner */}
              <div className="p-4 rounded-xl bg-[#091526] border border-[#1e3a63] text-xs sm:text-sm text-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-start gap-3">
                  <SlidersHorizontal className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white">Hostel Duty Cycles & Student Rotation Order:</span>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Add new duty cycles, change existing ones, and control <strong>which cycle which order students go</strong>. When marked DONE, duties automatically advance to the next resident in that cycle's sequence.
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-mono font-bold text-amber-300 bg-[#0e1f38] px-3 py-1 rounded-lg border border-amber-500/30">
                  {activeDuties.length} Active Cycles
                </span>
              </div>

              {/* Feedback Alert */}
              {cycleFeedback && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  cycleFeedback.type === 'success'
                    ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/70 border border-rose-500/50 text-rose-300'
                }`}>
                  {cycleFeedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>{cycleFeedback.text}</span>
                </div>
              )}

              {/* ADD NEW TURN CYCLE FORM */}
              <form onSubmit={handleAddCycleSubmit} className="p-4 sm:p-5 rounded-xl bg-[#081324] border-2 border-amber-500/40 space-y-4 shadow-lg">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm uppercase tracking-wider">
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add New Turn Cycle</span>
                </div>
                <p className="text-xs text-slate-300">
                  Create a new hostel duty (e.g., Water Tank, Study Hall, Dining Helper) with its own rotation order.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                      Cycle Title *
                    </label>
                    <input
                      type="text"
                      value={newCycleTitle}
                      onChange={(e) => setNewCycleTitle(e.target.value)}
                      placeholder="e.g. Water Tank Duty, Library Turn..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c182c] border-2 border-[#1d365a] focus:border-amber-400 text-slate-100 text-sm font-semibold placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                      Description / Subtitle
                    </label>
                    <input
                      type="text"
                      value={newCycleSubtitle}
                      onChange={(e) => setNewCycleSubtitle(e.target.value)}
                      placeholder="e.g. Water pump operation & filter check"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c182c] border-2 border-[#1d365a] focus:border-amber-400 text-slate-100 text-sm font-semibold placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* CONFIGURATION ROW: N RESIDENTS & ROTATION DIRECTION */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#0a1628] border border-[#1b3354]">
                  {/* N Number of Residents Per Day */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>Students Per Turn (N):</span>
                      </label>
                      <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                        {newCycleMemberCount} {newCycleMemberCount === 1 ? 'student' : 'students'} / day
                      </span>
                    </div>

                    {/* Stepper + Direct Number Input */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetNewCycleMemberCount(newCycleMemberCount - 1)}
                        disabled={newCycleMemberCount <= 1}
                        className="w-10 h-10 rounded-xl bg-[#11233c] hover:bg-[#183154] disabled:opacity-30 text-white flex items-center justify-center font-black border border-[#223f66] active:scale-95 transition-all shadow-sm"
                        aria-label="Decrease students"
                      >
                        <Minus className="w-4 h-4 stroke-[3]" />
                      </button>

                      <input
                        type="number"
                        min={1}
                        max={Math.max(students.length, 50)}
                        value={newCycleMemberCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1) {
                            handleSetNewCycleMemberCount(val);
                          } else if (e.target.value === '') {
                            handleSetNewCycleMemberCount(1);
                          }
                        }}
                        className="w-20 h-10 text-center text-lg font-black font-mono bg-[#0c182c] border-2 border-amber-400/60 focus:border-amber-400 rounded-xl text-amber-300 focus:outline-none shadow-inner"
                      />

                      <button
                        type="button"
                        onClick={() => handleSetNewCycleMemberCount(newCycleMemberCount + 1)}
                        disabled={newCycleMemberCount >= Math.max(students.length, 50)}
                        className="w-10 h-10 rounded-xl bg-[#11233c] hover:bg-[#183154] disabled:opacity-30 text-white flex items-center justify-center font-black border border-[#223f66] active:scale-95 transition-all shadow-sm"
                        aria-label="Increase students"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </button>

                      {/* Quick preset chips */}
                      <div className="flex items-center gap-1 overflow-x-auto pl-1">
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                          <button
                            key={`preset_n_${num}`}
                            type="button"
                            onClick={() => handleSetNewCycleMemberCount(num)}
                            className={`px-2.5 py-1.5 text-xs font-black rounded-lg border transition-all ${
                              newCycleMemberCount === num
                                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow font-extrabold'
                                : 'bg-[#0c182c] text-slate-300 border-[#1d365a] hover:bg-[#142845]'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Put any number <strong className="text-slate-200">N</strong> of residents needed to do this turn duty together each day.
                    </p>
                  </div>

                  {/* Rotation Direction */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-200 uppercase tracking-wide">
                      Rotation Direction
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewCycleDirection('forward')}
                        className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all flex items-center justify-center gap-1.5 ${
                          newCycleDirection === 'forward'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                            : 'bg-[#0c182c] text-slate-300 border-[#1d365a] hover:bg-[#132745]'
                        }`}
                      >
                        <span>Forward ↗ (Next)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCycleDirection('reverse')}
                        className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all flex items-center justify-center gap-1.5 ${
                          newCycleDirection === 'reverse'
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                            : 'bg-[#0c182c] text-slate-300 border-[#1d365a] hover:bg-[#132745]'
                        }`}
                      >
                        <span>Reverse ↙ (Prev)</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Forward rotates from resident #1 to #N; reverse rotates backward.
                    </p>
                  </div>
                </div>

                {/* STARTING RESIDENTS FOR ALL N SLOTS */}
                <div className="p-4 rounded-xl bg-[#0b172a] border border-[#1b3457] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#162740] pb-2.5">
                    <div>
                      <h5 className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>Starting Residents on Day 1 ({newCycleMemberCount} {newCycleMemberCount === 1 ? 'Resident' : 'Residents'}):</span>
                      </h5>
                      <p className="text-[11px] text-slate-400">
                        {newCycleMemberCount === 1
                          ? 'Select which resident starts this cycle on baseline day.'
                          : `Select the ${newCycleMemberCount} residents assigned to this turn on Day 1.`}
                      </p>
                    </div>

                    {newCycleMemberCount > 1 && (
                      <button
                        type="button"
                        onClick={handleAutoFillNewCycleSlots}
                        className="self-start sm:self-auto px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#142845] hover:bg-[#1c365c] text-amber-300 border border-amber-400/30 flex items-center gap-1 transition-all"
                        title="Auto-fill partner slots consecutively from Slot 1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Auto-fill Consecutive</span>
                      </button>
                    )}
                  </div>

                  {/* Render N Selectors */}
                  <div className={`grid gap-2.5 ${newCycleMemberCount === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                    {Array.from({ length: newCycleMemberCount }).map((_, slotIdx) => {
                      const selectedVal = newCycleBaseNames[slotIdx] || students[slotIdx % students.length]?.name || '';
                      return (
                        <div key={`new_slot_${slotIdx}`} className="p-2.5 rounded-lg bg-[#081222] border border-[#1d365a] space-y-1">
                          <label className="block text-[10px] font-black uppercase text-slate-300 flex items-center justify-between">
                            <span>
                              {slotIdx === 0 ? '⭐ Slot 1 (Starting Lead)' : `Slot ${slotIdx + 1} (Team Member)`}
                            </span>
                            <span className="font-mono text-amber-400">#{slotIdx + 1}</span>
                          </label>
                          <select
                            value={selectedVal}
                            onChange={(e) => handleUpdateNewCycleBaseName(slotIdx, e.target.value)}
                            className="w-full px-2.5 py-2 rounded-lg bg-[#0c182c] border border-[#203a63] focus:border-amber-400 text-slate-100 text-xs font-bold focus:outline-none"
                          >
                            {students.map((s, sIndex) => {
                              const num = `#${String(s.rollNo ?? (sIndex + 1)).padStart(2, '0')}`;
                              return (
                                <option key={s.id} value={s.name}>
                                  {num} - {s.name}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!newCycleTitle.trim()}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Create New Turn Cycle</span>
                </button>
              </form>

              {/* LIST OF TURN CYCLES AND STUDENT ORDER */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>Existing Turn Cycles & Student Progression</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {activeDuties.length} Cycles Configured
                  </span>
                </div>

                {activeDuties.map((duty, dutyIdx) => {
                  const isEditing = editingCycleId === duty.id;
                  const cycleStudentOrder = getCycleStudentOrder(duty, students);

                  return (
                    <div
                      key={duty.id}
                      className="p-4 sm:p-5 rounded-2xl bg-[#081324] border-2 border-[#1a3357] hover:border-[#294c7a] transition-all space-y-3 shadow-lg"
                    >
                      {/* Cycle Title Header & Main Controls */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#142947]">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Order number */}
                          <div className="w-8 h-8 rounded-xl bg-[#0c1a30] border border-amber-400/40 text-amber-300 flex items-center justify-center font-mono font-black text-xs shrink-0 shadow-inner">
                            #{dutyIdx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-black text-base text-white tracking-wide">
                                {duty.title}
                              </h5>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                  duty.direction === 'forward'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                }`}
                              >
                                {duty.direction === 'forward' ? 'Forward ↗' : 'Reverse ↙'}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                {duty.memberCount} {duty.memberCount === 1 ? 'Resident' : 'Residents'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 truncate">
                              {duty.subtitle}
                            </p>
                          </div>
                        </div>

                        {/* Top Controls: Reorder, Edit, Delete */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          {/* Reorder Up / Down */}
                          <div className="flex items-center bg-[#0d1c31] border border-[#1b3457] rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveCycle(dutyIdx, 'up')}
                              disabled={dutyIdx === 0}
                              className="p-1.5 text-slate-300 hover:text-amber-400 disabled:opacity-25 rounded hover:bg-[#132845] transition-colors"
                              title="Move duty up in roster view"
                            >
                              <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveCycle(dutyIdx, 'down')}
                              disabled={dutyIdx === activeDuties.length - 1}
                              className="p-1.5 text-slate-300 hover:text-amber-400 disabled:opacity-25 rounded hover:bg-[#132845] transition-colors"
                              title="Move duty down in roster view"
                            >
                              <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                            </button>
                          </div>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => (isEditing ? setEditingCycleId(null) : handleStartEditingCycle(duty))}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                              isEditing
                                ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold'
                                : 'bg-[#0f233f] text-amber-300 border-amber-400/40 hover:bg-[#142f54]'
                            }`}
                            title="Edit cycle details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{isEditing ? 'Close' : 'Edit'}</span>
                          </button>

                          {/* Delete button */}
                          {activeDuties.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setCycleToDelete(duty)}
                              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800/50 transition-all"
                              title={`Delete ${duty.title} cycle`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* INLINE EDIT FORM */}
                      {isEditing ? (
                        <div className="p-4 rounded-xl bg-[#0b172a] border-2 border-amber-400/60 space-y-3 animate-in fade-in">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-300 uppercase">
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit {duty.title}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                                Cycle Title
                              </label>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-[#081222] border border-[#1d365a] focus:border-amber-400 text-white text-xs font-semibold focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                                Subtitle / Description
                              </label>
                              <input
                                type="text"
                                value={editSubtitle}
                                onChange={(e) => setEditSubtitle(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-[#081222] border border-[#1d365a] focus:border-amber-400 text-white text-xs font-semibold focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* EDIT MEMBER COUNT & DIRECTION */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[#091526] border border-[#1b3457]">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-black text-amber-300 uppercase tracking-wide flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  <span>Residents Per Turn (N):</span>
                                </label>
                                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30">
                                  {editMemberCount} {editMemberCount === 1 ? 'resident' : 'residents'} / day
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSetEditMemberCount(editMemberCount - 1)}
                                  disabled={editMemberCount <= 1}
                                  className="w-8 h-8 rounded-lg bg-[#11233c] hover:bg-[#183154] disabled:opacity-30 text-white flex items-center justify-center font-bold border border-[#223f66] active:scale-95 transition-all"
                                  aria-label="Decrease residents"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>

                                <input
                                  type="number"
                                  min={1}
                                  max={Math.max(students.length, 50)}
                                  value={editMemberCount}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val) && val >= 1) {
                                      handleSetEditMemberCount(val);
                                    } else if (e.target.value === '') {
                                      handleSetEditMemberCount(1);
                                    }
                                  }}
                                  className="w-16 h-8 text-center text-sm font-black font-mono bg-[#0c182c] border border-amber-400/60 focus:border-amber-400 rounded-lg text-amber-300 focus:outline-none"
                                />

                                <button
                                  type="button"
                                  onClick={() => handleSetEditMemberCount(editMemberCount + 1)}
                                  disabled={editMemberCount >= Math.max(students.length, 50)}
                                  className="w-8 h-8 rounded-lg bg-[#11233c] hover:bg-[#183154] disabled:opacity-30 text-white flex items-center justify-center font-bold border border-[#223f66] active:scale-95 transition-all"
                                  aria-label="Increase residents"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>

                                <div className="flex items-center gap-1 pl-1">
                                  {[1, 2, 3, 4, 5].map((num) => (
                                    <button
                                      key={`edit_preset_${num}`}
                                      type="button"
                                      onClick={() => handleSetEditMemberCount(num)}
                                      className={`px-2 py-1 text-[11px] font-bold rounded border transition-all ${
                                        editMemberCount === num
                                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold'
                                          : 'bg-[#081222] text-slate-300 border-[#1d365a]'
                                      }`}
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-[11px] font-black text-slate-200 uppercase tracking-wide">
                                Rotation Direction
                              </label>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditDirection('forward')}
                                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                                    editDirection === 'forward'
                                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-sm'
                                      : 'bg-[#081222] text-slate-300 border-[#1d365a]'
                                  }`}
                                >
                                  Forward ↗
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditDirection('reverse')}
                                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                                    editDirection === 'reverse'
                                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                                      : 'bg-[#081222] text-slate-300 border-[#1d365a]'
                                  }`}
                                >
                                  Reverse ↙
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* EDIT N STARTING RESIDENT SLOTS */}
                          <div className="p-3 rounded-xl bg-[#081222] border border-[#1b3457] space-y-2.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>Day 1 Starting Residents ({editMemberCount} {editMemberCount === 1 ? 'Slot' : 'Slots'}):</span>
                              </label>
                              {editMemberCount > 1 && (
                                <button
                                  type="button"
                                  onClick={handleAutoFillEditSlots}
                                  className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline flex items-center gap-1"
                                >
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  <span>Auto-fill Consecutive</span>
                                </button>
                              )}
                            </div>

                            <div className={`grid gap-2 ${editMemberCount === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                              {Array.from({ length: editMemberCount }).map((_, slotIdx) => {
                                const selectedVal = editBaseNames[slotIdx] || students[slotIdx % students.length]?.name || '';
                                return (
                                  <div key={`edit_slot_${slotIdx}`} className="p-2 rounded-lg bg-[#0c182c] border border-[#1d365a] space-y-1">
                                    <label className="block text-[9px] font-black uppercase text-slate-300 flex items-center justify-between">
                                      <span>{slotIdx === 0 ? '⭐ Slot 1 (Starting Lead)' : `Slot ${slotIdx + 1} (Team Member)`}</span>
                                      <span className="font-mono text-amber-400">#{slotIdx + 1}</span>
                                    </label>
                                    <select
                                      value={selectedVal}
                                      onChange={(e) => handleUpdateEditBaseName(slotIdx, e.target.value)}
                                      className="w-full px-2 py-1.5 rounded-lg bg-[#081222] border border-[#203a63] focus:border-amber-400 text-slate-100 text-xs font-bold focus:outline-none"
                                    >
                                      {students.map((s, sIndex) => {
                                        const num = `#${String(s.rollNo ?? (sIndex + 1)).padStart(2, '0')}`;
                                        return (
                                          <option key={s.id} value={s.name}>
                                            {num} - {s.name}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEditedCycle(duty.id)}
                              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Changes</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCycleId(null)}
                              className="px-3.5 py-2 rounded-xl bg-[#142742] hover:bg-[#1a3459] text-slate-300 font-bold text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* QUICK CONTROLS: ONE-CLICK DIRECTION TOGGLE & STARTING RESIDENT SELECTOR */
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[#091629] border border-[#182f52] text-xs">
                          {/* Direction toggle button */}
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400 font-semibold">Direction:</span>
                            <button
                              type="button"
                              onClick={() => handleToggleCycleDirection(duty)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 border ${
                                duty.direction === 'forward'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                              }`}
                              title="Click to toggle between Forward and Reverse rotation"
                            >
                              <span>{duty.direction === 'forward' ? 'Forward ↗ (Next Person)' : 'Reverse ↙ (Previous Person)'}</span>
                              <span className="text-[10px] text-slate-400 underline">(Click to flip)</span>
                            </button>
                          </div>

                          {/* Starting Resident Dropdown & Multi-Partner Badges */}
                          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                            <span className="text-[11px] text-slate-400 font-semibold shrink-0">Starts with:</span>
                            <select
                              value={duty.baseNames[0] || ''}
                              onChange={(e) => handleChangeCycleStartStudent(duty, e.target.value)}
                              className="px-2.5 py-1 rounded-lg bg-[#0c1a30] border border-[#203a63] focus:border-amber-400 text-amber-300 text-xs font-bold focus:outline-none"
                              title="Change which resident starts this cycle"
                            >
                              {students.map((s, sIndex) => {
                                const num = `#${String(s.rollNo ?? (sIndex + 1)).padStart(2, '0')}`;
                                return (
                                  <option key={s.id} value={s.name}>
                                    {num} - {s.name}
                                  </option>
                                );
                              })}
                            </select>

                            {duty.memberCount > 1 && duty.baseNames.length > 1 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[10px] text-slate-400 font-bold">+</span>
                                {duty.baseNames.slice(1).map((pName, pIdx) => {
                                  const sObj = students.find(s => s.name.toLowerCase() === pName.toLowerCase());
                                  const resNum = sObj ? `#${String(sObj.rollNo ?? '').padStart(2, '0')}` : '';
                                  return (
                                    <span
                                      key={`${duty.id}_partner_${pIdx}`}
                                      className="px-2 py-0.5 rounded bg-[#0b172a] border border-[#1e3b63] text-amber-300 text-[10px] font-bold"
                                      title={`Partner #${pIdx + 2} on Day 1`}
                                    >
                                      {resNum ? `${resNum} ` : ''}{pName}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* IN WHICH CYCLE WHICH ORDER STUDENTS GO: LIVE VISUAL SEQUENCE */}
                      <div className="p-3.5 rounded-xl bg-[#06101f] border border-[#152742] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                            <ArrowRight className="w-3 h-3 text-amber-400" />
                            <span>Which Order Students Go in this Cycle ({cycleStudentOrder.length} Residents):</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Tap any student to start cycle from them
                          </span>
                        </div>

                        {/* Interactive sequence flow ribbon */}
                        <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 scrollbar-thin">
                          {cycleStudentOrder.map((studentName, sIdx) => {
                            const isStarting = duty.baseNames[0] === studentName;
                            const sObj = students.find((s) => s.name.toLowerCase() === studentName.toLowerCase());
                            const resNo = sObj ? `#${String(sObj.rollNo ?? (students.indexOf(sObj) + 1)).padStart(2, '0')}` : '';

                            return (
                              <button
                                key={`${duty.id}_seq_${studentName}_${sIdx}`}
                                type="button"
                                onClick={() => handleChangeCycleStartStudent(duty, studentName)}
                                className={`group shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 text-left active:scale-95 ${
                                  isStarting
                                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20 font-black'
                                    : 'bg-[#0d1d33] hover:bg-[#152e52] text-slate-200 border-[#1c365b] hover:border-amber-400/50'
                                }`}
                                title={`Turn #${sIdx + 1}: ${studentName} (Resident ${resNo})${isStarting ? ' (Starts on Day 1)' : ' (Click to make Starting Resident)'}`}
                              >
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-black ${
                                  isStarting ? 'bg-black/25 text-slate-950' : 'bg-[#091526] text-amber-300 border border-amber-400/30'
                                }`}>
                                  {resNo || `#${sIdx + 1}`}
                                </span>
                                <span>{studentName}</span>
                                {isStarting && (
                                  <Star className="w-3 h-3 fill-slate-950 text-slate-950 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* REPEAT PENALTIES TAB: WITH N NUMBER CREATOR */}
          {activeTab === 'penalties' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#091526] border border-[#1e3a63] text-xs sm:text-sm text-slate-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Repeat Rule (Case Two):</strong> If someone makes a mistake, assign them an $N$-day repeat penalty.
                  They will repeat their duty for $N$ consecutive days, pushing subsequent turns back.
                </span>
              </div>

              {/* Add New Repeat Penalty Form */}
              <form onSubmit={handleAddPenaltySubmit} className="p-4 sm:p-5 rounded-xl bg-[#081324] border-2 border-amber-500/30 space-y-4">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm uppercase tracking-wider">
                  <Plus className="w-4 h-4" />
                  <span>Assign New Repeat Penalty (Any N Days)</span>
                </div>

                {penaltySuccessMsg && (
                  <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>{penaltySuccessMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Select Student */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Student Name:
                    </label>
                    <select
                      value={penStudent}
                      onChange={(e) => setPenStudent(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0c182c] border border-[#1d365a] text-slate-100 text-sm font-semibold focus:outline-none focus:border-amber-400"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Duty */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Duty to Repeat:
                    </label>
                    <select
                      value={penDuty}
                      onChange={(e) => setPenDuty(e.target.value as DutyId)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0c182c] border border-[#1d365a] text-slate-100 text-sm font-semibold focus:outline-none focus:border-amber-400"
                    >
                      {DUTY_DEFINITIONS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Number of Days N */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Repeat Times (N):
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPenTimes((p) => Math.max(p - 1, 1))}
                        className="w-9 h-9 rounded-lg bg-[#11233c] hover:bg-[#183256] text-white flex items-center justify-center font-bold border border-[#203c66]"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={penTimes}
                        onChange={(e) => setPenTimes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="flex-1 h-9 text-center font-mono font-bold text-amber-300 bg-[#0c182c] border border-amber-400/50 rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setPenTimes((p) => p + 1)}
                        className="w-9 h-9 rounded-lg bg-[#11233c] hover:bg-[#183256] text-white flex items-center justify-center font-bold border border-[#203c66]"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="py-2 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm transition-all shadow-md active:scale-95"
                  >
                    Apply Repeat Penalty
                  </button>
                </div>
              </form>

              {/* Active Penalties List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                    Active Penalties ({penalties.filter((p) => p.active).length})
                  </h4>
                  {penalties.length > 0 && onResetAdminActions && (
                    <button
                      type="button"
                      onClick={onResetAdminActions}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/50 text-[11px] font-bold transition-all shadow-sm active:scale-95"
                    >
                      <RotateCcw className="w-3 h-3 text-rose-400" />
                      <span>Reset All Accidental Repeats</span>
                    </button>
                  )}
                </div>

                {penalties.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs bg-[#081222] rounded-xl border border-[#162740]">
                    No repeat penalties currently active.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {penalties.map((penalty) => (
                      <div
                        key={penalty.id}
                        className="p-4 rounded-xl bg-[#081222] border-2 border-amber-500/30 flex items-center justify-between gap-3 shadow-sm"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-white text-base font-bold">{penalty.studentName}</strong>
                            <span className="text-xs text-amber-300 font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40">
                              {getDutyTitle(penalty.dutyId)}
                            </span>
                            <span className="text-xs text-rose-300 font-bold px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/30">
                              {penalty.repeatCount}x Repeats
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            Started on date: <span className="font-mono text-slate-300">{penalty.createdAtDate}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => onClearPenalty(penalty.id)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-700/50 transition-colors flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Clear</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECURITY / CHANGE PASSWORD TAB */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
              <div className="p-3.5 rounded-xl bg-[#091526] border border-[#1e3a63] text-xs text-slate-300 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Update administrator password. Enter current password to set a new password.</span>
                </div>
                {isPasswordSet && onResetPasswordToDefault && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Reset the admin password back to initial default?')) {
                        onResetPasswordToDefault();
                        setOldPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setPwdFeedback({ type: 'success', text: 'Password reset back to initial default!' });
                      }
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline shrink-0 font-medium"
                  >
                    Reset to default
                  </button>
                )}
              </div>

              {pwdFeedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    pwdFeedback.type === 'success'
                      ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                  }`}
                >
                  {pwdFeedback.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  <span>{pwdFeedback.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#071120] border border-[#1e385c] focus:border-amber-400 focus:outline-none text-slate-100 text-sm font-mono shadow-inner pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    tabIndex={-1}
                    aria-label={showOldPassword ? 'Hide password' : 'Show password'}
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 4 characters)"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#071120] border border-[#1e385c] focus:border-amber-400 focus:outline-none text-slate-100 text-sm font-mono shadow-inner pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    tabIndex={-1}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#071120] border border-[#1e385c] focus:border-amber-400 focus:outline-none text-slate-100 text-sm font-mono shadow-inner pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingPwd || !oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
                className="py-3 px-6 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm transition-all shadow-md active:scale-95 disabled:opacity-60"
              >
                {isUpdatingPwd ? 'Updating...' : 'Update Admin Password'}
              </button>
            </form>
          )}

          {/* BACKUP & RESET TAB */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-extrabold text-white mb-1">Export / Backup Roster</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Download or copy your complete duty assignments, student roster, and repeat history as JSON.
                </p>
                <button
                  onClick={onExportData}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#112239] hover:bg-[#193254] text-slate-200 border border-[#203c66] text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Download Backup JSON</span>
                </button>
              </div>

              <div className="pt-4 border-t border-[#152740]">
                <h4 className="text-sm font-extrabold text-white mb-1">Import Roster</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Paste previously saved JSON data to restore:
                </p>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={3}
                  placeholder="Paste JSON here..."
                  className="w-full p-3 rounded-xl bg-[#071120] border border-[#1c3457] text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400 mb-2 shadow-inner"
                />
                {importStatus && (
                  <div className="text-xs text-amber-400 mb-2 font-bold">{importStatus}</div>
                )}
                <button
                  onClick={() => {
                    const success = onImportData(importText);
                    setImportStatus(success ? 'Roster successfully imported!' : 'Invalid JSON file.');
                    if (success) setImportText('');
                  }}
                  disabled={!importText.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#112239] hover:bg-[#193254] text-slate-200 border border-[#203c66] text-xs font-bold transition-all disabled:opacity-50 active:scale-95"
                >
                  <Upload className="w-4 h-4 text-slate-300" />
                  <span>Restore from JSON</span>
                </button>
              </div>

              <div className="pt-4 border-t border-[#152740]">
                <h4 className="text-sm font-extrabold text-rose-400 mb-1">Reset to Defaults</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Reset all student leaves, manual overrides, and repeat penalties back to the starting cycle baseline.
                </p>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to reset the roster to default starting cycle?')) {
                      onResetToDefaults();
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-700/50 text-xs font-bold transition-all active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Roster to Baseline</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permanent Student Removal Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-[#0c182c] border-2 border-rose-500/70 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400 pb-2 border-b border-[#1b2b45]">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <h4 className="font-extrabold text-base text-white">Remove Student Permanently?</h4>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-rose-300 font-bold">{studentToDelete.name}</strong> from the hostel roster?
              They will no longer be assigned duties in future cycles.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onRemoveStudent(studentToDelete.id);
                  setStudentToDelete(null);
                }}
                className="px-4 py-2 text-xs sm:text-sm font-extrabold rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-lg shadow-rose-900/40"
              >
                Remove Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Cycle Removal Confirmation Modal */}
      {cycleToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-[#0c182c] border-2 border-rose-500/70 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400 pb-2 border-b border-[#1b2b45]">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <h4 className="font-extrabold text-base text-white">Delete Turn Cycle?</h4>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Are you sure you want to delete the <strong className="text-rose-300 font-bold">{cycleToDelete.title}</strong> turn cycle?
              This will remove it from daily allocations and roster displays.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCycleToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteCycle(cycleToDelete)}
                className="px-4 py-2 text-xs sm:text-sm font-extrabold rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-lg shadow-rose-900/40"
              >
                Delete Cycle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
