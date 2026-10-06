import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { NewHandoverView } from './components/NewHandoverView';
import { HandoverHistoryView } from './components/HandoverHistoryView';
import { ActionTrackerView } from './components/ActionTrackerView';
import { AiInsightsView } from './components/AiInsightsView';
import { SettingsView } from './components/SettingsView';
import { HandoverDetailModal } from './components/HandoverDetailModal';
import { ManagementBriefModal } from './components/ManagementBriefModal';
import { AboutModal } from './components/AboutModal';
import {
  getHandovers,
  saveHandover,
  deleteHandover,
  getActions,
  saveAction,
  updateAction,
  deleteAction,
} from './utils/storage';
import { HandoverReport, ActionItem, ActionStatus, ManagementBrief } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [handovers, setHandovers] = useState<HandoverReport[]>(() => getHandovers());
  const [actions, setActions] = useState<ActionItem[]>(() => getActions());

  // Modals state
  const [selectedHandover, setSelectedHandover] = useState<HandoverReport | null>(null);
  const [briefModalHandover, setBriefModalHandover] = useState<HandoverReport | null>(null);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Success banner / toast message
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const refreshData = () => {
    setHandovers(getHandovers());
    setActions(getActions());
  };

  const handleHandoverSaved = (newHandover: HandoverReport) => {
    const saved = saveHandover(newHandover);
    refreshData();
    setSelectedHandover(saved);
    setCurrentTab('dashboard');
    showNotification(`Handover for ${saved.shift} Shift successfully saved.`);
  };

  const handleDeleteHandover = (id: string) => {
    deleteHandover(id);
    refreshData();
    if (selectedHandover?.id === id) {
      setSelectedHandover(null);
    }
    showNotification('Handover deleted.');
  };

  const handleSaveAction = (action: ActionItem) => {
    saveAction(action);
    refreshData();
    showNotification('Action item tracked.');
  };

  const handleUpdateActionStatus = (id: string, status: ActionStatus) => {
    updateAction(id, { status });
    refreshData();
  };

  const handleDeleteAction = (id: string) => {
    deleteAction(id);
    refreshData();
    showNotification('Action item deleted.');
  };

  const handleAddActionFromIssue = (issueTitle: string, handoverId: string) => {
    const newAct: ActionItem = {
      id: `act-${Date.now()}`,
      action: `Investigate and resolve: ${issueTitle}`,
      relatedIssue: issueTitle,
      handoverId,
      priority: 'High',
      owner: 'Assigned Lead',
      dueDateTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16).replace('T', ' '),
      status: 'Not Started',
      notes: 'Added from Handover Report issue log.',
      isAiRecommended: false,
      approvedByLead: true,
      createdAt: new Date().toISOString(),
    };
    saveAction(newAct);
    refreshData();
    showNotification(`Action created for "${issueTitle.slice(0, 32)}..."`);
  };

  const handleSaveBriefToHandover = (handoverId: string, brief: ManagementBrief) => {
    const target = handovers.find(h => h.id === handoverId);
    if (target) {
      const updated = { ...target, managementBrief: brief };
      saveHandover(updated);
      refreshData();
    }
  };

  const pendingActionsCount = actions.filter(
    a => a.status === 'Not Started' || a.status === 'In Progress' || a.status === 'Blocked'
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        pendingActionsCount={pendingActionsCount}
        openAboutModal={() => setIsAboutModalOpen(true)}
        isMobileOpen={isMobileNavOpen}
        setIsMobileOpen={setIsMobileNavOpen}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          onOpenMobileMenu={() => setIsMobileNavOpen(true)}
          onNewHandoverClick={() => setCurrentTab('new-handover')}
          onOpenBriefClick={() => {
            if (handovers.length > 0) {
              setBriefModalHandover(handovers[0]);
            }
          }}
          latestHandover={handovers[0]}
        />

        {/* Floating Notification */}
        {notification && (
          <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2 no-print">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* View Router */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              handovers={handovers}
              actions={actions}
              onNewHandoverClick={() => setCurrentTab('new-handover')}
              onSelectHandover={h => setSelectedHandover(h)}
              onNavigateToActions={() => setCurrentTab('actions')}
              onNavigateToHistory={() => setCurrentTab('handovers')}
              onOpenBriefModal={h => setBriefModalHandover(h)}
            />
          )}

          {currentTab === 'new-handover' && (
            <NewHandoverView
              onHandoverSaved={handleHandoverSaved}
              onCancel={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'handovers' && (
            <HandoverHistoryView
              handovers={handovers}
              onSelectHandover={h => setSelectedHandover(h)}
              onDeleteHandover={handleDeleteHandover}
            />
          )}

          {currentTab === 'actions' && (
            <ActionTrackerView
              actions={actions}
              onSaveAction={handleSaveAction}
              onUpdateActionStatus={handleUpdateActionStatus}
              onDeleteAction={handleDeleteAction}
            />
          )}

          {currentTab === 'insights' && <AiInsightsView handovers={handovers} />}

          {currentTab === 'settings' && <SettingsView onDataReset={refreshData} />}
        </main>
      </div>

      {/* Handover Detail & Print Modal */}
      {selectedHandover && (
        <HandoverDetailModal
          handover={selectedHandover}
          onClose={() => setSelectedHandover(null)}
          onOpenManagementBrief={h => setBriefModalHandover(h)}
          onAddActionFromIssue={handleAddActionFromIssue}
        />
      )}

      {/* 30-Second Management Brief Modal */}
      {briefModalHandover && (
        <ManagementBriefModal
          handover={briefModalHandover}
          onClose={() => setBriefModalHandover(null)}
          onSaveBriefToHandover={handleSaveBriefToHandover}
        />
      )}

      {/* About Project Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </div>
  );
}
