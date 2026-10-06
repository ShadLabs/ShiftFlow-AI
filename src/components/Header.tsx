import React from 'react';
import { Menu, Plus, FileText, Download } from 'lucide-react';
import { HandoverReport } from '../types';

interface HeaderProps {
  currentTab: string;
  onOpenMobileMenu: () => void;
  onNewHandoverClick: () => void;
  onOpenBriefClick: () => void;
  latestHandover?: HandoverReport;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileMenu,
  onNewHandoverClick,
  onOpenBriefClick,
  latestHandover,
}) => {
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Operations Dashboard';
      case 'new-handover':
        return 'Create Shift Handover';
      case 'handovers':
        return 'Shift Handover History';
      case 'actions':
        return 'Operational Action Tracker';
      case 'insights':
        return 'Cross-Shift AI Insights';
      case 'settings':
        return 'Settings & Data Management';
      default:
        return 'ShiftFlow AI';
    }
  };

  const getStatusBadge = (status?: string) => {
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
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between no-print">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
            {getTabTitle(currentTab)}
          </h1>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span>Operational Continuity System</span>
            {latestHandover && (
              <>
                <span aria-hidden="true">·</span>
                <span>Latest: {latestHandover.shift} Shift ({latestHandover.department})</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {latestHandover && (
          <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusBadge(latestHandover.generalStatus)}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span>Shift Status: {latestHandover.generalStatus}</span>
          </div>
        )}

        <button
          onClick={onOpenBriefClick}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          title="Open latest Management Brief"
        >
          <FileText className="w-3.5 h-3.5 text-slate-600" />
          <span>Management Brief</span>
        </button>

        <button
          onClick={onNewHandoverClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">New Handover</span>
          <span className="xs:hidden">New</span>
        </button>
      </div>
    </header>
  );
};
