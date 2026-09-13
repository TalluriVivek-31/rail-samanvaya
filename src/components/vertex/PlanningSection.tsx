// Vertex-inspired Planning Decision Support Interface
import React, { useState } from 'react';
import { CheckCircle2, Shield, Calendar, RefreshCw, Clock, ArrowRight, Layers, Train } from 'lucide-react';

export const PlanningSection: React.FC = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lastOptimizedTime, setLastOptimizedTime] = useState('13:42 IST');
  const [planScore, setPlanScore] = useState(98.4);

  const handleGeneratePlan = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      setLastOptimizedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST');
      setPlanScore(99.1);
    }, 800);
  };

  return (
    <section id="planning" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="space-y-12">
        
        {/* Section Heading & Context */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-railway-canvasMuted text-railway-forest text-xs font-mono font-semibold tracking-wider uppercase border border-railway-border">
              <span>Operational Decision Support</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-railway-textPrimary font-sans">
              Make every maintenance window count.
            </h2>
          </div>
          <p className="text-base text-railway-textSecondary max-w-md">
            Multi-department timetable timeline aligning track engineering, interlocking checks, traction power blocks, and train headways.
          </p>
        </div>

        {/* Master Planning Card */}
        <div className="rounded-[28px] bg-white border border-railway-border shadow-[0_12px_40px_rgba(0,0,0,0.04)] overflow-hidden">
          
          {/* Top Bar with Status & Simulation Badge */}
          <div className="px-6 sm:px-8 py-5 border-b border-railway-border flex flex-wrap items-center justify-between gap-4 bg-railway-canvas/50">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-railway-forest">
                Corridor C1 Timeline (12:00 – 18:00 IST)
              </span>
              <span className="hidden sm:inline text-railway-borderDark">|</span>
              <span className="hidden sm:inline text-xs font-mono text-railway-textMuted">
                Engine: CP-SAT Linear Constraint Solver
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono text-railway-textMuted">
                Last Evaluated: <strong className="text-railway-textPrimary">{lastOptimizedTime}</strong>
              </span>
              <span className="px-2.5 py-1 rounded bg-railway-safetyAmber/10 text-railway-safetyAmber border border-railway-safetyAmber/30 text-[10px] font-mono font-bold uppercase">
                SIMULATION DATA
              </span>
            </div>
          </div>

          {/* Planning Timeline Grid */}
          <div className="p-6 sm:p-8 space-y-8">
            
            {/* Time Axis (12:00 to 18:00) */}
            <div className="relative">
              <div className="grid grid-cols-6 text-xs font-mono text-railway-textMuted border-b border-railway-border pb-2 px-3">
                <span className="text-left">12:00</span>
                <span className="text-left">13:00</span>
                <span className="text-left">14:00</span>
                <span className="text-left">15:00</span>
                <span className="text-left">16:00</span>
                <span className="text-left">17:00</span>
              </div>

              {/* 4 Swimlanes: P.Way, S&T, TRD, Train Operations */}
              <div className="mt-4 space-y-4">
                
                {/* Row 1: P.Way */}
                <div className="flex items-center gap-4">
                  <div className="w-28 sm:w-36 flex-shrink-0 text-xs font-mono font-bold text-railway-textPrimary">
                    P.Way
                    <span className="block text-[10px] text-railway-textMuted font-normal">Track Engineering</span>
                  </div>
                  <div className="relative flex-1 h-12 bg-railway-canvas/60 rounded-xl border border-railway-border overflow-hidden">
                    {/* Buffer left */}
                    <div 
                      className="absolute top-0 bottom-0 left-[43%] w-[2.5%] bg-amber-200/50 border-r border-amber-400"
                      title="15 min Safety Buffer"
                    />
                    {/* Planned Block (14:45 - 16:15) -> 45.8% to 70.8% */}
                    <div 
                      className="absolute top-1.5 bottom-1.5 left-[45.8%] w-[25%] bg-railway-forest text-white rounded-lg px-2.5 flex items-center justify-between text-xs font-mono shadow-xs"
                    >
                      <span className="font-bold truncate">BR-1025 · Ballast Tamping</span>
                      <span className="text-[10px] opacity-80 hidden sm:inline">90m</span>
                    </div>
                    {/* Buffer right */}
                    <div 
                      className="absolute top-0 bottom-0 left-[70.8%] w-[2.5%] bg-amber-200/50 border-l border-amber-400"
                      title="15 min Safety Buffer"
                    />
                  </div>
                </div>

                {/* Row 2: S&T */}
                <div className="flex items-center gap-4">
                  <div className="w-28 sm:w-36 flex-shrink-0 text-xs font-mono font-bold text-railway-textPrimary">
                    S&T
                    <span className="block text-[10px] text-railway-textMuted font-normal">Signal & Telecom</span>
                  </div>
                  <div className="relative flex-1 h-12 bg-railway-canvas/60 rounded-xl border border-railway-border overflow-hidden">
                    {/* Earlier short calibration block */}
                    <div 
                      className="absolute top-1.5 bottom-1.5 left-[8%] w-[14%] bg-slate-600 text-white rounded-lg px-2 flex items-center justify-between text-xs font-mono"
                    >
                      <span className="truncate">BR-1022 · Circuit Test</span>
                    </div>
                    {/* Shadow window standby */}
                    <div 
                      className="absolute top-1.5 bottom-1.5 left-[45.8%] w-[25%] border-2 border-dashed border-emerald-600/50 bg-emerald-50 text-emerald-900 rounded-lg px-2.5 flex items-center text-[11px] font-mono"
                    >
                      <span className="truncate">Joint Track Circuit Alignment</span>
                    </div>
                  </div>
                </div>

                {/* Row 3: TRD */}
                <div className="flex items-center gap-4">
                  <div className="w-28 sm:w-36 flex-shrink-0 text-xs font-mono font-bold text-railway-textPrimary">
                    TRD
                    <span className="block text-[10px] text-railway-textMuted font-normal">Traction OHE</span>
                  </div>
                  <div className="relative flex-1 h-12 bg-railway-canvas/60 rounded-xl border border-railway-border overflow-hidden">
                    {/* Coordinated OHE Power Isolation */}
                    <div 
                      className="absolute top-1.5 bottom-1.5 left-[45.8%] w-[25%] bg-amber-600 text-white rounded-lg px-2.5 flex items-center justify-between text-xs font-mono shadow-xs"
                    >
                      <span className="truncate font-bold">BR-1024 · 25kV Catenary Isolation</span>
                      <span className="text-[10px] opacity-80 hidden sm:inline">POWER OFF</span>
                    </div>
                  </div>
                </div>

                {/* Row 4: Train Operations */}
                <div className="flex items-center gap-4">
                  <div className="w-28 sm:w-36 flex-shrink-0 text-xs font-mono font-bold text-railway-textPrimary">
                    Train Operations
                    <span className="block text-[10px] text-railway-textMuted font-normal">Movements & Headway</span>
                  </div>
                  <div className="relative flex-1 h-12 bg-railway-canvas/60 rounded-xl border border-railway-border overflow-hidden">
                    {/* Train 1: 12:45 */}
                    <div 
                      className="absolute top-2 bottom-2 left-[12%] w-[8%] bg-blue-700 text-white rounded px-1.5 flex items-center text-[10px] font-mono truncate"
                      title="Train 12711 Pinakini Express"
                    >
                      Exp 12711
                    </div>
                    {/* Train 2: 14:05 */}
                    <div 
                      className="absolute top-2 bottom-2 left-[34%] w-[9%] bg-blue-700 text-white rounded px-1.5 flex items-center text-[10px] font-mono truncate"
                      title="Train 12002 Shatabdi Express"
                    >
                      Exp 12002
                    </div>
                    {/* Clear Green Window in Train Operations */}
                    <div 
                      className="absolute top-0 bottom-0 left-[45.8%] w-[25%] bg-emerald-500/15 border-x-2 border-dashed border-emerald-500 flex items-center justify-center text-[11px] font-mono font-bold text-emerald-800"
                    >
                      CLEAR TRAFFIC WINDOW
                    </div>
                    {/* Train 3: 16:35 */}
                    <div 
                      className="absolute top-2 bottom-2 left-[76%] w-[9%] bg-blue-700 text-white rounded px-1.5 flex items-center text-[10px] font-mono truncate"
                      title="Train 12615 GT Express"
                    >
                      Exp 12615
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Prominent Recommendation Result Card (Prompt Specification) */}
            <div className="rounded-2xl bg-railway-canvasMuted/70 border border-railway-border p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-railway-forest text-white text-xs font-mono font-semibold uppercase tracking-wider">
                    Recommended Window
                  </span>
                  <span className="text-xs font-mono text-railway-textMuted">
                    SEC-04 (Madhira – Bonakalu)
                  </span>
                </div>

                <div className="text-3xl sm:text-4xl font-extrabold text-railway-forest font-mono tracking-tight">
                  14:45 – 16:15 IST <span className="text-sm font-sans font-normal text-railway-textSecondary">(90 minutes)</span>
                </div>

                {/* 3 Prominent Verification Badges */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-semibold text-railway-textPrimary">
                  <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-railway-signalGreen" />
                    <span>No timetable conflict</span>
                  </div>

                  <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                    <Shield className="w-4 h-4 text-railway-signalGreen" />
                    <span>Safety buffer preserved</span>
                  </div>

                  <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-railway-signalGreen" />
                    <span>Corridor available</span>
                  </div>
                </div>
              </div>

              {/* Generate Plan Button */}
              <div className="flex-shrink-0">
                <button
                  onClick={handleGeneratePlan}
                  disabled={isOptimizing}
                  className="px-8 py-4 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2.5 transition active:scale-[0.98] disabled:opacity-75"
                >
                  <RefreshCw className={`w-4 h-4 text-railway-signalGreenLight ${isOptimizing ? 'animate-spin' : ''}`} />
                  <span>{isOptimizing ? 'Evaluating Constraints...' : 'Generate Plan'}</span>
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
