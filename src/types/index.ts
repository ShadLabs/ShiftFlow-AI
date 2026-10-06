export type ShiftType = 'Morning' | 'Afternoon' | 'Night' | 'Custom';
export type ShiftStatus = 'Normal' | 'Attention Required' | 'Critical';
export type ShiftHealth = 'Normal' | 'Watch' | 'At Risk' | 'Critical';

export type IssueSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type IssueStatus =
  | 'New'
  | 'Open'
  | 'Assigned'
  | 'In Progress'
  | 'Monitoring'
  | 'Resolved'
  | 'Escalated'
  | 'Partially Resolved'; // for backwards compatibility

export type RelevanceMode = 'Action Required' | 'Awareness Only';

export type IssueCategory =
  | 'Equipment'
  | 'Process'
  | 'Quality'
  | 'Staffing'
  | 'Safety'
  | 'Inventory'
  | 'Technology'
  | 'Communication'
  | 'Other';

export type ActionStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Blocked';
export type ActionPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface OperationalMetrics {
  target?: number | string;
  actual?: number | string;
  backlog?: number | string;
  quality?: string;
  downtime?: string;
  staffing?: string;
  safetyObservations?: string;
  customKpis?: Array<{ name: string; value: string; status?: 'normal' | 'warning' | 'alert' }>;
}

// 1. Canonical Operational Issue Entity
export interface OperationalIssue {
  id: string;
  transitionSeq?: number; // Monotonic transaction sequence counter (Refinement 2)
  title: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  relevanceMode?: RelevanceMode; // 'Action Required' vs 'Awareness Only'
  description: string;
  area: string;
  department: string;
  departmentId?: string; // Stable operational boundary identity (e.g. 'dept-sort-loop-a')
  equipmentId?: string;
  equipmentName?: string;
  workCenterId?: string;
  locationId?: string;
  firstIdentifiedAt: string; // ISO date-time string
  firstReportedShift?: string; // e.g. "Morning Shift"
  originHandoverId: string;
  handoverHistoryIds: string[]; // List of handovers where this issue was active/carried
  downtimeMinutes?: number;
  operationalImpact?: string;
  actionTaken?: string;
  owner?: string;
  contactPerson?: string;
  assignedTeam?: string;
  timeObserved?: string; // Time issue occurred/observed, e.g. "14:15"
  recommendedAction?: string; // Next immediate action recommendation
  actionIds: string[]; // 1-to-many relationship with OperationalAction
  isRecurring?: boolean;
  recurringIncidentCount?: number;
  lastActivityAt?: string; // Timestamp of latest meaningful interaction (Refinement 3)
  lastProgressAt?: string; // Timestamp of latest actual progress toward resolution (Refinement 3)
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionSummary?: string;
  createdAt: string;
  updatedAt: string;
}

// Compatibility alias for existing components
export type IssueItem = OperationalIssue;

// 2. Child Operational Action Entity
export interface OperationalAction {
  id: string;
  transitionSeq?: number; // Monotonic transaction sequence counter (Refinement 2)
  issueId?: string; // Linked parent OperationalIssue
  handoverId: string;
  title: string;
  action?: string; // Backwards compatibility with action
  relatedIssue?: string; // Name of issue for display
  priority: ActionPriority;
  status: ActionStatus;
  owner: string;
  assignedTeam?: string;
  dueTime: string; // e.g. "2026-10-06 14:00" or "14:00"
  dueDateTime?: string; // Backwards compatibility
  notes?: string;
  createdBy: string;
  createdAt: string;
  completedBy?: string;
  completedAt?: string;
  isAiRecommended?: boolean;
  approvedByLead?: boolean;
}

// Compatibility alias
export type ActionItem = OperationalAction;

export type EventSource = 'USER' | 'SYSTEM' | 'AI' | 'INTEGRATION' | 'DERIVED';

export type OperationalEventType =
  | 'SHIFT_STARTED'
  | 'SHIFT_ENDED'
  | 'HANDOVER_SUBMITTED'
  | 'HANDOVER_ACKNOWLEDGED'
  | 'ISSUE_CREATED'
  | 'ISSUE_ASSIGNED'
  | 'ISSUE_STATUS_CHANGED'
  | 'ISSUE_SEVERITY_CHANGED'
  | 'ISSUE_ESCALATED'
  | 'ISSUE_RESOLVED'
  | 'ISSUE_REOPENED'
  | 'ISSUE_CARRIED_FORWARD'
  | 'ACTION_CREATED'
  | 'ACTION_ASSIGNED'
  | 'ACTION_STARTED'
  | 'ACTION_BLOCKED'
  | 'ACTION_STATUS_CHANGED'
  | 'ACTION_COMPLETED'
  | 'DOWNTIME_STARTED'
  | 'DOWNTIME_ENDED'
  | 'EQUIPMENT_STOPPED'
  | 'EQUIPMENT_RESTARTED'
  | 'THRESHOLD_EXCEEDED'
  | 'METRIC_VARIANCE'
  | 'SAFETY_OBSERVATION'
  | 'COMMENT_ADDED';

