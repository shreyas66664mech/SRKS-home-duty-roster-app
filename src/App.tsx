import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { DateNavigator } from './components/DateNavigator';
import { DutyCard } from './components/DutyCard';
import { HostelLoginModal } from './components/HostelLoginModal';
import { AdminSettingsModal } from './components/AdminSettingsModal';
import { StudentScheduleFinder } from './components/StudentScheduleFinder';
import { ShareRosterModal } from './components/ShareRosterModal';
import { MarkDoneRequiredModal } from './components/MarkDoneRequiredModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { usePWAInstall } from './hooks/usePWAInstall';

import { DutyId, AppRosterData, RepeatPenalty, Student, DutyDefinition } from './types/roster';
import {
  DUTY_DEFINITIONS,
  BASELINE_DATE,
  calculateRosterForDate,
  getSystemTodayDate,
} from './utils/cycleEngine';
import {
  loadRosterData,
  saveRosterData,
  getDefaultRosterData,
  getDefaultSyncRosterData,
  sanitizeRosterData,
  hashPassword,
  exportRosterJSON,
  importRosterJSON,
  fetchServerRoster,
  pushServerRoster,
  readUrlSnapshot,
  generateShareUrl,
  getStoredStudentId,
  setStoredStudentId,
  DEFAULT_ADMIN_HASH,
  DEFAULT_STUDENT_HASH,
  verifyStudentPassword,
} from './utils/storage';
import {
  Sparkles,
  Calendar,
  Info,
  ShieldCheck,
  Users,
  RefreshCw,
  Key,
  Database,
  UserCheck,
  RotateCcw,
  CheckCheck,
  UserPlus,
  ArrowUpDown,
  Link,
  Smartphone,
  Download,
  MessageSquare,
} from 'lucide-react';

