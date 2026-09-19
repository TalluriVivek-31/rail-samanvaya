// Rail Samnvay — Mobile Bottom Navigation Bar
// Visible only on small screens (< md). Replaces sidebar for mobile users.
// Shows 5 priority nav items with live badge counts.

import React from 'react';
import {
  Activity,
  TrainTrack,
  Inbox,
  CheckSquare,
  AlertTriangle,
  PlayCircle,
  MoreHorizontal,
} from 'lucide-react';
import { useSamnvayStore } from '../../store/useSamnvayStore';
import type { SamnvayPage } from '../../types/samnvay';
import { isPendingApproval, isExecutionEligible } from '../../utils/requestLifecycle';

interface MobileBottomNavProps {
  currentPage: SamnvayPage;
  onSelectPage: (page: SamnvayPage) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentPage, onSelectPage }) => {
  const { state } = useSamnvayStore();

  const pendingCount = state.requests.filter(r => isPendingApproval(r)).length;
  const executionCount = state.requests.filter(r => isExecutionEligible(r)).length;
  const conflictsCount = state.requests.filter(r => r.conflict && !r.conflict.isResolved).length + state.liveConflicts.length;
  const liveTrainsCount = state.liveData.liveTrains.length;

  const userPerms = state.currentUser.permissions || ['overview'];
  const hasPerm = (p: SamnvayPage) => userPerms.includes('all') || userPerms.includes(p);

  // Primary 5 tabs — always shown, permission-gated
  const tabs: {
    id: SamnvayPage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }[] = [
    { id: 'overview' as SamnvayPage,    label: 'Home',       icon: Activity },
    { id: 'live-trains' as SamnvayPage, label: 'Live',        icon: TrainTrack, badge: liveTrainsCount > 0 ? liveTrainsCount : undefined, badgeColor: 'bg-emerald-500' },
    { id: 'requests' as SamnvayPage,    label: 'Requests',    icon: Inbox,      badge: state.requests.length > 0 ? state.requests.length : undefined, badgeColor: 'bg-slate-400' },
    { id: 'approval' as SamnvayPage,    label: 'Approval',    icon: CheckSquare, badge: pendingCount > 0 ? pendingCount : undefined, badgeColor: 'bg-amber-500' },
    { id: 'conflict' as SamnvayPage,    label: 'Conflicts',   icon: AlertTriangle, badge: conflictsCount > 0 ? conflictsCount : undefined, badgeColor: 'bg-red-500' },
  ].filter(tab => hasPerm(tab.id));

  // Keep it to max 5 tabs regardless
  const visibleTabs = tabs.slice(0, 5);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E8E6DF] shadow-lg safe-area-pb">
      <div className={`grid h-16 ${visibleTabs.length <= 4 ? `grid-cols-${visibleTabs.length}` : 'grid-cols-5'}`}>
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentPage === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectPage(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
                isActive
                  ? 'text-[#393D3F]'
                  : 'text-[#8FA3AC] active:text-[#393D3F]'
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#393D3F]" />
              )}

              {/* Icon with badge */}
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#393D3F]' : 'text-[#8FA3AC]'}`} />
                {tab.badge !== undefined && (
                  <span className={`absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center ${tab.badgeColor || 'bg-slate-400'}`}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={`text-[9px] font-bold tracking-wide uppercase leading-none ${isActive ? 'text-[#393D3F]' : 'text-[#8FA3AC]'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
