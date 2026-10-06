import {
  HandoverReport,
  OperationalIssue,
  OperationalAction,
  HandoverAcknowledgment,
} from '../types';
import {
  INITIAL_HANDOVERS,
  INITIAL_ISSUES,
  INITIAL_ACTIONS,
} from '../data/initialData';
import {
  recordEvent,
  bootstrapOperationalEvents,
  getOperationalEvents,
} from './eventStore';

const HANDOVERS_KEY = 'shiftflow_handovers_v2';
const ISSUES_KEY = 'shiftflow_issues_v2';
const ACTIONS_KEY = 'shiftflow_actions_v2';

// -------------------------------------------------------------
// 1. HANDOVERS
// -------------------------------------------------------------
export function getHandovers(): HandoverReport[] {
  try {
    const raw = localStorage.getItem(HANDOVERS_KEY);
    let handovers: HandoverReport[];
    if (!raw) {
      localStorage.setItem(HANDOVERS_KEY, JSON.stringify(INITIAL_HANDOVERS));
      handovers = INITIAL_HANDOVERS;
    } else {
      const parsed = JSON.parse(raw);
      handovers = Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_HANDOVERS;
    }

    // Migrate any legacy handovers containing only single `acknowledgment`
    const migrated = handovers.map((h: HandoverReport) => {
      if (h.acknowledgment && (!h.acknowledgments || h.acknowledgments.length === 0)) {
        return {
          ...h,
          acknowledgments: [
            {
              ...h.acknowledgment,
              id: h.acknowledgment.id || `ack-${h.id}-migrated`,
              handoverId: h.id,
            },
          ],
        };
      }
      return h;
    });

    // Safe, idempotent bootstrap of historical events
    try {
      bootstrapOperationalEvents(migrated, getIssues(), getActions());
    } catch (e) {
      console.warn('Bootstrap event store warning:', e);
    }

    return migrated;
  } catch (e) {
    console.error('Failed to read handovers from localStorage:', e);
    return INITIAL_HANDOVERS;
  }
}

export function saveHandover(handover: HandoverReport): HandoverReport {
  const current = getHandovers();
  const existingIdx = current.findIndex(h => h.id === handover.id);
  const isNew = existingIdx === -1;
  let updatedList: HandoverReport[];

  const updatedHandover: HandoverReport = {
    ...handover,
    version: (handover.version || 1) + (existingIdx >= 0 ? 1 : 0),
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = updatedHandover;
  } else {
    updatedList = [updatedHandover, ...current];
  }

  localStorage.setItem(HANDOVERS_KEY, JSON.stringify(updatedList));

  // Sync canonical issues active during this handover
  if (Array.isArray(handover.issues) && handover.issues.length > 0) {
    handover.issues.forEach(iss => {
      saveIssue({
        ...iss,
        originHandoverId: iss.originHandoverId || handover.id,
        handoverHistoryIds: Array.from(new Set([...(iss.handoverHistoryIds || []), handover.id])),
      });
    });
  }

  // Domain event: HANDOVER_SUBMITTED for newly created handovers
  if (isNew) {
    recordEvent({
      id: `evt-sho-${updatedHandover.id}`,
      idempotencyKey: `evt-handover-submitted-${updatedHandover.id}`,
      departmentId: updatedHandover.departmentId || 'dept-sort-loop-a',
      department: updatedHandover.department,
      shiftId: `${updatedHandover.shift} Shift`,
      handoverId: updatedHandover.id,
      eventType: 'HANDOVER_SUBMITTED',
      category: 'Handover',
      severity: updatedHandover.riskLevel,
      title: `${updatedHandover.shift} Shift Handover Submitted`,
      description: `Handover prepared by ${updatedHandover.shiftLead} for ${updatedHandover.incomingShift}.`,
      occurredAt: updatedHandover.createdAt || new Date().toISOString(),
      recordedAt: new Date().toISOString(),
      recordedBy: updatedHandover.shiftLead,
      source: 'USER',
      isMilestone: true,
      metadata: {
        shift: updatedHandover.shift,
        riskLevel: updatedHandover.riskLevel,
        generalStatus: updatedHandover.generalStatus,
        issueCount: (updatedHandover.issues || []).length,
      },
    });
  }

  // Domain event: ISSUE_CARRIED_FORWARD for inherited issues (idempotent business key)
  const carriedIds = updatedHandover.inheritedIssueIds || [];
  if (carriedIds.length > 0) {
    for (const carriedId of carriedIds) {
      const issue = getIssueById(carriedId);
      if (issue) {
        recordEvent({
          id: `evt-carry-${carriedId}-${updatedHandover.id}`,
          idempotencyKey: `evt-carry-${carriedId}-${updatedHandover.id}`,
          departmentId: updatedHandover.departmentId || issue.departmentId || 'dept-sort-loop-a',
          department: updatedHandover.department || issue.department,
          shiftId: `${updatedHandover.shift} Shift`,
          handoverId: updatedHandover.id,
          issueId: carriedId,
          eventType: 'ISSUE_CARRIED_FORWARD',
          category: 'Handover',
          severity: issue.severity,
          title: `Issue Carried to Next Shift: ${issue.title}`,
          description: `Unresolved condition inherited by ${updatedHandover.incomingShift}.`,
          occurredAt: updatedHandover.createdAt || new Date().toISOString(),
          recordedAt: new Date().toISOString(),
          recordedBy: 'ShiftFlow Continuity Engine',
          source: 'SYSTEM',
          isMilestone: true,
        });
      }
    }
  }

  return updatedHandover;
}

