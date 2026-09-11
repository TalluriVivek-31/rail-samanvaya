// Vertex-inspired 6-Stage Execution Tracker for Rail Samnvay
import React, { useState } from 'react';
import { CheckCircle2, Clock, ShieldCheck, Play, Flag, ArrowRight } from 'lucide-react';

export const ExecutionSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState(4); // Stage 4 Maintenance Started

  const stages = [
    {
      step: '01',
      title: 'Request Approved',
      time: '12:30 IST',
      actor: 'Senior DOM (Operating)',
      desc: 'Corridor slot locked in division control computer.',
      status: 'completed',
    },
    {
      step: '02',
      title: 'Block Granted',
      time: '14:40 IST',
      actor: 'Section Controller',
      desc: 'Signals placed at danger; track segment blocked in interlocking.',
      status: 'completed',
    },
    {
      step: '03',
      title: 'Safety Protection',
      time: '14:45 IST',
      actor: 'Station Master / PWI',
      desc: 'Detonators positioned 1200m out; OHE 25kV power earthed.',
      status: 'completed',
    },
    {
      step: '04',
      title: 'Maintenance Started',
      time: '14:50 IST',
      actor: 'On-Ground Engineering Crew',
      desc: 'Mechanized BCM ballast cleaner & tamping machines engaged.',
      status: 'in-progress',
    },
    {
      step: '05',
      title: 'Maintenance Completed',
      time: 'Estimated 16:05 IST',
      actor: 'Site Supervisor',
      desc: 'Track cleared of machinery; gauge & cross-levels verified.',
      status: 'upcoming',
    },
    {
      step: '06',
      title: 'Block Released',
      time: 'Estimated 16:15 IST',
      actor: 'Joint Authority (PWI & SM)',
      desc: 'Line clear memo exchanged; full line speed restored.',
      status: 'upcoming',
    },
  ];

  return (
    <section id="execution" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-railway-border">
      <div className="space-y-12">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-railway-canvasMuted text-railway-forest text-xs font-mono font-semibold tracking-wider uppercase border border-railway-border">
              <span>Live Operational Lifecycle</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-railway-textPrimary font-sans">
              From signal isolation to line clearance.
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-semibold">
              <span className="w-2 h-2 rounded-full bg-railway-signalGreen animate-pulse" />
              LIVE BLOCK: SEC-04 (BR-1025)
            </span>
          </div>
        </div>

        {/* 6-Stage Horizontal Tracker Container */}
        <div className="rounded-[28px] bg-white border border-railway-border p-6 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 relative">
            {stages.map((stage, idx) => {
              const isCompleted = idx < activeStep;
              const isInProgress = idx === activeStep - 1;

              return (
                <div 
                  key={stage.step}
                  onClick={() => setActiveStep(idx + 1)}
                  className={`group relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isInProgress
                      ? 'bg-railway-forest text-white border-railway-forest shadow-md ring-2 ring-railway-signalGreen ring-offset-2'
                      : isCompleted
                      ? 'bg-white text-railway-textPrimary border-railway-border hover:border-railway-forestLight'
                      : 'bg-railway-canvas/40 text-railway-textMuted border-dashed border-railway-border hover:bg-white'
                  }`}
                >
                  <div>
                    {/* Top Status & Step Number */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-xl font-mono font-bold ${
                        isInProgress ? 'text-railway-signalGreenLight' :
                        isCompleted ? 'text-railway-forest' :
                        'text-neutral-400'
                      }`}>
                        {stage.step}
                      </span>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-railway-signalGreen" />
                      ) : isInProgress ? (
                        <span className="w-2 h-2 rounded-full bg-railway-signalGreenLight animate-ping" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                    </div>

                    {/* Stage Title */}
                    <h4 className={`text-sm font-bold tracking-tight mb-1.5 ${
                      isInProgress ? 'text-white' : 'text-railway-textPrimary'
                    }`}>
                      {stage.title}
                    </h4>

                    {/* Description */}
                    <p className={`text-xs leading-relaxed ${
                      isInProgress ? 'text-white/80' : 'text-railway-textSecondary'
                    }`}>
                      {stage.desc}
                    </p>
                  </div>

                  {/* Timestamp & Actor */}
                  <div className={`pt-4 mt-4 border-t text-[10px] font-mono ${
                    isInProgress ? 'border-white/20 text-white/70' : 'border-railway-border text-railway-textMuted'
                  }`}>
                    <div className="font-semibold">{stage.time}</div>
                    <div className="truncate">{stage.actor}</div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Bottom Summary Bar */}
          <div className="mt-8 pt-6 border-t border-railway-border flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-railway-textSecondary">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-railway-signalGreen" />
              <span>Section Interlocked · Track Circuit Zero Volt Safety Confirmed</span>
            </div>
            <div className="text-railway-textMuted">
              Current Phase: <strong className="text-railway-textPrimary">04 Maintenance Started (Elapsed: 25 min)</strong>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
