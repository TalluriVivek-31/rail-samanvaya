// Rail Samnvay Master Application
// Indian Railways · South Central Railway · Vijayawada Division (BZA)
// Secure Desktop-First Control Room Operating Center

import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { TopCommandBar } from './components/samnvay/TopCommandBar';
import { Sidebar, SamnvayPage } from './components/samnvay/Sidebar';
import { OverviewPage } from './components/samnvay/pages/OverviewPage';
import { BlockRequestsPage } from './components/samnvay/pages/BlockRequestsPage';
import { ApprovalQueuePage } from './components/samnvay/pages/ApprovalQueuePage';
import { AiPlanningPage } from './components/samnvay/pages/AiPlanningPage';
import { ConflictMonitorPage } from './components/samnvay/pages/ConflictMonitorPage';
import { ExecutionPage } from './components/samnvay/pages/ExecutionPage';
import { CommunicationPage } from './components/samnvay/pages/CommunicationPage';
import { AuditTrailPage } from './components/samnvay/pages/AuditTrailPage';
import { LiveTrainsPage } from './components/samnvay/pages/LiveTrainsPage';
import { CreateRequestModal } from './components/samnvay/CreateRequestModal';
import { SectionDetailDrawer } from './components/samnvay/SectionDetailDrawer';
import { RailwayChatDrawer } from './components/samnvay/chat/RailwayChatDrawer';
import { useSamnvayStore } from './store/useSamnvayStore';
import { Train } from 'lucide-react';

export const App: React.FC = () => {
  const { state } = useSamnvayStore();
  const [currentPage, setCurrentPage] = useState<SamnvayPage>('overview');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inspectedSectionId, setInspectedSectionId] = useState<string | null>(null);

  // Hash route interception and redirect for unauthenticated users
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '') as SamnvayPage;
      const validPages: SamnvayPage[] = [
        'overview', 'live-trains', 'requests', 
        'approval', 'planning', 'conflict', 'execution', 'communication', 'audit'
      ];
      if (validPages.includes(hash)) {
        if (!state.isAuthenticated) {
          window.location.hash = '';
        } else {
          setCurrentPage(hash);
        }
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [state.isAuthenticated]);

  // If user is unauthenticated, purge hash and block all access
  useEffect(() => {
    if (!state.isAuthenticated && window.location.hash) {
      window.location.hash = '';
    }
  }, [state.isAuthenticated]);

  // 1. Initial Session Verification Screen
  if (state.authLoading) {
    return (
      <div className="min-h-screen bg-[#07110e] text-white flex flex-col items-center justify-center font-mono space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <Train className="w-6 h-6 animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <div className="text-sm font-bold tracking-widest uppercase">RAIL SAMANVAYA</div>
          <div className="text-xs text-neutral-400">Verifying authorized operational session...</div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Gateway: Mandatory Full-Screen Authentication Page
  if (!state.isAuthenticated) {
    return <LoginPage />;
  }

  // 3. Authenticated RBAC Route Protection Guard
  const userPerms = state.currentUser.permissions || ['overview'];
  const isPermitted = (page: SamnvayPage) => userPerms.includes('all') || userPerms.includes(page);
  const activePage: SamnvayPage = isPermitted(currentPage) ? currentPage : 'overview';

  const handleOpenSectionDrawer = (sectionId: string) => {
    setInspectedSectionId(sectionId);
  };

  const handleSelectRequest = (_requestId: string) => {
    if (isPermitted('approval')) {
      setCurrentPage('approval');
    } else {
      setCurrentPage('requests');
    }
  };

  // 4. Authenticated Control Room Command Center
  return (
    <div className="min-h-screen bg-railway-canvas text-railway-textPrimary flex flex-col font-sans selection:bg-railway-forest selection:text-white">
      {/* Government-Grade Header Command Bar */}
      <TopCommandBar />

      {/* Main Workspace Layout (Sidebar + Operations Viewport) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Role-Filtered Operational Sidebar */}
        <Sidebar 
          currentPage={activePage} 
          onSelectPage={setCurrentPage} 
        />

        {/* Main Operations Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-railway-canvas">
          <div className="max-w-7xl mx-auto">
            {activePage === 'overview' && (
              <OverviewPage 
                onOpenSectionDrawer={handleOpenSectionDrawer}
                onNavigate={setCurrentPage}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
              />
            )}

            {activePage === 'live-trains' && (
              <LiveTrainsPage />
            )}

            {activePage === 'requests' && (
              <BlockRequestsPage 
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
                onSelectRequest={handleSelectRequest}
                onNavigate={setCurrentPage}
              />
            )}

            {activePage === 'approval' && (
              <ApprovalQueuePage 
                onNavigate={setCurrentPage}
              />
            )}

            {activePage === 'planning' && (
              <AiPlanningPage 
                onNavigate={setCurrentPage}
              />
            )}

            {activePage === 'conflict' && (
              <ConflictMonitorPage 
                onNavigate={setCurrentPage}
              />
            )}

            {activePage === 'execution' && (
              <ExecutionPage 
                onNavigate={setCurrentPage}
              />
            )}

            {activePage === 'communication' && (
              <CommunicationPage 
                onNavigate={setCurrentPage}
              />
            )}

            {activePage === 'audit' && (
              <AuditTrailPage />
            )}
          </div>
        </main>
      </div>

      {/* Footer Command Status Bar */}
      <footer className="bg-white border-t border-railway-border py-2 px-6 flex flex-wrap items-center justify-between text-[11px] font-mono text-railway-textMuted shadow-xs">
        <div className="flex items-center space-x-3">
          <span className="text-railway-forest font-bold">RAIL SAMANVAYA</span>
          <span>•</span>
          <span>SOUTH CENTRAL RAILWAY · VIJAYAWADA DIVISION</span>
          <span>•</span>
          <span className="text-emerald-700 font-bold">SECURE OPERATIONAL SESSION</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>CONSOLE:</span>
          <span className="text-railway-textPrimary font-bold">{state.currentUser.employeeId} ({state.currentUser.role})</span>
          <span>|</span>
          <span className="text-emerald-700 font-bold">DISPATCH AUTHORIZED</span>
        </div>
      </footer>

      {/* Modal Dialogs and Drawers */}
      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <SectionDetailDrawer
        sectionId={inspectedSectionId}
        isOpen={inspectedSectionId !== null}
        onClose={() => setInspectedSectionId(null)}
      />

      <RailwayChatDrawer />
    </div>
  );
};
