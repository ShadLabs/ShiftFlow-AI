import React, { useState } from 'react';
import {
  Wrench,
  Clock,
  AlertTriangle,
  User,
  ArrowRight,
  CheckCircle2,
  Edit2,
  Save,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { OperationalIssue, IssueSeverity, IssueCategory, IssueStatus } from '../types';

interface ExtractionReviewCardProps {
  issue: OperationalIssue;
  onUpdateIssue: (updated: OperationalIssue) => void;
  onDeleteIssue?: () => void;
  defaultEditing?: boolean;
}

export const ExtractionReviewCard: React.FC<ExtractionReviewCardProps> = ({
  issue,
  onUpdateIssue,
  onDeleteIssue,
  defaultEditing = false,
}) => {
  const [isEditing, setIsEditing] = useState(defaultEditing);
  const [title, setTitle] = useState(issue.title);
  const [category, setCategory] = useState<IssueCategory>(issue.category);
  const [severity, setSeverity] = useState<IssueSeverity>(issue.severity);
  const [status, setStatus] = useState<IssueStatus>(issue.status);
  const [timeObserved, setTimeObserved] = useState(issue.timeObserved || '');
  const [downtimeMinutes, setDowntimeMinutes] = useState<number | string>(issue.downtimeMinutes || '');
  const [operationalImpact, setOperationalImpact] = useState(issue.operationalImpact || '');
  const [actionTaken, setActionTaken] = useState(issue.actionTaken || '');
  const [recommendedAction, setRecommendedAction] = useState(issue.recommendedAction || '');
  const [owner, setOwner] = useState(issue.owner || '');
  const [contactPerson, setContactPerson] = useState(issue.contactPerson || '');

  const handleSave = () => {
    onUpdateIssue({
      ...issue,
      title,
      category,
      severity,
      status,
      timeObserved,
      downtimeMinutes: downtimeMinutes ? Number(downtimeMinutes) : undefined,
      operationalImpact,
      actionTaken,
      recommendedAction,
      owner,
      contactPerson,
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  const getSeverityBadge = (s: IssueSeverity) => {
    switch (s) {
      case 'Critical':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'High':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3.5 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border uppercase tracking-wider ${getSeverityBadge(issue.severity)}`}>
              {issue.severity}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {issue.category}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-semibold text-slate-700">
              Status: <strong className="text-slate-900">{issue.status}</strong>
            </span>
          </div>

          <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
            {issue.title}
          </h4>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isEditing ? (
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Done Editing</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        /* Edit Mode */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs pt-1">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Issue Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-600 font-medium text-slate-900"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as IssueCategory)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden"
            >
              <option value="Equipment">Equipment</option>
              <option value="Process">Process</option>
              <option value="Quality">Quality</option>
              <option value="Staffing">Staffing</option>
              <option value="Safety">Safety</option>
              <option value="Inventory">Inventory</option>
              <option value="Technology">Technology</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Severity</label>
            <select
              value={severity}
              onChange={e => setSeverity(e.target.value as IssueSeverity)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden font-semibold"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Current Lifecycle Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as IssueStatus)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden font-medium"
            >
              <option value="New">New</option>
              <option value="Open">Open</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Monitoring">Monitoring</option>
              <option value="Resolved">Resolved</option>
              <option value="Escalated">Escalated</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">First Occurrence Time</label>
            <input
              type="text"
              placeholder="e.g. 02:30"
              value={timeObserved}
              onChange={e => setTimeObserved(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Downtime (Minutes)</label>
            <input
              type="number"
              placeholder="e.g. 35"
              value={downtimeMinutes}
              onChange={e => setDowntimeMinutes(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Assigned Owner / Team</label>
            <input
              type="text"
              placeholder="e.g. Maintenance"
              value={owner}
              onChange={e => setOwner(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Named Contact Person</label>
            <input
              type="text"
              placeholder="e.g. Sarah"
              value={contactPerson}
              onChange={e => setContactPerson(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Operational Impact (Backlog / Throughput)</label>
            <input
              type="text"
              placeholder="e.g. Packing backlog increased to 420"
              value={operationalImpact}
              onChange={e => setOperationalImpact(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Action Already Taken</label>
            <input
              type="text"
              placeholder="e.g. Maintenance reset conveyor"
              value={actionTaken}
              onChange={e => setActionTaken(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Next Action Required</label>
            <input
              type="text"
              placeholder="e.g. Inspect conveyor motor during day shift"
              value={recommendedAction}
              onChange={e => setRecommendedAction(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden"
            />
          </div>
        </div>
      ) : (
        /* Read / Review Mode structured exactly as specified */
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">First Occurrence</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">{issue.timeObserved || 'Mid-shift'}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Downtime</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">
                {issue.downtimeMinutes ? `~${issue.downtimeMinutes} minutes` : 'Not stated'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Owner</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">{issue.owner || 'Unassigned'}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Contact</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">{issue.contactPerson || 'None specified'}</span>
            </div>
          </div>

          {issue.operationalImpact && (
            <div className="flex items-start gap-2">
              <span className="font-semibold text-slate-700 shrink-0">Impact:</span>
              <span className="text-slate-800">{issue.operationalImpact}</span>
            </div>
          )}

          {issue.actionTaken && (
            <div className="flex items-start gap-2">
              <span className="font-semibold text-slate-700 shrink-0">Action Taken:</span>
              <span className="text-slate-800">{issue.actionTaken}</span>
            </div>
          )}

          {issue.recommendedAction && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100 text-indigo-950">
              <ArrowRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-indigo-900">Next Action Required: </span>
                <span>{issue.recommendedAction}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
