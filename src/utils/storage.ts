import { HandoverReport, ActionItem, CarriedOverIssue } from '../types';
import { INITIAL_HANDOVERS, INITIAL_ACTIONS } from '../data/initialData';

const HANDOVERS_KEY = 'shiftflow_handovers_v1';
const ACTIONS_KEY = 'shiftflow_actions_v1';

export function getHandovers(): HandoverReport[] {
  try {
    const raw = localStorage.getItem(HANDOVERS_KEY);
    if (!raw) {
      localStorage.setItem(HANDOVERS_KEY, JSON.stringify(INITIAL_HANDOVERS));
      return INITIAL_HANDOVERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_HANDOVERS;
  } catch (e) {
    console.error('Failed to read handovers from localStorage:', e);
    return INITIAL_HANDOVERS;
  }
}

export function saveHandover(handover: HandoverReport): HandoverReport {
  const current = getHandovers();
  const existingIdx = current.findIndex(h => h.id === handover.id);
  let updatedList: HandoverReport[];

  const updatedHandover: HandoverReport = {
    ...handover,
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = updatedHandover;
  } else {
    updatedList = [updatedHandover, ...current];
  }

  localStorage.setItem(HANDOVERS_KEY, JSON.stringify(updatedList));
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

export function getActions(): ActionItem[] {
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

export function saveAction(action: ActionItem): ActionItem {
  const current = getActions();
  const existingIdx = current.findIndex(a => a.id === action.id);
  let updatedList: ActionItem[];

  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = action;
  } else {
    updatedList = [action, ...current];
  }

  localStorage.setItem(ACTIONS_KEY, JSON.stringify(updatedList));
  return action;
}

export function updateAction(id: string, updates: Partial<ActionItem>): ActionItem | null {
  const current = getActions();
  const idx = current.findIndex(a => a.id === id);
  if (idx === -1) return null;

  const updated = {
    ...current[idx],
    ...updates,
    ...(updates.status === 'Completed' && !current[idx].completedAt ? { completedAt: new Date().toISOString() } : {}),
  };

  current[idx] = updated;
  localStorage.setItem(ACTIONS_KEY, JSON.stringify(current));
  return updated;
}

export function deleteAction(id: string): void {
  const current = getActions();
  const filtered = current.filter(a => a.id !== id);
  localStorage.setItem(ACTIONS_KEY, JSON.stringify(filtered));
}

// Find unresolved items from previous handovers for shift continuity
export function getCarriedOverIssuesForNewShift(department?: string): CarriedOverIssue[] {
  const handovers = getHandovers();
  const relevantHandovers = department
    ? handovers.filter(h => h.department.toLowerCase() === department.toLowerCase())
    : handovers;

  const targetHandover = relevantHandovers[0] || handovers[0];
  if (!targetHandover) return [];

  const carryovers: CarriedOverIssue[] = [];

  // Gather uncompleted issues
  (targetHandover.issues || []).forEach(issue => {
    if (['Open', 'Partially Resolved', 'Monitoring', 'Escalated'].includes(issue.status)) {
      carryovers.push({
        id: `co-${issue.id}`,
        title: issue.title,
        category: issue.category,
        originalShiftDate: `${targetHandover.date} (${targetHandover.shift})`,
        previousStatus: issue.status,
        status: issue.status === 'Monitoring' ? 'Monitoring' : 'Still Open',
        resolutionNotes: issue.actionTaken || '',
      });
    }
  });

  // Also include explicitly outstanding items if not already matched
  (targetHandover.outstandingItems || []).forEach((item, index) => {
    if (!carryovers.some(c => c.title.toLowerCase().includes(item.slice(0, 20).toLowerCase()))) {
      carryovers.push({
        id: `co-out-${targetHandover.id}-${index}`,
        title: item,
        category: 'Process',
        originalShiftDate: `${targetHandover.date} (${targetHandover.shift})`,
        previousStatus: 'Open',
        status: 'Still Open',
        resolutionNotes: '',
      });
    }
  });

  return carryovers;
}

export function resetToDemoData(): void {
  localStorage.setItem(HANDOVERS_KEY, JSON.stringify(INITIAL_HANDOVERS));
  localStorage.setItem(ACTIONS_KEY, JSON.stringify(INITIAL_ACTIONS));
}

export function exportAllData(): string {
  const data = {
    app: 'ShiftFlow AI',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    handovers: getHandovers(),
    actions: getActions(),
  };
  return JSON.stringify(data, null, 2);
}

export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data && Array.isArray(data.handovers)) {
      localStorage.setItem(HANDOVERS_KEY, JSON.stringify(data.handovers));
      if (Array.isArray(data.actions)) {
        localStorage.setItem(ACTIONS_KEY, JSON.stringify(data.actions));
      }
      return true;
    }
    return false;
  } catch (e) {
    console.error('Import error:', e);
    return false;
  }
}