export type EventCategory =
  | 'Milestone'
  | 'Equipment'
  | 'Stoppage'
  | 'Maintenance'
  | 'Staffing'
  | 'Safety'
  | 'Quality'
  | 'Process'
  | 'Handover'
  | 'Action';

// 3. Canonical Operational Timeline Event (Phase 2A Event Model)
export interface OperationalEvent {
  id: string; // Unique event identifier
  idempotencyKey?: string; // Deterministic natural business key
  organizationId?: string;
  siteId?: string;
  departmentId?: string;
  department?: string;
  shiftId?: string;
  handoverId?: string;
  issueId?: string; // Canonical issue reference
  actionId?: string; // Operational action reference

  // Optional Equipment & Location Hierarchy (Small-warehouse & enterprise ready)
  equipmentId?: string;
  equipmentName?: string;
  workCenterId?: string;
  workCenterName?: string;
  locationId?: string;
  locationName?: string;

  eventType?: OperationalEventType;
  category: EventCategory;
  severity?: IssueSeverity | 'Normal'; // Context AT EVENT TIME, not current entity state
  title: string;
  description?: string;

  // Occurred vs Recorded (Refinement 2)
  occurredAt?: string; // When the event actually happened operationally
  recordedAt?: string; // When ShiftFlow recorded the event
  recordedBy?: string; // Actor (supervisor name or 'System')

  source?: EventSource; // USER, SYSTEM, AI, INTEGRATION, DERIVED

  // Transition delta
  previousValue?: string;
  newValue?: string;

  // Milestone flag for default timeline hierarchy (Refinement 7)
  isMilestone?: boolean;

  // Controlled, lean metadata (Refinement 12)
  metadata?: Record<string, string | number | boolean | undefined>;

  // Backwards compatibility properties
  time?: string;
  relatedIssueId?: string;
  relatedActionId?: string;
}

// 4. Formal Shift Handover Acknowledgment Chain of Custody
export interface HandoverAcknowledgment {
  id?: string; // Unique acknowledgment identifier
  handoverId?: string; // Target handover ID
  acknowledgedBy: string; // Incoming supervisor name
  acknowledgedAt: string; // ISO timestamp
  acknowledgedShiftId: string; // ID of incoming shift
  handoverVersion: number;
  notes?: string;
  inheritedIssueCount?: number;
  inheritedActionCount?: number;
}

// 5. Handover Quality Score Snapshot
export interface QualityScoreSnapshot {
  score: number; // 0 - 100
  rating: 'Needs Attention' | 'Fair' | 'Good' | 'Excellent';
  feedback: string[];
  missingElements: string[];
  calculatedAt: string;
}

// 6. 30-Second Executive Management Brief
export interface ManagementBrief {
  overallStatus: string;
  primaryIssue: string;
  biggestRisk: string;
  criticalPendingAction: string;
  positiveOutcome: string;
  nextShiftPriority: string;
  executiveNotes: string;
  generatedAt?: string;
}

// 7. Full Shift Handover Document
export interface HandoverReport {
  id: string;
  date: string;
  shift: string;
  department: string;
  departmentId?: string; // Stable operational boundary identity (e.g. 'dept-sort-loop-a')
  shiftLead: string;
  incomingShift: string;
  incomingLead?: string;
  status?: 'Draft' | 'Submitted' | 'Acknowledged';
  generalStatus: ShiftStatus;
  shiftHealth?: ShiftHealth;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  metrics: OperationalMetrics;
  rawNotes: string;
  issueIds?: string[]; // Canonical IDs
  inheritedIssueIds?: string[]; // Canonical IDs carried from prior shift
  carriedOverIssues?: any[]; // Legacy helper representation for view
  issues: OperationalIssue[]; // Embedded or resolved list
  timelineEvents?: OperationalEvent[];
  executiveSummary: string;
  performanceSummary?: string;
  completedActions: string[];
  outstandingItems: string[];
  risks: string[];
  nextShiftPriorities: string[];
  recommendations: string[];
  positiveOutcomes: string[];
  escalations: string[];
  missingInformation?: string[];
  qualityScoreSnapshot?: QualityScoreSnapshot;
  acknowledgment?: HandoverAcknowledgment; // Backwards-compatible latest acknowledgment
  acknowledgments?: HandoverAcknowledgment[]; // Append-only audit history of custody transfers
  managementBrief?: ManagementBrief;
  version?: number;
  createdAt: string;
  updatedAt: string;
}

// Carryover helper presentation interface
export interface CarriedOverIssueDisplay {
  issue: OperationalIssue;
  hoursOpenFormatted: string;
  shiftsCrossedCount: number;
  isRepeatedBottleneck: boolean;
  status: IssueStatus;
  resolutionNotes?: string;
}

export interface OperationalInsights {
  recurringCategories: Array<{
    category: string;
    count: number;
    percentage: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }>;
  frequentlyAffectedAreas: Array<{
    area: string;
    incidentCount: number;
    primaryIssueType: string;
  }>;
  recurringRisks: string[];
  empiricalObservations: string[];
  recommendedInterventions: string[];
  shiftStatusSummary: {
    normalCount: number;
    attentionCount: number;
    criticalCount: number;
    healthScorePct: number;
  };
}

export * from './intelligence';

