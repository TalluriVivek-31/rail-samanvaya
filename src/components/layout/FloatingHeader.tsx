import React, { useState, useEffect } from 'react';
import { useSamnvayStore } from '../../store/useSamnvayStore';
import { onFirebaseSyncStatus } from '../../services/firebaseSync';
import { useLiveClock } from '../../utils/dateTime';
import { 
  Train, 
  Clock, 
  LogOut, 
  AlertCircle, 
  MessageSquare, 
  Database,
  Radio
} from 'lucide-react';

export const FloatingHeader: React.FC = () => {
  const { state, logout, toggleLiveMode, toggleChat } = useSamnvayStore();
  const { headerClock } = useLiveClock();
  const [firebaseStatus, setFirebaseStatus] = useState<'connected' | 'connecting' | 'permission_denied' | 'offline' | 'error'>('connecting');
  const [firebaseDetail, setFirebaseDetail] = useState<string>('');

  useEffect(() => {
    onFirebaseSyncStatus((status, detail) => {
      setFirebaseStatus(status);
      if (detail) setFirebaseDetail(detail);
    });
  }, []);

  const activeConflictsCount = state.requests.filter(r => r.conflict && !r.conflict.isResolved).length + state.liveConflicts.length;
  const unreadMessagesCount = (state.conversations || []).reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <div className="sticky top-0 z-40 w-full px-3 sm:px-6 pt-3 pb-2 bg-[#F2F2EF]/90 backdrop-blur-md">
      <header className="max-w-7xl mx-auto bg-white rounded-full border border-[#E8E6DF] shadow-sm px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Brand Identity & Railway Institutional Tags */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-[#393D3F] text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <Train className="w-4 h-4 text-[#62929E]" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-sm tracking-tight text-[#393D3F] uppercase">
              RAIL SAMANVAYA
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#546A7B]/10 text-[#546A7B] border border-[#546A7B]/20">
              SCR · BZA
            </span>
          </div>
        </div>

        {/* Center: Realtime Telemetry, Live Feeds, and Clock */}
        <div className="flex items-center space-x-2.5">
          {/* Dynamic LIVE / DEMO Toggle Pill */}
          <button
            onClick={toggleLiveMode}
            className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold tracking-wider border shadow-xs transition-all ${
              state.isLiveMode
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
            }`}
            title="Click to toggle between LIVE RailRadar feed and DEMO mode"
          >
            <span className={`w-2 h-2 rounded-full ${
              state.isLiveMode ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
            }`} />
            <span className="text-[11px] uppercase">
              {state.isLiveMode ? 'LIVE RADAR' : 'DEMO MODE'}
            </span>
          </button>

          {/* Cloud Sync Status */}
          <div 
            className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide border shadow-xs ${
              firebaseStatus === 'connected'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : firebaseStatus === 'permission_denied'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-neutral-50 border-neutral-200 text-neutral-600'
            }`}
            title={
              firebaseStatus === 'connected'
                ? 'Firebase Realtime Database: Connected and Synchronized.'
                : firebaseStatus === 'permission_denied'
                ? `Firebase RTDB Rules: ${firebaseDetail || 'Locked'}`
                : 'Connecting to Cloud DB...'
            }
          >
            <Database className="w-3 h-3" />
            <span>
              {firebaseStatus === 'connected' 
                ? 'SYNC ACTIVE' 
                : firebaseStatus === 'permission_denied'
                ? 'RULES LOCKED'
                : 'CONNECTING'}
            </span>
          </div>

          {/* Live Operational Clock */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-[#F2F2EF] px-3 py-1 rounded-full border border-[#E8E6DF] text-xs font-bold text-[#393D3F]">
            <Clock className="w-3.5 h-3.5 text-[#546A7B] animate-pulse" />
            <span>{headerClock}</span>
          </div>

          {/* Conflict Alert Pill */}
          {activeConflictsCount > 0 && (
            <div className="flex items-center space-x-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full text-red-700 text-xs font-bold">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
              <span>{activeConflictsCount} CONFLICT{activeConflictsCount > 1 ? 'S' : ''}</span>
            </div>
          )}
        </div>

        {/* Right: Operational Comms, User Session, and Sign Out */}
        <div className="flex items-center space-x-2.5">
          {/* Contextual Communication Drawer Toggle */}
          <button
            onClick={toggleChat}
            className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition shadow-xs ${
              state.isChatDrawerOpen
                ? 'bg-[#393D3F] text-white border-[#393D3F]'
                : 'border-[#E8E6DF] bg-[#F2F2EF] text-[#393D3F] hover:bg-[#E8E6DF]'
            }`}
            title="Open Control Comms"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Comms</span>
            {unreadMessagesCount > 0 && (
              <span className="bg-[#16A34A] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center space-x-2 pl-1">
            <div className="w-7 h-7 rounded-full bg-[#62929E] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {state.currentUser.avatarInitials}
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-xs font-bold text-[#393D3F] leading-none">
                {state.currentUser.name}
              </div>
              <div className="text-[10px] font-semibold text-[#546A7B] leading-none mt-0.5">
                {state.currentUser.role === 'MASTER' ? 'MASTER CONTROLLER' : state.currentUser.role}
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={() => {
              if (confirm('Sign out of Rail Samnvay operational session?')) {
                logout();
              }
            }}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-full border border-[#E8E6DF] hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-xs font-bold text-[#546A7B] transition shadow-xs"
            title="Sign out of operational session"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Operational Banner Notification if active */}
      {state.notification && (
        <div className={`mt-2 max-w-7xl mx-auto px-4 py-2 text-xs font-bold rounded-2xl flex items-center justify-between border transition-all ${
          state.notification.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' :
          state.notification.type === 'error' ? 'bg-red-50 text-red-900 border-red-200' :
          state.notification.type === 'warning' ? 'bg-amber-50 text-amber-900 border-amber-200' :
          'bg-blue-50 text-blue-900 border-blue-200'
        }`}>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-current" />
            <span>{state.notification.message}</span>
          </div>
          <span className="text-[10px] uppercase opacity-70 tracking-wider">SYSTEM NOTICE</span>
        </div>
      )}
    </div>
  );
};
