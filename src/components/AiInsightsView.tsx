import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Layers,
  RefreshCw,
  CheckCircle2,
  BarChart3,
  ShieldCheck,
  Building2,
  Clock,
} from 'lucide-react';
import { HandoverReport, OperationalInsights } from '../types';
import { fetchOperationalInsights } from '../services/aiService';

interface AiInsightsViewProps {
  handovers: HandoverReport[];
}

export const AiInsightsView: React.FC<AiInsightsViewProps> = ({ handovers }) => {
  const [insights, setInsights] = useState<OperationalInsights | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    if (handovers.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchOperationalInsights(handovers);
      setInsights(data);
    } catch (err: any) {
      console.warn('Insights error:', err);
      setError(err.message || 'Unable to retrieve insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [handovers.length]);

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cross-Shift Intelligence Engine</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
            Operational Trends & Recurring Root Causes
          </h2>
          <p className="text-xs text-slate-500">
            Synthesized across {handovers.length} shifts to detect recurring friction, equipment bottlenecks, and process drift
          </p>
        </div>

        <button
          onClick={fetchInsights}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {loading && (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
          <span>Gemini analyzing historical patterns across shift handovers...</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {insights && !loading && (
        <div className="space-y-6">
          {/* Health Score & Status Distribution */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="text-[11px] font-medium text-slate-500">Facility Health Score</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {insights.shiftStatusSummary.healthScorePct}%
              </div>
              <div className="mt-1 text-xs text-emerald-600 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                <span>Steady-state stability rate</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="text-[11px] font-medium text-slate-500">Normal Shifts</div>
              <div className="mt-1 text-2xl font-bold text-emerald-600">
                {insights.shiftStatusSummary.normalCount}
              </div>
              <div className="mt-1 text-xs text-slate-500">Target met without stop</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="text-[11px] font-medium text-slate-500">Attention Required</div>
              <div className="mt-1 text-2xl font-bold text-amber-600">
                {insights.shiftStatusSummary.attentionCount}
              </div>
              <div className="mt-1 text-xs text-slate-500">Backlog surge or minor stops</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="text-[11px] font-medium text-slate-500">Critical Incidents</div>
              <div className="mt-1 text-2xl font-bold text-rose-600">
                {insights.shiftStatusSummary.criticalCount}
              </div>
              <div className="mt-1 text-xs text-slate-500">High severity stops</div>
            </div>
          </div>

          {/* Two-Column: Category Frequency & Frequently Impacted Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Recurring Issue Categories
                  </h3>
                  <p className="text-xs text-slate-500">Distribution of incidents by operational taxonomy</p>
                </div>
                <BarChart3 className="w-4 h-4 text-slate-400" />
              </div>

              <div className="space-y-3">
                {insights.recurringCategories.map(cat => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-800">{cat.category}</span>
                      <span className="text-slate-500">
                        {cat.count} incident{cat.count > 1 ? 's' : ''} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Affected Areas */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Frequently Affected Operational Areas
                  </h3>
                  <p className="text-xs text-slate-500">Physical zones and equipment stations with repeat logs</p>
                </div>
                <Building2 className="w-4 h-4 text-slate-400" />
              </div>

              <div className="space-y-2.5">
                {insights.frequentlyAffectedAreas.map(area => (
                  <div
                    key={area.area}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{area.area}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Primary Driver: {area.primaryIssueType}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-800 font-semibold shadow-xs">
                      {area.incidentCount} logged
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Strict Separation: Empirical Observations vs AI Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Empirical Observations (Facts strictly backed by data) */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Empirical Observations
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fact-based metrics calculated from shift logs without causal assumptions
                  </p>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700">
                {insights.empiricalObservations.map((obs, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50">
                    <span className="font-bold text-indigo-600 shrink-0">•</span>
                    <span className="leading-relaxed">{obs}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2. AI Recommended Interventions (Clearly labeled recommendations) */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Recommended Interventions
                  </h3>
                  <p className="text-xs text-slate-500">
                    AI suggestions for process engineering and maintenance scheduling
                  </p>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700">
                {insights.recommendedInterventions.map((rec, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 p-2 rounded-lg bg-indigo-50/40 border border-indigo-100"
                  >
                    <span className="text-indigo-600 font-bold shrink-0">→</span>
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
