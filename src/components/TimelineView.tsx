import React, { useState, useMemo } from 'react';
import {
  Clock,
  Filter,
  Search,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowUpDown,
  RefreshCw,
  HardDrive,
  Eye,
  EyeOff,
  Wrench,
  Activity,
  UserCheck,
  FileText,
  CheckSquare,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import {
  OperationalEvent,
  OperationalEventType,
  EventCategory,
  HandoverReport,
  OperationalIssue,
} from '../types';
import {
  getOperationalEvents,
  getEventStoreStorageMetrics,
  EventStoreStorageMetrics,
} from '../utils/eventStore';

interface TimelineViewProps {
  handovers: HandoverReport[];
  issues: OperationalIssue[];
  onSelectIssue?: (issue: OperationalIssue) => void;
  onSelectHandover?: (handover: HandoverReport) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  handovers,
  issues,
  onSelectIssue,
  onSelectHandover,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllEvents, setShowAllEvents] = useState(false); // Default: Milestone hierarchy (Refinement 7)
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest'); // Refinement 10
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Retrieve raw events
  const allEvents = useMemo(() => {
    return getOperationalEvents();
  }, [refreshKey]);

  // Storage metrics (Refinement 1: Monitor size, never delete)
  const storageMetrics: EventStoreStorageMetrics = useMemo(() => {
    return getEventStoreStorageMetrics();
  }, [allEvents.length]);

  // Unique departments & shifts for filters
  const departments = useMemo(() => {
    const set = new Set<string>();
    handovers.forEach(h => {
      if (h.department) set.add(h.department);
    });
    issues.forEach(i => {
      if (i.department) set.add(i.department);
    });
    return Array.from(set);
  }, [handovers, issues]);

  // Filtered & sorted events
  const filteredEvents = useMemo(() => {
    return allEvents
      .filter(ev => {
        // Hierarchy filter: Milestones only by default
        if (!showAllEvents && !ev.isMilestone) {
          return false;
        }

        // Search filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTitle = (ev.title || '').toLowerCase().includes(q);
          const matchDesc = (ev.description || '').toLowerCase().includes(q);
          const matchActor = (ev.recordedBy || '').toLowerCase().includes(q);
          const matchDept = (ev.department || '').toLowerCase().includes(q);
          const matchEquip = (ev.equipmentName || '').toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchActor && !matchDept && !matchEquip) {
            return false;
          }
        }

        // Category filter
        if (categoryFilter !== 'all' && ev.category !== categoryFilter) {
          return false;
        }

        // Shift filter
        if (shiftFilter !== 'all') {
          if (!ev.shiftId || !ev.shiftId.toLowerCase().includes(shiftFilter.toLowerCase())) {
            return false;
          }
        }

        // Severity filter
        if (severityFilter !== 'all') {
          if (ev.severity !== severityFilter) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.occurredAt || 0).getTime();
        const timeB = new Date(b.occurredAt || 0).getTime();
        if (timeA !== timeB) {
          return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
        }
        const recA = new Date(a.recordedAt || 0).getTime();
        const recB = new Date(b.recordedAt || 0).getTime();
        if (recA !== recB) {
          return sortOrder === 'newest' ? recB - recA : recA - recB;
        }
        return (b.id || '').localeCompare(a.id || '');
      });
  }, [allEvents, showAllEvents, searchTerm, categoryFilter, shiftFilter, severityFilter, sortOrder]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getEventIcon = (eventType?: OperationalEventType, category?: EventCategory) => {
    switch (eventType) {
      case 'EQUIPMENT_STOPPED':
      case 'DOWNTIME_STARTED':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'EQUIPMENT_RESTARTED':
      case 'DOWNTIME_ENDED':
        return <Activity className="w-4 h-4 text-emerald-600" />;
      case 'ISSUE_ESCALATED':
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      case 'ISSUE_RESOLVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'HANDOVER_ACKNOWLEDGED':
        return <UserCheck className="w-4 h-4 text-indigo-600" />;
      case 'HANDOVER_SUBMITTED':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'ACTION_COMPLETED':
        return <CheckSquare className="w-4 h-4 text-emerald-600" />;
      case 'ACTION_BLOCKED':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'ISSUE_CARRIED_FORWARD':
        return <Layers className="w-4 h-4 text-purple-600" />;
      case 'ACTION_STARTED':
      case 'ACTION_CREATED':
        return <Wrench className="w-4 h-4 text-slate-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getSeverityBadge = (s?: string) => {
    switch (s) {
      case 'Critical':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'High':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'USER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SYSTEM':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'AI':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'INTEGRATION':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DERIVED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
            <Clock className="w-3.5 h-3.5" />
            <span>Shift & Operational Timeline</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
            Operational Event Stream
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Immutable chronological audit log of operational state changes, equipment incidents, handovers, and actions across shifts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Storage Telemetry (Refinement 1) */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-600">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span>{storageMetrics.eventCount} Events ({storageMetrics.formattedSize})</span>
          </div>

          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Refresh events"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search timeline events, equipment, supervisor, or transition notes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-600 bg-slate-50/50"
            />
          </div>

          {/* Toggle: Milestone Hierarchy (Refinement 7) */}
          <button
            type="button"
            onClick={() => setShowAllEvents(!showAllEvents)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
              showAllEvents
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {showAllEvents ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showAllEvents ? 'Showing All Events' : 'Milestones Only'}</span>
          </button>

          {/* Sort Order Toggle (Refinement 10) */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shrink-0"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-xs">
          {/* Category */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Categories</option>
            <option value="Milestone">Milestone</option>
            <option value="Equipment">Equipment</option>
            <option value="Stoppage">Stoppage</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Handover">Handover</option>
            <option value="Action">Action</option>
            <option value="Safety">Safety</option>
          </select>

          {/* Shift */}
          <select
            value={shiftFilter}
            onChange={e => setShiftFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Shifts</option>
            <option value="Morning">Morning Shift</option>
            <option value="Afternoon">Afternoon Shift</option>
            <option value="Night">Night Shift</option>
          </select>

          {/* Severity */}
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Results Counter */}
          <div className="flex items-center justify-end text-[11px] text-slate-500 font-medium px-2">
            Showing {filteredEvents.length} of {allEvents.length} events
          </div>
        </div>
      </div>

      {/* Chronological Stream */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-7 shadow-xs">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-2">
            <Clock className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No operational events match your filters.</p>
            <p className="text-[11px] text-slate-400">
              Try switching to "Showing All Events" or clearing search filters.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-6">
            {filteredEvents.map((ev, idx) => {
              const occurredDate = new Date(ev.occurredAt || 0);
              const recordedDate = new Date(ev.recordedAt || 0);
              const isLagged =
                Math.abs(recordedDate.getTime() - occurredDate.getTime()) > 5 * 60 * 1000;

              const matchedIssue = ev.issueId ? issues.find(i => i.id === ev.issueId) : undefined;
              const matchedHandover = ev.handoverId ? handovers.find(h => h.id === ev.handoverId) : undefined;

              return (
                <div key={ev.id || idx} className="relative group">
                  {/* Timeline Node Dot */}
                  <div className="absolute -left-[31px] sm:-left-[39px] top-1 p-1.5 rounded-full bg-white border-2 border-slate-300 shadow-xs group-hover:border-indigo-600 transition-colors">
                    {getEventIcon(ev.eventType, ev.category)}
                  </div>

                  {/* Event Card Content */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300 transition-all space-y-2">
                    {/* Top Row: Timestamps & Meta */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Occurred Time (Refinement 2) */}
                        <span className="font-mono text-xs font-bold text-slate-900 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {occurredDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} ·{' '}
                            {occurredDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </span>

                        {/* Lagged entry indicator */}
                        {isLagged && (
                          <span
                            className="px-1.5 py-0.5 text-[9px] font-medium text-slate-500 bg-slate-200/70 rounded"
                            title={`Recorded at ${recordedDate.toLocaleTimeString()}`}
                          >
                            Recorded {recordedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}

                        {/* Event Category Tag */}
                        <span className="px-2 py-0.5 text-[10px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-md">
                          {ev.category}
                        </span>

                        {/* Severity Badge */}
                        {ev.severity && ev.severity !== 'Normal' && (
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getSeverityBadge(ev.severity)}`}>
                            {ev.severity}
                          </span>
                        )}

                        {/* Source Badge (Refinement 11) */}
                        <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border ${getSourceBadge(ev.source)}`}>
                          {ev.source}
                        </span>
                      </div>

                      {/* Shift & Actor */}
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        {ev.shiftId && (
                          <span className="font-medium text-slate-700">{ev.shiftId}</span>
                        )}
                        <span>·</span>
                        <span>By: <strong className="text-slate-800">{ev.recordedBy}</strong></span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{ev.title}</h3>
                      {ev.description && (
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    {/* Transition Delta (Refinement 3) */}
                    {(ev.previousValue || ev.newValue) && (
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-mono">
                        <span className="text-slate-500">{ev.previousValue || 'Initial'}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-bold text-slate-900">{ev.newValue}</span>
                      </div>
                    )}

                    {/* Operational Context & Entity Links */}
                    <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <div className="flex flex-wrap items-center gap-3">
                        {ev.equipmentName && (
                          <span>Equipment: <strong className="text-slate-800">{ev.equipmentName}</strong></span>
                        )}
                        {ev.department && (
                          <span>Dept: <strong className="text-slate-800">{ev.department}</strong></span>
                        )}
                      </div>

                      {/* Action buttons to drill into canonical entity */}
                      <div className="flex items-center gap-2">
                        {matchedIssue && onSelectIssue && (
                          <button
                            type="button"
                            onClick={() => onSelectIssue(matchedIssue)}
                            className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 text-[11px] cursor-pointer"
                          >
                            <span>Inspect Issue Lifecycle</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        {matchedHandover && onSelectHandover && (
                          <button
                            type="button"
                            onClick={() => onSelectHandover(matchedHandover)}
                            className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 text-[11px] cursor-pointer"
                          >
                            <span>View Handover</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
