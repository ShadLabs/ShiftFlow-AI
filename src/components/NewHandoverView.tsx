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
  MessageSquare,
  Wrench,
  User,
  ShieldCheck,
} from 'lucide-react';
import {
  HandoverReport,
  ShiftStatus,
  ShiftHealth,
  OperationalIssue,
  OperationalAction,
  IssueSeverity,
  IssueCategory,
  IssueStatus,
  QualityScoreSnapshot,
} from '../types';
import { SAMPLE_SHIFT_SCENARIOS } from '../data/initialData';
import { getIdempotentCarryoverIssues, saveIssue, saveAction } from '../utils/storage';
import { analyzeHandover } from '../services/aiService';
import { calculateHoursOpen, calculateShiftsCrossed, calculateQualityScore } from '../utils/operationalMath';
import { QualityScoreMeter } from './QualityScoreMeter';
import { ExtractionReviewCard } from './ExtractionReviewCard';

interface NewHandoverViewProps {
  onHandoverSaved: (handover: HandoverReport) => void;
  onCancel: () => void;
  allHandovers?: HandoverReport[];
}

export const NewHandoverView: React.FC<NewHandoverViewProps> = ({
  onHandoverSaved,
  onCancel,
  allHandovers = [],
}) => {
  // Shift Information
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<string>('Afternoon');
  const [department, setDepartment] = useState<string>('Primary Sortation Loop A');
  const [shiftLead, setShiftLead] = useState<string>('Marcus Vance');
  const [incomingShift, setIncomingShift] = useState<string>('Night Shift (Lead: David Chen)');
  const [incomingLead, setIncomingLead] = useState<string>('David Chen');
  const [generalStatus, setGeneralStatus] = useState<ShiftStatus>('Attention Required');
  const [shiftHealth, setShiftHealth] = useState<ShiftHealth>('Watch');

  // Conversational "Tell ShiftFlow what happened"
  const [rawNotes, setRawNotes] = useState<string>(
    'Conveyor 7 stopped around 2:30. Maintenance reset it but it happened again around 4:00. We lost about 35 minutes. Packing backlog increased to 420. Sarah from maintenance said they will inspect the motor during day shift.'
  );

  // Operational Metrics
  const [target, setTarget] = useState<string>('14,500 units');
  const [actual, setActual] = useState<string>('13,820 units');
  const [backlog, setBacklog] = useState<string>('420 units');
  const [quality, setQuality] = useState<string>('99.2%');
  const [downtime, setDowntime] = useState<string>('35 min');
  const [staffing, setStaffing] = useState<string>('22/24 present');
  const [safetyObservations, setSafetyObservations] = useState<string>('0 reportable injuries; 5S station check complete');
  const [showMetricsDetails, setShowMetricsDetails] = useState<boolean>(false);

  // Automatic Idempotent Carryover (Single canonical issue entities)
  const [carryoverIssues, setCarryoverIssues] = useState<OperationalIssue[]>([]);

  // AI Extraction State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisEngine, setAnalysisEngine] = useState<string | null>(null);

  // Extracted Issues for Review
  const [extractedIssues, setExtractedIssues] = useState<OperationalIssue[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState<string>('');
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const [outstandingItems, setOutstandingItems] = useState<string[]>([]);
  const [risksList, setRisksList] = useState<string[]>([]);
  const [nextPriorities, setNextPriorities] = useState<string[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [positiveOutcomes, setPositiveOutcomes] = useState<string[]>([]);
  const [escalations, setEscalations] = useState<string[]>([]);

  // Clarifying Questions
  const [missingQuestions, setMissingQuestions] = useState<string[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({});
  const [isRefining, setIsRefining] = useState<boolean>(false);

  // Load idempotent carryovers when department changes
  useEffect(() => {
    const carryovers = getIdempotentCarryoverIssues(department);
    setCarryoverIssues(carryovers);
  }, [department]);

  // Derive Handover Quality Score
  const currentQualityScore = calculateQualityScore({
    rawNotes,
    issues: extractedIssues.length > 0 ? extractedIssues : carryoverIssues,
    metrics: { target, actual, backlog, downtime, quality, staffing },
    department,
    shiftLead,
  });

  // Check if any critical issues lack owners
  const hasCriticalUnassigned = extractedIssues.some(
    i => (i.severity === 'Critical' || i.severity === 'High') && (!i.owner || i.owner.trim() === '' || i.owner === 'Unassigned')
  );

  // Quick scenario loader
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
    setExtractedIssues([]);
  };

  // Run AI / Heuristic Extraction
  const handleExtractWithAi = async (refineWithAnswers: boolean = false) => {
    if (!rawNotes.trim()) {
      setAnalysisError('Please enter what happened during the shift.');
      return;
    }

    if (refineWithAnswers) setIsRefining(true);
    else setIsAnalyzing(true);
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
        carriedOverIssues: carryoverIssues,
        answeredQuestions: answeredList,
      });

      const data = result.data;
      setAnalysisEngine(result.engine);
      setGeneralStatus((data.overallStatus as ShiftStatus) || generalStatus);
      setExecutiveSummary(data.executiveSummary || '');
      setCompletedActions(data.completedActions || []);
      setOutstandingItems(data.outstandingItems || []);
      setRisksList(data.risks || []);
      setNextPriorities(data.nextShiftPriorities || []);
      setAiRecommendations(data.recommendations || []);
      setPositiveOutcomes(data.positiveOutcomes || []);
      setEscalations(data.escalations || []);

      // Format issues into canonical OperationalIssue records
      const parsedIssues: OperationalIssue[] = (data.issues || []).map((iss: any, index: number) => ({
        id: `iss-${Date.now()}-${index}`,
        title: iss.title || 'Operational Disruption',
        category: (iss.category as IssueCategory) || 'Equipment',
        severity: (iss.severity as IssueSeverity) || 'Medium',
        status: (iss.status as IssueStatus) || 'Monitoring',
        description: iss.description || '',
        area: iss.area || department,
        department,
        firstIdentifiedAt: new Date().toISOString(),
        firstReportedShift: `${shift} Shift`,
        originHandoverId: `sho-${date}-${shift.toLowerCase()}`,
        handoverHistoryIds: [`sho-${date}-${shift.toLowerCase()}`],
        downtimeMinutes: iss.downtimeMinutes,
        operationalImpact: iss.operationalImpact,
        actionTaken: iss.actionTaken,
        recommendedAction: iss.recommendedAction,
        owner: iss.owner || 'Maintenance',
        contactPerson: iss.contactPerson,
        actionIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      setExtractedIssues(parsedIssues);
      if (Array.isArray(data.missingInformation) && data.missingInformation.length > 0) {
        setMissingQuestions(data.missingInformation);
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      setAnalysisError(err.message || 'Extraction failed.');
    } finally {
      setIsAnalyzing(false);
      setIsRefining(false);
    }
  };

  // Submit & Save Handover
  const handleFinalSubmit = () => {
    const handoverId = `sho-${date}-${shift.toLowerCase()}-${Date.now().toString().slice(-4)}`;

    // Prepare active issues list (extracted + ongoing carryovers)
    const allActiveIssues = [...extractedIssues, ...carryoverIssues];

    // Ensure all extracted issues have canonical actions created if next actions specified
    extractedIssues.forEach(iss => {
      if (iss.recommendedAction) {
        const actionId = `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newAct: OperationalAction = {
          id: actionId,
          issueId: iss.id,
          handoverId,
          title: iss.recommendedAction,
          action: iss.recommendedAction,
          relatedIssue: iss.title,
          priority: iss.severity === 'Critical' ? 'Critical' : iss.severity === 'High' ? 'High' : 'Medium',
          status: 'Not Started',
          owner: iss.owner || 'Maintenance',
          dueTime: 'Next Shift Window',
          createdBy: shiftLead,
          createdAt: new Date().toISOString(),
          approvedByLead: true,
        };
        saveAction(newAct);
        iss.actionIds = [actionId];
      }
      saveIssue(iss);
    });

    const newHandover: HandoverReport = {
      id: handoverId,
      date,
      shift,
      department,
      shiftLead,
      incomingShift,
      incomingLead,
      status: 'Submitted',
      generalStatus,
      shiftHealth: extractedIssues.some(i => i.severity === 'Critical') ? 'Critical' : 'Watch',
      riskLevel: extractedIssues.some(i => i.severity === 'Critical') ? 'Critical' : extractedIssues.some(i => i.severity === 'High') ? 'High' : 'Medium',
      version: 1,
      metrics: { target, actual, backlog, quality, downtime, staffing, safetyObservations },
      rawNotes,
      issueIds: allActiveIssues.map(i => i.id),
      inheritedIssueIds: carryoverIssues.map(i => i.id),
      issues: allActiveIssues,
      executiveSummary: executiveSummary || `Shift ${shift} in ${department} concluded with status ${generalStatus}.`,
      completedActions,
      outstandingItems: outstandingItems.length > 0 ? outstandingItems : extractedIssues.map(i => i.recommendedAction || i.title),
      risks: risksList.length > 0 ? risksList : ['Operational queue accumulation if line balance is delayed.'],
      nextShiftPriorities: nextPriorities.length > 0 ? nextPriorities : ['Verify station readiness during first 30 minutes.'],
      recommendations: aiRecommendations,
      positiveOutcomes: positiveOutcomes.length > 0 ? positiveOutcomes : ['Shift concluded safely with 0 lost-time injuries.'],
      escalations,
      missingInformation: missingQuestions,
      qualityScoreSnapshot: currentQualityScore,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onHandoverSaved(newHandover);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
            <Layers className="w-3.5 h-3.5" />
            <span>Shift Capture & Handover</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
            Tell ShiftFlow What Happened
          </h2>
          <p className="text-xs text-slate-500">
            Type naturally. ShiftFlow structures issues, downtime, impacts, and follow-ups.
          </p>
        </div>

        {/* 1-Click Scenario Loaders */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-slate-400">Load Scenario:</span>
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

      {/* CORE INPUT 1: "Tell ShiftFlow what happened" */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Shift Observation Notes
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {rawNotes.length} chars
          </span>
        </div>

        <textarea
          rows={5}
          value={rawNotes}
          onChange={e => setRawNotes(e.target.value)}
          placeholder='e.g. "Conveyor 7 stopped around 2:30. Maintenance reset it but it happened again around 4. We lost about 35 minutes. Packing backlog is 420. Sarah from maintenance said they will inspect the motor during day shift."'
          className="w-full p-3.5 text-xs sm:text-sm font-sans text-slate-900 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 bg-slate-50/50 leading-relaxed resize-y"
        />

        {analysisError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{analysisError}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="text-xs text-slate-500">
            ShiftFlow extracts: Problem, Equipment, Downtime, Impact, Status, and Next Action.
          </div>

          <button
            type="button"
            disabled={isAnalyzing}
            onClick={() => handleExtractWithAi(false)}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Structuring Shift Data...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Structure with ShiftFlow AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* CORE SECTION 2: AI Clarification & Coaching (Quality Score Meter) */}
      <QualityScoreMeter
        scoreSnapshot={currentQualityScore}
        onImproveClick={() => {
          if (missingQuestions.length > 0) {
            window.scrollTo({ top: 600, behavior: 'smooth' });
          } else {
            handleExtractWithAi(false);
          }
        }}
        onSubmitAnywayClick={handleFinalSubmit}
        hasCriticalUnassigned={hasCriticalUnassigned}
      />

      {/* Interactive Clarifying Questions (if missing info detected) */}
      {missingQuestions.length > 0 && (
        <div className="p-4 sm:p-5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>ShiftFlow Clarification Coach: Recommended Context</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Providing these details will raise your Handover Quality Score and eliminate assumptions for the incoming lead.
          </p>

          <div className="space-y-2.5 pt-1">
            {missingQuestions.map((q, idx) => (
              <div key={idx} className="bg-white p-3 rounded-lg border border-amber-200/70 space-y-1.5 text-xs">
                <div className="font-semibold text-slate-900">
                  {idx + 1}. {q}
                </div>
                <input
                  type="text"
                  placeholder="e.g. Yes, technician Sarah signed off at 15:45..."
                  value={questionAnswers[idx] || ''}
                  onChange={e => setQuestionAnswers({ ...questionAnswers, [idx]: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md border border-slate-200 focus:outline-hidden focus:border-amber-500 bg-slate-50/50"
                />
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={isRefining}
              onClick={() => handleExtractWithAi(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 transition-colors cursor-pointer"
            >
              {isRefining ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Refine Handover with Answers</span>
            </button>
          </div>
        </div>
      )}

      {/* CORE SECTION 3: Extracted Issues Review Cards */}
      {extractedIssues.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-600" />
              <span>Extracted Operational Issues ({extractedIssues.length})</span>
            </h3>
            <span className="text-xs text-slate-500">Review extraction before saving</span>
          </div>

          <div className="space-y-3">
            {extractedIssues.map((issue, idx) => (
              <ExtractionReviewCard
                key={issue.id}
                issue={issue}
                onUpdateIssue={updated => {
                  const copy = [...extractedIssues];
                  copy[idx] = updated;
                  setExtractedIssues(copy);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* CORE SECTION 4: Automatic Idempotent Carry-Over from Previous Shift */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
              <Clock className="w-3.5 h-3.5" />
              <span>Shift Continuity Engine</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-0.5">
              Carried Over From Previous Shift ({carryoverIssues.length})
            </h3>
            <p className="text-xs text-slate-500">
              Unresolved issues automatically carried forward until explicitly marked Resolved
            </p>
          </div>

          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
            {carryoverIssues.length} active carryover{carryoverIssues.length === 1 ? '' : 's'}
          </span>
        </div>

        {carryoverIssues.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
            No unresolved carryover issues active for {department}.
          </div>
        ) : (
          <div className="space-y-3">
            {carryoverIssues.map(issue => {
              const aging = calculateHoursOpen(issue);
              const shiftsCrossed = calculateShiftsCrossed(issue, allHandovers);

              return (
                <div
                  key={issue.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{issue.title}</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800">
                          {issue.severity}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-200 text-slate-800">
                          Status: {issue.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                        <span>Area: <strong className="text-slate-700">{issue.area}</strong></span>
                        <span>·</span>
                        <span>Owner: <strong className="text-slate-700">{issue.owner || 'Unassigned'}</strong></span>
                        <span>·</span>
                        <span>Open: <strong className="text-slate-700">{aging.formatted}</strong></span>
                        <span>·</span>
                        <span>Carried across: <strong className="text-slate-700">{shiftsCrossed} shift{shiftsCrossed > 1 ? 's' : ''}</strong></span>
                      </div>
                    </div>

                    {shiftsCrossed >= 3 && (
                      <div className="px-2.5 py-1 rounded-md bg-rose-100 border border-rose-300 text-[11px] font-bold text-rose-800 self-start sm:self-auto">
                        Repeated Unresolved Issue ({shiftsCrossed} shifts)
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-600">{issue.description}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Collapsible Shift Logistics & Optional Metrics */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Shift Context & Operational Metrics
            </h4>
            <p className="text-xs text-slate-500">Adjust date, shift leads, or quantitative KPIs if needed</p>
          </div>

          <button
            type="button"
            onClick={() => setShowMetricsDetails(!showMetricsDetails)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
          >
            <span>{showMetricsDetails ? 'Hide Details' : 'Expand Details'}</span>
            {showMetricsDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showMetricsDetails && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs pt-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Shift Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Shift</label>
              <select
                value={shift}
                onChange={e => setShift(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
              >
                <option value="Morning">Morning Shift (06:00 - 14:30)</option>
                <option value="Afternoon">Afternoon Shift (14:00 - 22:30)</option>
                <option value="Night">Night Shift (22:00 - 06:30)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Outgoing Lead</label>
              <input
                type="text"
                value={shiftLead}
                onChange={e => setShiftLead(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Incoming Lead</label>
              <input
                type="text"
                value={incomingLead}
                onChange={e => setIncomingLead(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Target vs Actual</label>
              <input
                type="text"
                value={actual}
                onChange={e => setActual(e.target.value)}
                placeholder="e.g. 13,820 units"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* FINAL ACTION BAR: Confirm & Save vs Cancel */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          Submitting preserves unbroken operational continuity and automatically carries open issues to {incomingShift}.
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFinalSubmit}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Save Handover</span>
          </button>
        </div>
      </div>
    </div>
  );
};
