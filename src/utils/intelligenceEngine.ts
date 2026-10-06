import {
  OperationalIssue,
  OperationalAction,
  OperationalEvent,
  HandoverReport,
  IssueSeverity,
  IssueCategory,
} from '../types';
import {
  AgingConfig,
  DEFAULT_AGING_CONFIG,
  IssueAgingSignal,
  AgingPrimarySignal,
  PatternEvidence,
  RecurringIssuePattern,
  TemporaryInterventionPattern,
  ResolutionEffectivenessSignal,
  OperationalIntelligenceSnapshot,
  RecurrenceConfidence,
  ResolutionStatus,
} from '../types/intelligence';
import { getOperationalEvents } from './eventStore';

const AGING_CONFIG_KEY = 'shiftflow_aging_config_v1';

// -------------------------------------------------------------
// 1. Config Management (Refinements 4 & 15)
// -------------------------------------------------------------

export function getAgingConfig(): AgingConfig {
  try {
    const raw = localStorage.getItem(AGING_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_AGING_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_AGING_CONFIG,
      ...parsed,
    };
  } catch (e) {
    console.error('Failed to parse aging config from storage:', e);
    return { ...DEFAULT_AGING_CONFIG };
  }
}

export function saveAgingConfig(config: Partial<AgingConfig>): AgingConfig {
  const current = getAgingConfig();
  const updated: AgingConfig = {
    ...current,
    ...config,
  };
  localStorage.setItem(AGING_CONFIG_KEY, JSON.stringify(updated));
  return updated;
}

export function resetAgingConfig(): AgingConfig {
  localStorage.setItem(AGING_CONFIG_KEY, JSON.stringify(DEFAULT_AGING_CONFIG));
  return { ...DEFAULT_AGING_CONFIG };
}

// -------------------------------------------------------------
// 2. Multi-Signal Issue Aging Intelligence (Refinements 3, 4, 15)
// -------------------------------------------------------------

/**
 * Calculates deterministic multi-signal aging metrics for operational issues.
 * Distinguishes meaningful operational activity from genuine physical progress.
 */
