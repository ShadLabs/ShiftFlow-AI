import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Edit2,
  CheckSquare,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ActionItem, ActionStatus, ActionPriority } from '../types';

interface ActionTrackerViewProps {
  actions: ActionItem[];
  onSaveAction: (action: ActionItem) => void;
  onUpdateActionStatus: (id: string, status: ActionStatus) => void;
  onDeleteAction: (id: string) => void;
}

export const ActionTrackerView: React.FC<ActionTrackerViewProps> = ({
  actions,
  onSaveAction,
  onUpdateActionStatus,
  onDeleteAction,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // New action modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [actionTitle, setActionTitle] = useState<string>('');
  const [relatedIssue, setRelatedIssue] = useState<string>('');
  const [priority, setPriority] = useState<ActionPriority>('Medium');
  const [owner, setOwner] = useState<string>('');
  const [dueDateTime, setDueDateTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const filteredActions = actions.filter(item => {
    const actionText = item.action || item.title || '';
    const issueText = item.relatedIssue || '';
    const ownerText = item.owner || '';

    const matchesSearch =
      actionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issueText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ownerText.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleCreateAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTitle.trim() || !owner.trim()) return;

    const due = dueDateTime || new Date(Date.now() + 86400000).toISOString().slice(0, 16).replace('T', ' ');

    const newAction: ActionItem = {
      id: `act-${Date.now()}`,
      handoverId: 'general-actions',
      title: actionTitle.trim(),
      action: actionTitle.trim(),
      relatedIssue: relatedIssue.trim() || 'General Operations',
      priority,
      owner: owner.trim(),
      dueTime: due.includes(' ') ? due.split(' ')[1] : due,
      dueDateTime: due,
      status: 'Not Started',
      notes: notes.trim(),
      createdBy: 'Operations Lead',
      isAiRecommended: false,
      approvedByLead: true,
      createdAt: new Date().toISOString(),
    };

    onSaveAction(newAction);
    setIsModalOpen(false);
    setActionTitle('');
    setRelatedIssue('');
    setOwner('');
    setNotes('');
  };

  const getPriorityStyle = (p: ActionPriority) => {
    switch (p) {
      case 'Critical':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'High':
        return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'Medium':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      default:
        return 'text-slate-600 bg-slate-100 border-slate-200';
    }
  };

  const getStatusBadge = (s: ActionStatus) => {
    switch (s) {
      case 'Completed':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'In Progress':
        return 'text-indigo-700 bg-indigo-50 border-indigo-200';
      case 'Blocked':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      default:
        return 'text-slate-600 bg-slate-100 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Operational Action Tracker
          </h2>
          <p className="text-xs text-slate-500">
            Assigned follow-ups, maintenance work orders, and lead-approved AI recommendations
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Action Item</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search actions, issues, owners..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-600 bg-slate-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status buttons */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs">
            {['all', 'Not Started', 'In Progress', 'Completed', 'Blocked'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'all' ? 'All Statuses' : st}
              </button>
            ))}
          </div>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Action Items List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredActions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No action items matching your current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-3 px-5">Action & Context</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assigned Owner</th>
                  <th className="py-3 px-4">Target Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Approval</th>
                  <th className="py-3 px-4 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredActions.map(action => (
                  <tr key={action.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 max-w-md">
                      <div className="font-semibold text-slate-900">{action.action}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Related: <span className="text-slate-700">{action.relatedIssue}</span>
                      </div>
                      {action.notes && (
                        <div className="text-[11px] text-slate-500 italic mt-0.5">
                          Note: {action.notes}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-md border ${getPriorityStyle(
                          action.priority
                        )}`}
                      >
                        {action.priority}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {action.owner}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {action.dueDateTime}
                    </td>

                    <td className="py-3.5 px-4">
                      <select
                        value={action.status}
                        onChange={e =>
                          onUpdateActionStatus(action.id, e.target.value as ActionStatus)
                        }
                        className={`text-[11px] font-medium px-2 py-1 rounded-md border focus:outline-hidden ${getStatusBadge(
                          action.status
                        )}`}
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Blocked">Blocked</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium"
                        title="Approved by shift lead"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Lead Approved</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onDeleteAction(action.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete action"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Manual Action Item */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">
                Create Operational Action Item
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAction} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Action Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Calibrate optical photo-eye sensor on Diverter 4"
                  value={actionTitle}
                  onChange={e => setActionTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Related Issue</label>
                <input
                  type="text"
                  placeholder="e.g. Diverter 4 Solenoid Latency"
                  value={relatedIssue}
                  onChange={e => setRelatedIssue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as ActionPriority)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Assigned Owner *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Marcus Vance / Mtce Lead"
                    value={owner}
                    onChange={e => setOwner(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Due Date & Time</label>
                <input
                  type="text"
                  placeholder="e.g. 2026-10-06 14:00"
                  value={dueDateTime}
                  onChange={e => setDueDateTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Operational Notes / Work Order #
                </label>
                <textarea
                  rows={2}
                  placeholder="Work order number, parts required, or safety precautions..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg font-semibold text-white bg-slate-900 hover:bg-slate-800"
                >
                  Create Action Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
