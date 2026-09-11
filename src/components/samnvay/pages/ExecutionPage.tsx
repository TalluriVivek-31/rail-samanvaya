// Operational Execution Tracker Page
// Redesigned with unified Vertex-inspired government railway design system
import React from 'react';
import { useSamnvayStore } from '../../../store/useSamnvayStore';
import { 
  PlayCircle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import type { SamnvayPage } from '../../../types/samnvay';

interface ExecutionPageProps {
  onNavigate?: (page: SamnvayPage) => void;
}

export const ExecutionPage: React.FC<ExecutionPageProps> = ({ onNavigate }) => {
  const { state, advanceExecutionStep, openBlockCommunication } = useSamnvayStore();

  const activeReq = state.requests.find(r => 
    r.status === 'Block Started' || 
    r.status === 'Work in Progress' || 
    r.status === 'Work Completed' || 
    r.status === 'Inspection/Safety Verification' || 
    r.status === 'Block Release Requested' || 
    r.status === 'Scheduled' || 
    r.status === 'Block Window Allocated' ||
    r.status === 'Approved' ||
    r.status === 'Active' ||
    r.status === 'Planning'
  );

  const currentStepIndex = state.executionSteps.findIndex(s => s.status === 'IN_PROGRESS');
  const currentStep = currentStepIndex !== -1 ? state.executionSteps[currentStepIndex] : state.executionSteps[0];

  const handleNext = () => {
    advanceExecutionStep();
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
                Operational Execution Tracker
              </h1>
            </div>
            <p className="text-sm text-railway-textSecondary mt-1">
              Real-time track possession monitoring, safety protection protocol, and block release lifecycle.
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
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-railway-textPrimary font-sans">
              No track possession currently in execution
            </h3>
            <p className="text-xs text-railway-textSecondary leading-relaxed">
              When a maintenance block request is approved and allocated, it transitions into the 6-stage execution tracking protocol here. Authorized personnel can log track protection, verify disconnection, and issue release memos.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2 font-mono text-xs text-railway-textMuted">
            <span>Active Blocks: <strong className="text-railway-textPrimary">0</strong></span>
            <span>·</span>
            <span>Completed Blocks: <strong className="text-railway-textPrimary">{state.requests.filter(r => r.status === 'Completed').length}</strong></span>
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

      {/* PROMINENT CURRENT STATUS HERO BANNER */}
      <div className="rounded-[28px] bg-railway-forest text-white p-6 sm:p-8 border border-railway-forestLight shadow-md space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 text-xs font-mono font-bold uppercase tracking-wider">
              STAGE {currentStep.code} OF 06
            </span>
            {isLivePossession ? (
              <span className="px-3 py-1 rounded-full bg-railway-signalGreen/20 text-railway-signalGreenLight border border-railway-signalGreen/40 text-xs font-mono font-bold animate-pulse">
                ● LIVE ON-TRACK POSSESSION
              </span>
            ) : isComplete ? (
              <span className="px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 text-xs font-mono font-bold">
                ✓ BLOCK COMPLETED & RELEASED
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-mono font-bold">
                STANDBY FOR ON-TRACK ENTRY
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

          <div className="flex-shrink-0">
            <button
              onClick={handleNext}
              disabled={currentStep.stepNumber === 6 && currentStep.status === 'COMPLETED'}
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-white text-railway-forest hover:bg-neutral-100 font-semibold text-sm shadow-md transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed group"
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

        <div className="pt-4 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono text-white/75">
          <div>
            <span className="text-white/50 block text-[10px] uppercase">Possession Slot</span>
            <span className="font-bold text-white">
              {activeReq.allocatedWindow ? `${activeReq.allocatedWindow.startTime} – ${activeReq.allocatedWindow.endTime} IST` : `${activeReq.preferredTime} IST (${activeReq.duration}m)`}
            </span>
          </div>
          <div>
            <span className="text-white/50 block text-[10px] uppercase">Work Location</span>
            <span className="font-bold text-white">
              {activeReq.startLocation} – {activeReq.endLocation} ({activeReq.affectedTracks?.join(', ') || activeReq.lineName || activeReq.section})
            </span>
          </div>
          <div>
            <span className="text-white/50 block text-[10px] uppercase">Safety Protocol</span>
            <span className="font-bold text-railway-signalGreenLight">
              {activeReq.safetyRequirements ? activeReq.safetyRequirements[0] : 'Detonators @ 1200m Placed'}
            </span>
          </div>
          <div>
            <span className="text-white/50 block text-[10px] uppercase">Engineering Protection</span>
            <span className="font-bold text-amber-300">
              {activeReq.powerBlockRequired ? '25kV OHE Catenary Earthed' : activeReq.sntDisconnectionRequired ? 'S&T Crank Disconnected' : 'Track Mechanically Isolated'}
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
                onClick={() => advanceExecutionStep()}
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
                  {activeReq.blockMemoNumber ? `Memo ${activeReq.blockMemoNumber} Endorsed` : 'Fit to receive traffic at normal speed'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
