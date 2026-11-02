import React, { useState } from 'react';
import { X, Copy, Check, Share2, MessageSquare, Link, Globe, Sparkles, Smartphone } from 'lucide-react';
import { DUTY_DEFINITIONS, getResidentNumber } from '../utils/cycleEngine';
import { DayDutyStatus, DutyId, AppRosterData, DutyDefinition } from '../types/roster';
import { generateShareUrl } from '../utils/storage';

interface ShareRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: string;
  roster: Record<DutyId, DayDutyStatus>;
  rosterData?: AppRosterData | null;
  duties?: DutyDefinition[];
}

export const ShareRosterModal: React.FC<ShareRosterModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  roster,
  rosterData,
  duties,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [linkType, setLinkType] = useState<'live' | 'snapshot'>('live');

  if (!isOpen) return null;

  const [y, m, d] = currentDate.split('-');
  const formattedDate = `${m}/${d}/${y}`;

  const activeDuties = duties && duties.length > 0 ? duties : DUTY_DEFINITIONS;

  // Generate shareable links
  const liveUrl = generateShareUrl(rosterData || undefined, false);
  const snapshotUrl = rosterData ? generateShareUrl(rosterData, true) : liveUrl;
  const currentShareUrl = linkType === 'snapshot' ? snapshotUrl : liveUrl;

  // Build clean WhatsApp formatted text with Resident Numbers #N
  const lines = [
    `*SRI RAMAKRISHNA STUDENTS' HOME*`,
    `📋 *Hostel Duty Roster — ${formattedDate}*`,
    ``,
  ];

  for (const duty of activeDuties) {
    const status = roster[duty.id];
    const names = status?.assignedStudents?.map((name) => {
      const num = rosterData ? getResidentNumber(name, rosterData.students) : '';
      return num ? `${num} ${name}` : name;
    }).join(', ') || 'Unassigned';
    const isDone = status?.isCompleted ? ' [DONE ✓]' : '';
    lines.push(`• *${duty.title}* (${duty.subtitle}): ${names}${isDone}`);
  }

  lines.push(``);
  lines.push(`🔗 *Live Updated Roster Link:*`);
  lines.push(currentShareUrl);
  lines.push(``);
  lines.push(`(Tap link to open the live roster on any phone — automatically synced with admin updates)`);

  const shareText = lines.join('\n');

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error('Failed to copy link', e);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Hostel Duty Roster - ${formattedDate}`,
          text: shareText,
          url: currentShareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyText();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-[#0c182c] border-2 border-[#1e385c] p-6 shadow-2xl flex flex-col space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#162740] pb-3">
          <div className="flex items-center gap-2.5 text-white font-extrabold text-lg">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3>Share Updated Roster</h3>
              <p className="text-xs text-amber-300/80 font-normal">Live link synced across all phones</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#162945] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Link Generation Box (Fulfills user request) */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#09172c] via-[#0d213e] to-[#09172c] border-2 border-emerald-500/50 space-y-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <Globe className="w-4 h-4" />
              <span>Live Shared Link (Auto-Updates on All Phones)</span>
            </div>

            <div className="flex items-center gap-1 bg-[#06101e] p-0.5 rounded-lg border border-[#1b3457] text-[11px]">
              <button
                type="button"
                onClick={() => setLinkType('live')}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  linkType === 'live' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Live URL
              </button>
              <button
                type="button"
                onClick={() => setLinkType('snapshot')}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  linkType === 'snapshot' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Embeds exact duty state into URL"
              >
                Snapshot URL
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-300">
            Send this link to students. When they tap it on their phones, they see all duties, mark-offs, skips, and repeats updated by the admin!
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={currentShareUrl}
              className="flex-1 px-3 py-2 rounded-xl bg-[#06101e] border border-[#1b3457] text-xs font-mono text-emerald-300 select-all focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0"
            >
              {copiedLink ? <Check className="w-4 h-4 stroke-[3]" /> : <Link className="w-4 h-4 stroke-[2.5]" />}
              <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* WhatsApp & Text Summary Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-slate-300">WhatsApp / Notice Board Message:</span>
            <span>Includes Duty Schedule + Link</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#071120] border border-[#162740] font-mono text-xs text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed shadow-inner custom-scrollbar">
            {shareText}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleCopyText}
            className="py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-slate-950 font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/10"
          >
            {copiedText ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Copied All Text & Link!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Summary for WhatsApp</span>
              </>
            )}
          </button>

          <button
            onClick={handleNativeShare}
            className="py-2.5 px-4 rounded-xl bg-[#132845] hover:bg-[#1c3a64] text-slate-200 hover:text-white font-bold text-xs sm:text-sm transition-all border border-[#234370] flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Share via WhatsApp / Mobile</span>
          </button>
        </div>
      </div>
    </div>
  );
};