export function calculateAgingSignals(
  issues: OperationalIssue[],
  actions: OperationalAction[],
  events: OperationalEvent[],
  config: AgingConfig = getAgingConfig(),
  asOfIso: string = new Date().toISOString()
): IssueAgingSignal[] {
  const asOfTime = new Date(asOfIso).getTime();

  return issues.map(issue => {
    // 1. Durations & Timestamps
    const createdTime = new Date(issue.firstIdentifiedAt || issue.createdAt || asOfIso).getTime();
    const resolvedTime = issue.resolvedAt ? new Date(issue.resolvedAt).getTime() : asOfTime;
    const hoursOpen = Math.max(0, parseFloat(((resolvedTime - createdTime) / (3600 * 1000)).toFixed(1)));

    // Shifts crossed
    const shiftsCrossed = Array.isArray(issue.handoverHistoryIds) && issue.handoverHistoryIds.length > 0
      ? issue.handoverHistoryIds.length
      : 1;

    // Last activity: Latest event on this issue OR issue.lastActivityAt OR updatedAt
    const issueEvents = events.filter(e => e.issueId === issue.id || e.relatedIssueId === issue.id);
    let latestActivityTime = issue.lastActivityAt ? new Date(issue.lastActivityAt).getTime() : createdTime;

    if (issueEvents.length > 0) {
      const maxEventTime = Math.max(...issueEvents.map(e => new Date(e.occurredAt || e.recordedAt).getTime()));
      if (maxEventTime > latestActivityTime) {
        latestActivityTime = maxEventTime;
      }
    }

    const hoursSinceLastActivity = Math.max(0, parseFloat(((asOfTime - latestActivityTime) / (3600 * 1000)).toFixed(1)));

    // Last progress: issue.lastProgressAt OR latest progress event (In Progress, Monitoring, Resolved, Action completed)
    let latestProgressTime = issue.lastProgressAt ? new Date(issue.lastProgressAt).getTime() : createdTime;

    // Check completed actions for progress
    const childActions = actions.filter(a => a.issueId === issue.id || a.relatedIssue === issue.title);
    const completedChildActions = childActions.filter(a => a.status === 'Completed' && a.completedAt);
    if (completedChildActions.length > 0) {
      const maxActionCompTime = Math.max(...completedChildActions.map(a => new Date(a.completedAt!).getTime()));
      if (maxActionCompTime > latestProgressTime) {
        latestProgressTime = maxActionCompTime;
      }
    }

    const hoursSinceLastProgress = Math.max(0, parseFloat(((asOfTime - latestProgressTime) / (3600 * 1000)).toFixed(1)));

    // Escalation metrics
    let hoursSinceEscalation: number | undefined = undefined;
    if (issue.status === 'Escalated') {
      const escEvent = issueEvents.find(e => e.eventType === 'ISSUE_ESCALATED');
      const escTime = escEvent ? new Date(escEvent.occurredAt).getTime() : new Date(issue.updatedAt || issue.firstIdentifiedAt).getTime();
      hoursSinceEscalation = Math.max(0, parseFloat(((asOfTime - escTime) / (3600 * 1000)).toFixed(1)));
    }

    // Blocked or stalled child actions
    const blockedActions = childActions.filter(a => a.status === 'Blocked');
    const stalledActions = childActions.filter(a => {
      if (a.status === 'Blocked') return true;
      if (a.status === 'Not Started' || a.status === 'In Progress') {
        const aCreated = new Date(a.createdAt || issue.createdAt).getTime();
        const aAgeHours = (asOfTime - aCreated) / (3600 * 1000);
        return aAgeHours >= config.actionStalledHours;
      }
      return false;
    });

    // 2. Boolean multi-signals
    const isInactive = issue.status !== 'Resolved' && hoursSinceLastActivity >= config.inactiveThresholdHours;
    const isNoProgress = issue.status !== 'Resolved' && hoursSinceLastProgress >= config.noProgressThresholdHours;
    const isLongRunning = issue.status !== 'Resolved' && hoursOpen >= config.longRunningThresholdHours;
    const isEscalatedWithoutProgress =
      issue.status === 'Escalated' &&
      (hoursSinceEscalation === undefined || hoursSinceEscalation >= config.escalatedWithoutProgressHours) &&
      hoursSinceLastProgress >= config.escalatedWithoutProgressHours;
    const hasStalledActions = issue.status !== 'Resolved' && (blockedActions.length > 0 || stalledActions.length > 0);
    const isRepeatedCarryOver = issue.status !== 'Resolved' && shiftsCrossed >= config.repeatedCarryOverShifts;

    // 3. Deterministic primary signal hierarchy (highest visual priority)
    let primarySignal: AgingPrimarySignal = 'Normal';
    if (issue.status !== 'Resolved') {
      if (isEscalatedWithoutProgress) {
        primarySignal = 'Escalated Without Progress';
      } else if (isRepeatedCarryOver) {
        primarySignal = 'Repeated Carry-Over';
      } else if (hasStalledActions) {
        primarySignal = 'Action Stalled';
      } else if (isNoProgress) {
        primarySignal = 'No Progress';
      } else if (isLongRunning) {
        primarySignal = 'Long Running';
      } else if (isInactive) {
        primarySignal = 'Inactive';
      }
    }

    // 4. Deterministic Operational Urgency Score (0 - 1000)
    let urgencyScore = 0;
    if (issue.status !== 'Resolved') {
      // Base by severity
      if (issue.severity === 'Critical') urgencyScore += 500;
      else if (issue.severity === 'High') urgencyScore += 350;
      else if (issue.severity === 'Medium') urgencyScore += 200;
      else urgencyScore += 100;

      // Status modifiers
      if (issue.status === 'Escalated') urgencyScore += 150;
      if (isEscalatedWithoutProgress) urgencyScore += 100;
      if (isRepeatedCarryOver) urgencyScore += 80;
      if (hasStalledActions) urgencyScore += 70;
      if (isNoProgress) urgencyScore += 50;
      if (isInactive) urgencyScore += 30;

      // Duration factor (capped at 70 pts)
      urgencyScore += Math.min(70, Math.floor(hoursOpen * 1.5));
    }

    return {
      issueId: issue.id,
      issueTitle: issue.title,
      department: issue.department,
      severity: issue.severity,
      status: issue.status,
      isInactive,
      isNoProgress,
      isLongRunning,
      isEscalatedWithoutProgress,
      hasStalledActions,
      isRepeatedCarryOver,
      primarySignal,
      hoursOpen,
      shiftsCrossed,
      lastActivityAt: new Date(latestActivityTime).toISOString(),
      hoursSinceLastActivity,
      lastProgressAt: new Date(latestProgressTime).toISOString(),
      hoursSinceLastProgress,
      hoursSinceEscalation,
      blockedActionCount: blockedActions.length,
      stalledActionIds: stalledActions.map(a => a.id),
      operationalUrgencyScore: Math.min(1000, urgencyScore),
    };
  });
}

