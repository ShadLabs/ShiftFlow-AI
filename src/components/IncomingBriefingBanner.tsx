import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Layers,
  X,
} from 'lucide-react';
import { HandoverReport, OperationalIssue, OperationalAction, HandoverAcknowledgment } from '../types';
import { calculateHoursOpen, calculateShiftsCrossed } from '../utils/operationalMath';

interface IncomingBriefingBannerProps {
  handover: HandoverReport;
  inheritedIssues: OperationalIssue[];
  actionsDue: OperationalAction[];
  onAcceptHandover: (acknowledgment: HandoverAcknowledgment) => void;
  onNavigateToInbox?: () => void;
  onNavigateToActions?: () => void;
  supervisorName?: string;
}

export const IncomingBriefingBanner: React.FC<IncomingBriefingBannerProps> = ({
  handover,
  inheritedIssues,
  actionsDue,
  onAcceptHandover,
  onNavigateToInbox,
  onNavigateToActions,
  supervisorName = 'Incoming Lead',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [acknowledgerName, setAcknowledgerName] = useState(handover.incomingLead || supervisorName);
  const [ackNotes, setAckNotes] = useState('');

  const isAlreadyAcknowledged = handover.status === 'Acknowledged' && (handover.acknowledgment || (handover.acknowledgments && handover.acknowledgments.length > 0));

  const criticalAndHighIssues = inheritedIssues.filter(
    i => i.severity === 'Critical' || i.severity === 'High'
  );

  // Operational priority hierarchy for banner:
  // Critical -> Escalated -> High -> Medium -> Low (Oldest unresolved first)
  const getBannerPriorityScore = (issue: OperationalIssue): number => {
    if (issue.severity === 'Critical') return 100;
    if (issue.status === 'Escalated') return 80;
    if (issue.severity === 'High') return 60;
    if (issue.severity === 'Medium') return 40;
    return 20; // Low
  };

  const prioritizedInheritedIssues = [...inheritedIssues].sort((a, b) => {
    const diff = getBannerPriorityScore(b) - getBannerPriorityScore(a);
    if (diff !== 0) return diff;
    const timeA = new Date(a.firstIdentifiedAt || a.createdAt).getTime() || 0;
    const timeB = new Date(b.firstIdentifiedAt || b.createdAt).getTime() || 0;
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

  const previewIssues = prioritizedInheritedIssues.slice(0, 3);
  const overflowIssueCount = Math.max(0, inheritedIssues.length - 3);

  // Action prioritization: Overdue first -> Critical -> High -> Medium -> Low
  const now = Date.now();
  const getActionPriorityScore = (act: OperationalAction): number => {
    const dueTime = act.dueDateTime || act.dueTime;
    const isOverdue =
      act.status !== 'Completed' &&
      dueTime &&
      !isNaN(new Date(dueTime).getTime()) &&
      new Date(dueTime).getTime() < now;

    if (isOverdue) return 1000;
    if (act.priority === 'Critical') return 500;
    if (act.priority === 'High') return 400;
    if (act.priority === 'Medium') return 300;
    return 100; // Low
  };

  const prioritizedActions = [...actionsDue].sort((a, b) => {
    const diff = getActionPriorityScore(b) - getActionPriorityScore(a);
    if (diff !== 0) return diff;
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

  const previewActions = prioritizedActions.slice(0, 3);
  const overflowActionCount = Math.max(0, actionsDue.length - 3);

  const handleConfirmAcceptance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acknowledgerName.trim()) return;

    const ack: HandoverAcknowledgment = {
      id: `ack-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      handoverId: handover.id,
      acknowledgedBy: acknowledgerName.trim(),
      acknowledgedAt: new Date().toISOString(),
      acknowledgedShiftId: handover.incomingShift,
      handoverVersion: handover.version || 1,
      notes: ackNotes.trim() || undefined,
      inheritedIssueCount: inheritedIssues.length,
      inheritedActionCount: actionsDue.length,
    };

    onAcceptHandover(ack);
    setIsModalOpen(false);
  };

  const getSeverityBadge = (s: string) => {
    switch (s) {
      case 'Critical':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'High':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
      {/* Top Banner Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
            <Layers className="w-3.5 h-3.5" />
            <span>Operational Chain of Custody</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
            Incoming Shift Transition: {handover.incomingShift}
          </h2>
          <p className="text-xs text-slate-500">
            Outgoing Lead: <strong className="text-slate-800">{handover.shiftLead}</strong> ({handover.shift} Shift) · Area: <strong className="text-slate-800">{handover.department}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAlreadyAcknowledged ? (
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  Accepted by {handover.acknowledgment?.acknowledgedBy}
                  {Array.isArray(handover.acknowledgments) && handover.acknowledgments.length > 1
                    ? ` (${handover.acknowledgments.length} custody events)`
                    : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
              >
                + Additional Sign-off
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Accept Handover & Assume Responsibility</span>
            </button>
          )}
        </div>
      </div>

      {/* "Here's what you inherited" section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
        {/* Left Column: Inherited Issues requiring attention */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>What is still wrong / Needs attention ({inheritedIssues.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              {criticalAndHighIssues.length} high priority
            </span>
          </div>

          {inheritedIssues.length === 0 ? (
            <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Zero unresolved issues inherited from the previous shift. Clean operational handoff.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {previewIssues.map(issue => {
                const aging = calculateHoursOpen(issue);
                const shiftsCrossed = calculateShiftsCrossed(issue);

                return (
                  <div
                    key={issue.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getSeverityBadge(issue.severity)}`}>
                          {issue.severity}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{issue.title}</h4>
                      </div>
                      <span className="text-[11px] text-slate-500 shrink-0 font-medium">
                        Open {aging.formatted} ({shiftsCrossed} shift{shiftsCrossed > 1 ? 's' : ''})
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-3">
                      <span>Area: <strong className="text-slate-800">{issue.area}</strong></span>
                      <span>·</span>
                      <span>Owner: <strong className="text-slate-800">{issue.owner || 'Unassigned'}</strong></span>
                      {issue.operationalImpact && (
                        <>
                          <span>·</span>
                          <span className="text-amber-800 font-medium">{issue.operationalImpact}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {overflowIssueCount > 0 && (
                <div className="p-2.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    + {overflowIssueCount} more inherited issue{overflowIssueCount > 1 ? 's' : ''}
                  </span>
                  {onNavigateToInbox && (
                    <button
                      type="button"
                      onClick={onNavigateToInbox}
                      className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer text-[11px]"
                    >
                      <span>View in Operations Inbox</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Actions Due during this incoming shift */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Actions Due This Shift ({actionsDue.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400">Assigned work orders</span>
          </div>

          {actionsDue.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
              No pending actions scheduled for this upcoming shift window.
            </div>
          ) : (
            <div className="space-y-2">
              {previewActions.map(action => (
                <div
                  key={action.id}
                  className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900">{action.title || action.action}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Owner: <strong className="text-slate-700">{action.owner}</strong></span>
                      <span>·</span>
                      <span>Target: <strong className="text-slate-700">{action.dueTime || action.dueDateTime}</strong></span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                    action.priority === 'Critical' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {action.priority}
                  </span>
                </div>
              ))}

              {overflowActionCount > 0 && (
                <div className="p-2.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    + {overflowActionCount} more action{overflowActionCount > 1 ? 's' : ''} scheduled
                  </span>
                  {onNavigateToActions && (
                    <button
                      type="button"
                      onClick={onNavigateToActions}
                      className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer text-[11px]"
                    >
                      <span>View in Action Tracker</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Formal Shift Handover Acknowledgment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Accept Shift Handover & Chain of Custody
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              By accepting this handover, you confirm receipt of <strong>{inheritedIssues.length} inherited issues</strong> and <strong>{actionsDue.length} active follow-up actions</strong> for {handover.incomingShift}.
            </p>

            {Array.isArray(handover.acknowledgments) && handover.acknowledgments.length > 0 && (
              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs space-y-1.5">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chain of Custody Log ({handover.acknowledgments.length} record{handover.acknowledgments.length > 1 ? 's' : ''}):</span>
                </div>
                <div className="space-y-1">
                  {handover.acknowledgments.map((ack, idx) => (
                    <div key={ack.id || idx} className="text-[11px] text-emerald-800 flex items-center justify-between">
                      <span>✓ <strong>{ack.acknowledgedBy}</strong> ({ack.acknowledgedShiftId})</span>
                      <span className="text-emerald-600">{new Date(ack.acknowledgedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleConfirmAcceptance} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Incoming Shift Supervisor Name *
                </label>
                <input
                  type="text"
                  required
                  value={acknowledgerName}
                  onChange={e => setAcknowledgerName(e.target.value)}
                  placeholder="e.g. David Chen"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-600 text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Acknowledgment Notes or Acceptance Constraints (Optional)
                </label>
                <textarea
                  rows={2}
                  value={ackNotes}
                  onChange={e => setAckNotes(e.target.value)}
                  placeholder="e.g. Acknowledged Diverter 4 monitoring; requested second technician for 23:00 valve swap."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
                <div>Timestamp: <strong>{new Date().toLocaleTimeString()} ({new Date().toLocaleDateString()})</strong></div>
                <div>Handover Version: <strong>v{handover.version || 1}</strong></div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                >
                  Confirm & Accept Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
