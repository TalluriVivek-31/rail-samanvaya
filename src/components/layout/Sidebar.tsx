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
  TrainTrack,
  ShieldCheck
} from 'lucide-react';
import { useSamnvayStore } from '../../store/useSamnvayStore';
import type { SamnvayPage } from '../../types/samnvay';
import { isPendingApproval, isPlanningEligible, isExecutionEligible } from '../../utils/requestLifecycle';

export type { SamnvayPage };

interface SidebarProps {
  currentPage: SamnvayPage;
  onSelectPage: (page: SamnvayPage) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onSelectPage }) => {
  const { state } = useSamnvayStore();

  // Dynamic Badges from real lifecycle methods
  const pendingRequestsCount = state.requests.filter(r => isPendingApproval(r)).length;
  const planningCount = state.requests.filter(r => isPlanningEligible(r)).length;
  const executionCount = state.requests.filter(r => isExecutionEligible(r)).length;
  const activeConflictsCount = state.requests.filter(r => r.conflict && !r.conflict.isResolved).length + state.liveConflicts.length;
  const unreadMessagesCount = (state.conversations || []).reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  // Master definition of navigation items
  const allNavItems: {
    id: SamnvayPage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeVariant?: 'amber' | 'green' | 'red' | 'neutral';
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Activity,
    },
    {
      id: 'live-trains',
      label: 'Live Trains',
      icon: TrainTrack,
      badge: state.liveData.liveTrains.length > 0 ? state.liveData.liveTrains.length : undefined,
      badgeVariant: 'green',
    },
    {
      id: 'requests',
      label: 'Requirements',
      icon: Inbox,
      badge: state.requests.length,
      badgeVariant: 'neutral',
    },
    {
      id: 'approval',
      label: 'Approvals',
      icon: CheckSquare,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
      badgeVariant: 'amber',
    },
    {
      id: 'planning',
      label: 'Planning Engine',
      icon: Calendar,
      badge: planningCount > 0 ? planningCount : undefined,
      badgeVariant: 'neutral',
    },
    {
      id: 'conflict',
      label: 'Conflict Matrix',
      icon: AlertTriangle,
      badge: activeConflictsCount > 0 ? activeConflictsCount : undefined,
      badgeVariant: 'red',
    },
    {
      id: 'execution',
      label: 'Execution Tracker',
      icon: PlayCircle,
      badge: executionCount > 0 ? executionCount : undefined,
      badgeVariant: 'green',
    },
    {
      id: 'communication',
      label: 'Communications',
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
      badgeVariant: 'green',
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: History,
      badge: state.auditLogs.length > 0 ? state.auditLogs.length : undefined,
      badgeVariant: 'neutral',
    },
  ];

  // RBAC Permission Guard
  const userPerms = state.currentUser.permissions || ['overview'];
  const hasPermission = (id: SamnvayPage) => 
    userPerms.includes('all') || 
    userPerms.includes(id);
  const navItems = allNavItems.filter(item => hasPermission(item.id));

  return (
    <aside className="w-64 shrink-0 bg-white border border-[#E8E6DF] rounded-3xl mx-4 my-2 mb-4 p-4 flex flex-col justify-between shadow-sm">
      {/* Navigation Items */}
      <div className="space-y-1.5">
        <div className="px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-[#546A7B]">
          Operations Rail
        </div>

        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all group ${
                isActive
                  ? 'bg-[#393D3F] text-white shadow-xs'
                  : 'text-[#546A7B] hover:text-[#393D3F] hover:bg-[#F2F2EF]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 transition ${isActive ? 'text-[#62929E]' : 'text-[#546A7B] group-hover:text-[#393D3F]'}`} />
                <span className="tracking-tight">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : item.badgeVariant === 'amber'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : item.badgeVariant === 'red'
                    ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse'
                    : item.badgeVariant === 'green'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-[#F2F2EF] text-[#546A7B] border border-[#E8E6DF]'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Authenticated Role Card */}
      <div className="pt-4 border-t border-[#E8E6DF] space-y-2">
        <div className="flex items-center space-x-1.5 text-[#16A34A] px-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
          <span className="font-extrabold text-[10px] uppercase tracking-wider">G&SR Chapter XV Compliant</span>
        </div>
        <div className="p-3 rounded-2xl bg-[#F2F2EF] border border-[#E8E6DF]">
          <div className="font-extrabold text-[#393D3F] text-xs truncate">{state.currentUser.name}</div>
          <div className="text-[11px] font-semibold text-[#546A7B] truncate mt-0.5">
            {state.currentUser.role === 'MASTER' ? 'MASTER CONTROLLER' : state.currentUser.role}
          </div>
          <div className="text-[10px] font-mono text-[#546A7B]/80 mt-1 flex items-center justify-between">
            <span>{state.currentUser.employeeId}</span>
            <span className="font-bold text-[#16A34A] uppercase text-[9px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">ACTIVE</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
