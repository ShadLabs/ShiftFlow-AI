import React, { useMemo } from 'react';
import {
  X,
  Clock,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Wrench,
  User,
  ArrowRight,
  Activity,
  CheckSquare,
  Building2,
  Calendar,
  Share2,
} from 'lucide-react';
import { OperationalIssue, OperationalAction, HandoverReport } from '../types';
import { getEventsForIssue } from '../utils/eventStore';
import { calculateHoursOpen, calculateShiftsCrossed } from '../utils/operationalMath';

interface IssueHistoryModalProps {
  issue: OperationalIssue | null;
  actions: OperationalAction[];
  handovers: HandoverReport[];
  onClose: () => void;
  onSelectHandover?: (handover: HandoverReport) => void;
}

export const IssueHistoryModal: React.FC<IssueHistoryModalProps> = ({
  issue,
  actions,
  handovers,
  onClose,
  onSelectHandover,
}) => {
  if (!issue) return null;

  // Retrieve canonical events for this issue
  const events = useMemo(() => {
    return getEventsForIssue(issue.id).sort((a, b) => {
      // Oldest first for narrative understanding
      const timeA = new Date(a.occurredAt || 0).getTime();
      const timeB = new Date(b.occurredAt || 0).getTime();
      return timeA - timeB;
    });
  }, [issue.id]);

  const hoursOpen = calculateHoursOpen(issue);
  const shiftsCrossed = calculateShiftsCrossed(issue, handovers);

  // Attached actions
  const attachedActions = actions.filter(
    a => a.issueId === issue.id || (issue.actionIds || []).includes(a.id)
  );

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

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'Resolved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Escalated':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Monitoring':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
              <Activity className="w-3.5 h-3.5" />
              <span>Canonical Issue Lifecycle & Multi-Shift Audit</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">{issue.title}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
              <span>Area: <strong className="text-slate-800">{issue.area}</strong></span>
              <span>·</span>
              <span>Dept: <strong className="text-slate-800">{issue.department}</strong></span>
              <span>·</span>
              <span>Owner: <strong className="text-slate-800">{issue.owner || 'Unassigned'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${getSeverityBadge(issue.severity)}`}>
              {issue.severity}
            </span>
            <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${getStatusBadge(issue.status)}`}>
              {issue.status}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Operational Aging Strip */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">First Identified</span>
            <span className="font-bold text-slate-900">
              {new Date(issue.firstIdentifiedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
              {new Date(issue.firstIdentifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Operational Age</span>
            <span className="font-bold text-slate-900">{hoursOpen.formatted}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Shifts Crossed</span>
            <span className="font-bold text-slate-900">
              {shiftsCrossed} shift{shiftsCrossed > 1 ? 's' : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Recorded Events</span>
            <span className="font-bold text-slate-900">{events.length} lifecycle transitions</span>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description & Impact */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div>
              <span className="font-bold text-slate-800">Operational Description: </span>
              <span className="text-slate-700 leading-relaxed">{issue.description}</span>
            </div>
            {issue.operationalImpact && (
              <div>
                <span className="font-bold text-rose-800">Operational Impact: </span>
                <span className="text-rose-900 font-medium">{issue.operationalImpact}</span>
              </div>
            )}
            {issue.resolutionSummary && (
              <div className="pt-2 border-t border-slate-200">
                <span className="font-bold text-emerald-800">Resolution Summary: </span>
                <span className="text-emerald-900">{issue.resolutionSummary}</span>
                {issue.resolvedBy && (
                  <span className="text-slate-500 ml-2">— Verified by {issue.resolvedBy}</span>
                )}
              </div>
            )}
          </div>

          {/* Attached Work Orders / Actions */}
          {attachedActions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                <span>Linked Operational Work Orders ({attachedActions.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {attachedActions.map(action => (
                  <div
                    key={action.id}
                    className="p-3 rounded-lg border border-slate-200 bg-white space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 truncate">
                        {action.title || action.action}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          action.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {action.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Owner: <strong>{action.owner}</strong></span>
                      <span>Target: {action.dueTime || action.dueDateTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chronological Lifecycle Timeline */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Chronological Event History (Narrative Order: Oldest → Newest)</span>
            </h3>

            {events.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                No state transition events recorded for this issue yet.
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-indigo-200 space-y-4">
                {events.map((ev, idx) => {
                  const occurredDate = new Date(ev.occurredAt || 0);

                  return (
                    <div key={ev.id || idx} className="relative group">
                      {/* Node Dot */}
                      <div className="absolute -left-[31px] top-1 p-1 rounded-full bg-white border-2 border-indigo-500 shadow-2xs">
                        <div className="w-2 h-2 rounded-full bg-indigo-600" />
                      </div>

                      {/* Event Row */}
                      <div className="p-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 transition-colors space-y-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-slate-900">
                              {occurredDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                              {occurredDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-slate-100 text-slate-700">
                              {ev.eventType || ev.category}
                            </span>
                            {ev.severity && ev.severity !== 'Normal' && (
                              <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${getSeverityBadge(ev.severity)}`}>
                                {ev.severity}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500">
                            By: <strong className="text-slate-800">{ev.recordedBy}</strong>
                          </div>
                        </div>

                        <div className="font-semibold text-slate-900">{ev.title}</div>

                        {ev.description && (
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {ev.description}
                          </p>
                        )}

                        {/* Transition delta if available */}
                        {(ev.previousValue || ev.newValue) && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-600">
                            <span>{ev.previousValue || 'Initial'}</span>
                            <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                            <strong className="text-slate-900">{ev.newValue}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Immutable operational state history</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
