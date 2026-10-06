import React from 'react';
import {
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Layers,
  Sparkles,
  FileText,
} from 'lucide-react';
import { HandoverReport, ActionItem } from '../types';

interface DashboardViewProps {
  handovers: HandoverReport[];
  actions: ActionItem[];
  onNewHandoverClick: () => void;
  onSelectHandover: (handover: HandoverReport) => void;
  onNavigateToActions: () => void;
  onNavigateToHistory: () => void;
  onOpenBriefModal: (handover: HandoverReport) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  handovers,
  actions,
  onNewHandoverClick,
  onSelectHandover,
  onNavigateToActions,
  onNavigateToHistory,
  onOpenBriefModal,
}) => {
  const currentHandover = handovers[0];

  // Calculated metrics
  const totalOpenIssues = handovers.reduce((acc, h) => {
    const openInHandover = (h.issues || []).filter(i =>
      ['Open', 'Partially Resolved', 'Monitoring', 'Escalated'].includes(i.status)
    ).length;
    return acc + openInHandover;
  }, 0);

  const criticalIssuesCount = handovers.reduce((acc, h) => {
    const crit = (h.issues || []).filter(i => i.severity === 'Critical' || i.severity === 'High').length;
    return acc + crit;
  }, 0);

  const pendingActions = actions.filter(a => a.status === 'Not Started' || a.status === 'In Progress' || a.status === 'Blocked');
  const completedActions = actions.filter(a => a.status === 'Completed');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Critical':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'Attention Required':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      default:
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Critical':
      case 'High':
        return 'text-rose-600 font-semibold';
      case 'Medium':
        return 'text-amber-600 font-medium';
      default:
        return 'text-slate-600 font-medium';
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner / Primary CTA */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Shift Handover Intelligence</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Operational Handover Command Center
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Synthesize unstructured shift notes, verify cross-shift carryover continuity,
              and empower incoming leads with structured, factual operational intelligence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {currentHandover && (
              <button
                onClick={() => onOpenBriefModal(currentHandover)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Executive Brief</span>
              </button>
            )}
            <button
              onClick={onNewHandoverClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Handover</span>
            </button>
          </div>
        </div>

        {/* AI Disclaimer per safety requirements */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Decision-Support Mode: AI analysis requires human review before operational execution.
          </span>
          <span className="hidden sm:inline">Unbroken shift continuity active</span>
        </div>
      </div>

      {/* Primary KPI Grid (6 metrics required) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Current Shift */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Current Shift</div>
          <div className="mt-1 text-base font-semibold text-slate-900 truncate">
            {currentHandover ? currentHandover.shift : 'None logged'}
          </div>
          <div className="mt-1 text-xs text-slate-500 truncate">
            Lead: {currentHandover ? currentHandover.shiftLead.split(' ')[0] : 'N/A'}
          </div>
        </div>

        {/* 2. Open Issues */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Open Issues</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{totalOpenIssues}</div>
          <div className="mt-1 text-xs text-slate-500">Across active lines</div>
        </div>

        {/* 3. Critical Issues */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Critical Issues</div>
          <div className={`mt-1 text-xl font-bold ${criticalIssuesCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {criticalIssuesCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">Immediate attention</div>
        </div>

        {/* 4. Pending Actions */}
        <div
          onClick={onNavigateToActions}
          className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
            <span>Pending Actions</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </div>
          <div className="mt-1 text-xl font-bold text-amber-600">{pendingActions.length}</div>
          <div className="mt-1 text-xs text-slate-500">Assigned follow-ups</div>
        </div>

        {/* 5. Completed Actions */}
        <div
          onClick={onNavigateToActions}
          className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
            <span>Completed Actions</span>
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          </div>
          <div className="mt-1 text-xl font-bold text-emerald-600">{completedActions.length}</div>
          <div className="mt-1 text-xs text-slate-500">Resolved items</div>
        </div>

        {/* 6. Handover Status */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Handover Status</div>
          <div className="mt-1 text-sm font-semibold truncate text-slate-900">
            {currentHandover ? currentHandover.generalStatus : 'Normal'}
          </div>
          <div className="mt-1 text-xs text-slate-500 truncate">
            Risk: {currentHandover ? currentHandover.riskLevel : 'Low'}
          </div>
        </div>
      </div>

      {/* Latest Handover Deep Dive & Critical Follow-ups */}
      {currentHandover && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Handover Highlights */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>{currentHandover.date}</span>
                  <span aria-hidden="true">·</span>
                  <span>{currentHandover.shift} Shift</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-slate-800">{currentHandover.department}</span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 mt-1">
                  Active Shift Summary
                </h3>
              </div>
              <button
                onClick={() => onSelectHandover(currentHandover)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 self-start sm:self-auto"
              >
                <span>View Full Handover Report</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-700 leading-relaxed border border-slate-100">
              {currentHandover.executiveSummary}
            </div>

            {/* Performance KPIs row */}
            {currentHandover.metrics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-white rounded-lg border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Throughput</div>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">
                    {currentHandover.metrics.actual || 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Target: {currentHandover.metrics.target || 'N/A'}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Backlog</div>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">
                    {currentHandover.metrics.backlog || '0 units'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Staging Buffer</div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Downtime</div>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">
                    {currentHandover.metrics.downtime || '0 min'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Cumulative stops</div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-medium">Staffing</div>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">
                    {currentHandover.metrics.staffing ? currentHandover.metrics.staffing.split(' ')[0] : 'Full'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Attendance on floor</div>
                </div>
              </div>
            )}

            {/* Next Shift Priorities */}
            {currentHandover.nextShiftPriorities && currentHandover.nextShiftPriorities.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-slate-900 mb-2">
                  Immediate Kickoff Priorities for Incoming Shift
                </h4>
                <ul className="space-y-1.5">
                  {currentHandover.nextShiftPriorities.slice(0, 3).map((pri, idx) => (
                    <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="font-semibold text-indigo-600 shrink-0">{idx + 1}.</span>
                      <span>{pri}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Critical Open Issues & Risks */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Key Open Items</h3>
                </div>
                <span className="text-xs text-slate-500">
                  {(currentHandover.issues || []).length} logged
                </span>
              </div>

              <div className="mt-3 space-y-3">
                {(currentHandover.issues || []).slice(0, 3).map(issue => (
                  <div
                    key={issue.id}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                        {issue.title}
                      </h4>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                          issue.severity === 'Critical' || issue.severity === 'High'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {issue.severity}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      <span>{issue.category}</span>
                      <span className="mx-1">·</span>
                      <span>{issue.area}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 line-clamp-2">
                      {issue.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4">
              <button
                onClick={() => onSelectHandover(currentHandover)}
                className="w-full py-2 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-center transition-colors"
              >
                Review Handover & Follow-ups
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Handovers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Recent Operational Handovers</h3>
            <p className="text-xs text-slate-500 mt-0.5">Historical shift transitions and continuity records</p>
          </div>
          <button
            onClick={onNavigateToHistory}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            View All ({handovers.length})
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-5">Date & Shift</th>
                <th className="py-3 px-5">Department / Operational Area</th>
                <th className="py-3 px-4">Shift Lead</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Issues</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {handovers.slice(0, 5).map(handover => (
                <tr
                  key={handover.id}
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  onClick={() => onSelectHandover(handover)}
                >
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-slate-900">{handover.shift} Shift</div>
                    <div className="text-[11px] text-slate-500">{handover.date}</div>
                  </td>
                  <td className="py-3.5 px-5 font-medium text-slate-800">
                    {handover.department}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <div>{handover.shiftLead}</div>
                    <div className="text-[11px] text-slate-400">Incoming: {handover.incomingShift.split(' ')[0]}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 text-[11px] rounded-md font-medium border ${getStatusColor(
                        handover.generalStatus
                      )}`}
                    >
                      {handover.generalStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-medium">
                    {(handover.issues || []).length}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={getRiskColor(handover.riskLevel)}>
                      {handover.riskLevel}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onSelectHandover(handover);
                      }}
                      className="text-xs font-semibold text-slate-900 hover:text-indigo-600 inline-flex items-center gap-1"
                    >
                      <span>Review</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
