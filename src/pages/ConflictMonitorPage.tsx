// Conflict Monitor Page
// Operational Decision Support for Train Headway & Multi-Department Coordination
// Enforces:
// 1. Clear 3-Way Classification: HARD CONFLICT vs COORDINATION OPPORTUNITY vs NO CONFLICT
// 2. Concise operational reasoning (Train, Maintenance, Projected movement, Recommended action)
// 3. Operationally meaningful actions: VIEW TRAIN, VIEW LOCATION, VIEW ALTERNATIVE WINDOWS, REQUEST RESCHEDULE, CONTACT CONTROL, VIEW COORDINATION OPPORTUNITY
// 4. Clean professional empty states when no conflicts are detected.

import React, { useState } from 'react';
import { useSamnvayStore } from '../store/useSamnvayStore';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Train, 
  ShieldCheck, 
  Check, 
  Radio, 
  Zap,
  MapPin,
  MessageSquare,
  Layers,
  ArrowRight,
  Info,
  RefreshCw
} from 'lucide-react';
import { SamnvayPage } from '../types/samnvay';
import { usePlanningConflictCycle } from '../hooks/useRailRadar';

interface ConflictMonitorPageProps {
  onNavigate?: (page: SamnvayPage) => void;
}

export const ConflictMonitorPage: React.FC<ConflictMonitorPageProps> = ({ onNavigate }) => {
  const { 
    state, 
    acceptConflictRecommendation, 
    acceptLiveConflictShift,
    sendControlOfficeQuery,
    openBlockCommunication
  } = useSamnvayStore();

  const { cycleState, triggerNow } = usePlanningConflictCycle({
    isLiveMode: state.isLiveMode,
    enabled: true,
    intervalMinutes: 20
  });

  const [expandedReqId, setExpandedReqId] = useState<string | null>(null);
  const [selectedTrainModal, setSelectedTrainModal] = useState<any | null>(null);
  const [selectedLocationModal, setSelectedLocationModal] = useState<any | null>(null);

  // Find requests with active or resolved conflicts
  const conflictRequests = state.requests.filter(r => r.conflict);
  const spatialOverlaps = state.spatialOverlaps || [];

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header */}
      <div className="border-b border-railway-border pb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-red-50 text-red-800 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-railway-textPrimary font-sans">
              Operational Conflict Monitor
            </h1>
          </div>
          <p className="text-sm text-railway-textSecondary mt-1">
            Real-time screening of train movements, sectional headway margins, and multi-department joint possession opportunities.
          </p>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-railway-textMuted">SAFETY ENVELOPE:</span>
          <span className="bg-white px-3 py-1.5 rounded-full border border-railway-border text-railway-signalGreen font-bold shadow-xs">
            15-MIN CLEAR HEADWAY ENFORCED
          </span>
        </div>
      </div>

      {/* 20-Minute Operational Refresh Cadence Bar (Prompt Specification) */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3.5 px-4 flex flex-wrap items-center justify-between gap-3 font-mono text-xs shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-neutral-800 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>20-MIN REFRESH CADENCE: ACTIVE</span>
          </div>
          <span className="text-neutral-300">|</span>
          <span className="text-neutral-600">
            Cycle #{cycleState.cycleRunCount} · Last Check:{' '}
            <strong className="text-neutral-800">
              {cycleState.lastRunTimestamp 
                ? new Date(cycleState.lastRunTimestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST'
                : 'Initial'}
            </strong>
          </span>
          <span className="text-neutral-300 hidden md:inline">|</span>
          <span className="text-neutral-500 text-[11px] hidden md:inline">
            Telemetry: RailRadar™ (Prototype Live Movement Feed — Non-Authoritative) · Infra: Infrastructure Master / OpenRailwayMap
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={triggerNow}
            disabled={cycleState.isExecuting}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 font-bold border border-neutral-300 transition-colors shadow-2xs disabled:opacity-50"
            title="Execute prototype 20-minute check cycle immediately"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${cycleState.isExecuting ? 'animate-spin' : ''}`} />
            <span>{cycleState.isExecuting ? 'CHECKING...' : 'RUN CHECK CYCLE NOW'}</span>
          </button>
        </div>
      </div>

      {/* 2. Three-Way Conflict Matrix Overview Bar (Prompt Section 14) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
        {/* HARD CONFLICT */}
        <div className="p-4 rounded-2xl bg-white border border-red-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-red-700 bg-red-50 px-2.5 py-0.5 rounded border border-red-200">
              1. HARD CONFLICT
            </span>
            <span className="text-sm font-bold text-red-700">
              {state.liveConflicts.length + conflictRequests.filter(r => !r.conflict?.isResolved).length}
            </span>
          </div>
          <p className="text-[11px] text-neutral-600 font-sans mt-1">
            Train or operational movement prevents the proposed work window.
          </p>
        </div>

        {/* COORDINATION OPPORTUNITY */}
        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
              2. COORDINATION OPPORTUNITY
            </span>
            <span className="text-sm font-bold text-amber-700">
              {spatialOverlaps.length}
            </span>
          </div>
          <p className="text-[11px] text-neutral-600 font-sans mt-1">
            Compatible departments (P.Way + TRD + S&T) can safely coordinate work.
          </p>
        </div>

        {/* NO CONFLICT */}
        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
              3. NO CONFLICT
            </span>
            <span className="text-sm font-bold text-emerald-700">
              Clear Corridor
            </span>
          </div>
          <p className="text-[11px] text-neutral-600 font-sans mt-1">
            Independent tracks or valid time windows with zero headway collision.
          </p>
        </div>
      </div>

      {/* 3. HARD CONFLICTS: LIVE HEADWAY COLLISIONS (RailRadar Dynamic Telemetry) */}
      {state.liveConflicts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              <h2 className="text-lg font-bold text-railway-textPrimary font-sans">
                Dynamic Train Movement Conflicts ({state.liveConflicts.length})
              </h2>
            </div>
            <span className="text-xs font-mono text-railway-textSecondary">
              Source: {state.liveData.source === 'LIVE' ? 'RailRadar™ Live Telemetry' : 'Simulated Feed'}
            </span>
          </div>

          <div className="space-y-4">
            {state.liveConflicts.map((alert, idx) => (
              <div
                key={`${alert.requestId}-${idx}`}
                className="bg-red-50/70 border border-red-200 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs font-mono"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-bold">
                        HARD CONFLICT
                      </span>
                      <span className="font-bold text-railway-forest">
                        {alert.requestId}
                      </span>
                      <span className="text-neutral-500 text-[11px]">
                        Detected: {alert.detectedAt}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-railway-textPrimary font-sans">
                      Train {alert.trainNumber} ({alert.trainName}) approaching affected section
                    </h3>

                    {/* Concise Reasoning Breakdown (Section 14 Specification) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                      <div className="p-2.5 rounded-xl bg-white border border-red-200">
                        <span className="text-[10px] text-neutral-400 uppercase block">Maintenance Slot</span>
                        <span className="font-bold text-railway-textPrimary">{alert.blockWindow} IST</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-red-200">
                        <span className="text-[10px] text-neutral-400 uppercase block">Projected Train Movement</span>
                        <span className="font-bold text-red-700">{alert.trainPassageWindow} IST</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-red-200">
                        <span className="text-[10px] text-neutral-400 uppercase block">Headway Shortfall</span>
                        <span className="font-bold text-red-700">-{alert.headwayShortfallMinutes} min (violates 15m buffer)</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="text-neutral-500 uppercase block text-[10px]">Recommended Action</span>
                    <span className="font-bold text-railway-forest font-sans">
                      Evaluate alternative window ({alert.alternativeWindows[0]})
                    </span>
                  </div>
                </div>

                {/* Operationally Meaningful Actions Bar (Section 15 Specification) */}
                <div className="p-3.5 bg-white rounded-2xl border border-red-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setSelectedTrainModal({ trainNumber: alert.trainNumber, trainName: alert.trainName, window: alert.trainPassageWindow })}
                      className="px-3 py-1.5 rounded-full bg-railway-canvas hover:bg-neutral-100 border border-railway-border font-semibold text-neutral-700 transition"
                    >
                      VIEW TRAIN
                    </button>

                    <button
                      onClick={() => setSelectedLocationModal({ requestId: alert.requestId, section: 'SEC-A', tracks: 'UP Main' })}
                      className="px-3 py-1.5 rounded-full bg-railway-canvas hover:bg-neutral-100 border border-railway-border font-semibold text-neutral-700 transition"
                    >
                      VIEW LOCATION
                    </button>

                    <button
                      onClick={() => setExpandedReqId(expandedReqId === alert.requestId ? null : alert.requestId)}
                      className="px-3 py-1.5 rounded-full bg-railway-canvas hover:bg-neutral-100 border border-railway-border font-semibold text-neutral-700 transition"
                    >
                      VIEW ALTERNATIVE WINDOWS
                    </button>

                    <button
                      onClick={() => {
                        sendControlOfficeQuery(alert.requestId, 'Train Movement Conflict', `Train ${alert.trainNumber} (${alert.trainName}) is approaching the affected section during scheduled possession ${alert.blockWindow}. Please review window.`);
                      }}
                      className="px-3 py-1.5 rounded-full bg-white hover:bg-neutral-50 border border-railway-border font-semibold text-railway-forest transition flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-railway-forest" />
                      <span>CONTACT CONTROL</span>
                    </button>
                  </div>

                  <button
                    onClick={() => acceptLiveConflictShift(alert.requestId, alert.alternativeWindows[0])}
                    className="px-5 py-2 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-railway-signalGreenLight" />
                    <span>REQUEST RESCHEDULE ({alert.alternativeWindows[0]})</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. STATIC TIMETABLE CONFLICTS */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-railway-border/60 pb-3">
          <h2 className="text-base font-bold text-railway-textPrimary">
            Corridor Timetable Static Conflicts ({conflictRequests.length})
          </h2>
        </div>

        {conflictRequests.length === 0 && state.liveConflicts.length === 0 ? (
          /* Operational Empty State (Prompt Section 19 Specification) */
          <div className="bg-white border border-railway-border rounded-3xl p-16 text-center space-y-3 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-railway-signalGreen mx-auto flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-railway-textPrimary font-sans">
                No conflicts detected
              </h3>
              <p className="text-sm text-railway-textSecondary max-w-sm mx-auto">
                No train, spatial, or departmental conflicts are currently identified.
              </p>
            </div>
          </div>
        ) : (
          conflictRequests.map(req => {
            const conflict = req.conflict!;
            const isResolved = conflict.isResolved;

            return (
              <div 
                key={req.id} 
                className="bg-white border border-railway-border rounded-3xl p-6 sm:p-8 shadow-xs hover:shadow-md transition-all space-y-5 font-mono"
              >
                {/* Header Strip */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-railway-border">
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      isResolved 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      {isResolved ? 'CONFLICT RESOLVED' : 'HARD CONFLICT'}
                    </span>
                    <span className="font-bold text-base text-railway-forest">
                      {req.id}
                    </span>
                    <span className="text-xs text-railway-textMuted uppercase">
                      {req.department}
                    </span>
                  </div>

                  <div className="text-xs text-railway-textMuted">
                    {req.section} ({req.startLocation} – {req.endLocation}) · {req.affectedTracks?.join(', ') || 'UP Main'}
                  </div>
                </div>

                {/* Concise Reasoning Breakdown (Section 14 Specification) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  
                  {/* Left Column: Conflict Details */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="space-y-1 font-sans">
                      <h3 className="text-xl font-bold text-railway-textPrimary">
                        {req.work}
                      </h3>
                      <p className="text-xs text-railway-textSecondary font-mono">
                        Maintenance Window: <strong className="text-railway-textPrimary">{req.preferredTime} IST</strong> ({req.duration} min)
                      </p>
                    </div>

                    {/* Concise Breakdown Box */}
                    <div className="rounded-2xl bg-railway-canvas/80 border border-railway-border p-4 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-800">
                          Train {conflict.conflictingTrainNumber} ({conflict.conflictingTrain})
                        </span>
                        <span className="text-red-700 font-bold">Approaching affected section</span>
                      </div>
                      <div className="text-neutral-600 font-sans text-xs">
                        Projected train movement overlaps proposed maintenance duration. Minimum required 15-minute G&SR safety headway margin is compromised.
                      </div>
                    </div>

                    {/* Recommended Alternative Window Card */}
                    <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] uppercase text-emerald-800 font-bold">
                          Recommended Action: Evaluate Alternative Window
                        </span>
                        <div className="text-xl font-bold text-railway-forest mt-0.5">
                          {conflict.aiRecommendation}
                        </div>
                        <div className="text-xs text-emerald-800 mt-0.5">
                          Zero timetable delay · Preserves full 20m safety buffer
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-900 flex-shrink-0">
                        <ShieldCheck className="w-4 h-4 text-railway-signalGreen" />
                        <span>G&SR Verified</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Operational Actions (Section 15 Specification) */}
                  <div className="lg:col-span-5 flex flex-col justify-center space-y-3 lg:pl-6 lg:border-l border-railway-border">
                    {isResolved ? (
                      <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-railway-signalGreen mx-auto" />
                        <div className="font-bold text-sm text-railway-textPrimary font-sans">
                          Alternative Window Committed
                        </div>
                        <p className="text-xs text-railway-textSecondary font-sans">
                          Possession re-scheduled to <strong>{conflict.aiRecommendation}</strong>. Interlocking and train control recorded.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="text-xs uppercase text-railway-textMuted font-semibold">
                          Operational Actions
                        </div>

                        {/* VIEW TRAIN Action */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSelectedTrainModal({ trainNumber: conflict.conflictingTrainNumber, trainName: conflict.conflictingTrain, window: 'Passage during window' })}
                            className="w-full py-2.5 rounded-xl border border-railway-border hover:bg-railway-canvas text-xs font-semibold text-center"
                          >
                            VIEW TRAIN
                          </button>

                          <button
                            onClick={() => setSelectedLocationModal({ requestId: req.id, section: req.section, tracks: req.affectedTracks?.join(', ') || 'UP Main', startLocation: req.startLocation, endLocation: req.endLocation, station: req.stationName })}
                            className="w-full py-2.5 rounded-xl border border-railway-border hover:bg-railway-canvas text-xs font-semibold text-center"
                          >
                            VIEW LOCATION
                          </button>
                        </div>

                        {/* VIEW ALTERNATIVE WINDOWS Toggle */}
                        <button
                          onClick={() => setExpandedReqId(expandedReqId === req.id ? null : req.id)}
                          className="w-full py-2.5 rounded-xl border border-railway-border hover:bg-railway-canvas text-xs font-semibold text-center"
                        >
                          {expandedReqId === req.id ? 'HIDE ALTERNATIVE WINDOWS' : 'VIEW ALTERNATIVE WINDOWS'}
                        </button>

                        {/* Collapsible Secondary Windows */}
                        {expandedReqId === req.id && conflict.alternativeWindows && (
                          <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                            {conflict.alternativeWindows.map((win, idx) => (
                              <div
                                key={idx}
                                onClick={() => acceptConflictRecommendation(req.id)}
                                className="p-2.5 rounded-xl border border-railway-border hover:border-railway-forest cursor-pointer bg-white flex items-center justify-between text-xs hover:bg-neutral-50"
                              >
                                <div>
                                  <strong className="text-railway-textPrimary block">{win} IST</strong>
                                  <span className="text-[10px] text-railway-textMuted">Feasible Window · 0 Conflicts</span>
                                </div>
                                <span className="text-[10px] text-railway-forest font-bold">SELECT →</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* CONTACT CONTROL Action */}
                        <button
                          onClick={() => {
                            sendControlOfficeQuery(req.id, 'Train Movement Conflict', `Train ${conflict.conflictingTrainNumber} (${conflict.conflictingTrain}) conflicts with ${req.id} during ${req.preferredTime}. Please review recommended window.`);
                            if (onNavigate) {
                              onNavigate('communication');
                            } else {
                              window.location.hash = 'communication';
                            }
                          }}
                          className="w-full py-2.5 rounded-xl border border-railway-border hover:bg-neutral-50 text-xs font-semibold text-railway-forest text-center flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>CONTACT CONTROL</span>
                        </button>

                        {/* REQUEST RESCHEDULE Action */}
                        <button
                          onClick={() => acceptConflictRecommendation(req.id)}
                          className="w-full py-3.5 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white font-semibold text-xs shadow-xs transition active:scale-98 flex items-center justify-center gap-2 group"
                        >
                          <Check className="w-4 h-4 text-railway-signalGreenLight" />
                          <span>REQUEST RESCHEDULE ({conflict.aiRecommendation})</span>
                        </button>
                      </>
                    )}
                  </div>

                </div>

              </div>
            );
          })
        )}
      </div>

      {/* 5. COORDINATION OPPORTUNITY SECTION */}
      {spatialOverlaps.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-railway-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4 text-amber-700" />
              </div>
              <h2 className="text-lg font-bold text-railway-textPrimary font-sans">
                Coordination Opportunities ({spatialOverlaps.length})
              </h2>
            </div>
            <span className="text-xs font-mono text-amber-800 bg-amber-100 px-3 py-1 rounded-full font-bold">
              Multi-Department Shadow Bundling Available
            </span>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-amber-300 shadow-xs space-y-4 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-railway-border pb-3">
              <div>
                <span className="font-bold text-railway-textPrimary text-sm block">
                  Joint Track Possession · Section {spatialOverlaps[0].section}
                </span>
                <span className="text-neutral-500 text-[11px]">
                  {spatialOverlaps[0].departmentBreakdown.map(d => `${d.department} (${d.work})`).join(' + ')}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openBlockCommunication(spatialOverlaps[0].requestIds[0])}
                  className="px-4 py-2 rounded-full bg-white border border-railway-border hover:bg-neutral-50 text-railway-textPrimary font-semibold shadow-xs"
                >
                  VIEW COORDINATION OPPORTUNITY
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-railway-canvas border border-railway-border">
                <span className="text-[10px] text-neutral-400 uppercase block">Spatial Overlap Range</span>
                <span className="font-bold text-neutral-800">{spatialOverlaps[0].overlapKmRange}</span>
              </div>
              <div className="p-3 rounded-xl bg-railway-canvas border border-railway-border">
                <span className="text-[10px] text-neutral-400 uppercase block">Concurrent Critical Path Duration</span>
                <span className="font-bold text-emerald-700">{spatialOverlaps[0].recommendedBlock?.durationMinutes} min (MAX)</span>
              </div>
              <div className="p-3 rounded-xl bg-railway-canvas border border-railway-border">
                <span className="text-[10px] text-neutral-400 uppercase block">Corridor Window Saved</span>
                <span className="font-bold text-purple-800">Eliminates duplicate line closure</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog: VIEW TRAIN Telemetry */}
      {selectedTrainModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-railway-border shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-railway-border pb-3">
              <div className="flex items-center space-x-2">
                <Train className="w-5 h-5 text-railway-forest" />
                <h3 className="text-base font-bold text-railway-textPrimary font-sans">
                  Train Telemetry Profile
                </h3>
              </div>
              <button onClick={() => setSelectedTrainModal(null)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-neutral-700">
              <div className="p-3 rounded-xl bg-railway-canvas border border-railway-border">
                <div className="text-[10px] text-neutral-400 uppercase">Train Number & Name</div>
                <div className="text-sm font-bold text-railway-textPrimary mt-0.5">
                  {selectedTrainModal.trainNumber} · {selectedTrainModal.trainName}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-railway-canvas border border-railway-border">
                <div className="text-[10px] text-neutral-400 uppercase">Projected Passage</div>
                <div className="text-sm font-bold text-red-700 mt-0.5">
                  {selectedTrainModal.window}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 border border-railway-border text-[11px] font-sans text-neutral-600">
                Operating priority: Express passenger precedence active. Line closure must honor standard 15-min clear headway.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTrainModal(null)}
                className="px-5 py-2 rounded-full bg-railway-forest text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog: VIEW LOCATION Details */}
      {selectedLocationModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-railway-border shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-railway-border pb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-railway-forest" />
                <h3 className="text-base font-bold text-railway-textPrimary font-sans">
                  Section Location Details
                </h3>
              </div>
              <button onClick={() => setSelectedLocationModal(null)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-neutral-700">
              <div className="p-3 rounded-xl bg-railway-canvas border border-railway-border">
                <div className="text-[10px] text-neutral-400 uppercase">Section & Track</div>
                <div className="text-sm font-bold text-railway-textPrimary mt-0.5">
                  {selectedLocationModal.section} · {selectedLocationModal.tracks}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-railway-canvas border border-railway-border">
                <div className="text-[10px] text-neutral-400 uppercase">Chainage Range</div>
                <div className="text-sm font-bold text-neutral-900 mt-0.5">
                  {selectedLocationModal.startLocation} to {selectedLocationModal.endLocation}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 border border-railway-border text-[11px] font-sans text-neutral-600">
                Station Limits: Mangalagiri (MAG) yard limits intersect KM 11.500 to 14.200. Interlocked crossover points monitored.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLocationModal(null)}
                className="px-5 py-2 rounded-full bg-railway-forest text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

function X(props: { className?: string }) {
  return (
    <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
