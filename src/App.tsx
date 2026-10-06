import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { OperationsInboxView } from './components/OperationsInboxView';
import { TimelineView } from './components/TimelineView';
import { IssueHistoryModal } from './components/IssueHistoryModal';
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
  acknowledgeHandover,
  getActions,
  saveAction,
  updateAction,
  deleteAction,
  getIssues,
  saveIssue,
  resolveIssue,
} from './utils/storage';
import {
  HandoverReport,
  ActionItem,
  ActionStatus,
  ManagementBrief,
  OperationalIssue,
  IssueStatus,
  HandoverAcknowledgment,
} from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [handovers, setHandovers] = useState<HandoverReport[]>(() => getHandovers());
  const [actions, setActions] = useState<ActionItem[]>(() => getActions());
  const [issues, setIssues] = useState<OperationalIssue[]>(() => getIssues());

  // Modals state
  const [selectedHandover, setSelectedHandover] = useState<HandoverReport | null>(null);
  const [selectedIssueForHistory, setSelectedIssueForHistory] = useState<OperationalIssue | null>(null);
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
    setIssues(getIssues());
  };

  const handleHandoverSaved = (newHandover: HandoverReport) => {
    const saved = saveHandover(newHandover);
    refreshData();
    setSelectedHandover(saved);
    setCurrentTab('dashboard');
    showNotification(`Handover for ${saved.shift} Shift successfully saved.`);
  };

  const handleAcceptHandover = (handoverId: string, ack: HandoverAcknowledgment) => {
    const updated = acknowledgeHandover(handoverId, ack);
    if (updated) {
      refreshData();
      showNotification(`Shift Handover accepted by ${ack.acknowledgedBy}. Responsibility assumed.`);
    }
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

  const handleResolveIssue = (issueId: string, resolvedBy: string, notes: string) => {
    resolveIssue(issueId, resolvedBy, notes);
    refreshData();
    showNotification('Operational Issue marked as Resolved.');
  };

  const handleUpdateIssueStatus = (issueId: string, status: IssueStatus) => {
    const target = issues.find(i => i.id === issueId);
    if (target) {
      saveIssue({ ...target, status });
      refreshData();
      showNotification(`Issue status updated to ${status}.`);
    }
  };

  const handleNewActionForIssue = (issueId: string, title: string) => {
    const parentIssue = issues.find(i => i.id === issueId);
    const newAct: ActionItem = {
      id: `act-${Date.now()}`,
      action: title,
      title,
      relatedIssue: parentIssue ? parentIssue.title : 'Operational Issue',
      issueId,
      handoverId: handovers[0]?.id || 'sho-general',
      priority: parentIssue?.severity === 'Critical' ? 'Critical' : 'High',
      owner: parentIssue?.owner || 'Shift Lead',
      dueTime: 'End of Next Shift',
      dueDateTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16).replace('T', ' '),
      status: 'Not Started',
      notes: `Spawned from issue "${parentIssue?.title || 'Operational Issue'}".`,
      createdBy: 'Operations Lead',
      createdAt: new Date().toISOString(),
      approvedByLead: true,
    };
    saveAction(newAct);
    refreshData();
    showNotification(`New action created for "${parentIssue?.title.slice(0, 30) || 'issue'}..."`);
  };

  const handleAddActionFromIssue = (issueTitle: string, handoverId: string) => {
    const newAct: ActionItem = {
      id: `act-${Date.now()}`,
      action: `Investigate and resolve: ${issueTitle}`,
      title: `Investigate and resolve: ${issueTitle}`,
      relatedIssue: issueTitle,
      handoverId,
      priority: 'High',
      owner: 'Assigned Lead',
      dueTime: 'Next Shift Window',
      dueDateTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16).replace('T', ' '),
      status: 'Not Started',
      notes: 'Added from Handover Report issue log.',
      isAiRecommended: false,
      approvedByLead: true,
      createdBy: 'Operations Lead',
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

  const eligibleStatuses = ['New', 'Open', 'Assigned', 'In Progress', 'Monitoring', 'Escalated'];
  const openIssuesCount = issues.filter(
    i => eligibleStatuses.includes(i.status) && (i.severity === 'Critical' || i.severity === 'High')
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        pendingActionsCount={pendingActionsCount}
        openIssuesCount={openIssuesCount}
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
              issues={issues}
              onNewHandoverClick={() => setCurrentTab('new-handover')}
              onSelectHandover={h => setSelectedHandover(h)}
              onNavigateToActions={() => setCurrentTab('actions')}
              onNavigateToHistory={() => setCurrentTab('handovers')}
              onNavigateToInbox={() => setCurrentTab('inbox')}
              onOpenBriefModal={h => setBriefModalHandover(h)}
              onAcceptHandover={handleAcceptHandover}
            />
          )}

          {currentTab === 'inbox' && (
            <OperationsInboxView
              issues={issues}
              actions={actions}
              handovers={handovers}
              onSelectIssue={issue => {
                // Open canonical issue lifecycle audit modal
                setSelectedIssueForHistory(issue);
              }}
              onResolveIssue={handleResolveIssue}
              onUpdateIssueStatus={handleUpdateIssueStatus}
              onNewActionForIssue={handleNewActionForIssue}
            />
          )}

          {currentTab === 'timeline' && (
            <TimelineView
              handovers={handovers}
              issues={issues}
              onSelectIssue={issue => setSelectedIssueForHistory(issue)}
              onSelectHandover={h => setSelectedHandover(h)}
            />
          )}

          {currentTab === 'new-handover' && (
            <NewHandoverView
              onHandoverSaved={handleHandoverSaved}
              onCancel={() => setCurrentTab('dashboard')}
              allHandovers={handovers}
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

      {/* Canonical Issue Lifecycle Audit Modal (Phase 2A Entity History) */}
      {selectedIssueForHistory && (
        <IssueHistoryModal
          issue={selectedIssueForHistory}
          actions={actions}
          handovers={handovers}
          onClose={() => setSelectedIssueForHistory(null)}
          onSelectHandover={h => {
            setSelectedIssueForHistory(null);
            setSelectedHandover(h);
          }}
        />
      )}

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
