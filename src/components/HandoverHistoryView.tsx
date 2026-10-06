import React, { useState } from 'react';
import { Search, Filter, ArrowRight, Eye, Calendar, Building2, Trash2 } from 'lucide-react';
import { HandoverReport } from '../types';

interface HandoverHistoryViewProps {
  handovers: HandoverReport[];
  onSelectHandover: (handover: HandoverReport) => void;
  onDeleteHandover: (id: string) => void;
}

export const HandoverHistoryView: React.FC<HandoverHistoryViewProps> = ({
  handovers,
  onSelectHandover,
  onDeleteHandover,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Unique departments for filter dropdown
  const departments = Array.from(new Set(handovers.map(h => h.department))).filter(Boolean);

  const filtered = handovers.filter(h => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      h.shift.toLowerCase().includes(searchLower) ||
      h.department.toLowerCase().includes(searchLower) ||
      h.shiftLead.toLowerCase().includes(searchLower) ||
      h.incomingShift.toLowerCase().includes(searchLower) ||
      h.executiveSummary.toLowerCase().includes(searchLower) ||
      (h.issues || []).some(i => i.title.toLowerCase().includes(searchLower));

    const matchesShift = shiftFilter === 'all' || h.shift === shiftFilter;
    const matchesDept = departmentFilter === 'all' || h.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || h.generalStatus === statusFilter;
    const matchesSeverity =
      severityFilter === 'all' ||
      h.riskLevel === severityFilter ||
      (h.issues || []).some(i => i.severity === severityFilter);

    return matchesSearch && matchesShift && matchesDept && matchesStatus && matchesSeverity;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Critical':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'Attention Required':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      default:
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Shift Handover History & Archives
          </h2>
          <p className="text-xs text-slate-500">
            Searchable historical database of all operational shift handovers and audits
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200">
            Total Records: {handovers.length}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200">
            Filtered: {filtered.length}
          </span>
        </div>
      </div>

      {/* Search & Multi-criteria Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search shift notes, leads, keywords, equipment issues..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-600 bg-slate-50/50"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {/* Shift Filter */}
          <select
            value={shiftFilter}
            onChange={e => setShiftFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Shifts</option>
            <option value="Morning">Morning</option>
            <option value="Afternoon">Afternoon</option>
            <option value="Night">Night</option>
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden truncate"
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="Normal">Normal</option>
            <option value="Attention Required">Attention Required</option>
            <option value="Critical">Critical</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Severities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No shift handovers found matching your search and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-3 px-5">Date & Shift</th>
                  <th className="py-3 px-5">Department</th>
                  <th className="py-3 px-4">Outgoing Lead</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Issues</th>
                  <th className="py-3 px-4">Risk</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map(handover => (
                  <tr
                    key={handover.id}
                    onClick={() => onSelectHandover(handover)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900">{handover.date}</div>
                      <div className="text-[11px] text-slate-500">{handover.shift} Shift</div>
                    </td>

                    <td className="py-3.5 px-5 font-medium text-slate-800">
                      {handover.department}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{handover.shiftLead}</div>
                      <div className="text-[11px] text-slate-400">To: {handover.incomingShift.split(' ')[0]}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 text-[11px] rounded-md font-medium border ${getStatusColor(
                          handover.generalStatus
                        )}`}
                      >
                        {handover.generalStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-medium">
                      {(handover.issues || []).length}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {handover.riskLevel}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onSelectHandover(handover);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 rounded hover:bg-indigo-50 transition-colors"
                        >
                          View
                        </button>
                        {confirmDeleteId === handover.id ? (
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                onDeleteHandover(handover.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-0.5 text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-xs"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-200 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setConfirmDeleteId(handover.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete handover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
