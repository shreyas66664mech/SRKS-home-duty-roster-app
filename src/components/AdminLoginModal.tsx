import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPasswordSet?: boolean;
  onVerifyPassword: (enteredPassword: string) => Promise<boolean>;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  isPasswordSet = false,
  onVerifyPassword,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const isValid = await onVerifyPassword(password);
      if (isValid) {
        setPassword('');
        setErrorMsg(null);
        onClose();
      } else {
        setErrorMsg('Incorrect admin password.');
      }
    } catch {
      setErrorMsg('An error occurred during verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl bg-[#0c182c] border border-[#1b3152] p-6 sm:p-7 shadow-2xl shadow-black/80 space-y-5"
        role="dialog"
        aria-modal="true"
      >
        {/* Header matching screenshot */}
        <div>
          <div className="text-[11px] font-bold tracking-[0.2em] text-amber-400 uppercase">
            Restricted access
          </div>
          <h3 className="text-2xl font-extrabold text-white tracking-tight mt-1">
            Admin login
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
            Enter the admin password to manage duty assignments.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter administrator password..."
                autoFocus
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#071120] border border-[#1d3559] focus:border-amber-400 focus:outline-none text-slate-100 placeholder:text-slate-500 text-sm font-mono shadow-inner pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Buttons matching screenshot */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className="flex-1 py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-slate-950 font-bold text-sm transition-all shadow-md shadow-amber-500/10 disabled:opacity-60"
            >
              {isSubmitting ? 'Verifying...' : 'Unlock admin tools'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="py-2.5 px-4 rounded-lg bg-[#0e1b30] hover:bg-[#152a4a] text-slate-300 font-semibold text-sm transition-colors border border-[#1a3254]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
