import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Layers,
  RefreshCw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronRight,
  Filter,
  BarChart3,
  Sliders,
  Check,
  X,
  PlayCircle,
  ExternalLink,
  History,
  Activity,
  AlertOctagon,
  Wrench,
  RotateCcw,
} from 'lucide-react';
import { HandoverReport, OperationalIssue, OperationalAction, OperationalEvent } from '../types';
import {
  RecurringIssuePattern,
  TemporaryInterventionPattern,
  IssueAgingSignal,
  ResolutionEffectivenessSignal,
  AgingConfig,
  OperationalIntelligenceSnapshot,
} from '../types/intelligence';
import {
  getOperationalIntelligenceSnapshot,
  getAgingConfig,
  saveAgingConfig,
  resetAgingConfig,
} from '../utils/intelligenceEngine';
import { getOperationalEvents } from '../utils/eventStore';
import { PatternEvidenceModal } from './PatternEvidenceModal';
import { runPhase2BValidationSuite, ValidationSuiteReport } from '../utils/intelligenceValidation';
import { fetchOperationalInsights } from '../services/aiService';

interface OperationalIntelligenceViewProps {
  issues: OperationalIssue[];
  actions: OperationalAction[];
  handovers: HandoverReport[];
  onSelectIssue?: (issue: OperationalIssue) => void;
  onNavigateToInbox?: () => void;
}

