// Operational Execution Tracker Page
// Implements Indian Railways G&SR Chapter XV Safety & Execution Workflow
import React, { useState, useMemo } from 'react';
import { useSamnvayStore } from '../store/useSamnvayStore';
import { 
  PlayCircle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  MessageSquare,
  AlertTriangle,
  ShieldAlert,
  Gauge,
  FileText,
  Layers,
  AlertCircle,
  Check,
  X,
  ShieldCheck,
  Send,
  RotateCcw,
  CheckCheck,
  Sparkles
} from 'lucide-react';
import type { 
  SamnvayPage, 
  CompletionStatus, 
  IncompletionReasonCategory, 
  OperationalRestrictionType,
  Department,
  DepartmentWorkStatus,
  InfrastructureCondition
} from '../types/samnvay';
import { isExecutionEligible, isCompleted } from '../utils/requestLifecycle';

interface ExecutionPageProps {
  onNavigate?: (page: SamnvayPage) => void;
}

export const ExecutionPage: React.FC<ExecutionPageProps> = ({ onNavigate }) => {
  const { 
    state, 
    advanceExecutionStep, 
    openBlockCommunication, 
    submitCompletionReport,
    requestContinuationBlock,
    recordOperationalRestriction,
    updateDepartmentExecutionStatus,
    imposeBlock,
    returnBlock,
    recordRestoration,
    closeBlock
  } = useSamnvayStore();

  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [showRestorationModal, setShowRestorationModal] = useState(false);
  const [restorationTargetCondition, setRestorationTargetCondition] = useState<InfrastructureCondition>('NORMAL_RESTORED');
  const [restorationVerificationRemarks, setRestorationVerificationRemarks] = useState('All track measurements, clearance, and OHE isolation restored.');

  // Completion Form State
  const [compStatus, setCompStatus] = useState<CompletionStatus>('WORK_COMPLETED');
  const [compActualMins, setCompActualMins] = useState<number>(120);
  const [compSummary, setCompSummary] = useState('');
  const [compReasonCategory, setCompReasonCategory] = useState<IncompletionReasonCategory>('MACHINERY_BREAKDOWN');
  const [compRemainingWork, setCompRemainingWork] = useState('');
  const [compRemainingLocation, setCompRemainingLocation] = useState('');
  const [compRequestContinuation, setCompRequestContinuation] = useState(false);
  const [compContinuationDuration, setCompContinuationDuration] = useState<number>(60);

  // Operational Restriction State
  const [resType, setResType] = useState<OperationalRestrictionType>('NORMAL');
  const [resSpeed, setResSpeed] = useState<number>(45);
  const [resReason, setResReason] = useState('Consolidation of disturbed ballast bed after track maintenance.');

  const executionRequests = useMemo(() => {
    return state.requests.filter(r => isExecutionEligible(r) || isCompleted(r));
  }, [state.requests]);

  const activeReq = useMemo(() => {
    if (selectedReqId) {
      const found = executionRequests.find(r => r.id === selectedReqId);
      if (found) return found;
    }
    // Prioritize active or executing blocks
    const executing = executionRequests.find(r => 
      r.status === 'IMPOSED' || 
      r.status === 'WORK_STARTED' || 
      r.status === 'Block Started' || 
      r.status === 'Work in Progress' || 
      r.status === 'COMPLETION_REPORT_REQUIRED' ||
      r.status === 'RESTORATION_PENDING' ||
      r.status === 'BLOCK_RETURNED'
    );
    if (executing) return executing;

    const scheduled = executionRequests.find(r => 
      r.status === 'SCHEDULED' || 
      r.status === 'Scheduled' || 
      r.status === 'AUTHORIZED'
    );
    if (scheduled) return scheduled;

    const completed = executionRequests.find(r => isCompleted(r));
    if (completed) return completed;

    return executionRequests[0] || null;
  }, [selectedReqId, executionRequests]);

  const currentStepIndex = state.executionSteps.findIndex(s => s.status === 'IN_PROGRESS');
  const currentStep = currentStepIndex !== -1 ? state.executionSteps[currentStepIndex] : state.executionSteps[0];

  const handleNext = () => {
    // If Step 4 is in progress and user hasn't submitted a completion report, prompt modal
    if (currentStepIndex === 3 && activeReq && !activeReq.completionReport) {
      setCompActualMins(activeReq.planned_duration || activeReq.duration || 120);
      setShowCompletionModal(true);
      return;
    }
    advanceExecutionStep();
  };

  const handleSaveCompletionReport = () => {
    if (!activeReq) return;
    submitCompletionReport(activeReq.id, {
      status: compStatus,
      actualDurationMinutes: compActualMins,
      workAccomplishedSummary: compSummary.trim() || (compStatus === 'WORK_COMPLETED' ? 'Track maintenance successfully executed to gauge tolerance.' : 'Work partially executed; track clearance verified.'),
      incompletionReasonCategory: compStatus !== 'WORK_COMPLETED' ? compReasonCategory : undefined,
      remainingWork: compStatus !== 'WORK_COMPLETED' ? compRemainingWork : undefined,
      remainingLocationKm: compStatus !== 'WORK_COMPLETED' ? compRemainingLocation : undefined,
      continuationRequired: compStatus !== 'WORK_COMPLETED' && compRequestContinuation,
      continuationRequestedDurationMinutes: compContinuationDuration,
      severity: compStatus === 'WORK_NOT_COMPLETED' ? 'HIGH' : 'MEDIUM'
    });
    setShowCompletionModal(false);
  };

  const handleSaveOperationalRestriction = () => {
    if (!activeReq) return;
    recordOperationalRestriction(activeReq.id, {
      type: resType,
      speedKmph: resType === 'RESTRICTED' ? resSpeed : undefined,
      normalSectionSpeedKmph: 130,
      reason: resReason,
      cautionOrderIssued: resType === 'RESTRICTED'
    });
    setShowRestrictionModal(false);
  };

  if (!activeReq) {
    return (
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="border-b border-railway-border pb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
                <PlayCircle className="w-4 h-4" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-railway-textPrimary font-sans">
                Block Execution
              </h1>
            </div>
            <p className="text-sm text-railway-textSecondary mt-1">
              Possession Lifecycle & Safety Protocol
            </p>
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs">
            <span className="text-railway-textMuted">TRACKED POSSESSION:</span>
            <span className="bg-white px-3 py-1.5 rounded-full border border-railway-border text-railway-textMuted font-bold shadow-xs">
              None Active
            </span>
          </div>
        </div>

        {/* Institutional Empty State */}
        <div className="bg-white rounded-3xl border border-railway-border p-16 text-center space-y-5 shadow-xs">
          <div className="w-20 h-20 rounded-full bg-railway-canvas mx-auto flex items-center justify-center text-railway-forest border border-railway-border">
            <PlayCircle className="w-10 h-10 text-neutral-400" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-railway-textPrimary font-sans">
              No Active Track Possession
            </h3>
            <p className="text-xs text-railway-textSecondary">
              Scheduled blocks will appear here upon authorization.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2 font-mono text-xs text-railway-textMuted">
            <span>Active Blocks: <strong className="text-railway-textPrimary">0</strong></span>
            <span>·</span>
            <span>Completed Blocks: <strong className="text-railway-textPrimary">{state.requests.filter(r => r.status === 'Closed').length}</strong></span>
          </div>
        </div>

        {/* 6-Stage Reference Protocol */}
        <div className="bg-white border border-railway-border rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-railway-border pb-4">
            <h3 className="text-sm font-mono font-bold text-railway-textPrimary uppercase">
              Sequential Safety Execution Protocol (G&SR Chapter XV Compliant)
            </h3>
            <span className="text-xs font-mono text-neutral-400">0 OF 06 STAGES ACTIVE</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {state.executionSteps.map(s => (
              <div key={s.stepNumber} className="p-4 rounded-2xl bg-railway-canvas/50 border border-dashed border-railway-border text-xs font-mono text-neutral-400 space-y-1">
                <span className="font-bold text-sm block">{s.code}</span>
                <span className="font-semibold text-neutral-600 block">{s.title}</span>
                <span className="text-[10px] text-neutral-400 block line-clamp-2">{s.details}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isLivePossession = currentStepIndex !== -1 && currentStepIndex < 5;
  const isComplete = currentStepIndex === 5 && currentStep.status === 'COMPLETED';
  const hasPartialCompletion = activeReq.completionReport && activeReq.completionReport.status !== 'WORK_COMPLETED';
  const hasActiveTsr = activeReq.operationalRestriction?.type === 'RESTRICTED';

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-railway-border pb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
              <PlayCircle className="w-4 h-4" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-railway-textPrimary font-sans">
              Operational Execution Tracker
            </h1>
          </div>
          <p className="text-sm text-railway-textSecondary mt-1">
            Real-time track possession monitoring, safety protection protocol, and block release lifecycle.
          </p>
        </div>

        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            type="button"
            onClick={() => {
              openBlockCommunication(activeReq.id);
              if (onNavigate) {
                onNavigate('communication');
              } else {
                window.location.hash = 'communication';
              }
            }}
            className="px-3.5 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Open operational communication to report progress or status"
          >
            <MessageSquare className="w-3.5 h-3.5 text-purple-700" />
            <span>REPORT OPERATIONAL UPDATE</span>
          </button>

          <span className="text-railway-textMuted">TRACKED:</span>
          <span className="bg-white px-3 py-1.5 rounded-full border border-railway-border text-railway-forest font-bold shadow-xs">
            {activeReq.id} ({activeReq.department} · {activeReq.section} · {activeReq.stationCode || 'MAG'})
          </span>
        </div>
      </div>

      {/* REQUISITION SELECTOR PILLS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-railway-border text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className="text-neutral-500 font-bold uppercase text-[10px]">Select Requisition to Track:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {executionRequests.map(req => {
            const isSelected = activeReq.id === req.id;
            return (
              <button
                key={req.id}
                onClick={() => setSelectedReqId(req.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-railway-forest text-white border-railway-forest shadow-xs'
                    : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                }`}
              >
                <span>{req.id}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-600'
                }`}>
                  {req.department}
                </span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                  req.status === 'IMPOSED' || req.status === 'WORK_STARTED' ? 'bg-emerald-200 text-emerald-900 font-bold animate-pulse' :
                  req.status === 'COMPLETION_REPORT_REQUIRED' ? 'bg-rose-200 text-rose-950 font-bold' :
                  req.status === 'PARTIALLY_COMPLETED' ? 'bg-amber-200 text-amber-950' :
                  'opacity-80'
                }`}>
                  {req.status}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* OVERDUE COMPLETION REPORT URGENT ALERT */}
      {(activeReq.isOverdueCompletionReport || activeReq.status === 'COMPLETION_REPORT_REQUIRED') && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-400 text-rose-950 flex items-start gap-3 shadow-md animate-pulse">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold uppercase tracking-wider text-rose-900">
              URGENT: Maintenance Completion Report Mandatory
            </div>
            <div className="text-rose-800 leading-relaxed font-sans">
              Block window duration has concluded. Indian Railways safety regulations (G&SR Chapter XV) require immediate submission of physical work completion status, gauge tolerances, and site clearance certification. Block release cannot be authorized without this report.
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setCompActualMins(activeReq.actual_duration || activeReq.planned_duration || activeReq.duration || 120);
                  setShowCompletionModal(true);
                }}
                className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold font-mono text-xs shadow-xs transition cursor-pointer"
              >
                File Mandatory Completion Report Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CROSS-SECTION SPAN ALERT BANNER */}
      {activeReq.isCrossSection && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold uppercase tracking-wider">
              Cross-Sectional Boundary Span: Multi-Station Coordination Active
            </div>
            <div className="text-amber-800 leading-relaxed font-sans">
              This maintenance block spans sectional boundary at KM 25/000 ({activeReq.crossSections?.join(' & ') || 'SEC-A & SEC-B'}).
              Operating possession, safety detonator protection, and caution orders require synchronized exchange between both Section Controllers and Station Masters.
            </div>
          </div>
        </div>
      )}

      {/* PROMINENT CURRENT STATUS HERO BANNER */}
      <div className="rounded-[28px] bg-railway-forest text-white p-6 sm:p-8 border border-railway-forestLight shadow-md space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 text-xs font-mono font-bold uppercase tracking-wider">
              STAGE {currentStep.code} OF 06
            </span>
            {isLivePossession ? (
              <span className="px-3 py-1 rounded-full bg-railway-signalGreen/20 text-railway-signalGreenLight border border-railway-signalGreen/40 text-xs font-mono font-bold animate-pulse">
                ● LIVE ON-TRACK POSSESSION ({activeReq.status})
              </span>
            ) : isComplete ? (
              <span className="px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 text-xs font-mono font-bold">
                ✓ BLOCK COMPLETED &amp; RELEASED
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-mono font-bold">
                STATUS: {activeReq.status}
              </span>
            )}
            {hasPartialCompletion && (
              <span className="px-3 py-1 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400 text-xs font-mono font-bold">
                ⚠️ PARTIALLY COMPLETED
              </span>
            )}
            {hasActiveTsr && (
              <span className="px-3 py-1 rounded-full bg-orange-500/30 text-orange-200 border border-orange-400 text-xs font-mono font-bold">
                ⚡ TSR: {activeReq.operationalRestriction?.speedKmph} KM/H
              </span>
            )}
          </div>

          <div className="text-xs font-mono text-white/80">
            Authorized by: <strong className="text-white">{currentStep.confirmedBy || `${state.currentUser.name} (${state.currentUser.role})`}</strong>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-sans">
              {currentStep.title}
            </h2>
            <p className="text-sm text-white/85 leading-relaxed">
              {currentStep.details}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Completion Report Action Button */}
            {(currentStepIndex >= 2 && currentStepIndex <= 4) && (
              <button
                onClick={() => {
                  setCompActualMins(activeReq.actual_duration || activeReq.planned_duration || activeReq.duration || 120);
                  setShowCompletionModal(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-sm transition active:scale-98 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>{activeReq.completionReport ? 'Update Completion Report' : 'File Completion Report'}</span>
              </button>
            )}

            {/* Operational Restriction / Speed Control Button */}
            {(currentStepIndex >= 4) && (
              <button
                onClick={() => setShowRestrictionModal(true)}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs border border-white/30 shadow-sm transition active:scale-98 cursor-pointer"
              >
                <Gauge className="w-4 h-4 text-emerald-300" />
                <span>{activeReq.operationalRestriction ? 'Modify Speed Restriction' : 'Set Operational Speed'}</span>
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={currentStep.stepNumber === 6 && currentStep.status === 'COMPLETED'}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-white text-railway-forest hover:bg-neutral-100 font-semibold text-sm shadow-md transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              <span>
                {currentStep.stepNumber === 6 && currentStep.status === 'COMPLETED' 
                  ? 'Block Released' 
                  : currentStepIndex === -1 
                  ? 'Initiate Execution' 
                  : 'Advance to Next Phase'}
              </span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-railway-forest" />
            </button>
          </div>
        </div>

        {/* REAL RAILWAY OPERATIONAL LIFECYCLE CONTROLS */}
        <div className="p-4 rounded-2xl bg-white/10 border border-white/20 space-y-3 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-2">
            <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Operational Lifecycle Protocol Control Bar</span>
            </span>
            <span className="text-[10px] text-white/70">
              CURRENT STATUS: <strong className="text-amber-300">{activeReq.status}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Step A: Impose Block (Control) */}
            {(activeReq.status === 'SCHEDULED' || activeReq.status === 'Scheduled' || activeReq.status === 'AUTHORIZED' || activeReq.status === 'Approved') && (
              <button
                type="button"
                onClick={() => imposeBlock(activeReq.id)}
                className="px-4 py-2 rounded-full bg-teal-400 hover:bg-teal-300 text-neutral-950 font-bold text-xs shadow-xs transition active:scale-98 flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Impose Block &amp; Issue Permit-to-Work (Control)</span>
              </button>
            )}

            {/* Step B: Start Physical Work (Field) */}
            {(activeReq.status === 'IMPOSED' || activeReq.status === 'Block Started') && (
              <button
                type="button"
                onClick={() => handleNext()}
                className="px-4 py-2 rounded-full bg-cyan-300 hover:bg-cyan-200 text-neutral-950 font-bold text-xs shadow-xs transition active:scale-98 flex items-center gap-1.5 cursor-pointer"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Start Physical Work &amp; Protect Track (Field Gang)</span>
              </button>
            )}

            {/* Step C: Record Work Completion / Partial Completion (Field) */}
            {(activeReq.status === 'WORK_STARTED' || activeReq.status === 'Work in Progress' || activeReq.status === 'COMPLETION_REPORT_REQUIRED') && (
              <button
                type="button"
                onClick={() => {
                  setCompActualMins(activeReq.planned_duration || activeReq.duration || 120);
                  setShowCompletionModal(true);
                }}
                className="px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs shadow-xs transition active:scale-98 flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Submit Completion Report (Field Sign-off)</span>
              </button>
            )}

            {/* Step D: Return Block to Control (Field) */}
            {(activeReq.status === 'COMPLETED' || activeReq.status === 'Work Completed' || activeReq.status === 'PARTIALLY_COMPLETED') && (() => {
              const pendingDepts = (activeReq.departmentExecutionStatuses || []).filter(
                d => d.status !== 'COMPLETED' && d.status !== 'PARTIALLY_COMPLETED'
              );
              const hasPending = pendingDepts.length > 0;
              return (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => returnBlock(activeReq.id)}
                    disabled={hasPending}
                    className={`px-4 py-2 rounded-full font-bold text-xs shadow-xs transition flex items-center gap-1.5 ${
                      hasPending
                        ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed'
                        : 'bg-sky-300 hover:bg-sky-200 text-neutral-950 cursor-pointer active:scale-98'
                    }`}
                    title={hasPending ? `Cannot return block: Awaiting sign-off from ${pendingDepts.map(d => d.department).join(', ')}` : 'Handover block to Section Controller'}
                  >
                    <Send className="w-4 h-4" />
                    <span>Return Block to Section Controller (Handover)</span>
                  </button>
                  {hasPending && (
                    <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded font-mono">
                      ⚠️ Awaiting: {pendingDepts.map(d => d.department).join(', ')}
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Step E: Verification & Restoration Gate (Control & Field) */}
            {(activeReq.status === 'BLOCK_RETURNED' || activeReq.status === 'RESTORATION_PENDING') && (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => recordRestoration(activeReq.id, 'NORMAL_RESTORED', 'Track fit verified at full section speed (130 km/h).')}
                  className="px-4 py-2 rounded-full bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold text-xs shadow-xs transition active:scale-98 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Verify Normal Speed (130 km/h)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowRestrictionModal(true)}
                  className="px-4 py-2 rounded-full bg-orange-400 hover:bg-orange-300 text-neutral-950 font-bold text-xs shadow-xs transition active:scale-98 flex items-center gap-1.5 cursor-pointer"
                >
                  <Gauge className="w-4 h-4" />
                  <span>Verify with Caution Order (TSR)</span>
                </button>
              </div>
            )}

            {/* Step F: Close Block (Final) */}
            {(activeReq.status === 'NORMAL_RESTORED' || activeReq.status === 'RESTRICTED') && (
              <button
                type="button"
                onClick={() => closeBlock(activeReq.id)}
                className="px-4 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-bold text-xs shadow-xs transition active:scale-98 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Final Closure &amp; Archive Block Requisition</span>
              </button>
            )}
          </div>
        </div>

        {/* PLANNED VS ACTUAL TIMING & OPERATIONAL ACCOUNTABILITY */}
        <div className="pt-4 border-t border-white/15 grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs font-mono text-white/75">
          <div>
            <span className="text-white/50 block text-[10px] uppercase">Planned Window</span>
            <span className="font-bold text-white">
              {activeReq.planned_start || activeReq.allocatedWindow?.startTime || activeReq.preferredTime} IST ({activeReq.planned_duration || activeReq.duration}m)
            </span>
          </div>
          <div>
            <span className="text-white/50 block text-[10px] uppercase">Actual Execution</span>
            <span className="font-bold text-emerald-300">
              {activeReq.actual_start ? `${activeReq.actual_start} → ${activeReq.actual_end || 'Now'}` : 'Not Started'}
            </span>
          </div>
          <div>
            <span className="text-white/50 block text-[10px] uppercase">Variance</span>
            <span className={`font-bold ${
              (activeReq.duration_variance || 0) > 0 ? 'text-amber-300' :
              (activeReq.duration_variance || 0) < 0 ? 'text-blue-300' :
              'text-white'
            }`}>
              {activeReq.duration_variance != null 
                ? `${activeReq.duration_variance >= 0 ? '+' : ''}${activeReq.duration_variance}m`
                : 'In Progress'}
            </span>
          </div>
          <div>
            <span className="text-white/50 block text-[10px] uppercase">PTW Private No.</span>
            <span className="font-bold text-teal-300 truncate block">
              {activeReq.permit_to_work_private_number || 'Pending'}
            </span>
            <span className="text-[9px] text-white/40 block">(Simulated)</span>
          </div>
          <div>
            <span className="text-white/50 block text-[10px] uppercase">Return Private No.</span>
            <span className="font-bold text-sky-300 truncate block">
              {activeReq.return_private_number || 'Pending'}
            </span>
            <span className="text-[9px] text-white/40 block">(Simulated)</span>
          </div>
          <div>
            <span className="text-white/50 block text-[10px] uppercase">Track Fit Condition</span>
            <span className={`font-bold ${hasActiveTsr ? 'text-orange-300' : 'text-railway-signalGreenLight'}`}>
              {activeReq.operational_condition || (hasActiveTsr ? `TSR: ${activeReq.operationalRestriction?.speedKmph} km/h` : 'NORMAL (130 km/h)')}
            </span>
          </div>
        </div>
      </div>

      {/* 6-STAGE TRACKER CARDS */}
      <div className="bg-white border border-railway-border rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-railway-border pb-4">
          <h3 className="text-lg font-bold text-railway-textPrimary tracking-tight">
            Sequential Safety Execution Protocol
          </h3>
          <span className="text-xs font-mono text-railway-textMuted uppercase">
            G&SR CHAPTER XV COMPLIANT
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {state.executionSteps.map((step) => {
            const isCompleted = step.status === 'COMPLETED';
            const isInProgress = step.status === 'IN_PROGRESS';

            return (
              <div
                key={step.stepNumber}
                onClick={() => handleNext()}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isInProgress
                    ? 'bg-railway-forest text-white border-railway-forest shadow-md ring-2 ring-railway-signalGreen ring-offset-2'
                    : isCompleted
                    ? 'bg-white text-railway-textPrimary border-railway-border hover:border-railway-forestLight'
                    : 'bg-railway-canvas/50 text-railway-textMuted border-dashed border-railway-border'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xl font-mono font-bold ${
                      isInProgress ? 'text-railway-signalGreenLight' :
                      isCompleted ? 'text-railway-forest' :
                      'text-neutral-400'
                    }`}>
                      {step.code}
                    </span>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-railway-signalGreen" />
                    ) : isInProgress ? (
                      <span className="w-2 h-2 rounded-full bg-railway-signalGreenLight animate-ping" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    )}
                  </div>

                  <h4 className={`text-xs font-bold tracking-tight mb-1 ${
                    isInProgress ? 'text-white' : 'text-railway-textPrimary'
                  }`}>
                    {step.title}
                  </h4>

                  <p className={`text-[11px] leading-relaxed line-clamp-3 ${
                    isInProgress ? 'text-white/80' : 'text-railway-textSecondary'
                  }`}>
                    {step.details}
                  </p>
                </div>

                <div className={`pt-3 mt-3 border-t text-[10px] font-mono ${
                  isInProgress ? 'border-white/20 text-white/70' : 'border-railway-border text-railway-textMuted'
                }`}>
                  <div className="font-semibold">{step.timestamp || 'Pending'}</div>
                  <div className="truncate">{step.confirmedBy || 'Operating Control'}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* MULTI-DEPARTMENT EXECUTION STATUS BREAKDOWN (Strictly Separated from Overall Block Status) */}
        {activeReq.departmentExecutionStatuses && activeReq.departmentExecutionStatuses.length > 0 && (
          <div className="p-5 rounded-2xl bg-railway-canvas border border-railway-border space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-railway-forest uppercase">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Department Work Status Matrix (Decoupled from Overall Block Possession)</span>
              </div>
              <span className="text-[10px] font-mono text-railway-textMuted">
                INVARIANT: ONE DEPT COMPLETION DOES NOT RELEASE POSSESSION · ALL WINGS MUST SIGN OFF
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              {activeReq.departmentExecutionStatuses.map(deptStatus => {
                const userRole = state.currentUser.role;
                const isMaster = userRole === 'MASTER';
                const isControl = userRole === 'COA / Operations' || userRole === 'Section Controller';
                const isDeptAuthorized = isMaster || isControl ||
                  (((deptStatus.department as string) === 'Engineering' || deptStatus.department === 'P.Way') && (userRole === 'P.Way Engineer' || userRole.includes('Engineering') || userRole.includes('P.Way'))) ||
                  (deptStatus.department === 'S&T' && (userRole === 'S&T Engineer' || userRole.includes('S&T') || userRole.includes('Signal'))) ||
                  (deptStatus.department === 'TRD' && (userRole === 'TRD Engineer' || userRole.includes('TRD') || userRole.includes('Traction')));

                return (
                  <div key={deptStatus.department} className="p-4 rounded-xl bg-white border border-railway-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-railway-textPrimary">{deptStatus.department} Wing</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        deptStatus.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        deptStatus.status === 'PARTIALLY_COMPLETED' ? 'bg-amber-100 text-amber-800' :
                        deptStatus.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                        'bg-neutral-100 text-neutral-600'
                      }`}>
                        {deptStatus.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-railway-textSecondary font-sans line-clamp-2">
                      {deptStatus.workDescription}
                    </p>
                    <div className="pt-2 border-t border-railway-border flex items-center justify-between text-[10px] text-railway-textMuted">
                      <span className="truncate mr-1">{deptStatus.signedOffBy ? `Signed: ${deptStatus.signedOffBy}` : 'Pending Sign-off'}</span>
                      {deptStatus.status !== 'COMPLETED' && (
                        isDeptAuthorized ? (
                          <button
                            type="button"
                            onClick={() => updateDepartmentExecutionStatus(activeReq.id, deptStatus.department, 'COMPLETED', 'Restoration verified')}
                            className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 cursor-pointer transition active:scale-95 flex-shrink-0"
                            title={`Sign off physical completion and safety restoration for ${deptStatus.department}`}
                          >
                            Sign Off
                          </button>
                        ) : (
                          <span 
                            className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-500 text-[9px] border border-neutral-200 cursor-not-allowed flex-shrink-0"
                            title={`Only ${deptStatus.department} Engineer or Section Controller can sign off`}
                          >
                            {deptStatus.department} Only
                          </span>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* G&SR Safety Clearance & Inspection Gate */}
        <div className="p-5 rounded-2xl bg-railway-canvas border border-railway-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-railway-forest uppercase">
              <CheckCircle2 className="w-4 h-4 text-railway-signalGreen" />
              <span>G&SR Appendix A: Engineering Safety & Clearance Gate</span>
            </div>
            <span className="text-[10px] font-mono text-railway-textMuted">
              MANDATORY INSPECTION PRIOR TO BLOCK RELEASE
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-white border border-railway-border flex items-center space-x-2.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <div>
                <div className="font-bold text-railway-textPrimary">Track Clearance Verified</div>
                <div className="text-[10px] text-railway-textMuted font-sans">No tools, machinery, or ballast fouls gauge</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-railway-border flex items-center space-x-2.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <div>
                <div className="font-bold text-railway-textPrimary">OHE & S&T Restoration</div>
                <div className="text-[10px] text-railway-textMuted font-sans">Discharge rods removed & points reconnected</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-railway-border flex items-center space-x-2.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <div>
                <div className="font-bold text-railway-textPrimary">Fitness Certificate</div>
                <div className="text-[10px] text-railway-textMuted font-sans">
                  {hasActiveTsr 
                    ? `Caution Order Enforced: Max ${activeReq.operationalRestriction?.speedKmph} km/h` 
                    : (activeReq.blockMemoNumber ? `Memo ${activeReq.blockMemoNumber} Endorsed` : 'Fit to receive traffic at normal speed')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CONTINUATION BLOCK CHAINING NOTICE IF PRESENT */}
        {activeReq.continuationBlockIds && activeReq.continuationBlockIds.length > 0 && (
          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 text-xs space-y-1">
            <div className="font-bold uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-700" />
              <span>Chained Continuation Requisition Generated</span>
            </div>
            <p className="text-purple-800 font-sans leading-relaxed">
              Incomplete work from this possession has generated continuation block requisition{' '}
              <strong className="font-mono">{activeReq.continuationBlockIds.join(', ')}</strong>.
              This requisition has entered the regular departmental planning queue.
              Under Indian Railways Safety Standards, continuation blocks are <strong>NEVER auto-granted</strong> and require standard operating authorization.
            </p>
          </div>
        )}
      </div>

      {/* MODAL: MANDATORY COMPLETION REPORT */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-railway-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-railway-border pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-railway-textPrimary font-sans">
                  Mandatory Maintenance Completion Report
                </h3>
              </div>
              <button 
                onClick={() => setShowCompletionModal(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-railway-textSecondary uppercase font-bold mb-1.5 text-[11px]">
                  Completion Status *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCompStatus('WORK_COMPLETED')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition cursor-pointer ${
                      compStatus === 'WORK_COMPLETED' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                        : 'bg-white text-neutral-700 border-railway-border hover:bg-neutral-50'
                    }`}
                  >
                    WORK COMPLETED
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompStatus('PARTIALLY_COMPLETED')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition cursor-pointer ${
                      compStatus === 'PARTIALLY_COMPLETED' 
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs' 
                        : 'bg-white text-neutral-700 border-railway-border hover:bg-neutral-50'
                    }`}
                  >
                    PARTIAL WORK
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompStatus('WORK_NOT_COMPLETED')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition cursor-pointer ${
                      compStatus === 'WORK_NOT_COMPLETED' 
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs' 
                        : 'bg-white text-neutral-700 border-railway-border hover:bg-neutral-50'
                    }`}
                  >
                    NOT COMPLETED
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-railway-textSecondary uppercase font-bold mb-1 text-[11px]">
                  Actual Possession Duration (Minutes) *
                </label>
                <input 
                  type="number"
                  value={compActualMins}
                  onChange={e => setCompActualMins(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-2.5 rounded-xl border border-railway-border bg-white text-railway-textPrimary font-mono text-xs focus:ring-2 focus:ring-railway-forest focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-railway-textSecondary uppercase font-bold mb-1 text-[11px]">
                  Work Accomplished Summary *
                </label>
                <textarea
                  rows={2}
                  value={compSummary}
                  onChange={e => setCompSummary(e.target.value)}
                  placeholder="Summarize physical work executed, gauge measurements, and site clearance..."
                  className="w-full p-2.5 rounded-xl border border-railway-border bg-white text-railway-textPrimary font-sans text-xs focus:ring-2 focus:ring-railway-forest focus:outline-hidden"
                />
              </div>

              {compStatus !== 'WORK_COMPLETED' && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3 font-sans">
                  <div className="font-bold text-amber-900 text-xs uppercase font-mono">
                    Mandatory Incompletion Explanations
                  </div>

                  <div>
                    <label className="block text-amber-900 font-bold mb-1 text-[11px]">
                      Primary Reason Category *
                    </label>
                    <select
                      value={compReasonCategory}
                      onChange={e => setCompReasonCategory(e.target.value as IncompletionReasonCategory)}
                      className="w-full p-2 rounded-xl border border-amber-300 bg-white text-neutral-800 text-xs font-mono"
                    >
                      <option value="MACHINERY_BREAKDOWN">Machinery Breakdown (Tamping / BCM Failure)</option>
                      <option value="ADVERSE_WEATHER">Adverse Weather / Extreme Rainfall</option>
                      <option value="EMERGENCY_TRAIN_PASSAGE">Emergency Train Movement Pre-emption</option>
                      <option value="LATE_POSSESSION_GRANT">Late Track Possession Handover by Control</option>
                      <option value="INSUFFICIENT_WINDOW">Allocated Window Insufficient for Scope</option>
                      <option value="SAFETY_HAZARD">Safety Hazard / Sudden Track Formation Defect</option>
                      <option value="STAFF_OR_RESOURCE_DEFICIT">Labor or Material Resource Deficit</option>
                      <option value="UNEXPECTED_SITE_CONDITION">Unexpected Structural / Subgrade Condition</option>
                      <option value="OTHER">Other Operational Constraint</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-amber-900 font-bold mb-1 text-[11px]">
                      Remaining Work Scope *
                    </label>
                    <input
                      type="text"
                      value={compRemainingWork}
                      onChange={e => setCompRemainingWork(e.target.value)}
                      placeholder="e.g. 400m tamping remaining from KM 12/800 to 13/200"
                      className="w-full p-2 rounded-xl border border-amber-300 bg-white text-neutral-800 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-amber-900 font-bold mb-1 text-[11px]">
                      Remaining Location Chainage
                    </label>
                    <input
                      type="text"
                      value={compRemainingLocation}
                      onChange={e => setCompRemainingLocation(e.target.value)}
                      placeholder="e.g. KM 12/800"
                      className="w-full p-2 rounded-xl border border-amber-300 bg-white text-neutral-800 text-xs"
                    />
                  </div>

                  <div className="pt-2 border-t border-amber-200 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="reqCont"
                      checked={compRequestContinuation}
                      onChange={e => setCompRequestContinuation(e.target.checked)}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <label htmlFor="reqCont" className="text-xs text-amber-900 font-semibold cursor-pointer">
                      Queue Chained Continuation Block in Planning System
                    </label>
                  </div>

                  {compRequestContinuation && (
                    <div>
                      <label className="block text-amber-900 font-bold mb-1 text-[11px]">
                        Requested Continuation Duration (Minutes)
                      </label>
                      <input
                        type="number"
                        value={compContinuationDuration}
                        onChange={e => setCompContinuationDuration(parseInt(e.target.value, 10) || 60)}
                        className="w-full p-2 rounded-xl border border-amber-300 bg-white text-neutral-800 text-xs font-mono"
                      />
                      <span className="text-[10px] text-amber-700 block mt-1">
                        Note: Continuation block will enter Planning Queue as 'Submitted'. It is NEVER auto-granted.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-railway-border font-mono text-xs">
              <button
                type="button"
                onClick={() => setShowCompletionModal(false)}
                className="px-4 py-2 rounded-full border border-railway-border text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCompletionReport}
                className="px-6 py-2.5 rounded-full bg-railway-forest hover:bg-railway-forestLight text-white font-bold shadow-xs cursor-pointer"
              >
                Submit Official Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: OPERATIONAL SPEED RESTRICTION / TRACK FIT */}
      {showRestrictionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-railway-border">
            <div className="flex items-center justify-between border-b border-railway-border pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Gauge className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-railway-textPrimary font-sans">
                  Track Fit & Speed Restriction Control
                </h3>
              </div>
              <button 
                onClick={() => setShowRestrictionModal(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-railway-textSecondary uppercase font-bold mb-1.5 text-[11px]">
                  Track Operational Status *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResType('NORMAL')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition cursor-pointer ${
                      resType === 'NORMAL' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                        : 'bg-white text-neutral-700 border-railway-border hover:bg-neutral-50'
                    }`}
                  >
                    NORMAL SPEED (130 KM/H)
                  </button>
                  <button
                    type="button"
                    onClick={() => setResType('RESTRICTED')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition cursor-pointer ${
                      resType === 'RESTRICTED' 
                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
                        : 'bg-white text-neutral-700 border-railway-border hover:bg-neutral-50'
                    }`}
                  >
                    TEMPORARY SPEED RESTRICTION (TSR)
                  </button>
                </div>
              </div>

              {resType === 'RESTRICTED' && (
                <div className="space-y-3 p-4 rounded-2xl bg-orange-50 border border-orange-200">
                  <div>
                    <label className="block text-orange-900 font-bold mb-1 text-[11px]">
                      Authorized Restricted Speed (KM/H) *
                    </label>
                    <input 
                      type="number"
                      value={resSpeed}
                      onChange={e => setResSpeed(parseInt(e.target.value, 10) || 30)}
                      min={10}
                      max={120}
                      className="w-full p-2 rounded-xl border border-orange-300 bg-white text-neutral-800 text-xs font-mono font-bold"
                    />
                    <div className="flex gap-2 mt-2">
                      {[20, 30, 45, 50, 75].map(spd => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => setResSpeed(spd)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-orange-200 text-orange-800 text-[10px] font-bold hover:bg-orange-100 cursor-pointer"
                        >
                          {spd} km/h
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-orange-900 font-bold mb-1 text-[11px]">
                      Reason / Justification for Caution Order *
                    </label>
                    <input
                      type="text"
                      value={resReason}
                      onChange={e => setResReason(e.target.value)}
                      placeholder="e.g. Consolidation of disturbed ballast bed following deep screening"
                      className="w-full p-2 rounded-xl border border-orange-300 bg-white text-neutral-800 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-railway-border font-mono text-xs">
              <button
                type="button"
                onClick={() => setShowRestrictionModal(false)}
                className="px-4 py-2 rounded-full border border-railway-border text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOperationalRestriction}
                className="px-6 py-2.5 rounded-full bg-railway-forest hover:bg-railway-forestLight text-white font-bold shadow-xs cursor-pointer"
              >
                Save Operational Condition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
