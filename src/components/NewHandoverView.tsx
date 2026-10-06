import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Plus,
  RefreshCw,
  FileCheck,
  Check,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  HandoverReport,
  ShiftStatus,
  CarriedOverIssue,
  IssueItem,
  IssueSeverity,
  IssueCategory,
  IssueStatus,
} from '../types';
import { SAMPLE_SHIFT_SCENARIOS } from '../data/initialData';
import { getCarriedOverIssuesForNewShift } from '../utils/storage';
import { analyzeHandover } from '../services/aiService';

interface NewHandoverViewProps {
  onHandoverSaved: (handover: HandoverReport) => void;
  onCancel: () => void;
}

export const NewHandoverView: React.FC<NewHandoverViewProps> = ({
  onHandoverSaved,
  onCancel,
}) => {
  // Form state
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<string>('Afternoon');
  const [department, setDepartment] = useState<string>('Primary Sortation Loop A');
  const [shiftLead, setShiftLead] = useState<string>('Elena Rostova');
  const [incomingShift, setIncomingShift] = useState<string>('Night Shift (Lead: David Chen)');
  const [generalStatus, setGeneralStatus] = useState<ShiftStatus>('Normal');

  // Operational Metrics
  const [target, setTarget] = useState<string>('15,000 units');
  const [actual, setActual] = useState<string>('14,420 units');
  const [backlog, setBacklog] = useState<string>('420 units');
  const [quality, setQuality] = useState<string>('99.4%');
  const [downtime, setDowntime] = useState<string>('30 min');
  const [staffing, setStaffing] = useState<string>('23/24 on floor');
  const [safetyObservations, setSafetyObservations] = useState<string>('Zero reportable injuries; 5S audit complete');
  const [showMetrics, setShowMetrics] = useState<boolean>(true);

  // Raw notes
  const [rawNotes, setRawNotes] = useState<string>(
    'Station 4 had recurring equipment problems around 2pm. Maintenance was contacted. We temporarily moved two team members to another area. Backlog increased during the interruption but improved before the end of the shift. Equipment needs monitoring during the next shift.'
  );

  // Shift Continuity: Carried over issues
  const [carriedOverIssues, setCarriedOverIssues] = useState<CarriedOverIssue[]>([]);

  // AI Generation & Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisEngine, setAnalysisEngine] = useState<string | null>(null);

  // AI-generated draft report for review and editing
  const [generatedDraft, setGeneratedDraft] = useState<any | null>(null);
  const [executiveSummary, setExecutiveSummary] = useState<string>('');
  const [issuesList, setIssuesList] = useState<IssueItem[]>([]);
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [outstandingItems, setOutstandingItems] = useState<string[]>([]);
  const [risksList, setRisksList] = useState<string[]>([]);
  const [nextPriorities, setNextPriorities] = useState<string[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [positiveOutcomes, setPositiveOutcomes] = useState<string[]>([]);
  const [escalations, setEscalations] = useState<string[]>([]);

  // AI Follow-up Questions State
  const [missingQuestions, setMissingQuestions] = useState<string[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({});
  const [isRefining, setIsRefining] = useState<boolean>(false);

  // Load continuity items when department changes
  useEffect(() => {
    const carryovers = getCarriedOverIssuesForNewShift(department);
    setCarriedOverIssues(carryovers);
  }, [department]);

  // Load sample scenarios
  const applyScenario = (idx: number) => {
    const s = SAMPLE_SHIFT_SCENARIOS[idx];
    if (!s) return;
    setDepartment(s.department);
    setShift(s.shift);
    setShiftLead(s.shiftLead);
    setIncomingShift(s.incomingShift);
    setGeneralStatus(s.generalStatus as ShiftStatus);
    setTarget(s.metrics.target);
    setActual(s.metrics.actual);
    setBacklog(s.metrics.backlog);
    setQuality(s.metrics.quality);
    setDowntime(s.metrics.downtime);
    setStaffing(s.metrics.staffing);
    setSafetyObservations(s.metrics.safetyObservations);
    setRawNotes(s.rawNotes);
    setGeneratedDraft(null);
  };

  // Toggle continuity status
  const handleUpdateCarryoverStatus = (
    id: string,
    newStatus: 'Resolved' | 'Still Open' | 'Escalated' | 'Monitoring'
  ) => {
    setCarriedOverIssues(prev =>
      prev.map(item => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  const handleUpdateCarryoverNote = (id: string, note: string) => {
    setCarriedOverIssues(prev =>
      prev.map(item => (item.id === id ? { ...item, resolutionNotes: note } : item))
    );
  };

  // Trigger Gemini Analysis
  const handleGenerateHandover = async (refineWithAnswers: boolean = false) => {
    if (!rawNotes.trim()) {
      setAnalysisError('Please enter shift notes before generating.');
      return;
    }

    if (refineWithAnswers) {
      setIsRefining(true);
    } else {
      setIsAnalyzing(true);
    }
    setAnalysisError(null);

    const answeredList = Object.entries(questionAnswers).map(([idx, ans]) => ({
      question: missingQuestions[parseInt(idx, 10)],
      answer: ans,
    }));

    try {
      const result = await analyzeHandover({
        date,
        shift,
        department,
        shiftLead,
        incomingShift,
        generalStatus,
        metrics: {
          target,
          actual,
          backlog,
          quality,
          downtime,
          staffing,
          safetyObservations,
        },
        rawNotes,
        carriedOverIssues,
        answeredQuestions: answeredList,
      });

      const data = result.data;
      setGeneratedDraft(data);
      setAnalysisEngine(result.engine);

      // Populate editable fields
      setGeneralStatus((data.overallStatus as ShiftStatus) || generalStatus);
      setExecutiveSummary(data.executiveSummary || '');
      setCompletedActions(data.completedActions || []);
      setOutstandingItems(data.outstandingItems || []);
      setRisksList(data.risks || []);
      setNextPriorities(data.nextShiftPriorities || []);
      setAiRecommendations(data.recommendations || []);
      setPositiveOutcomes(data.positiveOutcomes || []);
      setEscalations(data.escalations || []);

      // Format issues with unique IDs
      const mappedIssues: IssueItem[] = (data.issues || []).map((iss: any, index: number) => ({
        id: `iss-${Date.now()}-${index}`,
        title: iss.title || 'Operational Issue',
        category: (iss.category as IssueCategory) || 'Equipment',
        severity: (iss.severity as IssueSeverity) || 'Medium',
        description: iss.description || '',
        area: iss.area || department,
        timeObserved: iss.timeObserved || 'During shift',
        actionTaken: iss.actionTaken || 'Contained by team',
        status: (iss.status as IssueStatus) || 'Monitoring',
        recommendedAction: iss.recommendedAction || 'Monitor next shift',
        owner: iss.owner || shiftLead,
      }));
      setIssuesList(mappedIssues);

      // Follow-up questions
      if (Array.isArray(data.missingInformation) && data.missingInformation.length > 0) {
        setMissingQuestions(data.missingInformation);
      }
    } catch (err: any) {
      console.error('Error generating handover:', err);
      setAnalysisError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setIsRefining(false);
    }
  };

  // Save the final approved handover
  const handleSaveHandover = () => {
    const newHandover: HandoverReport = {
      id: `sho-${date}-${shift.toLowerCase()}-${Date.now().toString().slice(-4)}`,
      date,
      shift,
      department,
      shiftLead,
      incomingShift,
      generalStatus,
      riskLevel: issuesList.some(i => i.severity === 'Critical')
        ? 'Critical'
        : issuesList.some(i => i.severity === 'High')
        ? 'High'
        : 'Medium',
      metrics: {
        target,
        actual,
        backlog,
        quality,
        downtime,
        staffing,
        safetyObservations,
      },
      rawNotes,
      carriedOverIssues,
      executiveSummary,
      performanceSummary: generatedDraft?.performanceSummary || 'Performance evaluated against shift targets.',
      issues: issuesList,
      completedActions,
      outstandingItems,
      risks: risksList,
      nextShiftPriorities: nextPriorities,
      recommendations: aiRecommendations,
      positiveOutcomes,
      escalations,
      missingInformation: missingQuestions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onHandoverSaved(newHandover);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Step Indicator Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
            <Layers className="w-3.5 h-3.5" />
            <span>Shift Continuity Workflow</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
            Create Operational Shift Handover
          </h2>
          <p className="text-xs text-slate-500">
            Step 1: Input shift context & notes · Step 2: Gemini AI synthesis · Step 3: Review & save
          </p>
        </div>

        {/* Quick sample scenario pickers */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-slate-400">Load Demo Scenario:</span>
          {SAMPLE_SHIFT_SCENARIOS.map((sc, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyScenario(idx)}
              className="px-2.5 py-1 text-xs rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors"
            >
              {sc.shift} ({sc.department.split(' ')[0]})
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: SHIFT INFORMATION */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-semibold text-slate-900">Shift Information</h3>
          <p className="text-xs text-slate-500">Logistical context for operational traceability</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Shift Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-600 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Shift Name</label>
            <select
              value={shift}
              onChange={e => setShift(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-600 bg-white"
            >
              <option value="Morning">Morning Shift (06:00 - 14:30)</option>
              <option value="Afternoon">Afternoon Shift (14:00 - 22:30)</option>
              <option value="Night">Night Shift (22:00 - 06:30)</option>
              <option value="Custom">Custom / Weekend Shift</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Department / Operational Area
            </label>
            <input
              type="text"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="e.g. Primary Sortation Loop A"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-600 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Outgoing Shift Lead
            </label>
            <input
              type="text"
              value={shiftLead}
              onChange={e => setShiftLead(e.target.value)}
              placeholder="e.g. Elena Rostova"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-600 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Incoming Shift & Lead
            </label>
            <input
              type="text"
              value={incomingShift}
              onChange={e => setIncomingShift(e.target.value)}
              placeholder="e.g. Night Shift (David Chen)"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-600 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              General Shift Status
            </label>
            <select
              value={generalStatus}
              onChange={e => setGeneralStatus(e.target.value as ShiftStatus)}
              className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-hidden font-medium ${
                generalStatus === 'Critical'
                  ? 'border-rose-300 bg-rose-50 text-rose-800'
                  : generalStatus === 'Attention Required'
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-800'
              }`}
            >
              <option value="Normal">Normal (Steady-state operations)</option>
              <option value="Attention Required">Attention Required (Elevated backlog / stops)</option>
              <option value="Critical">Critical (Severe downtime / incident)</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 2: SHIFT CONTINUITY (Carried Over From Previous Shift) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
              <Clock className="w-3.5 h-3.5" />
              <span>Shift Continuity Engine</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mt-0.5">
              Carried Over From Previous Shift
            </h3>
            <p className="text-xs text-slate-500">
              Unresolved issues and monitored items transferred from the preceding shift
            </p>
          </div>
          <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md font-medium">
            {carriedOverIssues.length} continuity items
          </span>
        </div>

        {carriedOverIssues.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-500 text-center border border-dashed border-slate-200">
            No carryover issues detected from previous shifts for this department.
          </div>
        ) : (
          <div className="space-y-3">
            {carriedOverIssues.map(item => (
              <div
                key={item.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-900">{item.title}</span>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>Category: {item.category}</span>
                      <span>·</span>
                      <span>Source: {item.originalShiftDate || 'Preceding Shift'}</span>
                    </div>
                  </div>

                  {/* Status buttons: Resolved, Still Open, Escalated, Monitoring */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-md border border-slate-200 self-start sm:self-auto">
                    {(['Still Open', 'Monitoring', 'Escalated', 'Resolved'] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleUpdateCarryoverStatus(item.id, st)}
                        className={`px-2 py-1 text-[11px] rounded font-medium transition-colors ${
                          item.status === st
                            ? st === 'Resolved'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : st === 'Escalated'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : st === 'Monitoring'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Incoming shift status update or resolution notes..."
                    value={item.resolutionNotes || ''}
                    onChange={e => handleUpdateCarryoverNote(item.id, e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: OPERATIONAL METRICS (Collapsible) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Operational Metrics</h3>
            <p className="text-xs text-slate-500">Quantitative targets, throughput, and line stability</p>
          </div>
          <button
            type="button"
            onClick={() => setShowMetrics(!showMetrics)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
          >
            <span>{showMetrics ? 'Collapse' : 'Expand'}</span>
            {showMetrics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showMetrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Volume</label>
              <input
                type="text"
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder="e.g. 15,000 units"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Actual Performance</label>
              <input
                type="text"
                value={actual}
                onChange={e => setActual(e.target.value)}
                placeholder="e.g. 14,420 units"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Backlog / Queue</label>
              <input
                type="text"
                value={backlog}
                onChange={e => setBacklog(e.target.value)}
                placeholder="e.g. 420 units"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Quality Score</label>
              <input
                type="text"
                value={quality}
                onChange={e => setQuality(e.target.value)}
                placeholder="e.g. 99.4%"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Downtime</label>
              <input
                type="text"
                value={downtime}
                onChange={e => setDowntime(e.target.value)}
                placeholder="e.g. 30 min"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Staffing Level</label>
              <input
                type="text"
                value={staffing}
                onChange={e => setStaffing(e.target.value)}
                placeholder="e.g. 23/24 present"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Safety & Housekeeping Observations
              </label>
              <input
                type="text"
                value={safetyObservations}
                onChange={e => setSafetyObservations(e.target.value)}
                placeholder="e.g. 0 incidents; all emergency exits unobstructed"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: RAW SHIFT NOTES */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Raw Shift Notes</h3>
            <p className="text-xs text-slate-500">
              Paste informal supervisor observations, radio logs, maintenance tickets, or team updates
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {rawNotes.length} chars
          </span>
        </div>

        <textarea
          rows={6}
          value={rawNotes}
          onChange={e => setRawNotes(e.target.value)}
          placeholder="Paste informal shift notes here. Mention machine stops, staffing moves, backlog spikes, technician work, or safety items..."
          className="w-full p-3.5 text-xs sm:text-sm font-mono text-slate-800 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-600 bg-slate-50/50 leading-relaxed resize-y"
        />

        {analysisError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{analysisError}</span>
          </div>
        )}

        {/* Action Button: Generate Handover with AI */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Gemini extracts facts, classifies severity, and drafts structured handover.</span>
          </div>

          <button
            type="button"
            disabled={isAnalyzing}
            onClick={() => handleGenerateHandover(false)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analyzing Shift Notes with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Handover with AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 5: AI-GENERATED HANDOVER REPORT REVIEW & EDITING */}
      {generatedDraft && (
        <div className="bg-white rounded-xl border border-indigo-200 p-6 sm:p-7 shadow-sm space-y-6">
          <div className="border-b border-indigo-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Handover Synthesized ({analysisEngine || 'Gemini 3.8 Flash'})</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Review & Edit Shift Handover Report
              </h3>
              <p className="text-xs text-slate-500">
                Verify factual accuracy. Edit any text before final sign-off and saving.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveHandover}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
            >
              <FileCheck className="w-4 h-4" />
              <span>Save & Publish Handover</span>
            </button>
          </div>

          {/* AI Follow-up Questions Card (Interactive missing info resolution) */}
          {missingQuestions.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>AI Missing Information Detection: Clarifying Questions</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Gemini detected potential gaps in the raw shift notes. Providing answers below will
                strengthen handover accuracy and reduce assumptions for the incoming lead.
              </p>

              <div className="space-y-3 pt-1">
                {missingQuestions.map((q, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-amber-200/70 space-y-1.5">
                    <div className="text-xs font-medium text-slate-800">
                      Q{idx + 1}: {q}
                    </div>
                    <input
                      type="text"
                      placeholder="Type brief clarification (e.g. 'Yes, signed off at 15:45' or 'Queue cleared')..."
                      value={questionAnswers[idx] || ''}
                      onChange={e =>
                        setQuestionAnswers({ ...questionAnswers, [idx]: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 focus:outline-hidden focus:border-amber-500 bg-slate-50/50"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={isRefining}
                  onClick={() => handleGenerateHandover(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 transition-colors"
                >
                  {isRefining ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Refining Report with Answers...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Refine Handover with Answers</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 1. Executive Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Executive Summary
              </label>
              <span className="text-[11px] text-slate-400">Editable</span>
            </div>
            <textarea
              rows={3}
              value={executiveSummary}
              onChange={e => setExecutiveSummary(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm text-slate-800 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-600 leading-relaxed"
            />
          </div>

          {/* 2. Key Issues Identified */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Key Issues Identified ({issuesList.length})
              </label>
              <span className="text-[11px] text-slate-400">Classified by severity & category</span>
            </div>

            <div className="space-y-3">
              {issuesList.map((issue, idx) => (
                <div
                  key={issue.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <input
                      type="text"
                      value={issue.title}
                      onChange={e => {
                        const updated = [...issuesList];
                        updated[idx].title = e.target.value;
                        setIssuesList(updated);
                      }}
                      className="text-xs font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-hidden w-full"
                    />

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={issue.severity}
                        onChange={e => {
                          const updated = [...issuesList];
                          updated[idx].severity = e.target.value as IssueSeverity;
                          setIssuesList(updated);
                        }}
                        className={`text-[11px] font-semibold px-2 py-1 rounded border focus:outline-hidden ${
                          issue.severity === 'Critical'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : issue.severity === 'High'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        <option value="Low">Severity: Low</option>
                        <option value="Medium">Severity: Medium</option>
                        <option value="High">Severity: High</option>
                        <option value="Critical">Severity: Critical</option>
                      </select>

                      <select
                        value={issue.status}
                        onChange={e => {
                          const updated = [...issuesList];
                          updated[idx].status = e.target.value as IssueStatus;
                          setIssuesList(updated);
                        }}
                        className="text-[11px] font-medium px-2 py-1 rounded border border-slate-200 bg-white"
                      >
                        <option value="Open">Status: Open</option>
                        <option value="Partially Resolved">Status: Partially Resolved</option>
                        <option value="Monitoring">Status: Monitoring</option>
                        <option value="Resolved">Status: Resolved</option>
                        <option value="Escalated">Status: Escalated</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          setIssuesList(issuesList.filter((_, i) => i !== idx));
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="Delete issue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">Category:</span>
                      <div className="text-slate-700 font-medium">{issue.category}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">Area Affected:</span>
                      <div className="text-slate-700 font-medium">{issue.area}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">Time Observed:</span>
                      <div className="text-slate-700 font-medium">{issue.timeObserved}</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <div>
                      <span className="font-semibold text-slate-700">Action Already Taken: </span>
                      <span>{issue.actionTaken}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Recommended Action: </span>
                      <span>{issue.recommendedAction}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Completed Actions & Outstanding Items 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Actions Completed */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Actions Completed</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {completedActions.map((act, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Outstanding Items */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Outstanding Items for Incoming Shift</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {outstandingItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 4. Risks for Next Shift & Next Shift Priorities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Risks */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>Risks for Incoming Shift</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {risksList.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-500 font-semibold">⚠</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Next Priorities */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Immediate Next-Shift Priorities</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {nextPriorities.map((pri, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-indigo-600 font-bold">{i + 1}.</span>
                    <span>{pri}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 5. Recommended Follow-ups (Clearly marked as AI recommendations) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recommended Follow-Up Actions (AI Suggestions - Requires Lead Approval)</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {aiRecommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-indigo-500 font-medium">→</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Final Action Bar */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Saving will add this report to Handover History and enable Action Tracker integration.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveHandover}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Handover</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