export const OperationalIntelligenceView: React.FC<OperationalIntelligenceViewProps> = ({
  issues,
  actions,
  handovers,
  onSelectIssue,
  onNavigateToInbox,
}) => {
  const [activeTab, setActiveTab] = useState<'patterns' | 'interventions' | 'aging' | 'resolutions' | 'config' | 'ai-narrative'>('patterns');
  const [events, setEvents] = useState<OperationalEvent[]>(() => getOperationalEvents());
  const [config, setConfig] = useState<AgingConfig>(() => getAgingConfig());

  // Derived intelligence snapshot
  const [snapshot, setSnapshot] = useState<OperationalIntelligenceSnapshot>(() =>
    getOperationalIntelligenceSnapshot(issues, actions, handovers, events, config)
  );

  // Selected pattern for evidence modal
  const [selectedPatternForEvidence, setSelectedPatternForEvidence] = useState<
    RecurringIssuePattern | TemporaryInterventionPattern | null
  >(null);

  // Validation report modal
  const [validationReport, setValidationReport] = useState<ValidationSuiteReport | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // AI Insights optional narrative state
  const [aiNarrative, setAiNarrative] = useState<any | null>(null);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);

  // Editable config state
  const [configDraft, setConfigDraft] = useState<AgingConfig>(config);
  const [configSavedToast, setConfigSavedToast] = useState<boolean>(false);

  const refreshSnapshot = () => {
    const currentEvents = getOperationalEvents();
    const currentConfig = getAgingConfig();
    setEvents(currentEvents);
    setConfig(currentConfig);
    setConfigDraft(currentConfig);
    setSnapshot(getOperationalIntelligenceSnapshot(issues, actions, handovers, currentEvents, currentConfig));
  };

  useEffect(() => {
    refreshSnapshot();
  }, [issues.length, actions.length, handovers.length]);

  const handleRunValidation = () => {
    setIsValidating(true);
    setTimeout(() => {
      const report = runPhase2BValidationSuite(issues, actions, handovers, events);
      setValidationReport(report);
      setIsValidating(false);
      refreshSnapshot();
    }, 250);
  };

  const handleSaveConfig = () => {
    const updated = saveAgingConfig(configDraft);
    setConfig(updated);
    setConfigSavedToast(true);
    refreshSnapshot();
    setTimeout(() => setConfigSavedToast(false), 3000);
  };

  const handleResetConfig = () => {
    const reset = resetAgingConfig();
    setConfig(reset);
    setConfigDraft(reset);
    refreshSnapshot();
  };

  const fetchAiNarrative = async () => {
    if (handovers.length === 0) return;
    setLoadingAi(true);
    try {
      const data = await fetchOperationalInsights(handovers);
      setAiNarrative(data);
    } catch (e) {
      console.warn('AI Narrative fetch error:', e);
    } finally {
      setLoadingAi(false);
    }
  };

  const recurringCount = snapshot.recurringPatterns.length;
  const highConfCount = snapshot.aggregatedMetrics.highConfidencePatternCount;
  const stalledCount = snapshot.stalledIssuesCount;
  const interventionCount = snapshot.temporaryInterventions.length;
  const resolutionRecurrenceCount = snapshot.aggregatedMetrics.recurrenceAfterResolutionCount;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
            <BrainCircuit className="w-4 h-4" />
            <span>Operational Intelligence Engine</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
            Cross-Shift Friction & Root-Cause Patterns
          </h2>
          <p className="text-xs text-slate-500">
            Derived directly from append-only events, shift handovers, and canonical lifecycle records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleRunValidation}
            disabled={isValidating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>{isValidating ? 'Validating...' : 'Run Phase 2B Test Suite'}</span>
          </button>

          <button
            onClick={refreshSnapshot}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recalculate</span>
          </button>
        </div>
      </div>

      {/* Top KPI Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Recurring Patterns */}
        <div
          onClick={() => setActiveTab('patterns')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'patterns'
              ? 'bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
            <span>Recurring Patterns</span>
            {highConfCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500" title="High confidence pattern active" />
            )}
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {recurringCount}
          </div>
          <div className="mt-1 text-[11px] text-rose-600 font-medium">
            {highConfCount} High Confidence
          </div>
        </div>

        {/* Temporary Interventions */}
        <div
          onClick={() => setActiveTab('interventions')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'interventions'
              ? 'bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500">Repeat Workarounds</div>
          <div className="mt-1 text-2xl font-bold text-amber-600">
            {interventionCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Masking root causes
          </div>
        </div>

        {/* Multi-Signal Stalled Issues */}
        <div
          onClick={() => setActiveTab('aging')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'aging'
              ? 'bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500">Stalled / Aging Issues</div>
          <div className="mt-1 text-2xl font-bold text-rose-600">
            {stalledCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Zero physical progress
          </div>
        </div>

        {/* Post-Resolution Recurrence */}
        <div
          onClick={() => setActiveTab('resolutions')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'resolutions'
              ? 'bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500">Post-Fix Recurrence</div>
          <div className={`mt-1 text-2xl font-bold ${resolutionRecurrenceCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {resolutionRecurrenceCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {resolutionRecurrenceCount > 0 ? 'Recurred after fix' : 'All fixes holding'}
          </div>
        </div>

        {/* Total Deduplicated Downtime */}
        <div className="p-4 rounded-xl border bg-white border-slate-200 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-medium text-slate-500">Total Stop Time</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {snapshot.aggregatedMetrics.totalRecordedDowntimeMinutes}m
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Across active disruptions
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="border-b border-slate-200 flex items-center justify-between overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('patterns')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'patterns'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Recurring Problem Patterns ({recurringCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('interventions')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'interventions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Temporary Interventions ({interventionCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('aging')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'aging'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Issue Aging & Velocity ({snapshot.agingSignals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('resolutions')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'resolutions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Resolution Effectiveness ({snapshot.resolutionSignals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'config'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Aging Thresholds</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('ai-narrative');
              if (!aiNarrative) fetchAiNarrative();
            }}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'ai-narrative'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Shift Narrative</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 1: RECURRING ISSUE PATTERNS */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'patterns' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>
              Patterns detected when 2 or more distinct canonical issues share equipment and failure signatures.
            </span>
            <span className="font-semibold text-slate-700">
              {snapshot.recurringPatterns.length} pattern(s) identified
            </span>
          </div>

          {snapshot.recurringPatterns.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="font-semibold text-slate-800 text-sm">No recurring problem patterns detected</div>
              <p className="max-w-md mx-auto text-slate-500">
                Problems currently logged represent isolated incidents with zero recurring signatures across shifts.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {snapshot.recurringPatterns.map(pattern => (
                <div
                  key={pattern.id}
                  className={`bg-white rounded-xl border p-5 shadow-xs transition-all space-y-4 ${
                    pattern.confidence === 'High'
                      ? 'border-rose-300 ring-1 ring-rose-100'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                            pattern.confidence === 'High'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : pattern.confidence === 'Medium'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          {pattern.confidence} Confidence Recurrence
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {pattern.department}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs font-semibold text-slate-700">
                          {pattern.equipmentName || pattern.problemSignature}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 pt-0.5">
                        {pattern.title}
                      </h3>

                      <div className="text-xs text-slate-600">
                        Problem Signature: <span className="font-semibold text-slate-800">{pattern.problemSignature}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedPatternForEvidence(pattern)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shrink-0 self-start sm:self-auto"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Inspect Evidence Trace</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quantitative Metrics Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Occurrences</div>
                      <div className="font-bold text-slate-900 mt-0.5">
                        {pattern.occurrenceCount} Distinct Issues
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Shifts Affected</div>
                      <div className="font-bold text-indigo-600 mt-0.5">
                        {pattern.shiftsAffected} Shifts
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Recorded Downtime</div>
                      <div className="font-bold text-rose-600 mt-0.5">
                        {pattern.totalRecordedDowntimeMinutes} Minutes
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Time Span</div>
                      <div className="font-bold text-slate-900 mt-0.5">
                        {pattern.timeSpanDays} Days
                      </div>
                    </div>
                  </div>

                  {/* Why ShiftFlow Flagged This */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Why ShiftFlow Flagged This
                    </div>
                    <ul className="space-y-1 text-xs text-slate-700">
                      {pattern.confidenceRationale.map((rat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                          <span>{rat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Neutral Recommended Investigation */}
                  <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      <span>Recommended Operational Investigation</span>
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      {pattern.recommendedInvestigation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 2: TEMPORARY INTERVENTIONS */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'interventions' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>
              Repeated quick-fix interventions (sensor wipes, regulator tweaks, power cycles) that mask underlying failures.
            </span>
            <span className="font-semibold text-slate-700">
              {snapshot.temporaryInterventions.length} intervention pattern(s)
            </span>
          </div>

          {snapshot.temporaryInterventions.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="font-semibold text-slate-800 text-sm">No repetitive temporary workarounds detected</div>
              <p className="max-w-md mx-auto text-slate-500">
                Interventions taken across shifts represent standard permanent remediation steps.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {snapshot.temporaryInterventions.map(interv => (
                <div
                  key={interv.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 uppercase tracking-wider border border-amber-200">
                          Applied {interv.timesApplied} Times
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {interv.department}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 pt-0.5">
                        {interv.interventionType}
                      </h3>
                      <div className="text-xs text-slate-600">
                        Observed on: <span className="font-semibold text-slate-800">{interv.equipmentName}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedPatternForEvidence(interv)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shrink-0 self-start sm:self-auto"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Inspect Evidence Trace</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Applications</div>
                      <div className="font-bold text-amber-700 mt-0.5">{interv.timesApplied} Cycles</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Downtime Caused</div>
                      <div className="font-bold text-rose-600 mt-0.5">{interv.totalRecordedDowntimeMinutes} Minutes</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Est. MTTR Interval</div>
                      <div className="font-bold text-slate-900 mt-0.5">~{interv.averageRecurrenceHours}h Between Resets</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      <span>Investigation Advice (Permanent Remediation)</span>
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      {interv.recommendedInvestigation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 3: MULTI-SIGNAL ISSUE AGING & VELOCITY */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'aging' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>
              Explicit distinction between operational activity (notes, updates) and genuine physical progress.
            </span>
            <span className="font-semibold text-slate-700">
              Thresholds: Inactive &ge; {config.inactiveThresholdHours}h | No Progress &ge; {config.noProgressThresholdHours}h
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5">Issue Title</th>
                    <th className="p-3.5">Severity</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Hours Open</th>
                    <th className="p-3.5">Shifts</th>
                    <th className="p-3.5">Last Activity</th>
                    <th className="p-3.5">Last Progress</th>
                    <th className="p-3.5">Primary Aging Signal</th>
                    <th className="p-3.5 text-right">Urgency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {snapshot.agingSignals.map(sig => {
                    const iss = issues.find(i => i.id === sig.issueId);
                    return (
                      <tr
                        key={sig.issueId}
                        onClick={() => iss && onSelectIssue && onSelectIssue(iss)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="p-3.5 font-semibold text-slate-900 max-w-xs truncate">
                          {sig.issueTitle}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              sig.severity === 'Critical'
                                ? 'bg-rose-100 text-rose-800'
                                : sig.severity === 'High'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {sig.severity}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 font-medium">{sig.status}</td>
                        <td className="p-3.5 text-slate-700 font-mono font-medium">{sig.hoursOpen}h</td>
                        <td className="p-3.5 text-slate-700 font-mono font-medium">{sig.shiftsCrossed}</td>
                        <td className="p-3.5 text-slate-600">
                          <div>{sig.hoursSinceLastActivity}h ago</div>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          <div>{sig.hoursSinceLastProgress}h ago</div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              sig.primarySignal === 'Escalated Without Progress'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : sig.primarySignal === 'Repeated Carry-Over'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : sig.primarySignal === 'Action Stalled'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : sig.primarySignal === 'No Progress'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : sig.primarySignal === 'Long Running'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : sig.primarySignal === 'Inactive'
                                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {sig.primarySignal}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                          {sig.operationalUrgencyScore}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 4: RESOLUTION EFFECTIVENESS */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'resolutions' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>
              Verifies whether resolved issues remained permanently remediated or experienced post-resolution recurrence.
            </span>
            <span className="font-semibold text-slate-700">
              Observation benchmark: &ge; {config.observationWindowMinimumHours}h
            </span>
          </div>

          {snapshot.resolutionSignals.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500 space-y-2">
              <History className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="font-semibold text-slate-800 text-sm">No resolved operational issues logged yet</div>
              <p className="max-w-md mx-auto text-slate-500">
                When an issue is marked resolved, ShiftFlow tracks post-resolution stability across subsequent shifts.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {snapshot.resolutionSignals.map(res => (
                <div
                  key={res.issueId}
                  className={`bg-white rounded-xl border p-5 shadow-xs space-y-3 ${
                    res.status === 'Recurrence Observed After Resolution'
                      ? 'border-rose-300 ring-1 ring-rose-100'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                            res.status === 'Recurrence Observed After Resolution'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : res.status === 'No Recurrence Observed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {res.status}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {res.department}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 pt-0.5">
                        {res.issueTitle}
                      </h3>

                      <div className="text-xs text-slate-600">
                        Resolved by: <span className="font-semibold text-slate-800">{res.resolvedBy}</span> on{' '}
                        {new Date(res.resolvedAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="text-xs text-right text-slate-500">
                      Observation window: <span className="font-semibold text-slate-800">{res.observationWindowHours}h</span> ({res.observationWindowDays}d)
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    <span className="font-semibold text-slate-900">Operational Verification:</span> {res.explanation}
                  </div>

                  {res.recurrentIssueTitle && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Recurrent Incident: <strong>{res.recurrentIssueTitle}</strong></span>
                      </div>
                      <span className="text-rose-700 font-mono text-[11px]">
                        +{res.hoursUntilRecurrence}h post-resolution
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 5: AGING THRESHOLDS CONFIG */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Aging & Recurrence Engine Configuration
              </h3>
              <p className="text-xs text-slate-500">
                Customize operational stagnation thresholds to match facility SLAs and dispatch expectations.
              </p>
            </div>

            <button
              onClick={handleResetConfig}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inactive threshold */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Inactive Threshold (Hours)</span>
                <span className="text-indigo-600 font-mono">{configDraft.inactiveThresholdHours}h</span>
              </label>
              <input
                type="range"
                min="1"
                max="24"
                step="1"
                value={configDraft.inactiveThresholdHours}
                onChange={e => setConfigDraft({ ...configDraft, inactiveThresholdHours: Number(e.target.value) })}
                className="w-full accent-indigo-600"
              />
              <p className="text-[11px] text-slate-500">
                Flags issues with zero activity (notes, assignment, comments) for &ge; this duration.
              </p>
            </div>

            {/* No progress threshold */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>No-Progress Threshold (Hours)</span>
                <span className="text-indigo-600 font-mono">{configDraft.noProgressThresholdHours}h</span>
              </label>
              <input
                type="range"
                min="1"
                max="24"
                step="1"
                value={configDraft.noProgressThresholdHours}
                onChange={e => setConfigDraft({ ...configDraft, noProgressThresholdHours: Number(e.target.value) })}
                className="w-full accent-indigo-600"
              />
              <p className="text-[11px] text-slate-500">
                Flags issues where activity occurs, but physical progress towards resolution is stalled.
              </p>
            </div>

            {/* Long running threshold */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Long-Running Duration (Hours)</span>
                <span className="text-indigo-600 font-mono">{configDraft.longRunningThresholdHours}h</span>
              </label>
              <input
                type="range"
                min="8"
                max="72"
                step="4"
                value={configDraft.longRunningThresholdHours}
                onChange={e => setConfigDraft({ ...configDraft, longRunningThresholdHours: Number(e.target.value) })}
                className="w-full accent-indigo-600"
              />
              <p className="text-[11px] text-slate-500">
                Total hours open before an issue is flagged as chronic / long running.
              </p>
            </div>

            {/* Escalated without progress */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Escalated Without Progress Gap (Hours)</span>
                <span className="text-indigo-600 font-mono">{configDraft.escalatedWithoutProgressHours}h</span>
              </label>
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={configDraft.escalatedWithoutProgressHours}
                onChange={e => setConfigDraft({ ...configDraft, escalatedWithoutProgressHours: Number(e.target.value) })}
                className="w-full accent-indigo-600"
              />
              <p className="text-[11px] text-slate-500">
                Flags escalated items that remain without documented resolution progress.
              </p>
            </div>

            {/* Repeated carry over */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Repeated Carry-Over Shift Limit</span>
                <span className="text-indigo-600 font-mono">{configDraft.repeatedCarryOverShifts} Shifts</span>
              </label>
              <input
                type="range"
                min="2"
                max="6"
                step="1"
                value={configDraft.repeatedCarryOverShifts}
                onChange={e => setConfigDraft({ ...configDraft, repeatedCarryOverShifts: Number(e.target.value) })}
                className="w-full accent-indigo-600"
              />
              <p className="text-[11px] text-slate-500">
                Flags issues that survive across multiple consecutive shifts without closure.
              </p>
            </div>

            {/* Observation window */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Resolution Observation Window (Hours)</span>
                <span className="text-indigo-600 font-mono">{configDraft.observationWindowMinimumHours}h</span>
              </label>
              <input
                type="range"
                min="12"
                max="96"
                step="6"
                value={configDraft.observationWindowMinimumHours}
                onChange={e => setConfigDraft({ ...configDraft, observationWindowMinimumHours: Number(e.target.value) })}
                className="w-full accent-indigo-600"
              />
              <p className="text-[11px] text-slate-500">
                Minimum elapsed window before declaring a resolved issue as "Verified No Recurrence".
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {configSavedToast ? (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>Thresholds updated and intelligence recalculated.</span>
              </span>
            ) : (
              <span className="text-xs text-slate-500">Changes persist in local application storage.</span>
            )}

            <button
              onClick={handleSaveConfig}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
            >
              Save Thresholds
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 6: SHIFT NARRATIVE (GEMINI CROSS-SHIFT SUMMARY) */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'ai-narrative' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gemini Cross-Shift Narrative</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                Executive Synthesis Across Handovers
              </h3>
              <p className="text-xs text-slate-500">
                Synthesized narrative across {handovers.length} shifts to detect operational friction.
              </p>
            </div>

            <button
              onClick={fetchAiNarrative}
              disabled={loadingAi}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
              <span>Regenerate Narrative</span>
            </button>
          </div>

          {loadingAi && (
            <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span>Analyzing cross-shift handovers...</span>
            </div>
          )}

          {aiNarrative && !loadingAi && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
                <h4 className="text-sm font-bold text-slate-900">Cross-Shift Operational Synthesis</h4>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {aiNarrative.crossShiftAnalysis}
                </p>
              </div>

              {Array.isArray(aiNarrative.systemicRecommendations) && aiNarrative.systemicRecommendations.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">Systemic Operational Recommendations</h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {aiNarrative.systemicRecommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pattern Evidence Modal */}
      {selectedPatternForEvidence && (
        <PatternEvidenceModal
          pattern={selectedPatternForEvidence}
          issues={issues}
          handovers={handovers}
          onClose={() => setSelectedPatternForEvidence(null)}
          onSelectIssue={iss => {
            setSelectedPatternForEvidence(null);
            if (onSelectIssue) onSelectIssue(iss);
          }}
        />
      )}

      {/* Phase 2B Validation Report Modal */}
      {validationReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                      validationReport.allPassed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {validationReport.allPassed ? 'All 6 Tests Passed' : 'Tests Failed'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {validationReport.passedTests} / {validationReport.totalTests} Verified
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Phase 2B Operational Intelligence Validation
                </h3>
              </div>
              <button
                onClick={() => setValidationReport(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto divide-y divide-slate-100">
              {validationReport.results.map(test => (
                <div key={test.id} className="pt-3 first:pt-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          test.status === 'PASS' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-900">{test.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{test.durationMs}ms</span>
                  </div>
                  <p className="text-xs text-slate-600 pl-4">{test.summary}</p>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Executed at {new Date(validationReport.timestamp).toLocaleTimeString()}
              </span>
              <button
                onClick={() => setValidationReport(null)}
                className="px-4 py-1.5 rounded-lg font-semibold bg-slate-900 text-white hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
