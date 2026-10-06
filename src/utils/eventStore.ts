import {
  OperationalEvent,
  OperationalEventType,
  EventCategory,
  EventSource,
  IssueSeverity,
  HandoverReport,
  OperationalIssue,
  OperationalAction,
} from '../types';

const EVENTS_KEY = 'shiftflow_events_v2';
const MIGRATION_FLAG_KEY = 'shiftflow_events_migrated_v2';

// -------------------------------------------------------------------
// 1. Core Event Store (Append-Only · Zero Silent Pruning)
// -------------------------------------------------------------------

/**
 * Returns all recorded operational events sorted deterministically:
 * Primary: occurredAt descending (most recent first)
 * Secondary: recordedAt descending
 * Final tie-breaker: id
 */
export function getOperationalEvents(): OperationalEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.sort((a: OperationalEvent, b: OperationalEvent) => {
      const timeA = new Date(a.occurredAt || 0).getTime();
      const timeB = new Date(b.occurredAt || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;

      const recA = new Date(a.recordedAt || 0).getTime();
      const recB = new Date(b.recordedAt || 0).getTime();
      if (recA !== recB) return recB - recA;

      return (b.id || '').localeCompare(a.id || '');
    });
  } catch (err) {
    console.error('Failed to read operational events from storage:', err);
    return [];
  }
}

/**
 * Appends a new operational event if it does not violate idempotency.
 * Idempotency rules:
 * 1. Checks matching event.id
 * 2. Checks matching event.idempotencyKey (natural business key)
 * Returns the recorded event, or the existing event if deduplicated.
 */
export function recordEvent(event: OperationalEvent): OperationalEvent {
  const current = getOperationalEvents();

  // Natural business key or ID idempotency guard
  const existing = current.find(e => {
    if (e.id === event.id) return true;
    if (event.idempotencyKey && e.idempotencyKey === event.idempotencyKey) return true;
    return false;
  });

  if (existing) {
    // Idempotent: return existing record without mutating or duplicating
    return existing;
  }

  // Ensure mandatory fields
  const normalized: OperationalEvent = {
    ...event,
    id: event.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    occurredAt: event.occurredAt || new Date().toISOString(),
    recordedAt: event.recordedAt || new Date().toISOString(),
    recordedBy: event.recordedBy || 'System',
    source: event.source || 'SYSTEM',
    eventType: event.eventType || 'METRIC_VARIANCE',
    isMilestone: event.isMilestone ?? isDefaultMilestoneType(event.eventType || 'METRIC_VARIANCE', event.severity),
  };

  try {
    const updated = [normalized, ...current];
    localStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
  } catch (err: any) {
    // Storage capacity guard (Refinement 1: Fail visibly, NEVER delete history)
    console.error('STORAGE WARNING: Failed to persist operational event:', err);
    if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
      console.warn('CRITICAL: LocalStorage quota exceeded. Historical events must NOT be deleted.');
    }
  }

  return normalized;
}

/**
 * Appends multiple operational events with atomic idempotency checks.
 */
export function recordEvents(events: OperationalEvent[]): OperationalEvent[] {
  const recorded: OperationalEvent[] = [];
  for (const ev of events) {
    recorded.push(recordEvent(ev));
  }
  return recorded;
}

// -------------------------------------------------------------------
// 2. Query Selectors
// -------------------------------------------------------------------

export function getEventsForIssue(issueId: string): OperationalEvent[] {
  const all = getOperationalEvents();
  return all.filter(e => e.issueId === issueId || e.relatedIssueId === issueId);
}

export function getEventsForAction(actionId: string): OperationalEvent[] {
  const all = getOperationalEvents();
  return all.filter(e => e.actionId === actionId || e.relatedActionId === actionId);
}

export function getEventsForHandover(handoverId: string): OperationalEvent[] {
  const all = getOperationalEvents();
  return all.filter(e => e.handoverId === handoverId);
}

export function getEventsForShift(shiftId: string): OperationalEvent[] {
  const all = getOperationalEvents();
  return all.filter(e => e.shiftId === shiftId);
}

export function getMilestoneEvents(): OperationalEvent[] {
  const all = getOperationalEvents();
  return all.filter(e => e.isMilestone === true);
}

// -------------------------------------------------------------------
// 3. Storage Telemetry (Refinement 1)
// -------------------------------------------------------------------

export interface EventStoreStorageMetrics {
  eventCount: number;
  estimatedBytes: number;
  formattedSize: string;
  isNearQuota: boolean;
}