export function deleteHandover(id: string): void {
  const current = getHandovers();
  const filtered = current.filter(h => h.id !== id);
  localStorage.setItem(HANDOVERS_KEY, JSON.stringify(filtered));
}

export function getHandoverById(id: string): HandoverReport | undefined {
  const current = getHandovers();
  return current.find(h => h.id === id);
}

export function acknowledgeHandover(
  handoverId: string,
  acknowledgment: HandoverAcknowledgment
): HandoverReport | null {
  const current = getHandovers();
  const idx = current.findIndex(h => h.id === handoverId);
  if (idx === -1) return null;

  const target = current[idx];

  const targetVersion = acknowledgment.handoverVersion || target.version || 1;
  const targetShiftId = acknowledgment.acknowledgedShiftId || target.incomingShift;
  const trimmedName = acknowledgment.acknowledgedBy.trim();

  const normalizedAck: HandoverAcknowledgment = {
    id: acknowledgment.id || `ack-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    handoverId: handoverId,
    handoverVersion: targetVersion,
    acknowledgedBy: trimmedName,
    acknowledgedAt: acknowledgment.acknowledgedAt || new Date().toISOString(),
    acknowledgedShiftId: targetShiftId,
    notes: acknowledgment.notes,
    inheritedIssueCount: acknowledgment.inheritedIssueCount,
    inheritedActionCount: acknowledgment.inheritedActionCount,
  };

  // Safe migration of existing acknowledgments
  const existingAcks: HandoverAcknowledgment[] = Array.isArray(target.acknowledgments)
    ? [...target.acknowledgments]
    : target.acknowledgment
    ? [{ ...target.acknowledgment, id: target.acknowledgment.id || `ack-${target.id}-migrated`, handoverId: target.id }]
    : [];

  // Idempotency check:
  // (handoverId + handoverVersion + acknowledgedShiftId + acknowledgedBy) or rapid double click within 10s
  const existingDuplicate = existingAcks.find(ack => {
    const sameSignature =
      ack.handoverId === normalizedAck.handoverId &&
      ack.handoverVersion === normalizedAck.handoverVersion &&
      ack.acknowledgedShiftId === normalizedAck.acknowledgedShiftId &&
      ack.acknowledgedBy.toLowerCase() === normalizedAck.acknowledgedBy.toLowerCase();

    const timeDiff = Math.abs(
      new Date(ack.acknowledgedAt).getTime() - new Date(normalizedAck.acknowledgedAt).getTime()
    );
    const doubleClick =
      ack.acknowledgedBy.toLowerCase() === normalizedAck.acknowledgedBy.toLowerCase() &&
      !isNaN(timeDiff) &&
      timeDiff < 10000;

    return sameSignature || doubleClick;
  });

  let updatedAcks: HandoverAcknowledgment[];
  let activeAck: HandoverAcknowledgment;

  if (existingDuplicate) {
    // Idempotent: preserve existing record and its original timestamp and id
    updatedAcks = existingAcks;
    activeAck = existingDuplicate;
  } else {
    // Append-only history: add new operational custody record!
    updatedAcks = [...existingAcks, normalizedAck];
    activeAck = normalizedAck;

    // Domain event: HANDOVER_ACKNOWLEDGED with natural business key
    recordEvent({
      id: `evt-ack-${handoverId}-${normalizedAck.id}`,
      idempotencyKey: `evt-ack-${handoverId}-v${targetVersion}-${targetShiftId}-${trimmedName.toLowerCase().replace(/\s+/g, '')}`,
      departmentId: target.departmentId || 'dept-sort-loop-a',
      department: target.department,
      shiftId: targetShiftId,
      handoverId: target.id,
      eventType: 'HANDOVER_ACKNOWLEDGED',
      category: 'Handover',
      severity: 'Normal',
      title: `Shift Custody Accepted by ${normalizedAck.acknowledgedBy}`,
      description: normalizedAck.notes || `Incoming supervisor assumed operational responsibility.`,
      occurredAt: normalizedAck.acknowledgedAt,
      recordedAt: new Date().toISOString(),
      recordedBy: normalizedAck.acknowledgedBy,
      source: 'USER',
      isMilestone: true,
      metadata: {
        handoverVersion: targetVersion,
        inheritedIssueCount: normalizedAck.inheritedIssueCount,
        inheritedActionCount: normalizedAck.inheritedActionCount,
      },
    });
  }

  const updated: HandoverReport = {
    ...target,
    status: 'Acknowledged',
    acknowledgment: activeAck, // Latest or existing for convenient access
    acknowledgments: updatedAcks,  // Append-only permanent audit trail
    updatedAt: new Date().toISOString(),
  };

  current[idx] = updated;
  localStorage.setItem(HANDOVERS_KEY, JSON.stringify(current));
  return updated;
}

// -------------------------------------------------------------
// 2. CANONICAL OPERATIONAL ISSUES
// -------------------------------------------------------------
export function getIssues(): OperationalIssue[] {
  try {
    const raw = localStorage.getItem(ISSUES_KEY);
    if (!raw) {
      localStorage.setItem(ISSUES_KEY, JSON.stringify(INITIAL_ISSUES));
      return INITIAL_ISSUES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_ISSUES;
    const hasHist = parsed.some(i => i.id === 'iss-diverter-00-hist');
    if (!hasHist) {
      const hist = INITIAL_ISSUES.find(i => i.id === 'iss-diverter-00-hist');
      if (hist) {
        parsed.push(hist);
        localStorage.setItem(ISSUES_KEY, JSON.stringify(parsed));
      }
    }
    return parsed;
  } catch (e) {
    console.error('Failed to read issues from localStorage:', e);
    return INITIAL_ISSUES;
  }
}

export function getIssueById(id: string): OperationalIssue | undefined {
  const current = getIssues();
  return current.find(i => i.id === id);
}

export function saveIssue(issue: OperationalIssue, actor?: string): OperationalIssue {
  const current = getIssues();
  const existingIdx = current.findIndex(i => i.id === issue.id);
  const previous = existingIdx >= 0 ? current[existingIdx] : undefined;

  const nowIso = new Date().toISOString();

  // 1. Detect genuine state transitions
  const isStatusChange = !!previous && previous.status !== issue.status;
  const isSeverityChange = !!previous && previous.severity !== issue.severity;
  const isOwnerChange = !!previous && previous.owner !== issue.owner && !!issue.owner;
  const isMeaningfulChange = isStatusChange || isSeverityChange || isOwnerChange;

  // 2. Monotonic Logical Transaction Sequence (Refinement 2)
  const nextSeq = isMeaningfulChange
    ? (previous?.transitionSeq || 0) + 1
    : previous?.transitionSeq || issue.transitionSeq || 1;

  // 3. Meaningful Activity vs Operational Progress (Refinement 3)
  const isProgressTransition =
    issue.status === 'Monitoring' ||
    issue.status === 'Resolved' ||
    (issue.status === 'In Progress' && previous?.status === 'Open');

  const updatedLastActivity = isMeaningfulChange
    ? nowIso
    : previous?.lastActivityAt || issue.lastActivityAt || issue.firstIdentifiedAt || nowIso;

  const updatedLastProgress = isProgressTransition
    ? nowIso
    : previous?.lastProgressAt || issue.lastProgressAt || issue.firstIdentifiedAt || nowIso;

  const updatedIssue: OperationalIssue = {
    ...issue,
    transitionSeq: nextSeq,
    lastActivityAt: updatedLastActivity,
    lastProgressAt: updatedLastProgress,
    updatedAt: nowIso,
  };

  // 4. Canonical Persistence First
  let updatedList: OperationalIssue[];
  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = updatedIssue;
  } else {
    updatedList = [updatedIssue, ...current];
  }

  localStorage.setItem(ISSUES_KEY, JSON.stringify(updatedList));

  // 5. Domain Event Persistence with Sequence Idempotency
  if (!previous) {
    // New issue created
    recordEvent({
      id: `evt-issue-create-${updatedIssue.id}`,
      idempotencyKey: `evt-issue-created-${updatedIssue.id}`,
      departmentId: updatedIssue.departmentId || 'dept-sort-loop-a',
      department: updatedIssue.department,
      shiftId: updatedIssue.firstReportedShift || 'Current Shift',
      handoverId: updatedIssue.originHandoverId,
      issueId: updatedIssue.id,
      eventType: 'ISSUE_CREATED',
      category: updatedIssue.category as any,
      severity: updatedIssue.severity,
      title: `Issue Identified: ${updatedIssue.title}`,
      description: updatedIssue.description,
      occurredAt: updatedIssue.firstIdentifiedAt || updatedIssue.createdAt || nowIso,
      recordedAt: nowIso,
      recordedBy: actor || updatedIssue.owner || 'Operational Lead',
      source: 'USER',
      isMilestone: updatedIssue.severity === 'Critical' || updatedIssue.severity === 'High',
      metadata: {
        category: updatedIssue.category,
        area: updatedIssue.area,
        initialSeverity: updatedIssue.severity,
      },
    });
  } else {
    // Existing issue updated: Only emit events for genuine transitions!
    // 1. Status transition check
    if (isStatusChange) {
      if (updatedIssue.status === 'Escalated') {
        recordEvent({
          id: `evt-esc-${updatedIssue.id}-seq${nextSeq}`,
          idempotencyKey: `evt-status-${updatedIssue.id}-seq${nextSeq}-${previous.status}-to-Escalated`,
          departmentId: updatedIssue.departmentId || previous.departmentId || 'dept-sort-loop-a',
          department: updatedIssue.department || previous.department,
          issueId: updatedIssue.id,
          eventType: 'ISSUE_ESCALATED',
          category: updatedIssue.category as any,
          severity: updatedIssue.severity,
          title: `Issue Escalated to Leadership: ${updatedIssue.title}`,
          description: updatedIssue.operationalImpact || `Status escalated from ${previous.status} to Escalated.`,
          occurredAt: nowIso,
          recordedAt: nowIso,
          recordedBy: actor || updatedIssue.owner || 'Shift Lead',
          source: 'USER',
          isMilestone: true,
          previousValue: previous.status,
          newValue: 'Escalated',
        });
      } else if (updatedIssue.status === 'Resolved') {
        recordEvent({
          id: `evt-res-${updatedIssue.id}-seq${nextSeq}`,
          idempotencyKey: `evt-status-${updatedIssue.id}-seq${nextSeq}-${previous.status}-to-Resolved`,
          departmentId: updatedIssue.departmentId || previous.departmentId || 'dept-sort-loop-a',
          department: updatedIssue.department || previous.department,
          issueId: updatedIssue.id,
          eventType: 'ISSUE_RESOLVED',
          category: updatedIssue.category as any,
          severity: 'Normal',
          title: `Issue Resolved: ${updatedIssue.title}`,
          description: updatedIssue.resolutionSummary || 'Resolved by operational lead.',
          occurredAt: updatedIssue.resolvedAt || nowIso,
          recordedAt: nowIso,
          recordedBy: actor || updatedIssue.resolvedBy || 'Operational Lead',
          source: 'USER',
          isMilestone: true,
          previousValue: previous.status,
          newValue: 'Resolved',
        });
      } else {
        recordEvent({
          id: `evt-stat-${updatedIssue.id}-seq${nextSeq}`,
          idempotencyKey: `evt-status-${updatedIssue.id}-seq${nextSeq}-${previous.status}-to-${updatedIssue.status}`,
          departmentId: updatedIssue.departmentId || previous.departmentId || 'dept-sort-loop-a',
          department: updatedIssue.department || previous.department,
          issueId: updatedIssue.id,
          eventType: 'ISSUE_STATUS_CHANGED',
          category: updatedIssue.category as any,
          severity: updatedIssue.severity,
          title: `Status Changed: ${previous.status} → ${updatedIssue.status}`,
          description: `Issue status updated for "${updatedIssue.title}".`,
          occurredAt: nowIso,
          recordedAt: nowIso,
          recordedBy: actor || updatedIssue.owner || 'Operational Lead',
          source: 'USER',
          isMilestone: updatedIssue.status === 'Monitoring',
          previousValue: previous.status,
          newValue: updatedIssue.status,
        });
      }
    }

    // 2. Severity transition check
    if (isSeverityChange) {
      recordEvent({
        id: `evt-sev-${updatedIssue.id}-seq${nextSeq}`,
        idempotencyKey: `evt-severity-${updatedIssue.id}-seq${nextSeq}-${previous.severity}-to-${updatedIssue.severity}`,
        departmentId: updatedIssue.departmentId || previous.departmentId || 'dept-sort-loop-a',
        department: updatedIssue.department || previous.department,
        issueId: updatedIssue.id,
        eventType: 'ISSUE_SEVERITY_CHANGED',
        category: updatedIssue.category as any,
        severity: updatedIssue.severity,
        title: `Severity Escalated: ${previous.severity} → ${updatedIssue.severity}`,
        description: `Operational severity revised for "${updatedIssue.title}".`,
        occurredAt: nowIso,
        recordedAt: nowIso,
        recordedBy: actor || updatedIssue.owner || 'Operational Lead',
        source: 'USER',
        isMilestone: updatedIssue.severity === 'Critical' || updatedIssue.severity === 'High',
        previousValue: previous.severity,
        newValue: updatedIssue.severity,
      });
    }

    // 3. Assignment transition check
    if (isOwnerChange) {
      recordEvent({
        id: `evt-assign-${updatedIssue.id}-seq${nextSeq}`,
        idempotencyKey: `evt-assigned-${updatedIssue.id}-seq${nextSeq}-${updatedIssue.owner}`,
        departmentId: updatedIssue.departmentId || previous.departmentId || 'dept-sort-loop-a',
        department: updatedIssue.department || previous.department,
        issueId: updatedIssue.id,
        eventType: 'ISSUE_ASSIGNED',
        category: updatedIssue.category as any,
        severity: updatedIssue.severity,
        title: `Issue Assigned to ${updatedIssue.owner}`,
        description: `Ownership assigned for "${updatedIssue.title}".`,
        occurredAt: nowIso,
        recordedAt: nowIso,
        recordedBy: actor || 'Operational Lead',
        source: 'USER',
        isMilestone: false,
        previousValue: previous.owner || 'Unassigned',
        newValue: updatedIssue.owner,
      });
    }
  }

  return updatedIssue;
}

export function resolveIssue(
  id: string,
  resolvedBy: string,
  resolutionSummary?: string
): OperationalIssue | null {
  const current = getIssues();
  const idx = current.findIndex(i => i.id === id);
  if (idx === -1) return null;

  const target = current[idx];
  const nowIso = new Date().toISOString();
  const nextSeq = (target.transitionSeq || 0) + 1;

  const updated: OperationalIssue = {
    ...target,
    transitionSeq: nextSeq,
    status: 'Resolved',
    resolvedAt: nowIso,
    resolvedBy,
    resolutionSummary: resolutionSummary || 'Resolved by operational lead during shift.',
    lastActivityAt: nowIso,
    lastProgressAt: nowIso,
    updatedAt: nowIso,
  };

  current[idx] = updated;
  localStorage.setItem(ISSUES_KEY, JSON.stringify(current));

  recordEvent({
    id: `evt-resolve-${id}-seq${nextSeq}`,
    idempotencyKey: `evt-status-${id}-seq${nextSeq}-${target.status}-to-Resolved`,
    departmentId: target.departmentId || 'dept-sort-loop-a',
    department: target.department,
    issueId: target.id,
    eventType: 'ISSUE_RESOLVED',
    category: target.category as any,
    severity: 'Normal',
    title: `Issue Resolved: ${target.title}`,
    description: updated.resolutionSummary,
    occurredAt: nowIso,
    recordedAt: nowIso,
    recordedBy: resolvedBy,
    source: 'USER',
    isMilestone: true,
    previousValue: target.status,
    newValue: 'Resolved',
    metadata: {
      resolutionSummary: updated.resolutionSummary,
      resolvedBy,
    },
  });

  return updated;
}

// Gathers open, assigned, in-progress, monitoring, and escalated issues for carry-over
export function getIdempotentCarryoverIssues(
  department?: string,
  departmentId?: string
): OperationalIssue[] {
  const allIssues = getIssues();
  const eligibleStatuses = ['New', 'Open', 'Assigned', 'In Progress', 'Monitoring', 'Escalated'];

  const filtered = allIssues.filter(issue => {
    const isUnresolved = eligibleStatuses.includes(issue.status);
    if (!isUnresolved) return false;

    // If stable departmentId is provided and issue has departmentId, match by ID
    if (departmentId && issue.departmentId) {
      return issue.departmentId === departmentId;
    }

    if (department && department.trim() !== '') {
      return (
        (issue.departmentId && issue.departmentId.toLowerCase() === department.toLowerCase()) ||
        issue.department.toLowerCase() === department.toLowerCase()
      );
    }
    return true;
  });

  return filtered;
}

// -------------------------------------------------------------
// 3. OPERATIONAL ACTIONS
// -------------------------------------------------------------
export function getActions(): OperationalAction[] {
  try {
    const raw = localStorage.getItem(ACTIONS_KEY);
    if (!raw) {
      localStorage.setItem(ACTIONS_KEY, JSON.stringify(INITIAL_ACTIONS));
      return INITIAL_ACTIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_ACTIONS;
  } catch (e) {
    console.error('Failed to read actions from localStorage:', e);
    return INITIAL_ACTIONS;
  }
}

export function getActionsForIssue(issueId: string): OperationalAction[] {
  const actions = getActions();
  return actions.filter(a => a.issueId === issueId);
}

export function saveAction(action: OperationalAction, actor?: string): OperationalAction {
  const current = getActions();
  const existingIdx = current.findIndex(a => a.id === action.id);
  const isNew = existingIdx === -1;
  const nowIso = new Date().toISOString();
  let updatedList: OperationalAction[];

  const normalizedAction: OperationalAction = {
    ...action,
    action: action.action || action.title,
    title: action.title || action.action || 'Operational Action',
    dueDateTime: action.dueDateTime || action.dueTime,
    dueTime: action.dueTime || action.dueDateTime || 'End of Shift',
    transitionSeq: action.transitionSeq || 1,
  };

  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = normalizedAction;
  } else {
    updatedList = [normalizedAction, ...current];
  }

  localStorage.setItem(ACTIONS_KEY, JSON.stringify(updatedList));

  // Domain event: ACTION_CREATED for new actions
  if (isNew) {
    recordEvent({
      id: `evt-act-create-${normalizedAction.id}`,
      idempotencyKey: `evt-action-created-${normalizedAction.id}`,
      handoverId: normalizedAction.handoverId,
      issueId: normalizedAction.issueId,
      actionId: normalizedAction.id,
      eventType: 'ACTION_CREATED',
      category: 'Action',
      severity: normalizedAction.priority === 'Critical' ? 'Critical' : 'Normal',
      title: `Action Created: ${normalizedAction.title}`,
      description: `Assigned to ${normalizedAction.owner}. Target due: ${normalizedAction.dueTime}.`,
      occurredAt: normalizedAction.createdAt || nowIso,
      recordedAt: nowIso,
      recordedBy: actor || normalizedAction.createdBy || 'Supervisor',
      source: 'USER',
      isMilestone: normalizedAction.priority === 'Critical',
    });
  }

  // If linked to an issue, register the actionId on the parent issue and touch activity & progress
  if (normalizedAction.issueId) {
    const parentIssue = getIssueById(normalizedAction.issueId);
    if (parentIssue) {
      const alreadyRegistered = (parentIssue.actionIds || []).includes(normalizedAction.id);
      saveIssue({
        ...parentIssue,
        actionIds: alreadyRegistered ? parentIssue.actionIds : [...(parentIssue.actionIds || []), normalizedAction.id],
        lastActivityAt: nowIso,
        lastProgressAt: nowIso, // creating action represents movement toward mitigation
      });
    }
  }

  return normalizedAction;
}

export function updateAction(id: string, updates: Partial<OperationalAction>, actor?: string): OperationalAction | null {
  const current = getActions();
  const idx = current.findIndex(a => a.id === id);
  if (idx === -1) return null;

  const target = current[idx];
  const nowIso = new Date().toISOString();
  const isStatusChange = !!updates.status && updates.status !== target.status;
  const nextSeq = isStatusChange ? (target.transitionSeq || 0) + 1 : target.transitionSeq || 1;

  const isNowCompleted = updates.status === 'Completed' && target.status !== 'Completed';
  const completedAt = isNowCompleted ? nowIso : target.completedAt;

  const updated: OperationalAction = {
    ...target,
    ...updates,
    transitionSeq: nextSeq,
    ...(isNowCompleted ? { completedAt, completedBy: actor || updates.completedBy || target.owner } : {}),
  };

  current[idx] = updated;
  localStorage.setItem(ACTIONS_KEY, JSON.stringify(current));

  // Touch parent issue activity and progress
  if (target.issueId && isStatusChange) {
    const parentIssue = getIssueById(target.issueId);
    if (parentIssue) {
      const isProgress = updates.status === 'In Progress' || updates.status === 'Completed';
      saveIssue({
        ...parentIssue,
        lastActivityAt: nowIso,
        lastProgressAt: isProgress ? nowIso : parentIssue.lastProgressAt,
      });
    }
  }

  // State Transition Detection for Actions (Refinements 2, 3 & 4)
  if (isStatusChange) {
    if (updates.status === 'Completed') {
      recordEvent({
        id: `evt-act-done-${id}-seq${nextSeq}`,
        idempotencyKey: `evt-action-completed-${id}-seq${nextSeq}-${completedAt}`,
        handoverId: target.handoverId,
        issueId: target.issueId,
        actionId: target.id,
        eventType: 'ACTION_COMPLETED',
        category: 'Action',
        severity: 'Normal',
        title: `Action Completed: ${target.title || target.action}`,
        description: `Verified completion by ${actor || target.owner}.`,
        occurredAt: completedAt || nowIso,
        recordedAt: nowIso,
        recordedBy: actor || target.owner,
        source: 'USER',
        isMilestone: true,
        previousValue: target.status,
        newValue: 'Completed',
      });
    } else if (updates.status === 'Blocked') {
      recordEvent({
        id: `evt-act-block-${id}-seq${nextSeq}`,
        idempotencyKey: `evt-action-blocked-${id}-seq${nextSeq}-${nowIso}`,
        handoverId: target.handoverId,
        issueId: target.issueId,
        actionId: target.id,
        eventType: 'ACTION_BLOCKED',
        category: 'Action',
        severity: 'High',
        title: `Action Blocked: ${target.title || target.action}`,
        description: updates.notes || `Work order encountered an operational blocker.`,
        occurredAt: nowIso,
        recordedAt: nowIso,
        recordedBy: actor || target.owner,
        source: 'USER',
        isMilestone: true,
        previousValue: target.status,
        newValue: 'Blocked',
      });
    } else {
      recordEvent({
        id: `evt-act-stat-${id}-seq${nextSeq}`,
        idempotencyKey: `evt-action-status-${id}-seq${nextSeq}-${target.status}-to-${updates.status}`,
        handoverId: target.handoverId,
        issueId: target.issueId,
        actionId: target.id,
        eventType: updates.status === 'In Progress' ? 'ACTION_STARTED' : 'ACTION_STATUS_CHANGED',
        category: 'Action',
        severity: 'Normal',
        title: `Action ${updates.status}: ${target.title || target.action}`,
        description: `Work order moved to ${updates.status}.`,
        occurredAt: nowIso,
        recordedAt: nowIso,
        recordedBy: actor || target.owner,
        source: 'USER',
        isMilestone: false, // Administrative micro-transition (Refinement 7)
        previousValue: target.status,
        newValue: updates.status,
      });
    }
  }

  return updated;
}

export function deleteAction(id: string): void {
  const current = getActions();
  const filtered = current.filter(a => a.id !== id);
  localStorage.setItem(ACTIONS_KEY, JSON.stringify(filtered));
}

// -------------------------------------------------------------
// 4. RESET & BACKUP UTILITIES
// -------------------------------------------------------------
export function resetToDemoData(): void {
  localStorage.setItem(HANDOVERS_KEY, JSON.stringify(INITIAL_HANDOVERS));
  localStorage.setItem(ISSUES_KEY, JSON.stringify(INITIAL_ISSUES));
  localStorage.setItem(ACTIONS_KEY, JSON.stringify(INITIAL_ACTIONS));
  localStorage.removeItem('shiftflow_events_v2');
  localStorage.removeItem('shiftflow_events_migrated_v2');

  // Re-bootstrap events cleanly
  bootstrapOperationalEvents(INITIAL_HANDOVERS, INITIAL_ISSUES, INITIAL_ACTIONS);
}

export function exportAllData(): string {
  const data = {
    app: 'ShiftFlow AI Operational Continuity System',
    version: '2.1.0',
    exportedAt: new Date().toISOString(),
    handovers: getHandovers(),
    issues: getIssues(),
    actions: getActions(),
    events: getOperationalEvents(),
  };
  return JSON.stringify(data, null, 2);
}

export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data && Array.isArray(data.handovers)) {
      localStorage.setItem(HANDOVERS_KEY, JSON.stringify(data.handovers));
      if (Array.isArray(data.issues)) {
        localStorage.setItem(ISSUES_KEY, JSON.stringify(data.issues));
      }
      if (Array.isArray(data.actions)) {
        localStorage.setItem(ACTIONS_KEY, JSON.stringify(data.actions));
      }
      if (Array.isArray(data.events)) {
        localStorage.setItem('shiftflow_events_v2', JSON.stringify(data.events));
      }
      return true;
    }
    return false;
  } catch (e) {
    console.error('Import error:', e);
    return false;
  }
}
