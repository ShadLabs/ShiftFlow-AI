import React from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Layers,
  FileText,
  Activity,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { RecurringIssuePattern, TemporaryInterventionPattern } from '../types/intelligence';
import { OperationalIssue, HandoverReport } from '../types';

interface PatternEvidenceModalProps {
  pattern: RecurringIssuePattern | TemporaryInterventionPattern | null;
  issues: OperationalIssue[];
  handovers: HandoverReport[];
  onClose: () => void;
  onSelectIssue?: (issue: OperationalIssue) => void;
}

export const PatternEvidenceModal: React.FC<PatternEvidenceModalProps> = ({
  pattern,
  issues,
  handovers,
  onClose,
  onSelectIssue,
}) => {
  if (!pattern) return null;

  const isRecurring = 'problemSignature' in pattern;
  const evidence = pattern.evidence;

  // Resolve linked issue objects
  const linkedIssues = issues.filter(i => evidence.issueIds.includes(i.id));

  // Resolve linked handover objects
  const linkedHandovers = handovers.filter(h => evidence.handoverIds.includes(h.id));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                isRecurring && (pattern as RecurringIssuePattern).confidence === 'High'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-indigo-100 text-indigo-800'
              }`}>
                {isRecurring ? `${(pattern as RecurringIssuePattern).confidence} Confidence Pattern` : 'Intervention Pattern'}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Pattern ID: <code className="font-mono text-slate-700">{pattern.id}</code>
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {pattern.equipmentName || pattern.department} Evidence Trace
            </h2>
            <p className="text-xs text-slate-500">
              Complete verifiable audit trail linking this derived pattern back to canonical operational records.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Summary Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Distinct Issues</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {evidence.occurrenceCount}
              </div>
              <div className="text-[10px] text-slate-500">Canonical records</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Shifts Affected</div>
              <div className="text-xl font-bold text-indigo-600 mt-0.5">
                {evidence.shiftsAffectedCount}
              </div>
              <div className="text-[10px] text-slate-500">Cross-shift continuity</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Total Downtime</div>
              <div className="text-xl font-bold text-rose-600 mt-0.5">
                {evidence.totalRecordedDowntimeMinutes}m
              </div>
              <div className="text-[10px] text-slate-500">Deduplicated stop time</div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Linked Events</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {evidence.eventIds.length}
              </div>
              <div className="text-[10px] text-slate-500">Immutable store events</div>
            </div>
          </div>

          {/* Recommended Investigation */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Recommended Engineering Investigation</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              {pattern.recommendedInvestigation}
            </p>
          </div>

          {/* Canonical Issues Evidence */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Canonical Issues ({linkedIssues.length})</span>
              </h3>
              <span className="text-[11px] text-slate-500">Each represents a separate operational occurrence</span>
            </div>

            <div className="space-y-2">
              {linkedIssues.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                  No direct issue matches in current filter (historical records archived).
                </div>
              ) : (
                linkedIssues.map(iss => (
                  <div
                    key={iss.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-100 text-slate-700 font-mono">
                          {iss.id}
                        </span>
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                          iss.status === 'Resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : iss.status === 'Escalated'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {iss.status}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Identified: {new Date(iss.firstIdentifiedAt || iss.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900">{iss.title}</div>
                      {iss.actionTaken && (
                        <div className="text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-700">Action Taken:</span> {iss.actionTaken}
                        </div>
                      )}
                    </div>

                    {onSelectIssue && (
                      <button
                        onClick={() => {
                          onClose();
                          onSelectIssue(iss);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors self-start sm:self-auto shrink-0"
                      >
                        <span>Audit Lifecycle</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Timeline Summary & Observed Interventions */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>Evidence Event Timeline</span>
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
              {evidence.timelineSummary.length === 0 ? (
                <div className="p-4 text-center text-slate-500">
                  No chronological events logged.
                </div>
              ) : (
                evidence.timelineSummary.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{item.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>{item.shift}</span>
                        <span>·</span>
                        <span className="font-mono">{item.eventType}</span>
                        {item.issueId && (
                          <>
                            <span>·</span>
                            <span className="text-indigo-600 font-mono">{item.issueId}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Linked Handovers */}
          {linkedHandovers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Shift Handovers Carrying This Pattern</span>
              </h3>

              <div className="flex flex-wrap gap-2">
                {linkedHandovers.map(h => (
                  <span
                    key={h.id}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium"
                  >
                    {h.shift} ({h.date}) — Lead: {h.shiftLead}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Deduplicated canonical records • Zero synthetic artifacts
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            Close Evidence Trace
          </button>
        </div>
      </div>
    </div>
  );
};