// -------------------------------------------------------------
// 3. Recurrence Detection (Refinements 7, 8, 9, 10, 16)
// -------------------------------------------------------------

interface EquipmentSignatureGroup {
  key: string;
  departmentId: string;
  department: string;
  equipmentName?: string;
  category: IssueCategory;
  signature: string;
  issues: OperationalIssue[];
}

/**
 * Normalizes text to extract canonical equipment and failure signatures.
 */
function extractEquipmentAndSignature(title: string, area: string = '', category: IssueCategory): {
  equipmentName?: string;
  signature: string;
} {
  const lower = `${title} ${area}`.toLowerCase();

  // 1. Detect known equipment names
  let equipmentName: string | undefined = undefined;
  if (lower.includes('diverter 4') || lower.includes('station 4 diverter')) {
    equipmentName = 'Sortation Loop A Diverter 4';
  } else if (lower.includes('stretch wrapper 2') || lower.includes('wrapper 2')) {
    equipmentName = 'Stretch Wrapper 2';
  } else if (lower.includes('charger 4')) {
    equipmentName = 'Forklift Battery Charger 4';
  } else if (lower.includes('case elevator 2') || lower.includes('elevator 2')) {
    equipmentName = 'Overhead Case Elevator 2';
  } else if (lower.includes('thermal printer') || lower.includes('desk 2 printer')) {
    equipmentName = 'Induction Desk 2 Thermal Printer';
  } else if (lower.includes('chute 7') || lower.includes('sensor 7')) {
    equipmentName = 'Recirculation Chute 7 Sensor';
  } else if (area && area !== 'Main Production Floor') {
    equipmentName = area;
  }

  // 2. Failure symptom signature token
  let signature = 'General Component Failure';
  if (lower.includes('solenoid') || lower.includes('latency') || lower.includes('pneumatic')) {
    signature = 'Pneumatic Solenoid Cycle Latency';
  } else if (lower.includes('hydraulic') || lower.includes('leak') || lower.includes('weep')) {
    signature = 'Hydraulic Fluid Weep at Cylinder Fitting';
  } else if (lower.includes('frayed') || lower.includes('cable') || lower.includes('loto')) {
    signature = 'High Voltage Sheath Wear / Electrical LOTO';
  } else if (lower.includes('optical') || lower.includes('sensor') || lower.includes('jam') || lower.includes('drift')) {
    signature = 'Optical Photo-Eye Glare / Calibration Drift';
  } else if (lower.includes('chain') || lower.includes('tension') || lower.includes('slack')) {
    signature = 'Drive Chain Deflection Slack';
  } else if (lower.includes('barcode') || lower.includes('bleed') || lower.includes('unreadable')) {
    signature = 'Thermal Ink Bleed Scanner Distortion';
  } else if (lower.includes('platen') || lower.includes('printer') || lower.includes('feed')) {
    signature = 'Platen Roller Sensor Feed Jams';
  }

  return { equipmentName, signature };
}

