import { OperationalIssue, HandoverReport, QualityScoreSnapshot } from '../types';

/**
 * Derives the exact hours and minutes an issue has remained open from its createdAt timestamp.
 */
export function calculateHoursOpen(
  issue: OperationalIssue,
  asOfDate: string = new Date().toISOString()
): { hours: number; minutes: number; formatted: string } {
  const start = new Date(issue.firstIdentifiedAt || issue.createdAt).getTime();
  const end = issue.resolvedAt ? new Date(issue.resolvedAt).getTime() : new Date(asOfDate).getTime();

  if (isNaN(start) || isNaN(end) || end < start) {
    return { hours: 0, minutes: 0, formatted: '< 1h' };
  }

  const diffMs = end - start;
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let formatted = '';
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    formatted = `${days}d ${remHours}h`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m`;
  } else {
    formatted = `${Math.max(1, minutes)}m`;
  }

  return { hours, minutes, formatted };
}

/**
 * Derives the number of shifts an issue has crossed from its history of handovers.
 */
export function calculateShiftsCrossed(
  issue: OperationalIssue,
  allHandovers: HandoverReport[] = []
): number {
  if (Array.isArray(issue.handoverHistoryIds) && issue.handoverHistoryIds.length > 0) {
    return issue.handoverHistoryIds.length;
  }

  // Fallback derivation based on creation date vs all handovers in the same department
  if (allHandovers.length > 0) {
    const createdTime = new Date(issue.firstIdentifiedAt || issue.createdAt).getTime();
    const matching = allHandovers.filter(h => {
      const hTime = new Date(h.createdAt || h.date).getTime();
      return h.department === issue.department && hTime >= createdTime;
    });
    return Math.max(1, matching.length);
  }

  return 1;
}

/**
 * Evaluates the Handover Quality Score (0 - 100%) and provides coaching guidance.
 * Non-punitive, non-blocking coaching mechanism.
 */
export function calculateQualityScore(data: {
  rawNotes?: string;
  issues?: OperationalIssue[];
  metrics?: any;
  department?: string;
  shiftLead?: string;
}): QualityScoreSnapshot {
  let score = 0;
  const feedback: string[] = [];
  const missingElements: string[] = [];

  const notes = (data.rawNotes || '').trim();
  const issues = data.issues || [];
  const metrics = data.metrics || {};

  // 1. Shift Notes / Operational Context Analysis (up to 20 pts)
  // Anti-gaming: checks word count, unique-word ratio, and repetitive gibberish patterns.
  const cleanNotes = notes.replace(/\s+/g, ' ').trim();
  const words = cleanNotes.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 0);
  const uniqueWords = new Set(words);
  const uniqueRatio = words.length > 0 ? uniqueWords.size / words.length : 0;
  const hasRepeatingChars = /(.)\1{5,}/.test(cleanNotes); // e.g. "aaaaaa"
  const isRepetitiveSpam = (words.length >= 4 && uniqueWords.size <= 2); // e.g. "test test test test"

  const operationalKeywords = ['shift', 'line', 'target', 'downtime', 'normal', 'stopped', 'issue', 'backlog', 'safety', 'maintenance', 'achieved', 'delay', 'unit', 'pallet', 'lead', 'operator', 'station'];
  const hasOperationalTerm = words.some(w => operationalKeywords.includes(w));

  if (hasRepeatingChars || isRepetitiveSpam) {
    score += 5;
    missingElements.push('Substantive shift summary');
    feedback.push('Shift notes appear repetitive or placeholder. Provide factual operational details.');
  } else if (words.length >= 12 && uniqueRatio >= 0.45) {
    score += 20;
  } else if (words.length >= 6 && uniqueRatio >= 0.60 && hasOperationalTerm) {
    // Concise but meaningful operational note (e.g. "Shift normal. No downtime. Target achieved. No open issues.")
    score += 18;
  } else if (words.length >= 6) {
    score += 12;
    feedback.push('Shift notes are relatively brief; describe operational conditions in more detail.');
  } else {
    score += 5;
    missingElements.push('Substantive shift summary');
    feedback.push('Shift notes contain minimal context. Elaborate on what occurred.');
  }

  // 2. Location / Area Precision (15 pts)
  const hasSpecificArea = issues.some(i => i.area && i.area !== 'Main Production Floor' && i.area.length > 4);
  if (hasSpecificArea || (data.department && data.department.length > 4)) {
    score += 15;
  } else {
    missingElements.push('Specific work center or equipment station');
    feedback.push('Identify specific machine stations or bays rather than general areas.');
  }

  // 3. Operational Timing & Downtime Completeness (15 pts)
  // Distinguish explicit zero downtime from missing downtime information.
  const dtRaw = metrics.downtime !== undefined && metrics.downtime !== null ? String(metrics.downtime).trim().toLowerCase() : '';
  const notesLower = notes.toLowerCase();

  const isExplicitZeroDowntime =
    /^(0|0\s*min|0\s*mins|0\s*minutes|0\s*m|none|no downtime|zero|zero downtime|0\s*hours?|0h)$/i.test(dtRaw) ||
    notesLower.includes('no downtime') ||
    notesLower.includes('zero downtime') ||
    notesLower.includes('downtime: 0');

  const hasRecordedPositiveDowntime =
    (dtRaw.length > 0 && !isExplicitZeroDowntime) ||
    issues.some(i => (i.downtimeMinutes !== undefined && i.downtimeMinutes > 0) || i.timeObserved);

  if (isExplicitZeroDowntime || hasRecordedPositiveDowntime) {
    score += 15;
  } else {
    missingElements.push('Downtime duration or explicit zero-downtime confirmation');
    feedback.push('Downtime duration is unclear. Record minutes lost or confirm zero downtime.');
  }

  // 4. Quantified Operational Impact (15 pts)
  const hasImpact = (metrics.actual && metrics.target) || (metrics.backlog && metrics.backlog !== '0') ||
    issues.some(i => i.operationalImpact && i.operationalImpact.length > 5);
  if (hasImpact) {
    score += 15;
  } else {
    missingElements.push('Operational throughput or backlog impact');
    feedback.push('Specify quantitative impact (e.g. units backlog or cases delayed).');
  }

  // 5. Containment Action Taken (15 pts)
  const hasActionTaken = issues.some(i => i.actionTaken && i.actionTaken.length > 10);
  if (hasActionTaken) {
    score += 15;
  } else {
    missingElements.push('Immediate action already taken by outgoing team');
    feedback.push('Record what steps the outgoing team already completed to stabilize the problem.');
  }

  // 6. Next Action & Assigned Ownership (20 pts)
  const criticalOrHighIssues = issues.filter(i => i.severity === 'Critical' || i.severity === 'High');
  const hasUnassignedCritical = criticalOrHighIssues.some(i => !i.owner || i.owner.trim() === '' || i.owner === 'Unassigned');
  const hasNextActions = issues.some(i => (i.actionIds && i.actionIds.length > 0) || (i.owner && i.owner.length > 2));

  if (!hasUnassignedCritical && hasNextActions) {
    score += 20;
  } else if (hasUnassignedCritical) {
    score += 5;
    missingElements.push('Assigned owner for High / Critical priority issue');
    feedback.push('Critical or High severity issue has no assigned owner.');
  } else {
    missingElements.push('Next action owner');
    feedback.push('Specify who owns the next follow-up action.');
  }

  // Determine Rating
  let rating: QualityScoreSnapshot['rating'] = 'Excellent';
  if (score < 60) rating = 'Needs Attention';
  else if (score < 75) rating = 'Fair';
  else if (score < 90) rating = 'Good';

  return {
    score: Math.min(100, Math.max(10, score)),
    rating,
    feedback: feedback.slice(0, 3),
    missingElements,
    calculatedAt: new Date().toISOString(),
  };
}
