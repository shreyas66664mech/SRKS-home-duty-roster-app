import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Download,
  CheckCircle2,
  X,
  Radio,
  Zap,
  WifiOff,
  Copy,
  Check,
  ExternalLink,
  QrCode as QrIcon,
  MessageSquare,
  ArrowRight,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { getPublicAppUrl } from '../utils/storage';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
  onInstall: () => Promise<boolean>;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  isInstalled,
  onInstall,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'qr' | 'link' | 'guide'>('qr');

  // Detect environment
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  const isMobile =
    typeof window !== 'undefined' &&
    /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');

  // Determine standalone public app URL (works universally on phones without Google AI Studio login)
  const appUrl = `${getPublicAppUrl()}/`;

  useEffect(() => {
    if (isOpen && appUrl) {
      QRCode.toDataURL(appUrl, {
        width: 240,
        margin: 1.5,
        color: {
          dark: '#080d19',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code', err));
    }
  }, [isOpen, appUrl]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleOpenExternal = () => {
    window.open(appUrl, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Sri Ramakrishna Students' Home - Hostel Duty Roster App:\n${appUrl}\n\nOpen this link in Chrome on your Android phone to install the app!`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleInstallClick = async () => {
    const success = await onInstall();
    if (success) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto"
    >
      <div className="bg-[#0a1424] border-2 border-emerald-400/80 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl shadow-black/90 text-white relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#12233f] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-slate-950 flex items-center justify-center font-extrabold shadow-lg shadow-emerald-500/20 shrink-0">
            <Smartphone className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Android App (PWA)
              </span>
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                Live 0-Latency Sync
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
              Install App on Android
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Sri Ramakrishna Students' Home Hostel Duty Roster
            </p>
          </div>
        </div>

        {/* Critical Note for Phone Access & Fixing 403 Error */}
        <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-amber-950/70 via-rose-950/40 to-amber-950/70 border border-amber-400/50 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-extrabold text-amber-300 block text-xs tracking-wide uppercase">
                Fix for "403 Access Denied" on phone:
              </strong>
              <p className="mt-1 text-slate-200 leading-relaxed">
                Do <strong className="text-rose-300 underline underline-offset-2">NOT</strong> open <code className="bg-black/50 px-1 py-0.5 rounded text-amber-200 font-mono text-[11px]">aistudio.google.com</code> on your mobile phone (that is Google's private developer workspace).
              </p>
              <p className="mt-1 text-emerald-300 font-medium">
                Instead, open the <strong className="text-white">Direct App Link</strong> below on your Android phone. It works for all students without requiring any Google login!
              </p>
            </div>
          </div>
        </div>

        {/* Tabs to choose how to get to phone */}
        <div className="flex items-center gap-1 bg-[#060e1a] p-1 rounded-xl border border-[#162740] mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'qr'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrIcon className="w-4 h-4" />
            <span>Scan QR Code</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'link'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>Get Link / WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'guide'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android Steps</span>
          </button>
        </div>

        {/* Tab 1: QR Code Scanner */}
        {activeTab === 'qr' && (
          <div className="flex flex-col items-center justify-center p-4 bg-[#071120] border border-[#172c4a] rounded-xl text-center mb-4">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">
              Point your Android Phone Camera here:
            </span>

            <div className="p-3 bg-white rounded-2xl shadow-xl shadow-black/60 mb-3 border-4 border-emerald-400/50">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code to install Hostel Roster App"
                  className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-lg"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-slate-900 font-bold text-xs">
                  Generating QR Code...
                </div>
              )}
            </div>

            <p className="text-xs text-slate-300 max-w-xs leading-relaxed mb-3">
              Scan with your phone's camera or <strong>Google Lens</strong> to open the live app directly on your Android phone!
            </p>

            {/* Quick Action buttons right under QR */}
            <div className="w-full pt-3 border-t border-[#172c4a] flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="w-full sm:flex-1 py-2 px-3 rounded-lg bg-[#152e1f] hover:bg-[#1a3d28] text-emerald-300 border border-emerald-500/50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Send to WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="w-full sm:flex-1 py-2 px-3 rounded-lg bg-[#0f2238] hover:bg-[#163355] text-slate-200 border border-[#23436b] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied Link!' : 'Copy Direct Link'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Direct Link / WhatsApp */}
        {activeTab === 'link' && (
          <div className="p-4 bg-[#071120] border border-[#172c4a] rounded-xl space-y-3 mb-4">
            <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
              Direct App Link:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="flex-1 px-3 py-2.5 rounded-xl bg-[#050b14] border border-[#1e385c] text-xs font-mono text-emerald-300 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0"
              >
                {copiedLink ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="py-2.5 px-3 rounded-xl bg-[#152e1f] hover:bg-[#1a3d28] text-emerald-300 border border-emerald-500/50 text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-98 shadow-sm"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Send to WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleOpenExternal}
                className="py-2.5 px-3 rounded-xl bg-[#10223d] hover:bg-[#163057] text-sky-200 border border-sky-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-98 shadow-sm"
              >
                <ExternalLink className="w-4 h-4 text-sky-400" />
                <span>Open in New Tab</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Detailed Android Steps */}
        {activeTab === 'guide' && (
          <div className="bg-[#071120] border border-[#193256] rounded-xl p-4 mb-4">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span>Once opened on your Android phone:</span>
            </h4>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 bg-[#050c18] p-2.5 rounded-lg border border-[#162740]">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <span>Open the link in <strong>Google Chrome</strong> or <strong>Samsung Internet</strong> on Android.</span>
              </div>
              <div className="flex items-start gap-2.5 bg-[#050c18] p-2.5 rounded-lg border border-[#162740]">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <span>Tap the <strong>Three Dots (⋮)</strong> menu icon at the top-right corner of Chrome.</span>
              </div>
              <div className="flex items-start gap-2.5 bg-[#050c18] p-2.5 rounded-lg border border-[#162740]">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <span>
                  Tap <strong className="text-emerald-400">"Install app"</strong> or <strong className="text-emerald-400">"Add to Home screen"</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2.5 bg-[#050c18] p-2.5 rounded-lg border border-[#162740]">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  4
                </span>
                <span>Tap <strong>Install</strong>. The Sri Ramakrishna Hostel app icon appears on your Android screen!</span>
              </div>
            </div>
          </div>
        )}

        {/* 1-Click Browser Install Button if the browser supports beforeinstallprompt */}
        {isInstallable && (
          <button
            onClick={handleInstallClick}
            className="w-full py-3.5 px-4 mb-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all active:scale-98"
          >
            <Download className="w-5 h-5 stroke-[2.5]" />
            <span>Install App Now</span>
          </button>
        )}

        {/* Primary Action Button: Open in Full Window */}
        <div className="pt-2 border-t border-[#193256] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleOpenExternal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open in Fullscreen Window</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0f233f] hover:bg-[#15325c] text-slate-200 text-xs font-bold border border-[#1f3d6b] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
