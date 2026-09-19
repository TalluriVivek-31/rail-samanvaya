// Planning Engine & Schedule Matrix Page
// Redesigned with unified Vertex-inspired government railway design system (No AI buzzword overload)
import React, { useState, useMemo } from 'react';
import { useSamnvayStore } from '../store/useSamnvayStore';
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
  X,
  SlidersHorizontal,
  Table as TableIcon,
  Check,
  Activity,
  Edit3,
  MapPin,
  RotateCcw
} from 'lucide-react';

import { SamnvayPage, BlockRequest } from '../types/samnvay';
import { analyzeLocationTrainConflicts } from '../optimization/conflictEngine';
import { DEFAULT_PLANNING_PARAMETERS } from '../optimization/corridorSchedule';
import { CandidatePlanningWindow } from '../types/infrastructure';
import { NearbyTrainIntelligenceWidget } from '../components/samnvay/NearbyTrainIntelligenceWidget';
import { CandidateWindowComparisonMatrix } from '../components/samnvay/CandidateWindowComparisonMatrix';
import { TimetableSearchWidget } from '../components/samnvay/TimetableSearchWidget';
import { isPlanningEligible } from '../utils/requestLifecycle';
import { EditorialHero } from '../components/common/EditorialHero';

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
    sendToControl,
    requestAutomaticPlanning,
    openBlockCommunication,
    deleteMaintenanceBlock,
    recordManualOverride,
    requestReplan
  } = useSamnvayStore();
  const isMaster = state.currentUser.role === 'MASTER';
  const [deleteModalReqId, setDeleteModalReqId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [rescheduleModalReqId, setRescheduleModalReqId] = useState<string | null>(null);
  const [rescheduleStart, setRescheduleStart] = useState('04:30');
  const [rescheduleEnd, setRescheduleEnd] = useState('06:30');

  const [replanModalReqId, setReplanModalReqId] = useState<string | null>(null);
  const [replanReason, setReplanReason] = useState<string>('');
  const [allocationNotice, setAllocationNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const [selectedCandidateReqId, setSelectedCandidateReqId] = useState<string | null>(null);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [manualOverrideModalReqId, setManualOverrideModalReqId] = useState<string | null>(null);
  const [manualOverrideStart, setManualOverrideStart] = useState('04:30');
  const [manualOverrideEnd, setManualOverrideEnd] = useState('06:30');
  const [manualOverrideReason, setManualOverrideReason] = useState('');
  const [manualOverrideError, setManualOverrideError] = useState('');

  // Planning Horizon & Constraint Optimization State
  const [planningPeriod, setPlanningPeriod] = useState('Next 24 Hours (Rolling Matrix)');
  const [preferredTimeSlot, setPreferredTimeSlot] = useState<'ALL' | 'NIGHT_ONLY' | 'DAY_ONLY'>('ALL');
  const [workingDaysOnly, setWorkingDaysOnly] = useState<boolean>(false);
  const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState<string>(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [maxConcurrent, setMaxConcurrent] = useState('2 Blocks');
  const [safetyBuffer, setSafetyBuffer] = useState('15 Minutes (G&SR Standard)');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Canonical eligible planning requests
  const planningEligibleRequests = useMemo(() => {
    return state.requests.filter(r => isPlanningEligible(r));
  }, [state.requests]);

  // Active Requisition for Candidate Planning Window Inspection
  const activeReq = useMemo(() => {
    if (selectedCandidateReqId) {
      const found = state.requests.find(r => r.id === selectedCandidateReqId);
      if (found) return found;
    }
    if (planningEligibleRequests.length > 0) {
      const allocated = planningEligibleRequests.find(r => r.status === 'Block Window Allocated');
      if (allocated) return allocated;
      return planningEligibleRequests[0];
    }
    return state.requests[0];
  }, [selectedCandidateReqId, planningEligibleRequests, state.requests]);

  // Dynamic Multi-Horizon Conflict and Candidate Window Analysis for the active requisition
  const activeReqAnalysis = useMemo(() => {
    if (!activeReq) return null;

    const horizonType = 
      planningPeriod.includes('Today') ? 'TODAY' :
      planningPeriod.includes('24 Hours') ? 'NEXT_24_HOURS' :
      planningPeriod.includes('7 Days') ? 'NEXT_7_DAYS' :
      planningPeriod.includes('30 Days') ? 'NEXT_30_DAYS' :
      'CUSTOM';

    const headwayBuffer = safetyBuffer.includes('10') ? 10 :
      safetyBuffer.includes('20') ? 20 :
      safetyBuffer.includes('30') ? 30 : 15;

    return analyzeLocationTrainConflicts(
      activeReq.startKm || 12.4,
      activeReq.endKm || 13.1,
      activeReq.affectedTracks || ['UP Main'],
      activeReq.duration || 120,
      activeReq.preferredStartTime || activeReq.preferredTime || '04:30',
      state.liveData.liveTrains,
      { ...DEFAULT_PLANNING_PARAMETERS, headwayBufferMinutes: headwayBuffer },
      (state.liveData.source as any) || 'LIVE',
      state.liveData.lastFetchTimestamp,
      {
        horizonType,
        startDate: customStartDate,
        customEndDate: customEndDate,
        preferredSlotType: preferredTimeSlot,
        workingDaysOnly,
        possessionBreakdown: (activeReq as any).possessionBreakdown,
        requestedResources: activeReq.resourcesRequired || [],
        existingAllocations: (state.scheduledBlocks || []).map(sb => ({
          requestId: sb.associatedRequestIds[0] || sb.blockId,
          startTime: sb.allocatedStartTime,
          endTime: sb.allocatedEndTime,
          resources: []
        }))
      }
    );
  }, [
    activeReq, 
    state.liveData.liveTrains, 
    state.liveData.source, 
    state.liveData.lastFetchTimestamp,
    planningPeriod, 
    customStartDate, 
    customEndDate, 
    preferredTimeSlot, 
    workingDaysOnly, 
    safetyBuffer, 
    state.scheduledBlocks
  ]);

  // Contextual train movements near the active maintenance work zone
  const contextualTrains = useMemo(() => {
    if (!activeReq) return [];
    const affectedTrack = activeReq.affectedTracks?.[0] || 'UP Main';
    const isUp = affectedTrack.includes('UP');
    const reqKm = activeReq.startKm || 12.4;

    return state.liveData.liveTrains.map(t => {
      const trainKm = t.currentKm ?? 10.0;
      const dist = Number(Math.abs(trainKm - reqKm).toFixed(1));
      const speed = t.speedKmph || 60;
      const etaMins = Math.max(1, Math.round((dist / Math.max(speed, 20)) * 60));
      const isApproaching = isUp ? trainKm < reqKm : trainKm > reqKm;
      const isInside = Math.abs(trainKm - reqKm) < 0.5;

      return {
        ...t,
        distanceKm: dist,
        dynamicEtaMinutes: etaMins,
        isApproaching,
        isInside
      };
    }).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5);
  }, [activeReq, state.liveData.liveTrains]);

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
    <div className="space-y-6 pb-12">
      {/* 1. Master Editorial Hero */}
      <EditorialHero
        category="Constraint-Based Optimization"
        titleLines={['FIND THE', 'SAFE GAP']}
        subtitle="Divisional timetable gap solver, headway cushion computation, and safe maintenance possession slot allocation."
        badges={[
          { label: 'CP-SAT OPTIMIZER ACTIVE', variant: 'green' },
          { label: '15-MIN HEADWAY CUSHION', variant: 'teal' },
          { label: 'G&SR CHAPTER XV ENFORCED', variant: 'steel' },
          { label: `${planningEligibleRequests.length} ELIGIBLE FOR ALLOCATION`, variant: 'dark' },
        ]}
        actionSlot={
          <div className="flex items-center gap-2">
            <span className="px-4 py-2 rounded-full bg-white border border-[#E8E6DF] text-xs font-bold text-[#393D3F] shadow-xs">
              SOLVER: CP-SAT LINEAR
            </span>
          </div>
        }
        bgMotif="turnout"
      />

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

        {/* AFFECTED INFRASTRUCTURE CONTEXT CARD (Directly resolved from Active Requisition) */}
        {activeReq && (
          <div className="p-4 sm:p-5 rounded-2xl bg-railway-canvas/80 border border-railway-border space-y-3 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-railway-border pb-2.5">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-railway-signalGreen" />
                <span className="font-bold text-railway-forest uppercase tracking-wider text-[11px]">
                  Affected Infrastructure Context (Auto-Resolved from Requisition #{activeReq.id})
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px]">
                  CORRIDOR SCOPE DIRECT
                </span>
                {activeReq.isCrossSection && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
                    CROSS-SECTIONAL SPAN
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-2.5 rounded-xl bg-white border border-railway-border">
                <span className="text-[10px] text-neutral-400 block uppercase font-bold">Affected Section</span>
                <span className="font-bold text-railway-textPrimary text-xs block truncate" title={activeReq.section}>
                  {activeReq.section || 'SEC-A'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-railway-border">
                <span className="text-[10px] text-neutral-400 block uppercase font-bold">Physical Line / Track</span>
                <span className="font-bold text-railway-textPrimary text-xs block truncate">
                  {activeReq.affectedTracks?.join(', ') || 'UP Main'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-railway-border">
                <span className="text-[10px] text-neutral-400 block uppercase font-bold">Chainage KM</span>
                <span className="font-bold text-railway-forest text-xs block font-mono">
                  KM {activeReq.startKm?.toFixed(3) || '12.400'} – {activeReq.endKm?.toFixed(3) || '13.100'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-railway-border">
                <span className="text-[10px] text-neutral-400 block uppercase font-bold">Boundary Stations</span>
                <span className="font-bold text-sky-900 text-xs block truncate">
                  {activeReqAnalysis?.corridorContext ? `${activeReqAnalysis.corridorContext.previousStation.stationCode} → ${activeReqAnalysis.corridorContext.nextStation.stationCode}` : 'KCC → MAG'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-railway-border">
                <span className="text-[10px] text-neutral-400 block uppercase font-bold">Direction</span>
                <span className="font-bold text-neutral-800 text-xs block">
                  {activeReq.affectedTracks?.[0]?.includes('DN') ? 'DOWN (DN)' : 'UP (UP Line)'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-railway-border">
                <span className="text-[10px] text-neutral-400 block uppercase font-bold">Work Zone Limits</span>
                <span className="font-bold text-emerald-900 text-xs block truncate">
                  {activeReq.isCrossSection ? 'Multi-Station Span' : 'Mid-Section Block'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Optimization Parameters & Constraints Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Planning Horizon */}
          <div className="space-y-1.5">
            <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
              Planning Horizon
            </label>
            <select
              value={planningPeriod}
              onChange={(e) => setPlanningPeriod(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-full bg-railway-canvas border border-railway-border text-xs font-medium text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20 cursor-pointer"
            >
              <option>Today (Current Operational Day)</option>
              <option>Next 24 Hours (Rolling Matrix)</option>
              <option>Next 7 Days (1 Week Rolling Plan)</option>
              <option>Next 30 Days (Monthly Master Possession Plan)</option>
              <option>Custom Date Range</option>
            </select>
          </div>

          {/* Preferred Time Window */}
          <div className="space-y-1.5">
            <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
              Preferred Time Window
            </label>
            <select
              value={preferredTimeSlot}
              onChange={(e) => setPreferredTimeSlot(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-full bg-railway-canvas border border-railway-border text-xs font-medium text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20 cursor-pointer"
            >
              <option value="ALL">Any Time (Full 24-Hour Timeline)</option>
              <option value="NIGHT_ONLY">Night Window Only (01:00 – 06:00 IST)</option>
              <option value="DAY_ONLY">Day Window Only (06:00 – 22:00 IST)</option>
            </select>
          </div>

          {/* Working Days Constraint */}
          <div className="space-y-1.5">
            <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
              Working Days Constraint
            </label>
            <select
              value={workingDaysOnly ? 'WORKING_ONLY' : 'ALL_DAYS'}
              onChange={(e) => setWorkingDaysOnly(e.target.value === 'WORKING_ONLY')}
              className="w-full px-3.5 py-2.5 rounded-full bg-railway-canvas border border-railway-border text-xs font-medium text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20 cursor-pointer"
            >
              <option value="ALL_DAYS">All Calendar Days (Mon–Sun)</option>
              <option value="WORKING_ONLY">Working Days Only (Mon–Sat, No Sunday)</option>
            </select>
          </div>

          {/* Safety Buffer / Headway Margin */}
          <div className="space-y-1.5">
            <label className="font-semibold text-railway-textSecondary font-mono uppercase text-[10px]">
              Safety Buffer (Headway Margin)
            </label>
            <select
              value={safetyBuffer}
              onChange={(e) => setSafetyBuffer(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-full bg-railway-canvas border border-railway-border text-xs font-medium text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-railway-forest/20 cursor-pointer"
            >
              <option>10 Minutes (Automatic Block Territory)</option>
              <option>15 Minutes (G&SR Standard)</option>
              <option>20 Minutes (High-Density Section)</option>
              <option>30 Minutes (Fog / Monsoon Special)</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Picker (Only rendered when Custom Date Range selected) */}
        {planningPeriod === 'Custom Date Range' && (
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="flex items-center space-x-2 text-amber-900 font-bold">
              <Calendar className="w-4 h-4 text-amber-700" />
              <span>Custom Planning Horizon:</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-neutral-500">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-mono text-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-neutral-500">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-mono text-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        )}

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

      {/* 2.1 TIMETABLE INTELLIGENCE & TRAIN MOVEMENT LOOKUP (RailRadar Integration) */}
      <TimetableSearchWidget
        corridorContext={activeReqAnalysis?.corridorContext}
        plannedWindow={activeReq?.allocatedWindow ? {
          startTime: activeReq.allocatedWindow.startTime,
          endTime: activeReq.allocatedWindow.endTime,
          date: activeReq.date
        } : undefined}
      />

      {/* 2.2 CANDIDATE BLOCK WINDOWS & MULTI-WINDOW DECISION SUPPORT (Prompt Sections 13, 14, 15) */}
      {/* Allocation Notice Banner */}
      {allocationNotice && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-mono transition-all animate-fadeIn ${
          allocationNotice.type === 'error'
            ? 'bg-rose-50 text-rose-900 border-rose-300'
            : 'bg-emerald-50 text-emerald-900 border-emerald-300'
        }`}>
          <div className="flex items-center gap-2">
            {allocationNotice.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
            <span>{allocationNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAllocationNotice(null)}
            className="p-1 rounded-full hover:bg-black/5 text-slate-500 hover:text-slate-800 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2.2 CANDIDATE BLOCK POSSESSION WINDOWS EVALUATION */}
      {activeReq && (
        <div className="bg-white rounded-3xl border border-railway-border p-6 sm:p-8 shadow-xs space-y-6">
          {/* Top Bar: Requisition Selector Pills */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-railway-border pb-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold border border-emerald-200">
                  <SlidersHorizontal className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    CANDIDATE BLOCK WINDOWS · MULTI-WINDOW EVALUATION
                  </span>
                  <h3 className="text-xl font-bold text-railway-textPrimary mt-0.5 font-sans">
                    Possession Window Decision Support
                  </h3>
                </div>
              </div>
            </div>

            {/* Requisition Pills Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-neutral-400 mr-1 hidden sm:inline">SELECT REQUISITION:</span>
              {(planningEligibleRequests.length > 0 ? planningEligibleRequests : state.requests.slice(0, 5)).map(req => {
                const isSelected = activeReq?.id === req.id;
                const isAllocated = Boolean(req.authorizedBlockId || req.status === 'Scheduled');
                return (
                  <button
                    key={req.id}
                    onClick={() => setSelectedCandidateReqId(req.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold border transition ${
                      isSelected
                        ? 'bg-railway-forest text-white border-railway-forest shadow-xs'
                        : isAllocated
                        ? 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
                        : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                    }`}
                  >
                    <span>{req.id}</span>
                    <span className={`ml-1.5 text-[9px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : isAllocated ? 'bg-purple-200 text-purple-800' : 'bg-neutral-200 text-neutral-600'
                    }`}>
                      {isAllocated ? 'ALLOCATED' : req.department}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Requisition Details Card */}
          <div className="p-4 rounded-2xl bg-railway-canvas border border-railway-border flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2.5">
                <span className="font-bold text-railway-forest text-sm font-mono">{activeReq.id}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono">
                  {activeReq.department}
                </span>
                <span className="font-semibold text-neutral-900 font-sans">{activeReq.work}</span>
                {activeReq.manualOverride && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-900 border border-purple-300 font-mono">
                    MANUAL OVERRIDE APPLIED
                  </span>
                )}
              </div>
              <div className="text-neutral-500 text-xs font-sans">
                Section: <strong className="text-neutral-700">{activeReq.section}</strong> (KM {activeReq.startKm ?? '12.4'} – {activeReq.endKm ?? '13.1'}) · Track: <strong className="text-neutral-700">{activeReq.affectedTracks?.join(', ') || 'UP Main'}</strong> · Required Duration: <strong className="text-neutral-900 font-mono">{activeReq.duration} mins</strong>
              </div>
              {activeReqAnalysis?.corridorContext && (
                <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 font-bold border border-sky-200">
                    STATION-TO-STATION: {activeReqAnalysis.corridorContext.previousStation.stationCode} ({activeReqAnalysis.corridorContext.previousStation.stationName}) → {activeReqAnalysis.corridorContext.nextStation.stationCode} ({activeReqAnalysis.corridorContext.nextStation.stationName})
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-300">
                    Corridor Section: {activeReqAnalysis.corridorContext.affectedSection}
                  </span>
                  {activeReqAnalysis.corridorContext.isCrossSection && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-300">
                      CROSS-SECTION SPAN
                    </span>
                  )}
                </div>
              )}
              <div className="text-neutral-600 text-xs pt-0.5">
                Current Assigned Window: <strong className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">{activeReq.allocatedWindow?.startTime || '04:30'} – {activeReq.allocatedWindow?.endTime || '06:30'} IST</strong>
              </div>
            </div>

            {/* Quick Actions: Compare Windows & Manual Override */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsCompareModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-railway-border hover:bg-neutral-50 text-railway-textPrimary text-xs font-semibold shadow-2xs transition cursor-pointer"
                title="Open side-by-side comparison matrix of all candidate windows"
              >
                <TableIcon className="w-3.5 h-3.5 text-railway-forest" />
                <span>COMPARE WINDOWS</span>
              </button>

              <button
                onClick={() => {
                  setManualOverrideModalReqId(activeReq.id);
                  setManualOverrideStart(activeReq.allocatedWindow?.startTime || '04:30');
                  setManualOverrideEnd(activeReq.allocatedWindow?.endTime || '06:30');
                  setManualOverrideReason('');
                  setManualOverrideError('');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-bold shadow-2xs transition cursor-pointer"
                title="Override system recommendation with custom timetable window (Mandatory reason required)"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                <span>MANUAL WINDOW OVERRIDE</span>
              </button>
            </div>
          </div>

          {/* NO SUITABLE WINDOW FOUND BANNER (Section 32 Specification) */}
          {activeReqAnalysis?.isNoSuitableWindow && (
            <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-3 font-mono">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
                <span>NO SUITABLE MAINTENANCE WINDOW FOUND ON ACTIVE TIMELINE</span>
              </div>
              <p className="text-xs font-sans text-rose-900 leading-relaxed">
                Required possession of <strong>{activeReqAnalysis.totalRequiredPossessionMinutes} minutes</strong> cannot be accommodated without violating 15-minute headway safety margins or overlapping existing possessions. Longest available gap on this corridor is <strong>{activeReqAnalysis.longestFeasibleWindowMinutes} minutes</strong>.
              </p>
              {activeReqAnalysis.noSuitableWindowReasons && (
                <div className="text-[11px] bg-white/80 p-3 rounded-xl border border-rose-200 space-y-1">
                  <span className="font-bold text-rose-900 block text-[10px] uppercase">Corridor Blocking Constraints:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-neutral-700 font-sans">
                    {activeReqAnalysis.noSuitableWindowReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* DYNAMIC CANDIDATE WINDOWS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            {(activeReqAnalysis?.candidateWindows || []).map((cand, idx) => {
              const slotLabel = cand.isRecommended ? 'CP-SAT OPTIMIZED WINDOW' : `DYNAMIC GAP SLOT #${idx + 1}`;
              const isRecommended = Boolean(cand.isRecommended);
              const isFeasible = cand.status === 'FEASIBLE';
              const isConflict = cand.status === 'CONFLICT';
              const isShort = cand.status === 'INSUFFICIENT_DURATION';

              return (
                <div
                  key={cand.slotId}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-2xs ${
                    isRecommended
                      ? 'bg-emerald-50/40 border-emerald-500 ring-2 ring-emerald-500/20'
                      : isConflict
                      ? 'bg-rose-50/30 border-rose-300'
                      : isShort
                      ? 'bg-amber-50/30 border-amber-300'
                      : 'bg-white border-railway-border'
                  }`}
                >
                  {/* Card Header */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">
                          {cand.slotId}
                        </span>
                        {cand.dayLabel && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300">
                            {cand.dayLabel}
                          </span>
                        )}
                        {cand.slotType && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            cand.slotType === 'NIGHT' ? 'bg-indigo-100 text-indigo-900' : 'bg-amber-100 text-amber-900'
                          }`}>
                            {cand.slotType === 'NIGHT' ? '🌙 NIGHT' : '☀️ DAY'}
                          </span>
                        )}
                      </div>
                      {isRecommended ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>RECOMMENDED</span>
                        </span>
                      ) : isFeasible ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900 border border-sky-300">
                          FEASIBLE
                        </span>
                      ) : isConflict ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                          HEADWAY CONFLICT
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          INSUFFICIENT
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline space-x-2">
                      <span className="text-xl font-bold text-railway-textPrimary">
                        {cand.startTime} – {cand.endTime}
                      </span>
                      <span className="text-xs text-neutral-500">IST</span>
                      {cand.candidateDate && (
                        <span className="text-[10px] text-neutral-400 font-mono">({cand.candidateDate})</span>
                      )}
                    </div>

                    {/* Quick Specs */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div className="p-2 rounded-xl bg-white/80 border border-neutral-200">
                        <span className="text-neutral-400 block text-[9px] uppercase">Available Window</span>
                        <strong className="text-neutral-800">{cand.durationMinutes} min</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-white/80 border border-neutral-200">
                        <span className="text-neutral-400 block text-[9px] uppercase">Headway Margin</span>
                        <strong className="text-emerald-700">+15 min G&amp;SR</strong>
                      </div>
                    </div>

                    {/* Explanations: WHY THIS WINDOW? vs WHY REJECTED? */}
                    {isRecommended || isFeasible ? (
                      <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-[11px] font-sans text-emerald-950 space-y-1">
                        <span className="font-bold font-mono text-[10px] uppercase text-emerald-800 block">
                          WHY THIS WINDOW?
                        </span>
                        <p className="leading-snug">{cand.reason}</p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200 text-[11px] font-sans text-rose-950 space-y-1">
                        <span className="font-bold font-mono text-[10px] uppercase text-rose-800 block">
                          WHY REJECTED?
                        </span>
                        <p className="leading-snug">{cand.reason}</p>
                        {cand.conflictingTrain && (
                          <div className="mt-1 pt-1 border-t border-rose-200 text-[10px] font-mono text-rose-700 font-semibold">
                            ⚠️ Conflicting Rake: {cand.conflictingTrain.trainNumber} {cand.conflictingTrain.trainName} ({cand.conflictingTrain.estimatedArrivalAtKm})
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons */}
                  <div className="pt-2 border-t border-neutral-200/80">
                    {isRecommended ? (
                      (activeReq.authorizedBlockId || activeReq.status === 'Scheduled' || activeReq.status === 'AUTHORIZED') ? (
                        <div className="space-y-2">
                          <div className="w-full py-2 px-3 text-center text-[11px] font-mono text-purple-900 bg-purple-50 border border-purple-200 rounded-xl font-bold flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-700" />
                            <span>ALLOCATED: {activeReq.authorizedBlockId || 'ACTIVE'}</span>
                          </div>
                          <button
                            onClick={() => {
                              setReplanModalReqId(activeReq.id);
                              setReplanReason('');
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer"
                            title="Archive current allocation and reopen possession for replanning"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                            <span>REQUEST REPLAN</span>
                          </button>
                        </div>
                      ) : (state.currentUser.role === 'COA / Operations' || state.currentUser.role === 'Planning Officer' || state.currentUser.role === 'MASTER') ? (
                        <button
                          onClick={async () => {
                            const res = authorizeAndScheduleBlock(activeReq.id, `Possession officially authorized in recommended window ${cand.startTime}–${cand.endTime} by ${state.currentUser.name} (${state.currentUser.role})`);
                            if (res?.success) {
                              setAllocationNotice({
                                type: 'success',
                                message: `Block ${res.blockId} successfully authorized and scheduled.`
                              });
                              if (onNavigate) {
                                onNavigate('execution');
                              } else {
                                window.location.hash = 'execution';
                              }
                            } else {
                              setAllocationNotice({
                                type: 'error',
                                message: res?.message || 'Requisition already has an active allocation.'
                              });
                            }
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                          title="Authorize corridor block, issue official Block Memo, and navigate to Execution"
                        >
                          <CheckCircle2 className="w-4 h-4 text-purple-200" />
                          <span>AUTHORIZE &amp; SCHEDULE (EXECUTE)</span>
                        </button>
                      ) : (
                        <div className="w-full py-2 px-2 text-center text-[11px] font-mono text-neutral-500 bg-neutral-100 rounded-xl">
                          Recommendation Pending Control Authorization
                        </div>
                      )
                    ) : isFeasible ? (
                      (activeReq.authorizedBlockId || activeReq.status === 'Scheduled') ? (
                        <button
                          onClick={() => {
                            setReplanModalReqId(activeReq.id);
                            setReplanReason(`Select alternative candidate window ${cand.slotId}: ${cand.startTime}–${cand.endTime}`);
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-white border border-amber-400 hover:bg-amber-50 text-amber-800 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                          <span>REPLAN WITH THIS WINDOW</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => rescheduleBlock(activeReq.id, cand.startTime, cand.endTime, `Officer selected alternative candidate window ${cand.slotId}: ${cand.startTime}–${cand.endTime}`)}
                          className="w-full py-2.5 px-3 rounded-xl bg-white border border-sky-400 hover:bg-sky-50 text-sky-800 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                        >
                          <ArrowRight className="w-4 h-4 text-sky-600" />
                          <span>CHOOSE THIS WINDOW</span>
                        </button>
                      )
                    ) : (
                      <button
                        disabled={true}
                        className="w-full py-2.5 px-3 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-neutral-400" />
                        <span>CANNOT SCHEDULE (CONFLICT)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CANDIDATE WINDOWS COMPARISON MATRIX & AI RECOMMENDATION REASONING (Sections 10 & 11) */}
          {activeReqAnalysis?.candidateWindows && activeReqAnalysis.candidateWindows.length > 0 && (
            <CandidateWindowComparisonMatrix
              request={activeReq}
              candidateWindows={activeReqAnalysis.candidateWindows}
              onSelectWindow={(cand: CandidatePlanningWindow) => {
                rescheduleBlock(activeReq.id, cand.startTime, cand.endTime, `Officer selected alternative candidate window ${cand.slotId}: ${cand.startTime}–${cand.endTime}`);
              }}
              onAuthorizeWindow={(cand: CandidatePlanningWindow) => {
                if (state.currentUser.role === 'Planning Officer') {
                  sendToControl(activeReq.id, `Recommended window ${cand.startTime}–${cand.endTime} accepted by Planning Officer`);
                } else {
                  authorizeAndScheduleBlock(activeReq.id, `Possession officially authorized in recommended candidate window ${cand.startTime}–${cand.endTime}`);
                }
              }}
              onOpenManualOverride={() => {
                setManualOverrideModalReqId(activeReq.id);
                setManualOverrideStart(activeReq.allocatedWindow?.startTime || '04:30');
                setManualOverrideEnd(activeReq.allocatedWindow?.endTime || '06:30');
                setManualOverrideReason('');
                setManualOverrideError('');
              }}
              userRole={state.currentUser.role}
            />
          )}

          {/* NEARBY TRAIN MOVEMENT INTELLIGENCE & CONFLICT RADAR (Sections 6, 7 & 8) */}
          <NearbyTrainIntelligenceWidget
            request={activeReq}
            liveTrains={state.liveData?.liveTrains || []}
            dataSource={state.liveData?.source || 'LIVE'}
          />
        </div>
      )}

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
            {state.requests.filter(r => r.status === 'Block Window Allocated' && !r.authorizedBlockId).map((req) => {
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

                    {state.currentUser.role === 'Planning Officer' ? (
                      <button
                        onClick={() => sendToControl(req.id, `Recommended corridor window formulated by Planning Officer ${state.currentUser.name}`)}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition active:scale-98 cursor-pointer"
                        title="Submit formulated recommendation to COA / Operations Control for operational validation"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        <span>SEND TO OPERATING CONTROL</span>
                      </button>
                    ) : state.currentUser.role === 'COA / Operations' ? (
                      <button
                        onClick={() => {
                          const res = authorizeAndScheduleBlock(req.id, `Possession officially authorized and scheduled by Operating Control Authority ${state.currentUser.name} (COA / Operations)`);
                          if (!res?.success) {
                            setAllocationNotice({
                              type: 'error',
                              message: res?.message || 'Requisition already has an active allocation.'
                            });
                          } else {
                            setAllocationNotice({
                              type: 'success',
                              message: `Block ${res.blockId} successfully authorized and scheduled.`
                            });
                          }
                        }}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition active:scale-98 cursor-pointer"
                        title="Authorize possession and issue official Indian Railways Block Memo"
                      >
                        <CheckCircle2 className="w-4 h-4 text-purple-200" />
                        <span>AUTHORIZE & SCHEDULE POSSESSION</span>
                      </button>
                    ) : state.currentUser.role === 'MASTER' ? (
                      <button
                        onClick={() => {
                          const res = authorizeAndScheduleBlock(req.id, 'Administrative Override by MASTER');
                          if (!res?.success) {
                            setAllocationNotice({
                              type: 'error',
                              message: res?.message || 'Requisition already has an active allocation.'
                            });
                          } else {
                            setAllocationNotice({
                              type: 'success',
                              message: `Block ${res.blockId} successfully authorized and scheduled.`
                            });
                          }
                        }}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-800 hover:bg-black text-white text-xs font-bold shadow-xs transition active:scale-98 cursor-pointer"
                        title="System Administrator emergency override: Authorize block and log administrative override"
                      >
                        <CheckCircle2 className="w-4 h-4 text-amber-300" />
                        <span>ADMINISTRATIVE OVERRIDE: AUTHORIZE</span>
                      </button>
                    ) : (
                      <button
                        disabled={true}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-200 text-neutral-500 text-xs font-bold shadow-xs cursor-not-allowed"
                        title="Field maintenance engineers create requirements; operating control authorization required"
                      >
                        <span>RECOMMENDATION PENDING CONTROL</span>
                      </button>
                    )}
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
                    (state.currentUser.role === 'COA / Operations' || state.currentUser.role === 'Planning Officer' || state.currentUser.role === 'MASTER') ? (
                      <button
                        onClick={async () => {
                          const res = authorizeAndScheduleBlock(cardReq.id, `Possession officially authorized and scheduled by ${state.currentUser.name} (${state.currentUser.role})`);
                          if (res?.success) {
                            if (onNavigate) {
                              onNavigate('execution');
                            } else {
                              window.location.hash = 'execution';
                            }
                          }
                        }}
                        className="px-4 py-2 rounded-full bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        title="Authorize corridor block, issue official Block Memo, and navigate to Execution"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-200" />
                        <span>AUTHORIZE &amp; SCHEDULE (EXECUTE)</span>
                      </button>
                    ) : (
                      <span className="px-3.5 py-1.5 rounded-full bg-neutral-100 border border-neutral-300 text-neutral-600 font-medium text-xs flex items-center gap-1.5">
                        <span>Awaiting Control Authorization</span>
                      </span>
                    )
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

      {/* CANDIDATE WINDOW COMPARISON MODAL */}
      {isCompareModalOpen && activeReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full border border-railway-border shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-railway-border pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200">
                  <TableIcon className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    DECISION COMPARISON MATRIX
                  </span>
                  <h3 className="text-xl font-bold text-railway-textPrimary mt-0.5 font-sans">
                    Candidate Window Comparative Evaluation
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono">
                    {activeReq.id} · {activeReq.work} ({activeReq.department} · {activeReq.section} · Required: {activeReq.duration} min)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto rounded-2xl border border-railway-border">
              <table className="w-full min-w-[560px] text-xs font-mono text-left">
                <thead className="bg-neutral-100/90 text-neutral-600 border-b border-railway-border uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Candidate Slot</th>
                    <th className="p-3">Time Window</th>
                    <th className="p-3">Duration (Avail / Req)</th>
                    <th className="p-3">Safety Margin</th>
                    <th className="p-3">Conflict Status</th>
                    <th className="p-3">Recommendation Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-railway-border">
                  {(activeReqAnalysis?.candidateWindows || []).map((cand, idx) => {
                    const isRecommended = Boolean(cand.isRecommended);
                    const isFeasible = cand.status === 'FEASIBLE';
                    const isConflict = cand.status === 'CONFLICT';
                    const slotName = idx === 0 ? 'Early Morning' : idx === 1 ? 'Optimal Corridor' : 'Afternoon';

                    return (
                      <tr 
                        key={cand.slotId}
                        className={`hover:bg-neutral-50/80 transition ${
                          isRecommended ? 'bg-emerald-50/40 font-semibold' : ''
                        }`}
                      >
                        <td className="p-3">
                          <strong className="text-neutral-900 block">{cand.slotId}</strong>
                          <span className="text-[10px] text-neutral-500 font-sans">{slotName}</span>
                        </td>
                        <td className="p-3 text-neutral-800 font-bold">
                          {cand.startTime} – {cand.endTime} IST
                        </td>
                        <td className="p-3">
                          <span className="text-neutral-800">{cand.durationMinutes}m</span>
                          <span className="text-neutral-400"> / {activeReq.duration}m</span>
                        </td>
                        <td className="p-3 text-emerald-700">
                          +15m G&amp;SR Headway
                        </td>
                        <td className="p-3">
                          {isConflict ? (
                            <span className="text-rose-700 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>1 Violation</span>
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>0 Conflicts</span>
                            </span>
                          )}
                          <div className="text-[10px] text-neutral-500 font-sans max-w-xs truncate" title={cand.reason}>
                            {cand.reason}
                          </div>
                        </td>
                        <td className="p-3">
                          {isRecommended ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                              RECOMMENDED
                            </span>
                          ) : isFeasible ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900 border border-sky-300">
                              FEASIBLE
                            </span>
                          ) : isConflict ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                              CONFLICT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              INSUFFICIENT
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {isRecommended ? (
                            <button
                              onClick={() => {
                                setIsCompareModalOpen(false);
                                if (state.currentUser.role === 'Planning Officer') {
                                  sendToControl(activeReq.id, `Recommended window ${cand.startTime}–${cand.endTime} accepted by Planning Officer`);
                                } else if (state.currentUser.role === 'COA / Operations' || state.currentUser.role === 'MASTER') {
                                  authorizeAndScheduleBlock(activeReq.id, `Possession authorized in recommended window ${cand.startTime}–${cand.endTime}`);
                                }
                              }}
                              className="px-3 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] shadow-2xs transition cursor-pointer"
                            >
                              Accept Recommended
                            </button>
                          ) : isFeasible ? (
                            <button
                              onClick={() => {
                                rescheduleBlock(activeReq.id, cand.startTime, cand.endTime, `Officer selected alternative candidate window ${cand.slotId}`);
                                setIsCompareModalOpen(false);
                              }}
                              className="px-3 py-1.5 rounded-full bg-white border border-sky-400 hover:bg-sky-50 text-sky-800 font-bold text-[11px] shadow-2xs transition cursor-pointer"
                            >
                              Choose Window
                            </button>
                          ) : (
                            <span className="text-[10px] text-neutral-400 italic">
                              Ineligible
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-railway-border">
              <span className="text-xs text-neutral-500 font-sans">
                G&amp;SR Operational Rule: System recommendations do not replace human controller verification.
              </span>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="px-5 py-2 rounded-full border border-railway-border hover:bg-neutral-100 text-xs font-semibold text-neutral-700 cursor-pointer"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL WINDOW OVERRIDE MODAL (Section 21 of Specification) */}
      {manualOverrideModalReqId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-railway-border shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-railway-border pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                    MANUAL OPERATIONAL OVERRIDE
                  </span>
                  <h3 className="text-lg font-bold text-railway-textPrimary mt-0.5 font-sans">
                    Override Recommended Window
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono">
                    Target: {manualOverrideModalReqId}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setManualOverrideModalReqId(null)}
                className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-sans space-y-1">
              <strong>Audit Ledger Notice:</strong>
              <p>
                Manual override preserves the original system recommendation in the permanent audit ledger and requires an authorized officer operational justification.
              </p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-neutral-500 font-bold mb-1">
                    Override Start (IST)
                  </label>
                  <input
                    type="time"
                    value={manualOverrideStart}
                    onChange={(e) => setManualOverrideStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-railway-border bg-railway-canvas text-sm font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-neutral-500 font-bold mb-1">
                    Override End (IST)
                  </label>
                  <input
                    type="time"
                    value={manualOverrideEnd}
                    onChange={(e) => setManualOverrideEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-railway-border bg-railway-canvas text-sm font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-neutral-700 font-bold mb-1">
                  Mandatory Operational Justification (Reason):
                </label>
                <textarea
                  rows={3}
                  value={manualOverrideReason}
                  onChange={(e) => {
                    setManualOverrideReason(e.target.value);
                    if (e.target.value.trim().length >= 8) setManualOverrideError('');
                  }}
                  placeholder="e.g. Approved by Sr.DOM: Emergency night possession required due to morning express bunching..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-railway-canvas border border-railway-border text-xs font-sans text-railway-textPrimary focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                {manualOverrideError && (
                  <span className="text-[11px] text-rose-600 font-sans font-semibold mt-1 block">
                    ⚠️ {manualOverrideError}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-railway-border">
              <button
                type="button"
                onClick={() => setManualOverrideModalReqId(null)}
                className="px-4 py-2 rounded-full border border-railway-border text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!manualOverrideReason.trim() || manualOverrideReason.trim().length < 8) {
                    setManualOverrideError('Mandatory: Please provide a substantive operational justification (minimum 8 characters).');
                    return;
                  }
                  recordManualOverride(
                    manualOverrideModalReqId,
                    manualOverrideStart,
                    manualOverrideEnd,
                    manualOverrideReason.trim()
                  );
                  setManualOverrideModalReqId(null);
                }}
                className="px-6 py-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Confirm Manual Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replan Confirmation Modal */}
      {replanModalReqId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-mono">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-railway-border space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold border border-amber-200">
                <RotateCcw className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900 font-sans">
                  Request Possession Replanning
                </h3>
                <p className="text-xs text-neutral-500 font-sans">
                  Requisition {replanModalReqId} · Archive current block and reopen window evaluation
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 font-sans leading-relaxed">
              <strong>Indian Railways Possession Discipline:</strong> Archiving the current block allocation preserves the historic block in the Audit Ledger. A new timetable window must be evaluated and authorized.
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-neutral-700">
                Reason for Replanning / Rescheduling <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={replanReason}
                onChange={(e) => setReplanReason(e.target.value)}
                placeholder="e.g. Traffic surge on corridor, track machine breakdown, emergency freight priority..."
                className="w-full p-3 bg-railway-canvas rounded-2xl border border-railway-border text-xs focus:outline-none focus:border-railway-forest font-sans"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReplanModalReqId(null);
                  setReplanReason('');
                }}
                className="px-4 py-2 rounded-full border border-railway-border hover:bg-neutral-50 text-neutral-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!replanReason.trim()}
                onClick={() => {
                  const res = requestReplan(replanModalReqId, replanReason.trim());
                  setReplanModalReqId(null);
                  setReplanReason('');
                  if (res?.success) {
                    setAllocationNotice({
                      type: 'success',
                      message: `Replanning requested for ${replanModalReqId}. Previous block archived to history.`
                    });
                  }
                }}
                className="px-5 py-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                Confirm Replan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
