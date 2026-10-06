import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, Sparkles, ChevronRight, HelpCircle } from 'lucide-react';
import { QualityScoreSnapshot } from '../types';

interface QualityScoreMeterProps {
  scoreSnapshot: QualityScoreSnapshot;
  onImproveClick?: () => void;
  onSubmitAnywayClick?: () => void;
  hasCriticalUnassigned?: boolean;
}

export const QualityScoreMeter: React.FC<QualityScoreMeterProps> = ({
  scoreSnapshot,
  onImproveClick,
  onSubmitAnywayClick,
  hasCriticalUnassigned = false,
}) => {
  const [showWarningModal, setShowWarningModal] = useState(false);

  const getRatingBadge = (rating: QualityScoreSnapshot['rating']) => {
    switch (rating) {
      case 'Excellent':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Good':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'Fair':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-rose-50 text-rose-800 border-rose-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 75) return 'text-indigo-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-rose-600';
  };

  const handleInitialSubmitClick = () => {
    if (hasCriticalUnassigned || scoreSnapshot.score < 60) {
      setShowWarningModal(true);
    } else if (onSubmitAnywayClick) {
      onSubmitAnywayClick();
    }
  };

  return (
    <>
      <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`text-2xl font-black ${getScoreColor(scoreSnapshot.score)}`}>
              {scoreSnapshot.score}%
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">Handover Quality Score</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getRatingBadge(scoreSnapshot.rating)}`}>
                  {scoreSnapshot.rating}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Evaluates factual completeness for incoming shift accountability (non-blocking)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onImproveClick && scoreSnapshot.score < 90 && (
              <button
                type="button"
                onClick={onImproveClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Improve with ShiftFlow</span>
              </button>
            )}

            {onSubmitAnywayClick && (
              <button
                type="button"
                onClick={handleInitialSubmitClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <span>Submit Anyway</span>
              </button>
            )}
          </div>
        </div>

        {/* Missing elements & Coaching recommendations */}
        {scoreSnapshot.feedback && scoreSnapshot.feedback.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <HelpCircle className="w-3 h-3 text-slate-400" />
              <span>ShiftFlow Operational Coaching Tips:</span>
            </div>
            <ul className="space-y-1 text-xs text-slate-700">
              {scoreSnapshot.feedback.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Confirmation warning modal for emergency submissions */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Submit Handover with Missing Operational Information?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  This handover is currently scored at <strong>{scoreSnapshot.score}%</strong>. Important operational
                  context (such as assigned owners or next actions) may be unconfirmed.
                </p>
                {hasCriticalUnassigned && (
                  <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 font-medium">
                    ⚠️ A Critical or High severity issue has no assigned owner.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="px-3.5 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
              >
                Review & Improve
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWarningModal(false);
                  if (onSubmitAnywayClick) onSubmitAnywayClick();
                }}
                className="px-4 py-2 rounded-lg font-semibold text-white bg-slate-900 hover:bg-slate-800"
              >
                Confirm & Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
