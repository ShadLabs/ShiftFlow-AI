import React, { useState } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Plus,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { HandoverReport, ActionItem } from '../types';

interface HandoverDetailModalProps {
  handover: HandoverReport | null;
  onClose: () => void;
  onOpenManagementBrief: (handover: HandoverReport) => void;
  onAddActionFromIssue: (issueTitle: string, handoverId: string) => void;
}

export const HandoverDetailModal: React.FC<HandoverDetailModalProps> = ({
  handover,
  onClose,
  onOpenManagementBrief,
  onAddActionFromIssue,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!handover) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyToClipboard = () => {
    const text = `
OPERATIONS SHIFT HANDOVER
==================================================
Date: ${handover.date}
Shift: ${handover.shift}
Department / Area: ${handover.department}
Outgoing Lead: ${handover.shiftLead}
Incoming Shift: ${handover.incomingShift}
Overall Status: ${handover.generalStatus} (Risk: ${handover.riskLevel})

EXECUTIVE SUMMARY
--------------------------------------------------
${handover.executiveSummary}

OPERATIONAL METRICS
--------------------------------------------------
Target: ${handover.metrics?.target || 'N/A'}
Actual: ${handover.metrics?.actual || 'N/A'}
Backlog: ${handover.metrics?.backlog || 'N/A'}
Quality: ${handover.metrics?.quality || 'N/A'}
Downtime: ${handover.metrics?.downtime || 'N/A'}
Staffing: ${handover.metrics?.staffing || 'N/A'}
Safety: ${handover.metrics?.safetyObservations || 'N/A'}

KEY ISSUES (${(handover.issues || []).length})
--------------------------------------------------
${(handover.issues || [])
  .map(
    (iss, i) =>
      `[${i + 1}] ${iss.title} (${iss.severity} / ${iss.category} / Status: ${iss.status})
- Area: ${iss.area} | Time: ${iss.timeObserved || 'N/A'}
- Action Taken: ${iss.actionTaken || 'N/A'}
- Recommended Action: ${iss.recommendedAction || 'N/A'}`
  )
  .join('\n\n')}

ACTIONS COMPLETED
--------------------------------------------------
${(handover.completedActions || []).map(a => `• ${a}`).join('\n')}

OUTSTANDING ITEMS FOR INCOMING SHIFT
--------------------------------------------------
${(handover.outstandingItems || []).map(o => `• ${o}`).join('\n')}

RISKS FOR INCOMING SHIFT
--------------------------------------------------
${(handover.risks || []).map(r => `• ${r}`).join('\n')}

NEXT-SHIFT PRIORITIES
--------------------------------------------------
${(handover.nextShiftPriorities || []).map((p, i) => `${i + 1}. ${p}`).join('\n')}

AI RECOMMENDED FOLLOW-UPS (Requires Human Approval)
--------------------------------------------------
${(handover.recommendations || []).map(r => `→ ${r}`).join('\n')}

POSITIVE OUTCOMES / WINS
--------------------------------------------------
${(handover.positiveOutcomes || []).map(w => `★ ${w}`).join('\n')}

${
  (handover.escalations || []).length > 0
    ? `ESCALATIONS\n--------------------------------------------------\n${handover.escalations
        .map(e => `! ${e}`)
        .join('\n')}`
    : ''
}
==================================================
ShiftFlow AI Operations Handover System
`.trim();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
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
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Clipboard copy failed:', e);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Critical':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'Attention Required':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      default:
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6">
      {/* Modal Card */}
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden print-page">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/75 shrink-0 no-print">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Shift Handover Record · {handover.id}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenManagementBrief(handover)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Management Brief</span>
            </button>

            <button
              onClick={handleCopyToClipboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors ml-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Report Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-800">
          {/* Formal Document Header */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                  Operations Continuity System · Formal Handover
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mt-1">
                  OPERATIONS SHIFT HANDOVER
                </h1>
                <div className="text-xs text-slate-500 mt-1">
                  Department: <strong className="text-slate-800">{handover.department}</strong>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0 space-y-1">
                <span
                  className={`inline-block px-3 py-1 text-xs font-semibold rounded-md border ${getStatusBadge(
                    handover.generalStatus
                  )}`}
                >
                  Status: {handover.generalStatus}
                </span>
                <div className="text-xs text-slate-500">
                  Risk Level: <strong className="text-slate-800">{handover.riskLevel}</strong>
                </div>
              </div>
            </div>

            {/* Shift metadata grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-medium">Date</span>
                <span className="font-semibold text-slate-900">{handover.date}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-medium">Shift</span>
                <span className="font-semibold text-slate-900">{handover.shift} Shift</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-medium">Outgoing Lead</span>
                <span className="font-semibold text-slate-900">{handover.shiftLead}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-medium">Incoming Shift</span>
                <span className="font-semibold text-slate-900">{handover.incomingShift}</span>
              </div>
            </div>
          </div>

          {/* 1. EXECUTIVE SUMMARY */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
              Executive Summary
            </h2>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
              {handover.executiveSummary}
            </div>
          </div>

          {/* 2. PERFORMANCE OVERVIEW */}
          {handover.metrics && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
                Performance Overview
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold">Throughput</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {handover.metrics.actual || 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-500">Plan: {handover.metrics.target || 'N/A'}</div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold">Backlog</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {handover.metrics.backlog || '0'}
                  </div>
                  <div className="text-[10px] text-slate-500">Staging queue</div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold">Downtime</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {handover.metrics.downtime || '0 min'}
                  </div>
                  <div className="text-[10px] text-slate-500">Total stops</div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold">Quality</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {handover.metrics.quality || 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-500">First-pass yield</div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold">Staffing</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {handover.metrics.staffing ? handover.metrics.staffing.split(' ')[0] : 'Full'}
                  </div>
                  <div className="text-[10px] text-slate-500">Roster fill rate</div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold">Safety</div>
                  <div className="text-xs font-semibold text-emerald-700 mt-1 line-clamp-2">
                    {handover.metrics.safetyObservations || '0 incidents'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. SHIFT CONTINUITY: CARRIED OVER ITEMS */}
          {handover.carriedOverIssues && handover.carriedOverIssues.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Carried Over From Previous Shift ({handover.carriedOverIssues.length})
                </h2>
                <span className="text-[11px] text-slate-500">Inter-shift continuity audit</span>
              </div>

              <div className="space-y-2">
                {handover.carriedOverIssues.map(co => (
                  <div
                    key={co.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{co.title}</span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Category: {co.category} · Source: {co.originalShiftDate || 'Preceding Shift'}
                        {co.resolutionNotes && (
                          <span className="text-slate-700 font-medium ml-2">
                            — Update: {co.resolutionNotes}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold self-start sm:self-auto ${
                        co.status === 'Resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : co.status === 'Escalated'
                          ? 'bg-rose-100 text-rose-800'
                          : co.status === 'Monitoring'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {co.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. KEY ISSUES */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Key Issues Identified ({(handover.issues || []).length})
              </h2>
              <span className="text-[11px] text-slate-400">Classified by severity</span>
            </div>

            <div className="space-y-3">
              {(handover.issues || []).map((issue, idx) => (
                <div
                  key={issue.id || idx}
                  className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {issue.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                            issue.severity === 'Critical'
                              ? 'bg-rose-100 text-rose-800'
                              : issue.severity === 'High'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {issue.severity}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                        <span>Category: {issue.category}</span>
                        <span>·</span>
                        <span>Area: {issue.area}</span>
                        <span>·</span>
                        <span>Time: {issue.timeObserved || 'Mid-shift'}</span>
                        <span>·</span>
                        <span>Status: <strong className="text-slate-800">{issue.status}</strong></span>
                      </div>
                    </div>

                    <button
                      onClick={() => onAddActionFromIssue(issue.title, handover.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors self-start shrink-0 no-print"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Track Action</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">{issue.description}</p>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 space-y-1">
                    <div>
                      <strong className="text-slate-900">Action Taken: </strong>
                      <span>{issue.actionTaken || 'None recorded'}</span>
                    </div>
                    <div>
                      <strong className="text-slate-900">Recommended Next Action: </strong>
                      <span>{issue.recommendedAction || 'Monitor during next shift'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. ACTIONS COMPLETED & OUTSTANDING ITEMS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Actions Completed</span>
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {(handover.completedActions || []).map((act, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Outstanding Items</span>
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {(handover.outstandingItems || []).map((out, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{out}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 6. RISKS FOR NEXT SHIFT & NEXT-SHIFT PRIORITIES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>Risks for Incoming Shift</span>
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {(handover.risks || []).map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-500 font-semibold">⚠</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Next-Shift Priorities</span>
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {(handover.nextShiftPriorities || []).map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-indigo-600 font-bold">{i + 1}.</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 7. RECOMMENDED FOLLOW-UPS */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recommended Follow-Ups (AI Suggestions · Review Required)</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {(handover.recommendations || []).map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-indigo-500 font-medium">→</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 8. POSITIVE OUTCOMES & ESCALATIONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Positive Outcomes / Wins
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {(handover.positiveOutcomes || []).map((pos, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-semibold">★</span>
                    <span>{pos}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Items Requiring Escalation
              </h3>
              {(handover.escalations || []).length > 0 ? (
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {handover.escalations.map((esc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-rose-600 font-semibold">!</span>
                      <span>{esc}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-500">
                  No leadership escalations active for this shift.
                </div>
              )}
            </div>
          </div>

          {/* Verification / Signature Section for Print Layout */}
          <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-600">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Outgoing Shift Lead Sign-off</div>
              <div className="mt-4 pt-2 border-t border-slate-300 font-medium text-slate-900">
                {handover.shiftLead}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Incoming Shift Lead Acknowledgment</div>
              <div className="mt-4 pt-2 border-t border-slate-300 font-medium text-slate-900">
                {handover.incomingShift}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 no-print shrink-0">
          <span>AI-generated analysis reviewed by operations professional</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
