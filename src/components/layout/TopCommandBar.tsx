// Government-Grade Operational Header for Rail Samnvay Control Room
// South Central Railway · Vijayawada Division · BZA Control

import React, { useState, useEffect } from 'react';
import { useSamnvayStore } from '../../store/useSamnvayStore';
import { onFirebaseSyncStatus } from '../../services/firebaseSync';
import { useLiveClock } from '../../utils/dateTime';
import { 
  Train, 
  Clock, 
  ShieldCheck, 
  LogOut, 
  AlertCircle, 
  MessageSquare, 
  Compass,
  Database
} from 'lucide-react';

export const TopCommandBar: React.FC = () => {
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

  // Active conflicts count
  const activeConflictsCount = state.requests.filter(r => r.conflict && !r.conflict.isResolved).length + state.liveConflicts.length;
  // Unread messages count
  const unreadMessagesCount = (state.conversations || []).reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <header className="bg-white border-b border-railway-border text-railway-textPrimary sticky top-0 z-40 shadow-2xs">
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Brand Identity & Institutional Subtitle */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-railway-forest text-white flex items-center justify-center shadow-xs">
            <Train className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-tight text-railway-textPrimary font-sans">
                RAIL SAMANVAYA
              </span>
              <span className="text-[10px] font-mono uppercase bg-neutral-100 px-2 py-0.5 rounded text-neutral-700 font-bold border border-neutral-200">
                INDIAN RAILWAYS
              </span>
            </div>
            <p className="text-[10px] text-neutral-500 font-mono hidden md:block leading-none mt-0.5">
              National Maintenance Block Planning & Decision Support
            </p>
          </div>
        </div>

        {/* Center: Live Date/Time & Telemetry Pill */}
        <div className="flex items-center space-x-3">
          {/* Dynamic LIVE / DEMO Toggle Pill */}
          <button
            onClick={toggleLiveMode}
            className={`hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider border shadow-2xs transition-all ${
              state.isLiveMode
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
            }`}
            title="Click to toggle between LIVE RailRadar feed and DEMO mode"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              state.isLiveMode ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
            }`} />
            <span>{state.isLiveMode ? 'LIVE RAILRADAR' : 'DEMO MODE'}</span>
          </button>

          {/* Firebase RTDB Cloud Sync Telemetry Pill */}
          <div 
            className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold tracking-wider border shadow-2xs ${
              firebaseStatus === 'connected'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : firebaseStatus === 'permission_denied'
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-neutral-100 border-neutral-300 text-neutral-600'
            }`}
            title={
              firebaseStatus === 'connected'
                ? 'Firebase Realtime Database: Connected and Synchronized across devices.'
                : firebaseStatus === 'permission_denied'
                ? `Firebase RTDB Rules: ${firebaseDetail || 'Permission denied. Set .read and .write rules to true in Firebase Console.'}`
                : 'Connecting to Firebase Realtime Database...'
            }
          >
            <Database className={`w-3 h-3 ${firebaseStatus === 'connected' ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span>
              {firebaseStatus === 'connected' 
                ? 'CLOUD SYNC: ACTIVE' 
                : firebaseStatus === 'permission_denied'
                ? 'RTDB: RULES LOCKED'
                : 'RTDB CONNECTING'}
            </span>
          </div>

          {/* Clock */}
          <div className="hidden lg:flex items-center space-x-2 bg-railway-canvas px-3 py-1 rounded-full border border-railway-border text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-railway-forest animate-pulse" />
            <span className="text-railway-textPrimary font-bold">{headerClock}</span>
          </div>

          {/* Active Conflict Notification Badge */}
          {activeConflictsCount > 0 && (
            <div className="flex items-center space-x-1.5 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full text-red-800 text-xs font-mono font-bold">
              <AlertCircle className="w-3 h-3 text-red-600 animate-pulse" />
              <span>{activeConflictsCount} Conflict{activeConflictsCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Right: Authenticated User & Logout */}
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <div className="font-bold text-railway-textPrimary leading-tight text-xs font-sans">
              {state.currentUser.name}
            </div>
            <div className="text-[10px] text-railway-textMuted font-mono leading-tight truncate max-w-[220px]" title={state.currentUser.designation || state.currentUser.role}>
              {state.currentUser.role === 'MASTER' ? 'DEMO USER | MASTER (System Admin)' : (state.currentUser.designation || state.currentUser.role)}
            </div>
          </div>

          {/* Contextual Railway Operational Communication Button */}
          <button
            onClick={toggleChat}
            className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition shadow-2xs font-mono ${
              state.isChatDrawerOpen
                ? 'bg-railway-forest text-white border-railway-forest'
                : 'border-railway-border text-railway-textSecondary hover:bg-neutral-100 hover:text-railway-textPrimary'
            }`}
            title="Open Contextual Operational Communication (Block / Planning Office / Control Office)"
          >
            <Compass className="w-3.5 h-3.5 text-railway-forest" />
            <span className="hidden md:inline">Communication</span>
            {unreadMessagesCount > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          <div className="w-7 h-7 rounded-full bg-railway-forest text-white flex items-center justify-center font-bold text-[10px] font-mono shadow-xs">
            {state.currentUser.avatarInitials}
          </div>

          {/* Sign Out Button */}
          <button
            onClick={() => {
              if (confirm('Sign out of Rail Samnvay operational session?')) {
                logout();
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-railway-border hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-xs font-semibold text-railway-textSecondary transition shadow-2xs font-mono"
            title="Sign out of operational session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Global Notification Banner if present */}
      {state.notification && (
        <div className={`px-5 py-1.5 text-xs font-mono flex items-center justify-between border-t transition-all ${
          state.notification.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' :
          state.notification.type === 'error' ? 'bg-red-50 text-red-900 border-red-200' :
          state.notification.type === 'warning' ? 'bg-amber-50 text-amber-900 border-amber-200' :
          'bg-blue-50 text-blue-900 border-blue-200'
        }`}>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-current" />
            <span className="font-semibold">{state.notification.message}</span>
          </div>
          <span className="text-[10px] opacity-70">OPERATIONAL MEMO</span>
        </div>
      )}
    </header>
  );
};
