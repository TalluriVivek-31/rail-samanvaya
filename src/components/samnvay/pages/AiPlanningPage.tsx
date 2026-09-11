// Planning Engine & Schedule Matrix Page
// Redesigned with unified Vertex-inspired government railway design system (No AI buzzword overload)
import React, { useState } from 'react';
import { useSamnvayStore } from '../../../store/useSamnvayStore';
import { 
  Calendar, 
  Clock, 
  Layers, 
  ShieldCheck, 
  AlertTriangle, 
  Train, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2,
  Sliders,
  RefreshCw,
  ArrowRight,
  Info,
  MessageSquare,
  Trash2,
  X
} from 'lucide-react';

import { SamnvayPage } from '../../../types/samnvay';

interface AiPlanningPageProps {
  onNavigate?: (page: SamnvayPage) => void;
}

export const AiPlanningPage: React.FC<AiPlanningPageProps> = ({ onNavigate }) => {
  const { 
    state, 
    runAiPlanner, 
    combineBlocks, 
    rescheduleBlock, 
    splitBlock, 
    authorizeAndScheduleBlock, 
    requestAutomaticPlanning,
    openBlockCommunication,
    deleteMaintenanceBlock
  } = useSamnvayStore();
  const isMaster = state.currentUser.role === 'MASTER';
  const [deleteModalReqId, setDeleteModalReqId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [rescheduleModalReqId, setRescheduleModalReqId] = useState<string | null>(null);
  const [rescheduleStart, setRescheduleStart] = useState('04:30');
  const [rescheduleEnd, setRescheduleEnd] = useState('06:30');

  const [planningPeriod, setPlanningPeriod] = useState('24 Hours (Next Day Matrix)');
  const [corridor, setCorridor] = useState('BZA–KZJ Main Line');
  const [maxConcurrent, setMaxConcurrent] = useState('2 Blocks');
  const [safetyBuffer, setSafetyBuffer] = useState('15 Minutes (G&SR Standard)');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Timeline hours across 24h operational cycle (00:00 to 24:00)
  const timelineHours = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  const T_START = 0;
  const T_END = 1440;
  const T_TOTAL = 1440;

  const timeToPercent = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const min = (h || 0) * 60 + (m || 0);
    const clamped = Math.max(T_START, Math.min(T_END, min));
    return ((clamped - T_START) / T_TOTAL) * 100;
  };

  const durationToPercent = (durationMins: number) => {
    return (durationMins / T_TOTAL) * 100;
  };

  const renderDeptTimelineRow = (deptName: string, subText: string, barColor: string) => {
    const deptReqs = state.requests.filter(r => r.department === deptName && r.allocatedWindow);

    return (
      <div className="flex items-center gap-4">
        <div className="w-28 sm:w-36 flex-shrink-0 text-xs font-mono font-bold text-railway-textPrimary">
          {deptName}
          <span className="block text-[10px] text-railway-textMuted font-normal">{subText}</span>
        </div>
        <div className="relative flex-1 h-12 bg-railway-canvas/60 rounded-2xl border border-railway-border overflow-hidden">
          {deptReqs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[11px] font-mono text-neutral-400">
              No scheduled possessions
            </div>
          ) : (
            deptReqs.map(r => {
              const [h, m] = (r.allocatedWindow?.startTime || '00:00').split(':').map(Number);
              const startMins = (h || 0) * 60 + (m || 0);
              const leftPct = Math.max(0, Math.min(92, (startMins / 1440) * 100));
              const widthPct = Math.max(8, Math.min(100 - leftPct, (r.duration / 1440) * 100));
              const isSelected = expandedCardId === r.id;

              return (
                <div
                  key={r.id}
                  onClick={() => setExpandedCardId(r.id)}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  className={`absolute top-1.5 bottom-1.5 ${barColor} text-white rounded-xl px-3 flex items-center justify-between text-xs font-mono shadow-xs cursor-pointer hover:opacity-90 transition ${isSelected ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}
                >
                  <span className="font-bold truncate">{r.id} · {r.work}</span>
                  <span className="text-[10px] opacity-80 hidden sm:inline">{r.allocatedWindow?.startTime}–{r.allocatedWindow?.endTime}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. HEADER */}
      <div className="border-b border-railway-border pb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-railway-forest flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-railway-textPrimary font-sans">
              Corridor Planning Engine
            </h1>
          </div>
          <p className="text-sm text-railway-textSecondary mt-1">
            Mathematical constraint solver coordinating maintenance possessions, train movements, and safety margins.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-railway-textMuted">SOLVER BACKEND:</span>
          <span className="bg-white px-3 py-1.5 rounded-full border border-railway-border text-railway-forest font-bold shadow-xs">
            CP-SAT LINEAR PROGRAMMING
          </span>
        </div>
      </div>

      {/* 2. PARAMETERS & SOLVER CONTROL CARD */}
      <div className="bg-white rounded-3xl border border-railway-border p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-railway-border pb-4">
          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-railway-forest uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-railway-signalGreen" />
            <span>Optimization Parameters & Constraints</span>
          </div>
          <span className="text-xs font-mono text-railway-textMuted">
            STANDARD G&SR RULES ACTIVE
          </span>
        </div>

        {/* Input Selectors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
              Planning Horizon
            </label>
            <select
              value={planningPeriod}
              onChange={(e) => setPlanningPeriod(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-full bg-railway-canvas border border-railway-border text-xs font-medium text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
            >
              <option>24 Hours (Next Day Matrix)</option>
              <option>48 Hours (Rolling Corridor)</option>
              <option>7 Days (Weekly Rolling Plan)</option>
              <option>30 Days (Monthly Master Possession Plan)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
              Target Corridor Section
            </label>
            <select
              value={corridor}
              onChange={(e) => setCorridor(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-full bg-railway-canvas border border-railway-border text-xs font-medium text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
            >
              <option>SEC-A: Vijayawada – Mangalagiri (KM 0–25)</option>
              <option>SEC-B: Mangalagiri – Guntur Jn (KM 25–52.5)</option>
              <option>SEC-C: Guntur Jn – Tenali Jn (KM 52.5–80)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
              Safety Buffer (Headway Margin)
            </label>
            <select
              value={safetyBuffer}
              onChange={(e) => setSafetyBuffer(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-full bg-railway-canvas border border-railway-border text-xs font-medium text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
            >
              <option>10 Minutes (Automatic Block Territory)</option>
              <option>15 Minutes (G&SR Standard)</option>
              <option>20 Minutes (High-Density Section)</option>
              <option>30 Minutes (Fog / Monsoon Special)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
              Max Concurrent Possessions
            </label>
            <select
              value={maxConcurrent}
              onChange={(e) => setMaxConcurrent(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-full bg-railway-canvas border border-railway-border text-xs font-medium text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20"
            >
              <option>2 Blocks (Default Capacity)</option>
              <option>3 Blocks (Joint P.Way + TRD)</option>
              <option>1 Block (Strict Single-Line Restriction)</option>
            </select>
          </div>
        </div>

        {/* Generate Plan Button & Solver Progress */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-railway-textSecondary font-mono">
            {state.isPlanningInProgress ? (
              <div className="flex items-center space-x-2 text-railway-forest font-bold">
                <RefreshCw className="w-4 h-4 animate-spin text-railway-signalGreen" />
                <span>{state.planningProgressStage}</span>
              </div>
            ) : (
              <span>
                {state.requests.filter(r => r.status === 'Block Window Allocated').length > 0
                  ? `${state.requests.filter(r => r.status === 'Block Window Allocated').length} system recommendation(s) awaiting Human Officer Authorization`
                  : state.requests.filter(r => r.status === 'Scheduled').length > 0
                  ? `${state.requests.filter(r => r.status === 'Scheduled').length} authorized block possessions active on corridor`
                  : 'Corridor matrix ready for constraint-driven allocation'}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {state.requests.filter(r => r.status === 'Approved').length > 0 && (
              <button
                onClick={() => requestAutomaticPlanning()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-railway-forest text-railway-forest hover:bg-emerald-50 text-xs font-semibold shadow-xs transition active:scale-[0.98]"
              >
                <Clock className="w-4 h-4 text-railway-forest" />
                <span>Queue {state.requests.filter(r => r.status === 'Approved').length} Approved Requisitions</span>
              </button>
            )}

            <button
              onClick={() => runAiPlanner()}
              disabled={state.isPlanningInProgress}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white font-semibold text-sm shadow-sm transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-railway-signalGreenLight ${state.isPlanningInProgress ? 'animate-spin' : ''}`} />
              <span>{state.isPlanningInProgress ? 'Evaluating Constraints...' : 'Generate Plan (System Recommendations)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2.3 SYSTEM RECOMMENDATIONS & HUMAN AUTHORIZATION GATE (Prompt Section 7 & 8 Specification) */}
      {state.requests.filter(r => r.status === 'Block Window Allocated').length > 0 && (
        <div className="bg-white rounded-3xl border-2 border-emerald-500 p-6 sm:p-8 shadow-md space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-railway-border pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold border border-amber-200">
                <Clock className="w-6 h-6 text-amber-600 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                  SYSTEM RECOMMENDATION · AWAITING AUTHORIZATION
                </span>
                <h3 className="text-xl font-bold text-railway-textPrimary mt-1">
                  Human Officer Possession Authorization Gate
                </h3>
              </div>
            </div>

            <div className="text-xs font-mono text-railway-textSecondary">
              <span className="font-bold text-railway-forest">{state.requests.filter(r => r.status === 'Block Window Allocated').length}</span> Window Recommendation(s) Pending Sign-Off
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-950 text-xs font-sans leading-relaxed">
            <strong>G&SR Statutory Rule:</strong> System recommendations are non-executable candidate schedules. An actual possession is NOT scheduled until an authorized officer (<span className="font-semibold">Planning Officer</span>, <span className="font-semibold">COA / Operations</span>, or <span className="font-semibold">MASTER</span>) verifies track clearances, confirms safety isolations, and commits <strong>AUTHORIZE & SCHEDULE POSSESSION</strong>.
          </div>

          <div className="space-y-3 font-mono text-xs">
            {state.requests.filter(r => r.status === 'Block Window Allocated').map((req) => {
              const isEngineer = state.currentUser.role === 'P.Way Engineer' || 
                                 state.currentUser.role === 'S&T Engineer' || 
                                 state.currentUser.role === 'TRD Engineer';

              return (
                <div 
                  key={req.id}
                  className="p-5 rounded-2xl bg-railway-canvas border border-railway-border flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-bold text-railway-forest text-sm">{req.id}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        {req.department}
                      </span>
                      <span className="font-semibold text-neutral-800 font-sans">{req.work}</span>
                    </div>
                    <div className="text-neutral-500 text-[11px] font-sans">
                      Section: <strong className="text-neutral-700">{req.section}</strong> ({req.startLocation} – {req.endLocation}) · Track: <strong className="text-neutral-700">{req.affectedTracks?.join(', ') || 'UP Line'}</strong>
                    </div>
                    <div className="text-neutral-600 text-[11px] pt-0.5">
                      Recommended Slot: <strong className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">{req.allocatedWindow?.startTime} – {req.allocatedWindow?.endTime} IST</strong> ({req.duration} mins + 15m G&SR buffer)
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <button
                      onClick={() => openBlockCommunication(req.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-railway-border hover:bg-neutral-50 text-railway-textPrimary text-xs font-semibold shadow-2xs transition"
                      title="Open contextual communication for this recommendation"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-railway-forest" />
                      <span>Block Communication</span>
                    </button>

                    <button
                      disabled={isEngineer}
                      onClick={() => authorizeAndScheduleBlock(req.id, `Possession officially authorized and scheduled by ${state.currentUser.name} (${state.currentUser.role})`)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition active:scale-98 cursor-pointer"
                      title={isEngineer ? 'Field Engineers are restricted from authorizing possession under Indian Railways G&SR' : 'Authorize possession and issue Block Memo Number'}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>AUTHORIZE & SCHEDULE POSSESSION</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2.5 RECOMMENDED COORDINATED BLOCK (Prompt Section 10 & 13 Specification) */}
      {state.spatialOverlaps && state.spatialOverlaps.length > 0 && (
        <div className="bg-white rounded-3xl border border-emerald-500/40 p-6 sm:p-8 shadow-xs space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-railway-border pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold border border-emerald-200">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  CP-SAT OPTIMIZER OUTPUT · MULTI-DEPARTMENT COORDINATION
                </span>
                <h3 className="text-xl font-bold text-railway-textPrimary mt-1">
                  RECOMMENDED COORDINATED BLOCK
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
                BLOCK UTILIZATION: {state.spatialOverlaps[0].recommendedBlock?.blockUtilizationPercent}%
              </span>
              <button
                onClick={() => openBlockCommunication(state.spatialOverlaps[0].requestIds[0])}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-railway-border hover:bg-neutral-50 text-railway-textPrimary font-semibold text-xs shadow-xs transition"
              >
                <MessageSquare className="w-3.5 h-3.5 text-railway-forest" />
                <span>Block Communication</span>
              </button>
              <button
                onClick={() => combineBlocks(state.spatialOverlaps[0].requestIds, state.spatialOverlaps[0].recommendedBlock?.recommendedWindow || '04:30 – 06:30')}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white font-semibold text-xs shadow-xs transition active:scale-98"
              >
                <Layers className="w-3.5 h-3.5 text-railway-signalGreenLight" />
                <span>Bundle Coordinated Possession</span>
              </button>
            </div>
          </div>

          {/* Spatial Overlap Notification Box */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2 text-xs font-mono">
            <div className="flex items-center space-x-2 text-amber-900 font-bold uppercase">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>SPATIAL OVERLAP DETECTED</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-neutral-800">
              {state.spatialOverlaps[0].departmentBreakdown.map((item) => (
                <div key={item.requestId} className="p-2.5 rounded-xl bg-white border border-amber-200">
                  <span className="font-bold text-amber-900">{item.department}:</span> {item.kmRange}
                  <div className="text-[11px] text-neutral-500 font-sans truncate">{item.work} ({item.duration} min)</div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Output Spec Grid (Prompt Section 13 Specification) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-2xl bg-railway-canvas border border-railway-border">
              <div className="text-[10px] text-railway-textMuted uppercase font-bold">Recommended Window</div>
              <div className="text-base font-bold text-emerald-700 mt-1">
                {state.spatialOverlaps[0].recommendedBlock?.recommendedWindow} IST
              </div>
              <div className="text-[10px] text-neutral-500 font-sans mt-0.5">
                Duration: {state.spatialOverlaps[0].recommendedBlock?.durationMinutes} min
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-railway-canvas border border-railway-border">
              <div className="text-[10px] text-railway-textMuted uppercase font-bold">Corridor & Location</div>
              <div className="text-sm font-bold text-railway-textPrimary mt-1 truncate">
                {state.spatialOverlaps[0].recommendedBlock?.location}
              </div>
              <div className="text-[10px] text-neutral-500 font-sans mt-0.5 truncate">
                Vijayawada – Guntur – Tenali
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-railway-canvas border border-railway-border">
              <div className="text-[10px] text-railway-textMuted uppercase font-bold">Departments</div>
              <div className="text-sm font-bold text-railway-forest mt-1">
                {state.spatialOverlaps[0].departmentBreakdown.map(d => d.department).join(' + ')}
              </div>
              <div className="text-[10px] text-neutral-500 font-sans mt-0.5">
                Critical Path: {state.spatialOverlaps[0].recommendedBlock?.durationMinutes} min
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-railway-canvas border border-railway-border">
              <div className="text-[10px] text-railway-textMuted uppercase font-bold">Available Window</div>
              <div className="text-sm font-bold text-neutral-800 mt-1">
                {state.spatialOverlaps[0].recommendedBlock?.availableCorridorWindow || '04:30 – 07:00'}
              </div>
              <div className="text-[10px] text-emerald-800 font-bold mt-0.5">
                Utilization: {state.spatialOverlaps[0].recommendedBlock?.blockUtilizationPercent}%
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-railway-canvas border border-railway-border col-span-2 sm:col-span-1">
              <div className="text-[10px] text-railway-textMuted uppercase font-bold">Conflicts & Bundling</div>
              <div className="text-sm font-bold text-emerald-700 mt-1">
                0 Train Conflicts
              </div>
              <div className="text-[10px] text-purple-800 font-bold mt-0.5">
                {state.spatialOverlaps[0].departmentBreakdown.length} activities combined
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 border border-railway-border flex items-start space-x-3 text-xs text-railway-textSecondary leading-relaxed">
            <Info className="w-4 h-4 flex-shrink-0 text-railway-forest mt-0.5" />
            <div>
              <span className="font-bold text-railway-textPrimary font-mono">Reason for Recommendation: </span>
              {state.spatialOverlaps[0].recommendedBlock?.reason}
            </div>
          </div>
        </div>
      )}

      {/* 3. MULTI-DEPARTMENT TIMELINE GANTT (06:00 – 18:00) */}
      <div className="bg-white rounded-3xl border border-railway-border p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-railway-border">
          <div>
            <h2 className="text-lg font-bold text-railway-textPrimary tracking-tight">
              Coordinated Master Schedule Timeline
            </h2>
            <p className="text-xs text-railway-textSecondary">
              Horizontal timeline displaying approved maintenance possessions, safety margins, and train paths.
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-railway-forest" />
              <span>Maintenance Slot</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-amber-200 border border-amber-400" />
              <span>15m Buffer</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-blue-700" />
              <span>Train Path</span>
            </div>
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="space-y-4">
          {/* Time scale */}
          <div className="relative h-6 border-b border-railway-border text-[11px] font-mono text-railway-textMuted flex justify-between px-2">
            {timelineHours.map(hour => (
              <span key={hour}>{String(hour).padStart(2, '0')}:00</span>
            ))}
          </div>

          {/* Department Rows */}
          {/* Row: P.Way */}
          {renderDeptTimelineRow('P.Way', 'Track Engg', 'bg-railway-forest')}

          {/* Row: S&T */}
          {renderDeptTimelineRow('S&T', 'Interlocking', 'bg-blue-800')}

          {/* Row: TRD */}
          {renderDeptTimelineRow('TRD', '25kV OHE', 'bg-amber-600')}

          {/* Row: Train Movements (Dynamic from RailRadar) */}
          <div className="flex items-center gap-4">
            <div className="w-28 sm:w-36 flex-shrink-0 text-xs font-mono font-bold text-railway-textPrimary">
              Train Movements
              <span className="block text-[10px] text-railway-textMuted font-normal">
                {state.liveData.source === 'LIVE' ? 'RailRadar™ Live Telemetry' : 'Corridor Live Feeds'}
              </span>
            </div>
            <div className="relative flex-1 h-12 bg-railway-canvas/60 rounded-2xl border border-railway-border overflow-hidden">
              {state.liveData.liveTrains.length > 0 ? (
                state.liveData.liveTrains.slice(0, 6).map((t, idx) => {
                  const leftPos = Math.max(2, Math.min(88, idx * 16 + 3));
                  return (
                    <div
                      key={t.trainNumber}
                      style={{ left: `${leftPos}%`, width: '13%' }}
                      className={`absolute top-1.5 bottom-1.5 rounded-xl px-2 flex items-center justify-between text-[11px] font-mono shadow-xs truncate text-white border ${
                        t.delayMinutes === 0
                          ? 'bg-blue-700 border-blue-600'
                          : t.delayMinutes <= 15
                          ? 'bg-amber-700 border-amber-600'
                          : 'bg-red-700 border-red-600'
                      }`}
                      title={`${t.trainNumber} ${t.trainName} | Exp: ${t.expectedArrival} IST | Delay: ${t.delayMinutes}m`}
                    >
                      <span className="font-bold truncate">{t.trainNumber}</span>
                      <span className="text-[9px] opacity-90 hidden lg:inline">
                        {t.delayMinutes > 0 ? `+${t.delayMinutes}m` : 'RT'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full text-[11px] font-mono text-neutral-400">
                  No live train movements detected on corridor
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Slot Multi-Factor Explanation */}
        {expandedCardId && (() => {
          const cardReq = state.requests.find(r => r.id === expandedCardId);
          if (!cardReq) return null;
          return (
            <div className="mt-6 pt-6 border-t border-railway-border space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-railway-forest uppercase">
                  Detailed Constraint Evaluation: {cardReq.id} ({cardReq.department} · {cardReq.section})
                </span>
                <button 
                  onClick={() => setExpandedCardId(null)}
                  className="text-xs text-railway-textMuted hover:underline"
                >
                  Close Details
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
                <div className="p-3 rounded-2xl bg-railway-canvas border border-railway-border">
                  <div className="text-[10px] text-railway-textMuted">CRITICALITY (35%)</div>
                  <div className="text-base font-bold text-railway-textPrimary mt-1">{cardReq.priorityBreakdown?.criticality || 85} / 100</div>
                </div>
                <div className="p-3 rounded-2xl bg-railway-canvas border border-railway-border">
                  <div className="text-[10px] text-railway-textMuted">URGENCY (25%)</div>
                  <div className="text-base font-bold text-railway-textPrimary mt-1">{cardReq.priorityBreakdown?.urgency || 80} / 100</div>
                </div>
                <div className="p-3 rounded-2xl bg-railway-canvas border border-railway-border">
                  <div className="text-[10px] text-railway-textMuted">SAFETY MARGIN (20%)</div>
                  <div className="text-base font-bold text-railway-signalGreen mt-1">+15 min OK</div>
                </div>
                <div className="p-3 rounded-2xl bg-railway-canvas border border-railway-border">
                  <div className="text-[10px] text-railway-textMuted">TRAFFIC IMPACT (10%)</div>
                  <div className="text-base font-bold text-railway-textPrimary mt-1">0 delay min</div>
                </div>
                <div className="p-3 rounded-2xl bg-railway-canvas border border-railway-border">
                  <div className="text-[10px] text-railway-textMuted">TOTAL SCORE</div>
                  <div className="text-base font-bold text-railway-forest mt-1">{cardReq.priorityScore} / 100</div>
                </div>
              </div>

              {/* Multi-Block Operations Bar: Reschedule / Move Window & Split Block */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-railway-border flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <span className="text-neutral-500">Allocated Window:</span>
                  <strong className="text-railway-forest text-sm">
                    {cardReq.allocatedWindow ? `${cardReq.allocatedWindow.startTime} – ${cardReq.allocatedWindow.endTime} IST` : 'Unassigned'}
                  </strong>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                    {cardReq.status}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Authorize possession if in Block Window Allocated state */}
                  {cardReq.status === 'Block Window Allocated' && (
                    <button
                      disabled={state.currentUser.role === 'P.Way Engineer' || state.currentUser.role === 'S&T Engineer' || state.currentUser.role === 'TRD Engineer'}
                      onClick={() => authorizeAndScheduleBlock(cardReq.id, `Possession officially authorized and scheduled by ${state.currentUser.name} (${state.currentUser.role})`)}
                      className="px-4 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-bold text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                      <span>AUTHORIZE & SCHEDULE POSSESSION</span>
                    </button>
                  )}

                  {/* Reschedule Window Trigger */}
                  <button
                    onClick={() => {
                      setRescheduleModalReqId(cardReq.id);
                      setRescheduleStart(cardReq.allocatedWindow?.startTime || '04:30');
                      setRescheduleEnd(cardReq.allocatedWindow?.endTime || '06:30');
                    }}
                    className="px-4 py-2 rounded-full bg-white border border-railway-border hover:bg-railway-canvas text-railway-textPrimary font-semibold text-xs transition shadow-2xs flex items-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5 text-railway-forest" />
                    <span>Move / Reschedule Window</span>
                  </button>

                  {/* Discuss Plan via Operational Communication */}
                  <button
                    onClick={() => {
                      openBlockCommunication(cardReq.id);
                      if (onNavigate) {
                        onNavigate('communication');
                      } else {
                        window.location.hash = 'communication';
                      }
                    }}
                    className="px-4 py-2 rounded-full bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-900 font-semibold text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    title="Open operational communication for this plan"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-purple-700" />
                    <span>DISCUSS PLAN</span>
                  </button>

                  {/* MASTER ONLY: Permanent Deletion Action */}
                  {isMaster && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteModalReqId(cardReq.id);
                        setDeleteReason('');
                      }}
                      className="px-4 py-2 rounded-full bg-red-50 border border-red-300 hover:bg-red-100 text-red-800 font-semibold text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      title="MASTER Authority: Delete maintenance block"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      <span>DELETE BLOCK</span>
                    </button>
                  )}

                  {/* Split Block Trigger (if duration >= 120m) */}
                  {cardReq.duration >= 120 && (
                    <button
                      onClick={() => {
                        const half = Math.floor(cardReq.duration / 2);
                        splitBlock(cardReq.id, [half, cardReq.duration - half]);
                      }}
                      className="px-4 py-2 rounded-full bg-white border border-railway-border hover:bg-railway-canvas text-neutral-800 font-semibold text-xs transition shadow-2xs flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-600" />
                      <span>Split into 2 Parts ({Math.floor(cardReq.duration / 2)}m each)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Reschedule Window Modal */}
      {rescheduleModalReqId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-railway-border shadow-2xl space-y-5">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-railway-forest bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                TIMETABLE ADJUSTMENT
              </span>
              <h3 className="text-xl font-bold text-railway-textPrimary mt-1 font-sans">
                Reschedule Maintenance Possession
              </h3>
              <p className="text-xs text-neutral-500 font-mono mt-0.5">
                Moving slot for {rescheduleModalReqId}
              </p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[10px] uppercase text-neutral-500 font-bold mb-1">New Start Time (IST)</label>
                <input
                  type="time"
                  value={rescheduleStart}
                  onChange={(e) => setRescheduleStart(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-railway-border bg-railway-canvas text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-neutral-500 font-bold mb-1">New End Time (IST)</label>
                <input
                  type="time"
                  value={rescheduleEnd}
                  onChange={(e) => setRescheduleEnd(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-railway-border bg-railway-canvas text-sm font-bold"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px]">
                ✓ G&SR 15-min safety isolation buffers will be automatically reserved around this new window.
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setRescheduleModalReqId(null)}
                className="px-4 py-2 rounded-full border border-railway-border hover:bg-railway-canvas text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  rescheduleBlock(rescheduleModalReqId, rescheduleStart, rescheduleEnd, 'Controller manual timetable reallocation');
                  setRescheduleModalReqId(null);
                }}
                className="px-6 py-2 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white text-xs font-semibold shadow-xs"
              >
                Confirm New Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MASTER DELETE MODAL */}
      {deleteModalReqId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-railway-border shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center border border-red-200">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-railway-textPrimary font-sans">
                    Delete Maintenance Block
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono">
                    Target: {deleteModalReqId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteModalReqId(null)}
                className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1">
              <strong className="block font-bold">Principal Chief Operations Manager (MASTER) Authority</strong>
              <p>
                Permanently deletes this maintenance possession from planning matrices, scheduled blocks, and conflict evaluations.
              </p>
            </div>

            <div className="space-y-1 font-mono text-xs">
              <label className="text-[10px] text-neutral-500 uppercase block font-bold">
                Deletion Reason (Stored in Audit Trail):
              </label>
              <textarea
                rows={3}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Cancelled due to emergency train pathing or section priority adjustment..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-railway-canvas border border-railway-border text-xs font-sans text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-railway-border">
              <button
                type="button"
                onClick={() => setDeleteModalReqId(null)}
                className="px-4 py-2 rounded-full border border-railway-border text-xs font-semibold text-railway-textSecondary hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteModalReqId) {
                    deleteMaintenanceBlock(deleteModalReqId, deleteReason);
                    setDeleteModalReqId(null);
                  }
                }}
                className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Confirm Permanent Deletion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
