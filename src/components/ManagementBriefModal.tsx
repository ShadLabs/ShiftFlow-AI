import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { HandoverReport, ManagementBrief } from '../types';
import { generateBrief } from '../services/aiService';

interface ManagementBriefModalProps {
  handover: HandoverReport | null;
  onClose: () => void;
  onSaveBriefToHandover: (handoverId: string, brief: ManagementBrief) => void;
}

export const ManagementBriefModal: React.FC<ManagementBriefModalProps> = ({
  handover,
  onClose,
  onSaveBriefToHandover,
}) => {
  const [brief, setBrief] = useState<ManagementBrief | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrGenerateBrief = async (forceRegenerate: boolean = false) => {
    if (!handover) return;

    if (!forceRegenerate && handover.managementBrief) {
      setBrief(handover.managementBrief);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const briefData = await generateBrief(handover);
      const newBrief: ManagementBrief = {
        ...briefData,
        generatedAt: new Date().toISOString(),
      };
      setBrief(newBrief);
      onSaveBriefToHandover(handover.id, newBrief);
    } catch (err: any) {
      console.warn('Brief error:', err);
      setError(err.message || 'Unable to generate management brief.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrGenerateBrief(false);
  }, [handover?.id]);

  if (!handover) return null;

  const handleCopy = () => {
    if (!brief) return;
    const text = `
*EXECUTIVE OPERATIONS BRIEF*
Shift: ${handover.shift} Shift | Date: ${handover.date} | Area: ${handover.department}
Overall Status: ${brief.overallStatus}

• PRIMARY ISSUE: ${brief.primaryIssue}
• BIGGEST RISK: ${brief.biggestRisk}
• CRITICAL PENDING ACTION: ${brief.criticalPendingAction}
• POSITIVE OUTCOME: ${brief.positiveOutcome}
• NEXT SHIFT PRIORITY: ${brief.nextShiftPriority}

*Executive Notes:*
${brief.executiveNotes}
--
ShiftFlow AI Operations Assistant
`.trim();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Executive Briefing Generator · Gemini 3.8 Flash</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-7 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                30-Second Operations Leadership Brief
              </h3>
              <p className="text-xs text-slate-500">
                Decision-grade synthesis for Facility Directors, General Managers, and Area Managers
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchOrGenerateBrief(true)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors"
                title="Regenerate brief with Gemini"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>

              <button
                onClick={handleCopy}
                disabled={!brief || loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy for Slack/Email'}</span>
              </button>
            </div>
          </div>

          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span>Synthesizing high-density executive brief with Gemini...</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          {brief && !loading && (
            <div className="space-y-4">
              {/* Executive Notes Callout */}
              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs leading-relaxed space-y-1">
                <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                  Leadership Takeaway
                </div>
                <p className="text-slate-200 text-xs sm:text-sm font-medium">
                  {brief.executiveNotes}
                </p>
              </div>

              {/* 5-Key Point Decision Grid */}
              <div className="space-y-2.5">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-start gap-3">
                  <div className="p-1 rounded bg-rose-100 text-rose-700 shrink-0 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs">
                    <div className="text-[10px] uppercase text-slate-400 font-bold">
                      Primary Operational Issue
                    </div>
                    <div className="font-semibold text-slate-900 mt-0.5">{brief.primaryIssue}</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-start gap-3">
                  <div className="p-1 rounded bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs">
                    <div className="text-[10px] uppercase text-slate-400 font-bold">
                      Biggest Current Risk (Next 4-8 hrs)
                    </div>
                    <div className="font-semibold text-slate-900 mt-0.5">{brief.biggestRisk}</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-start gap-3">
                  <div className="p-1 rounded bg-indigo-100 text-indigo-700 shrink-0 mt-0.5">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs">
                    <div className="text-[10px] uppercase text-slate-400 font-bold">
                      Critical Pending Action / Support Needed
                    </div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {brief.criticalPendingAction}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-start gap-3">
                  <div className="p-1 rounded bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs">
                    <div className="text-[10px] uppercase text-slate-400 font-bold">
                      Positive Outcome / Win
                    </div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {brief.positiveOutcome}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-start gap-3">
                  <div className="p-1 rounded bg-slate-200 text-slate-800 shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs">
                    <div className="text-[10px] uppercase text-slate-400 font-bold">
                      Top Priority for Incoming Shift Kickoff
                    </div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {brief.nextShiftPriority}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Shift: {handover.shift} · Date: {handover.date}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-slate-700 hover:bg-slate-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
