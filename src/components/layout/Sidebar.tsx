// Refined Operational Sidebar for Rail Samnvay Control Room
import React from 'react';
import { 
  Activity, 
  Inbox, 
  CheckSquare, 
  Calendar, 
  AlertTriangle, 
  PlayCircle, 
  MessageSquare,
  History, 
  Layers,
  TrainTrack,
  ShieldCheck
} from 'lucide-react';
import { useSamnvayStore } from '../../store/useSamnvayStore';
import type { SamnvayPage } from '../../types/samnvay';

export type { SamnvayPage };

interface SidebarProps {
  currentPage: SamnvayPage;
  onSelectPage: (page: SamnvayPage) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onSelectPage }) => {
  const { state } = useSamnvayStore();

  // Dynamic Badges from store (count all requests awaiting operational concurrence)
  const pendingRequestsCount = state.requests.filter(r => 
    r.status === 'Submitted' || 
    r.status === 'P.Way/S&T/TRD Review' || 
    r.status === 'Verified' || 
    r.status === 'Approval Pending' ||
    r.status === 'Pending' || 
    r.status === 'Review' || 
    r.status === 'Revision' ||
    r.status === 'Revision Required'
  ).length;
  const activeConflictsCount = state.requests.filter(r => r.conflict && !r.conflict.isResolved).length + state.liveConflicts.length;
  const unreadMessagesCount = (state.conversations || []).reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  // Master definition of navigation items
  const allNavItems: {
    id: SamnvayPage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeAlert?: boolean;
  }[] = [
    {
      id: 'overview',
      label: 'Home',
      icon: Activity,
    },
    {
      id: 'live-trains',
      label: 'Live Trains',
      icon: TrainTrack,
      badge: state.liveData.liveTrains.length > 0 ? state.liveData.liveTrains.length : undefined,
    },
    {
      id: 'twin',
      label: 'Digital Twin',
      icon: Layers,
    },
    {
      id: 'requests',
      label: 'Requirements',
      icon: Inbox,
      badge: state.requests.length,
    },
    {
      id: 'approval',
      label: 'Approvals',
      icon: CheckSquare,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
      badgeAlert: pendingRequestsCount > 0,
    },
    {
      id: 'planning',
      label: 'Planning',
      icon: Calendar,
    },
    {
      id: 'conflict',
      label: 'Conflicts',
      icon: AlertTriangle,
      badge: activeConflictsCount > 0 ? activeConflictsCount : undefined,
      badgeAlert: activeConflictsCount > 0,
    },
    {
      id: 'execution',
      label: 'Execution',
      icon: PlayCircle,
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
      badgeAlert: unreadMessagesCount > 0,
    },
    {
      id: 'audit',
      label: 'Audit',
      icon: History,
      badge: state.auditLogs.length,
    },
  ];

  // Role-Based Navigation Filtering based on authenticated backend permissions
  const userPerms = state.currentUser.permissions || ['overview'];
  const hasPermission = (id: SamnvayPage) => 
    userPerms.includes('all') || 
    userPerms.includes(id) || 
    (id === 'twin' && (userPerms.includes('live-trains') || userPerms.includes('overview') || userPerms.includes('planning')));
  const navItems = allNavItems.filter(item => hasPermission(item.id));

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-railway-border flex flex-col justify-between py-5 shadow-2xs">
      {/* Navigation Links */}
      <div className="space-y-1 px-3">
        <div className="px-3 py-1 text-[10px] uppercase font-mono tracking-wider text-railway-textMuted font-bold">
          OPERATIONAL MODULES
        </div>

        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-railway-forest text-white shadow-xs'
                  : 'text-railway-textSecondary hover:text-railway-textPrimary hover:bg-neutral-100'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 transition ${isActive ? 'text-emerald-300' : 'text-neutral-500 group-hover:text-railway-forest'}`} />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : item.badgeAlert
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-neutral-100 text-neutral-600'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Authenticated Role Card */}
      <div className="px-4 pt-4 border-t border-railway-border space-y-2 text-[11px] font-mono text-railway-textSecondary">
        <div className="flex items-center space-x-1.5 text-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-bold text-[10px] uppercase">G&SR-INFORMED PLANNING</span>
        </div>
        <div className="p-2.5 rounded-xl bg-railway-canvas border border-railway-border">
          <div className="font-bold text-railway-textPrimary truncate">{state.currentUser.name}</div>
          <div className="text-[10px] text-railway-textMuted truncate">
            {state.currentUser.role === 'MASTER' ? 'DEMO USER | MASTER' : state.currentUser.role}
          </div>
          <div className="text-[9px] text-neutral-400 mt-0.5">{state.currentUser.employeeId}</div>
        </div>
      </div>
    </aside>
  );
};