export function getEventStoreStorageMetrics(): EventStoreStorageMetrics {
  const raw = localStorage.getItem(EVENTS_KEY) || '[]';
  const bytes = raw.length * 2; // UTF-16 approximation
  const kb = bytes / 1024;
  const isNearQuota = bytes > 4 * 1024 * 1024; // > 4MB of typical 5MB quota

  let formattedSize: string;
  if (kb < 1024) {
    formattedSize = `${kb.toFixed(1)} KB`;
  } else {
    formattedSize = `${(kb / 1024).toFixed(2)} MB`;
  }

  return {
    eventCount: getOperationalEvents().length,
    estimatedBytes: bytes,
    formattedSize,
    isNearQuota,
  };
}

// -------------------------------------------------------------------
// 4. Milestone Classifier (Refinement 7)
// -------------------------------------------------------------------

export function isDefaultMilestoneType(
  eventType: OperationalEventType,
  severity?: IssueSeverity | 'Normal'
): boolean {
  switch (eventType) {
    case 'SHIFT_STARTED':
    case 'SHIFT_ENDED':
    case 'HANDOVER_SUBMITTED':
    case 'HANDOVER_ACKNOWLEDGED':
    case 'ISSUE_ESCALATED':
    case 'ISSUE_RESOLVED':
    case 'ISSUE_REOPENED':
    case 'ISSUE_CARRIED_FORWARD':
    case 'EQUIPMENT_STOPPED':
    case 'EQUIPMENT_RESTARTED':
    case 'THRESHOLD_EXCEEDED':
    case 'ACTION_COMPLETED':
      return true;

    case 'ISSUE_CREATED':
      // Critical and High issues are immediate operational milestones
      return severity === 'Critical' || severity === 'High';

    case 'ACTION_CREATED':
      return severity === 'Critical';

    default:
      return false;
  }
}

// -------------------------------------------------------------------
// 5. Safe Legacy Bootstrap / Migration (Refinements 5 & 9)
// -------------------------------------------------------------------

/**
 * Bootstraps canonical events from existing Phase 1 handovers, issues,
 * actions, and acknowledgements.
 * - ZERO timestamp fabrication.
 * - Idempotent: safe to run on every application startup.
 */
