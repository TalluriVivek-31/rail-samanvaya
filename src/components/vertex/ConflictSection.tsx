// Vertex-inspired Calm Operational Conflict Card for Rail Samnvay
import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ArrowRight, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export const ConflictSection: React.FC = () => {
  const [isResolved, setIsResolved] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState('16:45 – 18:45');

  const handleAccept = () => {
    setIsResolved(true);
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="space-y-10">
        
        {/* Section Header */}
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-railway-canvasMuted text-railway-forest text-xs font-mono font-semibold tracking-wider uppercase border border-railway-border">
            <span>Automated Conflict Resolution</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-railway-textPrimary font-sans">
            Protecting train movement in real time.
          </h2>
          <p className="text-base text-railway-textSecondary">
            When an engineering requisition overlaps with scheduled traffic or minimum safety buffers, Rail Samnvay calculates viable alternatives before human dispatchers intervene.
          </p>
        </div>

        {/* Refined Conflict Card (Prompt Specification) */}
        <div className="rounded-[28px] bg-white border border-railway-border shadow-[0_12px_40px_rgba(0,0,0,0.04)] p-8 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Conflict Details */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Alert Status Pill */}
              <div className="flex items-center gap-3">
                {isResolved ? (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-semibold uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-railway-signalGreen" />
                    Conflict Resolved · Alternative Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-mono font-semibold uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5 text-railway-safetyAmber" />
                    Potential Conflict Detected
                  </span>
                )}
                <span className="text-xs font-mono text-railway-textMuted uppercase">
                  REQUISITION BR-1024
                </span>
              </div>

              {/* Title & Section */}
              <div>
                <h3 className="text-2xl font-bold text-railway-textPrimary tracking-tight">
                  TRD OHE Maintenance
                </h3>
                <p className="text-sm font-mono text-railway-textSecondary mt-1">
                  Corridor C1 · SEC-04 (Madhira – Bonakalu Section)
                </p>
              </div>

              {/* Current Overlap Description */}
              <div className="rounded-2xl bg-railway-canvas/70 border border-railway-border p-4 text-sm text-railway-textSecondary space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-railway-textPrimary">Requested Window: 14:30 – 16:30 IST</span>
                  <span className="text-railway-operationalRed font-bold">12m HEADWAY VIOLATION</span>
                </div>
                <p className="text-xs leading-relaxed">
                  Conflicts with passage of <strong>Train 12002 (Shatabdi Express)</strong> at KM 54.20. Minimum required 15-minute safety buffer would be compromised.
                </p>
              </div>

              {/* Recommended Alternative Highlight */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-800 font-bold">
                    Recommended Alternative Window
                  </div>
                  <div className="text-2xl font-bold font-mono text-railway-forest">
                    {selectedWindow} IST
                  </div>
                  <div className="text-xs text-emerald-800 mt-0.5">
                    Zero timetable delay penalty · Preserves full 20m headway margin
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-railway-signalGreen flex-shrink-0" />
                  <span className="text-xs font-semibold">G&SR Validated</span>
                </div>
              </div>

            </div>

            {/* Actions & Decision Panel */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-4 lg:pl-6 lg:border-l border-railway-border">
              <div className="text-xs font-mono uppercase tracking-wider text-railway-textMuted font-semibold">
                Controller Action Required
              </div>

              {isResolved ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <CheckCircle2 className="w-8 h-8 text-railway-signalGreen mx-auto" />
                  <div className="font-bold text-railway-textPrimary text-base">
                    Alternative Endorsed
                  </div>
                  <p className="text-xs text-railway-textSecondary">
                    Window 16:45–18:45 committed to Division Control. TRD supervisor notified via telemetry memo.
                  </p>
                  <button
                    onClick={() => setIsResolved(false)}
                    className="text-xs font-mono text-railway-forest underline hover:opacity-80 pt-2"
                  >
                    Reset Simulation State
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={handleAccept}
                    className="w-full py-4 rounded-full bg-railway-forest hover:bg-railway-forestDark text-white font-semibold text-sm shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2 group"
                  >
                    <span>Accept Alternative (16:45–18:45)</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-railway-signalGreenLight" />
                  </button>

                  <button
                    onClick={() => setShowAlternatives(!showAlternatives)}
                    className="w-full py-3.5 rounded-full border border-railway-border hover:bg-railway-canvas text-railway-textPrimary font-semibold text-sm transition text-center"
                  >
                    {showAlternatives ? 'Hide Other Windows' : 'View Alternatives'}
                  </button>

                  {/* Collapsible Secondary Alternatives */}
                  {showAlternatives && (
                    <div className="pt-2 space-y-2 text-xs font-mono animate-in fade-in duration-200">
                      <div 
                        onClick={() => setSelectedWindow('19:15 – 21:15')}
                        className="p-3 rounded-xl border border-railway-border hover:border-railway-forest cursor-pointer bg-white flex items-center justify-between"
                      >
                        <div>
                          <strong className="text-railway-textPrimary block">19:15 – 21:15 IST</strong>
                          <span className="text-[10px] text-railway-textMuted">Night Window · 0 Conflict</span>
                        </div>
                        <span className="text-[10px] text-railway-signalGreen font-bold">SELECT</span>
                      </div>

                      <div 
                        onClick={() => setSelectedWindow('Tomorrow 10:15 – 12:15')}
                        className="p-3 rounded-xl border border-railway-border hover:border-railway-forest cursor-pointer bg-white flex items-center justify-between"
                      >
                        <div>
                          <strong className="text-railway-textPrimary block">Tomorrow 10:15 – 12:15 IST</strong>
                          <span className="text-[10px] text-railway-textMuted">Daylight Non-Peak Window</span>
                        </div>
                        <span className="text-[10px] text-railway-signalGreen font-bold">SELECT</span>
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-railway-textMuted text-center font-mono pt-1">
                    Acceptance updates live station interlocking records.
                  </p>
                </div>
              )}

            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
