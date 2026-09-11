// Operational Home Page — Railway Control Room Command Center
// South Central Railway · Vijayawada Division · BZA Control

import React from 'react';
import { useSamnvayStore } from '../../../store/useSamnvayStore';
import type { SamnvayPage } from '../../../types/samnvay';
import { 
  Inbox, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Activity, 
  ArrowRight,
  TrainTrack, 
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle
} from 'lucide-react';
import { NearbyWorkWidget } from '../chat/NearbyWorkWidget';

interface OverviewPageProps {
  onOpenSectionDrawer?: (sectionId: string) => void;
  onNavigate: (page: SamnvayPage) => void;
  onOpenCreateModal?: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  onNavigate,
  onOpenCreateModal,
}) => {
  const { state } = useSamnvayStore();

  // 1. Dynamic Metric Calculations (Zero hardcoding)
  const pendingRequests = state.requests.filter(r => 
    r.status === 'Submitted' || 
    r.status === 'P.Way/S&T/TRD Review' || 
    r.status === 'Verified' || 
    r.status === 'Approval Pending' ||
    r.status === 'Pending' || 
    r.status === 'Review' || 
    r.status === 'Revision' ||
    r.status === 'Revision Required'
  );
  const approvedRequests = state.requests.filter(r => 
    r.status === 'Approved' || 
    r.status === 'Planning Queue' || 
    r.status === 'Block Window Allocated' ||
    r.status === 'Scheduled' ||
    r.status === 'Planning'
  );
  const activeBlocks = state.executionSteps.filter(s => s.status === 'IN_PROGRESS');
  const unresolvedRequestConflicts = state.requests.filter(r => r.conflict && !r.conflict.isResolved);
  const totalConflicts = unresolvedRequestConflicts.length + state.liveConflicts.length;
  const scheduledWork = state.requests.filter(r => 
    r.status === 'Scheduled'
  );
  const recommendedWindows = state.requests.filter(r => 
    r.status === 'Block Window Allocated'
  );

  // Dynamic user permission check
  const userPerms = state.currentUser.permissions || ['overview'];
  const hasPerm = (p: string) => userPerms.includes('all') || userPerms.includes(p);

  // Relevant corridor rakes (top 3)
  const liveTrainsSample = state.liveData.liveTrains.slice(0, 3);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* 1. Header: Operational Home */}
      <div className="bg-white rounded-2xl p-6 border border-railway-border shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h1 className="text-2xl font-bold tracking-tight text-railway-textPrimary font-sans">
              Operational Home
            </h1>
          </div>
          <p className="text-xs font-mono text-railway-textSecondary">
            South Central Railway · Vijayawada Division · BZA Control
          </p>
        </div>

        {/* System & Telemetry Status Indicators */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1 rounded-full border bg-neutral-50 text-neutral-700 border-neutral-200">
            SYSTEM: <strong className="text-neutral-900">{state.isLiveMode ? 'LIVE' : 'DEMO'}</strong>
          </div>

          {state.liveData.source === 'LIVE' ? (
            <div className="px-3 py-1 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>TRAIN TELEMETRY: <strong>LIVE</strong></span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full border bg-amber-50 text-amber-800 border-amber-200 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>TRAIN TELEMETRY: <strong>{state.isLiveMode ? 'UNAVAILABLE' : 'DEMO'}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Top 5 Compact Operational Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Pending Actions */}
        <div 
          onClick={() => onNavigate('requests')}
          className="bg-white border border-railway-border p-4 rounded-xl cursor-pointer hover:border-railway-forest transition shadow-2xs"
        >
          <div className="text-[11px] font-mono text-railway-textMuted uppercase font-semibold">
            Pending Actions
          </div>
          <div className="text-2xl font-bold font-mono text-railway-textPrimary mt-1">
            {pendingRequests.length}
          </div>
          <div className="text-[10px] text-railway-textSecondary mt-0.5">
            {pendingRequests.length === 1 ? '1 requisition awaiting review' : `${pendingRequests.length} requisitions awaiting review`}
          </div>
        </div>

        {/* Metric 2: Active Blocks */}
        <div 
          onClick={() => onNavigate('execution')}
          className="bg-white border border-railway-border p-4 rounded-xl cursor-pointer hover:border-railway-forest transition shadow-2xs"
        >
          <div className="text-[11px] font-mono text-railway-textMuted uppercase font-semibold">
            Active Blocks
          </div>
          <div className="text-2xl font-bold font-mono text-railway-textPrimary mt-1">
            {activeBlocks.length}
          </div>
          <div className="text-[10px] text-railway-textSecondary mt-0.5">
            {activeBlocks.length > 0 ? 'Work in progress on track' : 'No blocks currently active'}
          </div>
        </div>

        {/* Metric 3: Upcoming Windows */}
        <div 
          onClick={() => onNavigate('planning')}
          className="bg-white border border-railway-border p-4 rounded-xl cursor-pointer hover:border-railway-forest transition shadow-2xs"
        >
          <div className="text-[11px] font-mono text-railway-textMuted uppercase font-semibold">
            Upcoming Windows
          </div>
          <div className="text-2xl font-bold font-mono text-railway-textPrimary mt-1">
            {approvedRequests.length}
          </div>
          <div className="text-[10px] text-railway-textSecondary mt-0.5">
            Nearest usable maintenance slots
          </div>
        </div>

        {/* Metric 4: Live Conflicts */}
        <div 
          onClick={() => onNavigate('conflict')}
          className={`bg-white border p-4 rounded-xl cursor-pointer transition shadow-2xs ${
            totalConflicts > 0 ? 'border-red-300 bg-red-50/20' : 'border-railway-border hover:border-railway-forest'
          }`}
        >
          <div className="text-[11px] font-mono text-railway-textMuted uppercase font-semibold flex items-center justify-between">
            <span>Live Conflicts</span>
            {totalConflicts > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${totalConflicts > 0 ? 'text-red-700' : 'text-railway-textPrimary'}`}>
            {totalConflicts}
          </div>
          <div className="text-[10px] text-railway-textSecondary mt-0.5">
            {totalConflicts > 0 ? 'Requires controller intervention' : 'Zero headway overlaps'}
          </div>
        </div>

        {/* Metric 5: Authorized Scheduled Possessions */}
        <div 
          onClick={() => onNavigate('planning')}
          className="bg-white border border-railway-border p-4 rounded-xl cursor-pointer hover:border-railway-forest transition shadow-2xs col-span-2 sm:col-span-1"
        >
          <div className="text-[11px] font-mono text-railway-textMuted uppercase font-semibold">
            Authorized Blocks
          </div>
          <div className="text-2xl font-bold font-mono text-railway-textPrimary mt-1">
            {scheduledWork.length}
          </div>
          <div className="text-[10px] text-railway-textSecondary mt-0.5">
            {scheduledWork.length === 1 ? '1 scheduled possession' : `${scheduledWork.length} scheduled possessions`}
          </div>
        </div>
      </div>

      {/* 3. Primary Operational Area (Two-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* LEFT COLUMN: ATTENTION REQUIRED */}
        <div className="bg-white rounded-2xl border border-railway-border p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-railway-border pb-3">
            <h2 className="text-base font-bold text-railway-textPrimary font-sans">
              Attention Required
            </h2>
            <span className="text-xs font-mono text-railway-textMuted">
              {pendingRequests.length + totalConflicts} Item{(pendingRequests.length + totalConflicts) === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-3">
            {pendingRequests.length === 0 && totalConflicts === 0 && approvedRequests.length === 0 ? (
              <div className="py-8 text-center text-railway-textSecondary text-xs font-mono space-y-1">
                <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                <div className="font-bold">No maintenance requirements pending review</div>
                <div className="text-[11px] text-neutral-400">Create a maintenance requirement to begin planning.</div>
              </div>
            ) : (
              <>
                {/* Pending Requisitions */}
                {pendingRequests.slice(0, 2).map(req => (
                  <div 
                    key={req.id} 
                    className="p-3.5 rounded-xl bg-railway-canvas border border-railway-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                          MAINTENANCE REQUIREMENT
                        </span>
                        <span className="font-bold text-railway-textPrimary">{req.id}</span>
                        <span className="text-railway-textMuted font-mono">({req.department})</span>
                      </div>
                      <div className="text-railway-textSecondary mt-1">
                        {req.work} · Section {req.section} ({req.duration} min)
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('approval')}
                      className="px-3 py-1.5 rounded-lg bg-white border border-railway-border text-railway-forest font-semibold text-xs hover:bg-neutral-50 shadow-2xs whitespace-nowrap"
                    >
                      Review
                    </button>
                  </div>
                ))}

                {/* Live Conflicts */}
                {unresolvedRequestConflicts.slice(0, 2).map(req => (
                  <div 
                    key={`conf-${req.id}`} 
                    className="p-3.5 rounded-xl bg-red-50/50 border border-red-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded text-[10px]">
                          LIVE CONFLICT
                        </span>
                        <span className="font-bold text-red-900">{req.conflict?.conflictingTrain}</span>
                      </div>
                      <div className="text-red-800 text-[11px] mt-1">
                        Conflicts with planned window {req.allocatedWindow?.startTime}–{req.allocatedWindow?.endTime} on Section {req.section}
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('conflict')}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold text-xs hover:bg-red-700 shadow-2xs whitespace-nowrap"
                    >
                      Resolve
                    </button>
                  </div>
                ))}

                {/* Ready for Planning */}
                {approvedRequests.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-[10px]">
                          PLANNING
                        </span>
                        <span className="font-bold text-blue-950">Timetable Optimization</span>
                      </div>
                      <div className="text-blue-800 text-[11px] mt-1">
                        {approvedRequests.length} approved requisitions ready for schedule allocation
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('planning')}
                      className="px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-800 font-semibold text-xs hover:bg-blue-50 shadow-2xs whitespace-nowrap"
                    >
                      Open Planning
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CORRIDOR OPERATIONS STATUS */}
        <div className="bg-white rounded-2xl border border-railway-border p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-railway-border pb-3">
            <h2 className="text-base font-bold text-railway-textPrimary font-sans">
              Corridor Operations Status
            </h2>
            <button 
              onClick={() => onNavigate('live-trains')}
              className="text-xs font-semibold text-railway-forest hover:underline flex items-center gap-1"
            >
              <span>View Live Trains</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {/* Compact Corridor Station Summary */}
          <div 
            onClick={() => onNavigate('live-trains')}
            className="p-4 rounded-xl bg-railway-canvas border border-railway-border cursor-pointer hover:border-railway-forest transition space-y-3"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-railway-textPrimary">Vijayawada Division Trunk Corridors</span>
              <span className="text-[10px] text-emerald-700 font-semibold">AUTOMATIC BLOCK</span>
            </div>

            {/* Line schematic */}
            <div className="py-2 flex items-center justify-between text-[10px] font-mono text-railway-textSecondary relative">
              <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-neutral-300 -z-0" />
              {['BZA', 'KCC', 'MAG', 'NBR', 'GNT', 'TEL'].map((stn, idx) => (
                <div key={stn} className="flex flex-col items-center relative z-10">
                  <span className={`w-2 h-2 rounded-full ${idx === 2 ? 'bg-amber-500' : 'bg-railway-forest'}`} />
                  <span className="text-[9px] font-bold text-railway-textPrimary mt-1">{stn}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-railway-border/60 text-xs font-mono text-railway-textSecondary">
              <span><strong>{activeBlocks.length}</strong> Active Work</span>
              <span>•</span>
              <span><strong>{approvedRequests.length}</strong> Windows Ready</span>
              <span>•</span>
              <span className={totalConflicts > 0 ? 'text-red-600 font-bold' : ''}>
                <strong>{totalConflicts}</strong> Conflict{totalConflicts === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <div className="text-[11px] font-mono text-railway-textMuted flex items-center justify-between">
            <span>Sections: SEC-A, SEC-B, SEC-C</span>
            <span>Speed Class: Group A (130 km/h)</span>
          </div>
        </div>

      </div>

      {/* 4. Upcoming Maintenance & Live Train Movement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* UPCOMING MAINTENANCE (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-railway-border p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-railway-border pb-3">
            <div>
              <h2 className="text-base font-bold text-railway-textPrimary font-sans">
                Upcoming Maintenance
              </h2>
              <p className="text-xs text-railway-textSecondary">Scheduled corridor possessions and work orders</p>
            </div>
            <button 
              onClick={() => onNavigate('requests')}
              className="text-xs font-semibold text-railway-forest hover:underline flex items-center gap-1"
            >
              <span>All Requests</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-railway-border text-railway-textMuted text-[10px] uppercase tracking-wider">
                  <th className="pb-2">Work Requisition</th>
                  <th className="pb-2">Dept</th>
                  <th className="pb-2">Section</th>
                  <th className="pb-2">Time Window</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-railway-border/50">
                {scheduledWork.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-railway-textMuted text-xs font-mono">
                      <div className="font-bold text-neutral-600">No scheduled blocks</div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">Approved maintenance work will appear here after authorized scheduling.</div>
                    </td>
                  </tr>
                ) : (
                  scheduledWork.slice(0, 4).map(r => (
                    <tr 
                      key={r.id}
                      onClick={() => onNavigate('requests')}
                      className="hover:bg-railway-canvas/60 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 font-bold text-railway-textPrimary">
                        {r.work}
                      </td>
                      <td className="py-2.5 text-railway-textSecondary">
                        {r.department}
                      </td>
                      <td className="py-2.5 font-mono text-railway-textSecondary">
                        {r.section}
                      </td>
                      <td className="py-2.5 font-mono text-railway-textPrimary">
                        {r.allocatedWindow?.startTime}–{r.allocatedWindow?.endTime}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* LIVE TRAIN MOVEMENT (1 Col) */}
        <div className="bg-white rounded-2xl border border-railway-border p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-railway-border pb-3">
            <div>
              <h2 className="text-base font-bold text-railway-textPrimary font-sans">
                Live Train Movement
              </h2>
              <p className="text-xs text-railway-textSecondary">RailRadar™ sectional feed</p>
            </div>
            <button 
              onClick={() => onNavigate('live-trains')}
              className="text-xs font-semibold text-railway-forest hover:underline flex items-center gap-1"
            >
              <span>View Live Trains →</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {liveTrainsSample.length === 0 ? (
              <div className="py-6 text-center text-railway-textMuted text-xs font-mono">
                No live data available
              </div>
            ) : (
              liveTrainsSample.map(t => (
                <div 
                  key={t.trainNumber}
                  onClick={() => onNavigate('live-trains')}
                  className="p-3 rounded-xl bg-railway-canvas border border-railway-border/80 cursor-pointer hover:border-railway-forest transition text-xs font-mono space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-railway-textPrimary">{t.trainNumber} {t.trainName}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      t.delayMinutes === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {t.delayMinutes === 0 ? 'RT' : `+${t.delayMinutes}m`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-railway-textSecondary">
                    <span>Pos: KM {typeof t.currentKm === 'number' ? t.currentKm.toFixed(1) : t.currentKm}</span>
                    <span>Speed: {t.speedKmph} km/h</span>
                    <span className="text-[10px] text-emerald-700 font-bold">{state.liveData.source}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 5. Planning Status & Quick Action Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* PLANNING STATUS */}
        <div className="bg-white rounded-2xl border border-railway-border p-5 shadow-soft flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-railway-textMuted">
              Planning Status
            </h3>
            <p className="text-xs text-railway-textSecondary">Divisional constraint solver outputs</p>
          </div>
          <div className="flex items-center space-x-6 text-xs font-mono">
            <div className="text-center">
              <div className="text-base font-bold text-railway-textPrimary">{approvedRequests.length}</div>
              <div className="text-[10px] text-railway-textMuted">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold text-railway-textPrimary">{state.sections.length}</div>
              <div className="text-[10px] text-railway-textMuted">Feasible Windows</div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold text-railway-textPrimary">{state.spatialOverlaps.length}</div>
              <div className="text-[10px] text-railway-textMuted">Coordinated</div>
            </div>
            <div className="text-center">
              <div className={`text-base font-bold ${totalConflicts > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                {totalConflicts}
              </div>
              <div className="text-[10px] text-railway-textMuted">Conflicts</div>
            </div>
          </div>
        </div>

        {/* NEARBY WORK IDENTIFICATION & JOINT CO-LOCATION COORDINATION */}
        <NearbyWorkWidget />

        {/* QUICK ACTIONS */}
        <div className="bg-white rounded-2xl border border-railway-border p-5 shadow-soft flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-railway-textMuted">
              Quick Actions
            </h3>
            <p className="text-xs text-railway-textSecondary">Permitted for {state.currentUser.role}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasPerm('requests') && onOpenCreateModal && (
              <button
                onClick={onOpenCreateModal}
                className="px-3 py-1.5 rounded-lg bg-railway-forest text-white text-xs font-semibold hover:bg-railway-forestHover transition shadow-2xs"
              >
                Create Request
              </button>
            )}

            {hasPerm('planning') && (
              <button
                onClick={() => onNavigate('planning')}
                className="px-3 py-1.5 rounded-lg bg-white border border-railway-border text-railway-textPrimary text-xs font-semibold hover:bg-neutral-50 transition shadow-2xs"
              >
                Open Planning
              </button>
            )}

            {hasPerm('communication') && (
              <button
                onClick={() => onNavigate('communication')}
                className="px-3 py-1.5 rounded-lg bg-white border border-railway-border text-railway-textPrimary text-xs font-semibold hover:bg-neutral-50 transition shadow-2xs"
              >
                Communication
              </button>
            )}

            {hasPerm('live-trains') && (
              <button
                onClick={() => onNavigate('live-trains')}
                className="px-3 py-1.5 rounded-lg bg-white border border-railway-border text-railway-textPrimary text-xs font-semibold hover:bg-neutral-50 transition shadow-2xs"
              >
                Live Trains
              </button>
            )}

            {hasPerm('conflict') && (
              <button
                onClick={() => onNavigate('conflict')}
                className="px-3 py-1.5 rounded-lg bg-white border border-railway-border text-railway-textPrimary text-xs font-semibold hover:bg-neutral-50 transition shadow-2xs"
              >
                Conflicts
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