export function bootstrapOperationalEvents(
  handovers: HandoverReport[],
  issues: OperationalIssue[],
  actions: OperationalAction[]
): void {
  // If migration flag already set and events exist, skip
  const existingEvents = getOperationalEvents();
  if (existingEvents.length > 0 && localStorage.getItem(MIGRATION_FLAG_KEY)) {
    return;
  }

  const generatedEvents: OperationalEvent[] = [];

  // 1. Bootstrap from Handover records
  for (const h of handovers) {
    // Handover submitted event
    if (h.createdAt) {
      generatedEvents.push({
        id: `evt-bootstrap-sho-${h.id}`,
        idempotencyKey: `evt-handover-submitted-${h.id}`,
        departmentId: h.departmentId || 'dept-sort-loop-a',
        department: h.department,
        shiftId: `${h.shift} Shift`,
        handoverId: h.id,
        eventType: 'HANDOVER_SUBMITTED',
        category: 'Handover',
        severity: h.riskLevel,
        title: `${h.shift} Shift Handover Submitted`,
        description: `Handover prepared by ${h.shiftLead} for ${h.incomingShift}.`,
        occurredAt: h.createdAt,
        recordedAt: h.createdAt,
        recordedBy: h.shiftLead,
        source: 'USER',
        isMilestone: true,
        metadata: {
          shift: h.shift,
          riskLevel: h.riskLevel,
          generalStatus: h.generalStatus,
          issuesCount: (h.issues || []).length,
        },
      });
    }

    // Historical Custody Acknowledgements
    const acks = Array.isArray(h.acknowledgments)
      ? h.acknowledgments
      : h.acknowledgment
      ? [h.acknowledgment]
      : [];

    for (const ack of acks) {
      if (ack.acknowledgedAt) {
        generatedEvents.push({
          id: `evt-bootstrap-ack-${h.id}-${ack.id || ack.acknowledgedBy}`,
          idempotencyKey: `evt-ack-${h.id}-v${ack.handoverVersion || 1}-${ack.acknowledgedShiftId}-${ack.acknowledgedBy.toLowerCase()}`,
          departmentId: h.departmentId || 'dept-sort-loop-a',
          department: h.department,
          shiftId: ack.acknowledgedShiftId,
          handoverId: h.id,
          eventType: 'HANDOVER_ACKNOWLEDGED',
          category: 'Handover',
          severity: 'Normal',
          title: `Shift Custody Accepted by ${ack.acknowledgedBy}`,
          description: ack.notes || `Incoming supervisor assumed operational responsibility.`,
          occurredAt: ack.acknowledgedAt,
          recordedAt: ack.acknowledgedAt,
          recordedBy: ack.acknowledgedBy,
          source: 'USER',
          isMilestone: true,
          metadata: {
            handoverVersion: ack.handoverVersion || 1,
            inheritedIssueCount: ack.inheritedIssueCount,
            inheritedActionCount: ack.inheritedActionCount,
          },
        });
      }
    }

    // Existing embedded Diverter timeline events (from demo data)
    if (Array.isArray(h.timelineEvents) && h.timelineEvents.length > 0) {
      for (const te of h.timelineEvents) {
        // Derive full ISO from handover date and local time if valid
        let eventIso = h.createdAt;
        if (h.date && te.time && te.time.includes(':')) {
          const datePart = h.date.includes('T') ? h.date.split('T')[0] : h.date;
          eventIso = `${datePart}T${te.time.padStart(5, '0')}:00Z`;
        }

        let evType: OperationalEventType = 'METRIC_VARIANCE';
        let cat: EventCategory = 'Milestone';
        let isMile = true;

        if (te.category === 'Stoppage' || te.title.toLowerCase().includes('stop') || te.title.toLowerCase().includes('latency')) {
          evType = 'EQUIPMENT_STOPPED';
          cat = 'Equipment';
        } else if (te.category === 'Maintenance' || te.title.toLowerCase().includes('maintenance')) {
          evType = 'ACTION_STARTED';
          cat = 'Maintenance';
        } else if (te.title.toLowerCase().includes('kickoff') || te.title.toLowerCase().includes('started')) {
          evType = 'SHIFT_STARTED';
          cat = 'Milestone';
        } else if (te.category === 'Handover') {
          evType = 'HANDOVER_SUBMITTED';
          cat = 'Handover';
        } else if (te.category === 'Staffing') {
          evType = 'METRIC_VARIANCE';
          cat = 'Staffing';
          isMile = false;
        }

        generatedEvents.push({
          id: `evt-bootstrap-embedded-${h.id}-${te.id}`,
          idempotencyKey: `evt-timeline-${h.id}-${te.id}`,
          departmentId: h.departmentId || 'dept-sort-loop-a',
          department: h.department,
          shiftId: `${h.shift} Shift`,
          handoverId: h.id,
          issueId: te.relatedIssueId,
          actionId: te.relatedActionId,
          equipmentName: te.relatedIssueId ? 'Sortation Loop A Diverter 4' : undefined,
          eventType: evType,
          category: cat,
          severity: te.category === 'Stoppage' ? 'High' : 'Normal',
          title: te.title,
          description: te.description,
          occurredAt: eventIso,
          recordedAt: eventIso,
          recordedBy: h.shiftLead,
          source: 'USER',
          isMilestone: isMile,
          time: te.time,
        });
      }
    }
  }

  // 2. Bootstrap from Canonical Issues
  for (const issue of issues) {
    if (issue.firstIdentifiedAt) {
      generatedEvents.push({
        id: `evt-bootstrap-iss-create-${issue.id}`,
        idempotencyKey: `evt-issue-created-${issue.id}`,
        departmentId: issue.departmentId || 'dept-sort-loop-a',
        department: issue.department,
        shiftId: issue.firstReportedShift || 'Historical Shift',
        handoverId: issue.originHandoverId,
        issueId: issue.id,
        eventType: 'ISSUE_CREATED',
        category: issue.category as EventCategory,
        severity: issue.severity,
        title: `Issue Identified: ${issue.title}`,
        description: issue.description,
        occurredAt: issue.firstIdentifiedAt,
        recordedAt: issue.createdAt || issue.firstIdentifiedAt,
        recordedBy: issue.owner || 'Operational Lead',
        source: 'USER',
        isMilestone: issue.severity === 'Critical' || issue.severity === 'High',
        metadata: {
          category: issue.category,
          area: issue.area,
        },
      });
    }

    // Escalation record
    if (issue.status === 'Escalated') {
      const escalatedTime = issue.updatedAt || issue.firstIdentifiedAt;
      generatedEvents.push({
        id: `evt-bootstrap-iss-esc-${issue.id}`,
        idempotencyKey: `evt-issue-escalated-${issue.id}`,
        departmentId: issue.departmentId || 'dept-sort-loop-a',
        department: issue.department,
        handoverId: issue.originHandoverId,
        issueId: issue.id,
        eventType: 'ISSUE_ESCALATED',
        category: issue.category as EventCategory,
        severity: issue.severity,
        title: `Issue Escalated to Leadership: ${issue.title}`,
        description: issue.operationalImpact || `Escalated across shifts due to operational risk.`,
        occurredAt: escalatedTime,
        recordedAt: escalatedTime,
        recordedBy: issue.owner || 'Shift Lead',
        source: 'USER',
        isMilestone: true,
        previousValue: 'Open',
        newValue: 'Escalated',
      });
    }

    // Resolution record
    if (issue.status === 'Resolved' && issue.resolvedAt) {
      generatedEvents.push({
        id: `evt-bootstrap-iss-res-${issue.id}`,
        idempotencyKey: `evt-issue-resolved-${issue.id}`,
        departmentId: issue.departmentId || 'dept-sort-loop-a',
        department: issue.department,
        issueId: issue.id,
        eventType: 'ISSUE_RESOLVED',
        category: issue.category as EventCategory,
        severity: 'Normal',
        title: `Issue Resolved: ${issue.title}`,
        description: issue.resolutionSummary || 'Verified operational resolution.',
        occurredAt: issue.resolvedAt,
        recordedAt: issue.resolvedAt,
        recordedBy: issue.resolvedBy || 'Lead Technician',
        source: 'USER',
        isMilestone: true,
        previousValue: 'Open',
        newValue: 'Resolved',
      });
    }

    // Multi-shift carry-over history
    if (Array.isArray(issue.handoverHistoryIds) && issue.handoverHistoryIds.length > 1) {
      issue.handoverHistoryIds.slice(1).forEach((hid, idx) => {
        generatedEvents.push({
          id: `evt-bootstrap-carry-${issue.id}-${hid}`,
          idempotencyKey: `evt-carry-${issue.id}-${hid}`,
          departmentId: issue.departmentId || 'dept-sort-loop-a',
          department: issue.department,
          handoverId: hid,
          issueId: issue.id,
          eventType: 'ISSUE_CARRIED_FORWARD',
          category: 'Handover',
          severity: issue.severity,
          title: `Issue Carried to Shift ${idx + 2}: ${issue.title}`,
          description: `Unresolved operational condition carried forward across shift boundary.`,
          occurredAt: issue.updatedAt || issue.firstIdentifiedAt,
          recordedAt: issue.updatedAt || issue.firstIdentifiedAt,
          recordedBy: 'ShiftFlow Continuity Engine',
          source: 'SYSTEM',
          isMilestone: true,
        });
      });
    }
  }

  // 3. Bootstrap from Canonical Actions
  for (const action of actions) {
    if (action.createdAt) {
      generatedEvents.push({
        id: `evt-bootstrap-act-create-${action.id}`,
        idempotencyKey: `evt-action-created-${action.id}`,
        handoverId: action.handoverId,
        issueId: action.issueId,
        actionId: action.id,
        eventType: 'ACTION_CREATED',
        category: 'Action',
        severity: action.priority === 'Critical' ? 'Critical' : 'Normal',
        title: `Action Created: ${action.title || action.action}`,
        description: `Assigned to ${action.owner}. Due target: ${action.dueTime || action.dueDateTime}.`,
        occurredAt: action.createdAt,
        recordedAt: action.createdAt,
        recordedBy: action.createdBy || 'Supervisor',
        source: 'USER',
        isMilestone: action.priority === 'Critical',
      });
    }

    if (action.status === 'Completed' && action.completedAt) {
      generatedEvents.push({
        id: `evt-bootstrap-act-done-${action.id}`,
        idempotencyKey: `evt-action-completed-${action.id}`,
        handoverId: action.handoverId,
        issueId: action.issueId,
        actionId: action.id,
        eventType: 'ACTION_COMPLETED',
        category: 'Action',
        severity: 'Normal',
        title: `Action Completed: ${action.title || action.action}`,
        description: `Verified completion by ${action.completedBy || action.owner}.`,
        occurredAt: action.completedAt,
        recordedAt: action.completedAt,
        recordedBy: action.completedBy || action.owner || 'Technician',
        source: 'USER',
        isMilestone: true,
        previousValue: 'In Progress',
        newValue: 'Completed',
      });
    }
  }

  // Commit all events using idempotent recorder
  recordEvents(generatedEvents);
  localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
}
