export type ShiftType = 'Morning' | 'Afternoon' | 'Night' | 'Custom';
export type ShiftStatus = 'Normal' | 'Attention Required' | 'Critical';
export type IssueSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type IssueStatus = 'Resolved' | 'Partially Resolved' | 'Open' | 'Monitoring' | 'Escalated';
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

export interface IssueItem {
  id: string;
  title: string;
  category: IssueCategory;
  severity: IssueSeverity;
  description: string;
  area: string;
  timeObserved?: string;
  actionTaken?: string;
  status: IssueStatus;
  recommendedAction?: string;
  owner?: string;
}

export interface CarriedOverIssue {
  id: string;
  title: string;
  category: IssueCategory;
  originalShiftDate?: string;
  previousStatus: string;
  status: 'Resolved' | 'Still Open' | 'Escalated' | 'Monitoring';
  resolutionNotes?: string;
}

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

export interface HandoverReport {
  id: string;
  date: string;
  shift: string;
  department: string;
  shiftLead: string;
  incomingShift: string;
  generalStatus: ShiftStatus;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  metrics: OperationalMetrics;
  rawNotes: string;
  carriedOverIssues?: CarriedOverIssue[];
  executiveSummary: string;
  performanceSummary?: string;
  issues: IssueItem[];
  completedActions: string[];
  outstandingItems: string[];
  risks: string[];
  nextShiftPriorities: string[];
  recommendations: string[];
  positiveOutcomes: string[];
  escalations: string[];
  missingInformation?: string[];
  managementBrief?: ManagementBrief;
  createdAt: string;
  updatedAt: string;
}

export interface ActionItem {
  id: string;
  action: string;
  relatedIssue: string;
  handoverId?: string;
  priority: ActionPriority;
  owner: string;
  dueDateTime: string;
  status: ActionStatus;
  notes?: string;
  isAiRecommended?: boolean;
  approvedByLead?: boolean;
  createdAt: string;
  completedAt?: string;
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