export default function App() {
  // Always initialize synchronously so the UI is visible on frame 0 with zero blank screen
  const [rosterData, setRosterData] = useState<AppRosterData>(() => {
    return loadRosterData() || getDefaultSyncRosterData();
  });
  
  // Date state: defaults to today's current date
  const [currentDate, setCurrentDate] = useState<string>(() => getSystemTodayDate());

  // Admin authentication state (in-memory for current session)
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Resident / Student session (persisted on user's phone)
  const [currentStudent, setCurrentStudent] = useState<Student | null>(() => {
    const storedId = getStoredStudentId();
    const initial = loadRosterData() || getDefaultSyncRosterData();
    if (storedId && initial?.students) {
      return initial.students.find((s) => s.id === storedId) || null;
    }
    return null;
  });

  // Android PWA Installation state & hook
  const { isInstallable, isInstalled, isAndroid, isIOS, install: installPWA } = usePWAInstall();
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);

  // Modal open states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginModalTab, setLoginModalTab] = useState<'student' | 'admin' | 'share'>('student');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<'students' | 'cycles' | 'penalties' | 'security' | 'backup'>('students');
  const [isTurnFinderOpen, setIsTurnFinderOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isMarkDoneModalOpen, setIsMarkDoneModalOpen] = useState<boolean>(false);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSelectStudent = (student: Student) => {
    setCurrentStudent(student);
    setStoredStudentId(student.id);
    showToast(`Welcome, ${student.name}! Your duties are now highlighted.`);
  };

  const handleLogoutStudent = () => {
    setCurrentStudent(null);
    setStoredStudentId(null);
    showToast('Logged out of student profile.');
  };

  const handleOpenLoginModal = (tab: 'student' | 'admin' | 'share' = 'student') => {
    setLoginModalTab(tab);
    setIsLoginModalOpen(true);
  };

  // Initialize data on mount: URL snapshot > Server API > LocalStorage > Defaults
  useEffect(() => {
    async function initData() {
      // 1. Check if opened via a snapshot share link
      const urlSnapshot = readUrlSnapshot();
      if (urlSnapshot && urlSnapshot.students && urlSnapshot.students.length > 0) {
        const merged = sanitizeRosterData(urlSnapshot);
        setRosterData(merged);
        saveRosterData(merged);
        pushServerRoster(merged);
        showToast('Loaded shared roster snapshot!');
        // Clean URL hash without reload
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }

      // 2. Try fetching central server roster
      const serverData = await fetchServerRoster();
      if (serverData && serverData.students && serverData.students.length >= 3) {
        const sanitized = sanitizeRosterData(serverData);
        setRosterData(sanitized);
        saveRosterData(sanitized);
        return;
      }

      // 3. Fallback to LocalStorage
      const stored = loadRosterData();
      if (stored && stored.students && stored.students.length >= 3) {
        setRosterData(stored);
        pushServerRoster(stored);
      } else {
        const defaults = getDefaultSyncRosterData();
        saveRosterData(defaults);
        setRosterData(defaults);
        pushServerRoster(defaults);
      }
    }
    initData();
  }, []);

  // ZERO-LATENCY SSE STREAM: Whenever admin changes anything, all phones update immediately!
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isMounted = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const setupLiveSSE = () => {
      try {
        if (typeof EventSource === 'undefined') return;
        eventSource = new EventSource('/api/roster/live');

        eventSource.onopen = () => {
          if (isMounted) setIsLiveConnected(true);
        };

        eventSource.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const payload = JSON.parse(event.data);
            if (payload && payload.data && Array.isArray(payload.data.students) && payload.data.students.length >= 3) {
              const remote = sanitizeRosterData(payload.data);
              setRosterData((current) => {
                if (!current) {
                  saveRosterData(remote);
                  return remote;
                }
                if ((remote.lastUpdated || 0) > (current.lastUpdated || 0)) {
                  saveRosterData(remote);
                  showToast('⚡ Live update received from Admin!');
                  return remote;
                }
                return current;
              });
            }
          } catch {
            // ignore
          }
        };

        eventSource.onerror = () => {
          if (isMounted) setIsLiveConnected(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            if (isMounted) setupLiveSSE();
          }, 3000);
        };
      } catch {
        if (isMounted) setIsLiveConnected(false);
      }
    };

    setupLiveSSE();

    const syncWithServer = async () => {
      try {
        const remote = await fetchServerRoster();
        if (!isMounted || !remote || !remote.students) return;

        setRosterData((current) => {
          if (!current) return remote;
          if ((remote.lastUpdated || 0) > (current.lastUpdated || 0)) {
            saveRosterData(remote);
            return remote;
          }
          return current;
        });
      } catch (e) {
        // Silent network retry
      }
    };

    // Polling interval
    const intervalId = setInterval(syncWithServer, 3500);

    // Sync immediately when student opens or returns to tab on mobile
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncWithServer();
      }
    };

    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      clearInterval(intervalId);
      window.removeEventListener('focus', onVisibilityOrFocus);
      window.removeEventListener('visibilitychange', onVisibilityOrFocus);
    };
  }, []);

  // Sync state update to local storage AND broadcast to server for all phones
  const updateData = (newData: AppRosterData) => {
    const updated: AppRosterData = {
      ...newData,
      lastUpdated: Date.now(),
    };
    setRosterData(updated);
    saveRosterData(updated);
    pushServerRoster(updated);
  };

  const activeDuties = useMemo(() => {
    return (rosterData?.duties && rosterData.duties.length > 0)
      ? rosterData.duties
      : DUTY_DEFINITIONS;
  }, [rosterData?.duties]);

  // Calculate duties for currentDate
  const currentRoster = useMemo(() => {
    if (!rosterData) return null;
    return calculateRosterForDate(
      currentDate,
      rosterData.students,
      rosterData.penalties,
      rosterData.overrides,
      rosterData.completedDuties,
      rosterData.baselineDate,
      activeDuties
    );
  }, [rosterData, currentDate, activeDuties]);

  // Date Navigation Helpers
  // Selecting past dates is allowed freely without mark done; future dates require mark done
  const handleDateChange = (newDateStr: string) => {
    if (newDateStr <= currentDate) {
      setCurrentDate(newDateStr);
      return;
    }

    // Advancing forward requires current day's duties to be marked done
    const currentCompleted = rosterData?.completedDuties[currentDate] || [];
    const isAllDone =
      activeDuties.length > 0 &&
      activeDuties.every((d) => currentCompleted.includes(d.id));

    if (!isAllDone) {
      setIsMarkDoneModalOpen(true);
      return;
    }

    setCurrentDate(newDateStr);
  };

  // Previous Day: ALWAYS allowed freely without requiring any mark done
  const handlePrevDay = () => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() - 1);
    setCurrentDate(date.toISOString().split('T')[0]);
  };

  // Next Day: STRICTLY requires duties on the current date to be marked done to advance rotation
  const handleNextDay = () => {
    const currentCompleted = rosterData?.completedDuties[currentDate] || [];
    const isAllDone =
      DUTY_DEFINITIONS.length > 0 &&
      DUTY_DEFINITIONS.every((d) => currentCompleted.includes(d.id));

    if (!isAllDone) {
      setIsMarkDoneModalOpen(true);
      return;
    }

    const [y, m, d] = currentDate.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + 1);
    setCurrentDate(date.toISOString().split('T')[0]);
  };

  // Today Button: ALWAYS jumps directly to the current actual date!
  const handleToday = () => {
    const todayStr = getSystemTodayDate();
    setCurrentDate(todayStr);
    showToast(`Jumped to Today: ${todayStr}`);
  };

  // Quick Action from Mark Done Required Modal: Admin marks all 6 duties done and advances immediately
  const handleMarkAllDoneAndAdvance = () => {
    if (!rosterData) return;
    const allDutyIds = DUTY_DEFINITIONS.map((d) => d.id);

    // Advance active penalties for this day
    const updatedPenalties = rosterData.penalties.map((p) => {
      if (p.active && p.completedCount < p.repeatCount) {
        const newCompleted = p.completedCount + 1;
        return {
          ...p,
          completedCount: newCompleted,
          active: newCompleted < p.repeatCount,
        };
      }
      return p;
    });

    const updated: AppRosterData = {
      ...rosterData,
      penalties: updatedPenalties,
      completedDuties: {
        ...rosterData.completedDuties,
        [currentDate]: allDutyIds,
      },
    };
    updateData(updated);

    // Advance to next day
    const [y, m, d] = currentDate.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + 1);
    const nextDateStr = date.toISOString().split('T')[0];

    setCurrentDate(nextDateStr);
    setIsMarkDoneModalOpen(false);
    showToast(`Marked all duties DONE for ${currentDate}! Moved to ${nextDateStr}.`);
  };

  // Admin Password Verification (Initial default password before admin changes it)
  const handleVerifyPassword = async (enteredPassword: string): Promise<boolean> => {
    if (!rosterData) return false;
    const cleanPass = enteredPassword.trim();
    const hash = await hashPassword(cleanPass);

    // Initial default admin password check (accepts either admin123 or admin13 if not custom set)
    const isDefaultAdmin = (cleanPass === 'admin123' || cleanPass === 'admin13') && (
      !rosterData.isPasswordSet ||
      rosterData.adminPasswordHash === DEFAULT_ADMIN_HASH ||
      rosterData.adminPasswordHash === '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa82280f1a7ca47dd'
    );

    if (hash === rosterData.adminPasswordHash || isDefaultAdmin) {
      setIsAdmin(true);
      showToast('Admin mode unlocked! Management tools are now active.');
      return true;
    }
    return false;
  };

  // Change password inside settings
  const handleChangePassword = async (
    oldPass: string,
    newPass: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!rosterData) return { success: false, message: 'System error' };
    const cleanOld = oldPass.trim();
    const cleanNew = newPass.trim();

    if (cleanNew.length < 4) {
      return { success: false, message: 'New password must be at least 4 characters long.' };
    }

    const oldHash = await hashPassword(cleanOld);
    const isOldMatch = oldHash === rosterData.adminPasswordHash || (
      (cleanOld === 'admin123' || cleanOld === 'admin13') && (
        !rosterData.isPasswordSet ||
        rosterData.adminPasswordHash === DEFAULT_ADMIN_HASH ||
        rosterData.adminPasswordHash === '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa82280f1a7ca47dd'
      )
    );

    if (!isOldMatch) {
      return { success: false, message: 'Current password does not match.' };
    }

    const newHash = await hashPassword(cleanNew);
    const updated: AppRosterData = {
      ...rosterData,
      adminPasswordHash: newHash,
      isPasswordSet: true,
    };
    updateData(updated);
    showToast('Admin password changed successfully!');
    return { success: true, message: 'Password updated successfully!' };
  };

  // Reset admin password back to initial default: admin123
  const handleResetPasswordToDefault = () => {
    if (!rosterData) return;
    const updated: AppRosterData = {
      ...rosterData,
      adminPasswordHash: DEFAULT_ADMIN_HASH,
      isPasswordSet: false,
    };
    updateData(updated);
    showToast('Admin password reset to initial default: admin123');
  };

  // Student password verification (initial: 12345)
  const handleVerifyStudentPassword = async (
    student: Student,
    passwordAttempt: string
  ): Promise<boolean> => {
    return verifyStudentPassword(student, passwordAttempt);
  };

  // Student change password
  const handleChangeStudentPassword = async (
    studentId: string,
    currentPass: string,
    newPass: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!rosterData) return { success: false, error: 'System error: roster data not loaded' };
    const target = rosterData.students.find((s) => s.id === studentId);
    if (!target) return { success: false, error: 'Student not found in roster.' };

    const isCurrentValid = await verifyStudentPassword(target, currentPass);
    if (!isCurrentValid) {
      return { success: false, error: 'Current password does not match.' };
    }

    if (newPass.length < 4) {
      return { success: false, error: 'New password must be at least 4 characters long.' };
    }

    const newHash = await hashPassword(newPass.trim());
    const updatedStudents = rosterData.students.map((s) =>
      s.id === studentId ? { ...s, passwordHash: newHash } : s
    );

    updateData({
      ...rosterData,
      students: updatedStudents,
    });

    if (currentStudent && currentStudent.id === studentId) {
      setCurrentStudent({ ...currentStudent, passwordHash: newHash });
    }

    showToast(`Password successfully updated for ${target.name}!`);
    return { success: true };
  };

  // Admin reset student password to initial default 12345
  const handleResetStudentPassword = (studentId: string) => {
    if (!rosterData) return;
    const target = rosterData.students.find((s) => s.id === studentId);
    if (!target) return;

    const updatedStudents = rosterData.students.map((s) =>
      s.id === studentId ? { ...s, passwordHash: DEFAULT_STUDENT_HASH } : s
    );

    updateData({
      ...rosterData,
      students: updatedStudents,
    });

    if (currentStudent && currentStudent.id === studentId) {
      setCurrentStudent({ ...currentStudent, passwordHash: DEFAULT_STUDENT_HASH });
    }

    showToast(`Reset ${target.name}'s password to 12345!`);
  };

  // Admin Duty Actions: Mark individual duty done or undone
  const handleMarkDone = (dutyIdStr: string, isDone: boolean) => {
    if (!rosterData) return;
    const dutyId = dutyIdStr as DutyId;
    const currentCompleted = rosterData.completedDuties[currentDate] || [];
    
    let updatedCompleted: DutyId[];
    if (isDone) {
      updatedCompleted = Array.from(new Set([...currentCompleted, dutyId]));
    } else {
      updatedCompleted = currentCompleted.filter(id => id !== dutyId);
    }

    // Update penalty completedCount if this duty has an active penalty
    let updatedPenalties = rosterData.penalties;
    if (isDone) {
      updatedPenalties = rosterData.penalties.map(p => {
        if (p.active && p.dutyId === dutyId && p.completedCount < p.repeatCount) {
          const newCompleted = p.completedCount + 1;
          return {
            ...p,
            completedCount: newCompleted,
            active: newCompleted < p.repeatCount,
          };
        }
        return p;
      });
    } else {
      updatedPenalties = rosterData.penalties.map(p => {
        if (p.dutyId === dutyId && p.completedCount > 0) {
          const newCompleted = p.completedCount - 1;
          return {
            ...p,
            completedCount: newCompleted,
            active: true,
          };
        }
        return p;
      });
    }

    const updated: AppRosterData = {
      ...rosterData,
      penalties: updatedPenalties,
      completedDuties: {
        ...rosterData.completedDuties,
        [currentDate]: updatedCompleted,
      },
    };
    updateData(updated);
    showToast(isDone ? 'Duty marked DONE! Cycle advances next day.' : 'Duty marked incomplete.');
  };

  // Mark all duties done for the current date at once
  const handleMarkAllDone = () => {
    if (!rosterData) return;
    const allDutyIds = activeDuties.map(d => d.id);
    const currentCompleted = rosterData.completedDuties[currentDate] || [];
    const allAlreadyDone = allDutyIds.every(id => currentCompleted.includes(id));

    let updatedCompleted: DutyId[];
    let updatedPenalties = rosterData.penalties;

    if (allAlreadyDone) {
      // Toggle off
      updatedCompleted = [];
      showToast('All duties marked incomplete for this date');
    } else {
      updatedCompleted = allDutyIds;
      // Advance active penalties for this day
      updatedPenalties = rosterData.penalties.map(p => {
        if (p.active && p.completedCount < p.repeatCount) {
          const newCompleted = p.completedCount + 1;
          return {
            ...p,
            completedCount: newCompleted,
            active: newCompleted < p.repeatCount,
          };
        }
        return p;
      });
      showToast(`All ${activeDuties.length} duties marked DONE! Cycle will advance for next day.`);
    }

    updateData({
      ...rosterData,
      penalties: updatedPenalties,
      completedDuties: {
        ...rosterData.completedDuties,
        [currentDate]: updatedCompleted,
      },
    });
  };

  // Case 1: Student went home -> skip student
  const handleSkipStudent = (dutyIdStr: string, studentName: string) => {
    if (!rosterData) return;
    const dutyId = dutyIdStr as DutyId;
    const dutyDef = DUTY_DEFINITIONS.find(d => d.id === dutyId);
    if (!dutyDef) return;

    // Pick next available student in cycle order
    const pool = rosterData.students.filter(s => !s.isAway && s.name !== studentName);
    if (pool.length === 0) return;

    // Find next student
    const currentIndex = rosterData.students.findIndex(s => s.name === studentName);
    const nextIdx = (currentIndex + 1) % rosterData.students.length;
    const nextStudent = rosterData.students[nextIdx].name;

    let newAssigned: string[];
    if (dutyDef.memberCount === 1) {
      newAssigned = [nextStudent];
    } else {
      const existing = currentRoster?.[dutyId]?.assignedStudents || [];
      newAssigned = [existing[0] === studentName ? nextStudent : existing[0], existing[1] || nextStudent];
    }

    const dayOverrides = rosterData.overrides[currentDate] || {};
    const updatedOverrides = {
      ...rosterData.overrides,
      [currentDate]: {
        ...dayOverrides,
        [dutyId]: {
          assignedStudents: newAssigned,
          isSkipped: true,
          customNotes: `Skipped ${studentName} (Went home)`,
        },
      },
    };

    updateData({
      ...rosterData,
      overrides: updatedOverrides,
    });
    showToast(`Skipped ${studentName}. Replaced with ${nextStudent}`);
  };

  // Case 2: Student made mistake -> apply repeat penalty for N times
  const handleApplyRepeatPenalty = (
    dutyIdStr: string,
    studentName: string,
    repeatTimes: number
  ) => {
    if (!rosterData) return;
    const dutyId = dutyIdStr as DutyId;

    const newPenalty: RepeatPenalty = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      studentName,
      dutyId,
      repeatCount: repeatTimes,
      completedCount: 0,
      createdAtDate: currentDate,
      active: true,
    };

    updateData({
      ...rosterData,
      penalties: [newPenalty, ...rosterData.penalties],
    });
    showToast(`Repeat penalty applied: ${studentName} repeats for ${repeatTimes} days!`);
  };

  // Cancel single accidental repeat penalty on a duty
  const handleCancelRepeat = (dutyIdStr: string, studentName: string) => {
    if (!rosterData) return;
    const dutyId = dutyIdStr as DutyId;

    // Filter out penalty for this duty and student
    const updatedPenalties = rosterData.penalties.filter(
      p => !(p.dutyId === dutyId && p.studentName === studentName)
    );

    // Also remove any day override for this duty on currentDate
    const dayOverrides = { ...(rosterData.overrides[currentDate] || {}) };
    delete dayOverrides[dutyId];

    updateData({
      ...rosterData,
      penalties: updatedPenalties,
      overrides: {
        ...rosterData.overrides,
        [currentDate]: dayOverrides,
      },
    });

    showToast(`Accidental repeat for ${studentName} cancelled. Normal cycle restored!`);
  };

  // Reset all accidental admin actions (penalties, overrides, completions) in one click
  const handleResetAdminActions = () => {
    if (!rosterData) return;
    const confirmed = window.confirm(
      'Reset all accidental repeat penalties and daily overrides back to the clean automatic cycle? (Admin password remains unchanged)'
    );
    if (!confirmed) return;

    updateData({
      ...rosterData,
      penalties: [],
      overrides: {},
      completedDuties: {},
    });
    showToast('All repeat penalties and overrides reset to clean automatic cycle!');
  };

  // Manual Swap / Reassignment
  const handleReassign = (dutyIdStr: string, newStudents: string[]) => {
    if (!rosterData) return;
    const dutyId = dutyIdStr as DutyId;

    const dayOverrides = rosterData.overrides[currentDate] || {};
    const updatedOverrides = {
      ...rosterData.overrides,
      [currentDate]: {
        ...dayOverrides,
        [dutyId]: {
          assignedStudents: newStudents,
          customNotes: 'Manual override by Admin',
        },
      },
    };

    updateData({
      ...rosterData,
      overrides: updatedOverrides,
    });
    showToast('Duty reassigned successfully');
  };

  // Toggle student home/away status
  const handleToggleStudentAway = (studentId: string) => {
    if (!rosterData) return;
    const updatedStudents = rosterData.students.map(s => {
      if (s.id === studentId) {
        return { ...s, isAway: !s.isAway };
      }
      return s;
    });
    updateData({
      ...rosterData,
      students: updatedStudents,
    });
    const targetStudent = rosterData.students.find(s => s.id === studentId);
    if (targetStudent) {
      showToast(
        !targetStudent.isAway
          ? `${targetStudent.name} marked as Went Home (will be skipped)`
          : `${targetStudent.name} marked as Present`
      );
    }
  };

  // Add new student to the cycle roster with optional resident number #N
  const handleAddStudent = (name: string, rollNo?: number): boolean => {
    if (!rosterData) return false;
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (rosterData.students.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Resident "${trimmed}" is already in the roster!`);
      return false;
    }
    const nextRollNo = rollNo && rollNo > 0 ? rollNo : rosterData.students.length + 1;
    const newStudent: Student = {
      id: Date.now().toString(),
      name: trimmed,
      rollNo: nextRollNo,
      isAway: false,
    };
    const updated = {
      ...rosterData,
      students: [...rosterData.students, newStudent],
    };
    updateData(updated);
    showToast(`Added Resident #${nextRollNo} ${trimmed} to cycle!`);
    return true;
  };

  // Update existing student details (name, rollNo)
  const handleUpdateStudent = (studentId: string, updates: Partial<Student>) => {
    if (!rosterData) return;
    const updatedStudents = rosterData.students.map(s => {
      if (s.id === studentId) {
        return { ...s, ...updates };
      }
      return s;
    });
    updateData({
      ...rosterData,
      students: updatedStudents,
    });
    showToast('Resident details updated successfully.');
  };

  // Bulk add multiple residents (any N residents)
  const handleBulkAddStudents = (names: string[]): number => {
    if (!rosterData || names.length === 0) return 0;
    const existingNames = new Set(rosterData.students.map(s => s.name.toLowerCase()));
    const validNames = names
      .map(n => n.trim())
      .filter(n => n.length > 0 && !existingNames.has(n.toLowerCase()));

    if (validNames.length === 0) {
      showToast('No new unique resident names to add.');
      return 0;
    }

    const startNum = rosterData.students.length + 1;
    const newStudents: Student[] = validNames.map((name, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      rollNo: startNum + i,
      isAway: false,
    }));

    const updated = {
      ...rosterData,
      students: [...rosterData.students, ...newStudents],
    };
    updateData(updated);
    showToast(`Added ${newStudents.length} residents (#${startNum} - #${startNum + newStudents.length - 1})!`);
    return newStudents.length;
  };

  // Remove student permanently from the cycle roster
  const handleRemoveStudent = (studentId: string) => {
    if (!rosterData) return;
    const target = rosterData.students.find(s => s.id === studentId);
    if (!target) return;
    const updatedStudents = rosterData.students.filter(s => s.id !== studentId);
    const updatedPenalties = rosterData.penalties.filter(p => p.studentName !== target.name);
    updateData({
      ...rosterData,
      students: updatedStudents,
      penalties: updatedPenalties,
    });
    showToast(`Permanently removed ${target.name} from the cycle roster.`);
  };

  // Arrange / reorder cycle list sequence
  const handleReorderStudents = (newStudents: Student[]) => {
    if (!rosterData) return;
    updateData({
      ...rosterData,
      students: newStudents,
    });
    showToast('Cycle rotation sequence arranged!');
  };

  // Turn Cycle Actions: Add, Edit, Remove, Reorder
  const handleAddDuty = (newDuty: Omit<DutyDefinition, 'id'>): boolean => {
    if (!rosterData) return false;
    const id = 'duty_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    const dutyDef: DutyDefinition = {
      id,
      title: newDuty.title.trim(),
      subtitle: newDuty.subtitle.trim() || 'Hostel duty',
      memberCount: newDuty.memberCount || 1,
      direction: newDuty.direction || 'forward',
      baseNames: newDuty.baseNames && newDuty.baseNames.length > 0 ? newDuty.baseNames : [rosterData.students[0]?.name || 'Shreyas'],
    };
    const currentDuties = (rosterData.duties && rosterData.duties.length > 0) ? rosterData.duties : DUTY_DEFINITIONS;
    const updated = {
      ...rosterData,
      duties: [...currentDuties, dutyDef],
    };
    updateData(updated);
    showToast(`Added new Turn Cycle: "${dutyDef.title}"!`);
    return true;
  };

  const handleUpdateDuty = (dutyId: string, updatedFields: Partial<DutyDefinition>): boolean => {
    if (!rosterData) return false;
    const currentDuties = (rosterData.duties && rosterData.duties.length > 0) ? rosterData.duties : DUTY_DEFINITIONS;
    const updatedDuties = currentDuties.map(d => {
      if (d.id === dutyId) {
        return { ...d, ...updatedFields };
      }
      return d;
    });
    updateData({
      ...rosterData,
      duties: updatedDuties,
    });
    showToast('Turn cycle updated successfully!');
    return true;
  };

  const handleRemoveDuty = (dutyId: string): boolean => {
    if (!rosterData) return false;
    const currentDuties = (rosterData.duties && rosterData.duties.length > 0) ? rosterData.duties : DUTY_DEFINITIONS;
    if (currentDuties.length <= 1) {
      showToast('Cannot delete the last remaining duty cycle.');
      return false;
    }
    const target = currentDuties.find(d => d.id === dutyId);
    const updatedDuties = currentDuties.filter(d => d.id !== dutyId);
    updateData({
      ...rosterData,
      duties: updatedDuties,
    });
    showToast(`Removed cycle: "${target?.title || dutyId}"`);
    return true;
  };

  const handleReorderDuties = (newDuties: DutyDefinition[]) => {
    if (!rosterData) return;
    updateData({
      ...rosterData,
      duties: newDuties,
    });
    showToast('Duty cycles order arranged!');
  };

  // Clear penalty
  const handleClearPenalty = (penaltyId: string) => {
    if (!rosterData) return;
    const updatedPenalties = rosterData.penalties.filter(p => p.id !== penaltyId);
    updateData({
      ...rosterData,
      penalties: updatedPenalties,
    });
    showToast('Repeat penalty dismissed');
  };

  // Export JSON
  const handleExportData = () => {
    if (!rosterData) return;
    const json = exportRosterJSON(rosterData);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hostel_roster_backup_${currentDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup file downloaded');
  };

  // Import JSON
  const handleImportData = (jsonString: string): boolean => {
    const imported = importRosterJSON(jsonString);
    if (imported) {
      setRosterData(imported);
      showToast('Roster successfully restored!');
      return true;
    }
    return false;
  };

  // Reset to Defaults
  const handleResetToDefaults = async () => {
    const defaults = await getDefaultRosterData();
    updateData(defaults);
    showToast('Roster reset to baseline cycle');
  };

  if (!rosterData || !currentRoster) {
    return (
      <div className="min-h-screen bg-[#080d19] flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading Hostel Duty Roster...</span>
        </div>
      </div>
    );
  }

  const allStudentNames = rosterData.students.map((s) => s.name);
  const isToday = currentDate === getSystemTodayDate();
  const awayCount = rosterData.students.filter((s) => s.isAway).length;
  const activePenaltiesCount = rosterData.penalties.filter((p) => p.active).length;
  const todayCompletedDuties = rosterData.completedDuties[currentDate] || [];
  const todayCompletedCount = todayCompletedDuties.length;
  const isAllCompletedToday =
    activeDuties.length > 0 &&
    activeDuties.every((d) => todayCompletedDuties.includes(d.id));

  // Personal resident duties calculation for this phone
  const myDutiesOnCurrentDate = useMemo(() => {
    if (!currentStudent || !currentRoster) return [];
    return Object.entries(currentRoster).filter(([_, status]) =>
      status.assignedStudents?.includes(currentStudent.name)
    );
  }, [currentRoster, currentStudent]);

  const myDutyTitles = useMemo(() => {
    return myDutiesOnCurrentDate
      .map(([dutyId]) => activeDuties.find((d) => d.id === dutyId)?.title)
      .filter(Boolean)
      .join(', ');
  }, [myDutiesOnCurrentDate, activeDuties]);

  // Handle WhatsApp Duty Alert specifically for this phone's user
  const handleSendDutyWhatsApp = (dutyTitles: string, dateStr: string) => {
    if (!currentStudent) return;
    const isTodayDate = dateStr === getSystemTodayDate();
    const appUrl = window.location.origin;
    const text = encodeURIComponent(
      `🔔 *Sri Ramakrishna Students' Home - Duty Alert*\n\n` +
      `👤 *Student*: ${currentStudent.name}\n` +
      `📅 *Date*: ${dateStr} ${isTodayDate ? '(TODAY)' : ''}\n` +
      `🎯 *Assigned Duty*: ${dutyTitles}\n\n` +
      `⏰ Please report on time and complete your duty properly.\n` +
      `🔗 Live Roster: ${appUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Handle Phone Push / Web Notification
  const handleRequestPhoneNotification = async (dutyTitles: string, dateStr: string) => {
    if (!currentStudent) return;
    const isTodayDate = dateStr === getSystemTodayDate();
    const timeLabel = isTodayDate ? 'today' : `on ${dateStr}`;

    if (!('Notification' in window)) {
      showToast(`Duty Alert: ${currentStudent.name}, you have ${dutyTitles} ${timeLabel}!`);
      return;
    }

    try {
      if (Notification.permission === 'granted') {
        new Notification(`SRKSH Duty Alert: ${dutyTitles}`, {
          body: `${currentStudent.name}, you are assigned to ${dutyTitles} ${timeLabel}. Please report on time!`,
          icon: '/assets/aistudio/Ramakrishna_Students_Home_Duty_Assigner_fb337d9c.png',
        });
        showToast('Phone notification sent! 🔔');
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(`SRKSH Duty Alert: ${dutyTitles}`, {
            body: `${currentStudent.name}, you are assigned to ${dutyTitles} ${timeLabel}. Please report on time!`,
            icon: '/assets/aistudio/Ramakrishna_Students_Home_Duty_Assigner_fb337d9c.png',
          });
          showToast('Notifications enabled! Alert sent to your phone. 🔔');
        } else {
          showToast(`Duty Alert: ${currentStudent.name}, you have ${dutyTitles} ${timeLabel}!`);
        }
      } else {
        showToast(`Duty Alert: ${currentStudent.name}, you have ${dutyTitles} ${timeLabel}!`);
      }
    } catch {
      showToast(`Duty Alert: ${currentStudent.name}, you have ${dutyTitles} ${timeLabel}!`);
    }
  };

  return (
    <div className="min-h-screen bg-[#080d19] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0f233f] border-2 border-amber-400 text-white text-xs sm:text-sm font-bold px-4 py-3 rounded-xl shadow-2xl shadow-black/80 flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-200">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        isAdmin={isAdmin}
        currentStudent={currentStudent}
        isInstalled={isInstalled}
        isLiveConnected={isLiveConnected}
        onOpenLogin={handleOpenLoginModal}
        onLogoutAdmin={() => {
          setIsAdmin(false);
          showToast('Logged out of Admin mode');
        }}
        onLogoutStudent={handleLogoutStudent}
        onOpenSettings={() => {
          setSettingsTab('students');
          setIsSettingsModalOpen(true);
        }}
        onOpenShare={() => setIsShareModalOpen(true)}
        onOpenTurnFinder={() => setIsTurnFinderOpen(true)}
        onOpenInstall={() => setIsInstallModalOpen(true)}
      />

      {/* Main Container - Mobile-first compact width */}
      <div role="main" className="flex-1 max-w-xl sm:max-w-2xl lg:max-w-4xl w-full mx-auto px-3 sm:px-4 pb-12">
        {/* Quick Resident Selector when no student is logged into this phone */}
        {!currentStudent && !isAdmin && (
          <div className="mt-3 mb-3 p-3 rounded-2xl bg-gradient-to-r from-[#0b1d33] via-[#091728] to-[#0b1d33] border border-amber-400/50 text-xs flex items-center justify-between gap-2.5 shadow-lg shadow-black/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl shrink-0">📱</span>
              <div className="min-w-0">
                <p className="font-extrabold text-white text-xs truncate">Whose phone is this?</p>
                <p className="text-[11px] text-slate-300 truncate">Sign in with password (initial: 12345) for personal alerts</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleOpenLoginModal('student')}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 shrink-0 flex items-center gap-1.5"
            >
              <span>Resident Login</span>
            </button>
          </div>
        )}

        {/* Personalized Resident Duty Alert Card (Only for this phone's user) */}
        {currentStudent && (
          <div
            className={`mt-3 mb-3 p-3.5 rounded-2xl border-2 transition-all shadow-lg ${
              myDutiesOnCurrentDate.length > 0
                ? 'bg-gradient-to-r from-[#1c1809] via-[#131d10] to-[#1c1809] border-amber-400/80 shadow-amber-500/10'
                : 'bg-gradient-to-r from-[#0a1829] to-[#081422] border-emerald-500/40 shadow-black/40'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                    myDutiesOnCurrentDate.length > 0
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {myDutiesOnCurrentDate.length > 0 ? '🔔' : '✓'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs uppercase font-extrabold text-amber-400">
                      Resident: {currentStudent.name}
                    </span>
                    {isToday ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                        Today
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        Date: {currentDate}
                      </span>
                    )}
                  </div>

                  {myDutiesOnCurrentDate.length > 0 ? (
                    <p className="text-sm font-extrabold text-white mt-0.5 leading-snug">
                      🎯 Your Duty: <span className="text-amber-300 underline underline-offset-2">{myDutyTitles}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-300 mt-0.5">
                      🎉 No duty assigned for you on {currentDate}. Enjoy!
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons specifically for this student */}
              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                {myDutiesOnCurrentDate.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSendDutyWhatsApp(myDutyTitles, currentDate)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#142d1e] hover:bg-[#1c3f2b] text-emerald-300 border border-emerald-500/60 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                      title="Send WhatsApp alert to yourself / hostel group"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp Alert</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRequestPhoneNotification(myDutyTitles, currentDate)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                      title="Send push/browser notification to this phone"
                    >
                      <span>🔔 Notify Me</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenLoginModal('student')}
                  className="px-2 py-1.5 rounded-lg bg-[#0e1d32] hover:bg-[#142b47] text-amber-300 hover:text-amber-200 border border-amber-400/40 text-[11px] font-semibold transition-colors flex items-center gap-1"
                  title="Change your resident login password"
                >
                  <Key className="w-3 h-3 text-amber-400" />
                  <span>Password</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogoutStudent}
                  className="px-2 py-1.5 rounded-lg bg-[#0e1d32] hover:bg-[#142b47] text-slate-400 hover:text-slate-200 border border-[#1b3457] text-[11px] font-semibold transition-colors"
                  title="Switch student profile on this phone"
                >
                  Switch
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Date Navigator */}
        <DateNavigator
          currentDate={currentDate}
          onDateChange={handleDateChange}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onToday={handleToday}
          isToday={isToday}
          isAllCompleted={isAllCompletedToday}
        />

        {/* COMPACT MOBILE-FIRST ADMIN TOOLBAR */}
        {isAdmin && (
          <div className="mt-3 mb-3 p-3 rounded-2xl bg-gradient-to-r from-[#0d1e38] via-[#102747] to-[#0d1e38] border-2 border-amber-400 shadow-lg shadow-black/50">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-white tracking-wide uppercase">
                  Admin Tools
                </span>
              </div>
              <span className="text-[10px] text-emerald-300 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync (0ms)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                onClick={handleMarkAllDone}
                className={`px-2.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                  isAllCompletedToday
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm'
                }`}
                title="Mark all duties completed so cycle advances next day"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{isAllCompletedToday ? 'All Done ✓' : `Mark All (${todayCompletedCount}/${activeDuties.length})`}</span>
              </button>

              <button
                onClick={() => {
                  setSettingsTab('students');
                  setIsSettingsModalOpen(true);
                }}
                className="px-2.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                title="Add student or manage resident sequence"
              >
                <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ Students</span>
              </button>

              <button
                onClick={() => {
                  setSettingsTab('cycles');
                  setIsSettingsModalOpen(true);
                }}
                className="px-2.5 py-2 rounded-xl bg-[#0f284a] hover:bg-[#163a69] text-amber-300 border border-amber-400/50 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                title="Change duty cycles, add new cycle, and customize student order"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Turn Cycles ({activeDuties.length})</span>
              </button>

              <button
                onClick={() => {
                  setSettingsTab('penalties');
                  setIsSettingsModalOpen(true);
                }}
                className="px-2.5 py-2 rounded-xl bg-[#142947] hover:bg-[#1c3a64] text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                title="View active repeat penalties"
              >
                <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                <span>Repeats ({activePenaltiesCount})</span>
              </button>

              <button
                onClick={handleResetAdminActions}
                className="col-span-2 sm:col-span-1 px-2.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-200 border border-rose-500/50 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                title="Reset accidental repeats & overrides"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}

        {/* Duty Cards Grid - Mobile Friendly Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 mt-3.5">
          {activeDuties.map((duty) => {
            const status = currentRoster[duty.id];
            return (
              <DutyCard
                key={duty.id}
                duty={duty}
                status={status}
                isAdmin={isAdmin}
                allStudentNames={allStudentNames}
                students={rosterData.students}
                currentStudentName={currentStudent?.name}
                onMarkDone={handleMarkDone}
                onSkipStudent={handleSkipStudent}
                onApplyRepeatPenalty={handleApplyRepeatPenalty}
                onCancelRepeat={handleCancelRepeat}
                onReassign={handleReassign}
              />
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-[#122137] bg-[#060a14] py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            Sri Ramakrishna Students' Home · Hostel Duty Allocation System
          </div>
          <div className="text-[11px] text-slate-600">
            Automated Daily Rotation · 17 Residents Roster
          </div>
        </div>
      </footer>

      {/* Modals */}
      <HostelLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        students={rosterData.students}
        currentStudent={currentStudent}
        isAdmin={isAdmin}
        isPasswordSet={rosterData.isPasswordSet}
        onSelectStudent={handleSelectStudent}
        onVerifyStudentPassword={handleVerifyStudentPassword}
        onChangeStudentPassword={handleChangeStudentPassword}
        onVerifyAdminPassword={handleVerifyPassword}
        onLogoutAdmin={() => {
          setIsAdmin(false);
          showToast('Logged out of Admin mode');
        }}
        onLogoutStudent={handleLogoutStudent}
        onOpenInstall={() => setIsInstallModalOpen(true)}
        defaultTab={loginModalTab}
      />

      <AdminSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        students={rosterData.students}
        duties={activeDuties}
        penalties={rosterData.penalties}
        isPasswordSet={rosterData.isPasswordSet}
        initialTab={settingsTab}
        onToggleStudentAway={handleToggleStudentAway}
        onAddStudent={handleAddStudent}
        onUpdateStudent={handleUpdateStudent}
        onBulkAddStudents={handleBulkAddStudents}
        onRemoveStudent={handleRemoveStudent}
        onReorderStudents={handleReorderStudents}
        onAddDuty={handleAddDuty}
        onUpdateDuty={handleUpdateDuty}
        onRemoveDuty={handleRemoveDuty}
        onReorderDuties={handleReorderDuties}
        onClearPenalty={handleClearPenalty}
        onAddPenalty={handleApplyRepeatPenalty}
        onChangePassword={handleChangePassword}
        onResetPasswordToDefault={handleResetPasswordToDefault}
        onResetStudentPassword={handleResetStudentPassword}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onResetToDefaults={handleResetToDefaults}
        onResetAdminActions={handleResetAdminActions}
      />

      <StudentScheduleFinder
        isOpen={isTurnFinderOpen}
        onClose={() => setIsTurnFinderOpen(false)}
        students={rosterData.students}
        currentDate={currentDate}
        penalties={rosterData.penalties}
        overrides={rosterData.overrides}
        completedDuties={rosterData.completedDuties}
        baselineDate={rosterData.baselineDate}
        duties={activeDuties}
        onSelectDate={(newDate) => setCurrentDate(newDate)}
      />

      <ShareRosterModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        currentDate={currentDate}
        roster={currentRoster}
        rosterData={rosterData}
        duties={activeDuties}
      />

      <MarkDoneRequiredModal
        isOpen={isMarkDoneModalOpen}
        onClose={() => setIsMarkDoneModalOpen(false)}
        currentDate={currentDate}
        dutyStatuses={currentRoster}
        completedDutyIds={todayCompletedDuties}
        isAdmin={isAdmin}
        onMarkAllDoneAndAdvance={handleMarkAllDoneAndAdvance}
        onOpenLogin={() => {
          setIsMarkDoneModalOpen(false);
          handleOpenLoginModal('admin');
        }}
      />

      {/* Android PWA Installation Modal */}
      <AndroidInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        onInstall={installPWA}
      />

      {/* Connectivity Status Toast for Offline/Online Mode */}
      <OfflineIndicator />
    </div>
  );
}
