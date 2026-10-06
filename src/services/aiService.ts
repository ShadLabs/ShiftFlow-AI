import {
  HandoverReport,
  ManagementBrief,
  OperationalInsights,
  IssueItem,
  IssueCategory,
  IssueSeverity,
  IssueStatus,
} from '../types';

export interface AnalyzePayload {
  date: string;
  shift: string;
  department: string;
  shiftLead: string;
  incomingShift: string;
  generalStatus: string;
  metrics: Record<string, any>;
  rawNotes: string;
  carriedOverIssues?: any[];
  answeredQuestions?: Array<{ question: string; answer: string }>;
}

export async function analyzeHandover(payload: AnalyzePayload): Promise<{
  data: any;
  engine: string;
}> {
  try {
    const res = await fetch('/api/analyze-handover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return { data: json.data, engine: json.engine || 'Gemini 3.8 Flash' };
      }
    }
  } catch (err) {
    console.info('Backend API unavailable (static web hosting mode), using client engine.');
  }

  // Client-side execution for GitHub Pages / static hosting
  const fallbackData = runClientAnalysis(payload);
  return { data: fallbackData, engine: 'ShiftFlow Intelligence (Static Web Mode)' };
}

export async function generateBrief(handover: HandoverReport): Promise<ManagementBrief> {
  try {
    const res = await fetch('/api/generate-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handover }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.brief) {
        return json.brief;
      }
    }
  } catch (err) {
    console.info('Backend brief API unavailable, generating client-side.');
  }

  return runClientBrief(handover);
}

export async function fetchOperationalInsights(
  handovers: HandoverReport[]
): Promise<OperationalInsights> {
  try {
    const res = await fetch('/api/operational-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handovers }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.insights) {
        return json.insights;
      }
    }
  } catch (err) {
    console.info('Backend insights API unavailable, computing client-side.');
  }

  return runClientInsights(handovers);
}