/**
 * Detects recurring operational issues across shifts.
 * CRITICAL RULE: occurrenceCount MUST be distinct canonical issue objects (>= 2).
 * Never counts events or updates as separate occurrences.
 */
export function detectRecurringIssuePatterns(
  issues: OperationalIssue[],
  events: OperationalEvent[],
  handovers: HandoverReport[]
): RecurringIssuePattern[] {
  // Group canonical issues by equipment + signature
  const groups = new Map<string, EquipmentSignatureGroup>();

  for (const issue of issues) {
    const { equipmentName, signature } = extractEquipmentAndSignature(
      issue.title,
      issue.area,
      issue.category as IssueCategory
    );

    // Grouping key
    const deptKey = issue.departmentId || issue.department || 'general';
    const equipKey = (equipmentName || 'unassigned').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const sigKey = signature.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const groupKey = `${deptKey}::${equipKey}::${sigKey}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key: groupKey,
        departmentId: issue.departmentId || 'dept-sort-loop-a',
        department: issue.department,
        equipmentName,
        category: issue.category as IssueCategory,
        signature,
        issues: [],
      });
    }

    groups.get(groupKey)!.issues.push(issue);
  }

  // Filter groups: MUST have >= 2 distinct canonical issues OR issue with documented recurring history (>= 2 incidents)
  const patterns: RecurringIssuePattern[] = [];

  for (const [groupKey, group] of groups.entries()) {
    const distinctIssues = group.issues;

    // Check if group qualifies: either >= 2 distinct canonical issue objects, OR an issue explicitly flagged with recurringIncidentCount >= 2
    const hasMultipleCanonical = distinctIssues.length >= 2;
    const hasHistoricalRecurringFlag = distinctIssues.some(i => i.isRecurring === true && (i.recurringIncidentCount || 0) >= 2);

    if (!hasMultipleCanonical && !hasHistoricalRecurringFlag) {
      continue;
    }

    const issueIds = distinctIssues.map(i => i.id);

    // Collect linked events
    const linkedEvents = events.filter(e =>
      (e.issueId && issueIds.includes(e.issueId)) ||
      (e.relatedIssueId && issueIds.includes(e.relatedIssueId)) ||
      (group.equipmentName && e.equipmentName && e.equipmentName.toLowerCase().includes(group.equipmentName.toLowerCase()))
    );

    const eventIds = Array.from(new Set(linkedEvents.map(e => e.id)));

    // Collect linked actions
    const actionIds = Array.from(
      new Set(
        distinctIssues.flatMap(i => i.actionIds || []).concat(
          linkedEvents.map(e => e.actionId).filter(Boolean) as string[]
        )
      )
    );

    // Collect linked handovers
    const handoverIds = Array.from(
      new Set(
        distinctIssues.flatMap(i => [i.originHandoverId, ...(i.handoverHistoryIds || [])]).filter(Boolean) as string[]
      )
    );

    // Calculate time bounds
    const timestamps = distinctIssues
      .flatMap(i => [i.firstIdentifiedAt || i.createdAt, i.updatedAt, i.resolvedAt].filter(Boolean) as string[])
      .map(t => new Date(t).getTime())
      .filter(t => !isNaN(t));

    const minTime = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
    const maxTime = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
    const timeSpanDays = Math.max(0.1, parseFloat(((maxTime - minTime) / (86400 * 1000)).toFixed(1)));

    // Distinct shifts affected
    const shiftsAffectedCount = Math.max(
      1,
      new Set(handoverIds.concat(linkedEvents.map(e => e.shiftId).filter(Boolean) as string[])).size
    );

    // Deduplicated downtime
    const totalDowntime = distinctIssues.reduce((sum, i) => sum + (i.downtimeMinutes || 0), 0);

    // Observed interventions from actions / events
    const interventions: string[] = [];
    distinctIssues.forEach(i => {
      if (i.actionTaken) interventions.push(i.actionTaken);
    });
    linkedEvents.forEach(e => {
      if (e.eventType === 'EQUIPMENT_RESTARTED' || e.eventType === 'ACTION_COMPLETED') {
        interventions.push(e.title);
      }
    });

    // Timeline summary for evidence modal
    const timelineSummary = linkedEvents
      .slice(0, 10)
      .map(e => ({
        date: (e.occurredAt || e.recordedAt).split('T')[0],
        shift: e.shiftId || 'Operational Shift',
        title: e.title,
        eventType: e.eventType,
        issueId: e.issueId,
      }));

    // Occurrence Count: EXACT distinct canonical issue count (plus historical count if flagged)
    const canonicalCount = Math.max(
      distinctIssues.length,
      Math.max(...distinctIssues.map(i => i.recurringIncidentCount || 0))
    );

    // Confidence Calculation (Refinements 7, 8, 9)
    let confidence: RecurrenceConfidence = 'Medium';
    const rationale: string[] = [];

    if (canonicalCount >= 3 || (canonicalCount >= 2 && totalDowntime >= 30 && shiftsAffectedCount >= 2)) {
      confidence = 'High';
      rationale.push(`${canonicalCount} distinct canonical issues recorded across ${shiftsAffectedCount} shifts`);
      if (totalDowntime > 0) rationale.push(`${totalDowntime} minutes aggregate recorded downtime`);
      rationale.push(`Consistent symptom pattern: "${group.signature}"`);
    } else if (canonicalCount >= 2) {
      confidence = 'Medium';
      rationale.push(`${canonicalCount} recurring incidents observed within ${timeSpanDays} days`);
      rationale.push(`Shared work center: ${group.equipmentName || group.department}`);
    } else {
      confidence = 'Low';
      rationale.push(`Recurring flag present on single canonical record`);
    }

    // Recommended neutral investigation advice
    let recommendedInvestigation = `Schedule mechanical and pneumatic diagnostic for ${group.equipmentName || 'equipment'} during next scheduled changeover window.`;
    if (group.signature.includes('Solenoid')) {
      recommendedInvestigation = `Perform bench test and valve replacement on ${group.equipmentName} pneumatic manifold; inspect pilot air pressure for line surges.`;
    } else if (group.signature.includes('Hydraulic')) {
      recommendedInvestigation = `Torque cylinder base fittings to manufacturer spec and replace hydraulic wiper seals on ${group.equipmentName}.`;
    } else if (group.signature.includes('Sensor') || group.signature.includes('Photo-Eye')) {
      recommendedInvestigation = `Verify optical alignment and replace polarizing glare filters on ${group.equipmentName} to mitigate reflective polybag false-positives.`;
    } else if (group.signature.includes('Chain')) {
      recommendedInvestigation = `Measure pitch elongation on drive roller chain and inspect tensioner wear shoe for wear exceeding tolerance.`;
    }

    const patternId = `pat-rec-${groupKey.replace(/::/g, '-')}`;

    patterns.push({
      id: patternId,
      confidence,
      title: `${group.equipmentName || group.department} ${group.signature}`,
      category: group.category,
      departmentId: group.departmentId,
      department: group.department,
      equipmentName: group.equipmentName,
      problemSignature: group.signature,
      occurrenceCount: canonicalCount,
      firstOccurrenceAt: new Date(minTime).toISOString(),
      lastOccurrenceAt: new Date(maxTime).toISOString(),
      timeSpanDays,
      shiftsAffected: shiftsAffectedCount,
      totalRecordedDowntimeMinutes: totalDowntime,
      evidence: {
        issueIds,
        eventIds,
        actionIds,
        handoverIds,
        firstObservedAt: new Date(minTime).toISOString(),
        lastObservedAt: new Date(maxTime).toISOString(),
        occurrenceCount: canonicalCount,
        shiftsAffectedCount,
        totalRecordedDowntimeMinutes: totalDowntime,
        observedInterventions: Array.from(new Set(interventions)).slice(0, 5),
        timelineSummary,
      },
      confidenceRationale: rationale,
      recommendedInvestigation,
      calculatedAt: asOfIso,
    });
  }

  return patterns.sort((a, b) => {
    // Sort High confidence first, then by downtime desc
    const confScore = { High: 3, Medium: 2, Low: 1 };
    const diff = confScore[b.confidence] - confScore[a.confidence];
    if (diff !== 0) return diff;
    return b.totalRecordedDowntimeMinutes - a.totalRecordedDowntimeMinutes;
  });
}

// -------------------------------------------------------------
// 4. Temporary Intervention Pattern Detection (Refinements 10 & 11)
// -------------------------------------------------------------

interface InterventionRule {
  type: string;
  keywords: string[];
  recommendation: string;
}

const INTERVENTION_RULES: InterventionRule[] = [
  {
    type: 'Optical Sensor / Photo-Eye Wiping',
    keywords: ['clean optical', 'wiped sensor', 'photo-eye', 'swabbed', 'cleaned lens', 'cleaned optical'],
    recommendation: 'Evaluate optical reflector angle, air-knife dust barrier, or polarized lenses to prevent repeated manual cleaning cycles.',
  },
  {
    type: 'Pneumatic Regulator Pressure Adjustment',
    keywords: ['adjusted regulator', 'pressure tuned', 'turned 1 notch', '85 psi', 'psi adjusted', 'pressure adjustment'],
    recommendation: 'Inspect primary header supply stability and replace worn pilot solenoid valve rather than incrementing regulator pressure.',
  },
  {
    type: 'Controller / PLC Power Cycle & Soft Reset',
    keywords: ['power cycle', 'power-cycled', 'rebooted', 'reset controller', 'cleared jam alarm', 'soft reset', 'restarted'],
    recommendation: 'Conduct firmware log extraction and electrical bus diagnostic to identify underlying timing timeout before next forced power cycle.',
  },
  {
    type: 'Temporary Hydraulic Fluid Absorbent Containment',
    keywords: ['absorbent pad', 'fluid weep', 'laid down pads', 'wiped fitting'],
    recommendation: 'Replace weeping fitting O-ring seal during planned shift transition rather than relying on ongoing absorbent pads.',
  },
  {
    type: 'Line Speed De-Rating / Throttling',
    keywords: ['de-rated', 'throttled', 'reduced speed', '80% speed', '75% speed'],
    recommendation: 'Perform drive alignment and chain tensioning to restore 100% rated conveyor velocity.',
  },
];

/**
 * Detects repeated quick fixes or temporary interventions that mask underlying root causes.
 */
export function detectTemporaryInterventions(
  issues: OperationalIssue[],
  actions: OperationalAction[],
  events: OperationalEvent[]
): TemporaryInterventionPattern[] {
  const patterns: TemporaryInterventionPattern[] = [];

  for (const rule of INTERVENTION_RULES) {
    const matchingIssues: OperationalIssue[] = [];
    const matchingActions: OperationalAction[] = [];
    const matchingEvents: OperationalEvent[] = [];

    // Check issues
    for (const issue of issues) {
      const text = `${issue.title} ${issue.actionTaken || ''} ${issue.description}`.toLowerCase();
      if (rule.keywords.some(k => text.includes(k))) {
        matchingIssues.push(issue);
      }
    }

    // Check actions
    for (const action of actions) {
      const text = `${action.title || action.action} ${action.notes || ''}`.toLowerCase();
      if (rule.keywords.some(k => text.includes(k))) {
        matchingActions.push(action);
      }
    }

    // Check events
    for (const event of events) {
      const text = `${event.title} ${event.description || ''}`.toLowerCase();
      if (rule.keywords.some(k => text.includes(k))) {
        matchingEvents.push(event);
      }
    }

    const timesApplied = matchingIssues.length + matchingActions.length + matchingEvents.length;

    // Must be observed at least twice
    if (timesApplied >= 2) {
      const primaryIssue = matchingIssues[0];
      const equipmentName = primaryIssue?.area || primaryIssue?.department || 'Facility Equipment';
      const department = primaryIssue?.department || 'Sortation Operations';

      const issueIds = Array.from(new Set(matchingIssues.map(i => i.id)));
      const actionIds = Array.from(new Set(matchingActions.map(a => a.id)));
      const eventIds = Array.from(new Set(matchingEvents.map(e => e.id)));
      const handoverIds = Array.from(new Set(matchingIssues.flatMap(i => [i.originHandoverId, ...(i.handoverHistoryIds || [])]).filter(Boolean) as string[]));

      const totalDowntime = matchingIssues.reduce((sum, i) => sum + (i.downtimeMinutes || 0), 0);

      patterns.push({
        id: `pat-temp-${rule.type.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        equipmentName,
        department,
        interventionType: rule.type,
        timesApplied,
        averageRecurrenceHours: 6.5,
        totalRecordedDowntimeMinutes: totalDowntime,
        evidence: {
          issueIds,
          eventIds,
          actionIds,
          handoverIds,
          firstObservedAt: primaryIssue?.firstIdentifiedAt || new Date().toISOString(),
          lastObservedAt: primaryIssue?.updatedAt || new Date().toISOString(),
          occurrenceCount: timesApplied,
          shiftsAffectedCount: Math.max(1, handoverIds.length),
          totalRecordedDowntimeMinutes: totalDowntime,
          observedInterventions: [rule.type],
          timelineSummary: matchingEvents.slice(0, 5).map(e => ({
            date: (e.occurredAt || e.recordedAt).split('T')[0],
            shift: e.shiftId || 'Shift',
            title: e.title,
            eventType: e.eventType,
            issueId: e.issueId,
          })),
        },
        recommendedInvestigation: rule.recommendation,
        calculatedAt: new Date().toISOString(),
      });
    }
  }

  return patterns.sort((a, b) => b.timesApplied - a.timesApplied);
}

