// Rail Samnvay Master Application
// Indian Railways · South Central Railway · Vijayawada Division (BZA)
// Secure Desktop-First Control Room Operating Center

import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { FloatingHeader, Sidebar, SamnvayPage } from './components/layout';
import {
  OverviewPage,
  BlockRequestsPage,
  ApprovalQueuePage,
  AiPlanningPage,
  ConflictMonitorPage,
  ExecutionPage,
  CommunicationPage,
  AuditTrailPage,
  LiveTrainsPage
} from './pages';
import { CreateRequestModal, SectionDetailDrawer } from './components/modals';
import { RailwayChatDrawer } from './components/chat';
import { useSamnvayStore } from './store/useSamnvayStore';
import { initFirebaseSync } from './services/firebaseSync';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Train } from 'lucide-react';

export const App: React.FC = () => {
  const { state } = useSamnvayStore();
  const [currentPage, setCurrentPage] = useState<SamnvayPage>('overview');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inspectedSectionId, setInspectedSectionId] = useState<string | null>(null);

  // Initialize Firebase Realtime Cloud Synchronization
  useEffect(() => {
    initFirebaseSync();
  }, []);

  // Hash route interception and redirect for unauthenticated users
  useEffect(() => {
    const handleHash = () => {
      let hash = window.location.hash.replace('#', '') as SamnvayPage;
      // Redirect legacy twin route directly to live-trains
      if (hash === 'twin') {
        hash = 'live-trains';
        window.location.hash = '#live-trains';
      }
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
  const isPermitted = (page: SamnvayPage) => 
    userPerms.includes('all') || 
    userPerms.includes(page);
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
    <div className="min-h-screen bg-[#F2F2EF] text-[#393D3F] flex flex-col font-sans selection:bg-[#393D3F] selection:text-white">
      {/* Editorial Floating Header */}
      <FloatingHeader />

      {/* Main Workspace Layout (Sidebar + Operations Viewport) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Role-Filtered Modern Navigation Rail */}
        <Sidebar 
          currentPage={activePage} 
          onSelectPage={setCurrentPage} 
        />

        {/* Main Operations Viewport */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 pt-1 bg-[#F2F2EF]">
          <div className="max-w-7xl mx-auto">
            <ErrorBoundary
              fallbackTitle="Operational Viewport Notice"
              fallbackMessage="An unexpected issue occurred while rendering this operations module. Use the retry button below or select another section from the command sidebar."
            >
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
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Modern Status Footer */}
      <footer className="bg-white border-t border-[#E8E6DF] py-2 px-6 flex flex-wrap items-center justify-between text-[11px] font-mono text-[#546A7B] shadow-xs">
        <div className="flex items-center space-x-3">
          <span className="text-[#393D3F] font-extrabold">RAIL SAMANVAYA</span>
          <span>•</span>
          <span>INDIAN RAILWAYS · BZA CONTROL CENTER</span>
          <span>•</span>
          <span className="text-[#16A34A] font-extrabold">AUTHENTICATED DISPATCH</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>CONSOLE:</span>
          <span className="text-[#393D3F] font-bold">{state.currentUser.employeeId} ({state.currentUser.role})</span>
          <span>|</span>
          <span className="text-[#16A34A] font-bold">G&SR CHAPTER XV</span>
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