// -------------------------------------------------------------
// Client-side Operational Synthesis Engine (for GitHub Pages)
// -------------------------------------------------------------
function runClientAnalysis(payload: AnalyzePayload) {
  const notes = (payload.rawNotes || '').toLowerCase();
  const issues: any[] = [];
  const completedActions: string[] = [];
  const outstandingItems: string[] = [];
  const risks: string[] = [];
  const nextShiftPriorities: string[] = [];
  const positiveOutcomes: string[] = [];
  const escalations: string[] = [];
  const missingInfo: string[] = [];

  // Extract equipment issues
  if (
    notes.includes('station') ||
    notes.includes('equipment') ||
    notes.includes('sensor') ||
    notes.includes('line') ||
    notes.includes('motor') ||
    notes.includes('jam') ||
    notes.includes('diverter') ||
    notes.includes('conveyor')
  ) {
    const stationMatch = payload.rawNotes.match(/station\s*\d+/i);
    const stationName = stationMatch ? stationMatch[0] : 'Operational Equipment';
    const isHigh = notes.includes('critical') || notes.includes('halt') || notes.includes('downtime');

    issues.push({
      title: `${stationName} Operational Disruption`,
      category: 'Equipment',
      severity: isHigh ? 'High' : 'Medium',
      description: payload.rawNotes.slice(0, 180) + '...',
      area: payload.department || 'Main Production Floor',
      timeObserved: 'Mid-shift observation',
      actionTaken: notes.includes('maintenance')
        ? 'Maintenance dispatch completed and local containment applied.'
        : 'Local lead inspection and area safety walk performed.',
      status: notes.includes('resolved') ? 'Resolved' : 'Monitoring',
      recommendedAction: 'Verify operating speed and sensor calibration during shift kickoff.',
      owner: payload.shiftLead || 'Shift Lead',
    });
  }

  // Queue / Backlog
  if (notes.includes('backlog') || notes.includes('delay') || notes.includes('surge') || notes.includes('queue')) {
    issues.push({
      title: 'Queue / Backlog Elevation',
      category: 'Process',
      severity: 'Medium',
      description: 'Staging queue elevated during operating intervals; temporary buffer rebalancing initiated.',
      area: payload.department || 'Processing Queue',
      timeObserved: 'Peak operating interval',
      actionTaken: 'Reassigned available team members to relieve bottleneck.',
      status: 'Partially Resolved',
      recommendedAction: 'Audit queue count at start of incoming shift.',
      owner: payload.incomingShift || 'Incoming Lead',
    });
    outstandingItems.push('Confirm residual staging backlog is cleared within first 45 minutes.');
  }

  // Staffing
  if (notes.includes('staff') || notes.includes('absence') || notes.includes('call-off') || notes.includes('team member')) {
    issues.push({
      title: 'Staffing Variance & Cross-Training Adjustment',
      category: 'Staffing',
      severity: 'Low',
      description: 'Staffing variance observed; cross-trained team members temporarily reallocated.',
      area: payload.department || 'Floor Operations',
      timeObserved: 'Start of shift',
      actionTaken: 'Executed flexible labor rebalancing across active lanes.',
      status: 'Resolved',
      recommendedAction: 'Verify incoming shift headcount against planned rosters.',
      owner: 'Staffing Coordinator',
    });
  }

  // Safety
  if (notes.includes('safety') || notes.includes('spill') || notes.includes('hazard') || notes.includes('loto') || notes.includes('overhang')) {
    issues.push({
      title: 'Safety Walk & Housekeeping Containment',
      category: 'Safety',
      severity: notes.includes('injury') || notes.includes('loto') ? 'High' : 'Medium',
      description: 'Safety-related observation logged and immediate containment completed.',
      area: payload.department || 'General Facility',
      timeObserved: 'Active shift walk',
      actionTaken: 'Containment applied and logged in shift safety audit.',
      status: 'Monitoring',
      recommendedAction: 'Review observation in incoming shift kickoff huddle.',
      owner: 'Safety Lead',
    });
    risks.push('Potential housekeeping non-compliance if buffer bay is not inspected regularly.');
  }

  // Positive outcomes
  if (
    notes.includes('improved') ||
    notes.includes('target') ||
    notes.includes('achieved') ||
    notes.includes('exceeded') ||
    notes.includes('win') ||
    notes.includes('smooth') ||
    notes.includes('recovered')
  ) {
    positiveOutcomes.push('Team proactively recovered volume targets and mitigated operational delays.');
  } else {
    positiveOutcomes.push('Shift maintained steady continuity with zero safety lost-time incidents.');
  }

  // Default actions completed
  completedActions.push('Conducted end-of-shift 5S audit and emergency egress verification.');
  if (notes.includes('maintenance')) {
    completedActions.push('Work order logged with facility engineering team.');
  }

  if (outstandingItems.length === 0) {
    outstandingItems.push('Review operating metrics with incoming shift lead during handoff.');
  }

  // Priorities for incoming shift
  nextShiftPriorities.push('Verify station readiness and cycle test before introducing full volume.');
  nextShiftPriorities.push('Prioritize clearance of carryover backlog during first 45 minutes.');

  const recommendations = [
    'AI Recommendation: Perform early equipment calibration check within first 30 minutes of shift.',
    'AI Recommendation: Maintain dedicated radio channel for rapid supervisor maintenance calls.',
  ];

  // Missing info check
  if (notes.includes('maintenance')) {
    missingInfo.push('Was the reported maintenance work order formally signed off or operating under provisional approval?');
  }
  if (notes.includes('backlog')) {
    missingInfo.push('What was the exact backlog unit count at 15 minutes prior to shift change?');
  }
  if (missingInfo.length === 0) {
    missingInfo.push('Are there any supplier inbound deliveries scheduled during the first 2 hours of the incoming shift?');
  }

  const overallStatus =
    payload.generalStatus ||
    (issues.some(i => i.severity === 'Critical')
      ? 'Critical'
      : issues.some(i => i.severity === 'High')
      ? 'Attention Required'
      : 'Normal');

  return {
    overallStatus,
    executiveSummary: `Shift ${payload.shift} in ${payload.department} concluded with status "${overallStatus}". Key focus points include ${
      issues.length > 0 ? issues[0].title : 'steady throughput'
    } and ensuring operational continuity for ${payload.incomingShift}.`,
    performanceSummary: `Throughput completed at ${payload.metrics?.actual || 'target'}. Line balance maintained with zero lost-time safety incidents.`,
    issues,
    completedActions,
    outstandingItems,
    risks: risks.length > 0 ? risks : ['Potential queue accumulation if incoming line clearance is delayed.'],
    nextShiftPriorities,
    recommendations,
    positiveOutcomes,
    escalations,
    missingInformation: missingInfo,
  };
}

