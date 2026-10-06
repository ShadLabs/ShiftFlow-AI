import { IssueCategory, IssueSeverity } from './index';

export type RecurrenceConfidence = 'High' | 'Medium' | 'Low';

export type ResolutionStatus =
  | 'Recurrence Observed After Resolution'
  | 'No Recurrence Observed'
  | 'Monitoring Post-Resolution'
  | 'Insufficient Observation Window';

export type AgingPrimarySignal =
  | 'Normal'
  | 'Inactive'
  | 'No Progress'
  | 'Escalated Without Progress'
  | 'Action Stalled'
  | 'Repeated Carry-Over'
  | 'Long Running';

// -------------------------------------------------------------
// 1. Configurable Aging Thresholds (Refinements 4 & 15)
// -------------------------------------------------------------
export interface AgingConfig {
  inactiveThresholdHours: number; // No meaningful activity (default: 8h)
  noProgressThresholdHours: number; // Activity exists, but zero physical progress (default: 6h)
  longRunningThresholdHours: number; // Open duration (default: 24h)
  escalatedWithoutProgressHours: number; // Post-escalation progress gap (default: 4h)
  repeatedCarryOverShifts: number; // Carry count (default: 3 shifts)
  actionStalledHours: number; // Blocked or stalled child actions (default: 6h)
  observationWindowMinimumHours: number; // Minimum window before declaring "No Recurrence" (default: 48h)
}

export const DEFAULT_AGING_CONFIG: AgingConfig = {
  inactiveThresholdHours: 8,
  noProgressThresholdHours: 6,
  longRunningThresholdHours: 24,
  escalatedWithoutProgressHours: 4,
  repeatedCarryOverShifts: 3,
  actionStalledHours: 6,
  observationWindowMinimumHours: 48,
};

// -------------------------------------------------------------
// 2. Multi-Signal Issue Aging Intelligence (Refinements 3 & 4)
// -------------------------------------------------------------
export interface IssueAgingSignal {
  issueId: string;
  issueTitle: string;
  department: string;
  severity: IssueSeverity;
  status: string;

  // Multi-signal booleans (not an exclusive enum!)
  isInactive: boolean;
  isNoProgress: boolean;
  isLongRunning: boolean;
  isEscalatedWithoutProgress: boolean;
  hasStalledActions: boolean;
  isRepeatedCarryOver: boolean;

  // Single highest visual priority classification for UI badge
  primarySignal: AgingPrimarySignal;

  // Exact metrics
  hoursOpen: number;
  shiftsCrossed: number;
  lastActivityAt: string;
  hoursSinceLastActivity: number;
  lastProgressAt: string;
  hoursSinceLastProgress: number;

  hoursSinceEscalation?: number;
  blockedActionCount: number;
  stalledActionIds: string[];
  operationalUrgencyScore: number; // Deterministic priority ranking (0 - 1000)
}

// -------------------------------------------------------------
// 3. Structured Evidence Traceability (Refinement 16)
// -------------------------------------------------------------
export interface PatternEvidence {
  issueIds: string[];
  eventIds: string[];
  actionIds: string[];
  handoverIds: string[];
  firstObservedAt: string;
  lastObservedAt: string;
  occurrenceCount: number; // Distinct canonical issue count! (Never event count)
  shiftsAffectedCount: number;
  totalRecordedDowntimeMinutes: number; // Deduplicated downtime
  observedInterventions: string[];
  timelineSummary: Array<{
    date: string;
    shift: string;
    title: string;
    eventType: string;
    issueId?: string;
  }>;
}

// -------------------------------------------------------------
// 4. Recurring Operational Problem Pattern (Refinements 7, 8, 9, 10)
// -------------------------------------------------------------
export interface RecurringIssuePattern {
  id: string; // pat-rec-${deptId}-${normEquipment}-${normCategory}-${normSignature}
  confidence: RecurrenceConfidence;
  title: string;
  category: IssueCategory;
  departmentId: string;
  department: string;
  equipmentId?: string;
  equipmentName?: string;
  problemSignature: string; // Distinct failure token, e.g. "solenoid latency" vs "motor overheating"
  occurrenceCount: number; // Must be >= 2 distinct canonical issues
  firstOccurrenceAt: string;
  lastOccurrenceAt: string;
  timeSpanDays: number;
  shiftsAffected: number;
  totalRecordedDowntimeMinutes: number;
  evidence: PatternEvidence;
  confidenceRationale: string[]; // Deterministic "Why ShiftFlow flagged this" explanation
  recommendedInvestigation: string; // Strictly neutral investigation advice
  calculatedAt: string;
}

// -------------------------------------------------------------
// 5. Repeated Temporary Intervention Pattern (Refinements 10 & 11)
// -------------------------------------------------------------
export interface TemporaryInterventionPattern {
  id: string; // pat-temp-${normEquipment}-${normIntervention}
  equipmentName: string;
  department: string;
  interventionType: string; // e.g. "Controller Reset / Power Cycle"
  timesApplied: number;
  averageRecurrenceHours: number;
  totalRecordedDowntimeMinutes: number;
  relatedPatternId?: string;
  evidence: PatternEvidence;
  recommendedInvestigation: string;
  calculatedAt: string;
}

// -------------------------------------------------------------
// 6. Resolution Effectiveness & Recurrence After Resolution (Refinements 5 & 6)
// -------------------------------------------------------------
export interface ResolutionEffectivenessSignal {
  issueId: string;
  issueTitle: string;
  department: string;
  resolvedAt: string;
  resolvedBy: string;
  resolutionSummary: string;

  // Post-resolution status
  status: ResolutionStatus;
  confidence: RecurrenceConfidence;

  // Recurrence details (if recurrent)
  recurrentIssueId?: string;
  recurrentIssueTitle?: string;
  recurrentIncidentAt?: string;
  hoursUntilRecurrence?: number;

  // Observation window details
  observationWindowHours: number;
  observationWindowDays: number;
  explanation: string;

  evidenceEventIds: string[];
}

// -------------------------------------------------------------
// 7. Combined Operational Intelligence Snapshot
// -------------------------------------------------------------
export interface OperationalIntelligenceSnapshot {
  agingSignals: IssueAgingSignal[];
  stalledIssuesCount: number;
  recurringPatterns: RecurringIssuePattern[];
  temporaryInterventions: TemporaryInterventionPattern[];
  resolutionSignals: ResolutionEffectivenessSignal[];
  aggregatedMetrics: {
    totalActiveIssues: number;
    totalRecordedDowntimeMinutes: number;
    highConfidencePatternCount: number;
    activeInterventionPatternCount: number;
    recurrenceAfterResolutionCount: number;
  };
  calculatedAt: string;
}
