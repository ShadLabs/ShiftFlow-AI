import React from 'react';
import {
  LayoutDashboard,
  FilePlus2,
  ClipboardList,
  CheckSquare,
  Sparkles,
  Settings,
  Info,
  Layers,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  pendingActionsCount: number;
  openAboutModal: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  pendingActionsCount,
  openAboutModal,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-handover', label: 'New Handover', icon: FilePlus2, highlight: true },
    { id: 'handovers', label: 'Handovers', icon: ClipboardList },
    {
      id: 'actions',
      label: 'Action Tracker',
      icon: CheckSquare,
      badge: pendingActionsCount > 0 ? pendingActionsCount : undefined,
    },
    { id: 'insights', label: 'AI Insights', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden no-print"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 no-print ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center text-white shadow-sm font-semibold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                ShiftFlow AI
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Operations Continuity</div>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-xs'
                    : item.highlight
                    ? 'text-indigo-300 hover:bg-slate-800/70 hover:text-white'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? 'text-indigo-400'
                        : item.highlight
                        ? 'text-indigo-400'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-700 text-slate-200 rounded-md">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* About & Powered by Gemini section */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <button
            onClick={() => {
              openAboutModal();
              setIsMobileOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <Info className="w-4 h-4 text-slate-400" />
            <span>About This Project</span>
          </button>

          <div className="px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>ShiftFlow Engine</span>
            </span>
            <span className="font-medium text-slate-300">Powered by Gemini</span>
          </div>
        </div>
      </aside>
    </>
  );
};