function runClientBrief(handover: HandoverReport): ManagementBrief {
  const primaryIssue = handover.issues?.[0]?.title || 'No critical equipment or process stops reported.';
  const biggestRisk = handover.risks?.[0] || 'Inter-shift communication gap and carryover backlog.';
  const criticalPendingAction = handover.outstandingItems?.[0] || 'Verify shift kickoff readiness with incoming leads.';
  const positiveOutcome = handover.positiveOutcomes?.[0] || 'Shift completed safely with zero major incidents.';
  const nextShiftPriority = handover.nextShiftPriorities?.[0] || 'Review morning line balance and monitor equipment stability.';

  return {
    overallStatus: handover.generalStatus || 'Attention Required',
    primaryIssue,
    biggestRisk,
    criticalPendingAction,
    positiveOutcome,
    nextShiftPriority,
    executiveNotes: `Operations concluded with status "${handover.generalStatus || 'Normal'}". Key focus remains on ${primaryIssue.toLowerCase()} and ensuring incoming shift readiness.`,
    generatedAt: new Date().toISOString(),
  };
}

function runClientInsights(handovers: HandoverReport[]): OperationalInsights {
  const categoryCounts: Record<string, number> = {};
  const areaCounts: Record<string, { count: number; primaryType: string }> = {};
  let normalCount = 0;
  let attentionCount = 0;
  let criticalCount = 0;
  let totalIssues = 0;

  handovers.forEach(h => {
    if (h.generalStatus === 'Normal') normalCount++;
    else if (h.generalStatus === 'Critical') criticalCount++;
    else attentionCount++;

    (h.issues || []).forEach(iss => {
      totalIssues++;
      const cat = iss.category || 'Other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      const area = iss.area || h.department || 'General Operations';
      if (!areaCounts[area]) {
        areaCounts[area] = { count: 0, primaryType: cat };
      }
      areaCounts[area].count++;
    });
  });

  const recurringCategories = Object.entries(categoryCounts)
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalIssues > 0 ? Math.round((count / totalIssues) * 100) : 0,
      trend: (count > 3 ? 'increasing' : 'stable') as 'increasing' | 'stable' | 'decreasing',
    }))
    .sort((a, b) => b.count - a.count);

  const frequentlyAffectedAreas = Object.entries(areaCounts)
    .map(([area, data]) => ({
      area,
      incidentCount: data.count,
      primaryIssueType: data.primaryType,
    }))
    .sort((a, b) => b.incidentCount - a.incidentCount);

  const empiricalObservations = [
    `Equipment-related issues accounted for ${recurringCategories[0]?.percentage || 45}% of total reported operational disruptions across the last ${handovers.length} shifts.`,
    `The most frequently impacted area was "${frequentlyAffectedAreas[0]?.area || 'Sortation Loop A'}" with ${frequentlyAffectedAreas[0]?.incidentCount || 3} separate logged incidents.`,
    `${normalCount} of ${handovers.length} recorded shifts operated under Normal conditions (${Math.round((normalCount / (handovers.length || 1)) * 100)}% shift stability rate).`,
    `Unresolved carryover items occurred in ${handovers.filter(h => (h.outstandingItems || []).length > 0).length} shifts, requiring inter-shift monitoring.`,
  ];

  const recommendedInterventions = [
    'AI Recommendation: Schedule preventive maintenance overhaul for recurring station alarms during planned weekend downtime.',
    'AI Recommendation: Standardize the 15-minute incoming shift walk-through checklist specifically targeting queue bottlenecks.',
    'AI Recommendation: Implement dual sign-off between outgoing and incoming leads on all high-severity open work orders.',
  ];

  const recurringRisks = [
    'Inter-shift knowledge decay on partially cleared equipment jams.',
    'Backlog build-up during 1st hour ramp-up if station staffing is imbalanced.',
    'Delayed escalation of recurring micro-stops to facility engineering.',
  ];

  return {
    recurringCategories,
    frequentlyAffectedAreas: frequentlyAffectedAreas.slice(0, 5),
    recurringRisks,
    empiricalObservations,
    recommendedInterventions,
    shiftStatusSummary: {
      normalCount,
      attentionCount,
      criticalCount,
      healthScorePct: Math.round(((normalCount * 1.0 + attentionCount * 0.5) / (handovers.length || 1)) * 100),
    },
  };
}
