import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  User,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
  Smartphone,
  Check,
  Share2,
  Lock,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { Student } from '../types/roster';
import { getPublicAppUrl } from '../utils/storage';

interface HostelLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  currentStudent: Student | null;
  isAdmin: boolean;
  isPasswordSet?: boolean;
  onSelectStudent: (student: Student) => void;
  onVerifyStudentPassword: (student: Student, password: string) => Promise<boolean>;
  onChangeStudentPassword: (studentId: string, currentPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  onVerifyAdminPassword: (password: string) => Promise<boolean>;
  onLogoutAdmin: () => void;
  onLogoutStudent: () => void;
  onOpenInstall: () => void;
  defaultTab?: 'student' | 'admin' | 'share';
}

export const HostelLoginModal: React.FC<HostelLoginModalProps> = ({
  isOpen,
  onClose,
  students,
  currentStudent,
  isAdmin,
  onSelectStudent,
  onVerifyStudentPassword,
  onChangeStudentPassword,
  onVerifyAdminPassword,
  onLogoutAdmin,
  onLogoutStudent,
  onOpenInstall,
  defaultTab = 'student',
}) => {
  const [activeTab, setActiveTab] = useState<'student' | 'admin' | 'share'>(defaultTab);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(currentStudent?.id || '');
  const [searchFilter, setSearchFilter] = useState('');
  
  // Student login password state
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);

  // Student change password state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changePwdSuccess, setChangePwdSuccess] = useState<string | null>(null);

  // Admin login password state
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const publicUrl = `${getPublicAppUrl()}/`;

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setSelectedStudentId(currentStudent?.id || (students[0]?.id || ''));
      setErrorMsg(null);
      setStudentPassword('');
      setAdminPassword('');
      setIsChangingPassword(false);
      setCurrPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangePwdSuccess(null);

      QRCode.toDataURL(publicUrl, {
        width: 220,
        margin: 1.5,
        color: { dark: '#080d19', light: '#ffffff' },
      })
        .then(setQrDataUrl)
        .catch(console.error);
    }
  }, [isOpen, defaultTab, currentStudent, students, publicUrl]);

  if (!isOpen) return null;

  const filteredStudents = students.filter((s, idx) => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return true;
    const num = String(s.rollNo ?? (idx + 1));
    return s.name.toLowerCase().includes(q) || num.includes(q.replace('#', ''));
  });

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedStudent) {
      setErrorMsg('Please select your name from the resident list');
      return;
    }

    if (!studentPassword.trim()) {
      setErrorMsg(`Please enter password for ${selectedStudent.name} (initial: 12345)`);
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await onVerifyStudentPassword(selectedStudent, studentPassword);
      if (ok) {
        setStudentPassword('');
        onSelectStudent(selectedStudent);
        onClose();
      } else {
        setErrorMsg(`Incorrect password for ${selectedStudent.name}. Default initial password is "12345" unless you changed it.`);
      }
    } catch {
      setErrorMsg('Error verifying password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setChangePwdSuccess(null);

    if (!currentStudent) return;

    if (!currPassword.trim()) {
      setErrorMsg('Please enter your current password.');
      return;
    }
    if (newPassword.length < 4) {
      setErrorMsg('New password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onChangeStudentPassword(currentStudent.id, currPassword, newPassword);
      if (result.success) {
        setChangePwdSuccess('Password changed successfully! Keep it safe.');
        setCurrPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsChangingPassword(false);
          setChangePwdSuccess(null);
        }, 2500);
      } else {
        setErrorMsg(result.error || 'Failed to update password.');
      }
    } catch {
      setErrorMsg('An unexpected error occurred while changing password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const ok = await onVerifyAdminPassword(adminPassword);
      if (ok) {
        setAdminPassword('');
        onClose();
      } else {
        setErrorMsg('Incorrect administrator password. Please try again.');
      }
    } catch {
      setErrorMsg('Verification error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Ignore
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Sri Ramakrishna Students' Home - Hostel Duty Roster:\n${publicUrl}\n\n1. Open this link in Chrome on your phone.\n2. Tap "Resident Login" & choose your name.\n3. Default password is 12345 (change anytime for safety).\n4. View your duty alerts and install app!`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto"
    >
      <div className="bg-[#0b172a] border-2 border-[#1e385c] rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl shadow-black/90 text-white relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#12233f] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <img
            src="/assets/aistudio/Ramakrishna_Students_Home_Duty_Assigner_fb337d9c.png"
            alt="Ramakrishna Students Home Duty Assigner"
            className="w-11 h-11 rounded-xl object-cover shadow-md shadow-amber-500/10 border border-amber-400/30 shrink-0"
          />
          <div>
            <div className="text-[10px] font-bold tracking-[0.18em] text-amber-400 uppercase">
              Sri Ramakrishna Students' Home
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Hostel Portal Login
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Secure login for residents and administrators
            </p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-1 bg-[#060e1a] p-1 rounded-xl border border-[#162740] mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('student');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'student'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Resident / Student</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'admin'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin Portal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('share');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'share'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Share Roster</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Alert */}
        {changePwdSuccess && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{changePwdSuccess}</span>
          </div>
        )}

        {/* TAB 1: RESIDENT / STUDENT LOGIN */}
        {activeTab === 'student' && (
          <div>
            {currentStudent ? (
              <div className="p-4 bg-[#071324] border border-emerald-500/40 rounded-xl mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black text-sm">
                      {currentStudent.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                        Signed In Phone User
                      </div>
                      <div className="text-base font-extrabold text-white">
                        {currentStudent.name}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onLogoutStudent}
                    className="text-xs px-2.5 py-1 rounded bg-[#10223b] hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-[#1d3558] transition-colors"
                  >
                    Switch User
                  </button>
                </div>

                {/* Change Password Form Toggle */}
                {isChangingPassword ? (
                  <form onSubmit={handleChangePasswordSubmit} className="pt-3 border-t border-[#142845] space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>Change Password for {currentStudent.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsChangingPassword(false)}
                        className="text-[11px] text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Current Password:
                      </label>
                      <input
                        type="password"
                        value={currPassword}
                        onChange={(e) => setCurrPassword(e.target.value)}
                        placeholder="Current password (default: 12345)"
                        required
                        className="w-full px-3 py-2 rounded-xl bg-[#091526] border border-[#1b3457] text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          New Password:
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password (min 4 chars)"
                            required
                            className="w-full px-3 py-2 rounded-xl bg-[#091526] border border-[#1b3457] text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-amber-400 pr-8"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Confirm New Password:
                        </label>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          required
                          className="w-full px-3 py-2 rounded-xl bg-[#091526] border border-[#1b3457] text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                    >
                      <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{isSubmitting ? 'Saving...' : 'Save New Password'}</span>
                    </button>
                  </form>
                ) : (
                  <div className="pt-2 border-t border-[#142845] flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => setIsChangingPassword(true)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#0f243d] hover:bg-[#153457] text-amber-300 border border-amber-400/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>Change My Password</span>
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="py-2 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors"
                    >
                      Go to Roster
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleStudentLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
                    1. Select Your Name:
                  </label>
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search name (e.g. Shreyas, Preetham)..."
                    className="w-full px-3 py-2 rounded-xl bg-[#071120] border border-[#1b3457] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400 mb-2"
                  />

                  <div className="max-h-36 overflow-y-auto space-y-1 bg-[#071120] p-1.5 rounded-xl border border-[#193256] custom-scrollbar">
                    {filteredStudents.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-3">
                        No student found matching "{searchFilter}".
                      </p>
                    ) : (
                      filteredStudents.map((student) => {
                        const isSelected = selectedStudentId === student.id;
                        return (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => setSelectedStudentId(student.id)}
                            className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950 shadow-sm'
                                : 'bg-[#0a182d] hover:bg-[#0f233f] text-slate-200 border border-[#162947]'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                  isSelected
                                    ? 'bg-slate-950 text-amber-400'
                                    : 'bg-[#152a4a] text-slate-300'
                                }`}
                              >
                                {student.name.charAt(0)}
                              </span>
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                isSelected
                                  ? 'bg-slate-950/20 text-slate-950 font-black'
                                  : 'bg-[#060e1a] text-amber-400 border border-amber-400/30'
                              }`}>
                                #{String(student.rollNo ?? (students.findIndex(s => s.id === student.id) + 1)).padStart(2, '0')}
                              </span>
                              <span>{student.name}</span>
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Password field for the selected student */}
                {selectedStudent && (
                  <div className="p-3 rounded-xl bg-[#071324] border border-amber-400/40 animate-in fade-in space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider">
                        2. Password for {selectedStudent.name}:
                      </label>
                      <span className="text-[10px] text-amber-400/80 font-semibold">
                        Initial: 12345
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type={showStudentPassword ? 'text' : 'password'}
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        placeholder="Enter password (initial: 12345)..."
                        required
                        autoFocus
                        className="w-full px-3 py-2.5 rounded-xl bg-[#091526] border border-[#1b3457] text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-amber-400 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStudentPassword(!showStudentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        aria-label={showStudentPassword ? 'Hide password' : 'Show password'}
                      >
                        {showStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-tight">
                      Initial password is <strong className="text-amber-300">12345</strong>. You can change your password anytime after logging in for privacy.
                    </p>
                  </div>
                )}

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedStudent}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Log In as {selectedStudent ? selectedStudent.name : 'Resident'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: ADMINISTRATOR PORTAL LOGIN */}
        {activeTab === 'admin' && (
          <div>
            {isAdmin ? (
              <div className="p-4 bg-[#071324] border border-amber-400/50 rounded-xl mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                      <Shield className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                        Status Active
                      </div>
                      <div className="text-base font-extrabold text-white">
                        Administrator Mode Unlocked
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onLogoutAdmin}
                    className="text-xs px-2.5 py-1 rounded bg-[#10223b] hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-[#1d3558] transition-colors"
                  >
                    Lock / Logout
                  </button>
                </div>
                <p className="text-xs text-slate-300">
                  Full administrator privileges active. Live sync pushes all updates to resident devices.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors"
                >
                  Return to Dashboard
                </button>
              </div>
            ) : (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Admin Password:
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter administrator password..."
                      autoFocus
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#071120] border border-[#1b3457] text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-amber-400 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>Unlock Admin Mode</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: SHARE ROSTER LINK & QR */}
        {activeTab === 'share' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#071324] p-4 rounded-xl border border-[#162a47]">
              {qrDataUrl && (
                <div className="p-2 bg-white rounded-xl shrink-0 shadow-md">
                  <img src={qrDataUrl} alt="App QR Code" className="w-28 h-28" />
                </div>
              )}
              <div className="space-y-2 flex-1 text-center sm:text-left">
                <div className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                  Live Roster Web Link
                </div>
                <p className="text-xs text-slate-300">
                  Scan QR code or send this direct link to any resident to view today's duties.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#142d1e] hover:bg-[#1a3a27] text-emerald-300 border border-emerald-500/50 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                  >
                    <span>Send to WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="py-2 px-3 rounded-xl bg-[#0f243d] hover:bg-[#153457] text-slate-200 border border-[#1f3f6b] font-bold text-xs transition-colors"
                  >
                    {copiedLink ? 'Copied ✓' : 'Copy Link'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
