import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Search,
  ArrowRight,
  ShieldAlert,
  Layers,
  ChevronRight,
  User,
  CheckSquare,
  Wrench,
  Check,
  Plus,
  RefreshCw,
  AlertOctagon,
} from 'lucide-react';
import { OperationalIssue, OperationalAction, HandoverReport, IssueStatus } from '../types';
import { calculateHoursOpen, calculateShiftsCrossed } from '../utils/operationalMath';
import { calculateAgingSignals, detectRecurringIssuePatterns } from '../utils/intelligenceEngine';
import { getOperationalEvents } from '../utils/eventStore';
import { RecurringIssuePattern, IssueAgingSignal } from '../types/intelligence';
import { PatternEvidenceModal } from './PatternEvidenceModal';

interface OperationsInboxViewProps {
  issues: OperationalIssue[];
  actions: OperationalAction[];
  handovers: HandoverReport[];
  onSelectIssue: (issue: OperationalIssue) => void;
  onResolveIssue: (issueId: string, resolvedBy: string, notes: string) => void;
  onUpdateIssueStatus: (issueId: string, status: IssueStatus) => void;
  onNewActionForIssue: (issueId: string, title: string) => void;
}

export const OperationsInboxView: React.FC<OperationsInboxViewProps> = ({
  issues,
  actions,
  handovers,
  onSelectIssue,
  onResolveIssue,
  onUpdateIssueStatus,
  onNewActionForIssue,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'needs-attention' | 'carried' | 'overdue' | 'escalated' | 'resolved'>('needs-attention');
  const [searchTerm, setSearchTerm] = useState('');
  const [resolvingIssueId, setResolvingIssueId] = useState<string | null>(null);
  const [resolverName, setResolverName] = useState('Shift Supervisor');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [inspectingPattern, setInspectingPattern] = useState<RecurringIssuePattern | null>(null);

  // Derived intelligence for inbox issues
  const events = getOperationalEvents();
  const agingSignalsMap = useMemo(() => {
    const signals = calculateAgingSignals(issues, actions, events);
    const map = new Map<string, IssueAgingSignal>();
    signals.forEach(s => map.set(s.issueId, s));
    return map;
  }, [issues, actions, events.length]);

  const recurringPatterns = useMemo(() => {
    return detectRecurringIssuePatterns(issues, events, handovers);
  }, [issues, events.length, handovers.length]);

  // Identify overdue actions
  const now = Date.now();
  const overdueActionIds = new Set(
    actions
      .filter(a => {
        if (a.status === 'Completed') return false;
        if (!a.dueTime && !a.dueDateTime) return false;
        const due = new Date(a.dueDateTime || a.dueTime).getTime();
        return !isNaN(due) && due < now;
      })
      .map(a => a.id)
  );

  const filteredIssues = issues.filter(issue => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      issue.title.toLowerCase().includes(searchLower) ||
      issue.area.toLowerCase().includes(searchLower) ||
      (issue.owner || '').toLowerCase().includes(searchLower) ||
      (issue.operationalImpact || '').toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    const shiftsCrossed = calculateShiftsCrossed(issue, handovers);

    switch (filterMode) {
      case 'needs-attention':
        return issue.status !== 'Resolved' && (issue.severity === 'Critical' || issue.severity === 'High');
      case 'carried':
        return issue.status !== 'Resolved' && shiftsCrossed > 1;
      case 'overdue':
        return (issue.actionIds || []).some(id => overdueActionIds.has(id));
      case 'escalated':
        return issue.status === 'Escalated';
      case 'resolved':
        return issue.status === 'Resolved';
      default:
        return true;
    }
  });

  // Deterministic operational priority hierarchy:
  // 1. Critical + overdue action
  // 2. Escalated + overdue action
  // 3. Critical
  // 4. Escalated
  // 5. High + overdue action
  // 6. High
  // 7. Medium + overdue action
  // 8. Aging unresolved issues (carried across > 1 shift or open >= 8 hours)
  // 9. Remaining active issues
  // 10. Resolved issues when Resolved filter is selected
  const getOperationalPriorityScore = (issue: OperationalIssue): number => {
    if (issue.status === 'Resolved') return 0;

    const hasOverdue = (issue.actionIds || []).some(id => overdueActionIds.has(id));
    const isCritical = issue.severity === 'Critical';
    const isEscalated = issue.status === 'Escalated';
    const isHigh = issue.severity === 'High';
    const isMedium = issue.severity === 'Medium';

    if (isCritical && hasOverdue) return 1000; // 1. Critical + overdue
    if (isEscalated && hasOverdue) return 900;  // 2. Escalated + overdue
    if (isCritical) return 800;                 // 3. Critical
    if (isEscalated) return 700;               // 4. Escalated
    if (isHigh && hasOverdue) return 600;      // 5. High + overdue
    if (isHigh) return 500;                    // 6. High
    if (isMedium && hasOverdue) return 400;    // 7. Medium + overdue

    // 8. Aging unresolved issues
    const shiftsCrossed = calculateShiftsCrossed(issue, handovers);
    const hoursOpen = calculateHoursOpen(issue).hours;
    if (shiftsCrossed > 1 || hoursOpen >= 8) return 300;

    // 9. Remaining active issues
    return 200;
  };

  const sortedIssues = [...filteredIssues].sort((a, b) => {
    const scoreDiff = getOperationalPriorityScore(b) - getOperationalPriorityScore(a);
    if (scoreDiff !== 0) return scoreDiff;

    // Tie-breaker: oldest unresolved first (earliest identified timestamp)
    const timeA = new Date(a.firstIdentifiedAt || a.createdAt).getTime() || 0;
    const timeB = new Date(b.firstIdentifiedAt || b.createdAt).getTime() || 0;
    if (timeA !== timeB) return timeA - timeB;

    // Final deterministic tie-breaker
    return a.id.localeCompare(b.id);
  });

  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingIssueId) return;
    onResolveIssue(resolvingIssueId, resolverName, resolutionSummary);
    setResolvingIssueId(null);
    setResolutionSummary('');
  };

  const getSeverityStyle = (s: string) => {
    switch (s) {
      case 'Critical':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'High':
        return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'Medium':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      default:
        return 'text-slate-600 bg-slate-100 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Purpose Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
            <Layers className="w-3.5 h-3.5" />
            <span>Operations Triage</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
            Operations Inbox
          </h2>
          <p className="text-xs text-slate-500">
            Active disruptions brought directly to your attention. Zero problems lost across shifts.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-200">
            {issues.filter(i => i.status !== 'Resolved').length} Active Issues
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 font-semibold border border-rose-200">
            {issues.filter(i => i.status !== 'Resolved' && (i.severity === 'Critical' || i.severity === 'High')).length} Needs Attention
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search problems, stations, owners..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-600 bg-slate-50/50"
          />
        </div>

        {/* Operational Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs w-full md:w-auto overflow-x-auto">
          {[
            { id: 'needs-attention', label: 'Needs Attention' },
            { id: 'carried', label: 'Carried Across Shifts' },
            { id: 'escalated', label: 'Escalated' },
            { id: 'overdue', label: 'Overdue Actions' },
            { id: 'all', label: 'All Open' },
            { id: 'resolved', label: 'Resolved' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id as any)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors shrink-0 ${
                filterMode === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inbox Items Feed */}
      <div className="space-y-3">
        {sortedIssues.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500 shadow-xs space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <div className="font-semibold text-slate-800 text-sm">No issues matching this filter</div>
            <p className="max-w-md mx-auto text-slate-500">
              Operations in this category are running smoothly without unresolved blockers.
            </p>
          </div>
        ) : (
          sortedIssues.map(issue => {
            const aging = calculateHoursOpen(issue);
            const shiftsCrossed = calculateShiftsCrossed(issue, handovers);
            const childActions = actions.filter(a => a.issueId === issue.id);
            const isResolved = issue.status === 'Resolved';
            const agingSignal = agingSignalsMap.get(issue.id);
            const matchingPattern = recurringPatterns.find(p => p.evidence.issueIds.includes(issue.id));

            return (
              <div
                key={issue.id}
                className={`bg-white rounded-xl border p-5 shadow-xs transition-all space-y-3 ${
                  issue.severity === 'Critical'
                    ? 'border-rose-300'
                    : issue.severity === 'High'
                    ? 'border-slate-300'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border uppercase tracking-wider ${getSeverityStyle(issue.severity)}`}>
                        {issue.severity}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        {issue.category}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs font-semibold text-slate-700">
                        {issue.area}
                      </span>

                      {/* Aging Badge */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        Open {aging.formatted}
                      </span>

                      {shiftsCrossed > 1 && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          shiftsCrossed >= 3 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          Carried across {shiftsCrossed} shifts
                        </span>
                      )}

                      {/* Multi-Signal Aging Indicator */}
                      {agingSignal && agingSignal.primarySignal !== 'Normal' && !isResolved && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            agingSignal.primarySignal === 'Escalated Without Progress'
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : agingSignal.primarySignal === 'Repeated Carry-Over'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : agingSignal.primarySignal === 'Action Stalled'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : agingSignal.primarySignal === 'No Progress'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : agingSignal.primarySignal === 'Long Running'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {agingSignal.primarySignal}
                        </span>
                      )}

                      {/* Recurring Pattern Intelligence Badge */}
                      {matchingPattern && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setInspectingPattern(matchingPattern);
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                            matchingPattern.confidence === 'High'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                          }`}
                          title="Click to inspect cross-shift recurring pattern evidence"
                        >
                          <AlertOctagon className="w-3 h-3" />
                          <span>Recurring Pattern ({matchingPattern.confidence})</span>
                        </button>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 pt-0.5">
                      {issue.title}
                    </h3>

                    {issue.operationalImpact && (
                      <div className="text-xs text-amber-900 font-medium">
                        Impact: {issue.operationalImpact}
                      </div>
                    )}
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    {!isResolved && (
                      <>
                        {issue.status !== 'Escalated' && (
                          <button
                            type="button"
                            onClick={() => onUpdateIssueStatus(issue.id, 'Escalated')}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                          >
                            Escalate
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setResolvingIssueId(issue.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Resolve Issue</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {issue.description}
                </p>

                {/* Sub-Actions belonging to this issue */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3 text-slate-600">
                    <span>Owner: <strong className="text-slate-800">{issue.owner || 'Unassigned'}</strong></span>
                    {issue.contactPerson && (
                      <>
                        <span>·</span>
                        <span>Contact: <strong className="text-slate-800">{issue.contactPerson}</strong></span>
                      </>
                    )}
                    <span>·</span>
                    <span>Status: <strong className="text-slate-800">{issue.status}</strong></span>
                    <span>·</span>
                    <span className="font-medium text-indigo-700">
                      {childActions.length} Action{childActions.length === 1 ? '' : 's'} Linked
                    </span>
                  </div>

                  {childActions.length > 0 && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      {childActions.map(act => (
                        <span
                          key={act.id}
                          className={`px-2 py-0.5 rounded font-medium ${
                            act.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {act.status === 'Completed' ? '✓' : '○'} {act.title.slice(0, 24)}...
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Resolve Issue with Accountability */}
      {resolvingIssueId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Resolve Operational Issue</h3>
            <p className="text-xs text-slate-600">
              Record final resolution summary. This will close all child actions and prevent further carry-over.
            </p>

            <form onSubmit={handleConfirmResolve} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Resolved By (Your Name) *</label>
                <input
                  type="text"
                  required
                  value={resolverName}
                  onChange={e => setResolverName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Resolution Summary *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Technician replaced pneumatic solenoid valve. Station cycle tested 100 times with zero latency."
                  value={resolutionSummary}
                  onChange={e => setResolutionSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setResolvingIssueId(null)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pattern Evidence Modal */}
      {inspectingPattern && (
        <PatternEvidenceModal
          pattern={inspectingPattern}
          issues={issues}
          handovers={handovers}
          onClose={() => setInspectingPattern(null)}
          onSelectIssue={onSelectIssue}
        />
      )}
    </div>
  );
};