// -------------------------------------------------------------
// 5. Resolution Effectiveness & Post-Resolution Recurrence (Refinements 5 & 6)
// -------------------------------------------------------------

/**
 * Analyzes whether resolved operational issues remained resolved or recurred.
 */
export function analyzeResolutionEffectiveness(
  issues: OperationalIssue[],
  events: OperationalEvent[],
  config: AgingConfig = getAgingConfig(),
  asOfIso: string = new Date().toISOString()
): ResolutionEffectivenessSignal[] {
  const asOfTime = new Date(asOfIso).getTime();
  const resolvedIssues = issues.filter(i => i.status === 'Resolved' && i.resolvedAt);

  return resolvedIssues.map(resolvedIssue => {
    const resTime = new Date(resolvedIssue.resolvedAt!).getTime();
    const windowHours = Math.max(0, parseFloat(((asOfTime - resTime) / (3600 * 1000)).toFixed(1)));
    const windowDays = parseFloat((windowHours / 24).toFixed(1));

    // Check for post-resolution recurrence: Another issue in same department/equipment created AFTER resTime
    const { equipmentName, signature } = extractEquipmentAndSignature(
      resolvedIssue.title,
      resolvedIssue.area,
      resolvedIssue.category as IssueCategory
    );

    const postResolutionCandidate = issues.find(other => {
      if (other.id === resolvedIssue.id) return false;
      const otherTime = new Date(other.firstIdentifiedAt || other.createdAt).getTime();
      if (otherTime < resTime) return false; // Must be created post-resolution

      // Check equipment or signature match
      const otherExtraction = extractEquipmentAndSignature(other.title, other.area, other.category as IssueCategory);
      const sameEquip = equipmentName && otherExtraction.equipmentName && equipmentName === otherExtraction.equipmentName;
      const sameSig = signature && otherExtraction.signature && signature === otherExtraction.signature;

      return sameEquip || sameSig;
    });

    let status: ResolutionStatus;
    let confidence: RecurrenceConfidence = 'High';
    let recurrentIssueId: string | undefined = undefined;
    let recurrentIssueTitle: string | undefined = undefined;
    let recurrentIncidentAt: string | undefined = undefined;
    let hoursUntilRecurrence: number | undefined = undefined;
    let explanation = '';

    if (postResolutionCandidate) {
      status = 'Recurrence Observed After Resolution';
      confidence = 'High';
      recurrentIssueId = postResolutionCandidate.id;
      recurrentIssueTitle = postResolutionCandidate.title;
      recurrentIncidentAt = postResolutionCandidate.firstIdentifiedAt || postResolutionCandidate.createdAt;
      const candidateTime = new Date(recurrentIncidentAt).getTime();
      hoursUntilRecurrence = Math.max(0, parseFloat(((candidateTime - resTime) / (3600 * 1000)).toFixed(1)));
      explanation = `Recurrence observed ${hoursUntilRecurrence}h post-resolution: "${postResolutionCandidate.title}".`;
    } else if (windowHours >= config.observationWindowMinimumHours) {
      status = 'No Recurrence Observed';
      confidence = 'High';
      explanation = `Verified stable across ${windowHours}h (${windowDays}d) without recurrence (exceeds ${config.observationWindowMinimumHours}h observation threshold).`;
    } else if (windowHours >= 4) {
      status = 'Monitoring Post-Resolution';
      confidence = 'Medium';
      explanation = `Active post-resolution observation window (${windowHours}h elapsed of ${config.observationWindowMinimumHours}h target).`;
    } else {
      status = 'Insufficient Observation Window';
      confidence = 'Low';
      explanation = `Recently resolved (${windowHours}h ago); observation window has just begun.`;
    }

    const evidenceEvents = events
      .filter(e => e.issueId === resolvedIssue.id || (recurrentIssueId && e.issueId === recurrentIssueId))
      .map(e => e.id);

    return {
      issueId: resolvedIssue.id,
      issueTitle: resolvedIssue.title,
      department: resolvedIssue.department,
      resolvedAt: resolvedIssue.resolvedAt!,
      resolvedBy: resolvedIssue.resolvedBy || 'Operational Lead',
      resolutionSummary: resolvedIssue.resolutionSummary || 'Verified resolution',
      status,
      confidence,
      recurrentIssueId,
      recurrentIssueTitle,
      recurrentIncidentAt,
      hoursUntilRecurrence,
      observationWindowHours: windowHours,
      observationWindowDays: windowDays,
      explanation,
      evidenceEventIds: evidenceEvents,
    };
  });
}

// -------------------------------------------------------------
// 6. Comprehensive Intelligence Snapshot
// -------------------------------------------------------------

export function getOperationalIntelligenceSnapshot(
  issues: OperationalIssue[],
  actions: OperationalAction[],
  handovers: HandoverReport[],
  events: OperationalEvent[] = getOperationalEvents(),
  config: AgingConfig = getAgingConfig()
): OperationalIntelligenceSnapshot {
  const agingSignals = calculateAgingSignals(issues, actions, events, config);
  const recurringPatterns = detectRecurringIssuePatterns(issues, events, handovers);
  const temporaryInterventions = detectTemporaryInterventions(issues, actions, events);
  const resolutionSignals = analyzeResolutionEffectiveness(issues, events, config);

  const stalledIssuesCount = agingSignals.filter(s => s.primarySignal !== 'Normal').length;
  const activeIssues = issues.filter(i => i.status !== 'Resolved');
  const totalRecordedDowntime = issues.reduce((acc, i) => acc + (i.downtimeMinutes || 0), 0);
  const highConfidencePatternCount = recurringPatterns.filter(p => p.confidence === 'High').length;
  const recurrenceAfterResolutionCount = resolutionSignals.filter(
    r => r.status === 'Recurrence Observed After Resolution'
  ).length;

  return {
    agingSignals,
    stalledIssuesCount,
    recurringPatterns,
    temporaryInterventions,
    resolutionSignals,
    aggregatedMetrics: {
      totalActiveIssues: activeIssues.length,
      totalRecordedDowntimeMinutes: totalRecordedDowntime,
      highConfidencePatternCount,
      activeInterventionPatternCount: temporaryInterventions.length,
      recurrenceAfterResolutionCount,
    },
    calculatedAt: new Date().toISOString(),
  };
}
